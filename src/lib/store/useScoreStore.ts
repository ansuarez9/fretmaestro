import { create } from 'zustand'

export interface Score {
  id: string
  user_id: string
  title: string
  composer?: string
  musicxml_file_path: string
  duration_seconds?: number
  instrument: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

interface ScoreStore {
  scores: Score[]
  currentScore: Score | null
  loading: boolean
  error: string | null
  setScores: (scores: Score[]) => void
  setCurrentScore: (score: Score | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addScore: (score: Score) => void
  removeScore: (id: string) => void
  updateScore: (id: string, updates: Partial<Score>) => void
}

export const useScoreStore = create<ScoreStore>((set) => ({
  scores: [],
  currentScore: null,
  loading: false,
  error: null,

  setScores: (scores) => set({ scores }),
  setCurrentScore: (currentScore) => set({ currentScore }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addScore: (score) =>
    set((state) => ({
      scores: [score, ...state.scores],
    })),

  removeScore: (id) =>
    set((state) => ({
      scores: state.scores.filter((s) => s.id !== id),
      currentScore: state.currentScore?.id === id ? null : state.currentScore,
    })),

  updateScore: (id, updates) =>
    set((state) => ({
      scores: state.scores.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      currentScore:
        state.currentScore?.id === id
          ? { ...state.currentScore, ...updates }
          : state.currentScore,
    })),
}))
