import { describe, expect, it } from 'vitest'
import { calculateBondReward, GIRLFRIEND_UNLOCK_WORDS, getCompanionProgress } from './companion'

describe('知夏陪伴成长线', () => {
  it('requires 100 cumulatively mastered words to unlock girlfriend status', () => {
    expect(GIRLFRIEND_UNLOCK_WORDS).toBe(100)
    expect(getCompanionProgress(99).isGirlfriendUnlocked).toBe(false)
    expect(getCompanionProgress(99).remaining).toBe(1)
    expect(getCompanionProgress(100)).toMatchObject({
      isGirlfriendUnlocked: true,
      current: { id: 'girlfriend', relation: '女朋友' }
    })
  })

  it('unlocks later relationship stages without changing the girlfriend threshold', () => {
    expect(getCompanionProgress(250).current.id).toBe('journey')
    expect(getCompanionProgress(500).current.id).toBe('promise')
    expect(getCompanionProgress(500).percent).toBe(100)
  })

  it('awards bond only for genuine strong reviews with anti-farming XP', () => {
    expect(calculateBondReward('good', 'en-zh', 6, true)).toBe(3)
    expect(calculateBondReward('easy', 'spelling', 6, false)).toBe(2)
    expect(calculateBondReward('again', 'spelling', 2, false)).toBe(0)
    expect(calculateBondReward('good', 'spelling', 0, true)).toBe(0)
  })
})
