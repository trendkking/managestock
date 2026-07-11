import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DataBootstrap } from '@/components/layout/DataBootstrap'
import { useAuthStore, useIsAuthenticated, useCurrentUser } from '@/stores/authStore'
import { MainLayout } from '@/components/layout/Layout'

function AuthenticatedLayout() {
  return (
    <MainLayout>
      <DataBootstrap>
        <Outlet />
      </DataBootstrap>
    </MainLayout>
  )
}

export function ProtectedRoute() {
  const isAuth = useIsAuthenticated()
  if (!isAuth) return <Navigate to="/login" replace />
  return <AuthenticatedLayout />
}

export function GuestRoute() {
  const isAuth = useIsAuthenticated()
  if (isAuth) {
    return <Navigate to="/accounts" replace />
  }
  return <Outlet />
}

/** /admin — 이미 관리자 로그인 시 대시보드로 */
export function AdminEntryRoute() {
  const isAuth = useIsAuthenticated()
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (isAuth && user && user.role !== 'admin') {
      logout()
    }
  }, [isAuth, user, logout])

  if (isAuth && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }
  return <Outlet />
}

/** /admin/dashboard 등 — 관리자 전용 */
export function AdminProtectedRoute() {
  const isAuth = useIsAuthenticated()
  const user = useCurrentUser()
  if (!isAuth || user?.role !== 'admin') {
    return <Navigate to="/admin" replace />
  }
  return <AdminLayout />
}
