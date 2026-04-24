import { useRef, useEffect } from 'react'
import { useDJStore } from '../store/djStore'
import { controlRegistry } from '../lib/controlRegistry'

export function Crossfader() {
  const { crossfader, masterVolume, setCrossfader, setMasterVolume } = useDJStore()

  const xfaderRef   = useRef<HTMLDivElement>(null)
  const masterRef   = useRef<HTMLDivElement>(null)
  const xfaderVal   = useRef(crossfader)
  const masterVal   = useRef(masterVolume)
  xfaderVal.current = crossfader
  masterVal.current = masterVolume

  useEffect(() => {
    controlRegistry.register('crossfader', {
      id: 'crossfader', type: 'slider-h', label: '크로스페이더',
      min: 0, max: 1,
      getValue: () => xfaderVal.current,
      setValue: setCrossfader,
      getRect:  () => xfaderRef.current?.getBoundingClientRect() ?? null,
    })
    controlRegistry.register('master-vol', {
      id: 'master-vol', type: 'slider-h', label: '마스터 볼륨',
      min: 0, max: 1,
      getValue: () => masterVal.current,
      setValue: setMasterVolume,
      getRect:  () => masterRef.current?.getBoundingClientRect() ?? null,
    })
    return () => {
      controlRegistry.unregister('crossfader')
      controlRegistry.unregister('master-vol')
    }
  }, [])

  const aGain = crossfader <= 0.5 ? 1 : 1 - (crossfader - 0.5) * 2
  const bGain = crossfader >= 0.5 ? 1 : crossfader * 2

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #312E81',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Crossfader */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 700 }}>
            A {Math.round(aGain * 100)}%
          </span>
          <span style={{ fontFamily: 'Righteous', fontSize: '11px', color: '#9ca3af', letterSpacing: '1px' }}>
            크로스페이더
          </span>
          <span style={{ fontSize: '12px', color: '#4338CA', fontWeight: 700 }}>
            {Math.round(bGain * 100)}% B
          </span>
        </div>

        <div ref={xfaderRef} style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            height: '8px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #22C55E50, #312E81, #4338CA50)',
          }} />
          <input
            type="range"
            min={0} max={1} step={0.001}
            value={crossfader}
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
            style={{ width: '100%', position: 'relative', zIndex: 1, height: '100%' }}
            aria-label="크로스페이더"
          />
        </div>
      </div>

      {/* Master volume */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Righteous', fontSize: '11px', color: '#9ca3af', letterSpacing: '1px' }}>
            마스터 볼륨
          </span>
          <span style={{ fontSize: '12px', color: '#F8FAFC', fontWeight: 600 }}>{Math.round(masterVolume * 100)}%</span>
        </div>
        <div ref={masterRef} style={{ position: 'relative', height: '36px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#F8FAFC', height: '100%' }}
            aria-label="마스터 볼륨"
          />
        </div>
      </div>

      {/* VU meter */}
      <div style={{ display: 'flex', gap: '3px', height: '24px', alignItems: 'flex-end' }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const threshold = i / 20
          const lit = threshold < masterVolume * 0.9
          const color = i < 14 ? '#22C55E' : i < 17 ? '#F59E0B' : '#EF4444'
          return (
            <div key={i} style={{
              flex: 1,
              height: `${40 + i * 3}%`,
              background: lit ? color : '#27273B',
              borderRadius: '1px',
              transition: 'background 0.05s',
            }} />
          )
        })}
      </div>
    </div>
  )
}
