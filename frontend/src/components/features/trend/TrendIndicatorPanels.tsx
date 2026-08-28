import { Card, CardContent } from '@/components/ui/Card'
import { trendIndicatorsByPlacement } from '@/lib/trendAnalysis/indicators'
import type { TrendIndicatorContext, TrendIndicatorPlacement } from '@/lib/trendAnalysis/types'

type TrendIndicatorPanelsProps = {
  placement: TrendIndicatorPlacement
  context: TrendIndicatorContext
}

export function TrendIndicatorPanels({ placement, context }: TrendIndicatorPanelsProps) {
  const indicators = trendIndicatorsByPlacement(placement)
  if (indicators.length === 0) return null

  return (
    <div className="space-y-3">
      {indicators.map(({ id, label, Component }) => (
        <Card key={id}>
          <CardContent className="pt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>
            <Component context={context} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
