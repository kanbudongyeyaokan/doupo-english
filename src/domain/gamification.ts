import type { PlayerProfile, ReviewMode, ReviewRating, WordRecord, XpEvent } from '../types'

export const REALMS = ['斗者', '斗师', '大斗师', '斗灵', '斗王', '斗皇', '斗宗', '斗尊', '半圣', '斗圣', '斗帝'] as const

export const TITLES = [
  { name: '初入迦南', test: (p: PlayerProfile) => p.totalReviews >= 1 },
  { name: '晨读散修', test: (p: PlayerProfile) => p.streak >= 3 },
  { name: '百词筑基者', test: (p: PlayerProfile) => p.masteredWordIds.length >= 100 },
  { name: '词海猎手', test: (p: PlayerProfile) => p.totalNewWords >= 100 },
  { name: '青焰藏家', test: (p: PlayerProfile) => p.inventoryItemIds.length >= 3 },
  { name: '灵石执掌者', test: (p: PlayerProfile) => p.lifetimeSpiritStones >= 500 },
  { name: '记忆药师', test: (p: PlayerProfile) => p.totalReviews >= 500 },
  { name: '熟词破境者', test: (p: PlayerProfile) => p.recoveredMistakes >= 30 },
  { name: '拼写执法者', test: (p: PlayerProfile) => p.spellingCorrect >= 100 },
  { name: '七日守心人', test: (p: PlayerProfile) => p.longestStreak >= 7 },
  { name: '长难句行者', test: (p: PlayerProfile) => p.totalReviews >= 1000 },
  { name: '知夏同路人', test: (p: PlayerProfile) => p.companionBond >= 100 },
  { name: '千词守藏者', test: (p: PlayerProfile) => p.masteredWordIds.length >= 1000 },
  { name: '黑角域词王', test: (p: PlayerProfile) => p.streak >= 30 },
  { name: '天府词宗', test: (p: PlayerProfile) => p.totalReviews >= 3000 },
  { name: '百日长修者', test: (p: PlayerProfile) => p.longestStreak >= 100 },
  { name: '九星词圣', test: (p: PlayerProfile) => getRealmProgress(p.xp).globalStar >= 89 },
  { name: '万词斗帝', test: (p: PlayerProfile) => p.totalNewWords >= 10000 }
]

export function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getRealmProgress(xp: number) {
  let remaining = Math.max(0, xp)
  let globalStar = 1
  for (let realmIndex = 0; realmIndex < REALMS.length; realmIndex += 1) {
    for (let star = 1; star <= 9; star += 1) {
      const required = 220 + realmIndex * 45 + (star - 1) * 12
      if (remaining < required) {
        return {
          realm: REALMS[realmIndex],
          realmIndex,
          star,
          globalStar,
          currentXp: remaining,
          requiredXp: required,
          percent: Math.round((remaining / required) * 100)
        }
      }
      remaining -= required
      globalStar += 1
    }
  }
  return {
    realm: '斗帝' as const,
    realmIndex: REALMS.length - 1,
    star: 9,
    globalStar: 99,
    currentXp: 1,
    requiredXp: 1,
    percent: 100
  }
}

export function calculateReviewXp(
  word: WordRecord,
  rating: ReviewRating,
  mode: ReviewMode,
  now: number,
  existingEvents: XpEvent[]
) {
  const today = dayKey(now)
  const recentForWord = existingEvents.some(
    (event) => event.wordId === word.id && now - event.createdAt < 6 * 60 * 60 * 1000
  )
  if (recentForWord) return { total: 0, events: [] as XpEvent[] }

  const specs: Array<{ kind: XpEvent['kind']; amount: number }> = []
  if (!word.firstLearnedAt) specs.push({ kind: 'new-word', amount: 12 })
  else specs.push({ kind: 'review', amount: rating === 'again' ? 2 : rating === 'hard' ? 4 : 6 })
  if (word.fsrs.due <= now + 24 * 60 * 60 * 1000 && rating !== 'again') specs.push({ kind: 'on-time', amount: 5 })
  if (mode === 'spelling' && (rating === 'good' || rating === 'easy')) specs.push({ kind: 'spelling', amount: 4 })
  if (word.isMistake && (rating === 'good' || rating === 'easy')) specs.push({ kind: 'mistake-recovered', amount: 5 })

  const events = specs.map((spec, index) => ({
    id: `${word.id}:${spec.kind}:${today}:${Math.floor(now / 21600000)}:${index}`,
    wordId: word.id,
    kind: spec.kind,
    amount: spec.amount,
    createdAt: now,
    dayKey: today
  }))
  return { total: events.reduce((sum, event) => sum + event.amount, 0), events }
}

export function refreshTitles(profile: PlayerProfile) {
  const unlocked = TITLES.filter((item) => item.test(profile)).map((item) => item.name)
  return {
    ...profile,
    unlockedTitles: [...new Set([...profile.unlockedTitles, ...unlocked])],
    selectedTitle: profile.selectedTitle || unlocked.at(-1) || '初入迦南'
  }
}

export function updateStreak(profile: PlayerProfile, timestamp = Date.now()) {
  const today = dayKey(timestamp)
  if (profile.lastStudyDate === today) return profile
  const previous = new Date(timestamp)
  previous.setDate(previous.getDate() - 1)
  const nextStreak = profile.lastStudyDate === dayKey(previous.getTime()) ? profile.streak + 1 : 1
  return {
    ...profile,
    streak: nextStreak,
    longestStreak: Math.max(profile.longestStreak, nextStreak),
    lastStudyDate: today
  }
}
