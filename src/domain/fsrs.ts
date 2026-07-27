import { Rating, createEmptyCard, fsrs, type Card, type Grade } from 'ts-fsrs'
import type { ReviewRating, StoredFsrsCard } from '../types'

export const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m']
})

const ratingMap: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy
}

export function serializeCard(card: Card): StoredFsrsCard {
  return {
    ...card,
    due: card.due.getTime(),
    last_review: card.last_review?.getTime()
  }
}

export function hydrateCard(card: StoredFsrsCard): Card {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined
  } as Card
}

export function createStoredCard(now = new Date()): StoredFsrsCard {
  return serializeCard(createEmptyCard(now))
}

export function scheduleReview(
  stored: StoredFsrsCard,
  rating: ReviewRating,
  reviewedAt = new Date()
): StoredFsrsCard {
  const result = scheduler.next(hydrateCard(stored), reviewedAt, ratingMap[rating])
  return serializeCard(result.card)
}

export function previewIntervals(stored: StoredFsrsCard, now = new Date()) {
  const records = scheduler.repeat(hydrateCard(stored), now)
  return {
    again: records[Rating.Again].card.due,
    hard: records[Rating.Hard].card.due,
    good: records[Rating.Good].card.due,
    easy: records[Rating.Easy].card.due
  }
}

export function isDue(card: StoredFsrsCard, now = Date.now()) {
  return card.due <= now
}

export function formatInterval(due: Date, now = new Date()) {
  const minutes = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  const days = Math.round(hours / 24)
  if (days < 365) return `${days} 天`
  return `${Math.round(days / 365)} 年`
}
