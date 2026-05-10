import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'

export const SvelteI18nFramework: Framework = {
  id: 'svelte-i18n',
  display: 'svelte-i18n / paraglide',
  languageIds: ['svelte', 'typescript', 'javascript'],
  detection: {
    'package.json': { any: ['svelte-i18n', '@inlang/paraglide-js', '@inlang/paraglide-sveltekit'] }
  },
  supportAst: [],
  async analyze(_doc: TextDocumentLike, _host: FrameworkHost): Promise<readonly KeyReference[]> { return [] },
  usageMatchRegex: [/\$_?\(\s*['"`]([\w./-]+)['"`]/g],
  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,
  refactorTemplates: keypath => [`$_('${keypath}')`, `$t('${keypath}')`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),
  enableFeatures: { namespace: true, pluralization: true, LinkedMessages: false },
  priority: 50
}

export const STREAM_S_VERSION = '0.0.1-stub'
export default SvelteI18nFramework
export { SvelteI18nFramework as Framework }
