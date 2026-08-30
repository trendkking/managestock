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

/** 현재 화면에 보이는 캔들 기준 추세선 좌표 */
export function computeVisibleTrendLines(data: ChartPricePoint[]): VisibleTrendLines {
  if (data.length < 2) {
    return { closeTrend: null, extremeTrend: null, finalTrend: null }
  }

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

  const extremeTrend: TrendLineSegment = {
    from: { date: data[maxHighIndex].date, price: candleHigh(data[maxHighIndex]) },
    to: { date: data[minLowIndex].date, price: candleLow(data[minLowIndex]) },
  }

  const extremeAtFirst = interpolateSegmentAtDate(extremeTrend, first.date, dates)
  const extremeAtLast = interpolateSegmentAtDate(extremeTrend, last.date, dates)

  const finalTrend: TrendLineSegment = {
    from: { date: first.date, price: (first.close + extremeAtFirst) / 2 },
    to: { date: last.date, price: (last.close + extremeAtLast) / 2 },
  }

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
