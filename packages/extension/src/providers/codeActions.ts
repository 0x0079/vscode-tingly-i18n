import * as vscode from 'vscode'
import type { Framework } from '@tingly/framework-contract'
import { DIAGNOSTIC_SOURCE } from './diagnostics'

export function registerCodeActions(framework: Framework): vscode.Disposable {
  return vscode.languages.registerCodeActionsProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte', 'html'],
    {
      provideCodeActions(document, range, ctx) {
        const actions: vscode.CodeAction[] = []
        for (const d of ctx.diagnostics) {
          if (d.source !== DIAGNOSTIC_SOURCE) continue
          if (d.code === 'missing-key') {
            const key = String(d.message).replace(/^Missing translation key: /, '')
            const fix = new vscode.CodeAction(`Translate \`${key}\``, vscode.CodeActionKind.QuickFix)
            fix.command = {
              command: 'tingly.translate.key',
              title: 'Translate',
              arguments: [{ key, uri: document.uri.toString() }]
            }
            fix.diagnostics = [d]
            actions.push(fix)
          }
          if (d.code === 'hard-string') {
            const text = String(d.message).match(/"(.+)"$/)?.[1] ?? ''
            const fix = new vscode.CodeAction('Extract to translation key', vscode.CodeActionKind.QuickFix)
            fix.command = {
              command: 'tingly.extract',
              title: 'Extract',
              arguments: [{ text, uri: document.uri.toString(), range: { start: range.start, end: range.end } }]
            }
            fix.diagnostics = [d]
            actions.push(fix)
          }
        }
        void framework
        return actions
      }
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorExtract] }
  )
}
