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
}

export type TrendLineVisibility = {
  closeTrend: boolean
  extremeTrend: boolean
  finalTrend: boolean
}

function candleHigh(point: ChartPricePoint): number {
  return point.high ?? Math.max(point.open ?? point.close, point.close)
}

function candleLow(point: ChartPricePoint): number {
  return point.low ?? Math.min(point.open ?? point.close, point.close)
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

/** 고저 추세선 날짜 구간 밖으로 나가지 않도록 x 구간 클리핑 */
function clipSegmentToDateRange(
  segment: TrendLineSegment,
  range: { startDate: string; endDate: string },
  dates: readonly string[],
): TrendLineSegment {
  return {
    from: {
      date: range.startDate,
      price: interpolateSegmentAtDate(segment, range.startDate, dates),
    },
    to: {
      date: range.endDate,
      price: interpolateSegmentAtDate(segment, range.endDate, dates),
    },
  }
}

function computeFinalTrend(
  closeTrend: TrendLineSegment,
  extremeTrend: TrendLineSegment,
  range: { startDate: string; endDate: string },
  dates: readonly string[],
): TrendLineSegment {
  const closeAtStart = interpolateSegmentAtDate(closeTrend, range.startDate, dates)
  const closeAtEnd = interpolateSegmentAtDate(closeTrend, range.endDate, dates)
  const extremeAtStart = interpolateSegmentAtDate(extremeTrend, range.startDate, dates)
  const extremeAtEnd = interpolateSegmentAtDate(extremeTrend, range.endDate, dates)

  return {
    from: { date: range.startDate, price: (closeAtStart + extremeAtStart) / 2 },
    to: { date: range.endDate, price: (closeAtEnd + extremeAtEnd) / 2 },
  }
}

/** 현재 화면에 보이는 캔들 기준 추세선 좌표 */
export function computeVisibleTrendLines(data: ChartPricePoint[]): VisibleTrendLines {
  if (data.length < 2) {
    return { closeTrend: null, extremeTrend: null, finalTrend: null }
  }

  const first = data[0]
  const last = data[data.length - 1]
  const dates = data.map((d) => d.date)

  const closeTrendFull: TrendLineSegment = {
    from: { date: first.date, price: first.close },
    to: { date: last.date, price: last.close },
  }

  let maxHighIndex = 0
  let minLowIndex = 0
  for (let i = 1; i < data.length; i += 1) {
    if (candleHigh(data[i]) > candleHigh(data[maxHighIndex])) maxHighIndex = i
    if (candleLow(data[i]) < candleLow(data[minLowIndex])) minLowIndex = i
  }

  const extremeTrend: TrendLineSegment = {
    from: { date: data[maxHighIndex].date, price: candleHigh(data[maxHighIndex]) },
    to: { date: data[minLowIndex].date, price: candleLow(data[minLowIndex]) },
  }

  const range = extremeDateRange(extremeTrend, dates)
  if (!range) {
    return { closeTrend: null, extremeTrend, finalTrend: null }
  }

  const closeTrend = clipSegmentToDateRange(closeTrendFull, range, dates)
  const finalTrend = computeFinalTrend(closeTrendFull, extremeTrend, range, dates)

  return { closeTrend, extremeTrend, finalTrend }
}

export function filterVisibleTrendLines(
  lines: VisibleTrendLines,
  visibility: TrendLineVisibility,
): VisibleTrendLines {
  return {
    closeTrend: visibility.closeTrend ? lines.closeTrend : null,
    extremeTrend: visibility.extremeTrend ? lines.extremeTrend : null,
    finalTrend: visibility.finalTrend ? lines.finalTrend : null,
  }
}
