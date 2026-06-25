import React, { useState, useMemo } from 'react'
import { PageHead, KANBAN_COLS, avatarColor } from '../ui.jsx'
import { GROUPS, recDay } from '../classify.js'
import { SLA_DAYS } from '../templates.js'

/* 일정 — 월 캘린더(주 단위 그리드). 담당자별 색.
   · 점 일정: 인입(발생일)·SLA 마감 (날짜별 칩)
   · 기간 일정: 개발 착수~완료/배포 — 주를 가로지르는 막대(spanning bar)로 길게 표시 → 전체 일정 확인
   · 막대/칩 클릭 → 티켓 상세 이동. 검색·필터(담당자/유형/상태)·오늘·년월 이동. */
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const UNASSIGNED = '#9aa3b2'
const DAY = 86400000
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (s, n) => { try { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d) } catch { return s } }
const parse = (s) => new Date(s + 'T00:00:00')

function CalendarApp({ added = [], openCase }) {
  const now = new Date()
  const today = ymd(now)
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [q, setQ] = useState(''); const [fOwner, setFOwner] = useState('전체'); const [fGroup, setFGroup] = useState('전체'); const [fStatus, setFStatus] = useState('전체')

  // 점 일정(인입·SLA) + 기간 일정(개발 착수~완료/배포)
  const { points, ranges } = useMemo(() => {
    const points = [], ranges = []
    for (const v of added) {
      const meta = { caseId: v.id, owner: v.owner || '미지정', group: v.group, status: v.status, cat: v.cat }
      const base = recDay(v)
      if (base) points.push({ id: v.id + ':in', date: base, kind: 'intake', label: '인입', title: `${v.cat} 인입`, ...meta })
      if (base && v.status !== '처리 완료') points.push({ id: v.id + ':sla', date: addDays(base, SLA_DAYS[v.severity] || 3), kind: 'sla', label: 'SLA', title: `${v.cat} SLA 마감`, ...meta })
      if (v.devStart) {
        let end = v.deployEnd || v.devEnd || v.devStart
        if (end < v.devStart) end = v.devStart
        ranges.push({ id: v.id + ':rng', start: v.devStart, end, kind: v.deployEnd ? 'deploy' : 'dev', title: `${v.cat} 개발${v.deployEnd ? '~배포' : ''}`, ...meta })
      } else if (v.deployEnd) {
        points.push({ id: v.id + ':dp', date: v.deployEnd, kind: 'deploy', label: '배포', title: `${v.cat} 배포`, ...meta })
      }
    }
    return { points, ranges }
  }, [added])

  const ownerColor = (o) => (o && o !== '미지정' ? avatarColor(o) : UNASSIGNED)
  const owners = useMemo(() => ['전체', ...[...new Set([...points, ...ranges].map((e) => e.owner).filter((o) => o && o !== '미지정'))].sort()], [points, ranges])
  const kw = q.trim().toLowerCase()
  const match = (e) => {
    if (fOwner !== '전체' && e.owner !== fOwner) return false
    if (fGroup !== '전체' && e.group !== fGroup) return false
    if (fStatus !== '전체' && e.status !== fStatus) return false
    if (kw && !`${e.title} ${e.caseId} ${e.cat || ''} ${e.owner || ''}`.toLowerCase().includes(kw)) return false
    return true
  }
  const fPoints = useMemo(() => points.filter(match), [points, fOwner, fGroup, fStatus, kw])
  const fRanges = useMemo(() => ranges.filter(match), [ranges, fOwner, fGroup, fStatus, kw])
  const ptByDate = useMemo(() => { const m = {}; for (const p of fPoints) (m[p.date] || (m[p.date] = [])).push(p); return m }, [fPoints])

  // 6주 그리드
  const first = new Date(ym.y, ym.m, 1)
  const startDay = first.getDay()
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => new Date(ym.y, ym.m, 1 - startDay + w * 7 + d)))
  const monStart = ymd(new Date(ym.y, ym.m, 1)), monEnd = ymd(new Date(ym.y, ym.m + 1, 0))
  const legendOwners = [...new Set([...fPoints, ...fRanges].filter((e) => (e.date || e.start) >= monStart && (e.date || e.start) <= monEnd).map((e) => e.owner).filter((o) => o && o !== '미지정'))].slice(0, 12)

  // 한 주의 기간 막대 세그먼트 + 레인 배치
  const weekSegs = (week) => {
    const w0 = week[0], w0s = ymd(w0), w6s = ymd(week[6])
    const segs = []
    for (const r of fRanges) {
      if (r.end < w0s || r.start > w6s) continue
      const s = Math.max(0, Math.round((parse(r.start) - w0) / DAY))
      const e = Math.min(6, Math.round((parse(r.end) - w0) / DAY))
      segs.push({ ...r, s, e, contStart: r.start < w0s, contEnd: r.end > w6s })
    }
    segs.sort((a, b) => a.s - b.s || b.e - a.e)
    const laneEnd = [] // 레인별 마지막 점유 칼럼
    for (const seg of segs) {
      let lane = 0; while (lane < laneEnd.length && laneEnd[lane] >= seg.s) lane++
      seg.lane = lane; laneEnd[lane] = seg.e
    }
    return { segs, lanes: laneEnd.length }
  }

  const move = (delta) => setYm((s) => { const d = new Date(s.y, s.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const goToday = () => setYm({ y: now.getFullYear(), m: now.getMonth() })
  const activeFilter = q || fOwner !== '전체' || fGroup !== '전체' || fStatus !== '전체'
  const open = (caseId) => { if (caseId && openCase) openCase(caseId) }
  const BARH = 19

  return (
    <div className="screen portal-screen">
      <PageHead title="일정" sub="티켓 일정 캘린더 — 인입·SLA(점)와 개발 착수~배포(기간 막대)를 담당자별 색으로 표시" />

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

      <div className="cal2-cal">
        <div className="cal2-dows">{DOW.map((d, i) => <div key={d} className={'cal2-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{d}</div>)}</div>
        <div className="cal2-weeks">
          {weeks.map((week, wi) => {
            const { segs, lanes } = weekSegs(week)
            const band = lanes * BARH
            return (
              <div className="cal2-week" key={wi}>
                <div className="cal2-week-cells">
                  {week.map((d, di) => {
                    const ds = ymd(d), inMonth = d.getMonth() === ym.m, pts = ptByDate[ds] || []
                    return (
                      <div key={di} className={'cal2-cell' + (inMonth ? '' : ' out') + (ds === today ? ' today' : '')}>
                        <div className="cal2-daynum">{d.getDate()}</div>
                        {band > 0 && <div className="cal2-band" style={{ height: band }} />}
                        <div className="cal2-pts">
                          {pts.slice(0, 3).map((p) => (
                            <button key={p.id} className={'cal2-pt' + (p.caseId && openCase ? ' clickable' : '')} style={{ borderLeftColor: ownerColor(p.owner) }}
                              title={`${p.title} · ${p.caseId} · ${p.owner !== '미지정' ? p.owner : '미지정'}`} onClick={() => open(p.caseId)}>
                              <span className={'cal2-evk cal2-k-' + p.kind}>{p.label}</span>
                              <span className="cal2-evt">{p.title}</span>
                            </button>
                          ))}
                          {pts.length > 3 && <span className="cal2-more">+{pts.length - 3}건</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {segs.length > 0 && (
                  <div className="cal2-rbars">
                    {segs.map((seg) => (
                      <button key={seg.id} className={'cal2-rbar' + (seg.contStart ? ' cont-l' : '') + (seg.contEnd ? ' cont-r' : '') + (seg.caseId && openCase ? ' clickable' : '')}
                        style={{ left: `calc(${(seg.s / 7) * 100}% + 3px)`, width: `calc(${((seg.e - seg.s + 1) / 7) * 100}% - 6px)`, top: seg.lane * BARH, background: ownerColor(seg.owner) }}
                        title={`${seg.title} · ${seg.caseId} · ${seg.start}~${seg.end}${seg.owner !== '미지정' ? ' · ' + seg.owner : ''}`} onClick={() => open(seg.caseId)}>
                        <span className="cal2-rbar-t">{seg.title}{seg.owner !== '미지정' ? ` · ${String(seg.owner).split(' ')[0]}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className="micro" style={{ marginTop: 10 }}>막대 = 개발 착수~완료/배포 기간, 칩 = 인입·SLA. 색 = 담당자. 클릭하면 티켓 상세로 이동합니다.</p>
    </div>
  )
}
/* ---------- [조직도] 사내 조직 디렉터리 유사 UI (트리 + 프로필 · 데모/마스킹) ---------- */

export default CalendarApp
