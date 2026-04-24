import { BookOpen, Settings } from 'lucide-react'
import { useDJStore } from '../store/djStore'
import { Deck } from './Deck'
import { Crossfader } from './Crossfader'
import { EffectPad } from './EffectPad'
import { MotionCamera } from './MotionCamera'

export function MainDJScreen() {
  const { setScreen } = useDJStore()

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      background: '#0F0F23',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <header style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1a1a2e',
        flexShrink: 0,
      }}>
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setScreen('tutorial')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid #27273B',
              cursor: 'pointer',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="튜토리얼"
          >
            <BookOpen size={14} />
          </button>
          <button
            onClick={() => setScreen('calibration')}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid #27273B',
              cursor: 'pointer',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="설정"
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'grid',
        gap: '12px',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        alignContent: 'start',
      }}>
        {/* Deck A */}
        <Deck deckId="A" />

        {/* Deck B */}
        <Deck deckId="B" />

        {/* Crossfader - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Crossfader />
        </div>

        {/* Effects */}
        <EffectPad />

        {/* Motion camera */}
        <MotionCamera />
      </div>
    </div>
  )
}
