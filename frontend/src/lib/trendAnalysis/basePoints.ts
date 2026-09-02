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

/**
 * 멈춰진 시간: 카운트 조건 미충족 봉은 건너뜀 (리셋하지 않음).
 * 자기 포함 좌측에서 상승카운팅 n회를 모은다.
 */
function hasLeftRisingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index < 1) return false
  if (!isRisingCount(data[index], data[index - 1])) return false

  let found = 0
  for (let j = index; j >= 1 && found < count; j -= 1) {
    if (isRisingCount(data[j], data[j - 1])) found += 1
  }
  return found === count
}

/** 자기 포함 좌측에서 하락카운팅 n회 (멈춰진 시간 스킵) */
function hasLeftFallingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  if (index < 1) return false
  if (!isFallingCount(data[index], data[index - 1])) return false

  let found = 0
  for (let j = index; j >= 1 && found < count; j -= 1) {
    if (isFallingCount(data[j], data[j - 1])) found += 1
  }
  return found === count
}

/** 우측(자기 다음부터) 하락카운팅 n회 (멈춰진 시간 스킵) */
function hasRightFallingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  let found = 0
  for (let j = index + 1; j < data.length && found < count; j += 1) {
    if (isFallingCount(data[j], data[j - 1])) found += 1
  }
  return found === count
}

/** 우측(자기 다음부터) 상승카운팅 n회 (멈춰진 시간 스킵) */
function hasRightRisingCounts(data: ChartPricePoint[], index: number, count: number): boolean {
  let found = 0
  for (let j = index + 1; j < data.length && found < count; j += 1) {
    if (isRisingCount(data[j], data[j - 1])) found += 1
  }
  return found === count
}

/**
 * High Base Point: 좌측(자기 포함) 상승카운팅 n + 우측 하락카운팅 n
 * Low Base Point: 좌측(자기 포함) 하락카운팅 n + 우측 상승카운팅 n
 * 카운트 사이에 멈춰진 시간(미충족 봉)이 있어도 됨
 */
export function findBasePoints(
  data: ChartPricePoint[],
  count: number = DEFAULT_COUNT,
): BasePoint[] {
  if (data.length < 2) return []

  const points: BasePoint[] = []

  for (let i = 1; i < data.length - 1; i += 1) {
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
