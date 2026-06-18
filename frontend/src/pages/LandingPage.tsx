import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, LogOut, Trophy, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useAuthStore, useCurrentUser, useIsAuthenticated } from '@/stores/authStore'

export default function LandingPage() {
  const navigate = useNavigate()
  const isAuth = useIsAuthenticated()
  const user = useCurrentUser()
  const loginDemo = useAuthStore((s) => s.loginDemo)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">MANAGESTOCK</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuth ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user?.nickname}님, 환영합니다
              </span>
              <Link to="/accounts"><Button>계좌 관리</Button></Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="로그아웃"
                onClick={() => { logout(); navigate('/') }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost">로그인</Button></Link>
              <Link to="/register"><Button>회원가입</Button></Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          주식 계좌 관리 · 매매일지 ·<br />
          <span className="text-blue-600">수익률 경연 대회</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          {isAuth
            ? `${user?.nickname}님, MANAGESTOCK에 로그인되었습니다. 아래 메뉴에서 원하는 기능을 선택하세요.`
            : '투자 기록을 체계적으로 관리하고, 매매일지로 복기하며, 다른 투자자와 수익률을 겨루세요.'}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isAuth ? (
            <>
              <Link to="/accounts"><Button size="lg">계좌 관리로 이동 <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/journal"><Button size="lg" variant="outline">매매일지</Button></Link>
              <Link to="/competitions"><Button size="lg" variant="outline">경연 대회</Button></Link>
            </>
          ) : (
            <>
              <Link to="/register"><Button size="lg">무료로 시작하기 <ArrowRight className="h-4 w-4" /></Button></Link>
              <Button
                size="lg"
                variant="outline"
                onClick={async () => { await loginDemo(); navigate('/accounts') }}
              >
                데모로 둘러보기
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          { icon: Wallet, title: '계좌 관리', desc: '여러 증권 계좌를 한곳에서 관리하고 수익률을 추적합니다.', to: '/accounts' },
          { icon: BookOpen, title: '매매일지', desc: '매매 근거와 반성을 기록해 투자 실력을 키웁니다.', to: '/journal' },
          { icon: Trophy, title: '경연 대회', desc: '평가금액(보유손익+매매손익)으로 순위를 겨룹니다.', to: '/competitions' },
        ].map(({ icon: Icon, title, desc, to }) => (
          <Link key={title} to={isAuth ? to : '/login'}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
