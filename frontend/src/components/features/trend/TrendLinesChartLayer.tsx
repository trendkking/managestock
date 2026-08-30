import { useXAxisScale, useYAxisScale } from 'recharts'
import type { TrendLineSegment } from '@/lib/trendAnalysis/trendLines'

const HELPER_TREND_COLOR = '#64748b'

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

type TrendLinesChartLayerProps = {
  extremeTrend: TrendLineSegment
}

/** 고저 추세선 — 캔들과 동일한 Recharts 스케일 */
export function TrendLinesChartLayer({ extremeTrend }: TrendLinesChartLayerProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  const from = plotPoint(xScale, yScale, extremeTrend.from.date, extremeTrend.from.price)
  const to = plotPoint(xScale, yScale, extremeTrend.to.date, extremeTrend.to.price)
  if (!from || !to) return null

  return (
    <g className="recharts-trend-lines-layer" aria-label="고저 추세">
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={HELPER_TREND_COLOR}
        strokeWidth={1.5}
        strokeDasharray="7 5"
        strokeLinecap="round"
        opacity={0.9}
      />
    </g>
  )
}
