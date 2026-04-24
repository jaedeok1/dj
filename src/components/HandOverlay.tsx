import { useEffect, useRef } from 'react'
import type { HandLandmark } from '../store/djStore'

// MediaPipe hand skeleton connections
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],         // thumb
  [0,5],[5,6],[6,7],[7,8],         // index
  [5,9],[9,10],[10,11],[11,12],    // middle
  [9,13],[13,14],[14,15],[15,16],  // ring
  [13,17],[17,18],[18,19],[19,20], // pinky
  [0,17],[0,5],                    // palm
]

// Finger tip indices
const TIPS = [4, 8, 12, 16, 20]

interface Props {
  leftLandmarks:  HandLandmark[] | null
  rightLandmarks: HandLandmark[] | null
  leftPinch:      boolean
  rightPinch:     boolean
  width:          number
  height:         number
}

export function HandOverlay({ leftLandmarks, rightLandmarks, leftPinch, rightPinch, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    drawHand(ctx, leftLandmarks,  '#22C55E', leftPinch,  width, height)
    drawHand(ctx, rightLandmarks, '#818CF8', rightPinch, width, height)
  }, [leftLandmarks, rightLandmarks, leftPinch, rightPinch, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[] | null,
  color: string,
  pinching: boolean,
  W: number,
  H: number
) {
  if (!landmarks || landmarks.length < 21) return

  const px = (lm: HandLandmark) => lm.x * W
  const py = (lm: HandLandmark) => lm.y * H

  // ── skeleton lines ──
  ctx.lineWidth = 2
  ctx.strokeStyle = `${color}90`
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(px(landmarks[a]), py(landmarks[a]))
    ctx.lineTo(px(landmarks[b]), py(landmarks[b]))
    ctx.stroke()
  }

  // ── all landmark dots ──
  for (let i = 0; i < landmarks.length; i++) {
    const isTip   = TIPS.includes(i)
    const isThumb = i === 4
    const isIndex = i === 8
    const isPinchFinger = (isThumb || isIndex) && pinching

    const radius = isTip ? 6 : 3.5

    ctx.beginPath()
    ctx.arc(px(landmarks[i]), py(landmarks[i]), radius, 0, Math.PI * 2)
    ctx.fillStyle = isPinchFinger ? '#FBBF24' : isTip ? color : `${color}CC`
    ctx.fill()

    if (isPinchFinger) {
      ctx.beginPath()
      ctx.arc(px(landmarks[i]), py(landmarks[i]), radius + 4, 0, Math.PI * 2)
      ctx.strokeStyle = '#FBBF24'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // ── pinch visual: arc between thumb tip and index tip ──
  const thumb = landmarks[4]
  const index = landmarks[8]
  const mx = (px(thumb) + px(index)) / 2
  const my = (py(thumb) + py(index)) / 2
  const dist = Math.hypot(px(index) - px(thumb), py(index) - py(thumb))

  if (pinching) {
    // filled circle at pinch center
    ctx.beginPath()
    ctx.arc(mx, my, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#FBBF2460'
    ctx.fill()
    ctx.strokeStyle = '#FBBF24'
    ctx.lineWidth = 2
    ctx.stroke()

    // rotation arc (shows grab state)
    ctx.beginPath()
    ctx.arc(mx, my, 18, 0, Math.PI * 2)
    ctx.strokeStyle = '#FBBF2480'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // dashed line between thumb and index showing proximity
    const alpha = Math.max(0, 1 - dist / (W * 0.12))
    if (alpha > 0.05) {
      ctx.beginPath()
      ctx.moveTo(px(thumb), py(thumb))
      ctx.lineTo(px(index), py(index))
      ctx.strokeStyle = `rgba(251,191,36,${alpha * 0.7})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // ── wrist label ──
  const wrist = landmarks[0]
  ctx.font = 'bold 10px Poppins, sans-serif'
  ctx.fillStyle = color
  ctx.fillText(color === '#22C55E' ? 'A' : 'B', px(wrist) + 6, py(wrist) - 4)
}
