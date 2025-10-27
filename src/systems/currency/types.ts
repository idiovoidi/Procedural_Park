/**
 * Currency System Types
 */

export interface Currency {
  amount: number
  displayName: string
  icon: string
}

export interface Transaction {
  amount: number
  type: 'earn' | 'spend'
  reason: string
  timestamp: number
}

export interface PurchaseResult {
  success: boolean
  message: string
  newBalance: number
}
