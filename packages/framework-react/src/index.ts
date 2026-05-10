import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'

/**
 * Stream R stub. Real implementation lands in a follow-up commit; for now this
 * module exposes a Framework that exercises the contract plumbing so the
 * test-kit can run against it (the Phase 2.5 "empty kit passes" gate).
 */
export const ReactI18nextFramework: Framework = {
  id: 'react-i18next',
  display: 'react-i18next',
  languageIds: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  detection: {
    'package.json': { any: ['react-i18next', 'next-i18next', 'i18next'] }
  },
  supportAst: [],
  async analyze(_doc: TextDocumentLike, _host: FrameworkHost): Promise<readonly KeyReference[]> {
    return []
  },
  usageMatchRegex: [
    /(?:^|[^\w])(?:t|tt)\(\s*['"`]([\w./-]+)['"`]/g
  ],
  detectHardStrings: () => undefined,
  getScopeRange: () => undefined,
  refactorTemplates: keypath => [`t('${keypath}')`],
  rewriteKeys: k => k,
  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),
  enableFeatures: { namespace: true, pluralization: true, LinkedMessages: false },
  priority: 50
}

export const STREAM_R_VERSION = '0.0.1-stub'
export default ReactI18nextFramework
export { ReactI18nextFramework as Framework }
