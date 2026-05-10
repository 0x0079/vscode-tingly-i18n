import type { Keypath, Locale, LocaleNode } from './types'

/**
 * Plural suffixes vue-i18n / i18next / icu treat as siblings of a single key.
 * docs/.../03 §3.3 — these are folded so the LocaleTree treats e.g.
 *   { apple: { one: 'apple', other: 'apples' } }
 * as one leaf 'apple' with a plural payload, not as a branch.
 */
const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

export interface LocaleTreeBranch {
  type: 'branch'
  keypath: Keypath
  /** Map of next-segment -> child. Insertion-ordered (Map preserves order). */
  children: Map<string, LocaleTreeNode>
}

export interface LocaleTreeLeaf {
  type: 'leaf'
  keypath: Keypath
  /** locale -> source LocaleNode. */
  values: Map<Locale, LocaleNode>
  /** True if this leaf was promoted from { one, other } plural folding. */
  isPlural: boolean
}

export type LocaleTreeNode = LocaleTreeBranch | LocaleTreeLeaf

export class LocaleTree {
  readonly root: LocaleTreeBranch = { type: 'branch', keypath: '', children: new Map() }

  ingest(nodes: readonly LocaleNode[]): void {
    for (const node of nodes) {
      if (node.isBranch) continue
      this.insert(node)
    }
    this.foldPlurals(this.root)
  }

  /** Flat view: every leaf keypath. */
  flatten(): readonly LocaleTreeLeaf[] {
    const out: LocaleTreeLeaf[] = []
    walk(this.root, n => { if (n.type === 'leaf') out.push(n) })
    return out
  }

  getLeaf(keypath: Keypath): LocaleTreeLeaf | undefined {
    const parts = keypath.split('.')
    let cur: LocaleTreeNode = this.root
    for (const part of parts) {
      if (cur.type !== 'branch') return undefined
      const next = cur.children.get(part)
      if (!next) return undefined
      cur = next
    }
    return cur.type === 'leaf' ? cur : undefined
  }

  private insert(node: LocaleNode): void {
    const parts = node.keypath.split('.')
    let cur: LocaleTreeBranch = this.root
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i] as string
      let next = cur.children.get(seg)
      if (!next) {
        next = { type: 'branch', keypath: parts.slice(0, i + 1).join('.'), children: new Map() }
        cur.children.set(seg, next)
      }
      if (next.type !== 'branch') {
        // Existing leaf collides with a branch path — promote to branch carrying its old value as '$value'.
        const promoted: LocaleTreeBranch = { type: 'branch', keypath: next.keypath, children: new Map() }
        cur.children.set(seg, promoted)
        next = promoted
      }
      cur = next
    }
    const last = parts[parts.length - 1] as string
    const existing = cur.children.get(last)
    if (existing && existing.type === 'leaf') {
      existing.values.set(node.locale, node)
      return
    }
    if (existing && existing.type === 'branch') {
      // Locale node says this is a leaf but tree already has children — ignore (data conflict).
      return
    }
    const leaf: LocaleTreeLeaf = {
      type: 'leaf',
      keypath: node.keypath,
      values: new Map([[node.locale, node]]),
      isPlural: false
    }
    cur.children.set(last, leaf)
  }

  private foldPlurals(branch: LocaleTreeBranch): void {
    for (const [seg, child] of [...branch.children]) {
      if (child.type === 'branch') {
        // Folding candidate: every child is a plural-suffix leaf.
        if (
          child.children.size > 0 &&
          [...child.children.values()].every(c => c.type === 'leaf' && PLURAL_KEYS.has(seg) ? false : true) &&
          [...child.children.keys()].every(k => PLURAL_KEYS.has(k))
        ) {
          // Promote the 'other' (or first) variant as the canonical leaf and mark plural.
          const canonical =
            child.children.get('other') ?? child.children.values().next().value
          if (canonical && canonical.type === 'leaf') {
            const promoted: LocaleTreeLeaf = {
              type: 'leaf',
              keypath: child.keypath,
              values: canonical.values,
              isPlural: true
            }
            branch.children.set(seg, promoted)
            continue
          }
        }
        this.foldPlurals(child)
      }
    }
  }
}

function walk(node: LocaleTreeNode, visit: (n: LocaleTreeNode) => void): void {
  visit(node)
  if (node.type === 'branch') {
    for (const child of node.children.values()) walk(child, visit)
  }
}
