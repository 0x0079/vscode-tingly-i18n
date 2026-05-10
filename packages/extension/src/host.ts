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
import { parseJs as astParseJs } from '@tingly/ast-utils'
import type { Logger } from './logger'

/**
 * Builds a FrameworkHost backed by VS Code APIs and core services.
 *
 * - parserAst now delegates to @tingly/ast-utils (shared LRU cache across the
 *   process). Streams call parseJs directly today, but the port is wired so a
 *   future framework can use host.parserAst without a separate cache layer.
 * - vueParser/svelteParser/htmlParser remain stubs in v1; SFC <script>
 *   extraction lives in ast-utils.extractScriptBlocks and is consumed directly
 *   by Stream V and Stream S. Adding @vue/compiler-sfc / svelte/compiler is
 *   tracked for a future release.
 */
export function buildHost(opts: {
  loader: ILoaderReadOnly
  config: IConfigReadOnly
  logger: Logger
}): FrameworkHost {
  return {
    loader: opts.loader,
    config: opts.config,
    parserAst: realParserAst,
    vueParser: stubVueParser,
    svelteParser: stubSvelteParser,
    htmlParser: stubHtmlParser,
    scopeBinding: stubScopeBinding,
    constResolver: stubConstResolver,
    templateExpander: stubTemplateExpander,
    logger: opts.logger as ILogger
  }
}

const realParserAst: IParserAstService = {
  parseJs(doc) {
    const parsed = astParseJs({
      uri: doc.uri,
      source: doc.getText(),
      version: doc.version,
      languageId: doc.languageId
    })
    return { ast: parsed.ast, errors: parsed.errors }
  }
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
