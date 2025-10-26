import * as THREE from 'three'
import { TAU, randomCentered } from './utils'

export interface AudioSettings {
  masterVolume: number
  sfxVolume: number
  ambientVolume: number
  musicVolume: number
  enabled: boolean
}

export type SoundEffect =
  | 'camera_shutter'
  | 'camera_focus'
  | 'ui_click'
  | 'ui_hover'
  | 'creature_chirp'
  | 'creature_growl'
  | 'creature_flutter'
  | 'creature_splash'
  | 'photo_score'
  | 'ride_move'

export type AmbientSound = 'forest_ambient' | 'wind_gentle' | 'water_flowing' | 'birds_distant'

export class AudioManager {
  private audioContext: AudioContext | null = null
  private listener: THREE.AudioListener
  private soundBuffers: Map<string, AudioBuffer> = new Map()
  private ambientSources: Map<string, THREE.Audio> = new Map()
  private settings: AudioSettings = {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    ambientVolume: 0.4,
    musicVolume: 0.6,
    enabled: true,
  }

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener()
    camera.add(this.listener)
    this.initializeAudioContext()
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext!)()
      await this.generateSounds()
    } catch (error) {
      console.warn('Audio initialization failed:', error)
      this.settings.enabled = false
    }
  }

  private async generateSounds() {
    if (!this.audioContext) return

    // Generate procedural sound effects
    await this.generateCameraShutter()
    await this.generateCameraFocus()
    await this.generateUIClick()
    await this.generateUIHover()
    await this.generateCreatureSounds()
    await this.generateAmbientSounds()
  }

  private async generateCameraShutter() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.3
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Sharp click followed by mechanical whir
      const click = Math.exp(-t * 50) * Math.sin(t * 2000 * Math.PI) * 0.8
      const whir = Math.exp(-t * 8) * Math.sin(t * 800 * Math.PI) * 0.3 * Math.sin(t * 40 * Math.PI)
      data[i] = (click + whir) * 0.5
    }

    this.soundBuffers.set('camera_shutter', buffer)
  }

  private async generateCameraFocus() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.4
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Gentle beep with frequency sweep
      const freq = 800 + Math.sin(t * 8) * 200
      const envelope = Math.exp(-t * 3) * (1 - Math.exp(-t * 20))
      data[i] = Math.sin(t * freq * TAU) * envelope * 0.3
    }

    this.soundBuffers.set('camera_focus', buffer)
  }

  private async generateUIClick() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.1
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 30)
      data[i] = Math.sin(t * 1200 * Math.PI) * envelope * 0.4
    }

    this.soundBuffers.set('ui_click', buffer)
  }

  private async generateUIHover() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.15
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 15) * (1 - Math.exp(-t * 50))
      data[i] = Math.sin(t * 600 * Math.PI) * envelope * 0.2
    }

    this.soundBuffers.set('ui_hover', buffer)
  }

  private async generateCreatureSounds() {
    if (!this.audioContext) return

    // Creature chirp
    await this.generateCreatureChirp()

    // Creature growl
    await this.generateCreatureGrowl()

    // Wing flutter
    await this.generateWingFlutter()

    // Water splash
    await this.generateWaterSplash()
  }

  private async generateCreatureChirp() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.6
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Melodic chirp with harmonics
      const freq1 = 800 + Math.sin(t * 12) * 400
      const freq2 = freq1 * 1.5
      const envelope = Math.exp(-t * 4) * Math.sin(t * 8) * Math.sin(t * 8)
      data[i] =
        (Math.sin(t * freq1 * TAU) * 0.6 + Math.sin(t * freq2 * TAU) * 0.3) *
        envelope *
        0.4
    }

    this.soundBuffers.set('creature_chirp', buffer)
  }

  private async generateCreatureGrowl() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.8
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Low frequency growl with noise
      const freq = 120 + Math.sin(t * 6) * 40
      const noise = randomCentered() * 0.3
      const tone = Math.sin(t * freq * TAU) * 0.7
      const envelope = Math.exp(-t * 2) * (1 - Math.exp(-t * 10))
      data[i] = (tone + noise) * envelope * 0.5
    }

    this.soundBuffers.set('creature_growl', buffer)
  }

  private async generateWingFlutter() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.4
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Rapid flutter with noise
      const flutter = Math.sin(t * 40 * Math.PI) * Math.sin(t * 400 * Math.PI)
      const noise = randomCentered() * 0.4
      const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 30))
      data[i] = (flutter * 0.6 + noise * 0.4) * envelope * 0.3
    }

    this.soundBuffers.set('creature_flutter', buffer)
  }

  private async generateWaterSplash() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 0.5
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Splash with high frequency noise burst
      const noise = randomCentered() * 2
      const filtered = noise * Math.exp(-Math.abs(t - 0.1) * 20)
      const bubble = Math.sin(t * 200 * Math.PI) * Math.exp(-t * 8) * 0.3
      data[i] = (filtered * 0.7 + bubble) * 0.4
    }

    this.soundBuffers.set('creature_splash', buffer)
  }

  private async generateAmbientSounds() {
    if (!this.audioContext) return

    // Generate looping ambient sounds
    await this.generateForestAmbient()
    await this.generateWindSound()
    await this.generateWaterFlow()
    await this.generateBirdsDistant()
  }

  private async generateForestAmbient() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 4 // Loop duration
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Layered nature sounds
      const rustling = randomCentered() * Math.sin(t * 0.5) * 0.1
      const insects = Math.sin(t * 800 * Math.PI) * Math.sin(t * 0.3) * 0.05
      const breeze = Math.sin(t * 200 * Math.PI) * Math.sin(t * 0.1) * 0.08
      data[i] = rustling + insects + breeze
    }

    this.soundBuffers.set('forest_ambient', buffer)
  }

  private async generateWindSound() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 3
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Wind noise with varying intensity
      const noise = randomCentered() * 2
      const filter = Math.sin(t * 0.2) * 0.5 + 0.5
      const lowPass = noise * filter * 0.15
      data[i] = lowPass
    }

    this.soundBuffers.set('wind_gentle', buffer)
  }

  private async generateWaterFlow() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 3
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Water flow with bubbles
      const flow = randomCentered() * Math.sin(t * 2) * 0.2
      const bubbles = Math.sin(t * 400 * Math.PI) * Math.random() * 0.05
      data[i] = flow + bubbles
    }

    this.soundBuffers.set('water_flowing', buffer)
  }

  private async generateBirdsDistant() {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const duration = 5
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      // Occasional distant bird calls
      const call1 = Math.sin(t * 1200 * Math.PI) * Math.exp(-Math.abs(t - 1.5) * 8) * 0.1
      const call2 = Math.sin(t * 800 * Math.PI) * Math.exp(-Math.abs(t - 3.2) * 6) * 0.08
      data[i] = call1 + call2
    }

    this.soundBuffers.set('birds_distant', buffer)
  }

  public playSoundEffect(effect: SoundEffect, volume: number = 1.0, position?: THREE.Vector3) {
    if (!this.settings.enabled || !this.audioContext || !this.listener) return

    const buffer = this.soundBuffers.get(effect)
    if (!buffer) return

    const sound = new THREE.Audio(this.listener)
    sound.setBuffer(buffer)
    sound.setVolume(this.settings.masterVolume * this.settings.sfxVolume * volume)

    if (position) {
      const positionalSound = new THREE.PositionalAudio(this.listener)
      positionalSound.setBuffer(buffer)
      positionalSound.setVolume(this.settings.masterVolume * this.settings.sfxVolume * volume)
      positionalSound.setRefDistance(5)
      positionalSound.setRolloffFactor(2)

      // Create a temporary object to hold the sound
      const soundObject = new THREE.Object3D()
      soundObject.position.copy(position)
      soundObject.add(positionalSound)

      positionalSound.play()

      // Clean up after sound finishes
      setTimeout(
        () => {
          soundObject.remove(positionalSound)
        },
        buffer.duration * 1000 + 100
      )

      return
    }

    sound.play()
  }

  public startAmbientSound(ambient: AmbientSound, volume: number = 1.0) {
    if (!this.settings.enabled || !this.audioContext || !this.listener) return

    // Stop existing ambient sound of this type
    this.stopAmbientSound(ambient)

    const buffer = this.soundBuffers.get(ambient)
    if (!buffer) return

    const sound = new THREE.Audio(this.listener)
    sound.setBuffer(buffer)
    sound.setLoop(true)
    sound.setVolume(this.settings.masterVolume * this.settings.ambientVolume * volume)
    sound.play()

    this.ambientSources.set(ambient, sound)
  }

  public stopAmbientSound(ambient: AmbientSound) {
    const sound = this.ambientSources.get(ambient)
    if (sound) {
      sound.stop()
      this.ambientSources.delete(ambient)
    }
  }

  public stopAllAmbientSounds() {
    for (const sound of this.ambientSources.values()) {
      sound.stop()
    }
    this.ambientSources.clear()
  }

  public updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings }

    // Update volumes of playing ambient sounds
    for (const sound of this.ambientSources.values()) {
      sound.setVolume(this.settings.masterVolume * this.settings.ambientVolume)
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings }
  }

  public async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
}
