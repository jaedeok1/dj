import { useRef, useCallback } from 'react'

interface Props {
  label: string
  value: number      // -1 to 1 or 0 to 1
  min?: number
  max?: number
  onChange: (val: number) => void
  color?: string
  size?: number
}

export function Knob({ label, value, min = -1, max = 1, onChange, color = '#22C55E', size = 44 }: Props) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(value)

  const normalized = (value - min) / (max - min)
  const angle = -140 + normalized * 280  // -140deg to +140deg

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startY.current = e.clientY
    startVal.current = value

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = (startY.current - ev.clientY) / 100
      const newVal = Math.min(max, Math.max(min, startVal.current + delta * (max - min)))
      onChange(newVal)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, min, max, onChange])

  return (
    <div className="flex flex-col items-center gap-1" style={{ cursor: 'ns-resize' }}>
      <div
        onMouseDown={onMouseDown}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `conic-gradient(${color} 0deg, ${color} ${normalized * 280}deg, #27273B ${normalized * 280}deg)`,
          transform: `rotate(-140deg)`,
          border: '2px solid #312E81',
          position: 'relative',
          boxShadow: `0 0 8px ${color}40`,
          userSelect: 'none',
        }}
      >
        {/* indicator */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '50%',
          transform: `translateX(-50%) rotate(${angle + 140}deg)`,
          transformOrigin: '1px 16px',
          width: '2px',
          height: '8px',
          background: '#F8FAFC',
          borderRadius: '1px',
        }} />
      </div>
      <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>{label}</span>
    </div>
  )
}
