import { useRef, useEffect } from 'react'
import { useDJStore } from '../store/djStore'
import { Knob } from './Knob'
import { Crossfader } from './Crossfader'
import { controlRegistry } from '../lib/controlRegistry'

const BANDS: Array<{ band: 'high' | 'mid' | 'low'; label: string }> = [
  { band: 'high', label: 'HI'  },
  { band: 'mid',  label: 'MID' },
  { band: 'low',  label: 'LOW' },
]

export function Mixer() {
  const { decks, setDeckVolume, setDeckEQ } = useDJStore()

  const volARef  = useRef<HTMLDivElement>(null)
  const volBRef  = useRef<HTMLDivElement>(null)
  const volAVal  = useRef(decks.A.volume)
  const volBVal  = useRef(decks.B.volume)
  volAVal.current = decks.A.volume
  volBVal.current = decks.B.volume

  useEffect(() => {
    controlRegistry.register('vol-A', {
      id: 'vol-A', type: 'slider-v', label: '덱 A 볼륨',
      min: 0, max: 1,
      getValue: () => volAVal.current,
      setValue: (v) => setDeckVolume('A', v),
      getRect:  () => volARef.current?.getBoundingClientRect() ?? null,
    })
    controlRegistry.register('vol-B', {
      id: 'vol-B', type: 'slider-v', label: '덱 B 볼륨',
      min: 0, max: 1,
      getValue: () => volBVal.current,
      setValue: (v) => setDeckVolume('B', v),
      getRect:  () => volBRef.current?.getBoundingClientRect() ?? null,
    })
    return () => {
      controlRegistry.unregister('vol-A')
      controlRegistry.unregister('vol-B')
    }
  }, [])

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #312E81',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'stretch',
    }}>
      <span style={{
        fontFamily: 'Righteous',
        color: '#6B7280',
        fontSize: '10px',
        letterSpacing: '2px',
        textAlign: 'center',
      }}>
        MIXER
      </span>

      {/* EQ rows: A band | label | B band */}
      {BANDS.map(({ band, label }) => (
        <div key={band} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
        }}>
          <Knob
            id={`eq-A-${band}`}
            label="A"
            value={decks.A.eq[band]}
            onChange={(v) => setDeckEQ('A', band, v)}
            color="#22C55E"
            size={44}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '9px', color: '#4B5563', letterSpacing: '1px' }}>{label}</span>
            <div style={{ width: 1, height: 16, background: '#27273B' }} />
          </div>
          <Knob
            id={`eq-B-${band}`}
            label="B"
            value={decks.B.eq[band]}
            onChange={(v) => setDeckEQ('B', band, v)}
            color="#4338CA"
            size={44}
          />
        </div>
      ))}

      {/* Volume faders */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', gap: '8px', paddingTop: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600 }}>
            {Math.round(decks.A.volume * 100)}
          </span>
          <div ref={volARef} style={{ display: 'flex', justifyContent: 'center' }}>
            <input
              type="range"
              className="vertical-slider"
              min={0} max={1} step={0.01}
              value={decks.A.volume}
              onChange={(e) => setDeckVolume('A', parseFloat(e.target.value))}
              style={{ height: '100px', accentColor: '#22C55E' }}
              aria-label="덱 A 볼륨"
            />
          </div>
          <span style={{ fontSize: '9px', color: '#4B5563' }}>VOL A</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#4338CA', fontWeight: 600 }}>
            {Math.round(decks.B.volume * 100)}
          </span>
          <div ref={volBRef} style={{ display: 'flex', justifyContent: 'center' }}>
            <input
              type="range"
              className="vertical-slider"
              min={0} max={1} step={0.01}
              value={decks.B.volume}
              onChange={(e) => setDeckVolume('B', parseFloat(e.target.value))}
              style={{ height: '100px', accentColor: '#4338CA' }}
              aria-label="덱 B 볼륨"
            />
          </div>
          <span style={{ fontSize: '9px', color: '#4B5563' }}>VOL B</span>
        </div>
      </div>

      {/* Crossfader + Master */}
      <Crossfader />
    </div>
  )
}
