import { describe, expect, it } from 'vitest'
import { JsonParser } from '../src/parsers/json'

describe('JsonParser', () => {
  it('flattens nested keys with positions', () => {
    const src = '{"home":{"title":"Hello"}}'
    const r = JsonParser.parse(src, { filepath: 'en.json', locale: 'en' })
    expect(r.errors).toEqual([])
    const titleNode = r.nodes.find(n => n.keypath === 'home.title')
    expect(titleNode?.value).toBe('Hello')
    expect(titleNode?.range.start).toBeGreaterThan(0)
    expect(src.slice(titleNode!.range.start, titleNode!.range.end)).toContain('Hello')
  })

  it('reports parse errors', () => {
    const r = JsonParser.parse('{not valid', { filepath: 'x.json', locale: 'en' })
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it('round-trips via stringify (data only — positions reset)', () => {
    const src = '{"a":"1","b":{"c":"2"}}'
    const r = JsonParser.parse(src, { filepath: 'en.json', locale: 'en' })
    const map = new Map<string, string>()
    for (const n of r.nodes) if (!n.isBranch) map.set(n.keypath, n.value ?? '')
    const out = JsonParser.stringify!(map, { locale: 'en' })
    expect(JSON.parse(out)).toEqual({ a: '1', b: { c: '2' } })
  })
})
