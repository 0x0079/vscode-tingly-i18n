import type { KeyReference, TextDocumentLike, FrameworkHost, OffsetRange, SourceKind } from '@tingly/framework-contract'
import {
  parseJs,
  walkJs,
  expandTemplateLiteral,
  extractScriptBlocks,
  translateRange
} from '@tingly/ast-utils'
import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

const SUPPORTED_DIRECT = new Set(['typescript', 'javascript'])

/**
 * svelte-i18n + paraglide analyzer.
 *
 *   svelte-i18n stores:
 *     - $_('key'), $t('key')                 -> classic store usage
 *   paraglide:
 *     - m.home_title()                       -> function name IS the keypath
 *     - import * as m from './paraglide/messages'   (any namespace alias accepted)
 *
 * For .svelte files we extract <script> blocks; mustaches fall back to regex.
 */
export async function analyzeSvelte(
  doc: TextDocumentLike,
  _host: FrameworkHost
): Promise<readonly KeyReference[]> {
  const blocks: { source: string; offset: number; lang: string }[] = []
  if (doc.languageId === 'svelte') {
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
        const handled = handleSvelteI18n(site, block.offset, out)
          || handleParaglide(site, block.offset, out)
        void handled
      }
    })
  }
  return out
}

function handleSvelteI18n(
  site: { calleeName?: string; isMember: boolean; path: NodePath<t.CallExpression> },
  scriptOffset: number,
  out: KeyReference[]
): boolean {
  if (site.isMember) return false
  const name = site.calleeName
  if (name !== '$_' && name !== '$t' && name !== '_' && name !== 't') return false
  const arg0 = site.path.node.arguments[0]
  if (!arg0) return false
  const outer = translateRange(rangeOf(site.path.node), scriptOffset)

  if (arg0.type === 'StringLiteral') {
    out.push(makeRef({
      key: arg0.value,
      range: translateRange(rangeOf(arg0), scriptOffset),
      outerRange: outer,
      source: 'js-call'
    }))
    return true
  }
  if (arg0.type === 'TemplateLiteral') {
    const expanded = expandTemplateLiteral(arg0)
    if (expanded.fullStatic !== undefined) {
      out.push(makeRef({
        key: expanded.fullStatic,
        range: translateRange(rangeOf(arg0), scriptOffset),
        outerRange: outer,
        source: 'js-template'
      }))
    } else {
      out.push(makeRef({
        key: expanded.staticPrefix,
        staticPrefix: expanded.staticPrefix,
        isDynamic: true,
        range: translateRange(rangeOf(arg0), scriptOffset),
        outerRange: outer,
        source: 'js-template'
      }))
    }
    return true
  }
  out.push(makeRef({
    key: '',
    isDynamic: true,
    range: translateRange(rangeOf(arg0), scriptOffset),
    outerRange: outer,
    source: 'js-call'
  }))
  return true
}

function handleParaglide(
  site: { calleeName?: string; isMember: boolean; path: NodePath<t.CallExpression> },
  scriptOffset: number,
  out: KeyReference[]
): boolean {
  if (!site.isMember) return false
  const callee = site.path.node.callee
  if (callee.type !== 'MemberExpression') return false
  const obj = callee.object
  if (obj.type !== 'Identifier') return false
  // Heuristic: paraglide messages are usually imported as `m` (or `messages`).
  // Check the binding for a `* as m from './paraglide/messages'` style import.
  if (!isParaglideMessagesObject(site.path, obj.name)) return false
  if (callee.property.type !== 'Identifier') return false
  const fnName = callee.property.name
  out.push(makeRef({
    key: fnName,
    range: translateRange(rangeOf(callee.property), scriptOffset),
    outerRange: translateRange(rangeOf(site.path.node), scriptOffset),
    source: 'js-member' as SourceKind
  }))
  return true
}

function isParaglideMessagesObject(
  callPath: NodePath<t.CallExpression>,
  rootName: string
): boolean {
  // Cheap path: name is `m` or `messages`.
  if (rootName === 'm' || rootName === 'messages') return true
  // Stricter path: walk binding to its import declaration.
  const binding = callPath.scope.getBinding(rootName)
  if (!binding) return false
  const decl = binding.path.findParent(p => p.isImportDeclaration())
  if (!decl || !decl.isImportDeclaration()) return false
  const src = decl.node.source.value
  return /paraglide(?:[\\\/]|\b).*messages?/i.test(src) || /messages\.(?:js|ts)$/.test(src)
}

function rangeOf(n: { start?: number | null; end?: number | null }): OffsetRange {
  return { start: n.start ?? 0, end: n.end ?? 0 }
}
function makeRef(input: Omit<KeyReference, 'isDynamic' | 'via'> & { isDynamic?: boolean }): KeyReference {
  return { isDynamic: input.isDynamic ?? false, via: 'ast', ...input }
}
