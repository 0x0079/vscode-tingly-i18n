# 09 · 实施路线图

按用户价值与依赖关系分阶段，每阶段都可独立发布并被使用。

## Phase 0 — 项目骨架（1 周）

- [ ] `package.json`（VS Code engine、activation events、extension manifest）
- [ ] `tsconfig`、`tsup` 或 `esbuild` 构建（不再 webpack）
- [ ] `pnpm` workspace + `vitest` 测试 + `@vscode/test-electron` 集成测试
- [ ] CI（GitHub Actions：lint / typecheck / unit / e2e / package）
- [ ] 单一 `IExtensionContext` DI 容器；`registerModule(name, factory)` 装配
- [ ] `EventBus` 实例（取代 i18n-ally 散落的 `static EventEmitter`）
- [ ] Logger（VS Code OutputChannel + 可选 file sink）

出口标准：`Hello World` 注册命令、容器跑通、测试 Pipeline 绿。

## Phase 1 — Loader & Parser（2 周）

- [ ] Parser 抽象（与 i18n-ally 兼容的两接口）
- [ ] JSON / JSON5 / YAML 实现（位置接口必须，复用 `json-source-map` / `yaml-ast-parser`）
- [ ] LocaleLoader：path matcher DSL + globby + chokidar watcher
- [ ] 树/扁平双视图
- [ ] `tingly: doctor` 命令（诊断扫到的文件、解析的 locale）
- [ ] 单测：覆盖 file/dir 两种 dirStructure、namespace 模式、复数嵌套折叠

出口标准：能从一个 JSON-only 项目正确解析出全部 keys，TreeView 显示进度。

## Phase 2 — VS Code 表层（2 周）

- [ ] Hover Provider（Markdown 表格 + command links）
- [ ] Completion Provider（key 补全 + 翻译值预览）
- [ ] Definition / Reference Provider（基于 parser AST 偏移）
- [ ] Inlay Hints Provider（替代 i18n-ally 的 after decoration）
- [ ] Diagnostic Collection（missing key / missing translation —— 暂用 regex 检测）
- [ ] Status Bar（显示语言 + 缺失数 + 硬字符串数）
- [ ] TreeView：File / Tree / Progress

出口标准：在一个使用 react-i18next 的 demo 项目里，Hover/Completion/Inlay 全部工作。

## Phase 3 — 程序分析升级（3 周，核心差异化）

- [ ] `LanguageAnalyzer` 接口：每框架一个实现，输入文档输出 `KeyReference[]`（含 namespace、isDynamic、astNodeRange）
- [ ] **JS/TS babel + scope 分析**：识别 t / useTranslation / Trans，binding 追踪，常量对象解析
- [ ] **Vue SFC**：`@vue/compiler-sfc` 分别解析 template / script / `<i18n>`
- [ ] **Svelte**：`svelte/compiler` parse
- [ ] AST 失败时降级到正则（保留 `usageMatchRegex` 字段）
- [ ] 工程级索引：ripgrep prefilter + LRU + `.tingly/index.json` 持久化
- [ ] CodeLens（key 健康度，开关）
- [ ] Find All References / Call Hierarchy 接入索引

出口标准：`t(KEYS.foo)` / `useTranslation('ns')` / 模板字面量前缀匹配 全部命中。

## Phase 4 — 抽取与重构（2 周）

- [ ] `extraction/parsers`：babel + html + 命名占位保留
- [ ] `parseHardString` 升级版：保留命名 + 识别 ICU
- [ ] CodeAction（Hard string → Extract、Existing key → Replace、Missing key → Edit/Translate）
- [ ] `extract.ts` 命令：默认 keypath 生成 + 同译文复用 + override 确认
- [ ] 批量抽取：用 CustomEditor 表格视图（分屏审核）
- [ ] 配置：`extract.keygenStrategy: slug | semantic-llm`，后者调 OpenAI 给智能命名

出口标准：在 React/Vue 项目内 `Cmd+.` → "Extract" → 选 keypath → 源码 + locale 文件同步更新。

## Phase 5 — 翻译与协作（2 周）

- [ ] Translator engines：google / google-cn / deepl / libretranslate / openai / anthropic（claude）
- [ ] 候选模式（默认开启）+ 直写模式
- [ ] Review 系统：`.tingly/reviews.yml`，与 i18n-ally 同格式以兼容迁移
- [ ] CommentController 集成（locale 文件行内评论）
- [ ] LLM 上下文翻译：把 key 周围 ±20 行源码 + brand glossary 一起喂给模型

出口标准：在 review 编辑器里能 approve/edit/discard 候选；评论可 commit 到 git。

## Phase 6 — Custom Editor & Webview（2 周）

- [ ] CustomEditor over JSON：locale 文件表格视图（locale 列 + 搜索 + 编辑）
- [ ] 大批量编辑用 webview，但只在用户主动调用时启动
- [ ] 国际化：仅 en + zh-CN，资源外置可懒加载

出口标准：双击 `en.json` 进表格视图，编辑后保存正确同步到所有相关 locale。

## Phase 7 — 工程化与生态（持续）

- [ ] LSP 化（`tingly-language-server` 包）
- [ ] CLI（`npx tingly check` 用于 CI）
- [ ] `eslint-plugin-tingly-i18n`（共用同一 AST 分析器）
- [ ] TMS 集成：Lokalise / Crowdin / POEditor 的 push/pull 命令
- [ ] GitHub App：PR 上自动评论 i18n 风险
- [ ] 设置迁移：从 `i18n-ally.*` 自动转换到 `tingly.*`

## 不做的事（明确）

- ❌ 兼容 < VS Code 1.85（直接用最新 InlayHints + CodeLens API）
- ❌ 维护 17 种语言的内部 i18n（贡献者不足）
- ❌ 自建 PHP / Ruby / Flutter 框架适配（先聚焦 JS/TS 生态：React、Vue、Svelte、Solid、Astro、Next；其它走 "general framework + 用户自定义 regex" 兜底）
- ❌ 内置任何"telemetry 必传"的逻辑（默认 opt-out）
- ❌ 重新发明 webview 编辑器；仅在 CustomEditor 不够用时才用 webview

## 风险与开放问题

1. **AST 分析在大文件里的延迟** —— 需要早做性能基准（10k 行 React 文件 < 100ms 目标）。
2. **跨文件常量对象解析** —— 是否要做完整 import resolver？建议先支持"同文件 + 相邻文件 .keys.ts"。
3. **多 framework 共存的 Loader 路由** —— i18n-ally 的 ComposedLoader 是否可直接搬过来？
4. **CustomEditor + git diff 友好性** —— JSON 排序稳定（i18n-ally 的 `sortKeys`、`sortCompare`）必须默认开。
5. **LLM 翻译的成本/隐私** —— 默认禁用 LLM 引擎，需要用户显式配置 API key 才启用。
