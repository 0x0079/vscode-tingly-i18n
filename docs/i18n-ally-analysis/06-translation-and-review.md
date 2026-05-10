# 06 · 翻译引擎与协作 Review

## 6.1 翻译引擎（`src/translators/`）

```ts
engines = {
  'google':         new GoogleTranslateEngine(),
  'google-cn':      new GoogleTranslateCnEngine(),
  'deepl':          new DeepLTranslateEngine(),
  'libretranslate': new LibreTranslateEngine(),
  'baidu':          new BaiduTranslate(),
  'openai':         new OpenAITranslateEngine(),
}
```

fallback 链由 `Config.translateEngines: string[]` 决定 —— 一个失败就退到下一个：

```ts
for (const engine of engines) {
  try { trans_result = await this._translator.translate(...); if (!err) break }
  catch (e) { errors.push(e) }
}
```

## 6.2 Translator 编排（`src/core/Translator.ts`）

关键模式：

```ts
static translatingKeys: { keypath, locale }[] = []
static isTranslating(node)        // 'tree' / 'node' / 'record' 三层判定

// 进度反馈
window.withProgress({ location: ProgressLocation.Notification, cancellable: true }, async (progress, token) => {
  const parallels = Config.translateParallels  // 默认 5
  const slices = Math.ceil(jobs.length / parallels)
  for (let i = 0; i < slices; i++) {
    const results = await Promise.all(jobs.slice(i*parallels, (i+1)*parallels).map(doJob))
    this.saveTranslations(loader, results)     // 每批完成后立即落盘，避免一次性 N 个 file write
  }
})
```

并发批量 + 取消支持 + 进度通知 + 单条/多条不同的成功/失败提示文案 —— 是"工业级长任务 UX"的标准实现。

## 6.3 翻译候选（`Config.translateSaveAsCandidates`）

```ts
if (Config.translateSaveAsCandidates) {
  await Global.reviews.setTranslationCandidates(...)  // 写到 .vscode/i18n-ally-reviews.yml
} else {
  await loader.write(r.map(i => i.result))             // 直接写到 locale 文件
}
```

两条策略：

- 直接写入：适合"我对自己机翻有信心"
- 候选模式：保留"待审核"，再由 reviewer 在 review 编辑器里 approve / edit / discard

tingly 应默认走候选模式（更安全）。

## 6.4 Review 系统（`src/core/Review.ts`）

持久化在 **`.vscode/i18n-ally-reviews.yml`**（建议 commit），用 `js-yaml` + `lodash.set/get` + `nanoid`：

```yaml
reviews:
  home.title:
    description: "页面 H1 文案"
    locales:
      zh-CN:
        translation_candidate: { source: 'en', text: '主页', time: '2024-...' }
        comments:
          - id: 'kx2...'
            user: { name: 'Alice', email: '...' }
            type: 'request_change'
            comment: '"主页"在我们品牌里习惯用 "首页"'
            suggestion: '首页'
            time: '2024-...'
            resolved: false
```

API：`addComment` / `editComment` / `resolveComment` / `applySuggestion` / `applyTranslationCandidate` / `getCommentsByLocale` / `setDescription`。`reviewUserName/Email` 默认从 `git config user.name/email` 读出 —— 接入 git 身份是低成本但漂亮的做法。

### CommentController 集成（`src/editor/reviewComments.ts`）

用 VS Code 原生 comments API（与 GitHub PR 扩展、Live Share 同款），让 review 评论像"PR 行级评论"那样直接出现在 locale 文件行边。这是 i18n-ally 在 v2 引入的核心新能力，UX 远优于自建面板。

## 6.5 启示

**Review 系统是 i18n-ally 的差异化卖点之一**，但实际上多数团队的 i18n 流程已经在 Lokalise/Crowdin/Phrase 等 SaaS 上了。tingly 在这里的策略选择：

- 保留"轻量行内评论 + git 持久化"作为默认（继承 i18n-ally 的精华）
- 同时**让 SaaS 集成成为一等公民**（Lokalise/Crowdin/POEditor 的 push/pull 命令） —— i18n-ally 没有原生提供，是 tingly 可以补的位
