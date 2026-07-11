import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from 'lucide-react'
import { StockSearchField } from '@/components/features/journal/StockSearchField'
import {
  JournalMaControls,
  JournalSrLinesControls,
  JournalStockChartView,
} from '@/components/features/journal/JournalStockChartPanel'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import type { JournalEntry, JournalEntrySide } from '@/types'

type JournalEntryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: JournalEntry | null
  onSaved?: (entry: JournalEntry) => void
}

export function JournalEntryFormDialog({ open, onOpenChange, entry, onSaved }: JournalEntryFormDialogProps) {
  const isEdit = !!entry
  const addJournalEntry = useDataStore((s) => s.addJournalEntry)
  const updateJournalEntry = useDataStore((s) => s.updateJournalEntry)

  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [side, setSide] = useState<JournalEntrySide>('buy')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  /** 사유는 비제어 입력 — 타이핑마다 차트 리렌더를 막기 위함 */
  const [reasonResetKey, setReasonResetKey] = useState(0)
  const [reasonDefault, setReasonDefault] = useState('')
  const reasonRef = useRef('')

  const chart = useJournalStockChart(stockCode)
  const previewMarker = useMemo(
    () => ({ date: journalDate, side }),
    [journalDate, side],
  )

  useEffect(() => {
    if (!open) return
    if (entry) {
      setJournalDate(entry.journalDate)
      setStockCode(entry.stockCode)
      setStockName(entry.stockName)
      setReasonDefault(entry.reason)
      reasonRef.current = entry.reason
      setSide(entry.side)
    } else {
      setJournalDate(new Date().toISOString().slice(0, 10))
      setStockCode('')
      setStockName('')
      setReasonDefault('')
      reasonRef.current = ''
      setSide('buy')
    }
    setReasonResetKey((k) => k + 1)
    setError('')
  }, [open, entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const reason = reasonRef.current.trim()
    if (!stockCode.trim() || !stockName.trim() || !reason) {
      setError('날짜, 종목(검색 후 선택), 사유를 모두 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      journalDate,
      stockCode: stockCode.trim(),
      stockName: stockName.trim(),
      side,
      reason,
    }
    try {
      if (isEdit && entry) {
        await updateJournalEntry(entry.id, payload)
        onSaved?.({ ...entry, ...payload, updatedAt: new Date().toISOString() })
      } else {
        const created = await addJournalEntry(payload)
        onSaved?.(created)
      }
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? '수정에 실패했습니다.' : '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? '매매 기록 수정' : '매매 기록 추가'} className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="journal-date">날짜</Label>
                <Input
                  id="journal-date"
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <StockSearchField
                stockCode={stockCode}
                stockName={stockName}
                onSelect={(s) => {
                  setStockCode(s.code)
                  setStockName(s.name)
                }}
              />
              <div>
                <Label>매매 구분</Label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      side === 'buy'
                        ? 'bg-red-600 text-white'
                        : 'border border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    매수
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      side === 'sell'
                        ? 'bg-primary text-white'
                        : 'border border-red-200 bg-primary-subtle text-primary-darker'
                    }`}
                  >
                    매도
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="journal-reason">사유</Label>
                <Textarea
                  key={reasonResetKey}
                  id="journal-reason"
                  defaultValue={reasonDefault}
                  onChange={(e) => {
                    reasonRef.current = e.target.value
                  }}
                  className="mt-1 min-h-[100px]"
                  placeholder="매수·매도 근거, 시장 상황, 손절 계획 등"
                  required
                />
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              {stockCode ? (
                <>
                  <p className="mb-3 text-sm font-semibold text-slate-800">
                    {stockName}{' '}
                    <span className="text-xs font-normal text-slate-500">({stockCode})</span>
                  </p>
                  <JournalMaControls visibleMa={chart.visibleMa} toggleMa={chart.toggleMa} className="mb-3" />
                  <JournalStockChartView
                    chart={chart}
                    height={300}
                    previewMarker={previewMarker}
                  />
                  <JournalSrLinesControls chart={chart} compact />
                </>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-slate-500">
                  <LineChart className="mb-3 h-10 w-10 text-slate-300" />
                  <p>종목을 검색해 선택하면</p>
                  <p>캔들 차트가 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (isEdit ? '수정 중...' : '저장 중...') : isEdit ? '수정' : '저장 후 차트 보기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
