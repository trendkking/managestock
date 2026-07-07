import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { JournalEntriesList } from '@/components/features/journal/JournalEntriesList'
import { JournalRuleMemoPanel } from '@/components/features/journal/JournalRuleMemoPanel'
import { PageHeader } from '@/components/ui/Common'
import { useDemoStore } from '@/stores/demoStore'

export default function DemoJournalPage() {
  const navigate = useNavigate()
  const journalEntries = useDemoStore((s) => s.journalEntries)

  const sorted = useMemo(
    () => [...journalEntries].sort((a, b) => b.journalDate.localeCompare(a.journalDate)),
    [journalEntries],
  )

  const openChart = (entry: { stockCode: string; id: number }) => {
    navigate(`/demo/journal/chart/${encodeURIComponent(entry.stockCode)}?entry=${entry.id}`)
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="매매일지"
        description="체험용 샘플 기록입니다. 차트에서 매수·매도 마커를 확인해 보세요."
      />

      <JournalRuleMemoPanel className="mb-6" localOnly storageKey="bullslong:demo-rule-memo" />

      <JournalEntriesList
        entries={sorted}
        onEntryClick={openChart}
        onChart={openChart}
      />
    </div>
  )
}
