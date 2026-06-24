import { Link } from 'react-router-dom'
import { cn } from '@/utils'

const iconHeights = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-11',
  xl: 'h-16',
} as const

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
} as const

export const LOGO_SRC = '/logo.png'

export function Logo({
  size = 'md',
  showText = true,
  to = '/',
  clickable = true,
  onClick,
  className,
  textClassName,
}: {
  size?: keyof typeof iconHeights
  showText?: boolean
  to?: string
  clickable?: boolean
  onClick?: () => void
  className?: string
  textClassName?: string
}) {
  const content = (
    <>
      <img
        src={LOGO_SRC}
        alt=""
        className={cn(iconHeights[size], 'w-auto shrink-0 object-contain', !showText && size === 'lg' && 'h-14')}
        aria-hidden
      />
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
