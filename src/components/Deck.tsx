import { useRef, useCallback } from 'react'
import { Play, Pause, Music } from 'lucide-react'
import type { DeckId } from '../store/djStore'
import { useDJStore } from '../store/djStore'
import { Waveform } from './Waveform'
import { Knob } from './Knob'
import { DemoTrackPanel } from './DemoTrackPanel'
import { useAudioEngine } from '../hooks/useAudioEngine'

interface Props {
  deckId: DeckId
}

const DECK_COLOR = { A: '#22C55E', B: '#4338CA' }
const DECK_LABEL = { A: 'DECK A', B: 'DECK B' }

export function Deck({ deckId }: Props) {
  const { decks, setDeckVolume, setDeckEQ } = useDJStore()
  const deck = decks[deckId]
  const { loadTrack, togglePlay } = useAudioEngine()
  const fileRef = useRef<HTMLInputElement>(null)
  const color = DECK_COLOR[deckId]

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

  const elapsed = deck.duration * deck.progress
  const remaining = deck.duration - elapsed

  return (
    <div style={{
      background: '#1a1a2e',
      border: `1px solid ${color}30`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: `0 0 20px ${color}15`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Righteous', color, fontSize: '13px', letterSpacing: '2px' }}>
          {DECK_LABEL[deckId]}
        </span>
        {deck.bpm > 0 && (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{deck.bpm} BPM</span>
        )}
      </div>

      {/* Turntable */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #2d2d4e, #0a0a1a)`,
            border: `3px solid ${color}`,
            boxShadow: `0 0 20px ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            animation: deck.isPlaying ? 'spin-platter 2s linear infinite' : 'none',
          }}
        >
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#0F0F23',
            border: `2px solid ${color}80`,
          }} />
          {/* grooves */}
          {[30, 42, 54].map((r) => (
            <div key={r} style={{
              position: 'absolute',
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `1px solid ${color}15`,
              pointerEvents: 'none',
            }} />
          ))}
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
          maxWidth: '100%',
        }}>
          {deck.trackName}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
          {formatTime(elapsed)} / -{formatTime(remaining)}
        </div>
      </div>

      {/* Waveform */}
      <Waveform deckId={deckId} color={color} />

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Play/Pause */}
        <button
          onClick={() => togglePlay(deckId)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: deck.isPlaying ? color : 'transparent',
            border: `2px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: deck.isPlaying ? '#0F0F23' : color,
            transition: 'all 0.15s',
            boxShadow: deck.isPlaying ? `0 0 12px ${color}60` : 'none',
          }}
          aria-label={deck.isPlaying ? '일시정지' : '재생'}
        >
          {deck.isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        {/* Volume fader */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: '#9ca3af' }}>VOL</span>
          <input
            type="range"
            className="vertical-slider"
            min={0}
            max={1}
            step={0.01}
            value={deck.volume}
            onChange={(e) => setDeckVolume(deckId, parseFloat(e.target.value))}
            style={{ height: '60px', accentColor: color }}
            aria-label="볼륨"
          />
          <span style={{ fontSize: '9px', color: '#9ca3af' }}>{Math.round(deck.volume * 100)}</span>
        </div>

        {/* Load track */}
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
            transition: 'all 0.15s',
          }}
          aria-label="트랙 불러오기"
        >
          <Music size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* EQ Knobs */}
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <Knob
          label="HI"
          value={deck.eq.high}
          onChange={(v) => setDeckEQ(deckId, 'high', v)}
          color={color}
          size={36}
        />
        <Knob
          label="MID"
          value={deck.eq.mid}
          onChange={(v) => setDeckEQ(deckId, 'mid', v)}
          color={color}
          size={36}
        />
        <Knob
          label="LOW"
          value={deck.eq.low}
          onChange={(v) => setDeckEQ(deckId, 'low', v)}
          color={color}
          size={36}
        />
      </div>

      {/* Demo tracks */}
      <div style={{ borderTop: '1px solid #27273B', paddingTop: '10px' }}>
        <DemoTrackPanel deckId={deckId} />
      </div>
    </div>
  )
}
