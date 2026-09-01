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
  /** 종가·고저 추세선 교점 (보이는 구간 기준) */
  trendIntersection: TrendLinePoint | null
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

function priceAtIndex(
  fromIdx: number,
  fromPrice: number,
  toIdx: number,
  toPrice: number,
  atIdx: number,
): number {
  if (fromIdx === toIdx) return fromPrice
  return fromPrice + ((toPrice - fromPrice) * (atIdx - fromIdx)) / (toIdx - fromIdx)
}

function segmentSlope(fromIdx: number, fromPrice: number, toIdx: number, toPrice: number): number | null {
  if (toIdx === fromIdx) return null
  return (toPrice - fromPrice) / (toIdx - fromIdx)
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
  return priceAtIndex(fromIdx, segment.from.price, toIdx, segment.to.price, atIdx)
}

/** 종가 추세선과 고저 추세선의 교점 (인덱스 축 선형, 구간 밖 교점 포함) */
export function findCloseExtremeTrendIntersection(
  closeTrend: TrendLineSegment,
  extremeTrend: TrendLineSegment,
  dates: readonly string[],
): { idx: number; price: number } | null {
  const closeFromIdx = dates.indexOf(closeTrend.from.date)
  const closeToIdx = dates.indexOf(closeTrend.to.date)
  const extremeFromIdx = dates.indexOf(extremeTrend.from.date)
  const extremeToIdx = dates.indexOf(extremeTrend.to.date)
  if (closeFromIdx < 0 || closeToIdx < 0 || extremeFromIdx < 0 || extremeToIdx < 0) return null

  const closeSlope = segmentSlope(closeFromIdx, closeTrend.from.price, closeToIdx, closeTrend.to.price)
  const extremeSlope = segmentSlope(
    extremeFromIdx,
    extremeTrend.from.price,
    extremeToIdx,
    extremeTrend.to.price,
  )

  if (closeSlope == null || extremeSlope == null) return null
  if (Math.abs(closeSlope - extremeSlope) < 1e-12) return null

  const idx =
    (extremeTrend.from.price -
      closeTrend.from.price +
      closeSlope * closeFromIdx -
      extremeSlope * extremeFromIdx) /
    (closeSlope - extremeSlope)

  const price = priceAtIndex(
    closeFromIdx,
    closeTrend.from.price,
    closeToIdx,
    closeTrend.to.price,
    idx,
  )

  return { idx, price }
}

function indexToDate(idx: number, dates: readonly string[]): string {
  if (dates.length === 0) return ''
  const clamped = Math.min(dates.length - 1, Math.max(0, Math.round(idx)))
  return dates[clamped] ?? dates[0]
}

function midpointPriceAtIndex(
  closeTrend: TrendLineSegment,
  extremeTrend: TrendLineSegment,
  dates: readonly string[],
  atIdx: number,
): number {
  const closeFromIdx = dates.indexOf(closeTrend.from.date)
  const closeToIdx = dates.indexOf(closeTrend.to.date)
  const extremeFromIdx = dates.indexOf(extremeTrend.from.date)
  const extremeToIdx = dates.indexOf(extremeTrend.to.date)

  const closePrice = priceAtIndex(
    closeFromIdx,
    closeTrend.from.price,
    closeToIdx,
    closeTrend.to.price,
    atIdx,
  )
  const extremePrice = priceAtIndex(
    extremeFromIdx,
    extremeTrend.from.price,
    extremeToIdx,
    extremeTrend.to.price,
    atIdx,
  )

  return (closePrice + extremePrice) / 2
}

/**
 * 교점을 지나며 종가·고저 추세선 기울기의 산술 평균으로 그은 최종 추세선.
 * 평행(교점 없음)일 때는 양 끝 중간값으로 대체.
 */
export function buildFinalTrendFromAverageSlopes(
  closeTrend: TrendLineSegment,
  extremeTrend: TrendLineSegment,
  dates: readonly string[],
  startIdx: number,
  endIdx: number,
): { segment: TrendLineSegment; intersection: TrendLinePoint | null } {
  const closeFromIdx = dates.indexOf(closeTrend.from.date)
  const closeToIdx = dates.indexOf(closeTrend.to.date)
  const extremeFromIdx = dates.indexOf(extremeTrend.from.date)
  const extremeToIdx = dates.indexOf(extremeTrend.to.date)

  const closeSlope = segmentSlope(closeFromIdx, closeTrend.from.price, closeToIdx, closeTrend.to.price)
  const extremeSlope = segmentSlope(
    extremeFromIdx,
    extremeTrend.from.price,
    extremeToIdx,
    extremeTrend.to.price,
  )

  const intersectionRaw = findCloseExtremeTrendIntersection(closeTrend, extremeTrend, dates)
  const intersection = intersectionRaw
    ? { date: indexToDate(intersectionRaw.idx, dates), price: intersectionRaw.price }
    : null

  const priceAt =
    intersectionRaw && closeSlope != null && extremeSlope != null
      ? (idx: number) => {
          const finalSlope = (closeSlope + extremeSlope) / 2
          return intersectionRaw.price + finalSlope * (idx - intersectionRaw.idx)
        }
      : (idx: number) => midpointPriceAtIndex(closeTrend, extremeTrend, dates, idx)

  const startDate = dates[startIdx]
  const endDate = dates[endIdx]
  if (!startDate || !endDate) {
    return { segment: { from: { date: '', price: 0 }, to: { date: '', price: 0 } }, intersection }
  }

  return {
    segment: {
      from: { date: startDate, price: priceAt(startIdx) },
      to: { date: endDate, price: priceAt(endIdx) },
    },
    intersection,
  }
}

/** 현재 화면에 보이는 캔들 기준 추세선 좌표 */
export function computeVisibleTrendLines(data: ChartPricePoint[]): VisibleTrendLines {
  if (data.length < 2) {
    return { closeTrend: null, extremeTrend: null, finalTrend: null, trendIntersection: null }
  }

  const first = data[0]
  const last = data[data.length - 1]
  const dates = data.map((d) => d.date)
  const startIdx = 0
  const endIdx = data.length - 1

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

  const { segment: finalTrend, intersection: trendIntersection } = buildFinalTrendFromAverageSlopes(
    closeTrend,
    extremeTrend,
    dates,
    startIdx,
    endIdx,
  )

  return {
    closeTrend,
    extremeTrend,
    finalTrend,
    trendIntersection,
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
    trendIntersection: lines.trendIntersection,
  }
}
