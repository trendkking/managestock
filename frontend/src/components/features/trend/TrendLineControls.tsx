import type { TrendLineVisibility } from '@/lib/trendAnalysis/trendLines'

type TrendLineControlsProps = {
  visibility: TrendLineVisibility
  finalTrendBlend: number
  onFinalTrendBlendChange: (value: number) => void
  onToggle: (key: keyof TrendLineVisibility) => void
  className?: string
}

const ITEMS: { key: keyof TrendLineVisibility; label: string; color: string; hint: string }[] = [
  {
    key: 'finalTrend',
    label: '최종 추세선',
    color: '#16a34a',
    hint: '종가·고저 사이',
  },
  {
    key: 'closeTrend',
    label: '종가 추세선',
    color: '#64748b',
    hint: '첫·마지막 종가',
  },
  {
    key: 'extremeTrend',
    label: '고저 추세선',
    color: '#64748b',
    hint: '최고가·최저가',
  },
]

export function TrendLineControls({
  visibility,
  finalTrendBlend,
  onFinalTrendBlendChange,
  onToggle,
  className,
}: TrendLineControlsProps) {
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-semibold text-slate-500">추세선</span>
        {ITEMS.map(({ key, label, color, hint }) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={visibility[key]}
              onChange={() => onToggle(key)}
              className="rounded border-slate-300"
            />
            <span style={{ color }} className="font-medium">
              {label}
            </span>
            <span className="text-xs text-slate-400">({hint})</span>
          </label>
        ))}
      </div>

      {visibility.finalTrend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm">
            <span className="shrink-0 text-xs font-medium text-slate-600">최종 추세 위치</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(finalTrendBlend * 100)}
              onChange={(e) => onFinalTrendBlendChange(Number(e.target.value) / 100)}
              className="h-1.5 flex-1 cursor-pointer accent-emerald-600"
            />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">
              {Math.round(finalTrendBlend * 100)}%
            </span>
          </label>
          <p className="text-xs text-slate-400">
            0% 종가 추세 쪽 · 100% 고저 추세 쪽 · 고가·저가 범위 밖으로는 그려지지 않음
          </p>
        </div>
      )}
    </div>
  )
}
