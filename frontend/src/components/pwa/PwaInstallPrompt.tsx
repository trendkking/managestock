import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'bullslong-pwa-install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return

    const onInstallable = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onInstallable)
    return () => window.removeEventListener('beforeinstallprompt', onInstallable)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setPrompt(null)
  }

  if (!visible || !prompt) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:p-0">
      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-xl shadow-red-100/50">
        <div className="flex items-start gap-3">
          <img src="/pwa-192x192.png" alt="" className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">앱으로 설치하기</p>
            <p className="mt-1 text-sm text-slate-500">
              BULLSLONG을 홈 화면에 추가하면 앱처럼 빠르게 이용할 수 있습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install}>
                <Download className="h-4 w-4" /> 설치
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                나중에
              </Button>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
