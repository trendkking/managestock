import type { Account, Holding, Trade } from '@/types'
import { computePortfolioSummary } from '@/lib/holdingsDisplay'
import { calcAccountStats } from '@/utils'

export function buildAccountWithStats(account: Account, holdings: Holding[], trades: Trade[]) {
  const accountHoldings = holdings.filter((h) => h.accountId === account.id)
  const accountTrades = trades.filter((t) => t.accountId === account.id)
  const computed = calcAccountStats(account, accountHoldings)
  const hasUs = accountHoldings.some((h) => h.marketType === 'us')
  const canComputeUsPnl = !hasUs || Boolean(account.usdKrwRate && account.usdKrwRate > 0)
  const holdingsSummary =
    account.holdingsSummary ??
    computePortfolioSummary(account.cashBalance, accountHoldings, account.usdKrwRate)

  return {
    ...account,
    currentValue: canComputeUsPnl ? computed.currentValue : (account.currentValue ?? computed.currentValue),
    profitLoss: canComputeUsPnl ? computed.profitLoss : (account.profitLoss ?? computed.profitLoss),
    returnRate: canComputeUsPnl ? computed.returnRate : (account.returnRate ?? computed.returnRate),
    holdings: accountHoldings,
    holdingsSummary,
    trades: accountTrades.sort((a, b) => b.tradedAt.localeCompare(a.tradedAt)),
  }
}
