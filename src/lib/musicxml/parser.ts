/**
 * MusicXML parser
 * Extracts notes and timing information from MusicXML content
 * Supports both uncompressed (.musicxml) and compressed (.mxl) formats
 */

import JSZip from 'jszip'

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
 * Check if content is a ZIP file (MXL format)
 */
function isZipFile(data: ArrayBuffer | string): boolean {
  if (typeof data === 'string') {
    // Check for ZIP magic number in string form
    return data.charCodeAt(0) === 0x50 && data.charCodeAt(1) === 0x4b
  }
  const view = new Uint8Array(data)
  // ZIP files start with PK (0x50 0x4b)
  return view[0] === 0x50 && view[1] === 0x4b
}

/**
 * Extract MusicXML content from a compressed MXL file
 */
async function extractMxl(data: ArrayBuffer | string): Promise<string> {
  const zip = await JSZip.loadAsync(data)

  // First, try to find the rootfile from META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml')
  if (containerFile) {
    const containerXml = await containerFile.async('string')
    const parser = new DOMParser()
    const containerDoc = parser.parseFromString(containerXml, 'text/xml')
    const rootfile = containerDoc.querySelector('rootfile')
    const fullPath = rootfile?.getAttribute('full-path')

    if (fullPath) {
      const musicXmlFile = zip.file(fullPath)
      if (musicXmlFile) {
        return musicXmlFile.async('string')
      }
    }
  }

  // Fallback: look for any .xml file that's not in META-INF
  const xmlFiles = Object.keys(zip.files).filter(
    (name) => name.endsWith('.xml') && !name.startsWith('META-INF')
  )

  if (xmlFiles.length > 0) {
    const musicXmlFile = zip.file(xmlFiles[0])
    if (musicXmlFile) {
      return musicXmlFile.async('string')
    }
  }

  throw new Error('No MusicXML file found in the compressed archive')
}

/**
 * Parse MusicXML content (handles both .musicxml and .mxl formats)
 * @param content - Either a string (XML content) or ArrayBuffer (for binary MXL files)
 */
export async function parseMusicXML(content: string | ArrayBuffer): Promise<ParsedScore> {
  try {
    let xmlString: string

    // Check if it's a compressed MXL file
    if (isZipFile(content)) {
      xmlString = await extractMxl(content)
    } else if (typeof content === 'string') {
      xmlString = content
    } else {
      // ArrayBuffer but not a ZIP - try to decode as UTF-8
      const decoder = new TextDecoder('utf-8')
      xmlString = decoder.decode(content)
    }

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML format')
    }

    const score: ParsedScore = {
      measures: [],
      totalDuration: 0,
      tempo: 120,
    }

    // Extract title and composer
    const title = xmlDoc.querySelector('score-partwise > movement-title')?.textContent
    const composer = xmlDoc.querySelector('score-partwise > identification > creator[type="composer"]')?.textContent
      || xmlDoc.querySelector('score-partwise > identification > composer')?.textContent
    if (title) score.title = title
    if (composer) score.composer = composer

    // Look for tempo in sound element or metronome
    const soundElement = xmlDoc.querySelector('sound[tempo]')
    if (soundElement) {
      const tempoAttr = soundElement.getAttribute('tempo')
      if (tempoAttr) {
        score.tempo = parseFloat(tempoAttr)
      }
    } else {
      // Try metronome marking
      const metronome = xmlDoc.querySelector('metronome')
      if (metronome) {
        const perMinute = metronome.querySelector('per-minute')?.textContent
        if (perMinute) {
          score.tempo = parseFloat(perMinute)
        }
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

      // Check for tempo changes in this measure
      const measureSound = measure.querySelector('sound[tempo]')
      if (measureSound) {
        const tempoAttr = measureSound.getAttribute('tempo')
        if (tempoAttr) {
          parsedMeasure.tempo = parseFloat(tempoAttr)
        }
      }

      // Parse notes
      const notes = measure.querySelectorAll('note')
      notes.forEach((noteElement) => {
        const pitch = noteElement.querySelector('pitch')
        const duration = noteElement.querySelector('duration')
        const rest = noteElement.querySelector('rest')
        const chord = noteElement.querySelector('chord')

        if (rest) {
          // Skip rests but advance time
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
        const midiNumber = noteNameToMidi(noteName, parseInt(octave, 10), alter)

        // For chord notes, don't advance currentTime
        const noteStartTime = chord ? currentTime - dur : currentTime

        parsedMeasure.notes.push({
          pitch: noteName + octave,
          midi: midiNumber,
          duration: dur / divisions,
          startTime: (chord ? noteStartTime : currentTime) / divisions,
          velocity: 0.8,
        })

        // Only advance time for non-chord notes
        if (!chord) {
          currentTime += dur
        }
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
function buildNoteName(step: string, alter?: string | null): string {
  let name = step
  if (alter === '1') name += '#'
  else if (alter === '-1') name += 'b'
  return name
}

/**
 * Convert note name and octave to MIDI number
 */
function noteNameToMidi(step: string, octave: number, alter?: string | null): number {
  const notes: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  }

  let baseNote = notes[step.charAt(0)] ?? 0

  // Handle accidentals
  if (alter === '1') baseNote += 1
  else if (alter === '-1') baseNote -= 1

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
