import { useId } from 'react'
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts'
import type { TrendLineSegment } from '@/lib/trendAnalysis/trendLines'

const HELPER_TREND_COLOR = '#64748b'
const FINAL_TREND_COLOR = '#16a34a'

type PixelPoint = { x: number; y: number }
type PixelSegment = { from: PixelPoint; to: PixelPoint }

function plotPoint(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  date: string,
  price: number,
): PixelPoint | null {
  const x = xScale(date, { position: 'middle' })
  const y = yScale(price)
  if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) return null
  return { x, y }
}

function plotSegment(
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
  yScale: NonNullable<ReturnType<typeof useYAxisScale>>,
  segment: TrendLineSegment,
): PixelSegment | null {
  const from = plotPoint(xScale, yScale, segment.from.date, segment.from.price)
  const to = plotPoint(xScale, yScale, segment.to.date, segment.to.price)
  if (!from || !to) return null
  return { from, to }
}

function yOnPixelLine(from: PixelPoint, to: PixelPoint, x: number): number {
  if (Math.abs(to.x - from.x) < 1e-9) return from.y
  return from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x)
}

/** 화면상 종가·고저 추세선의 수직 중간 — 교점을 반드시 지남 */
function buildFinalTrendPixels(
  close: PixelSegment,
  extreme: PixelSegment,
  startDate: string,
  endDate: string,
  xScale: NonNullable<ReturnType<typeof useXAxisScale>>,
): PixelSegment | null {
  const startX = xScale(startDate, { position: 'middle' })
  const endX = xScale(endDate, { position: 'middle' })
  if (startX == null || endX == null || Number.isNaN(startX) || Number.isNaN(endX)) return null

  return {
    from: {
      x: startX,
      y: (yOnPixelLine(close.from, close.to, startX) + yOnPixelLine(extreme.from, extreme.to, startX)) / 2,
    },
    to: {
      x: endX,
      y: (yOnPixelLine(close.from, close.to, endX) + yOnPixelLine(extreme.from, extreme.to, endX)) / 2,
    },
  }
}

type TrendLinesChartLayerProps = {
  closeTrend?: TrendLineSegment | null
  extremeTrend?: TrendLineSegment | null
  showFinalTrend?: boolean
  spanFrom?: string
  spanTo?: string
}

/** 추세선 — 캔들과 동일한 Recharts 스케일, 플롯 영역 밖(X축 눈금 등)은 클립 */
export function TrendLinesChartLayer({
  closeTrend,
  extremeTrend,
  showFinalTrend = false,
  spanFrom,
  spanTo,
}: TrendLinesChartLayerProps) {
  const clipId = useId().replace(/:/g, '')
  const plotArea = usePlotArea()
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null

  const close = closeTrend ? plotSegment(xScale, yScale, closeTrend) : null
  const extreme = extremeTrend ? plotSegment(xScale, yScale, extremeTrend) : null
  const final =
    showFinalTrend && close && extreme && spanFrom && spanTo
      ? buildFinalTrendPixels(close, extreme, spanFrom, spanTo, xScale)
      : null

  if (!close && !extreme && !final) return null

  const clipRect =
    plotArea != null
      ? {
          x: plotArea.x,
          y: plotArea.y,
          width: plotArea.width,
          height: plotArea.height,
        }
      : null

  return (
    <g className="recharts-trend-lines-layer" aria-label="추세선">
      {clipRect && (
        <defs>
          <clipPath id={clipId}>
            <rect x={clipRect.x} y={clipRect.y} width={clipRect.width} height={clipRect.height} />
          </clipPath>
        </defs>
      )}
      <g clipPath={clipRect ? `url(#${clipId})` : undefined}>
        {close && (
          <line
            x1={close.from.x}
            y1={close.from.y}
            x2={close.to.x}
            y2={close.to.y}
            stroke={HELPER_TREND_COLOR}
            strokeWidth={1.5}
            strokeDasharray="7 5"
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
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
    </g>
  )
}
