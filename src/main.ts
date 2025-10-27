// Import polyfills FIRST before anything else
import './polyfills'
import './style.css'
import { Game } from './game/Game'

// Initialize the game
const app = document.getElementById('app') as HTMLDivElement

try {
  const game = new Game(app)

  // Start the game loop and expose for debugging after initialization
  game.start()
    .then(() => {
      // Expose game instance to window for debugging
      ;(window as any).game = game
      ;(window as any).stateManager = game.getStateManager()
    })
    .catch((error) => {
      console.error('❌ Failed to start game:', error)
      showErrorScreen('Failed to start game. Please refresh the page.', error)
    })
} catch (error) {
  console.error('❌ Failed to initialize game:', error)
  showErrorScreen('Failed to initialize game. Please refresh the page.', error)
}

/**
 * Show error screen to user
 */
function showErrorScreen(message: string, error: unknown): void {
  const loadingEl = document.getElementById('loading')
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="text-align: center; color: #ef4444;">
        <h2 style="margin-bottom: 1rem;">⚠️ Error</h2>
        <p style="margin-bottom: 1rem;">${message}</p>
        <button 
          onclick="location.reload()" 
          style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          Reload Page
        </button>
        ${import.meta.env.DEV ? `<pre style="margin-top: 1rem; text-align: left; font-size: 0.75rem; color: #fbbf24;">${error instanceof Error ? error.stack : String(error)}</pre>` : ''}
      </div>
    `
    loadingEl.classList.remove('hidden')
  }
}

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const game = (window as any).game
    if (game) {
      game.stop()
    }
  })
}
