import axios from 'axios'
import { API_URL } from '@/lib/env'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname
      if (path.startsWith('/demo')) {
        return Promise.reject(error)
      }

      const requestUrl = String(error.config?.url ?? '')
      // 로그인/회원가입 실패는 폼에서 처리 — 페이지를 강제 이동하지 않음
      if (/\/auth\/(login|register)(?:\?|$)/.test(requestUrl) || requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/register')) {
        return Promise.reject(error)
      }

      useAuthStore.getState().logout()

      // 관리자 영역은 절대 일반 /login 으로 보내지 않음
      if (path.startsWith('/admin')) {
        if (path !== '/admin') {
          window.location.assign('/admin')
        }
        return Promise.reject(error)
      }

      if (path !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
