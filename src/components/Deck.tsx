import { useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Music } from 'lucide-react'
import type { DeckId } from '../store/djStore'
import { useDJStore } from '../store/djStore'
import { Waveform } from './Waveform'
import { DemoTrackPanel } from './DemoTrackPanel'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { controlRegistry } from '../lib/controlRegistry'
import { audioEngine } from '../lib/audioEngine'

interface Props { deckId: DeckId }

const DECK_COLOR = { A: '#22C55E', B: '#4338CA' }
const DECK_LABEL = { A: 'DECK A', B: 'DECK B' }

export function Deck({ deckId }: Props) {
  const { decks } = useDJStore()
  const deck = decks[deckId]
  const { loadTrack, togglePlay } = useAudioEngine()
  const fileRef      = useRef<HTMLInputElement>(null)
  const turntableRef = useRef<HTMLDivElement>(null)
  const scratchRef   = useRef(1.0)
  const color = DECK_COLOR[deckId]

  useEffect(() => {
    const id = `scratch-${deckId}`
    controlRegistry.register(id, {
      id, type: 'turntable',
      label: `덱 ${deckId} 스크래치`,
      min: 0.05, max: 3.5,
      getValue: () => 1.0,  // always start scratch from normal speed
      setValue: (v) => { scratchRef.current = v; audioEngine.scratch(deckId, v) },
      onRelease: () => { scratchRef.current = 1.0; audioEngine.scratch(deckId, 1.0) },
      getRect: () => turntableRef.current?.getBoundingClientRect() ?? null,
    })
    return () => controlRegistry.unregister(id)
  }, [deckId])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await loadTrack(deckId, file)
  }, [deckId, loadTrack])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const elapsed   = deck.duration * deck.progress
  const remaining = deck.duration - elapsed

  return (
    <div style={{
      background: '#1a1a2e',
      border: `1px solid ${color}30`,
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: `0 0 24px ${color}15`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Righteous', color, fontSize: '14px', letterSpacing: '2px' }}>
          {DECK_LABEL[deckId]}
        </span>
        {deck.bpm > 0 && (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{deck.bpm} BPM</span>
        )}
      </div>

      {/* Turntable — big, scratchable */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          ref={turntableRef}
          style={{
            width: 'clamp(120px, 85%, 200px)',
            aspectRatio: '1',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #2d2d4e, #0a0a1a)`,
            border: `4px solid ${color}`,
            boxShadow: `0 0 32px ${color}50, inset 0 0 20px ${color}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            animation: deck.isPlaying ? 'spin-platter 2s linear infinite' : 'none',
            cursor: 'crosshair',
          }}
        >
          <div style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#0F0F23',
            border: `2px solid ${color}80`,
          }} />
          {[30, 42, 56, 70, 82].map((r) => (
            <div key={r} style={{
              position: 'absolute',
              width: `${r}%`,
              height: `${r}%`,
              borderRadius: '50%',
              border: `1px solid ${color}12`,
              pointerEvents: 'none',
            }} />
          ))}
          {/* Scratch label */}
          <div style={{
            position: 'absolute',
            bottom: '18%',
            fontSize: '9px',
            color: `${color}60`,
            letterSpacing: '1px',
            fontFamily: 'Righteous',
          }}>
            SCRATCH
          </div>
        </div>
      </div>

      {/* Track info */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#F8FAFC',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {deck.trackName}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
          {formatTime(elapsed)} / -{formatTime(remaining)}
        </div>
      </div>

      {/* Waveform */}
      <Waveform deckId={deckId} color={color} />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        <button
          onClick={() => togglePlay(deckId)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: deck.isPlaying ? color : 'transparent',
            border: `2px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: deck.isPlaying ? '#0F0F23' : color,
            transition: 'all 0.15s',
            boxShadow: deck.isPlaying ? `0 0 20px ${color}60` : 'none',
          }}
          aria-label={deck.isPlaying ? '일시정지' : '재생'}
        >
          {deck.isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 44,
            height: 44,
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid #312E81',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#9ca3af',
          }}
          aria-label="트랙 불러오기"
        >
          <Music size={18} />
        </button>
        <input ref={fileRef} type="file" accept="audio/*"
          style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Demo tracks */}
      <div style={{ borderTop: '1px solid #27273B', paddingTop: '10px' }}>
        <DemoTrackPanel deckId={deckId} />
      </div>
    </div>
  )
}
