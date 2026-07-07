import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, NotebookPen, RotateCcw } from 'lucide-react'
import { journalRuleMemoApi } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import { USE_MOCK } from '@/lib/env'
import { cn } from '@/utils'

const MOCK_STORAGE_KEY = 'bullslong:journal-rule-memo'
const DRAFT_STORAGE_KEY = 'bullslong:journal-rule-memo-draft'

const PLACEHOLDER = `예시)
- 손절: -3% 이상이면 무조건 매도
- 추격 매수 금지, 계획한 가격에서만 진입
- 하루 최대 2종목까지만 매매
- 뉴스/테마주는 소액만, 장기 투자와 단타 구분`

function readLocalMemo(key: string): { content: string; updatedAt: string } {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as { content: string; updatedAt: string }
  } catch {
    /* ignore */
  }
  return { content: '', updatedAt: new Date().toISOString() }
}

function writeLocalMemo(key: string, content: string) {
  const payload = { content, updatedAt: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify(payload))
  return payload
}

function readDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeDraft(content: string) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, content)
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
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

export function JournalRuleMemoPanel({
  className,
  localOnly = false,
  storageKey = MOCK_STORAGE_KEY,
}: {
  className?: string
  /** true면 API 없이 브라우저 localStorage만 사용 (체험 모드) */
  localOnly?: boolean
  storageKey?: string
}) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const dirty = content !== savedContent

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSaveMessage('')
    try {
      if (USE_MOCK || localOnly) {
        const memo = readLocalMemo(localOnly ? storageKey : MOCK_STORAGE_KEY)
        setContent(memo.content)
        setSavedContent(memo.content)
        setUpdatedAt(memo.updatedAt)
        clearDraft()
        return
      }
      const memo = await journalRuleMemoApi.get()
      setContent(memo.content)
      setSavedContent(memo.content)
      setUpdatedAt(memo.updatedAt)
      clearDraft()
    } catch (err) {
      const draft = readDraft()
      if (draft != null && draft.length > 0) {
        setContent(draft)
        setSavedContent('')
      }
      setError(getApiErrorMessage(err, '메모를 불러오지 못했습니다. 아래에서 다시 시도해 주세요.'))
    } finally {
      setLoading(false)
    }
  }, [localOnly, storageKey])

  const useLocalPersistence = USE_MOCK || localOnly
  const memoStorageKey = localOnly ? storageKey : MOCK_STORAGE_KEY

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!useLocalPersistence || loading) return
    if (dirty) writeDraft(content)
  }, [content, dirty, loading, useLocalPersistence])

  useEffect(() => {
    if (!saveMessage) return
    const timer = window.setTimeout(() => setSaveMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [saveMessage])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaveMessage('')
    try {
      if (useLocalPersistence) {
        const memo = writeLocalMemo(memoStorageKey, content)
        setContent(memo.content)
        setSavedContent(memo.content)
        setUpdatedAt(memo.updatedAt)
        setSaveMessage(localOnly ? '저장되었습니다. (이 기기에만 보관)' : '저장되었습니다.')
        clearDraft()
        return
      }
      const memo = await journalRuleMemoApi.save(content)
      setContent(memo.content)
      setSavedContent(memo.content)
      setUpdatedAt(memo.updatedAt)
      setSaveMessage('저장되었습니다.')
      clearDraft()
    } catch (err) {
      setError(getApiErrorMessage(err, '메모 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const savedLabel = formatSavedAt(updatedAt)

  return (
    <Card className={cn('min-w-0 border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white', className)}>
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
            className="min-h-[160px] resize-y border-amber-100 bg-white/90 text-sm leading-relaxed text-slate-700"
            disabled={loading}
            maxLength={20000}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                {loading
                  ? '불러오는 중...'
                  : savedLabel
                    ? `마지막 저장 ${savedLabel}${dirty ? ' · 저장되지 않은 변경 있음' : ''}`
                    : dirty
                      ? '저장되지 않은 변경 있음'
                      : '아직 저장된 내용이 없습니다'}
              </p>
              {saveMessage && <p className="text-xs font-medium text-emerald-600">{saveMessage}</p>}
            </div>
            <div className="flex gap-2">
              {error && (
                <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                  <RotateCcw className="h-4 w-4" /> 다시 불러오기
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={loading || saving || !dirty}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      )}
    </Card>
  )
}
