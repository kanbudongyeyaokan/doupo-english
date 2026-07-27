import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DoupoEnglishDatabase, deleteWords, initializeDatabase, reviewWord, saveWord } from './db'
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

  it('migrates a v1 database without changing its name', async () => {
    const name = `doupo-english-migration-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      words: 'id, normalizedTerm', reviews: '++id, wordId', assets: 'id, wordId', profiles: 'id', settings: 'id'
    })
    await legacy.open()
    await legacy.table('words').put(createWordRecord({ term: 'legacy' }))
    legacy.close()

    const upgraded = new DoupoEnglishDatabase(name)
    databases.push(upgraded)
    await upgraded.open()
    expect(upgraded.verno).toBe(3)
    expect((await upgraded.words.get(createWordRecord({ term: 'legacy' }).id))?.imageIds).toEqual([])
  })
})

