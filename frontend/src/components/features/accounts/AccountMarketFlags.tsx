import { KrFlagIcon, UsFlagIcon } from '@/components/ui/FlagIcons'
import { cn } from '@/utils'

export type AccountMarketScope = 'domestic' | 'us' | 'both'

/** 계좌 동기화 설정 → 표시할 시장 (미설정 수동 계좌는 국내로 간주) */
export function resolveAccountMarketScope(
  syncDomestic?: boolean,
  syncUsMarkets?: string[],
): AccountMarketScope {
  const hasUs = (syncUsMarkets?.length ?? 0) > 0
  const hasDomestic = syncDomestic !== false
  if (hasDomestic && hasUs) return 'both'
  if (hasUs) return 'us'
  return 'domestic'
}

const flagMd = 'h-[18px] w-[27px]'
const flagSm = 'h-[15px] w-[22px]'

type AccountMarketFlagsProps = {
  syncDomestic?: boolean
  syncUsMarkets?: string[]
  size?: 'md' | 'sm'
  className?: string
}

export function AccountMarketFlags({
  syncDomestic,
  syncUsMarkets,
  size = 'md',
  className,
}: AccountMarketFlagsProps) {
  const scope = resolveAccountMarketScope(syncDomestic, syncUsMarkets)
  const flag = size === 'sm' ? flagSm : flagMd

  if (scope === 'both') {
    return (
      <span className={cn('inline-flex shrink-0 items-center -space-x-1', className)} aria-hidden>
        <KrFlagIcon className={cn(flag, 'relative z-10')} />
        <UsFlagIcon className={cn(flag, 'relative z-0 ring-2 ring-white')} />
      </span>
    )
  }
  if (scope === 'us') {
    return (
      <span className={cn('inline-flex shrink-0', className)} aria-hidden>
        <UsFlagIcon className={flag} />
      </span>
    )
  }
  return (
    <span className={cn('inline-flex shrink-0', className)} aria-hidden>
      <KrFlagIcon className={flag} />
    </span>
  )
}

export function AccountTitleWithFlags({
  name,
  syncDomestic,
  syncUsMarkets,
  size = 'md',
  className,
  titleClassName,
}: {
  name: string
  syncDomestic?: boolean
  syncUsMarkets?: string[]
  size?: 'md' | 'sm'
  className?: string
  titleClassName?: string
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <AccountMarketFlags syncDomestic={syncDomestic} syncUsMarkets={syncUsMarkets} size={size} />
      <span className={cn('truncate font-semibold', titleClassName)}>{name}</span>
    </span>
  )
}
