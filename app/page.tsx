import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">FretMaestro</h1>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Learn Music with Real-Time Feedback
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Upload sheet music, see it rendered on screen, play along with audio playback, and get
          instant pitch detection feedback as you practice.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-8 py-3 rounded-lg font-semibold transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">Powerful Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Sheet Music Rendering</h4>
              <p className="text-gray-600">
                Upload MusicXML files and see beautifully rendered sheet music with interactive
                controls.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Audio Playback</h4>
              <p className="text-gray-600">
                Listen to realistic guitar playback with adjustable tempo and synchronized visual
                highlighting.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Pitch Detection</h4>
              <p className="text-gray-600">
                Get real-time feedback on your playing with instant note accuracy detection and
                visual cues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">Simple Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="border border-gray-300 rounded-lg p-8">
              <h4 className="text-2xl font-bold mb-4 text-gray-900">Free Tier</h4>
              <p className="text-gray-600 mb-4">30-second preview playback</p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ Upload scores</li>
                <li>✓ View rendered sheet music</li>
                <li>✓ 30-second audio preview</li>
              </ul>
              <Link
                href="/auth/signup"
                className="block text-center bg-gray-100 text-gray-900 hover:bg-gray-200 px-6 py-2 rounded-lg font-semibold transition"
              >
                Get Started
              </Link>
            </div>
            <div className="border-2 border-indigo-600 rounded-lg p-8 bg-indigo-50">
              <h4 className="text-2xl font-bold mb-4 text-indigo-900">Pro Tier</h4>
              <p className="text-indigo-700 mb-4 font-semibold">$9.99/month</p>
              <ul className="text-indigo-700 space-y-2 mb-6">
                <li>✓ Full playback</li>
                <li>✓ Master Teacher mode</li>
                <li>✓ YouTube references</li>
                <li>✓ Practice tracking</li>
              </ul>
              <Link
                href="/auth/signup"
                className="block text-center bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2 rounded-lg font-semibold transition"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
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
