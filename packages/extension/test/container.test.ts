import { describe, expect, it } from 'vitest'
import { Container } from '../src/container'

describe('Container', () => {
  it('registers and resolves a value', () => {
    const c = new Container()
    c.register('x', 42)
    expect(c.resolve<number>('x')).toBe(42)
  })

  it('throws on duplicate registration', () => {
    const c = new Container()
    c.register('x', 1)
    expect(() => c.register('x', 2)).toThrow(/already registered/)
  })

  it('throws on unknown token', () => {
    const c = new Container()
    expect(() => c.resolve('missing')).toThrow(/unknown token/)
  })

  it('disposes registered Disposables on dispose', () => {
    const c = new Container()
    let disposed = false
    c.register('d', { dispose: () => { disposed = true } })
    c.dispose()
    expect(disposed).toBe(true)
    expect(c.has('d')).toBe(false)
  })
})
