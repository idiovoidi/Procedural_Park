import { afterEach, describe, expect, it, vi } from 'vitest'
import { log } from './logger'

describe('log', () => {
  afterEach(() => {
    log.setLevel('error')
  })

  it('suppresses output below the minimum level', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    log.setLevel('warn')
    log.debug('hidden')
    log.warn('shown')

    expect(debug).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('shown')
  })

  it('emits debug output at the debug level', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    log.setLevel('debug')
    log.debug('a', 1)
    expect(debug).toHaveBeenCalledWith('a', 1)
  })

  it('always emits errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    log.setLevel('error')
    log.error('boom')
    expect(error).toHaveBeenCalledWith('boom')
  })
})
