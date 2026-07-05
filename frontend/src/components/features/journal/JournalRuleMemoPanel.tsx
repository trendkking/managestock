import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, NotebookPen } from 'lucide-react'
import { journalRuleMemoApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import { USE_MOCK } from '@/lib/env'
import { cn } from '@/utils'

const MOCK_STORAGE_KEY = 'bullslong:journal-rule-memo'

const PLACEHOLDER = `예시)
- 손절: -3% 이상이면 무조건 매도
- 추격 매수 금지, 계획한 가격에서만 진입
- 하루 최대 2종목까지만 매매
- 뉴스/테마주는 소액만, 장기 투자와 단타 구분`

function readMockMemo(): { content: string; updatedAt: string } {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as { content: string; updatedAt: string }
  } catch {
    /* ignore */
  }
  return { content: '', updatedAt: new Date().toISOString() }
}

function writeMockMemo(content: string) {
  const payload = { content, updatedAt: new Date().toISOString() }
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(payload))
  return payload
}

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function JournalRuleMemoPanel({ className }: { className?: string }) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const dirty = content !== savedContent

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (USE_MOCK) {
        const memo = readMockMemo()
        setContent(memo.content)
        setSavedContent(memo.content)
        setUpdatedAt(memo.updatedAt)
        return
      }
      const memo = await journalRuleMemoApi.get()
      setContent(memo.content)
      setSavedContent(memo.content)
      setUpdatedAt(memo.updatedAt)
    } catch (err) {
      setError(getApiErrorMessage(err, '메모를 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (USE_MOCK) {
        const memo = writeMockMemo(content)
        setSavedContent(memo.content)
        setUpdatedAt(memo.updatedAt)
        return
      }
      const memo = await journalRuleMemoApi.save(content)
      setSavedContent(memo.content)
      setUpdatedAt(memo.updatedAt)
    } catch (err) {
      setError(getApiErrorMessage(err, '메모 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const savedLabel = formatSavedAt(updatedAt)

  return (
    <Card className={cn('border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">나만의 매매 원칙</CardTitle>
              <CardDescription>
                손절·진입·금지 규칙 등을 적어 두고 매매 전에 확인하세요
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? '메모 펼치기' : '메모 접기'}
          >
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-3 pt-0">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER}
            className="min-h-[140px] resize-y border-amber-100 bg-white/90 font-mono text-sm leading-relaxed"
            disabled={loading}
            maxLength={20000}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {loading
                ? '불러오는 중...'
                : savedLabel
                  ? `마지막 저장 ${savedLabel}${dirty ? ' · 저장되지 않은 변경 있음' : ''}`
                  : dirty
                    ? '저장되지 않은 변경 있음'
                    : '아직 저장된 내용이 없습니다'}
            </p>
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={loading || saving || !dirty}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      )}
    </Card>
  )
}
