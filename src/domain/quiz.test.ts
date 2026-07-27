import { describe, expect, it } from 'vitest'
import { seedWords } from '../data/seed'
import { buildChoiceOptions, clozeSentence, judgeSpelling } from './quiz'

describe('quiz generation', () => {
  it('grades spelling after normalization', () => {
    const word = seedWords.find((item) => item.term === 'explicit')!
    expect(judgeSpelling(' Explicit ', word)).toBe(true)
    expect(judgeSpelling('implicit', word)).toBe(false)
  })

  it('creates one correct option and prioritizes meaningful distractors', () => {
    const target = seedWords.find((item) => item.term === 'retain')!
    const options = buildChoiceOptions(target, seedWords)
    expect(options).toHaveLength(4)
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1)
    expect(options.some((option) => ['sustain', 'abandon'].includes(option.sourceTerm))).toBe(true)
    expect(new Set(options.map((option) => option.label)).size).toBe(4)
  })

  it('turns the target word into a cloze without losing translation', () => {
    const word = seedWords[0]
    const cloze = clozeSentence(word)
    expect(cloze.prompt).toContain('______')
    expect(cloze.prompt.toLowerCase()).not.toContain(word.term)
    expect(cloze.translation).toBeTruthy()
  })
})

