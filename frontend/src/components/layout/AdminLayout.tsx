import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, LayoutDashboard, LogOut, Shield, Trophy, Users } from 'lucide-react'
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
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-5">
          <Shield className="h-6 w-6 text-amber-400" />
          <div>
            <p className="text-sm font-bold">BULLSLONG</p>
            <p className="text-xs text-slate-400">관리자</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 space-y-2">
          <p className="truncate text-xs text-slate-400">{user?.nickname} ({user?.email})</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
            onClick={() => navigate('/dashboard')}
          >
            <BarChart3 className="h-4 w-4" /> 사용자 화면
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
