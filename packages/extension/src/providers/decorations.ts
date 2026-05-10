import * as vscode from 'vscode'
import type { FrameworkHost } from '@tingly/framework-contract'
import { KeyDetector } from '@tingly/core'
import { toTextDocumentLike, offsetRangeToVscode } from '../util/textDocumentLike'

/**
 * Optional in-place decoration mode (cursor-aware degrade preserved from
 * docs .../04 §4.1: when the caret enters the decorated range, fall back to
 * showing the original key so the user can edit it).
 */
export function registerDecorations(
  detector: KeyDetector,
  host: FrameworkHost
): vscode.Disposable {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: { color: new vscode.ThemeColor('editorCodeLens.foreground'), margin: '0 0 0 0.5em' }
  })
  const inplaceType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'none; display: none;'
  })

  const subs: vscode.Disposable[] = [decorationType, inplaceType]

  async function refresh(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) return
    const cfg = vscode.workspace.getConfiguration().get<string>('tingly.render.mode') ?? 'inlay'
    if (cfg !== 'inplace' && cfg !== 'both') {
      editor.setDecorations(decorationType, [])
      editor.setDecorations(inplaceType, [])
      return
    }
    const refs = await detector.detect(toTextDocumentLike(editor.document))
    const after: vscode.DecorationOptions[] = []
    const hide: vscode.DecorationOptions[] = []
    const cursor = editor.selection.active
    for (const ref of refs) {
      const r = offsetRangeToVscode(editor.document, ref.range)
      const value = host.loader.getValueByKey(ref.key)
      if (value === undefined) continue
      if (r.contains(cursor)) continue // cursor-aware degrade
      after.push({ range: r, renderOptions: { after: { contentText: ` → ${value}` } } })
      if (cfg === 'inplace') hide.push({ range: r })
    }
    editor.setDecorations(decorationType, after)
    editor.setDecorations(inplaceType, hide)
  }

  subs.push(
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument(e => {
      const ed = vscode.window.activeTextEditor
      if (ed && ed.document === e.document) void refresh(ed)
    }),
    vscode.window.onDidChangeTextEditorSelection(e => void refresh(e.textEditor))
  )
  void refresh(vscode.window.activeTextEditor)

  return vscode.Disposable.from(...subs)
}
