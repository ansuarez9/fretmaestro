/**
 * Basic MusicXML parser
 * Extracts notes and timing information from MusicXML content
 */

export interface ParsedNote {
  pitch: string // e.g., "C4", "G#5"
  midi: number // MIDI note number
  duration: number // in beats
  startTime: number // in beats
  velocity: number // 0-1
  tuplet?: boolean
}

export interface ParsedMeasure {
  number: number
  notes: ParsedNote[]
  divisions: number
  tempo?: number
}

export interface ParsedScore {
  title?: string
  composer?: string
  measures: ParsedMeasure[]
  totalDuration: number // in beats
  tempo: number // BPM
}

/**
 * Parse MusicXML string and extract note data
 */
export async function parseMusicXML(xmlString: string): Promise<ParsedScore> {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML')
    }

    const score: ParsedScore = {
      measures: [],
      totalDuration: 0,
      tempo: 120,
    }

    // Extract title and composer
    const title = xmlDoc.querySelector('score-partwise > movement-title')?.textContent
    const composer = xmlDoc.querySelector('score-partwise > identification > composer')?.textContent
    if (title) score.title = title
    if (composer) score.composer = composer

    // Extract attributes (tempo, time signature, etc.)
    const attributes = xmlDoc.querySelector('attributes')
    if (attributes) {
      const tempoElement = attributes.querySelector('tempo')
      if (tempoElement) {
        score.tempo = parseInt(tempoElement.textContent || '120', 10)
      }
    }

    // Extract measures and notes
    const measures = xmlDoc.querySelectorAll('measure')
    let currentTime = 0
    let divisions = 4 // default

    measures.forEach((measure, measureIndex) => {
      const parsedMeasure: ParsedMeasure = {
        number: measureIndex + 1,
        notes: [],
        divisions,
        tempo: score.tempo,
      }

      // Get divisions for this measure
      const divisionsElement = measure.querySelector('attributes > divisions')
      if (divisionsElement) {
        divisions = parseInt(divisionsElement.textContent || '4', 10)
        parsedMeasure.divisions = divisions
      }

      // Parse notes
      const notes = measure.querySelectorAll('note')
      notes.forEach((noteElement) => {
        const pitch = noteElement.querySelector('pitch')
        const duration = noteElement.querySelector('duration')
        const rest = noteElement.querySelector('rest')

        if (rest) {
          // Skip rests
          if (duration) {
            currentTime += parseInt(duration.textContent || '0', 10)
          }
          return
        }

        if (!pitch || !duration) return

        const step = pitch.querySelector('step')?.textContent
        const octave = pitch.querySelector('octave')?.textContent
        const alter = pitch.querySelector('alter')?.textContent

        if (!step || octave === undefined) return

        const dur = parseInt(duration.textContent || '0', 10)
        const noteName = buildNoteName(step, alter)
        const midiNumber = noteNameToMidi(noteName, parseInt(octave, 10))

        parsedMeasure.notes.push({
          pitch: noteName + octave,
          midi: midiNumber,
          duration: dur / divisions,
          startTime: currentTime / divisions,
          velocity: 0.8,
        })

        currentTime += dur
      })

      score.measures.push(parsedMeasure)
    })

    // Calculate total duration
    if (score.measures.length > 0) {
      const lastMeasure = score.measures[score.measures.length - 1]
      if (lastMeasure.notes.length > 0) {
        const lastNote = lastMeasure.notes[lastMeasure.notes.length - 1]
        score.totalDuration = lastNote.startTime + lastNote.duration
      }
    }

    return score
  } catch (err) {
    throw new Error(`Failed to parse MusicXML: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Build note name from step and alter
 */
function buildNoteName(step: string, alter?: string): string {
  let name = step
  if (alter === '1') name += '#'
  else if (alter === '-1') name += 'b'
  return name
}

/**
 * Convert note name and octave to MIDI number
 */
function noteNameToMidi(step: string, octave: number): number {
  const notes: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  }

  let baseNote = notes[step] ?? 0

  // Handle sharps and flats in MusicXML (via alter)
  // Note: alter is handled separately in buildNoteName

  return (octave + 1) * 12 + baseNote
}

/**
 * Convert parsed score to playable notes format
 */
export function scoreToPlayableNotes(
  score: ParsedScore
): Array<{
  pitch: number
  duration: number
  startTime: number
  velocity: number
}> {
  const playableNotes: Array<{
    pitch: number
    duration: number
    startTime: number
    velocity: number
  }> = []

  // Convert beat time to seconds using tempo
  const beatDuration = 60 / score.tempo

  score.measures.forEach((measure) => {
    measure.notes.forEach((note) => {
      playableNotes.push({
        pitch: note.midi,
        duration: note.duration * beatDuration,
        startTime: note.startTime * beatDuration,
        velocity: note.velocity,
      })
    })
  })

  return playableNotes.sort((a, b) => a.startTime - b.startTime)
}
