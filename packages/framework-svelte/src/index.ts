import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'
import { analyzeSvelte } from './analyze'

export const SvelteI18nFramework: Framework = {
  id: 'svelte-i18n',
  display: 'svelte-i18n / paraglide',
  languageIds: ['svelte', 'typescript', 'javascript'],
  detection: {
    'package.json': { any: ['svelte-i18n', '@inlang/paraglide-js', '@inlang/paraglide-sveltekit'] }
  },

  supportAst: ['svelte', 'typescript', 'javascript'],
  async analyze(doc: TextDocumentLike, host: FrameworkHost): Promise<readonly KeyReference[]> {
    try { return await analyzeSvelte(doc, host) }
    catch (e) { host.logger.warn('svelte-i18n analyze failed', e); return [] }
  },

  // Regex fallback covers Svelte mustache `{$_('x')}` outside <script>.
  usageMatchRegex: [
    /\{?\s*\$_?\(\s*['"`]([\w./\-]+)['"`]/g,
    /\{?\s*\$t\(\s*['"`]([\w./\-]+)['"`]/g
  ],

  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,

  refactorTemplates: keypath => [`$_('${keypath}')`, `$t('${keypath}')`, `m.${keypath}()`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),

  enableFeatures: { namespace: true, pluralization: true, LinkedMessages: false },
  priority: 50
}

export const STREAM_S_VERSION = '1.0.0-pre'
export default SvelteI18nFramework
export { SvelteI18nFramework as Framework }
