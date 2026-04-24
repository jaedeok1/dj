import { useDJStore } from '../store/djStore'

export function Crossfader() {
  const { crossfader, masterVolume, setCrossfader, setMasterVolume } = useDJStore()

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
      gap: '14px',
    }}>
      {/* Crossfader */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>
            A {Math.round(aGain * 100)}%
          </span>
          <span style={{ fontFamily: 'Righteous', fontSize: '11px', color: '#9ca3af', letterSpacing: '1px' }}>
            크로스페이더
          </span>
          <span style={{ fontSize: '11px', color: '#4338CA', fontWeight: 600 }}>
            {Math.round(bGain * 100)}% B
          </span>
        </div>

        {/* Fader track */}
        <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
          {/* gradient track */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '6px',
            borderRadius: '3px',
            background: 'linear-gradient(to right, #22C55E40, #312E81, #4338CA40)',
          }} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={crossfader}
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
            style={{ width: '100%', position: 'relative', zIndex: 1 }}
            aria-label="크로스페이더"
          />
        </div>
      </div>

      {/* Master volume */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Righteous', fontSize: '11px', color: '#9ca3af', letterSpacing: '1px' }}>
            마스터 볼륨
          </span>
          <span style={{ fontSize: '11px', color: '#F8FAFC' }}>{Math.round(masterVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#F8FAFC' }}
          aria-label="마스터 볼륨"
        />
      </div>

      {/* VU meter visualization */}
      <div style={{ display: 'flex', gap: '3px', height: '20px', alignItems: 'flex-end' }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const threshold = i / 20
          const lit = threshold < masterVolume * 0.9
          const color = i < 14 ? '#22C55E' : i < 17 ? '#F59E0B' : '#EF4444'
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${40 + i * 3}%`,
                background: lit ? color : '#27273B',
                borderRadius: '1px',
                transition: 'background 0.05s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
