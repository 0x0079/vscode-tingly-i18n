import { describe, expect, it, vi } from 'vitest'
import type { Framework, FrameworkHost, KeyReference, TextDocumentLike } from '@tingly/framework-contract'
import { KeyDetector } from '../src/analysis/KeyDetector'

function stubHost(): FrameworkHost {
  return {
    loader: { getKeys: () => [], getValueByKey: () => undefined, getNodeByKey: () => undefined },
    config: { get: <T,>(_: string, fb?: T) => fb as T, displayLanguage: 'en', sourceLanguage: 'en' },
    parserAst: { parseJs: () => ({ ast: undefined, errors: [] }) },
    vueParser: { parseSfc: () => ({ i18nBlocks: [] }) },
    svelteParser: { parseSvelte: () => ({ html: undefined }) },
    htmlParser: { walk: () => undefined },
    scopeBinding: { resolveTBinding: () => ({ kind: 'dynamic' }) },
    constResolver: { resolve: () => ({ kind: 'dynamic' }) },
    templateExpander: { expand: () => ({ staticPrefix: '', dynamicMiddle: false, staticSuffix: '' }) },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
  }
}

function stubDoc(text: string, languageId = 'typescript'): TextDocumentLike {
  return { uri: 'file:///x.ts', languageId, version: 1, getText: () => text }
}

function stubFw(over: Partial<Framework>): Framework {
  return {
    id: 'test',
    display: 'Test',
    languageIds: ['typescript'],
    detection: {},
    supportAst: ['typescript'],
    async analyze(): Promise<readonly KeyReference[]> { return [] },
    usageMatchRegex: /t\(['"]([\w.]+)['"]\)/g,
    detectHardStrings: () => undefined,
    getScopeRange: () => undefined,
    refactorTemplates: () => [],
    rewriteKeys: (k) => k,
    pathMatcher: () => '{locale}.{ext}',
    priority: 10,
    ...over
  }
}

describe('KeyDetector', () => {
  it('uses AST when supportAst includes the languageId', async () => {
    const fw = stubFw({
      async analyze() {
        return [{ key: 'home.title', isDynamic: false, range: { start: 0, end: 10 }, source: 'js-call', via: 'ast' }]
      }
    })
    const det = new KeyDetector(fw, stubHost())
    const r = await det.detect(stubDoc('t("home.title")'))
    expect(r).toHaveLength(1)
    expect(r[0]?.via).toBe('ast')
  })

  it('falls back to regex when analyze throws', async () => {
    const fw = stubFw({ async analyze() { throw new Error('boom') } })
    const det = new KeyDetector(fw, stubHost())
    const r = await det.detect(stubDoc('t("home.title")'))
    expect(r).toHaveLength(1)
    expect(r[0]?.via).toBe('regex')
    expect(r[0]?.key).toBe('home.title')
  })

  it('respects regex-only mode', async () => {
    const analyze = vi.fn(async () => [])
    const fw = stubFw({ analyze })
    const det = new KeyDetector(fw, stubHost(), { mode: 'regex-only' })
    await det.detect(stubDoc('t("x")'))
    expect(analyze).not.toHaveBeenCalled()
  })

  it('returns from cache on repeat call', async () => {
    const analyze = vi.fn(async () => [{
      key: 'k', isDynamic: false, range: { start: 0, end: 1 }, source: 'js-call' as const, via: 'ast' as const
    }])
    const fw = stubFw({ analyze })
    const det = new KeyDetector(fw, stubHost())
    const doc = stubDoc('t("x")')
    await det.detect(doc); await det.detect(doc)
    expect(analyze).toHaveBeenCalledTimes(1)
  })
})
