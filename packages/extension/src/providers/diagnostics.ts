import * as vscode from 'vscode'
import type { Framework, FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

export const DIAGNOSTIC_SOURCE = 'tingly'

export function registerDiagnostics(
  detector: KeyDetector,
  framework: Framework,
  host: FrameworkHost,
  context: vscode.ExtensionContext
): vscode.Disposable {
  const collection = vscode.languages.createDiagnosticCollection('tingly')
  context.subscriptions.push(collection)

  async function refresh(doc: vscode.TextDocument): Promise<void> {
    if (!isCandidate(doc)) return
    const diagnostics: vscode.Diagnostic[] = []
    const refs = await detector.detect(toTextDocumentLike(doc))
    for (const ref of refs) {
      const known = host.loader.getKeys(
        ref.namespace !== undefined ? { namespace: ref.namespace } : undefined
      )
      if (!known.includes(ref.key) && !ref.isDynamic) {
        const d = new vscode.Diagnostic(
          offsetRangeToVscode(doc, ref.range),
          `Missing translation key: ${ref.key}`,
          vscode.DiagnosticSeverity.Information
        )
        d.source = DIAGNOSTIC_SOURCE
        d.code = 'missing-key'
        diagnostics.push(d)
      }
      if (
        ref.via === 'regex' &&
        vscode.workspace.getConfiguration().get<boolean>('tingly.diagnostics.showRegexFallback')
      ) {
        const d = new vscode.Diagnostic(
          offsetRangeToVscode(doc, ref.range),
          `Detected via regex fallback (AST analyzer didn't catch this).`,
          vscode.DiagnosticSeverity.Hint
        )
        d.source = DIAGNOSTIC_SOURCE
        d.code = 'regex-fallback'
        diagnostics.push(d)
      }
    }
    const hardStrings = framework.detectHardStrings(toTextDocumentLike(doc), host)
    for (const hs of hardStrings ?? []) {
      const d = new vscode.Diagnostic(
        offsetRangeToVscode(doc, hs.range),
        `Hard-coded string: "${hs.text}"`,
        vscode.DiagnosticSeverity.Information
      )
      d.source = DIAGNOSTIC_SOURCE
      d.code = 'hard-string'
      diagnostics.push(d)
    }
    collection.set(doc.uri, diagnostics)
  }

  function isCandidate(doc: vscode.TextDocument): boolean {
    return ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte', 'html']
      .includes(doc.languageId)
  }

  const subs = [
    collection,
    vscode.workspace.onDidOpenTextDocument(d => void refresh(d)),
    vscode.workspace.onDidChangeTextDocument(e => void refresh(e.document)),
    vscode.workspace.onDidCloseTextDocument(d => collection.delete(d.uri))
  ]
  for (const d of vscode.workspace.textDocuments) void refresh(d)
  return vscode.Disposable.from(...subs)
}
