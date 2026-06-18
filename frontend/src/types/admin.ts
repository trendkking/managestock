export interface AdminUser {
  id: number
  nickname: string
  email: string
  role: string
  createdAt: string
  accountsCount: number
  journalsCount: number
}

export interface AdminJournal {
  id: number
  userId: number
  userNickname: string
  userEmail: string
  title: string
  journalDate: string
  contentPreview: string
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  totalJournals: number
  totalAccounts: number
  totalTrades: number
  totalCompetitions: number
  activeCompetitions: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  newJournalsToday: number
  signupTrend: { date: string; count: number }[]
}
