import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/Common'
import { Card, CardContent } from '@/components/ui/Card'
import { ReturnRateBadge, Badge } from '@/components/ui/Badge'
import { AccountTitleWithFlags } from '@/components/features/accounts/AccountMarketFlags'
import { useDemoAccountsWithStats } from '@/hooks/useDemoDerivedData'
import { formatSyncScope } from '@/lib/marketLabels'
import { formatCurrency } from '@/utils'

export default function DemoAccountsPage() {
  const accounts = useDemoAccountsWithStats()

  return (
    <div>
      <PageHeader
        title="계좌 관리"
        description="체험용 샘플 계좌입니다. 실제 증권사 연동은 회원가입 후 이용할 수 있습니다."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id} className="transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to={`/demo/accounts/${account.id}`} className="hover:text-primary">
                    <AccountTitleWithFlags
                      name={account.name}
                      syncDomestic={account.syncDomestic}
                      syncUsMarkets={account.syncUsMarkets}
                      size="sm"
                      titleClassName="text-lg hover:text-primary"
                    />
                  </Link>
                  <p className="text-sm text-slate-500">
                    {account.broker}
                    {account.accountNumberMasked ? ` · ${account.accountNumberMasked}` : ''}
                  </p>
                  {account.connectionMode === 'api' && (
                    <>
                      <Badge variant="success" className="mt-1">API 연동 (샘플)</Badge>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSyncScope(account.syncDomestic, account.syncUsMarkets)}
                      </p>
                    </>
                  )}
                </div>
                <ReturnRateBadge value={account.returnRate} />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">현재평가</span>
                  <span className="font-medium tabular-nums">{formatCurrency(account.currentValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">손익</span>
                  <span className={`font-medium tabular-nums ${account.profitLoss >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatCurrency(account.profitLoss)}
                  </span>
                </div>
              </div>
              <Link
                to={`/demo/accounts/${account.id}`}
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                상세 보기 →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
