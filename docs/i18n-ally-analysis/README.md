# i18n-ally 深度分析（为 vscode-tingly-i18n 服务）

本目录是对参考实现 [`lokalise/i18n-ally`](https://github.com/lokalise/i18n-ally)（fork: `0x0079/i18n-ally`，分析提交 `4c504c93`）的体系化拆解，目的是为新插件 **vscode-tingly-i18n** 的设计提供：

- 已被验证的架构骨架（值得继承的部分）
- 真实存在的痛点（值得重做的部分）
- 在 UI/UX、程序分析、VS Code 集成三个轴上的具体改造点

## 阅读顺序

| # | 文件 | 内容 |
|---|---|---|
| 01 | [`01-architecture.md`](./01-architecture.md) | 顶层模块划分、激活流程、事件总线 |
| 02 | [`02-frameworks-and-detection.md`](./02-frameworks-and-detection.md) | 框架适配器、key 检测的 regex 体系、scope/namespace |
| 03 | [`03-loaders-and-parsers.md`](./03-loaders-and-parsers.md) | locale 文件的加载、树/扁平模型、parser 抽象 |
| 04 | [`04-ui-ux.md`](./04-ui-ux.md) | 注解/悬浮/补全/Problems/CodeActions/TreeView/Webview Editor |
| 05 | [`05-extraction-and-refactor.md`](./05-extraction-and-refactor.md) | 硬编码字符串检测、抽取、重构模板 |
| 06 | [`06-translation-and-review.md`](./06-translation-and-review.md) | 机器翻译引擎与 Review/协作系统 |
| 07 | [`07-pain-points.md`](./07-pain-points.md) | 现有方案的真实问题（按可观测严重度排序） |
| 08 | [`08-tingly-improvements.md`](./08-tingly-improvements.md) | tingly-i18n 的改造方向：UI/UX、程序分析、VS Code 集成 |
| 09 | [`09-roadmap.md`](./09-roadmap.md) | MVP → 正式版的分阶段路线图 |

## TL;DR — i18n-ally 教给我们的几件事

1. **正则是一阶近似，不是真相。** 它的 key 检测全部基于 `usageMatchRegex`（见 `src/frameworks/vue.ts`、`react-i18next.ts`），跨命名空间、scope、动态 key、模板字符串都靠 ad-hoc 正则补丁。这是它最大债务，也是 tingly 最大的差异化机会（→ AST/LSP）。
2. **静态全局类不是事故，是它的稳定支柱。** `Global` / `Config` / `CurrentFile` / `Analyst` 都是 `static class` 单例，事件用 `EventEmitter` 串联。结构清晰，便于跨模块调用，但很难单元测试，也不适合多 worker。tingly 应保留分层但解耦掉静态。
3. **"Framework" 抽象是核心创新。** 它把语言生态（Vue/React/Angular/Flutter…）的差异收敛到 `Framework` 子类（`detection`、`languageIds`、`usageMatchRegex`、`refactorTemplates`、`getScopeRange`、`detectHardStrings`），新框架仅需新增一个文件。tingly 应继承这一思想，但把 `usageMatchRegex` 替换/扩展为 AST visitor。
4. **Locale 树/扁平双视图是必须品。** `Loader` 同时维护 `_localeTree`（按命名空间嵌套）与 `_flattenLocaleTree`（按 `keypath` 直查），两者解决了不同读取场景；任何替代实现都得给出对应能力。
5. **"Hard string → CodeAction → Refactor template" 是高价值流。** `problems.ts` 把硬编码字符串变成 Diagnostic，`extract.ts` 把 Diagnostic 转成 QuickFix，`refactor.ts` 把缺失 key 转成 QuickFix。这条链路是用户感知最强的功能。
6. **Webview 编辑器的成本和回报失衡。** `src/webview/panel.ts` 维护一个 `retainContextWhenHidden: true` 的全功能编辑器，配 `Protocol` 双向通信。功能强但维护成本高，并且与 VS Code 原生 UX 隔阂明显。tingly 应优先做 Native UI（CommentController、TreeView、Custom Editor over JSON）。

详见各分册。
