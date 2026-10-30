/**
 * Global test setup: quiet logging plus a minimal localStorage/window stub, so
 * pure-logic modules that touch browser storage or window timers run under Node.
 */
import { beforeEach } from 'vitest'
import { log } from '../src/core/utils/logger'

log.setLevel('error')

class MemoryStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }
  clear(): void {
    this.data.clear()
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
Object.defineProperty(globalThis, 'window', {
  value: { setInterval, clearInterval },
  configurable: true,
})

beforeEach(() => {
  storage.clear()
})
