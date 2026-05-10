import { describe, expect, it } from 'vitest'
import { parseJs } from '../src/babelParser'
import { expandTemplateLiteral } from '../src/templateLiteral'
import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'

const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

function firstTemplate(source: string): t.TemplateLiteral {
  const parsed = parseJs({ uri: 'file:///x.ts', source, version: 1, languageId: 'typescript' })
  let found: t.TemplateLiteral | undefined
  traverse(parsed.ast, {
    TemplateLiteral(p: NodePath<t.TemplateLiteral>) { if (!found) found = p.node }
  })
  if (!found) throw new Error('no TemplateLiteral')
  return found
}

describe('expandTemplateLiteral', () => {
  it('static-only', () => {
    const r = expandTemplateLiteral(firstTemplate('const x = `home.title`'))
    expect(r.dynamicMiddle).toBe(false)
    expect(r.fullStatic).toBe('home.title')
  })

  it('extracts staticPrefix and staticSuffix around an expression', () => {
    const r = expandTemplateLiteral(firstTemplate('const x = `home.${section}.title`'))
    expect(r.dynamicMiddle).toBe(true)
    expect(r.staticPrefix).toBe('home.')
    expect(r.staticSuffix).toBe('.title')
  })

  it('handles multiple expressions', () => {
    const r = expandTemplateLiteral(firstTemplate('const x = `${a}.b.${c}`'))
    expect(r.dynamicMiddle).toBe(true)
    expect(r.staticPrefix).toBe('')
    expect(r.staticSuffix).toBe('')
  })
})
