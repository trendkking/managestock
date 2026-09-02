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
 * HBP: 상승카운팅이 3 형성된 뒤, 우측에서 하락카운팅 3이 형성될 때 확정.
 * - 상승 미충족 = 멈춰진 시간 (카운트 유지)
 * - 상승 3 이후 고점 재갱신 시 후보를 그 봉으로 이동
 * - 하락 3 확정 시에만 HBP 1개 생성 후 리셋
 */
function findHighBasePoints(data: ChartPricePoint[], count: number): BasePoint[] {
  const points: BasePoint[] = []
  let rising = 0
  let candidate: number | null = null
  let falling = 0

  for (let i = 1; i < data.length; i += 1) {
    const up = isRisingCount(data[i], data[i - 1])
    const down = isFallingCount(data[i], data[i - 1])

    if (candidate === null) {
      if (up) {
        rising += 1
        if (rising === count) {
          candidate = i
          falling = 0
        }
      }
      // 멈춰진 시간: rising 유지
      continue
    }

    // 상승 3 형성 후 — 정점 갱신 또는 하락 카운팅
    if (up) {
      candidate = i
      falling = 0
      continue
    }

    if (down) {
      falling += 1
      if (falling === count) {
        const candle = data[candidate]
        points.push({
          kind: 'hbp',
          date: candle.date,
          price: candleHigh(candle),
          index: candidate,
        })
        rising = 0
        candidate = null
        falling = 0
      }
      continue
    }

    // 멈춰진 시간: candidate·falling 유지
  }

  return points
}

/**
 * LBP: 하락카운팅이 3 형성된 뒤, 우측에서 상승카운팅 3이 형성될 때 확정.
 */
function findLowBasePoints(data: ChartPricePoint[], count: number): BasePoint[] {
  const points: BasePoint[] = []
  let falling = 0
  let candidate: number | null = null
  let rising = 0

  for (let i = 1; i < data.length; i += 1) {
    const up = isRisingCount(data[i], data[i - 1])
    const down = isFallingCount(data[i], data[i - 1])

    if (candidate === null) {
      if (down) {
        falling += 1
        if (falling === count) {
          candidate = i
          rising = 0
        }
      }
      continue
    }

    if (down) {
      candidate = i
      rising = 0
      continue
    }

    if (up) {
      rising += 1
      if (rising === count) {
        const candle = data[candidate]
        points.push({
          kind: 'lbp',
          date: candle.date,
          price: candleLow(candle),
          index: candidate,
        })
        falling = 0
        candidate = null
        rising = 0
      }
      continue
    }
  }

  return points
}

/**
 * High Base Point: 좌측 상승 3 형성 + 우측 하락 3 형성 시에만
 * Low Base Point: 좌측 하락 3 형성 + 우측 상승 3 형성 시에만
 */
export function findBasePoints(
  data: ChartPricePoint[],
  count: number = DEFAULT_COUNT,
): BasePoint[] {
  if (data.length < 2) return []

  const points = [...findHighBasePoints(data, count), ...findLowBasePoints(data, count)]
  points.sort((a, b) => a.index - b.index || a.kind.localeCompare(b.kind))
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
