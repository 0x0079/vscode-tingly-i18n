import { describe, expect, it } from 'vitest'
import { EcmascriptLiteParser } from '../src/parsers/ecmascript'

describe('EcmascriptLiteParser', () => {
  it('parses `export default { ... }`', () => {
    const r = EcmascriptLiteParser.parse(
      `export default { home: { title: 'Hello' }, body: 'World' }`,
      { filepath: 'en.ts', locale: 'en' }
    )
    expect(r.errors).toEqual([])
    const titles = r.nodes.filter(n => !n.isBranch).map(n => [n.keypath, n.value])
    expect(titles).toEqual([['home.title', 'Hello'], ['body', 'World']])
  })

  it('parses `module.exports = { ... }`', () => {
    const r = EcmascriptLiteParser.parse(
      `module.exports = { greeting: 'Hi' }`,
      { filepath: 'en.js', locale: 'en' }
    )
    expect(r.nodes.find(n => n.keypath === 'greeting')?.value).toBe('Hi')
  })

  it('reports dynamic values as errors but keeps the rest', () => {
    const r = EcmascriptLiteParser.parse(
      `const dynamic = 'X'; export default { static: 'a', dyn: dynamic }`,
      { filepath: 'en.js', locale: 'en' }
    )
    expect(r.nodes.find(n => n.keypath === 'static')?.value).toBe('a')
    expect(r.errors.some(e => /unsupported value kind/.test(e.message))).toBe(true)
  })

  it('flags missing default export', () => {
    const r = EcmascriptLiteParser.parse(`const x = 1`, { filepath: 'en.js', locale: 'en' })
    expect(r.errors[0]?.message).toMatch(/no `export default/)
  })
})
