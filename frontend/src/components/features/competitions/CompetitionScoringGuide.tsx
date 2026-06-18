export function CompetitionScoringGuide({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">평가금액 = 보유손익 + 매매손익</span>
        {' · '}
        시작일 보유종목은 첫날 시가 기준 · 순위는 평가금액 높은 순
      </p>
    )
  }

  return (
    <div className="space-y-3 text-sm text-slate-600">
      <p className="font-medium text-slate-800">평가금액 = 보유손익 + 매매손익</p>
      <ul className="space-y-3 pl-1">
        <li>
          <p className="font-medium text-slate-700">보유손익</p>
          <p className="mt-1">지금 계좌에 남아 있는 종목의 손익입니다.</p>
          <p className="mt-1 text-slate-500">
            대회 기간 이전부터 보유한 종목은 대회 첫날 시가를 0원 기준으로 두고, 현재가와의 차이로 계산합니다.
          </p>
        </li>
        <li>
          <p className="font-medium text-slate-700">매매손익</p>
          <p className="mt-1">대회 기간 동안 매도해서 확정된 손익입니다.</p>
        </li>
      </ul>
      <p>순위는 평가금액이 높은 순입니다. 대회 시작 시점의 평가금액은 0원입니다.</p>
    </div>
  )
}
