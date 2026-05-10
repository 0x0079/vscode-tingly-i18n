export type Locale = string
export type Keypath = string

/** A single message in a locale file (text + position). */
export interface LocaleNode {
  keypath: Keypath
  /** Source value (string) or undefined for branch nodes. */
  value: string | undefined
  /** File this came from. */
  filepath: string
  /** UTF-16 offset range of the *value* literal in the source file. */
  range: { start: number; end: number }
  /** Locale this belongs to. */
  locale: Locale
  /** Optional namespace bucket. */
  namespace?: string
  /** True for branch nodes that have children. */
  isBranch: boolean
}

export interface ParsedFile {
  filepath: string
  locale: Locale
  namespace?: string
  nodes: readonly LocaleNode[]
  errors: readonly { message: string; offset?: number }[]
}

export interface ICoreParser {
  /** File extensions this parser handles, e.g. ['.json']. */
  readonly extensions: readonly string[]
  parse(source: string, ctx: { filepath: string; locale: Locale; namespace?: string }): ParsedFile
  /**
   * Serialize a tree of (keypath -> value) back into source text. Optional in
   * Phase 1 — only json/yaml support write in v1; ecmascript-lite is read-only.
   */
  stringify?(
    entries: ReadonlyMap<Keypath, string>,
    ctx: { existingSource?: string; locale: Locale; namespace?: string }
  ): string
}
