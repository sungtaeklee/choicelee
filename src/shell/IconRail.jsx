import React from 'react'
import { RAIL_ICONS, RailIcon } from '../ui.jsx'

function IconRail({ account, onLogout, notify, railView, setRail }) {
  const items = [['home', '홈'], ['grid', '솔루션 설명'], ['agent', 'Agent'], ['mail', '메일'], ['org', '조직도']]
  return (
    <nav className="rail">
      <div className="rail-top">
        {items.map(([k, l]) => <button key={k} className={'rail-ic' + (railView === k ? ' on' : '')} title={k === 'agent' ? 'VOC Agent' : l} onClick={() => setRail(k)}><RailIcon d={RAIL_ICONS[k === 'agent' ? 'chat' : k]} /><span>{l}</span></button>)}
      </div>
      <div className="rail-bot">
        <div className="rail-ai">AI</div>
        <button className="rail-ic" title="알림 · 데모" onClick={() => notify.toast('알림 (데모)')}><RailIcon d={RAIL_ICONS.bell} /></button>
        <button className="rail-avatar" title={`${account} · 클릭하면 로그아웃`} onClick={onLogout}>{(account || 'U')[0].toUpperCase()}</button>
      </div>
    </nav>
  )
}
/* ---------- [연동] 사내 에이전트 JSON 붙여넣기 → 카드 렌더링 (LLM 호출 없음) ---------- */

export default IconRail
