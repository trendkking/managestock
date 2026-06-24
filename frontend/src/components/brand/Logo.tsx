import { Link } from 'react-router-dom'
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
  to = '/',
  clickable = true,
  onClick,
  className,
  textClassName,
}: {
  size?: keyof typeof iconSizes
  showText?: boolean
  to?: string
  clickable?: boolean
  onClick?: () => void
  className?: string
  textClassName?: string
}) {
  const content = (
    <>
      <img src="/logo.svg" alt="" className={cn(iconSizes[size], 'shrink-0')} aria-hidden />
      {showText && (
        <span className={cn('font-bold tracking-tight text-slate-900', textSizes[size], textClassName)}>
          BULLS<span className="text-primary">LONG</span>
        </span>
      )}
    </>
  )

  if (clickable && to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={cn('flex items-center gap-2 rounded-lg transition-opacity hover:opacity-85', className)}
        aria-label="BULLSLONG 홈"
      >
        {content}
      </Link>
    )
  }

  return <div className={cn('flex items-center gap-2', className)}>{content}</div>
}
