import { describe, expect, it } from 'vitest'
import { LocaleTree } from '../src/LocaleTree'
import type { LocaleNode } from '../src/types'

function node(keypath: string, value: string, locale = 'en'): LocaleNode {
  return { keypath, value, filepath: `${locale}.json`, range: { start: 0, end: 0 }, locale, isBranch: false }
}

describe('LocaleTree', () => {
  it('flattens leaves', () => {
    const tree = new LocaleTree()
    tree.ingest([node('home.title', 'Hello'), node('home.body', 'World')])
    const leaves = tree.flatten().map(l => l.keypath).sort()
    expect(leaves).toEqual(['home.body', 'home.title'])
  })

  it('folds plural variants into one leaf', () => {
    const tree = new LocaleTree()
    tree.ingest([
      node('apple.one', 'apple'),
      node('apple.other', 'apples')
    ])
    const leaf = tree.getLeaf('apple')
    expect(leaf).toBeDefined()
    expect(leaf?.isPlural).toBe(true)
    expect(leaf?.values.get('en')?.value).toBe('apples')
  })

  it('multi-locale aggregation', () => {
    const tree = new LocaleTree()
    tree.ingest([node('greeting', 'Hello', 'en'), node('greeting', 'Hola', 'es')])
    const leaf = tree.getLeaf('greeting')
    expect(leaf?.values.get('en')?.value).toBe('Hello')
    expect(leaf?.values.get('es')?.value).toBe('Hola')
  })
})
