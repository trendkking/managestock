import { useXAxisScale, useYAxisScale } from 'recharts'
import type { TrendLineSegment } from '@/lib/trendAnalysis/trendLines'

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

function plotSegment(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  segment: TrendLineSegment,
): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const from = plotPoint(xScale, yScale, segment.from.date, segment.from.price)
  const to = plotPoint(xScale, yScale, segment.to.date, segment.to.price)
  if (!from || !to) return null
  return { from, to }
}

type TrendLinesChartLayerProps = {
  extremeTrend?: TrendLineSegment | null
  finalTrend?: TrendLineSegment | null
}

/** 고저·최종 추세선 — 캔들과 동일한 Recharts 스케일 (확대·축소 시 즉시 반영) */
export function TrendLinesChartLayer({ extremeTrend, finalTrend }: TrendLinesChartLayerProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  const extreme = extremeTrend ? plotSegment(xScale, yScale, extremeTrend) : null
  const final = finalTrend ? plotSegment(xScale, yScale, finalTrend) : null
  if (!extreme && !final) return null

  return (
    <g className="recharts-trend-lines-layer" aria-label="추세선">
      {extreme && (
        <line
          x1={extreme.from.x}
          y1={extreme.from.y}
          x2={extreme.to.x}
          y2={extreme.to.y}
          stroke={HELPER_TREND_COLOR}
          strokeWidth={1.5}
          strokeDasharray="7 5"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {final && (
        <line
          x1={final.from.x}
          y1={final.from.y}
          x2={final.to.x}
          y2={final.to.y}
          stroke={FINAL_TREND_COLOR}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}
