import { create } from 'zustand'

interface PlaybackStore {
  isPlaying: boolean
  currentTime: number
  duration: number
  tempo: number
  volume: number
  highlightedNoteIndex: number | null

  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setTempo: (tempo: number) => void
  setVolume: (volume: number) => void
  setHighlightedNoteIndex: (index: number | null) => void
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  tempo: 100,
  volume: 0.8,
  highlightedNoteIndex: null,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setTempo: (tempo) => set({ tempo }),
  setVolume: (volume) => set({ volume }),
  setHighlightedNoteIndex: (highlightedNoteIndex) => set({ highlightedNoteIndex }),
}))
