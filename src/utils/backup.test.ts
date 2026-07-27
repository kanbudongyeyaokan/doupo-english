import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DoupoEnglishDatabase, initializeDatabase, reviewWord } from '../db'
import { createWordRecord } from '../domain/word'
import type { VocabularyPackage } from '../types'
import { createBackupPackage, importPackage, parseWordsCsv, wordsToCsv } from './backup'

const databases: DoupoEnglishDatabase[] = []
function makeDb() {
  const database = new DoupoEnglishDatabase(`doupo-english-backup-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (database) => {
    database.close()
    await Dexie.delete(database.name)
  }))
})

describe('backup and import', () => {
  it('deduplicates repeated stable-id imports', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    await database.words.clear()
    const word = createWordRecord({ term: 'merge', source: 'private batch', tags: ['batch-1'] })
    const pkg: VocabularyPackage = { format: 'doupo-english-vocabulary', schemaVersion: 1, words: [word] }
    await importPackage(pkg, 'merge', database)
    const snapshotsAfterFirstImport = await database.snapshots.count()
    await importPackage(pkg, 'merge', database)
    expect(await database.words.count()).toBe(1)
    expect(await database.snapshots.count()).toBe(snapshotsAfterFirstImport)
  })

  it('restores words, review logs and binary assets from a full JSON package', async () => {
    const source = makeDb()
    await initializeDatabase(source)
    const word = createWordRecord({
      term: 'restore',
      meanings: [{ partOfSpeech: 'v.', meanings: ['恢复'] }],
      examples: [{ english: 'A backup can restore the record.', chinese: '备份可以恢复记录。' }]
    })
    await source.words.put(word)
    const blob = new Blob(['image-bytes'], { type: 'image/png' })
    const assetId = `asset-${word.id}`
    await source.assets.put({ id: assetId, wordId: word.id, kind: 'image', name: 'page.png', mimeType: 'image/png', blob, createdAt: Date.now() })
    await source.words.update(word.id, { imageIds: [assetId] })
    await reviewWord(word.id, 'good', 'spelling', word.term, source)
    const backup = await createBackupPackage(source)
    expect(backup.schemaVersion).toBe(5)
    expect(backup.payload.profile.masteredWordIds).toContain(word.id)
    expect(backup.payload.spiritStoneEvents.length).toBeGreaterThan(0)

    const target = makeDb()
    await initializeDatabase(target)
    await importPackage(backup, 'replace', target)
    expect(await target.words.count()).toBe(await source.words.count())
    expect(await target.reviews.count()).toBe(1)
    const restoredAsset = await target.assets.get(assetId)
    expect(await restoredAsset?.blob.text()).toBe('image-bytes')
    expect((await target.words.get(word.id))?.imageIds).toContain(assetId)
    expect((await target.profiles.get('player'))?.companionBond).toBeGreaterThan(0)
    expect((await target.profiles.get('player'))?.spiritStones).toBeGreaterThan(0)
    expect(await target.spiritStoneEvents.count()).toBe(backup.payload.spiritStoneEvents.length)
  })

  it('round-trips core word fields through CSV', () => {
    const words = [createWordRecord({ term: 'export', meanings: [{ partOfSpeech: 'v.', meanings: ['导出'] }], tags: ['test'], source: 'private' })]
    const parsed = parseWordsCsv(wordsToCsv(words))
    expect(parsed[0].term).toBe('export')
    expect(parsed[0].meanings[0].meanings).toContain('导出')
    expect(parsed[0].tags).toContain('test')
  })
})
