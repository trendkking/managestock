import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { ADMIN_ACCOUNT } from '@/config/testAccounts'
import { useAuthStore } from '@/stores/authStore'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = await login(username.trim(), password)
    const user = useAuthStore.getState().user
    if (ok && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true })
      return
    }
    if (ok && user?.role !== 'admin') {
      useAuthStore.getState().logout()
      setError('관리자 계정이 아닙니다.')
      return
    }
    setError('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700 bg-slate-800 text-slate-100 shadow-xl">
          <CardContent className="pt-8">
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
                <Shield className="h-8 w-8 text-amber-400" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-white">관리자 로그인</h1>
              <p className="mt-1 text-sm text-slate-400">MANAGESTOCK 관리 시스템</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">관리자 아이디</Label>
                <Input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-900 text-white"
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-300">비밀번호</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 border-slate-600 bg-slate-900 text-white"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                관리자 로그인
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              기본 계정: {ADMIN_ACCOUNT.email} / {ADMIN_ACCOUNT.password}
            </p>

            <p className="mt-6 text-center text-sm text-slate-400">
              <Link to="/" className="text-amber-400 hover:underline">
                ← 서비스 홈으로
              </Link>
              <span className="mx-2">·</span>
              <Link to="/login" className="hover:text-slate-200">
                일반 로그인
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
