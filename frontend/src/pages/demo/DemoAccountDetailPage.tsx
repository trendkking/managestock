import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { ReturnRateBadge } from '@/components/ui/Badge'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { AccountTitleWithFlags } from '@/components/features/accounts/AccountMarketFlags'
import { useDemoAccountWithStats } from '@/hooks/useDemoDerivedData'
import { useDemoStore } from '@/stores/demoStore'
import { formatCurrency, stockPnlColor } from '@/utils'

export default function DemoAccountDetailPage() {
  const { id } = useParams()
  const accountId = Number(id)
  const account = useDemoAccountWithStats(accountId)
  const trades = useDemoStore((s) => s.trades.filter((t) => t.accountId === accountId))

  if (!account) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">계좌를 찾을 수 없습니다.</p>
        <Link to="/demo/accounts"><Button className="mt-4" variant="outline">목록으로</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/demo/accounts" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 계좌 목록
      </Link>

      <PageHeader
        title={
          <AccountTitleWithFlags
            name={account.name}
            syncDomestic={account.syncDomestic}
            syncUsMarkets={account.syncUsMarkets}
            titleClassName="text-2xl font-bold text-slate-900"
          />
        }
        description={`${account.broker} · 체험용 샘플 계좌`}
        action={<ReturnRateBadge value={account.returnRate} />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">현재평가</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(account.currentValue)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">손익</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${stockPnlColor(account.profitLoss)}`}>
            {formatCurrency(account.profitLoss)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">수익률</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${stockPnlColor(account.returnRate)}`}>
            {account.returnRate.toFixed(2)}%
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">보유 종목</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border bg-white">
        <DataTable>
          <thead>
            <tr className="bg-slate-50">
              <Th>종목</Th>
              <Th className="text-right">수량</Th>
              <Th className="text-right">평균단가</Th>
              <Th className="text-right">현재가</Th>
              <Th className="text-right">평가손익</Th>
            </tr>
          </thead>
          <tbody>
            {account.holdings.map((h) => {
              const pnl = (h.currentPrice - h.avgPrice) * h.quantity
              return (
                <tr key={h.id}>
                  <Td>
                    <span className="font-medium">{h.stockName}</span>
                    <span className="ml-2 text-xs text-slate-500">{h.stockCode}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{h.quantity}</Td>
                  <Td className="text-right tabular-nums">{formatCurrency(h.avgPrice)}</Td>
                  <Td className="text-right tabular-nums">{formatCurrency(h.currentPrice)}</Td>
                  <Td className={`text-right tabular-nums ${stockPnlColor(pnl)}`}>{formatCurrency(pnl)}</Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </div>

      <h2 className="mb-3 text-lg font-semibold">매매 내역 (샘플)</h2>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <DataTable>
          <thead>
            <tr className="bg-slate-50">
              <Th>종목</Th>
              <Th>구분</Th>
              <Th className="text-right">수량</Th>
              <Th className="text-right">가격</Th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <Td>{t.stockName}</Td>
                <Td>{t.tradeType === 'buy' ? '매수' : '매도'}</Td>
                <Td className="text-right tabular-nums">{t.quantity}</Td>
                <Td className="text-right tabular-nums">{formatCurrency(t.price)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  )
}
