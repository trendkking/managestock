import type { TrendIndicatorModule } from '@/lib/trendAnalysis/types'

/**
 * 추세분석 커스텀 지표 등록소.
 *
 * 새 지표 추가 예:
 * ```tsx
 * {
 *   id: 'my-score',
 *   label: '추세 점수',
 *   placement: 'above',
 *   Component: ({ context }) => (
 *     <p>{context.stockName} 최근 {context.chart.visiblePriceData.length}봉</p>
 *   ),
 * }
 * ```
 */
export const TREND_INDICATORS: TrendIndicatorModule[] = []

export function trendIndicatorsByPlacement(placement: TrendIndicatorModule['placement']) {
  return TREND_INDICATORS.filter((item) => item.placement === placement)
}
