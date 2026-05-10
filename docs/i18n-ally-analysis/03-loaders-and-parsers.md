# 03 · Loaders 与 Parsers

## 3.1 Parser 抽象（`src/parsers/base.ts`）

```ts
export abstract class Parser {
  abstract readonly id: string
  readonly readonly: boolean = false
  constructor(public readonly languageIds: string[],
              public readonly supportedExts: string,
              public options: ParserOptions = {...}) {...}

  supports(ext: string): boolean
  async load(filepath): Promise<object>      // read + parse
  async save(filepath, object, sort, cmp)     // dump + write
  abstract parse(text): Promise<object>
  abstract dump(object, sort, cmp): Promise<string>

  parseAST(text): KeyInDocument[]             // 默认空，JSON/YAML 实现
  navigateToKey(text, keypath, keystyle)
  annotationSupported = false
  annotationLanguageIds: string[] = []
  annotationGetKeys(doc): KeyInDocument[]
}
```

两套接口：

- **数据接口** (`parse`/`dump`/`load`/`save`) — 用于读取/写回 locale 文件
- **位置接口** (`parseAST`/`navigateToKey`/`annotationGetKeys`) — 把每个 key 映射回文件中的 `start/end` 偏移，让"在 zh-CN.json 里悬浮 key 显示英文"这类功能成为可能

## 3.2 实现细节看点

### JSON parser（`src/parsers/json.ts`）

用 `json-source-map` 拿到 JSON Pointer + 偏移：

```ts
parseAST(text) {
  const map = JsonMap.parse(text).pointers
  return Object.entries(map)
    .filter(([k]) => k)
    .map(([k, v]) => ({
      quoted: true,
      start: v.value.pos + 1,
      end: v.valueEnd.pos - 1,
      key: k.slice(1).replace(/\//g, '.').replace(/~0/g, '~').replace(/~1/g, '/'),
    }))
}
```

RFC 6901 的 escape 写得很完整。

### Ecmascript parser（`src/parsers/ecmascript.ts`）

这个是"赤裸地 fork 一个 ts-node 子进程"的实现：

```ts
async load(filepath) {
  const cmd = `${tsNode} --dir "${dir}" --transpile-only --compiler-options "${options}" "${loader}" "${filepath}"`
  child_process.exec(cmd, (err, stdout) => resolve(JSON.parse(stdout.trim())))
}
```

`assets/loader.js` 是一个 transpile + `module.exports` 抓取脚本，用进程隔离规避了把 node_modules 引入扩展进程的风险，但**代价**：

- 每次加载都启动 ts-node（慢）
- `readonly = true` —— 不支持回写 .ts/.js locale
- 进程依赖用户机器上要有 ts-node

这是 tingly 一个明确改进点（→ 用 `@swc/core` / `esbuild` 内置编译，或限定为 "export const" 的 lite parser）。

## 3.3 Loader（`src/core/loaders/Loader.ts`）

核心数据结构：

```ts
protected _flattenLocaleTree: FlattenLocaleTree = {}   // keypath → LocaleNode
protected _localeTree: LocaleTree = new LocaleTree({ keypath: '' })  // 嵌套
```

双视图的好处：

- 渲染 TreeView / Webview 时用嵌套树（保留命名空间）
- `getValueByKey('a.b.c')` / `getNodeByKey('...')` O(1) 查询用 flatten

`LocaleNode` 持有 `locales: Record<locale, LocaleRecord>`，`LocaleRecord` 含 `value`、`filepath`、`shadow`（占位）、`readonly`、`meta`（VueSfcSectionIndex / namespace 等）。

### 复数嵌套适配

```ts
private static NESTED_PLURALIZATION_KEYS = ['one', 'other', 'zero', 'two', 'few', 'many']
```

当 `keystyle !== 'flat'` 且节点的 value 是 `{ one: '...', other: '...' }`，把它折叠成单 LocaleNode 显示——避免把 ICU 复数误识为子树。

### Coverage 计算

```ts
getCoverage(locale, keys?) {
  // → { translated, missing, missingKeys, translatedKeys, emptyKeys, allKeys, total }
}
```

这给 Progress 视图（每个 locale 完成度进度条）提供数据。

### Write 路径

抽象方法 `write(pendings: PendingWrite | PendingWrite[])`，子类（`LocaleLoader`）负责按文件分组、调用 parser.save、并触发 fileWatcher 联动。

## 3.4 LocaleLoader（实际实现）

职责（从结构推断 + Loader API）：

- 用 `Global.getPathMatchers(dirStructure)` 从 framework 拿到"locale 路径模式"
- 通过 `gitignoredGlob` 扫描 `localesPaths` 下匹配的文件
- 为每个文件实例化 parser，调用 `parser.load(filepath)`，传入 `updateTree(...)` 累积构造
- 监听 `workspace.createFileSystemWatcher` 增量更新
- `_onDidChange.fire(filepath)` 通知所有订阅者

## 3.5 Composed / VueSfc / FluentVueSfc loaders

文件级别 fork：

- **`ComposedLoader`** —— 把多个 Loader 合成一个虚拟 Loader（用于 VueSFC 同时维护 `<i18n>` block 与外部 .json）
- **`VueSfcLoader`** —— 解析 `.vue` 内 `<i18n>` block 作为 locale 来源
- **`FluentVueSfcLoader`** —— 同上但针对 `.ftl`

这是一种"locale 不必住在文件里"的扩展能力。tingly 应保留同等抽象（如 React 的 inline `defineMessages`、Flutter 的 `.arb`）。

## 3.6 路径匹配器（`PathMatcher`）

来自 `framework.pathMatcher(dirStructure)`：

```
{locale}.{ext}                        // file 模式
{locale}/**/{namespace}.{ext}         // 启用 namespace
{locale}/**/*.{ext}                    // dir 模式
```

`ParsePathMatcher(pattern, parserExts)` 把它变成 `RegExp`，从绝对路径反解出 `locale`、`namespace`。这套 mini-DSL 能力强但调试痛苦（用户最常 issue："为什么没识别到我的 locale 文件"）。tingly 应额外提供一个 "试运行" 命令来打印"扫到了哪些文件 + 解析为什么 locale"。
