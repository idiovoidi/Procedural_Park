/**
 * Browser polyfills for WebRTC libraries
 * This file MUST be imported before any code that uses simple-peer
 */

import { Buffer } from 'buffer'
import { EventEmitter } from 'events'
import process from 'process'

// biome-ignore lint/suspicious/noExplicitAny: Polyfills require any for global modifications
type GlobalWindow = Window & typeof globalThis & Record<string, unknown>

// Set up global polyfills for browser environment
if (typeof window !== 'undefined') {
  const win = window as GlobalWindow

  // Buffer polyfill
  if (!win.Buffer) {
    win.Buffer = Buffer as unknown as typeof win.Buffer
  }

  // Process polyfill with nextTick support
  const processPolyfill = {
    ...process,
    browser: true,
    env: process.env || {},
    version: process.version || '',
    versions: process.versions || {},
    // biome-ignore lint/complexity/noBannedTypes: Polyfill requires Function type
    nextTick: (fn: (...args: unknown[]) => void, ...args: unknown[]) => {
      // Use queueMicrotask if available, otherwise Promise
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => fn(...args))
      } else {
        Promise.resolve().then(() => fn(...args))
      }
    },
  }

  win.process = processPolyfill as unknown as typeof win.process
  win.global = window

  // EventEmitter polyfill
  if (!win.EventEmitter) {
    win.EventEmitter = EventEmitter as unknown as typeof win.EventEmitter
  }

  // Ensure global.process is also set
  if (!win.global) {
    win.global = window
  }
  const globalWin = win.global as GlobalWindow
  if (!globalWin.process) {
    globalWin.process = processPolyfill as unknown as typeof globalWin.process
  }

  console.log('[Polyfills] Browser polyfills initialized')
}
