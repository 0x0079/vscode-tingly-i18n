import * as vscode from 'vscode'
import * as path from 'node:path'
import { JsonParser, YamlParser, parsePathMatcher, registerParser, getParserForExt, type LocaleLoader } from '@tingly/core'
import type { Logger } from '../logger'

// Idempotent parser registration.
let registered = false
function ensureParsers(): void {
  if (registered) return
  try { registerParser(JsonParser) } catch { /* already registered — ignore */ }
  try { registerParser(YamlParser) } catch { /* ignore */ }
  registered = true
}

export interface LocaleSourceLayout {
  /** Workspace-relative roots to scan, e.g. ['locales', 'src/locales']. */
  roots: readonly string[]
  patterns: readonly string[]
}

export class LocaleWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = []

  constructor(
    private readonly loader: LocaleLoader,
    private readonly layout: LocaleSourceLayout,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
    private readonly logger: Logger
  ) {
    ensureParsers()
  }

  async start(): Promise<void> {
    await this.scanInitial()
    for (const root of this.layout.roots) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.workspaceFolder, `${root}/**/*.{json,yml,yaml}`)
      )
      this.disposables.push(
        watcher,
        watcher.onDidChange(uri => this.onChange(uri)),
        watcher.onDidCreate(uri => this.onChange(uri)),
        watcher.onDidDelete(uri => this.onDelete(uri))
      )
    }
  }

  private async scanInitial(): Promise<void> {
    for (const root of this.layout.roots) {
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(this.workspaceFolder, `${root}/**/*.{json,yml,yaml}`)
      )
      for (const uri of uris) await this.onChange(uri)
    }
  }

  private async onChange(uri: vscode.Uri): Promise<void> {
    const filepath = uri.fsPath
    const ext = path.extname(filepath).toLowerCase()
    const parser = getParserForExt(ext)
    if (!parser) return
    const matched = this.matchPath(filepath)
    if (!matched) return
    try {
      const buf = await vscode.workspace.fs.readFile(uri)
      const source = Buffer.from(buf).toString('utf8')
      const parsed = parser.parse(source, {
        filepath,
        locale: matched.locale,
        ...(matched.namespace !== undefined ? { namespace: matched.namespace } : {})
      })
      this.loader.evictByFilepath(filepath)
      this.loader.ingest(parsed)
    } catch (e) {
      this.logger.warn(`LocaleWatcher: failed to ingest ${filepath}`, e)
    }
  }

  private onDelete(uri: vscode.Uri): void {
    this.loader.evictByFilepath(uri.fsPath)
  }

  private matchPath(filepath: string): { locale: string; namespace?: string } | undefined {
    const rel = path.relative(this.workspaceFolder.uri.fsPath, filepath).replace(/\\/g, '/')
    for (const root of this.layout.roots) {
      if (!rel.startsWith(root + '/')) continue
      const inner = rel.slice(root.length + 1)
      for (const pattern of this.layout.patterns) {
        const matcher = parsePathMatcher(pattern)
        const m = matcher.match(inner)
        if (m && m.locale) {
          return m.namespaces !== undefined
            ? { locale: m.locale, namespace: m.namespaces }
            : { locale: m.locale }
        }
      }
    }
    return undefined
  }

  dispose(): void {
    for (const d of this.disposables) try { d.dispose() } catch { /* ignore */ }
    this.disposables.length = 0
  }
}
