import { runFrameworkTestKit } from '@tingly/test-kit'
import { ReactI18nextFramework } from '../src/index'

runFrameworkTestKit({
  framework: ReactI18nextFramework,
  cases: [
    {
      kind: 'pathMatcher',
      name: 'dirStructure=file',
      dirStructure: 'file',
      expect: '{locale}.{ext}'
    },
    {
      kind: 'pathMatcher',
      name: 'dirStructure=dir',
      dirStructure: 'dir',
      expect: '{locale}/{namespaces}.{ext}'
    },
    {
      kind: 'analyze',
      name: 'plain t("x")',
      fixture: { files: { 'a.ts': `t('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'useTranslation namespace binding',
      fixture: {
        files: {
          'a.tsx': `
import { useTranslation } from 'react-i18next'
export function Page() {
  const { t } = useTranslation('common')
  return t('home.title')
}`
        }
      },
      expect: [
        { key: 'home.title', isDynamic: false, namespace: 'common', source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'KEYS.x.y member access resolves statically',
      fixture: {
        files: {
          'a.ts': `
const KEYS = { home: { title: 'home.title' } }
t(KEYS.home.title)`
        }
      },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-member', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'template literal: dynamic middle gets staticPrefix',
      fixture: { files: { 'a.ts': 't(`home.${section}.title`)' } },
      expect: [
        { key: 'home.', isDynamic: true, staticPrefix: 'home.', source: 'js-template', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'static-only template literal',
      fixture: { files: { 'a.ts': 't(`home.title`)' } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-template', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'i18n.t() member call',
      fixture: { files: { 'a.ts': `import i18n from 'i18next'; i18n.t('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: '<Trans i18nKey="..." />',
      fixture: { files: { 'a.tsx': `const x = <Trans i18nKey="home.cta" />` } },
      expect: [
        { key: 'home.cta', isDynamic: false, source: 'jsx-attribute', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: '<Trans i18nKey={KEYS.x}> resolves statically',
      fixture: {
        files: {
          'a.tsx': `
const KEYS = { x: 'home.cta' }
const y = <Trans i18nKey={KEYS.x} />`
        }
      },
      expect: [
        { key: 'home.cta', isDynamic: false, source: 'jsx-attribute', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'unresolvable identifier -> isDynamic',
      fixture: { files: { 'a.ts': `t(someVar)` } },
      expect: [
        { key: '', isDynamic: true, source: 'js-call', via: 'ast' }
      ]
    }
  ]
})
