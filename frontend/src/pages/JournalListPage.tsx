import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Plus, Search, Trash2 } from 'lucide-react'
import { StockSearchField } from '@/components/features/journal/StockSearchField'
import {
  JournalMaControls,
  JournalSrLinesControls,
  JournalStockChartView,
} from '@/components/features/journal/JournalStockChartPanel'
import { useJournalStockChart } from '@/components/features/journal/useJournalStockChart'
import { PageHeader, EmptyState } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import type { JournalEntrySide } from '@/types'
import { truncate } from '@/utils'
import { Badge } from '@/components/ui/Badge'

export default function JournalListPage() {
  const navigate = useNavigate()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const addJournalEntry = useDataStore((s) => s.addJournalEntry)
  const deleteJournalEntry = useDataStore((s) => s.deleteJournalEntry)

  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [reason, setReason] = useState('')
  const [side, setSide] = useState<JournalEntrySide>('buy')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const chart = useJournalStockChart(stockCode)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return journalEntries
    return journalEntries.filter(
      (e) =>
        e.stockName.toLowerCase().includes(q) ||
        e.stockCode.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.journalDate.includes(q),
    )
  }, [journalEntries, query])

  const resetForm = () => {
    setJournalDate(new Date().toISOString().slice(0, 10))
    setStockCode('')
    setStockName('')
    setReason('')
    setSide('buy')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockCode.trim() || !stockName.trim() || !reason.trim()) {
      setError('날짜, 종목(검색 후 선택), 사유를 모두 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const entry = await addJournalEntry({
        journalDate,
        stockCode: stockCode.trim(),
        stockName: stockName.trim(),
        side,
        reason: reason.trim(),
      })
      setDialogOpen(false)
      resetForm()
      navigate(`/journal/chart/${encodeURIComponent(entry.stockCode)}?entry=${entry.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const openChart = (stockCodeValue: string, entryId?: number) => {
    const path = `/journal/chart/${encodeURIComponent(stockCodeValue)}`
    navigate(entryId ? `${path}?entry=${entryId}` : path)
  }

  return (
    <div>
      <PageHeader
        title="매매일지"
        description="날짜·종목·사유를 기록하고, 종목을 클릭하면 차트에서 확인합니다"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> 기록 추가
          </Button>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="종목, 사유, 날짜 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="매매일지가 없습니다"
          description="기록 추가로 첫 매매 근거를 남겨 보세요"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> 기록 추가
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <DataTable>
            <thead>
              <tr className="bg-slate-50">
                <Th>날짜</Th>
                <Th className="w-20">구분</Th>
                <Th>종목</Th>
                <Th>사유</Th>
                <Th className="w-28 text-center">차트</Th>
                <Th className="w-16">&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer hover:bg-primary-subtle/50"
                  onClick={() => openChart(entry.stockCode, entry.id)}
                >
                  <Td className="whitespace-nowrap tabular-nums">{entry.journalDate}</Td>
                  <Td>
                    <Badge variant={entry.side === 'buy' ? 'success' : 'danger'}>
                      {entry.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="font-medium text-slate-900">{entry.stockName}</span>
                    <span className="ml-2 text-xs text-slate-500">{entry.stockCode}</span>
                  </Td>
                  <Td className="max-w-md text-slate-600">{truncate(entry.reason, 80)}</Td>
                  <Td className="text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        openChart(entry.stockCode, entry.id)
                      }}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  </Td>
                  <Td>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setDeleteTarget({
                          id: entry.id,
                          label: `${entry.journalDate} · ${entry.stockName}`,
                        })
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent title="매매 기록 추가" className="max-h-[92vh] max-w-5xl overflow-y-auto">
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
                    id="journal-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
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
                    <JournalMaControls
                      visibleMa={chart.visibleMa}
                      toggleMa={chart.toggleMa}
                      className="mb-3"
                    />
                    <JournalStockChartView
                      chart={chart}
                      height={300}
                      previewMarker={{ date: journalDate, side, reason: reason.trim() || undefined }}
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '저장 중...' : '저장 후 차트 보기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget != null} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
        <DialogContent title="기록 삭제">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{deleteTarget?.label}</span>
            {' '}기록을 삭제하시겠습니까?
          </p>
          <p className="mt-2 text-xs text-slate-500">삭제하면 복구할 수 없습니다.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              아니오
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (!deleteTarget) return
                setDeleting(true)
                deleteJournalEntry(deleteTarget.id)
                  .then(() => setDeleteTarget(null))
                  .catch((err) => {
                    alert(getApiErrorMessage(err, '삭제에 실패했습니다.'))
                  })
                  .finally(() => setDeleting(false))
              }}
            >
              {deleting ? '삭제 중...' : '예'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
