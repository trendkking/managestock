import { useMemo } from 'react'
import { buildAccountWithStats } from '@/lib/accountStats'
import { USE_MOCK } from '@/lib/env'
import { useDataStore } from '@/stores/dataStore'
import type {
  CompetitionChartSeries,
  DashboardSummary,
  LeaderboardEntry,
  PerformancePoint,
} from '@/types'

const EMPTY_PERFORMANCE: PerformancePoint[] = []
const EMPTY_LEADERBOARD: LeaderboardEntry[] = []
const EMPTY_CHART: CompetitionChartSeries[] = []

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 5,
    nickname: 'bull_run',
    accountName: '대회용',
    scoreDelta: 1250000,
    currentTotalValue: 1750000,
    startTotalValue: 0,
    unrealizedPnl: 800000,
    realizedPnl: 450000,
    periodDeposits: 0,
    periodWithdrawals: 0,
    netCashFlow: 0,
  },
  {
    rank: 2,
    userId: 2,
    nickname: 'steady',
    accountName: '보조계좌',
    scoreDelta: 420000,
    currentTotalValue: 920000,
    startTotalValue: 0,
    unrealizedPnl: 220000,
    realizedPnl: 200000,
    periodDeposits: 0,
    periodWithdrawals: 0,
    netCashFlow: 0,
  },
  {
    rank: 3,
    userId: 1,
    nickname: '트레이더김',
    accountName: '키움 주계좌',
    scoreDelta: 113000,
    currentTotalValue: 363000,
    startTotalValue: 0,
    unrealizedPnl: 63000,
    realizedPnl: 50000,
    periodDeposits: 0,
    periodWithdrawals: 0,
    netCashFlow: 0,
    isMe: true,
  },
]

const MOCK_CHART: CompetitionChartSeries[] = [
  {
    nickname: '트레이더김',
    data: [
      { date: '04-01', scoreDelta: 0 },
      { date: '05-31', scoreDelta: 113000 },
    ],
  },
]

export function useAccountsWithStats() {
  const accounts = useDataStore((s) => s.accounts)
  const holdings = useDataStore((s) => s.holdings)
  const trades = useDataStore((s) => s.trades)

  return useMemo(
    () => accounts.map((a) => buildAccountWithStats(a, holdings, trades)),
    [accounts, holdings, trades],
  )
}

export function useAccountWithStats(accountId: number) {
  const accounts = useDataStore((s) => s.accounts)
  const holdings = useDataStore((s) => s.holdings)
  const trades = useDataStore((s) => s.trades)

  return useMemo(() => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return null
    return buildAccountWithStats(account, holdings, trades)
  }, [accounts, holdings, trades, accountId])
}

export function usePerformance(accountId: number) {
  const points = useDataStore((s) => s.performanceData[accountId])
  return points ?? EMPTY_PERFORMANCE
}

export function useDashboardSummary(): DashboardSummary {
  const dashboardSummary = useDataStore((s) => s.dashboardSummary)
  const accounts = useDataStore((s) => s.accounts)
  const holdings = useDataStore((s) => s.holdings)
  const trades = useDataStore((s) => s.trades)
  const competitions = useDataStore((s) => s.competitions)
  const journals = useDataStore((s) => s.journals)

  return useMemo(() => {
    if (!USE_MOCK && dashboardSummary) return dashboardSummary

    const accountsWithStats = accounts.map((a) => buildAccountWithStats(a, holdings, trades))
    const totalValue = accountsWithStats.reduce((s, a) => s + a.currentValue, 0)
    const totalInitial = accountsWithStats.reduce((s, a) => s + a.initialCapital, 0)
    const totalProfitLoss = totalValue - totalInitial
    const totalReturnRate = totalInitial > 0 ? (totalProfitLoss / totalInitial) * 100 : 0
    const allTrades = [...trades].sort((a, b) => b.tradedAt.localeCompare(a.tradedAt)).slice(0, 5)

    return {
      totalValue,
      totalProfitLoss,
      totalReturnRate,
      accountsCount: accountsWithStats.length,
      accountSummaries: accountsWithStats.map((a) => ({
        id: a.id,
        name: a.name,
        returnRate: a.returnRate,
      })),
      recentTrades: allTrades,
      activeCompetitions: competitions
        .filter((c) => c.isJoined && c.status === 'active')
        .map((c) => ({ id: c.id, name: c.name, myRank: 1, scoreDelta: 0 })),
      recentJournals: journals.slice(0, 3),
    }
  }, [dashboardSummary, accounts, holdings, trades, competitions, journals])
}

export function useLeaderboard(competitionId: number) {
  const items = useDataStore((s) => s.leaderboards[competitionId])

  return useMemo(() => {
    if (!USE_MOCK) return items ?? EMPTY_LEADERBOARD
    return competitionId === 1 ? MOCK_LEADERBOARD : EMPTY_LEADERBOARD
  }, [items, competitionId])
}

export function useCompetitionChart(competitionId: number) {
  const series = useDataStore((s) => s.charts[competitionId])

  return useMemo(() => {
    if (!USE_MOCK) return series ?? EMPTY_CHART
    return MOCK_CHART
  }, [series, competitionId])
}
