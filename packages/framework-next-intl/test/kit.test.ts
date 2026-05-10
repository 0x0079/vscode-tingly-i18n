import { runFrameworkTestKit } from '@tingly/test-kit'
import { NextIntlFramework } from '../src/index'

runFrameworkTestKit({
  framework: NextIntlFramework,
  cases: [
    { kind: 'pathMatcher', name: 'dirStructure=file', dirStructure: 'file', expect: 'messages/{locale}.{ext}' },
    { kind: 'pathMatcher', name: 'dirStructure=dir', dirStructure: 'dir', expect: 'messages/{locale}/{namespaces}.{ext}' },
    {
      kind: 'analyze',
      name: 'useTranslations("Home") -> keyPrefix on each t() call',
      fixture: {
        files: {
          'a.tsx': `
import { useTranslations } from 'next-intl'
export default function Page() {
  const t = useTranslations('Home')
  return t('title')
}`
        }
      },
      expect: [
        { key: 'title', isDynamic: false, keyPrefix: 'Home', source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 't.rich() with keyPrefix',
      fixture: {
        files: {
          'a.tsx': `
import { useTranslations } from 'next-intl'
export default function Page() {
  const t = useTranslations('Home')
  return t.rich('intro', {})
}`
        }
      },
      expect: [
        { key: 'intro', isDynamic: false, keyPrefix: 'Home', source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'no useTranslations scope -> no keyPrefix',
      fixture: { files: { 'a.ts': `t('home.title')` } },
      expect: [
        { key: 'home.title', isDynamic: false, source: 'js-call', via: 'ast' }
      ]
    },
    {
      kind: 'analyze',
      name: 'getTranslations server-side',
      fixture: {
        files: {
          'page.ts': `
import { getTranslations } from 'next-intl/server'
export default async function Page() {
  const t = await getTranslations('Auth')
  return t('signin.button')
}`
        }
      },
      expect: [
        { key: 'signin.button', isDynamic: false, keyPrefix: 'Auth', source: 'js-call', via: 'ast' }
      ]
    }
  ]
})
