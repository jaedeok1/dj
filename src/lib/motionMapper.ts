export interface HandLandmark { x: number; y: number; z: number }

export interface MappedControls {
  crossfader?:    number
  volumeA?:       number
  volumeB?:       number
  eqHigh?:        number
  scratchSpeed?:  number
  pinchLabel?:    string
}

// ── Pinch detection ──────────────────────────────────────────────
const PINCH_THRESHOLD   = 0.07   // normalized distance (tight)
const PINCH_HYSTERESIS  = 0.09   // release threshold (slightly larger → no flickering)

export function isPinching(lm: HandLandmark[], wasAlready: boolean): boolean {
  const d = dist(lm[4], lm[8])
  return wasAlready ? d < PINCH_HYSTERESIS : d < PINCH_THRESHOLD
}

// ── Pinch-rotate state (module-level, one per hand) ──────────────
interface PinchState {
  active:     boolean
  startAngle: number   // radians, angle of thumb→index vector when pinch began
  startValue: number   // control value at pinch start
}

const pinchState = { left: fresh(), right: fresh() }

function fresh(): PinchState { return { active: false, startAngle: 0, startValue: 0 } }

export function handAngle(lm: HandLandmark[]): number {
  // Use vector from wrist(0) to index MCP(5) — stable rotation reference
  return Math.atan2(lm[5].y - lm[0].y, lm[5].x - lm[0].x)
}

/**
 * Compute the new control value after rotating from the pinch start.
 * One full rotation (2π) maps to ±1 change of the control range.
 */
function pinchRotate(
  ps: PinchState,
  lm: HandLandmark[],
  _currentValue: number,
  min: number,
  max: number,
  sensitivity = 0.5
): number {
  const angle = handAngle(lm)
  let delta   = angle - ps.startAngle
  // Wrap to [-π, π]
  while (delta >  Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  const range = max - min
  const raw   = ps.startValue + (delta / (2 * Math.PI)) * range / sensitivity
  return clamp(raw, min, max)
}

// ── Main mapping function ─────────────────────────────────────────
export function mapHandsToControls(
  leftLandmarks:  HandLandmark[] | null,
  rightLandmarks: HandLandmark[] | null,
  mode: 'crossfader' | 'volume' | 'eq' | 'scratch',
  currentValues: {
    crossfader:  number
    volumeA:     number
    volumeB:     number
    eqHighA:     number
  }
): MappedControls {
  const result: MappedControls = {}

  // Update pinch state for each hand
  if (leftLandmarks) {
    const was = pinchState.left.active
    pinchState.left.active = isPinching(leftLandmarks, was)
    if (!was && pinchState.left.active) {
      // Pinch just started — record start angle and current value
      pinchState.left.startAngle = handAngle(leftLandmarks)
      pinchState.left.startValue = getPinchStartValue('left', mode, currentValues)
    }
  } else {
    pinchState.left = fresh()
  }

  if (rightLandmarks) {
    const was = pinchState.right.active
    pinchState.right.active = isPinching(rightLandmarks, was)
    if (!was && pinchState.right.active) {
      pinchState.right.startAngle = handAngle(rightLandmarks)
      pinchState.right.startValue = getPinchStartValue('right', mode, currentValues)
    }
  } else {
    pinchState.right = fresh()
  }

  // ── Apply controls ──
  switch (mode) {
    case 'crossfader': {
      if (leftLandmarks && pinchState.left.active) {
        // Pinch + rotate → fine crossfader control
        result.crossfader = pinchRotate(pinchState.left, leftLandmarks, currentValues.crossfader, 0, 1, 0.4)
        result.pinchLabel = `크로스페이더 ${Math.round(result.crossfader * 100)}%`
      } else if (rightLandmarks && pinchState.right.active) {
        result.crossfader = pinchRotate(pinchState.right, rightLandmarks, currentValues.crossfader, 0, 1, 0.4)
        result.pinchLabel = `크로스페이더 ${Math.round(result.crossfader * 100)}%`
      } else {
        // Fallback: wrist x position (coarse)
        const hand = leftLandmarks ?? rightLandmarks
        if (hand) result.crossfader = clamp(hand[0].x, 0, 1)
      }
      break
    }

    case 'volume': {
      if (leftLandmarks && pinchState.left.active) {
        result.volumeA = pinchRotate(pinchState.left, leftLandmarks, currentValues.volumeA, 0, 1, 0.4)
        result.pinchLabel = `덱 A 볼륨 ${Math.round(result.volumeA * 100)}%`
      } else if (leftLandmarks) {
        result.volumeA = clamp(1 - leftLandmarks[0].y, 0, 1)
      }

      if (rightLandmarks && pinchState.right.active) {
        result.volumeB = pinchRotate(pinchState.right, rightLandmarks, currentValues.volumeB, 0, 1, 0.4)
        result.pinchLabel = `덱 B 볼륨 ${Math.round(result.volumeB * 100)}%`
      } else if (rightLandmarks) {
        result.volumeB = clamp(1 - rightLandmarks[0].y, 0, 1)
      }
      break
    }

    case 'eq': {
      const hand = rightLandmarks ?? leftLandmarks
      const ps   = rightLandmarks ? pinchState.right : pinchState.left
      if (hand && ps.active) {
        result.eqHigh   = pinchRotate(ps, hand, currentValues.eqHighA, -1, 1, 0.35)
        result.pinchLabel = `EQ 하이 ${result.eqHigh > 0 ? '+' : ''}${Math.round(result.eqHigh * 15)}dB`
      } else if (hand) {
        const wrist = hand[0], indexTip = hand[8]
        result.eqHigh = clamp((indexTip.x - wrist.x) * 3, -1, 1)
      }
      break
    }

    case 'scratch': {
      const hand = rightLandmarks ?? leftLandmarks
      if (hand) {
        const velocity = (hand[8].x - hand[0].x) * 5
        result.scratchSpeed = clamp(1 + velocity, 0.1, 3)
        result.pinchLabel = `스크래치 ${result.scratchSpeed.toFixed(1)}×`
      }
      break
    }
  }

  return result
}

function getPinchStartValue(
  side: 'left' | 'right',
  mode: string,
  cv: { crossfader: number; volumeA: number; volumeB: number; eqHighA: number }
): number {
  if (mode === 'crossfader') return cv.crossfader
  if (mode === 'volume')     return side === 'left' ? cv.volumeA : cv.volumeB
  if (mode === 'eq')         return cv.eqHighA
  return 0.5
}

export function calcMotionQuality(lm: HandLandmark[] | null): number {
  if (!lm || lm.length === 0) return 0
  const w = lm[0]
  const m = 0.08
  return (w.x > m && w.x < 1 - m && w.y > m && w.y < 1 - m) ? 0.95 : 0.35
}

function dist(a: HandLandmark, b: HandLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
