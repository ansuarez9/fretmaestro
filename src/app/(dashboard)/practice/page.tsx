'use client'

import Link from 'next/link'

export default function PracticePage() {
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
            <Link href="/scores" className="text-gray-700 hover:text-indigo-600 font-medium">
              Scores
            </Link>
            <Link href="/practice" className="text-indigo-600 font-medium">
              Practice
            </Link>
            <Link href="/settings" className="text-gray-700 hover:text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Practice Sessions</h1>

        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ready to practice?</h2>
          <p className="text-gray-600 mb-6">
            Select a score to start practicing with real-time pitch detection feedback.
          </p>
          <Link
            href="/scores"
            className="inline-block bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            Go to Scores
          </Link>
        </div>
      </div>
    </div>
  )
}
