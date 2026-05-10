/**
 * Mini-DSL: docs/i18n-ally-analysis/03-loaders-and-parsers.md §3.6
 *
 * Tokens: {locale}, {namespaces}, {ext}
 * Literal characters in between are matched verbatim.
 *
 * Examples:
 *   '{locale}.{ext}'                -> en.json, fr.yaml
 *   '{locale}/{namespaces}.{ext}'   -> en/common.json, en/auth.json
 *   '{namespaces}/{locale}.{ext}'   -> common/en.json
 *
 * Regex compilation captures named groups for the same names.
 */

export type DirStructure = 'file' | 'dir'

export interface ParsedPathMatcher {
  pattern: string
  regex: RegExp
  match(filepath: string): { locale?: string; namespaces?: string; ext?: string } | undefined
  fill(parts: { locale: string; namespaces?: string; ext: string }): string
}

const TOKEN = /\{(locale|namespaces|ext)\}/g

export function parsePathMatcher(pattern: string): ParsedPathMatcher {
  // Build a regex with named capture groups, escaping literals.
  let regexSrc = '^'
  let last = 0
  for (const m of pattern.matchAll(TOKEN)) {
    regexSrc += escape(pattern.slice(last, m.index ?? 0))
    const name = m[1] as 'locale' | 'namespaces' | 'ext'
    regexSrc += name === 'ext' ? `(?<${name}>[A-Za-z0-9]+)` : `(?<${name}>[^/\\\\.]+)`
    last = (m.index ?? 0) + m[0].length
  }
  regexSrc += escape(pattern.slice(last)) + '$'
  const regex = new RegExp(regexSrc)
  return {
    pattern,
    regex,
    match(filepath) {
      const m = regex.exec(filepath.replace(/\\/g, '/'))
      if (!m || !m.groups) return undefined
      const result: { locale?: string; namespaces?: string; ext?: string } = {}
      const locale = m.groups['locale']
      if (locale !== undefined) result.locale = locale
      const namespaces = m.groups['namespaces']
      if (namespaces !== undefined) result.namespaces = namespaces
      const ext = m.groups['ext']
      if (ext !== undefined) result.ext = ext
      return result
    },
    fill(parts) {
      let out = pattern
      out = out.replace('{locale}', parts.locale)
      out = out.replace('{namespaces}', parts.namespaces ?? '')
      out = out.replace('{ext}', parts.ext)
      return out
    }
  }
}

function escape(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}
