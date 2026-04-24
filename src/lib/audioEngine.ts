import * as Tone from 'tone'

export interface DeckEngine {
  player: Tone.Player
  gainNode: Tone.Gain
  eqHigh: Tone.EQ3
  panner: Tone.Panner
}

class AudioEngine {
  private decks: Record<string, DeckEngine> = {}
  private masterGain: Tone.Gain
  private effects: {
    filter: Tone.AutoFilter
    delay: Tone.FeedbackDelay
    reverb: Tone.Reverb
    echo: Tone.PingPongDelay
  }
  private effectBus: Tone.Gain
  private dryBus: Tone.Gain
  private initialized = false

  constructor() {
    this.masterGain = new Tone.Gain(0.8).toDestination()
    this.effectBus = new Tone.Gain(0).connect(this.masterGain)
    this.dryBus = new Tone.Gain(1).connect(this.masterGain)

    this.effects = {
      filter: new Tone.AutoFilter({ frequency: '8n', depth: 0.8, wet: 0 }).connect(this.effectBus),
      delay: new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.4, wet: 0 }).connect(this.effectBus),
      reverb: new Tone.Reverb({ decay: 3, wet: 0 }).connect(this.effectBus),
      echo: new Tone.PingPongDelay({ delayTime: '4n', feedback: 0.3, wet: 0 }).connect(this.effectBus),
    }
    this.effects.filter.start()
  }

  async init() {
    if (this.initialized) return
    await Tone.start()
    this.initialized = true
  }

  createDeck(id: string): DeckEngine {
    const player = new Tone.Player({ loop: false })
    const gainNode = new Tone.Gain(0.8)
    const eqHigh = new Tone.EQ3({ high: 0, mid: 0, low: 0 })
    const panner = new Tone.Panner(0)

    player.connect(eqHigh)
    eqHigh.connect(gainNode)
    gainNode.connect(panner)
    panner.connect(this.dryBus)
    panner.connect(this.effects.filter)
    panner.connect(this.effects.delay)
    panner.connect(this.effects.reverb)
    panner.connect(this.effects.echo)

    const deck: DeckEngine = { player, gainNode, eqHigh, panner }
    this.decks[id] = deck
    return deck
  }

  getDeck(id: string): DeckEngine | null {
    return this.decks[id] ?? null
  }

  async loadTrack(deckId: string, file: File): Promise<number> {
    const deck = this.decks[deckId]
    if (!deck) return 0

    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer)
    const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer)
    deck.player.buffer = toneBuffer
    return audioBuffer.duration
  }

  loadToneBuffer(deckId: string, buffer: Tone.ToneAudioBuffer): number {
    const deck = this.decks[deckId]
    if (!deck) return 0
    deck.player.buffer = buffer
    return buffer.duration
  }

  play(deckId: string) {
    const deck = this.decks[deckId]
    if (!deck || !deck.player.buffer) return
    if (deck.player.state === 'started') return
    deck.player.start()
  }

  pause(deckId: string) {
    const deck = this.decks[deckId]
    if (!deck) return
    if (deck.player.state === 'started') deck.player.stop()
  }

  setVolume(deckId: string, vol: number) {
    const deck = this.decks[deckId]
    if (!deck) return
    deck.gainNode.gain.rampTo(vol, 0.05)
  }

  setEQ(deckId: string, high: number, mid: number, low: number) {
    const deck = this.decks[deckId]
    if (!deck) return
    deck.eqHigh.high.rampTo(high * 15, 0.05)  // -15 to +15 dB
    deck.eqHigh.mid.rampTo(mid * 15, 0.05)
    deck.eqHigh.low.rampTo(low * 15, 0.05)
  }

  setCrossfader(val: number) {
    const gainA = val <= 0.5 ? 1 : 1 - (val - 0.5) * 2
    const gainB = val >= 0.5 ? 1 : val * 2
    this.decks['A']?.gainNode.gain.rampTo(gainA * (this.decks['A']?.gainNode.gain.value ?? 0.8), 0.05)
    this.decks['B']?.gainNode.gain.rampTo(gainB * (this.decks['B']?.gainNode.gain.value ?? 0.8), 0.05)
    this.decks['A']?.panner.pan.rampTo(-0.3, 0.05)
    this.decks['B']?.panner.pan.rampTo(0.3, 0.05)
  }

  setMasterVolume(vol: number) {
    this.masterGain.gain.rampTo(vol, 0.05)
  }

  setEffect(name: keyof typeof this.effects | null, intensity: number) {
    Object.values(this.effects).forEach((e) => { e.wet.rampTo(0, 0.1) })
    if (name && this.effects[name]) {
      this.effects[name].wet.rampTo(intensity, 0.1)
    }
  }

  getPlaybackPosition(deckId: string): number {
    const deck = this.decks[deckId]
    if (!deck || !deck.player.buffer) return 0
    if (deck.player.state !== 'started') return 0
    return (Tone.now() - (deck.player as any)._startTime) / deck.player.buffer.duration
  }

  scratch(deckId: string, speed: number) {
    const deck = this.decks[deckId]
    if (!deck) return
    deck.player.playbackRate = speed
  }
}

export const audioEngine = new AudioEngine()
