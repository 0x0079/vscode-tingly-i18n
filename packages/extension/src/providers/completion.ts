import * as vscode from 'vscode'
import type { FrameworkHost } from '@tingly/framework-contract'

export function registerCompletion(host: FrameworkHost): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte'],
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position.line).text.slice(0, position.character)
        const m = /[\$\s.](?:t|tc|i18n\.t)\(\s*['"`]([\w./-]*)$/.exec(line)
        if (!m) return undefined
        const prefix = m[1] ?? ''
        const items: vscode.CompletionItem[] = []
        for (const key of host.loader.getKeys()) {
          if (!key.startsWith(prefix)) continue
          const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant)
          const value = host.loader.getValueByKey(key)
          if (value !== undefined) item.detail = value
          items.push(item)
        }
        return items
      }
    },
    "'", '"', '`', '.'
  )
}
