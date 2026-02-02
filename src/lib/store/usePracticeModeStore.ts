import { create } from 'zustand'

export interface PracticeNote {
  index: number
  expectedPitch: number // MIDI note number
  detectedPitch: number | null
  isCorrect: boolean | null
  timestamp: number
}

interface PracticeModeStore {
  isPracticing: boolean
  sessionNotes: PracticeNote[]
  startTime: number | null
  endTime: number | null
  accuracy: number | null
  notesCorrect: number
  notesPlayed: number
  micPermissionGranted: boolean

  setIsPracticing: (isPracticing: boolean) => void
  addNote: (note: PracticeNote) => void
  setSessionNotes: (notes: PracticeNote[]) => void
  setStartTime: (time: number | null) => void
  setEndTime: (time: number | null) => void
  setAccuracy: (accuracy: number | null) => void
  updateNoteCorrectness: (index: number, isCorrect: boolean) => void
  calculateAccuracy: () => number
  resetSession: () => void
  setMicPermissionGranted: (granted: boolean) => void
}

export const usePracticeModeStore = create<PracticeModeStore>((set, get) => ({
  isPracticing: false,
  sessionNotes: [],
  startTime: null,
  endTime: null,
  accuracy: null,
  notesCorrect: 0,
  notesPlayed: 0,
  micPermissionGranted: false,

  setIsPracticing: (isPracticing) => set({ isPracticing }),

  addNote: (note) =>
    set((state) => ({
      sessionNotes: [...state.sessionNotes, note],
      notesPlayed: state.notesPlayed + 1,
      notesCorrect: note.isCorrect ? state.notesCorrect + 1 : state.notesCorrect,
    })),

  setSessionNotes: (sessionNotes) => set({ sessionNotes }),

  setStartTime: (startTime) => set({ startTime }),

  setEndTime: (endTime) => set({ endTime }),

  setAccuracy: (accuracy) => set({ accuracy }),

  updateNoteCorrectness: (index, isCorrect) =>
    set((state) => {
      const notes = [...state.sessionNotes]
      if (notes[index]) {
        notes[index].isCorrect = isCorrect
        const correctCount = notes.filter((n) => n.isCorrect).length
        return {
          sessionNotes: notes,
          notesCorrect: correctCount,
        }
      }
      return state
    }),

  calculateAccuracy: () => {
    const state = get()
    if (state.notesPlayed === 0) return 0
    return Math.round((state.notesCorrect / state.notesPlayed) * 100)
  },

  resetSession: () =>
    set({
      sessionNotes: [],
      startTime: null,
      endTime: null,
      accuracy: null,
      notesCorrect: 0,
      notesPlayed: 0,
      isPracticing: false,
    }),

  setMicPermissionGranted: (granted) => set({ micPermissionGranted: granted }),
}))
