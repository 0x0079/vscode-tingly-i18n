import type {
  Framework,
  FrameworkHost,
  KeyReference,
  TextDocumentLike,
  UsageMatchRegex
} from '@tingly/framework-contract'

/**
 * Regex-only fallback. Used:
 *   1. By Phase 2 to wire the providers without any real framework adapter.
 *   2. At runtime when no other framework is detected in the workspace.
 *   3. When the user explicitly opts into `tingly.detection.mode = 'regex-only'`.
 *
 * Important: `analyze()` deliberately returns [] so the KeyDetector facade
 * always falls back to `usageMatchRegex` on documents this framework owns.
 */
export const GeneralFramework: Framework = {
  id: 'general',
  display: 'General (regex)',
  languageIds: [
    'javascript', 'javascriptreact',
    'typescript', 'typescriptreact',
    'vue', 'svelte', 'html', 'php', 'python', 'go', 'java', 'kotlin', 'ruby', 'rust', 'csharp', 'dart'
  ],
  detection: {},

  // No AST coverage — forces regex path.
  supportAst: [],

  async analyze(_doc: TextDocumentLike, _host: FrameworkHost): Promise<readonly KeyReference[]> {
    return []
  },

  // Default i18n-style call: t('foo.bar') / $t / i18n.t / etc.
  usageMatchRegex: [
    /[$ ](?:t|tc|i18n\.t|i18next\.t)\(\s*['"`]([\w.\-/]+)['"`]/g as RegExp
  ] as UsageMatchRegex,

  detectHardStrings(): undefined {
    return undefined
  },

  getScopeRange(): undefined {
    return undefined
  },

  refactorTemplates(keypath, _args, _ctx): readonly string[] {
    return [`t('${keypath}')`, `i18n.t('${keypath}')`]
  },

  rewriteKeys(key, _mode, _ctx): string {
    return key
  },

  pathMatcher(dirStructure): string {
    return dirStructure === 'dir'
      ? '{locale}/{namespaces}.{ext}'
      : '{locale}.{ext}'
  },

  enableFeatures: { namespace: false, pluralization: false },

  // Lowest priority — always loses to a real adapter.
  priority: 0,
  compatibleWith: undefined
}
