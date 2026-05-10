# ADR 0001 — Framework Adapter Contract

## Status
Accepted (Phase 2.5 gate). Frozen at this commit; future changes require a new ADR.

## Context
The v1 plan ships four framework adapters (`framework-{react,vue,next-intl,svelte}`) developed in parallel after a skeleton phase. To make that parallelism real — i.e. four PRs that don't conflict and don't bleed concerns into each other — the `Framework` interface must be locked before the streams start. This ADR records the load-bearing decisions.

## Decision

### 1. Editor-agnostic primitives
The contract uses `OffsetRange { start, end }` (UTF-16 offsets) and `TextDocumentLike { uri, languageId, version, getText() }` instead of `vscode.Range` / `vscode.TextDocument`. This keeps the same package usable from a future LSP server / CLI without rewrite (see `docs/i18n-ally-analysis/09-roadmap.md` Phase 7).

### 2. AST-first with regex fallback as a contract surface
`Framework.analyze(doc, host) -> Promise<KeyReference[]>` is the v1 main path; `usageMatchRegex` is preserved as a parity field (i18n-ally compat — see `docs/.../02 §2.1`). `KeyDetector` dispatches deterministically:
1. If `mode = 'regex-only'`, run regex.
2. Else if `doc.languageId ∈ supportAst`, await `analyze()` (1s timeout).
3. On throw / timeout / empty AST result, log and run regex.

Each `KeyReference.via: 'ast' | 'regex'` carries the confidence channel; UI surfaces it through an opt-in `tingly.diagnostics.showRegexFallback` Hint diagnostic and a status bar badge.

### 3. `namespace` and `keyPrefix` are separate fields
- `namespace` represents the react-i18next "switch namespace" semantic: keys are looked up under a different subtree.
- `keyPrefix` represents the next-intl "prefix keys" semantic: keys are concatenated with a path prefix.

These are different operations that produce the same effective key but differ in storage layout, refactor behavior, and fallback rules. Splitting them at the contract level prevents stream R and stream N from each hacking around a single field.

### 4. `priority` + `compatibleWith` replaces `monopoly: true`
i18n-ally's `monopoly: true` made one framework win — buggy in mixed projects (Next.js + react-i18next + chrome-extension). The replacement:
- `priority: number` — higher wins on tie.
- `compatibleWith?: string[]` — explicit allow-list; when omitted, framework consents to coexist with any other.

`resolveActiveFrameworks` (in `@tingly/core`) sorts by `(priority desc, id asc)`, then drops any candidate whose `compatibleWith` excludes a higher-priority survivor. This fixes `docs/.../07-pain-points.md P2`.

### 5. `host` provides shared services (no global singletons)
Frameworks never import `@tingly/core` directly. They consume `FrameworkHost`, which gives them:
- `loader`, `config`, `logger` — the basics
- `parserAst`, `vueParser`, `svelteParser`, `htmlParser` — parser ports
- `scopeBinding`, `constResolver`, `templateExpander` — shared AST helpers from `@tingly/ast-utils`

This preserves dependency direction (core → contract ← framework) and means the test-kit can swap any service for a fake.

### 6. `analyze()` may not throw
Frameworks must catch their own exceptions and return `[]` on parse failure. The KeyDetector logs and falls back to regex. Throwing is a contract violation that breaks editor responsiveness.

### 7. Performance budget is a CI gate
For the representative 10k-line React fixture, `analyze()` < 100ms. `pnpm bench` runs in CI; regression fails the build. (Plan §F item 5.)

### 8. Stream isolation is enforced by `CODEOWNERS`
A stream PR may not touch `packages/{framework-contract, ast-utils, core}/**` or another stream's package. Core changes go through a separate PR co-reviewed by all stream owners and require an ADR if the contract surface changes.

## Consequences
- Each stream owns ~500–700 LOC; shared work lives in `@tingly/ast-utils`.
- The contract is frozen: changing `KeyReference` after this point requires a new ADR superseding this one and a coordinated PR.
- The gate before the four streams begin: every stream produces a `kit.ts` (under `__tests__/`) and consumes `runFrameworkTestKit`; CI runs them in isolation per package.
