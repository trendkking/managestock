import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Medal } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { useDemoLeaderboard } from '@/hooks/useDemoDerivedData'
import { useDemoStore } from '@/stores/demoStore'
import type { LeaderboardEntry } from '@/types'
import { formatSignedCurrency, percentColor } from '@/utils'

const TOP_RANK_STYLES: Record<number, string> = {
  1: 'border-amber-300 bg-amber-50',
  2: 'border-slate-300 bg-slate-50',
  3: 'border-orange-300 bg-orange-50/80',
}

function RankingRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        TOP_RANK_STYLES[entry.rank] ?? 'border-slate-200 bg-white'
      } ${entry.isMe ? 'ring-2 ring-red-300' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant={entry.rank <= 3 ? 'default' : 'secondary'} className="shrink-0">
          {entry.rank}위
        </Badge>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {entry.nickname}
            {entry.isMe && ' (체험)'}
          </p>
          <p className="truncate text-xs text-slate-500">{entry.accountName}</p>
        </div>
      </div>
      <p className={`shrink-0 text-right font-semibold tabular-nums ${percentColor(entry.scoreDelta)}`}>
        {formatSignedCurrency(entry.scoreDelta)}
      </p>
    </div>
  )
}

export default function DemoCompetitionDetailPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const competition = useDemoStore((s) => s.competitions.find((c) => c.id === competitionId))
  const leaderboard = useDemoLeaderboard(competitionId)

  if (!competition) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">대회를 찾을 수 없습니다.</p>
        <Link to="/demo/competitions"><Button className="mt-4" variant="outline">목록으로</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/demo/competitions" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 대회 목록
      </Link>

      <PageHeader
        title={competition.name}
        description={`${competition.startDate} ~ ${competition.endDate} · 체험용 샘플 순위`}
      />

      <Card className="mb-6">
        <CardContent className="space-y-2 pt-6 text-sm text-slate-600">
          <p>{competition.description}</p>
          {competition.rules && <p className="text-slate-500">{competition.rules}</p>}
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <Medal className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold">리더보드 (샘플)</h2>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-slate-500">이 대회의 샘플 순위가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <RankingRow key={entry.rank} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
