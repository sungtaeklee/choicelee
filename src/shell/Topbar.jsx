import React from 'react'
import { ShareBadge } from '../ui.jsx'

function Topbar({ title, mode, setMode, agentTitle, shareState, sharedEnabled, onShareTools }) {
  return (
    <header className="topbar">
      {mode !== 'expanded' && (
        <div className="tb-main">
          <div className="crumb">U+ VOICE<span className="crumb-sep">›</span>VOC Action Copilot<span className="crumb-sep">›</span><b>{title}</b></div>
          <div className="tb-main-right">
            <ShareBadge state={shareState} />
            {sharedEnabled && <button className="tb-share-btn" onClick={onShareTools} title="공유 저장소 도구 (데모)">⚙ 공유 저장소 도구</button>}
            <span className="ai-pill">● Copilot 연결됨 (데모)</span>
            {mode === 'collapsed' && <button className="tb-open" onClick={() => setMode('split')} title="Agent 패널 열기"><span className="tb-open-i">‹</span>Agent</button>}
          </div>
        </div>
      )}
      {mode !== 'collapsed' && (
        <div className="tb-agent">
          <span className="tb-agent-title">{agentTitle}</span>
          <div className="tb-agent-ctrl">
            <button onClick={() => setMode(mode === 'expanded' ? 'split' : 'expanded')} title={mode === 'expanded' ? '분할 보기' : 'Agent 전체화면'}>{mode === 'expanded' ? '⤡' : '⤢'}</button>
            {mode !== 'expanded' && <button onClick={() => setMode('collapsed')} title="Agent 패널 접기">»</button>}
          </div>
        </div>
      )}
    </header>
  )
}

export default Topbar
