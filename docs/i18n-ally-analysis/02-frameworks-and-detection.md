# 02 · 框架适配与 key 检测

## 2.1 `Framework` 抽象（`src/frameworks/base.ts`）

```ts
export abstract class Framework {
  abstract id: string
  abstract display: string
  abstract detection: Partial<Record<PackageFileType, FrameworkDetectionDefine>>
  abstract languageIds: LanguageId[]
  abstract usageMatchRegex: string | RegExp | (...)[] | ((langId?, filepath?) => ...)
  abstract refactorTemplates(keypath, args?, document?, detection?): string[]

  // 可选
  detectHardStrings(document): DetectionResult[] | undefined
  getScopeRange(document): ScopeRange[] | undefined
  pathMatcher(dirStructure?): string
  rewriteKeys(key, source, context): string
  preprocessData / deprocessData
  preferredLocalePaths / preferredKeystyle / preferredDirStructure
  enableFeatures: { LinkedMessages?, namespace?, VueSfc?, FluentVueSfc? }
  derivedKeyRules: string[]
  namespaceDelimiter
  supportAutoExtraction: LanguageId[]
}
```

这是整个项目的扩展点。新增一个生态 = 写一个 `Framework` 子类 + 在 `frameworks/index.ts` 注册。

### 识别（detection）

通过 `package.json` / `pubspec.yaml` / `composer.json` / `Gemfile` 的依赖识别框架：

```ts
// vue.ts
detection = {
  packageJSON: ['vue-i18n', 'vuex-i18n', '@panter/vue-i18next', '@nuxtjs/i18n', ...]
}
```

更复杂的可以是 `{ none, every, any }` 组合或 `(packages, root) => boolean` 函数。

`monopoly: true` 的框架一旦命中会**独占**（如 `chrome-ext`、`vscode`）。`general` 框架是兜底，单独存在时不会启用。

### `usageMatchRegex` —— 全局争议点

```ts
// vue.ts
usageMatchRegex = [
  '(?:i18n(?:-\\w+)?[ \\n]\\s*(?:\\w+=[\'"][^\'"]*[\'"][ \\n]\\s*)?(?:key)?path=' +
  '|v-t=[\'"`{]' +
  '|(?:this\\.|\\$|i18n\\.|[^\\w\\d])(?:t|tc|te)\\()\\s*[\'"`]({key})[\'"`]'
]
```

```ts
// react-i18next.ts
usageMatchRegex = [
  '\\Wt\\(\\s*[\'"`]({key})[\'"`]',
  '\\Wi18nKey=[\'"`]({key})[\'"`]',
]
```

占位符 `({key})` 由 `normalizeUsageMatchRegex` 替换为 `regex.key` 配置（默认 `[\\w\\d\\. \\-\\[\\]]+?`）。

**这是 i18n-ally 最大的负债**：

- 无法处理变量 key：`t(KEYS.foo)` → 完全漏检
- 无法处理模板字符串拼接：`t(`prefix.${kind}`)` → 仅匹配 prefix.
- 无法处理 spread / 高阶包装：`tx(K.a)`、`useTranslation(...).t(...)` 在 alias 后失效
- 字符串字面量出现在非 i18n 上下文（评论、JSON 文件里的同名 key）会误报
- JSX `<Trans i18nKey={dynamic}>` 同样无能为力

tingly 的差异化空间主要在这里。

### `getScopeRange`：命名空间作用域

`react-i18next.ts` 中给出了 useTranslation 命名空间作用域的实现 —— 仍然是正则：

```ts
const regUse = /useTranslation\(\s*\[?\s*['"`](.*?)['"`]/g
for (const match of text.matchAll(regUse)) {
  if (prevGlobalScope) ranges[ranges.length - 1].end = match.index
  ranges.push({ start: match.index, end: text.length, namespace: match[1] })
}
```

它能处理"一个文件多个 useTranslation 切换 ns"的常见模式，但凡变量化（`useTranslation(currentNs)`）就完了。

### `refactorTemplates`：抽取后的替换文案

```ts
// vue.ts
refactorTemplates(keypath, args, doc, detection) {
  switch (detection?.source) {
    case 'html-inline':    return [`{{ $t(${params}) }}`]
    case 'html-attribute': return [`$t(${params})`]
    case 'js-string':      return [`this.$t(${params})`, `i18n.t(${params})`, `t(${params})`]
  }
  return [...]
}
```

根据 detection.source（`html-inline` / `html-attribute` / `js-string` / `js-template` / `jsx-text`）给出**不同位置**的合理替换 —— 这是非常细的 UX 打磨，值得继承。

## 2.2 `KeyDetector`（`src/core/KeyDetector.ts`）

职责：

1. **`getKeyByContent(text)`** — 从任意文本里抽 key（用于 webview）
2. **`getKeyRange(doc, pos)`** — 在编辑器位置上识别一个 key（用于 hover/definition）
3. **`getKey(doc, pos)`** — 同上但只返字符串
4. **`getScopedKey(doc, pos)`** — 返回 position 命中的 namespace（来自 framework.getScopeRange）
5. **`getKeys(doc)`** — 全文扫一遍所有 key（带文件级缓存，按 `onDidChangeTextDocument` 失效）
6. **`getUsages(doc, loader)`** — 区分 "locale 文件" vs "代码文件"，前者用 `parser.annotationGetKeys(doc)`，后者用 `getKeys(doc)`，统一返回 `KeyUsages { type, keys, locale, namespace }`

缓存粒度是"整个文件级"：任何字符变更都把 `_get_keys_cache[filepath]` 删掉。在大文件高频输入时会反复 regex 全扫，性能不算好（见 `07-pain-points.md`）。

## 2.3 `Analyst`：跨文件用法图（`src/core/Analyst.ts`）

以 "keypath → KeyOccurrence[]" 维度建索引：

```ts
_cache: KeyOccurrence[] | null  // 整个工作区扁平数组
```

首次调用时 `enumerateDocumentPaths()`（gitignore 感知 glob）+ `getKeys()` 全扫一遍；之后靠 `workspace.onDidSaveTextDocument` 增量更新。

输出 `UsageReport`：

```ts
{ active: KeyUsage[], idle: KeyUsage[], missing: KeyUsage[] }
```

- **active**：在代码里出现且 locale 文件里有定义
- **idle**：locale 里有但代码里没引用（含 `derivedKeyRules` 兜底，避免误判 `key_plural` 为 idle）
- **missing**：代码里引用但 locale 里没定义

这是 **"可视化无用 key"** 这一卖点的实现，是简单而有效的设计 —— 但**只在用户主动打开 Usage 面板后才会全扫**，首次加载体验在大仓库下会慢（数千文件 × 多个 regex）。

## 2.4 派生 key 规则（`derivedKeyRules`）

```ts
// react-i18next.ts
derivedKeyRules = ['{key}_plural', '{key}_zero', '{key}_one', '{key}_two', '{key}_few', '{key}_many', '{key}_other', '{key}_0', ..., '{key}_9']
```

用 `{key}` 占位符表达"这些是从基础 key 派生的复数/序数 key"，避免被 Analyst 错误归类为 idle。tingly 应直接复用这个机制。
