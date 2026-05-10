# Stream V — vue-i18n

**Owner**: @0x0079/stream-v-owners

## Scope

Implements the `Framework` contract for `vue-i18n` (Composition + Options API + SFC blocks).

## Files this stream owns exclusively

```
packages/framework-vue/**
fixtures/vue-app/**
```

## AST detection targets

- `$t('x')` / `t('x')` (composition API)
- `useI18n({ messageResolver })` scope
- `<i18n-t keypath="x">` / `v-t="'x'"` / `:placeholder="$t('x')"`
- `<i18n>` SFC block as a locale source (ComposedLoader integration in core)

## Acceptance

- All vue-i18n fixtures from i18n-ally pass (porting `docs/.../02 §2.5` examples).
- SFC `<i18n>` block round-trips through `@tingly/core` ComposedLoader.
- `pnpm -F @tingly/framework-vue test` passes with ≥ 80% line coverage.
