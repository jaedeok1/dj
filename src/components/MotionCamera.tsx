import { useRef, useEffect } from 'react'
import { useDJStore } from '../store/djStore'
import { useMotionTracking } from '../hooks/useMotionTracking'

export function MotionCamera() {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const startedRef  = useRef(false)
  const { initLandmarker, startCamera } = useMotionTracking(videoRef)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    initLandmarker()
      .then(() => startCamera())
      .then((ok) => { if (ok) useDJStore.getState().setMotionEnabled(true) })
      .catch(console.error)
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay muted playsInline
      style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
    />
  )
}
