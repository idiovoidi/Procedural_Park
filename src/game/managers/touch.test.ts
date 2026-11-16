import { describe, expect, it } from 'vitest'
import { wantsTouchControls } from './TouchManager'

describe('wantsTouchControls', () => {
  it('follows the device by default', () => {
    expect(wantsTouchControls('', true)).toBe(true)
    expect(wantsTouchControls('', false)).toBe(false)
    expect(wantsTouchControls('?other=1', false)).toBe(false)
  })

  it('can be forced on or off from the address', () => {
    expect(wantsTouchControls('?touch=1', false)).toBe(true)
    expect(wantsTouchControls('?touch=0', true)).toBe(false)
    expect(wantsTouchControls('?x=2&touch=1', false)).toBe(true)
    expect(wantsTouchControls('?touch=maybe', true)).toBe(true) // anything else: the device decides
  })
})
