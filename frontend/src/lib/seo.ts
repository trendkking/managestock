export const SITE_URL = 'https://bullslong.com'
export const SITE_NAME = 'BULLSLONG'
export const SITE_NAME_KO = '불스롱'

export const DEFAULT_KEYWORDS =
  '주식, 주식계좌, 매매일지, 공유, 불스롱, BULLSLONG, 주식 투자, 수익률, 경연대회'

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export const DEFAULT_DESCRIPTION =
  'BULLSLONG(불스롱)은 주식 계좌 관리와 매매일지 공유를 한곳에서 할 수 있는 서비스입니다.'

export interface SeoMeta {
  title: string
  description: string
  keywords?: string
  noindex?: boolean
  canonicalPath?: string
}

export interface SitemapEntry {
  path: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

/** 검색엔진에 노출할 공개 페이지 */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/demo', changefreq: 'weekly', priority: 0.9 },
  { path: '/register', changefreq: 'monthly', priority: 0.8 },
  { path: '/login', changefreq: 'monthly', priority: 0.5 },
]

export function buildCanonical(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/') return `${SITE_URL}/`
  return `${SITE_URL}${normalized}`
}

export function resolveSeoMeta(pathname: string): SeoMeta {
  switch (pathname) {
    case '/':
      return {
        title: `${SITE_NAME} | ${SITE_NAME_KO}`,
        description:
          '주식 계좌 관리, 매매일지 작성·공유, 수익률 경연 대회. BULLSLONG(불스롱)으로 투자 기록을 체계적으로 관리하세요.',
        keywords: DEFAULT_KEYWORDS,
      }
    case '/login':
      return {
        title: `로그인 | ${SITE_NAME}`,
        description: 'BULLSLONG 로그인. 주식계좌와 매매일지를 관리하고 투자 기록을 공유하세요.',
        keywords: '주식, 주식계좌, 매매일지, 로그인',
        canonicalPath: '/login',
      }
    case '/register':
      return {
        title: `회원가입 | ${SITE_NAME}`,
        description:
          'BULLSLONG 무료 회원가입. 주식 계좌 관리와 매매일지 공유 서비스를 시작하세요.',
        keywords: '주식, 주식계좌, 매매일지, 회원가입',
        canonicalPath: '/register',
      }
    case '/demo':
      return {
        title: `기능 체험 | ${SITE_NAME}`,
        description:
          '로그인 없이 BULLSLONG 계좌 관리, 매매일지, 경연 대회를 샘플 데이터로 체험해 보세요.',
        keywords: '주식, 매매일지, 계좌관리, 체험, 데모',
        canonicalPath: '/demo',
      }
    case '/accounts':
      return {
        title: `계좌 관리 | ${SITE_NAME}`,
        description: '내 주식 계좌 목록과 수익률을 확인합니다.',
        noindex: true,
      }
    case '/journal':
      return {
        title: `매매일지 | ${SITE_NAME}`,
        description: '매매일지 목록과 투자 기록을 확인합니다.',
        keywords: '매매일지, 주식, 투자일지',
        noindex: true,
      }
    case '/competitions':
      return {
        title: `경연 대회 | ${SITE_NAME}`,
        description: '수익률 경연 대회 목록과 참가 현황을 확인합니다.',
        noindex: true,
      }
    case '/profile':
      return {
        title: `프로필 | ${SITE_NAME}`,
        description: '내 프로필 설정',
        noindex: true,
      }
    case '/admin':
      return {
        title: `관리자 로그인 | ${SITE_NAME}`,
        description: 'BULLSLONG 관리 시스템',
        noindex: true,
      }
    case '/admin/dashboard':
      return {
        title: `관리자 대시보드 | ${SITE_NAME}`,
        description: '관리자 통계',
        noindex: true,
      }
    case '/admin/users':
      return {
        title: `회원 관리 | ${SITE_NAME}`,
        description: '관리자 회원 관리',
        noindex: true,
      }
    case '/admin/journals':
      return {
        title: `게시물 관리 | ${SITE_NAME}`,
        description: '관리자 매매일지 관리',
        noindex: true,
      }
    case '/admin/competitions':
      return {
        title: `대회 관리 | ${SITE_NAME}`,
        description: '관리자 경연 대회 관리',
        noindex: true,
      }
    default:
      break
  }

  if (pathname.startsWith('/demo/')) {
    return {
      title: `기능 체험 | ${SITE_NAME}`,
      description: 'BULLSLONG 샘플 데이터로 주요 기능을 체험합니다.',
      canonicalPath: '/demo',
    }
  }
  if (pathname.startsWith('/accounts/')) {
    return {
      title: `계좌 상세 | ${SITE_NAME}`,
      description: '주식 계좌 상세 정보',
      noindex: true,
    }
  }
  if (pathname.startsWith('/journal/chart/')) {
    return {
      title: `종목 차트 | ${SITE_NAME}`,
      description: '매매일지 종목 차트',
      noindex: true,
    }
  }
  if (pathname.startsWith('/competitions/')) {
    return {
      title: `경연 대회 상세 | ${SITE_NAME}`,
      description: '경연 대회 리더보드',
      noindex: true,
    }
  }

  return {
    title: `${SITE_NAME} | ${SITE_NAME_KO}`,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    noindex: true,
  }
}
