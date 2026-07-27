import { describe, expect, it } from 'vitest'
import { createStoredCard, hydrateCard, scheduleReview } from './fsrs'

describe('FSRS scheduling', () => {
  it('maps all four ratings to distinct valid due dates', () => {
    const now = new Date('2026-07-27T08:00:00.000Z')
    const card = createStoredCard(now)
    const results = {
      again: scheduleReview(card, 'again', now),
      hard: scheduleReview(card, 'hard', now),
      good: scheduleReview(card, 'good', now),
      easy: scheduleReview(card, 'easy', now)
    }
    for (const result of Object.values(results)) {
      expect(result.reps).toBe(1)
      expect(result.due).toBeGreaterThan(now.getTime())
      expect(hydrateCard(result).due).toBeInstanceOf(Date)
    }
    expect(results.again.due).toBeLessThanOrEqual(results.hard.due)
    expect(results.hard.due).toBeLessThanOrEqual(results.good.due)
    expect(results.good.due).toBeLessThanOrEqual(results.easy.due)
  })
})

