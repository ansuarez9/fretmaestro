'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  id: string
  email: string
  full_name: string | null
  subscription_tier: 'free' | 'paid'
  subscription_status: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)

        if (error || !data || data.length === 0) {
          // If profile doesn't exist, create a default one
          const defaultProfile: Profile = {
            id: user.id,
            email: user.email || '',
            full_name: null,
            subscription_tier: 'free',
            subscription_status: null,
          }
          setProfile(defaultProfile)
        } else {
          setProfile(data[0])
          setFullName(data[0].full_name || '')
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setUpdating(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          email: profile.email,
          full_name: fullName,
          subscription_tier: profile.subscription_tier,
          subscription_status: profile.subscription_status,
        })

      if (error) throw error

      setProfile({ ...profile, full_name: fullName })
      setMessage({ text: 'Profile updated successfully', type: 'success' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to update profile',
        type: 'error',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Failed to load profile</div>
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
            <Link href="/dashboard/practice" className="text-gray-700 hover:text-indigo-600 font-medium">
              Practice
            </Link>
            <Link href="/dashboard/settings" className="text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                  placeholder="Your full name"
                />
              </div>

              {message && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {updating ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Subscription Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.subscription_tier === 'paid' ? 'Pro' : 'Free'} Tier
                </p>
              </div>

              {profile.subscription_status && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Status</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {profile.subscription_status}
                  </p>
                </div>
              )}

              {profile.subscription_tier === 'free' ? (
                <Link
                  href="/pricing"
                  className="inline-block bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold transition"
                >
                  Upgrade to Pro
                </Link>
              ) : (
                <button className="text-red-600 hover:text-red-700 font-semibold">
                  Manage Subscription
                </button>
              )}
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
