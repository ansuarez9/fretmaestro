import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert MIDI note number to note name
 */
export function midiToNoteName(midiNumber: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midiNumber / 12) - 1
  const note = notes[midiNumber % 12]
  return `${note}${octave}`
}

/**
 * Convert note name to MIDI number
 */
export function noteNameToMidi(noteName: string): number {
  const notes: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  }

  const match = noteName.match(/([A-G]#?|[A-G]b?)(\d+)/)
  if (!match) throw new Error(`Invalid note name: ${noteName}`)

  const [, note, octave] = match
  return (parseInt(octave) + 1) * 12 + (notes[note] ?? 0)
}

/**
 * Convert frequency (Hz) to MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69)
}

/**
 * Convert MIDI note number to frequency (Hz)
 */
export function midiToFrequency(midiNumber: number): number {
  return 440 * Math.pow(2, (midiNumber - 69) / 12)
}

/**
 * Check if detected frequency is within acceptable range of expected note
 * Tolerates ±50 cents (half a semitone)
 */
export function isPitchMatch(
  expectedMidi: number,
  detectedFrequency: number,
  toleranceCents: number = 50
): boolean {
  const detectedMidi = frequencyToMidi(detectedFrequency)
  const expectedFreq = midiToFrequency(expectedMidi)
  const detectedFreq = midiToFrequency(detectedMidi)

  // Calculate cents difference
  const centsDiff = 1200 * Math.log2(detectedFreq / expectedFreq)
  return Math.abs(centsDiff) <= toleranceCents
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
