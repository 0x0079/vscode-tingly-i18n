import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { extension: 'src/extension.ts' },
  format: ['cjs'],
  outDir: 'dist',
  outExtension: () => ({ js: '.cjs' }),
  target: 'node20',
  platform: 'node',
  external: ['vscode'],
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  dts: false
})
