import { describe, expect, it } from 'vitest'
import { calculateSpiritStoneReward, equipByCategory } from './economy'
import { createWordRecord } from './word'

describe('spirit stone economy', () => {
  it('rewards real recall and blocks repeated farming inside six hours', () => {
    const now = Date.now()
    const word = createWordRecord({ term: 'retain' }, now)
    const reward = calculateSpiritStoneReward({
      word,
      rating: 'good',
      mode: 'spelling',
      now,
      xpAwarded: 12,
      newlyMastered: true,
      wasMistake: true,
      existingEvents: []
    })
    expect(reward.total).toBe(6)
    const blocked = calculateSpiritStoneReward({
      word,
      rating: 'easy',
      mode: 'spelling',
      now: now + 60_000,
      xpAwarded: 12,
      newlyMastered: false,
      wasMistake: false,
      existingEvents: reward.events
    })
    expect(blocked.total).toBe(0)
  })

  it('equips at most one item in each category', () => {
    expect(equipByCategory(['novice-robe', 'star-aura'], 'ember-robe')).toEqual(['star-aura', 'ember-robe'])
  })
})
