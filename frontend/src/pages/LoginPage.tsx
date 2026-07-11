import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { AuthLayout } from '@/components/layout/Layout'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const ok = await login(email, password)
    if (ok) {
      navigate('/accounts')
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  return (
    <AuthLayout>
      <Card className="border-red-100 shadow-lg shadow-red-100/30">
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-col items-center">
            <Logo size="lg" showText={false} />
            <h1 className="mt-3 text-2xl font-bold">로그인</h1>
            <p className="mt-1 text-sm text-slate-500">BULLSLONG에 오신 것을 환영합니다</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>이메일</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label>비밀번호</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">로그인</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            계정이 없으신가요? <Link to="/register" className="font-medium text-primary hover:underline">회원가입</Link>
          </p>
          <p className="mt-2 text-center text-sm text-slate-500">
            <Link to="/admin" className="text-slate-600 hover:underline">관리자 로그인 →</Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
