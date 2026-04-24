export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface MappedControls {
  crossfader?: number      // 0–1, based on left hand x position
  volumeA?: number         // 0–1, based on left hand y (inverted: top=loud)
  volumeB?: number         // 0–1, based on right hand y
  eqHigh?: number          // -1 to 1, right hand tilt
  scratchSpeed?: number    // -2 to 2
  gestureLabel?: string
}

export function mapHandsToControls(
  leftLandmarks: HandLandmark[] | null,
  rightLandmarks: HandLandmark[] | null,
  mode: 'crossfader' | 'volume' | 'eq' | 'scratch'
): MappedControls {
  const result: MappedControls = {}

  if (mode === 'crossfader' && leftLandmarks) {
    const wrist = leftLandmarks[0]
    result.crossfader = clamp(wrist.x, 0.1, 0.9)
    result.gestureLabel = `크로스페이더: ${Math.round(result.crossfader * 100)}%`
  }

  if (mode === 'volume') {
    if (leftLandmarks) {
      const wrist = leftLandmarks[0]
      result.volumeA = clamp(1 - wrist.y, 0, 1)
      result.gestureLabel = `덱 A 볼륨: ${Math.round(result.volumeA * 100)}%`
    }
    if (rightLandmarks) {
      const wrist = rightLandmarks[0]
      result.volumeB = clamp(1 - wrist.y, 0, 1)
    }
  }

  if (mode === 'eq' && rightLandmarks) {
    const indexTip = rightLandmarks[8]
    const wrist = rightLandmarks[0]
    const tilt = (indexTip.x - wrist.x) * 2
    result.eqHigh = clamp(tilt, -1, 1)
    result.gestureLabel = `EQ 하이: ${tilt > 0 ? '+' : ''}${Math.round(tilt * 15)}dB`
  }

  if (mode === 'scratch' && rightLandmarks) {
    const indexTip = rightLandmarks[8]
    const middleTip = rightLandmarks[12]
    const velocity = indexTip.x - middleTip.x
    result.scratchSpeed = clamp(1 + velocity * 4, 0.1, 3)
    result.gestureLabel = `스크래치 속도: ${result.scratchSpeed.toFixed(1)}x`
  }

  return result
}

export function calcMotionQuality(
  landmarks: HandLandmark[] | null,
  _videoWidth: number,
  _videoHeight: number
): number {
  if (!landmarks || landmarks.length === 0) return 0

  const wrist = landmarks[0]
  const margin = 0.1
  const inFrame =
    wrist.x > margin && wrist.x < 1 - margin &&
    wrist.y > margin && wrist.y < 1 - margin

  if (!inFrame) return 0.3
  return 0.95
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}
