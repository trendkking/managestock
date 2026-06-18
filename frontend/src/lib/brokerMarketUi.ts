import { US_STOCK_EXCHANGES, type BrokerOption } from '@/types'

export function getBrokerMarketNotice(broker: BrokerOption | undefined): string {
  if (!broker) return ''
  const domestic = broker.supportedMarkets?.domestic ?? true
  const usCodes = broker.supportedMarkets?.us ?? []
  if (domestic && usCodes.length > 0) {
    return '이 증권사는 국내·미국 주식 API를 모두 지원합니다.'
  }
  if (domestic && usCodes.length === 0) {
    return '이 증권사 API는 국내 주식만 동기화됩니다. 미국 주식 Open API는 제공하지 않습니다.'
  }
  if (!domestic && usCodes.length > 0) {
    return '이 증권사는 미국 주식 API만 지원합니다.'
  }
  return '이 증권사에서 선택 가능한 시장이 없습니다.'
}

export function brokerSupportsUs(broker: BrokerOption | undefined): boolean {
  return (broker?.supportedMarkets?.us?.length ?? 0) > 0
}

export function brokerSupportsDomestic(broker: BrokerOption | undefined): boolean {
  return broker?.supportedMarkets?.domestic ?? true
}

export function getUsExchangeOptions(broker: BrokerOption | undefined) {
  const allowed = new Set(broker?.supportedMarkets?.us ?? [])
  return US_STOCK_EXCHANGES.filter((ex) => allowed.has(ex.code))
}

/** 미국 주식 선택 시 기본으로 켤 거래소 (증권사가 지원하는 전체) */
export function getDefaultUsExchanges(broker: BrokerOption | undefined): string[] {
  return [...(broker?.supportedMarkets?.us ?? [])]
}
