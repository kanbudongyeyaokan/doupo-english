import type { WordRecord } from '../types'

export interface ChoiceOption {
  id: string
  label: string
  sourceTerm: string
  isCorrect: boolean
}

export function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
}

export function judgeSpelling(answer: string, word: WordRecord) {
  return normalizeAnswer(answer) === normalizeAnswer(word.term)
}

export function clozeSentence(word: WordRecord) {
  const example = word.examples[0]
  if (!example) return { prompt: '暂无例句，请先补充例句。', translation: '' }
  const escaped = word.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return {
    prompt: example.english.replace(new RegExp(`\\b${escaped}(?:s|es|d|ed|ing)?\\b`, 'gi'), '______'),
    translation: example.chinese
  }
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, () => Array<number>(a.length + 1).fill(0))
  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1
    }
  }
  return matrix[b.length][a.length]
}

function primaryMeaning(word: WordRecord) {
  return word.meanings.flatMap((group) => group.meanings)[0] || '释义待补充'
}

function relevanceScore(target: WordRecord, candidate: WordRecord) {
  let score = 0
  const targetRelations = [...target.synonyms, ...target.confusables].map(normalizeAnswer)
  if (targetRelations.includes(normalizeAnswer(candidate.term))) score += 120
  const candidateRelations = [...candidate.synonyms, ...candidate.confusables].map(normalizeAnswer)
  if (candidateRelations.includes(normalizeAnswer(target.term))) score += 100
  const targetPos = new Set(target.meanings.map((item) => item.partOfSpeech))
  if (candidate.meanings.some((item) => targetPos.has(item.partOfSpeech))) score += 40
  const distance = levenshtein(target.normalizedTerm, candidate.normalizedTerm)
  if (distance <= 2) score += 60 - distance * 15
  score += Math.max(0, 12 - Math.abs(target.term.length - candidate.term.length) * 2)
  return score
}

export function buildChoiceOptions(target: WordRecord, words: WordRecord[], direction: 'meaning' | 'word' = 'meaning') {
  const candidates = words
    .filter((item) => item.id !== target.id)
    .map((item) => ({ item, score: relevanceScore(target, item) }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, 3)
    .map(({ item }) => ({
      id: item.id,
      label: direction === 'meaning' ? primaryMeaning(item) : item.term,
      sourceTerm: item.term,
      isCorrect: false
    }))
  const correct: ChoiceOption = {
    id: target.id,
    label: direction === 'meaning' ? primaryMeaning(target) : target.term,
    sourceTerm: target.term,
    isCorrect: true
  }
  return [correct, ...candidates].sort((a, b) => `${target.id}:${a.id}`.localeCompare(`${target.id}:${b.id}`))
}
