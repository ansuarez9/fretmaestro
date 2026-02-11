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
  clef?: string         // "treble", "bass", "alto", "tenor"
  keySignature?: string // "C", "G", "F", "Bb", "D", etc.
  timeSignature?: string // "4/4", "3/4", "6/8", etc.
}

export interface ParsedScore {
  title?: string
  composer?: string
  measures: ParsedMeasure[]
  totalDuration: number // in beats
  tempo: number // BPM
  clef: string          // default: 'treble'
  keySignature: string  // default: 'C'
  timeSignature: string // default: '4/4'
  beats: number         // default: 4
  beatType: number      // default: 4
}

export class MusicXMLParseError extends Error {
  code: string
  userMessage: string

  constructor(code: string, userMessage: string, detail?: string) {
    super(detail || userMessage)
    this.name = 'MusicXMLParseError'
    this.code = code
    this.userMessage = userMessage
  }
}

/**
 * Map MusicXML clef sign/line to VexFlow clef name
 */
function mapClefSignToName(sign: string, line: string): string {
  const key = `${sign}/${line}`
  const map: Record<string, string> = {
    'G/2': 'treble',
    'F/4': 'bass',
    'C/3': 'alto',
    'C/4': 'tenor',
  }
  return map[key] || 'treble'
}

/**
 * Map MusicXML <key><fifths> integer to key signature name
 */
function fifthsToKeySignature(fifths: number): string {
  const map: Record<string, string> = {
    '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F',
    '0': 'C',
    '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#',
  }
  return map[String(fifths)] || 'C'
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

    // Validate XML structure
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new MusicXMLParseError(
        'INVALID_XML',
        'The file contains invalid XML. Please check that the file is a valid MusicXML document.'
      )
    }

    if (xmlDoc.querySelector('score-timewise')) {
      throw new MusicXMLParseError(
        'TIMEWISE_NOT_SUPPORTED',
        'Timewise MusicXML format is not supported. Please export your score as partwise MusicXML.'
      )
    }

    if (!xmlDoc.querySelector('score-partwise')) {
      throw new MusicXMLParseError(
        'NOT_MUSICXML',
        'This does not appear to be a valid MusicXML file. Expected a <score-partwise> root element.'
      )
    }

    const score: ParsedScore = {
      measures: [],
      totalDuration: 0,
      tempo: 120,
      clef: 'treble',
      keySignature: 'C',
      timeSignature: '4/4',
      beats: 4,
      beatType: 4,
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
    if (measures.length === 0) {
      throw new MusicXMLParseError(
        'NO_MEASURES',
        'The MusicXML file contains no measures. The file may be empty or malformed.'
      )
    }
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

      // Extract clef
      const clefElement = measure.querySelector('attributes > clef')
      if (clefElement) {
        const sign = clefElement.querySelector('sign')?.textContent || 'G'
        const line = clefElement.querySelector('line')?.textContent || '2'
        const clefName = mapClefSignToName(sign, line)
        parsedMeasure.clef = clefName
        if (measureIndex === 0) {
          score.clef = clefName
        }
      }

      // Extract key signature
      const keyElement = measure.querySelector('attributes > key')
      if (keyElement) {
        const fifths = parseInt(keyElement.querySelector('fifths')?.textContent || '0', 10)
        const keySig = fifthsToKeySignature(fifths)
        parsedMeasure.keySignature = keySig
        if (measureIndex === 0) {
          score.keySignature = keySig
        }
      }

      // Extract time signature
      const timeElement = measure.querySelector('attributes > time')
      if (timeElement) {
        const beats = timeElement.querySelector('beats')?.textContent || '4'
        const beatType = timeElement.querySelector('beat-type')?.textContent || '4'
        const timeSig = `${beats}/${beatType}`
        parsedMeasure.timeSignature = timeSig
        if (measureIndex === 0) {
          score.timeSignature = timeSig
          score.beats = parseInt(beats, 10)
          score.beatType = parseInt(beatType, 10)
        }
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

        if (!pitch || !duration) {
          console.warn(`Measure ${measureIndex + 1}: Skipping note missing ${!pitch ? 'pitch' : 'duration'} element`)
          return
        }

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
    if (err instanceof MusicXMLParseError) {
      throw err
    }
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
