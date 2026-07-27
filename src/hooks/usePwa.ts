import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!prompt) return false
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setPrompt(null)
    return choice.outcome === 'accepted'
  }
  return { canInstall: Boolean(prompt), installed, install }
}

export function useServiceWorkerUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined
    const checkForUpdate = () => registration?.update().catch(() => undefined)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
      onRegisteredSW: (_url, nextRegistration) => {
        registration = nextRegistration
      }
    })
    const intervalId = window.setInterval(checkForUpdate, 30 * 60 * 1000)
    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', checkWhenVisible)
    setUpdateSW(() => update)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkForUpdate)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [])

  return {
    needRefresh,
    offlineReady,
    dismissRefresh: () => setNeedRefresh(false),
    dismissOffline: () => setOfflineReady(false),
    update: () => updateSW?.(true)
  }
}
