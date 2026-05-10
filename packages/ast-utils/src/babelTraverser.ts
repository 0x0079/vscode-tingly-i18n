import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { ParsedJs } from './babelParser'

// CJS interop: @babel/traverse exports a default function but ESM consumers see .default.
const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

export interface CallSite {
  path: NodePath<t.CallExpression>
  /** Identifier name of the callee, or undefined for member-expression callees. */
  calleeName?: string
  /** Whether the callee is a member expression like `i18n.t(...)`. */
  isMember: boolean
}

export interface JsxElementSite {
  path: NodePath<t.JSXOpeningElement>
  tagName: string
}

export interface TraverseHandlers {
  onCallExpression?: (site: CallSite) => void
  onJsxOpeningElement?: (site: JsxElementSite) => void
  onMemberExpression?: (path: NodePath<t.MemberExpression>) => void
}

export function walkJs(parsed: ParsedJs, handlers: TraverseHandlers): void {
  traverse(parsed.ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      if (!handlers.onCallExpression) return
      const callee = path.node.callee
      const isMember = callee.type === 'MemberExpression'
      const calleeName =
        callee.type === 'Identifier' ? callee.name :
        callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
          ? callee.property.name
          : undefined
      handlers.onCallExpression(
        calleeName !== undefined
          ? { path, calleeName, isMember }
          : { path, isMember }
      )
    },
    JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
      if (!handlers.onJsxOpeningElement) return
      const name = path.node.name
      const tagName =
        name.type === 'JSXIdentifier' ? name.name :
        name.type === 'JSXMemberExpression' ? renderJsxMember(name) :
        ''
      handlers.onJsxOpeningElement({ path, tagName })
    },
    MemberExpression(path: NodePath<t.MemberExpression>) {
      handlers.onMemberExpression?.(path)
    }
  })
}

function renderJsxMember(node: t.JSXMemberExpression): string {
  const obj = node.object
  const objName = obj.type === 'JSXIdentifier' ? obj.name : obj.type === 'JSXMemberExpression' ? renderJsxMember(obj) : ''
  return `${objName}.${node.property.name}`
}
