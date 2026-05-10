// Editor-agnostic primitives. The contract intentionally avoids vscode.* so the
// same package can drive a future LSP server / CLI without changes.

export interface OffsetRange {
  /** UTF-16 code-unit offset into the document text, inclusive start. */
  start: number
  /** Exclusive end offset. */
  end: number
}

export interface TextDocumentLike {
  readonly uri: string
  readonly languageId: string
  readonly version: number
  getText(): string
}

export type SourceKind =
  | 'js-call'         // t('x'), $t('x'), tt('x')
  | 'js-template'     // t(`a.${b}`)
  | 'js-member'       // t(KEYS.a.b)
  | 'jsx-attribute'   // <Trans i18nKey="x" />
  | 'jsx-text'        // raw text inside JSX
  | 'html-inline'     // {{ $t('x') }}
  | 'html-attribute'  // :title="$t('x')"
  | 'vue-i18n-block'  // <i18n>{...}</i18n>
  | 'svelte-mustache' // {$_('x')}

export interface KeyReference {
  /** Resolved key. For dynamic keys, the static prefix only. */
  key: string

  /** True when the key is wholly or partially derived from a runtime expression. */
  isDynamic: boolean

  /**
   * Static prefix when isDynamic. Used for prefix-match completion / inlay hints
   * over a partially-resolved key.
   */
  staticPrefix?: string

  /** Range of the user-facing token (the string literal or attribute value span). */
  range: OffsetRange

  /** Range of the surrounding call / element. CodeAction operates on this. */
  outerRange?: OffsetRange

  /**
   * Namespace at this site — the "switch namespace" semantic from react-i18next:
   *   useTranslation('common') -> namespace='common'
   * Keys are looked up under this namespace's locale tree.
   */
  namespace?: string

  /**
   * Key prefix at this site — the "prefix keys" semantic from next-intl:
   *   const t = useTranslations('Home')
   *   t('title')  ->  effective key 'Home.title'
   * Different from namespace: kept as a separate dimension so streams don't conflate.
   */
  keyPrefix?: string

  source: SourceKind

  /** Confidence channel: AST resolved or regex-fallback. Surfaced to UI. */
  via: 'ast' | 'regex'

  /** Optional opaque ref to the original AST node (Babel/SFC/Svelte). */
  nodeRef?: string
}

export interface DetectionResult {
  /** Raw user-facing text (unescaped). */
  text: string
  range: OffsetRange
  source: SourceKind
  isDynamic: boolean
  /** Named placeholders preserved (fix for 07 P2). */
  args: { name: string; expression: string }[]
}

export interface ScopeRange {
  range: OffsetRange
  namespace?: string
  keyPrefix?: string
  /** True if the namespace/keyPrefix expression couldn't be resolved statically. */
  namespaceIsDynamic?: boolean
}

export interface RefactorContext {
  document: TextDocumentLike
  detection?: DetectionResult
  /** Locale being written to (when refactor implies an immediate write). */
  locale?: string
}

export type UsageMatchRegex =
  | string
  | RegExp
  | (string | RegExp)[]
  | ((opts: { languageId: string; filepath: string }) => string | RegExp | (string | RegExp)[])

/** package.json / pyproject etc. */
export type PackageFileType =
  | 'package.json'
  | 'composer.json'
  | 'pyproject.toml'
  | 'Gemfile'
  | 'pubspec.yaml'
  | 'go.mod'

export interface FrameworkDetectionDefine {
  any?: readonly string[]
  every?: readonly string[]
  none?: readonly string[]
}
