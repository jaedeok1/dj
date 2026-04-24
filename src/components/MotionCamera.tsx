import { useRef, useCallback, useState } from 'react'
import { Camera, CameraOff, Zap, ZapOff, Loader2, AlertTriangle } from 'lucide-react'
import { useDJStore } from '../store/djStore'
import { useMotionTracking } from '../hooks/useMotionTracking'

export function MotionCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const store    = useDJStore()
  const { initLandmarker, startCamera, stopCamera } = useMotionTracking(videoRef)

  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState<string | null>(null)

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
    store.setHandPositions(null, null)
    setError(null)
  }, [stopCamera, store])

  const qualityColor =
    store.motionQuality > 0.7 ? '#22C55E' :
    store.motionQuality > 0.3 ? '#F59E0B' : '#EF4444'

  const modes: Array<{ key: typeof store.motionMode; label: string; desc: string }> = [
    { key: 'crossfader', label: '크로스페이더', desc: '손 좌우 이동' },
    { key: 'volume',     label: '볼륨',        desc: '손 높낮이'    },
    { key: 'eq',         label: 'EQ',          desc: '손목 기울기'  },
    { key: 'scratch',    label: '스크래치',     desc: '손 빠른 이동' },
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
              : store.motionEnabled ? <Camera size={14} /> : <CameraOff size={14} />
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#EF444420',
          border: '1px solid #EF444460',
          borderRadius: '6px',
          padding: '8px',
          display: 'flex',
          gap: '6px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={12} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '11px', color: '#FCA5A5', lineHeight: 1.4 }}>{error}</span>
        </div>
      )}

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
            transform: 'scaleX(-1)',           // mirror so user sees natural view
            display: store.motionEnabled ? 'block' : 'none',
          }}
        />

        {!store.motionEnabled && !loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', color: '#4B5563',
          }}>
            <CameraOff size={28} />
            <span style={{ fontSize: '11px' }}>카메라 버튼을 눌러 모션 인식 시작</span>
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', background: '#0F0F23CC',
          }}>
            <Loader2 size={28} color="#4338CA" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>모델 로딩 중…</span>
          </div>
        )}

        {/* Hand position dots (already mirror-corrected in hook) */}
        {store.motionEnabled && store.leftHandPos && (
          <HandDot x={store.leftHandPos.x} y={store.leftHandPos.y} color="#22C55E" label="A" />
        )}
        {store.motionEnabled && store.rightHandPos && (
          <HandDot x={store.rightHandPos.x} y={store.rightHandPos.y} color="#4338CA" label="B" />
        )}
      </div>

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
                padding: '5px 6px',
                borderRadius: '6px',
                border: `1px solid ${active ? '#4338CA' : '#27273B'}`,
                background: active ? '#4338CA20' : 'transparent',
                color: active ? '#F8FAFC' : '#6B7280',
                fontSize: '10px',
                cursor: 'pointer',
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

      {/* Current mode hint */}
      {store.motionEnabled && (
        <div style={{
          fontSize: '10px', color: '#6B7280', textAlign: 'center',
          background: '#27273B', borderRadius: '4px', padding: '4px 6px',
        }}>
          {modes.find(m => m.key === store.motionMode)?.desc} → {modes.find(m => m.key === store.motionMode)?.label} 조절
        </div>
      )}
    </div>
  )
}

function HandDot({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x * 100}%`,
      top:  `${y * 100}%`,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 16, height: 16,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '8px', fontWeight: 700, color: '#0F0F23',
      }}>{label}</div>
    </div>
  )
}
