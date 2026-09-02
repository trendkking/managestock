import type { ChartPricePoint } from '@/lib/journalStockChart'

export type BasePointKind = 'hbp' | 'lbp'

export type BasePoint = {
  kind: BasePointKind
  date: string
  price: number
  index: number
}

export type BasePointVisibility = {
  hbp: boolean
  lbp: boolean
}

const DEFAULT_COUNT = 3

function candleHigh(point: ChartPricePoint): number {
  return point.high ?? Math.max(point.open ?? point.close, point.close)
}

function candleLow(point: ChartPricePoint): number {
  return point.low ?? Math.min(point.open ?? point.close, point.close)
}

/** 상승카운팅: 이번 고점 >= 직전 고점 */
function isRisingCount(curr: ChartPricePoint, prev: ChartPricePoint): boolean {
  return candleHigh(curr) >= candleHigh(prev)
}

/** 하락카운팅: 이번 저점 <= 직전 저점 */
function isFallingCount(curr: ChartPricePoint, prev: ChartPricePoint): boolean {
  return candleLow(curr) <= candleLow(prev)
}

/** 자기 포함 좌측으로 연속 상승카운팅 n회 */
function hasLeftRisingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index < count) return false
  for (let k = 0; k < count; k += 1) {
    const at = index - k
    if (!isRisingCount(data[at], data[at - 1])) return false
  }
  return true
}

/** 자기 포함 좌측으로 연속 하락카운팅 n회 */
function hasLeftFallingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index < count) return false
  for (let k = 0; k < count; k += 1) {
    const at = index - k
    if (!isFallingCount(data[at], data[at - 1])) return false
  }
  return true
}

/** 우측으로 연속 하락카운팅 n회 (자기 다음부터) */
function hasRightFallingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index + count >= data.length) return false
  for (let k = 1; k <= count; k += 1) {
    if (!isFallingCount(data[index + k], data[index + k - 1])) return false
  }
  return true
}

/** 우측으로 연속 상승카운팅 n회 (자기 다음부터) */
function hasRightRisingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index + count >= data.length) return false
  for (let k = 1; k <= count; k += 1) {
    if (!isRisingCount(data[index + k], data[index + k - 1])) return false
  }
  return true
}

/**
 * High Base Point: 좌측(자기 포함) 상승카운팅 n + 우측 하락카운팅 n
 * Low Base Point: 좌측(자기 포함) 하락카운팅 n + 우측 상승카운팅 n
 */
export function findBasePoints(
  data: ChartPricePoint[],
  count: number = DEFAULT_COUNT,
): BasePoint[] {
  if (data.length < count * 2 + 1) return []

  const points: BasePoint[] = []

  for (let i = count; i < data.length - count; i += 1) {
    const candle = data[i]
    if (hasLeftRisingCounts(data, i, count) && hasRightFallingCounts(data, i, count)) {
      points.push({
        kind: 'hbp',
        date: candle.date,
        price: candleHigh(candle),
        index: i,
      })
    }
    if (hasLeftFallingCounts(data, i, count) && hasRightRisingCounts(data, i, count)) {
      points.push({
        kind: 'lbp',
        date: candle.date,
        price: candleLow(candle),
        index: i,
      })
    }
  }

  return points
}

export function filterBasePointsByDates(
  points: BasePoint[],
  dates: ReadonlySet<string>,
): BasePoint[] {
  return points.filter((p) => dates.has(p.date))
}

export function filterBasePointsByVisibility(
  points: BasePoint[],
  visibility: BasePointVisibility,
): BasePoint[] {
  return points.filter((p) => (p.kind === 'hbp' ? visibility.hbp : visibility.lbp))
}
