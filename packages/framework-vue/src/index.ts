import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'

export const VueI18nFramework: Framework = {
  id: 'vue-i18n',
  display: 'vue-i18n',
  languageIds: ['vue', 'typescript', 'javascript'],
  detection: { 'package.json': { any: ['vue-i18n', '@intlify/vue-i18n', '@nuxtjs/i18n'] } },
  supportAst: [],
  async analyze(_doc: TextDocumentLike, _host: FrameworkHost): Promise<readonly KeyReference[]> { return [] },
  usageMatchRegex: [/(?:[$ ]|^)(?:\$?t|tc)\(\s*['"`]([\w./-]+)['"`]/g],
  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,
  refactorTemplates: keypath => [`$t('${keypath}')`, `t('${keypath}')`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),
  enableFeatures: { namespace: true, pluralization: true, VueSfc: true, LinkedMessages: true },
  priority: 50
}

export const STREAM_V_VERSION = '0.0.1-stub'
export default VueI18nFramework
export { VueI18nFramework as Framework }
