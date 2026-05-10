import * as vscode from 'vscode'
import type { FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

export function registerHover(detector: KeyDetector, host: FrameworkHost): vscode.Disposable {
  return vscode.languages.registerHoverProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'vue', 'svelte', 'html'],
    {
      async provideHover(document, position) {
        const refs = await detector.detect(toTextDocumentLike(document))
        for (const ref of refs) {
          const r = offsetRangeToVscode(document, ref.range)
          if (!r.contains(position)) continue
          const md = new vscode.MarkdownString()
          md.isTrusted = true
          md.supportThemeIcons = true
          md.appendMarkdown(`**\`${ref.key}\`**${ref.isDynamic ? ' _(dynamic)_' : ''} · \`${ref.via}\`\n\n`)
          const keys = host.loader.getKeys(
            ref.namespace !== undefined ? { namespace: ref.namespace } : undefined
          )
          if (!keys.includes(ref.key)) {
            md.appendMarkdown(`> Missing key. [Quick fix](command:tingly.translate.key?${encodeURIComponent(JSON.stringify({ key: ref.key }))})`)
            return new vscode.Hover(md, r)
          }
          md.appendMarkdown('| Locale | Value |\n| --- | --- |\n')
          for (const locale of guessLocales(host)) {
            const v = host.loader.getValueByKey(ref.key, {
              locale,
              ...(ref.namespace !== undefined ? { namespace: ref.namespace } : {})
            })
            md.appendMarkdown(`| \`${locale}\` | ${v ?? '_—_'} |\n`)
          }
          return new vscode.Hover(md, r)
        }
        return undefined
      }
    }
  )
}

function guessLocales(host: FrameworkHost): readonly string[] {
  const set = new Set<string>([host.config.displayLanguage, host.config.sourceLanguage])
  return [...set]
}
