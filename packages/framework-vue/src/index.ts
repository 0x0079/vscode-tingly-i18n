import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'
import { analyzeVue } from './analyze'

export const VueI18nFramework: Framework = {
  id: 'vue-i18n',
  display: 'vue-i18n',
  languageIds: ['vue', 'typescript', 'javascript'],
  detection: {
    'package.json': { any: ['vue-i18n', '@intlify/vue-i18n', '@nuxtjs/i18n', 'vue-i18n-next'] }
  },

  // .vue files use the SFC <script> extraction path; .ts/.js use direct AST.
  // Template/attribute calls fall back to regex via KeyDetector.
  supportAst: ['vue', 'typescript', 'javascript'],
  async analyze(doc: TextDocumentLike, host: FrameworkHost): Promise<readonly KeyReference[]> {
    try { return await analyzeVue(doc, host) }
    catch (e) { host.logger.warn('vue-i18n analyze failed', e); return [] }
  },

  // Regex fallback: covers <template>{{ $t(...) }}</template> and attributes.
  usageMatchRegex: [
    /(?:[\s({,>]|^)\$t\(\s*['"`]([\w./\-]+)['"`]/g,
    /(?:[\s({,>]|^)\$tc\(\s*['"`]([\w./\-]+)['"`]/g,
    /\bv-t\s*=\s*['"]([\w./\-]+)['"]/g,
    /<i18n-t\b[^>]*\bkeypath\s*=\s*['"]([\w./\-]+)['"]/g
  ],

  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,

  refactorTemplates: keypath => [`$t('${keypath}')`, `t('${keypath}')`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),

  enableFeatures: { namespace: true, pluralization: true, VueSfc: true, LinkedMessages: true },
  priority: 50
}

export const STREAM_V_VERSION = '1.0.0-pre'
export default VueI18nFramework
export { VueI18nFramework as Framework }
