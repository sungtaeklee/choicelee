import React from 'react'
import { PageHead, DemoBanner } from '../ui.jsx'

function CalendarApp() {
  const sch = [['10:00', '11:00', 'VOC 분류 기준 리뷰', 'CX기획'], ['14:00', '15:00', '개선 백로그 우선순위 회의', '디지털CX'], ['16:30', '17:00', '셀프 가이드 시나리오 점검', '디자인시스템']]
  return (
    <div className="screen portal-screen">
      <PageHead title="일정" sub="오늘 일정 · 데모" />
      <DemoBanner>일정은 예시이며,</DemoBanner>
      <div className="panel"><ul className="sched-list">{sch.map(([s, e, t, who], i) => (
        <li key={i}><span className="sc-time">{s}<small>–{e}</small></span><span className="sc-bar" /><span className="sc-body"><b>{t}</b><span className="muted">{who}</span></span></li>
      ))}</ul></div>
    </div>
  )
}
/* ---------- [조직도] 사내 조직 디렉터리 유사 UI (트리 + 프로필 · 데모/마스킹) ---------- */

export default CalendarApp
