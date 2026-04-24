import { Loader2, Music2 } from 'lucide-react'
import { DEMO_TRACKS } from '../lib/demoTracks'
import { useDemoTracks } from '../hooks/useDemoTracks'
import type { DeckId } from '../store/djStore'

interface Props {
  deckId: DeckId
}

const DECK_COLOR = { A: '#22C55E', B: '#4338CA' }

export function DemoTrackPanel({ deckId }: Props) {
  const { loadDemo, generating } = useDemoTracks()
  const color = DECK_COLOR[deckId]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '9px', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase' }}>
        데모 트랙
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {DEMO_TRACKS.map((track) => {
          const isLoading = generating[track.id]
          return (
            <button
              key={track.id}
              onClick={() => loadDemo(track.id, deckId)}
              disabled={isLoading}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: `1px solid ${color}30`,
                background: isLoading ? `${color}10` : 'transparent',
                color: isLoading ? '#6B7280' : '#D1D5DB',
                fontSize: '11px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = color
                  ;(e.currentTarget as HTMLButtonElement).style.background = `${color}10`
                }
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${color}30`
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {isLoading
                ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                : <Music2 size={10} color={color} />
              }
              <span style={{ flex: 1 }}>{track.style}</span>
              <span style={{ fontSize: '9px', color: '#6B7280' }}>{track.bpm} BPM</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
