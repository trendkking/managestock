import type { User } from '@/types'

export interface TestAccount {
  email: string
  password: string
  user: User
}

/** 데모·테스트용 일반 계정 (Mock) */
export const TEST_ACCOUNT: TestAccount = {
  email: 'test@gmail.com',
  password: '123',
  user: {
    id: 1,
    nickname: '테스트유저',
    email: 'test@gmail.com',
    role: 'user',
    showNicknamePublic: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
}

/** 관리자 계정 (Mock · API 로그인 ID: admin) */
export const ADMIN_ACCOUNT: TestAccount = {
  email: 'admin',
  password: 'Wnlrdlsp38~',
  user: {
    id: 0,
    nickname: 'admin',
    email: 'admin@bullslong.local',
    role: 'admin',
    showNicknamePublic: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
}

export function findTestAccount(email: string, password: string): User | null {
  const normalized = email.trim().toLowerCase()
  if (normalized === TEST_ACCOUNT.email && password === TEST_ACCOUNT.password) {
    return TEST_ACCOUNT.user
  }
  if (
    (normalized === 'admin' || normalized === ADMIN_ACCOUNT.user.email) &&
    password === ADMIN_ACCOUNT.password
  ) {
    return ADMIN_ACCOUNT.user
  }
  return null
}
