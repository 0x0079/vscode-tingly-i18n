# Stream N — next-intl

**Owner**: @0x0079/stream-n-owners

## Scope

Implements the `Framework` contract for `next-intl` (App Router + RSC).

## Files this stream owns exclusively

```
packages/framework-next-intl/**
fixtures/next-intl-app/**
```

## AST detection targets

- `useTranslations('Namespace')` (note: pluralized hook name vs react-i18next)
- `getTranslations({ locale, namespace })` (server)
- `t.rich('key', {...})`, `t.markup`, `t.raw`
- next-intl's namespace argument is a **key prefix**, not a namespace switch:
  fill `KeyReference.keyPrefix`, NOT `namespace`. (See ADR 0001 §3.)

## Acceptance

- Fixture replicates the next-intl docs example (App Router + RSC) and parses correctly.
- `keyPrefix` populated for every t() call inside a `useTranslations` scope.
- `pnpm -F @tingly/framework-next-intl test` passes with ≥ 80% line coverage.
