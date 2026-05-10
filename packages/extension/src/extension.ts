import * as vscode from 'vscode'
import { Container } from './container'
import { EventBus } from './eventBus'
import { Logger } from './logger'
import { registerDoctorCommand } from './commands/doctor'

let container: Container | undefined

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger('Tingly i18n')
  const eventBus = new EventBus()
  container = new Container()
  container.register('logger', logger)
  container.register('eventBus', eventBus)

  context.subscriptions.push(logger)
  context.subscriptions.push(eventBus)
  context.subscriptions.push(registerDoctorCommand(container))

  logger.info('Tingly i18n activated')
}

export function deactivate(): void {
  container?.dispose()
  container = undefined
}
