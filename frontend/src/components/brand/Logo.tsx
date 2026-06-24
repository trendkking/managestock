import { cn } from '@/utils'

const iconSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
} as const

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
} as const

export function Logo({
  size = 'md',
  showText = true,
  className,
  textClassName,
}: {
  size?: keyof typeof iconSizes
  showText?: boolean
  className?: string
  textClassName?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img src="/logo.svg" alt="" className={cn(iconSizes[size], 'shrink-0')} aria-hidden />
      {showText && (
        <span className={cn('font-bold tracking-tight text-slate-900', textSizes[size], textClassName)}>
          BULLS<span className="text-primary">LONG</span>
        </span>
      )}
    </div>
  )
}
