import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { TBindingResolution } from '@tingly/framework-contract'

/**
 * Resolve what a `t` (or alias) call's binding is.
 *
 * Strategy:
 *   1. callee is `i18n.t` member       → imported binding (no namespace info available locally)
 *   2. callee is bare identifier       → resolve in scope
 *      a. binding is VariableDeclarator with init = useTranslation('ns') etc → static, via=useTranslation, namespace='ns'
 *      b. binding is VariableDeclarator with init = useTranslations('A.B')   → static, via=useTranslations, keyPrefix='A.B'
 *      c. binding is from `const { t } = useTranslation('ns')`              → walk up to enclosing CallExpression
 *      d. binding is `const tt = t`                                          → alias — recurse on RHS
 *      e. binding is from import declaration                                 → imported
 *   3. anything else                                                         → dynamic
 *
 * Returns `{ kind: 'dynamic' }` when the binding is unresolvable; callers
 * should mark KeyReference.isDynamic = true.
 */
export function resolveTBinding(
  callPath: NodePath<t.CallExpression>
): TBindingResolution {
  const callee = callPath.node.callee

  // i18n.t(...), i18next.t(...), etc.
  if (callee.type === 'MemberExpression') {
    if (callee.property.type === 'Identifier' && callee.property.name === 't') {
      return { kind: 'static', via: 'imported' }
    }
    return { kind: 'dynamic' }
  }

  if (callee.type !== 'Identifier') return { kind: 'dynamic' }
  const name = callee.name
  const binding = callPath.scope.getBinding(name)
  if (!binding) {
    // Globals or unresolved — assume imported.
    return { kind: 'static', via: 'imported' }
  }
  return resolveBinding(binding.path, new Set())
}

function resolveBinding(
  bindingPath: NodePath,
  seen: Set<NodePath>
): TBindingResolution {
  if (seen.has(bindingPath)) return { kind: 'dynamic' }
  seen.add(bindingPath)

  if (bindingPath.isImportSpecifier() || bindingPath.isImportDefaultSpecifier() || bindingPath.isImportNamespaceSpecifier()) {
    return { kind: 'static', via: 'imported' }
  }

  if (bindingPath.isVariableDeclarator()) {
    const init = bindingPath.get('init') as NodePath<t.Expression | null>
    if (!init || !init.node) return { kind: 'static', via: 'aliased' }

    // const t = useTranslation('common')
    if (init.isCallExpression()) return resolveCallInit(init)

    // const { t } = useTranslation('common')
    // -> binding.path is an ObjectPattern entry; init is the call expression on the parent
    if (init.isIdentifier()) {
      const innerBinding = bindingPath.scope.getBinding(init.node.name)
      if (innerBinding) return resolveBinding(innerBinding.path, seen)
    }

    // const tt = t
    if (init.node.type === 'Identifier' || init.node.type === 'MemberExpression') {
      return { kind: 'static', via: 'aliased' }
    }
  }

  // Pattern destructuring: `const { t } = useTranslation('ns')` — binding's path
  // points at the destructuring property; walk up to the parent VariableDeclarator.
  const parentDecl = bindingPath.findParent(p => p.isVariableDeclarator())
  if (parentDecl && parentDecl.isVariableDeclarator()) {
    const init = parentDecl.get('init') as NodePath<t.Expression | null>
    if (init && init.isCallExpression()) return resolveCallInit(init)
  }

  return { kind: 'dynamic' }
}

function resolveCallInit(callPath: NodePath<t.CallExpression>): TBindingResolution {
  const c = callPath.node.callee
  if (c.type !== 'Identifier') return { kind: 'static', via: 'aliased' }
  const hookName = c.name
  const firstArg = callPath.node.arguments[0]
  const stringArg =
    firstArg && firstArg.type === 'StringLiteral' ? firstArg.value : undefined

  // react-i18next: switch namespace
  if (hookName === 'useTranslation' || hookName === 'withTranslation') {
    if (stringArg !== undefined) return { kind: 'static', via: 'useTranslation', namespace: stringArg }
    return { kind: 'static', via: 'useTranslation' }
  }
  // next-intl: prefix keys
  if (hookName === 'useTranslations' || hookName === 'getTranslations') {
    const via = hookName === 'getTranslations' ? 'getTranslations' : 'useTranslations'
    if (stringArg !== undefined) return { kind: 'static', via, keyPrefix: stringArg }
    return { kind: 'static', via }
  }
  return { kind: 'static', via: 'aliased' }
}
