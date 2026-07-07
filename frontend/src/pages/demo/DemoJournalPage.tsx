import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart } from 'lucide-react'
import { JournalRuleMemoPanel } from '@/components/features/journal/JournalRuleMemoPanel'
import { PageHeader } from '@/components/ui/Common'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import { useDemoStore } from '@/stores/demoStore'
import { truncate } from '@/utils'
import { Badge } from '@/components/ui/Badge'

export default function DemoJournalPage() {
  const navigate = useNavigate()
  const journalEntries = useDemoStore((s) => s.journalEntries)

  const sorted = useMemo(
    () => [...journalEntries].sort((a, b) => b.journalDate.localeCompare(a.journalDate)),
    [journalEntries],
  )

  const openChart = (stockCode: string, entryId?: number) => {
    const path = `/demo/journal/chart/${encodeURIComponent(stockCode)}`
    navigate(entryId ? `${path}?entry=${entryId}` : path)
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="매매일지"
        description="체험용 샘플 기록입니다. 차트에서 매수·매도 마커를 확인해 보세요."
      />

      <JournalRuleMemoPanel className="mb-6" localOnly storageKey="bullslong:demo-rule-memo" />

      <DataTable>
        <thead>
          <tr className="bg-slate-50">
            <Th>날짜</Th>
            <Th className="w-20">구분</Th>
            <Th>종목</Th>
            <Th className="hidden sm:table-cell">사유</Th>
            <Th className="w-28 text-center">차트</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
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
              <Td className="hidden max-w-md text-slate-600 sm:table-cell">{truncate(entry.reason, 80)}</Td>
                <Td className="text-center">
                  <button
                    type="button"
                    className="inline-flex rounded-md border border-slate-200 p-2 hover:bg-slate-50"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      openChart(entry.stockCode, entry.id)
                    }}
                  >
                    <LineChart className="h-4 w-4" />
                  </button>
                </Td>
              </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
