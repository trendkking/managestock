import { useXAxisScale, useYAxisScale } from 'recharts'
import type { VisibleTrendLines, TrendLineSegment } from '@/lib/trendAnalysis/trendLines'

const CLOSE_TREND_COLOR = '#0f172a'
const EXTREME_TREND_COLOR = '#9333ea'

function plotPoint(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  date: string,
  price: number,
): { x: number; y: number } | null {
  const x = xScale(date, { position: 'middle' })
  const y = yScale(price)
  if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) return null
  return { x, y }
}

function renderSegment(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  segment: TrendLineSegment,
  stroke: string,
  strokeDasharray: string,
  label: string,
) {
  const from = plotPoint(xScale, yScale, segment.from.date, segment.from.price)
  const to = plotPoint(xScale, yScale, segment.to.date, segment.to.price)
  if (!from || !to) return null

  const labelX = (from.x + to.x) / 2
  const labelY = (from.y + to.y) / 2 - 8

  return (
    <g key={label} aria-label={label}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
      />
      <circle cx={from.x} cy={from.y} r={3} fill={stroke} />
      <circle cx={to.x} cy={to.y} r={3} fill={stroke} />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fill={stroke}
        fontSize={10}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  )
}

type TrendLinesLayerProps = {
  lines: VisibleTrendLines
}

/** Recharts ComposedChart 자식 — 보이는 구간 기준 추세선 */
export function TrendLinesLayer({ lines }: TrendLinesLayerProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  return (
    <g className="recharts-trend-lines-layer">
      {lines.closeTrend &&
        renderSegment(xScale, yScale, lines.closeTrend, CLOSE_TREND_COLOR, '7 4', '종가 추세')}
      {lines.extremeTrend &&
        renderSegment(xScale, yScale, lines.extremeTrend, EXTREME_TREND_COLOR, '4 3', '고저 추세')}
    </g>
  )
}
