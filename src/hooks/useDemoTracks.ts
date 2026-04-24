import { useState, useCallback } from 'react'
import * as Tone from 'tone'
import { generateHouse, generateHipHop, generateTechno, DEMO_TRACKS } from '../lib/demoTracks'
import { audioEngine } from '../lib/audioEngine'
import { useDJStore } from '../store/djStore'

type GeneratingState = Record<string, boolean>

export function useDemoTracks() {
  const store = useDJStore()
  const [generating, setGenerating] = useState<GeneratingState>({})

  const loadDemo = useCallback(async (trackId: string, deckId: 'A' | 'B') => {
    await Tone.start()
    await audioEngine.init()

    setGenerating((s) => ({ ...s, [trackId]: true }))

    try {
      let buffer: Tone.ToneAudioBuffer

      if (trackId === 'house') buffer = await generateHouse()
      else if (trackId === 'hiphop') buffer = await generateHipHop()
      else buffer = await generateTechno()

      const duration = audioEngine.loadToneBuffer(deckId, buffer)
      const meta = DEMO_TRACKS.find((t) => t.id === trackId)!
      store.setDeckTrack(deckId, null as any, meta.name)
      store.setDeckProgress(deckId, 0, duration)
      store.setDeckBPM(deckId, meta.bpm)
    } finally {
      setGenerating((s) => ({ ...s, [trackId]: false }))
    }
  }, [store])

  return { loadDemo, generating }
}
