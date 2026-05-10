/**
 * Configuration schema and bucket dispatch. The three buckets (reload / refresh
 * / usage) preserve the i18n-ally optimization (docs .../01 §1.4): a key change
 * either rebuilds the loader, refreshes derived state, or only affects future
 * usage — each rung is cheaper than the next.
 */

export type ReloadKey =
  | 'tingly.localesPaths'
  | 'tingly.pathMatcher'
  | 'tingly.namespace'
  | 'tingly.parsers'

export type RefreshKey =
  | 'tingly.displayLanguage'
  | 'tingly.sourceLanguage'
  | 'tingly.render.mode'
  | 'tingly.diagnostics.showRegexFallback'

export type UsageKey =
  | 'tingly.detection.mode'
  | 'tingly.translate.engines'

export type ConfigBucket = 'reload' | 'refresh' | 'usage'

const RELOAD_KEYS = new Set<string>([
  'tingly.localesPaths',
  'tingly.pathMatcher',
  'tingly.namespace',
  'tingly.parsers'
])

const REFRESH_KEYS = new Set<string>([
  'tingly.displayLanguage',
  'tingly.sourceLanguage',
  'tingly.render.mode',
  'tingly.diagnostics.showRegexFallback'
])

export function bucketFor(key: string): ConfigBucket {
  if (RELOAD_KEYS.has(key)) return 'reload'
  if (REFRESH_KEYS.has(key)) return 'refresh'
  return 'usage'
}

/** Legacy i18n-ally settings -> Tingly equivalents. */
export const LEGACY_KEY_MIGRATION: Readonly<Record<string, string>> = {
  'i18n-ally.localesPaths': 'tingly.localesPaths',
  'i18n-ally.pathMatcher': 'tingly.pathMatcher',
  'i18n-ally.displayLanguage': 'tingly.displayLanguage',
  'i18n-ally.sourceLanguage': 'tingly.sourceLanguage',
  'i18n-ally.namespace': 'tingly.namespace',
  'i18n-ally.annotations': 'tingly.render.mode'
}
