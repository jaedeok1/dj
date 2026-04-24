import { useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Music } from 'lucide-react'
import type { DeckId } from '../store/djStore'
import { useDJStore } from '../store/djStore'
import { Waveform } from './Waveform'
import { Knob } from './Knob'
import { DemoTrackPanel } from './DemoTrackPanel'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { controlRegistry } from '../lib/controlRegistry'

interface Props {
  deckId: DeckId
}

const DECK_COLOR = { A: '#22C55E', B: '#4338CA' }
const DECK_LABEL = { A: 'DECK A', B: 'DECK B' }

export function Deck({ deckId }: Props) {
  const { decks, setDeckVolume, setDeckEQ } = useDJStore()
  const deck = decks[deckId]
  const { loadTrack, togglePlay } = useAudioEngine()
  const fileRef    = useRef<HTMLInputElement>(null)
  const volDivRef  = useRef<HTMLDivElement>(null)
  const volValRef  = useRef(deck.volume)
  volValRef.current = deck.volume
  const color = DECK_COLOR[deckId]

  useEffect(() => {
    const id = `vol-${deckId}`
    controlRegistry.register(id, {
      id, type: 'slider-v',
      label: `덱 ${deckId} 볼륨`,
      min: 0, max: 1,
      getValue: () => volValRef.current,
      setValue: (v) => setDeckVolume(deckId, v),
      getRect:  () => volDivRef.current?.getBoundingClientRect() ?? null,
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
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
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

      {/* Turntable */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, #2d2d4e, #0a0a1a)`,
          border: `3px solid ${color}`,
          boxShadow: `0 0 24px ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: deck.isPlaying ? 'spin-platter 2s linear infinite' : 'none',
        }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#0F0F23',
            border: `2px solid ${color}80`,
          }} />
          {[32, 45, 58].map((r) => (
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
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: deck.isPlaying ? color : 'transparent',
            border: `2px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: deck.isPlaying ? '#0F0F23' : color,
            transition: 'all 0.15s',
            boxShadow: deck.isPlaying ? `0 0 16px ${color}60` : 'none',
            flexShrink: 0,
          }}
          aria-label={deck.isPlaying ? '일시정지' : '재생'}
        >
          {deck.isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>

        {/* Volume fader */}
        <div ref={volDivRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>VOL</span>
          <input
            type="range"
            className="vertical-slider"
            min={0}
            max={1}
            step={0.01}
            value={deck.volume}
            onChange={(e) => setDeckVolume(deckId, parseFloat(e.target.value))}
            style={{ height: '80px', accentColor: color }}
            aria-label="볼륨"
          />
          <span style={{ fontSize: '10px', color, fontWeight: 600 }}>{Math.round(deck.volume * 100)}</span>
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
            flexShrink: 0,
          }}
          aria-label="트랙 불러오기"
        >
          <Music size={18} />
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
      <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '4px' }}>
        <Knob
          id={`eq-${deckId}-high`}
          label="HI"
          value={deck.eq.high}
          onChange={(v) => setDeckEQ(deckId, 'high', v)}
          color={color}
          size={52}
        />
        <Knob
          id={`eq-${deckId}-mid`}
          label="MID"
          value={deck.eq.mid}
          onChange={(v) => setDeckEQ(deckId, 'mid', v)}
          color={color}
          size={52}
        />
        <Knob
          id={`eq-${deckId}-low`}
          label="LOW"
          value={deck.eq.low}
          onChange={(v) => setDeckEQ(deckId, 'low', v)}
          color={color}
          size={52}
        />
      </div>

      {/* Demo tracks */}
      <div style={{ borderTop: '1px solid #27273B', paddingTop: '10px' }}>
        <DemoTrackPanel deckId={deckId} />
      </div>
    </div>
  )
}
