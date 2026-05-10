# Stream Charter

This project is structured for **four parallel framework adapter streams** after Phase 2.5. Each stream owns one package exclusively; the contract package is frozen at the start of parallel work.

## Streams and exclusive file ownership

| Stream | Framework | Owns exclusively |
|---|---|---|
| **R** | react-i18next + next-i18next | `packages/framework-react/**`, `fixtures/react-app/**` |
| **V** | vue-i18n | `packages/framework-vue/**`, `fixtures/vue-app/**` |
| **N** | next-intl | `packages/framework-next-intl/**`, `fixtures/next-intl-app/**` |
| **S** | svelte-i18n + paraglide | `packages/framework-svelte/**`, `fixtures/svelte-app/**` |

## Hard rules

1. A stream PR MUST NOT modify any of:
   - `packages/framework-contract/**`
   - `packages/ast-utils/**`
   - `packages/core/**`
   - `packages/extension/src/providers/**`
   - another stream's package or fixture
2. Changes to the items above go through a separate **core-evolution PR** which requires review from all stream owners and a corresponding ADR if it changes the contract.
3. Each stream ships its own `__fixtures__/` and `__golden__/` and consumes the shared `@tingly/test-kit` runner.
4. Each stream's CI gate is `pnpm -F @tingly/framework-<x> test`. CI fails if a stream's coverage drops below 80%.
5. Performance budget: AST `analyze()` for a 10k-line representative file < 100ms (enforced via `pnpm bench`).

See the implementation plan and `docs/i18n-ally-analysis/` for context.
