import React from 'react'
import { PageHead, DemoBanner } from '../ui.jsx'

function ApprovalApp({ notify }) {
  const rows = [['4월 VOC 개선 과제 승인', '디자인시스템스쿼드', '대기'], ['셀프 가이드 콘텐츠 게시', 'VOC운영팀', '대기'], ['3월 VOC 리포트 결재', 'CX기획팀', '완료']]
  return (
    <div className="screen portal-screen">
      <PageHead title="결재" sub="결재 대기·이력 · 데모" />
      <DemoBanner>결재 항목은 예시이며,</DemoBanner>
      <div className="panel"><table className="vtable"><thead><tr><th>문서</th><th>상신</th><th>상태</th><th></th></tr></thead>
        <tbody>{rows.map(([t, who, st], i) => (
          <tr key={i}><td>{t}</td><td className="muted nowrap">{who}</td><td><span className={'appr ' + (st === '완료' ? 'appr-done' : 'appr-wait')}>{st}</span></td><td>{st === '대기' && <button className="btn btn-ghost sm" onClick={() => notify.toast('결재 승인 (데모)')}>승인</button>}</td></tr>
        ))}</tbody></table></div>
    </div>
  )
}
/* ---------- [확장 로드맵] Phase 2 — U+one 앱 선제조치 임베드 (콘셉트) ---------- */

export default ApprovalApp
