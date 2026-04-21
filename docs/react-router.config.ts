import type { Config } from '@react-router/dev/config'
import { glob } from 'node:fs/promises'
import { createGetUrl, getSlugs } from 'fumadocs-core/source'
import { reactRouterBasename } from './gh-pages-base'

/** prerender 경로는 basename 없이(React Router가 파일 출력 시 basename을 붙임). */
const getUrl = createGetUrl('/docs')
const basename = reactRouterBasename()

export default {
  ssr: false,
  ...(basename ? { basename } : {}),
  future: {
    v8_middleware: true,
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
