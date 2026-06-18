import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { adminApi } from '@/api'
import { PageHeader } from '@/components/ui/Common'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { AdminStats } from '@/types/admin'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch(() => setError('통계를 불러오지 못했습니다.'))
  }, [])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!stats) {
    return <p className="text-slate-500">통계 불러오는 중...</p>
  }

  const chartData = stats.signupTrend.map((p) => ({
    date: p.date.slice(5),
    count: p.count,
  }))

  return (
    <div>
      <PageHeader title="통계 대시보드" description="서비스 전체 현황을 확인합니다" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="전체 회원" value={stats.totalUsers} format="number" />
        <StatCard label="매매일지(게시물)" value={stats.totalJournals} format="number" />
        <StatCard label="계좌" value={stats.totalAccounts} format="number" />
        <StatCard label="매매 건수" value={stats.totalTrades} format="number" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="오늘 가입" value={stats.newUsersToday} format="number" />
        <StatCard label="이번 주 가입" value={stats.newUsersThisWeek} format="number" />
        <StatCard label="이번 달 가입" value={stats.newUsersThisMonth} format="number" />
        <StatCard label="오늘 작성 일지" value={stats.newJournalsToday} format="number" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="전체 대회" value={stats.totalCompetitions} format="number" />
        <StatCard label="진행 중 대회" value={stats.activeCompetitions} format="number" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>최근 30일 회원 가입 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="가입 수" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
