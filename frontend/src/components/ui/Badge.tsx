import { cn } from '@/utils'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'success' | 'danger' | 'secondary' | 'outline' }) {
  const variants = {
    default: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    secondary: 'bg-slate-100 text-slate-700',
    outline: 'border border-slate-200 text-slate-700',
  }
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}

export function ReturnRateBadge({ value }: { value: number }) {
  const variant = value > 0 ? 'success' : value < 0 ? 'danger' : 'secondary'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return (
    <Badge variant={variant}>
      {sign}{Math.abs(value).toFixed(2)}%
    </Badge>
  )
}
