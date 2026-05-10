import type { KeyReference, TextDocumentLike, FrameworkHost, OffsetRange } from '@tingly/framework-contract'
import {
  parseJs,
  walkJs,
  resolveMemberExpression,
  expandTemplateLiteral,
  extractScriptBlocks,
  translateRange
} from '@tingly/ast-utils'
import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

const SUPPORTED_DIRECT = new Set(['typescript', 'javascript'])

/**
 * vue-i18n analyzer. Recognized call shapes:
 *   - $t('x') / t('x') / $tc / tc / i18n.t / i18n.global.t
 *   - $t(`a.${b}.c`)        -> dynamic + staticPrefix
 *   - t(KEYS.x.y)           -> static via constant resolver
 *
 * For .vue files, only the <script> / <script setup> blocks are AST-analyzed in v1.
 * Template <template>{{ $t('x') }}</template> and attribute `:placeholder="$t(...)"`
 * fall back to regex (KeyDetector handles that automatically).
 */
export async function analyzeVue(
  doc: TextDocumentLike,
  _host: FrameworkHost
): Promise<readonly KeyReference[]> {
  const blocks: { source: string; offset: number; lang: string }[] = []
  if (doc.languageId === 'vue') {
    for (const b of extractScriptBlocks(doc.getText())) {
      blocks.push({
        source: b.source,
        offset: b.offset,
        lang: (b.lang === 'ts' || b.lang === 'typescript') ? 'typescript' : 'javascript'
      })
    }
  } else if (SUPPORTED_DIRECT.has(doc.languageId)) {
    blocks.push({ source: doc.getText(), offset: 0, lang: doc.languageId })
  } else {
    return []
  }

  const out: KeyReference[] = []
  for (const block of blocks) {
    const parsed = parseJs({
      uri: `${doc.uri}#${block.offset}`,
      source: block.source,
      version: doc.version,
      languageId: block.lang
    })
    walkJs(parsed, {
      onCallExpression(site) {
        if (!isVueCallee(site)) return
        const arg0 = site.path.node.arguments[0]
        if (!arg0) return
        const outer = translateRange(rangeOf(site.path.node), block.offset)

        if (arg0.type === 'StringLiteral') {
          out.push(makeRef({
            key: arg0.value,
            range: translateRange(rangeOf(arg0), block.offset),
            outerRange: outer,
            source: 'js-call'
          }))
          return
        }
        if (arg0.type === 'TemplateLiteral') {
          const expanded = expandTemplateLiteral(arg0)
          if (expanded.fullStatic !== undefined) {
            out.push(makeRef({
              key: expanded.fullStatic,
              range: translateRange(rangeOf(arg0), block.offset),
              outerRange: outer,
              source: 'js-template'
            }))
          } else {
            out.push(makeRef({
              key: expanded.staticPrefix,
              staticPrefix: expanded.staticPrefix,
              isDynamic: true,
              range: translateRange(rangeOf(arg0), block.offset),
              outerRange: outer,
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
              range: translateRange(rangeOf(arg0), block.offset),
              outerRange: outer,
              source: 'js-member'
            }))
          } else {
            out.push(makeRef({
              key: '',
              isDynamic: true,
              range: translateRange(rangeOf(arg0), block.offset),
              outerRange: outer,
              source: 'js-member'
            }))
          }
          return
        }
        out.push(makeRef({
          key: '',
          isDynamic: true,
          range: translateRange(rangeOf(arg0), block.offset),
          outerRange: outer,
          source: 'js-call'
        }))
      }
    })
  }
  return out
}

function isVueCallee(site: { calleeName?: string; isMember: boolean; path: NodePath<t.CallExpression> }): boolean {
  const name = site.calleeName
  if (!name) return false
  if (!site.isMember) {
    return name === '$t' || name === 't' || name === '$tc' || name === 'tc' || name === '$te'
  }
  // i18n.t / i18n.global.t
  if (name === 't' || name === 'tc') {
    let obj: t.Expression | t.Super | t.V8IntrinsicIdentifier = site.path.node.callee
    if (obj.type === 'MemberExpression') obj = obj.object
    while (obj.type === 'MemberExpression') obj = obj.object
    if (obj.type === 'Identifier' && (obj.name === 'i18n' || obj.name === '$i18n')) return true
  }
  return false
}

function rangeOf(n: { start?: number | null; end?: number | null }): OffsetRange {
  return { start: n.start ?? 0, end: n.end ?? 0 }
}
function makeRef(input: Omit<KeyReference, 'isDynamic' | 'via'> & { isDynamic?: boolean }): KeyReference {
  return { isDynamic: input.isDynamic ?? false, via: 'ast', ...input }
}
