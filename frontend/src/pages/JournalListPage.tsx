import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { JournalEntryFormDialog } from '@/components/features/journal/JournalEntryFormDialog'
import { JournalEntriesList } from '@/components/features/journal/JournalEntriesList'
import { JournalRuleMemoPanel } from '@/components/features/journal/JournalRuleMemoPanel'
import { PageHeader, EmptyState } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'
import type { JournalEntry } from '@/types'

export default function JournalListPage() {
  const navigate = useNavigate()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const deleteJournalEntry = useDataStore((s) => s.deleteJournalEntry)

  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const openCreate = () => {
    setEditEntry(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: JournalEntry) => {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  const openChart = (entry: JournalEntry) => {
    navigate(`/journal/chart/${encodeURIComponent(entry.stockCode)}?entry=${entry.id}`)
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="매매일지"
        description="날짜·종목·사유를 기록하고, 종목을 클릭하면 차트에서 확인합니다"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> 기록 추가
          </Button>
        }
      />

      <JournalRuleMemoPanel className="mb-6" />

      <div className="relative mb-4 max-w-md">
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
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> 기록 추가
            </Button>
          }
        />
      ) : (
        <JournalEntriesList
          entries={filtered}
          onEntryClick={openChart}
          onChart={openChart}
          onEdit={openEdit}
          onDelete={(entry) =>
            setDeleteTarget({
              id: entry.id,
              label: `${entry.journalDate} · ${entry.stockName}`,
            })
          }
        />
      )}

      <JournalEntryFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditEntry(null)
        }}
        entry={editEntry}
        onSaved={(entry) => {
          if (editEntry) return
          navigate(`/journal/chart/${encodeURIComponent(entry.stockCode)}?entry=${entry.id}`)
        }}
      />

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
