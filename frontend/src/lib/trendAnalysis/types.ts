import type { ReactNode } from 'react'
import type { JournalStockChartState } from '@/components/features/journal/useJournalStockChart'

export type TrendIndicatorPlacement = 'above' | 'below'

/** 커스텀 지표가 차트 렌더링에 접근할 때 쓰는 컨텍스트 */
export type TrendIndicatorContext = {
  stockCode: string
  stockName: string
  chart: JournalStockChartState
}

export type TrendIndicatorModule = {
  id: string
  label: string
  placement: TrendIndicatorPlacement
  /** 차트 위/아래 패널에 그릴 React 컴포넌트 */
  Component: (props: { context: TrendIndicatorContext }) => ReactNode
}
