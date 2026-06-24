import React, { useState } from 'react'
import { enrichRow } from '../classify.js'
import { GroupBadge, Tag, PageHead } from '../ui.jsx'
import { toCompact } from '../storage.js'

/* 코드펜스·설명문이 섞여 있어도, 단일 객체 / 배열 / {items:[…]} 모두 파싱 */
function parsePastedJSON(text) {
  if (!text || !text.trim()) return { error: '붙여넣은 내용이 없습니다.' }
  const s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const tryParse = (t) => { try { return JSON.parse(t) } catch { return null } }
  let data = tryParse(s)
  if (!data) {
    const a = s.indexOf('['), b = s.lastIndexOf(']'), o = s.indexOf('{'), p = s.lastIndexOf('}')
    if (a >= 0 && b > a && (a < o || o < 0)) data = tryParse(s.slice(a, b + 1))
    if (!data && o >= 0 && p > o) data = tryParse(s.slice(o, p + 1))
  }
  if (!data) return { error: 'JSON을 읽지 못했습니다. 앞뒤 설명·코드펜스를 빼고 객체 { … } 또는 배열 [ … ]만 붙여넣어 주세요.' }
  return { data }
}
// 단일/배열/{items} → 항목 배열로 정규화
const toItems = (data) => Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : [data])

const SEV_MAP = { '높음': 'High', '높': 'High', high: 'High', '보통': 'Medium', '중간': 'Medium', medium: 'Medium', '낮음': 'Low', '낮': 'Low', low: 'Low' }
const SENT_MAP = { '부정': 'Negative', negative: 'Negative', '중립': 'Neutral', neutral: 'Neutral', '긍정': 'Positive', positive: 'Positive' }
const CONF_SET = ['높음', '보통', '낮음']

const IMP_SAMPLE = {
  voc: '앱 로그인 시 인증문자 요청 후 계속 실패하고, 재시도해도 안 됩니다.',
  channel: 'App Store',
  classification: { group: '장애/오류', category: '회원/로그인/인증', depth1: 'MY', depth2: '회원/로그인/ID', severity: '높음', sentiment: '부정', urgency: '높음', signals: ['로그인', '인증문자 실패', '재시도 반복'], relatedMenu: '마이페이지_가입정보', errorType: '앱/웹 기능오류' },
  reviewNeeded: true, confidence: '높음', labels: ['VOC', '전사IT업무요청'],
  insight: { intent: '인증문자 오류로 로그인 불가', risk: '서비스 이용 차단' },
  actions: { ownerTeam: ['인증/계정 시스템', 'SMS Gateway'], checkpoints: ['SMS 발송 로그 확인', '수신 차단 여부'] },
  response: {
    customerMessage: '안녕하세요 고객님, 로그인 인증문자 오류로 불편을 드려 죄송합니다. 앱 최신 버전 확인 후 재시도를 부탁드리며, 계속 실패하면 즉시 복구 도와드리겠습니다(확인 필요).',
    pushMessage: '[U+] 고객님, 로그인 인증문자 오류를 확인 중입니다. 앱 최신 버전 확인 후 재시도 부탁드립니다.',
    internalMail: { title: '[긴급] 로그인 인증문자 실패 반복 VOC', body: 'SMS 발송 로그·수신 차단·장애 확산 여부 점검 부탁드립니다.' },
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
  const [raw, setRaw] = useState(''); const [items, setItems] = useState(null); const [err, setErr] = useState(''); const [reg, setReg] = useState(null)
  const copy = (t, l) => { if (t && navigator.clipboard) navigator.clipboard.writeText(t).then(() => notify && notify.toast(l + ' 복사됨')).catch(() => { }) }
  const load = () => { const { data, error } = parsePastedJSON(raw); if (error) { setErr(error); setItems(null); setReg(null) } else { setErr(''); setItems(toItems(data).filter(Boolean)); setReg(null) } }

  // 항목 1건 → 보강 케이스 (에이전트 분류·응대·새 티켓필드 매핑)
  const buildCase = (item, idx) => {
    const cc = item.classification || {}
    const ov = {
      group: cc.group || undefined, cat: cc.category || undefined, area1: cc.depth1 || undefined, area2: cc.depth2 || undefined,
      severity: SEV_MAP[String(cc.severity || '').trim().toLowerCase()] || SEV_MAP[String(cc.severity || '').trim()] || undefined,
    }
    const baseSeq = (added || []).reduce((m, v) => { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); return n > m ? n : m }, 0) + 1
    const id = shared ? 'IN-' + Date.now().toString(36) + idx + Math.random().toString(36).slice(2, 5) : 'IN-' + String(baseSeq + idx).padStart(3, '0')
    const v = enrichRow({ channel: item.channel || '사내 에이전트', content: item.voc || '(원문 없음)', customer: '', date: item.date || '', week: item.week || '', occur: '' }, id, ov)
    const rr = item.response || {}, mm = rr.internalMail || {}
    v.imported = true
    if (rr.customerMessage) v.answer = rr.customerMessage
    if (rr.pushMessage) v.sms = rr.pushMessage
    if (mm.title || mm.body) v.mail = { to: (v.mail && v.mail.to) || v.org || '', subject: mm.title || (v.mail && v.mail.subject) || '', body: mm.body || '' }
    // 확장 필드
    if (cc.sentiment && SENT_MAP[String(cc.sentiment).trim()]) v.sentiment = SENT_MAP[String(cc.sentiment).trim()]
    if (cc.relatedMenu) v.relatedMenu = cc.relatedMenu
    if (cc.errorType) v.errorType = cc.errorType
    if (Array.isArray(cc.signals) && cc.signals.length) v.analysis = [`핵심 의도: ${(item.insight && item.insight.intent) || v.summary}`, `신호어: ${cc.signals.join(', ')}`, ...v.analysis.slice(2)]
    if (Array.isArray(item.labels) && item.labels.length) v.labels = [...new Set(item.labels)]
    if (typeof item.reviewNeeded === 'boolean') v.review = item.reviewNeeded
    if (CONF_SET.includes(String(item.confidence).trim())) v.conf = String(item.confidence).trim()
    if (item.insight && (item.insight.intent || item.insight.risk)) v.improvement = { problem: item.insight.intent || v.summary, suggestion: (Array.isArray(item.improvements) && item.improvements.join(' / ')) || (v.improvement && v.improvement.suggestion) || '', effect: item.insight.risk ? `리스크: ${item.insight.risk}` : '재문의·불편 감소' }
    else if (Array.isArray(item.improvements) && item.improvements.length) v.improvement = { ...v.improvement, suggestion: item.improvements.join(' / ') }
    return v
  }
  const registerAll = () => {
    if (!items || !items.length) { notify && notify.toast('먼저 JSON을 불러오세요'); return }
    const built = items.map((it, i) => buildCase(it, i))
    setAdded && setAdded([...built, ...(added || [])])
    if (shared && sharedInsert) sharedInsert(toCompact(built))
    setReg(built)
    notify && notify.toast(built.length === 1 ? `${built[0].id} 등록됨 — ${built[0].group} · ${built[0].cat}` : `${built.length}건 등록됨`)
  }

  const single = items && items.length === 1 ? items[0] : null
  const c = (single && single.classification) || {}, ins = (single && single.insight) || {}, act = (single && single.actions) || {}, rsp = (single && single.response) || {}, mail = rsp.internalMail || {}, imp = (single && single.improvements) || []
  return (
    <div className="screen">
      <PageHead title="Copilot Studio Agent 결과 연동" sub="사내 Copilot Studio Agent(‘U+VOC voice’)가 출력한 JSON을 붙여넣으면 우리 운영 스키마로 변환·등록됩니다 · 단건/여러 건(배열) 모두 지원 · LLM 직접호출 없음(사내망 무관)" />
      <div className="panel">
        <div className="card-title">에이전트 JSON 붙여넣기 <span className="muted">코드펜스·앞뒤 설명이 섞여도, 객체 / 배열 / {'{items:[…]}'} 모두 인식</span></div>
        <textarea className="imp-ta" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'{ "voc": "...", "classification": { "group": "...", "category": "...", "depth1": "...", "depth2": "...", "severity": "높음", "sentiment": "부정", "urgency": "높음", "signals": [], "relatedMenu": "...", "errorType": "..." }, "reviewNeeded": true, "confidence": "높음", "labels": ["VOC"], "insight": {...}, "actions": {...}, "response": {...}, "improvements": [] }\n\n여러 건: [ {…}, {…} ]  또는  { "items": [ {…} ] }'} />
        <div className="imp-actions">
          <button className="btn btn-primary" onClick={load}>카드로 표시</button>
          <button className="btn btn-ghost" onClick={() => { setRaw(JSON.stringify(IMP_SAMPLE, null, 2)); setErr('') }}>예시 채우기</button>
          {(raw || items) && <button className="btn btn-ghost" onClick={() => { setRaw(''); setItems(null); setErr(''); setReg(null) }}>지우기</button>}
        </div>
        {err && <div className="ai-err">{err}</div>}
      </div>

      {items && items.length > 0 && (
        <>
          {reg ? (
            <div className="imp-reg-ok">
              <span><b>{reg.length}건</b> 등록 완료 — 보드·추이·처리 목록에 반영되었습니다.</span>
              {openCase && reg[0] && <button className="btn btn-ghost sm" onClick={() => openCase(reg[0].id)}>처리 화면에서 보기 →</button>}
            </div>
          ) : (
            <div className="imp-reg-bar">
              <span className="muted">{items.length === 1 ? '이 결과를' : `인식된 ${items.length}건을`} VOC 티켓으로 등록하면 보드·추이·처리 목록에 함께 쌓입니다 (분류·레이블·검토필요 등 에이전트 결과 반영).</span>
              <button className="btn btn-primary" onClick={registerAll}>＋ {items.length === 1 ? 'VOC로 등록' : `${items.length}건 일괄 등록`}</button>
            </div>
          )}

          {single ? (
            <>
              <div className="panel">
                <div className="card-title">요약</div>
                <div className="imp-row"><span className="imp-k">VOC 구분</span><span>{c.group ? <GroupBadge v={c.group} /> : '—'} {c.category && <Tag>{c.category}</Tag>}</span></div>
                <div className="imp-row"><span className="imp-k">대응영역</span><span>{[c.depth1, c.depth2].filter(Boolean).join(' › ') || '—'}{c.relatedMenu ? ` · 관련메뉴 ${c.relatedMenu}` : ''}</span></div>
                <div className="imp-row"><span className="imp-k">심각도 · 감성 · 긴급도</span><span className="imp-pills"><ImpPill v={c.severity} /><ImpPill v={c.sentiment} /><ImpPill v={c.urgency} /></span></div>
                {(single.confidence || typeof single.reviewNeeded === 'boolean' || c.errorType) && <div className="imp-row"><span className="imp-k">신뢰도 · 검토 · 오류타입</span><span className="imp-pills">{single.confidence && <ImpPill v={`신뢰도 ${single.confidence}`} />}{single.reviewNeeded && <span className="imp-pill imp-hi">검토필요</span>}{c.errorType && <span className="imp-chip">{c.errorType}</span>}</span></div>}
                {Array.isArray(single.labels) && single.labels.length > 0 && <div className="imp-row"><span className="imp-k">레이블</span><span className="imp-chips">{single.labels.map((l, i) => <span key={i} className="jlabel">{l}</span>)}</span></div>}
                {Array.isArray(c.signals) && c.signals.length > 0 && <div className="imp-row"><span className="imp-k">신호어</span><span className="imp-chips">{c.signals.map((s, i) => <span key={i} className="imp-chip">{s}</span>)}</span></div>}
                {single.voc && <div className="imp-row"><span className="imp-k">원문</span><span className="imp-voc">{single.voc}</span></div>}
              </div>
              {(ins.intent || ins.risk) && (
                <div className="panel"><div className="card-title">의도 · 리스크</div>{ins.intent && <p className="imp-intent">{ins.intent}</p>}{ins.risk && <div className="imp-row"><span className="imp-k">리스크</span><span>{ins.risk}</span></div>}</div>
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
              {Array.isArray(imp) && imp.length > 0 && <div className="panel"><div className="card-title">개선 제안</div><ul className="imp-list">{imp.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
            </>
          ) : (
            <div className="panel">
              <div className="card-title">인식된 VOC {items.length}건 <span className="muted">일괄 등록 대상</span></div>
              <div className="table-wrap"><table className="vtable">
                <thead><tr><th>#</th><th>구분</th><th>표준분류</th><th>대응영역</th><th>심각도</th><th>원문</th></tr></thead>
                <tbody>{items.map((it, i) => { const x = it.classification || {}; return (
                  <tr key={i}><td className="muted">{i + 1}</td><td>{x.group ? <GroupBadge v={x.group} /> : '—'}</td><td>{x.category ? <Tag>{x.category}</Tag> : '—'}</td><td className="nowrap muted">{[x.depth1, x.depth2].filter(Boolean).join(' › ') || '—'}</td><td><ImpPill v={x.severity} /></td><td className="cell-content" title={it.voc}>{it.voc || '(원문 없음)'}</td></tr>
                ) })}</tbody>
              </table></div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImportResult
