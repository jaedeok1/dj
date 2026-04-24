import { useRef, useCallback } from 'react'
import { Camera, CameraOff, Zap, ZapOff } from 'lucide-react'
import { useDJStore } from '../store/djStore'
import { useMotionTracking } from '../hooks/useMotionTracking'

export function MotionCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const store = useDJStore()
  const { initLandmarker, startCamera, stopCamera } = useMotionTracking(videoRef)

  const handleToggle = useCallback(async () => {
    if (!store.motionEnabled) {
      await initLandmarker()
      const ok = await startCamera()
      if (ok) store.setMotionEnabled(true)
    } else {
      stopCamera()
      store.setMotionEnabled(false)
      store.setMotionQuality(0)
      store.setHandPositions(null, null)
    }
  }, [store, initLandmarker, startCamera, stopCamera])

  const qualityColor = store.motionQuality > 0.7 ? '#22C55E' : store.motionQuality > 0.3 ? '#f59e0b' : '#EF4444'
  const qualityLabel = store.motionQuality > 0.7 ? '인식 양호' : store.motionQuality > 0.3 ? '인식 보통' : '인식 불량'

  const modes: Array<{ key: typeof store.motionMode; label: string }> = [
    { key: 'crossfader', label: '크로스페이더' },
    { key: 'volume', label: '볼륨' },
    { key: 'eq', label: 'EQ' },
    { key: 'scratch', label: '스크래치' },
  ]

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #312E81',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Righteous', color: '#4338CA', fontSize: '12px', letterSpacing: '1px' }}>
          모션 컨트롤
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {store.motionEnabled && (
            <span style={{ fontSize: '10px', color: qualityColor }}>● {qualityLabel}</span>
          )}
          <button
            onClick={handleToggle}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: store.motionEnabled ? '#22C55E20' : 'transparent',
              border: `1px solid ${store.motionEnabled ? '#22C55E' : '#312E81'}`,
              cursor: 'pointer',
              color: store.motionEnabled ? '#22C55E' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label={store.motionEnabled ? '카메라 끄기' : '카메라 켜기'}
          >
            {store.motionEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
          </button>
        </div>
      </div>

      {/* Video feed */}
      <div style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#0F0F23',
        aspectRatio: '4/3',
        border: '1px solid #27273B',
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: store.motionEnabled ? 'block' : 'none',
          }}
        />
        {!store.motionEnabled && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#4B5563',
          }}>
            <CameraOff size={24} />
            <span style={{ fontSize: '11px' }}>카메라 꺼짐</span>
          </div>
        )}
        {/* Hand position overlay dots */}
        {store.motionEnabled && store.leftHandPos && (
          <div style={{
            position: 'absolute',
            left: `${(1 - store.leftHandPos.x) * 100}%`,
            top: `${store.leftHandPos.y * 100}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#22C55E',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px #22C55E',
            pointerEvents: 'none',
          }} />
        )}
        {store.motionEnabled && store.rightHandPos && (
          <div style={{
            position: 'absolute',
            left: `${(1 - store.rightHandPos.x) * 100}%`,
            top: `${store.rightHandPos.y * 100}%`,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#4338CA',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px #4338CA',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => store.setMotionMode(m.key)}
            style={{
              padding: '4px 6px',
              borderRadius: '6px',
              border: `1px solid ${store.motionMode === m.key ? '#4338CA' : '#27273B'}`,
              background: store.motionMode === m.key ? '#4338CA20' : 'transparent',
              color: store.motionMode === m.key ? '#F8FAFC' : '#6B7280',
              fontSize: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
            }}
          >
            {store.motionMode === m.key ? <Zap size={10} /> : <ZapOff size={10} />}
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
