import * as vscode from 'vscode'
import type { Framework } from '@tingly/framework-contract'
import { Container } from './container'
import { EventBus } from './eventBus'
import { Logger } from './logger'
import { LocaleLoader, KeyDetector } from '@tingly/core'
import { GeneralFramework } from '@tingly/framework-general'
import { registerDoctorCommand } from './commands/doctor'
import {
  registerRebuildIndexCommand,
  registerExtractCommand,
  registerTranslateKeyCommand,
  registerRevealKeyCommand
} from './commands'
import { LocaleWatcher, type LocaleSourceLayout } from './runtime/localeWatcher'
import { detectFrameworks } from './runtime/frameworkDetection'
import { buildHost, vscodeConfigAdapter } from './host'
import { registerInlayHints } from './providers/inlayHints'
import { registerDecorations } from './providers/decorations'
import { registerHover } from './providers/hover'
import { registerCompletion } from './providers/completion'
import { registerDefinition } from './providers/definition'
import { registerReference } from './providers/reference'
import { registerDiagnostics } from './providers/diagnostics'
import { registerCodeActions } from './providers/codeActions'
import { registerStatusBar } from './providers/statusBar'
import { registerTreeViews } from './providers/treeViews/tree'

let container: Container | undefined

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger('Tingly i18n')
  const eventBus = new EventBus()
  container = new Container()
  container.register('logger', logger)
  container.register('eventBus', eventBus)
  context.subscriptions.push(logger, eventBus)

  const cfg = vscode.workspace.getConfiguration()
  if (!(cfg.get<boolean>('tingly.enabled', true))) {
    logger.info('disabled by tingly.enabled=false')
    return
  }

  // Layout: which dirs to scan + which path patterns to try.
  const layout: LocaleSourceLayout = {
    roots: cfg.get<string[]>('tingly.localesPaths') ?? ['locales', 'src/locales', 'public/locales'],
    patterns: cfg.get<string[]>('tingly.pathMatcher')
      ? [cfg.get<string>('tingly.pathMatcher')!]
      : ['{locale}.{ext}', '{locale}/{namespaces}.{ext}', '{namespaces}/{locale}.{ext}']
  }
  container.register('layout', layout)

  const loader = new LocaleLoader({
    displayLanguage: cfg.get<string>('tingly.displayLanguage') ?? 'en',
    sourceLanguage: cfg.get<string>('tingly.sourceLanguage') ?? 'en',
    namespaceMode: cfg.get<boolean>('tingly.namespace') ?? false
  })
  container.register('loader', loader)

  const folders = vscode.workspace.workspaceFolders ?? []
  const watchers: LocaleWatcher[] = []
  for (const folder of folders) {
    const w = new LocaleWatcher(loader, layout, folder, logger)
    await w.start()
    watchers.push(w)
    context.subscriptions.push(w)
  }
  container.register('localeWatcher', watchers[0] ?? new LocaleWatcher(loader, layout, folders[0]!, logger))

  // Active framework selection.
  const candidates: Framework[] = [GeneralFramework] // streams will register additional candidates here
  const active = await detectFrameworks(candidates, folders, logger)
  const framework = active[0] ?? GeneralFramework
  container.register('framework', framework)

  const host = buildHost({ loader, config: vscodeConfigAdapter(), logger })
  container.register('host', host)

  const detector = new KeyDetector(framework, host, {
    mode: (cfg.get<'ast-first' | 'regex-only'>('tingly.detection.mode') ?? 'ast-first')
  })
  container.register('detector', detector)

  // Commands.
  context.subscriptions.push(
    registerDoctorCommand(container),
    registerRebuildIndexCommand(container),
    registerExtractCommand(),
    registerTranslateKeyCommand(),
    registerRevealKeyCommand()
  )

  // Providers.
  context.subscriptions.push(
    registerInlayHints(detector, framework, host),
    registerDecorations(detector, host),
    registerHover(detector, host),
    registerCompletion(host),
    registerDefinition(detector, host),
    registerReference(detector),
    registerDiagnostics(detector, framework, host, context),
    registerCodeActions(framework),
    registerStatusBar(detector, framework, host),
    registerTreeViews(loader)
  )

  // Refresh detector cache on locale changes.
  loader.on('changed' as never, (() => detector.invalidate()) as never)

  logger.info(`Tingly i18n activated (framework=${framework.id}, locales=${loader.getKeys().length} keys)`)
}

export function deactivate(): void {
  container?.dispose()
  container = undefined
}
