import { useEffect, useRef, useCallback } from 'react'
import { audioEngine } from '../lib/audioEngine'
import { useDJStore } from '../store/djStore'

export function useAudioEngine() {
  const store = useDJStore()
  const initRef = useRef(false)
  const progressTimerRef = useRef<number>(0)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    audioEngine.createDeck('A')
    audioEngine.createDeck('B')
  }, [])

  const init = useCallback(async () => {
    await audioEngine.init()
  }, [])

  const loadTrack = useCallback(async (deckId: 'A' | 'B', file: File) => {
    await audioEngine.init()
    const duration = await audioEngine.loadTrack(deckId, file)
    store.setDeckTrack(deckId, file, file.name.replace(/\.[^.]+$/, ''))
    store.setDeckProgress(deckId, 0, duration)
  }, [store])

  const togglePlay = useCallback(async (deckId: 'A' | 'B') => {
    await audioEngine.init()
    const deck = store.decks[deckId]
    if (deck.isPlaying) {
      audioEngine.pause(deckId)
      store.setDeckPlaying(deckId, false)
    } else {
      audioEngine.play(deckId)
      store.setDeckPlaying(deckId, true)
    }
  }, [store])

  useEffect(() => {
    const { crossfader } = store
    audioEngine.setCrossfader(crossfader)
  }, [store.crossfader])

  useEffect(() => {
    audioEngine.setMasterVolume(store.masterVolume)
  }, [store.masterVolume])

  useEffect(() => {
    (['A', 'B'] as const).forEach((id) => {
      const d = store.decks[id]
      audioEngine.setVolume(id, d.volume)
    })
  }, [store.decks.A.volume, store.decks.B.volume])

  useEffect(() => {
    (['A', 'B'] as const).forEach((id) => {
      const { eq } = store.decks[id]
      audioEngine.setEQ(id, eq.high, eq.mid, eq.low)
    })
  }, [store.decks.A.eq, store.decks.B.eq])

  useEffect(() => {
    audioEngine.setEffect(
      store.activeEffect as any,
      store.effectIntensity
    )
  }, [store.activeEffect, store.effectIntensity])

  // Progress tracking
  useEffect(() => {
    progressTimerRef.current = window.setInterval(() => {
      (['A', 'B'] as const).forEach((id) => {
        const deck = store.decks[id]
        if (deck.isPlaying && deck.duration > 0) {
          const pos = audioEngine.getPlaybackPosition(id)
          if (pos > 0) store.setDeckProgress(id, pos, deck.duration)
        }
      })
    }, 500)
    return () => clearInterval(progressTimerRef.current)
  }, [store.decks.A.isPlaying, store.decks.B.isPlaying])

  return { loadTrack, togglePlay, init }
}
