# 04 · UI/UX 拆解

VS Code 集成层在 `src/editor/`、`src/views/`、`src/webview/` 三处。

## 4.1 Inline Annotation（`src/editor/annotation.ts`）

这是 i18n-ally 最直观的卖点：

```ts
const underlineDecorationType = window.createTextEditorDecorationType({ textDecoration: 'underline' })
const disappearDecorationType = window.createTextEditorDecorationType({
  textDecoration: 'none; display: none;',  // 把 key 隐藏，用 inplace 翻译
})
const gutterTypes = { none, approve, request_change, comment, conflict, missing }
```

两种模式：

- **"after" annotation**：在 key 后面追加翻译值（`renderOptions.after.contentText`）
- **"in place" annotation**：把 key 整个隐藏，用一个带 border 的盒子"原位"显示翻译

```ts
if (Config.annotationInPlace && cursor 与 key 相交)
  inplace = false           // 编辑时退化回 after，避免输入打架
```

光标在 key 上时，inplace 模式自动退化 —— 这条小细节避免了"我看不到自己输入的字符"的灾难。**值得照搬。**

### Gutter 图标

基于 review 状态：approve / request_change / comment / conflict，加上 missing。复用 SVG 资源。这个机制在做"多人协作 review"时非常有用。

### 性能

```ts
const throttledUpdate = throttle(() => update(), THROTTLE_DELAY)
```

`THROTTLE_DELAY` 默认 400ms。整个 update 是"全文档重算"，没有增量：每次输入字符都全文 regex + 全部 setDecorations。tingly 大文件场景应做范围化更新。

## 4.2 Hover（`src/editor/annotation.ts` + `src/editor/hover.ts`）

Hover 用 Markdown 表格渲染所有 locale 的翻译值：

```ts
function makeMarkdownCommand(command, args) {
  return `command:${command}?${encodeURIComponent(JSON.stringify({ actionSource: 'Hover', ...args }))}`
}
```

表格里的图标都是 `[💬](command:i18n-ally.open_in_editor?...)` 形式的可点击 command link：

- 💬 打开 review 编辑器
- 🌏 翻译这个 key
- ✏️ 编辑
- ↗️ 跳转到 locale 文件

实现细节：用 `MarkdownString.isTrusted = true` 启用 command link。注释里诚实地标了 `// AWAIT_VSCODE_FIX` —— 因为 `$(icon)` 语法在 Markdown table 里有 bug，只能退回 emoji。

## 4.3 Completion（`src/editor/completion.ts`）

触发字符 `'.', '\'', '"', '`', ':'`。逻辑：

```ts
const key = KeyDetector.getKey(document, position, /* dotEnding */ true)
const scopedKey = KeyDetector.getScopedKey(document, position)
```

按命名空间路径找到对应子树，列出子节点 + `commitCharacters: ['.', ':']`。`item.detail` 显示翻译值预览 —— 用户在 `t('home.|')` 处会看到候选 key + 当前语言下的实际译文，是非常 i18n 化的体验。

**痛点**：仍然依赖 `KeyDetector.getKey` 的正则，所以 `t(prefix + |)` 之类无法触发。

## 4.4 Problems（`src/editor/problems.ts`）

用 `languages.createDiagnosticCollection`：

```ts
PROBLEM_CODE_HARD_STRING        = 'i18n-ally-hard-string'
PROBLEM_KEY_MISSING             = 'i18n-ally-key-missing'
PROBLEM_TRANSLATION_MISSING     = 'i18n-ally-translation-missing'
```

三类诊断：

1. **硬编码字符串**（来自 `CurrentFile.hardStrings`）— Warning
2. **代码引用了 locale 里不存在的 key** — Information
3. **代码引用了 locale 里有但当前语言为空的 key** — Information

严重度选择得克制（Information 而不是 Error），避免污染 "Errors and Warnings" 角标。

## 4.5 Quick Fixes（`src/editor/extract.ts` + `refactor.ts`）

Diagnostic → CodeAction 的双链：

### Hard string → Extract

```ts
const diagnostic = ...code === PROBLEM_CODE_HARD_STRING
if (diagnostic?.detection) {
  const extract = new CodeAction('Extract text', QuickFix)
  extract.command = { command: extract_text, arguments: [...DetectionResultToExtraction(...), detection] }
  extract.isPreferred = true
  // 同时给"忽略此字符串" / "在此文件忽略"两个旁支
  return [extract, ignoreByFile, ignore]
}
```

### Missing key → Edit / Translate

```ts
// refactor.ts
actions.push(this.createEditQuickFix(key))
for (const record of Object.values(records)) {
  if (!record.shadow && record.value && record.locale !== Config.displayLanguage)
    actions.push(this.createTranslateQuickFix(key, record.locale))
}
```

如果其它语言已有翻译，会出现"从 fr 翻译""从 ja 翻译"等多个 source 选项，用户选一个走机器翻译。

## 4.6 Definition / Reference（`src/editor/definition.ts`、`reference.ts`）

- **Go to Definition** on a key → 跳到 locale 文件中的具体行（用 parser.parseAST 拿到偏移）
- **Find All References** on a key in a locale file → 用 `Analyst.getAllOccurrenceLocations` 列出所有代码使用点

这两条是 IDE 用户的肌肉记忆，i18n-ally 把 key 当一等公民对接到了 VS Code 的语言服务端口。**必须继承。**

## 4.7 Status Bar（`src/editor/statusbar.ts`）

显示当前 displayLanguage（带 flag emoji），点击切换。简单但常用。

## 4.8 TreeViews（`src/views/`）

```ts
ViewIds.file_in_explorer  // "i18n Ally" panel under Explorer
ViewIds.file              // 同样数据，独立 sidebar
ViewIds.progress          // 各 locale 完成度进度条
ViewIds.tree              // 所有 key 的全树
ViewIds.usage             // 由 Analyst 驱动：active/idle/missing
ViewIds.feedback          // 帮助/反馈链接
```

每个都是标准 `TreeDataProvider`。`UsageReport` 视图的存在让"我有多少废 key"成为一键可见 —— 这是企业用户最在意的功能之一。

## 4.9 Webview Editor（`src/webview/panel.ts`）

独立的 webview 应用（`dist/editor/index.html`）：

```ts
this._panel = window.createWebviewPanel(EXT_EDITOR_ID, ..., {
  enableScripts: true,
  localResourceRoots: [Uri.file(path.join(extensionPath, 'res'))],
  retainContextWhenHidden: true,
})
```

通过 `Protocol`（`src/protocol/`）做 RPC：

```ts
// extension → webview
this._protocol.postMessage({ type: 'route', route: 'open-key', data: {...} })
this._protocol.postMessage({ type: 'context', data: { filepath, keys } })

// webview → extension
case 'navigate-key': this.navigateKey(message.data)   // 反向跳到代码位置
case 'switch-to':    this.openKey(message.keypath)
case 'webview.refresh': this.init()
```

它有两种 mode：

- **standalone** — 独立面板，浏览整棵 locale 树
- **currentFile** — 跟随当前编辑器，列出当前文件用到的 key

配合 `EditorPanel.openKey(keypath)` 可以从 hover 一键跳进编辑器并直接定位到该 key。

**评价**：功能丰富但维护成本高（独立的前端工程、随 VS Code 主题适配、全部 i18n 通过 `updateI18nMessages()` 推送）。tingly 应慎重决策"是否做 webview"。

## 4.10 Review Comments（`src/editor/reviewComments.ts`）

用 VS Code 的 `comments` API（CommentController）—— 这是 GitHub Pull Request 扩展同款机制 —— 在 locale 文件 inline 评论。配 `.vscode/i18n-ally-reviews.yml` 持久化。详见 [`06-translation-and-review.md`](./06-translation-and-review.md)。
