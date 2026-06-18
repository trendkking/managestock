import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/api'
import { findTestAccount, TEST_ACCOUNT } from '@/config/testAccounts'
import { getApiErrorMessage } from '@/lib/apiError'
import { USE_MOCK } from '@/lib/env'
import { useDataStore } from '@/stores/dataStore'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginDemo: () => Promise<void>
  loginTest: () => Promise<void>
  register: (nickname: string, email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: Partial<Pick<User, 'nickname' | 'showNicknamePublic'>>) => Promise<void>
  deleteAccount: () => Promise<void>
}

const demoUser: User = {
  id: 1,
  nickname: '트레이더김',
  email: 'demo@managestock.local',
  role: 'admin',
  showNicknamePublic: true,
  createdAt: '2026-01-15T00:00:00Z',
}

function clearSession() {
  useDataStore.getState().reset()
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        if (USE_MOCK) {
          const testUser = findTestAccount(email, password)
          if (testUser) {
            set({ user: testUser, token: 'mock-jwt-token-test' })
            return true
          }
          if (!email || password.length < 8) return false
          set({ user: { ...demoUser, email }, token: 'mock-jwt-token' })
          return true
        }
        try {
          clearSession()
          const { accessToken } = await authApi.login({ email, password })
          set({ token: accessToken })
          const user = await authApi.me()
          set({ user })
          return true
        } catch {
          set({ user: null, token: null })
          return false
        }
      },

      loginDemo: async () => {
        if (USE_MOCK) {
          set({ user: demoUser, token: 'mock-jwt-token' })
          return
        }
        await get().loginTest()
      },

      loginTest: async () => {
        if (USE_MOCK) {
          set({ user: TEST_ACCOUNT.user, token: 'mock-jwt-token-test' })
          return
        }
        await get().login(TEST_ACCOUNT.email, TEST_ACCOUNT.password)
      },

      register: async (nickname, email, password) => {
        if (USE_MOCK) {
          if (nickname.length < 2 || !email || password.length < 8) {
            return { ok: false, message: '입력값을 확인해주세요.' }
          }
          set({ user: { ...demoUser, nickname, email, role: 'user' }, token: 'mock-jwt-token' })
          return { ok: true }
        }
        try {
          clearSession()
          const user = await authApi.register({ nickname, email, password })
          const { accessToken } = await authApi.login({ email, password })
          set({ user, token: accessToken })
          return { ok: true }
        } catch (error) {
          return { ok: false, message: getApiErrorMessage(error, '회원가입에 실패했습니다.') }
        }
      },

      logout: () => {
        set({ user: null, token: null })
        clearSession()
      },

      fetchMe: async () => {
        if (USE_MOCK || !get().token) return
        try {
          const user = await authApi.me()
          set({ user })
        } catch {
          set({ user: null, token: null })
          clearSession()
        }
      },

      updateProfile: async (data) => {
        if (USE_MOCK) {
          const user = get().user
          if (!user) return
          set({ user: { ...user, ...data } })
          return
        }
        const user = await authApi.updateMe(data)
        set({ user })
      },

      deleteAccount: async () => {
        if (!USE_MOCK) {
          await authApi.deleteMe()
        }
        set({ user: null, token: null })
        clearSession()
      },
    }),
    { name: 'managestock-auth' },
  ),
)

export const useIsAuthenticated = () => useAuthStore((s) => !!s.token)
export const useCurrentUser = () => useAuthStore((s) => s.user)
