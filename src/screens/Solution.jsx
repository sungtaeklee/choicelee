import React, { useState } from 'react'
import { PageHead } from '../ui.jsx'

function PromptTemplates({ notify }) {
  const [shown, setShown] = useState({})
  const steps = [
    {
      key: 'cls', n: 1, role: '분석', title: 'VOC 분류', purpose: '유형 · 세부 · 심각도 자동 분류', core: true, cta: 'Copilot으로 분석하기',
      body: '아래 VOC를 분석해라.\n\n1. VOC 유형을 4개 중 하나로 분류\n   - 장애/오류 / 성능 / 개선 요청 / 문의·기타\n2. 세부 카테고리(22개 기준)로 분류\n3. 모호하면 "기타 + 검토필요"로 표시\n\n[출력 형식]\n- 유형:\n- 세부:\n- 심각도:',
      preview: ['유형: 장애/오류', '세부: 앱/웹 기능오류', '심각도: High'],
    },
    {
      key: 'msg', n: 2, role: '대응', title: '고객 메시지 생성', purpose: '고객 안내 메시지 초안', cta: '메시지 생성',
      body: '아래 VOC를 기반으로 고객 안내 메시지를 작성해라.\n\n- 사실 기반\n- 오해 방지 중심\n- 간결하게 작성\n- 개인정보 포함 금지\n\n[출력]\n- 고객 안내 메시지:',
      preview: ['고객 안내 메시지: 불편을 드려 죄송합니다. 해당 오류는 확인되어 순차 정상화 중이며, 앱 최신 버전 업데이트 후 재시도를 부탁드립니다.'],
    },
    {
      key: 'imp', n: 3, role: '개선', title: '개선 요청 생성', purpose: 'UX/개발 개선 과제화', cta: '개선 요청 정리',
      body: '아래 VOC를 기반으로 UX/개선 요청으로 정리해라.\n\n[포함 항목]\n- 문제 정의\n- 영향 범위\n- 개선 제안\n- 우선순위',
      preview: ['문제 정의: 특정 단계에서 기능 오류 반복', '영향 범위: 동일 유형 VOC 다수', '개선 제안: 예외 처리 · 안내 보강', '우선순위: High'],
    },
    {
      key: 'mail', n: 4, role: '공유', title: '담당자 메일', purpose: '담당 조직 공유 메일', cta: '메일 작성',
      body: 'High VOC를 담당 조직에 공유할 메일을 작성해라.\n\n[포함]\n- VOC 요약\n- 고객 영향\n- 개선 필요 사항\n- 요청 액션',
      preview: ['수신: 담당 조직', '제목: [High] 앱 기능오류 공유', '본문: VOC 요약 · 고객 영향 · 개선 필요 · 요청 액션 포함'],
    },
    {
      key: 'rpt', n: 5, role: '요약', title: '인사이트 리포트', purpose: '경영 보고용 요약', cta: '리포트 생성',
      body: 'VOC 데이터를 기반으로 리포트를 생성해라.\n\n[포함]\n- 유형 분포\n- 주요 문제\n- 개선 우선순위\n- 기대 효과',
      preview: ['유형 분포 · 주요 문제 · 개선 우선순위 · 기대 효과를 표/비율로 요약'],
    },
  ]
  const copy = (t) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast('프롬프트 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  const run = (st) => { setShown((s) => ({ ...s, [st.key]: true })); notify.toast(`Copilot이 ${st.title} 결과를 생성했어요 (데모)`) }
  return (
    <div className="screen">
      <PageHead title="Copilot 프롬프트" sub="5개 프롬프트는 따로 도는 게 아니라, 하나의 Copilot 워크플로우로 이어집니다." />
      <div className="pipe-strip">{steps.map((st, i, a) => (
        <React.Fragment key={st.key}><span className={'pipe-step' + (i === 0 ? ' on' : '')}>{st.n} {st.role}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>
      <div className="prompt-grid">{steps.map((st) => (
        <div key={st.key} className={'prompt-card' + (st.core ? ' pc-core' : '')}>
          <div className="pc-head">
            <span className="pc-num">{st.n}</span>
            <span className="pc-title">{st.title}{st.core && <span className="pc-core-badge">핵심</span>}</span>
            <span className="pc-role">{st.role}</span>
          </div>
          <div className="pc-purpose">{st.purpose}</div>
          <pre className="pc-body">{st.body}</pre>
          {shown[st.key] && (
            <div className="pc-preview">
              <div className="pc-pv-l"><span className="ai-spark">✦</span> 결과 미리보기 <span className="muted" style={{ fontWeight: 400 }}>· 데모</span></div>
              <ul className="pc-pv-list">{st.preview.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
          <div className="pc-actions">
            <button className="btn btn-ghost sm" onClick={() => copy(st.body)}>복사</button>
            <button className="btn btn-primary sm" onClick={() => run(st)}>{st.cta}</button>
          </div>
        </div>
      ))}</div>
      <p className="micro">사내 네트워크 정책상 데모에서는 실제 Copilot 호출 대신 예시 결과를 보여줍니다. 실제 적용 시 사내 Copilot / Copilot Studio Agent로 연결됩니다.</p>
    </div>
  )
}

/* ---------- [Arch] Architecture (패턴 설계) ---------- */
/* ---------- [설계] 프로세스 플로우 ---------- */
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
            <path d="M152 61 L180 61" />
            <path d="M316 61 L368 61" />
            <path d="M522 61 L552 61" />
            <path d="M250 94 C250 150 258 152 258 186" />
            <path d="M336 212 L368 212" />
            <path d="M528 212 L560 212" />
            <path d="M720 212 L752 212" />
          </g>
          <path d="M642 234 C642 286 450 286 450 238" fill="none" stroke="#b8005f" strokeWidth="1.8" strokeDasharray="5 4" markerEnd="url(#fmah2)" />
          <text x="546" y="303" textAnchor="middle" className="fm-loop-t">AI 학습 · 피드백 루프</text>
          <text x="343" y="50" className="fm-lbl">예</text>
          <text x="286" y="150" className="fm-lbl">아니오</text>
          <rect className="fm-pill" x="36" y="40" width="116" height="42" rx="11" />
          <text x="94" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">VOC 발생</text>
          <polygon className="fm-dia" points="250,28 316,61 250,94 184,61" />
          <text x="250" y="61" textAnchor="middle" dominantBaseline="central" className="fm-dia-t">셀프 해결 가능?</text>
          <rect className="fm-box" x="372" y="40" width="150" height="42" rx="11" />
          <text x="447" y="61" textAnchor="middle" dominantBaseline="central" className="fm-node">고객 셀프 해결</text>
          <rect className="fm-pill end" x="556" y="43" width="210" height="36" rx="18" />
          <text x="661" y="61" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 인입콜·VOC 감소</text>
          <rect className="fm-box" x="180" y="190" width="156" height="44" rx="11" />
          <text x="258" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">상담 연결·VOC 접수</text>
          <rect className="fm-box" x="372" y="190" width="156" height="44" rx="11" />
          <text x="450" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">수집 · 자동 분류</text>
          <rect className="fm-box" x="564" y="190" width="156" height="44" rx="11" />
          <text x="642" y="212" textAnchor="middle" dominantBaseline="central" className="fm-node">운영 · 서비스 반영</text>
          <rect className="fm-pill end" x="756" y="193" width="214" height="38" rx="19" />
          <text x="863" y="212" textAnchor="middle" dominantBaseline="central" className="fm-pill-t">END · 처리율·속도 향상</text>
        </svg>
      </div>
    </div>
  )
}
function Architecture() {
  const Box = ({ t, d }) => <div className="fc-box"><b>{t}</b>{d && <span>{d}</span>}</div>
  const Arrow = () => <span className="fc-arrow" aria-hidden="true" />
  const flow = ['VOC 발생', 'Copilot 분석', '고객 대응 생성', '개선 과제 도출', '리포트 생성']
  const roles = [
    { t: '분석', d: '유형 · 심각도 자동 분류' },
    { t: '대응', d: '문자 · 메일 초안 생성' },
    { t: '개선', d: '개선 과제 도출' },
    { t: '리포트', d: '현황 · 인사이트 요약' },
  ]
  const intake = [
    { t: '채널 수집', d: '상담콜 · 앱 · 홈페이지' },
    { t: '전처리', d: 'STT · 개인정보 마스킹' },
    { t: '자동 분류', d: '6그룹 · 22개 표준분류' },
    { t: '우선순위화', d: '감성 · 긴급도 스코어링' },
  ]
  const operate = [
    { t: '대시보드', d: '유형·영역 추이 · 처리현황' },
    { t: '인사이트 · 담당자 알림', d: '예상 답안 · 처리 가이드' },
    { t: '서비스 반영', d: '근본 원인 개선' },
  ]
  const effects = [
    { t: '상담 Call 감소', d: '셀프 해결로 인입 감소' },
    { t: 'VOC 감소', d: '근본 원인 개선' },
    { t: '분류 자동화', d: '수기 태깅 제거' },
    { t: '대응 속도 향상', d: '실시간 처리' },
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
        <p className="page-sub">VOC 자동 분류 → 개선안 도출까지, Copilot이 전체 흐름을 자동 수행합니다.</p>
      </div></div>

      <h2 className="sec-title">핵심 Flow</h2>
      <div className="pipe-strip">{flow.map((s, i, a) => (
        <React.Fragment key={s}><span className={'pipe-step' + (i >= 1 && i <= 3 ? ' on' : '')}>{s}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>

      <h2 className="sec-title">Copilot 역할</h2>
      <div className="effect-row">{roles.map((r) => <div key={r.t} className="effect-card"><div className="effect-t">{r.t}</div><div className="effect-d">{r.d}</div></div>)}</div>

      <h2 className="sec-title">처리 흐름 <span className="sec-note">셀프 해결 → 미해결 시 수집·분류 → 운영·반영</span></h2>
      <FlowMap />

      <h2 className="sec-title">단계별 상세 <span className="sec-note">3개 레인 · 수집부터 반영까지</span></h2>
      <div className="flowchart">
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">1</span>고객 접점 · 셀프 해결</div>
          <Box t="VOC 발생" />
          <Arrow />
          <div className="fc-decision"><span className="fc-dia">◆</span> 셀프 가이드로 해결 가능?</div>
          <div className="fc-branch">
            <div className="fc-leg">
              <span className="fc-yes">예</span>
              <Box t="고객 셀프 해결" d="접수 전 맞춤 가이드" />
              <Arrow />
              <div className="fc-pill end">END · 인입콜 감소</div>
            </div>
            <div className="fc-leg">
              <span className="fc-no">아니오</span>
              <Box t="상담 연결 · VOC 접수" d="미해결 건만 전달" />
              <Arrow />
              <div className="fc-next">↳ 레인 2로 유입</div>
            </div>
          </div>
        </div>
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">2</span>수집 · 자동 분류</div>
          {intake.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < intake.length - 1 && <Arrow />}</React.Fragment>)}
          <div className="fc-loop">⟲ 처리 결과는 분류 모델 학습으로 되먹임</div>
        </div>
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">3</span>운영 · 서비스 반영</div>
          {operate.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < operate.length - 1 && <Arrow />}</React.Fragment>)}
          <Arrow />
          <div className="fc-pill end">END · 처리율 · 속도 향상</div>
        </div>
      </div>

      <h2 className="sec-title">문제 → 해결</h2>
      <div className="ba-grid">
        <div className="panel ba-before"><div className="ba-tag">AS-IS</div><ul className="ba-list"><li>수기 분류 · 태깅</li><li>채널별 중복 처리</li><li>대응 지연 · 반복 인입</li></ul></div>
        <div className="panel ba-after"><div className="ba-tag after">TO-BE</div><ul className="ba-list"><li>Copilot 자동 분류</li><li>문자·메일 자동 생성</li><li>실시간 대응 · 셀프 해결</li></ul></div>
      </div>

      <h2 className="sec-title">기대 효과</h2>
      <div className="effect-row">{effects.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>

      <h2 className="sec-title">구현 로드맵</h2>
      <div className="roadmap">
        <div className="rm-step rm-now"><div className="rm-t">PoC <span className="rm-badge">현재</span></div><div className="rm-d">핵심 분류·대시보드 프로토타입</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">파일럿</div><div className="rm-d">실 VOC·STT로 정확도 고도화</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">전사 확산</div><div className="rm-d">CX 전 영역·타 채널 확대</div></div>
      </div>
    </div>
  )
}

/* ---------- [엔진②] 고객 셀프 해결 가이드 ---------- */

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

      <h2 className="sec-title">대표 시나리오 <span className="sec-note">요금/청구 선제조치 · 첨부 콘셉트 화면 기준</span></h2>
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
  return (
    <div className="screen portal-screen">
      <div className="soldoc-tabs">
        <button className={'soldoc-tab' + (doc === 'architecture' ? ' on' : '')} onClick={() => setDoc('architecture')}>솔루션 구조 (TO-BE)</button>
        <button className={'soldoc-tab' + (doc === 'prompts' ? ' on' : '')} onClick={() => setDoc('prompts')}>Copilot 프롬프트</button>
        <button className={'soldoc-tab' + (doc === 'phase2' ? ' on' : '')} onClick={() => setDoc('phase2')}>확장 로드맵 (Phase 2)</button>
      </div>
      {doc === 'architecture' && <Architecture />}
      {doc === 'prompts' && <PromptTemplates notify={notify} />}
      {doc === 'phase2' && <Phase2 notify={notify} />}
    </div>
  )
}

/* ---------- 로그인 / 가입 게이트 ---------- */

export default AllMenu
