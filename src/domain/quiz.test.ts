import { describe, expect, it } from 'vitest'
import { createWordRecord } from './word'
import { buildChoiceOptions, clozeSentence, judgeSpelling } from './quiz'

const quizWords = [
  createWordRecord({ term: 'explicit', meanings: [{ partOfSpeech: 'adj.', meanings: ['明确的'] }], examples: [{ english: 'The rule is explicit.', chinese: '规则很明确。' }], confusables: ['implicit'] }),
  createWordRecord({ term: 'retain', meanings: [{ partOfSpeech: 'v.', meanings: ['保留'] }], synonyms: ['sustain'] }),
  createWordRecord({ term: 'sustain', meanings: [{ partOfSpeech: 'v.', meanings: ['维持'] }], synonyms: ['retain'] }),
  createWordRecord({ term: 'abandon', meanings: [{ partOfSpeech: 'v.', meanings: ['放弃'] }] })
]

describe('quiz generation', () => {
  it('grades spelling after normalization', () => {
    const word = quizWords.find((item) => item.term === 'explicit')!
    expect(judgeSpelling(' Explicit ', word)).toBe(true)
    expect(judgeSpelling('implicit', word)).toBe(false)
  })

  it('creates one correct option and prioritizes meaningful distractors', () => {
    const target = quizWords.find((item) => item.term === 'retain')!
    const options = buildChoiceOptions(target, quizWords)
    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(options.some((option) => ['sustain', 'abandon'].includes(option.sourceTerm))).toBe(true)
    expect(new Set(options.map((option) => option.label)).size).toBe(4)
  })

  it('turns the target word into a cloze without losing translation', () => {
    const word = quizWords[0]
    const cloze = clozeSentence(word)
    expect(cloze.prompt).toContain('______')
    expect(cloze.prompt.toLowerCase()).not.toContain(word.term)
    expect(cloze.translation).toBeTruthy()
  })
})
