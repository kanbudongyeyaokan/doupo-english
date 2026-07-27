# 斗破英语

只供个人使用、移动端优先的考研英语单词复习 PWA。单词、FSRS 排期、复习记录、图片、音频、奖励与设置全部保存在当前浏览器的 IndexedDB，不需要后端、账号或登录。

- 在线地址：<https://kanbudongyeyaokan.github.io/doupo-english/>
- 独立数据库：`doupo-english-private-vault-v1`
- “斗破数学”数据库：`math-recall-pwa`（本项目不会打开或迁移它）
- 复习算法：`ts-fsrs`（FSRS v6）

## 当前功能

- 首页：今日待复习、今日新词、快速复习、随机抽词、连续天数、境界/星级/经验、日任务，以及持久化的“词表 + 单元”修炼选择
- 八种模式：英译中、中译英、拼写、选择题、例句填空、熟词生义、易混词辨析、快速闪卡
- 默认先隐藏答案，揭晓后展示词性释义、熟词生义、搭配、派生词、词根词缀、近义/易混词、例句、记忆提示、来源页码、笔记与本机配图
- 英式/美式发音：优先播放用户导入的本地音频；没有音频时使用浏览器语音合成
- 四档 FSRS 评价：完全忘记、模糊记得、基本掌握、非常熟练
- 词库：新增、编辑、删除、全文搜索、章节/单元筛选、收藏、重点/易错标记、标签和批量操作
- 错词本：低评价自动加入，高评价自动移出
- 数据：完整 JSON 备份/恢复、CSV 导入导出、导入冲突预览、合并导入和覆盖恢复
- 安全：尽力申请 persistent storage；完成专注组后及编辑、删除、导入等高风险操作前自动保留最近 5 个本地恢复快照
- PWA：离线启动、安装到桌面、在线升级提示、GitHub Pages 子路径部署
- 修炼系统：11 个境界、每境 1–9 星、连胜、日/周任务、称号、收藏奖励与专注组结算
- 原创动画形象：“焜火学者·何耀焜”会根据已装备衣装、配饰和气息改变外观，动画遵循“减少动画”设置
- 知夏陪伴线：20/50 词解锁线索与同桌剧情，累计掌握 100 词才确认女朋友身份，250/500 词继续解锁长期关系里程碑
- 共鸣与互动：真实强记忆获得共鸣，女朋友剧情解锁后每天可互动一次；同词短时重复不结算奖励
- 灵石坊：有效复习、新掌握、拼写正确和修复错词获得灵石，可购买并装备原创衣装、配饰和气息，不含充值入口

应用不再内置 12 个演示词。Dexie v6 会删除来源精确匹配“斗破英语原创示例词库”的旧演示词，但不会清空私人词库、学习经验或其他设置。个人购买资料、扫描页、长原文和书页图片不应提交到公开仓库。

`v0.4.1` 起，词条支持 `sourceOrder` 单元内顺序。带有 `batch.updateStrategy: "source-authoritative"` 的人工校订包会用新版本替换同一稳定 ID 的教材释义、例句、音标、搭配等来源字段，同时保留 FSRS 排期、学习时间、收藏、易错标记、用户笔记、本地图片和音频。普通“合并导入”包仍沿用追加去重语义。

`v0.4.2` 起，人工校订包还会清除已被新内容替代的 `OCR扫描导入`、`音标待核对`、`释义待核对`、`正文待核对` 等系统审计标签及其自动备注；用户自己填写的笔记和自定义标签仍会保留。

## 本地运行

需要 Node.js 20 以上，推荐 Node.js 22。

```bash
npm install
npm run dev
```

默认地址为 <http://localhost:5173/>。同一局域网手机测试：

```bash
npm run dev -- --host 0.0.0.0
```

生成图标、测试和生产构建：

```bash
npm run icons
npm test
npm run build
npm run preview
```

以 GitHub Pages 子路径在本机验证：

```powershell
$env:VITE_BASE_PATH='/doupo-english/'
npm run build
npm run preview
```

## 数据保存边界

应用代码与个人数据是分开的。普通刷新、关闭重开、离线启动、Service Worker 更新和应用版本升级不会清空 IndexedDB。Dexie 使用固定数据库名，并通过 `version(1) → … → version(6)` 迁移升级；v4 增加掌握词与知夏进度，v5 增加灵石、装扮和事件账本，v6 增加单元选择设置并移除旧演示词。后续不能随意换名或删除旧版本迁移。

在线版本会在启动、每 30 分钟、重新获得窗口焦点以及从后台回到前台时检查更新。发现新版本后由用户点击“立即升级”，只更换缓存的应用文件，不删除 IndexedDB 中的词库、FSRS 排期、关系进度、灵石和装扮。

仍需了解浏览器存储的边界：

- 微信、Safari、Chrome、已安装 PWA、不同域名和不同设备可能使用互相隔离的存储空间。
- 清除站点数据、无痕模式、卸载浏览器、系统空间回收或设备损坏仍可能删除本地副本。
- persistent storage 是“尽可能保护”，不是绝对保证。
- 自动快照保存在同一个 IndexedDB，适合撤销误操作，不能代替外部备份。
- 建议每周在“我的 → 数据保险箱”导出一次完整 JSON，并保存到自己的电脑或私人网盘。

完整 JSON 包含图片和音频的 Base64 内容，因此文件可能较大。CSV 只包含词条文字字段，不包含学习记录和媒体。

## 导入《考研英语词汇红宝书》私人资料

### 本次私人资料处理结果（2026-07-28）

- 用户提供的 `27考研红宝书 考研英语词汇.pdf` 共 442 个 PDF 页面，是没有可用文字层的扫描型 PDF。
- PDF 第 1–364 页已完成 OCR 和结构提取，得到 3,859 个稳定 ID 词条，覆盖“必考词 Unit 1–26”和“基础词 Unit 1–25”当前可见部分，共 51 个单元。
- 11 个被 OCR 丢失或打乱的词头已通过“单元预览、正文释义、原页位置”三方核对恢复，并在词条审计中标记；612 个低置信正文继续保留原页待核对提示。
- 完整私人包位于 `private-materials/imports/redbook-27-complete.json`，审计文件位于同目录的 `redbook-27-complete-audit.json`，另有 13 个每批 4 单元的包位于 `redbook-27-complete-batches/`。
- 51 个逐单元包位于 `private-materials/imports/redbook-27-complete-units/`，从 `01-required-unit-01.json`（必考词 Unit 1，68 词）到 `51-foundation-unit-25.json`（基础词 Unit 25 当前可见 14 词）。可以一次导入完整包，也可以严格按单元顺序合并导入。
- 必考词 Unit 1 的首组 12 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-first-12.json`。顺序为 `radiate`、`radiant`、`radical`、`object`、`objective`、`objection`、`obligation`、`oblige`、`obscure`、`observation`、`observe`、`obsession`；词头、音标、核心释义、搭配和例句已逐项对照 PDF 书页 1–2。该文件被 Git 忽略，不会发布到公开仓库。
- 必考词 Unit 1 的第 13–24 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-13-24.json`。顺序为 `obsolete`、`obtain`、`obvious`、`ideal`、`ideology`、`identical`、`identification`、`identify`、`identity`、`journal`、`journalist`、`journey`；内容已逐项对照 PDF 书页 2–3，并通过稳定 ID、连续顺序、重复导入去重和学习状态保留验证。该文件同样不会发布到公开仓库。
- 必考词 Unit 1 的第 25–36 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-25-36.json`。顺序为 `judge`、`judgment/judgement`、`judicial`、`jury`、`jurisdiction`、`justice`、`justify`、`label`、`lag`、`largely`、`lateral`、`latter`；内容已逐项对照 PDF 书页 3–4，并验证旧 OCR 占位会被校订内容和正确页码替换。
- 必考词 Unit 1 的第 37–48 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-37-48.json`。顺序为 `law`、`lawsuit`、`magnitude`、`magnify`、`magnificent`、`maintain`、`maintenance`、`major`、`majority`、`make`、`theme`、`theory`；内容已逐项对照 PDF 书页 4–6。
- 必考词 Unit 1 的第 49–60 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-49-60.json`。顺序为 `theoretical`、`therapy`、`qualification`、`qualify`、`quality`、`qualitative`、`safeguard`、`safety`、`savage`、`save`、`saving`、`scale`；内容已逐项对照 PDF 书页 6。
- 必考词 Unit 1 的第 61–68 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-01-61-68.json`。顺序为 `scene`、`scenery`、`pace`、`panel`、`panorama`、`prove`、`provide`、`provided`；内容已逐项对照 PDF 书页 6–7，跨页词条保留了两个原始页码。
- 手机端按单元导入请直接使用完整累计包 `private-materials/imports/redbook-27-required-unit-01-first-68.json`。它会用人工校订内容替换 Unit 1 的 OCR 字段，同时保留已有 FSRS 排期、学习记录、笔记、标签、收藏和媒体；已通过 68 个稳定 ID、连续顺序和重复导入去重验证。
- 必考词 Unit 2 的完整 65 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-02-curated.json`。内容已逐项对照 PDF 书页 8–15，按照单元预览页的七列顺序编号 1–65；跨页词条记录起始页和续页。该包已通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、笔记、收藏和本地图片引用保留验证。
- 必考词 Unit 3 的完整 83 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-03-curated.json`。内容已逐项对照 PDF 书页 16–23，按照单元预览页的七列顺序编号 1–83；英美拼写和跨页词条均保留来源说明。该包已通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、笔记、收藏和本地图片引用保留验证。
- 必考词 Unit 4 的首组 12 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-first-12.json`。内容已逐项对照 PDF 书页 24–25，按照单元预览页第一列顺序编号 1–12；同时纠正了 OCR 对末词来源页的跨页误判。该包已通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、笔记、标签、收藏、错词状态和本地图片引用保留验证。
- 必考词 Unit 4 的第 13–24 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-13-24.json`。顺序为 `call`、`calm`、`campaign`、`candidate`、`data`、`database`、`date`、`dazzle`、`deal`、`dealer`、`debate`、`decade`；内容已逐项对照 PDF 书页 25–27，并通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、笔记、标签、收藏和本地图片引用保留验证。
- 必考词 Unit 4 的第 25–36 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-25-36.json`。顺序为 `decide`、`decision`、`decisive`、`decorate`、`economic`、`economical`、`economics`、`economy`、`educate`、`education`、`effect`、`effective`；内容已逐项对照 PDF 书页 27–28，并通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、错词状态、笔记、标签、收藏和本地图片引用保留验证。
- 必考词 Unit 4 的第 37–48 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-37-48.json`。顺序为 `efficiency`、`efficient`、`effort`、`fabric`、`fabricate`、`face`、`facet`、`factor`、`fade`、`fail`、`failure`、`fair`；内容已逐项对照 PDF 书页 28–29，并纠正了 `factor` 被 OCR 误标为跨页词条的问题。该包已通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、错词状态、笔记、标签、收藏和本地图片引用保留验证。
- 必考词 Unit 4 的第 49–60 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-49-60.json`。顺序为 `fairly`、`fall`、`fan`、`fancy`、`fascinate`、`gain`、`gamble`、`gap`、`gene`、`general`、`generalize/generalise`、`habit`；内容已逐项对照 PDF 书页 29–30，保留了 `fancy` 的跨页来源与多词性结构。该包已通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、错词状态、笔记、标签、收藏和本地图片引用保留验证。
- 必考词 Unit 4 的第 61–68 词人工校订包位于 `private-materials/imports/redbook-27-required-unit-04-61-68.json`。顺序为 `habitat`、`hamper`、`handicap`、`shield`、`shift`、`shoulder`、`show`、`shower`；内容已逐项对照 PDF 书页 30–31，纠正了 OCR 粘连、词性、音标和“更迭”等问题，并保留 `shift` 的 2018 年考研阅读例句。完整 Unit 4 的 68 词累计包位于 `private-materials/imports/redbook-27-required-unit-04-curated.json`，可直接在手机端一次合并导入；两种包均通过稳定 ID、连续顺序、重复导入去重，以及 FSRS、错词状态、笔记、标签、收藏和本地图片引用保留验证。
- PDF 第 365–442 页的内嵌 JPEG 数据流只有 2 字节 `0xFFD9`，页面无法渲染或 OCR；“基础词 Unit 25”因此在 PDF 第 364 页后中断，缺失内容没有猜填。需要补充一份完好的 PDF 或从 PDF 第 365 页开始的清晰扫描，才能继续提取。
- 上述路径均被 Git 忽略。公开在线应用不内置商业词书内容；在手机上需要把私人 JSON 保存到“文件”，再进入“我的 → 导入 JSON / CSV → 合并导入”。不同浏览器或已安装 PWA 的数据空间可能相互独立。

把你已经购买的 PDF、扫描页、截图或整理文件上传到当前 Codex 任务。建议按以下流程处理：

1. 先识别目录、章节、单元和印刷页码，记录版本信息。
2. 判断 PDF 是文本型、图文混合型还是扫描型；扫描页先 OCR。
3. 每批处理 2–5 个单元，先交付抽样预览，再生成整批私人 JSON。
4. 提取单词、音标、多词性释义、搭配、例句、熟词生义、派生词、词根词缀与记忆信息。
5. OCR、音标或词义不确定时，在 `notes` 中写明 `待核对：原始页 p.xx`，不静默猜测。
6. 同一个来源中的同一个规范化单词使用稳定 ID；重复导入会合并，不创建副本。
7. 在“我的 → 导入 JSON / CSV”先查看新增、冲突与未变化数量，再选“合并导入”。只有完整备份可以“覆盖恢复”。

资料包的最小结构：

```json
{
  "format": "doupo-english-vocabulary",
  "schemaVersion": 1,
  "batch": {
    "source": "个人购买的红宝书（版本信息）",
    "chapters": ["Chapter 1"],
    "units": ["Unit 1", "Unit 2"],
    "notes": "仅供个人学习"
  },
  "words": []
}
```

应用会以 `normalize(term) + source` 生成稳定 ID。批处理脚本也应调用 `createStableWordId(term, source)`，不要使用数组序号或随机 UUID。一个词的多个词性和重要含义应合并在同一 `WordRecord.meanings` 中。

`private-materials/`、`imports/private/` 和所有 PDF 已加入 `.gitignore`。公开仓库只能提交应用代码、原创示例或明确开放许可的数据，不提交商业教材扫描、书页图片或较长原文。

## CSV 字段

首行使用以下列名；数组字段可用 `；`、`;` 或 `|` 分隔：

```text
term,phonetic,britishPhonetic,americanPhonetic,partOfSpeech,meanings,familiarMeanings,collocations,derivatives,roots,synonyms,confusables,example,exampleTranslation,memoryTip,source,chapter,unit,page,notes,tags,isKey
```

CSV 导入会生成稳定 ID并按 ID 合并。要完整搬家或恢复学习状态，请使用 JSON，不要使用 CSV。

## 测试

测试覆盖：

- 单词新增、编辑、检索、删除与删除前快照
- FSRS 四档排期和四档评价持久化
- 拼写与例句填空判分、合理选择题干扰项
- 稳定 ID 重复导入去重
- 完整 JSON 中的单词、学习记录和 Blob 图片恢复
- CSV 往返
- Dexie v1 → v6 数据库迁移，以及旧档案字段归一化
- Dexie v6 精确移除演示词、保留私人词与掌握记录；新数据库默认不写入示例数据
- 红宝书章节/单元自然排序、单元统计与限定学习队列
- 100 词女朋友门槛、关系阶段、共鸣结算和每日互动防重复
- 灵石结算、短时防刷、购买与按类别装备
- 最近 5 个恢复快照（专注组完成后生成；重复导入未变化词库时不会复制大词库）

生产构建还会生成 manifest、Service Worker 和完整 precache。浏览器验收应同时检查 375×812 手机和桌面视口、离线重新载入、安装 manifest、升级提示和 `/doupo-english/` 子路径静态资源。

## GitHub Pages 部署

仓库内的 `.github/workflows/deploy.yml` 在每次推送 `main` 后执行：

1. `npm ci`
2. `npm test`
3. 设置 `VITE_BASE_PATH=/<仓库名>/` 并生产构建
4. 上传 `dist/` 到 GitHub Pages

首次部署时，在 GitHub 仓库 `Settings → Pages → Build and deployment` 中选择 `GitHub Actions`。部署完成后打开：

```text
https://<GitHub 用户名>.github.io/<仓库名>/
```

本项目的目标地址为 <https://kanbudongyeyaokan.github.io/doupo-english/>。

## 目录

```text
src/db.ts                 Dexie v1-v6、事务、快照、复习/共鸣/灵石写入
src/domain/companion.ts   知夏关系门槛、阶段、共鸣和本地对话
src/domain/economy.ts     灵石收益、原创装扮、购买与装备规则
src/components/CompanionScene.tsx 何耀焜与知夏的 CSS 动画形象
src/domain/fsrs.ts        ts-fsrs 适配与序列化
src/domain/gamification.ts 境界、称号、经验与防刷规则
src/domain/quiz.ts        拼写、填空和干扰项排序
src/domain/units.ts       红宝书章节/单元排序、统计与范围判断
src/utils/backup.ts       JSON/CSV、冲突预览、合并/覆盖恢复
src/pages/ReviewPage.tsx  八种学习模式与四档评价
vite.config.ts            PWA manifest、Workbox 与 Pages base
.github/workflows/        测试、构建和 Pages 部署
```
