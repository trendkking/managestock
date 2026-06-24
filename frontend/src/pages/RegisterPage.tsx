import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { AuthLayout } from '@/components/layout/Layout'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setError('')
    const result = await register(nickname, email, password)
    if (result.ok) {
      navigate('/accounts')
    } else {
      setError(result.message ?? '입력값을 확인해주세요. (닉네임 2자+, 비밀번호 8자+)')
    }
  }

  return (
    <AuthLayout>
      <Card className="border-red-100 shadow-lg shadow-red-100/30">
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-col items-center">
            <Logo size="lg" showText={false} />
            <h1 className="mt-3 text-2xl font-bold">회원가입</h1>
            <p className="mt-1 text-sm text-slate-500">BULLSLONG과 함께 투자를 기록하세요</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>닉네임</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1" required minLength={2} maxLength={20} />
            </div>
            <div>
              <Label>이메일</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label>비밀번호</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required minLength={8} />
            </div>
            <div>
              <Label>비밀번호 확인</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">가입하기</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            이미 계정이 있으신가요? <Link to="/login" className="font-medium text-primary hover:underline">로그인</Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
