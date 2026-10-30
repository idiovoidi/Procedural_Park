import { describe, expect, it, vi } from 'vitest'
import { GameStateMachine } from './state-machine'

describe('GameStateMachine', () => {
  it('starts in the initial state', () => {
    expect(new GameStateMachine('loading').getState()).toBe('loading')
  })

  it('allows valid transitions and records history', () => {
    const sm = new GameStateMachine('loading')
    expect(sm.transition('playing')).toBe(true)
    expect(sm.getState()).toBe('playing')
    expect(sm.getPreviousState()).toBe('loading')
    expect(sm.getHistory()).toHaveLength(1)
  })

  it('rejects invalid transitions unless forced', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sm = new GameStateMachine('loading')
    expect(sm.transition('paused')).toBe(false)
    expect(sm.getState()).toBe('loading')
    expect(error).toHaveBeenCalled()
    expect(sm.transition('paused', true)).toBe(true)
  })

  it('rejects a transition to the current state', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sm = new GameStateMachine('playing')
    expect(sm.transition('playing')).toBe(false)
  })

  it('runs exit and enter callbacks with the neighbouring state', () => {
    const sm = new GameStateMachine('playing')
    const onExit = vi.fn()
    const onEnter = vi.fn()
    sm.registerState('playing', { onExit })
    sm.registerState('paused', { onEnter })
    sm.transition('paused')
    expect(onExit).toHaveBeenCalledWith('paused')
    expect(onEnter).toHaveBeenCalledWith('playing')
  })

  it('supports adding and removing transitions', () => {
    const sm = new GameStateMachine('photo_mode')
    expect(sm.isTransitionAllowed('photo_mode', 'paused')).toBe(false)
    sm.addTransition('photo_mode', 'paused')
    expect(sm.isTransitionAllowed('photo_mode', 'paused')).toBe(true)
    sm.removeTransition('photo_mode', 'paused')
    expect(sm.isTransitionAllowed('photo_mode', 'paused')).toBe(false)
  })
})
