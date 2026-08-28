import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import { StockSearchField } from '@/components/features/journal/StockSearchField'
import { JournalStockChartView } from '@/components/features/journal/JournalStockChartPanel'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { TrendIndicatorPanels } from '@/components/features/trend/TrendIndicatorPanels'
import { Card, CardContent } from '@/components/ui/Card'

type SelectedStock = { code: string; name: string }

type TrendAnalysisWorkspaceProps = {
  defaultStock?: SelectedStock
}

function useChartHeight() {
  const [height, setHeight] = useState(400)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setHeight(mq.matches ? 320 : 420)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return height
}

export function TrendAnalysisWorkspace({ defaultStock }: TrendAnalysisWorkspaceProps) {
  const [stockCode, setStockCode] = useState(defaultStock?.code ?? '')
  const [stockName, setStockName] = useState(defaultStock?.name ?? '')
  const chartHeight = useChartHeight()
  const chart = useJournalStockChart(stockCode, { defaultVisibleMa: [], enableSrLines: false })

  const displayName = chart.chartMeta?.stockName ?? stockName ?? stockCode
  const indicatorContext = {
    stockCode,
    stockName: displayName,
    chart,
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <StockSearchField
            stockCode={stockCode}
            stockName={stockName}
            onSelect={(stock) => {
              setStockCode(stock.code)
              setStockName(stock.name)
            }}
          />
        </CardContent>
      </Card>

      {stockCode ? (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
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

            <TrendIndicatorPanels placement="above" context={indicatorContext} />

            <JournalStockChartView chart={chart} height={chartHeight} enablePanZoom />

            <TrendIndicatorPanels placement="below" context={indicatorContext} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center py-12 text-center">
            <LineChart className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">종목을 검색해 선택하면 차트가 표시됩니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
