import { LineChart, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, Td, Th } from '@/components/ui/StatCard'
import type { JournalEntry } from '@/types'
import { cn, truncate } from '@/utils'

type JournalEntriesListProps = {
  entries: JournalEntry[]
  onEntryClick: (entry: JournalEntry) => void
  selectedId?: number | null
  /** 목록 페이지 vs 차트 페이지 하단 기록 */
  variant?: 'list' | 'chart'
  onEdit?: (entry: JournalEntry) => void
  onDelete?: (entry: JournalEntry) => void
  onChart?: (entry: JournalEntry) => void
  className?: string
}

function EntryCard({
  entry,
  selected,
  variant,
  onEntryClick,
  onEdit,
  onDelete,
  onChart,
}: {
  entry: JournalEntry
  selected: boolean
  variant: 'list' | 'chart'
  onEntryClick: (entry: JournalEntry) => void
  onEdit?: (entry: JournalEntry) => void
  onDelete?: (entry: JournalEntry) => void
  onChart?: (entry: JournalEntry) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEntryClick(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEntryClick(entry)
        }
      }}
      className={cn(
        'rounded-xl border bg-white p-4 text-left shadow-sm transition-colors',
        selected ? 'border-primary/40 bg-primary-subtle/50' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tabular-nums text-slate-900">{entry.journalDate}</span>
            <Badge variant={entry.side === 'buy' ? 'success' : 'danger'}>
              {entry.side === 'buy' ? '매수' : '매도'}
            </Badge>
          </div>
          {variant === 'list' && (
            <p className="mt-2 truncate font-medium text-slate-900">{entry.stockName}</p>
          )}
          {variant === 'list' && (
            <p className="truncate text-xs text-slate-500">{entry.stockCode}</p>
          )}
          {(variant === 'chart' || variant === 'list') && (
            <p className={cn('mt-2 text-sm leading-relaxed text-slate-600', variant === 'list' ? 'line-clamp-2' : '')}>
              {entry.reason}
            </p>
          )}
        </div>
        {variant === 'list' && (onChart || onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
            {onChart && (
              <Button type="button" size="icon" variant="outline" onClick={() => onChart(entry)} aria-label="차트 보기">
                <LineChart className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button type="button" size="icon" variant="ghost" onClick={() => onEdit(entry)} aria-label="수정">
                <Pencil className="h-4 w-4 text-slate-500" />
              </Button>
            )}
            {onDelete && (
              <Button type="button" size="icon" variant="ghost" onClick={() => onDelete(entry)} aria-label="삭제">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function JournalEntriesList({
  entries,
  onEntryClick,
  selectedId = null,
  variant = 'list',
  onEdit,
  onDelete,
  onChart,
  className,
}: JournalEntriesListProps) {
  if (entries.length === 0) return null

  return (
    <div className={cn('min-w-0', className)}>
      <div className="space-y-3 md:hidden">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            selected={entry.id === selectedId}
            variant={variant}
            onEntryClick={onEntryClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onChart={onChart}
          />
        ))}
      </div>

      <div className="hidden md:block">
        {variant === 'list' ? (
          <DataTable>
            <thead>
              <tr className="bg-slate-50">
                <Th>날짜</Th>
                <Th className="w-20">구분</Th>
                <Th>종목</Th>
                <Th>사유</Th>
                <Th className="w-28 text-center">차트</Th>
                {(onEdit || onDelete) && <Th className="w-24">&nbsp;</Th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'cursor-pointer hover:bg-primary-subtle/50',
                    entry.id === selectedId && 'bg-primary-subtle',
                  )}
                  onClick={() => onEntryClick(entry)}
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
                    {onChart && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onChart(entry)
                        }}
                      >
                        <LineChart className="h-4 w-4" />
                      </Button>
                    )}
                  </Td>
                  {(onEdit || onDelete) && (
                    <Td>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => onEdit(entry)}>
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => onDelete(entry)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <DataTable>
            <thead>
              <tr className="bg-slate-50">
                <Th>날짜</Th>
                <Th className="w-20">구분</Th>
                <Th>사유</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'cursor-pointer hover:bg-slate-50',
                    entry.id === selectedId && 'bg-primary-subtle',
                  )}
                  onClick={() => onEntryClick(entry)}
                >
                  <Td className="whitespace-nowrap tabular-nums">{entry.journalDate}</Td>
                  <Td>
                    <Badge variant={entry.side === 'buy' ? 'success' : 'danger'}>
                      {entry.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                  </Td>
                  <Td className="text-slate-700">{truncate(entry.reason, 120)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  )
}
