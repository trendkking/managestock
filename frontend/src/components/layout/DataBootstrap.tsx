import { useEffect, useState } from 'react'

import { USE_MOCK } from '@/lib/env'

import { useAuthStore } from '@/stores/authStore'

import { useDataStore } from '@/stores/dataStore'



export function DataBootstrap({ children }: { children: React.ReactNode }) {

  const token = useAuthStore((s) => s.token)

  const fetchMe = useAuthStore((s) => s.fetchMe)

  const hydrateFromApi = useDataStore((s) => s.hydrateFromApi)

  const reset = useDataStore((s) => s.reset)

  const [ready, setReady] = useState(USE_MOCK)

  const [error, setError] = useState<string | null>(null)



  useEffect(() => {

    if (USE_MOCK) {

      setReady(true)

      setError(null)

      return

    }



    if (!token) {

      reset()

      setReady(true)

      setError(null)

      return

    }



    let cancelled = false

    setReady(false)

    setError(null)

    ;(async () => {

      try {

        await fetchMe()

        await hydrateFromApi()

      } catch {

        if (!cancelled) setError('??????? ?????? ??????? ??? ????? ?????????.')

      }

      if (!cancelled) setReady(true)

    })()



    return () => {

      cancelled = true

    }

  }, [token, fetchMe, hydrateFromApi, reset])



  if (!ready) {

    return (

      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">

        ?????????? ??..

      </div>

    )

  }



  if (error) {

    return (

      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600">

        <p>{error}</p>

        <button

          type="button"

          className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"

          onClick={() => {

            setError(null)

            setReady(false)

            void hydrateFromApi().then(() => setReady(true)).catch(() => setError('??????? ?????? ???????'))

          }}

        >

          ??? ???

        </button>

      </div>

    )

  }



  return <>{children}</>

}

