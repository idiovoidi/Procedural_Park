import { describe, it } from 'vitest'
import { formatReport, runSim } from './sim'

// Run with: BALANCE_REPORT=1 npx vitest run src/systems/balance/report.test.ts
describe.skipIf(!process.env.BALANCE_REPORT)('balance report', () => {
  it('prints the baseline economy', () => {
    console.log(formatReport('baseline bot, sell everything', runSim({ minutes: 240 })))
    console.log(
      formatReport('drip-selling bot', runSim({ minutes: 240, policy: { selling: 'drip' } }))
    )
    console.log(formatReport('no breeding', runSim({ minutes: 240, policy: { breeds: false } })))
  })
})
