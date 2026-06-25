import React, { useState, useMemo } from 'react'
import { PageHead, KANBAN_COLS, avatarColor } from '../ui.jsx'
import { GROUPS, recDay } from '../classify.js'
import { SLA_DAYS } from '../templates.js'

/* 일정 — 월 캘린더(그리드) + 검색·필터(담당자/유형/상태)·오늘·년월 이동.
   티켓의 인입(발생일)·SLA 마감·개발 착수/완료/배포일을 자동 일정으로 모은다.
   담당자별 고유 색으로 구분하고, 일정 클릭 → 해당 티켓 상세로 이동. */
const KIND_LABEL = { intake: '인입', sla: 'SLA', devStart: '착수', devEnd: '완료', deployEnd: '배포' }
const KIND_ORDER = { intake: 0, sla: 1, devStart: 2, devEnd: 3, deployEnd: 4 }
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const UNASSIGNED = '#9aa3b2'
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (s, n) => { try { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d) } catch { return s } }

function CalendarApp({ added = [], openCase }) {
  const now = new Date()
  const today = ymd(now)
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [q, setQ] = useState(''); const [fOwner, setFOwner] = useState('전체'); const [fGroup, setFGroup] = useState('전체'); const [fStatus, setFStatus] = useState('전체')

  // 티켓 → 일정(인입/발생 · SLA 마감 · 개발 착수/완료/배포)
  const allEvents = useMemo(() => {
    const out = []
    for (const v of added) {
      const meta = { caseId: v.id, owner: v.owner || '미지정', group: v.group, status: v.status, cat: v.cat }
      const base = recDay(v)
      if (base) out.push({ id: v.id + ':in', date: base, kind: 'intake', title: `${v.cat} 인입`, ...meta })
      if (base && v.status !== '처리 완료') out.push({ id: v.id + ':sla', date: addDays(base, SLA_DAYS[v.severity] || 3), kind: 'sla', title: `${v.cat} SLA 마감`, ...meta })
      if (v.devStart) out.push({ id: v.id + ':ds', date: v.devStart, kind: 'devStart', title: `${v.cat} 개발 착수`, ...meta })
      if (v.devEnd) out.push({ id: v.id + ':de', date: v.devEnd, kind: 'devEnd', title: `${v.cat} 개발 완료`, ...meta })
      if (v.deployEnd) out.push({ id: v.id + ':dp', date: v.deployEnd, kind: 'deployEnd', title: `${v.cat} 배포`, ...meta })
    }
    return out
  }, [added])

  // 담당자별 색 — 보드 아바타와 동일한 avatarColor 사용(인지 일치)
  const ownerColor = (o) => (o && o !== '미지정' ? avatarColor(o) : UNASSIGNED)
  const owners = useMemo(() => ['전체', ...[...new Set(allEvents.map((e) => e.owner).filter((o) => o && o !== '미지정'))].sort()], [allEvents])
  const kw = q.trim().toLowerCase()
  const filtered = useMemo(() => allEvents.filter((e) => {
    if (fOwner !== '전체' && e.owner !== fOwner) return false
    if (fGroup !== '전체' && e.group !== fGroup) return false
    if (fStatus !== '전체' && e.status !== fStatus) return false
    if (kw && !`${e.title} ${e.caseId} ${e.cat || ''} ${e.owner || ''}`.toLowerCase().includes(kw)) return false
    return true
  }), [allEvents, fOwner, fGroup, fStatus, kw])

  const byDate = useMemo(() => {
    const m = {}
    for (const e of filtered) (m[e.date] || (m[e.date] = [])).push(e)
    for (const k in m) m[k].sort((a, b) => (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]))
    return m
  }, [filtered])

  const first = new Date(ym.y, ym.m, 1)
  const startDay = first.getDay()
  const cells = Array.from({ length: 42 }, (_, i) => new Date(ym.y, ym.m, 1 - startDay + i))
  const monStart = ymd(new Date(ym.y, ym.m, 1)), monEnd = ymd(new Date(ym.y, ym.m + 1, 0))
  const legendOwners = [...new Set(filtered.filter((e) => e.date >= monStart && e.date <= monEnd).map((e) => e.owner).filter((o) => o && o !== '미지정'))].slice(0, 12)

  const move = (delta) => setYm((s) => { const d = new Date(s.y, s.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const goToday = () => setYm({ y: now.getFullYear(), m: now.getMonth() })
  const activeFilter = q || fOwner !== '전체' || fGroup !== '전체' || fStatus !== '전체'
  const onEvent = (e) => { if (e.caseId && openCase) openCase(e.caseId) }

  return (
    <div className="screen portal-screen">
      <PageHead title="일정" sub="티켓 일정 캘린더 — 인입(발생)·SLA 마감·개발 착수/완료/배포가 담당자별 색으로 표시됩니다" />

      <div className="cal2-bar">
        <div className="cal2-nav">
          <button className="cal2-navbtn" aria-label="이전 달" onClick={() => move(-1)}>‹</button>
          <span className="cal2-title">{ym.y}년 {pad(ym.m + 1)}월</span>
          <button className="cal2-navbtn" aria-label="다음 달" onClick={() => move(1)}>›</button>
          <button className="btn btn-ghost sm" onClick={goToday}>오늘</button>
        </div>
        <input className="cal2-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 일정 검색 (제목·티켓·담당)" />
        <label className="cal2-f">담당자<select value={fOwner} onChange={(e) => setFOwner(e.target.value)}>{owners.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="cal2-f">유형<select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>{['전체', ...GROUPS].map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="cal2-f">상태<select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{['전체', ...KANBAN_COLS].map((s) => <option key={s}>{s}</option>)}</select></label>
        {activeFilter && <button className="btn btn-ghost sm" onClick={() => { setQ(''); setFOwner('전체'); setFGroup('전체'); setFStatus('전체') }}>필터 초기화</button>}
      </div>

      {legendOwners.length > 0 && (
        <div className="cal2-legend">
          <span className="cal2-leg-t">담당자</span>
          {legendOwners.map((o) => <span key={o} className="cal2-leg"><span className="cal2-dot" style={{ background: ownerColor(o) }} />{String(o).split(' ')[0]}</span>)}
          <span className="cal2-leg"><span className="cal2-dot" style={{ background: UNASSIGNED }} />미지정</span>
        </div>
      )}

      <div className="cal2-grid">
        {DOW.map((d, i) => <div key={d} className={'cal2-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{d}</div>)}
        {cells.map((d, i) => {
          const ds = ymd(d), inMonth = d.getMonth() === ym.m, items = byDate[ds] || []
          return (
            <div key={i} className={'cal2-cell' + (inMonth ? '' : ' out') + (ds === today ? ' today' : '')}>
              <div className="cal2-daynum">{d.getDate()}</div>
              <div className="cal2-evs">
                {items.slice(0, 4).map((e) => (
                  <button key={e.id} className={'cal2-ev' + (e.caseId && openCase ? ' clickable' : '')} style={{ borderLeftColor: ownerColor(e.owner) }}
                    title={`${e.title} · ${e.caseId}${e.owner && e.owner !== '미지정' ? ' · ' + e.owner : ' · 미지정'}`}
                    onClick={() => onEvent(e)}>
                    <span className={'cal2-evk cal2-k-' + e.kind}>{KIND_LABEL[e.kind]}</span>
                    <span className="cal2-evt">{e.title}</span>
                  </button>
                ))}
                {items.length > 4 && <span className="cal2-more">+{items.length - 4}건</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="micro" style={{ marginTop: 10 }}>일정은 티켓의 발생일·SLA·개발/배포 일자에서 자동 생성됩니다. 막대 색 = 담당자, 배지 = 일정 종류(인입·SLA·착수·완료·배포). 클릭하면 티켓 상세로 이동합니다.</p>
    </div>
  )
}
/* ---------- [조직도] 사내 조직 디렉터리 유사 UI (트리 + 프로필 · 데모/마스킹) ---------- */

export default CalendarApp
