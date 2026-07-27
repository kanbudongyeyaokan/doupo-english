import { dayKey } from './gamification'
import type {
  ReviewMode,
  ReviewRating,
  SpiritStoneEvent,
  StoreItem,
  StoreItemCategory,
  WordRecord
} from '../types'

export const STORE_ITEMS: StoreItem[] = [
  { id: 'novice-robe', name: '素青练功服', description: '初入修炼时的轻装，默认拥有。', category: 'robe', price: 0, rarity: 'common', swatch: '#55776d' },
  { id: 'ink-robe', name: '墨纹长衫', description: '适合安静长修的深色衣装。', category: 'robe', price: 80, rarity: 'common', swatch: '#303b38' },
  { id: 'ember-robe', name: '赤焰战衣', description: '以连续学习淬炼出的暖红衣装。', category: 'robe', price: 220, rarity: 'rare', swatch: '#9b463c' },
  { id: 'azure-sash', name: '青玉束带', description: '一枚克制的青玉腰饰。', category: 'accessory', price: 120, rarity: 'rare', swatch: '#49a696' },
  { id: 'gold-token', name: '九阶令牌', description: '记录长期修炼的金色信物。', category: 'accessory', price: 360, rarity: 'epic', swatch: '#c99748' },
  { id: 'ember-aura', name: '微焰气息', description: '短促而安静的赤色修炼气息。', category: 'aura', price: 180, rarity: 'rare', swatch: '#bf6652' },
  { id: 'star-aura', name: '星辉气息', description: '高阶收藏，人物周围会浮现星辉。', category: 'aura', price: 520, rarity: 'epic', swatch: '#d9b96b' }
]

export const DEFAULT_INVENTORY = ['novice-robe']
export const DEFAULT_EQUIPPED = ['novice-robe']

export function getStoreItem(itemId: string) {
  return STORE_ITEMS.find((item) => item.id === itemId)
}

export function equipByCategory(equippedItemIds: string[], nextItemId: string) {
  const nextItem = getStoreItem(nextItemId)
  if (!nextItem) throw new Error('装扮不存在')
  const kept = equippedItemIds.filter((itemId) => getStoreItem(itemId)?.category !== nextItem.category)
  return [...kept, nextItemId]
}

export function getEquippedItem(equippedItemIds: string[], category: StoreItemCategory) {
  return equippedItemIds.map(getStoreItem).find((item) => item?.category === category)
}

interface SpiritStoneRewardInput {
  word: WordRecord
  rating: ReviewRating
  mode: ReviewMode
  now: number
  xpAwarded: number
  newlyMastered: boolean
  wasMistake: boolean
  existingEvents: SpiritStoneEvent[]
}

export function calculateSpiritStoneReward(input: SpiritStoneRewardInput) {
  const { word, rating, mode, now, xpAwarded, newlyMastered, wasMistake, existingEvents } = input
  const strong = rating === 'good' || rating === 'easy'
  const recentlyRewarded = existingEvents.some((event) => now - event.createdAt < 6 * 60 * 60 * 1000)
  if (!strong || xpAwarded <= 0 || recentlyRewarded) return { total: 0, events: [] as SpiritStoneEvent[] }

  const specs: Array<{ kind: SpiritStoneEvent['kind']; amount: number }> = [{ kind: 'review', amount: 1 }]
  if (newlyMastered) specs.push({ kind: 'mastery', amount: 2 })
  if (word.fsrs.due <= now + 24 * 60 * 60 * 1000) specs.push({ kind: 'on-time', amount: 1 })
  if (mode === 'spelling') specs.push({ kind: 'spelling', amount: 1 })
  if (wasMistake) specs.push({ kind: 'mistake-recovered', amount: 1 })
  const today = dayKey(now)
  const slot = Math.floor(now / 21600000)
  const events = specs.map((spec, index) => ({
    id: `stone:${word.id}:${spec.kind}:${today}:${slot}:${index}`,
    wordId: word.id,
    kind: spec.kind,
    amount: spec.amount,
    createdAt: now,
    dayKey: today
  }))
  return { total: events.reduce((sum, event) => sum + event.amount, 0), events }
}
