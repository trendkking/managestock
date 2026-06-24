import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { marketApi } from '@/api'
import { Input, Label } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import type { StockSearchResult } from '@/types'
import { cn } from '@/utils'

type SelectedStock = { code: string; name: string; market?: string }

type StockSearchFieldProps = {
  stockCode: string
  stockName: string
  onSelect: (stock: SelectedStock) => void
  disabled?: boolean
}

export function StockSearchField({ stockCode, stockName, onSelect, disabled }: StockSearchFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (stockName && stockCode) {
      setQuery(`${stockName} (${stockCode})`)
    }
  }, [stockCode, stockName])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 1) {
      setResults([])
      return
    }
    setLoading(true)
    setSearchError('')
    try {
      const res = await marketApi.searchStocks(trimmed)
      setResults(res.items)
      setOpen(true)
    } catch (err) {
      setResults([])
      setSearchError(getApiErrorMessage(err, '종목 검색에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open && stockCode && query.includes(stockCode)) return
    const timer = window.setTimeout(() => {
      if (query.includes('(') && query.endsWith(')')) return
      void runSearch(query)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, runSearch, open, stockCode])

  const pick = (item: StockSearchResult) => {
    onSelect({ code: item.code, name: item.name, market: item.market })
    setQuery(`${item.name} (${item.code})`)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor="stock-search">종목 검색</Label>
      <p className="mb-1 text-xs text-slate-500">
        국내 주식·ETF와 미국 주식을 공개 시세 데이터로 검색합니다. 증권사 API와 무관합니다.
      </p>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
        <Input
          id="stock-search"
          value={query}
          disabled={disabled}
          placeholder="종목명·코드 (삼성전자, 122630, SOXL)"
          className="pl-10 pr-10"
          onChange={(e) => {
            setQuery(e.target.value)
            if (stockCode) onSelect({ code: '', name: '' })
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          autoComplete="off"
          required={!stockCode}
        />
      </div>

      {searchError && <p className="mt-1 text-xs text-red-600">{searchError}</p>}

      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {results.map((item) => (
            <li key={`${item.region ?? 'KR'}-${item.code}`}>
              <button
                type="button"
                role="option"
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-subtle',
                  stockCode === item.code && 'bg-primary-subtle',
                )}
                onClick={() => pick(item)}
              >
                <span className="font-medium text-slate-900">{item.name}</span>
                <span className="ml-2 shrink-0 text-xs text-slate-500">
                  {item.code} · {item.market}
                  {item.region === 'US' ? ' · USD' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.trim().length >= 1 && results.length === 0 && !searchError && (
        <p className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          검색 결과가 없습니다.
        </p>
      )}
    </div>
  )
}
