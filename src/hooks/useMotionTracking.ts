import { useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { mapHandsToControls, calcMotionQuality } from '../lib/motionMapper'
import { useDJStore } from '../store/djStore'
import { audioEngine } from '../lib/audioEngine'

export function useMotionTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const store = useDJStore()
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const lastVideoTime = useRef(-1)
  const streamRef = useRef<MediaStream | null>(null)

  const initLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      return true
    } catch {
      return false
    }
  }, [videoRef])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cancelAnimationFrame(rafRef.current ?? 0)
  }, [])

  const processFrame = useCallback(() => {
    if (!store.motionEnabled) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    if (video.currentTime === lastVideoTime.current) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }
    lastVideoTime.current = video.currentTime

    let result: HandLandmarkerResult
    try {
      result = landmarker.detectForVideo(video, performance.now())
    } catch {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    let leftLandmarks = null
    let rightLandmarks = null

    result.handedness.forEach((handedness, i) => {
      const label = handedness[0].categoryName
      if (label === 'Left') leftLandmarks = result.landmarks[i]
      else rightLandmarks = result.landmarks[i]
    })

    // Quality
    const quality = calcMotionQuality(leftLandmarks ?? rightLandmarks, 640, 480)
    store.setMotionQuality(quality)

    // Hand positions for overlay
    const lPos = leftLandmarks ? { x: (leftLandmarks as any)[0].x, y: (leftLandmarks as any)[0].y } : null
    const rPos = rightLandmarks ? { x: (rightLandmarks as any)[0].x, y: (rightLandmarks as any)[0].y } : null
    store.setHandPositions(lPos, rPos)

    // Map to controls
    const controls = mapHandsToControls(leftLandmarks, rightLandmarks, store.motionMode)

    if (controls.crossfader !== undefined) store.setCrossfader(controls.crossfader)
    if (controls.volumeA !== undefined) store.setDeckVolume('A', controls.volumeA)
    if (controls.volumeB !== undefined) store.setDeckVolume('B', controls.volumeB)
    if (controls.eqHigh !== undefined) store.setDeckEQ('A', 'high', controls.eqHigh)
    if (controls.scratchSpeed !== undefined) audioEngine.scratch('A', controls.scratchSpeed)

    rafRef.current = requestAnimationFrame(processFrame)
  }, [store, videoRef])

  useEffect(() => {
    if (store.motionEnabled) {
      rafRef.current = requestAnimationFrame(processFrame)
    } else {
      cancelAnimationFrame(rafRef.current ?? 0)
    }
    return () => cancelAnimationFrame(rafRef.current ?? 0)
  }, [store.motionEnabled, processFrame])

  return { initLandmarker, startCamera, stopCamera }
}
