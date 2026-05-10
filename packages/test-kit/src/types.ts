import type { Framework, KeyReference, DetectionResult, ScopeRange } from '@tingly/framework-contract'

/**
 * In-memory fixture: a minimal project layout with one source file (the file
 * under analysis) and optional locale data. The harness materializes this into
 * a TextDocumentLike + a stub LocaleLoader.
 */
export interface FrameworkFixture {
  /** Path -> contents. The first key is the file under analysis. */
  files: Record<string, string>
  /** Optional preloaded locale data: locale -> keypath -> value. */
  locales?: Record<string, Record<string, string>>
  /** Override languageId detection if the extension can't be inferred from the path. */
  languageId?: string
  /** Optional namespace mode for the loader. */
  namespaceMode?: boolean
}

export type GoldenKeyReference = Pick<KeyReference,
  'key' | 'isDynamic' | 'staticPrefix' | 'namespace' | 'keyPrefix' | 'source' | 'via'
>

export type GoldenDetection = Pick<DetectionResult, 'text' | 'isDynamic' | 'source'> & {
  argNames?: readonly string[]
}

export type GoldenScope = Pick<ScopeRange, 'namespace' | 'keyPrefix' | 'namespaceIsDynamic'>

export type TestCase =
  | { kind: 'analyze'; name: string; fixture: FrameworkFixture; expect: readonly GoldenKeyReference[] }
  | { kind: 'detectHardStrings'; name: string; fixture: FrameworkFixture; expect: readonly GoldenDetection[] }
  | { kind: 'scopeRange'; name: string; fixture: FrameworkFixture; expect: readonly GoldenScope[] }
  | { kind: 'pathMatcher'; name: string; dirStructure: 'file' | 'dir'; expect: string }

export interface FrameworkTestKit {
  framework: Framework
  cases: readonly TestCase[]
}
