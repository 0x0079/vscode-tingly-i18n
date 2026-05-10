import type { ParsedPathMatcher } from './ParsePathMatcher'

export interface DryRunInput {
  matchers: readonly ParsedPathMatcher[]
  /** Relative paths discovered under the configured locales root. */
  candidatePaths: readonly string[]
}

export interface DryRunMatch {
  filepath: string
  matched: boolean
  matcher?: ParsedPathMatcher
  parts?: { locale?: string; namespaces?: string; ext?: string }
}

export interface DryRunReport {
  matches: readonly DryRunMatch[]
  unmatched: readonly string[]
  byLocale: ReadonlyMap<string, readonly string[]>
  byNamespace: ReadonlyMap<string, readonly string[]>
}

export function dryRun(input: DryRunInput): DryRunReport {
  const matches: DryRunMatch[] = []
  const unmatched: string[] = []
  const byLocale = new Map<string, string[]>()
  const byNamespace = new Map<string, string[]>()
  for (const fp of input.candidatePaths) {
    let hit: DryRunMatch | undefined
    for (const matcher of input.matchers) {
      const parts = matcher.match(fp)
      if (parts) {
        hit = { filepath: fp, matched: true, matcher, parts }
        break
      }
    }
    if (hit) {
      matches.push(hit)
      const locale = hit.parts?.locale
      if (locale) {
        const arr = byLocale.get(locale) ?? []
        arr.push(fp)
        byLocale.set(locale, arr)
      }
      const ns = hit.parts?.namespaces
      if (ns) {
        const arr = byNamespace.get(ns) ?? []
        arr.push(fp)
        byNamespace.set(ns, arr)
      }
    } else {
      matches.push({ filepath: fp, matched: false })
      unmatched.push(fp)
    }
  }
  return { matches, unmatched, byLocale, byNamespace }
}
