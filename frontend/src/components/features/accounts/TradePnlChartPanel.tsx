import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, subMonths, subYears } from 'date-fns'
import { Calendar, Loader2, RefreshCw } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  buildTradePnlChartPoints,
  defaultBrokerImportRange,
  formatRangeLabel,
  rangeForPreset,
  resolveImportRange,
  todayDateString,
  tradeSide,
  type TradePeriodPreset,
} from '@/lib/tradesLedger'
import { useDataStore } from '@/stores/dataStore'
import type { Trade } from '@/types'
import { formatCurrency } from '@/utils'

const PRESETS: { id: TradePeriodPreset; label: string }[] = [
  { id: '1m', label: '최근 1개월' },
  { id: '3m', label: '최근 3개월' },
  { id: '1y', label: '최근 1년' },
]

/** 막대(매매손익) / 선(누적운용손익) — 대비가 큰 조합 */
const COLOR_TRADE_PNL = '#dc2626'
const COLOR_CUMULATIVE = '#10b981'

const CHART_HEIGHT = 400

function chartLayout(pointCount: number) {
  if (pointCount <= 6) {
    return { maxBarSize: 40, barCategoryGap: '22%', tickSize: 11, angle: -32, bottom: 72 }
  }
  if (pointCount <= 12) {
    return { maxBarSize: 28, barCategoryGap: '14%', tickSize: 10, angle: -38, bottom: 78 }
  }
  if (pointCount <= 24) {
    return { maxBarSize: 18, barCategoryGap: '8%', tickSize: 9, angle: -45, bottom: 84 }
  }
  if (pointCount <= 40) {
    return { maxBarSize: 10, barCategoryGap: '4%', tickSize: 8, angle: -52, bottom: 88 }
  }
  return { maxBarSize: 5, barCategoryGap: '2%', tickSize: 7, angle: -58, bottom: 92 }
}

function ChartLegendRow() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-8 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="inline-block h-4 w-6 rounded-sm" style={{ backgroundColor: COLOR_TRADE_PNL }} />
        매매손익
      </span>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="relative inline-flex h-4 w-8 items-center">
          <span
            className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: COLOR_CUMULATIVE }}
          />
          <span
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white"
            style={{ backgroundColor: COLOR_CUMULATIVE }}
          />
        </span>
        누적운용손익
      </span>
    </div>
  )
}

/** Y축 — 원 단위 전체 숫자 (예: 75,000,000) */
function formatAxisWon(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

type TooltipPayload = {
  payload?: {
    label: string
    date: string
    tradePnl: number
    tradePnlKnown: boolean
    cumulativePnl: number
  }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-slate-900">{p.label}</p>
      <p className="text-xs text-slate-500">{p.date}</p>
      <p className="mt-1 font-medium" style={{ color: COLOR_TRADE_PNL }}>
        매매손익: {p.tradePnlKnown ? formatCurrency(p.tradePnl) : '—'}
      </p>
      <p className="font-medium" style={{ color: COLOR_CUMULATIVE }}>
        누적운용손익: {formatCurrency(p.cumulativePnl)}
      </p>
    </div>
  )
}

export function TradePnlChartPanel({
  accountId,
  trades,
  isApiAccount,
  syncDomestic = true,
}: {
  accountId: number
  trades: Trade[]
  isApiAccount: boolean
  syncDomestic?: boolean
}) {
  const importTradesForRange = useDataStore((s) => s.importTradesForRange)
  const [preset, setPreset] = useState<TradePeriodPreset>('1m')
  const [customFrom, setCustomFrom] = useState(() => format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(todayDateString())
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const displayRange = useMemo(
    () => rangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )
  const fetchFromBroker = isApiAccount && syncDomestic
  const brokerImportRange = useMemo(() => defaultBrokerImportRange(), [])
  const activeImportRange = useMemo(
    () => resolveImportRange(preset === 'custom' ? 'custom' : preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  const runBrokerImport = useCallback(
    async (from: string, to: string, force = false) => {
      setLoading(true)
      setFetchError('')
      try {
        await importTradesForRange(accountId, from, to, { force })
      } catch (err) {
        setFetchError(getApiErrorMessage(err, '체결 내역을 불러오지 못했습니다.'))
      } finally {
        setLoading(false)
      }
    },
    [accountId, importTradesForRange],
  )

  useEffect(() => {
    if (!fetchFromBroker) return
    void runBrokerImport(brokerImportRange.from, brokerImportRange.to)
  }, [accountId, fetchFromBroker, brokerImportRange.from, brokerImportRange.to, runBrokerImport])

  useEffect(() => {
    if (!fetchFromBroker || preset === 'custom' || preset === '1m') return
    const range = resolveImportRange(preset, customFrom, customTo)
    void runBrokerImport(range.from, range.to)
  }, [preset, accountId, fetchFromBroker, customFrom, customTo, runBrokerImport])

  useEffect(() => {
    if (!fetchFromBroker || preset !== 'custom') return
    const from = customFrom
    const to = customTo || todayDateString()
    if (!from) return
    const timer = window.setTimeout(() => {
      void runBrokerImport(from, to)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [preset, customFrom, customTo, fetchFromBroker, runBrokerImport])

  const chartData = useMemo(
    () => buildTradePnlChartPoints(trades, displayRange),
    [trades, displayRange],
  )
  const sellCount = chartData.length
  const totalSellCount = trades.filter((t) => tradeSide(t) === 'sell').length

  const applyPreset = (next: TradePeriodPreset) => {
    setPreset(next)
    const nextRange = rangeForPreset(next, customFrom, customTo)
    setCustomFrom(
      nextRange.from ??
        (next === '1y'
          ? format(subYears(new Date(), 1), 'yyyy-MM-dd')
          : next === '3m'
            ? format(subMonths(new Date(), 3), 'yyyy-MM-dd')
            : format(subMonths(new Date(), 1), 'yyyy-MM-dd')),
    )
    setCustomTo(nextRange.to ?? todayDateString())
  }

  const layout = useMemo(() => chartLayout(sellCount), [sellCount])

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        매도한 종목마다 <span className="font-semibold text-primary">매매손익</span>(막대)과{' '}
        <span className="font-semibold text-emerald-600">누적운용손익</span>(선)을 함께 보여 줍니다. 종목이 많아도 차트
        너비는 고정되고 막대 간격만 좁아집니다.
      </p>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={preset === p.id ? 'default' : 'outline'}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={preset === 'custom' ? 'default' : 'outline'}
            onClick={() => setPreset('custom')}
          >
            <Calendar className="h-4 w-4" />
            기간 지정
          </Button>
          {fetchFromBroker && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void runBrokerImport(activeImportRange.from, activeImportRange.to, true)}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <Label htmlFor="chart-from" className="text-xs text-slate-500">
              시작일
            </Label>
            <Input
              id="chart-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => {
                setPreset('custom')
                setCustomFrom(e.target.value)
              }}
              className="mt-1"
              disabled={loading}
            />
          </div>
          <span className="pb-2 text-slate-400">~</span>
          <div className="min-w-[140px]">
            <Label htmlFor="chart-to" className="text-xs text-slate-500">
              종료일
            </Label>
            <Input
              id="chart-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => {
                setPreset('custom')
                setCustomTo(e.target.value)
              }}
              className="mt-1"
              disabled={loading}
            />
          </div>
          <p className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span>
              <span className="font-medium text-slate-800">{formatRangeLabel(displayRange)}</span>
              {' · '}
              매도 <span className="font-medium tabular-nums">{sellCount}</span>건
            </span>
          </p>
        </div>
        {fetchError && <p className="mt-2 text-sm text-red-600">{fetchError}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-amber-50/80 to-white p-4">
        {loading && sellCount === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">차트 데이터를 불러오는 중…</p>
        ) : sellCount === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {totalSellCount > 0
              ? '선택한 기간에 매도 내역이 없습니다. 기간을 넓혀 보세요.'
              : fetchFromBroker
                ? '매도 체결이 없거나 아직 조회되지 않았습니다. 매매내역 탭에서 「새로고침」을 눌러 보세요.'
                : '표시할 매도·매매손익 데이터가 없습니다.'}
          </p>
        ) : (
          <div className="w-full">
            <ChartLegendRow />
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <ComposedChart
                data={chartData}
                margin={{ top: 16, right: 20, left: 4, bottom: layout.bottom }}
                barCategoryGap={layout.barCategoryGap}
                barGap={1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: layout.tickSize, fill: '#1e293b' }}
                  angle={layout.angle}
                  textAnchor="end"
                  height={layout.bottom - 8}
                  interval={0}
                  tickMargin={6}
                />
                <YAxis
                  tickFormatter={formatAxisWon}
                  tick={{ fontSize: 10, fill: '#475569' }}
                  width={96}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                <Bar
                  dataKey="tradePnl"
                  name="매매손익"
                  fill={COLOR_TRADE_PNL}
                  maxBarSize={layout.maxBarSize}
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePnl"
                  name="누적운용손익"
                  stroke={COLOR_CUMULATIVE}
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: COLOR_CUMULATIVE,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
