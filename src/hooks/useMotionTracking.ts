import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { calcMotionQuality, isPinching, handAngle } from '../lib/motionMapper'
import { controlRegistry } from '../lib/controlRegistry'
import type { HandLandmark } from '../store/djStore'
import { useDJStore } from '../store/djStore'

const WASM_BASE = '/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

interface GrabState {
  controlId:  string
  startAngle: number
  startValue: number
}

export function useMotionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const landmarkerRef   = useRef<HandLandler | null>(null)
  const rafRef          = useRef<number>(0)
  const runningRef      = useRef(false)
  const lastTimeRef     = useRef(-1)
  const streamRef       = useRef<MediaStream | null>(null)
  const initDoneRef     = useRef(false)
  const wasPinchLeft    = useRef(false)
  const wasPinchRight   = useRef(false)
  const grabLeftRef     = useRef<GrabState | null>(null)
  const grabRightRef    = useRef<GrabState | null>(null)

  const processFrame = useCallback(() => {
    if (!runningRef.current) return

    const video      = videoRef.current
    const landmarker = landmarkerRef.current

    if (!video || !landmarker || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    if (video.currentTime === lastTimeRef.current) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    lastTimeRef.current = video.currentTime

    let result: HandLandmarkerResult
    try {
      result = landmarker.detectForVideo(video, performance.now())
    } catch {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const store = useDJStore.getState()

    // Sort detected hands by x position (leftmost = screen-left)
    let leftLm:  typeof result.landmarks[0] | null = null
    let rightLm: typeof result.landmarks[0] | null = null

    if (result.landmarks.length === 1) {
      result.landmarks[0][0].x < 0.5
        ? (leftLm  = result.landmarks[0])
        : (rightLm = result.landmarks[0])
    } else if (result.landmarks.length >= 2) {
      const sorted = [...result.landmarks].sort((a, b) => a[0].x - b[0].x)
      leftLm  = sorted[0]
      rightLm = sorted[1]
    }

    // Mirror x to match CSS-mirrored video
    const mirrorLm = (lm: typeof result.landmarks[0]) =>
      lm.map(p => ({ ...p, x: 1 - p.x }))

    const leftMirrored  = leftLm  ? mirrorLm(leftLm)  : null
    const rightMirrored = rightLm ? mirrorLm(rightLm) : null

    // Pinch detection with hysteresis — save previous state first
    const wasLeft  = wasPinchLeft.current
    const wasRight = wasPinchRight.current
    const leftPinch  = leftMirrored  ? isPinching(leftMirrored,  wasLeft)  : false
    const rightPinch = rightMirrored ? isPinching(rightMirrored, wasRight) : false
    wasPinchLeft.current  = leftPinch
    wasPinchRight.current = rightPinch

    // Quality + hand data → store (for overlay rendering)
    store.setMotionQuality(calcMotionQuality(leftMirrored ?? rightMirrored))
    store.setHandsData({ left: leftMirrored, right: rightMirrored, leftPinch, rightPinch })

    // ── Hit test: which control is the index finger over? ──
    const W = window.innerWidth
    const H = window.innerHeight

    const hitTest = (lm: HandLandmark[] | null): string | null => {
      if (!lm) return null
      const ix = lm[8].x * W
      const iy = lm[8].y * H
      let best: string | null = null
      let bestDist = Infinity
      for (const ctrl of controlRegistry.getAll()) {
        const rect = ctrl.getRect()
        if (!rect) continue
        const cx = rect.left + rect.width  / 2
        const cy = rect.top  + rect.height / 2
        const d  = Math.hypot(ix - cx, iy - cy)
        const radius = Math.max(rect.width, rect.height) * 0.65 + 30
        if (d < radius && d < bestDist) { bestDist = d; best = ctrl.id }
      }
      return best
    }

    const hoveredLeft  = hitTest(leftMirrored)
    const hoveredRight = hitTest(rightMirrored)

    // ── Grab + rotate logic ──
    const applyGrab = (
      pinch:    boolean,
      wasPinch: boolean,
      hovered:  string | null,
      grabRef:  React.MutableRefObject<GrabState | null>,
      lm:       HandLandmark[] | null,
    ) => {
      if (!wasPinch && pinch && hovered) {
        const ctrl = controlRegistry.get(hovered)
        if (ctrl && lm) {
          grabRef.current = {
            controlId:  ctrl.id,
            startAngle: handAngle(lm),
            startValue: ctrl.getValue(),
          }
        }
      }
      if (!pinch) { grabRef.current = null; return }
      if (!grabRef.current || !lm) return

      const { controlId, startAngle, startValue } = grabRef.current
      const ctrl = controlRegistry.get(controlId)
      if (!ctrl) return

      const angle = handAngle(lm)
      let delta   = angle - startAngle
      while (delta >  Math.PI) delta -= 2 * Math.PI
      while (delta < -Math.PI) delta += 2 * Math.PI
      const range  = ctrl.max - ctrl.min
      const newVal = Math.min(ctrl.max, Math.max(ctrl.min,
        startValue + (delta / (2 * Math.PI)) * range / 0.5
      ))
      ctrl.setValue(newVal)
      const pct = Math.round((newVal - ctrl.min) / range * 100)
      store.setPinchLabel(`${ctrl.label} ${pct}%`)
    }

    applyGrab(leftPinch,  wasLeft,  hoveredLeft,  grabLeftRef,  leftMirrored)
    applyGrab(rightPinch, wasRight, hoveredRight, grabRightRef, rightMirrored)

    store.setHandControlState('left',  hoveredLeft,  grabLeftRef.current?.controlId  ?? null)
    store.setHandControlState('right', hoveredRight, grabRightRef.current?.controlId ?? null)

    rafRef.current = requestAnimationFrame(processFrame)
  }, [videoRef])

  const initLandmarker = useCallback(async () => {
    if (initDoneRef.current) return
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      })
      initDoneRef.current = true
    } catch (err) {
      console.error('[MediaPipe] init failed:', err)
      throw err
    }
  }, [])

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve() })
        await video.play()
      }
      return true
    } catch (err) {
      console.error('[Camera] start failed:', err)
      return false
    }
  }, [videoRef])

  const stopCamera = useCallback(() => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current     = null
    lastTimeRef.current   = -1
    wasPinchLeft.current  = false
    wasPinchRight.current = false
    grabLeftRef.current   = null
    grabRightRef.current  = null
  }, [])

  useEffect(() => {
    return useDJStore.subscribe((state) => {
      if (state.motionEnabled && !runningRef.current) {
        runningRef.current = true
        rafRef.current = requestAnimationFrame(processFrame)
      } else if (!state.motionEnabled && runningRef.current) {
        runningRef.current = false
        cancelAnimationFrame(rafRef.current)
      }
    })
  }, [processFrame])

  useEffect(() => () => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
  }, [])

  return { initLandmarker, startCamera, stopCamera }
}

type HandLandler = import('@mediapipe/tasks-vision').HandLandmarker
