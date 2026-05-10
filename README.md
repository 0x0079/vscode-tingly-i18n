# vscode-tingly-i18n

Next-generation i18n VS Code extension. Forked conceptually from `lokalise/i18n-ally`; rebuilt around an AST-first detection pipeline + a frozen framework adapter contract that lets four framework streams (react-i18next, vue-i18n, next-intl, svelte-i18n) develop in parallel.

Status: under active development on `claude/analyze-i18n-ally-lgZJL`. Not yet published.

## Architecture

See:
- `docs/i18n-ally-analysis/` — 9-doc deep dive of the legacy extension this fork builds on top of
- `docs/adr/0001-framework-contract.md` — the frozen contract between core and framework streams
- `docs/streams/README.md` — stream charter + isolation rules

## Layout

```
packages/
  extension/                 ships as the VS Code extension
  framework-contract/        the parallelism boundary (frozen)
  ast-utils/                 shared Babel helpers (parser, scope, constants, templates, JSX, SFC scripts)
  core/                      Loader, LocaleTree, Parsers (json/yaml/ecmascript-lite), PathMatcher, KeyDetector
  test-kit/                  golden-test harness consumed by every stream
  framework-general/         regex-only fallback
  framework-react/           Stream R: react-i18next + next-i18next
  framework-vue/             Stream V: vue-i18n
  framework-next-intl/       Stream N: next-intl (uses keyPrefix, not namespace)
  framework-svelte/          Stream S: svelte-i18n + paraglide
```

## Develop

```
pnpm install
pnpm -r build
pnpm test
pnpm -F @tingly/extension package    # produces tingly-extension.vsix
```

## License

MIT.
