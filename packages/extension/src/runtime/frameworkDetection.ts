import * as vscode from 'vscode'
import * as path from 'node:path'
import type { Framework } from '@tingly/framework-contract'
import { resolveActiveFrameworks } from '@tingly/core'
import { GeneralFramework } from '@tingly/framework-general'
import type { Logger } from '../logger'

/**
 * Reads package.json files in each workspace folder, evaluates the
 * `framework.detection['package.json']` rule for each candidate, and uses
 * `resolveActiveFrameworks` (priority + compatibleWith) to pick the active set.
 *
 * v1 considers the four framework streams plus `general`. Real stream impls
 * register themselves through @tingly/framework-{react,vue,next-intl,svelte}
 * once their adapters land.
 */
export async function detectFrameworks(
  candidates: readonly Framework[],
  folders: readonly vscode.WorkspaceFolder[],
  logger: Logger
): Promise<readonly Framework[]> {
  const detected = new Set<Framework>()
  for (const folder of folders) {
    const pkgPath = path.join(folder.uri.fsPath, 'package.json')
    let pkg: Record<string, unknown> | undefined
    try {
      const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(pkgPath))
      pkg = JSON.parse(Buffer.from(buf).toString('utf8'))
    } catch { continue }
    const deps = collectDeps(pkg)
    for (const fw of candidates) {
      const rule = fw.detection['package.json']
      if (!rule) continue
      if (matches(rule, deps)) detected.add(fw)
    }
  }
  if (detected.size === 0) {
    logger.info('detectFrameworks: no real framework matched, using GeneralFramework')
    return [GeneralFramework]
  }
  const survivors = resolveActiveFrameworks([...detected])
  logger.info(`detectFrameworks: active = ${survivors.map(f => f.id).join(', ')}`)
  return survivors
}

function collectDeps(pkg: Record<string, unknown> | undefined): Set<string> {
  const set = new Set<string>()
  if (!pkg) return set
  for (const k of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const v = pkg[k]
    if (v && typeof v === 'object') {
      for (const dep of Object.keys(v as Record<string, unknown>)) set.add(dep)
    }
  }
  return set
}

function matches(
  rule: { any?: readonly string[]; every?: readonly string[]; none?: readonly string[] },
  deps: Set<string>
): boolean {
  if (rule.every && !rule.every.every(d => deps.has(d))) return false
  if (rule.any && !rule.any.some(d => deps.has(d))) return false
  if (rule.none && rule.none.some(d => deps.has(d))) return false
  return true
}
