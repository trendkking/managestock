import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ReturnRateBadge, Badge } from '@/components/ui/Badge'
import { AccountTitleWithFlags } from '@/components/features/accounts/AccountMarketFlags'
import { AccountFormDialog } from '@/components/features/accounts/AccountFormModal'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAccountsWithStats } from '@/hooks/useDerivedData'
import { useDataStore } from '@/stores/dataStore'
import { formatSyncScope } from '@/lib/marketLabels'
import { formatCurrency, stockPnlColor } from '@/utils'

export default function AccountsPage() {
  const accounts = useAccountsWithStats()
  const deleteAccount = useDataStore((s) => s.deleteAccount)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const editAccount = editId ? accounts.find((a) => a.id === editId) : undefined

  return (
    <div>
      <PageHeader
        title="계좌 관리"
        description="주식 계좌를 등록하고 수익률을 추적하세요"
        action={
          <Button onClick={() => { setEditId(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> 계좌 추가
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          title="등록된 계좌가 없습니다"
          description="첫 번째 계좌를 추가해 투자를 시작하세요"
          action={<Button onClick={() => setFormOpen(true)}>계좌 추가</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/accounts/${account.id}`} className="hover:text-primary">
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
                        <Badge
                          variant={account.syncStatus === 'error' ? 'danger' : account.syncStatus === 'connected' ? 'success' : 'secondary'}
                          className="mt-1"
                        >
                          {account.syncStatus === 'connected' ? 'API 연동' : account.syncStatus === 'error' ? '연동 오류' : 'API'}
                        </Badge>
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
                    <span className="font-medium">{formatCurrency(account.currentValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">손익</span>
                    <span className={stockPnlColor(account.profitLoss)}>
                      {formatCurrency(account.profitLoss)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/accounts/${account.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">상세 보기</Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(account.id); setFormOpen(true) }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!confirm('계좌를 삭제하시겠습니까?')) return
                      deleteAccount(account.id).catch((err) => {
                        alert(getApiErrorMessage(err, '계좌 삭제에 실패했습니다.'))
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editAccount} />
    </div>
  )
}
