import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Vitest setup — 테스트 간 DOM / React tree 정리.
 *
 * `vitest.config.ts` 에 `globals: true` 를 주지 않았기 때문에 testing-library 의
 * 자동 afterEach cleanup 훅이 등록되지 않는다. 수동으로 cleanup 을 등록해
 * 이전 테스트의 `document.body` 잔여물이 다음 테스트의 쿼리(`getByLabelText` 등)를
 * 오염시키는 것을 막는다.
 */
afterEach(() => {
  cleanup()
})
