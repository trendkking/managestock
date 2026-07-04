import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback = '요청에 실패했습니다.'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail)) {
      return detail.map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item))).join(', ')
    }
    if (error.response?.status === 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  if (error instanceof Error && error.message && !error.message.startsWith('Request failed with status code')) {
    return error.message
  }
  return fallback
}
