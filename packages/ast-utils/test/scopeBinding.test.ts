import { describe, expect, it } from 'vitest'
import _traverse, { type NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import { parseJs } from '../src/babelParser'
import { resolveTBinding } from '../src/scopeBinding'

const traverse: typeof _traverse =
  ((_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse)

function firstCallNamed(source: string, callee: string, languageId = 'typescript'): NodePath<t.CallExpression> {
  const parsed = parseJs({ uri: 'file:///x.ts', source, version: 1, languageId })
  let found: NodePath<t.CallExpression> | undefined
  traverse(parsed.ast, {
    CallExpression(p: NodePath<t.CallExpression>) {
      const c = p.node.callee
      const name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : undefined
      if (name === callee && !found) found = p
    }
  })
  if (!found) throw new Error(`no call to ${callee} in source`)
  return found
}

describe('resolveTBinding', () => {
  it('useTranslation("common") -> namespace', () => {
    const call = firstCallNamed(`
      import { useTranslation } from 'react-i18next'
      function App() { const { t } = useTranslation('common'); return t('home.title') }
    `, 't')
    const r = resolveTBinding(call)
    expect(r).toMatchObject({ kind: 'static', namespace: 'common' })
  })

  it('useTranslations("Home") -> keyPrefix (next-intl)', () => {
    const call = firstCallNamed(`
      import { useTranslations } from 'next-intl'
      export function Page() { const t = useTranslations('Home'); return t('title') }
    `, 't')
    const r = resolveTBinding(call)
    expect(r).toMatchObject({ kind: 'static', keyPrefix: 'Home' })
  })

  it('alias `const tt = t` resolves to aliased', () => {
    const call = firstCallNamed(`
      import { t } from 'i18next'
      const tt = t
      tt('a.b')
    `, 'tt')
    const r = resolveTBinding(call)
    expect(r.kind).toBe('static')
  })

  it('i18n.t() is treated as imported', () => {
    const call = firstCallNamed(`import i18n from 'i18next'; i18n.t('a.b')`, 't')
    const r = resolveTBinding(call)
    expect(r).toEqual({ kind: 'static', via: 'imported' })
  })
})
