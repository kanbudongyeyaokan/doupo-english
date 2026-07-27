import Dexie, { type EntityTable } from 'dexie'
import {
  calculateBondReward,
  getCompanionDialogue,
  getCompanionProgress,
  getMasteredCount,
  inferMasteredWordIds
} from './domain/companion'
import {
  calculateSpiritStoneReward,
  DEFAULT_EQUIPPED,
  DEFAULT_INVENTORY,
  equipByCategory,
  getStoreItem
} from './domain/economy'
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
  SpiritStoneEvent,
  WordRecord,
  XpEvent
} from './types'

export const DATABASE_NAME = 'doupo-english-private-vault-v1'
const DEMO_WORD_SOURCE = '斗破英语原创示例词库'

export const defaultProfile: PlayerProfile = {
  id: 'player',
  name: '何耀焜',
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
  unlockedAchievements: [],
  masteredWordIds: [],
  companionBond: 0,
  companionInteractions: 0,
  lastCompanionInteractionDate: '',
  spiritStones: 0,
  lifetimeSpiritStones: 0,
  inventoryItemIds: DEFAULT_INVENTORY,
  equippedItemIds: DEFAULT_EQUIPPED
}

export function normalizePlayerProfile(profile?: Partial<PlayerProfile>, inferredMasteredWordIds: string[] = []): PlayerProfile {
  return {
    ...defaultProfile,
    ...profile,
    name: profile?.name || defaultProfile.name,
    unlockedTitles: Array.isArray(profile?.unlockedTitles) ? profile.unlockedTitles : [],
    unlockedAchievements: Array.isArray(profile?.unlockedAchievements) ? profile.unlockedAchievements : [],
    masteredWordIds: [...new Set([
      ...(Array.isArray(profile?.masteredWordIds) ? profile.masteredWordIds : []),
      ...inferredMasteredWordIds
    ])],
    companionBond: profile?.companionBond ?? 0,
    companionInteractions: profile?.companionInteractions ?? 0,
    lastCompanionInteractionDate: profile?.lastCompanionInteractionDate || '',
    spiritStones: profile?.spiritStones ?? 0,
    lifetimeSpiritStones: profile?.lifetimeSpiritStones ?? profile?.spiritStones ?? 0,
    inventoryItemIds: [...new Set([
      ...DEFAULT_INVENTORY,
      ...(Array.isArray(profile?.inventoryItemIds) ? profile.inventoryItemIds : [])
    ])],
    equippedItemIds: Array.isArray(profile?.equippedItemIds) && profile.equippedItemIds.length
      ? profile.equippedItemIds
      : DEFAULT_EQUIPPED
  }
}

export const defaultSettings: AppSettings = {
  id: 'app',
  seeded: true,
  selectedChapter: '',
  selectedUnit: '',
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
  spiritStoneEvents!: EntityTable<SpiritStoneEvent, 'id'>
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
      if (profile) await profiles.put(normalizePlayerProfile(profile))
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

    this.version(4).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, isKey, source, chapter, unit, *tags',
      reviews: '++id, wordId, reviewedAt, rating, mode, isCorrect',
      assets: 'id, wordId, kind, accent, createdAt',
      profiles: 'id',
      settings: 'id',
      xpEvents: 'id, wordId, kind, createdAt, dayKey',
      rewards: 'id, earnedAt, rarity',
      snapshots: 'id, createdAt'
    }).upgrade(async (transaction) => {
      const profiles = transaction.table<PlayerProfile>('profiles')
      const words = await transaction.table<WordRecord>('words').toArray()
      const profile = await profiles.get('player')
      if (profile) await profiles.put(normalizePlayerProfile(profile, inferMasteredWordIds(words)))
    })

    this.version(5).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, isKey, source, chapter, unit, *tags',
      reviews: '++id, wordId, reviewedAt, rating, mode, isCorrect',
      assets: 'id, wordId, kind, accent, createdAt',
      profiles: 'id',
      settings: 'id',
      xpEvents: 'id, wordId, kind, createdAt, dayKey',
      spiritStoneEvents: 'id, wordId, itemId, kind, createdAt, dayKey',
      rewards: 'id, earnedAt, rarity',
      snapshots: 'id, createdAt'
    }).upgrade(async (transaction) => {
      const profiles = transaction.table<PlayerProfile>('profiles')
      const profile = await profiles.get('player')
      if (profile) await profiles.put(normalizePlayerProfile(profile))
    })

    this.version(6).stores({
      words: 'id, normalizedTerm, fsrs.due, isMistake, isFavorite, isKey, source, chapter, unit, *tags',
      reviews: '++id, wordId, reviewedAt, rating, mode, isCorrect',
      assets: 'id, wordId, kind, accent, createdAt',
      profiles: 'id',
      settings: 'id',
      xpEvents: 'id, wordId, kind, createdAt, dayKey',
      spiritStoneEvents: 'id, wordId, itemId, kind, createdAt, dayKey',
      rewards: 'id, earnedAt, rarity',
      snapshots: 'id, createdAt'
    }).upgrade(async (transaction) => {
      const words = transaction.table<WordRecord>('words')
      const profiles = transaction.table<PlayerProfile>('profiles')
      const settings = transaction.table<AppSettings>('settings')
      const demoWords = await words.where('source').equals(DEMO_WORD_SOURCE).toArray()
      const demoIds = new Set(demoWords.map((word) => word.id))
      if (demoIds.size) await words.bulkDelete([...demoIds])

      const profile = await profiles.get('player')
      if (profile) {
        const normalized = normalizePlayerProfile(profile)
        await profiles.put({
          ...normalized,
          masteredWordIds: normalized.masteredWordIds.filter((id) => !demoIds.has(id))
        })
      }
      const appSettings = await settings.get('app')
      if (appSettings) await settings.put({ ...defaultSettings, ...appSettings, seeded: true })
    })
  }
}

export const db = new DoupoEnglishDatabase()

export async function initializeDatabase(database = db) {
  await database.open()
  const [profile, settings] = await Promise.all([
    database.profiles.get('player'),
    database.settings.get('app')
  ])
  if (!profile) await database.profiles.put(defaultProfile)
  else await database.profiles.put(normalizePlayerProfile(profile))
  const effectiveSettings = settings ? { ...defaultSettings, ...settings } : { ...defaultSettings }
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
  const [words, reviews, assets, profile, settings, xpEvents, spiritStoneEvents, rewards] = await Promise.all([
    database.words.toArray(),
    database.reviews.toArray(),
    database.assets.toArray(),
    database.profiles.get('player'),
    database.settings.get('app'),
    database.xpEvents.toArray(),
    database.spiritStoneEvents.toArray(),
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
      profile: normalizePlayerProfile(profile),
      settings: settings || defaultSettings,
      xpEvents,
      spiritStoneEvents,
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
    database.settings, database.xpEvents, database.spiritStoneEvents, database.rewards
  ], async () => {
    await Promise.all([
      database.words.clear(), database.reviews.clear(), database.assets.clear(),
      database.profiles.clear(), database.settings.clear(), database.xpEvents.clear(),
      database.spiritStoneEvents.clear(), database.rewards.clear()
    ])
    await database.words.bulkPut(data.words)
    await database.reviews.bulkPut(data.reviews)
    await database.assets.bulkPut(data.assets)
    await database.profiles.put(normalizePlayerProfile(data.profile))
    await database.settings.put(data.settings)
    await database.xpEvents.bulkPut(data.xpEvents)
    await database.spiritStoneEvents.bulkPut(data.spiritStoneEvents || [])
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
    database.xpEvents, database.spiritStoneEvents, database.rewards
  ], async () => {
    const word = await database.words.get(wordId)
    if (!word) throw new Error('单词不存在或已被删除')
    const profile = updateStreak(normalizePlayerProfile(await database.profiles.get('player')), now)
    const existingEvents = await database.xpEvents.where('wordId').equals(word.id).toArray()
    const existingStoneEvents = await database.spiritStoneEvents.where('wordId').equals(word.id).toArray()
    const xp = calculateReviewXp(word, rating, mode, now, existingEvents)
    const dueBefore = word.fsrs.due
    const wasMistake = word.isMistake
    const isStrong = rating === 'good' || rating === 'easy'
    const newlyMastered = isStrong && !profile.masteredWordIds.includes(word.id)
    const masteredWordIds = newlyMastered ? [...profile.masteredWordIds, word.id] : profile.masteredWordIds
    const bondEarned = calculateBondReward(rating, mode, xp.total, newlyMastered)
    const stones = calculateSpiritStoneReward({
      word,
      rating,
      mode,
      now,
      xpAwarded: xp.total,
      newlyMastered,
      wasMistake,
      existingEvents: existingStoneEvents
    })
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
      recoveredMistakes: profile.recoveredMistakes + (wasMistake && isStrong ? 1 : 0),
      masteredWordIds,
      companionBond: profile.companionBond + bondEarned,
      spiritStones: profile.spiritStones + stones.total,
      lifetimeSpiritStones: profile.lifetimeSpiritStones + stones.total
    }
    updatedProfile = refreshTitles(updatedProfile)
    const afterRealm = getRealmProgress(updatedProfile.xp)
    const beforeCompanion = getCompanionProgress(getMasteredCount(profile))
    const afterCompanion = getCompanionProgress(getMasteredCount(updatedProfile))
    let reward: RewardCard | undefined
    if (afterCompanion.current.id !== beforeCompanion.current.id) {
      reward = {
        id: `reward-companion-${afterCompanion.current.id}-${now}`,
        title: `${afterCompanion.current.relation} · ${afterCompanion.current.keepsake}`,
        description: afterCompanion.current.title,
        rarity: afterCompanion.isGirlfriendUnlocked ? 'epic' : 'rare',
        earnedAt: now
      }
      await database.rewards.put(reward)
    } else if (afterRealm.globalStar > beforeRealm.globalStar || updatedProfile.totalReviews % 50 === 0) {
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
    if (stones.events.length) await database.spiritStoneEvents.bulkPut(stones.events)
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
      xpEarned: xp.total,
      bondEarned,
      spiritStonesEarned: stones.total
    }
    await database.reviews.add(log)
    return { word: updatedWord, profile: updatedProfile, xp: xp.total, bondEarned, spiritStones: stones.total, newlyMastered, reward }
  })
  return result
}

export async function recordCompanionInteraction(database = db, now = Date.now()) {
  const result = await database.transaction('rw', database.profiles, async () => {
    const profile = normalizePlayerProfile(await database.profiles.get('player'))
    const progress = getCompanionProgress(getMasteredCount(profile))
    if (!progress.isGirlfriendUnlocked) throw new Error(`累计掌握 100 个词后才能解锁知夏的女朋友剧情`)
    const today = new Date(now)
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const alreadyInteracted = profile.lastCompanionInteractionDate === dateKey
    const nextProfile = alreadyInteracted ? profile : {
      ...profile,
      companionBond: profile.companionBond + 5,
      companionInteractions: profile.companionInteractions + 1,
      lastCompanionInteractionDate: dateKey
    }
    if (!alreadyInteracted) await database.profiles.put(nextProfile)
    return {
      profile: nextProfile,
      bondEarned: alreadyInteracted ? 0 : 5,
      message: getCompanionDialogue(nextProfile, 'interaction')
    }
  })
  if (result.bondEarned > 0) await createRecoverySnapshot('知夏每日互动', database)
  return result
}

export async function purchaseStoreItem(itemId: string, database = db, now = Date.now()) {
  const item = getStoreItem(itemId)
  if (!item) throw new Error('商城物品不存在')
  const result = await database.transaction('rw', [database.profiles, database.spiritStoneEvents], async () => {
    const profile = normalizePlayerProfile(await database.profiles.get('player'))
    if (profile.inventoryItemIds.includes(item.id)) return { profile, item, purchased: false }
    if (profile.spiritStones < item.price) throw new Error(`还差 ${item.price - profile.spiritStones} 枚灵石`)
    const nextProfile = refreshTitles({
      ...profile,
      spiritStones: profile.spiritStones - item.price,
      inventoryItemIds: [...profile.inventoryItemIds, item.id]
    })
    await database.profiles.put(nextProfile)
    const event: SpiritStoneEvent = {
      id: `stone:purchase:${item.id}:${now}`,
      itemId: item.id,
      kind: 'purchase',
      amount: -item.price,
      createdAt: now,
      dayKey: new Date(now).toISOString().slice(0, 10)
    }
    await database.spiritStoneEvents.put(event)
    return { profile: nextProfile, item, purchased: true }
  })
  if (result.purchased) await createRecoverySnapshot(`购买装扮：${result.item.name}`, database)
  return result
}

export async function equipStoreItem(itemId: string, database = db) {
  const item = getStoreItem(itemId)
  if (!item) throw new Error('装扮不存在')
  const profile = normalizePlayerProfile(await database.profiles.get('player'))
  if (!profile.inventoryItemIds.includes(item.id)) throw new Error('请先购买这件装扮')
  const nextProfile = { ...profile, equippedItemIds: equipByCategory(profile.equippedItemIds, item.id) }
  await database.profiles.put(nextProfile)
  await createRecoverySnapshot(`装备装扮：${item.name}`, database)
  return { profile: nextProfile, item }
}
