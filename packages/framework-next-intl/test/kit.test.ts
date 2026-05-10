import { runFrameworkTestKit } from '@tingly/test-kit'
import { NextIntlFramework } from '../src/index'

runFrameworkTestKit({
  framework: NextIntlFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: 'messages/{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: 'messages/{locale}/{namespaces}.{ext}' }
  ]
})
