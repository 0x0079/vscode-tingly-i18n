import * as vscode from 'vscode'
import type { Container } from '../container'
import type { Logger } from '../logger'

export function registerDoctorCommand(container: Container): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.doctor', async () => {
    const logger = container.resolve<Logger>('logger')
    logger.show()
    logger.info('Doctor: workspace skeleton OK')
    logger.info('Doctor: phase=0 (bootstrap). LocaleLoader, PathMatcher diagnostics arrive in Phase 1.')
    void vscode.window.showInformationMessage('Tingly: Doctor ran. See output channel for details.')
  })
}
