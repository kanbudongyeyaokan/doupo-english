import { Download, ShieldCheck, Smartphone } from 'lucide-react'

interface AppHeaderProps {
  canInstall: boolean
  installed: boolean
  onInstall: () => void
  onBackup: () => void
}

export function AppHeader({ canInstall, installed, onInstall, onBackup }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={() => { window.location.hash = '#/home' }} aria-label="返回首页">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <span><strong>斗破英语</strong><small><ShieldCheck size={12} /> 本机私库</small></span>
      </button>
      <div className="header-actions">
        {!installed && (
          <button className="icon-command" type="button" onClick={onInstall} disabled={!canInstall} title={canInstall ? '安装到桌面' : '请使用浏览器菜单安装'}>
            <Smartphone size={19} /><span>安装</span>
          </button>
        )}
        <button className="icon-command" type="button" onClick={onBackup} title="立即导出完整备份">
          <Download size={19} /><span>备份</span>
        </button>
      </div>
    </header>
  )
}

