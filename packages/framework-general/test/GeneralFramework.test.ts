import { describe, expect, it } from 'vitest'
import { GeneralFramework } from '../src/GeneralFramework'

describe('GeneralFramework', () => {
  it('has lowest priority so any real adapter wins', () => {
    expect(GeneralFramework.priority).toBe(0)
  })

  it('returns [] from analyze (forces regex fallback)', async () => {
    const result = await GeneralFramework.analyze(
      { uri: 'file:///x.ts', languageId: 'typescript', version: 1, getText: () => '' },
      // host is unused
      {} as never
    )
    expect(result).toEqual([])
  })

  it('refactor templates put the canonical t() form first', () => {
    const tpl = GeneralFramework.refactorTemplates('home.title', undefined, {
      document: { uri: '', languageId: 'typescript', version: 0, getText: () => '' }
    })
    expect(tpl[0]).toBe("t('home.title')")
  })

  it('pathMatcher honors dirStructure', () => {
    expect(GeneralFramework.pathMatcher('file')).toBe('{locale}.{ext}')
    expect(GeneralFramework.pathMatcher('dir')).toBe('{locale}/{namespaces}.{ext}')
  })
})
