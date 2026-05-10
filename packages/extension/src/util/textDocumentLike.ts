import * as vscode from 'vscode'
import type { TextDocumentLike } from '@tingly/framework-contract'

export function toTextDocumentLike(doc: vscode.TextDocument): TextDocumentLike {
  return {
    uri: doc.uri.toString(),
    languageId: doc.languageId,
    version: doc.version,
    getText: () => doc.getText()
  }
}

export function offsetRangeToVscode(
  doc: vscode.TextDocument,
  range: { start: number; end: number }
): vscode.Range {
  return new vscode.Range(doc.positionAt(range.start), doc.positionAt(range.end))
}
