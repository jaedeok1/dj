import { useDJStore } from '../store/djStore'

const EFFECTS = [
  { id: 'filter', label: 'FILTER', color: '#8B5CF6' },
  { id: 'delay',  label: 'DELAY',  color: '#EC4899' },
  { id: 'reverb', label: 'REVERB', color: '#F59E0B' },
  { id: 'echo',   label: 'ECHO',   color: '#06B6D4' },
]

export function EffectPad() {
  const { activeEffect, effectIntensity, setActiveEffect, setEffectIntensity } = useDJStore()

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #312E81',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontFamily: 'Righteous', color: '#9ca3af', fontSize: '11px', letterSpacing: '1px' }}>
        이펙트
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {EFFECTS.map((fx) => {
          const active = activeEffect === fx.id
          return (
            <button
              key={fx.id}
              onClick={() => setActiveEffect(active ? null : fx.id)}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border: `1px solid ${active ? fx.color : '#27273B'}`,
                background: active ? `${fx.color}20` : 'transparent',
                color: active ? fx.color : '#6B7280',
                fontSize: '11px',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '1px',
                boxShadow: active ? `0 0 10px ${fx.color}30` : 'none',
              }}
            >
              {fx.label}
            </button>
          )
        })}
      </div>

      {activeEffect && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>강도 {Math.round(effectIntensity * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectIntensity}
            onChange={(e) => setEffectIntensity(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: EFFECTS.find(f => f.id === activeEffect)?.color }}
            aria-label="이펙트 강도"
          />
        </div>
      )}
    </div>
  )
}
