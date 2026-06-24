import React, { useState, useRef } from 'react'
import { devNeeded } from '../classify.js'
import { StatBadge, GroupBadge, Tag } from '../ui.jsx'

function AgentPanel({ screen, caseId, added, notify, updateCases, selected, setSelected, openCase }) {
  const data = added || []
  const [done, setDone] = useState(null)
  const [reply, setReply] = useState(null)
  const inputRef = useRef(null)
  const single = (screen === 'detail') ? data.find((v) => v.id === caseId) : null
  const todo = data.filter((v) => v.status === '처리 필요')
  const sel = selected || []
  const proposed = (v) => {
    if (v.group === '장애/오류' || v.group === '성능') return v.devNeeded === 'Y' ? '개발 대응 요청 · 진행상황 안내' : 'AS 우선 배정 · 안내 SMS'
    if (v.group === '개선 요청/희망') return 'UX 개선 검토 등록 · 회신 안내'
    return '담당 확인 · 안내 SMS'
  }
  const actIds = (ids) => {
    if (!ids.length) return
    const items = data.filter((v) => ids.includes(v.id)).map((v) => ({ id: v.id, who: v.customer, cat: v.cat, from: v.status, to: '처리 완료' }))
    updateCases(ids, { status: '처리 완료' })
    setDone({ items })
    if (setSelected) setSelected([])
    notify.toast(`${ids.length}건 처리 완료 — 가운데 뷰어에 반영됨`)
  }
  // Copilot 입력 처리 — 조치 실행 + 데이터 질의(현황·검색·Top 유형)에 응답
  const topCats = (arr, n) => { const m = {}; arr.forEach((v) => { const k = v.cat; if (k) m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n) }
  const STOP = ['관련', '보여줘', '보여', '알려줘', '알려', '찾아줘', '찾아', '해줘', '좀', '건', '만', '줘', '대해', '대한', '보고싶어', '리스트', '목록', '있어', '뭐', '무슨']
  const matchCases = (text) => {
    const t = text.replace(/\s+/g, '')
    if (/high|하이|긴급|심각|중요/i.test(t)) return data.filter((v) => v.severity === 'High')
    if (/검토필요|검토/.test(t)) return data.filter((v) => v.review)
    if (/처리중/.test(t)) return data.filter((v) => v.status === '처리 중')
    if (/완료/.test(t)) return data.filter((v) => v.status === '처리 완료')
    const toks = text.split(/\s+/).map((s) => s.replace(/[을를이가은는의도와과에서]$/, '')).filter((w) => w.length >= 2 && !STOP.includes(w))
    if (!toks.length) return []
    return data.filter((v) => { const hay = `${v.cat} ${v.group} ${v.summary} ${v.content} ${v.area1} ${v.area2}`.toLowerCase(); return toks.some((tk) => hay.includes(tk.toLowerCase())) })
  }
  const runCommand = (text0) => {
    const text = (text0 || '').trim(); if (!text) return
    if (inputRef.current) inputRef.current.value = ''
    const t = text.replace(/\s+/g, '')
    // 1) 조치 실행 — 단, '~보여줘/목록/알려줘' 같은 조회 의도는 검색으로 보냄(아래 4단계)
    if (/(처리|조치|완료|해결|끝내)/.test(t) && !/(보여|목록|리스트|알려|찾|어디|현황)/.test(t)) {
      if (/(선택|고른|체크)/.test(t) && sel.length) { actIds(sel); setReply({ q: text, a: `선택한 ${sel.length}건을 처리하고 가운데 뷰어에 반영했어요.` }); return }
      if (todo.length) { const ids = todo.map((v) => v.id); actIds(ids); setReply({ q: text, a: `조치 필요 ${ids.length}건을 처리하고 가운데 뷰어에 반영했어요.` }); return }
      setReply({ q: text, a: '지금 조치 필요한 건이 없어요. VOC를 입력·붙여넣으면 여기서 바로 처리할 수 있어요.' }); return
    }
    // 2) 현황·통계
    if (/(현황|통계|개요|상황|몇건|건수|요약|정리)/.test(t)) {
      const high = data.filter((v) => v.severity === 'High').length
      const review = data.filter((v) => v.review).length
      const top = topCats(data, 3)
      setReply({ q: text, a: `전체 ${data.length.toLocaleString()}건 · 조치 필요 ${todo.length.toLocaleString()}건 · High ${high.toLocaleString()}건 · 검토필요 ${review.toLocaleString()}건`, list: top.map(([k, n]) => `${k} · ${n.toLocaleString()}건`) }); return
    }
    // 3) Top 유형
    if (/(제일많|가장많|많은유형|많이들어|top|순위|랭킹)/i.test(t)) {
      const top = topCats(data, 5)
      setReply({ q: text, a: top.length ? '많이 들어온 유형 Top 5' : '집계할 데이터가 없어요.', list: top.map(([k, n]) => `${k} · ${n.toLocaleString()}건`) }); return
    }
    // 4) 키워드/조건 검색 → 매칭 케이스(클릭하면 상세)
    const hits = matchCases(text)
    if (hits.length) {
      setReply({ q: text, a: `'${text}' 관련 ${hits.length.toLocaleString()}건을 찾았어요. 눌러서 상세를 볼 수 있어요.`, items: hits.slice(0, 6).map((v) => ({ id: v.id, label: `${v.cat} · ${(v.summary || v.content || '').slice(0, 36)}` })) }); return
    }
    // 5) 안내
    setReply({ q: text, a: '이렇게 해볼 수 있어요 — "현황 알려줘", "조치 필요 건 전부 처리", "로밍 관련 보여줘", "High만 보여줘".' })
  }
  const send = () => runCommand(inputRef.current ? inputRef.current.value : '')
  const ViewerResult = () => !done ? null : (
    <div className="ap-viewer">
      <div className="ap-viewer-h">뷰어 수정 <span className="ap-applied">✓ 반영완료</span></div>
      {done.items.slice(0, 8).map((it) => (
        <div key={it.id} className="ap-change"><b>{it.who}</b> <span className="ap-mut">{it.cat}</span><span className="ap-arrow"><span className="dot dot-todo">{it.from}</span> → <span className="dot dot-done">{it.to}</span></span></div>
      ))}
    </div>
  )
  return (
    <aside className="agent-panel">
      <div className="ap-body">
        {single ? (
          <>
            <div className="ap-card">
              <div className="ap-card-h"><b>{single.id}</b> · {single.channel}{single.week ? ` · ${single.week}` : ''}</div>
              <div className="ap-line"><GroupBadge v={single.group} /> <Tag>{single.cat}</Tag> <StatBadge v={single.status} /></div>
              <div className="ap-mut">{single.summary}</div>
              <div className="ap-mut">제안: {proposed(single)}</div>
            </div>
            <div className="ap-sec">액션 · 담당자 검수 후 실행</div>
            {single.sms && <button className="ap-act" onClick={() => notify.modal('고객 안내 문자 (초안)', single.sms)}>✉ 고객 안내 문자 보기/보내기</button>}
            {single.mail && <button className="ap-act" onClick={() => notify.modal(`담당(${single.org}) 메일 (초안)`, `${single.mail.subject}\n\n${single.mail.body}`)}>✉ 담당({single.org}) 메일 전달</button>}
            {single.status !== '처리 완료'
              ? <button className="ap-act primary" onClick={() => actIds([single.id])}>✓ 이 건 ‘처리 완료’로 변경</button>
              : <div className="ap-doneline">✓ 처리 완료됨 · 뷰어 반영됨</div>}
            <div className="ap-sec">Copilot 분석</div>
            <ul className="ap-anal">{(single.analysis || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
            <ViewerResult />
          </>
        ) : todo.length ? (
          <>
            <div className="ap-greet">조치 필요 {todo.length}건</div>
            <div className="ap-mut">아래 건들을 한 번에 처리하고, 진행상황을 가운데 뷰어에 바로 반영해요.</div>
            {todo.slice(0, 6).map((v) => (
              <div key={v.id} className="ap-item ap-item-click" role="button" tabIndex={0}
                onClick={() => openCase && openCase(v.id)}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && openCase) { e.preventDefault(); openCase(v.id) } }}>
                <div className="ap-item-h"><b>{v.customer}</b> <span className="ap-mut">{v.channel}{v.week ? ` · ${v.week}` : ''}</span><span className="dot dot-todo">조치필요</span></div>
                <div className="ap-mut">{v.cat} · {v.summary}</div>
                <div className="ap-item-act">{proposed(v)}</div>
              </div>
            ))}
            {todo.length > 6 && <div className="ap-mut">외 {todo.length - 6}건</div>}
            {sel.length > 0
              ? <button className="ap-act primary" onClick={() => actIds(sel)}>선택 {sel.length}건 조치</button>
              : <button className="ap-act primary" onClick={() => actIds(todo.map((v) => v.id))}>조치 필요 {todo.length}건 일괄 조치</button>}
            <ViewerResult />
          </>
        ) : (
          <>
            <div className="ap-greet">무엇을 도와드릴까요?</div>
            <div className="ap-mut">현재 ‘처리 필요(High)’ 건이 없습니다. VOC Inbox에서 데이터를 입력·붙여넣으면, 여기서 분류 결과와 제안 액션을 바로 처리하고 가운데 뷰어에 반영할 수 있어요.</div>
            <ViewerResult />
          </>
        )}
        {reply && (
          <div className="ap-reply">
            <div className="ap-reply-q">{reply.q}</div>
            <div className="ap-reply-a">{reply.a}</div>
            {reply.list && <ul className="ap-reply-list">{reply.list.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            {reply.items && (
              <div className="ap-reply-items">
                {reply.items.map((it) => (
                  <button key={it.id} className="ap-reply-item" onClick={() => openCase && openCase(it.id)}>{it.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ap-chips">
        {['현황 알려줘', '조치 필요 전부 처리', '로밍 관련 보여줘', 'High만 보여줘', '많은 유형 Top5'].map((c) => (
          <button key={c} className="ap-chip" onClick={() => runCommand(c)}>{c}</button>
        ))}
      </div>
      <div className="ap-input">
        <input ref={inputRef} placeholder="현황·검색·조치를 입력하세요 — 예: 로밍 관련 보여줘" onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
        <button className="ap-send" title="전달" onClick={send}>↑</button>
      </div>
    </aside>
  )
}

export default AgentPanel
