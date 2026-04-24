import { BookOpen, Settings } from 'lucide-react'
import { useDJStore } from '../store/djStore'
import { Deck } from './Deck'
import { Mixer } from './Mixer'
import { EffectPad } from './EffectPad'
import { MotionCamera } from './MotionCamera'
import { MotionCursorOverlay } from './MotionCursorOverlay'

export function MainDJScreen() {
  const { setScreen, motionEnabled, motionQuality } = useDJStore()

  const qualityColor =
    motionQuality > 0.7 ? '#22C55E' :
    motionQuality > 0.3 ? '#F59E0B' : '#9ca3af'

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      background: '#0F0F23',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1a1a2e',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{
            fontFamily: 'Righteous',
            fontSize: '18px',
            color: '#22C55E',
            margin: 0,
            textShadow: '0 0 12px #22C55E50',
            letterSpacing: '2px',
          }}>
            MOTION DJ
          </h1>
          <span style={{ fontSize: '10px', color: qualityColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: qualityColor, display: 'inline-block',
              boxShadow: motionEnabled ? `0 0 6px ${qualityColor}` : 'none',
            }} />
            {motionEnabled ? '모션 ON' : '카메라 로딩…'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setScreen('tutorial')} style={iconBtn} aria-label="튜토리얼">
            <BookOpen size={14} />
          </button>
          <button onClick={() => setScreen('calibration')} style={iconBtn} aria-label="설정">
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* 3-column layout: Deck A | Mixer | Deck B */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: 'minmax(0, 1fr) 260px minmax(0, 1fr)',
        gridTemplateRows: 'auto auto',
        alignContent: 'start',
      }}>
        {/* Row 1 */}
        <Deck deckId="A" />
        <Mixer />
        <Deck deckId="B" />

        {/* Row 2: Effects full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <EffectPad />
        </div>
      </div>

      {/* Hidden camera auto-starts motion tracking */}
      <MotionCamera />

      {/* Full-screen hand cursor overlay */}
      <MotionCursorOverlay />
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32,
  borderRadius: '8px',
  background: 'transparent',
  border: '1px solid #27273B',
  cursor: 'pointer',
  color: '#6B7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
