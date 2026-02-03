'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseMusicXML, scoreToPlayableNotes, type ParsedScore } from '@/lib/musicxml/parser'
import { convertParsedScoreToVexFlow, findNoteIndexAtTime, type VexFlowScore } from '@/lib/musicxml/converter'
import { ScoreRenderer } from '@/components/ScoreRenderer'
import { PlaybackControls } from '@/components/PlaybackControls'
import { ScorePlayer } from '@/lib/audio/ScorePlayer'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'
import { useScoreStore, type Score } from '@/lib/store/useScoreStore'

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
  } = usePlaybackStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vexFlowScore, setVexFlowScore] = useState<VexFlowScore | null>(null)
  const [parsedScore, setParsedScore] = useState<ParsedScore | null>(null)
  const [scorePlayer, setScorePlayer] = useState<ScorePlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch score and MusicXML
  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true)
        setError(null)

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

        // Parse the MusicXML content
        const xmlContent = await fileData.text()
        const parsed = await parseMusicXML(xmlContent)
        setParsedScore(parsed)

        // Convert to VexFlow format
        const vexFlow = convertParsedScoreToVexFlow(parsed, {
          timeSignature: '4/4',
          keySignature: 'C',
          clef: 'treble',
        })
        setVexFlowScore(vexFlow)

        // Set playback duration and tempo
        const beatDuration = 60 / parsed.tempo
        const totalSeconds = parsed.totalDuration * beatDuration
        setDuration(totalSeconds)
        setTempo(parsed.tempo)
      } catch (err) {
        console.error('Error fetching score:', err)
        setError(err instanceof Error ? err.message : 'Failed to load score')
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

    const player = new ScorePlayer(true) // true = free tier limit (30 seconds)

    const initPlayer = async () => {
      try {
        await player.initialize()
        player.createSynth()

        const playableNotes = scoreToPlayableNotes(parsedScore)
        const beatDuration = 60 / parsedScore.tempo

        player.scheduleNotes({
          notes: playableNotes,
          duration: parsedScore.totalDuration * beatDuration,
          tempo: parsedScore.tempo,
        })

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
  }, [parsedScore])

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
              <h1 className="text-3xl font-bold text-gray-900">{currentScore.title}</h1>
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
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Score display */}
        {!loading && !error && vexFlowScore && (
          <div className="space-y-6">
            {/* Playback controls */}
            <PlaybackControls scorePlayer={scorePlayer} disabled={!playerReady} />

            {/* Audio initialization notice */}
            {!playerReady && parsedScore && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                Initializing audio... Click anywhere on the page if playback doesn&apos;t start.
              </div>
            )}

            {/* Free tier notice */}
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
              <strong>Free Tier:</strong> Playback limited to first 30 seconds.{' '}
              <Link href="/pricing" className="underline font-medium">
                Upgrade to Pro
              </Link>{' '}
              for full playback.
            </div>

            {/* Score renderer */}
            <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
              <ScoreRenderer score={vexFlowScore} measuresPerSystem={4} />
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
    </div>
  )
}
