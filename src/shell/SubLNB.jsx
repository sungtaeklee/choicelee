import React from 'react'

function SubLNB({ screen, setScreen }) {
  const SECTIONS = [
    { label: '현황 · 분석', items: [['trends', '기간별·영역별 추이'], ['nps', 'NPS 인사이트']] },
    { label: '수집 · 자동분류', items: [['inbox', 'VOC 수집·입력'], ['board', 'VOC 보드']] },
    { label: '처리 · 개선', items: [['detail', 'VOC 처리'], ['insight', '인사이트 리포트']] },
    { label: '셀프 해결 · 엔진②', items: [['selfguide', '셀프 해결 가이드']] },
    { label: '연동 · Copilot Studio', items: [['import', 'Copilot Agent 연동']] },
  ]
  return (
    <aside className="sublnb">
      <div className="slnb-brand"><span className="brand-mark">U+</span><span className="brand-lock"><b className="brand-svc">VOICE</b><span className="brand-desc">VOC Action Copilot</span></span></div>
      {SECTIONS.map((sec) => (
        <React.Fragment key={sec.label}>
          <div className="slnb-sec-l">{sec.label}</div>
          <nav className="slnb-nav">{sec.items.map(([k, l]) => <button key={k} className={'slnb-item' + (screen === k ? ' on' : '')} onClick={() => setScreen(k)}>{l}</button>)}</nav>
        </React.Fragment>
      ))}
      <div className="slnb-sec-l">분류 체계</div>
      <div className="slnb-pin">6그룹 게이트 + 표준분류 22종<br />Copilot 분류 · 사람 검수 후 처리</div>
      <div className="slnb-foot">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b><br />공모전 MVP · 사내 전용</div>
    </aside>
  )
}

export default SubLNB
