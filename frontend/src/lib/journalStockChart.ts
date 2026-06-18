import { eachDayOfInterval, format, isWeekend, subMonths } from 'date-fns'

export interface DailyPricePoint {
  date: string
  open?: number
  close: number
  high?: number
  low?: number
}

function hashSeed(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0
  }
  return h
}

/** 실제 시세 연동 전 — 종목별 참고용 일봉 곡선 */
export function buildPlaceholderDailyPrices(stockCode: string, months = 6): DailyPricePoint[] {
  const end = new Date()
  const start = subMonths(end, months)
  const days = eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d))
  const seed = hashSeed(stockCode)
  let price = 30_000 + (seed % 90_000)
  let prevClose = price

  return days.map((day, index) => {
    const wave = Math.sin((index + seed) * 0.08) * 1200
    const noise = ((seed + index * 23) % 700) - 350
    price = Math.max(1000, price + wave + noise)
    const close = Math.round(price)
    const gap = ((seed + index * 11) % 500) - 250
    const open = Math.max(100, Math.round(index === 0 ? close : prevClose + gap * 0.25))
    const spread = Math.max(50, Math.round(close * 0.012))
    const high = Math.max(open, close) + spread
    const low = Math.min(open, close) - spread
    prevClose = close
    return {
      date: format(day, 'yyyy-MM-dd'),
      open,
      close,
      high,
      low: Math.max(100, low),
    }
  })
}

export function ohlcOnDate(
  prices: DailyPricePoint[],
  date: string,
): { open: number; close: number; high: number; low: number } {
  const pick = (p: DailyPricePoint) => ({
    open: p.open ?? p.close,
    close: p.close,
    high: p.high ?? p.close,
    low: p.low ?? p.close,
  })

  const exact = prices.find((p) => p.date === date)
  if (exact) return pick(exact)
  for (let i = prices.length - 1; i >= 0; i -= 1) {
    if (prices[i].date <= date) return pick(prices[i])
  }
  const first = prices[0]
  return first ? pick(first) : { open: 0, close: 0, high: 0, low: 0 }
}

export function priceOnDate(prices: DailyPricePoint[], date: string): number {
  const exact = prices.find((p) => p.date === date)
  if (exact) return exact.close
  for (let i = prices.length - 1; i >= 0; i -= 1) {
    if (prices[i].date <= date) return prices[i].close
  }
  return prices[0]?.close ?? 0
}

export function formatChartAxisWon(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

export const MA_PERIODS = [5, 20, 40, 60, 120] as const

export const CHART_FETCH_MONTHS = 3
export const CHART_INITIAL_VISIBLE_BARS = 63
export const CHART_MIN_VISIBLE_BARS = 20

export type ChartViewport = { start: number; count: number }

export function clampChart(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function initialChartViewport(dataLength: number): ChartViewport {
  if (dataLength <= 0) return { start: 0, count: CHART_INITIAL_VISIBLE_BARS }
  const count = Math.min(CHART_INITIAL_VISIBLE_BARS, dataLength)
  return { start: Math.max(0, dataLength - count), count }
}

export function zoomChartViewport(
  viewport: ChartViewport,
  factor: number,
  anchorRatio: number,
  dataLength: number,
): ChartViewport {
  if (dataLength <= 0) return viewport
  const nextCount = clampChart(
    Math.round(viewport.count * factor),
    Math.min(CHART_MIN_VISIBLE_BARS, dataLength),
    dataLength,
  )
  const center = viewport.start + viewport.count * anchorRatio
  const nextStart = clampChart(
    Math.round(center - nextCount * anchorRatio),
    0,
    Math.max(0, dataLength - nextCount),
  )
  return { start: nextStart, count: nextCount }
}

export function panChartViewport(
  viewport: ChartViewport,
  deltaBars: number,
  dataLength: number,
): ChartViewport {
  if (dataLength <= 0) return viewport
  const nextStart = clampChart(viewport.start + deltaBars, 0, Math.max(0, dataLength - viewport.count))
  return { ...viewport, start: nextStart }
}

export type MaPeriod = (typeof MA_PERIODS)[number]

export const MA_COLORS: Record<MaPeriod, string> = {
  5: '#ef4444',
  20: '#f97316',
  40: '#ca8a04',
  60: '#16a34a',
  120: '#7c3aed',
}

export type ChartPricePoint = DailyPricePoint & Partial<Record<`ma${MaPeriod}`, number | null>>

export function appendMovingAverages(
  prices: DailyPricePoint[],
  periods: readonly number[],
): ChartPricePoint[] {
  const closes = prices.map((p) => p.close)
  const maValues: Record<string, (number | null)[]> = {}

  for (const period of periods) {
    maValues[`ma${period}`] = closes.map((_, i) => {
      if (i < period - 1) return null
      const slice = closes.slice(i - period + 1, i + 1)
      return slice.reduce((sum, v) => sum + v, 0) / period
    })
  }

  return prices.map((point, i) => {
    const row: ChartPricePoint = { ...point }
    for (const period of periods) {
      row[`ma${period}` as `ma${MaPeriod}`] = maValues[`ma${period}`][i]
    }
    return row
  })
}

export type SrLineKind = 'support' | 'resistance'

export type SrLine = {
  id: string
  price: number
  kind: SrLineKind
  label?: string
}

const SR_STORAGE_PREFIX = 'managestock-journal-sr-'

function srStorageKey(stockCode: string): string {
  return `${SR_STORAGE_PREFIX}${stockCode}`
}

export function loadSrLines(stockCode: string): SrLine[] {
  if (!stockCode) return []
  try {
    const raw = localStorage.getItem(srStorageKey(stockCode))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SrLine[]
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l.price === 'number' && l.kind) : []
  } catch {
    return []
  }
}

export function saveSrLines(stockCode: string, lines: SrLine[]): void {
  if (!stockCode) return
  localStorage.setItem(srStorageKey(stockCode), JSON.stringify(lines))
}

export function createSrLine(price: number, kind: SrLineKind): SrLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    price: Math.round(price * 100) / 100,
    kind,
  }
}

export function chartYDomain(
  prices: DailyPricePoint[],
  srLines: SrLine[],
  paddingRatio = 0.04,
): [number, number] {
  const values: number[] = []
  for (const p of prices) {
    values.push(p.close)
    if (p.open != null) values.push(p.open)
    if (p.high != null) values.push(p.high)
    if (p.low != null) values.push(p.low)
  }
  for (const line of srLines) values.push(line.price)
  if (values.length === 0) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * paddingRatio || max * 0.02 || 1
  return [min - pad, max + pad]
}

/** 차트 플롯 영역 클릭 Y → 가격 (Recharts Y축과 동일한 선형 스케일) */
export function priceFromPlotY(
  plotY: number,
  plotHeight: number,
  domain: [number, number],
): number {
  const [min, max] = domain
  const ratio = Math.min(1, Math.max(0, plotY / plotHeight))
  return max - ratio * (max - min)
}

/** 차트 플롯 영역 X → 가장 가까운 캔들 날짜 */
export function dateFromPlotX(
  plotX: number,
  plotWidth: number,
  dates: string[],
): { date: string; index: number } | null {
  if (dates.length === 0 || plotWidth <= 0) return null
  const ratio = Math.min(1, Math.max(0, plotX / plotWidth))
  const index = Math.min(dates.length - 1, Math.round(ratio * (dates.length - 1)))
  const date = dates[index]
  if (!date) return null
  return { date, index }
}

/** 캔들 인덱스 → 플롯 X 중심 (category 축 균등 분할) */
export function plotXFromCandleIndex(index: number, plotWidth: number, count: number): number {
  if (count <= 0) return 0
  return ((index + 0.5) / count) * plotWidth
}
