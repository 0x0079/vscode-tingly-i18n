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
 * next-intl AST analyzer.
 *
 * Detection targets:
 *   - useTranslations('Home')                       -> binds keyPrefix='Home'
 *   - getTranslations({ namespace: 'Home' })        -> binds keyPrefix='Home' (server)
 *   - t('title')                                    -> emit key 'title' with keyPrefix='Home'
 *   - t.rich('key', {...}) / t.markup / t.raw
 *   - t(`title.${section}`)                         -> dynamic + staticPrefix
 *
 * Critical semantic: next-intl namespaces are KEY PREFIXES, not namespace switches.
 * Per ADR 0001 §3, this is emitted into KeyReference.keyPrefix (NOT namespace),
 * preventing conflation with react-i18next's behavior.
 */
export async function analyzeNextIntl(
  doc: TextDocumentLike,
  _host: FrameworkHost
): Promise<readonly KeyReference[]> {
  if (!SUPPORTED.has(doc.languageId)) return []
  const parsed = parseJs({ uri: doc.uri, source: doc.getText(), version: doc.version, languageId: doc.languageId })
  const out: KeyReference[] = []

  walkJs(parsed, {
    onCallExpression(site) {
      if (!isTranslationCallee(site.calleeName, site.isMember, site.path)) return
      const arg0 = site.path.node.arguments[0]
      if (!arg0) return

      const binding = resolveTBinding(site.path)
      const keyPrefix = binding.kind === 'static' ? binding.keyPrefix : undefined
      const outer = nodeRange(site.path.node)

      if (arg0.type === 'StringLiteral') {
        out.push(makeRef({
          key: arg0.value,
          range: nodeRange(arg0),
          outerRange: outer,
          ...(keyPrefix !== undefined ? { keyPrefix } : {}),
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
            ...(keyPrefix !== undefined ? { keyPrefix } : {}),
            source: 'js-template'
          }))
        } else {
          out.push(makeRef({
            key: expanded.staticPrefix,
            staticPrefix: expanded.staticPrefix,
            isDynamic: true,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(keyPrefix !== undefined ? { keyPrefix } : {}),
            source: 'js-template'
          }))
        }
        return
      }
      if (arg0.type === 'MemberExpression') {
        const argPath = site.path.get('arguments')[0] as NodePath<t.MemberExpression>
        const resolved = resolveMemberExpression(argPath)
        if (resolved.kind === 'static') {
          out.push(makeRef({
            key: resolved.value,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(keyPrefix !== undefined ? { keyPrefix } : {}),
            source: 'js-member'
          }))
        } else {
          out.push(makeRef({
            key: '',
            isDynamic: true,
            range: nodeRange(arg0),
            outerRange: outer,
            ...(keyPrefix !== undefined ? { keyPrefix } : {}),
            source: 'js-member'
          }))
        }
        return
      }
      out.push(makeRef({
        key: '',
        isDynamic: true,
        range: nodeRange(arg0),
        outerRange: outer,
        ...(keyPrefix !== undefined ? { keyPrefix } : {}),
        source: 'js-call'
      }))
    },
    onJsxOpeningElement(site) {
      // next-intl's <Translate> is uncommon; skip in v1 (regex fallback covers it).
      void site
      walkJsxAttributes(site.path, () => {})
    }
  })

  return out
}

function isTranslationCallee(
  name: string | undefined,
  isMember: boolean,
  path: NodePath<t.CallExpression>
): boolean {
  if (!name) return false
  if (!isMember) return name === 't' || name === 'tt'
  // Member calls: t.rich / t.markup / t.raw — the property is 'rich'/'markup'/'raw',
  // and the object is itself the `t` returned from useTranslations. We accept these.
  if (name === 'rich' || name === 'markup' || name === 'raw') {
    const callee = path.node.callee
    if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && (callee.object.name === 't' || callee.object.name === 'tt')) return true
  }
  return name === 't'
}

function nodeRange(n: { start?: number | null; end?: number | null }): OffsetRange {
  return { start: n.start ?? 0, end: n.end ?? 0 }
}
function makeRef(input: Omit<KeyReference, 'isDynamic' | 'via'> & { isDynamic?: boolean }): KeyReference {
  return { isDynamic: input.isDynamic ?? false, via: 'ast', ...input }
}
