import React, { useState, useMemo, useEffect, useRef } from 'react'

function toSpeech(t) {
  return t.replace(/U\+\s?VOICE/gi, '유플러스 보이스').replace(/U\+one/gi, '유플러스 원')
    .replace(/Copilot Studio/gi, '코파일럿 스튜디오').replace(/Microsoft/gi, '마이크로소프트').replace(/Copilot/gi, '코파일럿')
    .replace(/JSON/gi, '제이슨').replace(/SLA/gi, '에스엘에이')
    .replace(/VOC/g, '브이오씨').replace(/CX/g, '씨엑스').replace(/\bHigh\b/g, '하이').replace(/\bAI\b/g, '에이아이')
}
function buildDemoSteps(hasData, sampleId) {
  const base = [
    { rail: 'grid', doc: 'architecture', text: 'U+ VOICE는 고객의 목소리, VOC를 Microsoft 코파일럿으로 분류하고 대응까지 만들어, 사내에서 티켓처럼 처리하는 CX 코파일럿입니다.' },
    { rail: 'grid', doc: 'architecture', text: '상담 콜·앱·홈페이지에 흩어진 VOC를 4개 그룹, 22개 표준분류와 대응영역으로 자동 정리하고, 심각도와 긴급도로 우선순위를 매깁니다.' },
  ]
  const mid = hasData ? [
    { rail: 'agent', screen: 'import', text: '사내 Copilot Studio 에이전트가 VOC를 분류해 만든 결과를 JSON으로 받아, 우리 운영 스키마의 티켓으로 변환·적재합니다. 단건도 여러 건도 한 번에요.' },
    { rail: 'agent', screen: 'board', text: 'VOC 보드입니다. 지라처럼 검색·담당자·구분으로 거르고, 카드의 우선순위·라벨·담당자·SLA를 보며 판단하고 단계를 옮깁니다. 실무자가 가장 많이 보는 화면이에요.' },
    { rail: 'agent', screen: 'detail', caseId: sampleId, text: '카드를 열면 지라 티켓과 똑같습니다. 담당자·보고자·레이블·참조자, 처리가능단계와 실공수, 체크리스트와 SLA, 코멘트와 활동 이력, 관련 VOC, 그리고 AI 응대 초안까지 한 곳에 있습니다.' },
    { rail: 'agent', screen: 'detail', caseId: sampleId, text: '이 티켓을 버튼 하나로 사내 지라 형식 JSON으로 추출해, 기존 지라 운영과 그대로 연동합니다. 코파일럿이 만들고, 사이트에서 처리하고, 지라로 내보내는 닫힌 루프입니다.' },
    { rail: 'agent', screen: 'selfguide', text: '두 번째 코파일럿 에이전트는 같은 분류 지식으로 고객 셀프 해결 단계와 선제 안내문을 만듭니다. 자주 묻는 유형을 접수 전에 스스로 풀게 하고, 미해결 건만 상담으로 연결해 인입콜을 줄입니다.' },
    { rail: 'agent', screen: 'insight', text: '기간·영역별 추이와 High 리스크를 대시보드로 보고, 유사 VOC를 묶어 개선 우선순위를 자동으로 도출합니다.' },
  ] : [
    { rail: 'grid', doc: 'architecture', text: '코파일럿 에이전트 결과를 티켓으로 적재하고, 지라형 보드와 티켓 상세에서 처리한 뒤 지라 JSON으로 추출합니다. 샘플 데이터를 넣으면 실제 화면으로 확인할 수 있어요.' },
  ]
  const tail = [
    { rail: 'grid', doc: 'phase2', text: '그리고 같은 엔진을 U+one 앱에 얹어, 요금이 오른 이유를 고객이 묻기 전에 먼저 알려 주는 선제 조치로 확장됩니다.' },
    { rail: 'grid', doc: 'architecture', text: '고객의 목소리가 서비스 개선으로 이어지는 순간, U+ VOICE입니다.' },
  ]
  return [...base, ...mid, ...tail]
}
function AutoDemo({ nav, hasData, sampleId, onClose }) {
  const steps = useMemo(() => buildDemoSteps(hasData, sampleId), [hasData, sampleId])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)
  const voicesRef = useRef([])
  useEffect(() => {
    const s = synthRef.current; if (!s) return
    const load = () => { voicesRef.current = s.getVoices() }
    load(); s.onvoiceschanged = load
    return () => { if (s) { s.onvoiceschanged = null; s.cancel() } }
  }, [])
  const done = i >= steps.length
  useEffect(() => {
    if (!playing || done) return
    const step = steps[i]; nav(step)
    let cancelled = false, advanced = false
    const t1 = { id: 0 }, t2 = { id: 0 }
    const advance = () => { if (!cancelled && !advanced) { advanced = true; setI((x) => x + 1) } }
    const s = synthRef.current
    if (!muted && s) {
      s.cancel()
      const u = new SpeechSynthesisUtterance(toSpeech(step.text))
      u.lang = 'ko-KR'; u.rate = 1.05
      const ko = voicesRef.current.find((v) => (v.lang || '').toLowerCase().startsWith('ko'))
      if (ko) u.voice = ko
      u.onend = advance; u.onerror = advance
      t1.id = setTimeout(() => { try { s.speak(u) } catch { advance() } }, 280)
      t2.id = setTimeout(advance, Math.max(7000, step.text.length * 280)) // 음성이 막혀도 진행
    } else {
      t1.id = setTimeout(advance, Math.max(3800, step.text.length * 175))
    }
    return () => { cancelled = true; clearTimeout(t1.id); clearTimeout(t2.id); if (synthRef.current) synthRef.current.cancel() }
  }, [i, playing, muted, done]) // eslint-disable-line
  const cur = steps[Math.min(i, steps.length - 1)]
  const close = () => { if (synthRef.current) synthRef.current.cancel(); onClose() }
  return (
    <div className="demo-bar" role="dialog" aria-label="자동 시연">
      <div className="demo-cap">{done ? '시연이 끝났어요 — 핵심은 VOC 자동 분류 · 대응 생성 · 인사이트 · 선제조치 확장입니다.' : cur.text}</div>
      <div className="demo-ctl">
        <span className="demo-tag">● 자동 시연{!done && ` · ${i + 1}/${steps.length}`}</span>
        <span className="demo-dots">{steps.map((_, k) => <span key={k} className={'demo-dot' + (!done && k === i ? ' on' : (k < i || done ? ' past' : ''))} />)}</span>
        <div className="demo-btns">
          <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>‹ 이전</button>
          {done
            ? <button className="primary" onClick={() => { setI(0); setPlaying(true) }}>다시 보기</button>
            : <button className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ 일시정지' : '▶ 재생'}</button>}
          <button onClick={() => setI((x) => x + 1)} disabled={done}>다음 ›</button>
          <button onClick={() => setMuted((m) => !m)}>{muted ? '음성 켜기' : '음성 끄기'}</button>
          <button onClick={close}>✕ 닫기</button>
        </div>
      </div>
    </div>
  )
}

export default AutoDemo
