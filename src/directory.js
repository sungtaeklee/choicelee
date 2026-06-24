/* ============================================================
   사내 구성원 디렉터리 + 티켓 필드 옵션 (지라 세부사항 대체)
   - 담당자/보고자/참조자를 텍스트가 아닌 "검색"으로 지정하기 위한 명단.
   - 실배포 시에는 사내 임직원 디렉터리(LDAP/HR API)로 교체.
   ============================================================ */
export const MEMBERS = [
  { name: '이성택', team: '디자인시스템스쿼드', email: 'choicelee@lguplus.co.kr' },
  { name: '지현주', team: '미디어로그', email: 'jihyunju@medialog.co.kr' },
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
export function searchMembers(q, limit = 8) {
  const s = String(q || '').trim().toLowerCase()
  if (!s) return MEMBERS.slice(0, limit)
  return MEMBERS.filter((m) => `${m.name} ${m.team} ${m.email}`.toLowerCase().includes(s)).slice(0, limit)
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
