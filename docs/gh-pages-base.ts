/**
 * GitHub project Pages: `https://{owner}.github.io/{repo}/`
 * CI에서 `GITHUB_PAGES_BASE`를 `/${{ github.event.repository.name }}/` 형태로 넘깁니다 (끝 슬래시 포함).
 * 로컬 개발: 미설정 → 루트 `/`.
 */
export function viteBasePath(): string {
  const b = process.env.GITHUB_PAGES_BASE?.trim()
  if (!b || b === '/') return '/'
  return b.endsWith('/') ? b : `${b}/`
}

/** React Router `basename` (끝 슬래시 없음). 루트 배포일 때는 생략 가능하도록 `undefined`. */
export function reactRouterBasename(): string | undefined {
  const v = viteBasePath()
  if (v === '/') return undefined
  return v.replace(/\/$/, '')
}
