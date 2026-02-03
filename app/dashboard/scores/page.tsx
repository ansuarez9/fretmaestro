'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useScoreStore } from '@/lib/store/useScoreStore'
import Link from 'next/link'

export default function ScoresPage() {
  const supabase = createClient()
  const { scores, setScores, loading, setLoading } = useScoreStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('scores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setScores(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scores')
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [supabase, setScores, setLoading])

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
            <Link href="/dashboard/scores" className="text-indigo-600 font-medium">
              Scores
            </Link>
            <Link href="/dashboard/practice" className="text-gray-700 hover:text-indigo-600 font-medium">
              Practice
            </Link>
            <Link href="/dashboard/settings" className="text-gray-700 hover:text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Scores</h1>
          <Link
            href="/dashboard/scores/upload"
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition"
          >
            Upload Score
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600">Loading scores...</div>
        ) : scores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No scores uploaded yet</p>
            <Link
              href="/dashboard/scores/upload"
              className="inline-block bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition"
            >
              Upload Your First Score
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scores.map((score) => (
              <Link
                key={score.id}
                href={`/dashboard/scores/${score.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{score.title}</h3>
                {score.composer && (
                  <p className="text-gray-600 text-sm mb-4">by {score.composer}</p>
                )}
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Instrument: {score.instrument}</p>
                  {score.duration_seconds && (
                    <p>Duration: {Math.round(score.duration_seconds)}s</p>
                  )}
                </div>
                <div className="mt-4 inline-block">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      score.processing_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : score.processing_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {score.processing_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
