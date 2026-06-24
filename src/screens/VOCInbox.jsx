import React, { useState, useMemo, useEffect } from 'react'
import { GROUPS, parseGrid, parsePaste, enrichRow, weekKey } from '../classify.js'
import { toCompact } from '../storage.js'
import { PageHead, ChannelChip, GroupBadge, Tag, StatBadge, ConfBadge, KANBAN_COLS, VOCS, useSort, SortTh } from '../ui.jsx'

// VOC 목록 컬럼별 정렬 키 추출자 (주차는 weekKey로 수치 정렬)
const LIST_SORT = {
  id: (v) => v.id, date: (v) => v.date, channel: (v) => v.channel, customer: (v) => v.customer,
  group: (v) => v.group, cat: (v) => v.cat, area: (v) => [v.area1, v.area2].filter(Boolean).join(' › '),
  summary: (v) => v.summary || v.content, week: (v) => (v.week ? weekKey(v.week) : null), occur: (v) => v.occur,
}

const INPUT_CHANNELS = ['고객의소리', 'Call', 'Medallia', 'App Store', '고객센터']
const SHEET_COLS = [
  { k: 'date', label: '인입일자', w: 108 }, { k: 'channel', label: '인입채널', w: 104 },
  { k: 'customer', label: '고객번호', w: 128 }, { k: 'content', label: '내용', w: 340 },
  { k: 'week', label: '월내주차', w: 96 }, { k: 'occur', label: '발생일자', w: 104 },
]
const emptyRow = () => ({ date: '', channel: '', customer: '', content: '', week: '', occur: '' })
function PasteSheetModal({ onClose, onSubmit }) {
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, emptyRow))
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  const setCell = (ri, k, val) => setRows((rs) => rs.map((r, i) => i === ri ? { ...r, [k]: val } : r))
  const filled = rows.filter((r) => (r.content || '').trim()).length
  const onPaste = (e, ri, ci) => {
    const text = (e.clipboardData || window.clipboardData).getData('text')
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return // 단일 셀 → 기본 붙여넣기
    e.preventDefault()
    const grid = parseGrid(text) // 따옴표 안의 줄바꿈·탭을 보존하며 2차원 격자로 파싱
    if (!grid.length) return
    const maxCols = Math.max(...grid.map((g) => g.length))
    const headerNamed = /인입일자|채널|고객번호|내용|주차|발생/.test((grid[0] || []).join(' '))
    const hasMultiline = grid.some((r) => r.some((c) => /\n/.test(c || ''))) // 전사처럼 줄바꿈 든 셀 = VOC 레코드 신호
    if (maxCols >= 10 || headerNamed || hasMultiline) { // 전체 export·헤더 포함·다중행 셀 → 표준 파서로 인식
      const parsed = parsePaste(text)
      if (parsed.length) { setRows([...parsed.map((p) => ({ date: p.date || '', channel: p.channel || '', customer: p.customer || '', content: p.content || '', week: p.week || '', occur: p.occur || '' })), emptyRow(), emptyRow()]); return }
    }
    setRows((rs) => { // 단순 격자(6열 이하) → 엑셀처럼 현재 셀 기준 위치 채우기
      const next = rs.map((r) => ({ ...r }))
      grid.forEach((cells, r) => { const tr = ri + r; while (next.length <= tr) next.push(emptyRow()); cells.forEach((val, c) => { const col = SHEET_COLS[ci + c]; if (col) next[tr][col.k] = (val || '').trim() }) })
      return next
    })
  }
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal sheet-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>엑셀 시트로 입력 · 붙여넣기</b><button className="modal-x" aria-label="닫기" onClick={onClose}>✕</button></div>
        <p className="modal-note">셀에 직접 입력하거나, Excel에서 범위를 복사해 셀에 <b>붙여넣기(Ctrl+V)</b> 하세요 — 헤더·전체 열도 자동 인식합니다. <b>내용</b>이 있는 행만 추가되며, 전화·이름은 추가 시 자동 마스킹됩니다.</p>
        <div className="sheet-wrap">
          <table className="sheet">
            <thead><tr><th className="sh-rownum"></th>{SHEET_COLS.map((c) => <th key={c.k} style={{ minWidth: c.w }}>{c.label}{c.k === 'content' && <span className="sh-req"> *</span>}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}><td className="sh-rownum">{ri + 1}</td>{SHEET_COLS.map((c, ci) => (
                <td key={c.k}><input value={r[c.k]} onChange={(e) => setCell(ri, c.k, e.target.value)} onPaste={(e) => onPaste(e, ri, ci)} /></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
        <div className="modal-foot">
          <div className="mf-left">
            <button className="btn btn-ghost sm" onClick={() => setRows((rs) => [...rs, ...Array.from({ length: 5 }, emptyRow)])}>행 추가</button>
            <button className="btn btn-ghost sm" onClick={() => setRows(Array.from({ length: 8 }, emptyRow))}>전체 지우기</button>
            <span className="muted">내용 입력 {filled}행</span>
          </div>
          <div className="mf-right">
            <button className="btn btn-ghost" onClick={onClose}>닫기</button>
            <button className="btn btn-primary" disabled={!filled} onClick={() => onSubmit(rows)}>분류·추가 ({filled}건)</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function VOCInbox({ openCase, notify, added, setAdded, shared, sharedInsert }) {
  const [fch, setFch] = useState('전체'); const [fgrp, setFgrp] = useState('전체'); const [fst, setFst] = useState('전체')
  const [channel, setChannel] = useState('고객의소리'); const [customer, setCustomer] = useState(''); const [text, setText] = useState('')
  const [vDate, setVDate] = useState(''); const [vWeek, setVWeek] = useState(''); const [vOccur, setVOccur] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [seq, setSeq] = useState(() => added.reduce((m, v) => { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); return n > m ? n : m }, 0) + 1)
  const all = useMemo(() => [...added, ...VOCS], [added])
  // 필터 결과 메모이즈 — 입력창 타이핑(text state)마다 전체 목록을 재필터링하지 않도록
  const rows = useMemo(() => all.filter((v) => (fch === '전체' || v.channel === fch) && (fgrp === '전체' || v.group === fgrp) && (fst === '전체' || v.status === fst)), [all, fch, fgrp, fst])
  const { sorted: sortedRows, sort, toggle } = useSort(rows, LIST_SORT) // 컬럼 헤더 클릭으로 정렬 (정렬 후 상위 100건 표시)
  const chOpts = useMemo(() => {
    const base = ['전체', ...INPUT_CHANNELS]
    const extra = [...new Set(added.map((u) => u.channel))].filter((c) => c && !base.includes(c))
    return [...base, ...extra]
  }, [added])
  const Sel = ({ value, set, opts }) => <select className="flt" value={value} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
  const nid = (n) => `IN-${String(n).padStart(3, '0')}`
  // 공유 모드: 사용자 간 충돌 없도록 전역 고유 ID
  const uid = (k = '') => 'IN-' + Date.now().toString(36) + String(k) + Math.random().toString(36).slice(2, 6)
  const addVoc = () => {
    if (!text.trim()) { notify.toast('VOC 내용을 입력하세요'); return }
    const v = enrichRow({ channel, content: text.trim(), customer: customer.trim(), date: vDate.trim(), week: vWeek.trim(), occur: vOccur.trim() }, shared ? uid() : nid(seq))
    setAdded([v, ...added]); if (!shared) setSeq(seq + 1); setResult(v); setText(''); setCustomer('')
    if (shared) sharedInsert(toCompact([v]))
    notify.toast(`${v.id} 분류·추가됨 — ${v.group} · ${v.cat}`)
  }
  const addSheet = (sheetRows) => {
    const valid = (sheetRows || []).filter((r) => (r.content || '').trim())
    if (!valid.length) { notify.toast('내용이 입력된 행이 없습니다'); return }
    const vs = valid.map((row, k) => enrichRow({ content: row.content, channel: row.channel || '고객의소리', customer: row.customer, date: row.date, week: row.week, occur: row.occur }, shared ? uid(k) : nid(seq + k)))
    setAdded([...vs, ...added]); if (!shared) setSeq(seq + vs.length); setResult(vs[0])
    if (shared) sharedInsert(toCompact(vs))
    setSheetOpen(false)
    notify.toast(`${vs.length}건 분류·추가됨`)
  }
  return (
    <div className="screen">
      <PageHead title="VOC 수집·입력" sub="채널 수집 + 화면 직접 입력 → Copilot이 4그룹·22분류·대응영역·초안까지 자동 생성 (담당자 검수 후 처리)" />
      <div className="panel input-panel">
        <div className="ip-head">VOC 직접 입력 → Copilot 분류·추가 <span className="ip-note">내용(또는 상담콜 STT 전사)을 붙여넣으면 VOC구분1/2·대응영역·요약·예상답안·개발대응·진행상황을 채워 목록에 추가 (데모: 키워드 기반 · 담당자 검수 후 처리)</span></div>
        <div className="input-grid">
          <label className="in-field"><span>인입일자</span><input className="in-text" placeholder="2026.03.01" value={vDate} onChange={(e) => setVDate(e.target.value)} /></label>
          <label className="in-field"><span>인입 채널</span><select className="flt" value={channel} onChange={(e) => setChannel(e.target.value)}>{INPUT_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="in-field"><span>고객번호 (선택)</span><input className="in-text" placeholder="010-1234-5678" value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
          <label className="in-field"><span>월 내 주차</span><input className="in-text" placeholder="02월4주차" value={vWeek} onChange={(e) => setVWeek(e.target.value)} /></label>
          <label className="in-field"><span>발생일자</span><input className="in-text" placeholder="2026.3.1" value={vOccur} onChange={(e) => setVOccur(e.target.value)} /></label>
        </div>
        <label className="ta-label">내용 / 상담콜 STT 전사 <span className="ta-req">· 통화 전사를 붙여넣으면 핵심문장을 추출해 예상답안에 반영합니다</span></label>
        <textarea className="input-ta" rows={4} placeholder="내용 또는 상담콜 전사(STT)를 붙여넣으세요 — 예) 고객: 로그인이 자꾸 풀리고 앱이 자꾸 튕겨요. 재설치해도 똑같아요." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="ip-actions">
          <button className="btn btn-primary" onClick={addVoc}>Copilot 분류 후 추가</button>
          <button className="btn btn-ghost" onClick={() => { setText(''); setCustomer(''); setVDate(''); setVWeek(''); setVOccur(''); setResult(null) }}>초기화</button>
          <button className="btn btn-ghost" onClick={() => setSheetOpen(true)}>＋ 엑셀 시트로 입력 / 붙여넣기</button>
          {!shared && added.length > 0 && <button className="btn btn-ghost" onClick={() => notify.confirm('입력 항목 비우기', `저장된 입력 ${added.length.toLocaleString()}건을 모두 삭제할까요? (되돌릴 수 없습니다)`, () => { setAdded([]); setResult(null) }, { danger: true, confirmLabel: '모두 삭제' })}>입력 항목 비우기</button>}
          {added.length > 0 && <span className="up-summary">입력 <b>{added.length}</b>건 · 표 상단에 표시됨</span>}
        </div>
        {result && (
          <div className="classify-out">
            <div className="co-row"><span className="co-k">VOC구분1</span><GroupBadge v={result.group} /><span className={'gate-pill ' + (result.mode === '정형' ? 'gate-fix' : 'gate-open')}>{result.mode}</span></div>
            <div className="co-row"><span className="co-k">표준분류</span><Tag>{result.cat}</Tag></div>
            <div className="co-row"><span className="co-k">대응 영역</span><span className="muted">{result.area1} › {result.area2}</span></div>
            <div className="co-row"><span className="co-k">요약</span><span className="muted">{result.summary}</span></div>
            <div className="co-row"><span className="co-k">진행 / 개발</span><StatBadge v={result.status} /><span className="muted">개발 대응: {result.devNeeded}</span></div>
            <div className="co-row"><span className="co-k">신뢰 / 검토</span><ConfBadge v={result.conf} />{result.review && <span className="rev-y">검토필요 Y</span>}</div>
            <div className="co-ans"><div className="co-ans-k">예상 답안 (분류 기반 고객 응대 초안)</div><div className="co-ans-v">{result.answer}</div></div>
            <div className="co-ans"><div className="co-ans-k">예상 처리 방안</div><div className="co-ans-v">{result.action}{result.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''} · 담당 {result.org}</div></div>
            <p className="micro">{result.id} 추가됨 — 표/보드에서 확인하고 행을 클릭하면 답변 초안 등 상세가 열립니다. (담당자 검수 후 처리)</p>
          </div>
        )}
      </div>
      {sheetOpen && <PasteSheetModal onClose={() => setSheetOpen(false)} onSubmit={addSheet} />}
      <div className="filters">
        <Sel value={fch} set={setFch} opts={chOpts} />
        <Sel value={fgrp} set={setFgrp} opts={['전체', ...GROUPS]} />
        <Sel value={fst} set={setFst} opts={['전체', ...KANBAN_COLS]} />
        <span className="flt-count">{rows.length.toLocaleString()}건{added.length > 0 && <span className="muted"> (입력 {added.length.toLocaleString()})</span>}</span>
      </div>
      {rows.length > 100 && <div className="list-note">전체 {rows.length.toLocaleString()}건 중 상위 100건만 표시합니다 — 채널·구분·상태 필터로 좁혀 보세요. 행을 클릭하면 내용·심각도·상태·검토·담당 등 상세가 열립니다. (집계·대시보드는 전체 기준)</div>}
      <div className="table-wrap">
        <table className="vtable">
          <thead><tr>
            <SortTh k="id" sort={sort} toggle={toggle}>ID</SortTh>
            <SortTh k="date" sort={sort} toggle={toggle}>인입일자</SortTh>
            <SortTh k="channel" sort={sort} toggle={toggle}>채널</SortTh>
            <SortTh k="customer" sort={sort} toggle={toggle}>고객번호</SortTh>
            <SortTh k="group" sort={sort} toggle={toggle}>VOC구분1</SortTh>
            <SortTh k="cat" sort={sort} toggle={toggle}>표준분류</SortTh>
            <SortTh k="area" sort={sort} toggle={toggle}>대응영역</SortTh>
            <SortTh k="summary" sort={sort} toggle={toggle}>요약</SortTh>
            <SortTh k="week" sort={sort} toggle={toggle}>주차</SortTh>
            <SortTh k="occur" sort={sort} toggle={toggle}>발생일자</SortTh>
          </tr></thead>
          <tbody>{sortedRows.slice(0, 100).map((v) => (
            <tr key={v.id} className={v.source === 'input' ? 'row-up' : ''} onClick={() => openCase(v.id)}>
              <td className="mono">{v.id}{v.source === 'input' && <span className="src-pill">입력</span>}</td>
              <td className="muted nowrap">{v.date || '-'}</td>
              <td><ChannelChip channel={v.channel} /></td>
              <td className="muted nowrap">{v.customer}</td>
              <td><GroupBadge v={v.group} /></td><td><Tag>{v.cat}</Tag></td>
              <td className="muted nowrap">{[v.area1, v.area2].filter(Boolean).join(' › ') || '-'}</td>
              <td className="cell-content" title={v.content}>{v.summary || v.content}</td>
              <td className="muted nowrap">{v.week || '-'}</td><td className="muted nowrap">{v.occur || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- [3] Classification Board ---------- */

export default VOCInbox
