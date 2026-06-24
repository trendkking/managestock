import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, subMonths, subYears } from 'date-fns'
import { Calendar, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  buildTradesLedger,
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
import { formatCurrency, formatStockPnl, stockPnlColor } from '@/utils'

const PRESETS: { id: TradePeriodPreset; label: string }[] = [
  { id: '1m', label: '최근 1개월' },
  { id: '3m', label: '최근 3개월' },
  { id: '1y', label: '최근 1년' },
]

function PnlCell({ value }: { value: number }) {
  if (value === 0) {
    return <span className="tabular-nums text-slate-500">{formatStockPnl(0)}</span>
  }
  if (value > 0) {
    return (
      <span className={`tabular-nums font-semibold ${stockPnlColor(value)}`}>
        {formatCurrency(value)}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-baseline tabular-nums font-semibold ${stockPnlColor(value)}`}>
      <span className="mr-px shrink-0">-</span>
      <span>{formatCurrency(Math.abs(value))}</span>
    </span>
  )
}

export function TradesTabPanel({
  accountId,
  trades,
  isApiAccount,
  syncDomestic = true,
  onAddTrade,
}: {
  accountId: number
  trades: Trade[]
  isApiAccount: boolean
  syncDomestic?: boolean
  onAddTrade?: () => void
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

  // 탭 진입 시 최근 1개월만 API 조회 (빠른 첫 화면)
  useEffect(() => {
    if (!fetchFromBroker) return
    void runBrokerImport(brokerImportRange.from, brokerImportRange.to)
  }, [accountId, fetchFromBroker, brokerImportRange.from, brokerImportRange.to, runBrokerImport])

  // 3개월·1년 선택 시 아직 안 불러온 구간만 추가 조회
  useEffect(() => {
    if (!fetchFromBroker || preset === 'custom' || preset === '1m') return
    const range = resolveImportRange(preset, customFrom, customTo)
    void runBrokerImport(range.from, range.to)
  }, [preset, accountId, fetchFromBroker, customFrom, customTo, runBrokerImport])

  // 기간 지정: 이미 불러온 구간 밖일 때만 추가 조회
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

  const rows = useMemo(() => buildTradesLedger(trades, displayRange), [trades, displayRange])
  const sellCount = rows.length - 1
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

  const onFromChange = (value: string) => {
    setPreset('custom')
    setCustomFrom(value)
  }

  const onToChange = (value: string) => {
    setPreset('custom')
    setCustomTo(value)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-slate-600">
          {fetchFromBroker
            ? '처음에는 최근 1개월만 불러옵니다. 3개월·1년은 처음 선택할 때만 추가로 조회하고, 이미 불러온 구간은 바로 보여 줍니다.'
            : '매도한 종목의 확정 손익입니다. 아래 누적은 선택한 기간 안 매도 손익의 합입니다.'}
        </p>
        {!isApiAccount && onAddTrade && (
          <Button size="sm" className="shrink-0" onClick={onAddTrade}>
            <Plus className="h-4 w-4" /> 매매 등록
          </Button>
        )}
      </div>

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
              onClick={() =>
                void runBrokerImport(activeImportRange.from, activeImportRange.to, true)
              }
              title="선택한 기간의 매도 내역을 한국투자증권에서 다시 불러옵니다"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <Label htmlFor="trade-from" className="text-xs text-slate-500">
              시작일
            </Label>
            <Input
              id="trade-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onFromChange(e.target.value)}
              className="mt-1"
              disabled={loading}
            />
          </div>
          <span className="pb-2 text-slate-400">~</span>
          <div className="min-w-[140px]">
            <Label htmlFor="trade-to" className="text-xs text-slate-500">
              종료일
            </Label>
            <Input
              id="trade-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onToChange(e.target.value)}
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
        {fetchError && (
          <p className="mt-2 text-sm text-red-600">
            {fetchError}
            {fetchError.includes('EGW00201') && (
              <span className="mt-1 block text-red-500">
                API 호출이 잠시 제한되었습니다. 10~20초 후 「새로고침」을 눌러 주세요.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
        <DataTable>
          <thead>
            <tr className="bg-sky-100">
              <Th className="text-center">No</Th>
              <Th className="text-center">날짜</Th>
              <Th className="text-center">거래종목</Th>
              <Th className="text-right">매매손익</Th>
              <Th className="text-right">누적 손익</Th>
            </tr>
          </thead>
          <tbody>
            {loading && sellCount === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  체결 내역을 불러오는 중…
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const isBaseline = row.no === null
                const key = isBaseline ? 'baseline' : `trade-${row.tradeId}-${row.date}-${index}`
                return (
                  <tr
                    key={key}
                    className={isBaseline ? 'bg-slate-50/80' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                  >
                    <Td className="text-center tabular-nums">{row.no ?? ''}</Td>
                    <Td className="text-center">{row.date ?? ''}</Td>
                    <Td className="text-center font-medium">{row.stockName ?? ''}</Td>
                    <Td className="text-right">
                      {row.sellPnl != null ? (
                        <PnlCell value={row.sellPnl} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <PnlCell value={row.cumulativePnl} />
                    </Td>
                  </tr>
                )
              })
            )}
            {!loading && sellCount === 0 && totalSellCount > 0 && (
              <tr>
                <td colSpan={5} className="border-b border-slate-100 px-4 py-6 text-center text-sm text-slate-500">
                  선택한 기간에 매도 내역이 없습니다. 기간을 넓혀 보세요.
                </td>
              </tr>
            )}
            {!loading && totalSellCount === 0 && (
              <tr>
                <td colSpan={5} className="border-b border-slate-100 px-4 py-6 text-center text-sm text-slate-500">
                  {fetchFromBroker
                    ? '이 기간에 매도 체결이 없거나 아직 조회되지 않았습니다. 「새로고침」을 눌러 보세요.'
                    : '등록된 매도 내역이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </div>
  )
}
