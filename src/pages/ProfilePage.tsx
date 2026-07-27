import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArchiveRestore, Award, Check, ChevronRight, Database, Download, FileJson, FileSpreadsheet, HardDrive, Info, Moon, Smartphone, Upload } from 'lucide-react'
import { db, defaultProfile, defaultSettings, restoreSnapshot } from '../db'
import { dayKey, getRealmProgress } from '../domain/gamification'
import type { AppSettings, BackupPackage, ImportPreview, VocabularyPackage } from '../types'
import { exportBackup, exportWordsCsv, importPackage, parseImportText, parseWordsCsv, previewImport } from '../utils/backup'

interface ProfilePageProps {
  canInstall: boolean
  installed: boolean
  onInstall: () => void
}

interface PendingImport {
  data: BackupPackage | VocabularyPackage
  preview: ImportPreview
  filename: string
}

export function ProfilePage({ canInstall, installed, onInstall }: ProfilePageProps) {
  const data = useLiveQuery(async () => {
    const today = dayKey()
    const weekStart = new Date()
    const day = weekStart.getDay() || 7
    weekStart.setDate(weekStart.getDate() - day + 1)
    weekStart.setHours(0, 0, 0, 0)
    const [profile, settings, snapshots, words, todayReviews, weekReviews, rewards, assetCount] = await Promise.all([
      db.profiles.get('player'), db.settings.get('app'), db.snapshots.orderBy('createdAt').reverse().toArray(), db.words.toArray(),
      db.reviews.where('reviewedAt').aboveOrEqual(new Date(new Date().setHours(0, 0, 0, 0)).getTime()).count(),
      db.reviews.where('reviewedAt').aboveOrEqual(weekStart.getTime()).count(), db.rewards.orderBy('earnedAt').reverse().toArray(), db.assets.count()
    ])
    return { profile: profile || defaultProfile, settings: settings || defaultSettings, snapshots, words, todayReviews, weekReviews, rewards, assetCount, today }
  }, [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)

  if (!data) return <main className="page page-state">正在读取本机档案...</main>
  const realm = getRealmProgress(data.profile.xp)

  const updateSettings = async (patch: Partial<AppSettings>) => {
    await db.settings.put({ ...data.settings, ...patch, updatedAt: Date.now() })
  }

  const readImport = async (file: File) => {
    try {
      const text = await file.text()
      const imported = file.name.toLowerCase().endsWith('.csv')
        ? { format: 'doupo-english-vocabulary' as const, schemaVersion: 1 as const, words: parseWordsCsv(text) }
        : parseImportText(text)
      const preview = await previewImport(imported)
      setPending({ data: imported, preview: { ...preview, kind: file.name.toLowerCase().endsWith('.csv') ? 'csv' : preview.kind }, filename: file.name })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取导入文件')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const runImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return
    setWorking(true)
    try {
      await importPackage(pending.data, mode)
      setMessage(`已${mode === 'merge' ? '合并导入' : '覆盖恢复'} ${pending.preview.incoming} 个单词`)
      setPending(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    } finally {
      setWorking(false)
    }
  }

  const restore = async (id: string) => {
    if (!window.confirm('恢复后会替换当前词库与学习记录，并先自动建立保护快照。继续吗？')) return
    await restoreSnapshot(id)
    setMessage('本地快照已恢复')
  }

  return (
    <main id="main-content" className="page profile-page">
      <section className="profile-hero">
        <div className="profile-seal"><span>{realm.realm[0]}</span></div>
        <div><span className="eyebrow">个人修炼档案</span><h1>{realm.realm} <small>{realm.star} 星</small></h1><p>{data.profile.selectedTitle} · 累计 {data.profile.totalReviews} 次复习</p></div>
      </section>

      <section className="profile-stats" aria-label="学习统计"><div><strong>{data.profile.streak}</strong><span>连续天数</span></div><div><strong>{data.profile.longestStreak}</strong><span>最长连胜</span></div><div><strong>{data.profile.spellingCorrect}</strong><span>拼写正确</span></div><div><strong>{data.profile.recoveredMistakes}</strong><span>攻克错词</span></div></section>

      <section className="settings-section">
        <div className="section-heading"><div><span className="eyebrow">安全优先</span><h2>数据保险箱</h2></div><Database size={21} /></div>
        <div className="safety-actions">
          <button className="primary" type="button" onClick={() => exportBackup()}><FileJson size={20} /><span><strong>立即完整备份</strong><small>单词、记录、图片、音频和设置</small></span><Download size={18} /></button>
          <button type="button" onClick={() => exportWordsCsv(data.words)}><FileSpreadsheet size={20} /><span><strong>导出单词 CSV</strong><small>便于表格整理，不含图片与记录</small></span><Download size={18} /></button>
          <button type="button" onClick={() => fileInput.current?.click()}><Upload size={20} /><span><strong>导入 JSON / CSV</strong><small>先预览数量和冲突，再决定合并或覆盖</small></span><ChevronRight size={18} /></button>
          <input ref={fileInput} className="sr-only" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) readImport(file) }} />
        </div>
        <div className="storage-status"><HardDrive size={19} /><div><strong>{data.settings.storagePersistent ? '已获得持久存储保护' : '浏览器尚未承诺持久存储'}</strong><span>{data.words.length} 个单词 · {data.assetCount} 个本地媒体 · {data.snapshots.length} 个恢复快照</span></div></div>
        <div className="browser-boundary"><Info size={18} /><p>微信、Safari、Chrome，以及不同域名/安装入口各自使用独立存储空间。换浏览器或设备前，请先导出完整 JSON 备份。清除站点数据、无痕模式或卸载浏览器仍可能删除本机副本。</p></div>
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><span className="eyebrow">最近 5 个</span><h2>本地恢复快照</h2></div><ArchiveRestore size={21} /></div>
        <div className="snapshot-list">{data.snapshots.length ? data.snapshots.map((snapshot) => <div key={snapshot.id}><span><strong>{snapshot.reason}</strong><small>{new Date(snapshot.createdAt).toLocaleString('zh-CN', { hour12: false })}</small></span><button type="button" onClick={() => restore(snapshot.id)}>恢复</button></div>) : <p className="muted">完成一次复习、编辑或导入后会自动建立快照。</p>}</div>
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><span className="eyebrow">偏好</span><h2>修炼设置</h2></div><Moon size={21} /></div>
        <div className="setting-list">
          <label><span><strong>外观</strong><small>支持系统、浅色和深色模式</small></span><select value={data.settings.theme} onChange={(event) => updateSettings({ theme: event.target.value as AppSettings['theme'] })}><option value="system">跟随系统</option><option value="dark">深色</option><option value="light">浅色</option></select></label>
          <label><span><strong>减少动画</strong><small>关闭突破与揭晓动效</small></span><input type="checkbox" role="switch" checked={data.settings.reducedMotion} onChange={(event) => updateSettings({ reducedMotion: event.target.checked })} /></label>
          <label><span><strong>静音</strong><small>发音按钮仍可手动播放</small></span><input type="checkbox" role="switch" checked={!data.settings.soundEnabled} onChange={(event) => updateSettings({ soundEnabled: !event.target.checked })} /></label>
          <label><span><strong>触觉反馈</strong><small>支持的手机完成评价时短振动</small></span><input type="checkbox" role="switch" checked={data.settings.hapticsEnabled} onChange={(event) => updateSettings({ hapticsEnabled: event.target.checked })} /></label>
          <label><span><strong>每日新词</strong><small>专注长期记忆，避免一次过量</small></span><input type="number" min="5" max="100" value={data.settings.dailyNewLimit} onChange={(event) => updateSettings({ dailyNewLimit: Number(event.target.value) })} /></label>
          <label><span><strong>专注组大小</strong><small>完成一整组后统一结算</small></span><input type="number" min="5" max="50" value={data.settings.focusBatchSize} onChange={(event) => updateSettings({ focusBatchSize: Number(event.target.value) })} /></label>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><span className="eyebrow">长期目标</span><h2>任务与成就</h2></div><Award size={21} /></div>
        <div className="goal-list"><div><span className={data.todayReviews >= 20 ? 'goal-check done' : 'goal-check'}>{data.todayReviews >= 20 && <Check />}</span><p><strong>每日稳固</strong><small>今日完成 20 次复习</small></p><b>{Math.min(20, data.todayReviews)}/20</b></div><div><span className={data.weekReviews >= 100 ? 'goal-check done' : 'goal-check'}>{data.weekReviews >= 100 && <Check />}</span><p><strong>周度长跑</strong><small>本周完成 100 次复习</small></p><b>{Math.min(100, data.weekReviews)}/100</b></div></div>
        <label className="title-select"><span>当前称号</span><select value={data.profile.selectedTitle} onChange={(event) => db.profiles.put({ ...data.profile, selectedTitle: event.target.value })}>{(data.profile.unlockedTitles.length ? data.profile.unlockedTitles : ['初入迦南']).map((title) => <option key={title}>{title}</option>)}</select></label>
        {data.rewards.length > 0 && <div className="reward-collection">{data.rewards.slice(0, 6).map((reward) => <article key={reward.id} className={`rarity-${reward.rarity}`}><span>{reward.rarity === 'epic' ? '稀有' : '珍藏'}</span><strong>{reward.title}</strong><small>{new Date(reward.earnedAt).toLocaleDateString('zh-CN')}</small></article>)}</div>}
      </section>

      <section className="settings-section install-section">
        <div><Smartphone size={22} /><span><strong>{installed ? '已作为应用运行' : '安装到手机桌面'}</strong><small>HTTPS 部署后可获得稳定入口与离线启动</small></span></div>
        {!installed && <button type="button" onClick={onInstall} disabled={!canInstall}>{canInstall ? '安装' : '使用浏览器菜单'}</button>}
      </section>

      <section className="import-guide"><h2>导入《红宝书》私人资料</h2><p>先在 Codex 中上传你已购买的 PDF、扫描页或截图。我会识别目录与页码、判断文本/OCR 类型，并按每批 2–5 个单元生成带稳定 ID 的私人 JSON。原始书页与长原文只进入你的 IndexedDB 或私人备份，不提交到公开仓库。</p></section>

      {message && <div className="inline-message" role="status"><Check size={18} />{message}<button type="button" onClick={() => setMessage('')}>关闭</button></div>}
      {pending && <div className="modal-backdrop"><section className="import-preview" role="dialog" aria-modal="true" aria-labelledby="import-title"><span className="eyebrow">导入前预览</span><h2 id="import-title">{pending.filename}</h2><div className="preview-stats"><div><strong>{pending.preview.incoming}</strong><span>传入单词</span></div><div><strong>{pending.preview.newWords}</strong><span>新增</span></div><div><strong>{pending.preview.conflicts}</strong><span>冲突</span></div><div><strong>{pending.preview.unchanged}</strong><span>未变化</span></div></div>{pending.preview.conflictWords.length > 0 && <div className="conflict-list"><strong>冲突预览</strong>{pending.preview.conflictWords.slice(0, 6).map((item) => <p key={item.id}>{item.local}<span>本地与传入内容不同</span></p>)}</div>}<p>合并导入会保留本地学习排期，并合并词义、标签和媒体；覆盖恢复会替换当前数据，但先建立保护快照。</p><div className="dialog-actions"><button type="button" onClick={() => setPending(null)}>取消</button><button type="button" disabled={working} onClick={() => runImport('merge')}>合并导入</button><button className="primary" type="button" disabled={working || pending.data.format !== 'doupo-english-backup'} onClick={() => runImport('replace')}>覆盖恢复</button></div></section></div>}
    </main>
  )
}
