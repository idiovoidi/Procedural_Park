// Import polyfills FIRST before anything else
import './polyfills'
import './style.css'
import { Game } from './game/Game'

// Initialize the game
const app = document.getElementById('app') as HTMLDivElement
const game = new Game(app)

// Start the game loop and expose for debugging after initialization
game.start().then(() => {
  // Expose game instance to window for debugging
  ;(window as any).game = game
  ;(window as any).stateManager = game.getStateManager()
})

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.stop()
  })
}
