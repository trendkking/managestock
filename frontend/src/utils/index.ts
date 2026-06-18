import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, decimals?: number): string {
  if (decimals != null && decimals > 0) {
    return `₩${value.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }
  return `₩${Math.round(value).toLocaleString('ko-KR')}`
}

export function formatSignedCurrency(value: number, decimals?: number): string {
  if (value === 0) return formatCurrency(0, decimals)
  const sign = value > 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(value), decimals)}`
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** 국내: 원(₩), 미국: 달러($) — API 단가 그대로 표시 */
export function formatHoldingMoney(value: number, marketType?: string): string {
  return marketType === 'us' ? formatUsd(value) : formatCurrency(value)
}

export function formatPercent(value: number, showSign = true): string {
  const formatted = `${Math.abs(value).toFixed(2)}%`
  if (!showSign || value === 0) return value === 0 ? '0.00%' : formatted
  return value > 0 ? `+${formatted}` : `-${formatted}`
}

export function percentColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-slate-500'
}

/** 국내 증권 HTS 관례: 이익=빨강, 손실=파랑 */
export function stockPnlColor(value: number): string {
  if (value > 0) return 'text-red-600'
  if (value < 0) return 'text-blue-600'
  return 'text-slate-500'
}

export function formatStockPnl(value: number, decimals?: number): string {
  if (value === 0) return formatCurrency(0, decimals)
  return formatSignedCurrency(value, decimals)
}

function holdingUnrealizedPnlKrw(
  h: {
    quantity: number
    avgPrice: number
    currentPrice: number
    marketType?: string
    profitLoss?: number
    purchaseAmount?: number
    evaluationAmount?: number
  },
  fx: number | null,
): number {
  const purchase = h.purchaseAmount ?? h.quantity * h.avgPrice
  const evaluation = h.evaluationAmount ?? h.quantity * h.currentPrice
  let pnl = h.profitLoss ?? evaluation - purchase
  if (h.marketType === 'us') {
    if (!fx) return 0
    pnl *= fx
  }
  return pnl
}

export function calcAccountStats(
  account: { initialCapital: number; cashBalance: number; usdKrwRate?: number | null },
  holdings: { quantity: number; avgPrice: number; currentPrice: number; marketType?: string }[],
) {
  const fx = account.usdKrwRate && account.usdKrwRate > 0 ? account.usdKrwRate : null
  const holdingsValue = holdings.reduce((sum, h) => {
    const line = h.quantity * h.currentPrice
    if (h.marketType === 'us' && fx) return sum + line * fx
    return sum + line
  }, 0)
  const currentValue = account.cashBalance + holdingsValue
  const profitLoss = holdings.reduce((sum, h) => sum + holdingUnrealizedPnlKrw(h, fx), 0)
  const costBasis = holdingsValue - profitLoss
  const returnRate = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
  return { currentValue, profitLoss, returnRate, holdingsValue }
}

export function calcHoldingPnl(holding: { quantity: number; avgPrice: number; currentPrice: number }) {
  const value = holding.quantity * holding.currentPrice
  const cost = holding.quantity * holding.avgPrice
  const pnl = value - cost
  const returnRate = cost > 0 ? (pnl / cost) * 100 : 0
  return { pnl, returnRate, value }
}

export function truncate(text: string, length: number): string {
  const plain = text.replace(/[#*`>\-\n]/g, ' ').trim()
  return plain.length > length ? `${plain.slice(0, length)}...` : plain
}

export function generateId(items: { id: number }[]): number {
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1
}
