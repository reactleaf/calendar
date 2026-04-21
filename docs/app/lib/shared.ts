export const appName = 'React Router'

const base = import.meta.env.BASE_URL
const baseNoSlash = base.endsWith('/') ? base.slice(0, -1) : base

export const docsRoute = `${baseNoSlash}/docs`
export const docsImageRoute = `${baseNoSlash}/og/docs`
export const docsContentRoute = `${baseNoSlash}/llms.mdx/docs`

export const gitConfig = {
  user: 'reactleaf',
  repo: 'calendar',
  branch: 'main',
}
