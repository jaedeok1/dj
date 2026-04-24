import { useEffect, useRef } from 'react'
import type { DeckId } from '../store/djStore'
import { useDJStore } from '../store/djStore'

interface Props {
  deckId: DeckId
  color: string
}

export function Waveform({ deckId, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { decks } = useDJStore()
  const deck = decks[deckId]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Simulated waveform bars
    const bars = 60
    const barW = W / bars - 1
    const progress = deck.progress

    for (let i = 0; i < bars; i++) {
      const ratio = i / bars
      const played = ratio < progress
      const heightRatio = 0.2 + Math.abs(Math.sin(i * 0.8) * 0.5 + Math.cos(i * 0.3) * 0.3)
      const barH = H * heightRatio

      ctx.fillStyle = played ? color : '#312E81'
      ctx.globalAlpha = played ? 1 : 0.5
      ctx.fillRect(i * (barW + 1), (H - barH) / 2, barW, barH)
    }

    // Playhead
    ctx.globalAlpha = 1
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(W * progress - 1, 0, 2, H)
  }, [deck.progress, color])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={50}
      style={{ width: '100%', height: '50px', borderRadius: '4px' }}
    />
  )
}
