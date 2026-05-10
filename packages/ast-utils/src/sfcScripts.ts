import type { OffsetRange } from '@tingly/framework-contract'

export interface ScriptBlock {
  source: string
  /** Offset of `source[0]` in the original file. */
  offset: number
  /** Detected `lang` attribute (typescript / javascript / undefined). */
  lang?: string
}

/**
 * Pull <script> and <script setup> blocks out of a Vue or Svelte SFC.
 * Avoids pulling in @vue/compiler-sfc / svelte/compiler in v1 — we only need
 * the script body for AST analysis; template/markup falls back to regex.
 */
export function extractScriptBlocks(source: string): readonly ScriptBlock[] {
  const out: ScriptBlock[] = []
  // Match <script ...> ... </script> non-greedy; capture attributes.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const attrs = m[1] ?? ''
    const body = m[2] ?? ''
    const fullStart = m.index ?? 0
    const startTagEnd = fullStart + (m[0].indexOf('>') + 1)
    const lang = /\blang\s*=\s*['"]([\w-]+)['"]/.exec(attrs)?.[1]
    out.push({
      source: body,
      offset: startTagEnd,
      ...(lang ? { lang } : {})
    })
  }
  return out
}

/** Translate a babel offset within a script block to whole-file coordinates. */
export function translateRange(local: OffsetRange | undefined, scriptOffset: number): OffsetRange {
  return { start: (local?.start ?? 0) + scriptOffset, end: (local?.end ?? 0) + scriptOffset }
}
