import { useQuery } from '@tanstack/react-query'
import { marketApi } from '@/api'
import { CHART_FETCH_MONTHS } from '@/lib/journalStockChart'

export function dailyPricesQueryKey(stockCode: string, months = CHART_FETCH_MONTHS) {
  return ['market', 'dailyPrices', stockCode, months] as const
}

export function useDailyPricesQuery(stockCode: string, months = CHART_FETCH_MONTHS) {
  return useQuery({
    queryKey: dailyPricesQueryKey(stockCode, months),
    queryFn: () => marketApi.getDailyPrices(stockCode, { months }),
    enabled: Boolean(stockCode),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}
