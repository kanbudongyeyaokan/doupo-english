export type ReviewMode =
  | 'en-zh'
  | 'zh-en'
  | 'spelling'
  | 'choice'
  | 'cloze'
  | 'familiar'
  | 'confusable'
  | 'flash'

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface MeaningGroup {
  partOfSpeech: string
  meanings: string[]
}

export interface ExampleSentence {
  english: string
  chinese: string
  source?: string
}

export interface StoredFsrsCard {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
}

export interface WordRecord {
  id: string
  term: string
  normalizedTerm: string
  phonetic: string
  britishPhonetic?: string
  americanPhonetic?: string
  meanings: MeaningGroup[]
  familiarMeanings: string[]
  collocations: string[]
  derivatives: string[]
  roots: string[]
  synonyms: string[]
  confusables: string[]
  examples: ExampleSentence[]
  memoryTip: string
  source: string
  chapter: string
  unit: string
  page: string
  notes: string
  tags: string[]
  imageIds: string[]
  audioBritishId?: string
  audioAmericanId?: string
  isKey: boolean
  isMistake: boolean
  isFavorite: boolean
  createdAt: number
  updatedAt: number
  firstLearnedAt?: number
  lastReviewedAt?: number
  fsrs: StoredFsrsCard
}

export interface ReviewLogRecord {
  id?: number
  wordId: string
  mode: ReviewMode
  rating: ReviewRating
  reviewedAt: number
  dueBefore: number
  dueAfter: number
  isCorrect: boolean
  answer?: string
  xpEarned: number
  bondEarned?: number
  spiritStonesEarned?: number
}

export interface AssetRecord {
  id: string
  wordId: string
  kind: 'image' | 'audio'
  accent?: 'british' | 'american'
  name: string
  mimeType: string
  blob: Blob
  createdAt: number
}

export interface PlayerProfile {
  id: 'player'
  name: string
  xp: number
  streak: number
  longestStreak: number
  lastStudyDate: string
  totalReviews: number
  totalNewWords: number
  spellingCorrect: number
  recoveredMistakes: number
  selectedTitle: string
  unlockedTitles: string[]
  unlockedAchievements: string[]
  masteredWordIds: string[]
  companionBond: number
  companionInteractions: number
  lastCompanionInteractionDate: string
  spiritStones: number
  lifetimeSpiritStones: number
  inventoryItemIds: string[]
  equippedItemIds: string[]
}

export type StoreItemCategory = 'robe' | 'aura' | 'accessory'

export interface StoreItem {
  id: string
  name: string
  description: string
  category: StoreItemCategory
  price: number
  rarity: 'common' | 'rare' | 'epic'
  swatch: string
}

export interface SpiritStoneEvent {
  id: string
  wordId?: string
  itemId?: string
  kind: 'review' | 'mastery' | 'on-time' | 'spelling' | 'mistake-recovered' | 'purchase'
  amount: number
  createdAt: number
  dayKey: string
}

export interface AppSettings {
  id: 'app'
  seeded: boolean
  theme: 'system' | 'light' | 'dark'
  soundEnabled: boolean
  hapticsEnabled: boolean
  reducedMotion: boolean
  dailyNewLimit: number
  focusBatchSize: number
  storagePersistent: boolean | null
  lastExternalBackupAt?: number
  updatedAt: number
}

export interface XpEvent {
  id: string
  wordId?: string
  kind: 'new-word' | 'on-time' | 'spelling' | 'streak' | 'mistake-recovered' | 'review'
  amount: number
  createdAt: number
  dayKey: string
}

export interface RewardCard {
  id: string
  title: string
  description: string
  rarity: 'common' | 'rare' | 'epic'
  earnedAt: number
}

export interface SnapshotPayload {
  words: WordRecord[]
  reviews: ReviewLogRecord[]
  assets: AssetRecord[]
  profile: PlayerProfile
  settings: AppSettings
  xpEvents: XpEvent[]
  spiritStoneEvents: SpiritStoneEvent[]
  rewards: RewardCard[]
}

export interface RecoverySnapshot {
  id: string
  reason: string
  createdAt: number
  payload: SnapshotPayload
}

export interface SerializableAsset extends Omit<AssetRecord, 'blob'> {
  dataUrl: string
}

export interface BackupPackage {
  format: 'doupo-english-backup'
  schemaVersion: 3 | 4 | 5
  exportedAt: string
  appVersion: string
  payload: Omit<SnapshotPayload, 'assets'> & { assets: SerializableAsset[] }
}

export interface VocabularyPackage {
  format: 'doupo-english-vocabulary'
  schemaVersion: 1
  exportedAt?: string
  batch?: {
    source: string
    chapters: string[]
    units: string[]
    notes?: string
  }
  words: WordRecord[]
}

export interface ImportPreview {
  kind: 'backup' | 'vocabulary' | 'csv'
  incoming: number
  newWords: number
  conflicts: number
  unchanged: number
  conflictWords: Array<{ id: string; local: string; incoming: string }>
}
