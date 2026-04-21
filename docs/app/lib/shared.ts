export const appName = 'React Router'

const base = import.meta.env.BASE_URL
const baseNoSlash = base.endsWith('/') ? base.slice(0, -1) : base

/** `<Link to>`·Fumadocs `baseUrl` — React Router `basename` 아래 경로만 (BASE_URL 중복 금지). */
export const docsPath = '/docs'

/** 브라우저·OG 등 deploy base를 포함한 경로 */
export const docsImageRoute = `${baseNoSlash}/og/docs`
export const docsContentRoute = `${baseNoSlash}/llms.mdx/docs`

export const gitConfig = {
  user: 'reactleaf',
  repo: 'calendar',
  branch: 'main',
}
