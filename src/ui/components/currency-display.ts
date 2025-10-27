/**
 * Currency Display Component
 * Shows player's current money balance
 */

export class CurrencyDisplay {
  private container: HTMLDivElement
  private balanceElement: HTMLSpanElement
  private iconElement: HTMLSpanElement

  constructor() {
    this.container = this.createContainer()
    this.iconElement = this.container.querySelector('.currency-icon') as HTMLSpanElement
    this.balanceElement = this.container.querySelector('.currency-balance') as HTMLSpanElement
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'currency-display'
    container.innerHTML = `
      <span class="currency-icon">🪙</span>
      <span class="currency-balance">100</span>
    `
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #ffd700;
      padding: 12px 20px;
      border-radius: 25px;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 2px solid rgba(255, 215, 0, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transition: transform 0.2s ease;
    `

    // Add hover effect
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.05)'
    })
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)'
    })

    return container
  }

  /**
   * Update the displayed balance
   */
  public updateBalance(amount: number): void {
    this.balanceElement.textContent = amount.toString()
    this.animateChange()
  }

  /**
   * Animate balance change
   */
  private animateChange(): void {
    this.container.style.transform = 'scale(1.15)'
    setTimeout(() => {
      this.container.style.transform = 'scale(1)'
    }, 200)
  }

  /**
   * Show the display
   */
  public show(): void {
    this.container.style.display = 'flex'
  }

  /**
   * Hide the display
   */
  public hide(): void {
    this.container.style.display = 'none'
  }

  /**
   * Set custom icon
   */
  public setIcon(icon: string): void {
    this.iconElement.textContent = icon
  }
}
