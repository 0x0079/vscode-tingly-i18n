# ADR 0000 — Record Architecture Decisions

## Status
Accepted.

## Context
We need a lightweight, durable way to record architecturally significant decisions for `vscode-tingly-i18n` so that contributors (and future agents) understand the *why* behind core constraints, especially the framework contract that gates four parallel streams.

## Decision
Use Markdown ADRs in `docs/adr/`, numbered sequentially. Each ADR follows: Status / Context / Decision / Consequences. ADRs are append-only — supersede with a new ADR rather than editing.

## Consequences
- New contributors can read `docs/adr/` to understand load-bearing decisions before touching code.
- The framework contract (ADR 0001, scheduled for Phase 2.5) becomes the explicit lock between core and stream owners.
