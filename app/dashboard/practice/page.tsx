'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Music, Clock, Target, Play } from 'lucide-react'
import type { Score } from '@/lib/store/useScoreStore'

interface PracticeSession {
  id: string
  score_id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  notes_played: number
  notes_correct: number
  accuracy_percentage: number
  scores?: { title: string }
}

export default function PracticePage() {
  const supabase = createClient()
  const [scores, setScores] = useState<Score[]>([])
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Fetch user's scores
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('scores')
          .select('*')
          .eq('user_id', user.id)
          .eq('processing_status', 'completed')
          .order('created_at', { ascending: false })

        if (error) throw error
        setScores((data as Score[]) || [])
      } catch (err) {
        console.error('Error fetching scores:', err instanceof Error ? err.message : JSON.stringify(err))
      } finally {
        setLoadingScores(false)
      }
    }

    fetchScores()
  }, [supabase])

  // Fetch recent practice sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('practice_sessions')
          .select('*, scores(title)')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setSessions((data as PracticeSession[]) || [])
      } catch (err) {
        console.error('Error fetching sessions:', err instanceof Error ? err.message : JSON.stringify(err))
      } finally {
        setLoadingSessions(false)
      }
    }

    fetchSessions()
  }, [supabase])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
            FretMaestro
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/scores" className="text-gray-700 hover:text-indigo-600 font-medium">
              Scores
            </Link>
            <Link href="/dashboard/practice" className="text-indigo-600 font-medium">
              Practice
            </Link>
            <Link href="/dashboard/settings" className="text-gray-700 hover:text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Practice</h1>

        {/* Scores to practice */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Scores</h2>

          {loadingScores ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : scores.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scores yet</h3>
              <p className="text-gray-600 mb-4">
                Upload a MusicXML score to start practicing with real-time pitch detection.
              </p>
              <Link
                href="/dashboard/scores"
                className="inline-block bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold transition"
              >
                Go to Scores
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scores.map((score) => (
                <div
                  key={score.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {score.title}
                    </h3>
                    {score.composer && (
                      <p className="text-sm text-gray-600 mb-2">by {score.composer}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {score.instrument || 'Guitar'}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/scores/${score.id}/practice`}
                    className="mt-4 flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition"
                  >
                    <Play className="w-4 h-4" />
                    Practice
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent sessions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sessions</h2>

          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-600">
                Your practice session history will appear here after you complete a session.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => {
                    const accuracyColor =
                      session.accuracy_percentage >= 80
                        ? 'text-green-600'
                        : session.accuracy_percentage >= 50
                          ? 'text-yellow-600'
                          : 'text-red-600'

                    return (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.scores?.title || 'Unknown Score'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(session.started_at)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${accuracyColor}`}>
                          {Math.round(session.accuracy_percentage)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {session.notes_correct} / {session.notes_played}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(session.duration_seconds)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
