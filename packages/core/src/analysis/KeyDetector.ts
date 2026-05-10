import type {
  Framework,
  FrameworkHost,
  KeyReference,
  TextDocumentLike,
  UsageMatchRegex
} from '@tingly/framework-contract'
import { AnalysisCache } from './cache'

export interface KeyDetectorOptions {
  /** ast-first (default): try framework.analyze, fall back to regex on failure or unsupported language. */
  mode?: 'ast-first' | 'regex-only'
  /** Hard cap on analyze() execution to defend the editor from slow framework adapters. */
  analyzeTimeoutMs?: number
}

/**
 * Dispatches detection to the active Framework. Always deterministic:
 *   1. If mode = regex-only, run regex.
 *   2. Else if doc.languageId in framework.supportAst, run analyze().
 *      - If analyze() throws or times out, log and run regex.
 *   3. Else run regex.
 * Each KeyReference carries `via: 'ast' | 'regex'` so the UI can surface
 * confidence (matches the user-confirmed decision in the plan).
 */
export class KeyDetector {
  private readonly cache = new AnalysisCache<readonly KeyReference[]>()

  constructor(
    private readonly framework: Framework,
    private readonly host: FrameworkHost,
    private readonly opts: KeyDetectorOptions = {}
  ) {}

  async detect(doc: TextDocumentLike): Promise<readonly KeyReference[]> {
    const cached = this.cache.get(doc)
    if (cached) return cached
    const result = await this.compute(doc)
    this.cache.set(doc, result)
    return result
  }

  private async compute(doc: TextDocumentLike): Promise<readonly KeyReference[]> {
    const mode = this.opts.mode ?? 'ast-first'
    const supportsAst = this.framework.supportAst.includes(doc.languageId)
    if (mode === 'ast-first' && supportsAst) {
      try {
        const ast = await withTimeout(
          this.framework.analyze(doc, this.host),
          this.opts.analyzeTimeoutMs ?? 1000,
          this.framework.id
        )
        if (ast.length > 0) return ast.map(ensureViaAst)
      } catch (e) {
        this.host.logger.warn(`KeyDetector: analyze() failed for ${doc.uri}, falling back to regex`, e)
      }
    }
    return regexScan(doc, this.framework.usageMatchRegex)
  }

  invalidate(): void { this.cache.clear() }
}

function ensureViaAst(k: KeyReference): KeyReference {
  return k.via === 'ast' ? k : { ...k, via: 'ast' }
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`analyze() timeout after ${ms}ms (${label})`)), ms)
    )
  ])
}

function regexScan(doc: TextDocumentLike, matcher: UsageMatchRegex): readonly KeyReference[] {
  const text = doc.getText()
  const out: KeyReference[] = []
  for (const re of normalizeMatcher(matcher, doc)) {
    let m: RegExpExecArray | null
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g'
    const compiled = new RegExp(re.source, flags)
    while ((m = compiled.exec(text)) !== null) {
      const key = m[1] ?? m[0]
      const start = (m.index ?? 0) + m[0].indexOf(key)
      out.push({
        key,
        isDynamic: false,
        range: { start, end: start + key.length },
        source: 'js-call',
        via: 'regex'
      })
    }
  }
  return out
}

function normalizeMatcher(
  matcher: UsageMatchRegex,
  doc: TextDocumentLike
): readonly RegExp[] {
  const raw =
    typeof matcher === 'function'
      ? matcher({ languageId: doc.languageId, filepath: doc.uri })
      : matcher
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map(r => (typeof r === 'string' ? new RegExp(r, 'g') : r))
}
