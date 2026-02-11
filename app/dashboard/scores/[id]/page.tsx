'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseMusicXML, scoreToPlayableNotes, MusicXMLParseError, type ParsedScore } from '@/lib/musicxml/parser'
import { convertParsedScoreToVexFlow, findNoteIndexAtTime, calculateMeasureTimings, type VexFlowScore, type MeasureTiming } from '@/lib/musicxml/converter'
import { ScoreRenderer } from '@/components/ScoreRenderer'
import { PlaybackControls } from '@/components/PlaybackControls'
import { ScorePlayer } from '@/lib/audio/ScorePlayer'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'
import { useScoreStore, type Score } from '@/lib/store/useScoreStore'
import { Pencil } from 'lucide-react'

export default function ScoreViewerPage() {
  const params = useParams()
  const scoreId = params.id as string

  const supabase = createClient()
  const { setCurrentScore, currentScore } = useScoreStore()
  const {
    setDuration,
    setTempo,
    setHighlightedNoteIndex,
    setCurrentTime,
    setIsPlaying,
    isPlaying,
    metronomeEnabled,
    countInEnabled,
    loopEnabled,
    loopStartMeasure,
    loopEndMeasure,
  } = usePlaybackStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vexFlowScore, setVexFlowScore] = useState<VexFlowScore | null>(null)
  const [parsedScore, setParsedScore] = useState<ParsedScore | null>(null)
  const [scorePlayer, setScorePlayer] = useState<ScorePlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [isFreeTier, setIsFreeTier] = useState(true) // safe default
  const [measureTimings, setMeasureTimings] = useState<MeasureTiming[]>([])

  // Edit mode state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editComposer, setEditComposer] = useState('')
  const [editInstrument, setEditInstrument] = useState('guitar')
  const [saving, setSaving] = useState(false)

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Open edit modal
  const handleEditClick = useCallback(() => {
    if (currentScore) {
      setEditTitle(currentScore.title)
      setEditComposer(currentScore.composer || '')
      setEditInstrument(currentScore.instrument || 'guitar')
      setShowEditModal(true)
    }
  }, [currentScore])

  // Save edited score
  const handleSaveEdit = useCallback(async () => {
    if (!currentScore || !editTitle.trim()) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('scores')
        .update({
          title: editTitle.trim(),
          composer: editComposer.trim() || undefined,
          instrument: editInstrument,
        })
        .eq('id', currentScore.id)

      if (updateError) throw updateError

      // Update local state
      setCurrentScore({
        ...currentScore,
        title: editTitle.trim(),
        composer: editComposer.trim() || undefined,
        instrument: editInstrument,
      })

      setShowEditModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score')
    } finally {
      setSaving(false)
    }
  }, [currentScore, editTitle, editComposer, editInstrument, supabase, setCurrentScore])

  // Fetch score and MusicXML
  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user profile for subscription tier
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()
          if (profileData) {
            setIsFreeTier(profileData.subscription_tier !== 'paid')
          }
        }

        // Fetch score metadata from database
        const { data: scoreData, error: scoreError } = await supabase
          .from('scores')
          .select('*')
          .eq('id', scoreId)

        if (scoreError) throw scoreError
        if (!scoreData || scoreData.length === 0) throw new Error('Score not found')

        const score = scoreData[0] as Score
        setCurrentScore(score)

        // Fetch MusicXML file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('user-uploads')
          .download(score.musicxml_file_path)

        if (fileError) throw fileError
        if (!fileData) throw new Error('MusicXML file not found')

        // Parse the MusicXML content (supports both .musicxml and .mxl formats)
        const fileBuffer = await fileData.arrayBuffer()
        const parsed = await parseMusicXML(fileBuffer)
        setParsedScore(parsed)

        // Compute measure timings for looping
        const timings = calculateMeasureTimings(parsed)
        setMeasureTimings(timings)

        // Convert to VexFlow format using parsed values
        const vexFlow = convertParsedScoreToVexFlow(parsed, {
          timeSignature: parsed.timeSignature || '4/4',
          keySignature: parsed.keySignature || 'C',
          clef: parsed.clef || 'treble',
        })
        setVexFlowScore(vexFlow)

        // Set playback duration and tempo
        const beatDuration = 60 / parsed.tempo
        const totalSeconds = parsed.totalDuration * beatDuration
        setDuration(totalSeconds)
        setTempo(parsed.tempo)
      } catch (err) {
        console.error('Error fetching score:', err)
        if (err instanceof MusicXMLParseError) {
          setError(err.userMessage)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load score')
        }
      } finally {
        setLoading(false)
      }
    }

    if (scoreId) {
      fetchScore()
    }

    return () => {
      // Cleanup
      setCurrentScore(null)
      setHighlightedNoteIndex(null)
      setCurrentTime(0)
      setIsPlaying(false)
    }
  }, [scoreId, supabase, setCurrentScore, setDuration, setTempo, setHighlightedNoteIndex, setCurrentTime, setIsPlaying])

  // Initialize ScorePlayer
  useEffect(() => {
    if (!parsedScore) return

    const player = new ScorePlayer(isFreeTier)

    const initPlayer = async () => {
      try {
        await player.initialize()
        player.createSynth()
        player.createMetronome()

        const playableNotes = scoreToPlayableNotes(parsedScore)
        const beatDuration = 60 / parsedScore.tempo

        player.scheduleNotes({
          notes: playableNotes,
          duration: parsedScore.totalDuration * beatDuration,
          tempo: parsedScore.tempo,
        })

        player.scheduleMetronome(
          parsedScore.totalDuration * beatDuration,
          parsedScore.tempo,
          parsedScore.beats,
          parsedScore.beatType
        )

        player.setTempo(parsedScore.tempo)
        setScorePlayer(player)
        setPlayerReady(true)
      } catch (err) {
        console.error('Failed to initialize audio:', err)
        setError('Failed to initialize audio playback. Please refresh and try again.')
      }
    }

    initPlayer()

    return () => {
      player.dispose()
      setScorePlayer(null)
      setPlayerReady(false)
    }
  }, [parsedScore, isFreeTier])

  // Sync metronome enabled state to player
  useEffect(() => {
    if (scorePlayer) {
      scorePlayer.setMetronomeEnabled(metronomeEnabled)
    }
  }, [scorePlayer, metronomeEnabled])

  // Sync count-in enabled state to player
  useEffect(() => {
    if (scorePlayer && parsedScore) {
      scorePlayer.setCountInEnabled(countInEnabled, parsedScore.beats, parsedScore.tempo)
    }
  }, [scorePlayer, countInEnabled, parsedScore])

  // Sync loop state to player
  useEffect(() => {
    if (!scorePlayer || measureTimings.length === 0) return

    if (loopEnabled) {
      const startIdx = loopStartMeasure - 1
      const endIdx = loopEndMeasure - 1

      if (startIdx >= 0 && endIdx < measureTimings.length) {
        const startSeconds = measureTimings[startIdx].startTime
        const endSeconds = measureTimings[endIdx].endTime
        scorePlayer.setLoop(true, startSeconds, endSeconds)
      }
    } else {
      scorePlayer.setLoop(false, 0, 0)
    }
  }, [scorePlayer, loopEnabled, loopStartMeasure, loopEndMeasure, measureTimings])

  // Sync playback position with note highlighting
  useEffect(() => {
    if (!scorePlayer || !parsedScore) return

    const updatePlayback = () => {
      if (scorePlayer.isPlaying()) {
        const currentSeconds = scorePlayer.getPosition()
        setCurrentTime(currentSeconds)

        // Find the note that should be highlighted
        const noteIndex = findNoteIndexAtTime(parsedScore, currentSeconds)
        setHighlightedNoteIndex(noteIndex)
      }
    }

    // Update every 50ms for smooth highlighting
    updateIntervalRef.current = setInterval(updatePlayback, 50)

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [scorePlayer, parsedScore, setCurrentTime, setHighlightedNoteIndex])

  // Handle playback state changes
  useEffect(() => {
    if (!scorePlayer) return

    // Check if playback stopped (reached end or 30-second limit)
    const checkPlaybackState = setInterval(() => {
      if (isPlaying && !scorePlayer.isPlaying()) {
        setIsPlaying(false)
      }
    }, 100)

    return () => clearInterval(checkPlaybackState)
  }, [scorePlayer, isPlaying, setIsPlaying])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
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
            <Link href="/dashboard/settings" className="text-gray-700 hover:text-indigo-600 font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button and title */}
        <div className="mb-6">
          <Link
            href="/dashboard/scores"
            className="text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center"
          >
            <span className="mr-2">&larr;</span> Back to Scores
          </Link>

          {currentScore && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{currentScore.title}</h1>
                <button
                  onClick={handleEditClick}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  aria-label="Edit score details"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
              {currentScore.composer && (
                <p className="text-gray-600 mt-1">by {currentScore.composer}</p>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg mb-6 p-6">
            <h3 className="text-red-800 font-semibold text-lg mb-2">Unable to Load Score</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
              >
                Try Again
              </button>
              <Link
                href="/dashboard/scores"
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 font-medium transition"
              >
                Back to Scores
              </Link>
            </div>
          </div>
        )}

        {/* Score display */}
        {!loading && !error && vexFlowScore && (
          <div className="space-y-6">
            {/* Playback controls */}
            <PlaybackControls
              scorePlayer={scorePlayer}
              disabled={!playerReady}
              isFreeTier={isFreeTier}
              totalMeasures={parsedScore?.measures.length || 1}
            />

            {/* Audio initialization notice */}
            {!playerReady && parsedScore && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                Initializing audio... Click anywhere on the page if playback doesn&apos;t start.
              </div>
            )}

            {/* Free tier notice */}
            {isFreeTier && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                <strong>Free Tier:</strong> Playback limited to first 30 seconds.{' '}
                <Link href="/pricing" className="underline font-medium">
                  Upgrade to Pro
                </Link>{' '}
                for full playback.
              </div>
            )}

            {/* Score renderer */}
            <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
              <ScoreRenderer
                score={vexFlowScore}
                measuresPerSystem={4}
                loopStartMeasure={loopEnabled ? loopStartMeasure : undefined}
                loopEndMeasure={loopEnabled ? loopEndMeasure : undefined}
              />
            </div>

            {/* Score info */}
            <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="font-medium text-gray-900">Tempo:</span> {vexFlowScore.tempo} BPM
              </div>
              <div>
                <span className="font-medium text-gray-900">Time Signature:</span>{' '}
                {vexFlowScore.timeSignature}
              </div>
              <div>
                <span className="font-medium text-gray-900">Measures:</span>{' '}
                {vexFlowScore.measures.length}
              </div>
              <div>
                <span className="font-medium text-gray-900">Instrument:</span>{' '}
                {currentScore?.instrument || 'Guitar'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Score Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                  placeholder="Score title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Composer
                </label>
                <input
                  type="text"
                  value={editComposer}
                  onChange={(e) => setEditComposer(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                  placeholder="Composer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrument
                </label>
                <select
                  value={editInstrument}
                  onChange={(e) => setEditInstrument(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                >
                  <option value="guitar">Guitar</option>
                  <option value="piano">Piano</option>
                  <option value="violin">Violin</option>
                  <option value="flute">Flute</option>
                  <option value="trumpet">Trumpet</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editTitle.trim()}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 rounded-lg font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
