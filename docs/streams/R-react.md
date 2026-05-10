# Stream R — react-i18next + next-i18next

**Owner**: @0x0079/stream-r-owners

## Scope

This package implements the `Framework` contract for `react-i18next` (and the next-i18next App Router/Pages Router glue).

## Files this stream owns exclusively

```
packages/framework-react/**
fixtures/react-app/**
```

Do NOT modify outside this scope. See `docs/streams/README.md` for the hard rules.

## AST detection targets

- `t('x')` / `t(`a.${b}`)` / `t(KEYS.x.y)`
- alias: `const tt = t; tt('x')`
- `useTranslation('ns')` / `useTranslation(['a','b'])`
- HOC: `withTranslation('ns')(Component)`
- `<Trans i18nKey="x">` and `<Trans i18nKey={KEYS.x}>`
- `<Trans>` defaultText extraction
- next-i18next's `getStaticProps` / `serverSideTranslations` namespace prop

## Acceptance

- Each P1/P2 case in `docs/i18n-ally-analysis/07-pain-points.md` either resolves correctly or carries `isDynamic: true` (no silent miss).
- ≥ 25 representative golden snippets in `__golden__/`.
- `pnpm -F @tingly/framework-react test` passes with ≥ 80% line coverage.
- A smoke fixture in `fixtures/react-app/` exercises every detection target.
