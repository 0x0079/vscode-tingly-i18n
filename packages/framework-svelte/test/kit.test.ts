import { runFrameworkTestKit } from '@tingly/test-kit'
import { SvelteI18nFramework } from '../src/index'

runFrameworkTestKit({
  framework: SvelteI18nFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' },
    {
      kind: 'analyze',
      name: 'svelte-i18n: $_("key")',
      fixture: { files: { 'a.ts': `$_('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'svelte-i18n: $t("key")',
      fixture: { files: { 'a.ts': `$t('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'paraglide: m.home_title() function name maps to keypath',
      fixture: {
        files: {
          'a.ts': `
import * as m from './paraglide/messages'
m.home_title()`
        }
      },
      expect: [
        { key: 'home_title', isDynamic: false, source: 'js-member', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'svelte SFC <script>',
      fixture: {
        files: {
          'App.svelte': `
<script lang="ts">
  import { _ } from 'svelte-i18n'
  let label = $_('home.cta')
</script>
<button>{label}</button>
`
        }
      },
      expect: [
        { key: 'home.cta', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'paraglide template literal in argument is dynamic (function-name lookup only)',
      fixture: {
        files: {
          'a.ts': `
import * as m from './paraglide/messages'
const k = 'foo'
m.home_title()`
        }
      },
      expect: [
        { key: 'home_title', isDynamic: false, source: 'js-member', via: 'ast' }
      ]
    }
  ]
})
