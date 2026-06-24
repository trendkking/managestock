import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LOGO_SRC } from '@/components/brand/Logo'
import { BookOpen, LayoutDashboard, LogOut, Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore, useCurrentUser } from '@/stores/authStore'
import { cn } from '@/utils'

const adminNav = [
  { to: '/admin/dashboard', label: '통계 대시보드', icon: LayoutDashboard },
  { to: '/admin/users', label: '회원 관리', icon: Users },
  { to: '/admin/journals', label: '게시물 관리', icon: BookOpen },
  { to: '/admin/competitions', label: '대회 관리', icon: Trophy },
]

export function AdminLayout() {
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 flex-col border-r border-red-950 bg-gradient-to-b from-slate-900 to-primary-darker text-slate-100">
        <div className="flex h-16 items-center border-b border-red-950/50 px-5">
          <Link to="/" className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-85" aria-label="BULLSLONG 홈">
            <img src={LOGO_SRC} alt="" className="h-9 w-auto object-contain" aria-hidden />
            <div>
              <p className="text-sm font-bold">BULLS<span className="text-red-400">LONG</span></p>
              <p className="text-xs text-slate-400">관리자</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-500/20 text-red-300'
                    : 'text-slate-300 hover:bg-red-950/40 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-red-950/50 p-4">
          <p className="truncate text-xs text-slate-400">{user?.nickname} ({user?.email})</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-600 bg-transparent text-slate-200 hover:bg-red-950/40"
            onClick={() => navigate('/accounts')}
          >
            사용자 화면
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-300 hover:bg-red-950/50 hover:text-red-200"
            onClick={() => {
              logout()
              navigate('/admin')
            }}
          >
            <LogOut className="h-4 w-4" /> 로그아웃
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
