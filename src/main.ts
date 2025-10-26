import './style.css'
import { Buffer } from 'buffer'
import process from 'process'

// Polyfills for WebRTC libraries
if (typeof window !== 'undefined') {
  ;(window as any).Buffer = Buffer
  ;(window as any).process = process
}

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
