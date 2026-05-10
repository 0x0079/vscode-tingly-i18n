import type { ILoaderReadOnly } from '@tingly/framework-contract'
import { LocaleTree, type LocaleTreeLeaf } from './LocaleTree'
import type { Locale, LocaleNode, ParsedFile } from './types'

export interface LocaleLoaderOptions {
  /** Active display locale (used as the default for getValueByKey). */
  displayLanguage: Locale
  /** Source-of-truth locale (drives 'fallback / authoritative' lookups). */
  sourceLanguage: Locale
  /** When true, scope keys by namespace (each namespace becomes its own subtree). */
  namespaceMode?: boolean
}

export interface ILoaderEvents {
  on(event: 'changed', listener: () => void): { dispose(): void }
  on(event: 'error', listener: (err: Error) => void): { dispose(): void }
}

/**
 * In-memory locale loader. The extension wires a FileSystemWatcher around
 * `ingest()` / `evict()` to keep the tree in sync.
 */
export class LocaleLoader implements ILoaderReadOnly, ILoaderEvents {
  private readonly trees = new Map<string /* namespace ?? '' */, LocaleTree>()
  private readonly listeners: { changed: Set<() => void>; error: Set<(e: Error) => void> } = {
    changed: new Set(),
    error: new Set()
  }

  constructor(private readonly opts: LocaleLoaderOptions) {}

  ingest(file: ParsedFile): void {
    const nsKey = this.opts.namespaceMode ? (file.namespace ?? '') : ''
    let tree = this.trees.get(nsKey)
    if (!tree) {
      tree = new LocaleTree()
      this.trees.set(nsKey, tree)
    }
    tree.ingest(file.nodes)
    this.notifyChanged()
    for (const e of file.errors) this.notifyError(new Error(e.message))
  }

  /** Drop all data from a previously ingested file. Currently rebuilds the namespace tree (cheap for v1 sizes). */
  evictByFilepath(filepath: string): void {
    const survivingByNs = new Map<string, LocaleNode[]>()
    for (const [ns, tree] of this.trees) {
      for (const leaf of tree.flatten()) {
        for (const [, node] of leaf.values) {
          if (node.filepath === filepath) continue
          let arr = survivingByNs.get(ns)
          if (!arr) { arr = []; survivingByNs.set(ns, arr) }
          arr.push(node)
        }
      }
    }
    this.trees.clear()
    for (const [ns, nodes] of survivingByNs) {
      const tree = new LocaleTree()
      tree.ingest(nodes)
      this.trees.set(ns, tree)
    }
    this.notifyChanged()
  }

  // ---------- ILoaderReadOnly ----------

  getKeys(opts?: { namespace?: string }): readonly string[] {
    const tree = this.pickTree(opts?.namespace)
    if (!tree) return []
    return tree.flatten().map(l => l.keypath)
  }

  getValueByKey(
    keypath: string,
    opts?: { locale?: string; namespace?: string }
  ): string | undefined {
    const leaf = this.findLeaf(keypath, opts?.namespace)
    if (!leaf) return undefined
    const locale = opts?.locale ?? this.opts.displayLanguage
    return leaf.values.get(locale)?.value ?? leaf.values.get(this.opts.sourceLanguage)?.value
  }

  getNodeByKey(
    keypath: string,
    opts?: { locale?: string; namespace?: string }
  ): { filepath: string; range: { start: number; end: number } } | undefined {
    const leaf = this.findLeaf(keypath, opts?.namespace)
    if (!leaf) return undefined
    const locale = opts?.locale ?? this.opts.displayLanguage
    const node = leaf.values.get(locale) ?? leaf.values.get(this.opts.sourceLanguage)
    return node ? { filepath: node.filepath, range: node.range } : undefined
  }

  // ---------- ILoaderEvents ----------

  on(event: 'changed' | 'error', listener: never): { dispose(): void } {
    const set = event === 'changed' ? this.listeners.changed : this.listeners.error
    set.add(listener as never)
    return { dispose: () => set.delete(listener as never) }
  }

  // ---------- helpers ----------

  private pickTree(namespace: string | undefined): LocaleTree | undefined {
    if (!this.opts.namespaceMode) return this.trees.get('')
    return this.trees.get(namespace ?? '')
  }

  private findLeaf(keypath: string, namespace: string | undefined): LocaleTreeLeaf | undefined {
    const tree = this.pickTree(namespace)
    if (!tree) return undefined
    return tree.getLeaf(keypath)
  }

  private notifyChanged(): void {
    for (const fn of this.listeners.changed) try { fn() } catch { /* ignore */ }
  }

  private notifyError(err: Error): void {
    for (const fn of this.listeners.error) try { fn(err) } catch { /* ignore */ }
  }
}
