import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Headphones, Save, X } from 'lucide-react'
import { saveWord } from '../db'
import { createWordRecord } from '../domain/word'
import type { AssetRecord, MeaningGroup, WordRecord } from '../types'

function join(values: string[]) { return values.join('；') }
function split(value: string) { return value.split(/[；;|\n]/).map((item) => item.trim()).filter(Boolean) }

function meaningsToText(groups: MeaningGroup[]) {
  return groups.map((group) => `${group.partOfSpeech} | ${group.meanings.join('；')}`).join('\n')
}

function textToMeanings(value: string): MeaningGroup[] {
  return value.split('\n').map((line) => {
    const [partOfSpeech, ...rest] = line.split('|')
    return { partOfSpeech: partOfSpeech.trim(), meanings: split(rest.join('|')) }
  }).filter((group) => group.partOfSpeech || group.meanings.length)
}

export function WordForm({ word, onClose, onSaved }: { word?: WordRecord; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [term, setTerm] = useState(word?.term || '')
  const [phonetic, setPhonetic] = useState(word?.phonetic || '')
  const [britishPhonetic, setBritishPhonetic] = useState(word?.britishPhonetic || '')
  const [americanPhonetic, setAmericanPhonetic] = useState(word?.americanPhonetic || '')
  const [meanings, setMeanings] = useState(meaningsToText(word?.meanings || [{ partOfSpeech: 'v.', meanings: [] }]))
  const [familiarMeanings, setFamiliarMeanings] = useState(join(word?.familiarMeanings || []))
  const [collocations, setCollocations] = useState(join(word?.collocations || []))
  const [derivatives, setDerivatives] = useState(join(word?.derivatives || []))
  const [roots, setRoots] = useState(join(word?.roots || []))
  const [synonyms, setSynonyms] = useState(join(word?.synonyms || []))
  const [confusables, setConfusables] = useState(join(word?.confusables || []))
  const [example, setExample] = useState(word?.examples[0]?.english || '')
  const [translation, setTranslation] = useState(word?.examples[0]?.chinese || '')
  const [memoryTip, setMemoryTip] = useState(word?.memoryTip || '')
  const [source, setSource] = useState(word?.source || '个人词库')
  const [chapter, setChapter] = useState(word?.chapter || '')
  const [unit, setUnit] = useState(word?.unit || '')
  const [page, setPage] = useState(word?.page || '')
  const [notes, setNotes] = useState(word?.notes || '')
  const [tags, setTags] = useState(join(word?.tags || []))
  const [isKey, setIsKey] = useState(word?.isKey || false)
  const [isMistake, setIsMistake] = useState(word?.isMistake || false)
  const [isFavorite, setIsFavorite] = useState(word?.isFavorite || false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [britishAudio, setBritishAudio] = useState<File | null>(null)
  const [americanAudio, setAmericanAudio] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!term.trim()) return
    setSaving(true)
    try {
      const base = createWordRecord({
        ...word,
        term,
        phonetic,
        britishPhonetic,
        americanPhonetic,
        meanings: textToMeanings(meanings),
        familiarMeanings: split(familiarMeanings),
        collocations: split(collocations),
        derivatives: split(derivatives),
        roots: split(roots),
        synonyms: split(synonyms),
        confusables: split(confusables),
        examples: example ? [{ english: example, chinese: translation }] : [],
        memoryTip,
        source,
        chapter,
        unit,
        page,
        notes,
        tags: split(tags),
        isKey,
        isMistake,
        isFavorite
      })
      const now = Date.now()
      const assets: AssetRecord[] = []
      const imageIds = [...base.imageIds]
      imageFiles.forEach((file, index) => {
        const id = `asset-${base.id}-image-${now}-${index}`
        imageIds.push(id)
        assets.push({ id, wordId: base.id, kind: 'image', name: file.name, mimeType: file.type, blob: file, createdAt: now + index })
      })
      let audioBritishId = base.audioBritishId
      let audioAmericanId = base.audioAmericanId
      if (britishAudio) {
        audioBritishId = `asset-${base.id}-audio-gb-${now}`
        assets.push({ id: audioBritishId, wordId: base.id, kind: 'audio', accent: 'british', name: britishAudio.name, mimeType: britishAudio.type, blob: britishAudio, createdAt: now })
      }
      if (americanAudio) {
        audioAmericanId = `asset-${base.id}-audio-us-${now}`
        assets.push({ id: audioAmericanId, wordId: base.id, kind: 'audio', accent: 'american', name: americanAudio.name, mimeType: americanAudio.type, blob: americanAudio, createdAt: now })
      }
      await saveWord({ ...base, imageIds, audioBritishId, audioAmericanId }, assets)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="word-dialog" aria-labelledby="word-form-title" onCancel={onClose}>
      <div className="dialog-header"><div><span className="eyebrow">私人词库</span><h2 id="word-form-title">{word ? '编辑单词' : '新增单词'}</h2></div><button type="button" className="icon-only" onClick={onClose} aria-label="关闭"><X /></button></div>
      <form onSubmit={submit} className="word-form">
        <div className="form-grid two">
          <label><span>单词 *</span><input value={term} onChange={(event) => setTerm(event.target.value)} required autoFocus /></label>
          <label><span>通用音标</span><input value={phonetic} onChange={(event) => setPhonetic(event.target.value)} placeholder="/ˈwɜːd/" /></label>
          <label><span>英式音标</span><input value={britishPhonetic} onChange={(event) => setBritishPhonetic(event.target.value)} /></label>
          <label><span>美式音标</span><input value={americanPhonetic} onChange={(event) => setAmericanPhonetic(event.target.value)} /></label>
        </div>
        <label><span>词性与核心释义 *</span><textarea value={meanings} onChange={(event) => setMeanings(event.target.value)} rows={3} placeholder={'v. | 维持；支撑\nn. | 支持'} required /></label>
        <div className="form-grid two">
          <label><span>熟词生义</span><textarea value={familiarMeanings} onChange={(event) => setFamiliarMeanings(event.target.value)} rows={2} /></label>
          <label><span>常用搭配</span><textarea value={collocations} onChange={(event) => setCollocations(event.target.value)} rows={2} /></label>
          <label><span>派生词</span><textarea value={derivatives} onChange={(event) => setDerivatives(event.target.value)} rows={2} /></label>
          <label><span>词根词缀</span><textarea value={roots} onChange={(event) => setRoots(event.target.value)} rows={2} /></label>
          <label><span>近义词</span><textarea value={synonyms} onChange={(event) => setSynonyms(event.target.value)} rows={2} /></label>
          <label><span>易混词</span><textarea value={confusables} onChange={(event) => setConfusables(event.target.value)} rows={2} /></label>
        </div>
        <label><span>真题风格例句</span><textarea value={example} onChange={(event) => setExample(event.target.value)} rows={2} /></label>
        <label><span>例句翻译</span><textarea value={translation} onChange={(event) => setTranslation(event.target.value)} rows={2} /></label>
        <label><span>记忆提示</span><textarea value={memoryTip} onChange={(event) => setMemoryTip(event.target.value)} rows={2} /></label>
        <div className="form-grid source-grid">
          <label><span>来源</span><input value={source} onChange={(event) => setSource(event.target.value)} /></label>
          <label><span>章节</span><input value={chapter} onChange={(event) => setChapter(event.target.value)} /></label>
          <label><span>单元</span><input value={unit} onChange={(event) => setUnit(event.target.value)} /></label>
          <label><span>页码</span><input value={page} onChange={(event) => setPage(event.target.value)} /></label>
        </div>
        <label><span>用户笔记</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
        <label><span>标签</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="使用分号分隔" /></label>
        <fieldset className="check-row"><legend>单词标记</legend><label><input type="checkbox" checked={isKey} onChange={(event) => setIsKey(event.target.checked)} />重点词</label><label><input type="checkbox" checked={isMistake} onChange={(event) => setIsMistake(event.target.checked)} />易错词</label><label><input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} />收藏</label></fieldset>
        <div className="asset-inputs">
          <label className="file-button"><Camera size={18} /><span>添加配图</span><input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files || []))} /></label>
          <label className="file-button"><Headphones size={18} /><span>英式音频</span><input type="file" accept="audio/*" onChange={(event) => setBritishAudio(event.target.files?.[0] || null)} /></label>
          <label className="file-button"><Headphones size={18} /><span>美式音频</span><input type="file" accept="audio/*" onChange={(event) => setAmericanAudio(event.target.files?.[0] || null)} /></label>
        </div>
        {(imageFiles.length > 0 || britishAudio || americanAudio) && <p className="file-summary">已选 {imageFiles.length} 张图片{britishAudio ? '、英音' : ''}{americanAudio ? '、美音' : ''}，仅保存到当前浏览器。</p>}
        <div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit" disabled={saving}><Save size={18} />{saving ? '保存中...' : '保存单词'}</button></div>
      </form>
    </dialog>
  )
}
