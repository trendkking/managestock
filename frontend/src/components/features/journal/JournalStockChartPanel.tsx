import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { CandlestickSeries } from '@/components/features/journal/CandlestickLayer'
import {
  CHART_MARGIN,
  X_AXIS_HEIGHT,
  Y_AXIS_WIDTH,
  type JournalStockChartState,
} from '@/components/features/journal/useJournalStockChart'
import {
  clampChart,
  formatChartAxisWon,
  MA_COLORS,
  MA_PERIODS,
  type MaPeriod,
  ohlcOnDate,
  resolvePriceDate,
  priceFromPlotY,
  dateFromPlotX,
  plotXFromCandleIndex,
} from '@/lib/journalStockChart'
import type { JournalEntrySide } from '@/types'
import { formatCurrency } from '@/utils'
import { Trash2 } from 'lucide-react'

export type JournalChartMarker = {
  date: string
  markerY: number
  side: JournalEntrySide
  close: number
  high: number
  low: number
  entryId: number
  reason: string
  journalDate: string
  preview?: boolean
}

const MARKER_GAP_PX = 12
const MARKER_HEAD_H = 9
const MARKER_HEAD_W = 7
const MARKER_SHAFT_H = 10
const MARKER_SHAFT_W = 3

function JournalMarker({
  cx,
  cy,
  payload,
  selected,
  onSelect,
}: {
  cx?: number
  cy?: number
  payload?: JournalChartMarker
  selected: boolean
  onSelect?: (id: number) => void
}) {
  if (cx == null || cy == null || !payload) return null
  const isBuy = payload.side === 'buy'
  const fill = payload.preview ? '#64748b' : selected ? '#0f172a' : '#171717'
  const opacity = payload.preview ? 0.85 : 1

  let headPoints: string
  let shaftX: number
  let shaftY: number
  let shaftH: number

  if (isBuy) {
    const tipY = cy + MARKER_GAP_PX
    const headBaseY = tipY + MARKER_HEAD_H
    headPoints = `${cx},${tipY} ${cx - MARKER_HEAD_W},${headBaseY} ${cx + MARKER_HEAD_W},${headBaseY}`
    shaftX = cx - MARKER_SHAFT_W / 2
    shaftY = headBaseY
    shaftH = MARKER_SHAFT_H
  } else {
    const tipY = cy - MARKER_GAP_PX
    const headBaseY = tipY - MARKER_HEAD_H
    headPoints = `${cx},${tipY} ${cx - MARKER_HEAD_W},${headBaseY} ${cx + MARKER_HEAD_W},${headBaseY}`
    shaftX = cx - MARKER_SHAFT_W / 2
    shaftY = headBaseY - MARKER_SHAFT_H
    shaftH = MARKER_SHAFT_H
  }

  return (
    <g
      filter="url(#journal-marker-shadow)"
      onClick={(e) => {
        if (payload.preview || !onSelect) return
        e.stopPropagation()
        onSelect(payload.entryId)
      }}
      style={{ cursor: payload.preview ? 'default' : 'pointer' }}
    >
      <rect
        x={shaftX}
        y={shaftY}
        width={MARKER_SHAFT_W}
        height={shaftH}
        rx={1}
        fill={fill}
        opacity={opacity}
      />
      <polygon
        points={headPoints}
        fill={fill}
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={opacity}
      />
    </g>
  )
}

const CHART_DRAG_THRESHOLD = 6

function formatSrPrice(value: number, region?: 'KR' | 'US'): string {
  if (region === 'US') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return formatCurrency(value)
}

type JournalMaControlsProps = {
  visibleMa: Set<MaPeriod>
  toggleMa: (period: MaPeriod) => void
  className?: string
}

export function JournalMaControls({ visibleMa, toggleMa, className }: JournalMaControlsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ''}`}>
      <span className="text-xs font-semibold text-slate-500">이동평균</span>
      {MA_PERIODS.map((period) => (
        <label key={period} className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={visibleMa.has(period)}
            onChange={() => toggleMa(period)}
            className="rounded border-slate-300"
          />
          <span style={{ color: MA_COLORS[period] }} className="font-medium">
            {period}일
          </span>
        </label>
      ))}
    </div>
  )
}

type JournalSrLinesControlsProps = {
  chart: JournalStockChartState
  compact?: boolean
}

export function JournalSrLinesControls({ chart, compact }: JournalSrLinesControlsProps) {
  const { region, srLines, srDrawKind, toggleSrDrawKind, removeSrLine } = chart

  return (
    <div className={compact ? 'mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3' : ''}>
      {!compact && (
        <>
          <h3 className="text-sm font-semibold text-slate-700">지지 · 저항선</h3>
          <p className="mt-1 text-xs text-slate-500">
            종목별로 브라우저에 저장됩니다. 지지선 또는 저항선을 선택한 뒤 차트를 클릭하세요.
          </p>
        </>
      )}
      {compact && <p className="mb-2 text-xs font-semibold text-slate-600">지지 · 저항선</p>}

      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-3'}`}>
        <button
          type="button"
          onClick={() => toggleSrDrawKind('support')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            srDrawKind === 'support'
              ? 'bg-green-600 text-white'
              : 'border border-green-200 bg-green-50 text-green-800'
          }`}
        >
          지지선
        </button>
        <button
          type="button"
          onClick={() => toggleSrDrawKind('resistance')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            srDrawKind === 'resistance'
              ? 'bg-red-600 text-white'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          저항선
        </button>
      </div>

      {srDrawKind && (
        <p className="mt-2 text-xs text-slate-500">
          클릭: {srDrawKind === 'support' ? '지지' : '저항'}선 추가 · 드래그: 좌우 이동 · 같은 버튼 재클릭: 이동
          모드
        </p>
      )}

      {srLines.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">등록된 선이 없습니다.</p>
      ) : (
        <ul className={`space-y-1.5 ${compact ? 'mt-2 max-h-24 overflow-y-auto' : 'mt-4 space-y-2'}`}>
          {srLines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-sm"
            >
              <span className={line.kind === 'support' ? 'text-green-700' : 'text-red-700'}>
                {line.kind === 'support' ? '지지' : '저항'} {formatSrPrice(line.price, region)}
              </span>
              <button
                type="button"
                onClick={() => removeSrLine(line.id)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="선 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type JournalStockChartViewProps = {
  chart: JournalStockChartState
  height?: number
  markers?: JournalChartMarker[]
  selectedMarkerId?: number | null
  onMarkerSelect?: (id: number) => void
  previewMarker?: { date: string; side: JournalEntrySide; reason?: string }
  showMarkerHint?: boolean
  enablePanZoom?: boolean
}

export function JournalStockChartView({
  chart,
  height = 380,
  markers = [],
  selectedMarkerId = null,
  onMarkerSelect,
  previewMarker,
  showMarkerHint = false,
  enablePanZoom = true,
}: JournalStockChartViewProps) {
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const isPanningRef = useRef(false)
  const [crosshair, setCrosshair] = useState<{
    y: number
    x: number
    x2: number
    price: number
    date: string
  } | null>(null)
  const panRef = useRef({ x: 0, start: 0, count: 0, plotWidth: 1 })
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)

  const {
    visibleChartData,
    visibleDateRange,
    zoomViewport,
    panToStart,
    chartMeta,
    chartLoading,
    chartError,
    usingFallback,
    region,
    visibleMa,
    srDrawKind,
    addSrLineAtPoint,
    yDomain,
    srLines,
    priceData,
  } = chart

  const plotWidth = useCallback(() => {
    const rect = chartWrapRef.current?.getBoundingClientRect()
    if (!rect) return 1
    return Math.max(1, rect.width - CHART_MARGIN.left - Y_AXIS_WIDTH - CHART_MARGIN.right)
  }, [])

  useEffect(() => {
    if (!enablePanZoom) return
    const el = chartWrapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const plotLeft = CHART_MARGIN.left + Y_AXIS_WIDTH
      const width = Math.max(1, rect.width - plotLeft - CHART_MARGIN.right)
      const ratio = clampChart((e.clientX - rect.left - plotLeft) / width, 0, 1)
      zoomViewport(e.deltaY > 0 ? 1.12 : 0.88, ratio)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [enablePanZoom, zoomViewport])

  const plotBounds = useCallback(
    (rect: DOMRect) => ({
      left: CHART_MARGIN.left + Y_AXIS_WIDTH,
      top: CHART_MARGIN.top,
      bottom: height - CHART_MARGIN.bottom - X_AXIS_HEIGHT,
      right: rect.width - CHART_MARGIN.right,
    }),
    [height],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enablePanZoom || e.button !== 0) return
    didDragRef.current = false
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
    panRef.current = {
      x: e.clientX,
      start: chart.viewport.start,
      count: chart.viewport.count,
      plotWidth: plotWidth(),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const bounds = plotBounds(rect)

    if (pointerDownRef.current && enablePanZoom) {
      const dx = e.clientX - pointerDownRef.current.x
      const dy = e.clientY - pointerDownRef.current.y
      if (!didDragRef.current && Math.hypot(dx, dy) >= CHART_DRAG_THRESHOLD) {
        didDragRef.current = true
        setIsPanning(true)
        isPanningRef.current = true
      }
      if (didDragRef.current) {
        const deltaBars = Math.round(
          ((panRef.current.x - e.clientX) / panRef.current.plotWidth) * panRef.current.count,
        )
        panToStart(panRef.current.start + deltaBars)
        return
      }
    }

    const y = e.clientY - rect.top
    const x = e.clientX - rect.left
    if (y >= bounds.top && y <= bounds.bottom && x >= bounds.left && x <= bounds.right) {
      const plotHeight = bounds.bottom - bounds.top
      const plotWidth = bounds.right - bounds.left
      const price = priceFromPlotY(y - bounds.top, plotHeight, yDomain)
      const dates = visibleChartData.map((d) => d.date)
      const hit = dateFromPlotX(x - bounds.left, plotWidth, dates)
      const candleX = hit
        ? bounds.left + plotXFromCandleIndex(hit.index, plotWidth, dates.length)
        : x
      setCrosshair({
        y,
        x: candleX,
        x2: bounds.right,
        price,
        date: hit?.date ?? '',
      })
    } else {
      setCrosshair(null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    const wasClick = !didDragRef.current

    pointerDownRef.current = null
    isPanningRef.current = false
    setIsPanning(false)

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    if (wasClick && srDrawKind) {
      addSrLineAtPoint(e.clientX, e.clientY, rect, height)
    }
  }

  const handlePointerLeave = () => {
    if (!pointerDownRef.current) setCrosshair(null)
  }

  const cursorClass = isPanning
    ? 'cursor-grabbing select-none'
    : srDrawKind
      ? 'cursor-crosshair'
      : enablePanZoom
        ? 'cursor-grab'
        : undefined

  const allMarkers = useMemo(() => {
    const visibleDates = new Set(visibleChartData.map((row) => row.date))
    const list: JournalChartMarker[] = []
    for (const marker of markers) {
      if (visibleDates.has(marker.date)) list.push(marker)
    }
    if (previewMarker && priceData.length > 0) {
      const chartDate = resolvePriceDate(priceData, previewMarker.date)
      if (chartDate && visibleDates.has(chartDate)) {
        const ohlc = ohlcOnDate(priceData, previewMarker.date)
        const isBuy = previewMarker.side === 'buy'
        list.push({
          date: chartDate,
          markerY: isBuy ? ohlc.low : ohlc.high,
          side: previewMarker.side,
          close: ohlc.close,
          high: ohlc.high,
          low: ohlc.low,
          entryId: -1,
          reason: previewMarker.reason ?? '',
          journalDate: previewMarker.date,
          preview: true,
        })
      }
    }
    return list
  }, [markers, previewMarker, priceData, visibleChartData])

  if (chartLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> 시세 불러오는 중…
      </p>
    )
  }

  if (priceData.length === 0) {
    return <p className="py-16 text-center text-sm text-slate-500">표시할 시세 데이터가 없습니다.</p>
  }

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        {usingFallback
          ? '시세 API 연결에 실패해 참고용 캔들을 표시합니다.'
          : chartMeta
            ? `일봉 캔들 · ${chartMeta.source} · 최근 3개월 표시`
            : '시세를 불러오는 중…'}
        {enablePanZoom && ' · 휠: 확대/축소 · 드래그: 좌우 이동'}
        {visibleDateRange && (
          <span className="ml-1 tabular-nums text-slate-400">
            ({visibleDateRange.from} ~ {visibleDateRange.to})
          </span>
        )}
        {showMarkerHint && (
          <>
            {' '}
            <span className="text-slate-800">▲ 매수</span>는 저가 아래,{' '}
            <span className="text-slate-800">▼ 매도</span>는 고가 위 검은 화살표로 표시됩니다.
          </>
        )}
      </p>
      {chartError && <p className="mb-2 text-xs text-amber-700">{chartError}</p>}
      <div
        ref={chartWrapRef}
        className={`relative ${cursorClass ?? ''}`}
        style={{ touchAction: enablePanZoom ? 'none' : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        role="presentation"
      >
        {crosshair && !isPanning && (
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden
          >
            <line
              x1={CHART_MARGIN.left + Y_AXIS_WIDTH}
              y1={crosshair.y}
              x2={crosshair.x2}
              y2={crosshair.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            {(() => {
              const plotLeft = CHART_MARGIN.left + Y_AXIS_WIDTH
              const priceLabel = formatSrPrice(crosshair.price, region)
              const priceLabelWidth = Math.max(52, priceLabel.length * 7 + 12)
              const priceLabelX = CHART_MARGIN.left + 2
              const priceLabelY = crosshair.y - 10
              const dateLabel = crosshair.date.replace(/-/g, '.')
              const dateLabelWidth = Math.max(72, dateLabel.length * 7 + 12)
              const dateLabelX = clampChart(
                crosshair.x - dateLabelWidth / 2,
                plotLeft,
                crosshair.x2 - dateLabelWidth,
              )
              const dateLabelY = height - CHART_MARGIN.bottom - X_AXIS_HEIGHT + 4

              return (
                <g>
                  <rect
                    x={priceLabelX}
                    y={priceLabelY}
                    width={priceLabelWidth}
                    height={20}
                    rx={3}
                    fill="#334155"
                    opacity={0.92}
                  />
                  <text
                    x={priceLabelX + priceLabelWidth / 2}
                    y={priceLabelY + 14}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {priceLabel}
                  </text>
                  {crosshair.date && (
                    <>
                      <rect
                        x={dateLabelX}
                        y={dateLabelY}
                        width={dateLabelWidth}
                        height={18}
                        rx={3}
                        fill="#334155"
                        opacity={0.92}
                      />
                      <text
                        x={dateLabelX + dateLabelWidth / 2}
                        y={dateLabelY + 13}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize={10}
                        fontWeight={600}
                      >
                        {dateLabel}
                      </text>
                    </>
                  )}
                </g>
              )
            })()}
          </svg>
        )}
        <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 520, height }}>
          <ComposedChart data={visibleChartData} margin={CHART_MARGIN}>
            <defs>
              <filter id="journal-marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.35" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 10, fill: '#475569' }}
              interval="preserveStartEnd"
              height={X_AXIS_HEIGHT}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v) =>
                region === 'US'
                  ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                  : formatChartAxisWon(v)
              }
              tick={{ fontSize: 10, fill: '#475569' }}
              width={Y_AXIS_WIDTH}
            />
            <CandlestickSeries data={visibleChartData} region={region} />
            {MA_PERIODS.filter((period) => visibleMa.has(period)).map((period) => (
              <Line
                key={period}
                type="monotone"
                dataKey={`ma${period}`}
                stroke={MA_COLORS[period]}
                strokeWidth={1.25}
                dot={false}
                connectNulls={false}
                name={`${period}일`}
              />
            ))}
            {srLines.map((line) => (
              <ReferenceLine
                key={line.id}
                y={line.price}
                stroke={line.kind === 'support' ? '#16a34a' : '#dc2626'}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
                label={{
                  value: `${line.kind === 'support' ? '지지' : '저항'} ${formatSrPrice(line.price, region)}`,
                  position: 'insideLeft',
                  offset: 8,
                  dx: 2,
                  dy: -12,
                  fill: line.kind === 'support' ? '#15803d' : '#b91c1c',
                  fontSize: 10,
                }}
              />
            ))}
            {allMarkers.length > 0 && (
              <Scatter
                data={allMarkers}
                dataKey="markerY"
                name="매매 기록"
                shape={(props) => (
                  <JournalMarker
                    {...props}
                    selected={!props.payload?.preview && props.payload?.entryId === selectedMarkerId}
                    onSelect={onMarkerSelect}
                  />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
