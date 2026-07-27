import type { PlayerProfile, ReviewMode, ReviewRating, WordRecord } from '../types'

export const COMPANION_NAME = '知夏'
export const GIRLFRIEND_UNLOCK_WORDS = 100

export const COMPANION_MILESTONES = [
  { id: 'letter', threshold: 20, relation: '匿名词笺', title: '收到她留下的第一句话', keepsake: '银杏书签' },
  { id: 'deskmate', threshold: 50, relation: '晚自习同桌', title: '知夏成为你的学习搭子', keepsake: '并排座位票' },
  { id: 'girlfriend', threshold: GIRLFRIEND_UNLOCK_WORDS, relation: '女朋友', title: '知夏向你确认心意', keepsake: '青焰心意结' },
  { id: 'journey', threshold: 250, relation: '并肩远行', title: '一起走过第一段长路', keepsake: '双人车票' },
  { id: 'promise', threshold: 500, relation: '长明之约', title: '把长期主义写进约定', keepsake: '星火纪念册' }
] as const

const LOCKED_STAGE = {
  id: 'locked',
  threshold: 0,
  relation: '尚未相识',
  title: '故事中的她仍是一个剪影',
  keepsake: '未解锁'
} as const

export function inferMasteredWordIds(words: WordRecord[]) {
  return words
    .filter((word) => Boolean(word.firstLearnedAt) && !word.isMistake && word.fsrs.reps > 0)
    .map((word) => word.id)
}

export function getMasteredCount(profile: PlayerProfile) {
  return new Set(profile.masteredWordIds).size
}

export function getCompanionProgress(masteredCount: number) {
  const current = [...COMPANION_MILESTONES].reverse().find((item) => masteredCount >= item.threshold) || LOCKED_STAGE
  const next = COMPANION_MILESTONES.find((item) => masteredCount < item.threshold)
  const rangeStart = current.threshold
  const rangeEnd = next?.threshold ?? current.threshold
  const percent = next
    ? Math.max(0, Math.min(100, Math.round(((masteredCount - rangeStart) / (rangeEnd - rangeStart)) * 100)))
    : 100

  return {
    current,
    next,
    percent,
    masteredCount,
    remaining: next ? next.threshold - masteredCount : 0,
    isGirlfriendUnlocked: masteredCount >= GIRLFRIEND_UNLOCK_WORDS,
    isCompanionVisible: masteredCount >= 50
  }
}

export function calculateBondReward(
  rating: ReviewRating,
  mode: ReviewMode,
  xpAwarded: number,
  newlyMastered: boolean
) {
  if (xpAwarded <= 0 || (rating !== 'good' && rating !== 'easy')) return 0
  if (newlyMastered) return 3
  return mode === 'spelling' ? 2 : 1
}

export function getCompanionDialogue(profile: PlayerProfile, context: 'home' | 'completion' | 'interaction' = 'home') {
  const masteredCount = getMasteredCount(profile)
  const progress = getCompanionProgress(masteredCount)
  if (!progress.isGirlfriendUnlocked) {
    if (masteredCount < 20) return `再真正掌握 ${20 - masteredCount} 个词，故事里的第一封词笺就会出现。`
    if (masteredCount < 50) return `词笺末尾写着：不要赶路，先把今天记住的词留到明天。`
    return `知夏已经坐到你身边。再掌握 ${GIRLFRIEND_UNLOCK_WORDS - masteredCount} 个词，你们会确认彼此的心意。`
  }

  const pools = {
    home: [
      '我不替你背，但会陪你把今天这一组认真走完。',
      '先清到期词，再碰新词。我们把长期记忆放在第一位。',
      '不用一次做很多，能在明天想起来才算真正留下。'
    ],
    completion: [
      '这一组已经稳稳收下。休息一下，再决定要不要继续。',
      '刚才卡住的词别躲开，下次见到它时我们再赢一次。',
      '你负责认真回忆，我负责记住你今天没有敷衍。'
    ],
    interaction: [
      '今天的陪伴已经签到。现在把注意力还给真正要记的词。',
      '我最喜欢的不是连胜数字，是你愿意诚实标记“完全忘记”。',
      '走得慢没有关系，只要每次回来都比上次更清楚一点。'
    ]
  } as const
  const pool = pools[context]
  return pool[(profile.totalReviews + profile.companionInteractions) % pool.length]
}
