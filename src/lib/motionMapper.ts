export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface MappedControls {
  crossfader?:   number   // 0–1
  volumeA?:      number   // 0–1
  volumeB?:      number   // 0–1
  eqHigh?:       number   // -1 to 1
  scratchSpeed?: number   // 0.1 – 3
  gestureLabel?: string
}

/**
 * leftLandmarks  = hand on the LEFT side of the mirrored screen (user's right)
 * rightLandmarks = hand on the RIGHT side of the mirrored screen (user's left)
 *
 * Coordinates are already mirror-corrected before calling this function.
 * (x=0 → left edge of screen, x=1 → right edge)
 */
export function mapHandsToControls(
  leftLandmarks:  HandLandmark[] | null,
  rightLandmarks: HandLandmark[] | null,
  mode: 'crossfader' | 'volume' | 'eq' | 'scratch'
): MappedControls {
  const result: MappedControls = {}

  switch (mode) {
    case 'crossfader': {
      // Use whichever hand is present; two hands: average their x positions
      if (leftLandmarks && rightLandmarks) {
        const avg = (leftLandmarks[0].x + rightLandmarks[0].x) / 2
        result.crossfader = clamp(avg, 0, 1)
      } else if (leftLandmarks) {
        result.crossfader = clamp(leftLandmarks[0].x, 0, 1)
      } else if (rightLandmarks) {
        result.crossfader = clamp(rightLandmarks[0].x, 0, 1)
      }
      if (result.crossfader !== undefined)
        result.gestureLabel = `크로스페이더 ${Math.round(result.crossfader * 100)}%`
      break
    }

    case 'volume': {
      // Left hand (screen-left) → Deck A volume; Right hand → Deck B volume
      // Hand height: top of frame (y≈0) = loud, bottom (y≈1) = quiet
      if (leftLandmarks) {
        result.volumeA    = clamp(1 - leftLandmarks[0].y, 0, 1)
        result.gestureLabel = `덱 A 볼륨 ${Math.round(result.volumeA * 100)}%`
      }
      if (rightLandmarks) {
        result.volumeB    = clamp(1 - rightLandmarks[0].y, 0, 1)
        result.gestureLabel = (result.gestureLabel ?? '') +
          `  덱 B 볼륨 ${Math.round(result.volumeB * 100)}%`
      }
      break
    }

    case 'eq': {
      // Right hand horizontal tilt (index tip vs wrist) → High EQ
      const hand = rightLandmarks ?? leftLandmarks
      if (hand) {
        const wrist    = hand[0]
        const indexTip = hand[8]
        const tilt     = clamp((indexTip.x - wrist.x) * 3, -1, 1)
        result.eqHigh       = tilt
        result.gestureLabel = `EQ 하이 ${tilt > 0 ? '+' : ''}${Math.round(tilt * 15)}dB`
      }
      break
    }

    case 'scratch': {
      // Right hand index-to-middle spread → scratch speed/direction
      const hand = rightLandmarks ?? leftLandmarks
      if (hand) {
        const wrist    = hand[0]
        const indexTip = hand[8]
        const velocity = (indexTip.x - wrist.x) * 5
        result.scratchSpeed = clamp(1 + velocity, 0.1, 3)
        result.gestureLabel = `스크래치 ${result.scratchSpeed.toFixed(1)}×`
      }
      break
    }
  }

  return result
}

export function calcMotionQuality(
  landmarks: HandLandmark[] | null,
  _w: number,
  _h: number
): number {
  if (!landmarks || landmarks.length === 0) return 0
  const wrist  = landmarks[0]
  const margin = 0.08
  const inFrame =
    wrist.x > margin && wrist.x < 1 - margin &&
    wrist.y > margin && wrist.y < 1 - margin
  return inFrame ? 0.95 : 0.35
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}
