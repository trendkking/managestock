import { useCallback, useEffect, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { adminApi } from '@/api'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { getApiErrorMessage } from '@/lib/apiError'
import type { AdminJournal } from '@/types/admin'

export default function AdminJournalsPage() {
  const [items, setItems] = useState<AdminJournal[]>([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.journals(search ? { q: search } : undefined)
      setItems(res.items)
    } catch {
      setError('게시물 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (item: AdminJournal) => {
    if (!confirm(`「${item.title}」 게시물을 삭제하시겠습니까?`)) return
    try {
      await adminApi.deleteJournal(item.id)
      await load()
    } catch (err) {
      alert(getApiErrorMessage(err, '게시물 삭제에 실패했습니다.'))
    }
  }

  return (
    <div>
      <PageHeader title="게시물 관리" description="매매일지(게시물) 조회 및 삭제" />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 내용, 작성자 검색"
          className="max-w-md"
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" /> 검색
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>제목</Th>
              <Th>작성자</Th>
              <Th>작성일</Th>
              <Th>등록일</Th>
              <Th>미리보기</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((j) => (
              <tr key={j.id}>
                <Td>{j.id}</Td>
                <Td className="max-w-[200px] font-medium">{j.title}</Td>
                <Td>
                  <div>{j.userNickname}</div>
                  <div className="text-xs text-slate-500">{j.userEmail}</div>
                </Td>
                <Td>{j.journalDate}</Td>
                <Td>{j.createdAt.slice(0, 10)}</Td>
                <Td className="max-w-xs truncate text-sm text-slate-600">{j.contentPreview}</Td>
                <Td>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(j)}>
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
