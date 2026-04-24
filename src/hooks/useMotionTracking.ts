import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { calcMotionQuality, isPinching, handAngle } from '../lib/motionMapper'
import { controlRegistry } from '../lib/controlRegistry'
import type { HandLandmark } from '../store/djStore'
import { useDJStore } from '../store/djStore'

// Local /wasm used in dev (copied from node_modules).
// CDN fallback for production where public/wasm/ is gitignored.
const WASM_BASE = import.meta.env.DEV
  ? '/wasm'
  : 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

interface GrabState {
  controlId:  string
  startX:     number   // index-tip screen px when grab started
  startY:     number
  startAngle: number   // for knobs
  startValue: number
}

export function useMotionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const landmarkerRef  = useRef<HandLandler | null>(null)
  const rafRef         = useRef<number>(0)
  const runningRef     = useRef(false)
  const lastTimeRef    = useRef(-1)
  const streamRef      = useRef<MediaStream | null>(null)
  const initDoneRef    = useRef(false)
  const wasPinchLeft   = useRef(false)
  const wasPinchRight  = useRef(false)
  const grabLeftRef    = useRef<GrabState | null>(null)
  const grabRightRef   = useRef<GrabState | null>(null)

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

    // Sort by x (leftmost = screen-left)
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

    // Mirror x to match CSS scaleX(-1) video
    const mirrorLm = (lm: typeof result.landmarks[0]) =>
      lm.map(p => ({ ...p, x: 1 - p.x }))

    const leftMirrored  = leftLm  ? mirrorLm(leftLm)  : null
    const rightMirrored = rightLm ? mirrorLm(rightLm) : null

    // Pinch with hysteresis — save previous state first
    const wasLeft  = wasPinchLeft.current
    const wasRight = wasPinchRight.current
    const leftPinch  = leftMirrored  ? isPinching(leftMirrored,  wasLeft)  : false
    const rightPinch = rightMirrored ? isPinching(rightMirrored, wasRight) : false
    wasPinchLeft.current  = leftPinch
    wasPinchRight.current = rightPinch

    store.setMotionQuality(calcMotionQuality(leftMirrored ?? rightMirrored))
    store.setHandsData({ left: leftMirrored, right: rightMirrored, leftPinch, rightPinch })

    const W = window.innerWidth
    const H = window.innerHeight

    // Hit test: which control is the index finger over?
    // Use bounding-rect intersection to avoid wide controls (crossfader) claiming huge areas.
    const hitTest = (lm: HandLandmark[] | null): string | null => {
      if (!lm) return null
      const ix = lm[8].x * W
      const iy = lm[8].y * H
      let best: string | null = null
      let bestDist = Infinity
      for (const ctrl of controlRegistry.getAll()) {
        const rect = ctrl.getRect()
        if (!rect) continue
        // Padding: generous for small knobs/turntables, tight for wide sliders
        const pad =
          ctrl.type === 'knob'      ? 22 :
          ctrl.type === 'turntable' ? 24 :
          ctrl.type === 'slider-v'  ? 36 : 10
        const inBounds =
          ix >= rect.left   - pad &&
          ix <= rect.right  + pad &&
          iy >= rect.top    - pad &&
          iy <= rect.bottom + pad
        if (!inBounds) continue
        const cx = rect.left + rect.width  / 2
        const cy = rect.top  + rect.height / 2
        const d  = Math.hypot(ix - cx, iy - cy)
        if (d < bestDist) { bestDist = d; best = ctrl.id }
      }
      return best
    }

    const hoveredLeft  = hitTest(leftMirrored)
    const hoveredRight = hitTest(rightMirrored)

    // Grab + rotate/drag logic
    const applyGrab = (
      pinch:   boolean,
      wasPinch: boolean,
      hovered: string | null,
      grabRef: React.MutableRefObject<GrabState | null>,
      lm:      HandLandmark[] | null,
    ) => {
      // Pinch started: record grab
      if (!wasPinch && pinch && hovered) {
        const ctrl = controlRegistry.get(hovered)
        if (ctrl && lm) {
          grabRef.current = {
            controlId:  ctrl.id,
            startX:     lm[8].x * W,
            startY:     lm[8].y * H,
            startAngle: handAngle(lm),
            startValue: ctrl.getValue(),
          }
        }
      }

      // Pinch released: call onRelease then clear
      if (!pinch) {
        if (grabRef.current) {
          controlRegistry.get(grabRef.current.controlId)?.onRelease?.()
        }
        grabRef.current = null
        return
      }
      if (!grabRef.current || !lm) return

      const { controlId, startX, startY, startAngle, startValue } = grabRef.current
      const ctrl = controlRegistry.get(controlId)
      if (!ctrl) return

      let newVal: number

      if (ctrl.type === 'knob') {
        // Wrist rotation
        const angle = handAngle(lm)
        let delta   = angle - startAngle
        while (delta >  Math.PI) delta -= 2 * Math.PI
        while (delta < -Math.PI) delta += 2 * Math.PI
        const range = ctrl.max - ctrl.min
        newVal = Math.min(ctrl.max, Math.max(ctrl.min,
          startValue + (delta / (2 * Math.PI)) * range / 0.5
        ))
      } else if (ctrl.type === 'slider-h') {
        // Horizontal drag: move by slider width = full range
        const dx   = lm[8].x * W - startX
        const rect = ctrl.getRect()
        const w    = rect ? Math.max(rect.width, 60) : 200
        newVal = Math.min(ctrl.max, Math.max(ctrl.min,
          startValue + (dx / w) * (ctrl.max - ctrl.min)
        ))
      } else if (ctrl.type === 'slider-v') {
        // Vertical drag: move up = increase (inverted y)
        const dy   = lm[8].y * H - startY
        const rect = ctrl.getRect()
        const h    = rect ? Math.max(rect.height, 60) : 150
        newVal = Math.min(ctrl.max, Math.max(ctrl.min,
          startValue - (dy / h) * (ctrl.max - ctrl.min)
        ))
      } else if (ctrl.type === 'turntable') {
        // Scratch: horizontal movement, very responsive
        const dx     = lm[8].x * W - startX
        const rect   = ctrl.getRect()
        const radius = rect ? rect.width / 2 : 90
        // Moving 1 radius = ±1.5 speed change from normal
        newVal = Math.min(ctrl.max, Math.max(ctrl.min,
          1.0 + (dx / radius) * 1.5
        ))
      } else {
        return
      }

      ctrl.setValue(newVal)

      const range = ctrl.max - ctrl.min
      if (ctrl.type === 'turntable') {
        store.setPinchLabel(`스크래치 ×${newVal.toFixed(1)}`)
      } else {
        const pct = Math.round((newVal - ctrl.min) / range * 100)
        store.setPinchLabel(`${ctrl.label} ${pct}%`)
      }
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
