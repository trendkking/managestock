import type { ChartPricePoint } from '@/lib/journalStockChart'

export type TrendLinePoint = { date: string; price: number }

export type TrendLineSegment = {
  from: TrendLinePoint
  to: TrendLinePoint
}

export type VisibleTrendLines = {
  closeTrend: TrendLineSegment | null
  extremeTrend: TrendLineSegment | null
  finalTrend: TrendLineSegment | null
  /** 고저 추세선 기준 가격 범위 (최종 추세선 클램프) */
  priceBounds: { minLow: number; maxHigh: number } | null
}

export type TrendLineVisibility = {
  closeTrend: boolean
  extremeTrend: boolean
  finalTrend: boolean
}

export type TrendLineComputeOptions = {
  /** 0=종가 추세 쪽, 1=고저 추세 쪽 (기본 0.5) */
  finalTrendBlend?: number
}

function candleHigh(point: ChartPricePoint): number {
  return point.high ?? Math.max(point.open ?? point.close, point.close)
}

function candleLow(point: ChartPricePoint): number {
  return point.low ?? Math.min(point.open ?? point.close, point.close)
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function clampPrice(price: number, minLow: number, maxHigh: number): number {
  return Math.min(maxHigh, Math.max(minLow, price))
}

/** 카테고리 축(캔들 순서) 기준 선형 보간 */
export function interpolateSegmentAtDate(
  segment: TrendLineSegment,
  date: string,
  dates: readonly string[],
): number {
  const fromIdx = dates.indexOf(segment.from.date)
  const toIdx = dates.indexOf(segment.to.date)
  const atIdx = dates.indexOf(date)
  if (fromIdx < 0 || toIdx < 0 || atIdx < 0) return segment.from.price
  if (fromIdx === toIdx) return segment.from.price
  const t = (atIdx - fromIdx) / (toIdx - fromIdx)
  return segment.from.price + t * (segment.to.price - segment.from.price)
}

/** 고저 추세선 양 끝 날짜(캔들 순서 기준 min~max) */
function extremeDateRange(
  extremeTrend: TrendLineSegment,
  dates: readonly string[],
): { startDate: string; endDate: string } | null {
  const fromIdx = dates.indexOf(extremeTrend.from.date)
  const toIdx = dates.indexOf(extremeTrend.to.date)
  if (fromIdx < 0 || toIdx < 0) return null
  const minIdx = Math.min(fromIdx, toIdx)
  const maxIdx = Math.max(fromIdx, toIdx)
  const startDate = dates[minIdx]
  const endDate = dates[maxIdx]
  if (!startDate || !endDate) return null
  return { startDate, endDate }
}

function blendBetweenCloseAndExtreme(
  closePrice: number,
  extremePrice: number,
  blend: number,
  minLow: number,
  maxHigh: number,
): number {
  const raw = closePrice + blend * (extremePrice - closePrice)
  return clampPrice(raw, minLow, maxHigh)
}

/** 현재 화면에 보이는 캔들 기준 추세선 좌표 */
export function computeVisibleTrendLines(
  data: ChartPricePoint[],
  options?: TrendLineComputeOptions,
): VisibleTrendLines {
  if (data.length < 2) {
    return { closeTrend: null, extremeTrend: null, finalTrend: null, priceBounds: null }
  }

  const blend = clamp01(options?.finalTrendBlend ?? 0.5)
  const first = data[0]
  const last = data[data.length - 1]
  const dates = data.map((d) => d.date)

  const closeTrend: TrendLineSegment = {
    from: { date: first.date, price: first.close },
    to: { date: last.date, price: last.close },
  }

  let maxHighIndex = 0
  let minLowIndex = 0
  for (let i = 1; i < data.length; i += 1) {
    if (candleHigh(data[i]) > candleHigh(data[maxHighIndex])) maxHighIndex = i
    if (candleLow(data[i]) < candleLow(data[minLowIndex])) minLowIndex = i
  }

  const minLow = candleLow(data[minLowIndex])
  const maxHigh = candleHigh(data[maxHighIndex])

  const extremeTrend: TrendLineSegment = {
    from: { date: data[maxHighIndex].date, price: maxHigh },
    to: { date: data[minLowIndex].date, price: minLow },
  }

  const range = extremeDateRange(extremeTrend, dates)
  if (!range) {
    return { closeTrend, extremeTrend, finalTrend: null, priceBounds: { minLow, maxHigh } }
  }

  const closeAtStart = interpolateSegmentAtDate(closeTrend, range.startDate, dates)
  const closeAtEnd = interpolateSegmentAtDate(closeTrend, range.endDate, dates)
  const extremeAtStart = interpolateSegmentAtDate(extremeTrend, range.startDate, dates)
  const extremeAtEnd = interpolateSegmentAtDate(extremeTrend, range.endDate, dates)

  const finalTrend: TrendLineSegment = {
    from: {
      date: range.startDate,
      price: blendBetweenCloseAndExtreme(closeAtStart, extremeAtStart, blend, minLow, maxHigh),
    },
    to: {
      date: range.endDate,
      price: blendBetweenCloseAndExtreme(closeAtEnd, extremeAtEnd, blend, minLow, maxHigh),
    },
  }

  return {
    closeTrend,
    extremeTrend,
    finalTrend,
    priceBounds: { minLow, maxHigh },
  }
}

export function filterVisibleTrendLines(
  lines: VisibleTrendLines,
  visibility: TrendLineVisibility,
): VisibleTrendLines {
  return {
    ...lines,
    closeTrend: visibility.closeTrend ? lines.closeTrend : null,
    extremeTrend: visibility.extremeTrend ? lines.extremeTrend : null,
    finalTrend: visibility.finalTrend ? lines.finalTrend : null,
  }
}
