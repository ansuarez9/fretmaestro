'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseMusicXML, scoreToPlayableNotes, MusicXMLParseError, type ParsedScore } from '@/lib/musicxml/parser'
import { convertParsedScoreToVexFlow, findNoteIndexAtTime, type VexFlowScore } from '@/lib/musicxml/converter'
import { ScoreRenderer } from '@/components/ScoreRenderer'
import { PracticeControls } from '@/components/PracticeControls'
import { PracticeSummary } from '@/components/PracticeSummary'
import { ScorePlayer } from '@/lib/audio/ScorePlayer'
import { PitchDetectionEngine, type PitchDetectionResult } from '@/lib/audio/PitchDetectionEngine'
import { SessionRecorder } from '@/lib/audio/SessionRecorder'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'
import { usePracticeModeStore } from '@/lib/store/usePracticeModeStore'
import { useScoreStore, type Score } from '@/lib/store/useScoreStore'

const PRACTICE_HIGHLIGHT_COLOR = '#3B82F6' // blue-500
const CORRECT_COLOR = '#22C55E' // green-500
const INCORRECT_COLOR = '#EF4444' // red-500

export default function PracticeSessionPage() {
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
  } = usePlaybackStore()
  const {
    isPracticing,
    setIsPracticing,
    notesCorrect,
    notesPlayed,
    addNote,
    resetSession,
    setStartTime,
    setEndTime,
    setMicPermissionGranted,
    calculateAccuracy,
  } = usePracticeModeStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vexFlowScore, setVexFlowScore] = useState<VexFlowScore | null>(null)
  const [parsedScore, setParsedScore] = useState<ParsedScore | null>(null)
  const [scorePlayer, setScorePlayer] = useState<ScorePlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [noteColors, setNoteColors] = useState<Map<number, string>>(new Map())
  const [showSummary, setShowSummary] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [detectedPitch, setDetectedPitch] = useState<{
    midi: number | null
    confidence: number
    frequency: number | null
  } | null>(null)

  const pitchEngineRef = useRef<PitchDetectionEngine | null>(null)
  const sessionRecorderRef = useRef<SessionRecorder | null>(null)
  const latestPitchRef = useRef<PitchDetectionResult | null>(null)
  const evaluatedNotesRef = useRef<Set<number>>(new Set())
  const practiceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)

  // Fetch score and MusicXML (same pattern as score viewer)
  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          userIdRef.current = user.id
        }

        const { data: scoreData, error: scoreError } = await supabase
          .from('scores')
          .select('*')
          .eq('id', scoreId)

        if (scoreError) throw scoreError
        if (!scoreData || scoreData.length === 0) throw new Error('Score not found')

        const score = scoreData[0] as Score
        setCurrentScore(score)

        const { data: fileData, error: fileError } = await supabase.storage
          .from('user-uploads')
          .download(score.musicxml_file_path)

        if (fileError) throw fileError
        if (!fileData) throw new Error('MusicXML file not found')

        const fileBuffer = await fileData.arrayBuffer()
        const parsed = await parseMusicXML(fileBuffer)
        setParsedScore(parsed)

        const vexFlow = convertParsedScoreToVexFlow(parsed, {
          timeSignature: parsed.timeSignature || '4/4',
          keySignature: parsed.keySignature || 'C',
          clef: parsed.clef || 'treble',
        })
        setVexFlowScore(vexFlow)

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
      setCurrentScore(null)
      setHighlightedNoteIndex(null)
      setCurrentTime(0)
      setIsPlaying(false)
      resetSession()
    }
  }, [scoreId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize ScorePlayer
  useEffect(() => {
    if (!parsedScore) return

    const player = new ScorePlayer(false) // no free tier limit for practice

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

        player.setMetronomeEnabled(true)
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
        setError('Failed to initialize audio. Please refresh and try again.')
      }
    }

    initPlayer()

    return () => {
      player.dispose()
      setScorePlayer(null)
      setPlayerReady(false)
    }
  }, [parsedScore])

  // Start practice
  const handleStartPractice = useCallback(async () => {
    if (!scorePlayer || !parsedScore) return

    try {
      // Initialize pitch detection
      const engine = new PitchDetectionEngine()
      await engine.initialize()
      pitchEngineRef.current = engine
      setMicPermissionGranted(true)
      setMicError(null)

      // Initialize session recorder
      const recorder = new SessionRecorder()
      if (userIdRef.current) {
        recorder.startSession(userIdRef.current, scoreId)
      }
      sessionRecorderRef.current = recorder

      // Reset state
      resetSession()
      setNoteColors(new Map())
      evaluatedNotesRef.current = new Set()
      setShowSummary(false)

      // Start pitch detection
      engine.start((result: PitchDetectionResult) => {
        latestPitchRef.current = result
        setDetectedPitch({
          midi: result.midi,
          confidence: result.confidence,
          frequency: result.frequency,
        })
      })

      // Start playback
      scorePlayer.setCountInEnabled(true, parsedScore.beats, parsedScore.tempo)
      scorePlayer.stop() // reset position
      scorePlayer.play()

      setIsPracticing(true)
      setIsPlaying(true)
      setStartTime(Date.now())

      // Start the practice evaluation loop (50ms)
      practiceIntervalRef.current = setInterval(() => {
        evaluateCurrentNote()
      }, 50)

      // Start playback position update loop
      updateIntervalRef.current = setInterval(() => {
        if (scorePlayer.isPlaying()) {
          const currentSeconds = scorePlayer.getPosition()
          setCurrentTime(currentSeconds)
          const noteIndex = findNoteIndexAtTime(parsedScore, currentSeconds)
          setHighlightedNoteIndex(noteIndex)
        }
      }, 50)
    } catch (err) {
      console.error('Failed to start practice:', err)
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setMicError(message)
      setMicPermissionGranted(false)
    }
  }, [scorePlayer, parsedScore, scoreId, resetSession, setIsPracticing, setIsPlaying, setStartTime, setCurrentTime, setHighlightedNoteIndex, setMicPermissionGranted])

  // Evaluate current note against detected pitch
  const evaluateCurrentNote = useCallback(() => {
    if (!parsedScore || !scorePlayer) return

    const currentSeconds = scorePlayer.getPosition()
    const noteIndex = findNoteIndexAtTime(parsedScore, currentSeconds)

    if (noteIndex === null) return
    if (evaluatedNotesRef.current.has(noteIndex)) return

    const pitch = latestPitchRef.current
    if (!pitch || pitch.confidence < 0.5) return // skip low-confidence readings

    // Find the expected note
    let expectedMidi: number | null = null
    let noteCounter = 0
    for (const measure of parsedScore.measures) {
      for (const note of measure.notes) {
        if (noteCounter === noteIndex) {
          expectedMidi = note.midi
          break
        }
        noteCounter++
      }
      if (expectedMidi !== null) break
    }

    if (expectedMidi === null) return

    // Mark as evaluated
    evaluatedNotesRef.current.add(noteIndex)

    const isCorrect = pitchEngineRef.current?.isPitchCorrect(pitch.frequency, expectedMidi) ?? false

    // Update note colors
    setNoteColors((prev) => {
      const next = new Map(prev)
      next.set(noteIndex, isCorrect ? CORRECT_COLOR : INCORRECT_COLOR)
      return next
    })

    // Record in store and session recorder
    addNote({
      index: noteIndex,
      expectedPitch: expectedMidi,
      detectedPitch: pitch.midi,
      isCorrect,
      timestamp: Date.now(),
    })

    sessionRecorderRef.current?.recordNote(
      expectedMidi,
      pitch.midi,
      isCorrect,
      pitch.confidence
    )
  }, [parsedScore, scorePlayer, addNote])

  // Stop practice
  const handleStopPractice = useCallback(async () => {
    // Stop intervals
    if (practiceIntervalRef.current) {
      clearInterval(practiceIntervalRef.current)
      practiceIntervalRef.current = null
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
      updateIntervalRef.current = null
    }

    // Stop playback
    scorePlayer?.stop()
    setIsPlaying(false)

    // Stop pitch detection
    pitchEngineRef.current?.stop()
    pitchEngineRef.current?.dispose()
    pitchEngineRef.current = null

    // End session
    setEndTime(Date.now())
    const startTime = usePracticeModeStore.getState().startTime
    const endTime = Date.now()
    const duration = startTime ? Math.round((endTime - startTime) / 1000) : 0
    setSessionDuration(duration)

    // Save session to database
    await sessionRecorderRef.current?.endSession()
    sessionRecorderRef.current = null

    setIsPracticing(false)
    setHighlightedNoteIndex(null)
    setMicPermissionGranted(false)
    setShowSummary(true)
  }, [scorePlayer, setIsPlaying, setEndTime, setIsPracticing, setHighlightedNoteIndex, setMicPermissionGranted])

  // Watch for playback end to auto-stop practice
  useEffect(() => {
    if (!isPracticing || !scorePlayer) return

    const checkEnd = setInterval(() => {
      if (!scorePlayer.isPlaying() && isPracticing) {
        handleStopPractice()
      }
    }, 200)

    return () => clearInterval(checkEnd)
  }, [isPracticing, scorePlayer, handleStopPractice])

  // Practice again
  const handlePracticeAgain = useCallback(() => {
    setShowSummary(false)
    setNoteColors(new Map())
    resetSession()
    setHighlightedNoteIndex(null)
    setCurrentTime(0)
  }, [resetSession, setHighlightedNoteIndex, setCurrentTime])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (practiceIntervalRef.current) clearInterval(practiceIntervalRef.current)
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current)
      pitchEngineRef.current?.stop()
      pitchEngineRef.current?.dispose()
    }
  }, [])

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
            <Link href="/dashboard/practice" className="text-indigo-600 font-medium">
              Practice
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
            href={`/dashboard/scores/${scoreId}`}
            className="text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center"
          >
            <span className="mr-2">&larr;</span> Back to Score
          </Link>

          {currentScore && (
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Practice: {currentScore.title}
              </h1>
              {currentScore.composer && (
                <p className="text-gray-600 mt-1">by {currentScore.composer}</p>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* Error */}
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

        {/* Practice UI */}
        {!loading && !error && vexFlowScore && (
          <div className="space-y-6">
            {/* Practice controls */}
            <PracticeControls
              scorePlayer={scorePlayer}
              disabled={!playerReady}
              onStartPractice={handleStartPractice}
              onStopPractice={handleStopPractice}
              detectedPitch={detectedPitch}
              micError={micError}
            />

            {/* Audio initialization notice */}
            {!playerReady && parsedScore && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                Initializing audio... Click anywhere on the page if playback doesn&apos;t start.
              </div>
            )}

            {/* Score renderer with practice colors */}
            <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
              <ScoreRenderer
                score={vexFlowScore}
                measuresPerSystem={4}
                highlightColor={PRACTICE_HIGHLIGHT_COLOR}
                noteColors={noteColors}
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

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: PRACTICE_HIGHLIGHT_COLOR }} />
                <span>Current Note</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: CORRECT_COLOR }} />
                <span>Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: INCORRECT_COLOR }} />
                <span>Incorrect</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Practice Summary Modal */}
      {showSummary && (
        <PracticeSummary
          accuracy={calculateAccuracy()}
          notesCorrect={notesCorrect}
          notesPlayed={notesPlayed}
          durationSeconds={sessionDuration}
          onPracticeAgain={handlePracticeAgain}
          scoreId={scoreId}
        />
      )}
    </div>
  )
}
