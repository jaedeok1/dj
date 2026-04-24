import { useRef, useCallback, useEffect } from 'react'
import { controlRegistry } from '../lib/controlRegistry'

interface Props {
  id?: string
  label: string
  value: number
  min?: number
  max?: number
  onChange: (val: number) => void
  color?: string
  size?: number
}

export function Knob({ id, label, value, min = -1, max = 1, onChange, color = '#22C55E', size = 52 }: Props) {
  const domRef    = useRef<HTMLDivElement>(null)
  const dragging  = useRef(false)
  const startY    = useRef(0)
  const startVal  = useRef(value)
  const valueRef  = useRef(value)
  const changeRef = useRef(onChange)
  valueRef.current  = value
  changeRef.current = onChange

  useEffect(() => {
    if (!id) return
    controlRegistry.register(id, {
      id, type: 'knob', label, min, max,
      getValue: () => valueRef.current,
      setValue: (v) => changeRef.current(v),
      getRect:  () => domRef.current?.getBoundingClientRect() ?? null,
    })
    return () => controlRegistry.unregister(id)
  }, [id, label, min, max])

  const normalized = (value - min) / (max - min)
  const angle = -140 + normalized * 280

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
    <div ref={domRef} className="flex flex-col items-center gap-1" style={{ cursor: 'ns-resize' }}>
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
          boxShadow: `0 0 10px ${color}40`,
          userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '7px',
          left: '50%',
          transform: `translateX(-50%) rotate(${angle + 140}deg)`,
          transformOrigin: '1px 18px',
          width: '2px',
          height: '10px',
          background: '#F8FAFC',
          borderRadius: '1px',
        }} />
      </div>
      <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>{label}</span>
    </div>
  )
}
