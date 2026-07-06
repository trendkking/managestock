import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, LogOut, Trophy, Wallet } from 'lucide-react'
import { Logo, LOGO_SRC } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useAuthStore, useCurrentUser, useIsAuthenticated } from '@/stores/authStore'

export default function LandingPage() {
  const navigate = useNavigate()
  const isAuth = useIsAuthenticated()
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-primary-subtle/30 to-white">
      <header className="border-b border-red-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="BULLSLONG 홈">
            <Logo size="md" clickable={false} />
          </Link>
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
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <div className="mx-auto mb-8 flex justify-center">
          <img src={LOGO_SRC} alt="BULLSLONG 황소" className="h-28 w-auto drop-shadow-lg md:h-36" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          주식 계좌 관리 · 매매일지 ·<br />
          <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            수익률 경연 대회
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          {isAuth
            ? `${user?.nickname}님, BULLSLONG에 로그인되었습니다. 아래 메뉴에서 원하는 기능을 선택하세요.`
            : '간단하게 API 등록만으로 계좌를 관리하고, 매매일지를 작성하며, 다른 투자자와 수익률을 겨루세요.'}
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
              <Link to="/demo">
                <Button size="lg" variant="outline">
                  체험하기
                </Button>
              </Link>
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
          <Link key={title} to={isAuth ? to : `/demo${to}`}>
            <Card className="h-full border-red-100 transition-all hover:border-red-200 hover:shadow-md hover:shadow-red-100/50">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <footer className="border-t border-red-100 bg-primary-darker py-6 text-center text-sm text-red-100">
        © {new Date().getFullYear()} BULLSLONG · bullslong.com
      </footer>
    </div>
  )
}
