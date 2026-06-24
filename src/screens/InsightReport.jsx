import React, { useMemo, useState, useEffect } from 'react'
import { GROUPS, weekKey } from '../classify.js'
import { PageHead, DashKpi, Donut, Bar, MultiLine, SevBadge, GroupBadge, Tag, EFFECTS, useSort, SortTh } from '../ui.jsx'
import { REPLY_TEMPLATES, buildClusterReply } from '../templates.js'

/* 유사 VOC 클러스터 일괄 응대 모달 — 공통 응대문(템플릿) 작성 → 공통 문자 발송(데모) + N건 일괄 처리 */
function ClusterRespond({ cluster, onClose, bulkPatch, notify, addSent }) {
  const [text, setText] = useState(() => buildClusterReply(cluster.group, cluster.cat))
  useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  const ids = cluster.ids || []
  const insert = (t) => setText((s) => (s.trim() ? s.trim() + ' ' + t : t))
  const sendAll = () => {
    if (!text.trim()) { notify.toast('응대문을 입력하세요'); return }
    if (addSent) ids.forEach((id) => addSent({ caseId: id, kind: '문자', owner: '일괄응대', to: '(고객)', content: text.trim() }))
    notify.toast(`${ids.length}건 공통 문자 발송 기록됨 (데모) — 메일 › 발송 이력`)
  }
  const completeAll = () => { bulkPatch(ids, { status: '처리 완료' }, `${ids.length}건 처리 완료`); onClose() }
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal cluster-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>유사 VOC 일괄 응대 <span className="muted" style={{ fontWeight: 400 }}>· {cluster.area1} › {cluster.cat} · {ids.length}건</span></b><button className="modal-x" aria-label="닫기" onClick={onClose}>✕</button></div>
        <p className="modal-note">같은 유형 <b>{ids.length}건</b>에 공통 응대문을 한 번에 보내고 일괄 처리합니다. 아래 초안을 검수·수정 후 사용하세요.</p>
        <div className="cl-tpl">{REPLY_TEMPLATES.map((t) => <button key={t.key} className="cl-chip" onClick={() => insert(t.text)} title={t.text}>＋ {t.label}</button>)}</div>
        <textarea className="cl-ta" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="공통 응대문" />
        <div className="cl-foot">
          <span className="muted">High {cluster.high || 0} · 개발대응 {cluster.dev ? 'Y' : 'N'}</span>
          <div className="cl-actions">
            <button className="btn btn-ghost" onClick={sendAll}>✉ 공통 문자 발송 ({ids.length})</button>
            <button className="btn btn-primary" onClick={completeAll}>✓ {ids.length}건 처리 완료</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 백로그 테이블 정렬 키 (우선순위는 점수 순위로 고정된 m.pr 기준)
const BACKLOG_SORT = {
  pr: (m) => m.pr, area: (m) => `${m.area1} › ${m.area2}`, cat: (m) => m.cat, n: (m) => m.n,
  high: (m) => m.high, dev: (m) => m.dev, action: (m) => m.action, sample: (m) => m.sample,
}

function InsightReport({ added, openCase, updateCases, bulkPatch, notify, addSent }) {
  const data = added || []
  const [clusterOpen, setClusterOpen] = useState(null) // 일괄 응대 모달 대상 클러스터
  const dist = useMemo(() => {
    const m = {}; data.forEach((v) => { m[v.cat] = (m[v.cat] || 0) + 1 })
    const arr = Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
    const tot = data.length || 1; return arr.map((a) => ({ ...a, pct: Math.round((a.n / tot) * 100) }))
  }, [data])
  const groupSplit = useMemo(() => GROUPS.map((g) => ({ g, n: data.filter((v) => v.group === g).length })), [data])
  const maxPct = dist[0] ? dist[0].pct : 100
  const highList = data.filter((v) => v.severity === 'High')
  // 처리 완료 전 단계 VOC를 영역·유형으로 묶어 유사 VOC 그룹화 + 우선순위 (개선 백로그 통합)
  const groups = useMemo(() => {
    const pre = data.filter((v) => v.status !== '처리 완료')
    const m = {}
    pre.forEach((v) => {
      const key = v.area1 + '||' + v.cat
      const g = m[key] || (m[key] = { area1: v.area1, area2: v.area2, cat: v.cat, group: v.group, n: 0, high: 0, dev: 0, action: v.action, sampleId: '', sample: '', ids: [] })
      g.n++; g.ids.push(v.id); if (v.severity === 'High') g.high++; if (v.devNeeded === 'Y') g.dev++
      if (!g.sampleId) { g.sampleId = v.id; g.sample = v.summary || v.content }
    })
    return Object.values(m).map((g) => ({ ...g, score: g.high * 3 + g.n + (g.dev ? 2 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 12)
      .map((g, i) => ({ ...g, pr: i < 3 ? 'P1' : i < 7 ? 'P2' : 'P3' })) // 우선순위 = 점수 순위(정렬해도 고정)
  }, [data])
  const { sorted: sortedGroups, sort: gSort, toggle: gToggle } = useSort(groups, BACKLOG_SORT)
  const devCnt = data.filter((v) => v.devNeeded === 'Y').length
  const reviewN = data.filter((v) => v.review).length
  // 레퍼런스형 대시보드용 집계
  const GROUP_COLORS = { '장애/오류': '#3b5ba5', '성능': '#ff7c43', '개선 요청/희망': '#ffb020', '단순 문의/불만/기타': '#36a2c9' }
  const segs = groupSplit.filter((g) => g.n > 0).map((g) => ({ label: g.g, value: g.n, color: GROUP_COLORS[g.g] || 'var(--magenta)' }))
  const weeks = useMemo(() => { const s = new Set(); data.forEach((v) => v.week && s.add(v.week)); return [...s].sort((a, b) => weekKey(a) - weekKey(b)) }, [data])
  const weekCounts = weeks.map((w) => data.filter((v) => v.week === w).length)
  const trendSeries = [{ key: 'voc', label: 'VOC 건수', values: weekCounts, color: 'var(--magenta)' }]
  const wkDelta = weekCounts.length >= 2 ? weekCounts[weekCounts.length - 1] - weekCounts[weekCounts.length - 2] : 0
  const areaCounts = useMemo(() => { const m = {}; data.forEach((v) => { m[v.area1] = (m[v.area1] || 0) + 1 }); return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 6) }, [data])
  const highPct = Math.round((highList.length / (data.length || 1)) * 100)
  const insights = []
  if (highList.length) insights.push(`High 리스크 ${highList.length}건 — 즉시 처리 우선순위`)
  if (dist[0]) insights.push(`가장 많은 유형은 '${dist[0].k}' (${dist[0].n}건, ${dist[0].pct}%) — 우선 대응 검토`)
  if (devCnt) insights.push(`개발 대응 필요 ${devCnt}건 — 개발/UX 개선 과제로 연계`)
  if (reviewN) insights.push(`검토필요 ${reviewN}건 — 담당자 분류 확인 필요`)
  if (data.length === 0) {
    return <div className="screen"><PageHead title="인사이트 리포트" sub="High 리스크 · 유사 VOC 개선 우선순위 · 분포" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 입력하거나 엑셀을 붙여넣으면 리스크·개선 우선순위·분포가 생성됩니다.</div></div>
  }
  return (
    <div className="screen">
      <PageHead title="인사이트 리포트" sub="High 리스크 이슈 · 유사 VOC 개선 우선순위 · 분포와 자동 인사이트를 한 곳에서" />
      <div className="dash-kpis">
        <DashKpi label="총 VOC" value={data.length.toLocaleString()} unit="건" delta={wkDelta} deltaLabel="직전 주차 대비" />
        <DashKpi label="High 리스크" value={highList.length.toLocaleString()} unit="건" sub={`전체의 ${highPct}%`} accent="warn" />
        <DashKpi label="검토 필요" value={reviewN.toLocaleString()} unit="건" sub="분류 확인 필요" />
        <DashKpi label="개발 대응" value={devCnt.toLocaleString()} unit="건" sub="개발/UX 개선 연계" accent="brand" />
      </div>
      <div className="dash-charts">
        <div className="panel dash-card">
          <div className="card-title">VOC 구분(그룹) 분포 <span className="muted">총 {data.length.toLocaleString()}건</span></div>
          <div className="dash-donut">
            <Donut segments={segs} total={data.length} centerLabel="총 VOC" />
            <ul className="dash-legend">{segs.map((s) => (
              <li key={s.label}><span className="dl-dot" style={{ background: s.color }} />{s.label}<b>{Math.round((s.value / (data.length || 1)) * 100)}%</b></li>
            ))}</ul>
          </div>
        </div>
        <div className="panel dash-card">
          <div className="card-title">주차별 VOC 추이 <span className="muted">{weeks.length ? `${weeks[0]} ~ ${weeks[weeks.length - 1]}` : '데이터 없음'}</span></div>
          {weeks.length ? <MultiLine labels={weeks} series={trendSeries} perPoint={1} /> : <p className="micro">주차 데이터가 없습니다.</p>}
        </div>
        <div className="panel dash-card">
          <div className="card-title">대응영역별 건수 <span className="muted">상위 {areaCounts.length}개</span></div>
          <Bar data={areaCounts} />
        </div>
      </div>
      <div className="panel">
        <div className="card-title">High 리스크 이슈 <span className="muted">즉시 처리 우선 · {highList.length.toLocaleString()}건 · 행 클릭 시 VOC 처리로 이동</span></div>
        {highList.length ? (
          <ul className="risk-list">{highList.slice(0, 15).map((v) => (
            <li key={v.id} className="row-click" onClick={() => openCase && openCase(v.id)}><SevBadge v={v.severity} /> <span className="mono">{v.id}</span> <Tag>{v.cat}</Tag> {v.summary || v.content}</li>
          ))}{highList.length > 15 && <li className="muted">외 {(highList.length - 15).toLocaleString()}건</li>}</ul>
        ) : <p className="micro">현재 High 리스크 건이 없습니다.</p>}
      </div>
      <div className="panel">
        <div className="card-title">유사 VOC 그룹 · 개선 우선순위 <span className="muted">처리 전 단계 VOC를 영역·유형으로 묶어 우선순위화 · 행 클릭 시 대표 케이스</span></div>
        {groups.length ? (
          <div className="table-wrap"><table className="vtable backlog">
            <thead><tr>
              <SortTh k="pr" sort={gSort} toggle={gToggle}>우선순위</SortTh>
              <SortTh k="area" sort={gSort} toggle={gToggle}>대응영역</SortTh>
              <SortTh k="cat" sort={gSort} toggle={gToggle}>유형</SortTh>
              <SortTh k="n" sort={gSort} toggle={gToggle} className="pv-num">건수</SortTh>
              <SortTh k="high" sort={gSort} toggle={gToggle} className="pv-num">High</SortTh>
              <SortTh k="dev" sort={gSort} toggle={gToggle} className="pv-num">개발</SortTh>
              <SortTh k="action" sort={gSort} toggle={gToggle}>제안 액션</SortTh>
              <SortTh k="sample" sort={gSort} toggle={gToggle}>대표 원문</SortTh>
              {updateCases && <th className="bk-act-h">일괄 응대</th>}
            </tr></thead>
            <tbody>{sortedGroups.map((m) => (
              <tr key={m.area1 + m.cat} className="row-click" onClick={() => m.sampleId && openCase && openCase(m.sampleId)}>
                <td><span className={'pr-badge pr-' + m.pr.toLowerCase()}>{m.pr}</span></td>
                <td className="nowrap muted">{m.area1} › {m.area2}</td>
                <td className="nowrap"><GroupBadge v={m.group} /> <Tag>{m.cat}</Tag></td>
                <td className="pv-num">{m.n.toLocaleString()}</td>
                <td className="pv-num">{m.high || ''}</td>
                <td className="pv-num">{m.dev ? 'Y' : ''}</td>
                <td className="nowrap">{m.action}</td>
                <td className="cell-content" title={m.sample}>{m.sample}</td>
                {updateCases && <td className="bk-act" onClick={(e) => e.stopPropagation()}><button className="btn btn-ghost sm" onClick={() => setClusterOpen(m)}>✉ {m.n}건 응대</button></td>}
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="micro">처리 전 단계의 VOC가 없습니다.</p>}
        <p className="micro">우선순위 = High 건수×3 + 건수 + 개발 가중치. 처리 완료 건은 제외됩니다. (실제 적용 시 Jira 백로그로 연계)</p>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="card-title">표준분류 분포 <span className="muted">전체 {data.length.toLocaleString()}건</span></div>
          <div className="hbars hbars-wide">{dist.slice(0, 12).map((d) => (
            <div key={d.k} className="hbar-row">
              <span className="hbar-k" title={d.k}>{d.k}</span>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, d.pct / maxPct * 100) + '%' }} /></div>
              <span className="hbar-n">{d.n.toLocaleString()}건</span>
            </div>
          ))}</div>
        </div>
        <div className="panel">
          <div className="card-title">그룹(VOC구분1) 분포</div>
          <div className="hbars hbars-wide">{groupSplit.map((g) => (
            <div key={g.g} className="hbar-row">
              <span className="hbar-k"><GroupBadge v={g.g} /></span>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, g.n / (data.length || 1) * 100) + '%' }} /></div>
              <span className="hbar-n">{g.n.toLocaleString()}건</span>
            </div>
          ))}</div>
        </div>
      </div>
      <h2 className="sec-title">자동 제안 인사이트</h2>
      <div className="card-row">{insights.map((t, i) => <div key={i} className="insight-card"><span className="insight-num">{i + 1}</span>{t}</div>)}</div>
      <h2 className="sec-title">기대효과</h2>
      <div className="effect-row">{EFFECTS.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>
      {clusterOpen && updateCases && <ClusterRespond cluster={clusterOpen} onClose={() => setClusterOpen(null)} bulkPatch={bulkPatch || ((ids, p, label) => { updateCases(ids, p); notify && notify.toast(label) })} notify={notify} addSent={addSent} />}
    </div>
  )
}

/* ---------- [6] Prompt Templates ---------- */

export default InsightReport
