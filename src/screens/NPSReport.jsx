import React, { useMemo, useState } from 'react'
import { PageHead, Tag } from '../ui.jsx'
import { npsSummary, npsDrivers, npsBySegment, npsOf, NPS_LABEL, NPS_COLOR } from '../nps.js'

/* NPS 인사이트 — NPS를 Copilot이 분석하는 무대.
   분포·지표 + Copilot 드라이버 분석(비추천 원인 TOP + 개선 시 상승 추정) + 세그먼트 + 비추천 코멘트. */
function NPSReport({ added = [], openCase, notify }) {
  const data = added || []
  const sum = useMemo(() => npsSummary(data), [data])
  const drivers = useMemo(() => npsDrivers(data), [data])
  const segs = useMemo(() => npsBySegment(data).slice(0, 6), [data])
  const detractors = useMemo(() => data.filter((v) => npsOf(v).bucket === 'detractor').slice(0, 12), [data])
  const [aiOn, setAiOn] = useState(true)
  const explain = () => notify && notify.modal('Copilot으로 NPS 분석',
    'Copilot 에이전트가 NPS 비추천(Detractor) 코멘트를 22표준분류로 자동 태깅해 ‘NPS를 깎는 원인’을 도출하고, 각 원인을 해소했을 때의 NPS 상승폭을 추정합니다. VOC와 같은 분류 엔진을 그대로 재사용합니다.')

  if (!data.length) return <div className="screen"><PageHead title="NPS 인사이트" sub="추천 의향(NPS)을 Copilot이 분석" /><div className="panel empty-panel">집계할 데이터가 없습니다. VOC를 추가하면 NPS가 산출됩니다.</div></div>

  return (
    <div className="screen">
      <PageHead title="NPS 인사이트" sub="추천 의향(NPS)을 Copilot이 분석 — 비추천 원인 TOP과 개선 시 상승폭을 자동 도출, VOC 분류 엔진 재사용" />

      <div className="board-bar">
        <span className={'sg-agent' + (aiOn ? ' on' : '')}>NPS × Copilot</span>
        {aiOn && <span className="sg-basis">VOC 분류 엔진으로 비추천 코멘트 분석 · 데모(설문 점수는 VOC 신호로 추정)</span>}
        <div className="bb-spacer" />
        <button className={'btn sm ' + (aiOn ? 'btn-primary' : 'btn-ghost')} onClick={() => { setAiOn((s) => !s); if (!aiOn) explain() }}>✦ Copilot 분석{aiOn ? ' · ON' : ''}</button>
        <button className="btn btn-ghost sm" onClick={explain}>어떻게 동작하나요?</button>
      </div>

      <div className="kpi-row">
        <div className="kpi-card accent brand">
          <div className="kpi-l">NPS</div>
          <div className="kpi-v" style={{ color: sum.nps >= 0 ? 'var(--low)' : 'var(--high)' }}>{sum.nps > 0 ? '+' : ''}{sum.nps}</div>
          <span className="kpi-chip brand">추천 − 비추천 (%p)</span>
        </div>
        <div className="kpi-card"><div className="kpi-l">응답(VOC) 수</div><div className="kpi-v">{sum.n.toLocaleString()}<span className="kpi-unit">건</span></div><span className="kpi-chip">NPS 산출 기준</span></div>
        <div className="kpi-card"><div className="kpi-l">추천 고객</div><div className="kpi-v" style={{ color: NPS_COLOR.promoter }}>{sum.pPct}<span className="kpi-unit">%</span></div><span className="kpi-chip">Promoter(9–10)</span></div>
        <div className="kpi-card"><div className="kpi-l">비추천 고객</div><div className="kpi-v" style={{ color: NPS_COLOR.detractor }}>{sum.dPct}<span className="kpi-unit">%</span></div><span className="kpi-chip">Detractor(0–6)</span></div>
      </div>

      <h2 className="sec-title">분포 <span className="sec-note">추천 · 중립 · 비추천</span></h2>
      <div className="nps-bar">
        {[['promoter', sum.promoter, sum.pPct], ['passive', sum.passive, sum.paPct], ['detractor', sum.detractor, sum.dPct]].map(([k, c, p]) => (
          p > 0 ? <span key={k} className="nps-seg" style={{ width: p + '%', background: NPS_COLOR[k] }} title={`${NPS_LABEL[k]} ${c}건 (${p}%)`}>{p >= 8 ? `${NPS_LABEL[k]} ${p}%` : ''}</span> : null
        ))}
      </div>

      <h2 className="sec-title">Copilot 드라이버 분석 <span className="sec-note">NPS를 깎는 원인 TOP · 비추천 코멘트 분류</span></h2>
      <div className="panel">
        {aiOn && <div className="sg-gen" style={{ marginBottom: 10 }}>✦ Copilot 생성 · 비추천 {sum.detractor}건을 표준분류로 태깅</div>}
        <ul className="nps-drivers">
          {drivers.map((d, i) => (
            <li key={d.cat} className="nps-driver" onClick={() => d.sampleId && openCase && openCase(d.sampleId)}>
              <span className="nps-rank">{i + 1}</span>
              <span className="nps-d-main"><b>{d.cat}</b> <Tag>{d.group}</Tag></span>
              <span className="nps-d-n">{d.n}건</span>
              <span className="nps-lift" title="이 원인을 해소하면 예상되는 NPS 상승폭(추정)">해소 시 약 +{d.lift}%p</span>
            </li>
          ))}
          {!drivers.length && <li className="muted">비추천 사례가 없습니다.</li>}
        </ul>
        <p className="micro">상승폭은 ‘해당 원인의 비추천이 중립 이상으로 전환된다’는 가정의 추정치입니다(데모).</p>
      </div>

      <h2 className="sec-title">세그먼트별 NPS <span className="sec-note">대응영역 기준 · 낮은 순</span></h2>
      <div className="effect-row">{segs.map((s) => (
        <div key={s.seg} className="effect-card"><div className="effect-t">{s.seg}</div><div className="effect-d" style={{ color: s.nps >= 0 ? 'var(--low)' : 'var(--high)', fontWeight: 800 }}>NPS {s.nps > 0 ? '+' : ''}{s.nps} <span className="muted" style={{ fontWeight: 400 }}>· {s.n}건 · 비추천 {s.dPct}%</span></div></div>
      ))}</div>

      <h2 className="sec-title">비추천 코멘트 <span className="sec-note">클릭하면 처리 화면으로</span></h2>
      <div className="panel"><ul className="nps-comments">
        {detractors.map((v) => (
          <li key={v.id} onClick={() => openCase && openCase(v.id)}>
            <span className="nps-score" style={{ background: NPS_COLOR.detractor }}>{npsOf(v).score}</span>
            <span className="nps-c-body"><b>{v.cat}</b> <span className="muted">{v.summary || v.content}</span></span>
            <span className="nps-c-id">{v.id} ›</span>
          </li>
        ))}
      </ul></div>

      <div className="note-box"><b>NPS × Copilot</b> — 비추천 코멘트는 VOC와 같은 분류 엔진으로 태깅돼 ‘NPS 하락 원인’이 되고, 개선 백로그·셀프 가이드·보드 우선순위로 이어집니다. 보드/처리 화면에서도 각 건의 NPS(추천/중립/비추천)를 표시합니다.</div>
    </div>
  )
}

export default NPSReport
