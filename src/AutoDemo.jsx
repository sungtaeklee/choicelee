import React, { useState, useMemo, useEffect, useRef } from 'react'

function toSpeech(t) {
  return t.replace(/U\+\s?VOICE/gi, '유플러스 보이스').replace(/U\+one/gi, '유플러스 원')
    .replace(/VOC/g, '브이오씨').replace(/CX/g, '씨엑스').replace(/\bHigh\b/g, '하이').replace(/\bAI\b/g, '에이아이')
}
function buildDemoSteps(hasData, sampleId) {
  const base = [
    { rail: 'grid', doc: 'architecture', text: 'U+ VOICE는 고객의 목소리, VOC를 AI가 자동으로 분류하고 대응까지 만들어 주는 CX 코파일럿입니다.' },
    { rail: 'grid', doc: 'architecture', text: '상담 콜·앱·홈페이지에 흩어진 VOC를 4개 그룹, 22개 표준분류로 자동 정리하고, 감성과 긴급도로 우선순위를 매깁니다.' },
  ]
  const mid = hasData ? [
    { rail: 'agent', screen: 'board', text: '분류된 VOC는 칸반 보드에서 처리 상태별로 한눈에 관리됩니다.' },
    { rail: 'agent', screen: 'detail', caseId: sampleId, text: '각 건마다 AI가 요약·분석·예상 답안, 그리고 고객 문자 초안까지 자동으로 생성합니다. 담당자는 검수만 하면 됩니다.' },
    { rail: 'agent', screen: 'insight', text: '기간별·영역별 추이와 High 리스크를 대시보드로 보고, 개선 우선순위를 자동으로 도출합니다.' },
  ] : [
    { rail: 'grid', doc: 'architecture', text: '각 VOC마다 AI가 요약·분석·예상 답안과 고객 문자 초안까지 자동으로 만들고, 기간별·영역별 추이와 인사이트를 대시보드로 보여 줍니다. 샘플 데이터를 넣으면 실제 화면으로 확인할 수 있어요.' },
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
