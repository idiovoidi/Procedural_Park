import type { UICallbacks } from '@core/types'
import { GALLERY_CSS } from './gallery-styles'

export class Gallery {
  private galleryEl: HTMLDivElement
  private galleryContentEl: HTMLDivElement
  private toggleGalleryBtn: HTMLButtonElement
  private audioCallbacks: UICallbacks = {}

  constructor() {
    this.galleryEl = document.getElementById('gallery') as HTMLDivElement
    this.galleryContentEl = document.querySelector('.gallery-content') as HTMLDivElement
    this.toggleGalleryBtn = document.getElementById('toggleGallery') as HTMLButtonElement

    this.setupEventListeners()
  }

  public setAudioCallbacks(callbacks: UICallbacks) {
    this.audioCallbacks = callbacks
  }

  private handleGalleryClick() {
    this.audioCallbacks.onClick?.()
    this.toggle()
  }

  private setupEventListeners() {
    this.toggleGalleryBtn?.addEventListener('click', () => this.handleGalleryClick())
    this.galleryEl
      .querySelector('.close-btn')
      ?.addEventListener('click', () => this.handleGalleryClick())
  }

  public toggle() {
    this.galleryEl.classList.toggle('hidden')
  }

  public addPhoto(dataUrl: string, score: number, creatureName?: string) {
    const img = new Image()
    img.src = dataUrl
    img.title = creatureName ? `${creatureName} - Score: ${score}` : `Score: ${score}`
    img.className = 'gallery-photo'

    // Add click handler for full-size view
    img.addEventListener('click', () => this.showFullSizePhoto(dataUrl, score, creatureName))

    this.galleryContentEl.appendChild(img)
  }

  private showFullSizePhoto(dataUrl: string, score: number, creatureName?: string) {
    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'photo-modal'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${creatureName || 'Unknown Creature'}</h3>
          <button class="close-btn">&times;</button>
        </div>
        <img src="${dataUrl}" alt="Full size photo" class="modal-image">
        <div class="modal-footer">
          <p>Score: ${score}</p>
          <button class="delete-btn">Delete Photo</button>
        </div>
      </div>
    `

    // Add modal styles
    const style = document.createElement('style')
    style.textContent = GALLERY_CSS
    document.head.appendChild(style)
    document.body.appendChild(modal)

    // Event listeners
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal)
      document.head.removeChild(style)
    })

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
        document.head.removeChild(style)
      }
    })
  }

  public clear() {
    this.galleryContentEl.innerHTML = ''
  }
}
