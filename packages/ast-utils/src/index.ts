export const AST_UTILS_VERSION = '1.0.0'

export { parseJs, clearParseCache } from './babelParser'
export type { ParsedJs, ParseInput } from './babelParser'

export { walkJs } from './babelTraverser'
export type { CallSite, JsxElementSite, TraverseHandlers } from './babelTraverser'

export { resolveTBinding } from './scopeBinding'

export { resolveMemberExpression } from './constantResolver'
export type { ConstantResolution } from './constantResolver'

export { expandTemplateLiteral } from './templateLiteral'
export type { TemplateExpansion } from './templateLiteral'

export { walkJsxAttributes } from './jsxAttribute'
export type { JsxAttrInfo } from './jsxAttribute'

export { extractScriptBlocks, translateRange } from './sfcScripts'
export type { ScriptBlock } from './sfcScripts'
