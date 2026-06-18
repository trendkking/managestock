import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import {
  JournalMaControls,
  JournalSrLinesControls,
  JournalStockChartView,
  type JournalChartMarker,
} from '@/components/features/journal/JournalStockChartPanel'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { ohlcOnDate } from '@/lib/journalStockChart'
import { useDataStore } from '@/stores/dataStore'
import type { JournalEntry } from '@/types'
import { formatCurrency, truncate } from '@/utils'
import { Badge } from '@/components/ui/Badge'

export default function JournalChartPage() {
  const { stockCode: stockCodeParam } = useParams()
  const stockCode = decodeURIComponent(stockCodeParam ?? '')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const chart = useJournalStockChart(stockCode)

  const entries = useMemo(
    () =>
      journalEntries
        .filter((e) => e.stockCode === stockCode)
        .sort((a, b) => a.journalDate.localeCompare(b.journalDate)),
    [journalEntries, stockCode],
  )

  const entryParam = searchParams.get('entry')
  const [selectedId, setSelectedId] = useState<number | null>(
    entryParam ? Number(entryParam) : entries[0]?.id ?? null,
  )

  const stockName = chart.chartMeta?.stockName ?? entries[0]?.stockName ?? stockCode
  const region = chart.region

  useEffect(() => {
    if (entryParam) setSelectedId(Number(entryParam))
  }, [entryParam])

  const markers = useMemo<JournalChartMarker[]>(
    () =>
      entries.map((e) => {
        const ohlc = ohlcOnDate(chart.priceData, e.journalDate)
        const isBuy = e.side === 'buy'
        return {
          date: e.journalDate,
          markerY: isBuy ? ohlc.low : ohlc.high,
          side: e.side,
          close: ohlc.close,
          high: ohlc.high,
          low: ohlc.low,
          entryId: e.id,
          reason: e.reason,
          journalDate: e.journalDate,
        }
      }),
    [entries, chart.priceData],
  )

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? entries[entries.length - 1]

  const selectEntry = (entry: JournalEntry) => {
    setSelectedId(entry.id)
    setSearchParams({ entry: String(entry.id) })
  }

  if (!stockCode) {
    return (
      <div className="py-20 text-center text-slate-500">
        종목 코드가 없습니다.
        <Link to="/journal" className="mt-4 block">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/journal" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 매매일지 목록
      </Link>

      <PageHeader
        title={`${stockName} 차트`}
        description={`${stockCode}${chart.chartMeta ? ` · ${chart.chartMeta.market}` : ''} · 3개월 표시 · 휠/드래그로 이동 · 기록 ${entries.length}건`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/journal')}>
            <Plus className="h-4 w-4" /> 기록 추가
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <JournalMaControls visibleMa={chart.visibleMa} toggleMa={chart.toggleMa} className="mb-4" />
              <JournalStockChartView
                chart={chart}
                markers={markers}
                selectedMarkerId={selectedId}
                onMarkerSelect={(id) => {
                  setSelectedId(id)
                  setSearchParams({ entry: String(id) })
                }}
                showMarkerHint
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-slate-500">선택한 기록</h3>
              {selectedEntry ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-900">{selectedEntry.journalDate}</p>
                    <Badge variant={selectedEntry.side === 'buy' ? 'success' : 'danger'}>
                      {selectedEntry.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{selectedEntry.stockName}</p>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-slate-800">
                    {selectedEntry.reason}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">차트 마커 또는 아래 표에서 기록을 선택하세요.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <JournalSrLinesControls chart={chart} />
            </CardContent>
          </Card>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <DataTable>
            <thead>
              <tr className="bg-slate-50">
                <Th>날짜</Th>
                <Th className="w-20">구분</Th>
                <Th>사유</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`cursor-pointer ${entry.id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => selectEntry(entry)}
                >
                  <Td className="whitespace-nowrap tabular-nums">{entry.journalDate}</Td>
                  <Td>
                    <Badge variant={entry.side === 'buy' ? 'success' : 'danger'}>
                      {entry.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                  </Td>
                  <Td className="text-slate-700">{truncate(entry.reason, 120)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {selectedEntry && (() => {
        const ohlc = ohlcOnDate(chart.priceData, selectedEntry.journalDate)
        const fmt = (v: number) =>
          region === 'US'
            ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : formatCurrency(v)
        return (
          <p className="mt-4 text-xs text-slate-500">
            해당일 시세 — 시가 {fmt(ohlc.open)} · 고가 {fmt(ohlc.high)} · 저가 {fmt(ohlc.low)} · 종가 {fmt(ohlc.close)}
          </p>
        )
      })()}
    </div>
  )
}
