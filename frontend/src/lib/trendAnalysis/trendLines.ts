import type { ChartPricePoint } from '@/lib/journalStockChart'

export type TrendLinePoint = { date: string; price: number }

export type TrendLineSegment = {
  from: TrendLinePoint
  to: TrendLinePoint
}

export type VisibleTrendLines = {
  closeTrend: TrendLineSegment | null
  extremeTrend: TrendLineSegment | null
}

export type TrendLineVisibility = {
  closeTrend: boolean
  extremeTrend: boolean
}

function candleHigh(point: ChartPricePoint): number {
  return point.high ?? Math.max(point.open ?? point.close, point.close)
}

function candleLow(point: ChartPricePoint): number {
  return point.low ?? Math.min(point.open ?? point.close, point.close)
}

/** 현재 화면에 보이는 캔들 기준 추세선 좌표 */
export function computeVisibleTrendLines(data: ChartPricePoint[]): VisibleTrendLines {
  if (data.length < 2) {
    return { closeTrend: null, extremeTrend: null }
  }

  const first = data[0]
  const last = data[data.length - 1]

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

  return { closeTrend, extremeTrend }
}

export function filterVisibleTrendLines(
  lines: VisibleTrendLines,
  visibility: TrendLineVisibility,
): VisibleTrendLines {
  return {
    closeTrend: visibility.closeTrend ? lines.closeTrend : null,
    extremeTrend: visibility.extremeTrend ? lines.extremeTrend : null,
  }
}
