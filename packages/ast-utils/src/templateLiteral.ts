import type * as t from '@babel/types'

export interface TemplateExpansion {
  /** Static prefix before the first expression. */
  staticPrefix: string
  /** True when there is a dynamic expression. */
  dynamicMiddle: boolean
  /** Static suffix after the last expression. */
  staticSuffix: string
  /** All static quasis joined for the simple case (no expressions). */
  fullStatic?: string
}

export function expandTemplateLiteral(node: t.TemplateLiteral): TemplateExpansion {
  if (node.expressions.length === 0) {
    const full = node.quasis.map(q => q.value.cooked ?? q.value.raw).join('')
    return { staticPrefix: full, dynamicMiddle: false, staticSuffix: '', fullStatic: full }
  }
  const first = node.quasis[0]
  const last = node.quasis[node.quasis.length - 1]
  return {
    staticPrefix: first?.value.cooked ?? first?.value.raw ?? '',
    dynamicMiddle: true,
    staticSuffix: last?.value.cooked ?? last?.value.raw ?? ''
  }
}
