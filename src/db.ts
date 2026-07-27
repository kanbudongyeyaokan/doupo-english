import Dexie, { type EntityTable } from 'dexie'
import { seedWords } from './data/seed'
import { calculateReviewXp, getRealmProgress, refreshTitles, updateStreak } from './domain/gamification'
import { scheduleReview } from './domain/fsrs'
import { createWordRecord } from './domain/word'
import type {
  AppSettings,
  AssetRecord,
  PlayerProfile,
  RecoverySnapshot,
  ReviewLogRecord,
  ReviewMode,
  ReviewRating,
  RewardCard,
  WordRecord,
  XpEvent
} from './types'

export const DATABASE_NAME = 'doupo-english-private-vault-v1'

export const defaultProfile: PlayerProfile = {
  id: 'player',
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lastStudyDate: '',
  totalReviews: 0,
  totalNewWords: 0,
  spellingCorrect: 0,
  recoveredMistakes: 0,
  selectedTitle: '初入迦南',
  unlockedTitles: [],
  unlockedAchievements: []
}

export const defaultSettings: AppSettings = {
  id: 'app',
  seeded: false,
  theme: 'system',
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
  dailyNewLimit: 20,
  focusBatchSize: 10,
  storagePersistent: null,
  updatedAt: Date.now()
}

export class DoupoEnglishDatabase extends Dexie {
  words!: EntityTable<WordRecord, 'id'>
  reviews!: EntityTable<ReviewLogRecord, 'id'>
  assets!: EntityTable<AssetRecord, 'id'>
  profiles!: EntityTable<PlayerProfile, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  xpEvents!: EntityTable<XpEvent, 'id'>
  rewards!: EntityTable<RewardCard, 'id'>
  snapshots!: EntityTable<RecoverySnapshot, 'id'>

  constructor(name = DATABASE_NAME) {
    super(name)

    this.version(1).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, source, *tags',
      reviews: '++id, wordId, reviewedAt, rating',
      assets: 'id, wordId, kind, createdAt',
      profiles: 'id',
      settings: 'id'
    })

    this.version(2).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, source, *tags',
      reviews: '++id, wordId, reviewedAt, rating, mode, isCorrect',
      assets: 'id, wordId, kind, createdAt',
      profiles: 'id',
      settings: 'id',
      xpEvents: 'id, wordId, kind, createdAt, dayKey',
      rewards: 'id, earnedAt, rarity',
      snapshots: 'id, createdAt'
    }).upgrade(async (transaction) => {
      const profiles = transaction.table<PlayerProfile>('profiles')
      const settings = transaction.table<AppSettings>('settings')
      const profile = await profiles.get('player')
      const appSettings = await settings.get('app')
      if (profile) await profiles.put({ ...defaultProfile, ...profile })
      if (appSettings) await settings.put({ ...defaultSettings, ...appSettings, seeded: true })
    })

    this.version(3).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, isKey, source, chapter, unit, *tags',
      reviews: '++id, wordId, reviewedAt, rating, mode, isCorrect',
      assets: 'id, wordId, kind, accent, createdAt',
      profiles: 'id',
      settings: 'id',
      xpEvents: 'id, wordId, kind, createdAt, dayKey',
      rewards: 'id, earnedAt, rarity',
      snapshots: 'id, createdAt'
    }).upgrade(async (transaction) => {
      await transaction.table<WordRecord>('words').toCollection().modify((word) => {
        Object.assign(word, createWordRecord(word, word.createdAt || Date.now()))
      })
    })
  }
}

export const db = new DoupoEnglishDatabase()

export async function initializeDatabase(database = db) {
  await database.open()
  const [profile, settings, wordCount] = await Promise.all([
    database.profiles.get('player'),
    database.settings.get('app'),
    database.words.count()
  ])
  if (!profile) await database.profiles.put(defaultProfile)
  const effectiveSettings = settings ? { ...defaultSettings, ...settings } : { ...defaultSettings }
  if (!effectiveSettings.seeded) {
    if (wordCount === 0) await database.words.bulkPut(seedWords)
    effectiveSettings.seeded = true
  }
  await database.settings.put({ ...effectiveSettings, updatedAt: Date.now() })
  await requestPersistentStorage(database)
}

export async function requestPersistentStorage(database = db) {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  const persistent = await navigator.storage.persist()
  const settings = (await database.settings.get('app')) || defaultSettings
  await database.settings.put({ ...settings, storagePersistent: persistent, updatedAt: Date.now() })
  return persistent
}

export async function createRecoverySnapshot(reason: string, database = db) {
  const [words, reviews, assets, profile, settings, xpEvents, rewards] = await Promise.all([
    database.words.toArray(),
    database.reviews.toArray(),
    database.assets.toArray(),
    database.profiles.get('player'),
    database.settings.get('app'),
    database.xpEvents.toArray(),
    database.rewards.toArray()
  ])
  const createdAt = Date.now()
  await database.snapshots.put({
    id: `snapshot-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    reason,
    createdAt,
    payload: {
      words,
      reviews,
      assets,
      profile: profile || defaultProfile,
      settings: settings || defaultSettings,
      xpEvents,
      rewards
    }
  })
  const snapshots = await database.snapshots.orderBy('createdAt').reverse().toArray()
  if (snapshots.length > 5) await database.snapshots.bulkDelete(snapshots.slice(5).map((item) => item.id))
}

export async function restoreSnapshot(snapshotId: string, database = db) {
  const snapshot = await database.snapshots.get(snapshotId)
  if (!snapshot) throw new Error('恢复快照不存在')
  await createRecoverySnapshot('恢复前自动保护', database)
  const data = snapshot.payload
  await database.transaction('rw', [
    database.words, database.reviews, database.assets, database.profiles,
    database.settings, database.xpEvents, database.rewards
  ], async () => {
    await Promise.all([
      database.words.clear(), database.reviews.clear(), database.assets.clear(),
      database.profiles.clear(), database.settings.clear(), database.xpEvents.clear(), database.rewards.clear()
    ])
    await database.words.bulkPut(data.words)
    await database.reviews.bulkPut(data.reviews)
    await database.assets.bulkPut(data.assets)
    await database.profiles.put(data.profile)
    await database.settings.put(data.settings)
    await database.xpEvents.bulkPut(data.xpEvents)
    await database.rewards.bulkPut(data.rewards)
  })
}

export async function saveWord(word: WordRecord, assets: AssetRecord[] = [], database = db) {
  await database.transaction('rw', [database.words, database.assets], async () => {
    await database.words.put({ ...word, updatedAt: Date.now() })
    if (assets.length) await database.assets.bulkPut(assets)
  })
  await createRecoverySnapshot('保存单词', database)
}

export async function deleteWords(ids: string[], database = db) {
  if (!ids.length) return
  await createRecoverySnapshot('删除前自动保护', database)
  await database.transaction('rw', [database.words, database.assets], async () => {
    await database.words.bulkDelete(ids)
    const assets = await database.assets.where('wordId').anyOf(ids).primaryKeys()
    await database.assets.bulkDelete(assets as string[])
  })
  await createRecoverySnapshot('删除单词', database)
}

export async function reviewWord(
  wordId: string,
  rating: ReviewRating,
  mode: ReviewMode,
  answer = '',
  database = db,
  now = Date.now()
) {
  const result = await database.transaction('rw', [
    database.words, database.reviews, database.profiles,
    database.xpEvents, database.rewards
  ], async () => {
    const word = await database.words.get(wordId)
    if (!word) throw new Error('单词不存在或已被删除')
    const profile = updateStreak((await database.profiles.get('player')) || defaultProfile, now)
    const existingEvents = await database.xpEvents.where('wordId').equals(word.id).toArray()
    const xp = calculateReviewXp(word, rating, mode, now, existingEvents)
    const dueBefore = word.fsrs.due
    const wasMistake = word.isMistake
    const isStrong = rating === 'good' || rating === 'easy'
    const updatedWord: WordRecord = {
      ...word,
      fsrs: scheduleReview(word.fsrs, rating, new Date(now)),
      firstLearnedAt: word.firstLearnedAt || now,
      lastReviewedAt: now,
      isMistake: rating === 'again' || rating === 'hard' ? true : isStrong ? false : word.isMistake,
      updatedAt: now
    }
    const beforeRealm = getRealmProgress(profile.xp)
    let updatedProfile: PlayerProfile = {
      ...profile,
      xp: profile.xp + xp.total,
      totalReviews: profile.totalReviews + 1,
      totalNewWords: profile.totalNewWords + (word.firstLearnedAt ? 0 : 1),
      spellingCorrect: profile.spellingCorrect + (mode === 'spelling' && isStrong ? 1 : 0),
      recoveredMistakes: profile.recoveredMistakes + (wasMistake && isStrong ? 1 : 0)
    }
    updatedProfile = refreshTitles(updatedProfile)
    const afterRealm = getRealmProgress(updatedProfile.xp)
    let reward: RewardCard | undefined
    if (afterRealm.globalStar > beforeRealm.globalStar || updatedProfile.totalReviews % 50 === 0) {
      reward = {
        id: `reward-${word.id}-${now}`,
        title: afterRealm.globalStar > beforeRealm.globalStar ? `${afterRealm.realm} ${afterRealm.star} 星` : '稳扎稳打',
        description: afterRealm.globalStar > beforeRealm.globalStar ? '星阶突破，长期记忆正在积累。' : '完成 50 次有效复习。',
        rarity: afterRealm.globalStar % 9 === 1 ? 'epic' : 'rare',
        earnedAt: now
      }
      await database.rewards.put(reward)
    }
    await database.words.put(updatedWord)
    if (xp.events.length) await database.xpEvents.bulkPut(xp.events)
    await database.profiles.put(updatedProfile)
    const log: ReviewLogRecord = {
      wordId,
      mode,
      rating,
      reviewedAt: now,
      dueBefore,
      dueAfter: updatedWord.fsrs.due,
      isCorrect: rating === 'good' || rating === 'easy',
      answer,
      xpEarned: xp.total
    }
    await database.reviews.add(log)
    return { word: updatedWord, profile: updatedProfile, xp: xp.total, reward }
  })
  await createRecoverySnapshot('完成复习', database)
  return result
}
