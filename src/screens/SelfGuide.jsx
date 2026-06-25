import React, { useState } from 'react'
import { PageHead } from '../ui.jsx'
import { SELF_GUIDE, buildSelfGuideSteps, buildProactiveNotice } from '../templates.js'

/* 고객 셀프 해결 가이드 에이전트(U+VOC 셀프가이드)
   - 분류 에이전트와 같은 지식(22분류 + 대응 가이드)을 공유하고, 출력만 '고객용 가이드'.
   - Copilot이 유형별 셀프 해결 단계 + 선제 안내문을 생성 → 사람이 검수 → 사이트가 고객에 노출. */
function SelfGuide({ added, notify }) {
  const [aiOn, setAiOn] = useState(true)   // ✦ Copilot 가이드 생성 활성(기본 ON — 코파일럿 산출물임을 표시)
  const [noticeFor, setNoticeFor] = useState(null) // 선제 안내문 초안을 펼친 유형(cat)
  const data = (added || []).filter((v) => v.status !== '처리 완료') // 처리 전 단계 유사 VOC
  const total = data.length
  // 비슷한 VOC를 표준분류(cat)로 그룹화 + 대표 예상답안 매칭
  const map = {}
  data.forEach((v) => {
    const m = map[v.cat] || (map[v.cat] = { cat: v.cat, group: v.group, n: 0, high: 0, answer: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++
    if (!m.answer) { m.answer = v.answer; m.sampleId = v.id }
  })
  const top = Object.values(map).sort((a, b) => b.n - a.n).slice(0, 8)
  const covered = top.reduce((s, t) => s + t.n, 0) // Copilot 생성으로 상위 유형 전부 커버
  const selfRate = total ? Math.round(covered / total * 100) : 0
  const copy = (text, label) => { try { navigator.clipboard?.writeText(text) } catch { /* noop */ } notify.toast(`${label} 복사됨 — 검수 후 발송`) }
  const explainAi = () => notify.modal('Copilot으로 셀프 가이드 생성',
    'Copilot 에이전트가 분류 지식(22분류·대응 가이드)과 처리 이력을 근거로, 자주 묻는 유형별 셀프 해결 단계와 발생/예상 고객용 선제 안내문을 생성합니다. 담당자가 검수해 확정하면 사이트가 고객에게 노출하고, 미해결 건만 상담으로 연결합니다.')

  if (!total) return <div className="screen"><PageHead title="고객 셀프 해결 가이드" sub="엔진② · 접수 전 셀프 해결 시나리오" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 자주 묻는 유형이 셀프 해결 가이드로 변환됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="고객 셀프 해결 가이드" sub="엔진② · 처리 전 단계의 비슷한 VOC를 그룹화 → Copilot이 셀프 해결 시나리오 + 선제 안내문 생성 → 검수 후 고객 노출" />
      <div className="board-bar">
        <span className={'sg-agent' + (aiOn ? ' on' : '')}>U+VOC 셀프가이드 에이전트</span>
        {aiOn && <span className="sg-basis">근거: 22분류 지식 · 대응 가이드 · 처리 이력</span>}
        <div className="bb-spacer" />
        <button className={'btn sm ' + (aiOn ? 'btn-primary' : 'btn-ghost')} onClick={() => { setAiOn((s) => !s); if (!aiOn) explainAi() }} title="Copilot이 셀프 해결 단계·선제 안내문을 생성합니다">✦ Copilot 가이드 생성{aiOn ? ' · ON' : ''}</button>
        <button className="btn btn-ghost sm" onClick={explainAi}>어떻게 동작하나요?</button>
      </div>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-l">자주 묻는 유형(그룹)</div>
          <div className="kpi-v">{top.length}<span className="kpi-unit">개</span></div>
          <span className="kpi-chip">{aiOn ? 'Copilot 생성' : '셀프 가이드화'}</span>
        </div>
        <div className="kpi-card accent brand">
          <div className="kpi-l">셀프 가이드 커버율</div>
          <div className="kpi-v">{selfRate}<span className="kpi-unit">%</span></div>
          <span className="kpi-chip brand">상위 유형 기준</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">예상 인입콜 감소</div>
          <div className="kpi-v">{covered.toLocaleString()}<span className="kpi-unit">건</span></div>
          <span className="kpi-chip">접수 전 자가 해결(데모)</span>
        </div>
      </div>
      <h2 className="sec-title">자주 묻는 VOC → 셀프 해결 시나리오 <span className="sec-note">비슷한 VOC 그룹 상위 {top.length}개 · {aiOn ? 'Copilot 생성 + 검수' : '예상답안 매칭'}</span></h2>
      <div className="guide-grid">{top.map((t) => {
        const steps = buildSelfGuideSteps(t.cat)
        const known = !!SELF_GUIDE[t.cat]
        const open = noticeFor === t.cat
        const notice = open ? buildProactiveNotice(t.cat, t.group) : null
        return (
          <div key={t.cat} className="guide-card">
            <div className="guide-head">
              <span className="guide-cat">{t.cat}</span>
              <span className="guide-freq">{t.n.toLocaleString()}건{t.high ? ` · High ${t.high}` : ''}</span>
            </div>
            {aiOn && <div className="sg-gen">✦ Copilot 생성 {known ? '· 검수 지식' : '· 분류 가이드 기반'}</div>}
            <ol className="guide-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {t.answer && <div className="guide-ans"><div className="guide-ans-k">매칭 예상답안 (고객 응대 초안)</div><div className="guide-ans-v">{t.answer}</div></div>}
            {aiOn && (
              <button className="sg-notice-btn" onClick={() => setNoticeFor(open ? null : t.cat)}>
                {open ? '▴ 선제 안내문 닫기' : '✦ 선제 안내문 초안 (발생·예상 고객)'}
              </button>
            )}
            {open && notice && (
              <div className="sg-notice">
                <div className="sg-notice-row"><span className="sg-notice-k">이메일 · 제목</span><button className="sg-copy" onClick={() => copy(notice.email.subject, '제목')}>복사</button></div>
                <div className="sg-notice-subj">{notice.email.subject}</div>
                <div className="sg-notice-row"><span className="sg-notice-k">이메일 · 본문</span><button className="sg-copy" onClick={() => copy(notice.email.body, '본문')}>복사</button></div>
                <pre className="sg-notice-body">{notice.email.body}</pre>
                <div className="sg-notice-row"><span className="sg-notice-k">문자(SMS)</span><button className="sg-copy" onClick={() => copy(notice.sms, '문자')}>복사</button></div>
                <div className="sg-notice-sms">{notice.sms}</div>
              </div>
            )}
            <div className="guide-foot"><button className="btn btn-ghost sm" onClick={() => notify.toast('셀프 해결 완료 (데모) — 인입콜 1건 예방')}>해결됐어요</button><button className="btn btn-ghost sm" onClick={() => notify.toast('미해결 — 상담사 연결 (데모)')}>상담 연결</button></div>
          </div>
        )
      })}</div>
      <div className="note-box"><b>엔진② 동작</b> — Copilot 에이전트가 처리 전 단계의 비슷한 VOC를 표준분류로 묶어 유형별 <b>셀프 해결 단계</b>와 <b>선제 안내문</b>(이메일·문자)을 생성합니다. 담당자가 검수해 확정하면 사이트가 고객에게 노출하고, <b>미해결 건만</b> 정제해 상담사에 연결하며, 처리결과는 분류 모델 학습으로 되먹임됩니다(피드백 루프).</div>
    </div>
  )
}

/* ---------- [개선 백로그] 우선순위 매긴 서비스 개선 과제 ---------- */

export default SelfGuide
