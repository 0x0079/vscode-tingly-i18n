import type {
  FrameworkHost,
  ILoaderReadOnly,
  IConfigReadOnly,
  ILogger
} from '@tingly/framework-contract'

export interface FakeLoaderInit {
  /** locale -> keypath -> value */
  data: Readonly<Record<string, Readonly<Record<string, string>>>>
  displayLanguage?: string
  sourceLanguage?: string
  namespaceMode?: boolean
}

export function makeFakeLoader(init: FakeLoaderInit): ILoaderReadOnly {
  const display = init.displayLanguage ?? 'en'
  const source = init.sourceLanguage ?? 'en'
  const all = init.data
  return {
    getKeys(): readonly string[] {
      const keys = new Set<string>()
      for (const locale of Object.keys(all)) {
        for (const k of Object.keys(all[locale] ?? {})) keys.add(k)
      }
      return [...keys]
    },
    getValueByKey(keypath, opts): string | undefined {
      const locale = opts?.locale ?? display
      return all[locale]?.[keypath] ?? all[source]?.[keypath]
    },
    getNodeByKey(keypath, opts): { filepath: string; range: { start: number; end: number } } | undefined {
      const locale = opts?.locale ?? display
      if (all[locale]?.[keypath] === undefined) return undefined
      return { filepath: `${locale}.json`, range: { start: 0, end: 0 } }
    }
  }
}

export function makeFakeConfig(displayLanguage = 'en', sourceLanguage = 'en'): IConfigReadOnly {
  return {
    get<T = unknown>(_k: string, fb?: T): T { return fb as T },
    displayLanguage,
    sourceLanguage
  }
}

export function makeFakeLogger(): ILogger {
  return {
    debug() {}, info() {}, warn() {}, error() {}
  }
}

/**
 * Build a FrameworkHost suitable for unit tests. AST-related ports use real
 * implementations from @tingly/ast-utils once that package's helpers ship; for
 * Phase 2.5 they're stubs that return 'dynamic' / empty results, matching the
 * extension's stubs. Streams that exercise AST paths in their tests should
 * override the relevant port via the `overrides` argument.
 */
export function makeTestHost(
  loaderInit: FakeLoaderInit,
  overrides: Partial<FrameworkHost> = {}
): FrameworkHost {
  return {
    loader: makeFakeLoader(loaderInit),
    config: makeFakeConfig(loaderInit.displayLanguage, loaderInit.sourceLanguage),
    parserAst: { parseJs: () => ({ ast: undefined, errors: [] }) },
    vueParser: { parseSfc: () => ({ i18nBlocks: [] }) },
    svelteParser: { parseSvelte: () => ({ html: undefined }) },
    htmlParser: { walk: () => undefined },
    scopeBinding: { resolveTBinding: () => ({ kind: 'dynamic' }) },
    constResolver: { resolve: () => ({ kind: 'dynamic' }) },
    templateExpander: { expand: () => ({ staticPrefix: '', dynamicMiddle: false, staticSuffix: '' }) },
    logger: makeFakeLogger(),
    ...overrides
  }
}
