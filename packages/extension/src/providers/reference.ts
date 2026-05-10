import * as vscode from 'vscode'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

/**
 * Find references for a key by scanning all open documents (and recently-touched
 * files via @tingly/core indexService once that ships in Phase 3). v1 does an
 * open-document scan only; the eventual ripgrep-prefilter index lives in
 * core/analysis/rgPrefilter.ts.
 */
export function registerReference(detector: KeyDetector): vscode.Disposable {
  return vscode.languages.registerReferenceProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte', 'html'],
    {
      async provideReferences(document, position) {
        const refs = await detector.detect(toTextDocumentLike(document))
        const at = refs.find(r => offsetRangeToVscode(document, r.range).contains(position))
        if (!at) return undefined
        const targetKey = at.key
        const out: vscode.Location[] = []
        for (const doc of vscode.workspace.textDocuments) {
          const found = await detector.detect(toTextDocumentLike(doc))
          for (const f of found) {
            if (f.key !== targetKey) continue
            out.push(new vscode.Location(doc.uri, offsetRangeToVscode(doc, f.range)))
          }
        }
        return out
      }
    }
  )
}
