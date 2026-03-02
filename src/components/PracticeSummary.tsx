'use client'

import React from 'react'
import Link from 'next/link'
import { RotateCcw, ArrowLeft } from 'lucide-react'

interface PracticeSummaryProps {
  accuracy: number
  notesCorrect: number
  notesPlayed: number
  durationSeconds: number
  onPracticeAgain: () => void
  scoreId: string
}

export function PracticeSummary({
  accuracy,
  notesCorrect,
  notesPlayed,
  durationSeconds,
  onPracticeAgain,
  scoreId,
}: PracticeSummaryProps) {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = Math.floor(durationSeconds % 60)

  const accuracyColor =
    accuracy >= 80
      ? 'text-green-600'
      : accuracy >= 50
        ? 'text-yellow-600'
        : 'text-red-600'

  const accuracyBgColor =
    accuracy >= 80
      ? 'bg-green-50 border-green-200'
      : accuracy >= 50
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-red-50 border-red-200'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Practice Complete
        </h2>

        {/* Accuracy circle */}
        <div className={`border rounded-lg p-6 text-center mb-6 ${accuracyBgColor}`}>
          <div className={`text-6xl font-bold ${accuracyColor}`}>
            {accuracy}%
          </div>
          <div className="text-gray-600 mt-1">Accuracy</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-xl font-semibold text-gray-900">
              {notesCorrect} / {notesPlayed}
            </div>
            <div className="text-sm text-gray-500">Notes Correct</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-xl font-semibold text-gray-900">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-500">Duration</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPracticeAgain}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
          >
            <RotateCcw className="w-5 h-5" />
            Practice Again
          </button>
          <Link
            href={`/dashboard/scores/${scoreId}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Score
          </Link>
        </div>
      </div>
    </div>
  )
}
