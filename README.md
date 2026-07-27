# 斗破英语

只供个人使用、移动端优先的考研英语单词复习 PWA。单词、FSRS 排期、复习记录、图片、音频、奖励与设置全部保存在当前浏览器的 IndexedDB，不需要后端、账号或登录。

- 在线地址：<https://kanbudongyeyaokan.github.io/doupo-english/>
- 独立数据库：`doupo-english-private-vault-v1`
- “斗破数学”数据库：`math-recall-pwa`（本项目不会打开或迁移它）
- 复习算法：`ts-fsrs`（FSRS v6）

## 当前功能

- 首页：今日待复习、今日新词、快速复习、随机抽词、连续天数、境界/星级/经验、日任务
- 八种模式：英译中、中译英、拼写、选择题、例句填空、熟词生义、易混词辨析、快速闪卡
- 默认先隐藏答案，揭晓后展示词性释义、熟词生义、搭配、派生词、词根词缀、近义/易混词、例句、记忆提示、来源页码、笔记与本机配图
- 英式/美式发音：优先播放用户导入的本地音频；没有音频时使用浏览器语音合成
- 四档 FSRS 评价：完全忘记、模糊记得、基本掌握、非常熟练
- 词库：新增、编辑、删除、搜索、筛选、收藏、重点/易错标记、标签和批量操作
- 错词本：低评价自动加入，高评价自动移出
- 数据：完整 JSON 备份/恢复、CSV 导入导出、导入冲突预览、合并导入和覆盖恢复
- 安全：尽力申请 persistent storage；复习、编辑、删除和导入后自动保留最近 5 个本地恢复快照
- PWA：离线启动、安装到桌面、在线升级提示、GitHub Pages 子路径部署
- 修炼系统：11 个境界、每境 1–9 星、连胜、日/周任务、称号、收藏奖励与专注组结算

内置的 12 个单词仅为原创 MVP 示例，不是《红宝书》原文。个人购买资料、扫描页、长原文和书页图片不应提交到公开仓库。

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

应用代码与个人数据是分开的。普通刷新、关闭重开、离线启动、Service Worker 更新和应用版本升级不会清空 IndexedDB。Dexie 使用固定数据库名，并通过 `version(1) → version(2) → version(3)` 迁移升级；后续不能随意换名或删除旧版本迁移。

仍需了解浏览器存储的边界：

- 微信、Safari、Chrome、已安装 PWA、不同域名和不同设备可能使用互相隔离的存储空间。
- 清除站点数据、无痕模式、卸载浏览器、系统空间回收或设备损坏仍可能删除本地副本。
- persistent storage 是“尽可能保护”，不是绝对保证。
- 自动快照保存在同一个 IndexedDB，适合撤销误操作，不能代替外部备份。
- 建议每周在“我的 → 数据保险箱”导出一次完整 JSON，并保存到自己的电脑或私人网盘。

完整 JSON 包含图片和音频的 Base64 内容，因此文件可能较大。CSV 只包含词条文字字段，不包含学习记录和媒体。

## 导入《考研英语词汇红宝书》私人资料

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
- Dexie v1 → v3 数据库迁移
- 最近 5 个恢复快照

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
src/db.ts                 Dexie v1-v3、事务、快照、复习写入
src/domain/fsrs.ts        ts-fsrs 适配与序列化
src/domain/gamification.ts 境界、称号、经验与防刷规则
src/domain/quiz.ts        拼写、填空和干扰项排序
src/utils/backup.ts       JSON/CSV、冲突预览、合并/覆盖恢复
src/pages/ReviewPage.tsx  八种学习模式与四档评价
vite.config.ts            PWA manifest、Workbox 与 Pages base
.github/workflows/        测试、构建和 Pages 部署
```

