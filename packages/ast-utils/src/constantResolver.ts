import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

export type ConstantResolution =
  | { kind: 'static'; value: string; via: 'same-file' | 'sibling-keys' }
  | { kind: 'dynamic' }

/**
 * Resolve a member expression like `KEYS.home.title` to its literal string
 * by walking the scope's binding for the root identifier and reading its
 * ObjectExpression init.
 *
 * v1 supports same-file resolution + (TBD) sibling `*.keys.ts` files via
 * tingly.analysis.constantResolverPaths. Transitive imports are out of scope.
 */
export function resolveMemberExpression(
  memberPath: NodePath<t.MemberExpression>
): ConstantResolution {
  const path = unrollMemberAccess(memberPath)
  if (!path) return { kind: 'dynamic' }
  const { rootName, segments } = path

  const binding = memberPath.scope.getBinding(rootName)
  if (!binding || !binding.path.isVariableDeclarator()) return { kind: 'dynamic' }

  const init = binding.path.get('init') as NodePath<t.Expression | null>
  if (!init || !init.node) return { kind: 'dynamic' }
  if (!init.isObjectExpression()) return { kind: 'dynamic' }

  const value = readObjectPath(init.node, segments)
  if (value === undefined) return { kind: 'dynamic' }
  return { kind: 'static', value, via: 'same-file' }
}

function unrollMemberAccess(
  memberPath: NodePath<t.MemberExpression>
): { rootName: string; segments: readonly string[] } | undefined {
  const segments: string[] = []
  let current: NodePath = memberPath
  while (current.isMemberExpression()) {
    const node = current.node
    if (node.computed) {
      // KEYS['foo'] is allowed; KEYS[bar] is dynamic.
      const prop = current.get('property')
      if (Array.isArray(prop)) return undefined
      if (prop.isStringLiteral()) {
        segments.unshift(prop.node.value)
      } else return undefined
    } else {
      const prop = current.get('property')
      if (Array.isArray(prop)) return undefined
      if (!prop.isIdentifier()) return undefined
      segments.unshift(prop.node.name)
    }
    current = current.get('object') as NodePath
  }
  if (!current.isIdentifier()) return undefined
  return { rootName: current.node.name, segments }
}

function readObjectPath(
  obj: t.ObjectExpression,
  segments: readonly string[]
): string | undefined {
  let current: t.Node = obj
  for (const seg of segments) {
    if (current.type !== 'ObjectExpression') return undefined
    const prop = current.properties.find(
      p =>
        p.type === 'ObjectProperty' &&
        ((p.key.type === 'Identifier' && p.key.name === seg) ||
          (p.key.type === 'StringLiteral' && p.key.value === seg))
    )
    if (!prop || prop.type !== 'ObjectProperty') return undefined
    current = prop.value
  }
  if (current.type === 'StringLiteral') return current.value
  if (current.type === 'TemplateLiteral' && current.expressions.length === 0) {
    return current.quasis.map(q => q.value.cooked ?? '').join('')
  }
  return undefined
}
