/**
 * Leveled logger. Debug/info output is suppressed in production builds.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

let minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn'

export const log = {
  setLevel(level: LogLevel): void {
    minLevel = level
  },
  getLevel(): LogLevel {
    return minLevel
  },
  debug(...args: unknown[]): void {
    if (LEVEL_ORDER[minLevel] <= LEVEL_ORDER.debug) console.debug(...args)
  },
  info(...args: unknown[]): void {
    if (LEVEL_ORDER[minLevel] <= LEVEL_ORDER.info) console.info(...args)
  },
  warn(...args: unknown[]): void {
    if (LEVEL_ORDER[minLevel] <= LEVEL_ORDER.warn) console.warn(...args)
  },
  error(...args: unknown[]): void {
    console.error(...args)
  },
}
