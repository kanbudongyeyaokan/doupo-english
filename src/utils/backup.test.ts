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

  it('refreshes corrected source content without resetting learning state or user flags', async () => {
    const database = makeDb()
    await initializeDatabase(database)
    await database.words.clear()
    const original = createWordRecord({
      term: 'largely',
      source: 'private redbook',
      meanings: [{ partOfSpeech: 'adv.', meanings: ['OCR 旧释义'] }],
      examples: [{ english: 'This country is largelyed esert.', chinese: '旧例句' }],
      notes: 'OCR平均置信度 99.0%；音标待核对、释义待核对。待核对原始页：书页1（PDF 9）\n我的本地笔记',
      tags: ['红宝书私人导入', 'OCR扫描导入', '音标待核对', '释义待核对', '自定义标签'],
      isFavorite: true,
      firstLearnedAt: 1000,
      fsrs: { due: 5000, stability: 2, difficulty: 3, elapsed_days: 1, scheduled_days: 2, learning_steps: 0, reps: 4, lapses: 0, state: 2 }
    })
    await database.words.put(original)
    const corrected = createWordRecord({
      term: 'largely',
      source: 'private redbook',
      sourceOrder: 2,
      meanings: [{ partOfSpeech: 'adv.', meanings: ['大量地，大规模地', '主要地，基本上'] }],
      examples: [{ english: 'This country is largely desert.', chinese: '这个国家大部分都是沙漠。' }],
      notes: '教材页已人工校对',
      tags: ['红宝书私人导入', '人工校对']
    })
    const pkg: VocabularyPackage = {
      format: 'doupo-english-vocabulary',
      schemaVersion: 1,
      batch: { source: 'private redbook', chapters: ['必考词'], units: ['Unit 1'], updateStrategy: 'source-authoritative' },
      words: [corrected]
    }

    await importPackage(pkg, 'merge', database)
    const refreshed = await database.words.get(original.id)
    expect(refreshed?.examples.map((item) => item.english)).toEqual(['This country is largely desert.'])
    expect(refreshed?.meanings[0].meanings).not.toContain('OCR 旧释义')
    expect(refreshed?.sourceOrder).toBe(2)
    expect(refreshed?.isFavorite).toBe(true)
    expect(refreshed?.firstLearnedAt).toBe(1000)
    expect(refreshed?.fsrs).toEqual(original.fsrs)
    expect(refreshed?.notes).toContain('我的本地笔记')
    expect(refreshed?.notes).toContain('教材页已人工校对')
    expect(refreshed?.notes).not.toContain('OCR平均置信度')
    expect(refreshed?.tags).toContain('自定义标签')
    expect(refreshed?.tags).toContain('人工校对')
    expect(refreshed?.tags).not.toContain('OCR扫描导入')
    expect(refreshed?.tags).not.toContain('音标待核对')
    expect(refreshed?.tags).not.toContain('释义待核对')
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
