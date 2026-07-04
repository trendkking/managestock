import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { ReturnRateBadge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AccountTitleWithFlags } from '@/components/features/accounts/AccountMarketFlags'
import { HoldingsTabPanel } from '@/components/features/accounts/HoldingsTabPanel'
import { TradePnlChartPanel } from '@/components/features/accounts/TradePnlChartPanel'
import { TradesTabPanel } from '@/components/features/accounts/TradesTabPanel'
import { TradeFormModal, HoldingFormModal } from '@/components/features/accounts/TradeFormModal'
import { useAccountWithStats } from '@/hooks/useDerivedData'
import { formatSyncScope } from '@/lib/marketLabels'
import { formatCurrency, stockPnlColor } from '@/utils'

export default function AccountDetailPage() {
  const { id } = useParams()
  const accountId = Number(id)
  const account = useAccountWithStats(accountId)
  const syncAccount = useDataStore((s) => s.syncAccount)
  const isApiAccount = account?.connectionMode === 'api'
  const [tab, setTab] = useState('holdings')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [tradeOpen, setTradeOpen] = useState(false)
  const [holdingOpen, setHoldingOpen] = useState(false)
  if (!account) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">계좌를 찾을 수 없습니다.</p>
        <Link to="/accounts"><Button className="mt-4" variant="outline">목록으로</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/accounts" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
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
        description={`${account.broker}${account.accountNumberMasked ? ` · ${account.accountNumberMasked}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            {isApiAccount && (
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={async () => {
                  setSyncError('')
                  setSyncing(true)
                  try {
                    await syncAccount(accountId)
                  } catch (err) {
                    setSyncError(getApiErrorMessage(err, '동기화에 실패했습니다.'))
                  } finally {
                    setSyncing(false)
                  }
                }}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '동기화 중...' : 'API 동기화'}
              </Button>
            )}
            <ReturnRateBadge value={account.returnRate} />
          </div>
        }
      />

      {isApiAccount && (
        <div className="mb-4 rounded-lg border border-red-100 bg-primary-subtle px-4 py-3 text-sm text-primary-darker">
          API 연동 계좌입니다. 잔고·보유종목은 「API 동기화」로, 매매내역은 탭에서 기간 선택 시 체결 내역을 불러옵니다.
          <span className="mt-1 block text-primary-darker">
            동기화 범위: {formatSyncScope(account.syncDomestic, account.syncUsMarkets)}
          </span>
          {account.lastSyncedAt && (
            <span className="ml-2 text-primary-dark">
              마지막 동기화: {account.lastSyncedAt.slice(0, 16).replace('T', ' ')}
            </span>
          )}
          {account.syncUsMarkets && account.syncUsMarkets.length > 0 && (
            <span className="mt-1 block text-primary-darker">
              미국 보유종목 표는 달러(USD), 상단 요약은 원화입니다. 손익은 표의 평가손익 합(미국은 ×환율)과 같습니다.
              {account.usdKrwRate
                ? ` (동기화 환율: ${account.usdKrwRate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원/USD)`
                : ''}
            </span>
          )}
        </div>
      )}
      {syncError && <p className="mb-4 text-sm text-red-600">{syncError}</p>}
      {account.lastSyncError && (
        <p className="mb-4 text-sm text-red-600">이전 오류: {account.lastSyncError}</p>
      )}

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
              isApiAccount={isApiAccount}
              onAddHolding={() => setHoldingOpen(true)}
            />
          )}

          {tab === 'trades' && (
            <TradesTabPanel
              accountId={accountId}
              trades={account.trades}
              isApiAccount={isApiAccount}
              syncDomestic={account.syncDomestic}
              onAddTrade={() => setTradeOpen(true)}
            />
          )}

          {tab === 'chart' && (
            <TradePnlChartPanel
              accountId={accountId}
              trades={account.trades}
              isApiAccount={isApiAccount}
              syncDomestic={account.syncDomestic}
            />
          )}
        </TabsContent>
      </Tabs>

      <TradeFormModal open={tradeOpen} onOpenChange={setTradeOpen} accountId={accountId} />
      <HoldingFormModal open={holdingOpen} onOpenChange={setHoldingOpen} accountId={accountId} />
    </div>
  )
}
