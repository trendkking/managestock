import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { formatHoldingMarket } from '@/lib/marketLabels'
import { formatHoldingAmount, formatSummaryMoney, holdingCurrency } from '@/lib/holdingsDisplay'
import type { AccountWithStats } from '@/types'
import { formatPercent, percentColor, stockPnlColor } from '@/utils'

function SummaryCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${valueClassName ?? 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}

export function HoldingsTabPanel({
  account,
  isApiAccount,
  onAddHolding,
}: {
  account: AccountWithStats
  isApiAccount: boolean
  onAddHolding: () => void
}) {
  const s = account.holdingsSummary

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCell label="총예수금" value={formatSummaryMoney(s.totalDeposit)} />
        <SummaryCell label="총자산" value={formatSummaryMoney(s.totalAssets)} />
        <SummaryCell label="평가금액" value={formatSummaryMoney(s.evaluationAmount)} />
        <SummaryCell label="매입금액" value={formatSummaryMoney(s.purchaseAmount)} />
        <SummaryCell
          label="평가손익"
          value={formatSummaryMoney(s.profitLoss)}
          valueClassName={stockPnlColor(s.profitLoss)}
        />
        <SummaryCell
          label="수익률"
          value={formatPercent(s.returnRate)}
          valueClassName={percentColor(s.returnRate)}
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          종목별 금액은 해당 통화(원/달러) 기준입니다. 상단 요약은 원화 환산 합계입니다.
        </p>
        {!isApiAccount && (
          <Button size="sm" onClick={onAddHolding}>
            <Plus className="h-4 w-4" /> 종목 추가
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <DataTable>
          <thead>
            <tr>
              <Th>코드</Th>
              <Th>종목명</Th>
              <Th>통화</Th>
              <Th>평가손익</Th>
              <Th>수익률</Th>
              <Th>평가금액</Th>
              <Th>보유수량</Th>
              <Th>매도가능</Th>
              <Th>매입금액</Th>
              <Th>매입단가</Th>
              <Th>현재가</Th>
            </tr>
          </thead>
          <tbody>
            {account.holdings.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">
                  보유 종목이 없습니다.
                </td>
              </tr>
            ) : (
              account.holdings.map((h) => {
                const currency = holdingCurrency(h)
                const purchase = h.purchaseAmount ?? h.quantity * h.avgPrice
                const evaluation = h.evaluationAmount ?? h.quantity * h.currentPrice
                const pnl = h.profitLoss ?? evaluation - purchase
                const returnRate =
                  h.returnRate ?? (purchase > 0 ? (pnl / purchase) * 100 : 0)
                const orderable = h.orderableQuantity ?? h.quantity
                return (
                  <tr key={h.id}>
                    <Td className="font-mono text-xs">{h.stockCode}</Td>
                    <Td>
                      <span className="font-medium">{h.stockName}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatHoldingMarket(h.marketType, h.exchangeCode)}
                      </span>
                    </Td>
                    <Td>{currency}</Td>
                    <Td className={`tabular-nums ${stockPnlColor(pnl)}`}>
                      {formatHoldingAmount(pnl, h.marketType, currency)}
                    </Td>
                    <Td className={`tabular-nums ${percentColor(returnRate)}`}>
                      {formatPercent(returnRate)}
                    </Td>
                    <Td className="tabular-nums">{formatHoldingAmount(evaluation, h.marketType, currency)}</Td>
                    <Td className="tabular-nums">{h.quantity.toLocaleString()}</Td>
                    <Td className="tabular-nums">{orderable.toLocaleString()}</Td>
                    <Td className="tabular-nums">{formatHoldingAmount(purchase, h.marketType, currency)}</Td>
                    <Td className="tabular-nums">{formatHoldingAmount(h.avgPrice, h.marketType, currency)}</Td>
                    <Td className="tabular-nums">{formatHoldingAmount(h.currentPrice, h.marketType, currency)}</Td>
                  </tr>
                )
              })
            )}
          </tbody>
        </DataTable>
      </div>
    </div>
  )
}
