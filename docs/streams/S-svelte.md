# Stream S — svelte-i18n + paraglide

**Owner**: @0x0079/stream-s-owners

## Scope

Implements the `Framework` contract for both `svelte-i18n` (store-based) and Inlang's `paraglide` (function-call style).

## Files this stream owns exclusively

```
packages/framework-svelte/**
fixtures/svelte-app/**
```

## AST detection targets

- `$_('key')` / `$t('key')` (svelte-i18n stores)
- `{$_('home.title')}` mustache
- paraglide's `m.home_title()` function-style — each function name maps to a keypath through the project's `paraglide.config.js` / `messages/` layout

## Acceptance

- Both runtimes covered.
- Paraglide function-name → keypath resolution tested with golden cases.
- `pnpm -F @tingly/framework-svelte test` passes with ≥ 80% line coverage.
