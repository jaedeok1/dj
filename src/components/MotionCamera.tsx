import { useRef, useCallback, useState, useEffect } from 'react'
import { Camera, CameraOff, Zap, ZapOff, Loader2, AlertTriangle } from 'lucide-react'
import { useDJStore } from '../store/djStore'
import { useMotionTracking } from '../hooks/useMotionTracking'
import { HandOverlay } from './HandOverlay'

export function MotionCamera() {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const store         = useDJStore()
  const { initLandmarker, startCamera, stopCamera } = useMotionTracking(videoRef)

  const [loading,  setLoading ] = useState(false)
  const [error,    setError   ] = useState<string | null>(null)
  const [dispSize, setDispSize] = useState({ w: 320, h: 240 })

  // Track rendered video size for the overlay canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDispSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleEnable = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await initLandmarker()
      const ok = await startCamera()
      if (!ok) throw new Error('카메라 접근 실패. 권한을 확인해주세요.')
      store.setMotionEnabled(true)
    } catch (e: any) {
      setError(e?.message ?? '초기화 실패')
    } finally {
      setLoading(false)
    }
  }, [initLandmarker, startCamera, store])

  const handleDisable = useCallback(() => {
    stopCamera()
    store.setMotionEnabled(false)
    store.setMotionQuality(0)
    store.setHandsData({ left: null, right: null, leftPinch: false, rightPinch: false })
    setError(null)
  }, [stopCamera, store])

  const qualityColor =
    store.motionQuality > 0.7 ? '#22C55E' :
    store.motionQuality > 0.3 ? '#F59E0B' : '#EF4444'

  const modes: Array<{ key: typeof store.motionMode; label: string; desc: string }> = [
    { key: 'crossfader', label: '크로스페이더', desc: '핀치 후 회전' },
    { key: 'volume',     label: '볼륨',        desc: '핀치 후 회전' },
    { key: 'eq',         label: 'EQ',          desc: '핀치 후 회전' },
    { key: 'scratch',    label: '스크래치',     desc: '손 빠른 이동' },
  ]

  const { handsData, pinchLabel } = store
  const anyPinch = handsData.leftPinch || handsData.rightPinch

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
            <span style={{ fontSize: '10px', color: qualityColor }}>
              ● {store.motionQuality > 0.7 ? '인식 양호' : store.motionQuality > 0.3 ? '인식 보통' : '인식 불량'}
            </span>
          )}
          <button
            onClick={store.motionEnabled ? handleDisable : handleEnable}
            disabled={loading}
            style={{
              width: 32, height: 32,
              borderRadius: '8px',
              background: store.motionEnabled ? '#22C55E20' : 'transparent',
              border: `1px solid ${store.motionEnabled ? '#22C55E' : '#312E81'}`,
              cursor: loading ? 'wait' : 'pointer',
              color: store.motionEnabled ? '#22C55E' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label={store.motionEnabled ? '카메라 끄기' : '카메라 켜기'}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : store.motionEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#EF444420', border: '1px solid #EF444460',
          borderRadius: '6px', padding: '8px',
          display: 'flex', gap: '6px', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={12} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '11px', color: '#FCA5A5', lineHeight: 1.4 }}>{error}</span>
        </div>
      )}

      {/* Video + overlay */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#0F0F23',
          aspectRatio: '4/3',
          border: `1px solid ${anyPinch ? '#FBBF24' : '#27273B'}`,
          transition: 'border-color 0.15s',
          boxShadow: anyPinch ? '0 0 12px #FBBF2440' : 'none',
        }}
      >
        <video
          ref={videoRef}
          autoPlay muted playsInline
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: store.motionEnabled ? 'block' : 'none',
          }}
        />

        {/* Hand skeleton overlay */}
        {store.motionEnabled && (
          <HandOverlay
            leftLandmarks={handsData.left}
            rightLandmarks={handsData.right}
            leftPinch={handsData.leftPinch}
            rightPinch={handsData.rightPinch}
            width={dispSize.w}
            height={dispSize.h}
          />
        )}

        {/* Pinch label badge */}
        {anyPinch && pinchLabel && (
          <div style={{
            position: 'absolute',
            bottom: 6, left: '50%',
            transform: 'translateX(-50%)',
            background: '#FBBF2420',
            border: '1px solid #FBBF2480',
            borderRadius: '99px',
            padding: '2px 10px',
            fontSize: '10px',
            color: '#FBBF24',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            ✊ {pinchLabel}
          </div>
        )}

        {!store.motionEnabled && !loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', color: '#4B5563',
          }}>
            <CameraOff size={28} />
            <span style={{ fontSize: '11px' }}>카메라 켜기 → 모션 인식 시작</span>
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', background: '#0F0F23CC',
          }}>
            <Loader2 size={28} color="#4338CA" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>모델 로딩 중…</span>
          </div>
        )}
      </div>

      {/* Gesture guide */}
      {store.motionEnabled && (
        <div style={{
          background: '#27273B', borderRadius: '6px', padding: '6px 8px',
          fontSize: '10px', color: '#9CA3AF', lineHeight: 1.5,
        }}>
          <span style={{ color: '#FBBF24' }}>✊ 핀치</span>
          {' '}(엄지+검지 모으기) 후 손목 회전 →{' '}
          <span style={{ color: '#F8FAFC' }}>{modes.find(m => m.key === store.motionMode)?.label}</span> 조절
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {modes.map((m) => {
          const active = store.motionMode === m.key
          return (
            <button
              key={m.key}
              onClick={() => store.setMotionMode(m.key)}
              title={m.desc}
              style={{
                padding: '5px 6px', borderRadius: '6px',
                border: `1px solid ${active ? '#4338CA' : '#27273B'}`,
                background: active ? '#4338CA20' : 'transparent',
                color: active ? '#F8FAFC' : '#6B7280',
                fontSize: '10px', cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              }}
            >
              {active ? <Zap size={10} /> : <ZapOff size={10} />}
              {m.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
