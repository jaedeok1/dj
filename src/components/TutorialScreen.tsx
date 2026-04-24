import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useDJStore } from '../store/djStore'

const STEPS = [
  {
    title: '크로스페이더',
    icon: '↔️',
    desc: '왼손을 좌우로 움직이면 크로스페이더가 조절됩니다. 왼쪽으로 움직이면 덱 A, 오른쪽으로 움직이면 덱 B가 커집니다.',
    hint: '왼손을 천천히 좌우로 흔들어보세요',
    mode: 'crossfader',
  },
  {
    title: '볼륨',
    icon: '🔊',
    desc: '왼손(덱 A)과 오른손(덱 B)을 위아래로 움직여 볼륨을 조절합니다. 손을 올리면 볼륨 업, 내리면 볼륨 다운.',
    hint: '양손을 위아래로 움직여보세요',
    mode: 'volume',
  },
  {
    title: 'EQ',
    icon: '🎚️',
    desc: '오른손을 좌우로 기울여 하이 EQ를 조절합니다. 오른쪽으로 기울이면 고음 부스트, 왼쪽은 컷.',
    hint: '오른손 손목을 좌우로 기울여보세요',
    mode: 'eq',
  },
  {
    title: '스크래치',
    icon: '🎵',
    desc: '스크래치 모드에서 오른손으로 긁는 동작을 하면 음악이 스크래치됩니다.',
    hint: '오른손 검지와 중지를 좌우로 움직여보세요',
    mode: 'scratch',
  },
]

export function TutorialScreen() {
  const [step, setStep] = useState(0)
  const { setScreen } = useDJStore()

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

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
      {/* Progress */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 4,
              borderRadius: 2,
              background: i <= step ? '#22C55E' : '#27273B',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      <div style={{
        width: '100%',
        maxWidth: '360px',
        background: '#1a1a2e',
        border: '1px solid #312E81',
        borderRadius: '16px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fade-in 0.3s ease-out',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{current.icon}</div>
          <h2 style={{ fontFamily: 'Righteous', color: '#F8FAFC', fontSize: '20px', margin: '0 0 8px' }}>
            {current.title}
          </h2>
          <p style={{ color: '#D1D5DB', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            {current.desc}
          </p>
        </div>

        {/* Hint box */}
        <div style={{
          background: '#22C55E10',
          border: '1px solid #22C55E30',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          color: '#22C55E',
          textAlign: 'center',
        }}>
          💡 {current.hint}
        </div>

        <button
          onClick={() => isLast ? setScreen('main') : setStep(step + 1)}
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
          {isLast ? 'DJ 시작하기 🎧' : <>다음 <ChevronRight size={16} /></>}
        </button>
      </div>

      <button
        onClick={() => setScreen('main')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#6B7280',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <X size={14} /> 튜토리얼 건너뛰기
      </button>
    </div>
  )
}
