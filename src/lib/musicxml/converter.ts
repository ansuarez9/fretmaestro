/**
 * MusicXML to VexFlow converter
 * Converts ParsedScore format to VexFlow notation format
 */

import type { ParsedScore, ParsedNote, ParsedMeasure } from './parser'

// VexFlow format interfaces
export interface VexFlowScore {
  title?: string
  composer?: string
  measures: VexFlowMeasure[]
  tempo: number
  timeSignature: string
  keySignature: string
}

export interface VexFlowMeasure {
  staveNotes: StaveNoteData[]
  timeSignature?: string
  keySignature?: string
  clef?: string
  measureNumber: number
  beats?: number
  beatType?: number
}

export interface StaveNoteData {
  keys: string[]           // VexFlow format: ["c/4", "e/4", "g/4"]
  duration: string         // VexFlow format: "q", "h", "w", "8", "16"
  dots: number
  accidentals?: AccidentalData[]
  isRest: boolean
  originalNoteIndex: number // Index for highlighting during playback
}

export interface AccidentalData {
  index: number            // Which key in the chord
  type: string             // "#", "b", "n"
}

// Duration mapping: beats -> VexFlow duration string
// Based on 4/4 time where quarter note = 1 beat
const DURATION_MAP: Record<number, { duration: string; dots: number }> = {
  4:     { duration: 'w', dots: 0 },     // whole note
  3:     { duration: 'h', dots: 1 },     // dotted half
  2:     { duration: 'h', dots: 0 },     // half note
  1.5:   { duration: 'q', dots: 1 },     // dotted quarter
  1:     { duration: 'q', dots: 0 },     // quarter note
  0.75:  { duration: '8', dots: 1 },     // dotted eighth
  0.5:   { duration: '8', dots: 0 },     // eighth note
  0.375: { duration: '16', dots: 1 },    // dotted sixteenth
  0.25:  { duration: '16', dots: 0 },    // sixteenth note
  0.125: { duration: '32', dots: 0 },    // thirty-second note
}

/**
 * Convert beat duration to VexFlow duration string
 */
function beatsToVexFlowDuration(beats: number): { duration: string; dots: number } {
  // First try exact match
  const exactMatch = DURATION_MAP[beats]
  if (exactMatch) {
    return exactMatch
  }

  // Find closest match
  const durations = Object.keys(DURATION_MAP).map(Number).sort((a, b) => b - a)

  for (const dur of durations) {
    if (beats >= dur - 0.01) {
      return DURATION_MAP[dur]
    }
  }

  // Fallback to quarter note
  return { duration: 'q', dots: 0 }
}

/**
 * Convert pitch string to VexFlow key format
 * Input: "C4", "G#5", "Bb3"
 * Output: { key: "c/4", accidental: "#" | "b" | undefined }
 */
function pitchToVexFlowKey(pitch: string): { key: string; accidental?: string } {
  const match = pitch.match(/^([A-G])([#b]?)(\d+)$/)
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`)
  }

  const [, note, accidental, octave] = match
  const key = `${note.toLowerCase()}/${octave}`

  return {
    key,
    accidental: accidental || undefined,
  }
}

/**
 * Convert a ParsedNote to VexFlow StaveNoteData
 */
function convertNote(note: ParsedNote, noteIndex: number): StaveNoteData {
  const { key, accidental } = pitchToVexFlowKey(note.pitch)
  const { duration, dots } = beatsToVexFlowDuration(note.duration)

  const staveNote: StaveNoteData = {
    keys: [key],
    duration,
    dots,
    isRest: false,
    originalNoteIndex: noteIndex,
  }

  if (accidental) {
    staveNote.accidentals = [{ index: 0, type: accidental }]
  }

  return staveNote
}

/**
 * Convert a ParsedMeasure to VexFlowMeasure
 */
function convertMeasure(
  measure: ParsedMeasure,
  measureIndex: number,
  startNoteIndex: number,
  options: ConversionOptions
): { vexMeasure: VexFlowMeasure; noteCount: number } {
  const staveNotes: StaveNoteData[] = []
  let noteIndex = startNoteIndex

  measure.notes.forEach((note) => {
    staveNotes.push(convertNote(note, noteIndex))
    noteIndex++
  })

  // If measure has no notes, add a whole rest
  if (staveNotes.length === 0) {
    staveNotes.push({
      keys: ['b/4'],
      duration: 'wr',
      dots: 0,
      isRest: true,
      originalNoteIndex: -1,
    })
  }

  const vexMeasure: VexFlowMeasure = {
    staveNotes,
    measureNumber: measure.number,
  }

  // Add time signature, key signature, and clef only on first measure
  if (measureIndex === 0) {
    vexMeasure.clef = options.clef
    vexMeasure.timeSignature = options.timeSignature
    if (options.keySignature !== 'C') {
      vexMeasure.keySignature = options.keySignature
    }

    const tsParts = (options.timeSignature || '4/4').split('/')
    vexMeasure.beats = parseInt(tsParts[0] || '4', 10)
    vexMeasure.beatType = parseInt(tsParts[1] || '4', 10)
  }

  return {
    vexMeasure,
    noteCount: measure.notes.length,
  }
}

export interface ConversionOptions {
  timeSignature?: string
  keySignature?: string
  clef?: string
}

/**
 * Main conversion function
 * Converts ParsedScore to VexFlowScore
 */
export function convertParsedScoreToVexFlow(
  parsedScore: ParsedScore,
  options?: ConversionOptions
): VexFlowScore {
  const timeSignature = options?.timeSignature || '4/4'
  const keySignature = options?.keySignature || 'C'
  const clef = options?.clef || 'treble'

  const conversionOptions: ConversionOptions = {
    timeSignature,
    keySignature,
    clef,
  }

  const measures: VexFlowMeasure[] = []
  let globalNoteIndex = 0

  parsedScore.measures.forEach((measure, measureIndex) => {
    const { vexMeasure, noteCount } = convertMeasure(
      measure,
      measureIndex,
      globalNoteIndex,
      conversionOptions
    )
    measures.push(vexMeasure)
    globalNoteIndex += noteCount
  })

  return {
    title: parsedScore.title,
    composer: parsedScore.composer,
    measures,
    tempo: parsedScore.tempo,
    timeSignature,
    keySignature,
  }
}

/**
 * Get the total number of notes in a VexFlowScore
 */
export function getTotalNoteCount(score: VexFlowScore): number {
  return score.measures.reduce((total, measure) => {
    return total + measure.staveNotes.filter(n => !n.isRest).length
  }, 0)
}

/**
 * Find which note index should be highlighted based on current playback time
 */
export function findNoteIndexAtTime(
  parsedScore: ParsedScore,
  currentTimeInSeconds: number
): number | null {
  const beatDuration = 60 / parsedScore.tempo
  const currentBeat = currentTimeInSeconds / beatDuration

  let noteIndex = 0

  for (const measure of parsedScore.measures) {
    for (const note of measure.notes) {
      const noteEndBeat = note.startTime + note.duration

      if (currentBeat >= note.startTime && currentBeat < noteEndBeat) {
        return noteIndex
      }
      noteIndex++
    }
  }

  return null
}

export interface MeasureTiming {
  measureNumber: number
  startTime: number // in seconds
  endTime: number   // in seconds
}

/**
 * Calculate the start and end time (in seconds) for each measure
 */
export function calculateMeasureTimings(parsedScore: ParsedScore): MeasureTiming[] {
  const beatDuration = 60 / parsedScore.tempo
  const timings: MeasureTiming[] = []

  for (const measure of parsedScore.measures) {
    if (measure.notes.length > 0) {
      const firstNote = measure.notes[0]
      const lastNote = measure.notes[measure.notes.length - 1]
      const startBeat = firstNote.startTime
      const endBeat = lastNote.startTime + lastNote.duration

      timings.push({
        measureNumber: measure.number,
        startTime: startBeat * beatDuration,
        endTime: endBeat * beatDuration,
      })
    } else {
      // Empty measure: estimate from time signature
      const beatsPerMeasure = parsedScore.beats || 4
      const prevEnd = timings.length > 0 ? timings[timings.length - 1].endTime : 0
      timings.push({
        measureNumber: measure.number,
        startTime: prevEnd,
        endTime: prevEnd + beatsPerMeasure * beatDuration,
      })
    }
  }

  return timings
}
