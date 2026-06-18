import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import { EMOTIONS } from '@/types'

export default function JournalFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const existing = useDataStore((s) => s.journals.find((j) => j.id === Number(id)))
  const accounts = useDataStore((s) => s.accounts)
  const addJournal = useDataStore((s) => s.addJournal)
  const updateJournal = useDataStore((s) => s.updateJournal)
  const deleteJournal = useDataStore((s) => s.deleteJournal)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [journalDate, setJournalDate] = useState(existing?.journalDate ?? new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState(existing?.accountId ? String(existing.accountId) : '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [reflection, setReflection] = useState(existing?.reflection ?? '')
  const [emotion, setEmotion] = useState(existing?.emotion ?? '')
  const [tagsInput, setTagsInput] = useState(existing?.tags.join(', ') ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10)
    const data = {
      title,
      journalDate,
      accountId: accountId ? Number(accountId) : undefined,
      content,
      reflection: reflection || undefined,
      emotion: emotion || undefined,
      tags,
      stockCodes: existing?.stockCodes ?? [],
      tradeIds: existing?.tradeIds ?? [],
    }
    setError('')
    try {
      if (isEdit && existing) {
        await updateJournal(existing.id, data)
        navigate(`/journal/${existing.id}`)
      } else {
        await addJournal(data)
        navigate('/journal')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, '일지 저장에 실패했습니다.'))
    }
  }

  const handleDelete = async () => {
    if (!existing || !confirm('일지를 삭제하시겠습니까?')) return
    try {
      await deleteJournal(existing.id)
      navigate('/journal')
    } catch (err) {
      setError(getApiErrorMessage(err, '일지 삭제에 실패했습니다.'))
    }
  }

  return (
    <div>
      <Link to={isEdit ? `/journal/${id}` : '/journal'} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? '상세로' : '목록으로'}
      </Link>

      <PageHeader
        title={isEdit ? '매매일지 수정' : '매매일지 작성'}
        action={isEdit && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> 삭제
          </Button>
        )}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-xl border bg-white p-6">
        <div>
          <Label>제목</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required maxLength={100} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>작성일</Label>
            <Input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>연결 계좌</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1">
              <option value="">선택 안함</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>매매 근거 (Markdown)</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 font-mono"
            rows={10}
            placeholder="## 매수 근거&#10;- 기술적 분석&#10;- 펀더멘털"
            required
          />
        </div>
        <div>
          <Label>반성·교훈</Label>
          <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} className="mt-1" rows={3} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>감정 상태</Label>
            <Select value={emotion} onChange={(e) => setEmotion(e.target.value)} className="mt-1">
              <option value="">선택 안함</option>
              {EMOTIONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>태그 (쉼표 구분)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="mt-1" placeholder="반도체, 장기" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Link to={isEdit ? `/journal/${id}` : '/journal'}>
            <Button type="button" variant="outline">취소</Button>
          </Link>
          <Button type="submit">{isEdit ? '수정' : '저장'}</Button>
        </div>
      </form>
    </div>
  )
}
