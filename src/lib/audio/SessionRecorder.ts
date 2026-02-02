import { createClient } from '@/lib/supabase/client'

export interface SessionData {
  userId: string
  scoreId: string
  practiceSessionId?: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  notesPlayed: number
  notesCorrect: number
  accuracyPercentage: number
  notes: Array<{
    timestamp: number
    expectedMidi: number
    detectedMidi: number | null
    isCorrect: boolean
    confidence: number
  }>
}

export class SessionRecorder {
  private supabase = createClient()
  private sessionData: SessionData | null = null

  /**
   * Start a new practice session
   */
  startSession(userId: string, scoreId: string): void {
    this.sessionData = {
      userId,
      scoreId,
      startedAt: new Date().toISOString(),
      endedAt: '',
      durationSeconds: 0,
      notesPlayed: 0,
      notesCorrect: 0,
      accuracyPercentage: 0,
      notes: [],
    }
  }

  /**
   * Record a note attempt
   */
  recordNote(
    expectedMidi: number,
    detectedMidi: number | null,
    isCorrect: boolean,
    confidence: number
  ): void {
    if (!this.sessionData) {
      throw new Error('No active session. Call startSession() first.')
    }

    this.sessionData.notes.push({
      timestamp: Date.now(),
      expectedMidi,
      detectedMidi,
      isCorrect,
      confidence,
    })

    this.sessionData.notesPlayed++
    if (isCorrect) {
      this.sessionData.notesCorrect++
    }
  }

  /**
   * End the session and save to database
   */
  async endSession(): Promise<string | null> {
    if (!this.sessionData) {
      throw new Error('No active session.')
    }

    this.sessionData.endedAt = new Date().toISOString()
    this.sessionData.durationSeconds = Math.round(
      (new Date(this.sessionData.endedAt).getTime() -
        new Date(this.sessionData.startedAt).getTime()) /
        1000
    )

    if (this.sessionData.notesPlayed > 0) {
      this.sessionData.accuracyPercentage =
        (this.sessionData.notesCorrect / this.sessionData.notesPlayed) * 100
    }

    try {
      const { data, error } = await this.supabase
        .from('practice_sessions')
        .insert({
          user_id: this.sessionData.userId,
          score_id: this.sessionData.scoreId,
          started_at: this.sessionData.startedAt,
          ended_at: this.sessionData.endedAt,
          duration_seconds: this.sessionData.durationSeconds,
          notes_played: this.sessionData.notesPlayed,
          notes_correct: this.sessionData.notesCorrect,
          accuracy_percentage: this.sessionData.accuracyPercentage,
          session_data: this.sessionData.notes,
        })
        .select('id')
        .single()

      if (error) throw error

      this.sessionData = null
      return data?.id || null
    } catch (err) {
      console.error('Failed to save session:', err)
      return null
    }
  }

  /**
   * Get current session data
   */
  getSessionData(): SessionData | null {
    return this.sessionData
  }

  /**
   * Clear session data without saving
   */
  clear(): void {
    this.sessionData = null
  }
}
