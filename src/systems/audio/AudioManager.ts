import * as THREE from 'three'
import { generateAllSounds } from './sound-generator'
import type { AmbientSound, AudioSettings, SoundEffect } from './types'

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
      this.soundBuffers = await generateAllSounds(this.audioContext)
    } catch (error) {
      console.warn('Audio initialization failed:', error)
      this.settings.enabled = false
    }
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

  public setAmbientVolume(volumeMultiplier: number) {
    // Set volume for all ambient sounds (0 = mute, 1 = normal)
    for (const sound of this.ambientSources.values()) {
      if (sound.isPlaying) {
        sound.setVolume(this.settings.ambientVolume * volumeMultiplier * this.settings.masterVolume)
      }
    }
  }
}
