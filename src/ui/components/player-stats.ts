/**
 * Player Stats Component
 * Displays player statistics, avatar preview, and inventory
 */

import * as THREE from 'three'
import type { UICallbacks } from '@core/types'
import type { PlayerProgress } from '@systems/state'

export interface InventoryItem {
  id: string
  name: string
  icon: string
  description: string
  quantity: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export class PlayerStats {
  private container: HTMLDivElement
  private isVisible: boolean = false
  private audioCallbacks: UICallbacks = {}
  
  // Avatar preview
  private avatarCanvas: HTMLCanvasElement | null = null
  private avatarScene: THREE.Scene | null = null
  private avatarCamera: THREE.PerspectiveCamera | null = null
  private avatarRenderer: THREE.WebGLRenderer | null = null
  private avatarMesh: THREE.Group | null = null
  private animationId: number | null = null
  
  // Inventory
  private inventory: InventoryItem[] = []

  constructor() {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'player-stats-modal'
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1500;
      backdrop-filter: blur(8px);
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 0;
      max-width: 900px;
      width: 90%;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(74, 222, 128, 0.3);
      display: flex;
      flex-direction: column;
    `

    // Header
    const header = this.createHeader()
    content.appendChild(header)

    // Main content area (scrollable)
    const mainContent = document.createElement('div')
    mainContent.style.cssText = `
      display: flex;
      gap: 20px;
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    `

    // Left column - Avatar and basic stats
    const leftColumn = this.createLeftColumn()
    mainContent.appendChild(leftColumn)

    // Right column - Detailed stats and inventory
    const rightColumn = this.createRightColumn()
    mainContent.appendChild(rightColumn)

    content.appendChild(mainContent)
    container.appendChild(content)

    // Close on background click
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        this.audioCallbacks.onClick?.()
        this.hide()
      }
    })

    return container
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid rgba(74, 222, 128, 0.2);
      background: rgba(0, 0, 0, 0.3);
    `

    const title = document.createElement('h2')
    title.textContent = '👤 Player Profile'
    title.style.cssText = `
      margin: 0;
      color: #4ade80;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
    `

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = `
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #ef4444;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.2s;
    `
    closeBtn.addEventListener('mouseenter', () => {
      this.audioCallbacks.onHover?.()
      closeBtn.style.background = 'rgba(239, 68, 68, 0.4)'
      closeBtn.style.transform = 'scale(1.1)'
    })
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.2)'
      closeBtn.style.transform = 'scale(1)'
    })
    closeBtn.addEventListener('click', () => {
      this.audioCallbacks.onClick?.()
      this.hide()
    })

    header.appendChild(title)
    header.appendChild(closeBtn)
    return header
  }

  private createLeftColumn(): HTMLDivElement {
    const column = document.createElement('div')
    column.style.cssText = `
      flex: 0 0 300px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `

    // Avatar preview card
    const avatarCard = document.createElement('div')
    avatarCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const avatarTitle = document.createElement('h3')
    avatarTitle.textContent = '🎭 Avatar'
    avatarTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    avatarCard.appendChild(avatarTitle)

    // Avatar canvas
    this.avatarCanvas = document.createElement('canvas')
    this.avatarCanvas.width = 268
    this.avatarCanvas.height = 268
    this.avatarCanvas.style.cssText = `
      width: 100%;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 2px solid rgba(74, 222, 128, 0.3);
    `
    avatarCard.appendChild(this.avatarCanvas)

    column.appendChild(avatarCard)

    // Basic stats card
    const statsCard = document.createElement('div')
    statsCard.id = 'basic-stats-card'
    statsCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const statsTitle = document.createElement('h3')
    statsTitle.textContent = '📊 Quick Stats'
    statsTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    statsCard.appendChild(statsTitle)

    const statsContent = document.createElement('div')
    statsContent.id = 'basic-stats-content'
    statsContent.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #e5e7eb;
      font-size: 14px;
    `
    statsCard.appendChild(statsContent)

    column.appendChild(statsCard)

    return column
  }

  private createRightColumn(): HTMLDivElement {
    const column = document.createElement('div')
    column.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `

    // Detailed stats card
    const detailedStatsCard = document.createElement('div')
    detailedStatsCard.id = 'detailed-stats-card'
    detailedStatsCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    `

    const detailedTitle = document.createElement('h3')
    detailedTitle.textContent = '🏆 Achievements'
    detailedTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    detailedStatsCard.appendChild(detailedTitle)

    const detailedContent = document.createElement('div')
    detailedContent.id = 'detailed-stats-content'
    detailedContent.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    `
    detailedStatsCard.appendChild(detailedContent)

    column.appendChild(detailedStatsCard)

    // Inventory card
    const inventoryCard = document.createElement('div')
    inventoryCard.style.cssText = `
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(74, 222, 128, 0.2);
      flex: 1;
    `

    const inventoryTitle = document.createElement('h3')
    inventoryTitle.textContent = '🎒 Inventory'
    inventoryTitle.style.cssText = `
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 16px;
    `
    inventoryCard.appendChild(inventoryTitle)

    const inventoryGrid = document.createElement('div')
    inventoryGrid.id = 'inventory-grid'
    inventoryGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    `
    inventoryCard.appendChild(inventoryGrid)

    column.appendChild(inventoryCard)

    return column
  }

  private initAvatarPreview(): void {
    if (!this.avatarCanvas) return

    // Setup Three.js scene
    this.avatarScene = new THREE.Scene()
    this.avatarScene.background = new THREE.Color(0x0f172a)

    // Camera
    this.avatarCamera = new THREE.PerspectiveCamera(
      50,
      this.avatarCanvas.width / this.avatarCanvas.height,
      0.1,
      100
    )
    this.avatarCamera.position.set(0, 1.5, 4)
    this.avatarCamera.lookAt(0, 1, 0)

    // Renderer
    this.avatarRenderer = new THREE.WebGLRenderer({
      canvas: this.avatarCanvas,
      antialias: true,
      alpha: false,
    })
    this.avatarRenderer.setSize(this.avatarCanvas.width, this.avatarCanvas.height)
    this.avatarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.avatarScene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(2, 3, 2)
    this.avatarScene.add(directionalLight)

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.4)
    rimLight.position.set(-2, 1, -2)
    this.avatarScene.add(rimLight)

    // Create avatar mesh
    this.avatarMesh = this.createAvatarMesh()
    this.avatarScene.add(this.avatarMesh)

    // Start animation
    this.animateAvatar()
  }

  private createAvatarMesh(): THREE.Group {
    const group = new THREE.Group()

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.2,
      metalness: 0.6,
      roughness: 0.4,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6
    group.add(body)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.y = 1.4
    group.add(head)

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
    })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1, 1.45, 0.2)
    group.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1, 1.45, 0.2)
    group.add(rightEye)

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.y = 1
    group.add(glow)

    return group
  }

  private animateAvatar(): void {
    if (!this.avatarScene || !this.avatarCamera || !this.avatarRenderer || !this.avatarMesh) {
      return
    }

    const animate = () => {
      if (!this.isVisible) {
        this.animationId = null
        return
      }

      // Rotate avatar
      this.avatarMesh!.rotation.y += 0.01

      // Gentle bobbing animation
      this.avatarMesh!.position.y = Math.sin(Date.now() * 0.001) * 0.05

      this.avatarRenderer!.render(this.avatarScene!, this.avatarCamera!)
      this.animationId = requestAnimationFrame(animate)
    }

    animate()
  }

  public updateStats(progress: PlayerProgress): void {
    // Update basic stats
    const basicStatsContent = document.getElementById('basic-stats-content')
    if (basicStatsContent) {
      const playTimeHours = Math.floor(progress.playTime / 3600)
      const playTimeMinutes = Math.floor((progress.playTime % 3600) / 60)

      basicStatsContent.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span>📸 Photos:</span>
          <span style="color: #4ade80; font-weight: bold;">${progress.photoCount}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>⭐ Total Score:</span>
          <span style="color: #fbbf24; font-weight: bold;">${progress.totalScore.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>🏆 Best Score:</span>
          <span style="color: #f59e0b; font-weight: bold;">${progress.bestScore}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>🦎 Discovered:</span>
          <span style="color: #60a5fa; font-weight: bold;">${progress.creaturesDiscovered.size}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>⏱️ Play Time:</span>
          <span style="color: #a78bfa; font-weight: bold;">${playTimeHours}h ${playTimeMinutes}m</span>
        </div>
      `
    }

    // Update detailed stats
    const detailedStatsContent = document.getElementById('detailed-stats-content')
    if (detailedStatsContent) {
      const rarityColors = {
        common: '#9ca3af',
        uncommon: '#4ade80',
        rare: '#60a5fa',
        epic: '#a78bfa',
        legendary: '#fbbf24',
      }

      detailedStatsContent.innerHTML = Object.entries(progress.rarityTiers)
        .map(
          ([tier, count]) => `
        <div style="
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid ${rarityColors[tier as keyof typeof rarityColors]}40;
        ">
          <div style="color: ${rarityColors[tier as keyof typeof rarityColors]}; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">
            ${tier}
          </div>
          <div style="color: white; font-size: 20px; font-weight: bold;">
            ${count}
          </div>
        </div>
      `
        )
        .join('')
    }
  }

  public setInventory(items: InventoryItem[]): void {
    this.inventory = items
    this.renderInventory()
  }

  public addInventoryItem(item: InventoryItem): void {
    const existing = this.inventory.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      this.inventory.push(item)
    }
    this.renderInventory()
  }

  private renderInventory(): void {
    const inventoryGrid = document.getElementById('inventory-grid')
    if (!inventoryGrid) return

    const rarityColors = {
      common: '#9ca3af',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#a78bfa',
      legendary: '#fbbf24',
    }

    inventoryGrid.innerHTML = this.inventory
      .map(
        (item) => `
      <div 
        class="inventory-item"
        style="
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid ${rarityColors[item.rarity]}40;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        "
        title="${item.description}"
      >
        <div style="font-size: 32px; text-align: center;">${item.icon}</div>
        <div style="font-size: 10px; color: #e5e7eb; text-align: center; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${item.name}
        </div>
        ${
          item.quantity > 1
            ? `<div style="
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 10px;
            padding: 2px 4px;
            border-radius: 4px;
            font-weight: bold;
          ">${item.quantity}</div>`
            : ''
        }
      </div>
    `
      )
      .join('')

    // Add hover effects
    const items = inventoryGrid.querySelectorAll('.inventory-item')
    items.forEach((item) => {
      item.addEventListener('mouseenter', () => {
        ;(item as HTMLElement).style.transform = 'scale(1.1)'
        ;(item as HTMLElement).style.borderColor = 'rgba(74, 222, 128, 0.8)'
      })
      item.addEventListener('mouseleave', () => {
        ;(item as HTMLElement).style.transform = 'scale(1)'
        const rarity = this.inventory.find(
          (i) => i.name === item.querySelector('div:nth-child(2)')?.textContent?.trim()
        )?.rarity
        if (rarity) {
          const rarityColors = {
            common: '#9ca3af',
            uncommon: '#4ade80',
            rare: '#60a5fa',
            epic: '#a78bfa',
            legendary: '#fbbf24',
          }
          ;(item as HTMLElement).style.borderColor = `${rarityColors[rarity]}40`
        }
      })
    })
  }

  public show(): void {
    this.isVisible = true
    this.container.style.display = 'flex'

    // Initialize avatar preview if not already done
    if (!this.avatarScene) {
      this.initAvatarPreview()
    } else if (!this.animationId) {
      this.animateAvatar()
    }
  }

  public hide(): void {
    this.isVisible = false
    this.container.style.display = 'none'
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  public isOpen(): boolean {
    return this.isVisible
  }

  public setAudioCallbacks(callbacks: UICallbacks): void {
    this.audioCallbacks = callbacks
  }

  public dispose(): void {
    this.hide()

    // Cleanup Three.js resources
    if (this.avatarRenderer) {
      this.avatarRenderer.dispose()
    }

    if (this.avatarScene) {
      this.avatarScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    }

    if (this.container.parentNode) {
      document.body.removeChild(this.container)
    }
  }
}
