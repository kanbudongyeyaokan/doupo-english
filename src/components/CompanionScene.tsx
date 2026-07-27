import { BookOpenCheck, Heart, LockKeyhole, MessageCircle, Sparkles } from 'lucide-react'
import { COMPANION_NAME, getCompanionDialogue, getCompanionProgress, getMasteredCount } from '../domain/companion'
import { dayKey } from '../domain/gamification'
import type { PlayerProfile } from '../types'

function CharacterFigure({ role, revealed = true, equippedItemIds = [] }: { role: 'player' | 'companion'; revealed?: boolean; equippedItemIds?: string[] }) {
  const equipmentClasses = role === 'player' ? equippedItemIds.map((itemId) => `wear-${itemId}`).join(' ') : ''
  return (
    <div className={`scene-character ${role} ${revealed ? 'revealed' : 'silhouette'} ${equipmentClasses}`} aria-hidden="true">
      <div className="character-shadow" />
      <div className="character-legs"><span /><span /></div>
      <div className="character-body"><span className="character-emblem">{role === 'player' ? '焜' : '夏'}</span></div>
      <div className="character-arm arm-left" />
      <div className="character-arm arm-right" />
      <div className="character-head">
        <div className="character-hair" />
        <div className="character-face"><span /><span /></div>
      </div>
      {role === 'companion' && <div className="character-ponytail" />}
    </div>
  )
}

export function PlayerPortrait({ profile }: { profile: PlayerProfile }) {
  return (
    <div className="player-portrait" aria-label={`${profile.name}的原创动画形象`}>
      <CharacterFigure role="player" equippedItemIds={profile.equippedItemIds} />
    </div>
  )
}

interface CompanionSceneProps {
  profile: PlayerProfile
  detailed?: boolean
  onPrimaryAction?: () => void
  onInteract?: () => void
  interactionMessage?: string
}

export function CompanionScene({ profile, detailed = false, onPrimaryAction, onInteract, interactionMessage }: CompanionSceneProps) {
  const masteredCount = getMasteredCount(profile)
  const progress = getCompanionProgress(masteredCount)
  const interactedToday = profile.lastCompanionInteractionDate === dayKey()
  const dialogue = interactionMessage || getCompanionDialogue(profile)

  return (
    <section className={`companion-zone stage-${progress.current.id} ${detailed ? 'detailed' : ''}`} aria-labelledby={detailed ? 'companion-title-profile' : 'companion-title-home'}>
      <div className="companion-scene" aria-label={progress.isGirlfriendUnlocked ? `${profile.name}和女朋友${COMPANION_NAME}的学习场景` : `${profile.name}正在解锁${COMPANION_NAME}的故事`}>
        <div className="scene-window"><span>VOCAB</span></div>
        <div className="scene-desk"><BookOpenCheck size={20} /></div>
        <CharacterFigure role="player" equippedItemIds={profile.equippedItemIds} />
        <CharacterFigure role="companion" revealed={progress.isGirlfriendUnlocked} />
        {!progress.isGirlfriendUnlocked && (
          <div className="companion-lock"><LockKeyhole size={18} /><span>{progress.remaining} 词</span></div>
        )}
        {progress.isGirlfriendUnlocked && <div className="bond-signal"><Heart size={16} fill="currentColor" /><span>{profile.companionBond}</span></div>}
      </div>

      <div className="companion-copy">
        <span className="eyebrow">原创陪伴成长线</span>
        <h2 id={detailed ? 'companion-title-profile' : 'companion-title-home'}>
          {progress.isGirlfriendUnlocked ? `${COMPANION_NAME} · ${progress.current.relation}` : progress.current.title}
        </h2>
        <p className="companion-dialogue"><MessageCircle size={16} />{dialogue}</p>
        <div className="companion-progress-label">
          <span>累计掌握 {masteredCount} 词</span>
          <strong>{progress.next ? `下一幕：${progress.next.threshold} 词` : '全部主线已解锁'}</strong>
        </div>
        <div className="companion-progress" role="progressbar" aria-label="陪伴故事解锁进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="companion-actions">
          {progress.isGirlfriendUnlocked && onInteract ? (
            <button type="button" onClick={onInteract} disabled={interactedToday}>
              <Heart size={17} />{interactedToday ? '今日已经聊过' : '和知夏聊两句'}
            </button>
          ) : onPrimaryAction ? (
            <button type="button" onClick={onPrimaryAction}><Sparkles size={17} />去掌握下一组</button>
          ) : null}
          {progress.isGirlfriendUnlocked && <span>今日互动 {interactedToday ? '已完成' : '待完成'} · 共鸣 {profile.companionBond}</span>}
        </div>
      </div>
    </section>
  )
}
