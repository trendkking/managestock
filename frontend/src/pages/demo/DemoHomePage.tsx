import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Trophy, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/Common'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const features = [
  {
    to: '/demo/accounts',
    icon: Wallet,
    title: '계좌 관리',
    desc: '여러 증권 계좌 수익률·보유 종목을 한곳에서 확인합니다.',
  },
  {
    to: '/demo/journal',
    icon: BookOpen,
    title: '매매일지',
    desc: '차트에 매수·매도 근거를 남기고 나만의 원칙을 메모합니다.',
  },
  {
    to: '/demo/competitions',
    icon: Trophy,
    title: '경연 대회',
    desc: '평가금액 기준 순위로 다른 투자자와 수익률을 겨룹니다.',
  },
]

export default function DemoHomePage() {
  return (
    <div>
      <PageHeader
        title="BULLSLONG 체험하기"
        description="로그인 없이 샘플 데이터로 주요 기능을 둘러볼 수 있습니다. 저장·연동은 회원가입 후 이용하세요."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {features.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to}>
            <Card className="h-full border-red-100 transition-all hover:border-red-200 hover:shadow-md">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-muted">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
                <p className="mt-4 text-sm font-medium text-primary">둘러보기 →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-primary/20 bg-white p-6 text-center">
        <p className="text-slate-600">마음에 드셨나요? 가입 후 내 계좌를 연동해 보세요.</p>
        <Link to="/register" className="mt-4 inline-block">
          <Button size="lg">
            무료로 시작하기 <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
