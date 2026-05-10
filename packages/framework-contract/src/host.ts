// What core gives a Framework when it calls analyze() / detectHardStrings() / etc.
// Each port is defined by behavior, not implementation, so streams stay testable
// against in-memory fakes provided by @tingly/test-kit.

import type { TextDocumentLike } from './types'

export interface ILoaderReadOnly {
  /** All known keypaths under (optional) namespace, flattened. */
  getKeys(opts?: { namespace?: string }): readonly string[]
  /** Resolve a value for the active or specified locale. */
  getValueByKey(
    keypath: string,
    opts?: { locale?: string; namespace?: string }
  ): string | undefined
  /**
   * Locate the source position of a key (for go-to-definition).
   * Returns offsets within the file at `filepath`.
   */
  getNodeByKey(
    keypath: string,
    opts?: { locale?: string; namespace?: string }
  ): { filepath: string; range: { start: number; end: number } } | undefined
}

export interface IConfigReadOnly {
  get<T = unknown>(key: string, fallback?: T): T
  /** Active locale code, e.g. 'en' or 'zh-CN'. */
  readonly displayLanguage: string
  /** Source-of-truth locale (used as 'fallback / authoritative'). */
  readonly sourceLanguage: string
}

export interface IParserAstService {
  /**
   * Parse + cache a JS/TS file. The returned `ast` is opaque to the contract;
   * frameworks downcast to the parser-specific type they expect.
   * Cache key = (uri, version, contentHash).
   */
  parseJs(doc: TextDocumentLike): { ast: unknown; errors: readonly string[] }
}

export interface IVueSfcService {
  parseSfc(doc: TextDocumentLike): {
    template?: { source: string; offset: number }
    script?: { source: string; offset: number; lang?: string }
    scriptSetup?: { source: string; offset: number; lang?: string }
    i18nBlocks: readonly { lang?: string; locale?: string; source: string; offset: number }[]
  }
}

export interface ISvelteParserService {
  parseSvelte(doc: TextDocumentLike): {
    html: unknown
    instance?: { source: string; offset: number }
    module?: { source: string; offset: number }
  }
}

export interface IHtmlParserService {
  walk(
    text: string,
    handlers: {
      onTag?: (name: string, attrs: Record<string, string>, range: { start: number; end: number }) => void
      onAttribute?: (
        tag: string,
        name: string,
        value: string,
        range: { start: number; end: number }
      ) => void
      onMustache?: (expr: string, range: { start: number; end: number }) => void
      onText?: (text: string, range: { start: number; end: number }) => void
    }
  ): void
}

export interface IScopeBindingService {
  /**
   * Given a call-site path (opaque), resolve which `t` it refers to and
   * what namespace/keyPrefix the surrounding scope binds.
   * Returns `{ kind: 'dynamic' }` when the binding can't be statically resolved
   * — callers should mark the resulting KeyReference with isDynamic=true.
   */
  resolveTBinding(callPathRef: unknown): TBindingResolution
}

export type TBindingResolution =
  | {
      kind: 'static'
      via: 'useTranslation' | 'getTranslations' | 'useTranslations' | 'imported' | 'aliased'
      namespace?: string
      keyPrefix?: string
    }
  | { kind: 'dynamic' }

export interface IConstantResolverService {
  /**
   * Resolve `KEYS.foo.bar` style member expressions to a literal string
   * via same-file ObjectExpression literals + the user-configured
   * `tingly.analysis.constantResolverPaths` glob whitelist for sibling files.
   */
  resolve(memberPathRef: unknown):
    | { kind: 'static'; value: string; via: 'same-file' | 'sibling-keys' }
    | { kind: 'dynamic' }
}

export interface ITemplateLiteralExpander {
  expand(templateNodeRef: unknown): {
    staticPrefix: string
    dynamicMiddle: boolean
    staticSuffix: string
  }
}

export interface ILogger {
  debug(msg: string, ...args: unknown[]): void
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
}

export interface FrameworkHost {
  loader: ILoaderReadOnly
  config: IConfigReadOnly
  parserAst: IParserAstService
  vueParser: IVueSfcService
  svelteParser: ISvelteParserService
  htmlParser: IHtmlParserService
  scopeBinding: IScopeBindingService
  constResolver: IConstantResolverService
  templateExpander: ITemplateLiteralExpander
  logger: ILogger
}
