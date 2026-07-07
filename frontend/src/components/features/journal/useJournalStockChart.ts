import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDailyPricesQuery } from '@/hooks/useDailyPrices'
import {
  appendMovingAverages,
  buildPlaceholderDailyPrices,
  CHART_FETCH_MONTHS,
  CHART_INITIAL_VISIBLE_BARS,
  clampChart,
  initialChartViewport,
  panChartViewport,
  type ChartViewport,
  chartYDomain,
  createSrLine,
  type DailyPricePoint,
  loadSrLines,
  MA_PERIODS,
  type MaPeriod,
  priceFromPlotY,
  saveSrLines,
  type SrLine,
  type SrLineKind,
  zoomChartViewport,
} from '@/lib/journalStockChart'

export const CHART_MARGIN = { top: 16, right: 0, left: 0, bottom: 8 }
export const Y_AXIS_WIDTH = 62
export const X_AXIS_HEIGHT = 32

export type ChartDisplayLayout = {
  margin: { top: number; right: number; left: number; bottom: number }
  yAxisWidth: number
}

const MOBILE_CHART_LAYOUT: ChartDisplayLayout = {
  margin: { top: 8, right: 0, left: 0, bottom: 0 },
  yAxisWidth: 50,
}

const DESKTOP_CHART_LAYOUT: ChartDisplayLayout = {
  margin: CHART_MARGIN,
  yAxisWidth: Y_AXIS_WIDTH,
}

export function useChartDisplayLayout() {
  const [layout, setLayout] = useState<ChartDisplayLayout>(DESKTOP_CHART_LAYOUT)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setLayout(mq.matches ? MOBILE_CHART_LAYOUT : DESKTOP_CHART_LAYOUT)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return layout
}

export function useJournalStockChart(stockCode: string) {
  const priceQuery = useDailyPricesQuery(stockCode)

  const [usingFallback, setUsingFallback] = useState(false)
  const [fallbackPriceData, setFallbackPriceData] = useState<DailyPricePoint[]>([])
  const [visibleMa, setVisibleMa] = useState<Set<MaPeriod>>(() => new Set(MA_PERIODS))
  const [srLines, setSrLines] = useState<SrLine[]>([])
  const [srDrawKind, setSrDrawKind] = useState<SrLineKind | null>(null)
  const [viewport, setViewport] = useState<ChartViewport>({
    start: 0,
    count: CHART_INITIAL_VISIBLE_BARS,
  })

  const apiPriceData = useMemo(
    () =>
      priceQuery.data?.items.map((p) => ({
        date: p.date,
        open: p.open,
        close: p.close,
        high: p.high,
        low: p.low,
      })) ?? [],
    [priceQuery.data],
  )

  const chartMeta = useMemo(() => {
    if (usingFallback || !priceQuery.data) return null
    return {
      stockName: priceQuery.data.stockName,
      market: priceQuery.data.market,
      source: priceQuery.data.source,
      region: priceQuery.data.region as 'KR' | 'US' | undefined,
    }
  }, [priceQuery.data, usingFallback])

  const priceData = usingFallback ? fallbackPriceData : apiPriceData
  const region = chartMeta?.region
  const dataLength = priceData.length

  useEffect(() => {
    if (!stockCode) {
      setUsingFallback(false)
      setFallbackPriceData([])
      setSrLines([])
      setViewport({ start: 0, count: CHART_INITIAL_VISIBLE_BARS })
      return
    }
    setSrLines(loadSrLines(stockCode))
  }, [stockCode])

  useEffect(() => {
    if (!stockCode) return
    if (priceQuery.isError) {
      setUsingFallback(true)
      setFallbackPriceData(buildPlaceholderDailyPrices(stockCode, CHART_FETCH_MONTHS))
      return
    }
    setUsingFallback(false)
    setFallbackPriceData([])
  }, [stockCode, priceQuery.isError])

  useEffect(() => {
    if (priceData.length === 0) {
      setViewport({ start: 0, count: CHART_INITIAL_VISIBLE_BARS })
      return
    }
    setViewport(initialChartViewport(priceData.length))
  }, [stockCode, priceData.length])

  const chartData = useMemo(
    () => appendMovingAverages(priceData, MA_PERIODS),
    [priceData],
  )

  const visibleChartData = useMemo(
    () => chartData.slice(viewport.start, viewport.start + viewport.count),
    [chartData, viewport],
  )

  const visiblePriceData = useMemo(
    () => priceData.slice(viewport.start, viewport.start + viewport.count),
    [priceData, viewport],
  )

  const yDomain = useMemo(() => chartYDomain(visiblePriceData, srLines), [visiblePriceData, srLines])

  const visibleDateRange = useMemo(() => {
    if (visiblePriceData.length === 0) return null
    return {
      from: visiblePriceData[0].date,
      to: visiblePriceData[visiblePriceData.length - 1].date,
    }
  }, [visiblePriceData])

  const zoomViewport = useCallback(
    (factor: number, anchorRatio: number) => {
      setViewport((prev) => zoomChartViewport(prev, factor, anchorRatio, dataLength))
    },
    [dataLength],
  )

  const panViewport = useCallback(
    (deltaBars: number) => {
      setViewport((prev) => panChartViewport(prev, deltaBars, dataLength))
    },
    [dataLength],
  )

  const panToStart = useCallback(
    (start: number) => {
      setViewport((prev) => ({
        ...prev,
        start: clampChart(start, 0, Math.max(0, dataLength - prev.count)),
      }))
    },
    [dataLength],
  )

  const persistSrLines = useCallback(
    (lines: SrLine[]) => {
      setSrLines(lines)
      if (stockCode) saveSrLines(stockCode, lines)
    },
    [stockCode],
  )

  const addSrLine = useCallback(
    (price: number, kind: SrLineKind) => {
      if (!Number.isFinite(price) || price <= 0 || !stockCode) return
      setSrLines((prev) => {
        const next = [...prev, createSrLine(price, kind)]
        saveSrLines(stockCode, next)
        return next
      })
    },
    [stockCode],
  )

  const toggleSrDrawKind = useCallback((kind: SrLineKind) => {
    setSrDrawKind((prev) => (prev === kind ? null : kind))
  }, [])

  const removeSrLine = useCallback(
    (id: string) => {
      persistSrLines(srLines.filter((l) => l.id !== id))
    },
    [persistSrLines, srLines],
  )

  const toggleMa = useCallback((period: MaPeriod) => {
    setVisibleMa((prev) => {
      const next = new Set(prev)
      if (next.has(period)) next.delete(period)
      else next.add(period)
      return next
    })
  }, [])

  const addSrLineAtPoint = useCallback(
    (
      clientX: number,
      clientY: number,
      rect: DOMRect,
      chartHeight: number,
      layout: ChartDisplayLayout = { margin: CHART_MARGIN, yAxisWidth: Y_AXIS_WIDTH },
    ) => {
      if (!srDrawKind) return
      const x = clientX - rect.left
      const y = clientY - rect.top
      const { margin, yAxisWidth } = layout
      const plotLeft = margin.left + yAxisWidth
      const plotTop = margin.top
      const plotBottom = chartHeight - margin.bottom - X_AXIS_HEIGHT
      if (x < plotLeft || y < plotTop || y > plotBottom) return
      const plotHeight = plotBottom - plotTop
      addSrLine(priceFromPlotY(y - plotTop, plotHeight, yDomain), srDrawKind)
    },
    [addSrLine, srDrawKind, yDomain],
  )

  const chartLoading = Boolean(stockCode) && priceQuery.isLoading && !usingFallback
  const chartError =
    priceQuery.isError && !usingFallback
      ? getApiErrorMessage(priceQuery.error, '시세를 불러오지 못했습니다.')
      : ''

  return {
    priceData,
    chartData,
    visibleChartData,
    visiblePriceData,
    viewport,
    visibleDateRange,
    zoomViewport,
    panViewport,
    panToStart,
    chartMeta,
    chartLoading,
    chartError,
    usingFallback,
    region,
    visibleMa,
    toggleMa,
    srLines,
    srDrawKind,
    toggleSrDrawKind,
    addSrLine,
    removeSrLine,
    addSrLineAtPoint,
    yDomain,
  }
}

export type JournalStockChartState = ReturnType<typeof useJournalStockChart>
