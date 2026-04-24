import * as Tone from 'tone'

export interface DemoTrackMeta {
  id: string
  name: string
  bpm: number
  style: string
}

export const DEMO_TRACKS: DemoTrackMeta[] = [
  { id: 'house',   name: 'House Groove',   bpm: 120, style: '🎛️ House'    },
  { id: 'hiphop',  name: 'Hip-Hop Beat',   bpm: 90,  style: '🎤 Hip-Hop'  },
  { id: 'techno',  name: 'Techno Rush',    bpm: 135, style: '⚡ Techno'   },
]

async function offline(
  bpm: number,
  bars: number,
  build: (t: Tone.BaseContext['transport']) => void
): Promise<Tone.ToneAudioBuffer> {
  const beats = bars * 4
  const duration = (beats * 60) / bpm
  return Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm
    build(transport)
    transport.start()
  }, duration)
}

/* ─── House 120 BPM ─── */
export async function generateHouse(): Promise<Tone.ToneAudioBuffer> {
  return offline(120, 8, (transport) => {
    const out  = new Tone.Gain(0.75).toDestination()
    const comp = new Tone.Compressor({ threshold: -18, ratio: 4 }).connect(out)

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 8,
      envelope: { attack: 0.001, decay: 0.36, sustain: 0.01, release: 0.1 },
    }).connect(comp)

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.04 },
    })
    const snareChain = new Tone.Filter(3500, 'bandpass')
    snare.connect(snareChain)
    snareChain.connect(comp)

    const hh = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    })
    hh.frequency.value = 600
    const hhGain = new Tone.Gain(0.18).connect(comp)
    hh.connect(hhGain)

    const bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.25, sustain: 0.4, release: 0.15 },
    })
    const bassChain = new Tone.Filter(320, 'lowpass')
    const bassGain  = new Tone.Gain(0.55).connect(comp)
    bass.connect(bassChain)
    bassChain.connect(bassGain)

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.15, decay: 0.3, sustain: 0.6, release: 0.8 },
    })
    const padChain = new Tone.Filter(900, 'lowpass')
    const padReverb = new Tone.Reverb({ decay: 2, wet: 0.5 })
    const padGain   = new Tone.Gain(0.22).connect(comp)
    pad.connect(padChain)
    padChain.connect(padReverb)
    padReverb.connect(padGain)

    const BARS = 8
    for (let b = 0; b < BARS; b++) {
      // Kick: every beat
      for (let q = 0; q < 4; q++) {
        transport.schedule((t) => kick.triggerAttackRelease('C1', '8n', t), `${b}:${q}:0`)
      }
      // Snare: beat 2 & 4
      transport.schedule((t) => snare.triggerAttackRelease('16n', t), `${b}:1:0`)
      transport.schedule((t) => snare.triggerAttackRelease('16n', t), `${b}:3:0`)
      // HiHat: 8th notes
      for (let q = 0; q < 4; q++) {
        transport.schedule((t) => hh.triggerAttackRelease('32n', t), `${b}:${q}:0`)
        transport.schedule((t) => hh.triggerAttackRelease('32n', t), `${b}:${q}:2`)
      }
    }

    // Bass line (2-bar phrase, repeated)
    const bassLine: [string, string, string][] = [
      ['0:0:0','C2','8n'], ['0:0:2','C2','16n'], ['0:1:0','E2','8n'],
      ['0:2:0','G2','8n'], ['0:2:2','G2','16n'], ['0:3:0','F2','8n'],
      ['1:0:0','A1','8n'], ['1:0:2','C2','16n'], ['1:1:0','D2','8n'],
      ['1:2:0','E2','4n'], ['1:3:0','C2','8n'],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      bassLine.forEach(([pos, note, dur]) => {
        const [bar, beat, sub] = pos.split(':').map(Number)
        transport.schedule(
          (t) => bass.triggerAttackRelease(note, dur, t),
          `${bar + rep * 2}:${beat}:${sub}`
        )
      })
    }

    // Pad chord stabs
    const padChords: [string, string[]][] = [
      ['0:0:0', ['C3','E3','G3']], ['0:2:0', ['F3','A3','C4']],
      ['1:0:0', ['G3','B3','D4']], ['1:2:0', ['A3','C4','E4']],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      padChords.forEach(([pos, notes]) => {
        const [bar, beat] = pos.split(':').map(Number)
        transport.schedule(
          (t) => pad.triggerAttackRelease(notes, '4n', t),
          `${bar + rep * 2}:${beat}:0`
        )
      })
    }
  })
}

/* ─── Hip-Hop 90 BPM ─── */
export async function generateHipHop(): Promise<Tone.ToneAudioBuffer> {
  return offline(90, 8, (transport) => {
    const out  = new Tone.Gain(0.75).toDestination()
    const comp = new Tone.Compressor({ threshold: -20, ratio: 5 }).connect(out)

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.1, octaves: 6,
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.2 },
    }).connect(comp)

    const snare = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.08 },
    })
    const snareFilter = new Tone.Filter(2800, 'bandpass')
    const snareGain   = new Tone.Gain(0.5).connect(comp)
    snare.connect(snareFilter)
    snareFilter.connect(snareGain)

    const hh = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 3.1, modulationIndex: 16, resonance: 5000, octaves: 1,
    })
    hh.frequency.value = 800
    const hhGain = new Tone.Gain(0.14).connect(comp)
    hh.connect(hhGain)

    const bass = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.2 },
    })
    const bassFilter = new Tone.Filter(280, 'lowpass')
    const bassGain   = new Tone.Gain(0.6).connect(comp)
    bass.connect(bassFilter)
    bassFilter.connect(bassGain)

    const lead = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.2 },
    })
    const leadFilter = new Tone.Filter(1200, 'lowpass')
    const leadDelay  = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0.25 })
    const leadGain   = new Tone.Gain(0.28).connect(comp)
    lead.connect(leadFilter)
    leadFilter.connect(leadDelay)
    leadDelay.connect(leadGain)

    const BARS = 8
    // Hip-hop kick pattern (swing feel): 1, and-of-2, 3, and-of-4
    const kickBeats: [number, number, number][] = [
      [0,0,0],[0,1,2],[0,2,0],[0,3,2],
    ]
    for (let b = 0; b < BARS; b++) {
      kickBeats.forEach(([,,]) => {}) // just iterate
      transport.schedule((t) => kick.triggerAttackRelease('C1', '8n', t), `${b}:0:0`)
      transport.schedule((t) => kick.triggerAttackRelease('C1', '8n', t), `${b}:2:0`)
      transport.schedule((t) => snare.triggerAttackRelease('8n', t), `${b}:1:0`)
      transport.schedule((t) => snare.triggerAttackRelease('8n', t), `${b}:3:0`)
      // swing hihat: 8th notes with accents
      for (let q = 0; q < 4; q++) {
        transport.schedule((t) => hh.triggerAttackRelease('32n', t), `${b}:${q}:0`)
        if (q < 3) transport.schedule((t) => hh.triggerAttackRelease('32n', t), `${b}:${q}:2`)
      }
    }

    // Bass groove
    const bassNotes: [string, string, string][] = [
      ['0:0:0','C2','8n'],['0:0:2','C2','16n'],
      ['0:1:1','Eb2','16n'],['0:2:0','G1','8n'],
      ['0:3:0','Ab1','4n'],
      ['1:0:0','F1','8n'],['1:0:2','F1','16n'],
      ['1:1:0','G1','8n'],['1:2:0','C2','4n'],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      bassNotes.forEach(([pos, note, dur]) => {
        const [bar, beat, sub] = pos.split(':').map(Number)
        transport.schedule(
          (t) => bass.triggerAttackRelease(note, dur, t),
          `${bar + rep * 2}:${beat}:${sub ?? 0}`
        )
      })
    }

    // Lead melody
    const melody: [string, string, string][] = [
      ['0:0:0','C4','16n'],['0:0:2','Eb4','16n'],['0:1:0','G4','8n'],
      ['0:2:0','F4','16n'],['0:2:2','Eb4','16n'],['0:3:0','D4','8n'],
      ['1:0:0','C4','8n'],['1:1:0','G3','4n'],
      ['1:3:0','Ab3','16n'],['1:3:2','Bb3','16n'],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      melody.forEach(([pos, note, dur]) => {
        const [bar, beat, sub] = pos.split(':').map(Number)
        transport.schedule(
          (t) => lead.triggerAttackRelease(note, dur, t),
          `${bar + rep * 2}:${beat}:${sub ?? 0}`
        )
      })
    }
  })
}

/* ─── Techno 135 BPM ─── */
export async function generateTechno(): Promise<Tone.ToneAudioBuffer> {
  return offline(135, 8, (transport) => {
    const out  = new Tone.Gain(0.72).toDestination()
    const comp = new Tone.Compressor({ threshold: -16, ratio: 6 }).connect(out)

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.04, octaves: 10,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.08 },
    }).connect(comp)

    const hh = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
      harmonicity: 7.1, modulationIndex: 48, resonance: 6000, octaves: 2,
    })
    hh.frequency.value = 1000
    const hhGain = new Tone.Gain(0.16).connect(comp)
    hh.connect(hhGain)

    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.08 },
    })
    const synthFilter = new Tone.Filter(800, 'lowpass')
    const synthGain   = new Tone.Gain(0.4).connect(comp)
    synth.connect(synthFilter)
    synthFilter.connect(synthGain)

    const acidBass = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.3, release: 0.05 },
    })
    const acidFilter = new Tone.AutoFilter({
      frequency: '8n', depth: 0.9, baseFrequency: 200, octaves: 4, wet: 0.8,
    }).toDestination()
    acidFilter.start()
    const acidGain = new Tone.Gain(0.45).connect(comp)
    acidBass.connect(acidGain)

    const BARS = 8
    for (let b = 0; b < BARS; b++) {
      // Kick: 4-on-the-floor
      for (let q = 0; q < 4; q++) {
        transport.schedule((t) => kick.triggerAttackRelease('C1', '8n', t), `${b}:${q}:0`)
      }
      // HiHat: 16th notes
      for (let q = 0; q < 4; q++) {
        for (let s = 0; s < 4; s++) {
          transport.schedule((t) => hh.triggerAttackRelease('32n', t), `${b}:${q}:${s}`)
        }
      }
    }

    // Acid bass riff
    const acidLine: [string, string, string][] = [
      ['0:0:0','C2','16n'],['0:0:2','C2','16n'],['0:1:0','Eb2','16n'],
      ['0:1:3','Bb1','16n'],['0:2:0','G1','16n'],['0:2:2','G1','16n'],
      ['0:3:0','Ab1','16n'],['0:3:2','G1','16n'],
      ['1:0:0','C2','16n'],['1:0:1','C2','16n'],['1:1:0','F2','16n'],
      ['1:2:0','Eb2','16n'],['1:3:0','D2','8n'],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      acidLine.forEach(([pos, note, dur]) => {
        const [bar, beat, sub] = pos.split(':').map(Number)
        transport.schedule(
          (t) => acidBass.triggerAttackRelease(note, dur, t),
          `${bar + rep * 2}:${beat}:${sub ?? 0}`
        )
      })
    }

    // Synth stabs
    const stabs: [string, string, string][] = [
      ['0:0:0','C4','16n'],['0:2:0','G4','16n'],
      ['1:0:0','Eb4','16n'],['1:2:0','Bb3','16n'],
    ]
    for (let rep = 0; rep < BARS / 2; rep++) {
      stabs.forEach(([pos, note, dur]) => {
        const [bar, beat] = pos.split(':').map(Number)
        transport.schedule(
          (t) => synth.triggerAttackRelease(note, dur, t),
          `${bar + rep * 2}:${beat}:0`
        )
      })
    }
  })
}
