export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  nickname: string
  email: string
  role: UserRole
  showNicknamePublic: boolean
  createdAt: string
}

export type MarketType = 'domestic' | 'us'

export interface Holding {
  id: number
  accountId: number
  marketType?: MarketType
  exchangeCode?: string | null
  stockCode: string
  stockName: string
  quantity: number
  orderableQuantity?: number
  avgPrice: number
  currentPrice: number
  purchaseAmount?: number
  evaluationAmount?: number
  profitLoss?: number
  returnRate?: number
  currency?: string
}

export interface HoldingsPortfolioSummary {
  totalDeposit: number
  totalAssets: number
  evaluationAmount: number
  purchaseAmount: number
  profitLoss: number
  returnRate: number
}

export interface Trade {
  id: number
  accountId: number
  stockCode: string
  stockName: string
  tradeType: 'buy' | 'sell'
  quantity: number
  price: number
  fee: number
  tax: number
  realizedPnl?: number
  tradedAt: string
  memo?: string
}

export type ConnectionMode = 'manual' | 'api'
export type SyncStatus = 'manual' | 'connected' | 'error' | 'pending'

export interface Account {
  id: number
  userId: number
  name: string
  broker: string
  brokerCode?: string
  connectionMode?: ConnectionMode
  syncStatus?: SyncStatus
  accountNumberMasked?: string | null
  lastSyncedAt?: string | null
  lastSyncError?: string | null
  hasApiCredentials?: boolean
  syncDomestic?: boolean
  syncUsMarkets?: string[]
  /** 미국 주식 동기화 시 적용된 USD→KRW 환율 */
  usdKrwRate?: number | null
  initialCapital: number
  cashBalance: number
  description?: string
  createdAt: string
  /** 목록/동기화 API에서 함께 내려오는 집계값 (선택) */
  currentValue?: number
  profitLoss?: number
  returnRate?: number
  holdingsSummary?: HoldingsPortfolioSummary
}

export interface BrokerFieldSchema {
  name: string
  label: string
  type?: string
  required?: boolean
  placeholder?: string
  maxLength?: number
}

export interface SupportedMarkets {
  domestic: boolean
  us: string[]
}

export interface BrokerOption {
  code: string
  name: string
  connectionMode: string
  apiConnectAvailable?: boolean
  supportedMarkets?: SupportedMarkets
  fields: BrokerFieldSchema[]
}

export interface AccountConnectPayload {
  name: string
  brokerCode: string
  accountNumber: string
  accountProductCode: string
  appKey: string
  appSecret: string
  description?: string
  syncDomestic: boolean
  syncUs: string[]
}

export const US_STOCK_EXCHANGES = [
  { code: 'NASD', label: '나스닥 (NASDAQ)' },
  { code: 'NYSE', label: '뉴욕 (NYSE)' },
  { code: 'AMEX', label: '아멕스 (AMEX)' },
] as const

export interface AccountWithStats extends Account {
  currentValue: number
  profitLoss: number
  returnRate: number
  holdings: Holding[]
  holdingsSummary: HoldingsPortfolioSummary
  trades: Trade[]
  performance?: PerformancePoint[]
}

export interface PerformancePoint {
  date: string
  returnRate: number
  totalValue: number
}

export interface Journal {
  id: number
  userId: number
  accountId?: number
  title: string
  journalDate: string
  content: string
  reflection?: string
  emotion?: string
  tags: string[]
  stockCodes: string[]
  tradeIds: number[]
  createdAt: string
  updatedAt: string
}

/** 매매일지 — 날짜·종목·사유 (차트 마커용) */
export type JournalEntrySide = 'buy' | 'sell'

export interface JournalEntry {
  id: number
  userId: number
  journalDate: string
  stockCode: string
  stockName: string
  side: JournalEntrySide
  reason: string
  createdAt: string
  updatedAt: string
}

export interface JournalRuleMemo {
  content: string
  updatedAt: string
}

export interface StockSearchResult {
  code: string
  name: string
  market: string
  region?: 'KR' | 'US'
}

export interface DailyPricePoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type CompetitionStatus = 'upcoming' | 'active' | 'ended'

export interface MyCompetitionEntry {
  competitionId: number
  competitionName: string
  competitionStatus: CompetitionStatus
  accountId: number
  accountName: string
  scoreDelta: number
  startTotalValue: number
  currentTotalValue: number
  unrealizedPnl: number
  realizedPnl: number
  periodDeposits: number
  periodWithdrawals: number
  netCashFlow: number
}

export interface Competition {
  id: number
  name: string
  description?: string
  startDate: string
  endDate: string
  status: CompetitionStatus
  minInitialCapital?: number
  maxParticipants?: number
  rules?: string
  participantCount: number
  isJoined?: boolean
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  nickname: string
  accountName: string
  scoreDelta: number
  startTotalValue: number
  currentTotalValue: number
  unrealizedPnl: number
  realizedPnl: number
  periodDeposits: number
  periodWithdrawals: number
  netCashFlow: number
  isMe?: boolean
}

export interface CompetitionChartSeries {
  nickname: string
  data: { date: string; scoreDelta: number }[]
}

export interface DashboardSummary {
  totalValue: number
  totalProfitLoss: number
  totalReturnRate: number
  accountsCount: number
  accountSummaries: { id: number; name: string; returnRate: number }[]
  recentTrades: Trade[]
  activeCompetitions: { id: number; name: string; myRank: number; scoreDelta: number }[]
  recentJournals: Journal[]
}

export const BROKERS = ['키움증권', 'KB증권', '미래에셋', 'NH투자', '삼성증권', '한국투자', '기타'] as const

export const EMOTIONS = [
  { value: 'confident', label: '자신감' },
  { value: 'anxious', label: '불안' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'calm', label: '냉정' },
  { value: 'greedy', label: '욕심' },
  { value: 'fearful', label: '공포' },
] as const
