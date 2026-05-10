import { describe, expect, it } from 'vitest'
import type { Framework } from '@tingly/framework-contract'
import { resolveActiveFrameworks } from '../src/frameworks/registry'

function fw(id: string, priority: number, compatibleWith?: readonly string[]): Framework {
  return {
    id, display: id, languageIds: [], detection: {}, supportAst: [],
    async analyze() { return [] },
    usageMatchRegex: /./,
    detectHardStrings: () => undefined,
    getScopeRange: () => undefined,
    refactorTemplates: () => [],
    rewriteKeys: (k) => k,
    pathMatcher: () => '',
    priority,
    ...(compatibleWith !== undefined ? { compatibleWith } : {})
  }
}

describe('resolveActiveFrameworks', () => {
  it('returns empty when nothing detected', () => {
    expect(resolveActiveFrameworks([])).toEqual([])
  })

  it('orders by priority desc', () => {
    const r = resolveActiveFrameworks([fw('a', 10), fw('b', 50), fw('c', 30)])
    expect(r.map(f => f.id)).toEqual(['b', 'c', 'a'])
  })

  it('higher-priority framework with exclusive compatibleWith blocks lower ones', () => {
    // 'next-intl' (high) declares it only coexists with 'react'; 'react-i18next' would conflict.
    const r = resolveActiveFrameworks([
      fw('next-intl', 100, ['react']),
      fw('react-i18next', 50)
    ])
    expect(r.map(f => f.id)).toEqual(['next-intl'])
  })

  it('compatible frameworks both survive', () => {
    const r = resolveActiveFrameworks([
      fw('vue-i18n', 100, ['vue']),
      fw('vue', 50, ['vue-i18n'])
    ])
    expect(r.map(f => f.id).sort()).toEqual(['vue', 'vue-i18n'])
  })
})
