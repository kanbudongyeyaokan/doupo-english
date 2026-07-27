import Papa from 'papaparse'
import { db, defaultSettings, type DoupoEnglishDatabase, createRecoverySnapshot, normalizePlayerProfile } from '../db'
import { createWordRecord, mergeWord, mergeWordLearningState, refreshWordFromSource } from '../domain/word'
import type {
  BackupPackage,
  ImportPreview,
  SerializableAsset,
  SnapshotPayload,
  VocabularyPackage,
  WordRecord
} from '../types'

export const APP_VERSION = '0.4.3'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

export async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return `data:${blob.type || 'application/octet-stream'};base64,${bytesToBase64(bytes)}`
}

export function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) throw new Error('备份中包含无效的资源数据')
  const mimeType = match[1] || 'application/octet-stream'
  const binary = match[2] ? atob(match[3]) : decodeURIComponent(match[3])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mimeType })
}

export async function collectSnapshotPayload(database: DoupoEnglishDatabase = db): Promise<SnapshotPayload> {
  const [words, reviews, assets, profile, settings, xpEvents, spiritStoneEvents, rewards] = await Promise.all([
    database.words.toArray(), database.reviews.toArray(), database.assets.toArray(),
    database.profiles.get('player'), database.settings.get('app'), database.xpEvents.toArray(),
    database.spiritStoneEvents.toArray(), database.rewards.toArray()
  ])
  return {
    words,
    reviews,
    assets,
    profile: normalizePlayerProfile(profile),
    settings: settings || defaultSettings,
    xpEvents,
    spiritStoneEvents,
    rewards
  }
}

export async function createBackupPackage(database: DoupoEnglishDatabase = db): Promise<BackupPackage> {
  const payload = await collectSnapshotPayload(database)
  const assets: SerializableAsset[] = await Promise.all(payload.assets.map(async ({ blob, ...asset }) => ({
    ...asset,
    dataUrl: await blobToDataUrl(blob)
  })))
  return {
    format: 'doupo-english-backup',
    schemaVersion: 5,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    payload: { ...payload, assets }
  }
}

export async function exportBackup(database: DoupoEnglishDatabase = db) {
  const backup = await createBackupPackage(database)
  const settings = (await database.settings.get('app')) || defaultSettings
  await database.settings.put({ ...settings, lastExternalBackupAt: Date.now(), updatedAt: Date.now() })
  downloadText(JSON.stringify(backup, null, 2), `斗破英语-完整备份-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
}

export function parseImportText(text: string): BackupPackage | VocabularyPackage {
  const parsed = JSON.parse(text) as BackupPackage | VocabularyPackage
  if (!parsed || (parsed.format !== 'doupo-english-backup' && parsed.format !== 'doupo-english-vocabulary')) {
    throw new Error('不是有效的斗破英语备份包或词库包')
  }
  if (parsed.format === 'doupo-english-backup' && parsed.schemaVersion > 5) throw new Error('备份版本高于当前应用，请先升级应用')
  return parsed
}

function incomingWords(data: BackupPackage | VocabularyPackage) {
  const words = data.format === 'doupo-english-backup' ? data.payload.words : data.words
  return words.map((word) => createWordRecord(word, word.createdAt || Date.now()))
}

function incomingReplacements(data: BackupPackage | VocabularyPackage, words: WordRecord[]) {
  if (data.format !== 'doupo-english-vocabulary' || !data.wordReplacements?.length) return []
  if (data.batch?.updateStrategy !== 'source-authoritative') {
    throw new Error('词条归并只允许用于来源权威的人工校订包')
  }
  const incomingIds = new Set(words.map((word) => word.id))
  const seenFromIds = new Set<string>()
  return data.wordReplacements.map((replacement) => {
    const fromId = replacement?.fromId?.trim()
    const toId = replacement?.toId?.trim()
    if (!fromId || !toId || fromId === toId) throw new Error('词条归并包含无效的稳定 ID')
    if (seenFromIds.has(fromId)) throw new Error(`词条归并重复指定旧 ID：${fromId}`)
    if (incomingIds.has(fromId)) throw new Error(`待归并的旧 ID 仍存在于传入词条中：${fromId}`)
    if (!incomingIds.has(toId)) throw new Error(`词条归并目标不在传入词条中：${toId}`)
    seenFromIds.add(fromId)
    return { fromId, toId }
  })
}

function sameWordContent(left: WordRecord, right: WordRecord) {
  return JSON.stringify({ ...left, updatedAt: 0 }) === JSON.stringify({ ...right, updatedAt: 0 })
}

export async function previewImport(data: BackupPackage | VocabularyPackage, database: DoupoEnglishDatabase = db): Promise<ImportPreview> {
  const words = incomingWords(data)
  const replacements = incomingReplacements(data, words)
  const [local, legacyWords] = await Promise.all([
    database.words.bulkGet(words.map((word) => word.id)),
    database.words.bulkGet(replacements.map((replacement) => replacement.fromId))
  ])
  const conflictWords: ImportPreview['conflictWords'] = []
  let unchanged = 0
  words.forEach((word, index) => {
    const localWord = local[index]
    if (!localWord) return
    const same = sameWordContent(localWord, word)
    if (same) unchanged += 1
    else conflictWords.push({ id: word.id, local: localWord.term, incoming: word.term })
  })
  const incomingById = new Map(words.map((word) => [word.id, word]))
  const replacementWords = replacements.flatMap((replacement, index) => {
    const legacy = legacyWords[index]
    const target = incomingById.get(replacement.toId)
    return legacy && target ? [{ ...replacement, from: legacy.term, to: target.term }] : []
  })
  return {
    kind: data.format === 'doupo-english-backup' ? 'backup' : 'vocabulary',
    incoming: words.length,
    newWords: words.length - local.filter(Boolean).length,
    conflicts: conflictWords.length,
    unchanged,
    conflictWords: conflictWords.slice(0, 20),
    replacements: replacementWords.length,
    replacementWords: replacementWords.slice(0, 20)
  }
}

function deserializeAssets(assets: SerializableAsset[]) {
  return assets.map(({ dataUrl, ...asset }) => ({ ...asset, blob: dataUrlToBlob(dataUrl) }))
}

export async function importPackage(
  data: BackupPackage | VocabularyPackage,
  mode: 'merge' | 'replace',
  database: DoupoEnglishDatabase = db
) {
  const words = incomingWords(data)
  const replacements = incomingReplacements(data, words)
  let local: Array<WordRecord | undefined> | undefined
  let legacyWords: Array<WordRecord | undefined> = []
  if (mode === 'merge') {
    [local, legacyWords] = await Promise.all([
      database.words.bulkGet(words.map((word) => word.id)),
      database.words.bulkGet(replacements.map((replacement) => replacement.fromId))
    ])
    const vocabularyIsUnchanged = data.format === 'doupo-english-vocabulary'
      && local.every((localWord, index) => localWord && sameWordContent(localWord, words[index]))
      && legacyWords.every((legacyWord) => !legacyWord)
    if (vocabularyIsUnchanged) return { importedWords: words.length, replacedWords: 0, mode, unchanged: true }
  }

  await createRecoverySnapshot(`导入前保护（${mode === 'merge' ? '合并' : '覆盖'}）`, database)
  if (mode === 'replace') {
    if (data.format !== 'doupo-english-backup') throw new Error('覆盖恢复只接受完整 JSON 备份')
    const assets = deserializeAssets(data.payload.assets)
    await database.transaction('rw', [
      database.words, database.reviews, database.assets, database.profiles,
      database.settings, database.xpEvents, database.spiritStoneEvents, database.rewards
    ], async () => {
      await Promise.all([
        database.words.clear(), database.reviews.clear(), database.assets.clear(),
        database.profiles.clear(), database.settings.clear(), database.xpEvents.clear(),
        database.spiritStoneEvents.clear(), database.rewards.clear()
      ])
      await database.words.bulkPut(words)
      await database.reviews.bulkPut(data.payload.reviews)
      await database.assets.bulkPut(assets)
      await database.profiles.put(normalizePlayerProfile(data.payload.profile))
      await database.settings.put({ ...defaultSettings, ...data.payload.settings, seeded: true, updatedAt: Date.now() })
      await database.xpEvents.bulkPut(data.payload.xpEvents)
      await database.spiritStoneEvents.bulkPut(data.payload.spiritStoneEvents || [])
      await database.rewards.bulkPut(data.payload.rewards)
    })
  } else {
    const sourceAuthoritative = data.format === 'doupo-english-vocabulary'
      && data.batch?.updateStrategy === 'source-authoritative'
    const legacyByTarget = new Map<string, WordRecord[]>()
    replacements.forEach((replacement, index) => {
      const legacy = legacyWords[index]
      if (!legacy) return
      legacyByTarget.set(replacement.toId, [...(legacyByTarget.get(replacement.toId) || []), legacy])
    })
    const merged = words.map((word, index) => {
      let localWord = local![index]
      for (const legacy of legacyByTarget.get(word.id) || []) {
        localWord = mergeWordLearningState(localWord || word, legacy)
      }
      if (!localWord) return word
      return sourceAuthoritative ? refreshWordFromSource(localWord, word) : mergeWord(localWord, word)
    })
    const activeReplacements = replacements.filter((_replacement, index) => Boolean(legacyWords[index]))
    if (activeReplacements.length) {
      await database.transaction('rw', [
        database.words, database.reviews, database.assets, database.profiles,
        database.xpEvents, database.spiritStoneEvents
      ], async () => {
        await database.words.bulkPut(merged)
        for (const replacement of activeReplacements) {
          await database.reviews.where('wordId').equals(replacement.fromId).modify({ wordId: replacement.toId })
          await database.assets.where('wordId').equals(replacement.fromId).modify({ wordId: replacement.toId })
          await database.xpEvents.where('wordId').equals(replacement.fromId).modify({ wordId: replacement.toId })
          await database.spiritStoneEvents.where('wordId').equals(replacement.fromId).modify({ wordId: replacement.toId })
        }
        const profile = normalizePlayerProfile(await database.profiles.get('player'))
        const replacementMap = new Map(activeReplacements.map((replacement) => [replacement.fromId, replacement.toId]))
        await database.profiles.put({
          ...profile,
          masteredWordIds: [...new Set(profile.masteredWordIds.map((id) => replacementMap.get(id) || id))]
        })
        await database.words.bulkDelete(activeReplacements.map((replacement) => replacement.fromId))
      })
    } else {
      await database.words.bulkPut(merged)
    }
    if (data.format === 'doupo-english-backup') {
      const assets = deserializeAssets(data.payload.assets)
      await database.assets.bulkPut(assets)
      const reviewKeys = new Set((await database.reviews.toArray()).map((item) => `${item.wordId}:${item.reviewedAt}:${item.mode}`))
      const newReviews = data.payload.reviews.filter((item) => !reviewKeys.has(`${item.wordId}:${item.reviewedAt}:${item.mode}`))
      if (newReviews.length) await database.reviews.bulkAdd(newReviews.map(({ id: _id, ...item }) => item))
      await database.xpEvents.bulkPut(data.payload.xpEvents)
      await database.spiritStoneEvents.bulkPut(data.payload.spiritStoneEvents || [])
      await database.rewards.bulkPut(data.payload.rewards)
      const localProfile = normalizePlayerProfile(await database.profiles.get('player'))
      const incomingProfile = normalizePlayerProfile(data.payload.profile)
      await database.profiles.put({
        ...localProfile,
        xp: Math.max(localProfile.xp, incomingProfile.xp),
        streak: Math.max(localProfile.streak, incomingProfile.streak),
        longestStreak: Math.max(localProfile.longestStreak, incomingProfile.longestStreak),
        totalReviews: Math.max(localProfile.totalReviews, incomingProfile.totalReviews),
        totalNewWords: Math.max(localProfile.totalNewWords, incomingProfile.totalNewWords),
        spellingCorrect: Math.max(localProfile.spellingCorrect, incomingProfile.spellingCorrect),
        recoveredMistakes: Math.max(localProfile.recoveredMistakes, incomingProfile.recoveredMistakes),
        companionBond: Math.max(localProfile.companionBond, incomingProfile.companionBond),
        companionInteractions: Math.max(localProfile.companionInteractions, incomingProfile.companionInteractions),
        spiritStones: Math.max(localProfile.spiritStones, incomingProfile.spiritStones),
        lifetimeSpiritStones: Math.max(localProfile.lifetimeSpiritStones, incomingProfile.lifetimeSpiritStones),
        inventoryItemIds: [...new Set([...localProfile.inventoryItemIds, ...incomingProfile.inventoryItemIds])],
        equippedItemIds: incomingProfile.equippedItemIds.length ? incomingProfile.equippedItemIds : localProfile.equippedItemIds,
        lastCompanionInteractionDate: [localProfile.lastCompanionInteractionDate, incomingProfile.lastCompanionInteractionDate].sort().at(-1) || '',
        masteredWordIds: [...new Set([...localProfile.masteredWordIds, ...incomingProfile.masteredWordIds])],
        unlockedTitles: [...new Set([...localProfile.unlockedTitles, ...incomingProfile.unlockedTitles])],
        unlockedAchievements: [...new Set([...localProfile.unlockedAchievements, ...incomingProfile.unlockedAchievements])]
      })
    }
  }
  return { importedWords: words.length, replacedWords: legacyWords.filter(Boolean).length, mode, unchanged: false }
}

function parseList(value: unknown) {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  const text = String(value).trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // Fall through to the human-friendly separator format.
  }
  return text.split(/[|；;]/).map((item) => item.trim()).filter(Boolean)
}

export function parseWordsCsv(csv: string) {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  if (result.errors.length) throw new Error(`CSV 解析失败：${result.errors[0].message}`)
  return result.data.map((row) => createWordRecord({
    term: row.term || row.word || '',
    phonetic: row.phonetic || '',
    britishPhonetic: row.britishPhonetic || '',
    americanPhonetic: row.americanPhonetic || '',
    meanings: [{ partOfSpeech: row.partOfSpeech || row.pos || '', meanings: parseList(row.meanings || row.meaning) }],
    familiarMeanings: parseList(row.familiarMeanings),
    collocations: parseList(row.collocations), derivatives: parseList(row.derivatives), roots: parseList(row.roots),
    synonyms: parseList(row.synonyms), confusables: parseList(row.confusables),
    examples: row.example ? [{ english: row.example, chinese: row.exampleTranslation || '' }] : [],
    memoryTip: row.memoryTip || '', source: row.source || 'CSV 导入', chapter: row.chapter || '', unit: row.unit || '', page: row.page || '',
    notes: row.notes || '', tags: parseList(row.tags), isKey: row.isKey === 'true' || row.isKey === '1'
  })).filter((word) => word.term)
}

export function wordsToCsv(words: WordRecord[]) {
  return Papa.unparse(words.map((word) => ({
    term: word.term,
    phonetic: word.phonetic,
    britishPhonetic: word.britishPhonetic || '',
    americanPhonetic: word.americanPhonetic || '',
    partOfSpeech: word.meanings.map((item) => item.partOfSpeech).join('|'),
    meanings: word.meanings.flatMap((item) => item.meanings).join('|'),
    familiarMeanings: word.familiarMeanings.join('|'),
    collocations: word.collocations.join('|'), derivatives: word.derivatives.join('|'), roots: word.roots.join('|'),
    synonyms: word.synonyms.join('|'), confusables: word.confusables.join('|'),
    example: word.examples[0]?.english || '', exampleTranslation: word.examples[0]?.chinese || '',
    memoryTip: word.memoryTip, source: word.source, chapter: word.chapter, unit: word.unit, page: word.page,
    notes: word.notes, tags: word.tags.join('|'), isKey: word.isKey
  })))
}

export function exportWordsCsv(words: WordRecord[]) {
  downloadText(`\ufeff${wordsToCsv(words)}`, `斗破英语-词库-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
}

export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importCsv(csv: string, database: DoupoEnglishDatabase = db) {
  const words = parseWordsCsv(csv)
  const pkg: VocabularyPackage = { format: 'doupo-english-vocabulary', schemaVersion: 1, words }
  return importPackage(pkg, 'merge', database)
}
