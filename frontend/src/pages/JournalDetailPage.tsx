import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { journalsApi } from '@/api'
import type { Trade } from '@/types'
import { USE_MOCK } from '@/lib/env'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDataStore } from '@/stores/dataStore'
import { EMOTIONS } from '@/types'

function renderMarkdown(content: string) {
  return content
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="mt-4 text-lg font-semibold">{line.slice(3)}</h2>
      if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-700">{line.slice(2)}</li>
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-slate-700">{line}</p>
    })
}

export default function JournalDetailPage() {
  const { id } = useParams()
  const journal = useDataStore((s) => s.journals.find((j) => j.id === Number(id)))
  const accounts = useDataStore((s) => s.accounts)
  const trades = useDataStore((s) => s.trades)
  const [linkedTrades, setLinkedTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!journal) return
    if (USE_MOCK) {
      setLinkedTrades(trades.filter((t) => journal.tradeIds.includes(t.id)))
      return
    }
    journalsApi
      .get(journal.id)
      .then((d) => setLinkedTrades(d.linkedTrades))
      .catch(() => setLinkedTrades([]))
  }, [journal, trades])

  if (!journal) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">일지를 찾을 수 없습니다.</p>
        <Link to="/journal"><Button className="mt-4" variant="outline">목록으로</Button></Link>
      </div>
    )
  }

  const account = accounts.find((a) => a.id === journal.accountId)

  return (
    <div>
      <Link to="/journal" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> 목록으로
      </Link>

      <PageHeader
        title={journal.title}
        description={`${journal.journalDate}${account ? ` · ${account.name}` : ''}`}
        action={
          <Link to={`/journal/${journal.id}/edit`}>
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> 수정</Button>
          </Link>
        }
      />

      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {journal.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          {journal.emotion && (
            <Badge variant="secondary">{EMOTIONS.find((e) => e.value === journal.emotion)?.label}</Badge>
          )}
        </div>

        <div className="prose prose-slate max-w-none">{renderMarkdown(journal.content)}</div>

        {journal.reflection && (
          <div className="mt-6 rounded-lg bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">반성·교훈</h3>
            <p className="mt-2 text-sm text-amber-800">{journal.reflection}</p>
          </div>
        )}

        {linkedTrades.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold">연결된 매매</h3>
            <ul className="mt-2 space-y-2">
              {linkedTrades.map((t) => (
                <li key={t.id} className="text-sm text-slate-600">
                  {t.stockName} · {t.tradeType === 'buy' ? '매수' : '매도'} {t.quantity}주 @ {t.price.toLocaleString()}원
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
