import React, { useState, useEffect } from 'react'
import { CAT22, FIXED_DEPTH2, AREA_TREE, AREA1_LIST, GROUPS, actionNeeded } from '../classify.js'
import { AI_AUTO, aiCacheGet, aiCacheSet, analyzeCaseAI } from '../ai.js'
import { PageHead, GroupBadge, Tag, SevBadge, SentBadge, StatBadge, ConfBadge, ChannelChip, Transcript, KANBAN_COLS, VOCS } from '../ui.jsx'

function CaseDetail({ caseId, notify, added, updateCases, addSent, openCase }) {
  const [showNum, setShowNum] = useState(false)
  const [own, setOwn] = useState(''); const [jira, setJira] = useState(''); const [note, setNote] = useState('')
  const [snd, setSnd] = useState({ kind: '문자', to: '', body: '' })
  const [ai, setAi] = useState(null); const [aiLoading, setAiLoading] = useState(false); const [aiErr, setAiErr] = useState('')
  const all = [...(added || []), ...VOCS]
  const c = all.find((v) => v.id === caseId) || all[0]
  useEffect(() => {
    if (!c) return
    setOwn(c.owner || ''); setJira(c.jiraUrl || ''); setNote(c.ownerNote || '')
    setSnd({ kind: '문자', to: c.customerRaw || c.customer || '', body: c.sms || '' })
    const cached = aiCacheGet(c.id)
    setAi(cached); setAiErr(''); setAiLoading(false)
    if (!cached && AI_AUTO) runAI({ auto: true })   // 열면 자동 1회 — 기본 칸을 AI 결과로 채움
  }, [c && c.id])
  const runAI = async (opts = {}) => {
    if (!c || aiLoading) return
    setAiLoading(true); setAiErr('')
    try { const r = await analyzeCaseAI(c); setAi(r); aiCacheSet(c.id, r); if (!opts.auto) notify.toast('AI 분석 완료') }
    catch (e) { if (!opts.auto) { setAiErr(String(e && e.message || e)); notify.toast('AI 분석 불가 — 휴리스틱 유지') } }  // 자동 실행 실패는 조용히 휴리스틱 유지
    finally { setAiLoading(false) }
  }
  const copy = (t, l) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast(l + ' 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  const doSend = () => {
    if (!snd.to.trim() || !snd.body.trim()) { notify.toast('수신·내용을 입력하세요'); return }
    if (addSent) addSent({ caseId: c.id, kind: snd.kind, owner: own || c.owner || '미지정', to: snd.to.trim(), content: snd.body.trim() })
    notify.toast(`${snd.kind} 발송 기록됨 (데모) — 메일 › 발송 이력에 추가`)
  }
  if (!c) return <div className="screen"><div className="panel empty-panel">표시할 케이스가 없습니다. VOC Inbox에서 VOC를 입력하거나 엑셀을 붙여넣어 추가하세요.</div></div>
  const canReveal = c.customerRaw && c.customerRaw !== c.customer
  const catOpts = (g) => g === '단순 문의/불만/기타' ? CAT22 : (FIXED_DEPTH2[g] || CAT22)
  const withCur = (opts, cur) => (cur && !opts.includes(cur)) ? [cur, ...opts] : opts
  const setField = (patch) => updateCases && updateCases([c.id], patch)
  const actList = (added || []).filter(actionNeeded)
  // 표시값: AI 결과가 있으면 AI를, 없으면(또는 생성 중) 휴리스틱을 보여줌
  const summaryShown = (ai && ai.summary) || c.summary
  const answerShown = (ai && ai.customerReply) || c.answer
  const analysisLines = ai ? [
    `핵심 의도: ${ai.summary || summaryShown}`,
    ai.rootCause ? `근본 원인: ${ai.rootCause}` : null,
    `분류 제안: ${ai.group} › ${ai.cat}${ai.reason ? ` — ${ai.reason}` : ''}`,
    `심각도/긴급도: ${ai.urgency} · 고객 감성 ${ai.sentiment}`,
    `대응영역 ${c.area1} › ${c.area2} · 담당 ${c.org} · 개발대응 ${c.devNeeded} · 진행 ${c.status}`,
  ].filter(Boolean) : c.analysis
  const aiPill = aiLoading ? 'AI 분석 생성 중…' : (ai ? 'AI 생성 · 검수 필요' : '키워드 기반 · 검수 필요')
  return (
    <div className="screen">
      <PageHead title="VOC 처리" sub="분류 결과 확인 · 문자/메일 초안 · 처리 상태 관리" />
      <div className="panel act-need">
        <div className="ip-head">조치 필요 VOC <span className="ip-note">장애/성능/개선 중 분류 미확정(검토필요) 또는 우선순위 High이면서 처리 전 단계 — 단순 문의/불만/기타는 제외됩니다. 선택하면 아래에서 바로 처리합니다.</span></div>
        {actList.length ? (
          <div className="act-chips">{actList.slice(0, 12).map((v) => (
            <button key={v.id} className={'act-chip' + (v.id === c.id ? ' on' : '')} onClick={() => openCase && openCase(v.id)} title={v.content}>
              <span className="ac-id">{v.id}</span>
              {v.severity === 'High' && <span className="ac-sev">High</span>}
              {v.review && <span className="ac-rev">검토</span>}
              <span className="ac-cat">{v.cat}</span>
            </button>
          ))}{actList.length > 12 && <span className="muted">외 {actList.length - 12}건</span>}</div>
        ) : <p className="micro">현재 조치 필요 VOC가 없습니다. (장애/성능/개선 중 검토필요 또는 High + 처리 전 단계 · 단순 문의/불만/기타 제외)</p>}
      </div>
      <div className="case-grid">
        <div className="case-main">
          <div className="panel">
            <div className="case-top"><h2 className="case-id">{c.id}{c.source === 'input' && <span className="src-pill">입력</span>}</h2><div className="case-area"><GroupBadge v={c.group} /> <Tag>{c.cat}</Tag>{c.review && <span className="rev-y">검토필요</span>}</div></div>
            <div className="block-label">인입 정보</div>
            <div className="kv">
              <div className="kv-i"><span className="kv-k">인입일자</span><span className="kv-v">{c.date || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">인입 채널</span><span className="kv-v"><ChannelChip channel={c.channel} /></span></div>
              <div className="kv-i"><span className="kv-k">고객번호</span><span className="kv-v">{showNum && canReveal ? c.customerRaw : c.customer}{canReveal && <button className="num-btn" onClick={() => setShowNum(!showNum)}>{showNum ? '가리기' : '번호 보기'}</button>}</span></div>
              <div className="kv-i"><span className="kv-k">월 내 주차</span><span className="kv-v">{c.week || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">발생일자</span><span className="kv-v">{c.occur || '-'}</span></div>
            </div>
            <div className="block-label">분류 · 처리 정보 <span className="muted" style={{ fontWeight: 400 }}>· 담당자가 수정하면 저장됩니다</span></div>
            <div className="kv">
              <div className="kv-i"><span className="kv-k">VOC구분1</span><span className="kv-v"><select className="kv-sel" value={c.group} onChange={(e) => { const g = e.target.value; setField({ group: g, cat: (catOpts(g)[0] || c.cat) }) }}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></span></div>
              <div className="kv-i"><span className="kv-k">표준분류(구분2)</span><span className="kv-v"><select className="kv-sel" value={c.cat} onChange={(e) => setField({ cat: e.target.value })}>{withCur(catOpts(c.group), c.cat).map((x) => <option key={x}>{x}</option>)}</select></span></div>
              <div className="kv-i"><span className="kv-k">대응영역1</span><span className="kv-v"><select className="kv-sel" value={c.area1} onChange={(e) => { const a = e.target.value; setField({ area1: a, area2: ((AREA_TREE[a] || [])[0] || '') }) }}>{withCur(AREA1_LIST, c.area1).map((a) => <option key={a}>{a}</option>)}</select></span></div>
              <div className="kv-i"><span className="kv-k">대응영역2</span><span className="kv-v"><select className="kv-sel" value={c.area2} onChange={(e) => setField({ area2: e.target.value })}>{withCur(AREA_TREE[c.area1] || [], c.area2).map((a) => <option key={a}>{a}</option>)}</select></span></div>
              <div className="kv-i"><span className="kv-k">심각도</span><span className="kv-v"><select className="kv-sel" value={c.severity} onChange={(e) => setField({ severity: e.target.value })}>{['High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}</select></span></div>
              <div className="kv-i"><span className="kv-k">감성</span><span className="kv-v"><SentBadge v={c.sentiment} /></span></div>
              <div className="kv-i"><span className="kv-k">신뢰도</span><span className="kv-v"><ConfBadge v={c.conf} /></span></div>
              <div className="kv-i"><span className="kv-k">검토필요</span><span className="kv-v">{c.review ? <span className="rev-y">Y</span> : 'N'}</span></div>
              <div className="kv-i"><span className="kv-k">진행상황</span><span className="kv-v"><StatBadge v={c.status} /></span></div>
              <div className="kv-i"><span className="kv-k">담당</span><span className="kv-v">{c.org}</span></div>
              <div className="kv-i"><span className="kv-k">개발 대응</span><span className="kv-v">{c.devNeeded || '-'}</span></div>
            </div>
            {summaryShown && <div className="block"><div className="block-label">AI 요약 초안 <span className="ai-tag soft">{aiLoading ? '생성 중…' : (ai && ai.summary ? 'AI' : '키워드')}</span></div><p className="voc-raw">{summaryShown}</p></div>}
            <div className="block"><div className="block-label">VOC 원문(내용)</div><Transcript text={c.content} /></div>
          </div>
          <div className="panel ai-panel"><div className="ai-head">Copilot AI 분석 <span className="ai-tag">{aiPill}</span><button className="btn btn-ghost sm ai-run" onClick={() => runAI()} disabled={aiLoading}>{aiLoading ? '분석 중…' : (ai ? 'AI 재분석' : 'AI 분석 실행')}</button></div>
            <ul className="ai-list">{analysisLines.map((a, i) => <li key={i}>{a}</li>)}</ul>
            {ai && GROUPS.includes(ai.group) && (ai.group !== c.group || ai.cat !== c.cat) &&
              <button className="btn btn-ghost sm" onClick={() => setField({ group: ai.group, cat: ai.cat })}>AI 제안 분류로 반영 ({ai.group} › {ai.cat})</button>}
            <div className="ai-ans"><div className="ai-ans-k">예상 답안 (고객 응대 초안){ai && ai.customerReply ? ' · AI' : ''}</div><div className="ai-ans-v">{answerShown}</div>{ai && ai.customerReply && <button className="btn btn-ghost sm" onClick={() => copy(ai.customerReply, '응대 초안')}>복사</button>}</div>
            {ai && ai.smsDraft && <div className="ai-ans"><div className="ai-ans-k">문자/푸시 초안 · AI</div><div className="ai-ans-v">{ai.smsDraft}</div><button className="btn btn-ghost sm" onClick={() => copy(ai.smsDraft, '문자 초안')}>복사</button></div>}
            {ai && ai.nextActions && ai.nextActions.length > 0 && <div className="ai-ans"><div className="ai-ans-k">다음 액션 · AI</div><ul className="ai-list">{ai.nextActions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
            <div className="ai-ans"><div className="ai-ans-k">예상 처리 방안</div><div className="ai-ans-v">{c.action}{c.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''} · 담당 {c.org}</div></div>
            {aiErr && <div className="ai-err">AI 분석을 사용할 수 없습니다 ({aiErr}). 키워드 기반 분석을 유지합니다.</div>}
          </div>
          {c.sms && <div className="panel"><div className="block-label">고객 문자/푸시 초안</div><div className="draft">{c.sms}</div><button className="btn btn-ghost sm" onClick={() => copy(c.sms, '문자 초안')}>문자 초안 복사</button></div>}
          {c.mail && <div className="panel"><div className="block-label">담당자 메일 초안</div><div className="draft"><div className="mail-line"><b>수신</b> {c.mail.to}</div><div className="mail-line"><b>제목</b> {c.mail.subject}</div><div className="mail-body">{c.mail.body}</div></div><button className="btn btn-ghost sm" onClick={() => copy(`수신: ${c.mail.to}\n제목: ${c.mail.subject}\n\n${c.mail.body}`, '메일 초안')}>메일 초안 복사</button></div>}
          <div className="panel"><div className="block-label">UX/개발 개선 요청</div><div className="impv"><div><span className="impv-k">문제</span>{c.improvement.problem}</div><div><span className="impv-k">제안</span>{c.improvement.suggestion}</div><div><span className="impv-k">기대효과</span>{c.improvement.effect}</div></div></div>
        </div>
        <div className="case-side">
          <div className="panel"><div className="block-label">예상 처리 방안</div><div className="action-list"><div className="action-item">{c.action}{c.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''}</div><div className="action-item muted">담당 영역: {c.area1} › {c.area2}</div></div></div>
          <div className="panel owner-panel">
            <div className="block-label">담당자 작업</div>
            <label className="of-row"><span>진행상황</span><select value={c.status} onChange={(e) => updateCases && updateCases([c.id], { status: e.target.value })}>{KANBAN_COLS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="of-row"><span>담당자</span><input value={own} onChange={(e) => setOwn(e.target.value)} onBlur={() => updateCases && updateCases([c.id], { owner: own })} placeholder="영역 담당자" /></label>
            <label className="of-row"><span>Jira URL</span><input value={jira} onChange={(e) => setJira(e.target.value)} onBlur={() => updateCases && updateCases([c.id], { jiraUrl: jira })} placeholder="https://jira… (표시용)" /></label>
            {c.jiraUrl && <a className="jira-link" href={c.jiraUrl} target="_blank" rel="noreferrer">티켓 열기 ↗</a>}
            <div className="of-note">
              <span className="of-note-k">담당자 메모</span>
              <textarea className="of-area" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => updateCases && updateCases([c.id], { ownerNote: note })} placeholder="처리 경과·확인 사항·인계 내용을 적어주세요 (자동 저장)" />
              <span className="micro">입력 후 다른 곳을 클릭하면 자동 저장됩니다{c.ownerNote ? ' · 저장됨' : ''}. 공유 저장소 모드면 다른 담당자에게도 반영돼요.</span>
            </div>
            <button className="btn btn-ghost sm" onClick={() => notify.modal('개선 요청 등록', '실제 적용 시 사내 업무시스템(Jira 등)에 개선 요청이 등록됩니다. 본 MVP는 데모 표시입니다.')}>개선 요청 등록</button>
          </div>
          <div className="panel">
            <div className="block-label">메일 · 문자 발송 <span className="muted" style={{ fontWeight: 400 }}>데모 · 실제 발송 안 함</span></div>
            <label className="of-row"><span>유형</span><select value={snd.kind} onChange={(e) => setSnd({ ...snd, kind: e.target.value })}><option>문자</option><option>메일</option></select></label>
            <label className="of-row"><span>수신</span><input value={snd.to} onChange={(e) => setSnd({ ...snd, to: e.target.value })} placeholder="수신 번호/이메일" /></label>
            <textarea className="of-area" value={snd.body} onChange={(e) => setSnd({ ...snd, body: e.target.value })} placeholder="발송 내용" />
            <button className="btn btn-primary" onClick={doSend}>발송 (데모)</button>
            <p className="micro">발송 시 ‘메일 › 발송 이력’에 담당자·수신·내용·발송일이 기록됩니다. 최종 발송·개발 반영은 담당자 검수 후 진행됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- [5] Insight Report (실데이터 집계) ---------- */

export default CaseDetail
