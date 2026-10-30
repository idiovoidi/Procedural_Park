import { describe, expect, it, vi } from 'vitest'
import { CurrencyManager } from './CurrencyManager'
import { CURRENCY_REWARDS, calculatePhotoReward } from './currency-rewards'

describe('CurrencyManager', () => {
  it('starts with the given balance', () => {
    expect(new CurrencyManager(100).getBalance()).toBe(100)
  })

  it('adds money and ignores non-positive amounts', () => {
    const c = new CurrencyManager(0)
    c.addMoney(25)
    c.addMoney(0)
    c.addMoney(-5)
    expect(c.getBalance()).toBe(25)
  })

  it('refuses to overspend', () => {
    const c = new CurrencyManager(10)
    expect(c.removeMoney(11)).toBe(false)
    expect(c.getBalance()).toBe(10)
    expect(c.removeMoney(10)).toBe(true)
    expect(c.getBalance()).toBe(0)
  })

  it('purchase succeeds when affordable and reports the new balance', () => {
    const c = new CurrencyManager(50)
    const result = c.purchase(20, 'Berry')
    expect(result.success).toBe(true)
    expect(result.newBalance).toBe(30)
  })

  it('purchase fails when unaffordable or invalid, leaving the balance alone', () => {
    const c = new CurrencyManager(5)
    expect(c.purchase(20, 'Berry').success).toBe(false)
    expect(c.purchase(0, 'Berry').success).toBe(false)
    expect(c.getBalance()).toBe(5)
  })

  it('tracks totals earned and spent', () => {
    const c = new CurrencyManager(0)
    c.addMoney(30)
    c.addMoney(20)
    c.removeMoney(15)
    expect(c.getTotalEarned()).toBe(50)
    expect(c.getTotalSpent()).toBe(15)
    expect(c.getTransactionHistory(1)).toHaveLength(1)
  })

  it('notifies balance listeners', () => {
    const c = new CurrencyManager(0)
    const listener = vi.fn()
    c.onBalanceChange(listener)
    c.addMoney(10)
    expect(listener).toHaveBeenCalledWith(10)
  })
})

describe('calculatePhotoReward', () => {
  it('maps score thresholds to reward tiers', () => {
    expect(calculatePhotoReward(100)).toBe(CURRENCY_REWARDS.PHOTO_EXCELLENT)
    expect(calculatePhotoReward(80)).toBe(CURRENCY_REWARDS.PHOTO_EXCELLENT)
    expect(calculatePhotoReward(79)).toBe(CURRENCY_REWARDS.PHOTO_GREAT)
    expect(calculatePhotoReward(40)).toBe(CURRENCY_REWARDS.PHOTO_GOOD)
    expect(calculatePhotoReward(39)).toBe(CURRENCY_REWARDS.PHOTO_BASIC)
  })
})
