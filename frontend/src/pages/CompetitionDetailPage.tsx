import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Medal, Trophy } from 'lucide-react'
import { competitionsApi } from '@/api'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAccountsWithStats, useLeaderboard } from '@/hooks/useDerivedData'
import { useDataStore } from '@/stores/dataStore'
import type { LeaderboardEntry, MyCompetitionEntry } from '@/types'
import { CompetitionScoringGuide } from '@/components/features/competitions/CompetitionScoringGuide'
import { formatSignedCurrency, percentColor } from '@/utils'

const TOP_RANK_STYLES: Record<number, string> = {
  1: 'border-amber-300 bg-amber-50',
  2: 'border-slate-300 bg-slate-50',
  3: 'border-orange-300 bg-orange-50/80',
}

function RankingRow({ entry, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        TOP_RANK_STYLES[entry.rank] ?? 'border-slate-200 bg-white'
      } ${highlight ? 'ring-2 ring-red-300' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant={entry.rank <= 3 ? 'default' : 'secondary'} className="shrink-0">
          {entry.rank}위
        </Badge>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {entry.nickname}
            {entry.isMe && ' (나)'}
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

export default function CompetitionDetailPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const competition = useDataStore((s) => s.competitions.find((c) => c.id === competitionId))
  const leaderboard = useLeaderboard(competitionId)
  const accounts = useAccountsWithStats()
  const joinCompetition = useDataStore((s) => s.joinCompetition)
  const loadCompetitionExtras = useDataStore((s) => s.loadCompetitionExtras)
  const [selectedAccount, setSelectedAccount] = useState(String(accounts[0]?.id ?? ''))
  const [joinError, setJoinError] = useState('')
  const [extrasLoading, setExtrasLoading] = useState(false)
  const [myEntries, setMyEntries] = useState<MyCompetitionEntry[]>([])

  useEffect(() => {
    setExtrasLoading(true)
    Promise.all([
      loadCompetitionExtras(competitionId),
      competitionsApi.myEntries().then((res) => {
        setMyEntries(res.items.filter((e) => e.competitionId === competitionId))
      }),
    ])
      .catch(() => undefined)
      .finally(() => setExtrasLoading(false))
  }, [competitionId, loadCompetitionExtras, competition?.isJoined])

  const handleJoin = async () => {
    setJoinError('')
    try {
      await joinCompetition(competitionId, Number(selectedAccount))
      const res = await competitionsApi.myEntries()
      setMyEntries(res.items.filter((e) => e.competitionId === competitionId))
      await loadCompetitionExtras(competitionId)
    } catch (err) {
      setJoinError(getApiErrorMessage(err, '대회 참가에 실패했습니다.'))
    }
  }

  if (!competition) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">대회를 찾을 수 없습니다.</p>
        <Link to="/competitions"><Button className="mt-4" variant="outline">목록으로</Button></Link>
      </div>
    )
  }

  const myLeaderboardRow = leaderboard.find((e) => e.isMe)
  const topThree = leaderboard.slice(0, 3)
  const joinedAccountIds = new Set(myEntries.map((e) => e.accountId))
  const joinableAccounts = accounts.filter((a) => !joinedAccountIds.has(a.id))
  const myScoreDelta =
    myLeaderboardRow?.scoreDelta ??
    myEntries.reduce((sum, e) => sum + e.scoreDelta, 0)
  const myUnrealizedPnl =
    myLeaderboardRow?.unrealizedPnl ??
    myEntries.reduce((sum, e) => sum + e.unrealizedPnl, 0)
  const myRealizedPnl =
    myLeaderboardRow?.realizedPnl ??
    myEntries.reduce((sum, e) => sum + e.realizedPnl, 0)
  const myRank = myLeaderboardRow?.rank
  const showMyRankSeparately = Boolean(myLeaderboardRow && myRank && myRank > 3)

  useEffect(() => {
    if (joinableAccounts.length === 0) return
    if (!joinableAccounts.some((a) => String(a.id) === selectedAccount)) {
      setSelectedAccount(String(joinableAccounts[0].id))
    }
  }, [joinableAccounts, selectedAccount])

  return (
    <div>
      <Link to="/competitions" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 대회 목록
      </Link>

      <PageHeader title={competition.name} description={competition.description} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">기간</p>
          <p className="font-medium">{competition.startDate} ~ {competition.endDate}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">참가자</p>
          <p className="font-medium">{competition.participantCount}명</p>
        </div>
      </div>

      <Card className="mb-6 border-slate-200 bg-slate-50/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">점수 계산 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <CompetitionScoringGuide />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            대회 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extrasLoading && leaderboard.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">랭킹 불러오는 중…</p>
          ) : leaderboard.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">아직 참가자가 없습니다.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Medal className="h-4 w-4 text-amber-500" />
                  TOP 3
                </p>
                <div className="space-y-2">
                  {topThree.map((entry) => (
                    <RankingRow key={entry.rank} entry={entry} highlight={entry.isMe} />
                  ))}
                </div>
              </div>

              {competition.isJoined && myRank != null ? (
                <div className="rounded-xl border border-red-200 bg-primary-subtle/50 p-4 lg:self-start">
                  <p className="text-sm text-slate-600">내 순위</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                    {myRank}
                    <span className="ml-1 text-lg font-semibold text-slate-500">위</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    전체 {leaderboard.length}명 중 · 성적{' '}
                    <span className={`font-semibold ${percentColor(myLeaderboardRow?.scoreDelta ?? 0)}`}>
                      {formatSignedCurrency(myLeaderboardRow?.scoreDelta ?? 0)}
                    </span>
                  </p>
                  {showMyRankSeparately && myLeaderboardRow && (
                    <div className="mt-3 border-t border-red-100 pt-3">
                      <RankingRow entry={myLeaderboardRow} highlight />
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 lg:self-start">
                  대회에 참가하면 내 순위를 확인할 수 있습니다.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {competition.isJoined && myScoreDelta != null && (
        <Card className="mb-6 border-red-200 bg-primary-subtle/40">
          <CardHeader>
            <CardTitle className="text-base">내 대회 성적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">평가금액</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${percentColor(myScoreDelta)}`}>
                  {formatSignedCurrency(myScoreDelta)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">보유손익</p>
                <p className={`mt-1 font-semibold tabular-nums ${percentColor(myUnrealizedPnl)}`}>
                  {formatSignedCurrency(myUnrealizedPnl)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">매매손익</p>
                <p className={`mt-1 font-semibold tabular-nums ${percentColor(myRealizedPnl)}`}>
                  {formatSignedCurrency(myRealizedPnl)}
                </p>
              </div>
              {myRank != null && (
                <div>
                  <p className="text-sm text-slate-500">내 순위</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {myRank}위 <span className="text-sm font-normal text-slate-500">/ {leaderboard.length}명</span>
                  </p>
                </div>
              )}
            </div>
            {myEntries.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                참가 계좌: {myEntries.map((e) => e.accountName).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {competition.status !== 'ended' && joinableAccounts.length > 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-end gap-4 pt-6">
            <div className="flex-1">
              <label className="text-sm font-medium">추가 참가 계좌 선택</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                {joinableAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <Button onClick={() => void handleJoin()} disabled={!selectedAccount || joinableAccounts.length === 0}>
              참가하기
            </Button>
            {joinError && <p className="w-full text-sm text-red-600">{joinError}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>리더보드</CardTitle></CardHeader>
        <CardContent>
          {extrasLoading && leaderboard.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">리더보드 불러오는 중…</p>
          ) : leaderboard.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">아직 참가자가 없습니다.</p>
          ) : (
          <div className="overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                <Th>순위</Th>
                <Th>닉네임</Th>
                <Th>보유손익</Th>
                <Th>매매손익</Th>
                <Th>평가금액</Th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((e) => (
                <tr key={e.rank} className={e.isMe ? 'bg-primary-subtle' : ''}>
                  <Td><Badge variant={e.rank <= 3 ? 'default' : 'secondary'}>{e.rank}</Badge></Td>
                  <Td className="font-medium whitespace-nowrap">{e.nickname}{e.isMe && ' (나)'}</Td>
                  <Td className={`tabular-nums whitespace-nowrap ${percentColor(e.unrealizedPnl ?? 0)}`}>
                    {formatSignedCurrency(e.unrealizedPnl ?? 0)}
                  </Td>
                  <Td className={`tabular-nums whitespace-nowrap ${percentColor(e.realizedPnl ?? 0)}`}>
                    {formatSignedCurrency(e.realizedPnl ?? 0)}
                  </Td>
                  <Td className={`tabular-nums whitespace-nowrap ${percentColor(e.scoreDelta)}`}>
                    {formatSignedCurrency(e.scoreDelta)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>대회 규칙</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <CompetitionScoringGuide />
          {competition.rules && (
            <p className="border-t border-slate-100 pt-4 text-sm text-slate-600">{competition.rules}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
