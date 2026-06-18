import { US_STOCK_EXCHANGES } from '@/types'

export function formatSyncScope(syncDomestic?: boolean, syncUsMarkets?: string[]): string {
  const parts: string[] = []
  if (syncDomestic) parts.push('국내 주식')
  if (syncUsMarkets && syncUsMarkets.length > 0) {
    const labels = syncUsMarkets.map(
      (code) => US_STOCK_EXCHANGES.find((e) => e.code === code)?.label.split(' ')[0] ?? code,
    )
    parts.push(`미국 주식 (${labels.join(', ')})`)
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function formatHoldingMarket(marketType?: string, exchangeCode?: string | null): string {
  if (marketType === 'us') {
    const ex = US_STOCK_EXCHANGES.find((e) => e.code === exchangeCode)
    return ex ? `미국 · ${ex.label.split(' ')[0]}` : '미국 주식'
  }
  return '국내'
}
