/**
 * Browser polyfills for WebRTC libraries
 * This file MUST be imported before any code that uses simple-peer
 */

import { Buffer } from 'buffer'
import process from 'process'
import { EventEmitter } from 'events'

// Set up global polyfills for browser environment
if (typeof window !== 'undefined') {
  // Buffer polyfill
  if (!(window as any).Buffer) {
    ;(window as any).Buffer = Buffer
  }

  // Process polyfill with nextTick support
  const processPolyfill = {
    ...process,
    browser: true,
    env: process.env || {},
    version: process.version || '',
    versions: process.versions || {},
    nextTick: (fn: Function, ...args: any[]) => {
      // Use queueMicrotask if available, otherwise Promise
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => fn(...args))
      } else {
        Promise.resolve().then(() => fn(...args))
      }
    },
  }

  ;(window as any).process = processPolyfill
  ;(window as any).global = window

  // EventEmitter polyfill
  if (!(window as any).EventEmitter) {
    ;(window as any).EventEmitter = EventEmitter
  }

  // Ensure global.process is also set
  if (!(window as any).global) {
    ;(window as any).global = window
  }
  if (!(window as any).global.process) {
    ;(window as any).global.process = processPolyfill
  }

  console.log('[Polyfills] Browser polyfills initialized')
}

export {}
