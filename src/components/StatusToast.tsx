import { Check, RefreshCw, X } from 'lucide-react'

export function StatusToast({
  needRefresh,
  offlineReady,
  onUpdate,
  onDismissRefresh,
  onDismissOffline
}: {
  needRefresh: boolean
  offlineReady: boolean
  onUpdate: () => void
  onDismissRefresh: () => void
  onDismissOffline: () => void
}) {
  if (!needRefresh && !offlineReady) return null
  return (
    <aside className="status-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <RefreshCw size={20} />
          <div><strong>新版本已就绪</strong><span>升级只替换应用文件，不会清空 IndexedDB。</span></div>
          <button type="button" className="primary compact" onClick={onUpdate}>立即升级</button>
          <button type="button" className="icon-only" onClick={onDismissRefresh} aria-label="稍后升级"><X size={18} /></button>
        </>
      ) : (
        <>
          <Check size={20} />
          <div><strong>离线资源已就绪</strong><span>断网后仍可打开并复习。</span></div>
          <button type="button" className="icon-only" onClick={onDismissOffline} aria-label="关闭提示"><X size={18} /></button>
        </>
      )}
    </aside>
  )
}

