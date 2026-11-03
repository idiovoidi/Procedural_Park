import { GAME_CONFIG } from '@core/constants'
import { log } from '@core/utils'
import type { CreatureInstance } from '@systems/creatures'
import type { SerializedPhoto } from '@systems/state'
import type { GameSystems } from '../SystemsCoordinator'

/**
 * PhotoManager
 * Handles photo capture, gallery bookkeeping and creature card export
 */
export class PhotoManager {
  private galleryPhotos: SerializedPhoto[] = []

  private systems: GameSystems
  /** Set by the game: the friend's creatures while visiting, so their cards can be exported. */
  public getVisitedInstances?: () => CreatureInstance[]

  constructor(systems: GameSystems) {
    this.systems = systems
  }

  public getGalleryPhotos(): SerializedPhoto[] {
    return this.galleryPhotos
  }

  public setGalleryPhotos(photos: SerializedPhoto[]): void {
    this.galleryPhotos = photos
  }

  public clearGallery(): void {
    this.systems.ui.clearGallery()
    this.galleryPhotos = []
  }

  /**
   * Take a photo
   */
  public takePhoto(): void {
    const { state, photo, scene, ui, creatures, multiplayer, currency } = this.systems

    // Check if photos are allowed
    if (!state.isPhotoAllowed()) {
      ui.showToast('Cannot take photos right now')
      return
    }

    // Take photo
    const result = photo.takePhoto(
      creatures.getAllCreatures(),
      this.systems.camera.camera,
      scene.scene
    )

    // Capture the photo
    const dataUrl = scene.capturePhoto()

    // Add to gallery
    ui.addPhotoToGallery(dataUrl, result.score, result.creatureName)

    // Store photo for saving
    this.galleryPhotos.push({
      dataUrl,
      score: result.score,
      creatureName: result.creatureName,
      timestamp: Date.now(),
    })

    // Calculate and award currency
    import('@systems/currency/currency-rewards').then(({ calculatePhotoReward }) => {
      const reward = calculatePhotoReward(result.score)
      currency.addMoney(reward, `Photo of ${result.creatureName} (${result.score} pts)`)
      ui.showToast(`+${reward} 🪙`)
    })

    // Show score feedback
    ui.showScoreToast(result.score)

    // Photographing a wild creature adds its species to the codex and studies it
    if (result.creature) {
      const { codex } = this.systems
      const isNew = codex.recordPhoto(result.creature.genome)
      const entry = codex.get(result.creature.genome.speciesId)
      if (isNew) ui.showToast(`📖 New species in the codex: ${entry?.name}`, 3000)
      else if (entry?.studied && entry.photos === GAME_CONFIG.ECONOMY.CODEX.STUDY_PHOTOS_REQUIRED) {
        ui.showToast(`📖 ${entry.name} studied: its diet and habitat are now known`, 3500)
      }
    }

    // Update UI state and track discoveries
    const currentUI = state.getUIState()
    const newPhotoCount = currentUI.photoCount + 1
    const newTotalScore = currentUI.totalScore + result.score

    state.updateUIState({
      photoCount: newPhotoCount,
      totalScore: newTotalScore,
      lastScore: result.score,
    })

    // Log detailed score breakdown
    if (result.creature) {
      const breakdown = photo.getScoreBreakdown(result.creature, this.systems.camera.camera)
      log.debug(`Photo of ${result.creatureName}:`, breakdown)
    }

    // Send photo event to peer
    multiplayer.sendPhotoEvent()
  }

  /**
   * Export creature card
   */
  public async exportCreatureCard(): Promise<void> {
    log.debug('🎯 exportCreatureCard called')
    const { photo, scene, ui, creatures } = this.systems

    try {
      log.debug('📸 Calling photo.exportCreatureCard...')
      const result = await photo.exportCreatureCard(
        [
          ...creatures.getAllCreatures(),
          ...this.systems.residents.getInstances(),
          ...(this.getVisitedInstances?.() ?? []),
        ],
        this.systems.camera.camera,
        scene.scene,
        GAME_CONFIG.WORLD_SEED
      )

      log.debug('📦 Export result:', result ? 'Success' : 'No creature found')

      if (result) {
        log.debug('➕ Adding to collection:', result.metadata.creatureName)
        const added = ui.addCreatureToCollection(result.metadata, result.thumbnail)
        log.debug('Collection add result:', added ? 'Added' : 'Already exists')

        if (added) {
          ui.showToast(`📦 Captured ${result.metadata.creatureName}!`)
        } else {
          ui.showToast(`Already have ${result.metadata.creatureName}`)
        }
      } else {
        log.warn('⚠️ No creature in view')
        ui.showToast('❌ No creature in view')
      }
    } catch (error) {
      log.error('❌ Failed to capture creature:', error)
      ui.showToast('❌ Capture failed')
    }
  }
}
