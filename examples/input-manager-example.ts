/**
 * Input Manager Usage Examples
 * 
 * This file demonstrates various ways to use the InputManager
 */

import { InputManager } from '../src/input-manager'

// Example 1: Basic Setup
function basicSetup() {
  const inputManager = new InputManager()
  
  // Register action callbacks
  inputManager.on('game.takePhoto', () => {
    console.log('📸 Photo taken!')
  })
  
  inputManager.on('camera.jump', () => {
    console.log('🦘 Jump!')
  })
  
  // Game loop
  function gameLoop() {
    inputManager.update() // Clear pressed/released states
    
    // Query continuous input
    if (inputManager.isKeyDown('w')) {
      console.log('Moving forward...')
    }
    
    requestAnimationFrame(gameLoop)
  }
  
  gameLoop()
}

// Example 2: Custom Bindings
function customBindings() {
  const inputManager = new InputManager()
  
  // Add custom action
  inputManager.addBinding({
    action: 'game.interact',
    key: 'e',
    contexts: ['game'],
    priority: 2
  })
  
  inputManager.on('game.interact', () => {
    console.log('Interacting with object')
  })
  
  // Add alternative binding for same action
  inputManager.addBinding({
    action: 'game.interact',
    key: 'Enter',
    contexts: ['game'],
    priority: 2
  })
}

// Example 3: Context Switching
function contextSwitching() {
  const inputManager = new InputManager()
  
  // Game context bindings
  inputManager.addBinding({
    action: 'game.attack',
    key: 'Space',
    contexts: ['game'],
    priority: 1
  })
  
  // UI context bindings
  inputManager.addBinding({
    action: 'ui.confirm',
    key: 'Space',
    contexts: ['ui'],
    priority: 1
  })
  
  // In game mode
  inputManager.setContext('game')
  // Space = attack
  
  // Open menu
  inputManager.setContext('ui')
  // Space = confirm
  
  // Back to game
  inputManager.setContext('game')
}

// Example 4: Mouse Input
function mouseInput() {
  const inputManager = new InputManager()
  const canvas = document.querySelector('canvas')!
  
  inputManager.setCanvas(canvas)
  
  function gameLoop() {
    inputManager.update()
    
    // Get mouse position
    const mousePos = inputManager.getMousePosition()
    console.log(`Mouse: ${mousePos.x}, ${mousePos.y}`)
    
    // Get mouse delta (for camera)
    const mouseDelta = inputManager.getMouseDelta()
    if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
      console.log(`Mouse moved: ${mouseDelta.x}, ${mouseDelta.y}`)
    }
    
    // Check mouse buttons
    if (inputManager.isMouseDown(0)) {
      console.log('Left mouse button held')
    }
    
    if (inputManager.isMousePressed(0)) {
      console.log('Left mouse button just pressed')
    }
    
    requestAnimationFrame(gameLoop)
  }
  
  gameLoop()
}

// Example 5: Pointer Lock (First-Person Camera)
function pointerLock() {
  const inputManager = new InputManager()
  const canvas = document.querySelector('canvas')!
  
  inputManager.setCanvas(canvas)
  
  // Request pointer lock on click
  canvas.addEventListener('click', () => {
    if (!inputManager.isPointerLocked()) {
      inputManager.requestPointerLock()
    }
  })
  
  function gameLoop() {
    inputManager.update()
    
    // Only use mouse delta when pointer is locked
    if (inputManager.isPointerLocked()) {
      const delta = inputManager.getMouseDelta()
      
      // Apply to camera rotation
      const sensitivity = 0.002
      const yaw = delta.x * sensitivity
      const pitch = delta.y * sensitivity
      
      console.log(`Camera rotation: yaw=${yaw}, pitch=${pitch}`)
    }
    
    requestAnimationFrame(gameLoop)
  }
  
  gameLoop()
}

// Example 6: Priority System
function prioritySystem() {
  const inputManager = new InputManager()
  
  // Low priority: movement
  inputManager.addBinding({
    action: 'camera.moveBackward',
    key: 's',
    contexts: ['game'],
    priority: 1
  })
  
  // High priority: save game (overrides movement)
  inputManager.addBinding({
    action: 'game.save',
    key: 's',
    contexts: ['game'],
    priority: 3
  })
  
  inputManager.on('camera.moveBackward', () => {
    console.log('Moving backward')
  })
  
  inputManager.on('game.save', () => {
    console.log('Saving game (higher priority)')
  })
  
  // When 'S' is pressed, only 'game.save' fires (higher priority)
}

// Example 7: Pressed vs Down vs Released
function inputStates() {
  const inputManager = new InputManager()
  
  function gameLoop() {
    inputManager.update()
    
    // isKeyPressed: true only on the first frame key is pressed
    if (inputManager.isKeyPressed('Space')) {
      console.log('Jump started!')
    }
    
    // isKeyDown: true every frame while key is held
    if (inputManager.isKeyDown('Space')) {
      console.log('Charging jump...')
    }
    
    // isKeyReleased: true only on the frame key is released
    if (inputManager.isKeyReleased('Space')) {
      console.log('Jump released!')
    }
    
    requestAnimationFrame(gameLoop)
  }
  
  gameLoop()
}

// Example 8: UI Blocking
function uiBlocking() {
  const inputManager = new InputManager()
  
  // When player opens chat/text input
  function openChat() {
    inputManager.setUIBlocking(true)
    // Game inputs are now ignored
  }
  
  // When player closes chat
  function closeChat() {
    inputManager.setUIBlocking(false)
    // Game inputs work again
  }
  
  inputManager.on('game.takePhoto', () => {
    // This won't fire when UI is blocking
    console.log('Photo taken')
  })
}

// Example 9: Multiple Callbacks for Same Action
function multipleCallbacks() {
  const inputManager = new InputManager()
  
  // Multiple systems can listen to same action
  inputManager.on('game.takePhoto', () => {
    console.log('System 1: Taking photo')
  })
  
  inputManager.on('game.takePhoto', () => {
    console.log('System 2: Playing camera sound')
  })
  
  inputManager.on('game.takePhoto', () => {
    console.log('System 3: Updating UI')
  })
  
  // All three callbacks fire when action is triggered
}

// Example 10: Cleanup
function cleanup() {
  const inputManager = new InputManager()
  
  const callback = () => {
    console.log('Action triggered')
  }
  
  // Register callback
  inputManager.on('game.takePhoto', callback)
  
  // Later, remove specific callback
  inputManager.off('game.takePhoto', callback)
  
  // Or remove all bindings for an action
  inputManager.removeBinding('game.takePhoto')
  
  // When done with input manager
  inputManager.dispose()
}

// Export examples
export {
  basicSetup,
  customBindings,
  contextSwitching,
  mouseInput,
  pointerLock,
  prioritySystem,
  inputStates,
  uiBlocking,
  multipleCallbacks,
  cleanup
}
