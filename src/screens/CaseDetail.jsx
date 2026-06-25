import React, { useState, useEffect, useMemo } from 'react'
import { CAT22, FIXED_DEPTH2, AREA_TREE, AREA1_LIST, GROUPS, actionNeeded, recDay } from '../classify.js'
import { AI_AUTO, aiCacheGet, aiCacheSet, analyzeCaseAI } from '../ai.js'
import { PageHead, GroupBadge, Tag, SevBadge, SentBadge, StatBadge, ConfBadge, ChannelChip, Transcript, KANBAN_COLS, VOCS, Avatar } from '../ui.jsx'
import { REPLY_TEMPLATES, SLA_DAYS, defaultChecklist } from '../templates.js'
import { jiraMailto, jiraIntakeEmail, setJiraIntakeEmail, JIRA_INTAKE_PLACEHOLDER } from '../jira.js'
import { PeoplePicker, LabelPicker } from '../pickers.jsx'
import { RESOLVE_LEVELS, BUG_RESULTS, ERROR_TYPES } from '../directory.js'
import { saveAttach } from '../storage.js'

/* 지라 "세부 사항" — 담당자/보고자/레이블/참조자(검색형) + 처리가능단계·오류타입·실공수·BUG결과·개발일정 */
function TicketDetails({ c, updateCases, slaDays, ageDays, slaDone, slaBreach, KANBAN_COLS }) {
  const set = (patch) => updateCases && updateCases([c.id], patch)
  const [rm, setRm] = useState(c.relatedMenu || ''); const [jira, setJira] = useState(c.jiraUrl || '')
  const [ef, setEf] = useState(c.effort || { plan: '', design: '', pub: '', dev: '' })
  const [ds, setDs] = useState(c.devStart || ''); const [de, setDe] = useState(c.devEnd || ''); const [dp, setDp] = useState(c.deployEnd || '')
  const devDur = (ds && de) ? Math.max(0, Math.round((new Date(de) - new Date(ds)) / 86400000)) : null
  const efSet = (k, val) => { const nx = { ...ef, [k]: val }; setEf(nx); set({ effort: nx }) }
  return (
    <div className="panel jdetails">
      <div className="block-label">세부 사항 <span className="muted" style={{ fontWeight: 400 }}>· 지라 티켓 필드 (수정 시 저장)</span></div>
      <div className="jd-grid">
        <div className="jd-row"><span className="jd-k">진행상황</span><select className="jd-sel" value={c.status} onChange={(e) => set({ status: e.target.value })}>{KANBAN_COLS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="jd-row"><span className="jd-k">처리가능단계</span><select className="jd-sel" value={c.resolveLevel || ''} onChange={(e) => set({ resolveLevel: e.target.value })}><option value="">선택</option>{RESOLVE_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div className="jd-row"><span className="jd-k">담당자</span><PeoplePicker value={c.owner} onChange={(v) => set({ owner: v })} placeholder="담당자 검색" /></div>
        <div className="jd-row"><span className="jd-k">보고자</span><PeoplePicker value={c.reporter} onChange={(v) => set({ reporter: v })} placeholder="보고자 검색" /></div>
        <div className="jd-row"><span className="jd-k">레이블</span><LabelPicker value={c.labels} onChange={(v) => set({ labels: v })} /></div>
        <div className="jd-row"><span className="jd-k">참조자</span><PeoplePicker value={c.watchers} onChange={(v) => set({ watchers: v })} multi placeholder="참조자 검색" /></div>
        <div className="jd-row"><span className="jd-k">관련메뉴</span><input className="jd-in" value={rm} onChange={(e) => setRm(e.target.value)} onBlur={() => set({ relatedMenu: rm })} placeholder="예: 마이페이지_가입정보" /></div>
        <div className="jd-row"><span className="jd-k">오류타입</span><select className="jd-sel" value={c.errorType || ''} onChange={(e) => set({ errorType: e.target.value })}><option value="">선택</option>{ERROR_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="jd-row"><span className="jd-k">심각도</span><select className="jd-sel" value={c.severity} onChange={(e) => set({ severity: e.target.value })}>{['High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="jd-row"><span className="jd-k">SLA</span><span className="jd-v">{slaDone ? <span className="sla-badge sla-done">충족</span> : slaBreach ? <span className="sla-badge sla-over">초과 +{ageDays - slaDays}일</span> : <span className="sla-badge sla-ok">D-{Math.max(0, slaDays - (ageDays || 0))}</span>} <span className="muted">목표 {slaDays}일</span></span></div>
      </div>
      <div className="jd-sec">실공수 입력 (Day)</div>
      <div className="jd-effort">
        {[['plan', '기획'], ['design', '디자인'], ['pub', '퍼블'], ['dev', '개발']].map(([k, l]) => (
          <label key={k} className="jd-ef"><span>{l}</span><input type="number" min="0" step="0.5" value={ef[k]} onChange={(e) => efSet(k, e.target.value)} /></label>
        ))}
      </div>
      <div className="jd-grid">
        <div className="jd-row"><span className="jd-k">BUG 처리결과</span><select className="jd-sel" value={c.bugResult || ''} onChange={(e) => set({ bugResult: e.target.value })}><option value="">선택</option>{BUG_RESULTS.map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="jd-row"><span className="jd-k">개발 착수일자</span><input type="date" className="jd-in" value={ds} onChange={(e) => { setDs(e.target.value); set({ devStart: e.target.value }) }} /></div>
        <div className="jd-row"><span className="jd-k">개발 완료일자</span><input type="date" className="jd-in" value={de} onChange={(e) => { setDe(e.target.value); set({ devEnd: e.target.value }) }} /></div>
        <div className="jd-row"><span className="jd-k">개발 소요일자</span><span className="jd-v muted">{devDur != null ? `${devDur}일 (자동)` : '—'}</span></div>
        <div className="jd-row"><span className="jd-k">배포 완료일자</span><input type="date" className="jd-in" value={dp} onChange={(e) => { setDp(e.target.value); set({ deployEnd: e.target.value }) }} /></div>
        <div className="jd-row"><span className="jd-k">Jira URL</span><span className="jd-v jd-jira"><input className="jd-in" value={jira} onChange={(e) => setJira(e.target.value)} onBlur={() => set({ jiraUrl: jira })} placeholder="https://jira… (표시용)" />{c.jiraUrl && <a className="jira-link" href={c.jiraUrl} target="_blank" rel="noreferrer">↗</a>}</span></div>
      </div>
    </div>
  )
}

/* 이미지/영상 첨부 — 앱/웹 오류 화면·녹화본 첨부 후 뷰어로 확인 */
function Attachments({ c, updateCases, notify }) {
  const list = c.attachments || []
  const onFiles = (files) => {
    const arr = [...files].slice(0, 6)
    let pending = arr.length; const next = [...list]
    arr.forEach((f) => {
      if (f.size > 8 * 1024 * 1024) { notify && notify.toast(`${f.name}: 8MB 이하만 첨부 가능 (데모)`); pending--; return }
      const reader = new FileReader()
      reader.onload = () => {
        next.push({ name: f.name, type: f.type, dataUrl: reader.result })
        if (--pending <= 0) { updateCases && updateCases([c.id], { attachments: next }); saveAttach(c.id, next) }
      }
      reader.onerror = () => { if (--pending <= 0) { updateCases && updateCases([c.id], { attachments: next }); saveAttach(c.id, next) } }
      reader.readAsDataURL(f)
    })
  }
  const remove = (i) => { const next = list.filter((_, k) => k !== i); updateCases && updateCases([c.id], { attachments: next }); saveAttach(c.id, next) }
  return (
    <div className="panel">
      <div className="block-label">첨부 (이미지·영상) <span className="muted" style={{ fontWeight: 400 }}>· 오류 화면·녹화본으로 어디가 안 되는지 첨부</span></div>
      <div className="att-grid">
        {list.map((a, i) => (
          <div key={i} className="att-item">
            {String(a.type).startsWith('video') ? <video src={a.dataUrl} controls /> : <a href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.name} /></a>}
            <button className="att-del" aria-label="삭제" title="삭제" onClick={() => remove(i)}>✕</button>
            <span className="att-name" title={a.name}>{a.name}</span>
          </div>
        ))}
        <label className="att-add">
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          <span className="att-add-i">＋</span><span>이미지·영상 추가</span>
        </label>
      </div>
      <p className="micro">데모: 첨부는 이 브라우저에 저장됩니다(파일당 8MB·최대 6개). 실제 운영 시 사내 스토리지에 업로드됩니다.</p>
    </div>
  )
}

/* 처리 체크리스트 (Jira 서브태스크/체크리스트 대체) */
function Checklist({ c, updateCases }) {
  const [draft, setDraft] = useState('')
  const items = (c.checklist && c.checklist.length) ? c.checklist : defaultChecklist(c.cat)
  const save = (next) => updateCases && updateCases([c.id], { checklist: next })
  const toggle = (i) => save(items.map((it, k) => k === i ? { ...it, done: !it.done } : it))
  const add = () => { if (!draft.trim()) return; save([...items, { text: draft.trim(), done: false }]); setDraft('') }
  const del = (i) => save(items.filter((_, k) => k !== i))
  const done = items.filter((it) => it.done).length
  return (
    <div className="panel">
      <div className="block-label">처리 체크리스트 <span className="muted" style={{ fontWeight: 400 }}>· 권장 조치 단계 (체크하며 진행) · {done}/{items.length}</span></div>
      <div className="ck-bar"><span style={{ width: (items.length ? Math.round(done / items.length * 100) : 0) + '%' }} /></div>
      <ul className="ck-list">{items.map((it, i) => (
        <li key={i} className={'ck-item' + (it.done ? ' on' : '')}>
          <label><input type="checkbox" checked={!!it.done} onChange={() => toggle(i)} /><span>{it.text}</span></label>
          <button className="ck-del" aria-label="삭제" title="삭제" onClick={() => del(i)}>✕</button>
        </li>
      ))}</ul>
      <div className="ck-add">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} placeholder="단계 추가 (예: 망 품질 점검 의뢰)" />
        <button className="btn btn-ghost sm" disabled={!draft.trim()} onClick={add}>＋ 추가</button>
      </div>
    </div>
  )
}

/* 관련(유사) VOC — 같은 유형(분류) 또는 같은 대응영역의 다른 VOC를 건수·기간필터와 함께 목록화 */
function RelatedVOC({ all, current, openCase, bulkPatch, notify }) {
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('')
  const pool = useMemo(() => (all || []).filter((v) => v.id !== current.id && (v.cat === current.cat || v.area1 === current.area1)), [all, current.id, current.cat, current.area1])
  const dayRange = useMemo(() => { const ds = pool.map(recDay).filter(Boolean).sort(); return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null }, [pool])
  const inRange = (v) => { if (!d1 && !d2) return true; const dd = recDay(v); if (!dd) return false; if (d1 && dd < d1) return false; if (d2 && dd > d2) return false; return true }
  const filtered = pool.filter(inRange)
  const sameCat = filtered.filter((v) => v.cat === current.cat)
  const sameArea = filtered.filter((v) => v.cat !== current.cat && v.area1 === current.area1)
  const ordered = [...sameCat, ...sameArea]
  const sameCatTodo = sameCat.filter((v) => v.status !== '처리 완료')
  const bulkDoneCat = () => { if (!bulkPatch || !sameCatTodo.length) return; bulkPatch(sameCatTodo.map((v) => v.id), { status: '처리 완료' }, `같은 유형 ${sameCatTodo.length}건 처리 완료`) }
  return (
    <div className="panel">
      <div className="rel-head">
        <div className="block-label" style={{ margin: 0 }}>관련 VOC <span className="muted" style={{ fontWeight: 400 }}>같은 유형 ‘{current.cat}’ <b>{sameCat.length}</b>건 · 같은 영역 ‘{current.area1}’ <b>{sameArea.length}</b>건</span></div>
        {bulkPatch && sameCatTodo.length > 0 && <button className="btn btn-ghost sm" onClick={bulkDoneCat} title="같은 유형의 미완료 VOC를 한 번에 처리 완료">✓ 같은 유형 {sameCatTodo.length}건 일괄 처리</button>}
      </div>
      <div className="date-filter rel-filter">
        <label>시작 <input type="date" value={d1} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD1(e.target.value)} /></label>
        <span className="df-sep">~</span>
        <label>종료 <input type="date" value={d2} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD2(e.target.value)} /></label>
        {(d1 || d2) && <button className="btn btn-ghost sm" onClick={() => { setD1(''); setD2('') }}>기간 초기화</button>}
        <span className="muted nowrap">표시 {filtered.length.toLocaleString()}건{dayRange ? ` · 범위 ${dayRange.min}~${dayRange.max}` : ''}</span>
      </div>
      {ordered.length ? (
        <div className="table-wrap"><table className="vtable">
          <thead><tr><th>ID</th><th>관계</th><th>일자/주차</th><th>심각도</th><th>요약</th><th>상태</th></tr></thead>
          <tbody>{ordered.slice(0, 20).map((v) => (
            <tr key={v.id} className="row-click" onClick={() => openCase && openCase(v.id)}>
              <td className="mono nowrap">{v.id}</td>
              <td className="nowrap">{v.cat === current.cat ? <Tag>같은 유형</Tag> : <span className="muted">같은 영역</span>}</td>
              <td className="muted nowrap">{v.date || v.occur || v.week || '-'}</td>
              <td><SevBadge v={v.severity} /></td>
              <td className="cell-content" title={v.content}>{v.summary || v.content}</td>
              <td className="nowrap"><StatBadge v={v.status} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="micro">관련 VOC가 없습니다{(d1 || d2) ? ' (선택한 기간 내)' : ''}.</p>}
      {ordered.length > 20 && <p className="micro">상위 20건만 표시 — 기간 필터로 좁혀 보세요. (집계 건수는 전체 기준)</p>}
    </div>
  )
}

/* 조치 필요 VOC — 유형(분류)별로 묶어 보여주고, 유형 클릭 시 상세 목록 → 항목 클릭 시 처리 화면 이동 */
function ActNeed({ list, openCase, currentId }) {
  const [open, setOpen] = useState(null)
  const groups = useMemo(() => {
    const m = {}
    for (const v of list) (m[v.cat] || (m[v.cat] = [])).push(v)
    // High 다수 → 건수 순으로 정렬
    return Object.entries(m).sort((a, b) => (b[1].filter((v) => v.severity === 'High').length - a[1].filter((v) => v.severity === 'High').length) || (b[1].length - a[1].length))
  }, [list])
  if (!list.length) return <p className="micro">현재 조치 필요 VOC가 없습니다. (장애/성능/개선 중 검토필요 또는 High + 처리 전 단계 · 단순 문의/불만/기타 제외)</p>
  const openItems = open ? (groups.find(([k]) => k === open)?.[1] || []) : []
  return (
    <div className="an">
      <div className="an-cats">
        {groups.map(([cat, items]) => {
          const high = items.filter((v) => v.severity === 'High').length
          const hasCur = items.some((v) => v.id === currentId)
          const active = open === cat
          return (
            <button key={cat} className={'an-cat' + (active ? ' on' : '') + (hasCur ? ' cur' : '')} onClick={() => setOpen(active ? null : cat)} aria-expanded={active}>
              <span className="an-cat-ar">{active ? '▾' : '▸'}</span>
              <span className="an-cat-n">{cat}</span>
              {high > 0 && <span className="an-cat-h">High {high}</span>}
              <span className="an-cat-c">{items.length}</span>
            </button>
          )
        })}
      </div>
      {open && (
        <div className="an-list">
          <div className="an-list-h"><b>{open}</b> · {openItems.length}건 <span className="muted">— 항목을 누르면 처리 화면으로 이동</span></div>
          {openItems.map((v) => (
            <div key={v.id} className={'an-item' + (v.id === currentId ? ' on' : '')} role="button" tabIndex={0}
              onClick={() => openCase && openCase(v.id)}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && openCase) { e.preventDefault(); openCase(v.id) } }}>
              <span className="mono an-item-id">{v.id}</span>
              <SevBadge v={v.severity} />
              {v.review && <span className="ac-rev">검토</span>}
              <span className="an-item-sum" title={v.content}>{v.summary || v.content}</span>
              <span className="an-item-go">상세 →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ACT_KIND = { status: '상태', owner: '담당', comment: '코멘트', send: '발송' }
// 한국어 조사: 받침 없음/ㄹ받침 → '로', 그 외 받침 → '으로'
function josaRo(word) {
  const s = String(word || '').trim(); if (!s) return '로'
  const code = s.charCodeAt(s.length - 1)
  if (code < 0xAC00 || code > 0xD7A3) return '로'
  const jong = (code - 0xAC00) % 28
  return (jong === 0 || jong === 8) ? '로' : '으로'
}
function fmtTs(t) { try { return new Date(t).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

function CaseDetail({ caseId, notify, added, updateCases, bulkPatch, addSent, addComment, sentLog, account, openCase, goBack, backLabel }) {
  const [showNum, setShowNum] = useState(false)
  const [cmt, setCmt] = useState('')
  const [lnk, setLnk] = useState({ label: '', url: '' })
  const [rep, setRep] = useState(''); const [newLabel, setNewLabel] = useState(''); const [newWatcher, setNewWatcher] = useState('')
  const [own, setOwn] = useState(''); const [jira, setJira] = useState(''); const [note, setNote] = useState('')
  const [snd, setSnd] = useState({ kind: '문자', to: '', body: '' })
  const [ai, setAi] = useState(null); const [aiLoading, setAiLoading] = useState(false); const [aiErr, setAiErr] = useState('')
  const all = [...(added || []), ...VOCS]
  const c = all.find((v) => v.id === caseId) || all[0]
  useEffect(() => {
    if (!c) return
    setOwn(c.owner || ''); setJira(c.jiraUrl || ''); setNote(c.ownerNote || ''); setCmt(''); setLnk({ label: '', url: '' }); setRep(c.reporter || ''); setNewLabel(''); setNewWatcher('')
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
  // 지라 메일 등록: (미설정 시) 사내 Jira 주소 1회 입력 → 저장 후 메일 클라이언트 열기 (발송 시 이슈 생성)
  const mailToJira = () => {
    if (jiraIntakeEmail() === JIRA_INTAKE_PLACEHOLDER) {
      const v = window.prompt('사내 Jira 프로젝트 인입 메일 주소를 입력하세요. (이 브라우저에 저장 — 다음부터 자동 사용)', '')
      if (v && v.trim()) setJiraIntakeEmail(v.trim())
    }
    try { const a = document.createElement('a'); a.href = jiraMailto(c); a.click() } catch { /* noop */ }
    notify.toast(`지라 등록 메일을 열었어요 (수신: ${jiraIntakeEmail()})`)
  }
  const doSend = () => {
    if (!snd.to.trim() || !snd.body.trim()) { notify.toast('수신·내용을 입력하세요'); return }
    if (addSent) addSent({ caseId: c.id, kind: snd.kind, owner: own || c.owner || '미지정', to: snd.to.trim(), content: snd.body.trim() })
    notify.toast(`${snd.kind} 발송 기록됨 (데모) — 메일 › 발송 이력에 추가`)
  }
  if (!c) return <div className="screen"><div className="panel empty-panel">표시할 케이스가 없습니다. VOC Inbox에서 VOC를 입력하거나 엑셀을 붙여넣어 추가하세요.</div></div>
  const canReveal = c.customerRaw && c.customerRaw !== c.customer
  // 상태별 SLA — 심각도 기준 목표 처리 기한 대비 경과
  const slaDays = SLA_DAYS[c.severity] || 3
  const ageDays = (() => { const d = recDay(c); if (!d) return null; return Math.max(0, Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000)) })()
  const slaDone = c.status === '처리 완료'
  const slaBreach = ageDays != null && !slaDone && ageDays > slaDays
  const catOpts = (g) => g === '단순 문의/불만/기타' ? CAT22 : (FIXED_DEPTH2[g] || CAT22)
  const withCur = (opts, cur) => (cur && !opts.includes(cur)) ? [cur, ...opts] : opts
  const setField = (patch) => updateCases && updateCases([c.id], patch)
  const bl = backLabel || '목록'; const ro = josaRo(bl) // 받침에 따라 로/으로
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
      <div className="cd-nav">
        {goBack && <button className="cd-back" onClick={goBack}>← {bl}{ro} 돌아가기</button>}
        <span className="cd-crumb">{bl}<span className="cd-sep">›</span><b>VOC 처리</b><span className="cd-sep">›</span><span className="mono">{c.id}</span></span>
        <span className="cd-nav-sp" />
        <button className="cd-jira" onClick={mailToJira} title="이 티켓을 사내 Jira 프로젝트 메일로 등록(메일 발송 시 이슈 생성)">✉ 지라 메일 등록</button>
      </div>
      <PageHead title="VOC 처리" sub="처리 후엔 상단의 ‘돌아가기’로 목록으로 이동하세요" />
      <div className="panel act-need">
        <div className="ip-head">조치 필요 VOC <span className="ip-note">장애/성능/개선 중 분류 미확정(검토필요) 또는 우선순위 High이면서 처리 전 단계 — 단순 문의/불만/기타는 제외됩니다. 유형을 누르면 목록이 펼쳐지고, 항목을 누르면 처리 화면으로 이동합니다.</span></div>
        <ActNeed list={actList} openCase={openCase} currentId={c.id} />
      </div>
      <div className="case-grid">
        <div className="case-main">
          <div className="panel">
            <div className="case-top"><h2 className="case-id">{c.id}{c.source === 'input' && <span className="src-pill">입력</span>}</h2><div className="case-area"><GroupBadge v={c.group} /> <Tag>{c.cat}</Tag>{c.review && <span className="rev-y">검토필요</span>}
              {slaDone ? <span className="sla-badge sla-done" title="처리 완료">SLA 충족</span>
                : slaBreach ? <span className="sla-badge sla-over" title={`목표 ${slaDays}일 초과`}>SLA 초과 +{ageDays - slaDays}일</span>
                  : <span className="sla-badge sla-ok" title={`심각도 ${c.severity} 목표 ${slaDays}일`}>SLA D-{Math.max(0, slaDays - (ageDays || 0))}</span>}</div></div>
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
            {summaryShown && <div className="block"><div className="block-label">AI 요약 초안 <span className="ai-tag soft">{aiLoading ? '생성 중…' : (ai && ai.summary ? 'AI' : '키워드')}</span></div>
              <p className="voc-raw sum-intent"><span className="sum-k">핵심 의도</span>{summaryShown}</p>
              {ai && ai.rootCause && <p className="voc-raw sum-cause"><span className="sum-k">근본 원인</span>{ai.rootCause}</p>}</div>}
            <div className="block"><div className="block-label">VOC 원문(내용)</div><Transcript text={c.content} /></div>
          </div>
          <Attachments c={c} updateCases={updateCases} notify={notify} />
          <div className="panel ai-panel"><div className="ai-head">Copilot AI 분석 <span className="ai-tag">{aiPill}</span><button className="btn btn-ghost sm ai-run" onClick={() => runAI()} disabled={aiLoading}>{aiLoading ? '분석 중…' : (ai ? 'AI 재분석' : 'AI 분석 실행')}</button></div>
            <ul className="ai-list">{analysisLines.map((a, i) => <li key={i}>{a}</li>)}</ul>
            {ai && GROUPS.includes(ai.group) && (ai.group !== c.group || ai.cat !== c.cat) &&
              <button className="btn btn-ghost sm" onClick={() => setField({ group: ai.group, cat: ai.cat })}>AI 제안 분류로 반영 ({ai.group} › {ai.cat})</button>}
            <div className="ai-ans"><div className="ai-ans-k">예상 답안 (고객 응대 초안){ai && ai.customerReply ? ' · AI' : ''}</div><div className="ai-ans-v">{answerShown}</div>
              <div className="cl-tpl sm"><span className="tpl-lbl">템플릿 복사</span>{REPLY_TEMPLATES.map((t) => <button key={t.key} className="cl-chip" title={t.text} onClick={() => copy(t.text, t.label)}>{t.label}</button>)}</div>
              {ai && ai.customerReply && <button className="btn btn-ghost sm" onClick={() => copy(ai.customerReply, '응대 초안')}>복사</button>}</div>
            {ai && ai.smsDraft && <div className="ai-ans"><div className="ai-ans-k">문자/푸시 초안 · AI</div><div className="ai-ans-v">{ai.smsDraft}</div><button className="btn btn-ghost sm" onClick={() => copy(ai.smsDraft, '문자 초안')}>복사</button></div>}
            {ai && ai.nextActions && ai.nextActions.length > 0 && <div className="ai-ans"><div className="ai-ans-k">다음 액션 · AI</div><ul className="ai-list">{ai.nextActions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
            <div className="ai-ans"><div className="ai-ans-k">예상 처리 방안</div><div className="ai-ans-v">{c.action}{c.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''} · 담당 {c.org}</div></div>
            {aiErr && <div className="ai-err">AI 분석을 사용할 수 없습니다 ({aiErr}). 키워드 기반 분석을 유지합니다.</div>}
          </div>
          {c.sms && <div className="panel"><div className="block-label">고객 문자/푸시 초안</div><div className="draft">{c.sms}</div><button className="btn btn-ghost sm" onClick={() => copy(c.sms, '문자 초안')}>문자 초안 복사</button></div>}
          {c.mail && <div className="panel"><div className="block-label">담당자 메일 초안</div><div className="draft"><div className="mail-line"><b>수신</b> {c.mail.to}</div><div className="mail-line"><b>제목</b> {c.mail.subject}</div><div className="mail-body">{c.mail.body}</div></div><button className="btn btn-ghost sm" onClick={() => copy(`수신: ${c.mail.to}\n제목: ${c.mail.subject}\n\n${c.mail.body}`, '메일 초안')}>메일 초안 복사</button></div>}
          <div className="panel"><div className="block-label">UX/개발 개선 요청</div><div className="impv"><div><span className="impv-k">문제</span>{c.improvement.problem}</div><div><span className="impv-k">제안</span>{c.improvement.suggestion}</div><div><span className="impv-k">기대효과</span>{c.improvement.effect}</div></div></div>
          <Checklist c={c} updateCases={updateCases} />
          <RelatedVOC all={all} current={c} openCase={openCase} bulkPatch={bulkPatch} notify={notify} />
        </div>
        <div className="case-side">
          <TicketDetails key={c.id} c={c} updateCases={updateCases} slaDays={slaDays} ageDays={ageDays} slaDone={slaDone} slaBreach={slaBreach} KANBAN_COLS={KANBAN_COLS} />
          <div className="panel">
            <div className="block-label">참고 링크 <span className="muted" style={{ fontWeight: 400 }}>· 대시보드·문서 연결</span></div>
            {(c.links || []).map((l, i) => (
              <div key={i} className="link-row">
                <a href={l.url} target="_blank" rel="noreferrer" title={l.url}>↗ {l.label || l.url}</a>
                <button className="ck-del" aria-label="삭제" onClick={() => updateCases && updateCases([c.id], { links: c.links.filter((_, k) => k !== i) })}>✕</button>
              </div>
            ))}
            <div className="link-add">
              <input value={lnk.label} onChange={(e) => setLnk({ ...lnk, label: e.target.value })} placeholder="이름(선택)" />
              <input value={lnk.url} onChange={(e) => setLnk({ ...lnk, url: e.target.value })} placeholder="https://… 링크" />
              <button className="btn btn-ghost sm" disabled={!lnk.url.trim()} onClick={() => { if (!lnk.url.trim() || !updateCases) return; updateCases([c.id], { links: [...(c.links || []), { label: lnk.label.trim(), url: lnk.url.trim() }] }); setLnk({ label: '', url: '' }) }}>＋</button>
            </div>
          </div>
          <div className="panel">
            <div className="block-label">메일 · 문자 발송 <span className="muted" style={{ fontWeight: 400 }}>데모 · 실제 발송 안 함</span></div>
            <label className="of-row"><span>유형</span><select value={snd.kind} onChange={(e) => setSnd({ ...snd, kind: e.target.value })}><option>문자</option><option>메일</option></select></label>
            <label className="of-row"><span>수신</span><input value={snd.to} onChange={(e) => setSnd({ ...snd, to: e.target.value })} placeholder="수신 번호/이메일" /></label>
            <textarea className="of-area" value={snd.body} onChange={(e) => setSnd({ ...snd, body: e.target.value })} placeholder="발송 내용" />
            <button className="btn btn-primary" onClick={doSend}>발송 (데모)</button>
            <p className="micro">발송 시 ‘메일 › 발송 이력’에 기록되고, 아래 <b>처리 활동</b>에도 남습니다.</p>
          </div>
          <div className="panel">
            <div className="block-label">처리 활동 <span className="muted" style={{ fontWeight: 400 }}>· 상태 변경·코멘트·발송 이력 (티켓 처리 내역)</span></div>
            <div className="cmt-box">
              <textarea className="of-area" value={cmt} onChange={(e) => setCmt(e.target.value)} placeholder="코멘트 입력 — 처리 경과·확인 사항·인계 내용 (담당자 간 협업)" />
              <button className="btn btn-ghost sm" disabled={!cmt.trim() || !addComment} onClick={() => { addComment(c.id, 'comment', cmt.trim()); setCmt(''); notify.toast('코멘트 추가됨') }}>＋ 코멘트 추가</button>
            </div>
            <ul className="act-tl">
              {[...(c.activity || [])].reverse().slice(0, 30).map((a, i) => (
                <li key={i} className={'act-tl-i act-k-' + a.kind}>
                  <span className="act-kind">{ACT_KIND[a.kind] || '기록'}</span>
                  <div className="act-body"><span className="act-text">{a.text}</span><span className="act-meta">{fmtTs(a.t)} · {String(a.who || '').split('@')[0] || '시스템'}</span></div>
                </li>
              ))}
              {!(c.activity || []).length && <li className="act-empty muted">아직 처리 활동이 없습니다. 진행상황 변경·담당 배정·코멘트·발송이 시간순으로 기록됩니다.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- [5] Insight Report (실데이터 집계) ---------- */

export default CaseDetail
