import { describe, expect, it } from 'vitest'
import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import { parseJs } from '../src/babelParser'
import { resolveMemberExpression } from '../src/constantResolver'

const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

function memberInsideCall(source: string): NodePath<t.MemberExpression> {
  const parsed = parseJs({ uri: 'file:///x.ts', source, version: 1, languageId: 'typescript' })
  let found: NodePath<t.MemberExpression> | undefined
  traverse(parsed.ast, {
    CallExpression(p: NodePath<t.CallExpression>) {
      const arg = p.get('arguments')[0]
      if (arg && arg.isMemberExpression() && !found) found = arg
    }
  })
  if (!found) throw new Error('no member expression in call args')
  return found
}

describe('resolveMemberExpression', () => {
  it('resolves KEYS.foo.bar from same-file ObjectExpression', () => {
    const member = memberInsideCall(`
      const KEYS = { home: { title: 'home.title' } }
      t(KEYS.home.title)
    `)
    expect(resolveMemberExpression(member)).toEqual({ kind: 'static', value: 'home.title', via: 'same-file' })
  })

  it('returns dynamic for KEYS[bar]', () => {
    const member = memberInsideCall(`
      const KEYS = { home: { title: 'home.title' } }
      const bar = 'home'
      t(KEYS[bar].title)
    `)
    expect(resolveMemberExpression(member).kind).toBe('dynamic')
  })

  it('returns dynamic when root binding is missing', () => {
    const member = memberInsideCall(`t(UNKNOWN.foo)`)
    expect(resolveMemberExpression(member).kind).toBe('dynamic')
  })

  it('resolves through KEYS["foo"] string-literal computed access', () => {
    const member = memberInsideCall(`
      const KEYS = { 'home': { title: 'h.t' } }
      t(KEYS['home'].title)
    `)
    expect(resolveMemberExpression(member)).toEqual({ kind: 'static', value: 'h.t', via: 'same-file' })
  })
})
