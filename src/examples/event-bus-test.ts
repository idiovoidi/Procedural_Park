/**
 * Event Bus Test - Quick verification that the event bus works correctly
 * Run this in the browser console to test functionality
 */

import { EventBus } from '@game/EventBus'

export function runEventBusTests(): void {
  console.log('🧪 Running Event Bus Tests...\n')

  // Test 1: Basic emit and subscribe
  console.log('Test 1: Basic emit and subscribe')
  let test1Result = ''
  EventBus.on('photoTaken', (data) => {
    test1Result = `Photo: ${data.creature}, Score: ${data.score}`
  })
  EventBus.emit('photoTaken', { score: 85, creature: 'Deer', dataUrl: 'test' })
  console.log(test1Result === 'Photo: Deer, Score: 85' ? '✅ PASS' : '❌ FAIL')
  console.log(`   Result: ${test1Result}\n`)

  // Test 2: Multiple subscribers
  console.log('Test 2: Multiple subscribers')
  let test2Count = 0
  const handler1 = () => test2Count++
  const handler2 = () => test2Count++
  const handler3 = () => test2Count++
  EventBus.on('gameStarted', handler1)
  EventBus.on('gameStarted', handler2)
  EventBus.on('gameStarted', handler3)
  EventBus.emit('gameStarted', undefined)
  console.log(test2Count === 3 ? '✅ PASS' : '❌ FAIL')
  console.log(`   Handlers called: ${test2Count}\n`)

  // Test 3: Unsubscribe
  console.log('Test 3: Unsubscribe')
  let test3Count = 0
  const test3Handler = () => test3Count++
  EventBus.on('gamePaused', test3Handler)
  EventBus.emit('gamePaused', undefined)
  EventBus.off('gamePaused', test3Handler)
  EventBus.emit('gamePaused', undefined)
  console.log(test3Count === 1 ? '✅ PASS' : '❌ FAIL')
  console.log(`   Handler called: ${test3Count} times (expected 1)\n`)

  // Test 4: Once handler
  console.log('Test 4: Once handler')
  let test4Count = 0
  EventBus.once('gameResumed', () => test4Count++)
  EventBus.emit('gameResumed', undefined)
  EventBus.emit('gameResumed', undefined)
  EventBus.emit('gameResumed', undefined)
  console.log(test4Count === 1 ? '✅ PASS' : '❌ FAIL')
  console.log(`   Handler called: ${test4Count} times (expected 1)\n`)

  // Test 5: Error handling
  console.log('Test 5: Error handling (should not crash)')
  let test5Success = false
  EventBus.on('rideRestarted', () => {
    throw new Error('Test error')
  })
  EventBus.on('rideRestarted', () => {
    test5Success = true
  })
  EventBus.emit('rideRestarted', undefined)
  console.log(test5Success ? '✅ PASS' : '❌ FAIL')
  console.log(`   Second handler executed despite first handler error\n`)

  // Test 6: Type safety
  console.log('Test 6: Type safety')
  EventBus.on('cameraModeSwitched', (data) => {
    // TypeScript should autocomplete data.mode
    console.log(`   Camera mode: ${data.mode}`)
  })
  EventBus.emit('cameraModeSwitched', { mode: 'free' })
  console.log('✅ PASS (check TypeScript autocomplete)\n')

  // Test 7: Handler count
  console.log('Test 7: Handler count')
  EventBus.clear('photoTaken')
  EventBus.on('photoTaken', () => {})
  EventBus.on('photoTaken', () => {})
  EventBus.on('photoTaken', () => {})
  const count = EventBus.getHandlerCount('photoTaken')
  console.log(count === 3 ? '✅ PASS' : '❌ FAIL')
  console.log(`   Handler count: ${count}\n`)

  // Test 8: Clear all
  console.log('Test 8: Clear all')
  EventBus.clearAll()
  const events = EventBus.getRegisteredEvents()
  console.log(events.length === 0 ? '✅ PASS' : '❌ FAIL')
  console.log(`   Registered events: ${events.length}\n`)

  // Test 9: Debug info
  console.log('Test 9: Debug info')
  EventBus.on('photoTaken', () => {})
  EventBus.on('gameStarted', () => {})
  const debugInfo = EventBus.getDebugInfo()
  console.log(debugInfo.length === 2 ? '✅ PASS' : '❌ FAIL')
  console.log('   Debug info:', debugInfo, '\n')

  // Cleanup
  EventBus.clearAll()
  console.log('✨ All tests complete!')
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  ;(window as any).testEventBus = runEventBusTests
  console.log('💡 Run testEventBus() in console to test the Event Bus')
}
