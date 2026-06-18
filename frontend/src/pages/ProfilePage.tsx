import { useState } from 'react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input, Label } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAuthStore, useCurrentUser } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const user = useCurrentUser()
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [showPublic, setShowPublic] = useState(user?.showNicknamePublic ?? true)

  const handleSave = async () => {
    try {
      await updateProfile({ nickname, showNicknamePublic: showPublic })
      alert('프로필이 저장되었습니다.')
    } catch (err) {
      alert(getApiErrorMessage(err, '프로필 저장에 실패했습니다.'))
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 탈퇴하시겠습니까?')) return
    try {
      await useAuthStore.getState().deleteAccount()
      navigate('/')
    } catch (err) {
      alert(getApiErrorMessage(err, '계정 삭제에 실패했습니다.'))
    }
  }

  return (
    <div>
      <PageHeader title="프로필" description="계정 정보 및 설정을 관리합니다" />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-semibold">기본 정보</h2>
            <div>
              <Label>닉네임</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>이메일</Label>
              <Input value={user?.email ?? ''} disabled className="mt-1 bg-slate-50" />
            </div>
            <div>
              <Label>가입일</Label>
              <Input value={user?.createdAt?.slice(0, 10) ?? ''} disabled className="mt-1 bg-slate-50" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showPublic} onChange={(e) => setShowPublic(e.target.checked)} />
              리더보드에 닉네임 공개
            </label>
            <Button onClick={handleSave}>저장</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-semibold">비밀번호 변경</h2>
            <div>
              <Label>현재 비밀번호</Label>
              <Input type="password" className="mt-1" placeholder="••••••••" />
            </div>
            <div>
              <Label>새 비밀번호</Label>
              <Input type="password" className="mt-1" placeholder="8자 이상" />
            </div>
            <div>
              <Label>비밀번호 확인</Label>
              <Input type="password" className="mt-1" />
            </div>
            <Button variant="outline">비밀번호 변경 (Phase 2)</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-red-600">위험 구역</h2>
            <p className="mt-2 text-sm text-slate-500">계정을 삭제하면 모든 데이터가 영구 삭제됩니다.</p>
            <Button variant="destructive" className="mt-4" onClick={handleDelete}>계정 삭제</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
