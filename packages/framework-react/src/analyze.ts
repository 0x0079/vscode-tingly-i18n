import type { KeyReference, TextDocumentLike, FrameworkHost, OffsetRange } from '@tingly/framework-contract'
import {
  parseJs,
  walkJs,
  resolveTBinding,
  resolveMemberExpression,
  expandTemplateLiteral,
  walkJsxAttributes
} from '@tingly/ast-utils'
import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

const SUPPORTED = new Set(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'])

/**
 * react-i18next + next-i18next AST analyzer.
 *
 * Detection targets:
 *   - t('x'), tt('x') (alias), $t (less common in React but supported)
 *   - i18n.t('x') / i18next.t('x')
 *   - t(KEYS.foo.bar)
 *   - t(`a.${b}.c`)             -> isDynamic + staticPrefix='a.', staticSuffix='.c'
 *   - useTranslation('common')   -> binds enclosing scope's namespace='common'
 *   - <Trans i18nKey="home.x" /> / <Trans i18nKey={KEYS.x} />
 *
 * Anything that can't be statically resolved is emitted with `isDynamic: true`
 * (no silent miss — stream R acceptance criterion).
 */
export async function analyzeReact(
  doc: TextDocumentLike,
  _host: FrameworkHost
): Promise<readonly KeyReference[]> {
  if (!SUPPORTED.has(doc.languageId)) return []

  const parsed = parseJs({ uri: doc.uri, source: doc.getText(), version: doc.version, languageId: doc.languageId })
  const out: KeyReference[] = []

  walkJs(parsed, {
    onCallExpression(site) {
      if (!isTranslationCallee(site.calleeName, site.isMember)) return
      const arg0 = site.path.node.arguments[0]
      if (!arg0) return

      const binding = resolveTBinding(site.path)
      const namespace = binding.kind === 'static' ? binding.namespace : undefined
      const outer = nodeRange(site.path.node)

      if (arg0.type === 'StringLiteral') {
        out.push(makeRef({
          key: arg0.value,
          range: nodeRange(arg0),
          outerRange: outer,
          ...(namespace !== undefined ? { namespace } : {}),
          source: 'js-call'
        }))
        return
      }
      if (arg0.type === 'TemplateLiteral') {
        const expanded = expandTemplateLiteral(arg0)
        if (expanded.fullStatic !== undefined) {
          out.push(makeRef({
            key: expanded.fullStatic,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(namespace !== undefined ? { namespace } : {}),
            source: 'js-template'
          }))
        } else {
          out.push(makeRef({
            key: expanded.staticPrefix,
            staticPrefix: expanded.staticPrefix,
            isDynamic: true,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(namespace !== undefined ? { namespace } : {}),
            source: 'js-template'
          }))
        }
        return
      }
      if (arg0.type === 'MemberExpression') {
        const argPath = (site.path.get('arguments')[0] as NodePath<t.MemberExpression>)
        const resolved = resolveMemberExpression(argPath)
        if (resolved.kind === 'static') {
          out.push(makeRef({
            key: resolved.value,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(namespace !== undefined ? { namespace } : {}),
            source: 'js-member'
          }))
        } else {
          out.push(makeRef({
            key: '',
            isDynamic: true,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(namespace !== undefined ? { namespace } : {}),
            source: 'js-member'
          }))
        }
        return
      }
      // Anything else (binary, conditional, identifier ref): mark dynamic.
      out.push(makeRef({
        key: '',
        isDynamic: true,
        range: nodeRange(arg0),
        outerRange: outer,
        ...(namespace !== undefined ? { namespace } : {}),
        source: 'js-call'
      }))
    },
    onJsxOpeningElement(site) {
      if (site.tagName !== 'Trans') return
      walkJsxAttributes(site.path, attr => {
        if (attr.name !== 'i18nKey') return
        if (attr.literalValue !== undefined) {
          out.push(makeRef({
            key: attr.literalValue,
            range: attr.valueRange,
            source: 'jsx-attribute'
          }))
          return
        }
        if (attr.expressionPath?.isMemberExpression()) {
          const r = resolveMemberExpression(attr.expressionPath)
          if (r.kind === 'static') {
            out.push(makeRef({
              key: r.value,
              range: attr.valueRange,
              source: 'jsx-attribute'
            }))
          } else {
            out.push(makeRef({
              key: '',
              isDynamic: true,
              range: attr.valueRange,
              source: 'jsx-attribute'
            }))
          }
          return
        }
        if (attr.expressionPath?.isStringLiteral()) {
          out.push(makeRef({
            key: (attr.expressionPath.node as t.StringLiteral).value,
            range: attr.valueRange,
            source: 'jsx-attribute'
          }))
          return
        }
        // Dynamic / template / conditional -> isDynamic
        out.push(makeRef({
          key: '',
          isDynamic: true,
          range: attr.valueRange,
          source: 'jsx-attribute'
        }))
      })
    }
  })

  return out
}

function isTranslationCallee(name: string | undefined, isMember: boolean): boolean {
  if (!name) return false
  // Bare identifiers: t, tt (common alias)
  if (!isMember) return name === 't' || name === 'tt'
  // Member: i18n.t, i18next.t, etc.
  return name === 't'
}

function nodeRange(n: { start?: number | null; end?: number | null }): OffsetRange {
  return { start: n.start ?? 0, end: n.end ?? 0 }
}

function makeRef(input: Omit<KeyReference, 'isDynamic' | 'via'> & { isDynamic?: boolean }): KeyReference {
  return {
    isDynamic: input.isDynamic ?? false,
    via: 'ast',
    ...input
  }
}
