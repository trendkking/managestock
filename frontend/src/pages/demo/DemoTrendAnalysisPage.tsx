import { PageHeader } from '@/components/ui/Common'
import { TrendAnalysisWorkspace } from '@/components/features/trend/TrendAnalysisWorkspace'

export default function DemoTrendAnalysisPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="추세분석"
        description="체험 모드 — 종목 차트와 지표 분석을 둘러볼 수 있습니다"
      />
      <TrendAnalysisWorkspace defaultStock={{ code: '005930', name: '삼성전자' }} />
    </div>
  )
}
