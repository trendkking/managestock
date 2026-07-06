import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState } from '@/components/ui/Common'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useDemoAccountsWithStats } from '@/hooks/useDemoDerivedData'
import { useDemoStore } from '@/stores/demoStore'
import type { CompetitionStatus } from '@/types'

const statusLabels: Record<CompetitionStatus, string> = {
  active: '진행 중',
  upcoming: '예정',
  ended: '종료',
}

const statusVariants: Record<CompetitionStatus, 'success' | 'default' | 'secondary'> = {
  active: 'success',
  upcoming: 'default',
  ended: 'secondary',
}

export default function DemoCompetitionsPage() {
  const competitions = useDemoStore((s) => s.competitions)
  const accounts = useDemoAccountsWithStats()
  const [status, setStatus] = useState<CompetitionStatus>('active')

  const filtered = competitions.filter((c) => c.status === status)
  const joined = competitions.filter((c) => c.isJoined)

  return (
    <div>
      <PageHeader
        title="경연 대회"
        description="체험용 샘플 대회입니다. 실제 참가는 회원가입 후 가능합니다."
      />

      {joined.length > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900">
          샘플 계좌 「{accounts[0]?.name}」이 「{joined[0]?.name}」에 참가 중인 예시입니다.
        </div>
      )}

      <Tabs className="mb-6">
        <TabsList>
          {(['active', 'upcoming', 'ended'] as const).map((s) => (
            <TabsTrigger key={s} active={status === s} onClick={() => setStatus(s)}>
              {statusLabels[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState title={`${statusLabels[status]} 대회가 없습니다`} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Link key={c.id} to={`/demo/competitions/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <Badge variant={statusVariants[c.status]}>{statusLabels[c.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                    <span>{c.startDate} ~ {c.endDate}</span>
                    <span>참가 {c.participantCount}명</span>
                  </div>
                  {c.isJoined && <Badge className="mt-3" variant="outline">참가 중 (샘플)</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
