import { PitchDetector } from 'pitchy'
import { frequencyToMidi, isPitchMatch } from '@/lib/utils'

export interface PitchDetectionResult {
  frequency: number | null
  midi: number | null
  confidence: number
  timestamp: number
}

export class PitchDetectionEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStreamAudioSourceNode: MediaStreamAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null
  private detector: PitchDetector | null = null
  private isRunning = false
  private rafId: number | null = null
  private sampleRate = 44100

  /**
   * Initialize pitch detection with microphone access
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.sampleRate = this.audioContext.sampleRate

      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 4096
      this.analyser.smoothingTimeConstant = 0.8

      this.mediaStreamAudioSourceNode = this.audioContext.createMediaStreamSource(stream)
      this.mediaStreamAudioSourceNode.connect(this.analyser)

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.detector = new PitchDetector(this.sampleRate, 80, 400)
    } catch (err) {
      throw new Error(
        `Failed to initialize pitch detection: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Start listening for pitch
   */
  start(onPitch: (result: PitchDetectionResult) => void): void {
    if (!this.audioContext || !this.analyser || !this.dataArray || !this.detector) {
      throw new Error('Pitch detection not initialized. Call initialize() first.')
    }

    this.isRunning = true

    const detectPitch = () => {
      if (!this.isRunning) return

      // Resume audio context if needed
      if (this.audioContext!.state === 'suspended') {
        this.audioContext!.resume()
      }

      // Get frequency data
      this.analyser!.getByteFrequencyData(this.dataArray!)

      // Convert byte data to float
      const float32Data = new Float32Array(this.dataArray!.length)
      for (let i = 0; i < this.dataArray!.length; i++) {
        float32Data[i] = this.dataArray![i] / 255
      }

      // Detect pitch
      const [frequency, clarity] = this.detector!.findPitch(float32Data)

      const result: PitchDetectionResult = {
        frequency: frequency > 0 ? frequency : null,
        midi: frequency > 0 ? frequencyToMidi(frequency) : null,
        confidence: clarity,
        timestamp: Date.now(),
      }

      onPitch(result)

      this.rafId = requestAnimationFrame(detectPitch)
    }

    detectPitch()
  }

  /**
   * Stop listening for pitch
   */
  stop(): void {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Check if pitch matches expected MIDI note
   */
  isPitchCorrect(detectedFrequency: number | null, expectedMidi: number): boolean {
    if (detectedFrequency === null) return false
    return isPitchMatch(expectedMidi, detectedFrequency, 50) // 50 cents tolerance
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop()

    if (this.mediaStreamAudioSourceNode) {
      this.mediaStreamAudioSourceNode.disconnect()
    }

    if (this.analyser) {
      this.analyser.disconnect()
    }

    // Stop microphone stream
    if (this.mediaStreamAudioSourceNode?.mediaStream) {
      this.mediaStreamAudioSourceNode.mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    // Close audio context after a delay to avoid errors
    if (this.audioContext && this.audioContext.state !== 'closed') {
      setTimeout(() => {
        this.audioContext?.close().catch((err) => {
          console.error('Error closing audio context:', err)
        })
      }, 100)
    }

    this.audioContext = null
    this.analyser = null
    this.mediaStreamAudioSourceNode = null
    this.detector = null
  }
}
