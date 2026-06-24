import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import App from './App.jsx'

/* App 모듈이 깨끗이 평가되고(모든 import 해석) 첫 화면(로그인 게이트)이 렌더되는지 확인.
   분리 리팩토링 후 App.jsx의 import 정합성을 지키는 가드. */
describe('App 모듈 로드 스모크', () => {
  it('App이 throw 없이 렌더된다 (미인증 → 로그인 게이트)', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('VOICE')
  })

  it('인증 세션이 있으면 통합 홈(HomePortal)이 throw 없이 렌더된다', () => {
    // 세션을 stub → authEmail 채워짐 → 포털 홈(HomePortal) 경로 렌더 (App-잔존 대형 컴포넌트 검증)
    const store = { 'voc-action-copilot:session:v1': 'demo@lguplus.co.kr' }
    const prev = globalThis.localStorage
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: () => {}, removeItem: () => {},
    }
    try {
      expect(() => renderToStaticMarkup(<App />)).not.toThrow()
    } finally {
      globalThis.localStorage = prev
    }
  })
})
