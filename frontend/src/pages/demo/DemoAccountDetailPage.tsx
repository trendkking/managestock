import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { ReturnRateBadge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AccountTitleWithFlags } from '@/components/features/accounts/AccountMarketFlags'
import { HoldingsTabPanel } from '@/components/features/accounts/HoldingsTabPanel'
import { TradePnlChartPanel } from '@/components/features/accounts/TradePnlChartPanel'
import { TradesTabPanel } from '@/components/features/accounts/TradesTabPanel'
import { useDemoAccountWithStats } from '@/hooks/useDemoDerivedData'
import { formatCurrency, stockPnlColor } from '@/utils'

export default function DemoAccountDetailPage() {
  const { id } = useParams()
  const accountId = Number(id)
  const account = useDemoAccountWithStats(accountId)
  const [tab, setTab] = useState('holdings')

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

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        체험 모드 샘플 계좌입니다. 보유종목·매매내역은 예시 데이터이며, 실제 증권사 연동은 회원가입 후 이용할 수 있습니다.
      </div>

      <PageHeader
        title={
          <AccountTitleWithFlags
            name={account.name}
            syncDomestic={account.syncDomestic}
            syncUsMarkets={account.syncUsMarkets}
            titleClassName="text-2xl font-bold text-slate-900"
          />
        }
        description={`${account.broker}${account.accountNumberMasked ? ` · ${account.accountNumberMasked}` : ''}`}
        action={<ReturnRateBadge value={account.returnRate} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">현재평가</p>
          <p className="text-xl font-bold">{formatCurrency(account.currentValue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">손익</p>
          <p className={`text-xl font-bold ${stockPnlColor(account.profitLoss)}`}>{formatCurrency(account.profitLoss)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">현금잔고</p>
          <p className="text-xl font-bold">{formatCurrency(account.cashBalance)}</p>
        </div>
      </div>

      <Tabs>
        <TabsList>
          <TabsTrigger active={tab === 'holdings'} onClick={() => setTab('holdings')}>보유종목</TabsTrigger>
          <TabsTrigger active={tab === 'trades'} onClick={() => setTab('trades')}>매매내역</TabsTrigger>
          <TabsTrigger active={tab === 'chart'} onClick={() => setTab('chart')}>수익률 차트</TabsTrigger>
        </TabsList>

        <TabsContent>
          {tab === 'holdings' && (
            <HoldingsTabPanel
              account={account}
              isApiAccount={false}
              onAddHolding={() => window.alert('체험 모드에서는 종목을 추가할 수 없습니다. 회원가입 후 이용해 주세요.')}
            />
          )}

          {tab === 'trades' && (
            <TradesTabPanel
              accountId={accountId}
              trades={account.trades}
              isApiAccount={false}
              syncDomestic={account.syncDomestic}
            />
          )}

          {tab === 'chart' && (
            <TradePnlChartPanel
              accountId={accountId}
              trades={account.trades}
              isApiAccount={false}
              syncDomestic={account.syncDomestic}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
