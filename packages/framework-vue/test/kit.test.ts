import { runFrameworkTestKit } from '@tingly/test-kit'
import { VueI18nFramework } from '../src/index'

runFrameworkTestKit({
  framework: VueI18nFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' }
  ]
})
