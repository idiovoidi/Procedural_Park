export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private isRecording = false
  private canvas: HTMLCanvasElement
  private stream: MediaStream | null = null
  private recordingStartTime = 0
  private maxDuration = 30000 // 30 seconds max

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  public async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      console.warn('Already recording')
      return false
    }

    try {
      // Get canvas stream
      this.stream = this.canvas.captureStream(30) // 30 FPS

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        console.error('WebM video recording not supported')
        return false
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      })

      this.recordedChunks = []

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        this.handleRecordingComplete()
      }

      // Start recording
      this.mediaRecorder.start()
      this.isRecording = true
      this.recordingStartTime = Date.now()

      // Auto-stop after max duration
      setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording()
        }
      }, this.maxDuration)

      console.log('Recording started')
      return true
    } catch (error) {
      console.error('Failed to start recording:', error)
      return false
    }
  }

  public stopRecording(): boolean {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('Not currently recording')
      return false
    }

    try {
      this.mediaRecorder.stop()
      this.isRecording = false

      // Stop all tracks in the stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop())
      }

      console.log('Recording stopped')
      return true
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return false
    }
  }

  private handleRecordingComplete() {
    if (this.recordedChunks.length === 0) {
      console.error('No recorded data available')
      return
    }

    // Create blob from recorded chunks
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
    const duration = Date.now() - this.recordingStartTime

    console.log(
      `Recording complete: ${(duration / 1000).toFixed(1)}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB`
    )

    // Trigger download
    this.downloadVideo(blob)
  }

  private downloadVideo(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `wildlife-park-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  public getRecordingDuration(): number {
    if (!this.isRecording) return 0
    return Date.now() - this.recordingStartTime
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  public getMaxDuration(): number {
    return this.maxDuration
  }

  public setMaxDuration(durationMs: number) {
    this.maxDuration = Math.min(durationMs, 60000) // Max 60 seconds
  }
}
