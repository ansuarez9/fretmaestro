'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function UploadScorePage() {
  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [instrument, setInstrument] = useState('guitar')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateFile = useCallback((selectedFile: File): boolean => {
    setFileError(null)

    const validExtensions = ['.musicxml', '.mxl', '.xml']
    const hasValidExtension = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    )
    if (!hasValidExtension) {
      setFileError('Only MusicXML files (.musicxml, .mxl, .xml) are supported')
      return false
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setFileError('File size must be less than 50MB')
      return false
    }
    return true
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile)
    } else {
      setFile(null)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile)
    } else {
      setFile(null)
    }
  }, [validateFile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!file) {
      setError('Please select a MusicXML file')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(`${user.id}/musicxml/${fileName}`, file)

      if (uploadError) throw uploadError

      // Create score record
      const { error: scoreError } = await supabase.from('scores').insert({
        user_id: user.id,
        title: title.trim(),
        composer: composer.trim() || null,
        musicxml_file_path: `${user.id}/musicxml/${fileName}`,
        instrument,
        processing_status: 'completed',
      })

      if (scoreError) throw scoreError

      router.push('/dashboard/scores')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
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
            <Link href="/dashboard/scores" className="text-indigo-600 font-medium">
              Scores
            </Link>
            <Link href="/dashboard/practice" className="text-gray-700 hover:text-indigo-600 font-medium">
              Practice
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload a Score</h1>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                placeholder="e.g., Stairway to Heaven"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Composer (Optional)
              </label>
              <input
                type="text"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                placeholder="e.g., Jimmy Page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrument *
              </label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
              >
                <option value="guitar">Guitar</option>
                <option value="piano">Piano</option>
                <option value="violin">Violin</option>
                <option value="flute">Flute</option>
                <option value="trumpet">Trumpet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MusicXML File *
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : file
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-indigo-500'
                }`}
              >
                <input
                  type="file"
                  accept=".musicxml,.mxl,.xml"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer block">
                  {isDragging ? (
                    <div className="text-indigo-600">
                      <p className="font-semibold">Drop your file here</p>
                    </div>
                  ) : file ? (
                    <div className="text-green-600">
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm">Click or drag to change file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">MusicXML files (.musicxml, .mxl, .xml)</p>
                    </div>
                  )}
                </label>
              </div>
              {fileError && (
                <p className="text-red-600 text-sm mt-2">{fileError}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Uploading...' : 'Upload Score'}
              </button>
              <Link
                href="/dashboard/scores"
                className="flex-1 text-center border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </Link>
            </div>
          </form>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How to get a MusicXML file</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• <strong>MuseScore:</strong> File → Export → Select &quot;MusicXML&quot; or &quot;Compressed MusicXML (.mxl)&quot;</li>
              <li>• <strong>Finale or Sibelius:</strong> File → Export → MusicXML</li>
              <li>• <strong>Guitar Pro:</strong> File → Export → MusicXML</li>
              <li>• <strong>From PDF:</strong> Use Audiveris or similar OMR software</li>
            </ul>
            <p className="text-blue-700 text-sm mt-3">
              We support both uncompressed (.musicxml, .xml) and compressed (.mxl) formats.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
