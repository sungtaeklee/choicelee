import React, { useState, useMemo, useEffect, useRef } from 'react'
import { sharedEnabled, listAll, listSince, insertMany, clearAll } from './shared.js'
import {
  GROUPS, GROUP_MODE, FIXED_DEPTH2, AREA_TREE, AREA1_LIST, OWNER_BY_AREA, CAT22, GROUP_CLS, norm, FAULT_KW, PERF_KW, IMPROVE_KW, CAT_KW, PRIORITY_RULES, TRANSCRIPT_SPEAKERS, parseTranscript, customerIssueText, demoClassify, pickFixedCat, pick22, deriveSeverity, deriveSentiment, extractKey, deriveAction, PRE_DONE, actionNeeded, aiSummarize, coreIssue, FILLER_LEAD, cleanClause, ISSUE_KW, smartSummary, AREA_BY_CAT, catToArea, ownerForArea, devNeeded, CAT_GUIDE, guideFor, draftCustomerMsg, draftSms, detectedSignals, severityReason, buildAnalysis, maskPII, KNOWN_CHANNELS, cleanChannel, PASTE_HEADERS, PASTE_POS, parseGrid, parsePaste, enrichRow, weekKey, toDay, recDay,
} from './classify.js'
import { hydrate, toCompact, loadAdded, saveAdded, loadSent, saveSent } from './storage.js'
import { AI_URL, AI_AUTO, aiCacheGet, aiCacheSet, analyzeCaseAI } from './ai.js'
import {
  SEVERITY, SENTIMENT, STATUS, CONF, KANBAN_COLS, COMBO_COLORS, DONUT_COLORS, RAIL_ICONS, VOCS, EFFECTS,
  ChannelIcon, SevBadge, SentBadge, StatBadge, ConfBadge, GroupBadge, Tag, ChannelChip, RailIcon,
  Toast, Modal, PageHead, ShareBadge, DemoBanner, Chev, CardHead, AiBox,
  Donut, Bar, DashKpi, buildPivot, PivotView, MultiLine, Transcript,
} from './ui.jsx'
import VOCTrends from './screens/VOCTrends.jsx'
import VOCInbox from './screens/VOCInbox.jsx'
import CaseDetail from './screens/CaseDetail.jsx'
import InsightReport from './screens/InsightReport.jsx'

/* ============================================================
   U+ VOICE · VOC Action Copilot — 공모전 MVP (정적 프로토타입 · React)
   VOC Orchestration & Insight-driven CX Engine
   채널 수집 + 화면 직접 입력. 샘플은 하드코딩(입력분은 useState).
   분류표: depth1 4그룹(정형 3 + 열림 1) + 열림 그룹의 표준분류 22개.
   ============================================================ */

/* ---------- 사내 전용 접근 (데모 게이트) ----------
   ⚠ 백엔드가 없으므로 이건 시연용 게이트다. 진짜 접근 제어가 아니다(소스/스토리지로 우회 가능).
   실배포 시에는 사내 SSO 연동 또는 사내망/VPN 한정 배포가 필요하다.
   아래 두 상수를 실제 값으로 교체하세요. */
const COMPANY_DOMAINS = ['lguplus.co.kr'] // 가입 허용 회사 이메일 도메인 (여러 개 가능)
const COMPANY_CODE = 'UPLUS-CX-2026'      // 사내에 공유하는 가입 인증 코드(임시값 · 교체 권장)
const ACC_KEY = 'voc-action-copilot:accounts:v1'
const SESS_KEY = 'voc-action-copilot:session:v1'
async function hashPw(pw, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function loadAccounts() { try { return JSON.parse(localStorage.getItem(ACC_KEY)) || [] } catch { return [] } }
function saveAccounts(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)) } catch { /* noop */ } }
function isCompanyEmail(email) {
  const m = /^[^@\s]+@([^@\s]+)$/.exec(String(email).trim().toLowerCase())
  return !!m && COMPANY_DOMAINS.includes(m[1])
}
function getSession() { try { return localStorage.getItem(SESS_KEY) || '' } catch { return '' } }
function setSession(email) { try { email ? localStorage.setItem(SESS_KEY, email) : localStorage.removeItem(SESS_KEY) } catch { /* noop */ } }

function IconRail({ account, onLogout, notify, railView, setRail }) {
  const items = [['home', '홈'], ['grid', '솔루션 설명'], ['agent', 'Agent'], ['mail', '메일'], ['org', '조직도']]
  return (
    <nav className="rail">
      <div className="rail-top">
        {items.map(([k, l]) => <button key={k} className={'rail-ic' + (railView === k ? ' on' : '')} title={k === 'agent' ? 'VOC Agent' : l} onClick={() => setRail(k)}><RailIcon d={RAIL_ICONS[k === 'agent' ? 'chat' : k]} /><span>{l}</span></button>)}
      </div>
      <div className="rail-bot">
        <div className="rail-ai">AI</div>
        <button className="rail-ic" title="알림 · 데모" onClick={() => notify.toast('알림 (데모)')}><RailIcon d={RAIL_ICONS.bell} /></button>
        <button className="rail-avatar" title={`${account} · 클릭하면 로그아웃`} onClick={onLogout}>{(account || 'U')[0].toUpperCase()}</button>
      </div>
    </nav>
  )
}
/* ---------- [연동] 사내 에이전트 JSON 붙여넣기 → 카드 렌더링 (LLM 호출 없음) ---------- */
function parsePastedJSON(text) {
  if (!text || !text.trim()) return { error: '붙여넣은 내용이 없습니다.' }
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return { data: JSON.parse(s) } }
  catch { return { error: 'JSON을 읽지 못했습니다. 앞뒤 설명 문장·코드펜스를 빼고 { … } 객체만 붙여넣어 주세요.' } }
}
const IMP_SAMPLE = {
  voc: '앱 로그인 시 인증문자 요청 후 계속 실패하고, 재시도해도 안 됩니다.',
  classification: { group: '장애/오류', category: '회원/로그인/인증', depth1: 'MY', depth2: '회원/로그인/ID', severity: '높음', sentiment: '부정', urgency: '높음', signals: ['로그인', '인증문자 실패', '재시도 반복'] },
  insight: { intent: '인증문자 오류로 로그인 불가', risk: '서비스 이용 차단' },
  actions: { ownerTeam: ['인증/계정 시스템', 'SMS Gateway', '앱 인증 플로우'], checkpoints: ['SMS 발송 로그 확인', '수신 차단 여부', '장애 확산 여부'] },
  response: {
    customerMessage: '안녕하세요 고객님, 로그인 인증문자 오류로 불편을 드려 죄송합니다. 현재 인증 단계 오류 여부를 확인하고 있으며, 앱 최신 버전 확인 후 재시도를 부탁드립니다. 계속 실패하시면 즉시 복구 도와드리겠습니다(확인 필요).',
    pushMessage: '[U+] 고객님, 로그인 인증문자 오류를 확인 중입니다. 앱 최신 버전 확인 후 재시도 부탁드립니다.',
    internalMail: { title: '[긴급] 로그인 인증문자 실패 반복 VOC', body: '안녕하세요. 앱 로그인 인증문자 실패 VOC가 반복 인입되어 공유드립니다. SMS 발송 로그·수신 차단·장애 확산 여부 점검 부탁드립니다.' },
  },
  improvements: ['대체 인증수단 제공', '에러 메시지 개선', '발송 모니터링 강화'],
}
function ImpPill({ v }) {
  if (!v) return null
  const s = String(v)
  const t = /높|high|부정|negative/i.test(s) ? 'hi' : /보통|중간|medium|중립|neutral/i.test(s) ? 'mid' : /낮|low|긍정|positive/i.test(s) ? 'lo' : 'neu'
  return <span className={'imp-pill imp-' + t}>{s}</span>
}
function ImportResult({ notify, added, setAdded, shared, sharedInsert, openCase }) {
  const [raw, setRaw] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [reg, setReg] = useState(null)
  const copy = (t, l) => { if (t && navigator.clipboard) navigator.clipboard.writeText(t).then(() => notify && notify.toast(l + ' 복사됨')).catch(() => { }) }
  const load = () => { const { data, error } = parsePastedJSON(raw); if (error) { setErr(error); setRes(null); setReg(null) } else { setErr(''); setRes(data); setReg(null) } }
  const SEV_MAP = { '높음': 'High', '높': 'High', high: 'High', '보통': 'Medium', '중간': 'Medium', medium: 'Medium', '낮음': 'Low', '낮': 'Low', low: 'Low' }
  const register = () => {
    if (!res) { notify && notify.toast('먼저 JSON을 불러오세요'); return }
    const cc = res.classification || {}
    const ov = { group: cc.group || undefined, cat: cc.category || undefined, area1: cc.depth1 || undefined, area2: cc.depth2 || undefined, severity: SEV_MAP[String(cc.severity || '').trim().toLowerCase()] || SEV_MAP[String(cc.severity || '').trim()] || undefined }
    const seq = (added || []).reduce((m, v) => { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); return n > m ? n : m }, 0) + 1
    const id = shared ? 'IN-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) : 'IN-' + String(seq).padStart(3, '0')
    const v = enrichRow({ channel: '사내 에이전트', content: res.voc || '(원문 없음)', customer: '', date: '', week: '', occur: '' }, id, ov)
    const rr = res.response || {}, mm = rr.internalMail || {}
    v.imported = true
    if (rr.customerMessage) v.answer = rr.customerMessage
    if (rr.pushMessage) v.sms = rr.pushMessage
    if (mm.title || mm.body) v.mail = { to: (v.mail && v.mail.to) || v.org || '', subject: mm.title || (v.mail && v.mail.subject) || '', body: mm.body || '' }
    setAdded && setAdded([v, ...(added || [])])
    if (shared && sharedInsert) sharedInsert(toCompact([v]))
    setReg(v)
    notify && notify.toast(`${v.id} 등록됨 — ${v.group} · ${v.cat}`)
  }
  const c = (res && res.classification) || {}, ins = (res && res.insight) || {}, act = (res && res.actions) || {}, rsp = (res && res.response) || {}, mail = rsp.internalMail || {}, imp = (res && res.improvements) || []
  return (
    <div className="screen">
      <PageHead title="VOC 결과 불러오기" sub="사내 에이전트가 출력한 JSON을 붙여넣으면 카드로 즉시 표시됩니다 · LLM 호출 없음(사내망 무관)" />
      <div className="panel">
        <div className="card-title">에이전트 JSON 붙여넣기 <span className="muted">코드펜스·앞뒤 설명 문장이 섞여 있어도 됩니다</span></div>
        <textarea className="imp-ta" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'{\n  "voc": "...",\n  "classification": { "group": "...", "category": "...", "depth1": "...", "depth2": "...", "severity": "...", "sentiment": "...", "urgency": "...", "signals": [] },\n  "insight": { "intent": "...", "risk": "..." },\n  "actions": { "ownerTeam": [], "checkpoints": [] },\n  "response": { "customerMessage": "...", "pushMessage": "...", "internalMail": { "title": "...", "body": "..." } },\n  "improvements": []\n}'} />
        <div className="imp-actions">
          <button className="btn btn-primary" onClick={load}>카드로 표시</button>
          <button className="btn btn-ghost" onClick={() => { setRaw(JSON.stringify(IMP_SAMPLE, null, 2)); setErr('') }}>예시 채우기</button>
          {(raw || res) && <button className="btn btn-ghost" onClick={() => { setRaw(''); setRes(null); setErr(''); setReg(null) }}>지우기</button>}
        </div>
        {err && <div className="ai-err">{err}</div>}
      </div>
      {res && (
        <>
          {reg ? (
            <div className="imp-reg-ok">
              <span><b>{reg.id}</b> 등록 완료 — 분류 보드·추이·처리 목록에 반영되었습니다.</span>
              {openCase && <button className="btn btn-ghost sm" onClick={() => openCase(reg.id)}>처리 화면에서 보기 →</button>}
            </div>
          ) : (
            <div className="imp-reg-bar">
              <span className="muted">이 결과를 VOC 케이스로 등록하면 분류 보드·추이·처리 목록에 함께 쌓입니다 (분류값은 에이전트 결과 그대로 유지).</span>
              <button className="btn btn-primary" onClick={register}>＋ VOC로 등록</button>
            </div>
          )}
          <div className="panel">
            <div className="card-title">요약</div>
            <div className="imp-row"><span className="imp-k">VOC 구분</span><span>{c.group ? <GroupBadge v={c.group} /> : '—'} {c.category && <Tag>{c.category}</Tag>}</span></div>
            <div className="imp-row"><span className="imp-k">대응영역</span><span>{[c.depth1, c.depth2].filter(Boolean).join(' › ') || '—'}</span></div>
            <div className="imp-row"><span className="imp-k">심각도 · 감성 · 긴급도</span><span className="imp-pills"><ImpPill v={c.severity} /><ImpPill v={c.sentiment} /><ImpPill v={c.urgency} /></span></div>
            {Array.isArray(c.signals) && c.signals.length > 0 && <div className="imp-row"><span className="imp-k">신호어</span><span className="imp-chips">{c.signals.map((s, i) => <span key={i} className="imp-chip">{s}</span>)}</span></div>}
            {res.voc && <div className="imp-row"><span className="imp-k">원문</span><span className="imp-voc">{res.voc}</span></div>}
          </div>
          {(ins.intent || ins.risk) && (
            <div className="panel">
              <div className="card-title">의도 · 리스크</div>
              {ins.intent && <p className="imp-intent">{ins.intent}</p>}
              {ins.risk && <div className="imp-row"><span className="imp-k">리스크</span><span>{ins.risk}</span></div>}
            </div>
          )}
          {(((act.ownerTeam || []).length) || ((act.checkpoints || []).length)) ? (
            <div className="two-col">
              <div className="panel"><div className="card-title">담당팀</div><ul className="imp-list">{(act.ownerTeam || []).map((t, i) => <li key={i}>{t}</li>)}</ul></div>
              <div className="panel"><div className="card-title">확인 체크포인트</div><ul className="imp-list">{(act.checkpoints || []).map((t, i) => <li key={i}>{t}</li>)}</ul></div>
            </div>
          ) : null}
          {(rsp.customerMessage || rsp.pushMessage || mail.body || mail.title) && (
            <div className="panel">
              <div className="card-title">응대 초안 <span className="muted">검수 후 사용</span></div>
              {rsp.customerMessage && <div className="ai-ans"><div className="ai-ans-k">고객 응대문</div><div className="draft">{rsp.customerMessage}</div><button className="btn btn-ghost sm" onClick={() => copy(rsp.customerMessage, '고객 응대문')}>복사</button></div>}
              {rsp.pushMessage && <div className="ai-ans"><div className="ai-ans-k">문자/푸시</div><div className="draft">{rsp.pushMessage}</div><button className="btn btn-ghost sm" onClick={() => copy(rsp.pushMessage, '문자/푸시')}>복사</button></div>}
              {(mail.title || mail.body) && <div className="ai-ans"><div className="ai-ans-k">담당자 메일</div><div className="draft">{mail.title && <div className="imp-mail-t">{mail.title}</div>}{mail.body}</div><button className="btn btn-ghost sm" onClick={() => copy((mail.title ? mail.title + '\n\n' : '') + (mail.body || ''), '담당자 메일')}>복사</button></div>}
            </div>
          )}
          {Array.isArray(imp) && imp.length > 0 && (
            <div className="panel"><div className="card-title">개선 제안</div><ul className="imp-list">{imp.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
          )}
        </>
      )}
    </div>
  )
}
function SubLNB({ screen, setScreen }) {
  const SECTIONS = [
    { label: '현황 · 분석', items: [['trends', '기간별·영역별 추이']] },
    { label: '수집 · 자동분류', items: [['inbox', 'VOC 수집·입력'], ['board', '분류 보드']] },
    { label: '처리 · 개선', items: [['detail', 'VOC 처리'], ['insight', '인사이트 리포트']] },
    { label: '셀프 해결 · 엔진②', items: [['selfguide', '셀프 해결 가이드']] },
    { label: '연동 · 사내 에이전트', items: [['import', 'VOC 결과 불러오기']] },
  ]
  return (
    <aside className="sublnb">
      <div className="slnb-brand"><span className="brand-mark">U+</span><span className="brand-lock"><b className="brand-svc">VOICE</b><span className="brand-desc">VOC Action Copilot</span></span></div>
      {SECTIONS.map((sec) => (
        <React.Fragment key={sec.label}>
          <div className="slnb-sec-l">{sec.label}</div>
          <nav className="slnb-nav">{sec.items.map(([k, l]) => <button key={k} className={'slnb-item' + (screen === k ? ' on' : '')} onClick={() => setScreen(k)}>{l}</button>)}</nav>
        </React.Fragment>
      ))}
      <div className="slnb-sec-l">분류 체계</div>
      <div className="slnb-pin">4그룹 게이트 + 표준분류 22종<br />Copilot 분류 · 사람 검수 후 처리</div>
      <div className="slnb-foot">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b><br />공모전 MVP · 사내 전용</div>
    </aside>
  )
}
function Topbar({ title, mode, setMode, agentTitle, shareState, sharedEnabled, onShareTools }) {
  return (
    <header className="topbar">
      {mode !== 'expanded' && (
        <div className="tb-main">
          <div className="crumb">U+ VOICE<span className="crumb-sep">›</span>VOC Action Copilot<span className="crumb-sep">›</span><b>{title}</b></div>
          <div className="tb-main-right">
            <ShareBadge state={shareState} />
            {sharedEnabled && <button className="tb-share-btn" onClick={onShareTools} title="공유 저장소 도구 (데모)">⚙ 공유 저장소 도구</button>}
            <span className="ai-pill">● Copilot 연결됨 (데모)</span>
            {mode === 'collapsed' && <button className="tb-open" onClick={() => setMode('split')} title="Agent 패널 열기"><span className="tb-open-i">‹</span>Agent</button>}
          </div>
        </div>
      )}
      {mode !== 'collapsed' && (
        <div className="tb-agent">
          <span className="tb-agent-title">{agentTitle}</span>
          <div className="tb-agent-ctrl">
            <button onClick={() => setMode(mode === 'expanded' ? 'split' : 'expanded')} title={mode === 'expanded' ? '분할 보기' : 'Agent 전체화면'}>{mode === 'expanded' ? '⤡' : '⤢'}</button>
            {mode !== 'expanded' && <button onClick={() => setMode('collapsed')} title="Agent 패널 접기">»</button>}
          </div>
        </div>
      )}
    </header>
  )
}
function AgentPanel({ screen, caseId, added, notify, updateCases, selected, setSelected, openCase }) {
  const data = added || []
  const [done, setDone] = useState(null)
  const [reply, setReply] = useState(null)
  const inputRef = useRef(null)
  const single = (screen === 'detail') ? data.find((v) => v.id === caseId) : null
  const todo = data.filter((v) => v.status === '처리 필요')
  const sel = selected || []
  const proposed = (v) => {
    if (v.group === '장애/오류' || v.group === '성능') return v.devNeeded === 'Y' ? '개발 대응 요청 · 진행상황 안내' : 'AS 우선 배정 · 안내 SMS'
    if (v.group === '개선 요청/희망') return 'UX 개선 검토 등록 · 회신 안내'
    return '담당 확인 · 안내 SMS'
  }
  const actIds = (ids) => {
    if (!ids.length) return
    const items = data.filter((v) => ids.includes(v.id)).map((v) => ({ id: v.id, who: v.customer, cat: v.cat, from: v.status, to: '처리 완료' }))
    updateCases(ids, { status: '처리 완료' })
    setDone({ items })
    if (setSelected) setSelected([])
    notify.toast(`${ids.length}건 처리 완료 — 가운데 뷰어에 반영됨`)
  }
  // Copilot 입력 처리 — 조치 실행 + 데이터 질의(현황·검색·Top 유형)에 응답
  const topCats = (arr, n) => { const m = {}; arr.forEach((v) => { const k = v.cat; if (k) m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n) }
  const STOP = ['관련', '보여줘', '보여', '알려줘', '알려', '찾아줘', '찾아', '해줘', '좀', '건', '만', '줘', '대해', '대한', '보고싶어', '리스트', '목록', '있어', '뭐', '무슨']
  const matchCases = (text) => {
    const t = text.replace(/\s+/g, '')
    if (/high|하이|긴급|심각|중요/i.test(t)) return data.filter((v) => v.severity === 'High')
    if (/검토필요|검토/.test(t)) return data.filter((v) => v.review)
    if (/처리중/.test(t)) return data.filter((v) => v.status === '처리 중')
    if (/완료/.test(t)) return data.filter((v) => v.status === '처리 완료')
    const toks = text.split(/\s+/).map((s) => s.replace(/[을를이가은는의도와과에서]$/, '')).filter((w) => w.length >= 2 && !STOP.includes(w))
    if (!toks.length) return []
    return data.filter((v) => { const hay = `${v.cat} ${v.group} ${v.summary} ${v.content} ${v.area1} ${v.area2}`.toLowerCase(); return toks.some((tk) => hay.includes(tk.toLowerCase())) })
  }
  const runCommand = (text0) => {
    const text = (text0 || '').trim(); if (!text) return
    if (inputRef.current) inputRef.current.value = ''
    const t = text.replace(/\s+/g, '')
    // 1) 조치 실행 — 단, '~보여줘/목록/알려줘' 같은 조회 의도는 검색으로 보냄(아래 4단계)
    if (/(처리|조치|완료|해결|끝내)/.test(t) && !/(보여|목록|리스트|알려|찾|어디|현황)/.test(t)) {
      if (/(선택|고른|체크)/.test(t) && sel.length) { actIds(sel); setReply({ q: text, a: `선택한 ${sel.length}건을 처리하고 가운데 뷰어에 반영했어요.` }); return }
      if (todo.length) { const ids = todo.map((v) => v.id); actIds(ids); setReply({ q: text, a: `조치 필요 ${ids.length}건을 처리하고 가운데 뷰어에 반영했어요.` }); return }
      setReply({ q: text, a: '지금 조치 필요한 건이 없어요. VOC를 입력·붙여넣으면 여기서 바로 처리할 수 있어요.' }); return
    }
    // 2) 현황·통계
    if (/(현황|통계|개요|상황|몇건|건수|요약|정리)/.test(t)) {
      const high = data.filter((v) => v.severity === 'High').length
      const review = data.filter((v) => v.review).length
      const top = topCats(data, 3)
      setReply({ q: text, a: `전체 ${data.length.toLocaleString()}건 · 조치 필요 ${todo.length.toLocaleString()}건 · High ${high.toLocaleString()}건 · 검토필요 ${review.toLocaleString()}건`, list: top.map(([k, n]) => `${k} · ${n.toLocaleString()}건`) }); return
    }
    // 3) Top 유형
    if (/(제일많|가장많|많은유형|많이들어|top|순위|랭킹)/i.test(t)) {
      const top = topCats(data, 5)
      setReply({ q: text, a: top.length ? '많이 들어온 유형 Top 5' : '집계할 데이터가 없어요.', list: top.map(([k, n]) => `${k} · ${n.toLocaleString()}건`) }); return
    }
    // 4) 키워드/조건 검색 → 매칭 케이스(클릭하면 상세)
    const hits = matchCases(text)
    if (hits.length) {
      setReply({ q: text, a: `'${text}' 관련 ${hits.length.toLocaleString()}건을 찾았어요. 눌러서 상세를 볼 수 있어요.`, items: hits.slice(0, 6).map((v) => ({ id: v.id, label: `${v.cat} · ${(v.summary || v.content || '').slice(0, 36)}` })) }); return
    }
    // 5) 안내
    setReply({ q: text, a: '이렇게 해볼 수 있어요 — "현황 알려줘", "조치 필요 건 전부 처리", "로밍 관련 보여줘", "High만 보여줘".' })
  }
  const send = () => runCommand(inputRef.current ? inputRef.current.value : '')
  const ViewerResult = () => !done ? null : (
    <div className="ap-viewer">
      <div className="ap-viewer-h">뷰어 수정 <span className="ap-applied">✓ 반영완료</span></div>
      {done.items.slice(0, 8).map((it) => (
        <div key={it.id} className="ap-change"><b>{it.who}</b> <span className="ap-mut">{it.cat}</span><span className="ap-arrow"><span className="dot dot-todo">{it.from}</span> → <span className="dot dot-done">{it.to}</span></span></div>
      ))}
    </div>
  )
  return (
    <aside className="agent-panel">
      <div className="ap-body">
        {single ? (
          <>
            <div className="ap-card">
              <div className="ap-card-h"><b>{single.id}</b> · {single.channel}{single.week ? ` · ${single.week}` : ''}</div>
              <div className="ap-line"><GroupBadge v={single.group} /> <Tag>{single.cat}</Tag> <StatBadge v={single.status} /></div>
              <div className="ap-mut">{single.summary}</div>
              <div className="ap-mut">제안: {proposed(single)}</div>
            </div>
            <div className="ap-sec">액션 · 담당자 검수 후 실행</div>
            {single.sms && <button className="ap-act" onClick={() => notify.modal('고객 안내 문자 (초안)', single.sms)}>✉ 고객 안내 문자 보기/보내기</button>}
            {single.mail && <button className="ap-act" onClick={() => notify.modal(`담당(${single.org}) 메일 (초안)`, `${single.mail.subject}\n\n${single.mail.body}`)}>✉ 담당({single.org}) 메일 전달</button>}
            {single.status !== '처리 완료'
              ? <button className="ap-act primary" onClick={() => actIds([single.id])}>✓ 이 건 ‘처리 완료’로 변경</button>
              : <div className="ap-doneline">✓ 처리 완료됨 · 뷰어 반영됨</div>}
            <div className="ap-sec">Copilot 분석</div>
            <ul className="ap-anal">{(single.analysis || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
            <ViewerResult />
          </>
        ) : todo.length ? (
          <>
            <div className="ap-greet">조치 필요 {todo.length}건</div>
            <div className="ap-mut">아래 건들을 한 번에 처리하고, 진행상황을 가운데 뷰어에 바로 반영해요.</div>
            {todo.slice(0, 6).map((v) => (
              <div key={v.id} className="ap-item ap-item-click" role="button" tabIndex={0}
                onClick={() => openCase && openCase(v.id)}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && openCase) { e.preventDefault(); openCase(v.id) } }}>
                <div className="ap-item-h"><b>{v.customer}</b> <span className="ap-mut">{v.channel}{v.week ? ` · ${v.week}` : ''}</span><span className="dot dot-todo">조치필요</span></div>
                <div className="ap-mut">{v.cat} · {v.summary}</div>
                <div className="ap-item-act">{proposed(v)}</div>
              </div>
            ))}
            {todo.length > 6 && <div className="ap-mut">외 {todo.length - 6}건</div>}
            {sel.length > 0
              ? <button className="ap-act primary" onClick={() => actIds(sel)}>선택 {sel.length}건 조치</button>
              : <button className="ap-act primary" onClick={() => actIds(todo.map((v) => v.id))}>조치 필요 {todo.length}건 일괄 조치</button>}
            <ViewerResult />
          </>
        ) : (
          <>
            <div className="ap-greet">무엇을 도와드릴까요?</div>
            <div className="ap-mut">현재 ‘처리 필요(High)’ 건이 없습니다. VOC Inbox에서 데이터를 입력·붙여넣으면, 여기서 분류 결과와 제안 액션을 바로 처리하고 가운데 뷰어에 반영할 수 있어요.</div>
            <ViewerResult />
          </>
        )}
        {reply && (
          <div className="ap-reply">
            <div className="ap-reply-q">{reply.q}</div>
            <div className="ap-reply-a">{reply.a}</div>
            {reply.list && <ul className="ap-reply-list">{reply.list.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            {reply.items && (
              <div className="ap-reply-items">
                {reply.items.map((it) => (
                  <button key={it.id} className="ap-reply-item" onClick={() => openCase && openCase(it.id)}>{it.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ap-chips">
        {['현황 알려줘', '조치 필요 전부 처리', '로밍 관련 보여줘', 'High만 보여줘', '많은 유형 Top5'].map((c) => (
          <button key={c} className="ap-chip" onClick={() => runCommand(c)}>{c}</button>
        ))}
      </div>
      <div className="ap-input">
        <input ref={inputRef} placeholder="현황·검색·조치를 입력하세요 — 예: 로밍 관련 보여줘" onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
        <button className="ap-send" title="전달" onClick={send}>↑</button>
      </div>
    </aside>
  )
}
function ClassificationBoard({ openCase, notify, added, updateCases }) {
  const all = useMemo(() => [...(added || []), ...VOCS], [added])
  const [dragCol, setDragCol] = useState(null)
  const [dragId, setDragId] = useState(null)
  // 상태별 그룹화를 한 번만 계산 — 드래그 hover(dragCol 변경)마다 5열×전체를 재필터링하지 않도록
  const byStatus = useMemo(() => {
    const m = {}; for (const col of KANBAN_COLS) m[col] = []
    for (const v of all) (m[v.status] || (m[v.status] = [])).push(v)
    return m
  }, [all])
  return (
    <div className="screen">
      <PageHead title="분류 보드" sub="4그룹 게이트 + 22개 표준분류 · 카드를 드래그해 진행상황을 바꿀 수 있어요" />
      <div className="board-top">
        <div className="gate-legend">
          {GROUPS.map((g) => <span key={g} className={GROUP_CLS[g] + ' gate-chip'}>{g}<em>{GROUP_MODE[g]}</em></span>)}
        </div>
        <button className="btn btn-primary" onClick={() => notify.modal('Copilot AI로 분류', '실제 적용 시 Copilot AI가 최신 수집 VOC를 4개 그룹·22개 표준분류 기준으로 분류합니다. 정형 그룹(장애/오류·성능·개선요청)은 닫힌 분류로 매핑하고, 열림 그룹은 22개로 추론합니다.')}>Copilot AI로 분류</button>
      </div>
      <div className="panel">
        <div className="block-label">열림 그룹 표준분류 22</div>
        <div className="cat22">{CAT22.map((c, i) => <span key={c} className="cat22-item"><b>{i + 1}</b>{c}</span>)}</div>
        <div className="block-label" style={{ marginTop: '10px' }}>정형 그룹(닫힌 분류 · AI 재판단 불필요)</div>
        <div className="fixed-list">{Object.entries(FIXED_DEPTH2).map(([g, arr]) => <div key={g} className="fx-row"><GroupBadge v={g} /><span className="muted">{arr.join(' · ')}</span></div>)}</div>
      </div>
      <div className="board-hint">💡 카드를 드래그해 다른 상태 열로 옮기면 진행상황이 바로 변경됩니다 (저장됨)</div>
      <div className="kanban">
        {KANBAN_COLS.map((col) => {
          const items = byStatus[col] || []
          return (
            <div key={col} className={'kcol' + (dragCol === col ? ' kcol-over' : '')}
              onDragOver={(e) => { e.preventDefault(); if (dragCol !== col) setDragCol(col) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragCol((c) => c === col ? null : c) }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { updateCases([id], { status: col }); notify.toast(`${id} → ${col} (저장됨)`) } setDragCol(null); setDragId(null) }}>
              <div className="kcol-head"><span>{col}</span><span className="kcount">{items.length}</span></div>
              <div className="kcol-body">
                {items.map((v) => (
                  <div key={v.id} className={'kcard' + (dragId === v.id ? ' kcard-drag' : '')} draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.id); e.dataTransfer.effectAllowed = 'move'; setDragId(v.id) }}
                    onDragEnd={() => { setDragCol(null); setDragId(null) }}
                    onClick={() => openCase(v.id)}>
                    <div className="kcard-top"><ChannelChip channel={v.channel} /><SevBadge v={v.severity} /></div>
                    <div className="kcard-content" title={v.content}>{v.summary || v.content}</div>
                    <div className="kcard-foot"><GroupBadge v={v.group} /></div>
                    <div className="kcard-foot"><Tag>{v.cat}</Tag><span className="muted">{v.action}</span></div>
                  </div>
                ))}
                {items.length === 0 && <div className="kempty">{dragCol === col ? '여기로 이동' : '없음'}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- 전사(대화) → 채팅 말풍선 렌더 (파서는 상단 분류기 영역에 정의) ---------- */
/* ---------- [4] Case Detail ---------- */
function PromptTemplates({ notify }) {
  const [shown, setShown] = useState({})
  const steps = [
    {
      key: 'cls', n: 1, role: '분석', title: 'VOC 분류', purpose: '유형 · 세부 · 심각도 자동 분류', core: true, cta: 'Copilot으로 분석하기',
      body: '아래 VOC를 분석해라.\n\n1. VOC 유형을 4개 중 하나로 분류\n   - 장애/오류 / 성능 / 개선 요청 / 문의·기타\n2. 세부 카테고리(22개 기준)로 분류\n3. 모호하면 "기타 + 검토필요"로 표시\n\n[출력 형식]\n- 유형:\n- 세부:\n- 심각도:',
      preview: ['유형: 장애/오류', '세부: 앱/웹 기능오류', '심각도: High'],
    },
    {
      key: 'msg', n: 2, role: '대응', title: '고객 메시지 생성', purpose: '고객 안내 메시지 초안', cta: '메시지 생성',
      body: '아래 VOC를 기반으로 고객 안내 메시지를 작성해라.\n\n- 사실 기반\n- 오해 방지 중심\n- 간결하게 작성\n- 개인정보 포함 금지\n\n[출력]\n- 고객 안내 메시지:',
      preview: ['고객 안내 메시지: 불편을 드려 죄송합니다. 해당 오류는 확인되어 순차 정상화 중이며, 앱 최신 버전 업데이트 후 재시도를 부탁드립니다.'],
    },
    {
      key: 'imp', n: 3, role: '개선', title: '개선 요청 생성', purpose: 'UX/개발 개선 과제화', cta: '개선 요청 정리',
      body: '아래 VOC를 기반으로 UX/개선 요청으로 정리해라.\n\n[포함 항목]\n- 문제 정의\n- 영향 범위\n- 개선 제안\n- 우선순위',
      preview: ['문제 정의: 특정 단계에서 기능 오류 반복', '영향 범위: 동일 유형 VOC 다수', '개선 제안: 예외 처리 · 안내 보강', '우선순위: High'],
    },
    {
      key: 'mail', n: 4, role: '공유', title: '담당자 메일', purpose: '담당 조직 공유 메일', cta: '메일 작성',
      body: 'High VOC를 담당 조직에 공유할 메일을 작성해라.\n\n[포함]\n- VOC 요약\n- 고객 영향\n- 개선 필요 사항\n- 요청 액션',
      preview: ['수신: 담당 조직', '제목: [High] 앱 기능오류 공유', '본문: VOC 요약 · 고객 영향 · 개선 필요 · 요청 액션 포함'],
    },
    {
      key: 'rpt', n: 5, role: '요약', title: '인사이트 리포트', purpose: '경영 보고용 요약', cta: '리포트 생성',
      body: 'VOC 데이터를 기반으로 리포트를 생성해라.\n\n[포함]\n- 유형 분포\n- 주요 문제\n- 개선 우선순위\n- 기대 효과',
      preview: ['유형 분포 · 주요 문제 · 개선 우선순위 · 기대 효과를 표/비율로 요약'],
    },
  ]
  const copy = (t) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast('프롬프트 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  const run = (st) => { setShown((s) => ({ ...s, [st.key]: true })); notify.toast(`Copilot이 ${st.title} 결과를 생성했어요 (데모)`) }
  return (
    <div className="screen">
      <PageHead title="Copilot 프롬프트" sub="5개 프롬프트는 따로 도는 게 아니라, 하나의 Copilot 워크플로우로 이어집니다." />
      <div className="pipe-strip">{steps.map((st, i, a) => (
        <React.Fragment key={st.key}><span className={'pipe-step' + (i === 0 ? ' on' : '')}>{st.n} {st.role}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>
      <div className="prompt-grid">{steps.map((st) => (
        <div key={st.key} className={'prompt-card' + (st.core ? ' pc-core' : '')}>
          <div className="pc-head">
            <span className="pc-num">{st.n}</span>
            <span className="pc-title">{st.title}{st.core && <span className="pc-core-badge">핵심</span>}</span>
            <span className="pc-role">{st.role}</span>
          </div>
          <div className="pc-purpose">{st.purpose}</div>
          <pre className="pc-body">{st.body}</pre>
          {shown[st.key] && (
            <div className="pc-preview">
              <div className="pc-pv-l"><span className="ai-spark">✦</span> 결과 미리보기 <span className="muted" style={{ fontWeight: 400 }}>· 데모</span></div>
              <ul className="pc-pv-list">{st.preview.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
          <div className="pc-actions">
            <button className="btn btn-ghost sm" onClick={() => copy(st.body)}>복사</button>
            <button className="btn btn-primary sm" onClick={() => run(st)}>{st.cta}</button>
          </div>
        </div>
      ))}</div>
      <p className="micro">사내 네트워크 정책상 데모에서는 실제 Copilot 호출 대신 예시 결과를 보여줍니다. 실제 적용 시 사내 Copilot / Copilot Studio Agent로 연결됩니다.</p>
    </div>
  )
}

/* ---------- [Arch] Architecture (패턴 설계) ---------- */
/* ---------- [설계] 프로세스 플로우 ---------- */
function FlowMap() {
  return (
    <div className="panel flowmap-card">
      <div className="card-title">처리 흐름 한눈에 <span className="muted">셀프 해결 → 미해결 시 수집·분류 → 운영·반영 · 결과는 학습으로 피드백</span></div>
      <div className="flowmap-scroll">
        <svg className="flowmap" viewBox="0 0 1040 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VOC 처리 프로세스 플로우">
          <defs>
            <marker id="fmah" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z" fill="#e6007e" /></marker>
            <marker id="fmah2" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z" fill="#b8005f" /></marker>
          </defs>
          <g fill="none" stroke="#e6007e" strokeWidth="2" markerEnd="url(#fmah)">
            <path d="M152 61 L180 61" />
            <path d="M316 61 L368 61" />
            <path d="M522 61 L552 61" />
            <path d="M250 94 C250 150 258 152 258 186" />
            <path d="M336 212 L368 212" />
            <path d="M528 212 L560 212" />
            <path d="M720 212 L752 212" />
          </g>
          <path d="M642 234 C642 286 450 286 450 238" fill="none" stroke="#b8005f" strokeWidth="1.8" strokeDasharray="5 4" markerEnd="url(#fmah2)" />
          <text x="546" y="303" textAnchor="middle" className="fm-loop-t">AI 학습 · 피드백 루프</text>
          <text x="343" y="50" className="fm-lbl">예</text>
          <text x="286" y="150" className="fm-lbl">아니오</text>
          <rect className="fm-pill" x="36" y="40" width="116" height="42" rx="11" />
          <text x="94" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">VOC 발생</text>
          <polygon className="fm-dia" points="250,28 316,61 250,94 184,61" />
          <text x="250" y="61" textAnchor="middle" dominantBaseline="central" className="fm-dia-t">셀프 해결 가능?</text>
          <rect className="fm-box" x="372" y="40" width="150" height="42" rx="11" />
          <text x="447" y="61" textAnchor="middle" dominantBaseline="central" className="fm-node">고객 셀프 해결</text>
          <rect className="fm-pill end" x="556" y="43" width="210" height="36" rx="18" />
          <text x="661" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 인입콜·VOC 감소</text>
          <rect className="fm-box" x="180" y="190" width="156" height="44" rx="11" />
          <text x="258" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">상담 연결·VOC 접수</text>
          <rect className="fm-box" x="372" y="190" width="156" height="44" rx="11" />
          <text x="450" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">수집 · 자동 분류</text>
          <rect className="fm-box" x="564" y="190" width="156" height="44" rx="11" />
          <text x="642" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">운영 · 서비스 반영</text>
          <rect className="fm-pill end" x="756" y="193" width="214" height="38" rx="19" />
          <text x="863" y="212" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 처리율·속도 향상</text>
        </svg>
      </div>
    </div>
  )
}
function Architecture() {
  const Box = ({ t, d }) => <div className="fc-box"><b>{t}</b>{d && <span>{d}</span>}</div>
  const Arrow = () => <span className="fc-arrow" aria-hidden="true" />
  const flow = ['VOC 발생', 'Copilot 분석', '고객 대응 생성', '개선 과제 도출', '리포트 생성']
  const roles = [
    { t: '분석', d: '유형 · 심각도 자동 분류' },
    { t: '대응', d: '문자 · 메일 초안 생성' },
    { t: '개선', d: '개선 과제 도출' },
    { t: '리포트', d: '현황 · 인사이트 요약' },
  ]
  const intake = [
    { t: '채널 수집', d: '상담콜 · 앱 · 홈페이지' },
    { t: '전처리', d: 'STT · 개인정보 마스킹' },
    { t: '자동 분류', d: '4그룹 · 22개 표준분류' },
    { t: '우선순위화', d: '감성 · 긴급도 스코어링' },
  ]
  const operate = [
    { t: '대시보드', d: '유형·영역 추이 · 처리현황' },
    { t: '인사이트 · 담당자 알림', d: '예상 답안 · 처리 가이드' },
    { t: '서비스 반영', d: '근본 원인 개선' },
  ]
  const effects = [
    { t: '상담 Call 감소', d: '셀프 해결로 인입 감소' },
    { t: 'VOC 감소', d: '근본 원인 개선' },
    { t: '분류 자동화', d: '수기 태깅 제거' },
    { t: '대응 속도 향상', d: '실시간 처리' },
  ]
  return (
    <div className="screen">
      <div className="voice-banner">
        <div className="vb-lock"><span className="brand-mark lg">U+</span><span className="brand-lock"><b className="brand-svc lg">VOICE</b><span className="brand-desc">VOC Orchestration &amp; Insight-driven CX Engine</span></span></div>
        <p className="vb-tag">고객의 목소리를 분석해, 실행 가능한 CX 개선 액션으로 연결하는 AI 서비스</p>
        <div className="vb-acro">
          {[['V', 'VOC', '고객의 목소리'], ['O', 'Orchestration', '흩어진 VOC를 연결·조율'], ['I', 'Insight-driven', '인사이트 기반 분석'], ['C', 'CX', '고객경험 개선'], ['E', 'Engine', '실행을 돕는 AI 엔진']].map(([k, t, d]) => (
            <div key={k} className="vb-acro-i"><span className="vb-acro-k">{k}</span><b>{t}</b><span>{d}</span></div>
          ))}
        </div>
        <p className="vb-slogan">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b></p>
      </div>
      <div className="page-head"><div>
        <h1 className="page-title">솔루션 구조 (TO-BE)</h1>
        <p className="page-sub">VOC 자동 분류 → 개선안 도출까지, Copilot이 전체 흐름을 자동 수행합니다.</p>
      </div></div>

      <h2 className="sec-title">핵심 Flow</h2>
      <div className="pipe-strip">{flow.map((s, i, a) => (
        <React.Fragment key={s}><span className={'pipe-step' + (i >= 1 && i <= 3 ? ' on' : '')}>{s}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>

      <h2 className="sec-title">Copilot 역할</h2>
      <div className="effect-row">{roles.map((r) => <div key={r.t} className="effect-card"><div className="effect-t">{r.t}</div><div className="effect-d">{r.d}</div></div>)}</div>

      <h2 className="sec-title">처리 흐름 <span className="sec-note">셀프 해결 → 미해결 시 수집·분류 → 운영·반영</span></h2>
      <FlowMap />

      <h2 className="sec-title">단계별 상세 <span className="sec-note">3개 레인 · 수집부터 반영까지</span></h2>
      <div className="flowchart">
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">1</span>고객 접점 · 셀프 해결</div>
          <Box t="VOC 발생" />
          <Arrow />
          <div className="fc-decision"><span className="fc-dia">◆</span> 셀프 가이드로 해결 가능?</div>
          <div className="fc-branch">
            <div className="fc-leg">
              <span className="fc-yes">예</span>
              <Box t="고객 셀프 해결" d="접수 전 맞춤 가이드" />
              <Arrow />
              <div className="fc-pill end">END · 인입콜 감소</div>
            </div>
            <div className="fc-leg">
              <span className="fc-no">아니오</span>
              <Box t="상담 연결 · VOC 접수" d="미해결 건만 전달" />
              <Arrow />
              <div className="fc-next">↳ 레인 2로 유입</div>
            </div>
          </div>
        </div>
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">2</span>수집 · 자동 분류</div>
          {intake.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < intake.length - 1 && <Arrow />}</React.Fragment>)}
          <div className="fc-loop">⟲ 처리 결과는 분류 모델 학습으로 되먹임</div>
        </div>
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">3</span>운영 · 서비스 반영</div>
          {operate.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < operate.length - 1 && <Arrow />}</React.Fragment>)}
          <Arrow />
          <div className="fc-pill end">END · 처리율 · 속도 향상</div>
        </div>
      </div>

      <h2 className="sec-title">문제 → 해결</h2>
      <div className="ba-grid">
        <div className="panel ba-before"><div className="ba-tag">AS-IS</div><ul className="ba-list"><li>수기 분류 · 태깅</li><li>채널별 중복 처리</li><li>대응 지연 · 반복 인입</li></ul></div>
        <div className="panel ba-after"><div className="ba-tag after">TO-BE</div><ul className="ba-list"><li>Copilot 자동 분류</li><li>문자·메일 자동 생성</li><li>실시간 대응 · 셀프 해결</li></ul></div>
      </div>

      <h2 className="sec-title">기대 효과</h2>
      <div className="effect-row">{effects.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>

      <h2 className="sec-title">구현 로드맵</h2>
      <div className="roadmap">
        <div className="rm-step rm-now"><div className="rm-t">PoC <span className="rm-badge">현재</span></div><div className="rm-d">핵심 분류·대시보드 프로토타입</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">파일럿</div><div className="rm-d">실 VOC·STT로 정확도 고도화</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">전사 확산</div><div className="rm-d">CX 전 영역·타 채널 확대</div></div>
      </div>
    </div>
  )
}

/* ---------- [엔진②] 고객 셀프 해결 가이드 ---------- */
const SELF_GUIDE = {
  '로그인불가/로그인풀림': ['앱을 최신 버전으로 업데이트 후 재실행', '비밀번호 재설정 또는 간편로그인(생체인증) 재등록', '기기 날짜·시간 자동설정 확인 → 인증 오류 방지'],
  '회원/로그인/인증': ['본인인증 수단(통신사/PASS) 재시도', '아이디 찾기 · 비밀번호 재설정', '명의자 정보 일치 여부 확인'],
  '회원/로그인 개선': ['간편로그인(생체인증) 등록으로 재로그인 최소화', '자동 로그아웃 주기 설정 확인', '여러 기기 동시 로그인 시 재인증 안내 확인'],
  '요금/청구/납부/환불': ['MY > 요금조회에서 청구 상세 확인', '자동이체 · 카드 등록 상태 점검', '중복결제 의심 시 결제내역 캡처 후 문의'],
  '앱/웹 기능오류': ['앱 캐시 삭제 후 재실행', '최신 버전으로 업데이트', '기기 재부팅 후 재시도'],
  '앱/웹 접속불가': ['Wi-Fi ↔ 데이터 전환 후 재접속', '앱 최신 버전 확인', '잠시 후 재시도(일시적 부하 가능)'],
  '앱/웹 속도 느림': ['백그라운드 앱 종료 후 재실행', '캐시 삭제 · 저장공간 확보', 'Wi-Fi 신호 강한 곳에서 재시도'],
  '데이터(사용량/선물/충전)': ['MY > 데이터에서 잔여량 · 사용량 확인', '데이터 선물 · 충전 메뉴 이용', '안심차단 · 한도 설정 확인'],
  '멤버십/쿠폰/혜택/VIP콕': ['멤버십 > VIP콕에서 당월 혜택 확인', '쿠폰함에서 사용 가능 쿠폰 확인', '제휴처 사용조건(시간 · 지점) 확인'],
  '로밍': ['로밍 요금제 가입 여부 확인', '데이터 로밍 ON/OFF 설정 확인', '현지 도착 후 네트워크 수동 검색'],
}
const GUIDE_FALLBACK = ['앱을 최신 버전으로 업데이트', '캐시 삭제 후 재실행', '도움말 · FAQ에서 동일 증상 확인', '미해결 시 상담 연결']
function SelfGuide({ added, notify }) {
  const data = (added || []).filter((v) => v.status !== '처리 완료') // 처리 전 단계 유사 VOC
  const total = data.length
  // 비슷한 VOC를 표준분류(cat)로 그룹화 + 대표 예상답안 매칭
  const map = {}
  data.forEach((v) => {
    const m = map[v.cat] || (map[v.cat] = { cat: v.cat, group: v.group, n: 0, high: 0, answer: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++
    if (!m.answer) { m.answer = v.answer; m.sampleId = v.id }
  })
  const top = Object.values(map).sort((a, b) => b.n - a.n).slice(0, 8)
  const covered = top.filter((t) => SELF_GUIDE[t.cat]).reduce((s, t) => s + t.n, 0)
  const selfRate = total ? Math.round(covered / total * 100) : 0
  if (!total) return <div className="screen"><PageHead title="고객 셀프 해결 가이드" sub="엔진② · 접수 전 셀프 해결 시나리오" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 자주 묻는 유형이 셀프 해결 가이드로 변환됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="고객 셀프 해결 가이드" sub="엔진② · 처리 전 단계의 비슷한 VOC를 그룹화 → 자주 묻는 유형을 접수 전 셀프 해결 시나리오 + 예상답안으로 제공" />
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-l">자주 묻는 유형(그룹)</div>
          <div className="kpi-v">{top.length}<span className="kpi-unit">개</span></div>
          <span className="kpi-chip">셀프 가이드화</span>
        </div>
        <div className="kpi-card accent brand">
          <div className="kpi-l">셀프 가이드 커버율</div>
          <div className="kpi-v">{selfRate}<span className="kpi-unit">%</span></div>
          <span className="kpi-chip brand">상위 유형 기준</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">예상 인입콜 감소</div>
          <div className="kpi-v">{covered.toLocaleString()}<span className="kpi-unit">건</span></div>
          <span className="kpi-chip">접수 전 자가 해결(데모)</span>
        </div>
      </div>
      <h2 className="sec-title">자주 묻는 VOC → 셀프 해결 시나리오 <span className="sec-note">비슷한 VOC 그룹 상위 {top.length}개 · 예상답안 매칭</span></h2>
      <div className="guide-grid">{top.map((t) => {
        const steps = SELF_GUIDE[t.cat] || GUIDE_FALLBACK
        return (
          <div key={t.cat} className="guide-card">
            <div className="guide-head"><span className="guide-cat">{t.cat}</span><span className="guide-freq">{t.n.toLocaleString()}건{t.high ? ` · High ${t.high}` : ''}</span></div>
            <ol className="guide-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {t.answer && <div className="guide-ans"><div className="guide-ans-k">매칭 예상답안 (고객 응대 초안)</div><div className="guide-ans-v">{t.answer}</div></div>}
            <div className="guide-foot"><button className="btn btn-ghost sm" onClick={() => notify.toast('셀프 해결 완료 (데모) — 인입콜 1건 예방')}>해결됐어요</button><button className="btn btn-ghost sm" onClick={() => notify.toast('미해결 — 상담사 연결 (데모)')}>상담 연결</button></div>
          </div>
        )
      })}</div>
      <div className="note-box"><b>엔진② 동작</b> — 처리 전 단계의 비슷한 VOC를 표준분류로 그룹화해 자주 묻는 유형을 셀프 해결 시나리오로 변환하고, 각 유형의 <b>예상답안</b>(VOC 처리의 응대 초안)과 매칭해 접수 전 단계에서 고객 맞춤 가이드를 노출합니다. <b>미해결 건만</b> 정제해 상담사에 연결하고, 처리결과는 분류 모델 학습으로 되먹임됩니다(피드백 루프).</div>
    </div>
  )
}

/* ---------- [개선 백로그] 우선순위 매긴 서비스 개선 과제 ---------- */
function Backlog({ added, openCase }) {
  const data = added || []
  if (!data.length) return <div className="screen"><PageHead title="개선 백로그" sub="우선순위가 매겨진 서비스 개선 과제" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 영역·유형별 개선 과제가 우선순위와 함께 정리됩니다.</div></div>
  const map = {}
  data.forEach((v) => {
    const key = v.area1 + '||' + v.cat
    const m = map[key] || (map[key] = { area1: v.area1, area2: v.area2, cat: v.cat, group: v.group, n: 0, high: 0, dev: 0, owner: v.owner, action: v.action, sample: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++; if (v.devNeeded === 'Y') m.dev++
    if (!m.sample) { m.sample = v.summary || v.content; m.sampleId = v.id }
  })
  const items = Object.values(map).map((m) => ({ ...m, score: m.high * 3 + m.n + (m.dev ? 2 : 0) })).sort((a, b) => b.score - a.score).slice(0, 20)
  const pr = (i) => i < 3 ? 'P1' : i < 8 ? 'P2' : 'P3'
  return (
    <div className="screen">
      <PageHead title="개선 백로그" sub="VOC 근거와 함께 원인·액션을 도출하고 빈도·심각도로 우선순위를 매긴 서비스 개선 과제" />
      <div className="table-wrap"><table className="vtable backlog">
        <thead><tr><th>우선순위</th><th>대응영역</th><th>유형</th><th>건수</th><th>High</th><th>개발</th><th>제안 액션</th><th>담당</th><th>대표 원문</th></tr></thead>
        <tbody>{items.map((m, i) => (
          <tr key={m.area1 + m.cat} onClick={() => m.sampleId && openCase(m.sampleId)} className="row-click">
            <td><span className={'pr-badge pr-' + pr(i).toLowerCase()}>{pr(i)}</span></td>
            <td className="nowrap muted">{m.area1} › {m.area2}</td>
            <td className="nowrap"><GroupBadge v={m.group} /> <Tag>{m.cat}</Tag></td>
            <td className="pv-num">{m.n.toLocaleString()}</td>
            <td className="pv-num">{m.high || ''}</td>
            <td className="pv-num">{m.dev ? 'Y' : ''}</td>
            <td className="nowrap">{m.action}</td>
            <td className="nowrap muted">{m.owner}</td>
            <td className="cell-content" title={m.sample}>{m.sample}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="micro">우선순위 = High 건수×3 + 건수 + 개발대응 가중치. 행을 클릭하면 대표 케이스로 이동합니다. (실제 적용 시 Jira 백로그로 연계)</p>
    </div>
  )
}

/* ---------- [발송 이력] 메일·문자 발송 이력 — 메일 앱에 임베드 ---------- */
function SentLogTable({ sentLog }) {
  const log = sentLog || []
  if (!log.length) return <div className="panel empty-panel">아직 발송 이력이 없습니다. <b>VOC Agent › VOC 처리</b>에서 메일/문자를 발송(데모)하면 담당자·수신·내용·발송일이 여기에 기록됩니다.</div>
  return (
    <div className="table-wrap"><table className="vtable">
      <thead><tr><th>발송일시</th><th>유형</th><th>담당자</th><th>수신</th><th>케이스</th><th>내용</th></tr></thead>
      <tbody>{log.map((s) => (
        <tr key={s.id}><td className="nowrap muted">{s.date}</td><td><span className={'kind ' + (s.kind === '메일' ? 'kind-mail' : 'kind-sms')}>{s.kind}</span></td><td className="nowrap">{s.owner}</td><td className="nowrap">{s.to}</td><td className="mono nowrap">{s.caseId}</td><td className="cell-content" title={s.content}>{s.content}</td></tr>
      ))}</tbody>
    </table></div>
  )
}

/* ---------- 통합 홈(포털) + 업무 앱 (데모) ---------- */
const PORTAL_TITLES = { home: '통합 홈', mail: '메일', cal: '일정', org: '조직도', pay: '결재', grid: '솔루션 설명' }
function HomePortal({ account, added, goAgent, setRail, openCase, notify, aiMode, setAiMode }) {
  const data = added || []
  const name = (account || 'U+').split('@')[0]
  const [caseTab, setCaseTab] = useState('high')
  const [aiAns, setAiAns] = useState(null)
  // 데이터 기반 집계는 한 번만 — 탭 클릭·AI 질의(상태 변경)마다 620건을 재집계하지 않도록 [data]에 메모이즈.
  // 특히 alerts는 주차×그룹×데이터 중첩 루프라 가장 무겁다.
  const agg = useMemo(() => {
    const total = data.length
    const todo = data.filter((v) => v.status === '처리 필요').length
    const high = data.filter((v) => v.severity === 'High').length
    const doing = data.filter((v) => v.status === '처리 중').length
    const review = data.filter((v) => v.review).length
    const autoRate = total ? Math.round(((total - review) / total) * 100) : 0
    const grpMap = {}; data.forEach((v) => { grpMap[v.group] = (grpMap[v.group] || 0) + 1 })
    const groupSeg = GROUPS.filter((g) => grpMap[g]).map((g, i) => ({ label: g, value: grpMap[g], color: DONUT_COLORS[i % DONUT_COLORS.length] }))
    const catMap = {}; data.forEach((v) => { catMap[v.cat] = (catMap[v.cat] || 0) + 1 })
    const topCat = Object.entries(catMap).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 5)
    const statusDist = KANBAN_COLS.map((k) => ({ k, n: data.filter((v) => v.status === k).length }))
    const maxStatus = Math.max(1, ...statusDist.map((s) => s.n))
    const chMap = {}; data.forEach((v) => { chMap[v.channel] = (chMap[v.channel] || 0) + 1 })
    const channels = Object.entries(chMap).map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n)
    const areaMap = {}; data.forEach((v) => { if (v.area1) areaMap[v.area1] = (areaMap[v.area1] || 0) + 1 })
    const topArea = Object.entries(areaMap).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 3)
    // 이상 감지: 최신 주차 vs 직전 주차 급증
    const weeksA = [...new Set(data.map((d) => d.week).filter(Boolean))].sort((a, b) => weekKey(a) - weekKey(b))
    const alerts = []
    if (weeksA.length >= 2) {
      const cur = weeksA[weeksA.length - 1], prev = weeksA[weeksA.length - 2]
      for (const [label, acc] of [['VOC구분1', (d) => d.group], ['대응영역', (d) => d.area1]]) {
        for (const k of [...new Set(data.map(acc))]) {
          const c = data.filter((d) => acc(d) === k && d.week === cur).length
          const p = data.filter((d) => acc(d) === k && d.week === prev).length
          if (c >= 5 && c > p) { const pc = p ? Math.round((c - p) / p * 100) : 100; if (pc >= 40) alerts.push({ label, k, cur, c, p, pc }) }
        }
      }
      alerts.sort((a, b) => b.pc - a.pc)
    }
    const caseSets = {
      high: data.filter((v) => v.severity === 'High'),
      review: data.filter((v) => v.review),
      doing: data.filter((v) => v.status === '처리 중'),
    }
    const topGroups = [...groupSeg].sort((x, y) => y.value - x.value).slice(0, 2)
    return { total, todo, high, doing, review, autoRate, grpMap, groupSeg, catMap, topCat, statusDist, maxStatus, chMap, channels, areaMap, topArea, weeksA, alerts, a0: alerts[0], caseSets, topGroups }
  }, [data])
  const { total, todo, high, doing, review, autoRate, grpMap, groupSeg, catMap, topCat, statusDist, maxStatus, chMap, channels, areaMap, topArea, weeksA, alerts, a0, caseSets, topGroups } = agg
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const caseList = (caseSets[caseTab] || []).slice(0, 4)
  const barData = a0
    ? [{ n: a0.p, l: '직전 주차' }, { n: a0.c, l: '최근 주차', hot: true }]
    : topGroups.map((s, i) => ({ n: s.value, l: s.label, hot: i === 0 }))
  const barMax = Math.max(1, ...barData.map((b) => b.n))
  const anomalyTitle = a0 ? '이상 탐지 현황 알림' : '증상 유형 분포'
  const anomalyCap = a0 ? `${a0.k} ▲${a0.pc}% 급증` : '급증 패턴 없음 · 안정'
  const sampleCase = data.find((v) => v.review) || data.find((v) => v.severity === 'High') || data[0]
  const clsDoneN = data.filter((v) => v.status === '분류 완료').length
  const doneN = data.filter((v) => v.status === '처리 완료').length
  // 우측 AI 브리핑
  const brief = []
  if (todo) brief.push({ t: `처리 필요 VOC ${todo.toLocaleString()}건`, imp: 'hi' })
  if (a0) brief.push({ t: `${a0.k} 급증 ▲${a0.pc}%`, imp: 'hi' })
  if (high) brief.push({ t: `High 리스크 ${high.toLocaleString()}건 집중 관리`, imp: 'mid' })
  brief.push({ t: `자동 분류율 ${autoRate}%`, imp: 'mid' })
  if (review) brief.push({ t: `검토 필요 ${review.toLocaleString()}건`, imp: 'mid' })
  // 키워드 기반 응답(사내망 정책상 실제 AI 호출 대신, 수집 VOC 집계로 답함)
  const ask = (raw) => {
    const q = String(raw || '').trim(); if (!q) return
    const has = (...ks) => ks.some((k) => q.toLowerCase().includes(k.toLowerCase()))
    let a
    if (has('급증', '이상', '추이', '트렌드', '징후', 'spike', 'trend')) {
      a = { title: '이상 징후 · 추이 요약', lines: a0 ? [
        `${a0.k}이(가) 직전 주차 대비 ▲${a0.pc}% 급증했어요.`,
        `최근 주차 ${a0.c.toLocaleString()}건(전주 ${a0.p.toLocaleString()}건) 집중 발생 — 담당 영역 확인이 필요합니다.`,
      ] : ['최근 주차에서 급증 패턴은 감지되지 않았어요. 추이는 안정적입니다.'], act: { label: '추이 상세 보기', onClick: () => goAgent('trends') } }
    } else if (has('검토', '분류', '확인')) {
      a = { title: '검토 필요 케이스', lines: [
        `검토 필요 ${review.toLocaleString()}건이 분류 확인을 기다리고 있어요.`,
        `현재 자동 분류율은 ${autoRate}%입니다.`,
        sampleCase ? `예: “${String(sampleCase.summary || sampleCase.content || '').slice(0, 42)}…”` : null,
      ].filter(Boolean), act: { label: sampleCase ? '케이스 열기' : '케이스 보기', onClick: () => sampleCase ? (openCase && openCase(sampleCase.id)) : goAgent('detail') } }
    } else if (has('개선', '우선순위', '백로그', '요청')) {
      a = { title: '개선 우선순위', lines: [
        '개선 후보는 대응영역 기준으로 모아 백로그에서 우선순위를 매길 수 있어요.',
        `상위 유형: ${topGroups.map((s) => `${s.label} ${s.value.toLocaleString()}건`).join(' · ') || '데이터 없음'}`,
      ], act: { label: '인사이트 리포트 열기', onClick: () => goAgent('insight') } }
    } else if (has('처리', 'high', '하이', '급한', '우선', '리스크')) {
      a = { title: '처리 필요 정리', lines: [
        `처리 필요 ${todo.toLocaleString()}건 · High 리스크 ${high.toLocaleString()}건 · 처리 중 ${doing.toLocaleString()}건.`,
        '분류 보드에서 상태별로 한 번에 처리할 수 있어요.',
      ], act: { label: '분류 보드 열기', onClick: () => goAgent('board') } }
    } else {
      a = { title: 'VOC 현황 요약', lines: [
        `전체 ${total.toLocaleString()}건 · 처리 필요 ${todo.toLocaleString()} · High ${high.toLocaleString()} · 검토 필요 ${review.toLocaleString()}.`,
        `자동 분류율 ${autoRate}% · 상위 유형 ${topGroups.map((s) => `${s.label}(${s.value.toLocaleString()})`).join(' · ') || '없음'}.`,
        a0 ? `이상 징후: ${a0.k} ▲${a0.pc}% 급증.` : '이상 징후: 안정적.',
        "'급증·추이', '검토', '개선', '처리' 같은 키워드로 더 자세히 물어볼 수 있어요.",
      ], act: { label: '추이 상세 보기', onClick: () => goAgent('trends') } }
    }
    setAiAns({ q, ...a })
  }
  const askDemo = (label) => ask(label)
  const sendDemo = (el) => { const v = (el.value || '').trim(); if (!v) return; ask(v); el.value = '' }

  const cardAgent = (
    <div className="hcard">
      <CardHead title="내 VOC Agent" sub="엔진 바로가기" onMore={() => setRail('grid')} />
      <div className="agent-slots">
        <button className="agent-slot" onClick={() => goAgent('inbox')}><div className="as-k"><b>필수</b> · 분류 엔진①</div><div className="as-v">Copilot 분류</div></button>
        <button className="agent-slot" onClick={() => goAgent('selfguide')}><div className="as-k">업무 · 엔진②</div><div className="as-v">셀프 가이드</div></button>
        <button className="agent-slot" onClick={() => setRail('grid')}><div className="as-k">＋ 더보기</div><div className="as-v">둘러보기</div></button>
      </div>
    </div>
  )
  const cardAnomaly = (
    <div className="hcard signature">
      <CardHead title="이상 감지 · 자동 알림" sub={a0 ? `${a0.cur} · 직전 주차 대비` : '최근 안정'} onMore={() => goAgent('trends')} />
      {a0 ? (
        <>
          <div className="metric">
            <div className="metric-l">{a0.label} · {a0.k}</div>
            <div className="metric-main">
              <span className="metric-delta"><span className="arrow">▲</span> {a0.pc}%</span>
              <span className="metric-side">최근 주차 <b>{a0.c.toLocaleString()}</b>건 <span className="muted">(전주 {a0.p.toLocaleString()})</span></span>
            </div>
          </div>
          <AiBox
            q="급증 원인과 대응 방안을 정리했어요. 바로 진행할까요?"
            rows={[
              { tag: 'cause', label: '원인분석', text: `${a0.k} 관련 VOC가 직전 주차 대비 ${a0.pc}% 급증` },
              { tag: 'act', label: '조치결과', text: `최근 주차 ${a0.c.toLocaleString()}건 집중 발생 · 담당 영역 확인 필요` },
              { tag: 'next', label: '후속방안', text: '추이 상세 확인 → 담당 배정 · 셀프 가이드 보강' },
            ]}
            acts={[
              { label: '추이 상세 보기', onClick: () => goAgent('trends') },
              { label: '처리 시작', primary: true, onClick: () => goAgent('board') },
            ]}
          />
        </>
      ) : (
        <div className="calm">최근 주차에서 급증 패턴이 감지되지 않았어요. 추이는 안정적입니다. <button className="link-btn" onClick={() => goAgent('trends')}>추이 상세 보기</button></div>
      )}
    </div>
  )
  const cardCase = (
    <div className="hcard">
      <CardHead title="조치 필요 VOC" onMore={() => goAgent('detail')} />
      <div className="card-tabs">
        <button className={'card-tab' + (caseTab === 'high' ? ' on' : '')} onClick={() => setCaseTab('high')}>High<span className="cnt">{high}</span></button>
        <button className={'card-tab' + (caseTab === 'review' ? ' on' : '')} onClick={() => setCaseTab('review')}>검토필요<span className="cnt">{review}</span></button>
        <button className={'card-tab' + (caseTab === 'doing' ? ' on' : '')} onClick={() => setCaseTab('doing')}>처리중<span className="cnt">{doing}</span></button>
      </div>
      <div className="case-mini">
        {caseList.length ? caseList.map((v) => (
          <div key={v.id} className="case-mini-row" onClick={() => openCase && openCase(v.id)}>
            {v.severity === 'High' && <span className="badge-sev">High</span>}
            <span className="mini-t">{v.summary || v.content}</span>
            <span className="mini-n">{v.cat}</span>
          </div>
        )) : <div className="empty-mini">해당 조건의 케이스가 없어요.</div>}
      </div>
      <AiBox
        q={`처리 필요 ${todo.toLocaleString()}건을 제안 액션으로 한 번에 정리할 수 있어요.`}
        acts={[
          { label: '일괄 처리 시작', primary: true, onClick: () => goAgent('board') },
          { label: '개별 확인', onClick: () => goAgent('detail') },
        ]}
      />
    </div>
  )

  const todoCards = (
    <div className="todo-cards">
      <div className="todo-card">
        <div className="tc-head"><span>{anomalyTitle}</span></div>
        <div className="tc-bars">{barData.map((b, i) => (
          <div key={i} className="tc-bar"><div className={'tc-bcol' + (b.hot ? ' mag' : '')} style={{ height: Math.max(6, Math.round(b.n / barMax * 100)) + '%' }} /><span className="tc-bn">{b.n.toLocaleString()}건</span><span className="tc-bl" title={b.l}>{b.l}</span></div>
        ))}</div>
        <div className="tc-cap">{anomalyCap}</div>
        <button className="ai-pill-btn" onClick={() => goAgent('trends')}>추이 상세</button>
      </div>
      <div className="todo-card">
        <div className="tc-head"><span>검토 필요 케이스 정리</span></div>
        <div className="tc-quote">“{sampleCase ? (sampleCase.summary || sampleCase.content) : '검토 대상이 없어요'}”</div>
        <div className="tc-cap">검토필요 {review.toLocaleString()}건 · 분류 확인 필요</div>
        <button className="ai-pill-btn" onClick={() => sampleCase ? (openCase && openCase(sampleCase.id)) : goAgent('detail')}>케이스 열기</button>
      </div>
      <div className="todo-card">
        <div className="tc-head"><span>처리 라인 진행</span></div>
        <div className="tc-stepper">
          <div className="step done"><span className="dot">{clsDoneN.toLocaleString()}</span><span className="s-l">분류 완료</span></div>
          <span className="step-line" />
          <div className="step doing"><span className="dot">{doing.toLocaleString()}</span><span className="s-l">처리 중</span></div>
          <span className="step-line" />
          <div className="step"><span className="dot">{doneN.toLocaleString()}</span><span className="s-l">처리 완료</span></div>
        </div>
        <button className="ai-pill-btn primary" onClick={() => goAgent('board')}>분류 보드 열기</button>
      </div>
    </div>
  )

  // 홈: 우측 풀하이트 AI 독 — 이미지1
  const aiPanel = (
    <aside className="home-dock">
      <div className="dock-head"><span className="dock-spark">✦</span><b>VOC Copilot</b><span className="dock-date">오늘의 브리핑</span></div>
      <div className="dock-body">
        <h3>무엇을 도와드릴까요?</h3>
        <div className="brief-l">todo 브리핑</div>
        <div className="brief-box">{(brief.slice(0, 4)).map((b, i) => (
          <div key={i} className="brief-item"><span className="b-t">{b.t}</span><span className={'imp ' + b.imp}>{b.imp === 'hi' ? '중요도 높음' : '중요도 보통'}</span></div>
        ))}</div>
        <div className="chips">
          <button className="chip-btn" onClick={() => goAgent('trends')}>이상 징후 요약</button>
          <button className="chip-btn" onClick={() => goAgent('detail')}>처리 필요 정리</button>
          <button className="chip-btn" onClick={() => goAgent('insight')}>개선 우선순위</button>
        </div>
        <div className="ai-input as-launch" role="button" tabIndex={0} onClick={() => setAiMode && setAiMode(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAiMode && setAiMode(true) } }}>
          <div className="ai-i-top"><span className="ai-spark">✦</span>AI</div>
          <input readOnly placeholder="VOC 관련 무엇이든 물어보세요" onFocus={() => setAiMode && setAiMode(true)} />
          <div className="ai-i-bot">
            <div className="ai-i-tools"><span /></div>
            <button className="ai-send" aria-label="AI 워크스페이스 열기">↑</button>
          </div>
        </div>
        <p className="ai-foot">사내 네트워크 정책으로 데모에서는 실제 AI 호출 대신 키워드 기반으로 동작합니다.</p>
      </div>
    </aside>
  )

  // 펼침 AI 워크스페이스 — 이미지2 (좌측 카드 레일 + 중앙 AI)
  const aiWorkspace = (
    <div className="home-ai-work">
      <div className="aiw-side">
        {cardAgent}
        {cardAnomaly}
        {cardCase}
      </div>
      <div className="aiw-main">
        <div className="aiw-band"><span className="aiw-sub">AI 시작하기</span></div>
        <div className="aiw-body">
          <div className="aiw-hero">
            <div className="aiw-spark">✦</div>
            <h2>안녕하세요, <b>{name}</b> 님<span className="dot">.</span></h2>
          </div>
          <div className="aiw-inputbox">
            <div className="ai-i-top"><span className="ai-spark">✦</span>AI</div>
            <input autoFocus placeholder="어떤 일이든 시작해보세요 — VOC 분류 · 추이 · 개선" onKeyDown={(e) => { if (e.key === 'Enter') sendDemo(e.currentTarget) }} />
            <div className="ai-i-bot">
              <div className="ai-i-tools"><span /></div>
              <button className="ai-send" onClick={(e) => sendDemo(e.currentTarget.closest('.aiw-inputbox').querySelector('input'))}>↑</button>
            </div>
          </div>
          {aiAns && (
            <div className="aiw-answer">
              <div className="aiw-a-head"><span className="ai-spark">✦</span><b>{aiAns.title}</b><button className="aiw-a-x" aria-label="닫기" onClick={() => setAiAns(null)}>✕</button></div>
              <div className="aiw-a-q">“{aiAns.q}”</div>
              <ul className="aiw-a-list">{aiAns.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {aiAns.act && <button className="ai-pill-btn primary" onClick={aiAns.act.onClick}>{aiAns.act.label}</button>}
              <p className="micro">사내 네트워크 정책상 실제 AI 호출 대신 수집된 VOC 집계로 응답합니다.</p>
            </div>
          )}
          <div className="aiw-chips">
            <button className="chip-btn" onClick={() => ask('오늘 급증 VOC 정리해줘')}>오늘 급증 VOC 정리해줘</button>
            <button className="chip-btn" onClick={() => ask('검토필요 케이스 보여줘')}>검토필요 케이스 보여줘</button>
            <button className="chip-btn" onClick={() => ask('개선 우선순위 알려줘')}>개선 우선순위 알려줘</button>
          </div>
          <div className="todo-rec"><span className="tr-l">오늘의 todo 추천</span><button className="refresh" onClick={() => askDemo('todo 새로고침')}>↻ 새로고침</button></div>
          {todoCards}
          <p className="ai-foot">사내 네트워크 정책으로 데모에서는 실제 AI 호출 대신 키워드 기반으로 동작합니다. todo는 수집된 VOC 기준 추천입니다.</p>
        </div>
      </div>
    </div>
  )

  if (aiMode) return aiWorkspace

  return (
    <div className="home-shell">
      <section className="home-scroll">
        <div className="home-inner">
          <div className="home-head">
            <h1>안녕하세요, <b>{name}</b> 님<span className="dot">.</span></h1>
            <p>Simply U+로 더 나은 VOC 운영을 만들어요 · 오늘의 현황과 처리할 일을 한 곳에서.</p>
          </div>

          {total === 0 ? (
            <div className="hcard empty-home">
              <CardHead title="VOC 현황" sub="아직 데이터 없음" />
              <div className="empty-mini">수집된 VOC가 아직 없어요. <b>VOC 수집·입력</b>에서 직접 입력하거나 엑셀을 붙여넣으면 이상 감지·증상 유형·처리 현황이 자동으로 집계됩니다.</div>
              <div className="ai-acts"><button className="ai-pill-btn primary" onClick={() => goAgent('inbox')}>VOC 입력하러 가기</button><button className="ai-pill-btn" onClick={() => setRail('grid')}>솔루션 설명</button></div>
            </div>
          ) : (
            <div className="home-cols">

            {/* 핵심 카드 — 펼침 사이드와 공유 */}
            {cardAgent}

            {/* 오늘의 VOC (To-do 스탯) */}
            <div className="hcard">
              <CardHead title="오늘의 VOC" sub={`자동 분류율 ${autoRate}%`} onMore={() => goAgent('inbox')} />
              <div className="stat-row">
                <div className="stat-col"><div className="stat-l">처리 필요</div><div className="stat-v">{todo.toLocaleString()}</div></div>
                <div className="stat-col"><div className="stat-l">High 리스크</div><div className="stat-v warn">{high.toLocaleString()}</div></div>
                <div className="stat-col"><div className="stat-l">검토 필요</div><div className="stat-v">{review.toLocaleString()}</div></div>
              </div>
            </div>

            {cardAnomaly}

            {cardCase}

            {/* 증상 유형 분류 (도넛) */}
            <div className="hcard">
              <CardHead title="증상 유형 분류" sub="전체 누적" onMore={() => goAgent('trends')} />
              <div className="donut-wrap">
                <Donut segments={groupSeg} total={total} centerLabel="전체 VOC" />
                <ul className="donut-legend">{groupSeg.map((s) => <li key={s.label}><span className="lg-dot" style={{ background: s.color }} />{s.label}<b>{pct(s.value)}%</b></li>)}</ul>
              </div>
            </div>

            {/* 주요 이슈 TOP 5 */}
            <div className="hcard">
              <CardHead title="주요 이슈 TOP 5" sub="표준분류 기준" onMore={() => goAgent('insight')} />
              <ul className="mini-list">{topCat.map((it, i) => (
                <li key={it.t}><span className="mini-rank">{i + 1}</span><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
              ))}</ul>
            </div>

            {/* 진행상황 분포 */}
            <div className="hcard">
              <CardHead title="진행상황 분포" onMore={() => goAgent('board')} />
              <div className="funnel">{statusDist.map((f) => (
                <div key={f.k} className="fun-row"><span className="fun-k">{f.k}</span><div className="fun-bar-wrap"><div className="fun-bar" style={{ width: (f.n / maxStatus * 100) + '%' }}>{f.n.toLocaleString()}</div></div></div>
              ))}</div>
            </div>

            {/* 채널별 분포 */}
            <div className="hcard">
              <CardHead title="채널별 분포" sub={`합계 ${total.toLocaleString()}건`} />
              <div className="hbars">{channels.slice(0, 6).map((c) => (
                <div key={c.key} className="hbar-row">
                  <span className="hbar-k"><ChannelIcon channel={c.key} size={15} />{c.key}</span>
                  <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, c.n / channels[0].n * 100) + '%' }} /></div>
                  <span className="hbar-n">{c.n.toLocaleString()}건</span>
                </div>
              ))}</div>
            </div>

            {/* 셀프 해결 & 개선 */}
            <div className="hcard">
              <CardHead title="셀프 해결 & 개선" sub="접수 전 차단 · 과제화" />
              <div className="sub-block">
                <div className="sub-l">자주 묻는 유형 → 셀프 가이드</div>
                <ul className="mini-list">{topCat.slice(0, 3).map((it) => (
                  <li key={it.t}><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
                ))}</ul>
              </div>
              <div className="sub-block">
                <div className="sub-l">개선 우선순위 후보 (대응영역)</div>
                <ul className="mini-list">{topArea.map((it) => (
                  <li key={it.t}><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
                ))}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => goAgent('selfguide')}>셀프 가이드</button><button className="ai-pill-btn" onClick={() => goAgent('insight')}>인사이트 리포트</button></div>
            </div>

            {/* 즐겨찾는 메뉴 */}
            <div className="hcard">
              <CardHead title="즐겨찾는 메뉴" onMore={() => setRail('grid')} />
              <div className="fav-grid">
                {[['inbox', 'VOC 입력'], ['board', '분류 보드'], ['trends', '추이'], ['detail', 'VOC 처리'], ['insight', '인사이트'], ['selfguide', '셀프 가이드']].map(([k, l]) => (
                  <button key={k} className="fav-cell" onClick={() => goAgent(k)}>{l}</button>
                ))}
              </div>
              <AiBox q="자주 보는 화면을 홈에 더 추가해드릴까요?" acts={[{ label: '메뉴 편집', onClick: () => askDemo('즐겨찾기 편집') }]} />
            </div>

            {/* 오늘의 업무 (포털 데모) */}
            <div className="hcard">
              <CardHead title="오늘의 업무" sub="메일 · 알림" />
              <div className="sub-block">
                <div className="sub-l">메일</div>
                <ul className="home-list">{[['VOC 주간 리포트 공유', 'CX기획팀 · 10:24'], ['앱스토어 평점 모니터링 알림', '운영봇 · 어제']].map(([t, m], i) => <li key={i}><span className="hl-t">{t}</span><span className="hl-m">{m}</span></li>)}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => setRail('mail')}>메일</button><button className="ai-pill-btn" onClick={() => goAgent('insight')}>인사이트 리포트</button></div>
            </div>

          </div>
          )}
        </div>
      </section>
      {aiPanel}
    </div>
  )
}
/* ---------- [메일] 사내 웹메일 유사 UI (데모 받은함 + VOC 발송 이력=보낸함) ---------- */
const MAIL_FOLDERS = [
  ['inbox', '받은메일함'], ['sent', '보낸메일함'], ['draft', '임시보관함'],
  ['sched', '예약메일함'], ['spam', '스팸메일함'], ['trash', '휴지통'],
]
const MAIL_ARCHIVE = ['VOC 리포트', '셀프가이드', '개선 과제']
const INBOX_DEMO = [
  { id: 'm1', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[VOC High] 요금/청구 이중납부 급증 — 담당 전달 요청', size: '12.4KB', date: '26.06.22 09:41', star: true, attach: false, unread: true, body: '금주 요금/청구 영역에서 이중납부 관련 VOC가 전주 대비 38% 증가했습니다.\nHigh 우선순위 6건을 담당 조직에 전달합니다.\n\n· 대응영역: MY › 요금/납부/청구\n· 대표 사례: VOC-2026-0612 외 5건\n· 권장 조치: 청구 내역 점검 → 정정/환불, 안내 문자 발송\n\n— U+ VOICE · VOC Action Copilot (데모)' },
  { id: 'm2', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[이상 감지] 장애/오류 그룹 급증 알림 (02월 4주차)', size: '9.1KB', date: '26.06.22 08:30', star: false, attach: false, unread: true, body: '앱/웹 접속불가 관련 VOC가 단시간 급증했습니다. 추이 화면에서 확인하세요. (데모)' },
  { id: 'm3', type: 'Ex', from: 'Figma', ext: true, subj: '2 new comments in 너겟 3.0 / VOC 대시보드', size: '58.2KB', date: '26.06.21 17:05', star: false, attach: false, unread: true, body: 'VOC 대시보드 시안에 코멘트 2건이 추가되었습니다. (데모)' },
  { id: 'm4', type: 'T', from: 'CX기획팀', ext: false, subj: 'VOC 주간 리포트 공유 (06/16~06/22)', size: '176.9KB', date: '26.06.21 15:35', star: true, attach: true, unread: false, body: '금주 VOC 주간 리포트를 공유합니다. 첨부 참고 바랍니다. (데모)' },
  { id: 'm5', type: 'T', from: '디자인시스템스쿼드', ext: false, subj: '[검수요청] 셀프 가이드 콘텐츠 1차 검수', size: '431.3KB', date: '26.06.20 08:13', star: false, attach: true, unread: false, body: '셀프 가이드 콘텐츠 초안 검수를 요청드립니다. (데모)' },
  { id: 'm6', type: 'Ex', from: 'Jira', ext: true, subj: '[Jira] DCBGIT-40580 에서 사용자를 멘션했습니다', size: '19.1KB', date: '26.06.20 10:34', star: false, attach: false, unread: false, body: 'VOC 분류 개선 티켓에 멘션되었습니다. (데모)' },
  { id: 'm7', type: 'T', from: 'Work Innovation CoE', ext: false, subj: '데이터 설계 과정 교육 신청 안내 (~6/25)', size: '88.0KB', date: '26.06.19 15:35', star: false, attach: false, unread: false, body: '데이터 설계 교육 신청 안내입니다. (데모)' },
  { id: 'm8', type: 'B', from: 'App Store 모니터링', ext: false, subj: '앱스토어 평점 모니터링 알림 — 평균 4.3 (▲0.1)', size: '7.7KB', date: '26.06.19 09:27', star: false, attach: false, unread: false, body: '주간 앱스토어 평점이 0.1 상승했습니다. (데모)' },
  { id: 'm9', type: 'Ex', from: 'Figma', ext: true, subj: '1 new file pinned to 디지털사업트라이브', size: '46.8KB', date: '26.06.18 10:35', star: false, attach: false, unread: false, body: '새 파일이 고정되었습니다. (데모)' },
  { id: 'm10', type: 'T', from: 'CX운영팀', ext: false, subj: '[공지] 하반기 VOC 처리 SLA 기준 변경 안내', size: '24.4KB', date: '26.06.18 14:43', star: false, attach: false, unread: false, body: '하반기 VOC 처리 SLA 기준이 변경됩니다. (데모)' },
  { id: 'm11', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[VOC] 로밍 문의 패턴 리포트 — 출국 전 가입 안내 강화 제안', size: '11.2KB', date: '26.06.17 11:20', star: false, attach: false, unread: false, body: '로밍 문의가 출국 직전에 집중됩니다. 사전 안내 푸시를 제안합니다. (데모)' },
  { id: 'm12', type: 'T', from: '맹희경/디지털가입CX', ext: false, subj: '너겟 3.0 / 친구추천 고도화 검토 회신', size: '52.2KB', date: '26.06.17 09:52', star: false, attach: false, unread: false, body: '검토 의견 회신드립니다. (데모)' },
]
const MailType = ({ t }) => <span className={'mtype mtype-' + t} title={t === 'Ex' ? '외부' : t === 'B' ? '시스템' : '사내'}>{t}</span>
const Clip = () => <svg className="mclip" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
function MailApp({ sentLog, notify }) {
  const [folder, setFolder] = useState('inbox')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const PAGE = 10
  const sent = (sentLog || []).map((s) => ({
    id: s.id, type: s.kind === '메일' ? 'T' : 'B', from: s.owner || '담당자', ext: false,
    subj: `[${s.kind}] ${s.content}`, size: '—', date: s.date, star: false, attach: false, unread: false,
    body: `유형: ${s.kind}\n수신: ${s.to}\n케이스: ${s.caseId}\n\n${s.content}` }))
  const source = folder === 'inbox' ? INBOX_DEMO : folder === 'sent' ? sent : []
  const list = q ? source.filter((m) => (m.subj + ' ' + m.from).toLowerCase().includes(q.toLowerCase())) : source
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages)
  const items = list.slice((cur - 1) * PAGE, cur * PAGE)
  const unread = INBOX_DEMO.filter((m) => m.unread).length
  const go = (f) => { setFolder(f); setPage(1); setQ(''); setOpen(null) }
  const demo = (label) => notify && notify.toast(`${label} (데모 — 실제 동작 안 함)`)
  const count = (f) => f === 'inbox' ? unread : f === 'sent' ? sent.length : f === 'trash' ? 0 : 0
  return (
    <div className="screen portal-screen mailwrap">
      <DemoBanner>받은메일함은 예시 데이터이며, 보낸메일함은 VOC Agent 발송 이력과 연동됩니다.</DemoBanner>
      <div className="mailapp">
        <aside className="mbox-side">
          <button className="mbox-compose" onClick={() => demo('메일쓰기')}>메일쓰기</button>
          <div className="mbox-quick">
            <button onClick={() => demo('안읽음')}><b>{unread}</b><span>안읽음</span></button>
            <button onClick={() => demo('별표')}><b>★</b><span>별표</span></button>
            <button onClick={() => demo('첨부')}><b>◍</b><span>첨부</span></button>
          </div>
          <div className="mbox-group">
            <div className="mbox-gh">메일함</div>
            {MAIL_FOLDERS.map(([k, l]) => (
              <button key={k} className={'mbox-item' + (folder === k ? ' on' : '')} onClick={() => go(k)}>
                <span>{l}</span>{count(k) > 0 && <span className="mbox-count">{count(k)}</span>}
              </button>
            ))}
          </div>
          <div className="mbox-group">
            <div className="mbox-gh">보관함</div>
            {MAIL_ARCHIVE.map((a) => <button key={a} className="mbox-item sub" onClick={() => demo(a)}><span>{a}</span></button>)}
          </div>
          <div className="mbox-storage"><div className="mbox-bar"><span style={{ width: '12%' }} /></div><span className="micro">136.8MB / 2GB</span></div>
        </aside>

        <section className="mbox-main">
          {open ? (
            <div className="mread">
              <div className="mbox-toolbar">
                <button className="mt-btn" onClick={() => setOpen(null)}>← 목록</button>
                <button className="mt-btn" onClick={() => demo('답장')}>답장</button>
                <button className="mt-btn" onClick={() => demo('전달')}>전달</button>
                <button className="mt-btn" onClick={() => demo('삭제')}>삭제</button>
              </div>
              <div className="mread-head">
                <h2>{open.subj}</h2>
                <div className="mread-meta"><MailType t={open.type} />{open.ext && <span className="ext-badge">외부메일</span>}<span className="mr-from">{open.from}</span><span className="mr-date">{open.date}</span></div>
              </div>
              <pre className="mread-body">{open.body || '(내용 없음)'}</pre>
            </div>
          ) : (
            <>
              <div className="mbox-toolbar">
                <div className="mt-title">{MAIL_FOLDERS.find(([k]) => k === folder)[1]}</div>
                <div className="mt-search"><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="메일 검색 (제목·보낸사람)" /></div>
                <div className="mt-tools">
                  {['읽음', '삭제', '이동', '답장', '전달', '스팸신고'].map((b) => <button key={b} className="mt-btn" onClick={() => demo(b)}>{b}</button>)}
                </div>
              </div>
              <div className="mbox-listhead">
                <span className="ml-c">전체 <b>{list.length}</b></span>
                <span className="ml-sort">보낸사람 · 제목 · 크기 · <b>날짜▾</b></span>
              </div>
              {items.length ? (
                <ul className="mbox-list">
                  {items.map((m) => (
                    <li key={m.id} className={'mbox-row' + (m.unread ? ' unread' : '')} onClick={() => setOpen(m)}>
                      <MailType t={m.type} />
                      <span className="mr-star">{m.star ? '★' : ''}</span>
                      <span className="mr-from" title={m.from}>{m.from}</span>
                      {m.ext && <span className="ext-badge">외부메일</span>}
                      <span className="mr-subj">{m.subj}{m.attach && <Clip />}</span>
                      <span className="mr-size">{m.size}</span>
                      <span className="mr-date">{m.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel empty-panel">{folder === 'sent' ? 'VOC Agent › VOC 처리에서 메일/문자를 발송(데모)하면 여기에 보낸 메일로 기록됩니다.' : '메일이 없습니다.'}</div>
              )}
              {pages > 1 && (
                <div className="mbox-pager">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
function CalendarApp() {
  const sch = [['10:00', '11:00', 'VOC 분류 기준 리뷰', 'CX기획'], ['14:00', '15:00', '개선 백로그 우선순위 회의', '디지털CX'], ['16:30', '17:00', '셀프 가이드 시나리오 점검', '디자인시스템']]
  return (
    <div className="screen portal-screen">
      <PageHead title="일정" sub="오늘 일정 · 데모" />
      <DemoBanner>일정은 예시이며,</DemoBanner>
      <div className="panel"><ul className="sched-list">{sch.map(([s, e, t, who], i) => (
        <li key={i}><span className="sc-time">{s}<small>–{e}</small></span><span className="sc-bar" /><span className="sc-body"><b>{t}</b><span className="muted">{who}</span></span></li>
      ))}</ul></div>
    </div>
  )
}
/* ---------- [조직도] 사내 조직 디렉터리 유사 UI (트리 + 프로필 · 데모/마스킹) ---------- */
const ORG_TREE = {
  name: 'LG유플러스', children: [
    { name: 'CEO' },
    { name: 'Consumer부문', children: [
      { name: 'Consumer기획담당' },
      { name: 'Consumer인사담당' },
      { name: '모바일/디지털사업그룹', children: [
        { name: '모바일사업담당' },
        { name: '요금상품담당' },
        { name: '디바이스/Seg담당' },
        { name: '디지털CX트라이브', children: [
          { name: '디지털CX전략팀' },
          { name: '디지털커머스CX팀' },
          { name: '디지털통합CX팀', people: ['p_khg', 'p_t1', 'p_t2'] },
          { name: '디자인시스템스쿼드', people: ['p_lst', 'p_lead', 'p_ux', 'p_fe', 'p_res', 'p_pm'] },
          { name: '디지털혜택CX팀' },
          { name: '디지털가입CX스쿼드' },
          { name: 'AI검색TF' },
        ] },
      ] },
      { name: 'MVNO사업담당' },
    ] },
  ],
}
const ORG_OPEN_DEFAULT = ['LG유플러스', 'Consumer부문', '모바일/디지털사업그룹', '디지털CX트라이브', '디자인시스템스쿼드']
const BREAD = 'Consumer부문 › 모바일/디지털사업그룹 › 디지털CX트라이브'
const ORG_PROFILES = {
  p_lst: { name: '이성택', title: 'UX Architect', team: '디자인시스템스쿼드', email: 'ds.architect@uplus-demo.kr', phone: '010-****-****', work: ['UX Architect', '[2025~] Communication service UX', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_khg: { name: '김형걸', title: 'CX 책임', team: '디지털통합CX팀', email: 'cx.lead@uplus-demo.kr', phone: '010-****-****', work: ['CX 책임', 'VOC 대응·개선 총괄', '- Copilot 경진대회 운영'], mission: '고객을 위한 디지털통합CX팀 미션' },
  p_lead: { name: '강도현', title: '스쿼드 리드', team: '디자인시스템스쿼드', email: 'ds.lead@uplus-demo.kr', phone: '010-****-****', work: ['Design System Lead', '[2024~] CX 디자인시스템 총괄', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_ux: { name: '이도현', title: 'UX Architect', team: '디자인시스템스쿼드', email: 'ds.ux@uplus-demo.kr', phone: '010-****-****', work: ['UX Architect', '[2025~] Communication service UX', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_fe: { name: '정우진', title: 'Frontend Engineer', team: '디자인시스템스쿼드', email: 'ds.fe@uplus-demo.kr', phone: '010-****-****', work: ['Frontend Engineer', 'React · 디자인시스템 컴포넌트', '- VOC Action Copilot 프로토타입'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_res: { name: '김하늘', title: 'UX Researcher', team: '디자인시스템스쿼드', email: 'ds.res@uplus-demo.kr', phone: '010-****-****', work: ['UX Researcher', 'VOC·사용성 리서치', '- 셀프 가이드 콘텐츠 검증'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_pm: { name: '최민재', title: 'Product Manager', team: '디자인시스템스쿼드', email: 'ds.pm@uplus-demo.kr', phone: '010-****-****', work: ['Product Manager', 'CX 프로덕트 기획', '- VOC 대응 프로세스 개선'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_t1: { name: '한지우', title: 'CX 기획', team: '디지털통합CX팀', email: 'cx.plan@uplus-demo.kr', phone: '010-****-****', work: ['CX Planner', 'VOC 운영·리포팅'], mission: '고객을 위한 디지털통합CX팀 미션' },
  p_t2: { name: '오세훈', title: 'CX 데이터', team: '디지털통합CX팀', email: 'cx.data@uplus-demo.kr', phone: '010-****-****', work: ['CX Data Analyst', 'VOC 분류·지표 분석'], mission: '고객을 위한 디지털통합CX팀 미션' },
}
function initials(n) { return (n || '·').slice(0, 1) }
function OrgApp({ notify }) {
  const [sel, setSel] = useState('p_lst')
  const [openSet, setOpenSet] = useState(() => new Set(ORG_OPEN_DEFAULT))
  const [q, setQ] = useState('')
  const toggle = (n) => setOpenSet((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x })
  const demo = (l) => notify && notify.toast(`${l} (데모 — 실제 동작 안 함)`)
  const p = ORG_PROFILES[sel] || ORG_PROFILES.p_ux
  const matches = q ? Object.entries(ORG_PROFILES).filter(([, v]) => (v.name + v.title + v.team).toLowerCase().includes(q.toLowerCase())) : null
  const Node = ({ node, depth }) => {
    const kids = node.children, ppl = node.people
    const hasKids = !!(kids || ppl)
    const isOpen = openSet.has(node.name)
    return (
      <div>
        <div className="org-node" style={{ paddingLeft: depth * 13 + 8 }} onClick={() => hasKids && toggle(node.name)}>
          <span className="org-tog">{hasKids ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className="org-nm">{node.name}</span>
        </div>
        {isOpen && kids && kids.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}
        {isOpen && ppl && ppl.map((id) => {
          const pp = ORG_PROFILES[id] || { name: id }
          return <div key={id} className={'org-person' + (sel === id ? ' on' : '')} style={{ paddingLeft: (depth + 1) * 13 + 14 }} onClick={() => setSel(id)}><span className="org-pdot" />{pp.name} 님</div>
        })}
      </div>
    )
  }
  return (
    <div className="screen portal-screen mailwrap">
      <DemoBanner>조직 정보·연락처는 데모용 예시이며(개인정보 마스킹),</DemoBanner>
      <div className="orgapp">
        <aside className="org-side">
          <div className="org-search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="사원 / 부서 검색" />{q && <button onClick={() => setQ('')}>×</button>}</div>
          <div className="org-tree">
            {matches ? (
              matches.length ? matches.map(([id, v]) => (
                <div key={id} className={'org-person' + (sel === id ? ' on' : '')} style={{ paddingLeft: 12 }} onClick={() => setSel(id)}><span className="org-pdot" />{v.name} 님 <span className="muted">· {v.team}</span></div>
              )) : <div className="org-empty">검색 결과가 없습니다.</div>
            ) : <Node node={ORG_TREE} depth={0} />}
          </div>
        </aside>

        <section className="org-profile">
          <div className="op-banner">
            <div className="op-banner-actions">
              <button onClick={() => demo('프로필 정보 수정')}>프로필 정보 수정</button>
              <button onClick={() => demo('배경이미지 변경')}>배경이미지 변경</button>
            </div>
          </div>
          <div className="op-card">
            <div className="op-id">
              <div className="op-avatar">{initials(p.name)}</div>
              <div className="op-idmain">
                <div className="op-name">{p.name} <span className="op-title">· {p.title}</span></div>
                <div className="op-bread">{BREAD} › {p.team}</div>
                <div className="op-contact">
                  <span className="op-mode">선택근무(09:30~21:00)</span>
                  <span className="op-c"><b>이메일</b> {p.email}</span>
                  <span className="op-c"><b>연락처</b> {p.phone}</span>
                  <span className="op-c"><b>근무지</b> 서울 강서구 마곡 (용산사옥) · 데모</span>
                </div>
                <div className="op-btns">
                  <button onClick={() => demo('칭찬/감사 메시지 보내기')}>칭찬/감사 메시지 보내기</button>
                  <button onClick={() => demo('칭찬/감사 메시지함')}>칭찬/감사 메시지함</button>
                </div>
              </div>
            </div>
            <div className="op-stats">
              <div className="ops-row"><div className="ops-k">도전 등록률</div><div className="ops-v"><div className="ring"><span>0%</span></div></div><div className="ops-d"><b className="magenta">{p.mission}</b></div></div>
              <div className="ops-row"><div className="ops-k">과제 공감수</div><div className="ops-v"><span className="heart">♥ 0</span></div><div className="ops-d">AX 기반 일하는 방식 변화를 위한 나의 과제를 등록해주세요. <span className="muted">(데모)</span></div></div>
              <div className="ops-row"><div className="ops-k">현재 업무</div><div className="ops-v" /><div className="ops-d"><ul className="op-work">{p.work.map((w, i) => <li key={i}>{w}</li>)}</ul></div></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
function ApprovalApp({ notify }) {
  const rows = [['4월 VOC 개선 과제 승인', '디자인시스템스쿼드', '대기'], ['셀프 가이드 콘텐츠 게시', 'VOC운영팀', '대기'], ['3월 VOC 리포트 결재', 'CX기획팀', '완료']]
  return (
    <div className="screen portal-screen">
      <PageHead title="결재" sub="결재 대기·이력 · 데모" />
      <DemoBanner>결재 항목은 예시이며,</DemoBanner>
      <div className="panel"><table className="vtable"><thead><tr><th>문서</th><th>상신</th><th>상태</th><th></th></tr></thead>
        <tbody>{rows.map(([t, who, st], i) => (
          <tr key={i}><td>{t}</td><td className="muted nowrap">{who}</td><td><span className={'appr ' + (st === '완료' ? 'appr-done' : 'appr-wait')}>{st}</span></td><td>{st === '대기' && <button className="btn btn-ghost sm" onClick={() => notify.toast('결재 승인 (데모)')}>승인</button>}</td></tr>
        ))}</tbody></table></div>
    </div>
  )
}
/* ---------- [확장 로드맵] Phase 2 — U+one 앱 선제조치 임베드 (콘셉트) ---------- */
function Phase2({ notify }) {
  const demo = (l) => notify && notify.toast(`${l} (콘셉트 데모 — 실제 동작 안 함)`)
  const phases = [
    { tag: 'AS-IS', t: '사후 대응', d: '상담·콜 인입 후 수기 처리' },
    { tag: 'PHASE 1', t: '내부 VOC Copilot', d: '자동 분류·대응·인사이트 (현재)', on: true },
    { tag: 'PHASE 2', t: 'U+one 선제조치', d: '고객 앱에서 VOC 발생 전 차단', next: true },
  ]
  const steps = [
    { t: '① 청구 이상 감지', d: '요금 증가·신규 결제를 내부 엔진이 먼저 포착' },
    { t: '② 선제 버블', d: '청구서 진입 시 "원인 볼까요?" 한 줄 제안' },
    { t: '③ AI 분석 패널', d: '증가 원인과 항목별 근거를 바로 제시' },
    { t: '④ 인앱 액션', d: '요금제 변경·로밍 차단·상담 연결을 그 자리에서' },
    { t: '⑤ VOC 피드백', d: '처리·미처리 결과가 내부 Copilot로 돌아가 학습' },
  ]
  const place = [
    { r: '1순위', t: '요금/청구', d: '청구서 화면 · 데이터와 액션이 명확 (MVP)', best: true },
    { r: '2순위', t: '앱/웹 오류·로그인', d: '오류 시점 인앱 복구 가이드로 셀프 해결' },
    { r: '3순위', t: '네트워크/속도', d: '내폰 진단 후 AS 예약 연결' },
    { r: '4순위', t: '로밍', d: '출국 전·해외 도착 시점 사전 안내' },
  ]
  const metrics = [
    { t: '상담 인입 감소율', d: '해당 영역 콜·상담 인입 감소' },
    { t: '인앱 셀프해결률', d: '앱 내에서 종결되는 비율' },
    { t: 'CTA 전환율', d: '요금제 변경·로밍 차단 실행률' },
  ]
  return (
    <div className="screen">
      <div className="page-head"><div>
        <h1 className="page-title">확장 로드맵 — U+one 앱 선제조치</h1>
        <p className="page-sub">내부에서 검증한 분류·대응 엔진을 고객 앱으로 확장해, VOC가 발생하기 전에 막습니다.</p>
      </div></div>

      <h2 className="sec-title">단계 <span className="sec-note">사후 대응 → 내부 Copilot(현재) → 고객 앱 선제조치</span></h2>
      <div className="phase-row">{phases.map((p) => (
        <div key={p.tag} className={'phase-card' + (p.on ? ' on' : '') + (p.next ? ' next' : '')}>
          <span className="phase-tag">{p.tag}</span><b>{p.t}</b><span className="phase-d">{p.d}</span>
        </div>
      ))}</div>
      <div className="phase-note">같은 분류·대응 엔진을 <b>양쪽 끝</b>에서 씁니다 — 내부 Copilot(사후) ↔ U+one 임베드(사전). 앱에서 처리·미처리된 결과가 내부 엔진으로 돌아가 선제 정확도를 높이는 <b>닫힌 루프</b>가 일반 챗봇과의 차별점입니다.</div>

      <h2 className="sec-title">대표 시나리오 <span className="sec-note">요금/청구 선제조치 · 첨부 콘셉트 화면 기준</span></h2>
      <div className="p2-phones">
        <div className="p2-phone-wrap">
          <div className="p2-phone-cap"><span className="p2-step-no">1</span> 청구서 진입 · 선제 버블</div>
          <div className="pd-frame">
            <div className="pd-status"><span>9:41</span><span>ixi ▾</span></div>
            <div className="pd-h">‹ 이번달 청구서</div>
            <div className="pd-amt-l">3월 총 청구금액</div>
            <div className="pd-amt">180,000<span>원</span></div>
            <div className="pd-sub">모바일 (010-65**-84**)</div>
            <div className="pd-tabs"><span className="on">청구내역</span><span>청구내역 상세</span></div>
            <div className="pd-info">
              <div className="pd-info-r"><span>사용기간</span><b>3.1 ~ 3.31</b></div>
              <div className="pd-info-r"><span>청구서 작성일</span><b>2026.3.1</b></div>
              <div className="pd-info-r"><span>납부 방법</span><b>자동이체</b></div>
            </div>
            <div className="pd-bubble"><span className="pd-bubble-i">!</span><span>이번달 요금이 <b>12,300원</b> 늘었어요. 분석된 원인을 확인할까요?</span></div>
          </div>
        </div>
        <div className="p2-arrow" aria-hidden="true">→</div>
        <div className="p2-phone-wrap">
          <div className="p2-phone-cap"><span className="p2-step-no">2</span> 분석 결과 · 인앱 액션</div>
          <div className="pd-frame">
            <div className="pd-status"><span>9:41</span><span>ixi ▾</span></div>
            <div className="pd-h">‹ 이번달 청구서</div>
            <div className="pd-amt-l">3월 총 청구금액</div>
            <div className="pd-amt">180,000<span>원</span></div>
            <div className="pd-card pd-sheet">
              <div className="pd-card-h">분석 결과 <span className="pd-ai">AI가 최근 6개월 분석</span></div>
              <div className="pd-lead">새로운 <b>결제 2건</b>이 발생해 이번달 요금이 <b className="up">12,300원</b> 늘었어요</div>
              <ul className="pd-items">
                <li>월 기본 요금<span>77,500원</span></li>
                <li>OTT 정기 결제<span className="up">↑ 7,900원</span></li>
                <li>로밍 데이터<span className="up">↑ 4,500원</span></li>
                <li>기타<span>4,300원</span></li>
              </ul>
              <div className="pd-cta"><button onClick={() => demo('요금제 변경')}>요금제 변경</button><button className="pri" onClick={() => demo('로밍 데이터 차단')}>로밍 데이터 차단</button></div>
            </div>
          </div>
        </div>
      </div>
      <ol className="p2-steps p2-steps-row">{steps.map((s, i) => (
        <li key={i}><b>{s.t}</b><span>{s.d}</span></li>
      ))}</ol>

      <h2 className="sec-title">적용 우선순위 <span className="sec-note">VOC 볼륨 × 인앱 액션 가능성 × 데이터 가용성</span></h2>
      <div className="effect-row">{place.map((p) => (
        <div key={p.r} className={'effect-card' + (p.best ? ' brand' : '')}><div className="effect-t">{p.r} · {p.t}</div><div className="effect-d">{p.d}</div></div>
      ))}</div>

      <h2 className="sec-title">측정지표</h2>
      <div className="effect-row">{metrics.map((m) => (
        <div key={m.t} className="effect-card"><div className="effect-t">{m.t}</div><div className="effect-d">{m.d}</div></div>
      ))}</div>

      <p className="micro">실제 적용 시 익시(ixi)의 도메인 스킬 카드로 연동하며, 본 화면·수치는 콘셉트 데모입니다.</p>
    </div>
  )
}
function AllMenu({ goAgent, setRail, notify, doc, setDoc }) {
  return (
    <div className="screen portal-screen">
      <div className="soldoc-tabs">
        <button className={'soldoc-tab' + (doc === 'architecture' ? ' on' : '')} onClick={() => setDoc('architecture')}>솔루션 구조 (TO-BE)</button>
        <button className={'soldoc-tab' + (doc === 'prompts' ? ' on' : '')} onClick={() => setDoc('prompts')}>Copilot 프롬프트</button>
        <button className={'soldoc-tab' + (doc === 'phase2' ? ' on' : '')} onClick={() => setDoc('phase2')}>확장 로드맵 (Phase 2)</button>
      </div>
      {doc === 'architecture' && <Architecture />}
      {doc === 'prompts' && <PromptTemplates notify={notify} />}
      {doc === 'phase2' && <Phase2 notify={notify} />}
    </div>
  )
}

/* ---------- 로그인 / 가입 게이트 ---------- */
function Login({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [code, setCode] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => {
    setErr('')
    const e = email.trim().toLowerCase()
    if (!e || !pw) { setErr('이메일과 비밀번호를 입력하세요'); return }
    setBusy(true)
    try {
      const accounts = loadAccounts()
      if (mode === 'signup') {
        if (!isCompanyEmail(e)) { setErr(`회사 이메일(@${COMPANY_DOMAINS.join(', @')})만 가입할 수 있습니다`); return }
        if (code.trim() !== COMPANY_CODE) { setErr('사내 인증 코드가 올바르지 않습니다'); return }
        if (pw.length < 6) { setErr('비밀번호는 6자 이상으로 설정하세요'); return }
        if (accounts.some((a) => a.email === e)) { setErr('이미 가입된 이메일입니다. 로그인하세요.'); return }
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36)
        accounts.push({ email: e, salt, hash: await hashPw(pw, salt) })
        saveAccounts(accounts); setSession(e); onAuthed(e)
      } else {
        const acc = accounts.find((a) => a.email === e)
        if (!acc) { setErr('가입된 계정이 없습니다. 먼저 가입하세요.'); return }
        if (await hashPw(pw, acc.salt) !== acc.hash) { setErr('비밀번호가 일치하지 않습니다'); return }
        setSession(e); onAuthed(e)
      }
    } catch { setErr('처리 중 오류가 발생했습니다 (보안 컨텍스트: https 또는 localhost 필요)') }
    finally { setBusy(false) }
  }
  const onKey = (ev) => { if (ev.key === 'Enter') submit() }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brandlock"><span className="brand-mark lg">U+</span><span className="brand-lock"><b className="brand-svc lg">VOICE</b><span className="brand-desc">VOC Action Copilot</span></span></div>
        <p className="auth-tagline">고객의 목소리를 분석해, 실행 가능한 CX 개선 액션으로 연결하는 AI 서비스</p>
        <p className="auth-sub">사내 전용 — {mode === 'login' ? '로그인 후 이용하세요.' : '회사 이메일과 사내 인증 코드로 가입하세요.'}</p>
        <div className="auth-tabs">
          <button className={'auth-tab' + (mode === 'login' ? ' on' : '')} onClick={() => { setMode('login'); setErr('') }}>로그인</button>
          <button className={'auth-tab' + (mode === 'signup' ? ' on' : '')} onClick={() => { setMode('signup'); setErr('') }}>가입</button>
        </div>
        <label className="auth-field"><span>회사 이메일</span><input className="in-text" type="email" autoComplete="username" placeholder={`name@${COMPANY_DOMAINS[0]}`} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} /></label>
        <label className="auth-field"><span>비밀번호</span><input className="in-text" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'signup' ? '6자 이상' : ''} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={onKey} /></label>
        {mode === 'signup' && <label className="auth-field"><span>사내 인증 코드</span><input className="in-text" placeholder="회사에서 공유받은 코드" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey} /></label>}
        {err && <div className="auth-err">{err}</div>}
        <button className="btn btn-primary auth-submit" disabled={busy} onClick={submit}>{busy ? '처리 중…' : (mode === 'login' ? '로그인' : '가입하고 시작')}</button>
        <p className="auth-slogan">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b></p>
        <p className="auth-note">⚠ 시연용 접근 게이트입니다. 실제 사내 전용 운영에는 사내 SSO 연동 또는 사내망 한정 배포가 필요합니다.</p>
      </div>
    </div>
  )
}

/* ---------- App ---------- */
const TITLES = {
  trends: ['기간별·영역별 추이', 'VOC구분·대응영역 추이와 원문 검색'],
  backlog: ['개선 백로그', '우선순위 매긴 서비스 개선 과제'],
  selfguide: ['셀프 해결 가이드', '엔진② · 접수 전 셀프 해결 시나리오'],
  inbox: ['VOC 수집·입력', '수집 VOC 목록 · 직접 입력 분류'],
  board: ['분류 보드', '4그룹 게이트 + 22개 표준분류'],
  detail: ['VOC 처리', '케이스 분석 및 액션'],
  insight: ['인사이트 리포트', '개선 인사이트와 기대효과'],
  import: ['VOC 결과 불러오기', '사내 에이전트 JSON → 카드'],
}

/* ---------- 자동 시연 (심사용): 화면 자동 이동 + 음성(브라우저 TTS) + 자막 ---------- */
function toSpeech(t) {
  return t.replace(/U\+\s?VOICE/gi, '유플러스 보이스').replace(/U\+one/gi, '유플러스 원')
    .replace(/VOC/g, '브이오씨').replace(/CX/g, '씨엑스').replace(/\bHigh\b/g, '하이').replace(/\bAI\b/g, '에이아이')
}
function buildDemoSteps(hasData, sampleId) {
  const base = [
    { rail: 'grid', doc: 'architecture', text: 'U+ VOICE는 고객의 목소리, VOC를 AI가 자동으로 분류하고 대응까지 만들어 주는 CX 코파일럿입니다.' },
    { rail: 'grid', doc: 'architecture', text: '상담 콜·앱·홈페이지에 흩어진 VOC를 4개 그룹, 22개 표준분류로 자동 정리하고, 감성과 긴급도로 우선순위를 매깁니다.' },
  ]
  const mid = hasData ? [
    { rail: 'agent', screen: 'board', text: '분류된 VOC는 칸반 보드에서 처리 상태별로 한눈에 관리됩니다.' },
    { rail: 'agent', screen: 'detail', caseId: sampleId, text: '각 건마다 AI가 요약·분석·예상 답안, 그리고 고객 문자 초안까지 자동으로 생성합니다. 담당자는 검수만 하면 됩니다.' },
    { rail: 'agent', screen: 'insight', text: '기간별·영역별 추이와 High 리스크를 대시보드로 보고, 개선 우선순위를 자동으로 도출합니다.' },
  ] : [
    { rail: 'grid', doc: 'architecture', text: '각 VOC마다 AI가 요약·분석·예상 답안과 고객 문자 초안까지 자동으로 만들고, 기간별·영역별 추이와 인사이트를 대시보드로 보여 줍니다. 샘플 데이터를 넣으면 실제 화면으로 확인할 수 있어요.' },
  ]
  const tail = [
    { rail: 'grid', doc: 'phase2', text: '그리고 같은 엔진을 U+one 앱에 얹어, 요금이 오른 이유를 고객이 묻기 전에 먼저 알려 주는 선제 조치로 확장됩니다.' },
    { rail: 'grid', doc: 'architecture', text: '고객의 목소리가 서비스 개선으로 이어지는 순간, U+ VOICE입니다.' },
  ]
  return [...base, ...mid, ...tail]
}
function AutoDemo({ nav, hasData, sampleId, onClose }) {
  const steps = useMemo(() => buildDemoSteps(hasData, sampleId), [hasData, sampleId])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)
  const voicesRef = useRef([])
  useEffect(() => {
    const s = synthRef.current; if (!s) return
    const load = () => { voicesRef.current = s.getVoices() }
    load(); s.onvoiceschanged = load
    return () => { if (s) { s.onvoiceschanged = null; s.cancel() } }
  }, [])
  const done = i >= steps.length
  useEffect(() => {
    if (!playing || done) return
    const step = steps[i]; nav(step)
    let cancelled = false, advanced = false
    const t1 = { id: 0 }, t2 = { id: 0 }
    const advance = () => { if (!cancelled && !advanced) { advanced = true; setI((x) => x + 1) } }
    const s = synthRef.current
    if (!muted && s) {
      s.cancel()
      const u = new SpeechSynthesisUtterance(toSpeech(step.text))
      u.lang = 'ko-KR'; u.rate = 1.05
      const ko = voicesRef.current.find((v) => (v.lang || '').toLowerCase().startsWith('ko'))
      if (ko) u.voice = ko
      u.onend = advance; u.onerror = advance
      t1.id = setTimeout(() => { try { s.speak(u) } catch { advance() } }, 280)
      t2.id = setTimeout(advance, Math.max(7000, step.text.length * 280)) // 음성이 막혀도 진행
    } else {
      t1.id = setTimeout(advance, Math.max(3800, step.text.length * 175))
    }
    return () => { cancelled = true; clearTimeout(t1.id); clearTimeout(t2.id); if (synthRef.current) synthRef.current.cancel() }
  }, [i, playing, muted, done]) // eslint-disable-line
  const cur = steps[Math.min(i, steps.length - 1)]
  const close = () => { if (synthRef.current) synthRef.current.cancel(); onClose() }
  return (
    <div className="demo-bar" role="dialog" aria-label="자동 시연">
      <div className="demo-cap">{done ? '시연이 끝났어요 — 핵심은 VOC 자동 분류 · 대응 생성 · 인사이트 · 선제조치 확장입니다.' : cur.text}</div>
      <div className="demo-ctl">
        <span className="demo-tag">● 자동 시연{!done && ` · ${i + 1}/${steps.length}`}</span>
        <span className="demo-dots">{steps.map((_, k) => <span key={k} className={'demo-dot' + (!done && k === i ? ' on' : (k < i || done ? ' past' : ''))} />)}</span>
        <div className="demo-btns">
          <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>‹ 이전</button>
          {done
            ? <button className="primary" onClick={() => { setI(0); setPlaying(true) }}>다시 보기</button>
            : <button className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ 일시정지' : '▶ 재생'}</button>}
          <button onClick={() => setI((x) => x + 1)} disabled={done}>다음 ›</button>
          <button onClick={() => setMuted((m) => !m)}>{muted ? '음성 켜기' : '음성 끄기'}</button>
          <button onClick={close}>✕ 닫기</button>
        </div>
      </div>
    </div>
  )
}
export default function App() {
  const [authEmail, setAuthEmail] = useState(getSession)
  const [screen, setScreen] = useState('inbox')
  const [caseId, setCaseId] = useState('VOC-1001')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState({ open: false, title: '', body: '' })
  const [panelMode, setPanelMode] = useState('split') // 'split'(분할·기본) | 'collapsed'(Nav 전체) | 'expanded'(Agent 전체)
  const [railView, setRail] = useState('home') // 'home'|'agent'|'mail'|'cal'|'org'|'pay'|'grid'
  const [homeAi, setHomeAi] = useState(false) // 홈 우측: false=홈(컴팩트 패널) / true=AI 펼침 워크스페이스
  const [selected, setSelected] = useState([]) // 체크박스로 선택한 케이스 id (대시보드 ↔ Agent 패널 공유)
  const [added, setAdded] = useState(() => (sharedEnabled ? [] : loadAdded())) // 공유 모드면 서버에서, 아니면 localStorage에서
  const [sentLog, setSentLog] = useState(loadSent)
  const [shareState, setShareState] = useState(sharedEnabled ? 'connecting' : 'local') // 'connecting'|'online'|'error'|'local'
  const [showShared, setShowShared] = useState(false) // 공유 저장소 도구 모달 (상단바에서 열기)
  const [solDoc, setSolDoc] = useState('architecture') // 솔루션 설명 탭 (자동 시연이 제어)
  const [demo, setDemo] = useState(false) // 자동 시연 실행 여부
  const seededRef = useRef(false)
  const lastTsRef = useRef('')

  // 공유 모드: 서버에서 전체 로드 + 주기적 폴링으로 실시간 누적
  useEffect(() => {
    if (!sharedEnabled) return
    let cancelled = false
    const mergeIn = (recs) => {
      if (!recs || !recs.length) return
      const hy = hydrate(recs)
      setAdded((prev) => {
        const have = new Set(prev.map((v) => v.id))
        const fresh = hy.filter((v) => !have.has(v.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })
    }
    listAll().then(({ recs, lastTs }) => {
      if (cancelled) return
      lastTsRef.current = lastTs || ''
      setAdded(hydrate(recs))
      setShareState('online')
    }).catch(() => { if (!cancelled) setShareState('error') })
    const t = setInterval(() => {
      listSince(lastTsRef.current).then(({ recs, lastTs }) => {
        if (cancelled) return
        if (lastTs && lastTs > lastTsRef.current) lastTsRef.current = lastTs
        mergeIn(recs)
        setShareState('online')
      }).catch(() => { if (!cancelled) setShareState('error') })
    }, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // 로컬 모드: 내 localStorage가 비어 있으면 배포본 seed.json을 로드(공유 모드에선 사용 안 함)
  useEffect(() => {
    if (sharedEnabled || added.length) return
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((recs) => { if (!cancelled && Array.isArray(recs) && recs.length) { seededRef.current = true; setAdded(hydrate(recs)) } })
      .catch(() => { })
    return () => { cancelled = true }
  }, []) // 최초 1회
  useEffect(() => { saveSent(sentLog) }, [sentLog])
  const addSent = (e) => setSentLog((l) => [{ id: 'S' + Date.now(), date: new Date().toLocaleString('ko-KR'), ...e }, ...l])
  useEffect(() => {
    if (sharedEnabled) return // 공유 모드는 서버가 원본 — localStorage 저장 안 함
    if (seededRef.current) { seededRef.current = false; return } // 공유 seed 로드분은 저장하지 않음(개인 입력만 저장)
    const ok = saveAdded(added)
    if (!ok && added.length) setToast('브라우저 저장 한도를 초과해 일부가 저장되지 않았을 수 있습니다')
  }, [added])
  const notify = useMemo(() => ({
    toast: (m) => { setToast(m); window.clearTimeout(window.__t); window.__t = window.setTimeout(() => setToast(''), 2200) },
    modal: (title, body) => setModal({ open: true, title, body }),
  }), [])
  const openCase = (id) => { setRail('agent'); setCaseId(id); setScreen('detail'); setPanelMode((m) => m === 'collapsed' ? 'split' : m) }
  const goAgent = (s) => { setRail('agent'); if (s) setScreen(s) }
  // 자동 시연 내비게이션 — 한 스텝의 위치로 이동
  const demoNav = (step) => {
    if (!step) return
    if (step.caseId) setCaseId(step.caseId)
    if (step.doc) setSolDoc(step.doc)
    if (step.screen) { setScreen(step.screen); setPanelMode('split') }
    if (step.rail) setRail(step.rail)
  }
  const demoSampleId = (added[0] && added[0].id) || (typeof VOCS !== 'undefined' && VOCS[0] && VOCS[0].id) || 'VOC-1001'
  // 공유 모드: 새 VOC를 서버에 적재(누적). 압축 레코드 배열을 받는다.
  const sharedInsert = (compactRecs) => { if (sharedEnabled) insertMany(compactRecs).catch(() => setToast('공유 저장소 적재 실패 — 네트워크를 확인하세요')) }
  // 공유 저장소 도구(데모): 샘플 시드 / 비우기 — 상단바 버튼에서 호출
  const seedShared = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      const recs = await r.json()
      if (!Array.isArray(recs) || !recs.length) { notify.toast('seed.json이 비어 있어요'); return }
      sharedInsert(recs)
      notify.toast(`샘플 ${recs.length.toLocaleString()}건을 공유 저장소에 넣었어요 (잠시 후 모두에게 표시)`)
    } catch { notify.toast('샘플 시드를 넣지 못했어요') }
  }
  const wipeShared = async () => {
    if (!window.confirm('공유 저장소의 모든 VOC를 삭제합니다.\n로그인한 모든 사용자에게 반영됩니다. 계속할까요?')) return
    try { await clearAll(); setAdded([]); notify.toast('공유 데이터를 비웠어요') } catch { notify.toast('삭제하지 못했어요 — 네트워크를 확인하세요') }
  }
  const updateCases = (ids, patch) => setAdded((prev) => {
    const next = prev.map((v) => ids.includes(v.id) ? { ...v, ...patch } : v)
    if (sharedEnabled) { const changed = next.filter((v) => ids.includes(v.id)); insertMany(toCompact(changed), true).catch(() => { }) }
    return next
  })
  const [t] = TITLES[screen]
  const agentTitle = new Date().toISOString().slice(0, 10) + ' · 선제조치 Copilot'
  if (!authEmail) return <Login onAuthed={setAuthEmail} />
  return (
    <div className="app">
      <IconRail account={authEmail} onLogout={() => { setSession(''); setAuthEmail('') }} notify={notify} railView={railView} setRail={setRail} />
      {railView === 'agent' ? (
        <>
          <SubLNB screen={screen} setScreen={setScreen} />
          <div className={'workspace mode-' + panelMode}>
            <Topbar title={t} mode={panelMode} setMode={setPanelMode} agentTitle={agentTitle} shareState={shareState} sharedEnabled={sharedEnabled} onShareTools={() => setShowShared(true)} />
            <div className="workbody">
              {panelMode !== 'expanded' && (
                <main className="main-nav">
                  <div className="content">
                    {screen === 'trends' && <VOCTrends added={added} openCase={openCase} />}
                    {screen === 'inbox' && <VOCInbox openCase={openCase} notify={notify} added={added} setAdded={setAdded} shared={sharedEnabled} sharedInsert={sharedInsert} />}
                    {screen === 'board' && <ClassificationBoard openCase={openCase} notify={notify} added={added} updateCases={updateCases} />}
                    {screen === 'detail' && <CaseDetail caseId={caseId} notify={notify} added={added} updateCases={updateCases} addSent={addSent} openCase={openCase} />}
                    {screen === 'insight' && <InsightReport added={added} openCase={openCase} />}
                    {screen === 'selfguide' && <SelfGuide added={added} notify={notify} />}
                    {screen === 'import' && <ImportResult notify={notify} added={added} setAdded={setAdded} shared={sharedEnabled} sharedInsert={sharedInsert} openCase={openCase} />}
                  </div>
                </main>
              )}
              {panelMode !== 'collapsed' && (
                <AgentPanel screen={screen} caseId={caseId} added={added} notify={notify} updateCases={updateCases} selected={selected} setSelected={setSelected} openCase={openCase} />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="workspace portal">
          <header className="portal-top">
            <div className="crumb">U+ Work<span className="crumb-sep">›</span><b>{PORTAL_TITLES[railView]}</b></div>
            <div className="pt-right">
              {railView === 'home' && (
                <div className="ai-toggle" role="tablist" aria-label="홈/AI 전환">
                  <button className={homeAi ? '' : 'on'} onClick={() => setHomeAi(false)}>홈</button>
                  <button className={homeAi ? 'on' : ''} onClick={() => setHomeAi(true)}>✦ AI</button>
                </div>
              )}
              <ShareBadge state={shareState} />
              <span className="ai-pill">● 통합 업무 · 데모</span>
            </div>
          </header>
          <main className={'portal-body' + (railView === 'home' ? ' home-body' : '')}>
            {railView === 'home' ? (
              <HomePortal account={authEmail} added={added} goAgent={goAgent} setRail={setRail} openCase={openCase} notify={notify} aiMode={homeAi} setAiMode={setHomeAi} />
            ) : (
              <div className="content">
                {railView === 'mail' && <MailApp sentLog={sentLog} notify={notify} />}
                {railView === 'cal' && <CalendarApp />}
                {railView === 'org' && <OrgApp notify={notify} />}
                {railView === 'pay' && <ApprovalApp notify={notify} />}
                {railView === 'grid' && <AllMenu goAgent={goAgent} setRail={setRail} notify={notify} doc={solDoc} setDoc={setSolDoc} />}
              </div>
            )}
          </main>
        </div>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
      <Modal open={modal.open} title={modal.title} body={modal.body} onClose={() => setModal({ open: false, title: '', body: '' })} />
      {sharedEnabled && showShared && (
        <div className="modal-overlay" onClick={() => setShowShared(false)}>
          <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><b>공유 저장소 도구 <span className="muted" style={{ fontWeight: 400 }}>· 공모전 데모용</span></b><button className="modal-x" aria-label="닫기" onClick={() => setShowShared(false)}>✕</button></div>
            <p className="modal-note">입력·붙여넣은 VOC가 공유 저장소에 적재되어 로그인한 모든 사용자 화면에 수 초 내 누적 표시됩니다. 현재 <b>{added.length.toLocaleString()}</b>건 공유 중.</p>
            <div className="ip-actions">
              <button className="btn btn-ghost" onClick={() => { seedShared() }}>공유 데이터에 샘플 시드 넣기</button>
              <button className="btn btn-ghost danger" onClick={() => { wipeShared() }}>공유 데이터 비우기</button>
            </div>
          </div>
        </div>
      )}
      {!demo && <button className="demo-fab" onClick={() => setDemo(true)} title="서비스 핵심을 1~2분 음성으로 자동 안내">▶ 자동 시연</button>}
      {demo && <AutoDemo nav={demoNav} hasData={added.length > 0} sampleId={demoSampleId} onClose={() => setDemo(false)} />}
    </div>
  )
}
