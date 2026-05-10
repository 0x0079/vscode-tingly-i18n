import { describe, expectTypeOf, it } from 'vitest'
import type { Framework, FrameworkHost, KeyReference, ScopeRange, DetectionResult } from '../src/index'

describe('Framework contract surface', () => {
  it('KeyReference distinguishes namespace and keyPrefix', () => {
    expectTypeOf<KeyReference>().toHaveProperty('namespace')
    expectTypeOf<KeyReference>().toHaveProperty('keyPrefix')
    expectTypeOf<KeyReference['via']>().toEqualTypeOf<'ast' | 'regex'>()
  })

  it('ScopeRange has both namespace and keyPrefix dimensions', () => {
    expectTypeOf<ScopeRange>().toHaveProperty('namespace')
    expectTypeOf<ScopeRange>().toHaveProperty('keyPrefix')
  })

  it('DetectionResult preserves named args', () => {
    expectTypeOf<DetectionResult['args']>().toEqualTypeOf<{ name: string; expression: string }[]>()
  })

  it('Framework analyze is async and host-driven', () => {
    expectTypeOf<Framework['analyze']>().parameter(1).toEqualTypeOf<FrameworkHost>()
    expectTypeOf<Framework['priority']>().toEqualTypeOf<number>()
  })
})
