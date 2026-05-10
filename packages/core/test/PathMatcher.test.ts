import { describe, expect, it } from 'vitest'
import { parsePathMatcher } from '../src/pathMatcher/ParsePathMatcher'
import { dryRun } from '../src/pathMatcher/DryRun'

describe('ParsePathMatcher', () => {
  it('matches {locale}.{ext}', () => {
    const m = parsePathMatcher('{locale}.{ext}')
    expect(m.match('en.json')).toEqual({ locale: 'en', ext: 'json' })
    expect(m.match('zh-CN.yml')).toEqual({ locale: 'zh-CN', ext: 'yml' })
    expect(m.match('common/en.json')).toBeUndefined()
  })

  it('matches {locale}/{namespaces}.{ext}', () => {
    const m = parsePathMatcher('{locale}/{namespaces}.{ext}')
    expect(m.match('en/common.json')).toEqual({ locale: 'en', namespaces: 'common', ext: 'json' })
    expect(m.match('en.json')).toBeUndefined()
  })

  it('fill round-trips', () => {
    const m = parsePathMatcher('{locale}/{namespaces}.{ext}')
    expect(m.fill({ locale: 'en', namespaces: 'auth', ext: 'json' })).toBe('en/auth.json')
  })
})

describe('dryRun', () => {
  it('classifies candidates by matcher', () => {
    const m1 = parsePathMatcher('{locale}.{ext}')
    const m2 = parsePathMatcher('{locale}/{namespaces}.{ext}')
    const r = dryRun({
      matchers: [m2, m1],
      candidatePaths: ['en.json', 'fr.json', 'en/auth.json', 'README.md']
    })
    expect(r.matches.filter(x => x.matched).length).toBe(3)
    expect(r.unmatched).toEqual(['README.md'])
    expect([...r.byLocale.keys()].sort()).toEqual(['en', 'fr'])
    expect(r.byNamespace.get('auth')).toEqual(['en/auth.json'])
  })
})
