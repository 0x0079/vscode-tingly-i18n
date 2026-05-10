import * as vscode from 'vscode'
import type {
  FrameworkHost,
  ILoaderReadOnly,
  IConfigReadOnly,
  IParserAstService,
  IVueSfcService,
  ISvelteParserService,
  IHtmlParserService,
  IScopeBindingService,
  IConstantResolverService,
  ITemplateLiteralExpander,
  ILogger
} from '@tingly/framework-contract'
import type { Logger } from './logger'

/**
 * Builds a FrameworkHost backed by VS Code APIs and core services.
 *
 * Phase 2 ships stub implementations of the AST-related services
 * (parserAst/vueParser/svelteParser/scopeBinding/constResolver/templateExpander)
 * — real impls land with @tingly/ast-utils in the next commit. While stubs are
 * in place, framework adapters falling back to regex still work because
 * KeyDetector handles that path.
 */
export function buildHost(opts: {
  loader: ILoaderReadOnly
  config: IConfigReadOnly
  logger: Logger
}): FrameworkHost {
  return {
    loader: opts.loader,
    config: opts.config,
    parserAst: stubParserAst,
    vueParser: stubVueParser,
    svelteParser: stubSvelteParser,
    htmlParser: stubHtmlParser,
    scopeBinding: stubScopeBinding,
    constResolver: stubConstResolver,
    templateExpander: stubTemplateExpander,
    logger: opts.logger as ILogger
  }
}

const stubParserAst: IParserAstService = {
  parseJs: () => ({ ast: undefined, errors: [] })
}
const stubVueParser: IVueSfcService = {
  parseSfc: () => ({ i18nBlocks: [] })
}
const stubSvelteParser: ISvelteParserService = {
  parseSvelte: () => ({ html: undefined })
}
const stubHtmlParser: IHtmlParserService = {
  walk: () => undefined
}
const stubScopeBinding: IScopeBindingService = {
  resolveTBinding: () => ({ kind: 'dynamic' })
}
const stubConstResolver: IConstantResolverService = {
  resolve: () => ({ kind: 'dynamic' })
}
const stubTemplateExpander: ITemplateLiteralExpander = {
  expand: () => ({ staticPrefix: '', dynamicMiddle: false, staticSuffix: '' })
}

export function vscodeConfigAdapter(): IConfigReadOnly {
  return {
    get<T = unknown>(key: string, fallback?: T): T {
      const c = vscode.workspace.getConfiguration()
      const val = c.get<T>(key)
      return (val === undefined ? fallback : val) as T
    },
    get displayLanguage(): string {
      return vscode.workspace.getConfiguration().get<string>('tingly.displayLanguage') ?? 'en'
    },
    get sourceLanguage(): string {
      return vscode.workspace.getConfiguration().get<string>('tingly.sourceLanguage') ?? 'en'
    }
  }
}
