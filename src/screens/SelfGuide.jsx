import React from 'react'
import { PageHead } from '../ui.jsx'

const SELF_GUIDE = {
  '로그인불가/로그인풀림': ['앱을 최신 버전으로 업데이트 후 재실행', '비밀번호 재설정 또는 간편로그인(생체인증) 재등록', '기기 날짜·시간 자동설정 확인 → 인증 오류 방지'],
  '회원/로그인/인증': ['본인인증 수단(통신사/PASS) 재시도', '아이디 찾기 · 비밀번호 재설정', '명의자 정보 일치 여부 확인'],
  '회원/로그인 개선': ['간편로그인(생체인증) 등록으로 재로그인 최소화', '자동 로그아웃 주기 설정 확인', '여러 기기 동시 로그인 시 재인증 안내 확인'],
  '요금/청구/납부/환불': ['MY > 요금조회에서 청구 상세 확인', '자동이체 · 카드 등록 상태 점검', '중복결제 의심 시 결제내역 캡처 후 문의'],
  '앱/웹 기능오류': ['앱 캐시 삭제 후 재실행', '최신 버전으로 업데이트', '기기 재부팅 후 재시도'],
  '앱/웹 접속불가': ['Wi-Fi ↔ 데이터 전환 후 재접속', '앱 최신 버전 확인', '잠시 후 재시도(일시적 부하 가능)'],
  '앱/웹 속도 느림': ['백그라운드 앱 종료 후 재실행', '캐시 삭제 · 저장공간 확보', 'Wi-Fi 신호 강한 곳에서 재시도'],
  '데이터(사용량/선물/충전)': ['MY > 데이터에서 잔여량 · 사용량 확인', '데이터 선물 · 충전 메뉴 이용', '안심차단 · 한도 설정 확인'],
  '멤버십/쿠폰/혜택/VIP콕': ['멤버십 > VIP콕에서 당월 혜택 확인', '쿠폰함에서 사용 가능 쿠폰 확인', '제휴처 사용조건(시간 · 지점) 확인'],
  '로밍': ['로밍 요금제 가입 여부 확인', '데이터 로밍 ON/OFF 설정 확인', '현지 도착 후 네트워크 수동 검색'],
}
const GUIDE_FALLBACK = ['앱을 최신 버전으로 업데이트', '캐시 삭제 후 재실행', '도움말 · FAQ에서 동일 증상 확인', '미해결 시 상담 연결']
function SelfGuide({ added, notify }) {
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
  const covered = top.filter((t) => SELF_GUIDE[t.cat]).reduce((s, t) => s + t.n, 0)
  const selfRate = total ? Math.round(covered / total * 100) : 0
  if (!total) return <div className="screen"><PageHead title="고객 셀프 해결 가이드" sub="엔진② · 접수 전 셀프 해결 시나리오" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 자주 묻는 유형이 셀프 해결 가이드로 변환됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="고객 셀프 해결 가이드" sub="엔진② · 처리 전 단계의 비슷한 VOC를 그룹화 → 자주 묻는 유형을 접수 전 셀프 해결 시나리오 + 예상답안으로 제공" />
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-l">자주 묻는 유형(그룹)</div>
          <div className="kpi-v">{top.length}<span className="kpi-unit">개</span></div>
          <span className="kpi-chip">셀프 가이드화</span>
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
      <h2 className="sec-title">자주 묻는 VOC → 셀프 해결 시나리오 <span className="sec-note">비슷한 VOC 그룹 상위 {top.length}개 · 예상답안 매칭</span></h2>
      <div className="guide-grid">{top.map((t) => {
        const steps = SELF_GUIDE[t.cat] || GUIDE_FALLBACK
        return (
          <div key={t.cat} className="guide-card">
            <div className="guide-head"><span className="guide-cat">{t.cat}</span><span className="guide-freq">{t.n.toLocaleString()}건{t.high ? ` · High ${t.high}` : ''}</span></div>
            <ol className="guide-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {t.answer && <div className="guide-ans"><div className="guide-ans-k">매칭 예상답안 (고객 응대 초안)</div><div className="guide-ans-v">{t.answer}</div></div>}
            <div className="guide-foot"><button className="btn btn-ghost sm" onClick={() => notify.toast('셀프 해결 완료 (데모) — 인입콜 1건 예방')}>해결됐어요</button><button className="btn btn-ghost sm" onClick={() => notify.toast('미해결 — 상담사 연결 (데모)')}>상담 연결</button></div>
          </div>
        )
      })}</div>
      <div className="note-box"><b>엔진② 동작</b> — 처리 전 단계의 비슷한 VOC를 표준분류로 그룹화해 자주 묻는 유형을 셀프 해결 시나리오로 변환하고, 각 유형의 <b>예상답안</b>(VOC 처리의 응대 초안)과 매칭해 접수 전 단계에서 고객 맞춤 가이드를 노출합니다. <b>미해결 건만</b> 정제해 상담사에 연결하고, 처리결과는 분류 모델 학습으로 되먹임됩니다(피드백 루프).</div>
    </div>
  )
}

/* ---------- [개선 백로그] 우선순위 매긴 서비스 개선 과제 ---------- */

export default SelfGuide
