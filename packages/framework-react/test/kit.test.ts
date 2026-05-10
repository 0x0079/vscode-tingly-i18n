import { runFrameworkTestKit } from '@tingly/test-kit'
import { ReactI18nextFramework } from '../src/index'

runFrameworkTestKit({
  framework: ReactI18nextFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' }
  ]
})
