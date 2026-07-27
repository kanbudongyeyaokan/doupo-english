import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, ChevronRight, Eye, Keyboard, ListChecks, Shuffle, Sparkles, Volume2, X } from 'lucide-react'
import { db, defaultSettings, reviewWord } from '../db'
import { formatInterval, previewIntervals } from '../domain/fsrs'
import { buildChoiceOptions, clozeSentence, judgeSpelling } from '../domain/quiz'
import type { ReviewMode, ReviewRating, RewardCard, WordRecord } from '../types'
import { WordImage } from '../components/WordImage'

const MODES: Array<{ id: ReviewMode; name: string; short: string }> = [
  { id: 'en-zh', name: '看英文回忆中文', short: '英 → 中' },
  { id: 'zh-en', name: '看中文回忆英文', short: '中 → 英' },
  { id: 'spelling', name: '单词拼写', short: '拼写' },
  { id: 'choice', name: '选择题', short: '选择' },
  { id: 'cloze', name: '例句选词填空', short: '填空' },
  { id: 'familiar', name: '熟词生义', short: '生义' },
  { id: 'confusable', name: '易混词辨析', short: '辨析' },
  { id: 'flash', name: '快速闪卡', short: '闪卡' }
]

function readOptions() {
  const query = window.location.hash.split('?')[1] || ''
  const params = new URLSearchParams(query)
  return {
    queue: params.get('queue') || 'due',
    mode: (params.get('mode') || 'en-zh') as ReviewMode
  }
}

function primaryMeaning(word: WordRecord) {
  return word.meanings.flatMap((group) => group.meanings)[0] || '释义待补充'
}

function speak(word: WordRecord, accent: 'british' | 'american') {
  const assetId = accent === 'british' ? word.audioBritishId : word.audioAmericanId
  if (assetId) {
    db.assets.get(assetId).then((asset) => {
      if (!asset) return
      const url = URL.createObjectURL(asset.blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => URL.revokeObjectURL(url))
    })
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word.term)
  utterance.lang = accent === 'british' ? 'en-GB' : 'en-US'
  utterance.rate = 0.86
  window.speechSynthesis.speak(utterance)
}

function buildQueue(words: WordRecord[], queue: string, limit: number) {
  const now = Date.now()
  const sorted = [...words].sort((a, b) => a.fsrs.due - b.fsrs.due)
  if (queue === 'new') return sorted.filter((word) => !word.firstLearnedAt).slice(0, limit)
  if (queue === 'mistakes') return sorted.filter((word) => word.isMistake).slice(0, limit)
  if (queue === 'random') return words.length ? [words[Math.floor(Math.random() * words.length)]] : []
  if (queue === 'quick') {
    return sorted.sort((a, b) => Number(b.isMistake) - Number(a.isMistake) || a.fsrs.due - b.fsrs.due).slice(0, limit)
  }
  if (queue === 'all') return sorted.slice(0, limit)
  return sorted.filter((word) => Boolean(word.firstLearnedAt) && word.fsrs.due <= now).slice(0, limit)
}

function Prompt({ word, mode }: { word: WordRecord; mode: ReviewMode }) {
  if (mode === 'zh-en' || mode === 'spelling') return <><span className="prompt-label">请回忆英文</span><h1 className="meaning-prompt">{primaryMeaning(word)}</h1></>
  if (mode === 'cloze') return <><span className="prompt-label">补全句中单词</span><h1 className="cloze-prompt">{clozeSentence(word).prompt}</h1></>
  if (mode === 'familiar') return <><span className="prompt-label">回忆熟词生义</span><h1>{word.term}</h1><p className="prompt-context">不要只停留在最熟悉的释义</p></>
  if (mode === 'confusable') return <><span className="prompt-label">辨析易混词</span><h1>{word.term}</h1><p className="confusable-prompt">{word.confusables.length ? `与 ${word.confusables.join('、')} 有什么区别？` : '说出一个形近词或近义词，并辨析用法。'}</p></>
  return <><span className="prompt-label">{mode === 'flash' ? '快速闪卡' : '请先回忆中文'}</span><h1>{word.term}</h1><p className="phonetic">{word.phonetic || '音标待补充'}</p></>
}

function AnswerDetails({ word }: { word: WordRecord }) {
  return (
    <div className="answer-details">
      <div className="answer-lead">
        <div><h2>{word.term}</h2><p>{word.phonetic}</p></div>
        <div className="audio-actions">
          <button type="button" onClick={() => speak(word, 'british')} title="播放英式发音"><Volume2 size={17} />英</button>
          <button type="button" onClick={() => speak(word, 'american')} title="播放美式发音"><Volume2 size={17} />美</button>
        </div>
      </div>
      <div className="meaning-groups">
        {word.meanings.map((group) => <p key={`${group.partOfSpeech}-${group.meanings.join()}`}><b>{group.partOfSpeech}</b>{group.meanings.join('；')}</p>)}
      </div>
      {word.familiarMeanings.length > 0 && <Detail title="熟词生义" values={word.familiarMeanings} accent />}
      {word.collocations.length > 0 && <Detail title="常用搭配" values={word.collocations} />}
      {word.examples.map((example) => <blockquote key={example.english}><p>{example.english}</p><span>{example.chinese}</span></blockquote>)}
      <div className="detail-grid">
        {word.derivatives.length > 0 && <Detail title="派生词" values={word.derivatives} />}
        {word.roots.length > 0 && <Detail title="词根词缀" values={word.roots} />}
        {word.synonyms.length > 0 && <Detail title="近义词" values={word.synonyms} />}
        {word.confusables.length > 0 && <Detail title="易混词" values={word.confusables} />}
      </div>
      {word.memoryTip && <Detail title="记忆提示" values={[word.memoryTip]} />}
      {word.notes && <Detail title="我的笔记" values={[word.notes]} />}
      {word.imageIds.length > 0 && <div className="word-images">{word.imageIds.map((id) => <WordImage key={id} assetId={id} alt={`${word.term} 的配图`} />)}</div>}
      <footer className="word-source"><span>{word.source}</span><span>{[word.chapter, word.unit, word.page && `p.${word.page}`].filter(Boolean).join(' · ')}</span></footer>
    </div>
  )
}

function Detail({ title, values, accent = false }: { title: string; values: string[]; accent?: boolean }) {
  return <div className={accent ? 'word-detail accent' : 'word-detail'}><strong>{title}</strong><p>{values.join('；')}</p></div>
}

export function ReviewPage() {
  const options = useMemo(readOptions, [])
  const allWords = useLiveQuery(() => db.words.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get('app'), []) || defaultSettings
  const [mode, setMode] = useState<ReviewMode>(options.mode)
  const [queueIds, setQueueIds] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [answer, setAnswer] = useState('')
  const [choiceId, setChoiceId] = useState('')
  const [autoCorrect, setAutoCorrect] = useState<boolean | null>(null)
  const [sessionXp, setSessionXp] = useState(0)
  const [settled, setSettled] = useState(false)
  const [reward, setReward] = useState<RewardCard | undefined>()
  const [saving, setSaving] = useState(false)
  const answerInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!allWords || queueIds) return
    const limit = options.queue === 'new' ? settings.dailyNewLimit : settings.focusBatchSize
    setQueueIds(buildQueue(allWords, options.queue, limit).map((word) => word.id))
  }, [allWords, options.queue, queueIds, settings.dailyNewLimit, settings.focusBatchSize])

  const queue = useMemo(() => queueIds?.map((id) => allWords?.find((word) => word.id === id)).filter(Boolean) as WordRecord[] | undefined, [allWords, queueIds])
  const word = queue?.[index]
  const choices = useMemo(() => word && allWords ? buildChoiceOptions(word, allWords) : [], [word, allWords])
  const intervals = useMemo(() => word ? previewIntervals(word.fsrs, new Date()) : null, [word])

  useEffect(() => {
    setRevealed(false)
    setAnswer('')
    setChoiceId('')
    setAutoCorrect(null)
    if (mode === 'spelling' || mode === 'cloze') window.setTimeout(() => answerInput.current?.focus(), 80)
  }, [index, mode])

  if (!queue) return <main className="page page-state">正在排列 FSRS 复习队列...</main>
  if (!queue.length) return (
    <main className="page completion-page">
      <div className="completion-seal"><Check size={34} /></div>
      <span className="eyebrow">今日队列已清</span>
      <h1>气息平稳，适合收功</h1>
      <p>当前没有符合条件的单词。可以学习新词，或随机抽取一词巩固。</p>
      <div className="completion-actions">
        <button className="primary" type="button" onClick={() => { window.location.hash = '#/review?queue=new&mode=en-zh' }}>学习新词</button>
        <button type="button" onClick={() => { window.location.hash = '#/review?queue=random&mode=flash' }}>随机抽词</button>
      </div>
    </main>
  )
  if (settled || !word) return (
    <main className="page completion-page">
      <div className={reward ? 'completion-seal reward' : 'completion-seal'}><Sparkles size={34} /></div>
      <span className="eyebrow">专注修炼结算</span>
      <h1>完成 {queue.length} 词</h1>
      <p>本组获得 <strong>{sessionXp}</strong> 经验。短时重复不会反复获得经验，收益来自按时复习与真实回忆。</p>
      {reward && <div className="reward-reveal"><span>{reward.rarity === 'epic' ? '稀有突破' : '修炼奖励'}</span><strong>{reward.title}</strong><p>{reward.description}</p></div>}
      <div className="completion-actions">
        <button className="primary" type="button" onClick={() => { window.location.hash = '#/home' }}>返回首页</button>
        <button type="button" onClick={() => { setIndex(0); setSettled(false); setSessionXp(0); setQueueIds(null) }}>再炼一组</button>
      </div>
    </main>
  )

  const revealWithJudgement = () => {
    if (mode === 'spelling' || mode === 'cloze') setAutoCorrect(judgeSpelling(answer, word))
    setRevealed(true)
  }

  const choose = (id: string) => {
    setChoiceId(id)
    setAutoCorrect(id === word.id)
    setRevealed(true)
  }

  const rate = async (rating: ReviewRating) => {
    if (saving) return
    setSaving(true)
    try {
      const result = await reviewWord(word.id, rating, mode, answer || choiceId)
      setSessionXp((value) => value + result.xp)
      if (result.reward) setReward(result.reward)
      if (settings.hapticsEnabled && navigator.vibrate) navigator.vibrate(rating === 'again' ? 18 : 10)
      if (index + 1 >= queue.length) setSettled(true)
      else setIndex((value) => value + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="page review-page">
      <div className="review-toolbar">
        <button type="button" className="icon-only" onClick={() => history.back()} aria-label="返回"><ArrowLeft size={21} /></button>
        <div className="queue-progress"><span style={{ width: `${((index + (revealed ? 0.6 : 0)) / queue.length) * 100}%` }} /></div>
        <strong>{index + 1}/{queue.length}</strong>
        <label className="mode-select"><span className="sr-only">复习模式</span><select value={mode} onChange={(event) => setMode(event.target.value as ReviewMode)}>{MODES.map((item) => <option value={item.id} key={item.id}>{item.short}</option>)}</select></label>
      </div>

      <article className={revealed ? 'review-card revealed' : 'review-card'}>
        <div className="prompt-area">
          <Prompt word={word} mode={mode} />
          {(mode === 'en-zh' || mode === 'flash') && <div className="inline-audio"><button type="button" onClick={() => speak(word, 'british')}><Volume2 size={17} />英音</button><button type="button" onClick={() => speak(word, 'american')}><Volume2 size={17} />美音</button></div>}
          {(mode === 'spelling' || mode === 'cloze') && !revealed && (
            <form className="answer-form" onSubmit={(event) => { event.preventDefault(); revealWithJudgement() }}>
              <label htmlFor="review-answer">输入完整单词</label>
              <div><Keyboard size={20} /><input ref={answerInput} id="review-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="submit" disabled={!answer.trim()}><ChevronRight /></button></div>
            </form>
          )}
          {mode === 'choice' && !revealed && (
            <div className="choice-list">{choices.map((option, optionIndex) => <button type="button" key={option.id} onClick={() => choose(option.id)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option.label}</span></button>)}</div>
          )}
        </div>

        {!revealed ? (
          mode !== 'spelling' && mode !== 'cloze' && mode !== 'choice' && (
            <button className="reveal-button" type="button" onClick={() => setRevealed(true)}><Eye size={19} />显示答案</button>
          )
        ) : (
          <div className="revealed-area">
            {autoCorrect !== null && <div className={autoCorrect ? 'judgement correct' : 'judgement wrong'}>{autoCorrect ? <Check /> : <X />}<span>{autoCorrect ? '判断正确' : `正确答案：${word.term}`}</span></div>}
            <AnswerDetails word={word} />
          </div>
        )}
      </article>

      {revealed && intervals && (
        <section className="rating-panel" aria-label="记忆评价">
          <p>按真实回忆程度评价</p>
          <div className="rating-grid">
            {([
              ['again', '完全忘记', intervals.again],
              ['hard', '模糊记得', intervals.hard],
              ['good', '基本掌握', intervals.good],
              ['easy', '非常熟练', intervals.easy]
            ] as Array<[ReviewRating, string, Date]>).map(([rating, label, due]) => (
              <button key={rating} type="button" className={`rating-${rating}`} disabled={saving} onClick={() => rate(rating)}>
                <strong>{label}</strong><span>{formatInterval(due)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!revealed && <div className="review-hint"><Shuffle size={15} /><span>先主动回忆，再查看答案</span><ListChecks size={15} /></div>}
    </main>
  )
}

