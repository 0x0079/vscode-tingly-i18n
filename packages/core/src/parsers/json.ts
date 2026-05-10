import type { ICoreParser, LocaleNode, ParsedFile } from '../types'

export const JsonParser: ICoreParser = {
  extensions: ['.json'],
  parse(source, ctx): ParsedFile {
    const nodes: LocaleNode[] = []
    const errors: ParsedFile['errors'] = []
    let parsed: unknown
    try {
      parsed = JSON.parse(source)
    } catch (e) {
      return {
        filepath: ctx.filepath,
        locale: ctx.locale,
        ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
        nodes: [],
        errors: [{ message: e instanceof Error ? e.message : String(e) }]
      }
    }
    walk(parsed, [], nodes, ctx, source)
    return {
      filepath: ctx.filepath,
      locale: ctx.locale,
      ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
      nodes,
      errors
    }
  },
  stringify(entries, ctx) {
    const out: Record<string, unknown> = {}
    for (const [keypath, value] of entries) setDeep(out, keypath, value)
    void ctx
    return JSON.stringify(out, null, 2) + '\n'
  }
}

function walk(
  v: unknown,
  path: string[],
  out: LocaleNode[],
  ctx: { filepath: string; locale: string; namespace?: string },
  source: string
): void {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (path.length > 0) {
      out.push(makeBranch(path.join('.'), ctx))
    }
    for (const [k, child] of Object.entries(v)) {
      walk(child, [...path, k], out, ctx, source)
    }
    return
  }
  const keypath = path.join('.')
  const text = typeof v === 'string' ? v : v == null ? '' : String(v)
  out.push({
    keypath,
    value: text,
    filepath: ctx.filepath,
    range: locateValueRange(source, path),
    locale: ctx.locale,
    ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
    isBranch: false
  })
}

function makeBranch(keypath: string, ctx: { filepath: string; locale: string; namespace?: string }): LocaleNode {
  return {
    keypath,
    value: undefined,
    filepath: ctx.filepath,
    range: { start: 0, end: 0 },
    locale: ctx.locale,
    ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
    isBranch: true
  }
}

/**
 * Best-effort source locator. We do a structural search through the original
 * text by re-walking the JSON character stream, tracking key paths, and noting
 * the literal value's offsets. Approximate (doesn't handle every edge case),
 * but sufficient for go-to-definition jumps.
 */
function locateValueRange(source: string, path: readonly string[]): { start: number; end: number } {
  let i = 0
  const stack: string[] = []
  let lastKey: string | undefined
  while (i < source.length) {
    const ch = source[i]
    if (ch === '"') {
      const literalStart = i
      i = readStringEnd(source, i)
      const literal = JSON.parse(source.slice(literalStart, i + 1)) as string
      i++
      while (i < source.length && /\s/.test(source[i] ?? '')) i++
      if (source[i] === ':') {
        lastKey = literal
        i++
      } else {
        const candidatePath = lastKey === undefined ? stack : [...stack, lastKey]
        if (pathEq(candidatePath, path)) {
          return { start: literalStart, end: i }
        }
        lastKey = undefined
      }
      continue
    }
    if (ch === '{') { if (lastKey !== undefined) { stack.push(lastKey); lastKey = undefined } else if (stack.length > 0 || i > 0) stack.push(''); i++; continue }
    if (ch === '}') { stack.pop(); i++; continue }
    if (ch === ',' || ch === '\n' || ch === '\r') { lastKey = undefined; i++; continue }
    if (ch === '[' || ch === ']') { i++; continue }
    if (ch !== undefined && /[\d\-tfn]/.test(ch)) {
      const start = i
      while (i < source.length && /[\w.\-+]/.test(source[i] ?? '')) i++
      const candidatePath = lastKey === undefined ? stack : [...stack, lastKey]
      if (pathEq(candidatePath, path)) return { start, end: i }
      lastKey = undefined
      continue
    }
    i++
  }
  return { start: 0, end: 0 }
}

function readStringEnd(source: string, start: number): number {
  let i = start + 1
  while (i < source.length) {
    const ch = source[i]
    if (ch === '\\') { i += 2; continue }
    if (ch === '"') return i
    i++
  }
  return source.length - 1
}

function pathEq(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function setDeep(obj: Record<string, unknown>, keypath: string, value: string): void {
  const parts = keypath.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i] as string
    const next = cur[k]
    if (!next || typeof next !== 'object') cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1] as string] = value
}
