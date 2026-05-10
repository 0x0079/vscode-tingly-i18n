import * as vscode from 'vscode'
import type { Container } from '../container'
import type { LocaleWatcher } from '../runtime/localeWatcher'
import type { KeyDetector } from '@tingly/core'

export function registerRebuildIndexCommand(container: Container): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.rebuildIndex', async () => {
    const watcher = container.resolve<LocaleWatcher>('localeWatcher')
    const detector = container.resolve<KeyDetector>('detector')
    detector.invalidate()
    await watcher.start()
    void vscode.window.showInformationMessage('Tingly: index rebuilt.')
  })
}

export function registerExtractCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.extract', async (arg: { text?: string; uri?: string }) => {
    void vscode.window.showInformationMessage(
      `Tingly extract is wired (text="${arg?.text ?? ''}"). Full UX lands with the framework adapters.`
    )
  })
}

export function registerTranslateKeyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.translate.key', async (arg: { key?: string }) => {
    void vscode.window.showInformationMessage(
      `Tingly translate is wired (key="${arg?.key ?? ''}"). Engine plumbing lands in Phase 3.`
    )
  })
}

export function registerRevealKeyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.revealKey', async (arg: { keypath?: string }) => {
    if (!arg?.keypath) return
    void vscode.window.showInformationMessage(`Tingly: ${arg.keypath}`)
  })
}
