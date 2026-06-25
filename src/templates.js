import { draftCustomerMsg, guideFor } from './classify.js'

/* ============================================================
   응대 템플릿 라이브러리 — 재사용 가능한 응대문 스니펫 + 클러스터 공통 응대문 생성
   · REPLY_TEMPLATES: 어디서나 1클릭으로 삽입하는 표준 문구(사과·확인중·완료 등)
   · buildClusterReply: 유사 VOC 묶음(영역·유형)에 보낼 공통 응대문 초안
   ============================================================ */
export const REPLY_TEMPLATES = [
  { key: 'apology', label: '사과·공감', text: '불편을 드려 진심으로 죄송합니다. 말씀해 주신 내용을 확인했습니다.' },
  { key: 'checking', label: '확인 중 안내', text: '현재 담당 부서에서 원인을 확인하고 있으며, 확인되는 대로 신속히 안내드리겠습니다.' },
  { key: 'delay', label: '처리 지연 양해', text: '처리에 시간이 걸려 양해 부탁드립니다. 최대한 빠르게 진행해 안내드리겠습니다.' },
  { key: 'done', label: '해결 완료', text: '요청하신 사항이 정상 처리되었습니다. 추가로 불편하신 점이 있으면 언제든 말씀해 주세요.' },
  { key: 'improve', label: '개선 의견 접수', text: '소중한 의견 감사합니다. 담당 부서에 전달해 개선을 검토하겠습니다.' },
  { key: 'guide', label: '셀프 조치 안내', text: '앱을 최신 버전으로 업데이트하신 뒤 재시도를 부탁드리며, 증상이 지속되면 바로 도와드리겠습니다.' },
  { key: 'thanks', label: '감사 마무리', text: '문의해 주셔서 감사합니다. 더 나은 서비스로 보답하겠습니다.' },
]

/* 심각도별 SLA 목표 처리 기한(일) — 상태별 SLA의 기준값 */
export const SLA_DAYS = { High: 1, Medium: 3, Low: 7 }

/* 분류 가이드(권장 조치)를 단계로 분해해 기본 처리 체크리스트 생성 */
export function defaultChecklist(cat) {
  const g = guideFor(cat)
  const steps = (g ? g.act : '').split(/→|·|,|\/|및/).map((s) => s.trim()).filter((s) => s.length >= 2)
  const base = steps.length ? steps : ['내용·이력 확인', '담당 배정', '고객 안내', '처리 결과 확인']
  return base.slice(0, 6).map((text) => ({ text, done: false }))
}

/* 유사 VOC 클러스터(영역·유형) 공통 응대문 — 분류 가이드 기반 초안 */
export function buildClusterReply(group, cat) {
  const g = guideFor(cat)
  const base = draftCustomerMsg(group, cat, '')
  // 동일 유형 다건에 공통 발송하는 안내문 톤으로 정리
  return g ? base : `'${cat}' 관련 문의를 확인했습니다. ${base}`
}

/* ============================================================
   고객 셀프 해결 가이드 에이전트(U+VOC 셀프가이드)용 지식·생성기
   · SELF_GUIDE: 자주 묻는 유형별 셀프 해결 단계(검수된 지식)
   · buildSelfGuideSteps: 지식에 없는 유형도 분류 가이드(CAT_GUIDE)에서 단계 자동 생성 → 전 유형 커버
   · buildProactiveNotice: 발생/예상 고객에게 보내는 '선제 안내문' 초안(이메일·문자)
   ============================================================ */
export const SELF_GUIDE = {
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
export const GUIDE_FALLBACK = ['앱을 최신 버전으로 업데이트', '캐시 삭제 후 재실행', '도움말 · FAQ에서 동일 증상 확인', '미해결 시 상담 연결']

/* 분류 유형 → 고객 셀프 해결 단계. 지식(SELF_GUIDE) 우선, 없으면 분류 가이드(act)에서 단계화 → 전 유형 커버 */
export function buildSelfGuideSteps(cat) {
  if (SELF_GUIDE[cat]) return SELF_GUIDE[cat]
  const g = guideFor(cat)
  if (!g) return GUIDE_FALLBACK
  const acts = g.act.split(/→|·|,|및/).map((s) => s.trim()).filter((s) => s.length >= 2) // '/'는 약정/위약금 등 용어 내부라 분할 제외
  const steps = acts.slice(0, 3).map((s) => s.replace(/^확인/, '직접 확인'))
  return [...steps, '미해결 시 앱 상담 연결'].slice(0, 4)
}

/* 선제 안내문 초안 — 발생/예상 고객에게 접수 전에 보내는 안내(이메일 + 문자). 분류 가이드 톤 기반 */
export function buildProactiveNotice(cat, group) {
  const g = guideFor(cat)
  const steps = buildSelfGuideSteps(cat)
  const lead = g ? g.cust : `${cat} 관련 이용에 참고하실 내용을 안내드립니다.`
  const email = {
    subject: `[U+] ${cat} 관련 이용 안내`,
    body: [
      '안녕하세요, 고객님.',
      `최근 ${cat} 관련 문의가 늘어 불편이 없으시도록 미리 안내드립니다.`,
      '',
      lead,
      '',
      '아래 방법으로 대부분 바로 해결하실 수 있습니다.',
      ...steps.map((s, i) => `${i + 1}. ${s}`),
      '',
      '그래도 불편이 지속되면 앱 > 고객지원에서 바로 도와드리겠습니다. 감사합니다.',
    ].join('\n'),
  }
  const sms = `[U+ 안내] ${cat} 관련, ${steps[0]} 등으로 해결하실 수 있습니다. 자세히: 앱 > 고객지원`
  return { email, sms }
}
