import { describe, expect, it } from 'vitest'
import type { Framework } from '@tingly/framework-contract'
import type { FrameworkTestKit, GoldenKeyReference } from './types'
import { fixtureToDocument } from './fixtures'
import { makeTestHost } from './host'

/**
 * Run a framework's test kit. Each stream calls this from a single .test.ts
 * inside its package; the runner expands the kit's cases into vitest cases so
 * IDE / CI surfaces them individually.
 *
 * IMPORTANT: this function MUST be called at module top-level inside a vitest
 * file. It uses describe/it from vitest, so it relies on the calling package
 * having vitest as a dev dependency.
 */
export function runFrameworkTestKit(kit: FrameworkTestKit): void {
  describe(`Framework kit — ${kit.framework.id}`, () => {
    for (const c of kit.cases) {
      switch (c.kind) {
        case 'analyze':
          it(`analyze: ${c.name}`, async () => {
            const doc = fixtureToDocument(c.fixture)
            const host = makeTestHost({
              data: c.fixture.locales ?? {},
              ...(c.fixture.namespaceMode !== undefined ? { namespaceMode: c.fixture.namespaceMode } : {})
            })
            const refs = await kit.framework.analyze(doc, host)
            const projected: GoldenKeyReference[] = refs.map(r => ({
              key: r.key,
              isDynamic: r.isDynamic,
              ...(r.staticPrefix !== undefined ? { staticPrefix: r.staticPrefix } : {}),
              ...(r.namespace !== undefined ? { namespace: r.namespace } : {}),
              ...(r.keyPrefix !== undefined ? { keyPrefix: r.keyPrefix } : {}),
              source: r.source,
              via: r.via
            }))
            expect(projected).toEqual(c.expect)
          })
          break

        case 'detectHardStrings':
          it(`detectHardStrings: ${c.name}`, async () => {
            const doc = fixtureToDocument(c.fixture)
            const host = makeTestHost({ data: c.fixture.locales ?? {} })
            const detected = kit.framework.detectHardStrings(doc, host) ?? []
            const projected = detected.map(d => ({
              text: d.text,
              isDynamic: d.isDynamic,
              source: d.source,
              argNames: d.args.map(a => a.name)
            }))
            expect(projected).toEqual(c.expect)
          })
          break

        case 'scopeRange':
          it(`scopeRange: ${c.name}`, async () => {
            const doc = fixtureToDocument(c.fixture)
            const host = makeTestHost({ data: c.fixture.locales ?? {} })
            const scopes = kit.framework.getScopeRange(doc, host) ?? []
            const projected = scopes.map(s => ({
              ...(s.namespace !== undefined ? { namespace: s.namespace } : {}),
              ...(s.keyPrefix !== undefined ? { keyPrefix: s.keyPrefix } : {}),
              ...(s.namespaceIsDynamic !== undefined ? { namespaceIsDynamic: s.namespaceIsDynamic } : {})
            }))
            expect(projected).toEqual(c.expect)
          })
          break

        case 'pathMatcher':
          it(`pathMatcher: ${c.name}`, () => {
            expect(kit.framework.pathMatcher(c.dirStructure)).toBe(c.expect)
          })
          break
      }
    }
  })
  // Reference framework so the bundler keeps the symbol on uses below.
  void (null as Framework | null)
}
