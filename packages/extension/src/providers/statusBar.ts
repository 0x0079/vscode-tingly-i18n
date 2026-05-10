import * as vscode from 'vscode'
import type { Framework, FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike } from '../util/textDocumentLike'

/**
 * Status bar item: "🇨🇳 zh-CN · N missing · ⚠ M hard"
 * (preserves the explicit pattern from docs .../08 §2.5).
 */
export function registerStatusBar(
  detector: KeyDetector,
  framework: Framework,
  host: FrameworkHost
): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95)
  item.command = 'tingly.statusBar.action'
  item.show()

  async function refresh(): Promise<void> {
    const ed = vscode.window.activeTextEditor
    if (!ed) {
      item.text = `$(globe) ${flag(host.config.displayLanguage)} ${host.config.displayLanguage}`
      item.tooltip = 'Tingly i18n: no active editor'
      return
    }
    const refs = await detector.detect(toTextDocumentLike(ed.document))
    const known = new Set(host.loader.getKeys())
    const missing = refs.filter(r => !r.isDynamic && !known.has(r.key)).length
    const hard = framework.detectHardStrings(toTextDocumentLike(ed.document), host)?.length ?? 0
    item.text = `${flag(host.config.displayLanguage)} ${host.config.displayLanguage} · ${missing} missing · ⚠ ${hard} hard`
    item.tooltip = `Tingly: ${framework.display}`
    item.backgroundColor =
      missing > 0 ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined
  }

  const subs = [
    item,
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument(refresh),
    vscode.commands.registerCommand('tingly.statusBar.action', () => {
      void vscode.commands.executeCommand('tingly.doctor')
    })
  ]
  void refresh()
  return vscode.Disposable.from(...subs)
}

function flag(locale: string): string {
  const region = locale.split('-')[1]?.toUpperCase()
  if (!region || region.length !== 2) return '🌐'
  const A = 0x1F1E6
  return String.fromCodePoint(A + (region.charCodeAt(0) - 65), A + (region.charCodeAt(1) - 65))
}
