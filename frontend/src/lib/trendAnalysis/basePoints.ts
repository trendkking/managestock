import type { ChartPricePoint } from '@/lib/journalStockChart'

export type BasePointKind = 'hbp' | 'lbp'

export type BasePoint = {
  kind: BasePointKind
  date: string
  price: number
  index: number
}

/** 상승/하락 카운팅 숫자 (1~3) */
export type CountMark = {
  direction: 'rising' | 'falling'
  source: BasePointKind
  count: number
  date: string
  price: number
  index: number
}

export type BasePointVisibility = {
  hbp: boolean
  lbp: boolean
}

export type BasePointAnalysis = {
  points: BasePoint[]
  countMarks: CountMark[]
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

function pushRisingMarks(
  marks: CountMark[],
  data: ChartPricePoint[],
  indexes: number[],
  source: BasePointKind,
) {
  indexes.forEach((index, offset) => {
    const candle = data[index]
    if (!candle) return
    marks.push({
      direction: 'rising',
      source,
      count: offset + 1,
      date: candle.date,
      price: candleHigh(candle),
      index,
    })
  })
}

function pushFallingMarks(
  marks: CountMark[],
  data: ChartPricePoint[],
  indexes: number[],
  source: BasePointKind,
) {
  indexes.forEach((index, offset) => {
    const candle = data[index]
    if (!candle) return
    marks.push({
      direction: 'falling',
      source,
      count: offset + 1,
      date: candle.date,
      price: candleLow(candle),
      index,
    })
  })
}

/**
 * HBP:
 * - 상승카운팅 1→2→3 (3에서 끝, 이후 상승은 카운트/후보 이동 없음)
 * - 상승 3 형성과 동시에 하락카운팅 시작 (같은 봉이 하락조건이면 1, 아니면 다음 봉부터)
 * - 하락 3 형성 시 HBP 확정
 */
function findHighBasePoints(data: ChartPricePoint[], count: number): BasePointAnalysis {
  const points: BasePoint[] = []
  const countMarks: CountMark[] = []
  let rising = 0
  let risingIndexes: number[] = []
  let candidate: number | null = null
  let falling = 0
  let fallingIndexes: number[] = []

  const flushInProgress = () => {
    if (risingIndexes.length > 0) pushRisingMarks(countMarks, data, risingIndexes, 'hbp')
    if (fallingIndexes.length > 0) pushFallingMarks(countMarks, data, fallingIndexes, 'hbp')
  }

  const confirmHbp = () => {
    if (candidate == null || fallingIndexes.length < count) return
    const candle = data[candidate]
    points.push({
      kind: 'hbp',
      date: candle.date,
      price: candleHigh(candle),
      index: candidate,
    })
    pushRisingMarks(countMarks, data, risingIndexes, 'hbp')
    pushFallingMarks(countMarks, data, fallingIndexes, 'hbp')
    rising = 0
    risingIndexes = []
    candidate = null
    falling = 0
    fallingIndexes = []
  }

  /** 하락카운팅 1건 반영. 3 되면 HBP 확정 */
  const applyFalling = (index: number) => {
    if (falling >= count) return
    falling += 1
    fallingIndexes.push(index)
    if (falling === count) confirmHbp()
  }

  for (let i = 1; i < data.length; i += 1) {
    const up = isRisingCount(data[i], data[i - 1])
    const down = isFallingCount(data[i], data[i - 1])

    if (candidate === null) {
      if (up) {
        rising += 1
        if (rising <= count) risingIndexes.push(i)
        if (rising === count) {
          // 상승 3에서 끝 → 후보 고정, 동시에 하락카운팅 시작
          candidate = i
          falling = 0
          fallingIndexes = []
          if (down) applyFalling(i)
        }
      }
      // 멈춰진 시간: rising 유지
      continue
    }

    // 상승 3 이후: 더 이상 상승카운트/후보 이동 없음. 하락만 센다.
    if (down) {
      applyFalling(i)
      continue
    }

    // 멈춰진 시간 (하락 미충족): falling 유지
  }

  flushInProgress()
  return { points, countMarks }
}

/**
 * LBP:
 * - 하락카운팅 1→2→3 (3에서 끝)
 * - 하락 3 형성과 동시에 상승카운팅 시작
 * - 상승 3 형성 시 LBP 확정
 */
function findLowBasePoints(data: ChartPricePoint[], count: number): BasePointAnalysis {
  const points: BasePoint[] = []
  const countMarks: CountMark[] = []
  let falling = 0
  let fallingIndexes: number[] = []
  let candidate: number | null = null
  let rising = 0
  let risingIndexes: number[] = []

  const flushInProgress = () => {
    if (fallingIndexes.length > 0) pushFallingMarks(countMarks, data, fallingIndexes, 'lbp')
    if (risingIndexes.length > 0) pushRisingMarks(countMarks, data, risingIndexes, 'lbp')
  }

  const confirmLbp = () => {
    if (candidate == null || risingIndexes.length < count) return
    const candle = data[candidate]
    points.push({
      kind: 'lbp',
      date: candle.date,
      price: candleLow(candle),
      index: candidate,
    })
    pushFallingMarks(countMarks, data, fallingIndexes, 'lbp')
    pushRisingMarks(countMarks, data, risingIndexes, 'lbp')
    falling = 0
    fallingIndexes = []
    candidate = null
    rising = 0
    risingIndexes = []
  }

  const applyRising = (index: number) => {
    if (rising >= count) return
    rising += 1
    risingIndexes.push(index)
    if (rising === count) confirmLbp()
  }

  for (let i = 1; i < data.length; i += 1) {
    const up = isRisingCount(data[i], data[i - 1])
    const down = isFallingCount(data[i], data[i - 1])

    if (candidate === null) {
      if (down) {
        falling += 1
        if (falling <= count) fallingIndexes.push(i)
        if (falling === count) {
          candidate = i
          rising = 0
          risingIndexes = []
          if (up) applyRising(i)
        }
      }
      continue
    }

    // 하락 3 이후: 상승만 센다
    if (up) {
      applyRising(i)
      continue
    }
  }

  flushInProgress()
  return { points, countMarks }
}

export function findBasePoints(
  data: ChartPricePoint[],
  count: number = DEFAULT_COUNT,
): BasePointAnalysis {
  if (data.length < 2) return { points: [], countMarks: [] }

  const high = findHighBasePoints(data, count)
  const low = findLowBasePoints(data, count)
  const points = [...high.points, ...low.points].sort(
    (a, b) => a.index - b.index || a.kind.localeCompare(b.kind),
  )

  const markKey = (m: CountMark) => `${m.date}|${m.direction}|${m.count}`
  const countMarks: CountMark[] = []
  const seen = new Set<string>()
  for (const mark of [...high.countMarks, ...low.countMarks]) {
    const key = markKey(mark)
    if (seen.has(key)) continue
    seen.add(key)
    countMarks.push(mark)
  }
  countMarks.sort(
    (a, b) => a.index - b.index || a.direction.localeCompare(b.direction) || a.count - b.count,
  )

  return { points, countMarks }
}

export function filterBasePointsByDates(
  points: BasePoint[],
  dates: ReadonlySet<string>,
): BasePoint[] {
  return points.filter((p) => dates.has(p.date))
}

export function filterCountMarksByDates(
  marks: CountMark[],
  dates: ReadonlySet<string>,
): CountMark[] {
  return marks.filter((m) => dates.has(m.date))
}

export function filterBasePointsByVisibility(
  points: BasePoint[],
  visibility: BasePointVisibility,
): BasePoint[] {
  return points.filter((p) => (p.kind === 'hbp' ? visibility.hbp : visibility.lbp))
}

export function filterCountMarksByVisibility(
  marks: CountMark[],
  visibility: BasePointVisibility,
): CountMark[] {
  return marks.filter((m) => (m.source === 'hbp' ? visibility.hbp : visibility.lbp))
}
