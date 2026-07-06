import { Link, NavLink, Outlet } from 'react-router-dom'
import { ArrowRight, BookOpen, Sparkles, Trophy, Wallet } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils'

const navItems = [
  { to: '/demo/accounts', label: '계좌', icon: Wallet },
  { to: '/demo/journal', label: '매매일지', icon: BookOpen },
  { to: '/demo/competitions', label: '경연 대회', icon: Trophy },
]

export function DemoLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-primary-subtle/40">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Sparkles className="h-4 w-4 shrink-0" />
          체험 모드 — 샘플 데이터로 기능을 둘러보는 중입니다
        </span>
        <span className="mx-2 hidden text-amber-700/60 sm:inline">|</span>
        <span className="hidden text-amber-900/80 sm:inline">가입 후 내 계좌를 연동해 실제 데이터를 관리하세요</span>
        <Link to="/register" className="ml-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          무료 가입 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <header className="border-b border-red-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" aria-label="BULLSLONG 홈">
              <Logo size="sm" clickable={false} />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-muted text-primary-darker'
                        : 'text-slate-600 hover:bg-primary-subtle hover:text-slate-900',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">회원가입</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        <Outlet />
      </main>

      <nav
        className="sticky bottom-0 border-t border-red-100 bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="체험 메뉴"
      >
        <div className="flex h-16 items-stretch justify-around">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  isActive ? 'text-primary' : 'text-slate-500',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
