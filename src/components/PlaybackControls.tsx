'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Square, SkipBack, Volume2, VolumeX } from 'lucide-react'
import { usePlaybackStore } from '@/lib/store/usePlaybackStore'
import type { ScorePlayer } from '@/lib/audio/ScorePlayer'
import { formatTime } from '@/lib/utils'

const FREE_TIER_LIMIT = 30 // seconds

interface PlaybackControlsProps {
  scorePlayer: ScorePlayer | null
  disabled?: boolean
  isFreeTier?: boolean
}

export function PlaybackControls({ scorePlayer, disabled = false, isFreeTier = true }: PlaybackControlsProps) {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    tempo,
    setTempo,
    volume,
    setVolume,
    setHighlightedNoteIndex,
  } = usePlaybackStore()

  const [isMuted, setIsMuted] = useState(false)
  const previousVolumeRef = useRef(volume)
  const wasPlayingRef = useRef(false)
  const sliderRef = useRef<HTMLInputElement>(null)

  // Calculate effective max duration based on subscription tier
  const effectiveMaxDuration = isFreeTier ? Math.min(duration, FREE_TIER_LIMIT) : duration
  const progressPercent = effectiveMaxDuration > 0 ? (currentTime / effectiveMaxDuration) * 100 : 0

  // Stop playback when reaching free tier limit
  useEffect(() => {
    if (isFreeTier && isPlaying && currentTime >= FREE_TIER_LIMIT) {
      if (scorePlayer) {
        scorePlayer.pause()
        scorePlayer.setPosition(FREE_TIER_LIMIT)
      }
      setIsPlaying(false)
      setCurrentTime(FREE_TIER_LIMIT)
    }
  }, [isFreeTier, isPlaying, currentTime, scorePlayer, setIsPlaying, setCurrentTime])

  // Play/Pause toggle
  const handlePlayPause = useCallback(async () => {
    if (!scorePlayer || disabled) return

    // Don't allow play if at the free tier limit
    if (isFreeTier && currentTime >= FREE_TIER_LIMIT) {
      return
    }

    if (isPlaying) {
      scorePlayer.pause()
      setIsPlaying(false)
    } else {
      scorePlayer.play()
      setIsPlaying(true)
    }
  }, [scorePlayer, isPlaying, setIsPlaying, disabled, isFreeTier, currentTime])

  // Stop playback
  const handleStop = useCallback(() => {
    if (!scorePlayer) return

    scorePlayer.stop()
    setIsPlaying(false)
    setCurrentTime(0)
    setHighlightedNoteIndex(null)
  }, [scorePlayer, setIsPlaying, setCurrentTime, setHighlightedNoteIndex])

  // Restart from beginning
  const handleRestart = useCallback(() => {
    if (!scorePlayer) return

    const wasPlaying = isPlaying
    scorePlayer.stop()
    scorePlayer.setPosition(0)
    setCurrentTime(0)
    setHighlightedNoteIndex(null)

    if (wasPlaying) {
      setTimeout(() => {
        scorePlayer.play()
        setIsPlaying(true)
      }, 100)
    }
  }, [scorePlayer, isPlaying, setCurrentTime, setHighlightedNoteIndex, setIsPlaying])

  // Time slider change
  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!scorePlayer) return

      let newTime = parseFloat(e.target.value)

      // Clamp to free tier limit
      if (isFreeTier && newTime > FREE_TIER_LIMIT) {
        newTime = FREE_TIER_LIMIT
      }

      scorePlayer.setPosition(newTime)
      setCurrentTime(newTime)
    },
    [scorePlayer, setCurrentTime, isFreeTier]
  )

  // Handle slider drag
  const handleSliderMouseDown = useCallback(() => {
    wasPlayingRef.current = isPlaying
    if (isPlaying && scorePlayer) {
      scorePlayer.pause()
      setIsPlaying(false)
    }
  }, [isPlaying, scorePlayer, setIsPlaying])

  const handleSliderMouseUp = useCallback(() => {
    // Don't resume if at free tier limit
    if (isFreeTier && currentTime >= FREE_TIER_LIMIT) {
      return
    }
    if (wasPlayingRef.current && scorePlayer) {
      scorePlayer.play()
      setIsPlaying(true)
    }
  }, [scorePlayer, setIsPlaying, isFreeTier, currentTime])

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
      if (newVolume > 0) {
        setIsMuted(false)
      }
    },
    [scorePlayer, setVolume]
  )

  // Mute toggle
  const handleMuteToggle = useCallback(() => {
    if (!scorePlayer) return

    if (isMuted) {
      scorePlayer.setVolume(previousVolumeRef.current)
      setVolume(previousVolumeRef.current)
      setIsMuted(false)
    } else {
      previousVolumeRef.current = volume
      scorePlayer.setVolume(0)
      setVolume(0)
      setIsMuted(true)
    }
  }, [scorePlayer, isMuted, volume, setVolume])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'Escape':
          handleStop()
          break
        case 'Home':
          handleRestart()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePlayPause, handleStop, handleRestart])

  const isAtLimit = isFreeTier && currentTime >= FREE_TIER_LIMIT

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Main controls row */}
      <div className="flex items-center justify-center gap-4">
        {/* Restart button */}
        <button
          onClick={handleRestart}
          className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
          aria-label="Restart"
          disabled={!scorePlayer || disabled}
        >
          <SkipBack className="w-5 h-5 text-gray-700" />
        </button>

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="p-4 bg-indigo-600 rounded-full hover:bg-indigo-700 transition disabled:opacity-50 disabled:bg-gray-400"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!scorePlayer || disabled || isAtLimit}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Stop button */}
        <button
          onClick={handleStop}
          className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
          aria-label="Stop"
          disabled={!scorePlayer || disabled}
        >
          <Square className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Time slider */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 w-12 text-right font-mono">
          {formatTime(currentTime)}
        </span>

        <div className="flex-1 relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-100"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <input
            ref={sliderRef}
            type="range"
            value={currentTime}
            min={0}
            max={effectiveMaxDuration || 100}
            step={0.1}
            onChange={handleTimeChange}
            onMouseDown={handleSliderMouseDown}
            onMouseUp={handleSliderMouseUp}
            onTouchStart={handleSliderMouseDown}
            onTouchEnd={handleSliderMouseUp}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={!scorePlayer || disabled}
          />
        </div>

        <span className="text-sm text-gray-600 w-12 font-mono">
          {formatTime(effectiveMaxDuration)}
        </span>
      </div>

      {/* Free tier limit indicator */}
      {isFreeTier && duration > FREE_TIER_LIMIT && (
        <div className="text-xs text-amber-600 text-center">
          Free tier: {FREE_TIER_LIMIT} second preview
        </div>
      )}

      {/* Secondary controls row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Tempo control */}
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
            disabled={!scorePlayer || disabled}
          />
          <span className="text-sm text-gray-900 font-medium w-16">{tempo} BPM</span>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            disabled={!scorePlayer || disabled}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-gray-600" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <input
            type="range"
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            disabled={!scorePlayer || disabled}
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-400 text-center">
        Space: Play/Pause | Esc: Stop | Home: Restart
      </div>
    </div>
  )
}
