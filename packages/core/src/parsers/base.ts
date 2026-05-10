import type { ICoreParser } from '../types'

const registry = new Map<string, ICoreParser>()

export function registerParser(parser: ICoreParser): void {
  for (const ext of parser.extensions) {
    if (registry.has(ext)) {
      throw new Error(`Parser already registered for extension ${ext}`)
    }
    registry.set(ext.toLowerCase(), parser)
  }
}

export function getParserForExt(ext: string): ICoreParser | undefined {
  return registry.get(ext.toLowerCase())
}

export function clearParsers(): void {
  registry.clear()
}
