import { parse, type ParseResult, type ParserPlugin } from '@babel/parser'
import type * as t from '@babel/types'

export interface ParsedJs {
  ast: ParseResult<t.File>
  source: string
  errors: readonly string[]
}

export type ParseInput = {
  uri: string
  source: string
  version: number
  languageId: string
}

const CACHE = new Map<string, { version: number; hash: string; result: ParsedJs }>()
const MAX = 256

export function parseJs(input: ParseInput): ParsedJs {
  const hash = fnv1a(input.source)
  const cached = CACHE.get(input.uri)
  if (cached && cached.version === input.version && cached.hash === hash) return cached.result

  let ast: ParseResult<t.File>
  const errors: string[] = []
  try {
    ast = parse(input.source, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
      plugins: [...pluginsFor(input.languageId)]
    })
    const astErrors = ast.errors
    if (Array.isArray(astErrors)) {
      for (const e of astErrors) errors.push(String((e as Error).message ?? e))
    }
  } catch (e) {
    ast = emptyFile()
    errors.push(e instanceof Error ? e.message : String(e))
  }

  const result: ParsedJs = { ast, source: input.source, errors }
  CACHE.set(input.uri, { version: input.version, hash, result })
  if (CACHE.size > MAX) {
    const first = CACHE.keys().next().value
    if (first !== undefined) CACHE.delete(first)
  }
  return result
}

export function clearParseCache(): void { CACHE.clear() }

function pluginsFor(languageId: string): readonly ParserPlugin[] {
  const isTs = languageId === 'typescript' || languageId === 'typescriptreact'
  const isJsx = languageId === 'javascriptreact' || languageId === 'typescriptreact'
  const out: ParserPlugin[] = ['decorators-legacy', 'classProperties', 'importAssertions']
  if (isTs) out.push('typescript')
  if (isJsx) out.push('jsx')
  return out
}

function emptyFile(): ParseResult<t.File> {
  return {
    type: 'File',
    program: { type: 'Program', body: [], directives: [], sourceType: 'module' },
    comments: [],
    tokens: [],
    errors: []
  } as unknown as ParseResult<t.File>
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16)
}
