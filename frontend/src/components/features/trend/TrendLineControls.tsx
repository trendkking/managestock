import type { TrendLineVisibility } from '@/lib/trendAnalysis/trendLines'

type TrendLineControlsProps = {
  visibility: TrendLineVisibility
  onToggle: (key: keyof TrendLineVisibility) => void
  className?: string
}

const ITEMS: { key: keyof TrendLineVisibility; label: string; color: string; hint: string }[] = [
  {
    key: 'finalTrend',
    label: '최종 추세선',
    color: '#16a34a',
    hint: '종가·고저 교점',
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

export function TrendLineControls({ visibility, onToggle, className }: TrendLineControlsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ''}`}>
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
  )
}
