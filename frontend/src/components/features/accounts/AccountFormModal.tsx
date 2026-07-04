import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Input'
import { brokersApi } from '@/api'
import { getApiErrorMessage } from '@/lib/apiError'
import { USE_MOCK } from '@/lib/env'
import {
  brokerSupportsDomestic,
  brokerSupportsUs,
  getBrokerMarketNotice,
  getDefaultUsExchanges,
  getUsExchangeOptions,
} from '@/lib/brokerMarketUi'
import { BROKERS, type Account, type BrokerOption } from '@/types'
import { useDataStore } from '@/stores/dataStore'

type Tab = 'api' | 'manual'

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account?: Account
}) {
  const addAccount = useDataStore((s) => s.addAccount)
  const connectAccount = useDataStore((s) => s.connectAccount)
  const updateAccount = useDataStore((s) => s.updateAccount)

  const [tab, setTab] = useState<Tab>('api')
  const [brokers, setBrokers] = useState<BrokerOption[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [broker, setBroker] = useState<string>(BROKERS[0])
  const [initialCapital, setInitialCapital] = useState(10000000)
  const [brokerCode, setBrokerCode] = useState('kis')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountProductCode, setAccountProductCode] = useState('01')
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [syncDomestic, setSyncDomestic] = useState(true)
  const [syncUs, setSyncUs] = useState(false)
  const [usExchanges, setUsExchanges] = useState<string[]>(['NASD', 'NYSE'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || account) return
    if (USE_MOCK) {
      setBrokers([
        {
          code: 'kis',
          name: '한국투자증권',
          connectionMode: 'api',
          apiConnectAvailable: true,
          supportedMarkets: { domestic: true, us: ['NASD', 'NYSE', 'AMEX'] },
          fields: [],
        },
        {
          code: 'kiwoom',
          name: '키움증권',
          connectionMode: 'api',
          apiConnectAvailable: true,
          supportedMarkets: { domestic: true, us: [] },
          fields: [],
        },
        {
          code: 'ls',
          name: 'LS증권',
          connectionMode: 'api',
          apiConnectAvailable: false,
          supportedMarkets: { domestic: true, us: [] },
          fields: [],
        },
        {
          code: 'mirae',
          name: '미래에셋증권',
          connectionMode: 'api',
          apiConnectAvailable: false,
          supportedMarkets: { domestic: true, us: ['NASD', 'NYSE', 'AMEX'] },
          fields: [],
        },
      ])
      return
    }
    brokersApi
      .list()
      .then((res) => {
        setBrokers(res.items)
        if (res.items[0]) setBrokerCode(res.items[0].code)
      })
      .catch(() => setBrokers([]))
  }, [open, account])

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setDescription(account?.description ?? '')
    setBroker(account?.broker ?? BROKERS[0])
    setTab(account?.connectionMode === 'manual' ? 'manual' : 'api')
    setError('')
    setAppKey('')
    setAppSecret('')
    setSyncDomestic(true)
    setSyncUs(false)
    setUsExchanges([])
  }, [open, account])

  const toggleUsExchange = (code: string) => {
    setUsExchanges((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  const selectedBroker = brokers.find((b) => b.code === brokerCode)
  const supportsDomestic = brokerSupportsDomestic(selectedBroker)
  const supportsUs = brokerSupportsUs(selectedBroker)
  const usExchangeOptions = getUsExchangeOptions(selectedBroker)
  const supportedUsCodesKey = (selectedBroker?.supportedMarkets?.us ?? []).join(',')
  const marketNotice = getBrokerMarketNotice(selectedBroker)
  const apiConnectAvailable = selectedBroker?.apiConnectAvailable ?? true

  useEffect(() => {
    if (!open || account || tab !== 'api' || brokers.length === 0) return
    const selected = brokers.find((b) => b.code === brokerCode)
    if (selected?.apiConnectAvailable) return
    const firstAvailable = brokers.find((b) => b.apiConnectAvailable)
    if (firstAvailable) {
      setBrokerCode(firstAvailable.code)
    }
  }, [brokers, brokerCode, open, account, tab])

  useEffect(() => {
    if (!open || account || tab !== 'api') return
    const allowed: string[] = supportedUsCodesKey ? supportedUsCodesKey.split(',') : []
    if (!supportsUs) {
      setSyncUs(false)
      setUsExchanges([])
    } else {
      setUsExchanges((prev) => {
        if (syncUs) {
          return allowed.length > 0 ? [...allowed] : []
        }
        return prev.filter((code) => allowed.includes(code))
      })
    }
    if (!supportsDomestic) {
      setSyncDomestic(false)
    } else if (!supportsUs) {
      setSyncDomestic(true)
    }
  }, [brokerCode, supportedUsCodesKey, supportsUs, supportsDomestic, syncUs, open, account, tab])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      if (account) {
        await updateAccount(account.id, { name, broker, description })
      } else if (tab === 'api') {
        const acctDigits = accountNumber.replace(/\D/g, '')
        const isKiwoom = brokerCode === 'kiwoom'
        if (isKiwoom) {
          if (acctDigits.length < 8 || acctDigits.length > 10) {
            setError('키움 계좌번호는 8~10자리 숫자를 입력해주세요.')
            return
          }
        } else if (acctDigits.length !== 8 && acctDigits.length !== 10) {
          setError('계좌번호 8자리(종합) 또는 10자리(종합+상품코드)를 입력해주세요.')
          return
        }
        if (!appKey.trim() || !appSecret.trim()) {
          setError('APP KEY와 APP SECRET을 입력해주세요.')
          return
        }
        if (!apiConnectAvailable) {
          setError(`${selectedBroker?.name ?? '해당 증권사'} API 연동은 아직 준비 중입니다.`)
          return
        }
        if (!syncDomestic && !syncUs) {
          setError('국내 주식 또는 미국 주식 중 최소 하나를 선택해주세요.')
          return
        }
        if (syncUs && !supportsUs) {
          setError('선택한 증권사는 미국 주식 Open API를 제공하지 않습니다.')
          return
        }
        if (syncUs && usExchanges.length === 0) {
          setError('미국 주식을 선택했다면 거래소를 1개 이상 선택해주세요.')
          return
        }
        await connectAccount({
          name: name.trim(),
          brokerCode,
          accountNumber: accountNumber.trim(),
          accountProductCode: accountProductCode.trim() || '01',
          appKey: appKey.trim(),
          appSecret: appSecret.trim(),
          description: description || undefined,
          syncDomestic,
          syncUs: syncUs ? usExchanges : [],
        })
        setAppKey('')
        setAppSecret('')
      } else {
        await addAccount({ name, broker, initialCapital, description })
      }
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, '계좌 저장에 실패했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{account ? '계좌 수정' : '계좌 추가'}</h2>

        {!account && (
          <div className="mb-4 flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === 'api' ? 'bg-primary text-white' : 'text-slate-600'}`}
              onClick={() => setTab('api')}
            >
              API 연동
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === 'manual' ? 'bg-primary text-white' : 'text-slate-600'}`}
              onClick={() => setTab('manual')}
            >
              수동 입력
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>계좌명</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
          </div>

          {!account && tab === 'api' && (
            <>
              <div>
                <Label>증권사</Label>
                <Select value={brokerCode} onChange={(e) => setBrokerCode(e.target.value)} className="mt-1">
                  {brokers.map((b) => (
                    <option key={b.code} value={b.code} disabled={b.apiConnectAvailable === false}>
                      {b.name}
                      {b.apiConnectAvailable === false ? ' (API 준비 중)' : brokerSupportsUs(b) ? ' · 국내·미국' : ' · 국내'}
                    </option>
                  ))}
                  {brokers.length === 0 && <option value="kis">한국투자증권 · 국내·미국</option>}
                </Select>
                {marketNotice && (
                  <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{marketNotice}</p>
                )}
                {!apiConnectAvailable && (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <strong>{selectedBroker?.name ?? '선택한 증권사'}</strong>는 아직 API 연동을 지원하지 않습니다.
                    <strong>한국투자증권</strong> 또는 <strong>키움증권</strong>을 선택해 주세요.
                  </p>
                )}
              </div>
              <div>
                <Label>계좌번호</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="mt-1 font-mono"
                  placeholder="1234567801"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  {brokerCode === 'kiwoom'
                    ? '키움 종합계좌 번호(8~10자리)를 입력해주세요.'
                    : '종합계좌 8자리만 입력하거나, 뒤 상품코드 2자리까지 10자리로 입력할 수 있습니다.'}
                </p>
              </div>
              {brokerCode !== 'kiwoom' && (
              <div>
                <Label>계좌상품코드</Label>
                <Input
                  value={accountProductCode}
                  onChange={(e) => setAccountProductCode(e.target.value.slice(0, 2))}
                  className="mt-1 font-mono"
                  placeholder="01"
                />
                <p className="mt-1 text-xs text-slate-500">한국투자증권 계좌상품코드 (일반적으로 01)</p>
              </div>
              )}
              <div className="rounded-lg border border-slate-200 p-3">
                <Label>포함할 시장</Label>
                <div className="mt-2 space-y-2">
                  <label className={`flex items-center gap-2 text-sm ${!supportsDomestic ? 'text-slate-400' : ''}`}>
                    <input
                      type="checkbox"
                      checked={syncDomestic}
                      disabled={!supportsDomestic}
                      onChange={(e) => setSyncDomestic(e.target.checked)}
                      className="rounded border-slate-300 disabled:opacity-50"
                    />
                    국내 주식
                  </label>
                  <div>
                    <label
                      className={`flex items-center gap-2 text-sm ${!supportsUs ? 'text-slate-400' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={syncUs}
                        disabled={!supportsUs}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSyncUs(checked)
                          if (checked) {
                            setUsExchanges(getDefaultUsExchanges(selectedBroker))
                          }
                        }}
                        className="rounded border-slate-300 disabled:opacity-50"
                      />
                      미국 주식
                    </label>
                    {!supportsUs && (
                      <p className="ml-6 mt-1 text-xs text-slate-500">
                        이 증권사는 미국 주식 Open API를 제공하지 않아 선택할 수 없습니다.
                      </p>
                    )}
                  </div>
                  {syncUs && supportsUs && (
                    <div className="ml-6 space-y-1.5 border-l border-slate-200 pl-3">
                      {usExchangeOptions.map((ex) => (
                        <label key={ex.code} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={usExchanges.includes(ex.code)}
                            onChange={() => toggleUsExchange(ex.code)}
                            className="rounded border-slate-300"
                          />
                          {ex.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  한 계좌에 국내·미국 주식이 함께 있어도 한 번만 연동합니다. 선택한 시장만 동기화합니다.
                </p>
              </div>
              <div>
                <Label>APP KEY</Label>
                <Input
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  className="mt-1 font-mono text-sm"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <Label>APP SECRET</Label>
                <Input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="mt-1 font-mono text-sm"
                  autoComplete="new-password"
                  required
                />
              </div>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                KEY/SECRET은 서버에 암호화되어 저장되며, 브라우저·Git에는 저장되지 않습니다.
                {selectedBroker ? ` (${selectedBroker.name} Open API)` : ''}
              </p>
            </>
          )}

          {(!account && tab === 'manual') || account ? (
            <>
              {(!account || account.connectionMode === 'manual') && (
                <>
                  <div>
                    <Label>증권사</Label>
                    <Select value={broker} onChange={(e) => setBroker(e.target.value)} className="mt-1">
                      {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </Select>
                  </div>
                  {!account && (
                    <div>
                      <Label>초기자본</Label>
                      <Input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(Number(e.target.value))}
                        className="mt-1"
                        min={0}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}

          <div>
            <Label>설명</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!account && tab === 'api' && !apiConnectAvailable && (
            <p className="text-sm text-amber-800">
              연동 후 추가 버튼은 <strong>한국투자증권</strong> 또는 <strong>키움증권</strong>을 선택했을 때만 사용할 수 있습니다.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading || (tab === 'api' && !account && !apiConnectAvailable)}>
              {loading ? '처리 중...' : account ? '수정' : tab === 'api' ? '연동 후 추가' : '추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
