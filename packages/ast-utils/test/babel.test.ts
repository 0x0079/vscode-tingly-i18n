import { describe, expect, it } from 'vitest'
import { parseJs, walkJs } from '../src/index'
import type * as t from '@babel/types'

function collectCalls(source: string): readonly { callee: string; arg: string }[] {
  const parsed = parseJs({ uri: 'file:///x.tsx', source, version: 1, languageId: 'typescriptreact' })
  const out: { callee: string; arg: string }[] = []
  walkJs(parsed, {
    onCallExpression(site) {
      const arg0 = site.path.node.arguments[0]
      const argStr = arg0 && arg0.type === 'StringLiteral' ? arg0.value : ''
      out.push({ callee: site.calleeName ?? '<member>', arg: argStr })
    }
  })
  return out
}

describe('parseJs + walkJs', () => {
  it('finds simple t() calls', () => {
    const r = collectCalls(`function App() { return t('home.title') }`)
    expect(r).toEqual([{ callee: 't', arg: 'home.title' }])
  })

  it('survives parse errors with errorRecovery', () => {
    const parsed = parseJs({ uri: 'file:///bad.ts', source: 'const x =', version: 1, languageId: 'typescript' })
    expect(parsed.ast).toBeDefined()
    expect(parsed.errors.length).toBeGreaterThan(0)
  })

  it('caches by (uri, version, contentHash)', () => {
    const a = parseJs({ uri: 'file:///x.ts', source: 'const x = 1', version: 1, languageId: 'typescript' })
    const b = parseJs({ uri: 'file:///x.ts', source: 'const x = 1', version: 1, languageId: 'typescript' })
    expect(a).toBe(b)
  })

  it('walks JSX opening elements', () => {
    const parsed = parseJs({
      uri: 'file:///x.tsx',
      source: `const x = <Trans i18nKey="home.title" />`,
      version: 1,
      languageId: 'typescriptreact'
    })
    const tags: string[] = []
    walkJs(parsed, { onJsxOpeningElement: site => tags.push(site.tagName) })
    expect(tags).toEqual(['Trans'])
  })

  it('finds JSX MemberExpression callees', () => {
    const parsed = parseJs({
      uri: 'file:///x.tsx',
      source: `i18n.t('home.title')`,
      version: 1,
      languageId: 'typescriptreact'
    })
    const callees: { name?: string; isMember: boolean }[] = []
    walkJs(parsed, { onCallExpression: site => callees.push({ name: site.calleeName, isMember: site.isMember }) })
    expect(callees).toEqual([{ name: 't', isMember: true }])
    void ({} as t.File)
  })
})
