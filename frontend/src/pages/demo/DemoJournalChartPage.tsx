import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { JournalEntriesList } from '@/components/features/journal/JournalEntriesList'
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
import { ohlcOnDate, resolvePriceDate } from '@/lib/journalStockChart'
import { useDemoStore } from '@/stores/demoStore'
import type { JournalEntry } from '@/types'
import { formatCurrency } from '@/utils'
import { Badge } from '@/components/ui/Badge'

function useMobileChartHeight() {
  const [height, setHeight] = useState(380)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setHeight(mq.matches ? 400 : 380)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return height
}

export default function DemoJournalChartPage() {
  const { stockCode: stockCodeParam } = useParams()
  const stockCode = decodeURIComponent(stockCodeParam ?? '')
  const [searchParams, setSearchParams] = useSearchParams()
  const journalEntries = useDemoStore((s) => s.journalEntries)
  const chart = useJournalStockChart(stockCode)
  const chartHeight = useMobileChartHeight()

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
      entries.flatMap((e) => {
        const chartDate = resolvePriceDate(chart.priceData, e.journalDate)
        if (!chartDate) return []
        const ohlc = ohlcOnDate(chart.priceData, e.journalDate)
        const isBuy = e.side === 'buy'
        return [
          {
            date: chartDate,
            markerY: isBuy ? ohlc.low : ohlc.high,
            side: e.side,
            close: ohlc.close,
            high: ohlc.high,
            low: ohlc.low,
            entryId: e.id,
            reason: e.reason,
            journalDate: e.journalDate,
          },
        ]
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
        <Link to="/demo/journal" className="mt-4 block">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <Link to="/demo/journal" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 매매일지 목록
      </Link>

      <PageHeader
        title={`${stockName} 차트`}
        description={`${stockCode} · 체험용 샘플 기록 ${entries.length}건`}
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 -mx-4 w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)] lg:col-span-2">
          <Card className="overflow-hidden rounded-none border-x-0 shadow-none sm:rounded-xl sm:border sm:shadow-sm">
            <CardContent className="p-0 pt-4 sm:pt-6">
              <div className="px-4 md:px-6">
                <JournalMaControls visibleMa={chart.visibleMa} toggleMa={chart.toggleMa} className="mb-4" />
              </div>
              <JournalStockChartView
                chart={chart}
                height={chartHeight}
                markers={markers}
                selectedMarkerId={selectedId}
                onMarkerSelect={(id) => {
                  setSelectedId(id)
                  setSearchParams({ entry: String(id) })
                }}
                showMarkerHint
                edgeToEdge
              />
              <div className="mt-4 border-t border-slate-100 pt-4 px-4 md:px-6 lg:hidden">
                <JournalSrLinesControls chart={chart} compact />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-slate-500">선택한 기록</h3>
              {selectedEntry ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-slate-900">{selectedEntry.journalDate}</p>
                    <Badge variant={selectedEntry.side === 'buy' ? 'success' : 'danger'}>
                      {selectedEntry.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{selectedEntry.stockName}</p>
                  <div className="rounded-lg border border-red-100 bg-primary-subtle/60 p-4 text-sm leading-relaxed text-slate-800">
                    {selectedEntry.reason}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">차트 마커 또는 아래 기록에서 항목을 선택하세요.</p>
              )}
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardContent className="pt-6">
              <JournalSrLinesControls chart={chart} />
            </CardContent>
          </Card>
        </div>
      </div>

      {entries.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 text-sm font-semibold text-slate-500">이 종목 기록</h3>
          <JournalEntriesList
            entries={entries}
            variant="chart"
            selectedId={selectedId}
            onEntryClick={selectEntry}
          />
        </>
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
