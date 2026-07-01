import React, { useState, useMemo } from 'react'
import { GROUPS, GROUP_MODE, FIXED_DEPTH2, CAT22, recDay } from '../classify.js'
import { KANBAN_COLS, VOCS, SevBadge, GroupBadge, Tag, ChannelIcon, Avatar, PageHead } from '../ui.jsx'
import { SLA_DAYS } from '../templates.js'
import { toJiraCsv, exportCsv } from '../jira.js'
import { nameOfEmail } from '../directory.js'
import { npsOf, NPS_COLOR, NPS_LABEL } from '../nps.js'

/* 티켓 유형 글리프 (지라 이슈 타입 대체) */
const TYPE_GLYPH = { '장애/오류': '🐞', '성능': '⚡', '개선 요청/희망': '✦', '단순 문의': '💬', '불만': '😣', '기타': '🎫' }
const COL_CLS = { '신규': 'new', '분류 완료': 'cls', '처리 필요': 'todo', '처리 중': 'doing', '보류(BLOCK)': 'block', '처리 완료': 'done' }

function ClassificationBoard({ openCase, notify, added, updateCases }) {
  const all = useMemo(() => [...(added || []), ...VOCS], [added])
  const [dragCol, setDragCol] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [q, setQ] = useState(''); const [fOwner, setFOwner] = useState('전체'); const [fGroup, setFGroup] = useState('전체')
  const [showTax, setShowTax] = useState(false)

  const owners = useMemo(() => ['전체', '미지정', ...[...new Set(all.map((v) => v.owner).filter(Boolean))]], [all])
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return all.filter((v) => {
      if (fGroup !== '전체' && v.group !== fGroup) return false
      if (fOwner === '미지정') { if (v.owner) return false } else if (fOwner !== '전체' && v.owner !== fOwner) return false
      if (kw && !`${v.id} ${v.summary} ${v.content} ${v.cat} ${(v.labels || []).join(' ')} ${v.owner}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [all, q, fOwner, fGroup])
  const byStatus = useMemo(() => {
    const m = {}; for (const col of KANBAN_COLS) m[col] = []
    for (const v of filtered) (m[v.status] || (m[v.status] = [])).push(v)
    return m
  }, [filtered])

  const move = (v, dir) => {
    const i = KANBAN_COLS.indexOf(v.status), j = i + dir
    if (i < 0 || j < 0 || j >= KANBAN_COLS.length) return
    const to = KANBAN_COLS[j]
    updateCases([v.id], { status: to }); notify.toast(`${v.id} → ${to} (저장됨)`)
  }
  const slaOf = (v) => {
    const d = recDay(v); if (!d || v.status === '처리 완료') return null
    const age = Math.max(0, Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000))
    const over = age - (SLA_DAYS[v.severity] || 3)
    return over > 0 ? { over: true, text: `SLA +${over}d` } : { over: false, text: `D-${-over}` }
  }
  const activeFilter = q || fOwner !== '전체' || fGroup !== '전체'
  // 지라 "CSV 가져오기"용 — Power Automate 없이 Jira Import로 일괄 생성
  const exportCsvAll = () => {
    if (!filtered.length) { notify.toast('추출할 티켓이 없습니다'); return }
    exportCsv(toJiraCsv(filtered), `voc-jira-${filtered.length}건.csv`)
    notify.toast(`지라 CSV ${filtered.length}건 저장됨 — Jira ‘이슈 가져오기’에 업로드`)
  }

  return (
    <div className="screen">
      <PageHead title="VOC 보드" sub="티켓을 보고·판단·처리하는 작업 보드 — 카드를 드래그하거나 ‹ › 로 단계 이동, 클릭하면 티켓 상세" />
      {/* 지라형 보드 툴바: 검색 · 담당자 · 구분 필터 */}
      <div className="board-bar">
        <input className="bb-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 보드 검색 (ID·요약·내용·라벨·담당)" />
        <label className="bb-f">담당자<select value={fOwner} onChange={(e) => setFOwner(e.target.value)}>{owners.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="bb-f">구분<select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>{['전체', ...GROUPS].map((g) => <option key={g}>{g}</option>)}</select></label>
        <span className="muted nowrap">{filtered.length.toLocaleString()}건{activeFilter ? ` / 전체 ${all.length.toLocaleString()}` : ''}</span>
        {activeFilter && <button className="btn btn-ghost sm" onClick={() => { setQ(''); setFOwner('전체'); setFGroup('전체') }}>필터 초기화</button>}
        <div className="bb-spacer" />
        <button className="btn btn-ghost sm" onClick={exportCsvAll} title="현재 필터된 티켓을 Jira ‘이슈 가져오기’용 CSV로 추출 — 일괄 생성">⤓ 지라 CSV ({filtered.length})</button>
        <button className="btn btn-ghost sm" onClick={() => setShowTax((s) => !s)}>{showTax ? '분류 체계 닫기' : '분류 체계 보기'}</button>
        <button className="btn btn-primary sm" onClick={() => notify.modal('Copilot AI로 분류', '실제 적용 시 Copilot AI가 최신 수집 VOC를 6개 그룹·22개 표준분류 기준으로 자동 분류합니다. 정형 그룹은 닫힌 분류로 매핑하고, 열림 그룹은 22개로 추론합니다.')}>✦ Copilot 분류</button>
      </div>
      {showTax && (
        <div className="panel">
          <div className="block-label">열림 그룹 표준분류 22</div>
          <div className="cat22">{CAT22.map((c, i) => <span key={c} className="cat22-item"><b>{i + 1}</b>{c}</span>)}</div>
          <div className="block-label" style={{ marginTop: '10px' }}>정형 그룹(닫힌 분류 · AI 재판단 불필요)</div>
          <div className="fixed-list">{Object.entries(FIXED_DEPTH2).map(([g, arr]) => <div key={g} className="fx-row"><GroupBadge v={g} /><span className="muted">{arr.join(' · ')}</span></div>)}</div>
        </div>
      )}

      <div className="jboard-wrap">
      <div className="jboard">
        {KANBAN_COLS.map((col) => {
          const items = byStatus[col] || []
          return (
            <div key={col} className={'jcol jcol-' + COL_CLS[col] + (dragCol === col ? ' jcol-over' : '')}
              onDragOver={(e) => { e.preventDefault(); if (dragCol !== col) setDragCol(col) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragCol((c) => c === col ? null : c) }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { updateCases([id], { status: col }); notify.toast(`${id} → ${col} (저장됨)`) } setDragCol(null); setDragId(null) }}>
              <div className="jcol-head"><span className="jcol-dot" /><span className="jcol-name">{col}</span><span className="jcount">{items.length}</span></div>
              <div className="jcol-body">
                {items.map((v) => {
                  const sla = slaOf(v)
                  const le = (v.activity || []).filter((a) => a.who).slice(-1)[0] // 최종 수정 활동
                  const editor = le ? nameOfEmail(le.who) : null
                  return (
                    <div key={v.id} className={'jcard' + (dragId === v.id ? ' jcard-drag' : '')} draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.id); e.dataTransfer.effectAllowed = 'move'; setDragId(v.id) }}
                      onDragEnd={() => { setDragCol(null); setDragId(null) }}
                      onClick={() => openCase(v.id)}>
                      <div className="jcard-top">
                        <span className="jtype" title={v.group}>{TYPE_GLYPH[v.group] || '🎫'}</span>
                        <span className="jcard-id">{v.id}</span>
                        {v.review && <span className="jrev">검토</span>}
                        <SevBadge v={v.severity} />
                        {(() => { const np = npsOf(v); return <span className="jnps" style={{ background: NPS_COLOR[np.bucket] }} title={`NPS ${np.score} · ${NPS_LABEL[np.bucket]}`}>{np.score}</span> })()}
                      </div>
                      <div className="jcard-title" title={v.content}>{v.summary || v.content}</div>
                      <div className="jcard-labels">
                        {(v.labels || []).slice(0, 2).map((l) => <span key={l} className="jlabel">{l}</span>)}
                        <Tag>{v.cat}</Tag>
                      </div>
                      <div className="jcard-foot">
                        <span className="jcard-ch" title={v.channel}><ChannelIcon channel={v.channel} size={13} /></span>
                        {sla && <span className={'jsla' + (sla.over ? ' over' : '')}>{sla.text}</span>}
                        {editor && <span className="jcard-editor" title={`최종 수정: ${editor} (${le.who}) · ${new Date(le.t).toLocaleString('ko-KR')}`}>✎ {editor}</span>}
                        <span className="jcard-spacer" />
                        <div className="jcard-move" onClick={(e) => e.stopPropagation()}>
                          <button className="kmove" aria-label={`${v.id} 이전 단계`} title="이전 단계로" disabled={KANBAN_COLS.indexOf(v.status) <= 0} onClick={() => move(v, -1)}>‹</button>
                          <button className="kmove" aria-label={`${v.id} 다음 단계`} title="다음 단계로" disabled={KANBAN_COLS.indexOf(v.status) >= KANBAN_COLS.length - 1} onClick={() => move(v, 1)}>›</button>
                        </div>
                        <Avatar name={v.owner} size={22} />
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && <div className="jempty">{dragCol === col ? '여기로 이동' : '—'}</div>}
              </div>
            </div>
          )
        })}
      </div>
      </div>
      <p className="micro" style={{ marginTop: 10 }}>티켓 = VOC 케이스. 카드 클릭 → 상세(보고자·레이블·참조자·체크리스트·SLA·활동 이력). 드래그/‹ ›로 단계 이동, 저장됩니다.</p>
    </div>
  )
}

export default ClassificationBoard
