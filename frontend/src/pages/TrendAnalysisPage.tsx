import { PageHeader } from '@/components/ui/Common'
import { TrendAnalysisWorkspace } from '@/components/features/trend/TrendAnalysisWorkspace'

export default function TrendAnalysisPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="추세분석"
        description="종목 차트와 커스텀 지표로 추세를 분석합니다"
      />
      <TrendAnalysisWorkspace />
    </div>
  )
}
