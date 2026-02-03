'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirect=/dashboard/checkout')
        return
      }
      setUser(user)
      setLoading(false)
    }

    checkAuth()
  }, [supabase, router])

  const handleCheckout = async () => {
    setProcessing(true)
    // TODO: Integrate Stripe checkout
    // For now, just show a message
    alert('Stripe integration coming soon!')
    setProcessing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
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
            <Link href="/dashboard/settings" className="text-gray-700 hover:text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upgrade to Pro</h1>
          <p className="text-gray-600">Unlock the full FretMaestro experience</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <p className="text-5xl font-bold text-gray-900">
              $9.99<span className="text-lg text-gray-600 font-normal">/month</span>
            </p>
            <p className="text-gray-600 mt-2">Cancel anytime</p>
          </div>

          <div className="border-t border-b border-gray-200 py-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Everything in Pro includes:</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Full audio playback (no 30-second limit)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Master Teacher mode with pitch detection</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">YouTube reference videos</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Practice tracking & history</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">AI-generated practice plans</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleCheckout}
            disabled={processing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition text-lg"
          >
            {processing ? 'Processing...' : 'Subscribe Now'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Secure payment powered by Stripe
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-indigo-600 hover:text-indigo-800 font-medium">
            ← Back to pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
