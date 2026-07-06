import { useMemo } from 'react'
import { buildAccountWithStats } from '@/lib/accountStats'
import {
  selectDemoAccounts,
  selectDemoHoldings,
  selectDemoLeaderboard,
  selectDemoTrades,
  useDemoStore,
} from '@/stores/demoStore'

export function useDemoAccountsWithStats() {
  const accounts = useDemoStore(selectDemoAccounts)
  const holdings = useDemoStore(selectDemoHoldings)
  const trades = useDemoStore(selectDemoTrades)

  return useMemo(
    () => accounts.map((a) => buildAccountWithStats(a, holdings, trades)),
    [accounts, holdings, trades],
  )
}

export function useDemoAccountWithStats(accountId: number) {
  const accounts = useDemoStore(selectDemoAccounts)
  const holdings = useDemoStore(selectDemoHoldings)
  const trades = useDemoStore(selectDemoTrades)

  return useMemo(() => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return null
    return buildAccountWithStats(account, holdings, trades)
  }, [accounts, holdings, trades, accountId])
}

export function useDemoLeaderboard(competitionId: number) {
  return useDemoStore((s) => selectDemoLeaderboard(s, competitionId))
}
