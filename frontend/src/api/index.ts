import { apiClient } from '@/api/client'
import type {
  Account,
  AccountWithStats,
  HoldingsPortfolioSummary,
  Competition,
  CompetitionChartSeries,
  MyCompetitionEntry,
  DashboardSummary,
  Holding,
  Journal,
  JournalEntry,
  LeaderboardEntry,
  PerformancePoint,
  StockSearchResult,
  DailyPricePoint,
  Trade,
  User,
} from '@/types'
import type { AdminJournal, AdminStats, AdminUser } from '@/types/admin'
import type { AccountConnectPayload, BrokerOption } from '@/types'

export type AccountWithStatsApi = AccountWithStats & {
  performance: PerformancePoint[]
  holdingsSummary: HoldingsPortfolioSummary
}
export type JournalDetail = Journal & { linkedTrades: Trade[] }

export type DashboardSummaryApi = DashboardSummary & {
  accountSummaries: { id: number; name: string; returnRate: number }[]
}

export const authApi = {
  register: (body: { nickname: string; email: string; password: string }) =>
    apiClient.post<User>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    apiClient.post<{ accessToken: string; tokenType: string }>('/auth/login', body).then((r) => r.data),
  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),
  updateMe: (body: Partial<Pick<User, 'nickname' | 'showNicknamePublic'>>) =>
    apiClient.patch<User>('/auth/me', body).then((r) => r.data),
  deleteMe: () => apiClient.delete('/auth/me'),
}

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummaryApi>('/dashboard/summary').then((r) => r.data),
}

export const brokersApi = {
  list: () => apiClient.get<{ items: BrokerOption[] }>('/brokers').then((r) => r.data),
  kiwoomServerIp: () =>
    apiClient
      .get<{ publicIp: string | null; registerUrl: string; instructions: string }>('/brokers/kiwoom/server-ip')
      .then((r) => r.data),
}

export const accountsApi = {
  list: () =>
    apiClient
      .get<{
        items: (Account & { currentValue: number; profitLoss: number; returnRate: number })[]
        total: number
      }>('/accounts')
      .then((r) => r.data),
  get: (id: number) => apiClient.get<AccountWithStatsApi>(`/accounts/${id}`).then((r) => r.data),
  connect: (body: AccountConnectPayload) =>
    apiClient
      .post<Account & { currentValue: number; profitLoss: number; returnRate: number }>('/accounts/connect', body)
      .then((r) => r.data),
  sync: (id: number) =>
    apiClient.post<Account & { currentValue: number; profitLoss: number; returnRate: number }>(`/accounts/${id}/sync`).then((r) => r.data),
  create: (body: { name: string; broker: string; initialCapital: number; description?: string }) =>
    apiClient.post<Account & { currentValue: number; profitLoss: number; returnRate: number }>('/accounts', body).then((r) => r.data),
  update: (id: number, body: { name?: string; broker?: string; description?: string }) =>
    apiClient.patch<Account & { currentValue: number; profitLoss: number; returnRate: number }>(`/accounts/${id}`, body).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/accounts/${id}`),
  upsertHolding: (accountId: number, body: Omit<Holding, 'id' | 'accountId'>) =>
    apiClient.post<Holding>(`/accounts/${accountId}/holdings`, body).then((r) => r.data),
  addTrade: (accountId: number, body: Omit<Trade, 'id' | 'accountId'>) =>
    apiClient.post<Trade>(`/accounts/${accountId}/trades`, body).then((r) => r.data),
  importTrades: (accountId: number, body: { fromDate: string; toDate: string }) =>
    apiClient
      .post<{ fromDate: string; toDate: string; imported: number; trades: Trade[] }>(
        `/accounts/${accountId}/trades/import`,
        body,
      )
      .then((r) => r.data),
}

export const journalsApi = {
  list: (params?: { q?: string; accountId?: number }) =>
    apiClient.get<{ items: Journal[]; total: number }>('/journals', { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<JournalDetail>(`/journals/${id}`).then((r) => r.data),
  create: (body: Omit<Journal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<Journal>('/journals', body).then((r) => r.data),
  update: (id: number, body: Partial<Omit<Journal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
    apiClient.patch<Journal>(`/journals/${id}`, body).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/journals/${id}`),
}

export const journalEntriesApi = {
  list: (params?: { q?: string; stockCode?: string }) =>
    apiClient.get<{ items: JournalEntry[]; total: number }>('/journal-entries', { params }).then((r) => r.data),
  create: (body: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<JournalEntry>('/journal-entries', body).then((r) => r.data),
  update: (id: number, body: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiClient.patch<JournalEntry>(`/journal-entries/${id}`, body).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/journal-entries/${id}`),
}

export const marketApi = {
  searchStocks: (q: string, limit = 20) =>
    apiClient
      .get<{ items: StockSearchResult[]; total: number }>('/market/stocks/search', {
        params: { q, limit },
      })
      .then((r) => r.data),
  getDailyPrices: (stockCode: string, params?: { fromDate?: string; toDate?: string; months?: number }) =>
    apiClient
      .get<{
        stockCode: string
        stockName: string
        market: string
        region?: 'KR' | 'US'
        fromDate: string
        toDate: string
        source: string
        items: DailyPricePoint[]
      }>(`/market/stocks/${encodeURIComponent(stockCode)}/daily`, { params })
      .then((r) => r.data),
}

export const adminApi = {
  stats: () => apiClient.get<AdminStats>('/admin/stats').then((r) => r.data),
  users: () => apiClient.get<{ items: AdminUser[]; total: number }>('/admin/users').then((r) => r.data),
  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`),
  journals: (params?: { q?: string }) =>
    apiClient.get<{ items: AdminJournal[]; total: number }>('/admin/journals', { params }).then((r) => r.data),
  deleteJournal: (id: number) => apiClient.delete(`/admin/journals/${id}`),
}

export const competitionsApi = {
  list: (status?: string) =>
    apiClient.get<{ items: Competition[]; total: number }>('/competitions', { params: status ? { status } : {} }).then((r) => r.data),
  myEntries: () =>
    apiClient.get<{ items: MyCompetitionEntry[]; total: number }>('/competitions/entries/me').then((r) => r.data),
  get: (id: number) => apiClient.get<Competition>(`/competitions/${id}`).then((r) => r.data),
  join: (id: number, accountId: number) =>
    apiClient.post<Competition>(`/competitions/${id}/join`, { accountId }).then((r) => r.data),
  leave: (id: number, accountId?: number) =>
    apiClient.delete(`/competitions/${id}/leave`, { params: accountId ? { accountId } : undefined }),
  leaderboard: (id: number) =>
    apiClient.get<{ myRank: number | null; items: LeaderboardEntry[]; total: number }>(`/competitions/${id}/leaderboard`).then((r) => r.data),
  chart: (id: number) =>
    apiClient.get<{ series: CompetitionChartSeries[] }>(`/competitions/${id}/chart`).then((r) => r.data),
}
