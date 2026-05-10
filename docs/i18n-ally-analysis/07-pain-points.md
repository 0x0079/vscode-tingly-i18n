# 07 · 现存痛点（按可观测严重度排序）

按"用户最常踩" → "开发者最常踩"两个角度排列，编号 P1（致命）→ P3（细节）。

## P1. Key 检测全靠正则 → 误报漏报严重

**症状**

- `t(KEYS.foo)` / `t(prefix + suffix)` / `t(\`a.${b}\`)` 漏检
- 普通字符串字面量在非翻译上下文被误识为 key（项目里出现 `'home.title'` 字符串就会触发）
- alias 后失效：`const tt = useTranslation().t; tt('foo')` 不识别（因为 regex 写死了 `\Wt\(`、`\$t\(` 等）
- JSX `<Trans i18nKey={dynamicKey}>` 漏检

**根因**：`Framework.usageMatchRegex` + `KeyDetector.getKeys()` 用 `text.match(regex)` 全文扫。

**改造方向**：见 [`08-tingly-improvements.md`](./08-tingly-improvements.md) §1。

## P1. 大仓库首扫慢

**症状**：第一次打开 Usage 视图时"扫描中…"持续数十秒，期间 CPU 拉满。

**根因**：`Analyst.getAllOccurrences` 一次性枚举所有 `getSupportLangGlob()` 命中文件，逐一 `workspace.openTextDocument` + `getKeys`。开多语言、规模上千文件就明显。

**改造方向**：用 ripgrep（VS Code 内置）做"候选过滤"，只对包含调用方法名的文件做 AST 分析。

## P1. JS/TS locale 文件需要 ts-node 子进程

**症状**：用户没装 ts-node 或路径不对 → locale 加载失败、`Log.error('writing js')`。`readonly = true` 导致回写无门。

**根因**：`src/parsers/ecmascript.ts` 通过 `child_process.exec` 启动 ts-node 跑 `assets/loader.js`。

**改造方向**：

- 为 "export default { … }" / "module.exports = { … }" 模式写 lite AST parser（ts-morph 或 swc 直接 parse，**不执行**），覆盖 80%+ 真实场景
- 仅对包含动态 require / 函数表达式的复杂文件 fallback 到沙箱执行
- 支持回写（重写 ObjectExpression）

## P2. Annotation 全文档重算 → 大文件抖动

**症状**：在 5000+ 行的 React 文件里输入字符明显卡顿。

**根因**：`annotation.ts` 的 `update()` 完全重算 `_current_usages`，没有按 `TextDocumentChangeEvent.contentChanges` 做范围化失效。

**改造方向**：维护 `(line → KeyInDocument[])` 索引，contentChanges 只清相邻 line 区间。

## P2. namespace 作用域识别脆弱

**症状**：`useTranslation(currentNamespaceVar)` 不识别；`useTranslation(['ns1', 'ns2'])` 仅识别第一个；HOC `withTranslation('ns')` 没有覆盖。

**根因**：`react-i18next.ts:getScopeRange` 用正则搜索 `useTranslation\(\s*\[?\s*['"\`](.*?)['"\`]`。

**改造方向**：AST 级 scope 分析（`useTranslation` call → bind 当前 function-scope namespace）。

## P2. 抽取后命名占位丢失

**症状**：原文 `Hello {{ userName }}` 抽取后变成 `t('hello', [userName])` + `"Hello {0}"` —— 命名变成数字。

**根因**：`parseHardString` 把所有插值统一编号 `{0}`、`{1}`。

**改造方向**：保留命名（`{userName}`），并在 `refactorTemplates` 里生成 `t('hello', { userName })` 形式。同时支持 ICU `{count, plural, ...}` 不被误吃。

## P2. Webview Editor 与 VS Code 主题脱节

**症状**：暗色/亮色切换时 webview 滞后；高对比主题下控件难看；与 native UI 视觉断裂。

**根因**：webview 是独立前端工程，CSS 变量映射不全。

**改造方向**：尽量用 VS Code 原生 UI（QuickPick、TreeView、CommentController、CustomEditor over JSON）。仅在表格/批量编辑等场景才用 webview，且严格走 `vscode-elements` 或 `vscode-codicons` + CSS 变量。

## P2. monopoly 框架的硬编码 list

**症状**：用户同时用 vue + chrome-ext 时，chrome-ext 的 `monopoly: true` 把 vue 顶掉。

**根因**：`getEnabledFrameworks` 里：

```ts
for (const framework of enabledFrameworks)
  if (framework.monopoly) enabledFrameworks = [framework]   // 直接独占
```

**改造方向**：把"独占"改成"高优先级 + 显式声明兼容白名单"。

## P3. 全局 static 单例难测试

**症状**：`Global` / `Config` / `CurrentFile` / `Analyst` / `Translator` 都是 static class，写单测必须 monkey-patch 或在真实 VS Code 测试 host 里。

**改造方向**：保留分层结构，但用实例 + 一个轻量 IoC 容器；`extension.ts` 里把容器注入到 modules。

## P3. i18n-ally 自身 i18n 仅靠 messages 覆盖率

维护成本高（17+ 语言），且很多深层 prompt 文案易过时。tingly 可在初期收敛到 en + zh-CN，把 i18n 资源外置（CDN + 懒加载）。

## P3. 配置项过多（`Config.ts` 600+ 行）

40+ 顶层配置 + 嵌套子节点。`localesPaths` / `pathMatcher` / `dirStructure` / `keystyle` / `namespace` 几个互相耦合，新用户很难配对。

**改造方向**：

- 提供 `tingly: init` 命令做"试运行"：扫描项目、推荐配置、生成 `.vscode/settings.json` patch
- 简化默认值（约定优于配置）
- 复杂配置用 schema 化的 JSON 文件而非散落的 `i18n-ally.x.y.z`

## P3. 缺乏与外部 TMS（Lokalise/Crowdin/Phrase）的开箱集成

Lokalise 是它的 sponsor，但插件本体没有 API 同步能力 —— 用户得装额外的 lokalise-cli。tingly 可以原生支持。
