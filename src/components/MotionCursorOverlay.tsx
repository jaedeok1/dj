import { useEffect, useRef } from 'react'
import { useDJStore, type HandLandmark } from '../store/djStore'
import { controlRegistry } from '../lib/controlRegistry'

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],[0,5],
]

const TIPS = [4, 8, 12, 16, 20]

export function MotionCursorOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animId: number

    const draw = () => {
      const {
        handsData, motionEnabled, pinchLabel,
        hoveredControlLeft, hoveredControlRight,
        grabbedControlLeft, grabbedControlRight,
      } = useDJStore.getState()
      const W = window.innerWidth
      const H = window.innerHeight

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W
        canvas.height = H
      }

      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, W, H)

      if (!motionEnabled) {
        animId = requestAnimationFrame(draw)
        return
      }

      // ── Control highlights (under hand overlay) ──
      drawControlHighlight(ctx, hoveredControlLeft,  '#22C55E', false)
      drawControlHighlight(ctx, hoveredControlRight, '#818CF8', false)
      drawControlHighlight(ctx, grabbedControlLeft,  '#22C55E', true)
      drawControlHighlight(ctx, grabbedControlRight, '#818CF8', true)

      // ── Grab lines: finger tip → grabbed control ──
      drawGrabLine(ctx, handsData.left,  grabbedControlLeft,  W, H)
      drawGrabLine(ctx, handsData.right, grabbedControlRight, W, H)

      // ── Hand skeleton + cursor ──
      drawHandOnScreen(ctx, handsData.left,  '#22C55E', handsData.leftPinch,  W, H)
      drawHandOnScreen(ctx, handsData.right, '#818CF8', handsData.rightPinch, W, H)

      // ── Pinch label HUD ──
      const anyPinch = handsData.leftPinch || handsData.rightPinch
      if (anyPinch && pinchLabel) {
        const text = `✊  ${pinchLabel}`
        const padX = 18
        ctx.font = 'bold 13px Poppins, sans-serif'
        const tw = ctx.measureText(text).width
        const bx = W / 2 - tw / 2 - padX
        const by = H - 52
        const bw = tw + padX * 2
        const bh = 28

        ctx.beginPath()
        roundRect(ctx, bx, by, bw, bh, bh / 2)
        ctx.fillStyle = '#FBBF2420'
        ctx.fill()
        ctx.strokeStyle = '#FBBF2470'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = '#FBBF24'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bx + padX, by + bh / 2)
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  )
}

function drawControlHighlight(
  ctx: CanvasRenderingContext2D,
  id: string | null,
  color: string,
  grabbed: boolean,
) {
  if (!id) return
  const ctrl = controlRegistry.get(id)
  if (!ctrl) return
  const rect = ctrl.getRect()
  if (!rect) return

  const pad = grabbed ? 10 : 5
  const x = rect.left - pad
  const y = rect.top  - pad
  const w = rect.width  + pad * 2
  const h = rect.height + pad * 2
  const r = Math.min(14, Math.min(w, h) / 2)

  ctx.beginPath()
  roundRect(ctx, x, y, w, h, r)

  if (grabbed) {
    ctx.fillStyle = '#FBBF2412'
    ctx.fill()
    ctx.strokeStyle = '#FBBF24CC'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.beginPath()
    roundRect(ctx, x - 7, y - 7, w + 14, h + 14, r + 5)
    ctx.strokeStyle = '#FBBF2450'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.fillStyle = `${color}0C`
    ctx.fill()
    ctx.strokeStyle = `${color}80`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function drawGrabLine(
  ctx: CanvasRenderingContext2D,
  lm: HandLandmark[] | null,
  controlId: string | null,
  W: number,
  H: number,
) {
  if (!lm || !controlId) return
  const ctrl = controlRegistry.get(controlId)
  if (!ctrl) return
  const rect = ctrl.getRect()
  if (!rect) return

  const ix = lm[8].x * W
  const iy = lm[8].y * H
  const cx = rect.left + rect.width  / 2
  const cy = rect.top  + rect.height / 2

  ctx.beginPath()
  ctx.moveTo(ix, iy)
  ctx.lineTo(cx, cy)
  ctx.strokeStyle = '#FBBF2455'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawHandOnScreen(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[] | null,
  color: string,
  pinching: boolean,
  W: number,
  H: number,
) {
  if (!landmarks || landmarks.length < 21) return

  const px = (lm: HandLandmark) => lm.x * W
  const py = (lm: HandLandmark) => lm.y * H

  ctx.lineWidth = 1.5
  ctx.strokeStyle = `${color}50`
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(px(landmarks[a]), py(landmarks[a]))
    ctx.lineTo(px(landmarks[b]), py(landmarks[b]))
    ctx.stroke()
  }

  for (let i = 0; i < landmarks.length; i++) {
    const isTip     = TIPS.includes(i)
    const isThumb   = i === 4
    const isIndex   = i === 8
    const pinchFinger = (isThumb || isIndex) && pinching
    const r = isTip ? 5 : 3

    ctx.beginPath()
    ctx.arc(px(landmarks[i]), py(landmarks[i]), r, 0, Math.PI * 2)
    ctx.fillStyle = pinchFinger ? '#FBBF24' : isTip ? color : `${color}99`
    ctx.fill()
  }

  // Index tip: main pointer cursor
  const idx = landmarks[8]
  const ix = px(idx), iy = py(idx)

  ctx.beginPath()
  ctx.arc(ix, iy, pinching ? 14 : 18, 0, Math.PI * 2)
  ctx.strokeStyle = pinching ? '#FBBF24CC' : `${color}CC`
  ctx.lineWidth = pinching ? 2.5 : 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(ix, iy, pinching ? 6 : 5, 0, Math.PI * 2)
  ctx.fillStyle = pinching ? '#FBBF24' : color
  ctx.fill()

  const glow = ctx.createRadialGradient(ix, iy, 0, ix, iy, pinching ? 30 : 24)
  glow.addColorStop(0, pinching ? '#FBBF2440' : `${color}30`)
  glow.addColorStop(1, 'transparent')
  ctx.beginPath()
  ctx.arc(ix, iy, pinching ? 30 : 24, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // Thumb tip: secondary dot
  const thumb = landmarks[4]
  const tx = px(thumb), ty = py(thumb)
  ctx.beginPath()
  ctx.arc(tx, ty, pinching ? 8 : 5, 0, Math.PI * 2)
  ctx.fillStyle = pinching ? '#FBBF24' : `${color}AA`
  ctx.fill()

  // Pinch indicator
  const mx = (ix + tx) / 2
  const my = (iy + ty) / 2
  const dist = Math.hypot(ix - tx, iy - ty)

  if (pinching) {
    ctx.beginPath()
    ctx.arc(mx, my, 16, 0, Math.PI * 2)
    ctx.fillStyle = '#FBBF2425'
    ctx.fill()
    ctx.strokeStyle = '#FBBF24AA'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(mx, my, 26, 0, Math.PI * 2)
    ctx.strokeStyle = '#FBBF2450'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    const proximity = Math.max(0, 1 - dist / (W * 0.08))
    if (proximity > 0.1) {
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(ix, iy)
      ctx.strokeStyle = `rgba(251,191,36,${proximity * 0.6})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}
