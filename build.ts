import esbuild from 'esbuild'

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/main.ts'],
  outdir: './dist',
  outExtension: {
    // 必須では無いが、ESM形式で出力されることを明示的にするため拡張子を.mjsにしている
    '.js': '.mjs'
  },
  platform: 'node',
  format: 'esm',
  banner: {
    js: 'import { createRequire } from "module"; import * as nodeUrl from "url"; const require = createRequire(import.meta.url); const __filename = nodeUrl.fileURLToPath(import.meta.url); const __dirname = nodeUrl.fileURLToPath(new URL(".", import.meta.url));'
  }
})
