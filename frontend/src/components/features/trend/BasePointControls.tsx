import type { BasePointVisibility } from '@/lib/trendAnalysis/basePoints'

type BasePointControlsProps = {
  visibility: BasePointVisibility
  onToggle: (key: keyof BasePointVisibility) => void
  className?: string
}

const ITEMS: { key: keyof BasePointVisibility; label: string; color: string; hint: string }[] = [
  {
    key: 'hbp',
    label: 'HBP',
    color: '#dc2626',
    hint: 'High Base Point',
  },
  {
    key: 'lbp',
    label: 'LBP',
    color: '#2563eb',
    hint: 'Low Base Point',
  },
]

export function BasePointControls({ visibility, onToggle, className }: BasePointControlsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ''}`}>
      <span className="text-xs font-semibold text-slate-500">Base Point</span>
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
