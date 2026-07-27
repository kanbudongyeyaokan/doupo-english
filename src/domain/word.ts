import type { WordRecord } from '../types'
import { createStoredCard } from './fsrs'

export function normalizeTerm(term: string) {
  return term.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function createStableWordId(term: string, source = '个人词库') {
  return `word-${stableHash(`${normalizeTerm(term)}|${normalizeTerm(source)}`)}`
}

const sourceAuditTags = new Set(['OCR扫描导入', '词头人工校对', '释义待核对', '音标待核对', '正文待核对'])
const sourceAuditNotePattern = /^OCR平均置信度 \d+(?:\.\d+)?%；[^。\n]+。待核对原始页：书页\d+（PDF \d+）(?:、书页\d+（PDF \d+）)*$/

function mergeUnique(left: string[], right: string[]) {
  return [...new Set([...left, ...right].filter(Boolean))]
}

function stripSourceAuditNotes(notes: string) {
  return notes.split('\n').map((line) => line.trim()).filter((line) => line && !sourceAuditNotePattern.test(line)).join('\n')
}

function mergeNotes(...notes: string[]) {
  return notes.filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join('\n')
}

export function createWordRecord(
  input: Pick<WordRecord, 'term'> & Partial<Omit<WordRecord, 'term'>>,
  now = Date.now()
): WordRecord {
  const source = input.source?.trim() || '个人词库'
  const term = input.term.trim()
  return {
    id: input.id || createStableWordId(term, source),
    term,
    normalizedTerm: normalizeTerm(term),
    phonetic: input.phonetic || '',
    britishPhonetic: input.britishPhonetic || input.phonetic || '',
    americanPhonetic: input.americanPhonetic || input.phonetic || '',
    meanings: input.meanings?.length ? input.meanings : [{ partOfSpeech: '', meanings: ['释义待补充'] }],
    familiarMeanings: input.familiarMeanings || [],
    collocations: input.collocations || [],
    derivatives: input.derivatives || [],
    roots: input.roots || [],
    synonyms: input.synonyms || [],
    confusables: input.confusables || [],
    examples: input.examples || [],
    memoryTip: input.memoryTip || '',
    source,
    chapter: input.chapter || '',
    unit: input.unit || '',
    sourceOrder: input.sourceOrder,
    page: input.page || '',
    notes: input.notes || '',
    tags: input.tags || [],
    imageIds: input.imageIds || [],
    audioBritishId: input.audioBritishId,
    audioAmericanId: input.audioAmericanId,
    isKey: input.isKey || false,
    isMistake: input.isMistake || false,
    isFavorite: input.isFavorite || false,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    firstLearnedAt: input.firstLearnedAt,
    lastReviewedAt: input.lastReviewedAt,
    fsrs: input.fsrs || createStoredCard(new Date(now))
  }
}

export function refreshWordFromSource(local: WordRecord, incoming: WordRecord): WordRecord {
  const hasLearningHistory = Boolean(local.firstLearnedAt || local.lastReviewedAt || local.fsrs.reps)
  return {
    ...incoming,
    id: local.id,
    normalizedTerm: normalizeTerm(incoming.term),
    tags: mergeUnique(local.tags.filter((tag) => !sourceAuditTags.has(tag)), incoming.tags),
    imageIds: mergeUnique(local.imageIds, incoming.imageIds),
    audioBritishId: incoming.audioBritishId || local.audioBritishId,
    audioAmericanId: incoming.audioAmericanId || local.audioAmericanId,
    notes: mergeNotes(stripSourceAuditNotes(local.notes), incoming.notes),
    isKey: local.isKey || incoming.isKey,
    isMistake: local.isMistake,
    isFavorite: local.isFavorite,
    createdAt: Math.min(local.createdAt, incoming.createdAt),
    updatedAt: Date.now(),
    firstLearnedAt: local.firstLearnedAt,
    lastReviewedAt: local.lastReviewedAt,
    fsrs: hasLearningHistory ? local.fsrs : incoming.fsrs
  }
}

export function mergeWord(local: WordRecord, incoming: WordRecord): WordRecord {
  const meaningMap = new Map<string, string[]>()
  for (const group of [...local.meanings, ...incoming.meanings]) {
    meaningMap.set(group.partOfSpeech, mergeUnique(meaningMap.get(group.partOfSpeech) || [], group.meanings))
  }
  return {
    ...local,
    ...incoming,
    id: local.id,
    normalizedTerm: normalizeTerm(incoming.term || local.term),
    meanings: [...meaningMap].map(([partOfSpeech, meanings]) => ({ partOfSpeech, meanings })),
    familiarMeanings: mergeUnique(local.familiarMeanings, incoming.familiarMeanings),
    collocations: mergeUnique(local.collocations, incoming.collocations),
    derivatives: mergeUnique(local.derivatives, incoming.derivatives),
    roots: mergeUnique(local.roots, incoming.roots),
    synonyms: mergeUnique(local.synonyms, incoming.synonyms),
    confusables: mergeUnique(local.confusables, incoming.confusables),
    examples: [...local.examples, ...incoming.examples].filter(
      (example, index, all) => all.findIndex((item) => item.english === example.english) === index
    ),
    tags: mergeUnique(local.tags, incoming.tags),
    imageIds: mergeUnique(local.imageIds, incoming.imageIds),
    notes: mergeNotes(local.notes, incoming.notes),
    isKey: local.isKey || incoming.isKey,
    isMistake: local.isMistake || incoming.isMistake,
    isFavorite: local.isFavorite || incoming.isFavorite,
    createdAt: Math.min(local.createdAt, incoming.createdAt),
    updatedAt: Date.now(),
    firstLearnedAt: local.firstLearnedAt,
    lastReviewedAt: local.lastReviewedAt,
    fsrs: local.fsrs
  }
}
