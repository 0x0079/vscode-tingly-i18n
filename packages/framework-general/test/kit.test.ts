import { runFrameworkTestKit } from '@tingly/test-kit'
import type { FrameworkTestKit } from '@tingly/test-kit'
import { GeneralFramework } from '../src/GeneralFramework'

const kit: FrameworkTestKit = {
  framework: GeneralFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' },
    {
      kind: 'analyze',
      name: 'returns empty (regex-only framework)',
      fixture: { files: { 'sample.ts': 't("home.title")' } },
      expect: []
    }
  ]
}

runFrameworkTestKit(kit)
