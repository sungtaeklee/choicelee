import React from 'react'

/* ============================================================
   솔루션 설명 — 3개 탭: 솔루션 구조(TO-BE) · 에이전트 & 프롬프트 · 확장 로드맵(Phase 2)
   현재 솔루션 기준(코파일럿 에이전트 2종 · 6분류 · 닫힌 루프 · 지식 학습)으로 정리.
   ============================================================ */

/* ---------- 탭 1: 솔루션 구조 (TO-BE) ---------- */
function Architecture() {
  const loop = ['코파일럿 분류·생성', '담당자 검수', '사이트 처리(보드·티켓)', '지라 연동(CSV·메일)', '처리결과 재학습']
  const parts = [
    { t: 'U+VOC 고객가이드', d: '분류·분석 에이전트 — 6분류·22표준분류·대응영역, 요약·응대문·개선과제', tag: '에이전트' },
    { t: 'U+VOC 셀프가이드', d: '고객 셀프 해결 단계 + 선제 안내문 생성, 미해결만 상담 연결', tag: '에이전트' },
    { t: 'U+ VOICE 운영 사이트', d: 'VOC 보드 · 처리(지라형 티켓) · 셀프 가이드 · 인사이트 · 일정 · Copilot 연동', tag: '사이트' },
  ]
  const intake = [
    { t: '채널 수집', d: '상담콜 · 앱 · 홈페이지 · 메달리아' },
    { t: '전처리', d: 'STT · 개인정보 마스킹' },
    { t: '자동 분류', d: '6그룹 · 22표준분류 · 대응영역' },
    { t: '우선순위화', d: '심각도 · 감성 · 신뢰도(검토필요)' },
  ]
  const effects = [
    { t: '상담 Call 감소', d: '셀프 해결 · 선제 안내로 인입 감소' },
    { t: 'VOC 감소', d: '근본 원인 개선 반영' },
    { t: '분류 자동화', d: '수기 태깅 제거 · 일관성' },
    { t: '대응 속도 향상', d: '실시간 처리 · 지라 연동' },
  ]
  return (
    <div className="screen">
      <div className="voice-banner">
        <div className="vb-lock"><span className="brand-mark lg">U+</span><span className="brand-lock"><b className="brand-svc lg">VOICE</b><span className="brand-desc">VOC Orchestration &amp; Insight-driven CX Engine</span></span></div>
        <p className="vb-tag">고객의 목소리를 분석해, 실행 가능한 CX 개선 액션으로 연결하는 AI 서비스</p>
        <div className="vb-acro">
          {[['V', 'VOC', '고객의 목소리'], ['O', 'Orchestration', '흩어진 VOC를 연결·조율'], ['I', 'Insight-driven', '인사이트 기반 분석'], ['C', 'CX', '고객경험 개선'], ['E', 'Engine', '실행을 돕는 AI 엔진']].map(([k, t, d]) => (
            <div key={k} className="vb-acro-i"><span className="vb-acro-k">{k}</span><b>{t}</b><span>{d}</span></div>
          ))}
        </div>
        <p className="vb-slogan">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b></p>
      </div>

      <div className="page-head"><div>
        <h1 className="page-title">솔루션 구조 (TO-BE)</h1>
        <p className="page-sub">M365 Copilot 에이전트가 VOC를 분류·생성하고, 사내 운영 사이트에서 티켓처럼 처리한 뒤 지라로 연동하는 닫힌 루프.</p>
      </div></div>

      <h2 className="sec-title">구성 <span className="sec-note">코파일럿 에이전트 2종 + 운영 사이트</span></h2>
      <div className="sol-parts">{parts.map((p) => (
        <div key={p.t} className={'sol-part' + (p.tag === '사이트' ? ' site' : '')}><span className="sol-part-tag">{p.tag}</span><b>{p.t}</b><span className="sol-part-d">{p.d}</span></div>
      ))}</div>

      <h2 className="sec-title">닫힌 루프 <span className="sec-note">생성 → 검수 → 처리 → 연동 → 재학습</span></h2>
      <div className="pipe-strip">{loop.map((s, i, a) => (
        <React.Fragment key={s}><span className={'pipe-step' + (i === 0 ? ' on' : '')}>{s}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>
      <p className="sol-note">코파일럿이 만든 결과는 <b>제안</b>이며 담당자 검수 후 확정됩니다. 사이트 처리 결과(이력·최종 수정자)는 공유 저장소로 실시간 반영되고, 분류 모델 학습으로 되먹임됩니다.</p>

      <FlowMap />

      <h2 className="sec-title">수집·분류 파이프라인 <span className="sec-note">들어온 VOC를 우리 스키마로 정규화</span></h2>
      <div className="effect-row">{intake.map((s) => <div key={s.t} className="effect-card"><div className="effect-t">{s.t}</div><div className="effect-d">{s.d}</div></div>)}</div>

      <h2 className="sec-title">분류 체계 <span className="sec-note">실 VOC현황 기준 6분류</span></h2>
      <div className="panel sol-tax">
        <div className="sol-tax-row"><span className="sol-tax-k">정형 3</span><span>장애/오류 · 성능 · 개선 요청/희망 <span className="muted">(닫힌 분류)</span></span></div>
        <div className="sol-tax-row"><span className="sol-tax-k open">열림 3</span><span>단순 문의 · 불만 · 기타 <span className="muted">→ 22개 표준분류로 추론</span></span></div>
        <div className="sol-tax-row"><span className="sol-tax-k">대응영역</span><span>MY · 상품/스토어 · 혜택/멤버십 · 검색/챗봇 · 플러스탭 · 기타</span></div>
        <div className="sol-tax-row"><span className="sol-tax-k">신뢰도</span><span>상 / 중 / 하 · 사유 코드(L01 짧음·L04 다주제 등) → ‘하’면 검토필요</span></div>
        <div className="sol-tax-row"><span className="sol-tax-k open">학습데이터</span><span>실 VOC현황(디지털CX트라이브) <b>골든 학습예시 889건</b> + 신뢰도(상/중/하)로 분류 정확도 보정 <span className="muted">(개인정보 마스킹)</span></span></div>
      </div>

      <h2 className="sec-title">AS-IS → TO-BE</h2>
      <div className="ba-grid">
        <div className="panel ba-before"><div className="ba-tag">AS-IS</div><ul className="ba-list"><li>수기 분류 · 태깅</li><li>채널별 중복 처리</li><li>대응 지연 · 반복 인입</li></ul></div>
        <div className="panel ba-after"><div className="ba-tag after">TO-BE</div><ul className="ba-list"><li>Copilot 자동 분류(6분류) · 응대 초안</li><li>지라형 티켓 1곳 처리 + 지라 연동(CSV·메일, 토큰리스)</li><li>셀프 해결 · 선제 안내로 인입 감소</li></ul></div>
      </div>

      <h2 className="sec-title">기대 효과</h2>
      <div className="effect-row">{effects.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>

      <h2 className="sec-title">구현 로드맵</h2>
      <div className="roadmap">
        <div className="rm-step rm-now"><div className="rm-t">PoC <span className="rm-badge">현재</span></div><div className="rm-d">에이전트 2종 · 운영 사이트 · 실데이터 학습</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">파일럿</div><div className="rm-d">사내 지라·SSO 연동 · 정확도 고도화</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">전사 확산</div><div className="rm-d">CX 전 영역 + U+one 선제조치(Phase 2)</div></div>
      </div>
    </div>
  )
}

/* 처리 흐름 다이어그램 (셀프 해결 분기 → 미해결 시 수집·분류 → 운영·반영 · 피드백 루프) */
function FlowMap() {
  return (
    <div className="panel flowmap-card">
      <div className="card-title">처리 흐름 한눈에 <span className="muted">셀프 해결 → 미해결 시 수집·분류 → 운영·반영 · 결과는 학습으로 피드백</span></div>
      <div className="flowmap-scroll">
        <svg className="flowmap" viewBox="0 0 1040 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VOC 처리 프로세스 플로우">
          <defs>
            <marker id="fmah" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z" fill="#e6007e" /></marker>
            <marker id="fmah2" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z" fill="#b8005f" /></marker>
          </defs>
          <g fill="none" stroke="#e6007e" strokeWidth="2" markerEnd="url(#fmah)">
            <path d="M152 61 L180 61" /><path d="M316 61 L368 61" /><path d="M522 61 L552 61" />
            <path d="M250 94 C250 150 258 152 258 186" /><path d="M336 212 L368 212" /><path d="M528 212 L560 212" /><path d="M720 212 L752 212" />
          </g>
          <path d="M642 234 C642 286 450 286 450 238" fill="none" stroke="#b8005f" strokeWidth="1.8" strokeDasharray="5 4" markerEnd="url(#fmah2)" />
          <text x="546" y="303" textAnchor="middle" className="fm-loop-t">AI 학습 · 피드백 루프</text>
          <text x="343" y="50" className="fm-lbl">예</text><text x="286" y="150" className="fm-lbl">아니오</text>
          <rect className="fm-pill" x="36" y="40" width="116" height="42" rx="11" /><text x="94" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">VOC 발생</text>
          <polygon className="fm-dia" points="250,28 316,61 250,94 184,61" /><text x="250" y="61" textAnchor="middle" dominantBaseline="central" className="fm-dia-t">셀프 해결 가능?</text>
          <rect className="fm-box" x="372" y="40" width="150" height="42" rx="11" /><text x="447" y="61" textAnchor="middle" dominantBaseline="central" className="fm-node">고객 셀프 해결</text>
          <rect className="fm-pill end" x="556" y="43" width="210" height="36" rx="18" /><text x="661" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 인입콜·VOC 감소</text>
          <rect className="fm-box" x="180" y="190" width="156" height="44" rx="11" /><text x="258" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">상담 연결·VOC 접수</text>
          <rect className="fm-box" x="372" y="190" width="156" height="44" rx="11" /><text x="450" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">수집 · 자동 분류</text>
          <rect className="fm-box" x="564" y="190" width="156" height="44" rx="11" /><text x="642" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">운영 · 서비스 반영</text>
          <rect className="fm-pill end" x="756" y="193" width="214" height="38" rx="19" /><text x="863" y="212" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 처리율·속도 향상</text>
        </svg>
      </div>
    </div>
  )
}

/* ---------- 탭 2: 에이전트 & 프롬프트 ---------- */
function PromptTemplates({ notify }) {
  const copy = (t) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast('프롬프트 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  const agents = [
    {
      key: 'voice', name: 'U+VOC 고객가이드', role: '분류·분석', accent: true,
      desc: 'VOC를 6분류·22표준분류·대응영역으로 분류하고, 핵심 의도·예상 응대문(고객/문자/담당자 메일)·개선 과제를 생성. “사이트용 JSON”이면 Copilot 연동으로 티켓 등록.',
      know: ['서비스 이해', '분류 기준', '학습예시 889'],
      prompts: [
        '이 VOC를 6분류로 분류하고 핵심 의도·예상 응대문을 만들어 줘',
        '이 건이 불만인지 단순 문의인지 신뢰도와 함께 판단해 줘',
        '아래 VOC 목록을 사이트용 JSON으로 분류해 줘',
      ],
    },
    {
      key: 'self', name: 'U+VOC 셀프가이드', role: '고객 셀프 해결',
      desc: '유형별 고객 셀프 해결 단계 + 선제 안내문(이메일·문자)을 생성하고, 미해결 건만 상담 연결로 정제. “사이트용 JSON”이면 셀프 가이드 화면에 반영.',
      know: ['서비스 이해', '분류 기준', '학습예시'],
      prompts: [
        '‘앱/웹 접속불가’ 유형의 고객 셀프 해결 단계를 4개 만들어 줘',
        '‘요금/청구’ 선제 안내문(이메일·문자) 초안 써 줘',
        '이번 주 자주 묻는 상위 5개 유형 셀프 가이드를 사이트용 JSON으로 정리해 줘',
      ],
    },
  ]
  return (
    <div className="screen">
      <div className="page-head"><div>
        <h1 className="page-title">에이전트 &amp; 프롬프트</h1>
        <p className="page-sub">M365 Copilot 에이전트 빌더(선언적 에이전트) 2종. 같은 지식을 공유하고, 출력을 사이트가 받아 처리합니다.</p>
      </div></div>
      <div className="agent2-grid">{agents.map((a) => (
        <div key={a.key} className={'agent2-card' + (a.accent ? ' on' : '')}>
          <div className="agent2-h"><b>{a.name}</b><span className="agent2-role">{a.role}</span></div>
          <p className="agent2-desc">{a.desc}</p>
          <div className="agent2-know"><span className="agent2-know-l">지식</span>{a.know.map((k) => <span key={k} className="agent2-chip">{k}</span>)}</div>
          <div className="agent2-pl">추천 프롬프트</div>
          <ul className="agent2-prompts">{a.prompts.map((p, i) => (
            <li key={i}><span className="agent2-p">{p}</span><button className="agent2-copy" onClick={() => copy(p)}>복사</button></li>
          ))}</ul>
        </div>
      ))}</div>
      <p className="micro" style={{ marginTop: 12 }}>지식: <b>voc-service-knowledge</b>(서비스 이해) · <b>voc-classification-knowledge</b>(분류 기준) · <b>voc-learning-examples</b>(실데이터 골든 예시·신뢰도·분류사유)를 Knowledge로, 지시문은 각 에이전트 문서에서 복붙, 웹 지식으로 www.lguplus.com 연결. 사내망 정책상 데모는 실제 Copilot 호출 대신 안내만 표시합니다.</p>
    </div>
  )
}

/* ---------- 탭 3: 확장 로드맵 (Phase 2) — U+one 선제조치 ---------- */
function Phase2({ notify }) {
  const demo = (l) => notify && notify.toast(`${l} (콘셉트 데모 — 실제 동작 안 함)`)
  const phases = [
    { tag: 'AS-IS', t: '사후 대응', d: '상담·콜 인입 후 수기 처리' },
    { tag: 'PHASE 1', t: '내부 VOC Copilot', d: '자동 분류·대응·인사이트 (현재)', on: true },
    { tag: 'PHASE 2', t: 'U+one 선제조치', d: '고객 앱에서 VOC 발생 전 차단', next: true },
  ]
  const steps = [
    { t: '① 청구 이상 감지', d: '요금 증가·신규 결제를 내부 엔진이 먼저 포착' },
    { t: '② 선제 버블', d: '청구서 진입 시 "원인 볼까요?" 한 줄 제안' },
    { t: '③ AI 분석 패널', d: '증가 원인과 항목별 근거를 바로 제시' },
    { t: '④ 인앱 액션', d: '요금제 변경·로밍 차단·상담 연결을 그 자리에서' },
    { t: '⑤ VOC 피드백', d: '처리·미처리 결과가 내부 Copilot로 돌아가 학습' },
  ]
  const place = [
    { r: '1순위', t: '요금/청구', d: '청구서 화면 · 데이터와 액션이 명확 (MVP)', best: true },
    { r: '2순위', t: '앱/웹 오류·로그인', d: '오류 시점 인앱 복구 가이드로 셀프 해결' },
    { r: '3순위', t: '네트워크/속도', d: '내폰 진단 후 AS 예약 연결' },
    { r: '4순위', t: '로밍', d: '출국 전·해외 도착 시점 사전 안내' },
  ]
  const metrics = [
    { t: '상담 인입 감소율', d: '해당 영역 콜·상담 인입 감소' },
    { t: '인앱 셀프해결률', d: '앱 내에서 종결되는 비율' },
    { t: 'CTA 전환율', d: '요금제 변경·로밍 차단 실행률' },
  ]
  return (
    <div className="screen">
      <div className="page-head"><div>
        <h1 className="page-title">확장 로드맵 — U+one 앱 선제조치</h1>
        <p className="page-sub">내부에서 검증한 분류·대응 엔진을 고객 앱으로 확장해, VOC가 발생하기 전에 막습니다.</p>
      </div></div>

      <h2 className="sec-title">단계 <span className="sec-note">사후 대응 → 내부 Copilot(현재) → 고객 앱 선제조치</span></h2>
      <div className="phase-row">{phases.map((p) => (
        <div key={p.tag} className={'phase-card' + (p.on ? ' on' : '') + (p.next ? ' next' : '')}>
          <span className="phase-tag">{p.tag}</span><b>{p.t}</b><span className="phase-d">{p.d}</span>
        </div>
      ))}</div>
      <div className="phase-note">같은 분류·대응 엔진을 <b>양쪽 끝</b>에서 씁니다 — 내부 Copilot(사후) ↔ U+one 임베드(사전). 앱에서 처리·미처리된 결과가 내부 엔진으로 돌아가 선제 정확도를 높이는 <b>닫힌 루프</b>가 일반 챗봇과의 차별점입니다.</div>

      <h2 className="sec-title">대표 시나리오 <span className="sec-note">요금/청구 선제조치 · 콘셉트 화면</span></h2>
      <div className="p2-phones">
        <div className="p2-phone-wrap">
          <div className="p2-phone-cap"><span className="p2-step-no">1</span> 청구서 진입 · 선제 버블</div>
          <div className="pd-frame">
            <div className="pd-status"><span>9:41</span><span>ixi ▾</span></div>
            <div className="pd-h">‹ 이번달 청구서</div>
            <div className="pd-amt-l">3월 총 청구금액</div>
            <div className="pd-amt">180,000<span>원</span></div>
            <div className="pd-sub">모바일 (010-65**-84**)</div>
            <div className="pd-tabs"><span className="on">청구내역</span><span>청구내역 상세</span></div>
            <div className="pd-info">
              <div className="pd-info-r"><span>사용기간</span><b>3.1 ~ 3.31</b></div>
              <div className="pd-info-r"><span>청구서 작성일</span><b>2026.3.1</b></div>
              <div className="pd-info-r"><span>납부 방법</span><b>자동이체</b></div>
            </div>
            <div className="pd-bubble"><span className="pd-bubble-i">!</span><span>이번달 요금이 <b>12,300원</b> 늘었어요. 분석된 원인을 확인할까요?</span></div>
          </div>
        </div>
        <div className="p2-arrow" aria-hidden="true">→</div>
        <div className="p2-phone-wrap">
          <div className="p2-phone-cap"><span className="p2-step-no">2</span> 분석 결과 · 인앱 액션</div>
          <div className="pd-frame">
            <div className="pd-status"><span>9:41</span><span>ixi ▾</span></div>
            <div className="pd-h">‹ 이번달 청구서</div>
            <div className="pd-amt-l">3월 총 청구금액</div>
            <div className="pd-amt">180,000<span>원</span></div>
            <div className="pd-card pd-sheet">
              <div className="pd-card-h">분석 결과 <span className="pd-ai">AI가 최근 6개월 분석</span></div>
              <div className="pd-lead">새로운 <b>결제 2건</b>이 발생해 이번달 요금이 <b className="up">12,300원</b> 늘었어요</div>
              <ul className="pd-items">
                <li>월 기본 요금<span>77,500원</span></li>
                <li>OTT 정기 결제<span className="up">↑ 7,900원</span></li>
                <li>로밍 데이터<span className="up">↑ 4,500원</span></li>
                <li>기타<span>4,300원</span></li>
              </ul>
              <div className="pd-cta"><button onClick={() => demo('요금제 변경')}>요금제 변경</button><button className="pri" onClick={() => demo('로밍 데이터 차단')}>로밍 데이터 차단</button></div>
            </div>
          </div>
        </div>
      </div>
      <ol className="p2-steps p2-steps-row">{steps.map((s, i) => (
        <li key={i}><b>{s.t}</b><span>{s.d}</span></li>
      ))}</ol>

      <h2 className="sec-title">적용 우선순위 <span className="sec-note">VOC 볼륨 × 인앱 액션 가능성 × 데이터 가용성</span></h2>
      <div className="effect-row">{place.map((p) => (
        <div key={p.r} className={'effect-card' + (p.best ? ' brand' : '')}><div className="effect-t">{p.r} · {p.t}</div><div className="effect-d">{p.d}</div></div>
      ))}</div>

      <h2 className="sec-title">측정지표</h2>
      <div className="effect-row">{metrics.map((m) => (
        <div key={m.t} className="effect-card"><div className="effect-t">{m.t}</div><div className="effect-d">{m.d}</div></div>
      ))}</div>

      <p className="micro">실제 적용 시 익시(ixi)의 도메인 스킬 카드로 연동하며, 본 화면·수치는 콘셉트 데모입니다.</p>
    </div>
  )
}

function AllMenu({ goAgent, setRail, notify, doc, setDoc }) {
  const TABS = [['architecture', '솔루션 구조 (TO-BE)'], ['prompts', '에이전트 & 프롬프트'], ['phase2', '확장 로드맵 (Phase 2)']]
  return (
    <div className="screen portal-screen">
      <div className="soldoc-head">
        <span className="soldoc-eyebrow">솔루션 설명</span>
        <div className="soldoc-tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={doc === k} className={'soldoc-tab' + (doc === k ? ' on' : '')} onClick={() => setDoc(k)}>{label}</button>
          ))}
        </div>
      </div>
      {doc === 'architecture' && <Architecture />}
      {doc === 'prompts' && <PromptTemplates notify={notify} />}
      {doc === 'phase2' && <Phase2 notify={notify} />}
    </div>
  )
}

/* ---------- 로그인 / 가입 게이트 ---------- */

export default AllMenu
