# 05 · 硬编码字符串识别与抽取

## 5.1 整体流

```
用户编辑文件
  ↓
framework.detectHardStrings(doc) ─→ DetectionResult[]
  ↓
CurrentFile.hardStrings = [...]
  ↓
problems.ts 把它们变成 Diagnostic（PROBLEM_CODE_HARD_STRING）
  ↓
用户 Cmd+. 触发 CodeAction
  ↓
extract.ts 提供"Extract text" Quick Fix
  ↓
用户接受 → commands.extract_text → extractString.ts
  ↓
弹 QuickPick 让用户选/输入 keypath（含"已存在的同译文 key"推荐）
  ↓
promptTemplates → 应用 framework.refactorTemplates → 替换源码
  ↓
loader.write([{ keypath, locale, value }]) → 写回 locale 文件
```

## 5.2 检测器（`src/extraction/parsers/`）

两个核心 parser：

### Babel parser（`extraction/parsers/babel.ts`）

用真正的 AST（`@babel/parser` + `@babel/traverse`）：

```ts
ast = parse(input, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript', 'decorators-legacy'] })
traverse(ast, {
  StringLiteral(path)   { handlePath(path, 'js-string') },
  TemplateLiteral(path) { handlePath(path, 'js-template') },
  JSXText(path)         { handlePath(path, 'jsx-text') },
  JSXElement(path) {
    path.node.openingElement.attributes?.forEach(i => {
      if (ignoredJSXAttributes.includes(i?.name?.name)) recordIgnore(i)  // class/style/key/ref/onClick…
    })
  },
  CallExpression(path) {
    if (isGlobalConsoleId(callee.get('object'))) recordIgnore(path)       // console.log 整体跳过
  },
})
```

关键打磨：

- 忽略 `className`、`style`、`key`、`ref`、`onClick` 等 JSX 属性的字符串值
- 忽略全局 `console.*`（只在没有局部 binding 且 scope 中存在 console 全局时）
- 模板字符串受更严格的 `dynamicRules` 过滤（避免误抓内插路径）
- 忽略区间 `ignores: [number, number][]` 用于嵌套裁剪

### HTML parser（`extraction/parsers/html.ts`）

用 `htmlparser2`：

```ts
attributes: ['title', 'alt', 'placeholder', 'label', 'aria-label']
ignoredTags: ['script', 'style']
vBind: true   // 处理 :title="..." / v-bind:title="..."
```

Vue 内 `<script>` 区域走 babel parser 套娃：

```ts
extractionsParsers.html.detect(text, ..., script => extractionsParsers.babel.detect(script, ...))
```

Svelte 行内函数 `<X on:click={fn}>` 用预处理器替换为字符串属性形式 —— 一个 hack 但有效。

## 5.3 应抽取规则（`src/extraction/rules/`）

两层规则：

- **`DefaultExtractionRules`** — 静态字符串
- **`DefaultDynamicExtractionsRules`** — 模板字面量

规则结构（`shouldExtract`）：基于正则、最小长度、字符类（必须含 letter/CJK 等）。用户可以通过 `extractParserHTMLOptions`、`extractParserBabelOptions`、`extract.ignored`、`extract.ignoredByFiles` 自定义。

## 5.4 `parseHardString`：抽取后的占位变换

```ts
// 'Hello {{ name }}, you have {count} msg' 
// →  trimmed: 'Hello {{ name }}, you have {count} msg'
// →  text:    'Hello {0}, you have {count} msg'
// →  args:    ['name']
export function parseHardString(text, languageId, isDynamic) {
  const trimmed = text.trim().replace(/\s*\r?\n\s*/g, ' ')
  let processed = trimmed
  const args: string[] = []
  if (isDynamic && ['vue', 'js'].includes(languageId))
    processed = stringConcatenationToTemplate(processed).slice(1, -1)
  processed = processed.replace(/(?:\{\{(.*?)\}\}|\$\{(.*?)\})/g, (_, c1, c2) => {
    args.push((c1 ?? c2 ?? '').trim())
    return `{${args.length - 1}}`
  })
  return { trimmed, text: processed, args }
}
```

它把 mustache `{{}}` 与 ES `${}` 内插都吃掉，转成 ICU `{n}` 形式 —— 但**忽略命名 placeholder**（直接编号），这在 i18next 等使用命名插值的项目里会丢信息。tingly 可改进：保留命名（`{name}`）并在 `refactorTemplates` 里把命名传回去。

## 5.5 ExtractString 命令（`src/commands/extractString.ts`）

要看的几处巧思：

### 同译文复用

```ts
existingItems = loader.keys
  .map(key => ({ description: loader.getValueByKey(key, sourceLanguage, 0), keypath: key }))
  .filter(item => item.description === text)
  .map(i => ({ ...i, label: `$(replace-all) ${i.keypath}`, type: 'existed', detail: 'existing translation' }))
```

如果当前抽取的硬字符串恰好在某个 key 下已经有相同译文，会**优先把那些 key 推到选项顶部** —— 一键复用，避免重复 key。

### 自动生成 keypath

```ts
const default_keypath = generateKeyFromText(rawText || text, filepath)
```

按 `Config.keygenStrategy`（默认 `slug`）+ `keygenStyle`（`camel/kebab/...`）+ `keyPrefix` + `extractKeyMaxLength` 把文本变成 key。这是核心的 "开箱即用度" 来源。

### 写入并替换

```ts
const writeKeypath = CurrentFile.loader.rewriteKeys(keypath, 'write', { locale })
await extractHardStrings(document, [{
  range, replaceTo: replacer,
  keypath: shouldOverride === 'skip' ? undefined : writeKeypath,
  message: text, locale,
}])
```

替换源码 + 写回 locale 在一个事务里完成，避免半成品状态。

## 5.6 批量抽取（`extractStringBulk.ts`）

按 framework.detectHardStrings 全文档扫一遍后弹一个 multi-select QuickPick，让用户一次性提取多条。这是一个"翻译动员日"专用的功能，但 UX 复杂、容易出错（重复 key、覆盖确认对话）—— 真实使用率有限。tingly 可考虑用 Quick-Pick 加 webview-table 改造。
