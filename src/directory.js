/* ============================================================
   사내 구성원 디렉터리 + 티켓 필드 옵션 (지라 세부사항 대체)
   - 담당자/보고자/참조자를 텍스트가 아닌 "검색"으로 지정하기 위한 명단.
   - 실배포 시에는 사내 임직원 디렉터리(LDAP/HR API)로 교체.
   ============================================================ */
/* 데모용 구성원 명단 (모두 사내 도메인 @lguplus.co.kr).
   실제 알림은 아래 '가입 계정'(이 앱에 로그인한 실계정)으로 보강되어, 멘션·지정 시 실계정으로 전달된다. */
export const DOMAIN = 'lguplus.co.kr'
export const MEMBERS = [
  { name: '이성택', team: '디자인시스템스쿼드', email: 'choicelee@lguplus.co.kr' },
  { name: '지현주', team: '미디어로그', email: 'jihyunju@lguplus.co.kr' },
  { name: '신효근', team: '디지털CS BE팀', email: 'shin.hg@lguplus.co.kr' },
  { name: '김낙운', team: '디지털FE팀', email: 'kim.nw@lguplus.co.kr' },
  { name: '김지형', team: '디지털CS BE팀', email: 'kim.jh@lguplus.co.kr' },
  { name: '김형걸', team: '디지털통합CX팀', email: 'kim.hg@lguplus.co.kr' },
  { name: '박형윤', team: '디지털FE팀', email: 'park.hy@lguplus.co.kr' },
  { name: '윤예진', team: 'AI검색TF', email: 'yoon.yj@lguplus.co.kr' },
  { name: '장현민', team: '디지털혜택CX팀', email: 'jang.hm@lguplus.co.kr' },
  { name: '최연제', team: '디지털CS BE팀', email: 'choi.yj@lguplus.co.kr' },
  { name: '김민수', team: 'MY서비스팀', email: 'kim.ms@lguplus.co.kr' },
  { name: '이서연', team: 'AI검색팀', email: 'lee.sy@lguplus.co.kr' },
  { name: '박지훈', team: '멤버십팀', email: 'park.jh@lguplus.co.kr' },
  { name: '최유진', team: '커머스팀', email: 'choi.yj2@lguplus.co.kr' },
]
// "이름 팀" 표시 문자열 ↔ 멤버 매칭
export const memberLabel = (m) => `${m.name} ${m.team}`

/* ── 가입 계정(이 앱에 가입한 실계정) ──
   auth.js가 'accounts:v1'에 [{email,salt,hash}, …]로 저장한다. 디렉터리는 이를 **읽기 전용**으로
   이메일만 추출해 가입계정으로 활용한다(절대 이 키에 쓰지 않음 — 인증 데이터 오염 방지).
   - SELF: 지금 로그인한 본인. 본인 지정·@멘션 시 본인 계정으로 알림. */
const ACCT_KEY = 'voc-action-copilot:accounts:v1'
let SELF = null
function readAccountEmails() {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCT_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.map((a) => (typeof a === 'string' ? a : (a && a.email))).filter((e) => typeof e === 'string' && e)
  } catch { return [] }
}
// 가입 계정(이메일 문자열) → 멤버 객체. 데모 명단에 있으면 한글 이름·팀 유지, 아니면 메일 아이디로.
const acctMember = (email) => {
  const e = String(email || '')
  const m = MEMBERS.find((x) => x.email === e)
  return m ? { ...m, registered: true } : { name: (e.split('@')[0] || e), team: '가입 계정', email: e, registered: true }
}
export function setSelf(email) {
  SELF = email ? acctMember(email) : null
  if (SELF && !MEMBERS.find((m) => m.email === SELF.email)) SELF.team = '나'
}
export function registeredAccounts() { return readAccountEmails() }
// 디렉터리 = 본인 + 가입 계정(실계정 이메일) + 데모 명단. 이메일 중복은 앞선 항목 우선.
export function allMembers() {
  const out = [], seen = new Set()
  const push = (m) => { if (m && typeof m.email === 'string' && m.email && !seen.has(m.email)) { seen.add(m.email); out.push(m) } }
  if (SELF) push(SELF)
  readAccountEmails().forEach((e) => push(acctMember(e)))
  MEMBERS.forEach(push)
  return out
}
// "이름 팀" 라벨 → 이메일(알림 대상 계정 식별). 못 찾으면 ''
export function emailOfLabel(label) { const m = allMembers().find((x) => memberLabel(x) === label); return m ? m.email : '' }
// 이메일 → 표시 이름(구성원이면 한글 이름, 아니면 메일 아이디). 활동 이력의 작성자 표시용
export function nameOfEmail(email) { const e = String(email || ''); const m = allMembers().find((x) => x.email === e); return m ? m.name : (e.split('@')[0] || e) }

// 본문에서 @멘션된 구성원 추출 → "이름 팀" 라벨 배열 (이름 긴 것부터 매칭해 부분일치 오인 방지)
export function parseMentions(text) {
  const t = String(text || ''); const found = new Set()
  for (const m of [...allMembers()].sort((a, b) => b.name.length - a.name.length)) {
    if (new RegExp('@' + m.name + '(?![가-힣])').test(t)) found.add(memberLabel(m))
  }
  return [...found]
}
export function searchMembers(q, limit = 8) {
  const list = allMembers()
  const s = String(q || '').trim().toLowerCase()
  if (!s) return list.slice(0, limit)
  return list.filter((m) => `${m.name} ${m.team} ${m.email}`.toLowerCase().includes(s)).slice(0, limit)
}

/* 레이블 추천 (검색형 입력 + 신규 추가 허용) */
export const LABELS_SUGGEST = ['VOC', '전사IT업무요청', '디플루이드-2024-PUB', '혜택파트', '긴급', '재발', '정책확인', 'UX개선', '데이터정합성', '연동이슈']

/* 처리가능단계 (티켓 종결 레벨) */
export const RESOLVE_LEVELS = [
  'L.1 상담사 답변으로 종결',
  'L.2 문의응대/정책가이드로 종결',
  'L.3 개발팀 리뷰/수정 후 종결',
  'L.0 미디어로그 응대 종결',
  'L.0 플랫폼서비스기획팀 응대 종결',
]
/* BUG 처리 결과 */
export const BUG_RESULTS = ['실제 버그(BUG)', '고객 오인', '개발 없이 해결']
/* 오류 타입 */
export const ERROR_TYPES = ['유큐브/그외 연동오류', '앱/웹 기능오류', '데이터 정합성', '접속불가', '성능 지연', '기획/정책', '기타']
