import * as vscode from 'vscode'
import * as path from 'node:path'
import type { Container } from '../container'
import type { Logger } from '../logger'
import type { LocaleLoader } from '@tingly/core'
import { parsePathMatcher, dryRun } from '@tingly/core'
import type { LocaleSourceLayout } from '../runtime/localeWatcher'

export function registerDoctorCommand(container: Container): vscode.Disposable {
  return vscode.commands.registerCommand('tingly.doctor', async () => {
    const logger = container.resolve<Logger>('logger')
    const loader = container.resolve<LocaleLoader>('loader')
    const layout = container.resolve<LocaleSourceLayout>('layout')
    logger.show()
    logger.info('=== Tingly Doctor ===')
    logger.info(`Layout roots: ${layout.roots.join(', ') || '(none)'}`)
    logger.info(`Layout patterns: ${layout.patterns.join(', ')}`)

    const folders = vscode.workspace.workspaceFolders ?? []
    const candidates: string[] = []
    for (const folder of folders) {
      for (const root of layout.roots) {
        const uris = await vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, `${root}/**/*.{json,yml,yaml}`)
        )
        for (const uri of uris) {
          candidates.push(path.relative(path.join(folder.uri.fsPath, root), uri.fsPath).replace(/\\/g, '/'))
        }
      }
    }

    const matchers = layout.patterns.map(p => parsePathMatcher(p))
    const report = dryRun({ matchers, candidatePaths: candidates })
    logger.info(`Candidates: ${candidates.length}`)
    logger.info(`Matched:    ${report.matches.filter(m => m.matched).length}`)
    logger.info(`Unmatched:  ${report.unmatched.length}`)
    for (const u of report.unmatched.slice(0, 10)) logger.info(`  - ${u}`)
    logger.info(`Locales:    ${[...report.byLocale.keys()].join(', ') || '(none)'}`)
    logger.info(`Namespaces: ${[...report.byNamespace.keys()].join(', ') || '(none)'}`)
    logger.info(`Loaded keys: ${loader.getKeys().length}`)
  })
}
