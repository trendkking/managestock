import { create } from 'zustand'
import { createDemoSampleData } from '@/lib/demoSampleData'
import type { Competition, CompetitionChartSeries, Holding, JournalEntry, LeaderboardEntry, PerformancePoint, Trade } from '@/types'
import type { Account } from '@/types'

export type DemoDataState = ReturnType<typeof createDemoSampleData>

/** 체험 모드 전용 — persist 없음, 실제 useDataStore와 완전 분리 */
export const useDemoStore = create<DemoDataState>(() => createDemoSampleData())

export function selectDemoAccounts(s: DemoDataState): Account[] {
  return s.accounts
}

export function selectDemoHoldings(s: DemoDataState): Holding[] {
  return s.holdings
}

export function selectDemoTrades(s: DemoDataState): Trade[] {
  return s.trades
}

export function selectDemoJournalEntries(s: DemoDataState): JournalEntry[] {
  return s.journalEntries
}

export function selectDemoCompetitions(s: DemoDataState): Competition[] {
  return s.competitions
}

export function selectDemoPerformance(s: DemoDataState, accountId: number): PerformancePoint[] {
  return (s.performanceData as Record<number, PerformancePoint[]>)[accountId] ?? []
}

export function selectDemoLeaderboard(s: DemoDataState, competitionId: number): LeaderboardEntry[] {
  return s.leaderboards[competitionId] ?? []
}

export function selectDemoChart(s: DemoDataState, competitionId: number): CompetitionChartSeries[] {
  return s.charts[competitionId] ?? []
}
