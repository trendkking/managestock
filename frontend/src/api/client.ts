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
      if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
        return Promise.reject(error)
      }

      useAuthStore.getState().logout()
      if (path.startsWith('/admin')) {
        if (path !== '/admin') {
          window.location.href = '/admin'
        }
      } else if (path !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
