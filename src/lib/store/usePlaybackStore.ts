import { create } from 'zustand'

interface PlaybackStore {
  isPlaying: boolean
  currentTime: number
  duration: number
  tempo: number
  volume: number
  highlightedNoteIndex: number | null
  metronomeEnabled: boolean
  countInEnabled: boolean
  loopEnabled: boolean
  loopStartMeasure: number
  loopEndMeasure: number

  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setTempo: (tempo: number) => void
  setVolume: (volume: number) => void
  setHighlightedNoteIndex: (index: number | null) => void
  setMetronomeEnabled: (enabled: boolean) => void
  setCountInEnabled: (enabled: boolean) => void
  setLoopEnabled: (enabled: boolean) => void
  setLoopStartMeasure: (measure: number) => void
  setLoopEndMeasure: (measure: number) => void
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  tempo: 100,
  volume: 0.8,
  highlightedNoteIndex: null,
  metronomeEnabled: false,
  countInEnabled: false,
  loopEnabled: false,
  loopStartMeasure: 1,
  loopEndMeasure: 1,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setTempo: (tempo) => set({ tempo }),
  setVolume: (volume) => set({ volume }),
  setHighlightedNoteIndex: (highlightedNoteIndex) => set({ highlightedNoteIndex }),
  setMetronomeEnabled: (metronomeEnabled) => set({ metronomeEnabled }),
  setCountInEnabled: (countInEnabled) => set({ countInEnabled }),
  setLoopEnabled: (loopEnabled) => set({ loopEnabled }),
  setLoopStartMeasure: (loopStartMeasure) => set({ loopStartMeasure }),
  setLoopEndMeasure: (loopEndMeasure) => set({ loopEndMeasure }),
}))
