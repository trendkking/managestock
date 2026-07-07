import { cn, formatCurrency, formatPercent, percentColor } from '@/utils'

export function StatCard({
  label,
  value,
  subValue,
  isPercent,
  format = 'currency',
  className,
}: {
  label: string
  value: number
  subValue?: string
  isPercent?: boolean
  format?: 'currency' | 'number'
  className?: string
}) {
  const display = isPercent
    ? formatPercent(value)
    : format === 'number'
      ? value.toLocaleString()
      : formatCurrency(value)

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn('mt-2 text-2xl font-bold', isPercent ? percentColor(value) : 'text-slate-900')}>
        {display}
      </p>
      {subValue && <p className="mt-1 text-xs text-slate-400">{subValue}</p>}
    </div>
  )
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0 rounded-xl border border-slate-200 bg-white md:overflow-x-auto',
        className,
      )}
    >
      <table className="w-full min-w-0 table-fixed text-left text-sm md:table-auto md:min-w-[640px]">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('border-b border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-slate-600 md:px-4 md:py-3', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('border-b border-slate-100 px-3 py-2.5 text-slate-700 md:px-4 md:py-3', className)}>{children}</td>
}
