import * as Tone from 'tone'

export interface Note {
  pitch: number // MIDI number
  duration: number // in seconds
  startTime: number // in seconds
  velocity: number // 0-1
}

export interface ScoreAudio {
  notes: Note[]
  duration: number
  tempo: number
}

export class ScorePlayer {
  private synth: Tone.PolySynth | null = null
  private transport: typeof Tone.Transport
  private isInitialized = false
  private maxPlayDuration = 30 // seconds for free tier

  constructor(private freeTierLimit = true) {
    this.transport = Tone.Transport
  }

  async initialize() {
    if (this.isInitialized) return

    await Tone.start()
    this.isInitialized = true
  }

  /**
   * Create a synth for playback
   */
  createSynth() {
    if (this.synth) {
      this.synth.dispose()
    }

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 0.1,
      },
    }).toDestination()

    return this.synth
  }

  /**
   * Schedule notes for playback with free tier gating
   */
  scheduleNotes(scoreAudio: ScoreAudio): Note[] {
    if (!this.synth) {
      throw new Error('Synth not initialized. Call createSynth() first.')
    }

    // Filter notes based on free tier limit
    const playableNotes = this.freeTierLimit
      ? scoreAudio.notes.filter((n) => n.startTime < this.maxPlayDuration)
      : scoreAudio.notes

    // Schedule each note
    playableNotes.forEach((note) => {
      const startTime = note.startTime
      const duration = note.duration

      this.transport.schedule(() => {
        if (this.synth) {
          this.synth.triggerAttackRelease(
            Tone.Midi(note.pitch).toFrequency(),
            duration,
            Tone.now()
          )
        }
      }, startTime)
    })

    return playableNotes
  }

  /**
   * Start playback
   */
  play() {
    this.transport.start(Tone.now())
  }

  /**
   * Pause playback
   */
  pause() {
    this.transport.pause()
  }

  /**
   * Stop playback and reset
   */
  stop() {
    this.transport.stop()
    this.transport.cancel()
    if (this.synth) {
      this.synth.triggerRelease()
    }
  }

  /**
   * Set playback position
   */
  setPosition(seconds: number) {
    this.transport.seconds = seconds
  }

  /**
   * Get current playback position
   */
  getPosition(): number {
    return this.transport.seconds
  }

  /**
   * Set tempo (BPM)
   */
  setTempo(bpm: number) {
    this.transport.bpm.value = bpm
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    if (this.synth) {
      this.synth.volume.value = Tone.gainToDb(volume)
    }
  }

  /**
   * Get is playing state
   */
  isPlaying(): boolean {
    return this.transport.state === 'started'
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.stop()
    if (this.synth) {
      this.synth.dispose()
    }
  }
}
