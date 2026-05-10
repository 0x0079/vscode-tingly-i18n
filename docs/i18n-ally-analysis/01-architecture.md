# 01 · 顶层架构

## 1.1 入口（`src/extension.ts`）

```ts
export async function activate(ctx: ExtensionContext) {
  Config.ctx = ctx
  i18n.init(ctx.extensionPath)
  KeyDetector.init(ctx)
  await Global.init(ctx)
  CurrentFile.watch(ctx)

  const modules = [commandsModules, editorModules, viewsModules]
  const disposables = flatten(modules.map(m => m(ctx)))
  disposables.forEach(d => ctx.subscriptions.push(d))
}
```

关键点：

- 三个静态单例先初始化（`Config` / `i18n` / `KeyDetector`），随后异步初始化 `Global`（它持有所有运行期状态）。
- 所有功能切片以 `ExtensionModule = (ctx) => Disposable[]` 的纯函数形式注入；`extension.ts` 只负责装配。这一点值得 tingly 继承。

## 1.2 模块划分

```
src/
  core/             # 领域层：Global / Config / Loader / Analyst / Translator / Review
    loaders/        # LocaleLoader、ComposedLoader、VueSfcLoader、FluentVueSfcLoader
  frameworks/       # ~30 个框架适配器，全部继承 Framework
  parsers/          # JSON / JSON5 / YAML / INI / PHP / PO / Properties / FTL / JS-TS
  packagesParsers/  # package.json / pubspec.yaml / composer.json / Gemfile 解析
  extraction/       # 硬编码字符串识别（babel/html）+ 规则系统
  editor/           # VS Code 编辑器层 provider：annotation/hover/completion/problems...
  views/            # TreeView providers（Explorer 面板）
  webview/          # 自带 Editor UI（独立 webview 应用）
  commands/         # 所有命令实现
  translators/      # google / google-cn / deepl / libretranslate / baidu / openai
  protocol/         # webview 与 extension 的消息协议
  tagSystems/       # 语言标签系统（bcp47 等）
  utils/, views/, i18n.ts, links.ts, meta.ts, modules.ts, env.ts
```

层级是清晰的洋葱：`core` 是最内层，`editor`/`views`/`webview`/`commands` 是 VS Code 适配层。

## 1.3 事件总线

VS Code 没有内置事件总线，i18n-ally 用 `EventEmitter` 自建：

- `Global.onDidChangeRootPath` / `onDidChangeEnabled` / `onDidChangeLoader`
- `Loader.onDidChange`
- `CurrentFile.onHardStringDetected`
- `Analyst.onDidUsageReportChanged`
- `Translator.onDidChange`
- `Reviews.onDidChange`
- `EditorPanel.onDidChange`

所有 UI 模块（annotation、problems、views、webview）都订阅这些事件做局部刷新。

**继承点**：tingly 可保留同一组事件，但建议放到一个 `EventBus` 实例（DI 形式）而不是分散在各个 `static class`，便于 mock 和多工作区隔离。

## 1.4 配置加载与热更新（`Config.ts`）

配置改动通过 `workspace.onDidChangeConfiguration` 触发 `Global.update(e)`，再据 key 类别决定动作：

```ts
static readonly reloadConfigs = ['localesPaths', 'enabledFrameworks', 'namespace', ...]
static readonly refreshConfigs = ['sourceLanguage', 'displayLanguage', 'regex.usageMatch', ...]
static readonly usageRefreshConfigs = ['keysInUse', 'derivedKeyRules']
```

- `reloadConfigs` 改动 → 重建 LocaleLoader
- `refreshConfigs` 改动 → 仅重新计算注解/usage
- `usageRefreshConfigs` → 触发 `Analyst.refresh()`

这套"配置变更分桶"机制减少了不必要的重启，是值得照搬的优化。

## 1.5 工作区根路径与多 root 支持

`Global._currentWorkspaceFolder` 跟踪当前活动编辑器所在 workspace folder，每个 folder 一个 `LocaleLoader`：

```ts
private static _loaders: Record<string, LocaleLoader> = {}
```

这样实现了 multi-root 隔离，但代价是 `Global.loader` 是"当前 root 的"，跨编辑器切换时所有视图都要响应 `onDidChangeRootPath`。

## 1.6 启用判定

```ts
const isValidProject = this.enabledFrameworks.length > 0 && this.enabledParsers.length > 0
const hasLocalesSet = !!Global.localesPaths
const shouldEnabled = !Config.disabled && isValidProject && hasLocalesSet
```

触发条件需要框架被识别 **且** locale 路径存在。如果只有路径而没有框架，会建议运行 `ConfigLocalesGuide.autoSet()`；如果什么都没有，则插件保持静默 disabled，避免污染无关项目。

**继承点**：这种"先识别再激活"的策略值得保留 —— 用户在非 i18n 项目里看不到按钮、装饰，体验干净。
