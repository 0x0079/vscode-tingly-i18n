import type { TextDocumentLike } from '@tingly/framework-contract'
import type { FrameworkFixture } from './types'

const EXT_TO_LANGUAGE: Readonly<Record<string, string>> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.html': 'html',
  '.json': 'json'
}

export function fixtureToDocument(fixture: FrameworkFixture): TextDocumentLike {
  const [path, source] = Object.entries(fixture.files)[0] ?? ['unknown.ts', '']
  const languageId = fixture.languageId ?? inferLanguage(path)
  return {
    uri: `file:///${path}`,
    languageId,
    version: 1,
    getText: () => source
  }
}

function inferLanguage(filepath: string): string {
  const dot = filepath.lastIndexOf('.')
  const ext = dot >= 0 ? filepath.slice(dot) : ''
  return EXT_TO_LANGUAGE[ext] ?? 'plaintext'
}
