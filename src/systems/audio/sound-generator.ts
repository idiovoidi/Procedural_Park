import { TAU } from '@core/constants'
import { randomCentered } from '@core/utils'
import type { SoundEffect, AmbientSound } from './types'

/**
 * Generate all procedural sound effects and ambient sounds
 */
export async function generateAllSounds(
  audioContext: AudioContext
): Promise<Map<string, AudioBuffer>> {
  const soundBuffers = new Map<string, AudioBuffer>()

  // Generate sound effects
  await generateCameraShutter(audioContext, soundBuffers)
  await generateCameraFocus(audioContext, soundBuffers)
  await generateUIClick(audioContext, soundBuffers)
  await generateUIHover(audioContext, soundBuffers)
  await generateCreatureChirp(audioContext, soundBuffers)
  await generateCreatureGrowl(audioContext, soundBuffers)
  await generateWingFlutter(audioContext, soundBuffers)
  await generateWaterSplash(audioContext, soundBuffers)

  // Generate ambient sounds
  await generateForestAmbient(audioContext, soundBuffers)
  await generateWindSound(audioContext, soundBuffers)
  await generateWaterFlow(audioContext, soundBuffers)
  await generateBirdsDistant(audioContext, soundBuffers)

  return soundBuffers
}

async function generateCameraShutter(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.3
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Sharp click followed by mechanical whir
    const click = Math.exp(-t * 50) * Math.sin(t * 2000 * Math.PI) * 0.8
    const whir = Math.exp(-t * 8) * Math.sin(t * 800 * Math.PI) * 0.3 * Math.sin(t * 40 * Math.PI)
    data[i] = (click + whir) * 0.5
  }

  soundBuffers.set('camera_shutter', buffer)
}

async function generateCameraFocus(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.4
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Gentle beep with frequency sweep
    const freq = 800 + Math.sin(t * 8) * 200
    const envelope = Math.exp(-t * 3) * (1 - Math.exp(-t * 20))
    data[i] = Math.sin(t * freq * TAU) * envelope * 0.3
  }

  soundBuffers.set('camera_focus', buffer)
}

async function generateUIClick(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.1
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 30)
    data[i] = Math.sin(t * 1200 * Math.PI) * envelope * 0.4
  }

  soundBuffers.set('ui_click', buffer)
}

async function generateUIHover(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.15
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    const envelope = Math.exp(-t * 15) * (1 - Math.exp(-t * 50))
    data[i] = Math.sin(t * 600 * Math.PI) * envelope * 0.2
  }

  soundBuffers.set('ui_hover', buffer)
}

async function generateCreatureChirp(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.6
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Melodic chirp with harmonics
    const freq1 = 800 + Math.sin(t * 12) * 400
    const freq2 = freq1 * 1.5
    const envelope = Math.exp(-t * 4) * Math.sin(t * 8) * Math.sin(t * 8)
    data[i] =
      (Math.sin(t * freq1 * TAU) * 0.6 + Math.sin(t * freq2 * TAU) * 0.3) * envelope * 0.4
  }

  soundBuffers.set('creature_chirp', buffer)
}

async function generateCreatureGrowl(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.8
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
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

  soundBuffers.set('creature_growl', buffer)
}

async function generateWingFlutter(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.4
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Rapid flutter with noise
    const flutter = Math.sin(t * 40 * Math.PI) * Math.sin(t * 400 * Math.PI)
    const noise = randomCentered() * 0.4
    const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 30))
    data[i] = (flutter * 0.6 + noise * 0.4) * envelope * 0.3
  }

  soundBuffers.set('creature_flutter', buffer)
}

async function generateWaterSplash(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 0.5
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Splash with high frequency noise burst
    const noise = randomCentered() * 2
    const filtered = noise * Math.exp(-Math.abs(t - 0.1) * 20)
    const bubble = Math.sin(t * 200 * Math.PI) * Math.exp(-t * 8) * 0.3
    data[i] = (filtered * 0.7 + bubble) * 0.4
  }

  soundBuffers.set('creature_splash', buffer)
}

async function generateForestAmbient(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 4 // Loop duration
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Layered nature sounds
    const rustling = randomCentered() * Math.sin(t * 0.5) * 0.1
    const insects = Math.sin(t * 800 * Math.PI) * Math.sin(t * 0.3) * 0.05
    const breeze = Math.sin(t * 200 * Math.PI) * Math.sin(t * 0.1) * 0.08
    data[i] = rustling + insects + breeze
  }

  soundBuffers.set('forest_ambient', buffer)
}

async function generateWindSound(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 3
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Wind noise with varying intensity
    const noise = randomCentered() * 2
    const filter = Math.sin(t * 0.2) * 0.5 + 0.5
    const lowPass = noise * filter * 0.15
    data[i] = lowPass
  }

  soundBuffers.set('wind_gentle', buffer)
}

async function generateWaterFlow(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 3
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Water flow with bubbles
    const flow = randomCentered() * Math.sin(t * 2) * 0.2
    const bubbles = Math.sin(t * 400 * Math.PI) * Math.random() * 0.05
    data[i] = flow + bubbles
  }

  soundBuffers.set('water_flowing', buffer)
}

async function generateBirdsDistant(
  audioContext: AudioContext,
  soundBuffers: Map<string, AudioBuffer>
) {
  const sampleRate = audioContext.sampleRate
  const duration = 5
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    // Occasional distant bird calls
    const call1 = Math.sin(t * 1200 * Math.PI) * Math.exp(-Math.abs(t - 1.5) * 8) * 0.1
    const call2 = Math.sin(t * 800 * Math.PI) * Math.exp(-Math.abs(t - 3.2) * 6) * 0.08
    data[i] = call1 + call2
  }

  soundBuffers.set('birds_distant', buffer)
}
