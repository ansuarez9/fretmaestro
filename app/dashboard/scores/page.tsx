'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useScoreStore } from '@/lib/store/useScoreStore'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

export default function ScoresPage() {
  const supabase = createClient()
  const router = useRouter()
  const { scores, setScores, loading, setLoading } = useScoreStore()
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

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

  const handleDeleteClick = useCallback((e: React.MouseEvent, scoreId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(scoreId)
  }, [])

  const handleDeleteConfirm = useCallback(async (scoreId: string) => {
    setDeletingId(scoreId)
    setShowDeleteConfirm(null)

    try {
      // Find the score to get the file path
      const scoreToDelete = scores.find((s) => s.id === scoreId)

      // Delete the file from storage if it exists
      if (scoreToDelete?.musicxml_file_path) {
        await supabase.storage
          .from('user-uploads')
          .remove([scoreToDelete.musicxml_file_path])
      }

      // Delete the score record from the database
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId)

      if (error) throw error

      // Update the local state
      setScores(scores.filter((s) => s.id !== scoreId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete score')
    } finally {
      setDeletingId(null)
    }
  }, [scores, supabase, setScores])

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(null)
  }, [])

  const handleCardClick = useCallback((scoreId: string) => {
    router.push(`/dashboard/scores/${scoreId}`)
  }, [router])

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
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-800 hover:text-red-900 font-medium"
            >
              Dismiss
            </button>
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
              <div
                key={score.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer relative group"
                onClick={() => handleCardClick(score.id)}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(e, score.id)}
                  disabled={deletingId === score.id}
                  className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  aria-label="Delete score"
                >
                  {deletingId === score.id ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">{score.title}</h3>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Score?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this score? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
