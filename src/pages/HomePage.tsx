import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, BookOpen, CalendarClock, Dices, Flame, Gem, RotateCcw, Sparkles, Target } from 'lucide-react'
import { db, defaultProfile, defaultSettings } from '../db'
import { dayKey, getRealmProgress } from '../domain/gamification'
import { summarizeUnits } from '../domain/units'
import { CompanionScene } from '../components/CompanionScene'

function startReview(queue: string, mode = 'en-zh', scope?: { chapter: string; unit: string }) {
  const params = new URLSearchParams({ queue, mode })
  if (scope?.chapter) params.set('chapter', scope.chapter)
  if (scope?.unit) params.set('unit', scope.unit)
  window.location.hash = `#/review?${params.toString()}`
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
      units: summarizeUnits(words, now),
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
  const activeUnit = data.units.find((item) => item.chapter === data.settings.selectedChapter && item.unit === data.settings.selectedUnit) || data.units[0]
  const chapters = [...new Set(data.units.map((item) => item.chapter))]
  const chapterUnits = activeUnit ? data.units.filter((item) => item.chapter === activeUnit.chapter) : []
  const learnedInUnit = activeUnit ? activeUnit.total - activeUnit.unseen : 0
  const unitProgress = activeUnit ? Math.round((learnedInUnit / activeUnit.total) * 100) : 0

  const updateUnitSelection = async (chapter: string, unit: string) => {
    const settings = (await db.settings.get('app')) || defaultSettings
    await db.settings.put({ ...settings, selectedChapter: chapter, selectedUnit: unit, updatedAt: Date.now() })
  }

  return (
    <main id="main-content" className="page home-page">
      <section className="cultivation-hero" aria-labelledby="realm-title">
        <div className="hero-copy">
          <span className="eyebrow">今日修炼</span>
          <h1 id="realm-title">{realm.realm}<small>{realm.star} 星</small></h1>
          <p>{data.profile.selectedTitle} · 连续 {data.profile.streak} 天</p>
          <span className="wallet-pill"><Gem size={14} />{data.profile.spiritStones} 灵石</span>
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

      <section className="section-block unit-study" aria-labelledby="unit-study-title">
        <div className="section-heading">
          <div><span className="eyebrow">红宝书进度</span><h2 id="unit-study-title">按单元修炼</h2></div>
          {activeUnit && <span>{learnedInUnit} / {activeUnit.total} 已学习</span>}
        </div>
        {activeUnit ? (
          <>
            <div className="unit-picker">
              <label><span>词表</span><select value={activeUnit.chapter} onChange={(event) => {
                const chapter = event.target.value
                const firstUnit = data.units.find((item) => item.chapter === chapter)
                if (firstUnit) updateUnitSelection(chapter, firstUnit.unit)
              }}>{chapters.map((chapter) => <option value={chapter} key={chapter}>{chapter}</option>)}</select></label>
              <label><span>单元</span><select value={activeUnit.unit} onChange={(event) => updateUnitSelection(activeUnit.chapter, event.target.value)}>{chapterUnits.map((item) => <option value={item.unit} key={item.unit}>{item.unit} · {item.total} 词</option>)}</select></label>
            </div>
            <div className="unit-progress-row">
              <div><strong>{unitProgress}%</strong><span>单元进度</span></div>
              <div><strong>{activeUnit.unseen}</strong><span>未学习</span></div>
              <div><strong>{activeUnit.due}</strong><span>待复习</span></div>
              <div><strong>{activeUnit.mistakes}</strong><span>易错词</span></div>
            </div>
            <div className="unit-progress-track" aria-label={`${activeUnit.chapter} ${activeUnit.unit} 学习进度`}><span style={{ width: `${unitProgress}%` }} /></div>
            <div className="unit-actions">
              <button type="button" className="study-action primary-action" disabled={activeUnit.unseen === 0} onClick={() => startReview('new', 'en-zh', activeUnit)}>
                <span className="action-icon"><BookOpen /></span><span><strong>学习本单元</strong><small>{activeUnit.chapter} · {activeUnit.unit}</small></span><b>{Math.min(activeUnit.unseen, data.settings.dailyNewLimit)}</b><ArrowRight className="arrow" size={18} />
              </button>
              <button type="button" className="study-action" onClick={() => startReview(activeUnit.due > 0 ? 'due' : 'quick', activeUnit.due > 0 ? 'en-zh' : 'flash', activeUnit)}>
                <span className="action-icon"><RotateCcw /></span><span><strong>{activeUnit.due > 0 ? '复习本单元' : '巩固本单元'}</strong><small>仅抽取当前单元</small></span><b>{activeUnit.due || Math.min(activeUnit.total, data.settings.focusBatchSize)}</b><ArrowRight className="arrow" size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="unit-empty"><BookOpen size={26} /><div><strong>私人词库尚未导入</strong><span>导入红宝书单元包后开始修炼</span></div><button type="button" onClick={() => { window.location.hash = '#/profile' }}>导入词库</button></div>
        )}
      </section>

      <CompanionScene
        profile={data.profile}
        onPrimaryAction={() => startReview(data.due > 0 ? 'due' : 'new')}
      />

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
