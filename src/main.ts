// Import polyfills FIRST before anything else
import './polyfills'
import './style.css'
import { Game } from './game'

// Initialize the game
const app = document.getElementById('app') as HTMLDivElement
const game = new Game(app)

// Start the game loop
game.start()

// Expose game instance to window for debugging
;(window as any).game = game

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.stop()
  })
}
