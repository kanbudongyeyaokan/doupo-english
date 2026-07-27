import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DoupoEnglishDatabase, deleteWords, equipStoreItem, initializeDatabase, purchaseStoreItem, recordCompanionInteraction, reviewWord, saveWord } from './db'
import { createWordRecord } from './domain/word'

const databases: DoupoEnglishDatabase[] = []

function makeDb() {
  const database = new DoupoEnglishDatabase(`doupo-english-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (database) => {
    database.close()
    await Dexie.delete(database.name)
  }))
})

describe('DoupoEnglishDatabase', () => {
  it('supports create, edit, search and protected delete', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    const word = createWordRecord({ term: 'verify', meanings: [{ partOfSpeech: 'v.', meanings: ['核实'] }] })
    await saveWord(word, [], database)
    await database.words.update(word.id, { notes: 'test note' })
    const found = await database.words.where('normalizedTerm').equals('verify').first()
    expect(found?.notes).toBe('test note')
    await deleteWords([word.id], database)
    expect(await database.words.get(word.id)).toBeUndefined()
    expect(await database.snapshots.count()).toBeGreaterThan(0)
  })

  it('persists all four review ratings and updates FSRS', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    const word = (await database.words.toArray())[0]
    const before = word.fsrs.due
    const ratings = ['again', 'hard', 'good', 'easy'] as const
    for (let index = 0; index < ratings.length; index += 1) {
      await reviewWord(word.id, ratings[index], 'en-zh', '', database, Date.now() + index * 60000)
    }
    const logs = await database.reviews.where('wordId').equals(word.id).toArray()
    expect(logs.map((log) => log.rating)).toEqual(ratings)
    expect((await database.words.get(word.id))!.fsrs.due).not.toBe(before)
    expect((await database.profiles.get('player'))!.totalReviews).toBe(4)
  })

  it('records mastered words, bond rewards and one companion interaction per day', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    const word = (await database.words.toArray())[0]
    const review = await reviewWord(word.id, 'good', 'spelling', word.term, database, new Date('2026-07-27T08:00:00+08:00').getTime())
    expect(review.newlyMastered).toBe(true)
    expect(review.bondEarned).toBe(3)
    expect(review.profile.masteredWordIds).toContain(word.id)

    const masteredWordIds = Array.from({ length: 100 }, (_, index) => `word-${index}`)
    await database.profiles.update('player', { masteredWordIds })
    const first = await recordCompanionInteraction(database, new Date('2026-07-27T12:00:00+08:00').getTime())
    const repeated = await recordCompanionInteraction(database, new Date('2026-07-27T20:00:00+08:00').getTime())
    expect(first.bondEarned).toBe(5)
    expect(repeated.bondEarned).toBe(0)
    expect(repeated.profile.companionInteractions).toBe(1)
  })

  it('awards anti-farm spirit stones and persists store purchases and equipment', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    const word = (await database.words.toArray())[0]
    const now = new Date('2026-07-27T08:00:00+08:00').getTime()
    const first = await reviewWord(word.id, 'good', 'spelling', word.term, database, now)
    const repeated = await reviewWord(word.id, 'easy', 'spelling', word.term, database, now + 60_000)
    expect(first.spiritStones).toBeGreaterThan(0)
    expect(repeated.spiritStones).toBe(0)
    expect(await database.spiritStoneEvents.where('wordId').equals(word.id).count()).toBeGreaterThan(0)

    await database.profiles.update('player', { spiritStones: 500, lifetimeSpiritStones: 500 })
    const purchase = await purchaseStoreItem('ember-robe', database, now + 120_000)
    expect(purchase.purchased).toBe(true)
    await equipStoreItem('ember-robe', database)
    const profile = await database.profiles.get('player')
    expect(profile?.inventoryItemIds).toContain('ember-robe')
    expect(profile?.equippedItemIds).toContain('ember-robe')
    expect(profile?.equippedItemIds).not.toContain('novice-robe')
  })

  it('migrates a v1 database without changing its name', async () => {
    const name = `doupo-english-migration-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      words: 'id, normalizedTerm', reviews: '++id, wordId', assets: 'id, wordId', profiles: 'id', settings: 'id'
    })
    await legacy.open()
    await legacy.table('words').put(createWordRecord({ term: 'legacy' }))
    await legacy.table('profiles').put({ id: 'player', xp: 15, unlockedTitles: [], unlockedAchievements: [] })
    legacy.close()

    const upgraded = new DoupoEnglishDatabase(name)
    databases.push(upgraded)
    await upgraded.open()
    expect(upgraded.verno).toBe(5)
    expect((await upgraded.words.get(createWordRecord({ term: 'legacy' }).id))?.imageIds).toEqual([])
    expect((await upgraded.profiles.get('player'))?.name).toBe('何耀焜')
    expect((await upgraded.profiles.get('player'))?.masteredWordIds).toEqual([])
    expect((await upgraded.profiles.get('player'))?.spiritStones).toBe(0)
    expect((await upgraded.profiles.get('player'))?.inventoryItemIds).toContain('novice-robe')
  })
})
