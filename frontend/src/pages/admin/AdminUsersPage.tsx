import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { adminApi } from '@/api'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCurrentUser } from '@/stores/authStore'
import type { AdminUser } from '@/types/admin'

export default function AdminUsersPage() {
  const currentUser = useCurrentUser()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.users()
      setUsers(res.items)
    } catch {
      setError('회원 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`「${user.nickname}」회원을 탈퇴(삭제) 처리하시겠습니까?\n연결된 계좌·일지 데이터가 모두 삭제됩니다.`)) {
      return
    }
    try {
      await adminApi.deleteUser(user.id)
      await load()
    } catch (err) {
      alert(getApiErrorMessage(err, '회원 삭제에 실패했습니다.'))
    }
  }

  return (
    <div>
      <PageHeader title="회원 관리" description="가입일 확인 및 회원 탈퇴(삭제)" />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>닉네임</Th>
              <Th>이메일</Th>
              <Th>역할</Th>
              <Th>가입일</Th>
              <Th>계좌</Th>
              <Th>일지</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.id === currentUser?.id ? 'bg-amber-50' : ''}>
                <Td>{u.id}</Td>
                <Td className="font-medium">{u.nickname}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role === 'admin' ? '관리자' : '일반'}
                  </Badge>
                </Td>
                <Td>{u.createdAt.slice(0, 10)}</Td>
                <Td>{u.accountsCount}</Td>
                <Td>{u.journalsCount}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={u.id === currentUser?.id}
                    title={u.id === currentUser?.id ? '본인 계정은 삭제할 수 없습니다' : '탈퇴 처리'}
                    onClick={() => void handleDelete(u)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
