import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/ui/Common'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { useDashboardSummary } from '@/hooks/useDerivedData'
import { useDataStore } from '@/stores/dataStore'
import { formatSignedCurrency, percentColor, truncate } from '@/utils'

export default function DashboardPage() {
  const summary = useDashboardSummary()
  const journalEntries = useDataStore((s) => s.journalEntries)

  const chartData = summary.accountSummaries.map((a) => ({ name: a.name, returnRate: a.returnRate }))

  return (
    <div>
      <PageHeader title="대시보드" description="자산 현황과 최근 활동을 한눈에 확인하세요" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="총 평가금액" value={summary.totalValue} />
        <StatCard label="총 손익" value={summary.totalProfitLoss} />
        <StatCard label="총 수익률" value={summary.totalReturnRate} isPercent />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>계좌별 수익률</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}%`, '수익률']} />
                <Bar dataKey="returnRate" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>참가 중인 대회</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.activeCompetitions.map((c) => (
              <Link key={c.id} to={`/competitions/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-slate-500">내 순위 {c.myRank}위</p>
                </div>
                <span className={`font-semibold ${percentColor(c.scoreDelta)}`}>{formatSignedCurrency(c.scoreDelta)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">최근 매매</h2>
          <DataTable>
            <thead>
              <tr>
                <Th>종목</Th><Th>유형</Th><Th>수량</Th><Th>일시</Th>
              </tr>
            </thead>
            <tbody>
              {summary.recentTrades.map((t) => (
                <tr key={t.id}>
                  <Td>{t.stockName}</Td>
                  <Td><Badge variant={t.tradeType === 'buy' ? 'default' : 'danger'}>{t.tradeType === 'buy' ? '매수' : '매도'}</Badge></Td>
                  <Td>{t.quantity}</Td>
                  <Td>{format(new Date(t.tradedAt), 'MM/dd HH:mm')}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">최근 매매일지</h2>
            <Link to="/journal" className="text-sm text-primary hover:underline">전체 보기</Link>
          </div>
          <div className="space-y-3">
            {journalEntries.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                to={`/journal/chart/${encodeURIComponent(e.stockCode)}?entry=${e.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-red-200"
              >
                <p className="font-medium">
                  {e.stockName} <span className="text-sm font-normal text-slate-500">{e.journalDate}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">{truncate(e.reason, 60)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
