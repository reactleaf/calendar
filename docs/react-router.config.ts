import type { Config } from '@react-router/dev/config'
import { createGetUrl, getSlugs } from 'fumadocs-core/source'
import fs, { glob } from 'node:fs/promises'
import path from 'node:path'
import { reactRouterBasename } from './gh-pages-base'

/** prerender 경로는 basename 없이(React Router가 파일 출력 시 basename을 붙임). */
const getUrl = createGetUrl('/docs')
const basename = reactRouterBasename()

/**
 * GitHub 프로젝트 Pages는 업로드 루트가 이미 `/:repo/`라 prerender 산출물이
 * `build/client/:repo/`에만 있으면 사이트 루트가 404가 된다.
 * RR에 디스크 경로와 URL basename을 분리하는 설정이 없어 `buildEnd`에서 한 단계 올린다.
 */
async function flattenClientSiteRoot(buildDirectory: string, routerBasename: string) {
  if (!routerBasename || routerBasename === '/') return
  const segment = routerBasename.replace(/\/$/, '').replace(/^\//, '')
  if (!segment || segment.includes('/')) return

  const clientDir = path.join(buildDirectory, 'client')
  const nested = path.join(clientDir, segment)
  let stat
  try {
    stat = await fs.stat(nested)
  } catch {
    return
  }
  if (!stat.isDirectory()) return

  for (const name of await fs.readdir(nested)) {
    await fs.rename(path.join(nested, name), path.join(clientDir, name))
  }
  await fs.rmdir(nested)
}

export default {
  ssr: false,
  ...(basename ? { basename } : {}),
  future: {
    v8_middleware: true,
  },
  async buildEnd({ reactRouterConfig }) {
    await flattenClientSiteRoot(reactRouterConfig.buildDirectory, reactRouterConfig.basename)
  },
  async prerender({ getStaticPaths }) {
    const paths: string[] = []
    const excluded: string[] = []

    for (const path of getStaticPaths()) {
      if (!excluded.includes(path)) paths.push(path)
    }

    for await (const entry of glob('**/*.mdx', { cwd: 'content/docs' })) {
      const slugs = getSlugs(entry)
      paths.push(getUrl(slugs), `/llms.mdx/docs/${[...slugs, 'content.md'].join('/')}`)
    }

    return paths
  },
} satisfies Config
