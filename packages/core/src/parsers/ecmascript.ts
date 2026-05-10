import { parseJs } from '@tingly/ast-utils'
import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { ICoreParser, LocaleNode, ParsedFile } from '../types'

const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

/**
 * Read-only ECMAScript locale parser. Replaces i18n-ally's ts-node child
 * process (07 P1) by statically walking ObjectExpression literals via
 * @babel/parser. v1 supports:
 *
 *   export default { home: { title: 'Hello' } }
 *   module.exports = { ... }
 *
 * Strings only (no function calls, no spreads, no requires).
 */
export const EcmascriptLiteParser: ICoreParser = {
  extensions: ['.js', '.ts', '.mjs', '.cjs'],
  parse(source, ctx): ParsedFile {
    const parsed = parseJs({
      uri: ctx.filepath,
      source,
      version: 0,
      languageId: ctx.filepath.endsWith('.ts') ? 'typescript' : 'javascript'
    })
    const nodes: LocaleNode[] = []
    const errors: ParsedFile['errors'] = parsed.errors.map(m => ({ message: m }))

    let rootObject: t.ObjectExpression | undefined
    traverse(parsed.ast, {
      ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
        const decl = path.node.declaration
        if (decl.type === 'ObjectExpression') rootObject ??= decl
      },
      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        const node = path.node
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'Identifier' &&
          node.left.object.name === 'module' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'exports' &&
          node.right.type === 'ObjectExpression'
        ) {
          rootObject ??= node.right
        }
      }
    })

    if (!rootObject) {
      errors.push({ message: 'no `export default { ... }` or `module.exports = { ... }` found' })
      return {
        filepath: ctx.filepath,
        locale: ctx.locale,
        ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
        nodes,
        errors
      }
    }
    walk(rootObject, [], nodes, ctx, errors)
    return {
      filepath: ctx.filepath,
      locale: ctx.locale,
      ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
      nodes,
      errors
    }
  }
}

function walk(
  obj: t.ObjectExpression,
  path: string[],
  nodes: LocaleNode[],
  ctx: { filepath: string; locale: string; namespace?: string },
  errors: { message: string; offset?: number }[]
): void {
  for (const prop of obj.properties) {
    if (prop.type !== 'ObjectProperty') {
      errors.push({ message: 'unsupported property kind in locale source' })
      continue
    }
    const key =
      prop.key.type === 'Identifier' ? prop.key.name :
      prop.key.type === 'StringLiteral' ? prop.key.value :
      undefined
    if (key === undefined) {
      errors.push({ message: 'computed/dynamic key in locale source' })
      continue
    }
    const next = [...path, key]
    const value = prop.value
    if (value.type === 'ObjectExpression') {
      walk(value, next, nodes, ctx, errors)
      continue
    }
    if (value.type === 'StringLiteral') {
      nodes.push({
        keypath: next.join('.'),
        value: value.value,
        filepath: ctx.filepath,
        range: { start: value.start ?? 0, end: value.end ?? 0 },
        locale: ctx.locale,
        ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
        isBranch: false
      })
      continue
    }
    if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
      const merged = value.quasis.map(q => q.value.cooked ?? q.value.raw).join('')
      nodes.push({
        keypath: next.join('.'),
        value: merged,
        filepath: ctx.filepath,
        range: { start: value.start ?? 0, end: value.end ?? 0 },
        locale: ctx.locale,
        ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
        isBranch: false
      })
      continue
    }
    errors.push({
      message: `unsupported value kind '${value.type}' at ${next.join('.')}`,
      offset: value.start ?? undefined
    })
  }
}
