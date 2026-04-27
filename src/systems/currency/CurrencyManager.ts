/**
 * Currency Manager
 * Manages in-game currency (play money) for purchases
 */

import { GAME_CONFIG } from '@core/constants'
import type { Currency, PurchaseResult, Transaction } from './types'

export class CurrencyManager {
  private currency: Currency
  private transactions: Transaction[] = []
  private readonly MAX_TRANSACTION_HISTORY = 100
  private onBalanceChangeCallbacks: Array<(balance: number) => void> = []

  constructor(startingAmount: number = GAME_CONFIG.STARTING_CURRENCY) {
    this.currency = {
      amount: startingAmount,
      displayName: 'Safari Coins',
      icon: '🪙',
    }
  }

  /**
   * Get current balance
   */
  public getBalance(): number {
    return this.currency.amount
  }

  /**
   * Get currency info
   */
  public getCurrency(): Currency {
    return { ...this.currency }
  }

  /**
   * Add money to balance
   */
  public addMoney(amount: number, reason: string = 'Unknown'): void {
    if (amount <= 0) return

    this.currency.amount += amount
    this.recordTransaction(amount, 'earn', reason)
    this.notifyBalanceChange()
  }

  /**
   * Remove money from balance
   */
  public removeMoney(amount: number, reason: string = 'Unknown'): boolean {
    if (amount <= 0 || amount > this.currency.amount) return false

    this.currency.amount -= amount
    this.recordTransaction(amount, 'spend', reason)
    this.notifyBalanceChange()
    return true
  }

  /**
   * Check if player can afford an amount
   */
  public canAfford(amount: number): boolean {
    return this.currency.amount >= amount
  }

  /**
   * Attempt to purchase something
   */
  public purchase(amount: number, itemName: string): PurchaseResult {
    if (amount <= 0) {
      return {
        success: false,
        message: 'Invalid purchase amount',
        newBalance: this.currency.amount,
      }
    }

    if (!this.canAfford(amount)) {
      return {
        success: false,
        message: `Not enough ${this.currency.displayName}! Need ${amount}, have ${this.currency.amount}`,
        newBalance: this.currency.amount,
      }
    }

    this.removeMoney(amount, `Purchased ${itemName}`)
    return {
      success: true,
      message: `Purchased ${itemName} for ${amount} ${this.currency.icon}`,
      newBalance: this.currency.amount,
    }
  }

  /**
   * Record a transaction
   */
  private recordTransaction(amount: number, type: 'earn' | 'spend', reason: string): void {
    this.transactions.push({
      amount,
      type,
      reason,
      timestamp: Date.now(),
    })

    if (this.transactions.length > this.MAX_TRANSACTION_HISTORY) {
      this.transactions.shift()
    }
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(limit?: number): Transaction[] {
    const history = [...this.transactions].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get total earned
   */
  public getTotalEarned(): number {
    return this.transactions.filter((t) => t.type === 'earn').reduce((sum, t) => sum + t.amount, 0)
  }

  /**
   * Get total spent
   */
  public getTotalSpent(): number {
    return this.transactions.filter((t) => t.type === 'spend').reduce((sum, t) => sum + t.amount, 0)
  }

  /**
   * Register callback for balance changes
   */
  public onBalanceChange(callback: (balance: number) => void): void {
    this.onBalanceChangeCallbacks.push(callback)
  }

  /**
   * Notify all callbacks of balance change
   */
  private notifyBalanceChange(): void {
    this.onBalanceChangeCallbacks.forEach((callback) => callback(this.currency.amount))
  }

  /**
   * Reset currency to starting amount
   */
  public reset(startingAmount: number = GAME_CONFIG.STARTING_CURRENCY): void {
    this.currency.amount = startingAmount
    this.transactions = []
    this.notifyBalanceChange()
  }

  /**
   * Set balance directly (for loading saves)
   */
  public setBalance(amount: number): void {
    this.currency.amount = Math.max(0, amount)
    this.notifyBalanceChange()
  }

  /**
   * Get formatted balance string
   */
  public getFormattedBalance(): string {
    return `${this.currency.icon} ${this.currency.amount}`
  }

  /**
   * Serialize for saving
   */
  public serialize(): { balance: number; transactions: Transaction[] } {
    return {
      balance: this.currency.amount,
      transactions: this.transactions,
    }
  }

  /**
   * Deserialize from save data
   */
  public deserialize(data: { balance: number; transactions: Transaction[] }): void {
    this.currency.amount = data.balance
    this.transactions = data.transactions
    this.notifyBalanceChange()
  }
}
