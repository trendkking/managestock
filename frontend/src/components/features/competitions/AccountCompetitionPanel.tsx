import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy } from 'lucide-react'
import { competitionsApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import type { AccountWithStats, Competition, MyCompetitionEntry } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  upcoming: '예정',
  active: '진행 중',
  ended: '종료',
}

export function AccountCompetitionPanel({ accounts }: { accounts: AccountWithStats[] }) {
  const competitions = useDataStore((s) => s.competitions)
  const joinCompetition = useDataStore((s) => s.joinCompetition)
  const leaveCompetition = useDataStore((s) => s.leaveCompetition)
  const [entries, setEntries] = useState<MyCompetitionEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const res = await competitionsApi.myEntries()
      setEntries(res.items)
    } catch (err) {
      setError(getApiErrorMessage(err, '대회 참가 정보를 불러오지 못했습니다.'))
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries, competitions])

  const joinableCompetitions = useMemo(
    () => competitions.filter((c) => c.status === 'active' || c.status === 'upcoming'),
    [competitions],
  )

  const entriesByCompetition = useMemo(() => {
    const map = new Map<number, MyCompetitionEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.competitionId) ?? []
      list.push(entry)
      map.set(entry.competitionId, list)
    }
    return map
  }, [entries])

  const runJoin = async (competition: Competition, accountId: number) => {
    const key = `join-${competition.id}-${accountId}`
    setBusyKey(key)
    setError('')
    try {
      await joinCompetition(competition.id, accountId)
      await loadEntries()
    } catch (err) {
      setError(getApiErrorMessage(err, '대회 참가에 실패했습니다.'))
    } finally {
      setBusyKey(null)
    }
  }

  const runLeave = async (competitionId: number, accountId: number) => {
    const key = `leave-${competitionId}-${accountId}`
    setBusyKey(key)
    setError('')
    try {
      await leaveCompetition(competitionId, accountId)
      await loadEntries()
    } catch (err) {
      setError(getApiErrorMessage(err, '참가 해제에 실패했습니다.'))
    } finally {
      setBusyKey(null)
    }
  }

  if (joinableCompetitions.length === 0 && entries.length === 0 && !loadingEntries) {
    return null
  }

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/40">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">경연 대회 참가</h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          계좌별로 대회에 참가할 수 있습니다. 여러 계좌를 참가하면 평가금액·순위는 계좌별 손익을 합산합니다.
        </p>

        {accounts.length === 0 && joinableCompetitions.length > 0 && (
          <p className="mb-4 text-sm text-slate-600">
            <Link to="/accounts" className="font-medium text-blue-600 hover:underline">
              계좌를 등록
            </Link>
            한 뒤 대회에 참가할 수 있습니다.
          </p>
        )}

        {loadingEntries && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> 참가 정보 불러오는 중…
          </p>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {joinableCompetitions.map((comp) => {
            const joinedEntries = entriesByCompetition.get(comp.id) ?? []
            const joinedAccountIds = new Set(joinedEntries.map((e) => e.accountId))
            return (
              <div key={comp.id} className="rounded-lg border border-amber-100 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link to={`/competitions/${comp.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {comp.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {comp.startDate} ~ {comp.endDate}
                    </p>
                  </div>
                  <Badge variant={comp.status === 'active' ? 'success' : 'secondary'}>
                    {STATUS_LABEL[comp.status] ?? comp.status}
                  </Badge>
                </div>

                {joinedEntries.length > 0 && (
                  <p className="mb-3 text-sm text-amber-900">
                    참가 중인 계좌:{' '}
                    <span className="font-semibold">
                      {joinedEntries.map((e) => e.accountName).join(', ')}
                    </span>
                  </p>
                )}

                <div className="space-y-2">
                  {accounts.map((account) => {
                    const isJoined = joinedAccountIds.has(account.id)
                    const joinKey = `join-${comp.id}-${account.id}`
                    const leaveKey = `leave-${comp.id}-${account.id}`
                    const busy = busyKey === joinKey || busyKey === leaveKey

                    return (
                      <div
                        key={account.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2"
                      >
                        <div>
                          <span className="font-medium text-slate-800">{account.name}</span>
                          <span className="ml-2 text-xs text-slate-500">{account.broker}</span>
                          {isJoined && (
                            <Badge variant="success" className="ml-2">
                              참가 중
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isJoined ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                if (!confirm(`「${account.name}」 계좌의 「${comp.name}」 참가를 해제하시겠습니까?`)) return
                                void runLeave(comp.id, account.id)
                              }}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : '참가 해제'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => void runJoin(comp, account.id)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : '참가하기'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {joinableCompetitions.length === 0 && entries.length > 0 && (
            <p className="text-sm text-slate-600">
              참가 가능한 진행·예정 대회가 없습니다. 종료된 대회 참가 내역만 유지 중입니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
