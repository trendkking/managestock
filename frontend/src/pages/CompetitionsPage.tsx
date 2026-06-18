import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState } from '@/components/ui/Common'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AccountCompetitionPanel } from '@/components/features/competitions/AccountCompetitionPanel'
import { useAccountsWithStats } from '@/hooks/useDerivedData'
import { useDataStore } from '@/stores/dataStore'
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

export default function CompetitionsPage() {
  const competitions = useDataStore((s) => s.competitions)
  const accounts = useAccountsWithStats()
  const [status, setStatus] = useState<CompetitionStatus>('active')

  const filtered = competitions.filter((c) => c.status === status)

  return (
    <div>
      <PageHeader title="경연 대회" description="평가금액(보유손익+매매손익)으로 순위를 겨룹니다" />

      <AccountCompetitionPanel accounts={accounts} />

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
            <Link key={c.id} to={`/competitions/${c.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <Badge variant={statusVariants[c.status]}>{statusLabels[c.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">{c.startDate} ~ {c.endDate}</span>
                    <span>{c.participantCount}명 참가</span>
                  </div>
                  {c.isJoined && <Badge className="mt-3" variant="default">참가 중</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
