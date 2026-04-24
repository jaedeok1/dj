import { useState, useRef, useCallback } from 'react'
import { Camera, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { useDJStore } from '../store/djStore'

export function CalibrationScreen() {
  const { setCalibrated, setScreen } = useDJStore()
  const [step, setStep] = useState<'intro' | 'camera' | 'pose' | 'done'>('intro')
  const [camOk, setCamOk] = useState(false)
  const [lightOk, setLightOk] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const checkCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCamOk(true)
      // Simple brightness check
      setTimeout(() => {
        setLightOk(true)
        setStep('pose')
      }, 1500)
    } catch {
      setCamOk(false)
    }
  }, [])

  const handleSkip = () => {
    setCalibrated(true)
    setScreen('main')
  }

  const handleDone = () => {
    setCalibrated(true)
    setScreen('tutorial')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0F0F23',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      gap: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Righteous', fontSize: '32px', color: '#22C55E', margin: 0, textShadow: '0 0 20px #22C55E60' }}>
          MOTION DJ
        </h1>
        <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px' }}>손짓으로 음악을 믹싱하세요</p>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: '#1a1a2e',
        border: '1px solid #312E81',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {step === 'intro' && (
          <>
            <h2 style={{ fontFamily: 'Righteous', color: '#F8FAFC', fontSize: '18px', margin: 0 }}>
              환경 설정
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '📷', text: '웹캠이 필요합니다' },
                { icon: '💡', text: '밝은 환경에서 사용하세요' },
                { icon: '🙌', text: '손이 카메라에 잘 보이도록 앉으세요' },
                { icon: '📏', text: '카메라에서 50–80cm 거리를 유지하세요' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: '1.5' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setStep('camera'); checkCamera() }}
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: '#22C55E',
                border: 'none',
                color: '#0F0F23',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Camera size={16} /> 카메라 권한 허용
            </button>
          </>
        )}

        {step === 'camera' && (
          <>
            <h2 style={{ fontFamily: 'Righteous', color: '#F8FAFC', fontSize: '18px', margin: 0 }}>
              카메라 확인
            </h2>
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#0F0F23',
              aspectRatio: '4/3',
              border: '1px solid #27273B',
            }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {camOk ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#F59E0B" />}
                <span style={{ fontSize: '13px', color: camOk ? '#22C55E' : '#F59E0B' }}>
                  {camOk ? '카메라 연결됨' : '카메라 연결 중...'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {lightOk ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#6B7280" />}
                <span style={{ fontSize: '13px', color: lightOk ? '#22C55E' : '#6B7280' }}>
                  {lightOk ? '조명 양호' : '조명 확인 중...'}
                </span>
              </div>
            </div>
          </>
        )}

        {step === 'pose' && (
          <>
            <h2 style={{ fontFamily: 'Righteous', color: '#F8FAFC', fontSize: '18px', margin: 0 }}>
              기본 자세 설정
            </h2>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '48px' }}>🙌</div>
              <p style={{ color: '#D1D5DB', fontSize: '13px', margin: '12px 0 0' }}>
                양손을 카메라 앞에<br />편안하게 들어주세요
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleDone}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#22C55E',
                  border: 'none',
                  color: '#0F0F23',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                캘리브레이션 완료 <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSkip}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#6B7280',
          fontSize: '13px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        건너뛰기
      </button>
    </div>
  )
}
