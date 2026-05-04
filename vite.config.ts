import react from '@vitejs/plugin-react'
import path from 'node:path'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const external = ['react', 'react-dom', 'react/jsx-runtime', '@js-temporal/polyfill'] as const

const libBuild = {
  emptyOutDir: true,
  copyPublicDir: false,
  lib: {
    entry: path.resolve(__dirname, 'src/index.ts'),
    formats: ['es' as const, 'cjs' as const],
    fileName: (format: string) => (format === 'es' ? 'index.js' : 'index.cjs'),
    cssFileName: 'index',
  },
  rollupOptions: {
    external: [...external],
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.lib.json',
      outDirs: 'dist',
      bundleTypes: true,
    }),
  ],
  build: libBuild,
})
