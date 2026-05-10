import type { Framework, KeyReference, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'
import { analyzeReact } from './analyze'
import { getScopeRangeReact } from './scope'

export const ReactI18nextFramework: Framework = {
  id: 'react-i18next',
  display: 'react-i18next',
  languageIds: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  detection: {
    'package.json': { any: ['react-i18next', 'next-i18next', 'i18next'] }
  },

  supportAst: ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
  async analyze(doc: TextDocumentLike, host: FrameworkHost): Promise<readonly KeyReference[]> {
    try { return await analyzeReact(doc, host) }
    catch (e) { host.logger.warn('react-i18next analyze failed', e); return [] }
  },

  // Regex fallback (v1 keeps i18n-ally parity for non-AST language ids).
  usageMatchRegex: [
    /(?:^|[^\w$])(?:t|tt)\(\s*['"`]([\w./\-:]+)['"`]/g,
    /(?:^|[^\w$])i18n(?:ext)?\.t\(\s*['"`]([\w./\-:]+)['"`]/g
  ],

  detectHardStrings: () => undefined,
  getScopeRange: (doc, host) => getScopeRangeReact(doc, host),

  refactorTemplates: keypath => [
    `t('${keypath}')`,
    `<Trans i18nKey="${keypath}" />`
  ],

  rewriteKeys: (key, _mode, ctx) => {
    if (ctx.namespace && key.startsWith(`${ctx.namespace}:`)) return key.slice(ctx.namespace.length + 1)
    return key
  },

  pathMatcher: dir => (dir === 'dir' ? '{locale}/{namespaces}.{ext}' : '{locale}.{ext}'),

  derivedKeyRules: ['{key}_one', '{key}_other', '{key}_zero', '{key}_few', '{key}_many'],
  namespaceDelimiter: ':',
  enableFeatures: { namespace: true, pluralization: true, LinkedMessages: false },

  priority: 50
}

export const STREAM_R_VERSION = '1.0.0-pre'
export default ReactI18nextFramework
export { ReactI18nextFramework as Framework }
