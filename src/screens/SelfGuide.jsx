import React, { useState } from 'react'
import { PageHead } from '../ui.jsx'
import { SELF_GUIDE, buildSelfGuideSteps, buildProactiveNotice } from '../templates.js'
import { loadSelfGuide, saveSelfGuide } from '../storage.js'
import { npsOf } from '../nps.js'

/* 셀프가이드 에이전트 '사이트용 JSON' 파서 — 한/영 키 모두 수용
   기대 형태: { week?, items:[ { cat|유형, steps|셀프단계[], notice|선제안내{email|이메일{subject,body}, sms|문자}, count?, escalate|상담연결조건? } ] } */
function parseGuideJson(raw) {
  const data = JSON.parse(raw)
  const arr = Array.isArray(data) ? data : (data.items || data.guides || data.유형 || data.가이드 || [])
  if (!Array.isArray(arr) || !arr.length) throw new Error('items 배열이 없습니다')
  const items = arr.map((it, i) => {
    const cat = it.cat || it.유형 || it.category || it.type || ''
    const stepsRaw = it.steps || it.셀프단계 || it.단계 || it.guide || []
    const n = it.notice || it.선제안내 || it.proactive || {}
    const email = n.email || n.이메일 || {}
    return {
      cat: String(cat).trim(),
      rank: it.rank || it.순위 || i + 1,
      count: Number(it.count || it.건수 || 0) || 0,
      steps: (Array.isArray(stepsRaw) ? stepsRaw : []).map((s) => String(s)).filter(Boolean),
      notice: {
        email: { subject: email.subject || email.제목 || '', body: email.body || email.본문 || '' },
        sms: n.sms || n.문자 || '',
      },
      escalate: it.escalate || it.상담연결조건 || '',
    }
  }).filter((x) => x.cat)
  if (!items.length) throw new Error('유형(cat)을 찾을 수 없습니다')
  return { week: data.week || data.주차 || '', items }
}

const SAMPLE = `{
  "week": "2026-W26",
  "items": [
    { "cat": "회원/로그인/인증", "count": 32,
      "steps": ["앱 최신 업데이트 후 재실행", "비밀번호 재설정", "PASS 인증으로 전환"],
      "notice": { "email": { "subject": "[U+] 로그인 안내", "body": "..." }, "sms": "[U+ 안내] ..." } }
  ]
}`

function SelfGuide({ added, notify }) {
  const [aiOn, setAiOn] = useState(true)
  const [noticeFor, setNoticeFor] = useState(null)
  const [imported, setImported] = useState(loadSelfGuide)        // 가져온 Copilot 가이드 JSON
  const [showImport, setShowImport] = useState(false)
  const [raw, setRaw] = useState('')
  const data = (added || []).filter((v) => v.status !== '처리 완료')
  const total = data.length

  // 비슷한 VOC를 표준분류로 그룹화
  const map = {}
  data.forEach((v) => {
    const m = map[v.cat] || (map[v.cat] = { cat: v.cat, group: v.group, n: 0, high: 0, det: 0, answer: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++; if (npsOf(v).bucket === 'detractor') m.det++
    if (!m.answer) { m.answer = v.answer; m.sampleId = v.id }
  })
  const top = Object.values(map).sort((a, b) => b.n - a.n).slice(0, 8)

  // 카드 소스: 가져온 JSON이 있으면 그것을, 없으면 데이터 기반 상위 유형
  const usingImport = !!(imported && imported.items && imported.items.length)
  const cards = usingImport
    ? imported.items.map((it) => ({ cat: it.cat, n: it.count, high: 0, answer: '', steps: it.steps.length ? it.steps : buildSelfGuideSteps(it.cat), notice: it.notice, imported: true, known: !!SELF_GUIDE[it.cat] }))
    : top.map((t) => ({ cat: t.cat, n: t.n, high: t.high, det: t.det, answer: t.answer, steps: buildSelfGuideSteps(t.cat), notice: null, imported: false, known: !!SELF_GUIDE[t.cat] }))
  const covered = (usingImport ? cards : top).reduce((s, t) => s + (t.n || 0), 0)
  const selfRate = total ? Math.round(Math.min(covered, total) / total * 100) : 0

  const copy = (text, label) => { try { navigator.clipboard?.writeText(text) } catch { /* noop */ } notify.toast(`${label} 복사됨 — 검수 후 발송`) }
  const explainAi = () => notify.modal('Copilot으로 셀프 가이드 생성',
    'Copilot 에이전트가 분류 지식과 처리 이력을 근거로 유형별 셀프 해결 단계와 선제 안내문을 생성합니다. ‘사이트용 JSON’으로 받아 이 화면에 그대로 반영(가져오기)하고, 담당자 검수 후 고객에게 노출하며, 미해결 건만 상담으로 연결합니다.')
  const doImport = () => {
    if (!raw.trim()) { notify.toast('JSON을 붙여넣어 주세요'); return }
    try {
      const parsed = parseGuideJson(raw)
      setImported(parsed); saveSelfGuide(parsed); setShowImport(false); setRaw(''); setNoticeFor(null)
      notify.toast(`Copilot 셀프 가이드 ${parsed.items.length}개를 사이트에 반영했어요`)
    } catch (e) { notify.modal('가져오기 실패', `JSON 형식을 확인해 주세요. (${e.message})\n\n기대 형식 예시:\n${SAMPLE}`) }
  }
  const clearImport = () => { setImported(null); saveSelfGuide(null); setNoticeFor(null); notify.toast('가져온 가이드를 비우고 자동 생성으로 되돌렸어요') }

  if (!total && !usingImport) return <div className="screen"><PageHead title="고객 셀프 해결 가이드" sub="엔진② · 접수 전 셀프 해결 시나리오" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하거나, 아래 <b>Copilot 가이드 JSON 가져오기</b>로 에이전트 결과를 반영하세요.<div style={{ marginTop: 12 }}><button className="btn btn-ghost sm" onClick={() => setShowImport(true)}>⤓ Copilot 가이드 JSON 가져오기</button></div></div></div>

  return (
    <div className="screen">
      <PageHead title="고객 셀프 해결 가이드" sub="엔진② · Copilot이 만든 셀프 해결 단계 + 선제 안내문 (사이트용 JSON 가져오기 지원) → 검수 후 고객 노출" />
      <div className="board-bar">
        <span className={'sg-agent' + (aiOn ? ' on' : '')}>U+VOC 셀프가이드 에이전트</span>
        {usingImport ? <span className="sg-basis">Copilot JSON 반영됨{imported.week ? ` · ${imported.week}` : ''} · {cards.length}개</span> : aiOn && <span className="sg-basis">근거: 22분류 지식 · 대응 가이드 · 처리 이력</span>}
        <div className="bb-spacer" />
        <button className="btn btn-ghost sm" onClick={() => setShowImport((s) => !s)} title="셀프가이드 에이전트의 ‘사이트용 JSON’ 출력을 붙여넣어 반영">⤓ Copilot 가이드 JSON 가져오기</button>
        {usingImport && <button className="btn btn-ghost sm" onClick={clearImport}>가져온 가이드 비우기</button>}
        <button className={'btn sm ' + (aiOn ? 'btn-primary' : 'btn-ghost')} onClick={() => { setAiOn((s) => !s); if (!aiOn) explainAi() }}>✦ Copilot 가이드 생성{aiOn ? ' · ON' : ''}</button>
      </div>

      {showImport && (
        <div className="panel sg-import">
          <div className="block-label">Copilot 가이드 JSON 가져오기 <span className="muted" style={{ fontWeight: 400 }}>· 에이전트에 “이번 주 자주 묻는 상위 5개 유형 셀프 가이드를 사이트용 JSON으로 정리해줘” → 출력 붙여넣기</span></div>
          <textarea className="of-area sg-import-ta" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={SAMPLE} spellCheck={false} />
          <div className="ip-actions">
            <button className="btn btn-primary sm" onClick={doImport}>가져오기 · 사이트 반영</button>
            <button className="btn btn-ghost sm" onClick={() => setRaw(SAMPLE)}>예시 채우기</button>
            <button className="btn btn-ghost sm" onClick={() => { setShowImport(false); setRaw('') }}>닫기</button>
          </div>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-l">{usingImport ? 'Copilot 정리 유형' : '자주 묻는 유형(그룹)'}</div><div className="kpi-v">{cards.length}<span className="kpi-unit">개</span></div><span className="kpi-chip">{usingImport ? 'JSON 반영' : 'Copilot 생성'}</span></div>
        <div className="kpi-card accent brand"><div className="kpi-l">셀프 가이드 커버율</div><div className="kpi-v">{selfRate}<span className="kpi-unit">%</span></div><span className="kpi-chip brand">상위 유형 기준</span></div>
        <div className="kpi-card"><div className="kpi-l">예상 인입콜 감소</div><div className="kpi-v">{covered.toLocaleString()}<span className="kpi-unit">건</span></div><span className="kpi-chip">접수 전 자가 해결(데모)</span></div>
      </div>

      <h2 className="sec-title">자주 묻는 VOC → 셀프 해결 시나리오 <span className="sec-note">{usingImport ? `Copilot JSON ${cards.length}개 반영` : `비슷한 VOC 그룹 상위 ${cards.length}개 · Copilot 생성 + 검수`}</span></h2>
      <div className="guide-grid">{cards.map((c) => {
        const open = noticeFor === c.cat
        const notice = open ? (c.notice && (c.notice.email.subject || c.notice.sms) ? c.notice : buildProactiveNotice(c.cat)) : null
        return (
          <div key={c.cat} className="guide-card">
            <div className="guide-head"><span className="guide-cat">{c.cat}</span><span className="guide-freq">{c.n ? `${c.n.toLocaleString()}건` : ''}{c.high ? ` · High ${c.high}` : ''}{c.det ? <span className="guide-det"> · 비추천 {c.det}</span> : null}</span></div>
            {aiOn && <div className="sg-gen">✦ Copilot {c.imported ? '정리(JSON 반영)' : (c.known ? '생성 · 검수 지식' : '생성 · 분류 가이드 기반')}</div>}
            <ol className="guide-steps">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {c.answer && <div className="guide-ans"><div className="guide-ans-k">매칭 예상답안 (고객 응대 초안)</div><div className="guide-ans-v">{c.answer}</div></div>}
            {aiOn && <button className="sg-notice-btn" onClick={() => setNoticeFor(open ? null : c.cat)}>{open ? '▴ 선제 안내문 닫기' : '✦ 선제 안내문 초안 (발생·예상 고객)'}</button>}
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
      <div className="note-box"><b>엔진② 동작</b> — Copilot 에이전트가 유형별 셀프 해결 단계와 선제 안내문을 생성합니다. <b>‘사이트용 JSON’으로 받아 이 화면에 그대로 반영(가져오기)</b>하고, 담당자 검수 후 고객에게 노출하며, 미해결 건만 상담사에 연결합니다(피드백 루프).</div>
    </div>
  )
}

/* ---------- [개선 백로그] 우선순위 매긴 서비스 개선 과제 ---------- */

export default SelfGuide
