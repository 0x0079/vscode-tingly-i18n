import type { NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

export interface JsxAttrInfo {
  name: string
  /** True if the value is a `{...}` expression container. */
  isExpression: boolean
  /** Literal string when the attribute value is a string literal. */
  literalValue?: string
  /** Range covering the value (or the whole attribute when there is no value). */
  valueRange: { start: number; end: number }
  /** Range covering the entire attribute. */
  attrRange: { start: number; end: number }
  /** Path to the value's expression when `isExpression`; undefined otherwise. */
  expressionPath?: NodePath<t.Expression>
}

export function walkJsxAttributes(
  jsxOpening: NodePath<t.JSXOpeningElement>,
  visit: (info: JsxAttrInfo) => void
): void {
  for (const attrPath of jsxOpening.get('attributes')) {
    if (!attrPath.isJSXAttribute()) continue
    const node = attrPath.node
    const nameNode = node.name
    const name =
      nameNode.type === 'JSXIdentifier' ? nameNode.name :
      nameNode.type === 'JSXNamespacedName' ? `${nameNode.namespace.name}:${nameNode.name.name}` :
      ''
    const attrRange = { start: node.start ?? 0, end: node.end ?? 0 }
    const value = node.value
    if (!value) {
      visit({ name, isExpression: false, valueRange: attrRange, attrRange })
      continue
    }
    if (value.type === 'StringLiteral') {
      visit({
        name,
        isExpression: false,
        literalValue: value.value,
        valueRange: { start: value.start ?? 0, end: value.end ?? 0 },
        attrRange
      })
      continue
    }
    if (value.type === 'JSXExpressionContainer') {
      const exprPath = (attrPath.get('value') as NodePath).get('expression') as NodePath<t.Expression>
      visit({
        name,
        isExpression: true,
        expressionPath: exprPath,
        valueRange: { start: value.start ?? 0, end: value.end ?? 0 },
        attrRange
      })
    }
  }
}
