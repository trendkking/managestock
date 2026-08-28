import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import {
  JournalMaControls,
  JournalStockChartView,
} from '@/components/features/journal/JournalStockChartPanel'
import { StockSearchField } from '@/components/features/journal/StockSearchField'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { TrendIndicatorPanels } from '@/components/features/trend/TrendIndicatorPanels'
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
  const chart = useJournalStockChart(stockCode, { enableSrLines: false })

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

            <TrendIndicatorPanels placement="above" context={indicatorContext} />

            <JournalStockChartView
              chart={chart}
              height={chartHeight}
              enablePanZoom
              wheelZoomRequiresModifier={false}
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
