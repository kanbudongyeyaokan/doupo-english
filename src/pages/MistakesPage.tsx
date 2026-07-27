import { useLiveQuery } from 'dexie-react-hooks'
import { BookMarked, Check, Flame, RotateCcw } from 'lucide-react'
import { createRecoverySnapshot, db } from '../db'

export function MistakesPage() {
  const words = useLiveQuery(async () => (await db.words.toArray()).filter((word) => word.isMistake).sort((a, b) => b.updatedAt - a.updatedAt), []) || []

  const clearAll = async () => {
    if (!words.length || !window.confirm('将所有错词标记为已攻克？学习记录不会删除。')) return
    await db.words.toCollection().modify((word) => {
      if (word.isMistake) {
        word.isMistake = false
        word.updatedAt = Date.now()
      }
    })
    await createRecoverySnapshot('清理错词标记')
  }

  return (
    <main id="main-content" className="page mistakes-page">
      <div className="page-title-row"><div><span className="eyebrow">薄弱环节</span><h1>错词本</h1><p>{words.length} 个需要重新攻克</p></div>{words.length > 0 && <button type="button" onClick={clearAll}><Check size={18} />全部标记已攻克</button>}</div>
      {words.length > 0 ? <>
        <section className="mistake-start">
          <div><BookMarked size={24} /><span><strong>错词专修</strong><small>答到“基本掌握”或“非常熟练”后自动移出</small></span></div>
          <button className="primary" type="button" onClick={() => { window.location.hash = '#/review?queue=mistakes&mode=spelling' }}><Flame size={18} />开始修炼</button>
        </section>
        <div className="mistake-list">{words.map((word) => <article key={word.id}><div><strong>{word.term}</strong><span>{word.phonetic}</span></div><p>{word.meanings.flatMap((item) => item.meanings).slice(0, 2).join('；')}</p><span>{word.lastReviewedAt ? `上次复习 ${new Date(word.lastReviewedAt).toLocaleDateString('zh-CN')}` : '尚未完成首次复习'}</span></article>)}</div>
      </> : <div className="empty-state large"><div className="empty-icon"><RotateCcw /></div><h2>错词已清空</h2><p>下一次选择“完全忘记”或“模糊记得”的单词会自动进入这里。</p><button type="button" onClick={() => { window.location.hash = '#/review?queue=due&mode=en-zh' }}>继续今日复习</button></div>}
    </main>
  )
}
