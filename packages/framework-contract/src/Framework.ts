import type {
  DetectionResult,
  FrameworkDetectionDefine,
  KeyReference,
  PackageFileType,
  RefactorContext,
  ScopeRange,
  TextDocumentLike,
  UsageMatchRegex
} from './types'
import type { FrameworkHost } from './host'

export interface FrameworkFeatures {
  LinkedMessages?: boolean
  namespace?: boolean
  VueSfc?: boolean
  pluralization?: boolean
}

export interface Framework {
  // ---------- identity ----------
  readonly id: string
  readonly display: string
  readonly languageIds: readonly string[]
  readonly detection: Partial<Record<PackageFileType, FrameworkDetectionDefine>>

  // ---------- AST-first entry (v1 main path) ----------
  /**
   * Primary detection path. Implementations should:
   *   1. Parse with host.parserAst (cached).
   *   2. Walk for known call sites, JSX attrs, template strings.
   *   3. Use host.scopeBinding to track aliased `t` and useTranslation('ns').
   *   4. Use host.constResolver for KEYS.foo.bar.
   *   5. Use host.templateExpander for `a.${b}.c`.
   * Must NOT throw — return [] on parse failure so core can trigger regex fallback.
   */
  analyze(doc: TextDocumentLike, host: FrameworkHost): Promise<readonly KeyReference[]>

  // ---------- Regex fallback (preserves i18n-ally parity, see docs/.../02 §2.1) ----------
  readonly usageMatchRegex: UsageMatchRegex
  readonly usageMatchLanguages?: readonly string[]
  /** languageIds for which `analyze()` is the source of truth; others fall back to regex. */
  readonly supportAst: readonly string[]

  // ---------- Hard-string detection ----------
  detectHardStrings(
    doc: TextDocumentLike,
    host: FrameworkHost
  ): readonly DetectionResult[] | undefined

  // ---------- Scopes (namespace / keyPrefix) ----------
  getScopeRange(
    doc: TextDocumentLike,
    host: FrameworkHost
  ): readonly ScopeRange[] | undefined

  // ---------- Refactor / extraction templates ----------
  /** Returns ordered candidate replacement snippets (most-preferred first). */
  refactorTemplates(
    keypath: string,
    args: readonly { name: string; expression: string }[] | undefined,
    ctx: RefactorContext
  ): readonly string[]

  // ---------- Key rewriting ----------
  rewriteKeys(
    key: string,
    mode: 'read' | 'write' | 'reference',
    context: { locale?: string; namespace?: string; targetParser?: string }
  ): string

  // ---------- Locale path matcher ----------
  pathMatcher(dirStructure?: 'file' | 'dir'): string

  // ---------- Semantic helpers ----------
  readonly derivedKeyRules?: readonly string[]
  readonly namespaceDelimiter?: string
  readonly enableFeatures?: FrameworkFeatures

  // ---------- Coexistence policy (replaces i18n-ally `monopoly: true`) ----------
  /** Higher wins on tie. */
  readonly priority: number
  /**
   * Explicit allow-list of other framework ids this one consents to coexist with.
   * If omitted, framework is assumed willing to coexist with any.
   */
  readonly compatibleWith?: readonly string[]
}
