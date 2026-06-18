import type { Holding, HoldingsPortfolioSummary, MarketType } from '@/types'
import { formatCurrency, formatUsd } from '@/utils'

export function holdingCurrency(h: Pick<Holding, 'marketType' | 'currency'>): string {
  if (h.currency) return h.currency.toUpperCase()
  return h.marketType === 'us' ? 'USD' : 'KRW'
}

export function formatHoldingAmount(
  value: number,
  marketType?: MarketType,
  currency?: string,
): string {
  const c = currency?.toUpperCase() || (marketType === 'us' ? 'USD' : 'KRW')
  return c === 'USD' ? formatUsd(value) : formatCurrency(value)
}

export function computePortfolioSummary(
  cashBalance: number,
  holdings: Holding[],
  usdKrwRate?: number | null,
): HoldingsPortfolioSummary {
  const fx = usdKrwRate && usdKrwRate > 0 ? usdKrwRate : null
  let evalKrw = 0
  let purchaseKrw = 0
  let profitLoss = 0
  for (const h of holdings) {
    const cur = holdingCurrency(h)
    const purchase = h.purchaseAmount ?? h.quantity * h.avgPrice
    const evaluation = h.evaluationAmount ?? h.quantity * h.currentPrice
    const pnl =
      h.profitLoss ??
      evaluation - purchase
    if (cur === 'USD' && fx) {
      evalKrw += evaluation * fx
      purchaseKrw += purchase * fx
      profitLoss += pnl * fx
    } else if (cur !== 'USD' || fx) {
      evalKrw += evaluation
      purchaseKrw += purchase
      profitLoss += pnl
    }
  }
  const returnRate = purchaseKrw > 0 ? (profitLoss / purchaseKrw) * 100 : 0
  return {
    totalDeposit: cashBalance,
    totalAssets: cashBalance + evalKrw,
    evaluationAmount: evalKrw,
    purchaseAmount: purchaseKrw,
    profitLoss,
    returnRate,
  }
}

export function formatSummaryMoney(value: number): string {
  return formatCurrency(value)
}
