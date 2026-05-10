import type { TextDocumentLike } from '@tingly/framework-contract'

/** A simple LRU keyed by (uri, version, contentHash). */
export class AnalysisCache<V> {
  private readonly map = new Map<string, V>()
  constructor(private readonly capacity = 256) {}

  private static keyFor(doc: TextDocumentLike): string {
    return `${doc.uri}@${doc.version}#${hash(doc.getText())}`
  }

  get(doc: TextDocumentLike): V | undefined {
    const k = AnalysisCache.keyFor(doc)
    const v = this.map.get(k)
    if (v !== undefined) {
      this.map.delete(k)
      this.map.set(k, v)
    }
    return v
  }

  set(doc: TextDocumentLike, value: V): void {
    const k = AnalysisCache.keyFor(doc)
    this.map.set(k, value)
    if (this.map.size > this.capacity) {
      const first = this.map.keys().next().value
      if (first !== undefined) this.map.delete(first)
    }
  }

  clear(): void { this.map.clear() }
}

// FNV-1a 32-bit hash — fast and good enough for cache invalidation.
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16)
}
