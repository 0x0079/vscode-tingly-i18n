import type { ICoreParser, LocaleNode, ParsedFile } from '../types'

/**
 * Minimal YAML parser supporting the flat / nested map subset i18n locale files
 * actually use. Real production should switch to the `yaml` package; this avoids
 * a runtime dependency in Phase 1 while keeping the rest of the pipeline testable.
 */
export const YamlParser: ICoreParser = {
  extensions: ['.yml', '.yaml'],
  parse(source, ctx): ParsedFile {
    const nodes: LocaleNode[] = []
    const errors: { message: string; offset?: number }[] = []
    const lines = source.split(/\r?\n/)
    const stack: { indent: number; path: string[] }[] = [{ indent: -1, path: [] }]
    let offset = 0
    for (const line of lines) {
      const lineStart = offset
      offset += line.length + 1
      const stripped = line.replace(/#.*$/, '').trimEnd()
      if (stripped.trim().length === 0) continue
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      const m = stripped.match(/^\s*([^:\s][^:]*):\s?(.*)$/)
      if (!m) {
        errors.push({ message: `unparsable line: ${line}`, offset: lineStart })
        continue
      }
      const [, rawKey, rawVal] = m
      const key = rawKey?.trim() ?? ''
      while (stack.length > 0 && (stack[stack.length - 1] as { indent: number; path: string[] }).indent >= indent) stack.pop()
      const parent = stack[stack.length - 1] as { indent: number; path: string[] }
      const path = [...parent.path, key]
      const value = rawVal === undefined ? '' : rawVal.trim()
      if (value === '' || value === '|' || value === '>') {
        nodes.push({
          keypath: path.join('.'),
          value: undefined,
          filepath: ctx.filepath,
          range: { start: lineStart, end: lineStart + line.length },
          locale: ctx.locale,
          ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
          isBranch: true
        })
        stack.push({ indent, path })
        continue
      }
      const cleaned = unquote(value)
      const valStartInLine = line.indexOf(value, line.indexOf(':'))
      nodes.push({
        keypath: path.join('.'),
        value: cleaned,
        filepath: ctx.filepath,
        range: { start: lineStart + valStartInLine, end: lineStart + valStartInLine + value.length },
        locale: ctx.locale,
        ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
        isBranch: false
      })
    }
    return {
      filepath: ctx.filepath,
      locale: ctx.locale,
      ...(ctx.namespace !== undefined ? { namespace: ctx.namespace } : {}),
      nodes,
      errors
    }
  }
}

function unquote(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return v
}
