import React, { useState, useMemo } from 'react'
import { GROUPS, weekKey } from '../classify.js'
import { KANBAN_COLS, DONUT_COLORS, ChannelIcon, CardHead, AiBox, Donut } from '../ui.jsx'

function HomePortal({ account, added, goAgent, setRail, openCase, notify, aiMode, setAiMode }) {
  const data = added || []
  const name = (account || 'U+').split('@')[0]
  const [caseTab, setCaseTab] = useState('high')
  const [aiAns, setAiAns] = useState(null)
  // 데이터 기반 집계는 한 번만 — 탭 클릭·AI 질의(상태 변경)마다 620건을 재집계하지 않도록 [data]에 메모이즈.
  // 특히 alerts는 주차×그룹×데이터 중첩 루프라 가장 무겁다.
  const agg = useMemo(() => {
    const total = data.length
    const todo = data.filter((v) => v.status === '처리 필요').length
    const high = data.filter((v) => v.severity === 'High').length
    const doing = data.filter((v) => v.status === '처리 중').length
    const review = data.filter((v) => v.review).length
    const autoRate = total ? Math.round(((total - review) / total) * 100) : 0
    const grpMap = {}; data.forEach((v) => { grpMap[v.group] = (grpMap[v.group] || 0) + 1 })
    const groupSeg = GROUPS.filter((g) => grpMap[g]).map((g, i) => ({ label: g, value: grpMap[g], color: DONUT_COLORS[i % DONUT_COLORS.length] }))
    const catMap = {}; data.forEach((v) => { catMap[v.cat] = (catMap[v.cat] || 0) + 1 })
    const topCat = Object.entries(catMap).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 5)
    const statusDist = KANBAN_COLS.map((k) => ({ k, n: data.filter((v) => v.status === k).length }))
    const maxStatus = Math.max(1, ...statusDist.map((s) => s.n))
    const chMap = {}; data.forEach((v) => { chMap[v.channel] = (chMap[v.channel] || 0) + 1 })
    const channels = Object.entries(chMap).map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n)
    const areaMap = {}; data.forEach((v) => { if (v.area1) areaMap[v.area1] = (areaMap[v.area1] || 0) + 1 })
    const topArea = Object.entries(areaMap).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 3)
    // 이상 감지: 최신 주차 vs 직전 주차 급증
    const weeksA = [...new Set(data.map((d) => d.week).filter(Boolean))].sort((a, b) => weekKey(a) - weekKey(b))
    const alerts = []
    if (weeksA.length >= 2) {
      const cur = weeksA[weeksA.length - 1], prev = weeksA[weeksA.length - 2]
      for (const [label, acc] of [['VOC구분1', (d) => d.group], ['대응영역', (d) => d.area1]]) {
        for (const k of [...new Set(data.map(acc))]) {
          const c = data.filter((d) => acc(d) === k && d.week === cur).length
          const p = data.filter((d) => acc(d) === k && d.week === prev).length
          if (c >= 5 && c > p) { const pc = p ? Math.round((c - p) / p * 100) : 100; if (pc >= 40) alerts.push({ label, k, cur, c, p, pc }) }
        }
      }
      alerts.sort((a, b) => b.pc - a.pc)
    }
    const caseSets = {
      high: data.filter((v) => v.severity === 'High'),
      review: data.filter((v) => v.review),
      doing: data.filter((v) => v.status === '처리 중'),
    }
    const topGroups = [...groupSeg].sort((x, y) => y.value - x.value).slice(0, 2)
    return { total, todo, high, doing, review, autoRate, grpMap, groupSeg, catMap, topCat, statusDist, maxStatus, chMap, channels, areaMap, topArea, weeksA, alerts, a0: alerts[0], caseSets, topGroups }
  }, [data])
  const { total, todo, high, doing, review, autoRate, grpMap, groupSeg, catMap, topCat, statusDist, maxStatus, chMap, channels, areaMap, topArea, weeksA, alerts, a0, caseSets, topGroups } = agg
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const caseList = (caseSets[caseTab] || []).slice(0, 4)
  const barData = a0
    ? [{ n: a0.p, l: '직전 주차' }, { n: a0.c, l: '최근 주차', hot: true }]
    : topGroups.map((s, i) => ({ n: s.value, l: s.label, hot: i === 0 }))
  const barMax = Math.max(1, ...barData.map((b) => b.n))
  const anomalyTitle = a0 ? '이상 탐지 현황 알림' : '증상 유형 분포'
  const anomalyCap = a0 ? `${a0.k} ▲${a0.pc}% 급증` : '급증 패턴 없음 · 안정'
  const sampleCase = data.find((v) => v.review) || data.find((v) => v.severity === 'High') || data[0]
  const clsDoneN = data.filter((v) => v.status === '분류 완료').length
  const doneN = data.filter((v) => v.status === '처리 완료').length
  // 우측 AI 브리핑
  const brief = []
  if (todo) brief.push({ t: `처리 필요 VOC ${todo.toLocaleString()}건`, imp: 'hi' })
  if (a0) brief.push({ t: `${a0.k} 급증 ▲${a0.pc}%`, imp: 'hi' })
  if (high) brief.push({ t: `High 리스크 ${high.toLocaleString()}건 집중 관리`, imp: 'mid' })
  brief.push({ t: `자동 분류율 ${autoRate}%`, imp: 'mid' })
  if (review) brief.push({ t: `검토 필요 ${review.toLocaleString()}건`, imp: 'mid' })
  // 키워드 기반 응답(사내망 정책상 실제 AI 호출 대신, 수집 VOC 집계로 답함)
  const ask = (raw) => {
    const q = String(raw || '').trim(); if (!q) return
    const has = (...ks) => ks.some((k) => q.toLowerCase().includes(k.toLowerCase()))
    let a
    if (has('급증', '이상', '추이', '트렌드', '징후', 'spike', 'trend')) {
      a = { title: '이상 징후 · 추이 요약', lines: a0 ? [
        `${a0.k}이(가) 직전 주차 대비 ▲${a0.pc}% 급증했어요.`,
        `최근 주차 ${a0.c.toLocaleString()}건(전주 ${a0.p.toLocaleString()}건) 집중 발생 — 담당 영역 확인이 필요합니다.`,
      ] : ['최근 주차에서 급증 패턴은 감지되지 않았어요. 추이는 안정적입니다.'], act: { label: '추이 상세 보기', onClick: () => goAgent('trends') } }
    } else if (has('검토', '분류', '확인')) {
      a = { title: '검토 필요 케이스', lines: [
        `검토 필요 ${review.toLocaleString()}건이 분류 확인을 기다리고 있어요.`,
        `현재 자동 분류율은 ${autoRate}%입니다.`,
        sampleCase ? `예: “${String(sampleCase.summary || sampleCase.content || '').slice(0, 42)}…”` : null,
      ].filter(Boolean), act: { label: sampleCase ? '케이스 열기' : '케이스 보기', onClick: () => sampleCase ? (openCase && openCase(sampleCase.id)) : goAgent('detail') } }
    } else if (has('개선', '우선순위', '백로그', '요청')) {
      a = { title: '개선 우선순위', lines: [
        '개선 후보는 대응영역 기준으로 모아 백로그에서 우선순위를 매길 수 있어요.',
        `상위 유형: ${topGroups.map((s) => `${s.label} ${s.value.toLocaleString()}건`).join(' · ') || '데이터 없음'}`,
      ], act: { label: '인사이트 리포트 열기', onClick: () => goAgent('insight') } }
    } else if (has('처리', 'high', '하이', '급한', '우선', '리스크')) {
      a = { title: '처리 필요 정리', lines: [
        `처리 필요 ${todo.toLocaleString()}건 · High 리스크 ${high.toLocaleString()}건 · 처리 중 ${doing.toLocaleString()}건.`,
        '분류 보드에서 상태별로 한 번에 처리할 수 있어요.',
      ], act: { label: '분류 보드 열기', onClick: () => goAgent('board') } }
    } else {
      a = { title: 'VOC 현황 요약', lines: [
        `전체 ${total.toLocaleString()}건 · 처리 필요 ${todo.toLocaleString()} · High ${high.toLocaleString()} · 검토 필요 ${review.toLocaleString()}.`,
        `자동 분류율 ${autoRate}% · 상위 유형 ${topGroups.map((s) => `${s.label}(${s.value.toLocaleString()})`).join(' · ') || '없음'}.`,
        a0 ? `이상 징후: ${a0.k} ▲${a0.pc}% 급증.` : '이상 징후: 안정적.',
        "'급증·추이', '검토', '개선', '처리' 같은 키워드로 더 자세히 물어볼 수 있어요.",
      ], act: { label: '추이 상세 보기', onClick: () => goAgent('trends') } }
    }
    setAiAns({ q, ...a })
  }
  const askDemo = (label) => ask(label)
  const sendDemo = (el) => { const v = (el.value || '').trim(); if (!v) return; ask(v); el.value = '' }

  const cardAgent = (
    <div className="hcard">
      <CardHead title="내 VOC Agent" sub="엔진 바로가기" onMore={() => setRail('grid')} />
      <div className="agent-slots">
        <button className="agent-slot" onClick={() => goAgent('inbox')}><div className="as-k"><b>필수</b> · 분류 엔진①</div><div className="as-v">Copilot 분류</div></button>
        <button className="agent-slot" onClick={() => goAgent('selfguide')}><div className="as-k">업무 · 엔진②</div><div className="as-v">셀프 가이드</div></button>
        <button className="agent-slot" onClick={() => setRail('grid')}><div className="as-k">＋ 더보기</div><div className="as-v">둘러보기</div></button>
      </div>
    </div>
  )
  const cardAnomaly = (
    <div className="hcard signature">
      <CardHead title="이상 감지 · 자동 알림" sub={a0 ? `${a0.cur} · 직전 주차 대비` : '최근 안정'} onMore={() => goAgent('trends')} />
      {a0 ? (
        <>
          <div className="metric">
            <div className="metric-l">{a0.label} · {a0.k}</div>
            <div className="metric-main">
              <span className="metric-delta"><span className="arrow">▲</span> {a0.pc}%</span>
              <span className="metric-side">최근 주차 <b>{a0.c.toLocaleString()}</b>건 <span className="muted">(전주 {a0.p.toLocaleString()})</span></span>
            </div>
          </div>
          <AiBox
            q="급증 원인과 대응 방안을 정리했어요. 바로 진행할까요?"
            rows={[
              { tag: 'cause', label: '원인분석', text: `${a0.k} 관련 VOC가 직전 주차 대비 ${a0.pc}% 급증` },
              { tag: 'act', label: '조치결과', text: `최근 주차 ${a0.c.toLocaleString()}건 집중 발생 · 담당 영역 확인 필요` },
              { tag: 'next', label: '후속방안', text: '추이 상세 확인 → 담당 배정 · 셀프 가이드 보강' },
            ]}
            acts={[
              { label: '추이 상세 보기', onClick: () => goAgent('trends') },
              { label: '처리 시작', primary: true, onClick: () => goAgent('board') },
            ]}
          />
        </>
      ) : (
        <div className="calm">최근 주차에서 급증 패턴이 감지되지 않았어요. 추이는 안정적입니다. <button className="link-btn" onClick={() => goAgent('trends')}>추이 상세 보기</button></div>
      )}
    </div>
  )
  const cardCase = (
    <div className="hcard">
      <CardHead title="조치 필요 VOC" onMore={() => goAgent('detail')} />
      <div className="card-tabs">
        <button className={'card-tab' + (caseTab === 'high' ? ' on' : '')} onClick={() => setCaseTab('high')}>High<span className="cnt">{high}</span></button>
        <button className={'card-tab' + (caseTab === 'review' ? ' on' : '')} onClick={() => setCaseTab('review')}>검토필요<span className="cnt">{review}</span></button>
        <button className={'card-tab' + (caseTab === 'doing' ? ' on' : '')} onClick={() => setCaseTab('doing')}>처리중<span className="cnt">{doing}</span></button>
      </div>
      <div className="case-mini">
        {caseList.length ? caseList.map((v) => (
          <div key={v.id} className="case-mini-row" onClick={() => openCase && openCase(v.id)}>
            {v.severity === 'High' && <span className="badge-sev">High</span>}
            <span className="mini-t">{v.summary || v.content}</span>
            <span className="mini-n">{v.cat}</span>
          </div>
        )) : <div className="empty-mini">해당 조건의 케이스가 없어요.</div>}
      </div>
      <AiBox
        q={`처리 필요 ${todo.toLocaleString()}건을 제안 액션으로 한 번에 정리할 수 있어요.`}
        acts={[
          { label: '일괄 처리 시작', primary: true, onClick: () => goAgent('board') },
          { label: '개별 확인', onClick: () => goAgent('detail') },
        ]}
      />
    </div>
  )

  const todoCards = (
    <div className="todo-cards">
      <div className="todo-card">
        <div className="tc-head"><span>{anomalyTitle}</span></div>
        <div className="tc-bars">{barData.map((b, i) => (
          <div key={i} className="tc-bar"><div className={'tc-bcol' + (b.hot ? ' mag' : '')} style={{ height: Math.max(6, Math.round(b.n / barMax * 100)) + '%' }} /><span className="tc-bn">{b.n.toLocaleString()}건</span><span className="tc-bl" title={b.l}>{b.l}</span></div>
        ))}</div>
        <div className="tc-cap">{anomalyCap}</div>
        <button className="ai-pill-btn" onClick={() => goAgent('trends')}>추이 상세</button>
      </div>
      <div className="todo-card">
        <div className="tc-head"><span>검토 필요 케이스 정리</span></div>
        <div className="tc-quote">“{sampleCase ? (sampleCase.summary || sampleCase.content) : '검토 대상이 없어요'}”</div>
        <div className="tc-cap">검토필요 {review.toLocaleString()}건 · 분류 확인 필요</div>
        <button className="ai-pill-btn" onClick={() => sampleCase ? (openCase && openCase(sampleCase.id)) : goAgent('detail')}>케이스 열기</button>
      </div>
      <div className="todo-card">
        <div className="tc-head"><span>처리 라인 진행</span></div>
        <div className="tc-stepper">
          <div className="step done"><span className="dot">{clsDoneN.toLocaleString()}</span><span className="s-l">분류 완료</span></div>
          <span className="step-line" />
          <div className="step doing"><span className="dot">{doing.toLocaleString()}</span><span className="s-l">처리 중</span></div>
          <span className="step-line" />
          <div className="step"><span className="dot">{doneN.toLocaleString()}</span><span className="s-l">처리 완료</span></div>
        </div>
        <button className="ai-pill-btn primary" onClick={() => goAgent('board')}>분류 보드 열기</button>
      </div>
    </div>
  )

  // 홈: 우측 풀하이트 AI 독 — 이미지1
  const aiPanel = (
    <aside className="home-dock">
      <div className="dock-head"><span className="dock-spark">✦</span><b>VOC Copilot</b><span className="dock-date">오늘의 브리핑</span></div>
      <div className="dock-body">
        <h3>무엇을 도와드릴까요?</h3>
        <div className="brief-l">todo 브리핑</div>
        <div className="brief-box">{(brief.slice(0, 4)).map((b, i) => (
          <div key={i} className="brief-item"><span className="b-t">{b.t}</span><span className={'imp ' + b.imp}>{b.imp === 'hi' ? '중요도 높음' : '중요도 보통'}</span></div>
        ))}</div>
        <div className="chips">
          <button className="chip-btn" onClick={() => goAgent('trends')}>이상 징후 요약</button>
          <button className="chip-btn" onClick={() => goAgent('detail')}>처리 필요 정리</button>
          <button className="chip-btn" onClick={() => goAgent('insight')}>개선 우선순위</button>
        </div>
        <div className="ai-input as-launch" role="button" tabIndex={0} onClick={() => setAiMode && setAiMode(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAiMode && setAiMode(true) } }}>
          <div className="ai-i-top"><span className="ai-spark">✦</span>AI</div>
          <input readOnly placeholder="VOC 관련 무엇이든 물어보세요" onFocus={() => setAiMode && setAiMode(true)} />
          <div className="ai-i-bot">
            <div className="ai-i-tools"><span /></div>
            <button className="ai-send" aria-label="AI 워크스페이스 열기">↑</button>
          </div>
        </div>
        <p className="ai-foot">사내 네트워크 정책으로 데모에서는 실제 AI 호출 대신 키워드 기반으로 동작합니다.</p>
      </div>
    </aside>
  )

  // 펼침 AI 워크스페이스 — 이미지2 (좌측 카드 레일 + 중앙 AI)
  const aiWorkspace = (
    <div className="home-ai-work">
      <div className="aiw-side">
        {cardAgent}
        {cardAnomaly}
        {cardCase}
      </div>
      <div className="aiw-main">
        <div className="aiw-band"><span className="aiw-sub">AI 시작하기</span></div>
        <div className="aiw-body">
          <div className="aiw-hero">
            <div className="aiw-spark">✦</div>
            <h2>안녕하세요, <b>{name}</b> 님<span className="dot">.</span></h2>
          </div>
          <div className="aiw-inputbox">
            <div className="ai-i-top"><span className="ai-spark">✦</span>AI</div>
            <input autoFocus placeholder="어떤 일이든 시작해보세요 — VOC 분류 · 추이 · 개선" onKeyDown={(e) => { if (e.key === 'Enter') sendDemo(e.currentTarget) }} />
            <div className="ai-i-bot">
              <div className="ai-i-tools"><span /></div>
              <button className="ai-send" onClick={(e) => sendDemo(e.currentTarget.closest('.aiw-inputbox').querySelector('input'))}>↑</button>
            </div>
          </div>
          {aiAns && (
            <div className="aiw-answer">
              <div className="aiw-a-head"><span className="ai-spark">✦</span><b>{aiAns.title}</b><button className="aiw-a-x" aria-label="닫기" onClick={() => setAiAns(null)}>✕</button></div>
              <div className="aiw-a-q">“{aiAns.q}”</div>
              <ul className="aiw-a-list">{aiAns.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {aiAns.act && <button className="ai-pill-btn primary" onClick={aiAns.act.onClick}>{aiAns.act.label}</button>}
              <p className="micro">사내 네트워크 정책상 실제 AI 호출 대신 수집된 VOC 집계로 응답합니다.</p>
            </div>
          )}
          <div className="aiw-chips">
            <button className="chip-btn" onClick={() => ask('오늘 급증 VOC 정리해줘')}>오늘 급증 VOC 정리해줘</button>
            <button className="chip-btn" onClick={() => ask('검토필요 케이스 보여줘')}>검토필요 케이스 보여줘</button>
            <button className="chip-btn" onClick={() => ask('개선 우선순위 알려줘')}>개선 우선순위 알려줘</button>
          </div>
          <div className="todo-rec"><span className="tr-l">오늘의 todo 추천</span><button className="refresh" onClick={() => askDemo('todo 새로고침')}>↻ 새로고침</button></div>
          {todoCards}
          <p className="ai-foot">사내 네트워크 정책으로 데모에서는 실제 AI 호출 대신 키워드 기반으로 동작합니다. todo는 수집된 VOC 기준 추천입니다.</p>
        </div>
      </div>
    </div>
  )

  if (aiMode) return aiWorkspace

  return (
    <div className="home-shell">
      <section className="home-scroll">
        <div className="home-inner">
          <div className="home-head">
            <h1>안녕하세요, <b>{name}</b> 님<span className="dot">.</span></h1>
            <p>Simply U+로 더 나은 VOC 운영을 만들어요 · 오늘의 현황과 처리할 일을 한 곳에서.</p>
          </div>

          {total === 0 ? (
            <div className="hcard empty-home">
              <CardHead title="VOC 현황" sub="아직 데이터 없음" />
              <div className="empty-mini">수집된 VOC가 아직 없어요. <b>VOC 수집·입력</b>에서 직접 입력하거나 엑셀을 붙여넣으면 이상 감지·증상 유형·처리 현황이 자동으로 집계됩니다.</div>
              <div className="ai-acts"><button className="ai-pill-btn primary" onClick={() => goAgent('inbox')}>VOC 입력하러 가기</button><button className="ai-pill-btn" onClick={() => setRail('grid')}>솔루션 설명</button></div>
            </div>
          ) : (
            <div className="home-cols">

            {/* 핵심 카드 — 펼침 사이드와 공유 */}
            {cardAgent}

            {/* 오늘의 VOC (To-do 스탯) */}
            <div className="hcard">
              <CardHead title="오늘의 VOC" sub={`자동 분류율 ${autoRate}%`} onMore={() => goAgent('inbox')} />
              <div className="stat-row">
                <div className="stat-col"><div className="stat-l">처리 필요</div><div className="stat-v">{todo.toLocaleString()}</div></div>
                <div className="stat-col"><div className="stat-l">High 리스크</div><div className="stat-v warn">{high.toLocaleString()}</div></div>
                <div className="stat-col"><div className="stat-l">검토 필요</div><div className="stat-v">{review.toLocaleString()}</div></div>
              </div>
            </div>

            {cardAnomaly}

            {cardCase}

            {/* 증상 유형 분류 (도넛) */}
            <div className="hcard">
              <CardHead title="증상 유형 분류" sub="전체 누적" onMore={() => goAgent('trends')} />
              <div className="donut-wrap">
                <Donut segments={groupSeg} total={total} centerLabel="전체 VOC" />
                <ul className="donut-legend">{groupSeg.map((s) => <li key={s.label}><span className="lg-dot" style={{ background: s.color }} />{s.label}<b>{pct(s.value)}%</b></li>)}</ul>
              </div>
            </div>

            {/* 주요 이슈 TOP 5 */}
            <div className="hcard">
              <CardHead title="주요 이슈 TOP 5" sub="표준분류 기준" onMore={() => goAgent('insight')} />
              <ul className="mini-list">{topCat.map((it, i) => (
                <li key={it.t}><span className="mini-rank">{i + 1}</span><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
              ))}</ul>
            </div>

            {/* 진행상황 분포 */}
            <div className="hcard">
              <CardHead title="진행상황 분포" onMore={() => goAgent('board')} />
              <div className="funnel">{statusDist.map((f) => (
                <div key={f.k} className="fun-row"><span className="fun-k">{f.k}</span><div className="fun-bar-wrap"><div className="fun-bar" style={{ width: (f.n / maxStatus * 100) + '%' }}>{f.n.toLocaleString()}</div></div></div>
              ))}</div>
            </div>

            {/* 채널별 분포 */}
            <div className="hcard">
              <CardHead title="채널별 분포" sub={`합계 ${total.toLocaleString()}건`} />
              <div className="hbars">{channels.slice(0, 6).map((c) => (
                <div key={c.key} className="hbar-row">
                  <span className="hbar-k"><ChannelIcon channel={c.key} size={15} />{c.key}</span>
                  <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, c.n / channels[0].n * 100) + '%' }} /></div>
                  <span className="hbar-n">{c.n.toLocaleString()}건</span>
                </div>
              ))}</div>
            </div>

            {/* 셀프 해결 & 개선 */}
            <div className="hcard">
              <CardHead title="셀프 해결 & 개선" sub="접수 전 차단 · 과제화" />
              <div className="sub-block">
                <div className="sub-l">자주 묻는 유형 → 셀프 가이드</div>
                <ul className="mini-list">{topCat.slice(0, 3).map((it) => (
                  <li key={it.t}><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
                ))}</ul>
              </div>
              <div className="sub-block">
                <div className="sub-l">개선 우선순위 후보 (대응영역)</div>
                <ul className="mini-list">{topArea.map((it) => (
                  <li key={it.t}><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
                ))}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => goAgent('selfguide')}>셀프 가이드</button><button className="ai-pill-btn" onClick={() => goAgent('insight')}>인사이트 리포트</button></div>
            </div>

            {/* 즐겨찾는 메뉴 */}
            <div className="hcard">
              <CardHead title="즐겨찾는 메뉴" onMore={() => setRail('grid')} />
              <div className="fav-grid">
                {[['inbox', 'VOC 입력'], ['board', '분류 보드'], ['trends', '추이'], ['detail', 'VOC 처리'], ['insight', '인사이트'], ['selfguide', '셀프 가이드']].map(([k, l]) => (
                  <button key={k} className="fav-cell" onClick={() => goAgent(k)}>{l}</button>
                ))}
              </div>
              <AiBox q="자주 보는 화면을 홈에 더 추가해드릴까요?" acts={[{ label: '메뉴 편집', onClick: () => askDemo('즐겨찾기 편집') }]} />
            </div>

            {/* 오늘의 업무 (포털 데모) */}
            <div className="hcard">
              <CardHead title="오늘의 업무" sub="메일 · 알림" />
              <div className="sub-block">
                <div className="sub-l">메일</div>
                <ul className="home-list">{[['VOC 주간 리포트 공유', 'CX기획팀 · 10:24'], ['앱스토어 평점 모니터링 알림', '운영봇 · 어제']].map(([t, m], i) => <li key={i}><span className="hl-t">{t}</span><span className="hl-m">{m}</span></li>)}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => setRail('mail')}>메일</button><button className="ai-pill-btn" onClick={() => goAgent('insight')}>인사이트 리포트</button></div>
            </div>

          </div>
          )}
        </div>
      </section>
      {aiPanel}
    </div>
  )
}
/* ---------- [메일] 사내 웹메일 유사 UI (데모 받은함 + VOC 발송 이력=보낸함) ---------- */

export default HomePortal
