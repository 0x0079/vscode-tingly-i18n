import * as vscode from 'vscode'
import type { FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

export function registerDefinition(detector: KeyDetector, host: FrameworkHost): vscode.Disposable {
  return vscode.languages.registerDefinitionProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte', 'html'],
    {
      async provideDefinition(document, position) {
        const refs = await detector.detect(toTextDocumentLike(document))
        const ref = refs.find(r => offsetRangeToVscode(document, r.range).contains(position))
        if (!ref) return undefined
        const node = host.loader.getNodeByKey(ref.key, {
          ...(ref.namespace !== undefined ? { namespace: ref.namespace } : {})
        })
        if (!node) return undefined
        const targetUri = vscode.Uri.file(node.filepath)
        const targetDoc = await vscode.workspace.openTextDocument(targetUri)
        return new vscode.Location(
          targetUri,
          new vscode.Range(targetDoc.positionAt(node.range.start), targetDoc.positionAt(node.range.end))
        )
      }
    }
  )
}
