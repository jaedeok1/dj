import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { mapHandsToControls, calcMotionQuality, isPinching } from '../lib/motionMapper'
import { useDJStore } from '../store/djStore'
import { audioEngine } from '../lib/audioEngine'

const WASM_BASE = '/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export function useMotionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const landmarkerRef = useRef<HandLandler | null>(null)
  const rafRef        = useRef<number>(0)
  const runningRef    = useRef(false)
  const lastTimeRef   = useRef(-1)
  const streamRef     = useRef<MediaStream | null>(null)
  const initDoneRef   = useRef(false)
  // track previous pinch states for hysteresis
  const wasPinchLeft  = useRef(false)
  const wasPinchRight = useRef(false)

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

    // ── Sort detected hands by x position (leftmost = "left on screen") ──
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

    // ── Mirror x coords to match CSS-mirrored video ──
    const mirrorLm = (lm: typeof result.landmarks[0]) =>
      lm.map(p => ({ ...p, x: 1 - p.x }))

    const leftMirrored  = leftLm  ? mirrorLm(leftLm)  : null
    const rightMirrored = rightLm ? mirrorLm(rightLm) : null

    // ── Pinch detection (with hysteresis) ──
    const leftPinch  = leftMirrored  ? isPinching(leftMirrored,  wasPinchLeft.current)  : false
    const rightPinch = rightMirrored ? isPinching(rightMirrored, wasPinchRight.current) : false
    wasPinchLeft.current  = leftPinch
    wasPinchRight.current = rightPinch

    // ── Quality ──
    const quality = calcMotionQuality(leftMirrored ?? rightMirrored)
    store.setMotionQuality(quality)

    // ── Full landmarks + pinch → store (for HandOverlay) ──
    store.setHandsData({
      left:       leftMirrored,
      right:      rightMirrored,
      leftPinch,
      rightPinch,
    })

    // ── Map to controls ──
    const controls = mapHandsToControls(
      leftMirrored,
      rightMirrored,
      store.motionMode,
      {
        crossfader: store.crossfader,
        volumeA:    store.decks.A.volume,
        volumeB:    store.decks.B.volume,
        eqHighA:    store.decks.A.eq.high,
      }
    )

    if (controls.crossfader   !== undefined) store.setCrossfader(controls.crossfader)
    if (controls.volumeA      !== undefined) store.setDeckVolume('A', controls.volumeA)
    if (controls.volumeB      !== undefined) store.setDeckVolume('B', controls.volumeB)
    if (controls.eqHigh       !== undefined) store.setDeckEQ('A', 'high', controls.eqHigh)
    if (controls.scratchSpeed !== undefined) audioEngine.scratch('A', controls.scratchSpeed)
    if (controls.pinchLabel   !== undefined) store.setPinchLabel(controls.pinchLabel)

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
    streamRef.current = null
    lastTimeRef.current  = -1
    wasPinchLeft.current  = false
    wasPinchRight.current = false
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

// Workaround for TS name collision with HTML element
type HandLandler = import('@mediapipe/tasks-vision').HandLandmarker
