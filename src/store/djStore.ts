import { create } from 'zustand'

export type DeckId = 'A' | 'B'

export interface DeckState {
  isPlaying: boolean
  volume: number        // 0–1
  bpm: number
  trackName: string
  trackFile: File | null
  eq: { high: number; mid: number; low: number }  // -1 to 1
  progress: number      // 0–1
  duration: number      // seconds
}

export interface DJState {
  decks: Record<DeckId, DeckState>
  crossfader: number           // 0 (A) – 1 (B)
  masterVolume: number         // 0–1
  activeEffect: string | null  // 'filter' | 'delay' | 'reverb' | 'echo' | null
  effectIntensity: number      // 0–1
  motionEnabled: boolean
  motionQuality: number        // 0–1
  motionMode: 'crossfader' | 'volume' | 'eq' | 'scratch'
  calibrated: boolean
  showCamera: boolean
  screen: 'calibration' | 'tutorial' | 'main'
  // Gesture visual feedback
  leftHandPos: { x: number; y: number } | null
  rightHandPos: { x: number; y: number } | null

  setDeckPlaying: (deck: DeckId, playing: boolean) => void
  setDeckVolume: (deck: DeckId, vol: number) => void
  setDeckEQ: (deck: DeckId, band: 'high' | 'mid' | 'low', val: number) => void
  setDeckTrack: (deck: DeckId, file: File, name: string) => void
  setDeckProgress: (deck: DeckId, progress: number, duration: number) => void
  setDeckBPM: (deck: DeckId, bpm: number) => void
  setCrossfader: (val: number) => void
  setMasterVolume: (val: number) => void
  setActiveEffect: (name: string | null) => void
  setEffectIntensity: (val: number) => void
  setMotionEnabled: (v: boolean) => void
  setMotionQuality: (q: number) => void
  setMotionMode: (mode: DJState['motionMode']) => void
  setCalibrated: (v: boolean) => void
  setShowCamera: (v: boolean) => void
  setScreen: (s: DJState['screen']) => void
  setHandPositions: (left: { x: number; y: number } | null, right: { x: number; y: number } | null) => void
}

const defaultDeck = (id: DeckId): DeckState => ({
  isPlaying: false,
  volume: 0.8,
  bpm: 0,
  trackName: id === 'A' ? '트랙을 불러오세요' : '트랙을 불러오세요',
  trackFile: null,
  eq: { high: 0, mid: 0, low: 0 },
  progress: 0,
  duration: 0,
})

export const useDJStore = create<DJState>((set) => ({
  decks: { A: defaultDeck('A'), B: defaultDeck('B') },
  crossfader: 0.5,
  masterVolume: 0.8,
  activeEffect: null,
  effectIntensity: 0.5,
  motionEnabled: false,
  motionQuality: 0,
  motionMode: 'crossfader',
  calibrated: false,
  showCamera: true,
  screen: 'calibration',
  leftHandPos: null,
  rightHandPos: null,

  setDeckPlaying: (deck, playing) =>
    set((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], isPlaying: playing } } })),
  setDeckVolume: (deck, vol) =>
    set((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], volume: vol } } })),
  setDeckEQ: (deck, band, val) =>
    set((s) => ({
      decks: { ...s.decks, [deck]: { ...s.decks[deck], eq: { ...s.decks[deck].eq, [band]: val } } },
    })),
  setDeckTrack: (deck, file, name) =>
    set((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], trackFile: file, trackName: name } } })),
  setDeckProgress: (deck, progress, duration) =>
    set((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], progress, duration } } })),
  setDeckBPM: (deck, bpm) =>
    set((s) => ({ decks: { ...s.decks, [deck]: { ...s.decks[deck], bpm } } })),
  setCrossfader: (val) => set({ crossfader: val }),
  setMasterVolume: (val) => set({ masterVolume: val }),
  setActiveEffect: (name) => set({ activeEffect: name }),
  setEffectIntensity: (val) => set({ effectIntensity: val }),
  setMotionEnabled: (v) => set({ motionEnabled: v }),
  setMotionQuality: (q) => set({ motionQuality: q }),
  setMotionMode: (mode) => set({ motionMode: mode }),
  setCalibrated: (v) => set({ calibrated: v }),
  setShowCamera: (v) => set({ showCamera: v }),
  setScreen: (s) => set({ screen: s }),
  setHandPositions: (left, right) => set({ leftHandPos: left, rightHandPos: right }),
}))
