import type { WordRecord } from '../types'

export interface UnitSummary {
  chapter: string
  unit: string
  total: number
  unseen: number
  due: number
  mistakes: number
}

const CHAPTER_ORDER = ['必考词', '基础词']

function unitNumber(unit: string) {
  const matched = unit.match(/\d+/)
  return matched ? Number(matched[0]) : Number.MAX_SAFE_INTEGER
}

export function compareUnits(left: Pick<UnitSummary, 'chapter' | 'unit'>, right: Pick<UnitSummary, 'chapter' | 'unit'>) {
  const leftChapter = CHAPTER_ORDER.indexOf(left.chapter)
  const rightChapter = CHAPTER_ORDER.indexOf(right.chapter)
  const chapterDifference = (leftChapter < 0 ? CHAPTER_ORDER.length : leftChapter) - (rightChapter < 0 ? CHAPTER_ORDER.length : rightChapter)
  if (chapterDifference) return chapterDifference
  if (left.chapter !== right.chapter) return left.chapter.localeCompare(right.chapter, 'zh-CN')
  return unitNumber(left.unit) - unitNumber(right.unit) || left.unit.localeCompare(right.unit, 'zh-CN')
}

export function summarizeUnits(words: WordRecord[], now = Date.now()) {
  const summaries = new Map<string, UnitSummary>()
  for (const word of words) {
    if (!word.chapter || !word.unit) continue
    const key = `${word.chapter}\u0000${word.unit}`
    const summary = summaries.get(key) || { chapter: word.chapter, unit: word.unit, total: 0, unseen: 0, due: 0, mistakes: 0 }
    summary.total += 1
    if (!word.firstLearnedAt) summary.unseen += 1
    if (word.firstLearnedAt && word.fsrs.due <= now) summary.due += 1
    if (word.isMistake) summary.mistakes += 1
    summaries.set(key, summary)
  }
  return [...summaries.values()].sort(compareUnits)
}

export function inUnit(word: WordRecord, chapter: string, unit: string) {
  return (!chapter || word.chapter === chapter) && (!unit || word.unit === unit)
}
