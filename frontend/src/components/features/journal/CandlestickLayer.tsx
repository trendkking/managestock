import { useXAxisScale, useYAxisScale } from 'recharts'
import type { ChartPricePoint } from '@/lib/journalStockChart'

function candleStyle(isUp: boolean) {
  return isUp
    ? { stroke: '#dc2626', fill: '#ef4444' }
    : { stroke: '#2563eb', fill: '#3b82f6' }
}

function bandWidth(xScale: NonNullable<ReturnType<typeof useXAxisScale>>, date: string): number {
  const start = xScale(date, { position: 'start' })
  const end = xScale(date, { position: 'end' })
  if (start != null && end != null) return Math.abs(end - start)
  return 10
}

type CandlestickSeriesProps = {
  data: ChartPricePoint[]
  region?: 'KR' | 'US'
}

/** Recharts 3 — ComposedChart 자식으로 렌더 */
export function CandlestickSeries({ data }: CandlestickSeriesProps) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()

  if (!xScale || !yScale || data.length === 0) return null

  return (
    <g className="recharts-candlestick-layer">
      {data.map((entry) => {
        const open = entry.open ?? entry.close
        const high = entry.high ?? Math.max(open, entry.close)
        const low = entry.low ?? Math.min(open, entry.close)
        const close = entry.close
        const isUp = close >= open
        const { stroke, fill } = candleStyle(isUp)

        const cx = xScale(entry.date, { position: 'middle' })
        if (cx == null || Number.isNaN(cx)) return null

        const bandwidth = bandWidth(xScale, entry.date)
        const bodyWidth = Math.max(4, bandwidth * 0.65)
        const half = bodyWidth / 2

        const yHigh = yScale(high)
        const yLow = yScale(low)
        const yOpen = yScale(open)
        const yClose = yScale(close)
        if (yHigh == null || yLow == null || yOpen == null || yClose == null) return null

        const bodyTop = Math.min(yOpen, yClose)
        const bodyBottom = Math.max(yOpen, yClose)
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1)

        return (
          <g key={entry.date}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={stroke} strokeWidth={1} />
            <rect
              x={cx - half}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
            />
          </g>
        )
      })}
    </g>
  )
}
