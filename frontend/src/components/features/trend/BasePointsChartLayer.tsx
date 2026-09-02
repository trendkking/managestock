import { useId } from 'react'
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts'
import type { BasePoint, CountMark } from '@/lib/trendAnalysis/basePoints'

const HBP_COLOR = '#dc2626'
const LBP_COLOR = '#2563eb'
const RISING_COUNT_COLOR = '#dc2626'
const FALLING_COUNT_COLOR = '#2563eb'
const MARKER_OFFSET = 10
const TRIANGLE_W = 7
const TRIANGLE_H = 8
const COUNT_OFFSET = 14

type BasePointsChartLayerProps = {
  points: BasePoint[]
  countMarks?: CountMark[]
}

function plotXY(
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

/** HBP/LBP 마커 + 상승/하락 카운팅 숫자 */
export function BasePointsChartLayer({ points, countMarks = [] }: BasePointsChartLayerProps) {
  const clipId = useId().replace(/:/g, '')
  const plotArea = usePlotArea()
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  if (!xScale || !yScale) return null
  if (points.length === 0 && countMarks.length === 0) return null

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
    <g className="recharts-base-points-layer" aria-label="Base Points">
      {clipRect && (
        <defs>
          <clipPath id={clipId}>
            <rect x={clipRect.x} y={clipRect.y} width={clipRect.width} height={clipRect.height} />
          </clipPath>
        </defs>
      )}
      <g clipPath={clipRect ? `url(#${clipId})` : undefined}>
        {countMarks.map((mark) => {
          const xy = plotXY(xScale, yScale, mark.date, mark.price)
          if (!xy) return null
          const isRising = mark.direction === 'rising'
          const color = isRising ? RISING_COUNT_COLOR : FALLING_COUNT_COLOR
          const labelY = isRising ? xy.y - COUNT_OFFSET : xy.y + COUNT_OFFSET + 4

          return (
            <text
              key={`count-${mark.source}-${mark.direction}-${mark.count}-${mark.date}-${mark.index}`}
              x={xy.x}
              y={labelY}
              textAnchor="middle"
              fill={color}
              fontSize={11}
              fontWeight={700}
            >
              {mark.count}
            </text>
          )
        })}

        {points.map((point) => {
          const xy = plotXY(xScale, yScale, point.date, point.price)
          if (!xy) return null

          const isHbp = point.kind === 'hbp'
          const color = isHbp ? HBP_COLOR : LBP_COLOR
          const tipY = isHbp ? xy.y - MARKER_OFFSET : xy.y + MARKER_OFFSET
          const baseY = isHbp ? tipY - TRIANGLE_H : tipY + TRIANGLE_H
          const labelY = isHbp ? baseY - 4 : baseY + 12
          const pointsAttr = isHbp
            ? `${xy.x},${tipY} ${xy.x - TRIANGLE_W},${baseY} ${xy.x + TRIANGLE_W},${baseY}`
            : `${xy.x},${tipY} ${xy.x - TRIANGLE_W},${baseY} ${xy.x + TRIANGLE_W},${baseY}`

          return (
            <g key={`${point.kind}-${point.date}-${point.index}`}>
              <circle cx={xy.x} cy={xy.y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.25} />
              <polygon
                points={pointsAttr}
                fill={color}
                stroke="#fff"
                strokeWidth={1}
                strokeLinejoin="round"
              />
              <text
                x={xy.x}
                y={labelY}
                textAnchor="middle"
                fill={color}
                fontSize={10}
                fontWeight={700}
              >
                {isHbp ? 'HBP' : 'LBP'}
              </text>
            </g>
          )
        })}
      </g>
    </g>
  )
}
