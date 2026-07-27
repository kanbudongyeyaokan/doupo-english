import { describe, expect, it } from 'vitest'
import { createWordRecord } from './word'
import { compareWordSourceOrder, compareWordStudyOrder, inUnit, summarizeUnits } from './units'

describe('book unit helpers', () => {
  it('sorts Red Book chapters and units in study order', () => {
    const words = [
      createWordRecord({ term: 'base-ten', chapter: '基础词', unit: 'Unit 10' }),
      createWordRecord({ term: 'required-two', chapter: '必考词', unit: 'Unit 2' }),
      createWordRecord({ term: 'required-one', chapter: '必考词', unit: 'Unit 1' })
    ]
    expect(summarizeUnits(words).map((item) => `${item.chapter}/${item.unit}`)).toEqual([
      '必考词/Unit 1',
      '必考词/Unit 2',
      '基础词/Unit 10'
    ])
  })

  it('keeps curated words in their source unit order', () => {
    const now = Date.now()
    const later = createWordRecord({ term: 'radiant', sourceOrder: 2 }, now)
    const first = createWordRecord({ term: 'radiate', sourceOrder: 1 }, now)
    expect([later, first].sort(compareWordSourceOrder).map((word) => word.term)).toEqual(['radiate', 'radiant'])
    expect([later, first].sort(compareWordStudyOrder).map((word) => word.term)).toEqual(['radiate', 'radiant'])
  })

  it('counts unseen, due and mistake words per unit', () => {
    const now = Date.now()
    const unseen = createWordRecord({ term: 'unseen', chapter: '必考词', unit: 'Unit 1' }, now)
    const due = createWordRecord({ term: 'due', chapter: '必考词', unit: 'Unit 1', firstLearnedAt: now - 1000 }, now)
    due.fsrs.due = now - 1
    due.isMistake = true
    expect(summarizeUnits([unseen, due], now)[0]).toMatchObject({ total: 2, unseen: 1, due: 1, mistakes: 1 })
    expect(inUnit(due, '必考词', 'Unit 1')).toBe(true)
    expect(inUnit(due, '基础词', 'Unit 1')).toBe(false)
  })
})
