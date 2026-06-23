import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, useCurrentUser } from '@/stores/authStore'
import { cn } from '@/utils'

const navItems = [
  { to: '/accounts', label: '계좌', icon: Wallet },
  { to: '/journal', label: '매매일지', icon: BookOpen },
  { to: '/competitions', label: '경연 대회', icon: Trophy },
]

export function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white',
        mobile ? 'w-72' : 'hidden w-64 md:flex',
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <BarChart3 className="h-7 w-7 text-blue-600" />
        <span className="text-lg font-bold text-slate-900">BULLSLONG</span>
        {mobile && (
          <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        <NavLink to="/accounts" className="flex items-center gap-2 md:hidden">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <span className="font-bold">BULLSLONG</span>
        </NavLink>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {user?.nickname?.[0] ?? 'U'}
          </div>
          <span className="hidden text-sm font-medium sm:inline">{user?.nickname}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                onClick={() => { navigate('/profile'); setOpen(false) }}
              >
                <Settings className="h-4 w-4" /> 프로필
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => { logout(); navigate('/'); setOpen(false) }}
              >
                <LogOut className="h-4 w-4" /> 로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
