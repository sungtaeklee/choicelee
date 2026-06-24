import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { enrichRow } from '../classify.js'
import VOCTrends from './VOCTrends.jsx'
import VOCInbox from './VOCInbox.jsx'
import CaseDetail from './CaseDetail.jsx'
import InsightReport from './InsightReport.jsx'

/* ============================================================
   화면 컴포넌트 렌더 스모크 — 분리 후 누락된 import가 없는지 확인.
   renderToStaticMarkup은 undefined 컴포넌트/식별자를 만나면 throw하므로,
   파일이 정상 렌더되면 import 누락이 없다는 강한 증거가 된다.
   ============================================================ */

const mockCase = enrichRow({ channel: 'Call', content: '로그인이 자꾸 풀리고 앱이 튕겨요. 재설치해도 똑같아요.', customer: '010-1234-5678', date: '2026.3.1', week: '03월1주차' }, 'VOC-1')
mockCase.activity = [
  { t: '2026-06-01T00:00:00.000Z', who: 'a@x', kind: 'status', text: '진행상황: 신규 → 처리 중' },
  { t: '2026-06-02T00:00:00.000Z', who: 'a@x', kind: 'comment', text: '담당 확인 중' },
  { t: '2026-06-03T00:00:00.000Z', who: 'a@x', kind: 'send', text: '문자 발송 → 고객' },
]
const data = [mockCase]
const noop = () => {}
const notify = { toast: noop, modal: noop }

const render = (el) => expect(() => renderToStaticMarkup(el)).not.toThrow()

describe('화면 렌더 스모크 — 데이터 있음', () => {
  it('VOCTrends', () => render(<VOCTrends added={data} openCase={noop} />))
  it('InsightReport', () => render(<InsightReport added={data} openCase={noop} updateCases={noop} notify={notify} addSent={noop} />))
  it('VOCInbox', () => render(<VOCInbox openCase={noop} notify={notify} added={data} setAdded={noop} shared={false} sharedInsert={noop} />))
  it('CaseDetail', () => render(<CaseDetail caseId="VOC-1" notify={notify} added={data} updateCases={noop} bulkPatch={noop} addSent={noop} addComment={noop} sentLog={[]} account="a@x" openCase={noop} />))
})

describe('화면 렌더 스모크 — 빈 데이터(엠프티 스테이트)', () => {
  it('VOCTrends empty', () => render(<VOCTrends added={[]} openCase={noop} />))
  it('InsightReport empty', () => render(<InsightReport added={[]} openCase={noop} />))
  it('VOCInbox empty', () => render(<VOCInbox openCase={noop} notify={notify} added={[]} setAdded={noop} shared={false} sharedInsert={noop} />))
  it('CaseDetail empty', () => render(<CaseDetail caseId="X" notify={notify} added={[]} updateCases={noop} addSent={noop} openCase={noop} />))
})
