import { format, subMonths, subYears } from 'date-fns'
import type { Trade } from '@/types'

const kstDateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })

export type TradePeriodPreset = 'all' | '1m' | '3m' | '1y' | 'custom'

export interface TradeDateRange {
  from?: string
  to?: string
}

export interface TradeLedgerRow {
  no: number | null
  date: string | null
  stockName: string | null
  /** 해당 매도 건에서 확정된 손익 (증권사 실현손익) */
  sellPnl: number | null
  cumulativePnl: number
  tradeId?: number
}

export function tradeSide(trade: Trade): string {
  const t = trade as Trade & { trade_type?: string }
  return (t.tradeType ?? t.trade_type ?? '').toLowerCase()
}

export function tradeDateOnly(tradedAt: string): string {
  return kstDateFormatter.format(new Date(tradedAt))
}

export function isTradeInRange(tradedAt: string, range?: TradeDateRange): boolean {
  if (!range?.from && !range?.to) return true
  const d = tradeDateOnly(tradedAt)
  if (range.from && d < range.from) return false
  if (range.to && d > range.to) return false
  return true
}

export function todayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function rangeForPreset(
  preset: TradePeriodPreset,
  customFrom?: string,
  customTo?: string,
): TradeDateRange {
  const to = customTo || todayDateString()
  if (preset === '1m') {
    return { from: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), to }
  }
  if (preset === '3m') {
    return { from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), to }
  }
  if (preset === '1y' || preset === 'all') {
    return { from: format(subYears(new Date(), 1), 'yyyy-MM-dd'), to }
  }
  if (preset === 'custom') {
    return { from: customFrom || undefined, to: customTo || to }
  }
  return { from: format(subYears(new Date(), 1), 'yyyy-MM-dd'), to }
}

/** API 체결 조회용 — from/to 필수 */
export function resolveImportRange(
  preset: TradePeriodPreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const range = rangeForPreset(preset, customFrom, customTo)
  const to = range.to || todayDateString()
  const from = range.from || format(subYears(new Date(), 1), 'yyyy-MM-dd')
  return { from, to }
}

/** API 연동 계좌 — 탭 진입 시 한 번 불러올 기본 구간(최근 1개월) */
export function defaultBrokerImportRange(): { from: string; to: string } {
  return resolveImportRange('1m')
}

export function rangeIsWithin(
  inner: { from: string; to: string },
  outer: { from: string; to: string },
): boolean {
  return inner.from >= outer.from && inner.to <= outer.to
}

export function formatRangeLabel(range: TradeDateRange): string {
  if (!range.from && !range.to) return '전체 기간'
  if (range.from && range.to) return `${range.from} ~ ${range.to}`
  if (range.from) return `${range.from} ~`
  return `~ ${range.to}`
}

/** 매도 내역: 종목별 매도 확정 손익, 기간 내 누적 = 매도 손익 합 */
export function buildTradesLedger(trades: Trade[], range?: TradeDateRange): TradeLedgerRow[] {
  const sells = trades
    .filter((t) => tradeSide(t) === 'sell')
    .filter((t) => isTradeInRange(t.tradedAt, range))
    .sort((a, b) => a.tradedAt.localeCompare(b.tradedAt))

  const rows: TradeLedgerRow[] = [
    { no: null, date: null, stockName: null, sellPnl: null, cumulativePnl: 0 },
  ]

  let cumulative = 0
  sells.forEach((t, index) => {
    const sellPnl = t.realizedPnl ?? null
    if (sellPnl != null) cumulative += sellPnl
    rows.push({
      no: index + 1,
      date: tradeDateOnly(t.tradedAt),
      stockName: t.stockName,
      sellPnl,
      cumulativePnl: cumulative,
      tradeId: t.id,
    })
  })

  return rows
}

export interface TradePnlChartPoint {
  /** ComposedChart X축 — 매도 건마다 고유 */
  xKey: string
  /** 가로 축 표시 (동일 종목은 삼성전자, 테슬라_2 형태) */
  label: string
  stockName: string
  date: string
  tradePnl: number
  tradePnlKnown: boolean
  cumulativePnl: number
  tradeId: number
}

/** 동일 종목이 여러 번 매도되면 Excel처럼 두 번째부터 종목_2 */
export function stockChartLabel(stockName: string, indexAmongSells: number, allStockNames: string[]): string {
  const total = allStockNames.filter((n) => n === stockName).length
  if (total <= 1) return stockName
  const nth = allStockNames.slice(0, indexAmongSells + 1).filter((n) => n === stockName).length
  return nth === 1 ? stockName : `${stockName}_${nth}`
}

/** 매매손익(막대) + 누적운용손익(선) 차트용 — 매도 체결 순 */
export function buildTradePnlChartPoints(trades: Trade[], range?: TradeDateRange): TradePnlChartPoint[] {
  const sells = trades
    .filter((t) => tradeSide(t) === 'sell')
    .filter((t) => isTradeInRange(t.tradedAt, range))
    .sort((a, b) => a.tradedAt.localeCompare(b.tradedAt))

  const stockNames = sells.map((t) => t.stockName)
  let cumulative = 0

  return sells.map((t, index) => {
    const sellPnl = t.realizedPnl ?? null
    if (sellPnl != null) cumulative += sellPnl
    return {
      xKey: `trade-${t.id}`,
      label: stockChartLabel(t.stockName, index, stockNames),
      stockName: t.stockName,
      date: tradeDateOnly(t.tradedAt),
      tradePnl: sellPnl ?? 0,
      tradePnlKnown: sellPnl != null,
      cumulativePnl: cumulative,
      tradeId: t.id,
    }
  })
}
