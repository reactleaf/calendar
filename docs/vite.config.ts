import path from 'node:path'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import mdx from 'fumadocs-mdx/vite'
import { viteBasePath } from './gh-pages-base'
import * as MdxConfig from './source.config'

export default defineConfig({
  base: viteBasePath(),
  plugins: [mdx(MdxConfig), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    /** 루트 `pnpm build` 없이도 docs dev/build 가 소스에서 캘린더를 묶도록 */
    alias: {
      '@reactleaf/calendar': path.resolve(__dirname, '../src/index.ts'),
      '@reactleaf/calendar/index.css': path.resolve(__dirname, '../src/Calendar.css'),
    },
  },
})
