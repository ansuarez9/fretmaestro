'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [supabase])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">FretMaestro</h1>
          <div className="flex gap-4">
            <Link
              href="/scores"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Scores
            </Link>
            <Link
              href="/practice"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Practice
            </Link>
            <Link
              href="/settings"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Settings
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
          <p className="text-gray-600 mb-6">
            You&apos;re logged in as <span className="font-medium">{user?.email}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/scores/upload"
              className="bg-indigo-50 hover:bg-indigo-100 rounded-lg p-6 cursor-pointer transition"
            >
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Upload Score
              </h3>
              <p className="text-indigo-700">
                Add a new MusicXML file to start practicing
              </p>
            </Link>

            <Link
              href="/scores"
              className="bg-blue-50 hover:bg-blue-100 rounded-lg p-6 cursor-pointer transition"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-2">My Scores</h3>
              <p className="text-blue-700">View and manage your uploaded scores</p>
            </Link>

            <Link
              href="/practice"
              className="bg-green-50 hover:bg-green-100 rounded-lg p-6 cursor-pointer transition"
            >
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Start Practicing
              </h3>
              <p className="text-green-700">Practice with real-time feedback</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
