# 08 · vscode-tingly-i18n 的改造方向

围绕用户布置的三个轴：**UI/UX**、**程序分析**、**VS Code 集成**。

## 1. 程序分析能力（核心差异化）

### 1.1 用 AST/语义而不是正则做 key 识别

**目标**：让以下场景全部能命中：

```ts
t('home.title')                       // 字面量
t(KEYS.home.title)                    // 常量对象
t(`home.${section}.title`)            // 模板字面量
tt('home.title')                      // alias  const tt = t
t('common:home.title')                // ns 前缀
useTranslation('common').t('home')    // ns scope
<Trans i18nKey="home.title" />
<Trans i18nKey={KEYS.home.title} />
```

**实现路径**：

1. 用 `@babel/parser` / `vue-template-compiler` / `@vue/compiler-sfc` / `svelte-preprocess` 拿 AST。
2. 通过 **Binding 解析**（`path.scope.getBinding('t')`）追踪每个 `t` 标识符 → 直到 root 定义（`useTranslation()`、`getTranslation()`、`import { t } from 'i18n'`）。
3. 用 "Hook → Scope" 机制：在 `useTranslation('ns')` 调用处的所在函数 scope 内，把这个 namespace 绑到所有 `t` 引用上。
4. 对常量对象 `KEYS.home.title`：解析 `import KEYS from './keys'`，按文件内静态求值（仅 ObjectExpression + StringLiteral，不执行）。
5. 模板字面量：把静态部分作为 prefix，在 locale 树下做 "prefix match" 显示候选（hover 时展示"该前缀下的所有可能 key"）。

**架构选择**：

- 把分析提取成一个独立的 `LanguageAnalyzer` 接口，每个 framework 提供自己的实现。
- 用 LRU 缓存（按 `(filepath, mtime)`）+ 文档级增量。
- 极端场景（`t(getDynamicKey())`）退化到 "unknown key"，给用户标识 "⚠ 动态 key" 而不是漏检。

### 1.2 工程级索引（取代 Analyst 的简单全扫）

- 启动时用 ripgrep 做"含 `t(`、`useTranslation`、`<Trans`"的文件预筛（命中文件数通常少 10×）。
- 仅对预筛命中的文件做 AST。
- 在 `.tingly-cache/` 缓存索引（按 file mtime 失效），跨会话复用。
- 提供 `tingly: rebuild index` 命令兜底。

### 1.3 LSP 化（中长期）

把分析能力剥到独立 Language Server（Node.js process）：

- 与 IDE 解耦：未来支持 Cursor、JetBrains（通过 LSP4IJ）、Neovim 都不重复造轮。
- 利用 LSP 标准 features：CodeLens、SemanticTokens、Inlay Hints —— 比 VS Code Decoration API 更标准化。
- 为 CI 提供 "tingly check" 命令（独立运行 LSP，输出未翻译报告）。

## 2. UI / UX 改造

### 2.1 用 Inlay Hints 取代 after-decoration

VS Code 1.65+ 提供 `InlayHintsProvider`。它有几个 decoration 没有的优势：

- 主题适配自动
- 支持 hover、可点击 tooltip（`InlayHintLabelPart`）
- 用户可一键全局开关（IDE 内置）
- 不污染 selection / clipboard

保留 "in-place 模式"（隐藏 key、原位替换）作为可选项 —— 它在演示时震撼，但日常工作时增加视觉开销。

### 2.2 用 CodeLens 显示 key 元数据

在 `t('home.title')` 上面/下方显示一行 CodeLens：

```
✅ 6 locales | ⚠ ru, ja missing | 🌍 translate all | 💬 1 comment
```

比 hover 卡片更显眼，是"这条 key 健康度"的眼角余光提示。可配置 `enabled: 'always' | 'on-current-line' | 'off'`。

### 2.3 Custom Editor over locale JSON/YAML

注册 `vscode.window.registerCustomEditorProvider`，让用户**双击 `en.json` 就能进"翻译表格"视图**（VS Code 原生分屏切到"代码"模式）。

相比 i18n-ally 的独立 webview 编辑器：

- 原生 "Reopen Editor With" 切换流畅
- 文件实质仍是 JSON，所有 git/diff 工具都正常工作
- 比 webview panel 更轻量

### 2.4 Quick Pick 增强：模糊 + 翻译双向搜索

Extract 时和 Go-to-Key 时的 picker 接受**双向输入**：

- 输入 "home.title" → 找 key
- 输入 "主页" → 找 value 包含"主页"的 key

i18n-ally 仅 `matchOnDescription = true`，对中文/CJK 模糊不友好。tingly 用 [fzf-style](https://github.com/junegunn/fzf) 算分（pinyin 兼容）。

### 2.5 Status Bar：显式状态而非纯切换器

```
🇨🇳 zh-CN  •  3 missing  •  ⚠ 1 hard string
```

点击展开菜单：切换 displayLanguage / 跳到 missing 列表 / 抽取硬字符串。

### 2.6 错误叙事简化

i18n-ally 的 `Errors.ts` 有十几种错误码，用户面对的是 "AllyError: errors.translating_same_locale"。tingly 改用 "用户视角的描述 + 直接的修复按钮"（参考 GitHub Copilot 错误展示）。

## 3. VS Code 集成（深度）

### 3.1 Extension API 全面利用

| API | i18n-ally | tingly |
|-----|-----------|--------|
| Decoration | ✅ | 仅装饰性场景；翻译值用 InlayHints |
| Hover | ✅ | ✅（保留） |
| Completion | ✅ | ✅ + 模糊翻译值搜索 |
| Diagnostics | ✅ | ✅（沿用三类） |
| CodeAction | ✅ | ✅ + Refactor.Rewrite 子类（结构化重命名） |
| Definition | ✅ | ✅ |
| Reference | ✅ | ✅（基于 AST 索引，更准） |
| **InlayHints** | ❌ | **✅（默认渲染翻译值）** |
| **CodeLens** | ❌ | **✅（key 健康度）** |
| **CustomEditor** | ❌ | **✅（locale JSON 表格视图）** |
| **SemanticTokens** | ❌ | **✅（i18n key 染色）** |
| **CallHierarchy** | ❌ | **✅（key → caller 链）** |
| Comments | ✅ | ✅（沿用，加上"建议翻译"机器学习提示） |
| Webview | ✅ | 谨慎使用（仅大批量 review） |
| TaskProvider | ❌ | **✅ `tingly: extract` task，可接 CI** |
| TestController | ❌ | **✅ "locale 完整度"作为 test 项** |
| TerminalLink | ❌ | **✅** locale paths 在 terminal 输出可点击 |
| Notebook (`.ipynb`) | ❌ | **✅** 在 notebook 里也识别 i18n |

### 3.2 Settings UX

- 提供 `tingly.config.json` schema（与 i18n-ally 兼容映射，自动迁移）
- `tingly: doctor` 命令打印诊断报告（识别到的 framework / locale paths / sample key 解析过程）
- 设置项归入 4 个分组：**Project**（强制配置）、**Display**（注解/Inlay/CodeLens）、**Extract**（抽取规则）、**Translate**（引擎/API key）

### 3.3 多 root / 远程 / Codespaces

- multi-root：每个 folder 独立 LanguageAnalyzer 实例（DI 容器隔离）
- remote：分析在远端跑（Language Server 自然支持），webview 在本地跑（VS Code 自动转发资源）
- Codespaces：把 `tingly: init` 设为 onboarding 命令

### 3.4 与其他扩展协作

- ESLint plugin：tingly 提供 `eslint-plugin-tingly-i18n`，复用同一份 AST 检测器，CI 上跑
- Vitest/Jest plugin：在测试里 assert 翻译完整度
- GitHub PR：Bot 在 PR 上评论 "这次改动新增了 N 个 hard string，建议抽取"

### 3.5 AI 辅助（可选层）

- 用 OpenAI/Claude 引擎做 "上下文感知翻译"（喂 key 周围的源码 + 已有翻译 + brand glossary）
- "Suggest key name" — 抽取硬字符串时让 LLM 基于上下文给一个语义化命名（远好于 i18n-ally 的 slug）
- "Detect terminology drift" — 索引中识别同一术语在不同 locale 里翻译不一致

## 4. 与 i18n-ally 的明确取舍

| 来自 i18n-ally 的部分 | 取舍 | 原因 |
|----------------------|------|------|
| Framework 抽象 | **保留并强化** | 行业最佳实践；新生态扩展 cost 低 |
| Parser 抽象（数据 + 位置接口） | **保留** | 双接口结构本身没问题 |
| Locale 树/扁平双视图 | **保留** | 不可替代 |
| 配置变更分桶（reload/refresh/usage） | **保留** | 优秀的微优化 |
| derivedKeyRules（pluralization 兜底） | **保留** | 解决真实问题 |
| Review 系统 + .yml 持久化 | **保留并轻量化** | 默认开启，但只暴露最常用功能 |
| 翻译引擎 fallback 链 | **保留** | 健壮 |
| usageMatchRegex 正则方案 | **作为 fallback 保留** | AST 失败时降级；但默认走 AST |
| 独立 Webview Editor | **替换为 CustomEditor + 选配 webview** | 维护成本高，UX 与原生差距大 |
| ts-node 子进程 ecmascript parser | **替换** | 用 swc/babel 静态求值 |
| Annotation 全文档重算 | **改为增量 + Inlay Hints** | 性能与主题一致性 |
| static class 单例 | **改为 DI 实例** | 可测试性 |
| 17+ 语言的 i18n | **收敛到 en + zh-CN** | 维护成本不必要 |
