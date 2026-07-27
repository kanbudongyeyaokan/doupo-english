import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type AppRoute } from './components/BottomNav'
import { LoadingScreen } from './components/LoadingScreen'
import { StatusToast } from './components/StatusToast'
import { db, defaultSettings, initializeDatabase } from './db'
import { useInstallPrompt, useServiceWorkerUpdate } from './hooks/usePwa'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { MistakesPage } from './pages/MistakesPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReviewPage } from './pages/ReviewPage'
import { exportBackup } from './utils/backup'

function getRoute(): AppRoute {
  const route = window.location.hash.replace(/^#\//, '').split('?')[0]
  return ['home', 'review', 'library', 'mistakes', 'profile'].includes(route) ? route as AppRoute : 'home'
}

function App() {
  const [ready, setReady] = useState(false)
  const [route, setRoute] = useState<AppRoute>(getRoute)
  const [routeKey, setRouteKey] = useState(window.location.hash)
  const [error, setError] = useState('')
  const settings = useLiveQuery(() => ready ? db.settings.get('app') : undefined, [ready]) || defaultSettings
  const install = useInstallPrompt()
  const serviceWorker = useServiceWorkerUpdate()

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/home')
    const onHash = () => {
      setRoute(getRoute())
      setRouteKey(window.location.hash)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    initializeDatabase().then(() => setReady(true)).catch((cause) => {
      console.error(cause)
      setError(cause instanceof Error ? cause.message : '无法打开本地词库')
    })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [settings.theme, settings.reducedMotion])

  const navigate = (next: AppRoute) => {
    window.location.hash = next === 'review' ? '#/review?queue=due&mode=en-zh' : `#/${next}`
  }

  const handleInstall = async () => {
    const accepted = await install.install()
    if (!accepted && !install.canInstall) {
      window.alert('iPhone 请在 Safari 的分享菜单选择“添加到主屏幕”；Android/桌面 Chrome 请打开浏览器菜单选择“安装应用”。')
    }
  }

  if (error) return <main className="fatal-error"><strong>本地词库无法打开</strong><p>{error}</p><button type="button" onClick={() => location.reload()}>重新载入</button></main>
  if (!ready) return <LoadingScreen />

  return (
    <div className={route === 'review' ? 'app-shell review-active' : 'app-shell'}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      {route !== 'review' && <AppHeader canInstall={install.canInstall} installed={install.installed} onInstall={handleInstall} onBackup={() => exportBackup()} />}
      <div className="app-content" key={routeKey}>
        {route === 'home' && <HomePage />}
        {route === 'review' && <ReviewPage />}
        {route === 'library' && <LibraryPage />}
        {route === 'mistakes' && <MistakesPage />}
        {route === 'profile' && <ProfilePage canInstall={install.canInstall} installed={install.installed} onInstall={handleInstall} />}
      </div>
      {route !== 'review' && <BottomNav current={route} onNavigate={navigate} />}
      <StatusToast needRefresh={serviceWorker.needRefresh} offlineReady={serviceWorker.offlineReady} onUpdate={serviceWorker.update} onDismissRefresh={serviceWorker.dismissRefresh} onDismissOffline={serviceWorker.dismissOffline} />
    </div>
  )
}

export default App

