import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDataStore } from '@/stores/dataStore'

export function TradeFormModal({
  open,
  onOpenChange,
  accountId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accountId: number
}) {
  const addTrade = useDataStore((s) => s.addTrade)
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [fee, setFee] = useState(0)
  const [tax, setTax] = useState(0)
  const [tradedAt, setTradedAt] = useState(new Date().toISOString().slice(0, 16))
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockCode || !stockName || quantity <= 0 || price <= 0) return
    setError('')
    try {
      await addTrade(accountId, {
        stockCode,
        stockName,
        tradeType,
        quantity,
        price,
        fee,
        tax,
        tradedAt: new Date(tradedAt).toISOString(),
        memo: memo || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, '매매 등록에 실패했습니다.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">매매 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>종목코드</Label>
              <Input value={stockCode} onChange={(e) => setStockCode(e.target.value)} maxLength={6} className="mt-1" required />
            </div>
            <div>
              <Label>종목명</Label>
              <Input value={stockName} onChange={(e) => setStockName(e.target.value)} className="mt-1" required />
            </div>
          </div>
          <div>
            <Label>유형</Label>
            <Select value={tradeType} onChange={(e) => setTradeType(e.target.value as 'buy' | 'sell')} className="mt-1">
              <option value="buy">매수</option>
              <option value="sell">매도</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>수량</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} className="mt-1" required />
            </div>
            <div>
              <Label>단가</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} min={1} className="mt-1" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>수수료</Label>
              <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} min={0} className="mt-1" />
            </div>
            <div>
              <Label>세금</Label>
              <Input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} min={0} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>매매일시</Label>
            <Input type="datetime-local" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>메모</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1" rows={2} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit">등록</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function HoldingFormModal({
  open,
  onOpenChange,
  accountId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accountId: number
}) {
  const upsertHolding = useDataStore((s) => s.upsertHolding)
  const [error, setError] = useState('')
  const [stockCode, setStockCode] = useState('')
  const [stockName, setStockName] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [avgPrice, setAvgPrice] = useState(0)
  const [currentPrice, setCurrentPrice] = useState(0)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await upsertHolding(accountId, { stockCode, stockName, quantity, avgPrice, currentPrice })
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, '보유종목 저장에 실패했습니다.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">종목 추가/수정</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>종목코드</Label>
              <Input value={stockCode} onChange={(e) => setStockCode(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label>종목명</Label>
              <Input value={stockName} onChange={(e) => setStockName(e.target.value)} className="mt-1" required />
            </div>
          </div>
          <div>
            <Label>수량</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>평균단가</Label>
              <Input type="number" value={avgPrice} onChange={(e) => setAvgPrice(Number(e.target.value))} className="mt-1" required />
            </div>
            <div>
              <Label>현재가</Label>
              <Input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(Number(e.target.value))} className="mt-1" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
