import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { mapHandsToControls, calcMotionQuality } from '../lib/motionMapper'
import { useDJStore } from '../store/djStore'
import { audioEngine } from '../lib/audioEngine'

// WASM loaded locally (public/wasm/) — pinned to exact installed version
const WASM_BASE = '/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export function useMotionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const landmarkerRef  = useRef<HandLandmarker | null>(null)
  const rafRef         = useRef<number>(0)
  const runningRef     = useRef(false)          // controls the RAF loop
  const lastTimeRef    = useRef(-1)
  const streamRef      = useRef<MediaStream | null>(null)
  const initDoneRef    = useRef(false)

  /* ─── stable processFrame — reads store via getState(), no stale closure ─── */
  const processFrame = useCallback(() => {
    if (!runningRef.current) return

    const video     = videoRef.current
    const landmarker = landmarkerRef.current

    if (!video || !landmarker || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    // Only process new frames
    const now = performance.now()
    if (video.currentTime === lastTimeRef.current) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    lastTimeRef.current = video.currentTime

    let result: HandLandmarkerResult
    try {
      result = landmarker.detectForVideo(video, now)
    } catch {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    // ── always read fresh state with getState() ──
    const store = useDJStore.getState()

    // Assign hands by screen position (left side = deckA, right side = deckB)
    // MediaPipe flips handedness labels for front-facing cameras,
    // so we ignore labels and use x-coordinate instead.
    let leftLandmarks:  typeof result.landmarks[0] | null = null
    let rightLandmarks: typeof result.landmarks[0] | null = null

    if (result.landmarks.length === 1) {
      const wristX = result.landmarks[0][0].x
      if (wristX < 0.5) leftLandmarks  = result.landmarks[0]
      else              rightLandmarks = result.landmarks[0]
    } else if (result.landmarks.length >= 2) {
      const sorted = [...result.landmarks].sort((a, b) => a[0].x - b[0].x)
      leftLandmarks  = sorted[0]
      rightLandmarks = sorted[1]
    }

    // Quality indicator
    const quality = calcMotionQuality(leftLandmarks ?? rightLandmarks, 640, 480)
    store.setMotionQuality(quality)

    // Visual overlay positions (mirror x because video is CSS-mirrored)
    store.setHandPositions(
      leftLandmarks  ? { x: 1 - leftLandmarks[0].x,  y: leftLandmarks[0].y  } : null,
      rightLandmarks ? { x: 1 - rightLandmarks[0].x, y: rightLandmarks[0].y } : null
    )

    // Map to DJ controls
    const controls = mapHandsToControls(leftLandmarks, rightLandmarks, store.motionMode)

    if (controls.crossfader  !== undefined) store.setCrossfader(controls.crossfader)
    if (controls.volumeA     !== undefined) store.setDeckVolume('A', controls.volumeA)
    if (controls.volumeB     !== undefined) store.setDeckVolume('B', controls.volumeB)
    if (controls.eqHigh      !== undefined) store.setDeckEQ('A', 'high', controls.eqHigh)
    if (controls.scratchSpeed !== undefined) audioEngine.scratch('A', controls.scratchSpeed)

    rafRef.current = requestAnimationFrame(processFrame)
  }, [videoRef]) // stable — no store reference, no re-creation on state updates

  /* ─── init MediaPipe ─── */
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

  /* ─── camera ─── */
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve()
        })
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
    lastTimeRef.current = -1
  }, [])

  /* ─── toggle RAF loop when motionEnabled changes ─── */
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
