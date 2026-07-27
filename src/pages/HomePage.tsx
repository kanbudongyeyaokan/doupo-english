import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, CalendarClock, Dices, Flame, RotateCcw, Sparkles, Target } from 'lucide-react'
import { db, defaultProfile, defaultSettings } from '../db'
import { dayKey, getRealmProgress } from '../domain/gamification'

function startReview(queue: string, mode = 'en-zh') {
  window.location.hash = `#/review?queue=${queue}&mode=${mode}`
}

export function HomePage() {
  const data = useLiveQuery(async () => {
    const now = Date.now()
    const today = dayKey(now)
    const [words, profile, settings, todayEvents, todayReviews] = await Promise.all([
      db.words.toArray(),
      db.profiles.get('player'),
      db.settings.get('app'),
      db.xpEvents.where('dayKey').equals(today).toArray(),
      db.reviews.where('reviewedAt').aboveOrEqual(new Date(new Date().setHours(0, 0, 0, 0)).getTime()).toArray()
    ])
    const due = words.filter((word) => word.firstLearnedAt && word.fsrs.due <= now).length
    const unseen = words.filter((word) => !word.firstLearnedAt).length
    const mistakes = words.filter((word) => word.isMistake).length
    return {
      profile: profile || defaultProfile,
      settings: settings || defaultSettings,
      total: words.length,
      due,
      unseen,
      mistakes,
      todayXp: todayEvents.reduce((sum, event) => sum + event.amount, 0),
      todayReviews: todayReviews.length
    }
  }, [])

  if (!data) return <div className="page-state">正在汇总今日修炼...</div>
  const realm = getRealmProgress(data.profile.xp)
  const dailyGoal = Math.max(10, data.settings.focusBatchSize * 2)
  const dailyProgress = Math.min(100, Math.round((data.todayReviews / dailyGoal) * 100))

  return (
    <main id="main-content" className="page home-page">
      <section className="cultivation-hero" aria-labelledby="realm-title">
        <div className="hero-copy">
          <span className="eyebrow">今日修炼</span>
          <h1 id="realm-title">{realm.realm}<small>{realm.star} 星</small></h1>
          <p>{data.profile.selectedTitle} · 连续 {data.profile.streak} 天</p>
        </div>
        <div className="realm-seal" aria-hidden="true"><Flame size={27} /></div>
        <div className="progress-block">
          <div className="progress-label"><span>{realm.currentXp} / {realm.requiredXp} 经验</span><strong>{realm.percent}%</strong></div>
          <div className="progress-track"><span style={{ width: `${realm.percent}%` }} /></div>
        </div>
      </section>

      <section className="today-strip" aria-label="今日修炼进度">
        <div><strong>{data.todayReviews}</strong><span>已完成</span></div>
        <div><strong>{data.todayXp}</strong><span>今日经验</span></div>
        <div><strong>{dailyProgress}%</strong><span>今日进度</span></div>
        <div><strong>{data.total}</strong><span>词库总数</span></div>
      </section>

      <section className="section-block" aria-labelledby="today-plan">
        <div className="section-heading">
          <div><span className="eyebrow">优先完成</span><h2 id="today-plan">今日计划</h2></div>
          <span className="muted">稳定复习优先于刷量</span>
        </div>
        <div className="study-actions">
          <button type="button" className="study-action primary-action" onClick={() => startReview('due')}>
            <span className="action-icon"><CalendarClock /></span>
            <span><strong>今日待复习</strong><small>按 FSRS 到期排序</small></span>
            <b>{data.due}</b><ArrowRight className="arrow" size={18} />
          </button>
          <button type="button" className="study-action" onClick={() => startReview('new')}>
            <span className="action-icon"><Sparkles /></span>
            <span><strong>今日新词</strong><small>上限 {data.settings.dailyNewLimit} 个</small></span>
            <b>{Math.min(data.unseen, data.settings.dailyNewLimit)}</b><ArrowRight className="arrow" size={18} />
          </button>
          <button type="button" className="study-action" onClick={() => startReview('quick', 'flash')}>
            <span className="action-icon"><RotateCcw /></span>
            <span><strong>快速复习</strong><small>短促闪卡，统一结算</small></span>
            <b>{Math.min(data.total, 10)}</b><ArrowRight className="arrow" size={18} />
          </button>
          <button type="button" className="study-action" onClick={() => startReview('random')}>
            <span className="action-icon"><Dices /></span>
            <span><strong>随机抽词</strong><small>打破固定顺序</small></span>
            <b>1</b><ArrowRight className="arrow" size={18} />
          </button>
        </div>
      </section>

      <section className="section-block daily-tasks" aria-labelledby="daily-task-title">
        <div className="section-heading">
          <div><span className="eyebrow">日课</span><h2 id="daily-task-title">今日修炼进度</h2></div>
          <Target size={20} />
        </div>
        <div className="task-row"><span className={data.todayReviews >= dailyGoal ? 'task-check done' : 'task-check'} /> <p>完成 {dailyGoal} 次有效复习</p><strong>{Math.min(data.todayReviews, dailyGoal)}/{dailyGoal}</strong></div>
        <div className="task-row"><span className={data.todayXp >= 80 ? 'task-check done' : 'task-check'} /> <p>获得 80 点长期记忆经验</p><strong>{Math.min(data.todayXp, 80)}/80</strong></div>
        <div className="task-row"><span className={data.mistakes === 0 ? 'task-check done' : 'task-check'} /> <p>攻克错词本</p><button type="button" onClick={() => { window.location.hash = '#/mistakes' }}>{data.mistakes} 个待处理</button></div>
      </section>
    </main>
  )
}

