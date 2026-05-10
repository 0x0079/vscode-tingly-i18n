import { runFrameworkTestKit } from '@tingly/test-kit'
import { SvelteI18nFramework } from '../src/index'

runFrameworkTestKit({
  framework: SvelteI18nFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' }
  ]
})
