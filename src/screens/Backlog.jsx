import React from 'react'
import { devNeeded } from '../classify.js'
import { GroupBadge, Tag, PageHead } from '../ui.jsx'

function Backlog({ added, openCase }) {
  const data = added || []
  if (!data.length) return <div className="screen"><PageHead title="개선 백로그" sub="우선순위가 매겨진 서비스 개선 과제" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 영역·유형별 개선 과제가 우선순위와 함께 정리됩니다.</div></div>
  const map = {}
  data.forEach((v) => {
    const key = v.area1 + '||' + v.cat
    const m = map[key] || (map[key] = { area1: v.area1, area2: v.area2, cat: v.cat, group: v.group, n: 0, high: 0, dev: 0, owner: v.owner, action: v.action, sample: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++; if (v.devNeeded === 'Y') m.dev++
    if (!m.sample) { m.sample = v.summary || v.content; m.sampleId = v.id }
  })
  const items = Object.values(map).map((m) => ({ ...m, score: m.high * 3 + m.n + (m.dev ? 2 : 0) })).sort((a, b) => b.score - a.score).slice(0, 20)
  const pr = (i) => i < 3 ? 'P1' : i < 8 ? 'P2' : 'P3'
  return (
    <div className="screen">
      <PageHead title="개선 백로그" sub="VOC 근거와 함께 원인·액션을 도출하고 빈도·심각도로 우선순위를 매긴 서비스 개선 과제" />
      <div className="table-wrap"><table className="vtable backlog">
        <thead><tr><th>우선순위</th><th>대응영역</th><th>유형</th><th>건수</th><th>High</th><th>개발</th><th>제안 액션</th><th>담당</th><th>대표 원문</th></tr></thead>
        <tbody>{items.map((m, i) => (
          <tr key={m.area1 + m.cat} onClick={() => m.sampleId && openCase(m.sampleId)} className="row-click">
            <td><span className={'pr-badge pr-' + pr(i).toLowerCase()}>{pr(i)}</span></td>
            <td className="nowrap muted">{m.area1} › {m.area2}</td>
            <td className="nowrap"><GroupBadge v={m.group} /> <Tag>{m.cat}</Tag></td>
            <td className="pv-num">{m.n.toLocaleString()}</td>
            <td className="pv-num">{m.high || ''}</td>
            <td className="pv-num">{m.dev ? 'Y' : ''}</td>
            <td className="nowrap">{m.action}</td>
            <td className="nowrap muted">{m.owner}</td>
            <td className="cell-content" title={m.sample}>{m.sample}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="micro">우선순위 = High 건수×3 + 건수 + 개발대응 가중치. 행을 클릭하면 대표 케이스로 이동합니다. (실제 적용 시 Jira 백로그로 연계)</p>
    </div>
  )
}

/* ---------- [발송 이력] 메일·문자 발송 이력 — 메일 앱에 임베드 ---------- */

export default Backlog
