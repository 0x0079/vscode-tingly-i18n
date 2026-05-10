import { runFrameworkTestKit } from '@tingly/test-kit'
import { VueI18nFramework } from '../src/index'

runFrameworkTestKit({
  framework: VueI18nFramework,
  cases: [
    { kind: 'pathMatcher', name: 'file', dirStructure: 'file', expect: '{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dir', dirStructure: 'dir', expect: '{locale}/{namespaces}.{ext}' },
    {
      kind: 'analyze',
      name: 'TS file: $t("x") and t("y")',
      fixture: { files: { 'a.ts': `$t('home.title'); t('home.body')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' },
        { key: 'home.body', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'i18n.t() member call',
      fixture: { files: { 'a.ts': `i18n.t('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'Vue SFC <script setup> block extraction',
      fixture: {
        files: {
          'App.vue': `
<template>
  <p>{{ $t('home.title') }}</p>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const greeting = t('home.greeting')
</script>
`
        }
      },
      // Note: $t in <template> falls back to regex (not AST), so it's NOT in this expectation.
      // Only the <script setup> block's t('home.greeting') is detected via AST.
      expect: [
        { key: 'home.greeting', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'template literal: dynamic',
      fixture: { files: { 'a.ts': '$t(`home.${section}.title`)' } },
      expect: [
        { key: 'home.', isDynamic: true, staticPrefix: 'home.', source: 'js-template', via: 'ast' }
      ]
    }
  ]
})
