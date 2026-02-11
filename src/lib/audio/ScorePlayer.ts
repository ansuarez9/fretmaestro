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
  private metronomeSynth: Tone.MembraneSynth | null = null
  private transport: typeof Tone.Transport
  private isInitialized = false
  private maxPlayDuration = 30 // seconds for free tier
  private metronomeEnabled = false
  private countInEnabled = false
  private countInBeats = 4
  private countInTempo = 120

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
   * Create a metronome synth (percussive click)
   */
  createMetronome() {
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose()
    }

    this.metronomeSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.05,
      },
    }).toDestination()

    this.metronomeSynth.volume.value = -6

    return this.metronomeSynth
  }

  /**
   * Schedule metronome clicks at each beat
   */
  scheduleMetronome(duration: number, tempo: number, beats: number, beatType: number) {
    if (!this.metronomeSynth) return

    const beatDuration = 60 / tempo
    const effectiveDuration = this.freeTierLimit
      ? Math.min(duration, this.maxPlayDuration)
      : duration

    let time = 0
    let beatCount = 0

    while (time < effectiveDuration) {
      const isDownbeat = beatCount % beats === 0
      const clickTime = time
      const pitch = isDownbeat ? 'C5' : 'C4'
      const velocity = isDownbeat ? 0.8 : 0.5

      this.transport.schedule(() => {
        if (this.metronomeEnabled && this.metronomeSynth) {
          this.metronomeSynth.triggerAttackRelease(pitch, '32n', Tone.now(), velocity)
        }
      }, clickTime)

      time += beatDuration
      beatCount++
    }
  }

  /**
   * Toggle metronome on/off
   */
  setMetronomeEnabled(enabled: boolean) {
    this.metronomeEnabled = enabled
  }

  /**
   * Set metronome volume
   */
  setMetronomeVolume(volume: number) {
    if (this.metronomeSynth) {
      this.metronomeSynth.volume.value = Tone.gainToDb(volume)
    }
  }

  /**
   * Configure count-in
   */
  setCountInEnabled(enabled: boolean, beats?: number, tempo?: number) {
    this.countInEnabled = enabled
    if (beats !== undefined) this.countInBeats = beats
    if (tempo !== undefined) this.countInTempo = tempo
  }

  /**
   * Get count-in duration in seconds
   */
  getCountInDuration(): number {
    if (!this.countInEnabled) return 0
    return this.countInBeats * (60 / this.countInTempo)
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
   * Start playback (with optional count-in)
   */
  play() {
    if (this.countInEnabled && this.transport.seconds === 0) {
      const beatDuration = 60 / this.countInTempo
      const countInDuration = this.countInBeats * beatDuration

      // Play count-in clicks directly (not via Transport)
      for (let i = 0; i < this.countInBeats; i++) {
        const time = Tone.now() + i * beatDuration
        const isDownbeat = i === 0
        const pitch = isDownbeat ? 'C5' : 'C4'
        const velocity = isDownbeat ? 0.8 : 0.5

        if (this.metronomeSynth) {
          this.metronomeSynth.triggerAttackRelease(pitch, '32n', time, velocity)
        }
      }

      // Start transport after count-in finishes
      this.transport.start(Tone.now() + countInDuration)
    } else {
      this.transport.start(Tone.now())
    }
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
      this.synth.releaseAll()
    }
  }

  /**
   * Configure transport looping by measure time range
   */
  setLoop(enabled: boolean, startSeconds: number, endSeconds: number) {
    this.transport.loop = enabled
    if (enabled) {
      const effectiveEnd = this.freeTierLimit
        ? Math.min(endSeconds, this.maxPlayDuration)
        : endSeconds
      this.transport.loopStart = startSeconds
      this.transport.loopEnd = effectiveEnd
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
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose()
    }
  }
}
