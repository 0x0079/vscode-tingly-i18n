import * as vscode from 'vscode'
import type { LocaleLoader } from '@tingly/core'
import type { LocaleTreeBranch, LocaleTreeNode } from '@tingly/core'

class TreeNodeItem extends vscode.TreeItem {
  constructor(public readonly node: LocaleTreeNode, public readonly host: { loader: LocaleLoader }) {
    super(node.keypath || '<root>')
    this.contextValue = node.type
    if (node.type === 'leaf') {
      const v = host.loader.getValueByKey(node.keypath)
      this.description = v ?? '—'
      this.iconPath = new vscode.ThemeIcon('symbol-string')
      this.collapsibleState = vscode.TreeItemCollapsibleState.None
      this.command = {
        command: 'tingly.revealKey',
        title: 'Reveal key',
        arguments: [{ keypath: node.keypath }]
      }
    } else {
      this.iconPath = new vscode.ThemeIcon('symbol-namespace')
      this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
    }
  }
}

export function registerTreeViews(loader: LocaleLoader): vscode.Disposable {
  const treeProvider: vscode.TreeDataProvider<TreeNodeItem> = {
    getTreeItem: x => x,
    getChildren(element) {
      const root: LocaleTreeBranch | undefined = loader.getTree()?.root
      if (!root) return []
      const branch = element ? element.node : root
      if (branch.type !== 'branch') return []
      return [...branch.children.values()].map(child => new TreeNodeItem(child, { loader }))
    }
  }
  const tree = vscode.window.createTreeView('tingly.tree', { treeDataProvider: treeProvider })
  return tree
}
