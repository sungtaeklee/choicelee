import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { enrichRow } from './classify.js'

import IconRail from './shell/IconRail.jsx'
import SubLNB from './shell/SubLNB.jsx'
import Topbar from './shell/Topbar.jsx'
import AgentPanel from './shell/AgentPanel.jsx'
import ClassificationBoard from './screens/ClassificationBoard.jsx'
import ImportResult from './screens/ImportResult.jsx'
import SelfGuide from './screens/SelfGuide.jsx'
import Backlog from './screens/Backlog.jsx'
import HomePortal from './screens/HomePortal.jsx'
import AllMenu from './screens/Solution.jsx'
import MailApp from './portal/MailApp.jsx'
import CalendarApp from './portal/CalendarApp.jsx'
import OrgApp from './portal/OrgApp.jsx'
import ApprovalApp from './portal/ApprovalApp.jsx'
import Login from './Login.jsx'
import AutoDemo from './AutoDemo.jsx'

/* 분리한 모든 컴포넌트의 렌더 스모크 — 누락된 import가 있으면 throw한다. */
const mockCase = enrichRow({ channel: 'Call', content: '로그인이 자꾸 풀려요. 재설치해도 똑같아요.', customer: '010-1234-5678', week: '03월1주차' }, 'VOC-1')
const data = [mockCase]
const noop = () => {}
const notify = { toast: noop, modal: noop }
const render = (el) => expect(() => renderToStaticMarkup(el)).not.toThrow()

describe('셸 컴포넌트', () => {
  it('IconRail', () => render(<IconRail account="demo@x" onLogout={noop} notify={notify} railView="agent" setRail={noop} />))
  it('SubLNB', () => render(<SubLNB screen="inbox" setScreen={noop} />))
  it('Topbar', () => render(<Topbar title="t" mode="split" setMode={noop} agentTitle="a" shareState="local" sharedEnabled={false} onShareTools={noop} />))
  it('AgentPanel', () => render(<AgentPanel screen="detail" caseId="VOC-1" added={data} notify={notify} updateCases={noop} selected={[]} setSelected={noop} openCase={noop} />))
})

describe('화면 컴포넌트', () => {
  it('ClassificationBoard', () => render(<ClassificationBoard openCase={noop} notify={notify} added={data} updateCases={noop} />))
  it('ImportResult', () => render(<ImportResult notify={notify} added={data} setAdded={noop} shared={false} sharedInsert={noop} openCase={noop} />))
  it('SelfGuide', () => render(<SelfGuide added={data} notify={notify} />))
  it('Backlog', () => render(<Backlog added={data} openCase={noop} />))
  it('HomePortal', () => render(<HomePortal account="demo@x" added={data} goAgent={noop} setRail={noop} openCase={noop} notify={notify} aiMode={false} setAiMode={noop} />))
})

describe('솔루션 문서 (AllMenu → Architecture/PromptTemplates/Phase2)', () => {
  for (const doc of ['architecture', 'prompts', 'phase2']) {
    it(`AllMenu doc=${doc}`, () => render(<AllMenu goAgent={noop} setRail={noop} notify={notify} doc={doc} setDoc={noop} />))
  }
})

describe('포털 앱', () => {
  it('MailApp', () => render(<MailApp sentLog={[]} notify={notify} />))
  it('CalendarApp', () => render(<CalendarApp />))
  it('OrgApp', () => render(<OrgApp notify={notify} />))
  it('ApprovalApp', () => render(<ApprovalApp notify={notify} />))
})

describe('인증 · 자동시연', () => {
  it('Login', () => render(<Login onAuthed={noop} />))
  it('AutoDemo', () => render(<AutoDemo nav={noop} hasData={true} sampleId="VOC-1" onClose={noop} />))
})
