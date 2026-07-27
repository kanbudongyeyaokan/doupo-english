import type { WordRecord } from '../types'
import { createWordRecord } from '../domain/word'

const SOURCE = '斗破英语原创示例词库'
const BASE_TIME = Date.UTC(2026, 0, 1)

function seed(input: Parameters<typeof createWordRecord>[0], index: number) {
  return createWordRecord({
    ...input,
    source: SOURCE,
    chapter: 'MVP 示例',
    unit: 'Unit 1',
    page: `S${index + 1}`,
    tags: ['示例', ...(input.tags || [])],
    createdAt: BASE_TIME + index,
    updatedAt: BASE_TIME + index
  }, BASE_TIME + index)
}

export const seedWords: WordRecord[] = [
  seed({
    term: 'abandon', phonetic: '/əˈbændən/',
    meanings: [{ partOfSpeech: 'v.', meanings: ['放弃；抛弃'] }, { partOfSpeech: 'n.', meanings: ['放纵；尽情'] }],
    familiarMeanings: ['with abandon：无拘无束地，尽情地'],
    collocations: ['abandon a plan', 'with reckless abandon'], derivatives: ['abandoned adj.', 'abandonment n.'],
    roots: ['a-（离开）+ bandon（控制）'], synonyms: ['desert', 'forsake'], confusables: ['abundant'],
    examples: [{ english: 'The team abandoned the proposal after new evidence emerged.', chinese: '新证据出现后，团队放弃了这项提议。' }],
    memoryTip: '注意与 abundant（丰富的）区分：abandon 中间是 -don。', isKey: true
  }, 0),
  seed({
    term: 'arbitrary', phonetic: '/ˈɑːbɪtrəri/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['任意的；武断的'] }],
    familiarMeanings: ['由个人意志决定、缺乏客观依据的'], collocations: ['an arbitrary decision', 'arbitrary power'],
    derivatives: ['arbitrarily adv.', 'arbitrariness n.'], roots: ['arbitr-（判断、仲裁）'],
    synonyms: ['random', 'capricious'], confusables: ['arbitration'],
    examples: [{ english: 'The cutoff point may seem arbitrary, but it keeps the comparison consistent.', chinese: '这个分界点或许显得随意，但它保证了比较标准一致。' }],
    memoryTip: 'arbitrator 是仲裁者；arbitrary 强调“只凭裁断”。'
  }, 1),
  seed({
    term: 'compelling', phonetic: '/kəmˈpelɪŋ/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['令人信服的；引人注目的；不可抗拒的'] }],
    familiarMeanings: ['迫切到必须采取行动的'], collocations: ['compelling evidence', 'a compelling reason'],
    derivatives: ['compel v.', 'compulsion n.'], roots: ['com-（共同）+ pel（推动）'],
    synonyms: ['convincing', 'persuasive'], confusables: ['compulsory'],
    examples: [{ english: 'The report offers compelling evidence that early support improves outcomes.', chinese: '报告提供了有力证据，表明早期支持能够改善结果。' }],
    memoryTip: 'compel 是“强力推动”，所以 compelling 既可“强烈吸引”，也可“有说服力”。', isKey: true
  }, 2),
  seed({
    term: 'derive', phonetic: '/dɪˈraɪv/',
    meanings: [{ partOfSpeech: 'v.', meanings: ['获得；源自；推导'] }],
    familiarMeanings: ['从数据、公式中推导出'], collocations: ['derive benefit from', 'be derived from'],
    derivatives: ['derivation n.', 'derivative n./adj.'], roots: ['de-（向下）+ riv（河流）→ 引流而来'],
    synonyms: ['obtain', 'originate'], confusables: ['deprive'],
    examples: [{ english: 'Many practical insights can be derived from a small but reliable sample.', chinese: '许多实用见解可以从一个规模不大但可靠的样本中得出。' }],
    memoryTip: '固定搭配 derive A from B：从 B 得到 A。'
  }, 3),
  seed({
    term: 'explicit', phonetic: '/ɪkˈsplɪsɪt/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['明确的；直言的；详述的'] }],
    familiarMeanings: ['内容露骨的（媒体分级语境）'], collocations: ['explicit instructions', 'make something explicit'],
    derivatives: ['explicitly adv.', 'explicitness n.'], roots: ['ex-（向外）+ plic（折叠）→ 完全展开'],
    synonyms: ['clear', 'unambiguous'], confusables: ['implicit'],
    examples: [{ english: 'The policy should make its assumptions explicit rather than hide them in footnotes.', chinese: '这项政策应明确说明其假设，而不是把它们藏在脚注里。' }],
    memoryTip: '与 implicit（含蓄的、隐含的）成对记忆。', isKey: true
  }, 4),
  seed({
    term: 'impose', phonetic: '/ɪmˈpəʊz/', britishPhonetic: '/ɪmˈpəʊz/', americanPhonetic: '/ɪmˈpoʊz/',
    meanings: [{ partOfSpeech: 'v.', meanings: ['强加；征收；使承受'] }],
    familiarMeanings: ['利用；打扰（impose on/upon）'], collocations: ['impose a tax', 'impose restrictions on'],
    derivatives: ['imposition n.', 'imposing adj.'], roots: ['im-（在上）+ pose（放置）'],
    synonyms: ['enforce', 'levy'], confusables: ['expose', 'compose'],
    examples: [{ english: 'Strict deadlines can impose unnecessary pressure on creative work.', chinese: '严格的截止期限会给创造性工作施加不必要的压力。' }],
    memoryTip: 'pose 是“放”，impose 就是“把东西压到别人身上”。'
  }, 5),
  seed({
    term: 'obscure', phonetic: '/əbˈskjʊə(r)/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['模糊的；鲜为人知的'] }, { partOfSpeech: 'v.', meanings: ['遮蔽；使难理解'] }],
    familiarMeanings: ['学术语境中指“晦涩难懂”'], collocations: ['an obscure reference', 'obscure the fact'],
    derivatives: ['obscurity n.'], roots: ['ob-（覆盖）+ scur（遮蔽）'],
    synonyms: ['unclear', 'unknown'], confusables: ['secure'],
    examples: [{ english: 'Technical detail should clarify the argument, not obscure its central claim.', chinese: '技术细节应当澄清论证，而不是掩盖其核心主张。' }],
    memoryTip: '形容词和动词同形：an obscure idea / obscure the truth。'
  }, 6),
  seed({
    term: 'retain', phonetic: '/rɪˈteɪn/',
    meanings: [{ partOfSpeech: 'v.', meanings: ['保留；保持；记住；聘请'] }],
    familiarMeanings: ['付费聘请律师等专业人士'], collocations: ['retain control', 'retain information'],
    derivatives: ['retention n.', 'retentive adj.'], roots: ['re-（回）+ tain（握住）'],
    synonyms: ['preserve', 'keep'], confusables: ['refrain', 'restrain'],
    examples: [{ english: 'Learners retain new vocabulary better when they revisit it at expanding intervals.', chinese: '学习者按逐渐拉长的间隔复习时，能更好地记住新词。' }],
    memoryTip: '-tain 表示“握住”：retain 即重新握住、不让流失。', isKey: true
  }, 7),
  seed({
    term: 'sustain', phonetic: '/səˈsteɪn/',
    meanings: [{ partOfSpeech: 'v.', meanings: ['维持；支撑；遭受；证实'] }],
    familiarMeanings: ['法庭语境：认可、支持（异议）'], collocations: ['sustain growth', 'sustain an injury'],
    derivatives: ['sustainable adj.', 'sustainability n.'], roots: ['sus-（向上）+ tain（握住）'],
    synonyms: ['maintain', 'support'], confusables: ['retain'],
    examples: [{ english: 'Short bursts of effort are easier to sustain when the daily goal remains realistic.', chinese: '当每日目标保持现实时，短时投入更容易长期维持。' }],
    memoryTip: '与 retain 都有 -tain；sustain 更强调持续支撑。'
  }, 8),
  seed({
    term: 'tentative', phonetic: '/ˈtentətɪv/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['暂定的；试探性的；不确定的'] }],
    familiarMeanings: ['动作或语气犹豫、小心的'], collocations: ['a tentative conclusion', 'a tentative agreement'],
    derivatives: ['tentatively adv.'], roots: ['tent（尝试）+ -ative'],
    synonyms: ['provisional', 'hesitant'], confusables: ['attentive'],
    examples: [{ english: 'Researchers reached a tentative conclusion and called for a larger study.', chinese: '研究人员得出了暂时性结论，并呼吁开展更大规模的研究。' }],
    memoryTip: 'tentative 来自“尝试”，所以结论还没有最终确定。'
  }, 9),
  seed({
    term: 'issue', phonetic: '/ˈɪʃuː/',
    meanings: [{ partOfSpeech: 'n.', meanings: ['问题；议题；期号；发行物'] }, { partOfSpeech: 'v.', meanings: ['发布；发给；发行'] }],
    familiarMeanings: ['正式发放证件、命令或声明'], collocations: ['address an issue', 'issue a statement'],
    derivatives: ['issuer n.'], roots: ['源自“出去”，引申为发布、流出'],
    synonyms: ['matter', 'publish'], confusables: ['tissue'],
    examples: [{ english: 'The agency issued new guidance on how to address the issue.', chinese: '该机构发布了关于如何处理这一问题的新指南。' }],
    memoryTip: '一句中可同时出现动词 issue 和名词 issue，结合位置判断词性。', isKey: true
  }, 10),
  seed({
    term: 'subtle', phonetic: '/ˈsʌtl/',
    meanings: [{ partOfSpeech: 'adj.', meanings: ['微妙的；不易察觉的；巧妙的'] }],
    familiarMeanings: ['思维敏锐、手法精巧的'], collocations: ['a subtle difference', 'subtle changes'],
    derivatives: ['subtlety n.', 'subtly adv.'], roots: ['拼写中的 b 不发音'],
    synonyms: ['delicate', 'nuanced'], confusables: ['settle'],
    examples: [{ english: 'A subtle change in wording can alter how readers interpret the claim.', chinese: '措辞上的细微变化会改变读者理解这一主张的方式。' }],
    memoryTip: '读音中 b 不发音；留意 subtle /ˈsʌtl/。'
  }, 11)
]

