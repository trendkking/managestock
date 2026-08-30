import { useXAxisScale, useYAxisScale } from 'recharts'
import type { TrendLineSegment, VisibleTrendLines } from '@/lib/trendAnalysis/trendLines'

const HELPER_TREND_COLOR = '#64748b'
const FINAL_TREND_COLOR = '#16a34a'

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

type SegmentStyle = {
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  label?: string
  showDots?: boolean
  opacity?: number
}

function renderSegment(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  segment: TrendLineSegment,
  style: SegmentStyle,
) {
  const from = plotPoint(xScale, yScale, segment.from.date, segment.from.price)
  const to = plotPoint(xScale, yScale, segment.to.date, segment.to.price)
  if (!from || !to) return null

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

type TrendLinesChartLayerProps = {
  lines: VisibleTrendLines
}

/** 캔들과 동일한 Recharts 스케일로 추세선 렌더 */
export function TrendLinesChartLayer({ lines }: TrendLinesChartLayerProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  const helperStyle: SegmentStyle = {
    stroke: HELPER_TREND_COLOR,
    strokeWidth: 1.5,
    strokeDasharray: '7 5',
    opacity: 0.9,
  }

  return (
    <g className="recharts-trend-lines-layer">
      {lines.closeTrend && renderSegment(xScale, yScale, lines.closeTrend, helperStyle)}
      {lines.extremeTrend && renderSegment(xScale, yScale, lines.extremeTrend, helperStyle)}
      {lines.finalTrend &&
        renderSegment(xScale, yScale, lines.finalTrend, {
          stroke: FINAL_TREND_COLOR,
          strokeWidth: 2.5,
          label: '최종 추세',
          showDots: true,
        })}
    </g>
  )
}
