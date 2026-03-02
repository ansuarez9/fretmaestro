'use client'

import React, { useCallback } from 'react'
import { Play, Square, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { usePracticeModeStore } from '@/lib/store/usePracticeModeStore'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'
import { midiToNoteName } from '@/lib/utils'
import type { ScorePlayer } from '@/lib/audio/ScorePlayer'

interface PracticeControlsProps {
  scorePlayer: ScorePlayer | null
  disabled?: boolean
  onStartPractice: () => void
  onStopPractice: () => void
  detectedPitch: { midi: number | null; confidence: number; frequency: number | null } | null
  micError?: string | null
}

export function PracticeControls({
  scorePlayer,
  disabled = false,
  onStartPractice,
  onStopPractice,
  detectedPitch,
  micError,
}: PracticeControlsProps) {
  const {
    isPracticing,
    notesCorrect,
    notesPlayed,
    micPermissionGranted,
  } = usePracticeModeStore()

  const {
    tempo,
    setTempo,
    volume,
    setVolume,
  } = usePlaybackStore()

  const accuracy = notesPlayed > 0 ? Math.round((notesCorrect / notesPlayed) * 100) : 0

  // Tempo change
  const handleTempoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!scorePlayer) return
      const newTempo = parseInt(e.target.value, 10)
      scorePlayer.setTempo(newTempo)
      setTempo(newTempo)
    },
    [scorePlayer, setTempo]
  )

  // Volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!scorePlayer) return
      const newVolume = parseFloat(e.target.value)
      scorePlayer.setVolume(newVolume)
      setVolume(newVolume)
    },
    [scorePlayer, setVolume]
  )

  // Mic status
  const micStatus = micError
    ? 'error'
    : micPermissionGranted
      ? 'active'
      : 'inactive'

  const micStatusColor = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    error: 'bg-red-500',
  }[micStatus]

  const detectedNoteName = detectedPitch?.midi != null
    ? midiToNoteName(detectedPitch.midi)
    : '--'

  const confidencePercent = detectedPitch
    ? Math.round(detectedPitch.confidence * 100)
    : 0

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Top row: Mic status + Start/Stop + Live pitch */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Mic status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${micStatusColor}`} />
          <span className="text-sm text-gray-600">
            {micError
              ? 'Mic error'
              : micPermissionGranted
                ? 'Mic active'
                : 'Mic inactive'}
          </span>
          {micPermissionGranted ? (
            <Mic className="w-4 h-4 text-green-600" />
          ) : (
            <MicOff className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Start/Stop Practice */}
        <button
          onClick={isPracticing ? onStopPractice : onStartPractice}
          disabled={disabled}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
            isPracticing
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isPracticing ? (
            <>
              <Square className="w-5 h-5" />
              Stop Practice
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Practice
            </>
          )}
        </button>

        {/* Live pitch display */}
        <div className="flex items-center gap-3 min-w-[160px]">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 font-mono">
              {detectedNoteName}
            </div>
            <div className="text-xs text-gray-500">Detected</div>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  confidencePercent > 70
                    ? 'bg-green-500'
                    : confidencePercent > 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {confidencePercent}% confidence
            </div>
          </div>
        </div>
      </div>

      {/* Mic error message */}
      {micError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {micError}
        </div>
      )}

      {/* Accuracy stats */}
      {isPracticing && (
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{accuracy}%</div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-900">
              {notesCorrect} / {notesPlayed}
            </div>
            <div className="text-xs text-gray-500">Correct / Total</div>
          </div>
        </div>
      )}

      {/* Tempo + Volume controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Tempo */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Tempo:</span>
          <input
            type="range"
            value={tempo}
            min={40}
            max={200}
            step={1}
            onChange={handleTempoChange}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            disabled={disabled || isPracticing}
          />
          <span className="text-sm text-gray-900 font-medium w-16">{tempo} BPM</span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-600" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-600" />
          )}
          <input
            type="range"
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
