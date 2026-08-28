import { useEffect, useState } from 'react'
import { USE_MOCK } from '@/lib/env'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'

export function DataBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const hydrateFromApi = useDataStore((s) => s.hydrateFromApi)
  const reset = useDataStore((s) => s.reset)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCK) {
      setError(null)
      return
    }

    if (!token) {
      reset()
      setError(null)
      return
    }

    let cancelled = false
    setError(null)

    ;(async () => {
      try {
        await fetchMe()
        await hydrateFromApi()
      } catch {
        if (!cancelled) {
          setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, fetchMe, hydrateFromApi, reset])

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600">
        <p>{error}</p>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
          onClick={() => {
            setError(null)
            void hydrateFromApi().catch(() =>
              setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
            )
          }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  return <>{children}</>
}
