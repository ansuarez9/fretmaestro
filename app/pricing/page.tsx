import Link from 'next/link'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            FretMaestro
          </Link>
          <div className="flex gap-4">
            <Link href="/auth/login" className="border border-gray-300 text-gray-700 hover:border-indigo-600 hover:text-indigo-600 px-4 py-2 rounded-lg font-medium transition">
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">
            Start learning for free, upgrade when you&apos;re ready
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Tier</h3>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>

            <div className="mb-6">
              <p className="text-4xl font-bold text-gray-900">$0</p>
              <p className="text-gray-600">Forever free</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Upload and view sheet music</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">30-second audio preview</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Basic score rendering</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-gray-400 font-bold">✗</span>
                <span className="text-gray-500">Full playback</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-gray-400 font-bold">✗</span>
                <span className="text-gray-500">Pitch detection</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-gray-400 font-bold">✗</span>
                <span className="text-gray-500">YouTube references</span>
              </li>
            </ul>

            <Link
              href="/auth/signup"
              className="block text-center bg-gray-100 text-gray-900 hover:bg-gray-200 px-6 py-3 rounded-lg font-semibold transition"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-indigo-600 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro Tier</h3>
            <p className="text-gray-600 mb-6">For serious learners</p>

            <div className="mb-6">
              <p className="text-4xl font-bold text-gray-900">
                $9.99<span className="text-lg text-gray-600">/mo</span>
              </p>
              <p className="text-gray-600">Billed monthly</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Everything in Free</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Full audio playback</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Master Teacher mode (pitch detection)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">YouTube references</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Practice tracking & history</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Practice plan generation</span>
              </li>
            </ul>

            <Link
              href="/auth/signup"
              className="block text-center bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition"
            >
              Start Free Trial
            </Link>
            <p className="text-center text-sm text-gray-600 mt-4">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. No questions asked.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do I get a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! You can try the Pro tier free for the first 7 days. No credit card required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What if I need help?
              </h3>
              <p className="text-gray-600">
                Contact our support team at support@fretmaestro.com for any questions or issues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to start learning?</h2>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-indigo-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 FretMaestro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
