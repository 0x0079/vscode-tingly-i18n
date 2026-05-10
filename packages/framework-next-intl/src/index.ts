import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'
import { analyzeNextIntl } from './analyze'
import { getScopeRangeNextIntl } from './scope'

export const NextIntlFramework: Framework = {
  id: 'next-intl',
  display: 'next-intl',
  languageIds: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  detection: { 'package.json': { every: ['next-intl'] } },

  supportAst: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  async analyze(doc: TextDocumentLike, host: FrameworkHost): Promise<readonly KeyReference[]> {
    try { return await analyzeNextIntl(doc, host) }
    catch (e) { host.logger.warn('next-intl analyze failed', e); return [] }
  },

  usageMatchRegex: [
    /(?:^|[^\w$])t(?:\.(?:rich|markup|raw))?\(\s*['"`]([\w./\-]+)['"`]/g
  ],

  detectHardStrings: () => undefined,
  getScopeRange: (doc, host) => getScopeRangeNextIntl(doc, host),

  refactorTemplates: keypath => [`t('${keypath}')`, `t.rich('${keypath}', {})`],

  // next-intl effective key = `${keyPrefix}.${key}` at lookup time. The contract's
  // rewriteKeys is for storage <-> usage transforms; next-intl stores keys flat,
  // so it is identity here. The keyPrefix is composed at lookup.
  rewriteKeys: k => k,

  pathMatcher: dir => (dir === 'dir' ? 'messages/{locale}/{namespaces}.{ext}' : 'messages/{locale}.{ext}'),

  enableFeatures: { namespace: false, pluralization: true, LinkedMessages: false },

  // next-intl + react-i18next coexisting in one app is a misconfiguration; declare
  // exclusivity so resolveActiveFrameworks picks one.
  compatibleWith: ['general'],
  priority: 70
}

export const STREAM_N_VERSION = '1.0.0-pre'
export default NextIntlFramework
export { NextIntlFramework as Framework }
