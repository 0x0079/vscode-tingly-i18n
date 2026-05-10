import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/eventBus'

describe('EventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EventBus()
    const fn = vi.fn()
    bus.on('hello', fn)
    bus.emit('hello', { x: 1 })
    expect(fn).toHaveBeenCalledWith({ x: 1 })
  })

  it('supports unsubscription via Disposable', () => {
    const bus = new EventBus()
    const fn = vi.fn()
    const sub = bus.on('hello', fn)
    sub.dispose()
    bus.emit('hello', 1)
    expect(fn).not.toHaveBeenCalled()
  })

  it('isolates errors thrown by one listener', () => {
    const bus = new EventBus()
    const ok = vi.fn()
    bus.on('e', () => { throw new Error('boom') })
    bus.on('e', ok)
    bus.emit('e', null)
    expect(ok).toHaveBeenCalled()
  })
})
