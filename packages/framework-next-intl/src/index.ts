import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'

export const NextIntlFramework: Framework = {
  id: 'next-intl',
  display: 'next-intl',
  languageIds: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  detection: { 'package.json': { every: ['next-intl'] } },
  supportAst: [],
  async analyze(_doc: TextDocumentLike, _host: FrameworkHost): Promise<readonly KeyReference[]> { return [] },
  usageMatchRegex: [/(?:^|[^\w])t\(\s*['"`]([\w./-]+)['"`]/g],
  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,
  refactorTemplates: keypath => [`t('${keypath}')`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? 'messages/{locale}/{namespaces}.{ext}' : 'messages/{locale}.{ext}'),
  enableFeatures: { namespace: false, pluralization: true, LinkedMessages: false },
  // next-intl + react-i18next coexisting in one app is a misconfiguration; declare
  // exclusivity so resolveActiveFrameworks picks one.
  compatibleWith: ['general'],
  priority: 70
}

export const STREAM_N_VERSION = '0.0.1-stub'
export default NextIntlFramework
export { NextIntlFramework as Framework }
