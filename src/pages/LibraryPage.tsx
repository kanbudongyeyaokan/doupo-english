import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckSquare, ChevronDown, Edit3, Filter, Plus, Search, Square, Star, Tag, Trash2 } from 'lucide-react'
import { db, deleteWords, createRecoverySnapshot } from '../db'
import type { WordRecord } from '../types'
import { WordForm } from '../components/WordForm'

type FilterValue = 'all' | 'favorite' | 'key' | 'mistake' | 'unlearned'
const PAGE_SIZE = 80

export function LibraryPage() {
  const words = useLiveQuery(() => db.words.orderBy('normalizedTerm').toArray(), [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<WordRecord | null | undefined>(undefined)
  const [bulkTag, setBulkTag] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)

  const wordList = words || []
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase()
    return (words || []).filter((word) => {
      const matchText = !needle || [word.term, word.phonetic, word.notes, word.source, ...word.tags, ...word.meanings.flatMap((item) => item.meanings)].join(' ').toLocaleLowerCase().includes(needle)
      const matchFilter = filter === 'all' || (filter === 'favorite' && word.isFavorite) || (filter === 'key' && word.isKey) || (filter === 'mistake' && word.isMistake) || (filter === 'unlearned' && !word.firstLearnedAt)
      return matchText && matchFilter
    })
  }, [deferredQuery, filter, words])
  const visibleWords = filtered.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [deferredQuery, filter])

  const toggleSelection = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const bulkUpdate = async (patch: Partial<WordRecord>) => {
    if (!selected.size) return
    await db.words.where('id').anyOf([...selected]).modify({ ...patch, updatedAt: Date.now() })
    await createRecoverySnapshot('批量更新单词')
    setSelected(new Set())
  }

  const addBulkTag = async () => {
    const tag = bulkTag.trim()
    if (!tag || !selected.size) return
    const selectedWords = await db.words.where('id').anyOf([...selected]).toArray()
    await db.words.bulkPut(selectedWords.map((word) => ({ ...word, tags: [...new Set([...word.tags, tag])], updatedAt: Date.now() })))
    await createRecoverySnapshot('批量添加标签')
    setBulkTag('')
    setSelected(new Set())
  }

  const remove = async (ids: string[]) => {
    if (!window.confirm(`确定删除 ${ids.length} 个单词吗？删除前会自动建立恢复快照。`)) return
    await deleteWords(ids)
    setSelected(new Set())
  }

  return (
    <main id="main-content" className="page library-page">
      <div className="page-title-row"><div><span className="eyebrow">本机私库</span><h1>词库</h1><p>{filtered.length} / {wordList.length} 个单词</p></div><button className="primary" type="button" onClick={() => setEditing(null)}><Plus size={19} />新增</button></div>
      <div className="library-tools">
        <label className="search-field"><Search size={19} /><span className="sr-only">搜索单词</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索单词、释义、标签或来源" /></label>
        <label className="filter-field"><Filter size={18} /><span className="sr-only">筛选词库</span><select value={filter} onChange={(event) => setFilter(event.target.value as FilterValue)}><option value="all">全部</option><option value="favorite">已收藏</option><option value="key">重点词</option><option value="mistake">易错词</option><option value="unlearned">未学习</option></select></label>
      </div>

      {selected.size > 0 && <div className="bulk-toolbar" role="toolbar" aria-label="批量操作">
        <strong>已选 {selected.size}</strong>
        <button type="button" onClick={() => bulkUpdate({ isFavorite: true })}><Star size={17} />收藏</button>
        <button type="button" onClick={() => bulkUpdate({ isKey: true })}><CheckSquare size={17} />重点</button>
        <label><Tag size={17} /><span className="sr-only">批量标签</span><input value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="标签" /><button type="button" onClick={addBulkTag}>添加</button></label>
        <button type="button" className="danger" onClick={() => remove([...selected])}><Trash2 size={17} />删除</button>
      </div>}

      <div className="word-list">
        {visibleWords.map((word) => {
          const isSelected = selected.has(word.id)
          return <article className={isSelected ? 'word-row selected' : 'word-row'} key={word.id}>
            <button type="button" className="select-word" onClick={() => toggleSelection(word.id)} aria-label={isSelected ? `取消选择 ${word.term}` : `选择 ${word.term}`}>{isSelected ? <CheckSquare /> : <Square />}</button>
            <button type="button" className="word-summary" onClick={() => setEditing(word)}>
              <span className="word-main"><strong>{word.term}</strong><small>{word.phonetic}</small></span>
              <span className="word-meaning">{word.meanings.flatMap((item) => item.meanings).slice(0, 2).join('；')}</span>
              <span className="word-meta">{word.isKey && <b>重点</b>}{word.isMistake && <b className="error">易错</b>}{word.isFavorite && <Star size={14} fill="currentColor" />}{word.tags.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</span>
            </button>
            <div className="row-actions"><button type="button" onClick={() => setEditing(word)} aria-label={`编辑 ${word.term}`} title="编辑"><Edit3 /></button><button type="button" onClick={() => remove([word.id])} aria-label={`删除 ${word.term}`} title="删除"><Trash2 /></button></div>
          </article>
        })}
        {visibleCount < filtered.length && (
          <div className="load-more-row">
            <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              <ChevronDown size={18} />继续显示 {Math.min(PAGE_SIZE, filtered.length - visibleCount)} 个
              <small>已显示 {visibleWords.length} / {filtered.length}</small>
            </button>
          </div>
        )}
        {filtered.length === 0 && <div className="empty-state"><Search size={28} /><h2>没有匹配的单词</h2><p>调整关键词或筛选条件，也可以新增自己的词条。</p></div>}
      </div>
      {editing !== undefined && <WordForm word={editing || undefined} onClose={() => setEditing(undefined)} onSaved={() => setEditing(undefined)} />}
    </main>
  )
}
