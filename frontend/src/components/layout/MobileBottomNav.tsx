import { NavLink } from 'react-router-dom'
import { BookOpen, Trophy, Wallet } from 'lucide-react'
import { cn } from '@/utils'

const tabs = [
  { to: '/accounts', label: '계좌', icon: Wallet },
  { to: '/journal', label: '일지', icon: BookOpen },
  { to: '/competitions', label: '대회', icon: Trophy },
]

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-red-100 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="하단 메뉴"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-slate-500',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                    isActive && 'bg-primary-muted',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
