import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import {
  JournalMaControls,
  JournalStockChartView,
} from '@/components/features/journal/JournalStockChartPanel'
import { StockSearchField } from '@/components/features/journal/StockSearchField'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { TREND_CHART_FETCH_MONTHS, TREND_CHART_INITIAL_VISIBLE_BARS } from '@/lib/journalStockChart'
import { BasePointControls } from '@/components/features/trend/BasePointControls'
import { TrendLineControls } from '@/components/features/trend/TrendLineControls'
import { TrendIndicatorPanels } from '@/components/features/trend/TrendIndicatorPanels'
import type { BasePointVisibility } from '@/lib/trendAnalysis/basePoints'
import type { TrendLineVisibility } from '@/lib/trendAnalysis/trendLines'
import { Card, CardContent } from '@/components/ui/Card'

type SelectedStock = { code: string; name: string }

type TrendAnalysisWorkspaceProps = {
  defaultStock?: SelectedStock
}

const LAST_STOCK_KEY = 'bullslong-trend-last-stock'

function loadLastStock(): SelectedStock | null {
  try {
    const raw = sessionStorage.getItem(LAST_STOCK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SelectedStock
    if (parsed.code && parsed.name) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function saveLastStock(stock: SelectedStock) {
  sessionStorage.setItem(LAST_STOCK_KEY, JSON.stringify(stock))
}

function useChartHeight() {
  const [height, setHeight] = useState(400)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setHeight(mq.matches ? 340 : 440)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return height
}

export function TrendAnalysisWorkspace({ defaultStock }: TrendAnalysisWorkspaceProps) {
  const initialStock = defaultStock ?? loadLastStock()
  const [stockCode, setStockCode] = useState(initialStock?.code ?? '')
  const [stockName, setStockName] = useState(initialStock?.name ?? '')
  const chartHeight = useChartHeight()
  const [trendLineVisibility, setTrendLineVisibility] = useState<TrendLineVisibility>({
    closeTrend: true,
    extremeTrend: true,
    finalTrend: true,
  })
  const [basePointVisibility, setBasePointVisibility] = useState<BasePointVisibility>({
    hbp: true,
    lbp: true,
  })
  const chart = useJournalStockChart(stockCode, {
    defaultVisibleMa: [],
    enableSrLines: false,
    initialVisibleBars: TREND_CHART_INITIAL_VISIBLE_BARS,
    fetchMonths: TREND_CHART_FETCH_MONTHS,
  })

  const displayName = chart.chartMeta?.stockName ?? stockName ?? stockCode
  const indicatorContext = {
    stockCode,
    stockName: displayName,
    chart,
  }

  const selectStock = (stock: SelectedStock) => {
    setStockCode(stock.code)
    setStockName(stock.name)
    if (stock.code) saveLastStock(stock)
  }

  const toggleTrendLine = (key: keyof TrendLineVisibility) => {
    setTrendLineVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleBasePoint = (key: keyof BasePointVisibility) => {
    setBasePointVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 pt-6">
        <StockSearchField
          stockCode={stockCode}
          stockName={stockName}
          onSelect={(stock) => {
            selectStock({ code: stock.code, name: stock.name })
          }}
        />

        {stockCode ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-100 pt-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{displayName}</h2>
                <p className="text-xs text-slate-500">{stockCode}</p>
              </div>
              {chart.chartMeta?.source && (
                <p className="text-xs text-slate-400">
                  {chart.chartMeta.source}
                  {chart.usingFallback ? ' · 참고용 캔들' : ''}
                </p>
              )}
            </div>

            <JournalMaControls
              visibleMa={chart.visibleMa}
              toggleMa={chart.toggleMa}
              className="border-b border-slate-100 pb-4"
            />

            <TrendLineControls
              visibility={trendLineVisibility}
              onToggle={toggleTrendLine}
              className="border-b border-slate-100 pb-4"
            />

            <BasePointControls
              visibility={basePointVisibility}
              onToggle={toggleBasePoint}
              className="border-b border-slate-100 pb-4"
            />

            <TrendIndicatorPanels placement="above" context={indicatorContext} />

            <JournalStockChartView
              chart={chart}
              height={chartHeight}
              enablePanZoom
              wheelZoomRequiresModifier={false}
              hintStyle="trend"
              trendLineVisibility={trendLineVisibility}
              basePointVisibility={basePointVisibility}
            />

            <TrendIndicatorPanels placement="below" context={indicatorContext} />
          </>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-12 text-center">
            <LineChart className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">종목을 검색해 선택하세요</p>
            <p className="mt-1 text-xs text-slate-500">선택하면 이 영역에 일봉 차트가 표시됩니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
