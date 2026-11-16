// Import polyfills FIRST before anything else
import './polyfills'
import './style.css'
import './accessibility.css'
import type { IntegratedStateManager } from '@systems/state'
import { showErrorScreen } from '@ui/utils/show-error-screen'
import { Game } from './game/Game'

// Initialize the game
const app = document.getElementById('app') as HTMLDivElement

try {
  const game = new Game(app)

  // Start the game loop and expose for debugging after initialization
  game
    .start()
    .then(() => {
      // Expose game instance to window for debugging
      const win = window as Window & { game?: Game; stateManager?: IntegratedStateManager }
      win.game = game
      win.stateManager = game.getStateManager()
    })
    .catch((error) => {
      console.error('❌ Failed to start game:', error)
      showErrorScreen('Failed to start game. Please refresh the page.', error)
    })
} catch (error) {
  console.error('❌ Failed to initialize game:', error)
  showErrorScreen('Failed to initialize game. Please refresh the page.', error)
}

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const game = (window as Window & { game?: Game }).game
    if (game) {
      game.stop()
    }
  })
}
