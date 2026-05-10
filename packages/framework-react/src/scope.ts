import type { ScopeRange, TextDocumentLike, FrameworkHost } from '@tingly/framework-contract'
import { parseJs } from '@tingly/ast-utils'
import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

const SUPPORTED = new Set(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'])

/**
 * For react-i18next, the scope is the function body containing the
 * `useTranslation('ns')` call. Inlay hints / completion within that range
 * can apply the namespace as a prefix lookup. v1 returns one ScopeRange per
 * useTranslation call site; nested scopes (rare in real code) are out of scope.
 */
export function getScopeRangeReact(
  doc: TextDocumentLike,
  _host: FrameworkHost
): readonly ScopeRange[] | undefined {
  if (!SUPPORTED.has(doc.languageId)) return undefined
  const parsed = parseJs({ uri: doc.uri, source: doc.getText(), version: doc.version, languageId: doc.languageId })
  const out: ScopeRange[] = []
  traverse(parsed.ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee
      const name =
        callee.type === 'Identifier' ? callee.name :
        callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name :
        undefined
      if (name !== 'useTranslation' && name !== 'withTranslation') return
      const fn = path.findParent(p => p.isFunctionDeclaration() || p.isFunctionExpression() || p.isArrowFunctionExpression())
      const range = {
        start: (fn?.node.start ?? path.node.start) ?? 0,
        end: (fn?.node.end ?? path.node.end) ?? 0
      }
      const arg = path.node.arguments[0]
      if (arg && arg.type === 'StringLiteral') {
        out.push({ range, namespace: arg.value })
      } else if (arg) {
        out.push({ range, namespaceIsDynamic: true })
      }
    }
  })
  return out
}
