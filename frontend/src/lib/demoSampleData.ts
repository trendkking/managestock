import type {
  Account,
  Competition,
  CompetitionChartSeries,
  Holding,
  JournalEntry,
  LeaderboardEntry,
  PerformancePoint,
  Trade,
} from '@/types'

const defaultPerformance: PerformancePoint[] = [
  { date: '2026-05-01', returnRate: 0, totalValue: 10000000 },
  { date: '2026-05-08', returnRate: 2.3, totalValue: 10230000 },
  { date: '2026-05-15', returnRate: 5.1, totalValue: 10510000 },
  { date: '2026-05-22', returnRate: 8.4, totalValue: 10840000 },
  { date: '2026-05-31', returnRate: 12.5, totalValue: 11250000 },
]

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
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
    nickname: '체험유저',
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

export const DEMO_COMPETITION_CHART: CompetitionChartSeries[] = [
  {
    nickname: '체험유저',
    data: [
      { date: '04-01', scoreDelta: 0 },
      { date: '05-31', scoreDelta: 113000 },
    ],
  },
]

/** 로그인 없는 /demo 전용 샘플 데이터 (실제 회원 DB·스토어와 무관) */
export function createDemoSampleData() {
  const accounts: Account[] = [
    {
      id: 1,
      userId: 0,
      name: '키움 주계좌',
      broker: '키움증권',
      initialCapital: 10000000,
      cashBalance: 5670000,
      description: '장기 투자용 메인 계좌',
      connectionMode: 'api',
      syncStatus: 'connected',
      syncDomestic: true,
      syncUsMarkets: ['NASD'],
      accountNumberMasked: '1234****',
      lastSyncedAt: '2026-07-05T06:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      userId: 0,
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
    { id: 1, accountId: 1, stockCode: '005930', stockName: '삼성전자', tradeType: 'buy', quantity: 50, price: 68000, fee: 500, tax: 0, tradedAt: '2026-05-10T01:30:00Z', memo: '반등 구간 매수' },
    { id: 2, accountId: 1, stockCode: '000660', stockName: 'SK하이닉스', tradeType: 'buy', quantity: 10, price: 185000, fee: 300, tax: 0, tradedAt: '2026-05-15T05:00:00Z' },
    { id: 3, accountId: 2, stockCode: '035420', stockName: 'NAVER', tradeType: 'buy', quantity: 15, price: 210000, fee: 400, tax: 0, tradedAt: '2026-05-20T02:00:00Z' },
  ]

  const journalEntries: JournalEntry[] = [
    {
      id: 1,
      userId: 0,
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
      userId: 0,
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
      userId: 0,
      journalDate: '2026-05-20',
      stockCode: '035420',
      stockName: 'NAVER',
      side: 'sell',
      reason: '지지선 근처에서 단기 반등 기대',
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
  ]

  return {
    accounts,
    holdings,
    trades,
    journalEntries,
    competitions,
    performanceData: {
      1: defaultPerformance,
      2: [
        { date: '2026-05-01', returnRate: 0, totalValue: 5000000 },
        { date: '2026-05-15', returnRate: -1.2, totalValue: 4940000 },
        { date: '2026-05-31', returnRate: -2.4, totalValue: 4880000 },
      ],
    },
    leaderboards: { 1: DEMO_LEADERBOARD } as Record<number, LeaderboardEntry[]>,
    charts: { 1: DEMO_COMPETITION_CHART } as Record<number, CompetitionChartSeries[]>,
  }
}
