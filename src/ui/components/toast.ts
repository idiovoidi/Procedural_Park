import { GAME_CONFIG } from '@core/constants'

export class Toast {
  private toastEl: HTMLDivElement
  private lastScoreEl: HTMLSpanElement
  private filmCountEl: HTMLSpanElement
  private totalScoreEl: HTMLSpanElement
  private creatureInfoEl: HTMLDivElement
  private loadingEl: HTMLDivElement
  private sprintIndicator: HTMLDivElement

  private photoCount = 0
  private totalScore = 0
  private showCreatureInfoEnabled = true

  constructor() {
    this.toastEl = document.getElementById('toast') as HTMLDivElement
    this.lastScoreEl = document.getElementById('lastScore') as HTMLSpanElement
    this.filmCountEl = document.getElementById('filmCount') as HTMLSpanElement
    this.totalScoreEl = document.getElementById('totalScoreValue') as HTMLSpanElement
    this.creatureInfoEl = document.getElementById('creature-info') as HTMLDivElement
    this.loadingEl = document.getElementById('loading') as HTMLDivElement
    this.sprintIndicator = document.getElementById('sprint-indicator') as HTMLDivElement

    this.updateStats()
  }

  public show(text: string, duration?: number) {
    this.toastEl.textContent = text
    this.toastEl.classList.remove('hidden')
    setTimeout(
      () => this.toastEl.classList.add('hidden'),
      duration || GAME_CONFIG.TOAST_DURATION_MS
    )
  }

  public showScore(score: number) {
    if (score > 0) {
      let message = `Nice! +${score}`
      if (score > GAME_CONFIG.PHOTO_SCORE_EXCELLENT) message = `Excellent! +${score}`
      else if (score > GAME_CONFIG.PHOTO_SCORE_GREAT) message = `Great shot! +${score}`
      else if (score > GAME_CONFIG.PHOTO_SCORE_GOOD) message = `Good! +${score}`

      this.show(message)
    } else {
      this.show('Miss!')
    }
  }

  public showCreatureInfo(name: string, distance: number, rarity: number) {
    if (!this.showCreatureInfoEnabled) return

    const nameEl = this.creatureInfoEl.querySelector('.creature-name') as HTMLDivElement
    const distanceEl = this.creatureInfoEl.querySelector('.creature-distance') as HTMLDivElement
    const rarityEl = this.creatureInfoEl.querySelector('.creature-rarity') as HTMLDivElement

    nameEl.textContent = name
    distanceEl.textContent = `Distance: ${distance.toFixed(1)}m`
    rarityEl.textContent = `Rarity: ${Math.round(rarity * 100)}%`

    this.creatureInfoEl.classList.remove('hidden')
  }

  public hideCreatureInfo() {
    this.creatureInfoEl.classList.add('hidden')
  }

  public setShowCreatureInfoEnabled(enabled: boolean) {
    this.showCreatureInfoEnabled = enabled
    if (!enabled) {
      this.hideCreatureInfo()
    }
  }

  public showLoading(text = 'Loading...') {
    const loadingText = this.loadingEl.querySelector('.loading-text') as HTMLDivElement
    loadingText.textContent = text
    this.loadingEl.classList.remove('hidden')
  }

  public hideLoading() {
    this.loadingEl.classList.add('hidden')
  }

  public addPhoto(score: number) {
    this.photoCount++
    this.totalScore += score
    this.updateStats()
  }

  public clearStats() {
    this.photoCount = 0
    this.totalScore = 0
    this.updateStats()
    this.lastScoreEl.textContent = '0'
  }

  private updateStats() {
    this.filmCountEl.textContent = String(this.photoCount)
    this.totalScoreEl.textContent = String(this.totalScore)
  }

  public getPhotoCount(): number {
    return this.photoCount
  }

  public getTotalScore(): number {
    return this.totalScore
  }

  public showSprintIndicator() {
    if (this.sprintIndicator) {
      this.sprintIndicator.classList.remove('hidden')
    }
  }

  public hideSprintIndicator() {
    if (this.sprintIndicator) {
      this.sprintIndicator.classList.add('hidden')
    }
  }
}
