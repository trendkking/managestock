import type { TrendLineSegment, VisibleTrendLines } from '@/lib/trendAnalysis/trendLines'
import { plotXFromCandleIndex, plotYFromPrice } from '@/lib/journalStockChart'

const HELPER_TREND_COLOR = '#64748b'
const FINAL_TREND_COLOR = '#16a34a'

type PlotLayout = {
  plotLeft: number
  plotTop: number
  plotWidth: number
  plotHeight: number
}

function segmentToSvgPoints(
  segment: TrendLineSegment,
  dates: string[],
  yDomain: [number, number],
  layout: PlotLayout,
): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const fromIndex = dates.indexOf(segment.from.date)
  const toIndex = dates.indexOf(segment.to.date)
  if (fromIndex < 0 || toIndex < 0 || dates.length === 0) return null

  return {
    from: {
      x: layout.plotLeft + plotXFromCandleIndex(fromIndex, layout.plotWidth, dates.length),
      y: layout.plotTop + plotYFromPrice(segment.from.price, layout.plotHeight, yDomain),
    },
    to: {
      x: layout.plotLeft + plotXFromCandleIndex(toIndex, layout.plotWidth, dates.length),
      y: layout.plotTop + plotYFromPrice(segment.to.price, layout.plotHeight, yDomain),
    },
  }
}

type SegmentStyle = {
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  label?: string
  showDots?: boolean
  opacity?: number
}

function renderSegment(
  segment: TrendLineSegment,
  dates: string[],
  yDomain: [number, number],
  layout: PlotLayout,
  style: SegmentStyle,
) {
  const points = segmentToSvgPoints(segment, dates, yDomain, layout)
  if (!points) return null

  const { from, to } = points
  const labelX = (from.x + to.x) / 2
  const labelY = (from.y + to.y) / 2 - 8

  return (
    <g key={style.label ?? `${segment.from.date}-${segment.to.date}`} aria-label={style.label}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={style.opacity ?? 1}
      />
      {style.showDots && (
        <>
          <circle cx={from.x} cy={from.y} r={2.5} fill={style.stroke} opacity={style.opacity ?? 1} />
          <circle cx={to.x} cy={to.y} r={2.5} fill={style.stroke} opacity={style.opacity ?? 1} />
        </>
      )}
      {style.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill={style.stroke}
          fontSize={10}
          fontWeight={700}
        >
          {style.label}
        </text>
      )}
    </g>
  )
}

type TrendLinesOverlayProps = {
  lines: VisibleTrendLines
  dates: string[]
  yDomain: [number, number]
  layout: PlotLayout
  viewportKey: string
}

/** 차트 플롯 위 절대 SVG — 확대·축소·패닝마다 좌표 재계산 */
export function TrendLinesOverlay({
  lines,
  dates,
  yDomain,
  layout,
  viewportKey,
}: TrendLinesOverlayProps) {
  if (dates.length < 2 || layout.plotWidth <= 0 || layout.plotHeight <= 0) return null

  const clipId = `trend-clip-${viewportKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  const helperStyle: SegmentStyle = {
    stroke: HELPER_TREND_COLOR,
    strokeWidth: 1.5,
    strokeDasharray: '7 5',
    opacity: 0.9,
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={layout.plotLeft}
            y={layout.plotTop}
            width={layout.plotWidth}
            height={layout.plotHeight}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {lines.closeTrend && renderSegment(lines.closeTrend, dates, yDomain, layout, helperStyle)}
        {lines.extremeTrend && renderSegment(lines.extremeTrend, dates, yDomain, layout, helperStyle)}
        {lines.finalTrend &&
          renderSegment(lines.finalTrend, dates, yDomain, layout, {
            stroke: FINAL_TREND_COLOR,
            strokeWidth: 2.5,
            label: '최종 추세',
            showDots: true,
          })}
      </g>
    </svg>
  )
}

export type { PlotLayout as TrendLinesPlotLayout }
