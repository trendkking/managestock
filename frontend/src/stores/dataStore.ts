import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { accountsApi, competitionsApi, dashboardApi, journalEntriesApi, journalsApi } from '@/api'
import { USE_MOCK } from '@/lib/env'
import type {
  Account,
  AccountConnectPayload,
  Competition,
  CompetitionChartSeries,
  DashboardSummary,
  Holding,
  Journal,
  JournalEntry,
  LeaderboardEntry,
  PerformancePoint,
  Trade,
} from '@/types'
import { buildAccountWithStats } from '@/lib/accountStats'
import { rangeIsWithin } from '@/lib/tradesLedger'
import { generateId } from '@/utils'

const KIS_SYNC_MEMO_PREFIX = 'kis-sync|'
const tradeImportInFlight = new Map<number, Promise<void>>()

function emptyApiState() {
  return {
    accounts: [] as Account[],
    holdings: [] as Holding[],
    trades: [] as Trade[],
    journals: [] as Journal[],
    journalEntries: [] as JournalEntry[],
    competitions: [] as Competition[],
    joinedCompetitionIds: [] as number[],
    performanceData: {} as Record<number, PerformancePoint[]>,
    dashboardSummary: null as DashboardSummary | null,
    leaderboards: {} as Record<number, LeaderboardEntry[]>,
    charts: {} as Record<number, CompetitionChartSeries[]>,
    tradeImportLoaded: {} as Record<number, { from: string; to: string }>,
    loading: false,
  }
}

interface DataState {
  accounts: Account[]
  holdings: Holding[]
  trades: Trade[]
  journals: Journal[]
  journalEntries: JournalEntry[]
  competitions: Competition[]
  joinedCompetitionIds: number[]
  performanceData: Record<number, PerformancePoint[]>
  dashboardSummary: DashboardSummary | null
  leaderboards: Record<number, LeaderboardEntry[]>
  charts: Record<number, CompetitionChartSeries[]>
  /** 계좌별 KIS 매매 import 완료 구간 (재조회 방지) */
  tradeImportLoaded: Record<number, { from: string; to: string }>
  loading: boolean
  initMockData: () => void
  reset: () => void
  hydrateFromApi: () => Promise<void>
  loadCompetitionExtras: (competitionId: number) => Promise<void>
  getAccountWithStats: (accountId: number) => ReturnType<typeof buildAccountWithStats> | null
  getAccountsWithStats: () => ReturnType<typeof buildAccountWithStats>[]
  addAccount: (data: Omit<Account, 'id' | 'userId' | 'cashBalance' | 'createdAt'>) => Promise<void>
  connectAccount: (data: AccountConnectPayload) => Promise<void>
  syncAccount: (accountId: number) => Promise<void>
  updateAccount: (id: number, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: number) => Promise<void>
  upsertHolding: (accountId: number, data: Omit<Holding, 'id' | 'accountId'>) => Promise<void>
  addTrade: (accountId: number, data: Omit<Trade, 'id' | 'accountId'>) => Promise<void>
  importTradesForRange: (
    accountId: number,
    fromDate: string,
    toDate: string,
    options?: { force?: boolean },
  ) => Promise<void>
  getPerformance: (accountId: number) => PerformancePoint[]
  addJournal: (data: Omit<Journal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateJournal: (id: number, data: Partial<Journal>) => Promise<void>
  deleteJournal: (id: number) => Promise<void>
  addJournalEntry: (
    data: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<JournalEntry>
  updateJournalEntry: (id: number, data: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deleteJournalEntry: (id: number) => Promise<void>
  getDashboardSummary: () => DashboardSummary
  joinCompetition: (competitionId: number, accountId: number) => Promise<void>
  leaveCompetition: (competitionId: number, accountId?: number) => Promise<void>
  getLeaderboard: (competitionId: number) => LeaderboardEntry[]
  getCompetitionChart: (competitionId: number) => CompetitionChartSeries[]
}

const EMPTY_PERFORMANCE: PerformancePoint[] = []

const defaultPerformance: PerformancePoint[] = [
  { date: '2026-05-01', returnRate: 0, totalValue: 10000000 },
  { date: '2026-05-08', returnRate: 2.3, totalValue: 10230000 },
  { date: '2026-05-15', returnRate: 5.1, totalValue: 10510000 },
  { date: '2026-05-22', returnRate: 8.4, totalValue: 10840000 },
  { date: '2026-05-31', returnRate: 12.5, totalValue: 11250000 },
]

function createMockData() {
  const accounts: Account[] = [
    {
      id: 1,
      userId: 1,
      name: '키움 주계좌',
      broker: '키움증권',
      initialCapital: 10000000,
      cashBalance: 5670000,
      description: '장기 투자용 메인 계좌',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      userId: 1,
      name: '단타 연습 계좌',
      broker: 'KB증권',
      initialCapital: 5000000,
      cashBalance: 1805000,
      description: '스윙·단타 연습',
      createdAt: '2026-03-10T00:00:00Z',
    },
  ]

  const holdings: Holding[] = [
    { id: 1, accountId: 1, stockCode: '005930', stockName: '삼성전자', quantity: 50, avgPrice: 68000, currentPrice: 72000 },
    { id: 2, accountId: 1, stockCode: '000660', stockName: 'SK하이닉스', quantity: 10, avgPrice: 185000, currentPrice: 198000 },
    { id: 3, accountId: 2, stockCode: '035420', stockName: 'NAVER', quantity: 15, avgPrice: 210000, currentPrice: 205000 },
  ]

  const trades: Trade[] = [
    { id: 1, accountId: 1, stockCode: '005930', stockName: '삼성전자', tradeType: 'buy', quantity: 50, price: 68000, fee: 500, tax: 0, tradedAt: '2026-05-10T10:30:00Z', memo: '반등 구간 매수' },
    { id: 2, accountId: 1, stockCode: '000660', stockName: 'SK하이닉스', tradeType: 'buy', quantity: 10, price: 185000, fee: 300, tax: 0, tradedAt: '2026-05-15T14:00:00Z' },
    { id: 3, accountId: 2, stockCode: '035420', stockName: 'NAVER', tradeType: 'buy', quantity: 15, price: 210000, fee: 400, tax: 0, tradedAt: '2026-05-20T11:00:00Z' },
    { id: 4, accountId: 1, stockCode: '005930', stockName: '삼성전자', tradeType: 'sell', quantity: 10, price: 71500, fee: 200, tax: 150, realizedPnl: -197200, tradedAt: '2025-03-31T15:00:00Z' },
    { id: 5, accountId: 1, stockCode: '122630', stockName: 'KODEX 레버리지', tradeType: 'sell', quantity: 100, price: 12000, fee: 500, tax: 42, realizedPnl: -297542, tradedAt: '2025-03-31T16:00:00Z' },
    { id: 6, accountId: 1, stockCode: '214150', stockName: '클래시스', tradeType: 'sell', quantity: 20, price: 45000, fee: 300, tax: 100, realizedPnl: -163900, tradedAt: '2025-03-31T17:00:00Z' },
  ]

  const journalEntries: JournalEntry[] = [
    {
      id: 1,
      userId: 1,
      journalDate: '2026-05-10',
      stockCode: '005930',
      stockName: '삼성전자',
      side: 'buy',
      reason: '20일 이평선 지지 확인, 반도체 업황 개선 기대',
      createdAt: '2026-05-10T12:00:00Z',
      updatedAt: '2026-05-10T12:00:00Z',
    },
    {
      id: 2,
      userId: 1,
      journalDate: '2026-05-15',
      stockCode: '000660',
      stockName: 'SK하이닉스',
      side: 'buy',
      reason: 'HBM 수요 증가 뉴스 확인 후 진입',
      createdAt: '2026-05-15T15:00:00Z',
      updatedAt: '2026-05-15T15:00:00Z',
    },
    {
      id: 3,
      userId: 1,
      journalDate: '2026-05-20',
      stockCode: '035420',
      stockName: 'NAVER',
      side: 'sell',
      reason: '지지선 근처에서 단기 반등 기대',
      createdAt: '2026-05-20T12:00:00Z',
      updatedAt: '2026-05-20T12:00:00Z',
    },
  ]

  const journals: Journal[] = [
    {
      id: 1,
      userId: 1,
      accountId: 1,
      title: '삼성전자 반등 구간 매수 근거',
      journalDate: '2026-05-10',
      content: '## 매수 근거\n- 20일 이평선 지지 확인\n- 반도체 업황 개선 기대',
      reflection: '손절선 -5% 반드시 지킬 것',
      emotion: 'confident',
      tags: ['반도체', '장기'],
      stockCodes: ['005930'],
      tradeIds: [1],
      createdAt: '2026-05-10T12:00:00Z',
      updatedAt: '2026-05-10T12:00:00Z',
    },
    {
      id: 2,
      userId: 1,
      accountId: 1,
      title: 'SK하이닉스 추가 매수',
      journalDate: '2026-05-15',
      content: '## 시장 상황\nHBM 수요 증가 뉴스 확인 후 진입',
      emotion: 'calm',
      tags: ['HBM', '반도체'],
      stockCodes: ['000660'],
      tradeIds: [2],
      createdAt: '2026-05-15T15:00:00Z',
      updatedAt: '2026-05-15T15:00:00Z',
    },
    {
      id: 3,
      userId: 1,
      accountId: 2,
      title: 'NAVER 단기 매매 복기',
      journalDate: '2026-05-20',
      content: '## 매수\n지지선 근처에서 진입했으나 반등이 약함',
      reflection: '추세 확인 없이 진입',
      emotion: 'anxious',
      tags: ['단타', 'IT'],
      stockCodes: ['035420'],
      tradeIds: [3],
      createdAt: '2026-05-20T12:00:00Z',
      updatedAt: '2026-05-20T12:00:00Z',
    },
  ]

  const competitions: Competition[] = [
    {
      id: 1,
      name: '2026 Q2 수익률 챌린지',
      description: '2분기 최고 수익률을 겨루는 공식 대회',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      status: 'active',
      minInitialCapital: 5000000,
      rules: '보유 계좌는 여러 개까지 참가할 수 있으며, 평가금액은 계좌별 손익을 합산합니다.',
      participantCount: 48,
      isJoined: true,
    },
    {
      id: 2,
      name: '2026 Q3 챌린지',
      description: '3분기 수익률 경쟁',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: 'upcoming',
      minInitialCapital: 3000000,
      participantCount: 12,
      isJoined: false,
    },
    {
      id: 3,
      name: '2026 Q1 챌린지',
      description: '1분기 수익률 경쟁 (종료)',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      status: 'ended',
      participantCount: 65,
      isJoined: false,
    },
  ]

  return {
    accounts,
    holdings,
    trades,
    journals,
    journalEntries,
    competitions,
    joinedCompetitionIds: [1],
    performanceData: {
      1: defaultPerformance,
      2: [
        { date: '2026-05-01', returnRate: 0, totalValue: 5000000 },
        { date: '2026-05-15', returnRate: -1.2, totalValue: 4940000 },
        { date: '2026-05-31', returnRate: -2.4, totalValue: 4880000 },
      ],
    },
    dashboardSummary: null,
    leaderboards: {},
    charts: {},
    tradeImportLoaded: {},
    loading: false,
  }
}

async function fetchAllAccountDetails(accountIds: number[]) {
  return Promise.all(accountIds.map((id) => accountsApi.get(id)))
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...(USE_MOCK ? createMockData() : emptyApiState()),

      initMockData: () => set(createMockData()),

      reset: () => set(USE_MOCK ? createMockData() : emptyApiState()),

      hydrateFromApi: async () => {
        if (USE_MOCK) return
        set({ loading: true })
        try {
          const [accountsRes, journalsRes, journalEntriesRes, competitionsRes, summary] = await Promise.all([
            accountsApi.list(),
            journalsApi.list(),
            journalEntriesApi.list(),
            competitionsApi.list(),
            dashboardApi.summary(),
          ])
          const details = await fetchAllAccountDetails(accountsRes.items.map((a) => a.id))
          const accounts: Account[] = accountsRes.items.map((a) => ({
            id: a.id,
            userId: a.userId,
            name: a.name,
            broker: a.broker,
            brokerCode: a.brokerCode,
            connectionMode: a.connectionMode,
            syncStatus: a.syncStatus,
            accountNumberMasked: a.accountNumberMasked,
            lastSyncedAt: a.lastSyncedAt,
            lastSyncError: a.lastSyncError,
            hasApiCredentials: a.hasApiCredentials,
            syncDomestic: a.syncDomestic,
            syncUsMarkets: a.syncUsMarkets,
            usdKrwRate: a.usdKrwRate,
            initialCapital: a.initialCapital,
            cashBalance: a.cashBalance,
            description: a.description,
            createdAt: a.createdAt,
            currentValue: a.currentValue,
            profitLoss: a.profitLoss,
            returnRate: a.returnRate,
          }))
          const holdings: Holding[] = []
          const trades: Trade[] = []
          const performanceData: Record<number, PerformancePoint[]> = {}
          const holdingsSummaryByAccount: Record<number, Account['holdingsSummary']> = {}
          for (const d of details) {
            holdings.push(...d.holdings)
            trades.push(...d.trades)
            performanceData[d.id] = d.performance ?? []
            if (d.holdingsSummary) holdingsSummaryByAccount[d.id] = d.holdingsSummary
          }
          const accountsWithSummary = accounts.map((a) => ({
            ...a,
            holdingsSummary: holdingsSummaryByAccount[a.id] ?? a.holdingsSummary,
          }))
          const joinedCompetitionIds = competitionsRes.items.filter((c) => c.isJoined).map((c) => c.id)
          set({
            accounts: accountsWithSummary,
            holdings,
            trades,
            journals: journalsRes.items,
            journalEntries: journalEntriesRes.items,
            competitions: competitionsRes.items,
            joinedCompetitionIds,
            performanceData,
            dashboardSummary: summary,
            loading: false,
          })
        } catch {
          set({ loading: false })
          throw new Error('데이터를 불러오지 못했습니다')
        }
      },

      loadCompetitionExtras: async (competitionId) => {
        if (USE_MOCK) return
        const lb = await competitionsApi.leaderboard(competitionId)
        set({
          leaderboards: { ...get().leaderboards, [competitionId]: lb.items },
        })
      },

      getAccountWithStats: (accountId) => {
        const { accounts, holdings, trades } = get()
        const account = accounts.find((a) => a.id === accountId)
        if (!account) return null
        return buildAccountWithStats(account, holdings, trades)
      },

      getAccountsWithStats: () => {
        const { accounts, holdings, trades } = get()
        return accounts.map((a) => buildAccountWithStats(a, holdings, trades))
      },

      addAccount: async (data) => {
        if (USE_MOCK) {
          const { accounts } = get()
          const id = generateId(accounts)
          set({
            accounts: [
              ...accounts,
              {
                id,
                userId: 1,
                cashBalance: data.initialCapital,
                createdAt: new Date().toISOString(),
                ...data,
              },
            ],
            performanceData: {
              ...get().performanceData,
              [id]: [{ date: new Date().toISOString().slice(0, 10), returnRate: 0, totalValue: data.initialCapital }],
            },
          })
          return
        }
        await accountsApi.create(data)
        await get().hydrateFromApi()
      },

      connectAccount: async (data) => {
        if (USE_MOCK) return
        await accountsApi.connect(data)
        await get().hydrateFromApi()
      },

      syncAccount: async (accountId) => {
        if (USE_MOCK) return
        await accountsApi.sync(accountId)
        await get().hydrateFromApi()
      },

      updateAccount: async (id, data) => {
        if (USE_MOCK) {
          set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...data } : a)) })
          return
        }
        await accountsApi.update(id, data)
        await get().hydrateFromApi()
      },

      deleteAccount: async (id) => {
        if (USE_MOCK) {
          set({
            accounts: get().accounts.filter((a) => a.id !== id),
            holdings: get().holdings.filter((h) => h.accountId !== id),
            trades: get().trades.filter((t) => t.accountId !== id),
          })
          return
        }
        await accountsApi.delete(id)
        await get().hydrateFromApi()
      },

      upsertHolding: async (accountId, data) => {
        if (USE_MOCK) {
          const { holdings } = get()
          const existing = holdings.find((h) => h.accountId === accountId && h.stockCode === data.stockCode)
          if (existing) {
            set({
              holdings: holdings.map((h) => (h.id === existing.id ? { ...h, ...data } : h)),
            })
          } else {
            set({ holdings: [...holdings, { id: generateId(holdings), accountId, ...data }] })
          }
          return
        }
        await accountsApi.upsertHolding(accountId, data)
        await get().hydrateFromApi()
      },

      addTrade: async (accountId, data) => {
        if (USE_MOCK) {
          const { trades, accounts, holdings } = get()
          const tradeId = generateId(trades)
          const account = accounts.find((a) => a.id === accountId)
          if (!account) return
          let newCash = account.cashBalance
          const totalCost = data.price * data.quantity + data.fee + data.tax
          if (data.tradeType === 'buy') {
            newCash -= totalCost
            const existing = holdings.find((h) => h.accountId === accountId && h.stockCode === data.stockCode)
            if (existing) {
              const newQty = existing.quantity + data.quantity
              const newAvg = (existing.quantity * existing.avgPrice + data.quantity * data.price + data.fee) / newQty
              set({
                holdings: holdings.map((h) =>
                  h.id === existing.id ? { ...h, quantity: newQty, avgPrice: newAvg } : h,
                ),
              })
            } else {
              set({
                holdings: [
                  ...holdings,
                  {
                    id: generateId(holdings),
                    accountId,
                    stockCode: data.stockCode,
                    stockName: data.stockName,
                    quantity: data.quantity,
                    avgPrice: data.price,
                    currentPrice: data.price,
                  },
                ],
              })
            }
          } else {
            const existing = holdings.find((h) => h.accountId === accountId && h.stockCode === data.stockCode)
            if (!existing || existing.quantity < data.quantity) return
            newCash += data.price * data.quantity - data.fee - data.tax
            const newQty = existing.quantity - data.quantity
            if (newQty === 0) {
              set({ holdings: get().holdings.filter((h) => h.id !== existing.id) })
            } else {
              set({
                holdings: get().holdings.map((h) =>
                  h.id === existing.id ? { ...h, quantity: newQty } : h,
                ),
              })
            }
          }
          set({
            trades: [...trades, { ...data, id: tradeId, accountId }],
            accounts: get().accounts.map((a) => (a.id === accountId ? { ...a, cashBalance: newCash } : a)),
          })
          return
        }
        await accountsApi.addTrade(accountId, data)
        await get().hydrateFromApi()
      },

      importTradesForRange: async (accountId, fromDate, toDate, options) => {
        if (USE_MOCK) return
        const loaded = get().tradeImportLoaded[accountId]
        const requested = { from: fromDate, to: toDate }
        if (!options?.force && loaded && rangeIsWithin(requested, loaded)) {
          return
        }

        const inFlight = tradeImportInFlight.get(accountId)
        if (inFlight) {
          await inFlight
          const after = get().tradeImportLoaded[accountId]
          if (!options?.force && after && rangeIsWithin(requested, after)) {
            return
          }
        }

        const importFrom =
          loaded && !options?.force
            ? fromDate < loaded.from
              ? fromDate
              : loaded.from
            : fromDate
        const importTo =
          loaded && !options?.force
            ? toDate > loaded.to
              ? toDate
              : loaded.to
            : toDate

        const run = async () => {
          const res = await accountsApi.importTrades(accountId, {
            fromDate: importFrom,
            toDate: importTo,
          })
          const importedMemos = new Set(
            res.trades.map((t) => t.memo).filter((memo): memo is string => Boolean(memo)),
          )
          set({
            tradeImportLoaded: {
              ...get().tradeImportLoaded,
              [accountId]: { from: importFrom, to: importTo },
            },
            trades: [
              ...get().trades.filter((t) => {
                if (t.accountId !== accountId) return true
                const memo = t.memo ?? ''
                if (memo.startsWith(KIS_SYNC_MEMO_PREFIX)) {
                  if (importedMemos.has(memo)) return false
                  const day = t.tradedAt.slice(0, 10)
                  return day < importFrom || day > importTo
                }
                return true
              }),
              ...res.trades,
            ],
          })
        }

        const task = run().finally(() => {
          if (tradeImportInFlight.get(accountId) === task) {
            tradeImportInFlight.delete(accountId)
          }
        })
        tradeImportInFlight.set(accountId, task)
        await task
      },

      getPerformance: (accountId) => get().performanceData[accountId] ?? EMPTY_PERFORMANCE,

      addJournal: async (data) => {
        if (USE_MOCK) {
          const { journals } = get()
          const now = new Date().toISOString()
          set({
            journals: [{ ...data, id: generateId(journals), userId: 1, createdAt: now, updatedAt: now }, ...journals],
          })
          return
        }
        await journalsApi.create(data)
        await get().hydrateFromApi()
      },

      updateJournal: async (id, data) => {
        if (USE_MOCK) {
          set({
            journals: get().journals.map((j) =>
              j.id === id ? { ...j, ...data, updatedAt: new Date().toISOString() } : j,
            ),
          })
          return
        }
        await journalsApi.update(id, data as Omit<Journal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>)
        await get().hydrateFromApi()
      },

      deleteJournal: async (id) => {
        if (USE_MOCK) {
          set({ journals: get().journals.filter((j) => j.id !== id) })
          return
        }
        await journalsApi.delete(id)
        await get().hydrateFromApi()
      },

      addJournalEntry: async (data) => {
        if (USE_MOCK) {
          const { journalEntries } = get()
          const now = new Date().toISOString()
          const entry: JournalEntry = {
            ...data,
            id: generateId(journalEntries),
            userId: 1,
            createdAt: now,
            updatedAt: now,
          }
          set({ journalEntries: [entry, ...journalEntries] })
          return entry
        }
        const entry = await journalEntriesApi.create(data)
        await get().hydrateFromApi()
        return entry
      },

      updateJournalEntry: async (id, data) => {
        if (USE_MOCK) {
          set({
            journalEntries: get().journalEntries.map((e) =>
              e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e,
            ),
          })
          return
        }
        await journalEntriesApi.update(id, data)
        await get().hydrateFromApi()
      },

      deleteJournalEntry: async (id) => {
        if (USE_MOCK) {
          set({ journalEntries: get().journalEntries.filter((e) => e.id !== id) })
          return
        }
        await journalEntriesApi.delete(id)
        await get().hydrateFromApi()
      },

      getDashboardSummary: () => {
        const cached = get().dashboardSummary
        if (!USE_MOCK && cached) return cached
        const accountsWithStats = get().getAccountsWithStats()
        const totalValue = accountsWithStats.reduce((s, a) => s + a.currentValue, 0)
        const totalInitial = accountsWithStats.reduce((s, a) => s + a.initialCapital, 0)
        const totalProfitLoss = totalValue - totalInitial
        const totalReturnRate = totalInitial > 0 ? (totalProfitLoss / totalInitial) * 100 : 0
        const allTrades = [...get().trades].sort((a, b) => b.tradedAt.localeCompare(a.tradedAt)).slice(0, 5)
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
          activeCompetitions: get().competitions
            .filter((c) => c.isJoined && c.status === 'active')
            .map((c) => ({ id: c.id, name: c.name, myRank: 1, scoreDelta: 0 })),
          recentJournals: get().journalEntries.slice(0, 3).map((e) => ({
            id: e.id,
            userId: e.userId,
            title: `${e.stockName} (${e.journalDate})`,
            journalDate: e.journalDate,
            content: e.reason,
            tags: [],
            stockCodes: [e.stockCode],
            tradeIds: [],
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })),
        }
      },

      joinCompetition: async (competitionId, accountId) => {
        if (USE_MOCK) {
          set({
            joinedCompetitionIds: [...get().joinedCompetitionIds, competitionId],
            competitions: get().competitions.map((c) =>
              c.id === competitionId ? { ...c, isJoined: true, participantCount: c.participantCount + 1 } : c,
            ),
          })
          return
        }
        await competitionsApi.join(competitionId, accountId)
        await get().hydrateFromApi()
        await get().loadCompetitionExtras(competitionId)
      },

      leaveCompetition: async (competitionId, accountId) => {
        if (USE_MOCK) {
          set({
            joinedCompetitionIds: get().joinedCompetitionIds.filter((id) => id !== competitionId),
            competitions: get().competitions.map((c) =>
              c.id === competitionId ? { ...c, isJoined: false } : c,
            ),
          })
          return
        }
        await competitionsApi.leave(competitionId, accountId)
        await get().hydrateFromApi()
      },

      getLeaderboard: (competitionId) => {
        if (!USE_MOCK) return get().leaderboards[competitionId] ?? []
        return competitionId === 1
          ? [
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
          : []
      },

      getCompetitionChart: (competitionId) => {
        if (!USE_MOCK) return get().charts[competitionId] ?? []
        return [
          {
            nickname: '트레이더김',
            data: [
              { date: '04-01', scoreDelta: 0 },
              { date: '05-31', scoreDelta: 113000 },
            ],
          },
        ]
      },
    }),
    {
      name: 'managestock-data',
      skipHydration: !USE_MOCK,
      partialize: (state) =>
        USE_MOCK
          ? {
              accounts: state.accounts,
              holdings: state.holdings,
              trades: state.trades,
              journals: state.journals,
              journalEntries: state.journalEntries,
              competitions: state.competitions,
              joinedCompetitionIds: state.joinedCompetitionIds,
              performanceData: state.performanceData,
            }
          : {},
      onRehydrateStorage: () => (state) => {
        if (USE_MOCK && state && state.accounts.length === 0) state.initMockData()
      },
    },
  ),
)
