import React, { useState, useMemo } from 'react'
import { AREA1_LIST, GROUPS, weekKey, recDay } from '../classify.js'
import { PageHead, PivotView, MultiLine, buildPivot, ChannelChip, GroupBadge, Tag, COMBO_COLORS } from '../ui.jsx'

function VOCTrends({ added, openCase }) {
  const data0 = added || []
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('')
  const [q, setQ] = useState(''); const [fw, setFw] = useState('전체'); const [fa, setFa] = useState('전체')
  const [sd1, setSd1] = useState(''); const [sd2, setSd2] = useState('')
  // 기간 필터(시작·종료일) — 전체 화면에 적용
  const data = useMemo(() => data0.filter((d) => {
    const dd = recDay(d); if (!d1 && !d2) return true; if (!dd) return false
    if (d1 && dd < d1) return false; if (d2 && dd > d2) return false; return true
  }), [data0, d1, d2])
  const weeks = useMemo(() => [...new Set(data.map((d) => d.week).filter(Boolean))].sort((a, b) => weekKey(a) - weekKey(b)), [data])
  // 일별 추이
  const byDay = useMemo(() => {
    const m = {}; for (const d of data) { const k = recDay(d); if (k) m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([day, n]) => ({ day, n }))
  }, [data])
  const maxD = Math.max(1, ...byDay.map((x) => x.n))
  const dayRange = useMemo(() => { const ds = data0.map(recDay).filter(Boolean).sort(); return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null }, [data0])
  // VOC구분1·2 조합별 시계열(상위 8개 조합)
  const [selCombo, setSelCombo] = useState(null)
  const trend = useMemo(() => {
    const SEP = '\u0001', tot = {}, dayMap = {}, wkMap = {}
    for (const d of data) {
      const g = d.group || '기타', c = d.cat || '기타', key = g + SEP + c
      tot[key] = (tot[key] || 0) + 1
      const day = recDay(d); if (day) { (dayMap[key] || (dayMap[key] = {}))[day] = ((dayMap[key] || {})[day] || 0) + 1 }
      const w = d.week; if (w) { (wkMap[key] || (wkMap[key] = {}))[w] = ((wkMap[key] || {})[w] || 0) + 1 }
    }
    const combos = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, n], i) => { const [g, c] = key.split(SEP); return { key, g, c, n, label: `${g} › ${c}`, color: COMBO_COLORS[i % COMBO_COLORS.length] } })
    const daySeries = combos.map((cb) => ({ ...cb, values: byDay.map((b) => (dayMap[cb.key] || {})[b.day] || 0) }))
    const weekSeries = combos.map((cb) => ({ ...cb, values: weeks.map((w) => (wkMap[cb.key] || {})[w] || 0) }))
    return { combos, daySeries, weekSeries }
  }, [data, byDay, weeks])
  const pv1 = useMemo(() => buildPivot(data, (d) => d.group, (d) => d.cat), [data])
  const pv2 = useMemo(() => buildPivot(data, (d) => d.area1, (d) => d.area2), [data])
  // 발생영역 히트맵: 대응영역1 × 주차 집중도
  const heat = useMemo(() => {
    const rows = AREA1_LIST.filter((a) => data.some((d) => d.area1 === a))
    const grid = rows.map((a) => ({ area: a, cells: weeks.map((w) => data.filter((d) => d.area1 === a && d.week === w).length), sum: data.filter((d) => d.area1 === a).length }))
    const max = Math.max(1, ...grid.flatMap((r) => r.cells))
    return { rows: grid, max }
  }, [data, weeks])
  const results = data.filter((d) => {
    if (fw !== '전체' && d.week !== fw) return false
    if (fa !== '전체' && d.area1 !== fa) return false
    if (q && !((d.content || '').includes(q) || (d.summary || '').includes(q))) return false
    if (sd1 || sd2) { const dd = recDay(d); if (!dd) return false; if (sd1 && dd < sd1) return false; if (sd2 && dd > sd2) return false }
    return true
  })
  if (!data0.length) return <div className="screen"><PageHead title="기간별·영역별 추이" sub="VOC구분·대응영역 추이와 원문 검색" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 입력하거나 붙여넣으면 추이·영역 피벗이 생성됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="기간별·영역별 추이" sub="① 기간 필터 · 일별/주차별 추이 · ② 영역별(대응영역) · ③ 원문 검색" />
      <div className="panel">
        <div className="card-title">기간 필터 <span className="muted">시작·종료일로 전체 집계를 좁혀 봅니다{dayRange ? ` · 데이터 범위 ${dayRange.min} ~ ${dayRange.max}` : ''}</span></div>
        <div className="date-filter">
          <label>시작일 <input type="date" value={d1} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD1(e.target.value)} /></label>
          <span className="df-sep">~</span>
          <label>종료일 <input type="date" value={d2} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD2(e.target.value)} /></label>
          {(d1 || d2) && <button className="btn btn-ghost sm" onClick={() => { setD1(''); setD2('') }}>기간 초기화</button>}
          <span className="muted nowrap">표시 {data.length.toLocaleString()}건{(d1 || d2) ? ` / 전체 ${data0.length.toLocaleString()}` : ''}</span>
        </div>
      </div>
      <div className="panel">
        <div className="card-title">VOC구분1·2 조합별 추이 <span className="muted">상위 {trend.combos.length}개 조합 · 라인/범례를 클릭하면 해당 유형만 강조됩니다</span></div>
        <div className="lt-legend">
          {trend.combos.map((cb) => (
            <button key={cb.key} className={'lt-leg' + (selCombo === cb.key ? ' on' : '') + (selCombo && selCombo !== cb.key ? ' off' : '')} onClick={() => setSelCombo(selCombo === cb.key ? null : cb.key)}>
              <span className="lt-dot" style={{ background: cb.color }} />{cb.label}<em>{cb.n}</em>
            </button>
          ))}
          {selCombo && <button className="lt-leg clear" onClick={() => setSelCombo(null)}>전체 보기</button>}
        </div>
      </div>
      <div className="panel">
        <div className="card-title">일별 VOC 추이 <span className="muted">{byDay.length}일 · 최대 {maxD.toLocaleString()}건/일{selCombo ? ` · ${selCombo.replace('\u0001', ' › ')} 강조` : ''}</span></div>
        {byDay.length ? (
          <div className="lt-scroll"><MultiLine labels={byDay.map((b) => b.day.slice(5).replace('-', '/'))} series={trend.daySeries} sel={selCombo} onSel={setSelCombo} perPoint={16} /></div>
        ) : <p className="micro">일자(인입일자/발생일자) 정보가 있는 데이터가 없어 일별 추이를 표시할 수 없습니다.</p>}
      </div>
      <div className="panel">
        <div className="card-title">주차별 VOC 추이 <span className="muted">{data.length.toLocaleString()}건 · {weeks.length}개 주차</span></div>
        <MultiLine labels={weeks} series={trend.weekSeries} sel={selCombo} onSel={setSelCombo} />
      </div>
      <div className="panel"><div className="card-title">① 기간별 VOC 추이 <span className="muted">VOC구분1 · 구분2 × 주차</span></div><PivotView tree={pv1} weeks={weeks} l1order={GROUPS} /></div>
      <div className="panel"><div className="card-title">② 영역별 VOC <span className="muted">대응영역1 · 2 × 주차</span></div><PivotView tree={pv2} weeks={weeks} l1order={AREA1_LIST} /></div>
      <div className="panel">
        <div className="card-title">발생영역 히트맵 <span className="muted">문제 집중 구간 · 대응영역 × 주차</span></div>
        <div className="table-wrap"><table className="vtable heatmap">
          <thead><tr><th className="hm-rowh">대응영역</th>{weeks.map((w) => <th key={w} className="hm-col">{w}</th>)}<th className="hm-col">합계</th></tr></thead>
          <tbody>{heat.rows.map((r) => (
            <tr key={r.area}><td className="hm-area">{r.area}</td>{r.cells.map((n, i) => {
              const o = n / heat.max
              return <td key={i} className="hm-cell" style={{ background: n ? `rgba(230,0,126,${0.12 + o * 0.78})` : 'transparent', color: o > 0.5 ? '#fff' : 'var(--ink)' }}>{n || ''}</td>
            })}<td className="hm-sum">{r.sum.toLocaleString()}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="micro">색이 진할수록 해당 주차·영역에 VOC가 집중됨을 의미합니다 (가장 진한 칸 = {heat.max}건).</p>
      </div>
      <div className="panel">
        <div className="card-title">③ 기간·영역별 VOC 원문 검색 <span className="muted">일자(시작~종료) · 주차 · 영역 · 키워드로 검색</span></div>
        <div className="search-row">
          <label className="sr-date">일자 <input type="date" value={sd1} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setSd1(e.target.value)} /></label>
          <span className="df-sep">~</span>
          <label className="sr-date"><input type="date" value={sd2} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setSd2(e.target.value)} /></label>
          <select value={fw} onChange={(e) => setFw(e.target.value)}><option>전체</option>{weeks.map((w) => <option key={w}>{w}</option>)}</select>
          <select value={fa} onChange={(e) => setFa(e.target.value)}><option>전체</option>{AREA1_LIST.map((a) => <option key={a}>{a}</option>)}</select>
          <input placeholder="원문 키워드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          {(sd1 || sd2 || q || fw !== '전체' || fa !== '전체') && <button className="btn btn-ghost sm" onClick={() => { setSd1(''); setSd2(''); setQ(''); setFw('전체'); setFa('전체') }}>초기화</button>}
          <span className="muted nowrap">{results.length.toLocaleString()}건</span>
        </div>
        <div className="table-wrap"><table className="vtable">
          <thead><tr><th>ID</th><th>주차</th><th>채널</th><th>구분</th><th>대응영역</th><th>원문</th></tr></thead>
          <tbody>{results.slice(0, 200).map((d) => (
            <tr key={d.id} className="row-click" onClick={() => openCase && openCase(d.id)}><td className="mono">{d.id}</td><td className="nowrap muted">{d.week || '-'}</td><td><ChannelChip channel={d.channel} /></td><td className="nowrap"><GroupBadge v={d.group} /> <Tag>{d.cat}</Tag></td><td className="nowrap muted">{d.area1} › {d.area2}</td><td className="cell-content" title={d.content}>{d.summary || d.content}</td></tr>
          ))}</tbody>
        </table></div>
        {results.length > 200 && <p className="micro">상위 200건만 표시 — 검색어/필터로 좁혀주세요.</p>}
      </div>
    </div>
  )
}

/* ---------- 공통: 도넛 차트 + 색상 (홈 현황 요약에서 사용) ---------- */

export default VOCTrends
