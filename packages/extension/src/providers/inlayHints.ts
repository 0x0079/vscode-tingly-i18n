import * as vscode from 'vscode'
import type { Framework, FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

/**
 * Primary inline rendering. One InlayHint per detected key, showing the
 * resolved value in the active display language. Keys with `via: 'regex'`
 * get a subtle `~` suffix to communicate confidence (per plan decision A1).
 */
export function registerInlayHints(
  detector: KeyDetector,
  framework: Framework,
  host: FrameworkHost
): vscode.Disposable {
  const provider: vscode.InlayHintsProvider = {
    async provideInlayHints(document, range, _token) {
      const refs = await detector.detect(toTextDocumentLike(document))
      const hints: vscode.InlayHint[] = []
      for (const ref of refs) {
        const r = offsetRangeToVscode(document, ref.range)
        if (!range.contains(r.start)) continue
        const value = host.loader.getValueByKey(ref.key, {
          ...(ref.namespace !== undefined ? { namespace: ref.namespace } : {})
        })
        if (value === undefined) continue
        const label = value.length > 40 ? value.slice(0, 39) + '…' : value
        const suffix = ref.via === 'regex' ? ' ~' : ''
        const hint = new vscode.InlayHint(r.end, ` → ${label}${suffix}`, vscode.InlayHintKind.Type)
        hint.paddingLeft = true
        hints.push(hint)
      }
      void framework
      return hints
    }
  }
  return vscode.languages.registerInlayHintsProvider(
    [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'vue' },
      { scheme: 'file', language: 'svelte' },
      { scheme: 'file', language: 'html' }
    ],
    provider
  )
}
