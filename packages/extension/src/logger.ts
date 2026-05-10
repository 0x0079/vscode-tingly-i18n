import * as vscode from 'vscode'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger implements vscode.Disposable {
  private readonly channel: vscode.OutputChannel

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name)
  }

  debug(msg: string, ...args: unknown[]): void { this.write('debug', msg, args) }
  info(msg: string, ...args: unknown[]): void { this.write('info', msg, args) }
  warn(msg: string, ...args: unknown[]): void { this.write('warn', msg, args) }
  error(msg: string, ...args: unknown[]): void { this.write('error', msg, args) }

  private write(level: LogLevel, msg: string, args: unknown[]): void {
    const ts = new Date().toISOString()
    const tail = args.length > 0 ? ' ' + args.map(a => safeStringify(a)).join(' ') : ''
    this.channel.appendLine(`[${ts}] [${level}] ${msg}${tail}`)
  }

  show(): void { this.channel.show(true) }
  dispose(): void { this.channel.dispose() }
}

function safeStringify(v: unknown): string {
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return String(v) }
}
