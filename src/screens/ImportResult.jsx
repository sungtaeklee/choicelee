import React, { useState } from 'react'
import { enrichRow } from '../classify.js'
import { GroupBadge, Tag, PageHead } from '../ui.jsx'
import { toCompact } from '../storage.js'

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

export default ImportResult
