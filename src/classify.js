/* ============================================================
   VOC 분류·파싱 순수 로직 (UI 무관 · 부수효과 없음)
   - App.jsx에서 분리: 화면 컴포넌트와 분리해 유지보수성↑, 단위 테스트 가능.
   - 여기 함수들은 입력→출력만 하며 React/DOM/localStorage에 의존하지 않는다.
   ============================================================ */

/* ---------- 분류표(확정본) ---------- */
export const GROUPS = ['장애/오류', '성능', '개선 요청/희망', '단순 문의/불만/기타']
export const GROUP_MODE = {
  '장애/오류': '정형', '성능': '정형', '개선 요청/희망': '정형', '단순 문의/불만/기타': '열림',
}
export const FIXED_DEPTH2 = {
  '장애/오류': ['로그인불가/로그인풀림', '앱/웹 기능오류', '앱/웹 접속불가', '앱/웹화면 데이터 정합성 이슈', '기타'],
  '성능': ['앱/웹 속도 느림', '앱/웹 백화 현상'],
  '개선 요청/희망': ['앱/웹 기능 개선', '회원/로그인 개선', '기타'],
}
/* 대응영역 트리 (엑셀 '오류VOC인입영역' 기준) — 1depth → 2depth */
export const AREA_TREE = {
  'MY': ['가입정보관리', '요금/납부/청구', '회원/로그인/ID', '휴대폰 결제', '데이터', '고객지원', '자녀 통신요금 관리', '메뉴/GNB/위젯', '결합할인'],
  '검색/챗봇': ['검색/챗봇'],
  '혜택/멤버십': ['VIP콕(영화/구독/제휴)', '바코드/메뉴', '유플미션/출석체크', '멤버십(등급/정책)', '유플투쁠'],
  '상품/스토어': ['기타(유독)', '로밍', '모바일 가입', '유심/이심(eSIM)/너겟', '모바일 요금제', '모바일 부가서비스', '홈 요금제/홈 부가서비스', '액세서리/라이브'],
}
export const AREA1_LIST = Object.keys(AREA_TREE)
/* 영역별 담당자 매핑 (임시 예시 — 김형걸 담당자 표 입수 시 교체) */
export const OWNER_BY_AREA = {
  'MY': '김민수 · MY서비스팀',
  '검색/챗봇': '이서연 · AI검색팀',
  '혜택/멤버십': '박지훈 · 멤버십팀',
  '상품/스토어': '최유진 · 커머스팀',
}
export const CAT22 = [
  '네트워크/통신품질/와이파이', '인터넷·통신속도 불만', '앱·웹 이용문의', '요금제', '해지/약정/위약금',
  '가입/개통/결합', '부가서비스', '데이터(사용량/선물/충전)', '로밍', '유심/이심/IMSI',
  '단말/기기/액세서리', '멤버십/쿠폰/혜택/VIP콕', '설치/AS(홈상품)', 'IPTV/셋톱박스', '상담/고객지원',
  '매장/대리점', '회원/로그인/인증', '요금/청구/납부/환불', '휴대폰결제/소액결제',
  '유독/모바일TV/익시오/스마트홈', '배송', '검색/챗봇/AI',
]
export const GROUP_CLS = {
  '장애/오류': 'grp grp-fault', '성능': 'grp grp-perf',
  '개선 요청/희망': 'grp grp-improve', '단순 문의/불만/기타': 'grp grp-simple',
}

/* ---------- 데모용 경량 분류기 (직접 입력 → 게이트+22) ---------- */
export const norm = (s) => String(s).toLowerCase().replace(/[\s()[\]{}/\\.,;:!?~·・"'`+\-_*=|]/g, '')
export const FAULT_KW = ['오류', '에러', '튕김', '튕겨', '튕기', '튕', '먹통', '접속불가', '접속안', '로그인불가', '로그인풀림', '깨짐', '강제종료', '강종', '화면이안', '앱이꺼', '앱이안']
export const PERF_KW = ['느림', '느려', '느리', '백화', '버벅', '멈춤', '지연됨', '로딩']
export const IMPROVE_KW = ['개선', '바꿔', '바뀌었으면', '추가했으면', '불편해서', '제안', '했으면좋겠', '좋겠', '었으면', '헷갈려서개선']
export const CAT_KW = [
  ['네트워크/통신품질/와이파이', ['네트워크', '통화품질', '통신망', '와이파이', '중계기', '기지국', '통화끊김', '끊김', '끊기', '안터짐', '안터', '음영', '신호']],
  ['인터넷·통신속도 불만', ['통신속도', '인터넷속도', '데이터품질', '속도불만', '인터넷느림', '속도느']],
  ['앱·웹 이용문의', ['앱이용문의', '앱이용', '위젯', '메뉴위치', '바코드', '사용법', '앱문의', '앱에서']],
  ['요금제', ['요금제변경', '요금제추천', '요금제진단', '나의요금제', '최적요금제', '요금제바꿔', '요금제']],
  ['해지/약정/위약금', ['위약금', '약정', '재약정', '반환금', '해지', '일시정지', '번호이동', '분실파손', '세이브', '해지방어']],
  ['가입/개통/결합', ['가입정보', '결합', '개통', '단통법', '지원금', '공시지원금', '선택약정', '약정할인', '할부원금', '할부개월', '투게더', '가입']],
  ['부가서비스', ['부가서비스', '컬러링', '듀얼넘버', '착신전환', '휴대폰보험', '폰안심']],
  ['데이터(사용량/선물/충전)', ['데이터사용량', '데이터선물', '데이터충전', '데이터쿠폰', '데이터남은', '데이터']],
  ['로밍', ['로밍요금', '로밍요금제', '해외로밍', '로밍패스', '데이터로밍', '출국전', '로밍신청', '해외문자', '로밍']],
  ['유심/이심/IMSI', ['유심교체', '유심변경', '이심', '심전환', '심교체', 'imsi', 'esim', 'usim', '유심']],
  ['단말/기기/액세서리', ['기기변경', '단말설정', '기능설정', '단말기설정', '단말기', '액세서리', '모바일신분증', '핸드폰', '휴대폰', '기기']],
  ['멤버십/쿠폰/혜택/VIP콕', ['멤버십', 'vip콕', 'vip', '쿠폰', '혜택', '이벤트', '제휴', '영화']],
  ['설치/AS(홈상품)', ['이전설치', '인터넷설치', '공유기', '리모컨', '홈상품', '설치']],
  ['IPTV/셋톱박스', ['iptv', '셋톱박스', '셋톱', '셋탑']],
  ['상담/고객지원', ['상담연결', '상담지연', '미답변', '고객센터', 'ars', '답변지연', '업무불가', '상담종료', '상담']],
  ['매장/대리점', ['대리점', '매장', '영업', '오프라인']],
  ['회원/로그인/인증', ['로그인', '본인인증', '인증번호', '회원가입', '회원탈퇴', '아이디', '비밀번호', '명의', '인증']],
  ['요금/청구/납부/환불', ['청구서', '청구', '요금조회', '납부', '미납', '연체', '실시간요금', '자동이체', '선납', '선결제', '수납', '가상계좌', '세금계산서', '납부내역', '납부결과', '환불', '과금', '이중청구', '중복결제', '요금']],
  ['휴대폰결제/소액결제', ['휴대폰결제', '소액결제', '결제한도', '정기결제']],
  ['유독/모바일TV/익시오/스마트홈', ['유독', '구독서비스', '모바일tv', '익시오', 'ixio', '스마트홈', '넷플릭스', '디즈니', '티비', 'tv']],
  ['배송', ['배송', '택배', '수령', '배달', '도착']],
  ['검색/챗봇/AI', ['검색', '챗봇', '인공지능', 'ai']],
]
// 강한 우선순위 규칙(실라벨 VOC 12K건 학습·검증): 구어체 '안돼/안되'가 장애 게이트를 오발동시키기 전에
// 도메인 신호를 먼저 확정한다. 순서가 우선순위(앞이 우선). norm(공백·기호 제거·소문자) 기준.
export const PRIORITY_RULES = [
  [/안터|음영|신호.{0,2}약|신호.{0,2}없|신호불량|전파|통화.{0,3}끊|통화품질|통신망|중계기|기지국/, '네트워크/통신품질/와이파이'],
  [/인터넷.{0,4}느|통신속도|인터넷속도|속도.{0,3}(느|불만|저하)|데이터품질/, '인터넷·통신속도 불만'],
  [/로밍|출국전|로밍패스|해외문자/, '로밍'],
  [/유심|이심|imsi|esim|usim|심전환|puk/, '유심/이심/IMSI'],
  [/휴대폰결제|소액결제|결제한도|정기결제/, '휴대폰결제/소액결제'],
  [/연체|실시간요금|자동이체|선납|선결제|가상계좌|미납|세금계산서|납부내역|납부결과|이중납부|청구서|환불|수납/, '요금/청구/납부/환불'],
  [/단통법|공시지원금|선택약정|약정할인|할부원금|할부개월|투게더|결합할인|개통/, '가입/개통/결합'],
  [/번호이동|해지방어|위약금|재약정|약정|해지/, '해지/약정/위약금'],
  [/요금제/, '요금제'],
  [/유독|구독서비스|모바일tv|모바일티비|익시오|넷플릭스|디즈니|티빙|유플릭스|스마트홈/, '유독/모바일TV/익시오/스마트홈'],
  [/iptv|셋톱|셋탑|리모컨|리모콘/, 'IPTV/셋톱박스'],
  [/데이터선물|데이터충전|데이터쿠폰|데이터사용량/, '데이터(사용량/선물/충전)'],
  [/부가서비스|컬러링|듀얼넘버|착신전환|휴대폰보험/, '부가서비스'],
  [/멤버십|쿠폰|vip콕|vip|유플미션|출석체크|영화예매|제휴혜택|유플투쁠|네이버멤버십/, '멤버십/쿠폰/혜택/VIP콕'],
  [/단말설정|기능설정|단말기설정|폰안심|기기변경|액세서리/, '단말/기기/액세서리'],
  [/매장|대리점/, '매장/대리점'],
  [/상담연결|상담지연|답변지연|미답변|보이는ars|채팅상담|상담사연결/, '상담/고객지원'],
]
/* ---------- 전사(USER/CUSTOMER 대화) 파서 — 채팅 렌더·고객 발화 추출에 공통 사용 ---------- */
export const TRANSCRIPT_SPEAKERS = [
  { re: /^(customer|cust|고객|이용자|사용자|손님)$/i, side: 'cust', label: '고객' },
  { re: /^(user|agent|staff|상담사|상담원|직원|담당)$/i, side: 'staff', label: '상담사' },
]
export function parseTranscript(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const reSpk = /^([A-Za-z가-힣]+)\s*[:：]\s*(.*)$/s
  const turns = []; let cur = null; let speakerTurns = 0
  for (const line of lines) {
    const m = line.match(reSpk)
    const who = m ? TRANSCRIPT_SPEAKERS.find((s) => s.re.test(m[1])) : null
    if (m && who) {
      cur = { side: who.side, label: who.label, text: m[2] }; turns.push(cur); speakerTurns++
    } else if (cur) {
      cur.text += (cur.text ? ' ' : '') + line // 화자 표기 없는 줄 → 직전 발화에 이어붙임
    } else {
      cur = { side: 'note', label: '', text: line }; turns.push(cur)
    }
  }
  return speakerTurns >= 2 ? turns : null // 화자가 둘 이상 잡힌 진짜 대화만 채팅으로
}
// 전사면 고객(CUSTOMER) 발화만 모아 반환 — 상담사 인사말 노이즈를 제거해 분류·요약 정확도를 높인다.
export function customerIssueText(text) {
  const turns = parseTranscript(text)
  if (!turns) return String(text || '')
  const cust = turns.filter((t) => t.side === 'cust').map((t) => t.text).join(' ').trim()
  return cust || String(text || '')
}
export function demoClassify(text) {
  const v = norm(text)
  if (!v) return null
  // 0) 도메인 신호 먼저 — 구어체 '안돼/안되'가 장애 게이트를 오발동시키는 것을 방지(STT 학습 반영)
  for (const [re, cat] of PRIORITY_RULES) if (re.test(v)) return { group: '단순 문의/불만/기타', cat, conf: '높음', review: false, mode: '열림' }
  // 게이트: 정형 그룹
  if (FAULT_KW.some((k) => v.includes(norm(k)))) return { group: '장애/오류', cat: '앱/웹 기능오류', conf: '보통', review: false, mode: '정형' }
  if (PERF_KW.some((k) => v.includes(norm(k)))) return { group: '성능', cat: v.includes('백화') ? '앱/웹 백화 현상' : '앱/웹 속도 느림', conf: '보통', review: false, mode: '정형' }
  if (IMPROVE_KW.some((k) => v.includes(norm(k)))) return { group: '개선 요청/희망', cat: '앱/웹 기능 개선', conf: '보통', review: false, mode: '정형' }
  // 열림 그룹: 22개 분류는 점수제로
  const p = pick22(text)
  return { group: '단순 문의/불만/기타', cat: p.cat, conf: p.conf, review: p.review, mode: '열림' }
}

/* ---------- 업로드 VOC 분류·보강 (raw 행 → 우리 스키마) ----------
   엑셀의 사람-입력 라벨(VOC구분1 등)을 최대한 존중하고, 부족한 메타는 규칙으로 생성.
   기존 분류 자산(norm·CAT_KW·FIXED_DEPTH2)을 그대로 재사용한다. */
export function pickFixedCat(group, text) {
  const v = norm(text)
  if (group === '장애/오류') {
    if (/접속불가|접속안|먹통/.test(v)) return '앱/웹 접속불가'
    if (/정합성|데이터불일치|데이터안맞/.test(v)) return '앱/웹화면 데이터 정합성 이슈'
    if (/로그인/.test(v)) return '로그인불가/로그인풀림'
    if (/오류|에러|안됨|안돼|안되|튕|실패|깨짐|작동|동작|반응없|적용.{0,2}안/.test(v)) return '앱/웹 기능오류'
    return '기타'
  }
  if (group === '성능') return /백화/.test(v) ? '앱/웹 백화 현상' : '앱/웹 속도 느림'
  if (group === '개선 요청/희망') {
    if (/로그인|회원|아이디|비밀번호|인증|가입/.test(v)) return '회원/로그인 개선'
    if (/개선|추가|바꿔|바뀌|좋겠|불편|제안|했으면/.test(v)) return '앱/웹 기능 개선'
    return '기타'
  }
  return '앱/웹 기능 개선'
}
export function pick22(text) { // 열림 그룹 22개 분류: 우선순위 규칙 → 점수제(매칭 키워드 길이 합)
  const v = norm(text)
  for (const [re, cat] of PRIORITY_RULES) if (re.test(v)) return { cat, conf: '높음', review: false }
  const scores = {}
  for (const [cat, kws] of CAT_KW) { let s = 0; for (const kw of kws) { const nk = norm(kw); if (nk && v.includes(nk)) s += nk.length } if (s) scores[cat] = s }
  const e = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!e.length) return { cat: '기타', conf: '낮음', review: true }
  const tie = e[1] && e[1][1] === e[0][1]
  return { cat: e[0][0], conf: e[0][1] >= 4 ? '높음' : e[0][1] >= 2 ? '보통' : '낮음', review: e[0][1] < 2 || tie }
}
export function deriveSeverity(group, text) {
  if (group === '장애/오류') return 'High'
  const v = norm(text)
  if (/이중|중복청구|위약금|환불|미납|접속불가|먹통|불가|끊김|안터/.test(v)) return 'High'
  if (group === '성능') return 'Medium'
  return /불만|짜증|항의|최악|화남|불편/.test(v) ? 'Medium' : 'Low'
}
export function deriveSentiment(rawGroup, group, text) {
  if (group === '장애/오류' || group === '성능') return 'Negative'
  const v = norm(String(rawGroup) + ' ' + text)
  if (/불만|짜증|항의|최악|화남|불편|왜/.test(v)) return 'Negative'
  return 'Neutral'
}
/* STT/전사 등 본문에서 고객 핵심문장 추출 → 예상답안 근거로 사용 */
export function extractKey(text) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  // 1) 전사에 '고객:'/'상담사:' 화자 표기가 있으면 고객 발화만 추림
  const lines = raw.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean)
  let cust = lines.filter((l) => /^(고객|이용자|사용자|손님)\s*[:：]/.test(l)).map((l) => l.replace(/^[^:：]+[:：]\s*/, '').trim())
  let cands = cust.length ? cust : lines.map((l) => l.replace(/^(상담사|상담원|고객|이용자|사용자)\s*[:：]\s*/, '').trim())
  // 화자 표기가 없으면 문장 단위로 분해
  if (cands.length <= 1) cands = raw.split(/(?<=[.!?。…])\s+|[\n·]/).map((s) => s.replace(/^(상담사|상담원|고객)\s*[:：]\s*/, '').trim())
  cands = cands.filter((s) => s.length >= 4)
  if (!cands.length) return raw.slice(0, 70)
  const KW = ['안 돼', '안돼', '안되', '안 되', '안 됨', '오류', '에러', '끊', '느', '불가', '먹통', '튕', '풀림', '풀려', '로그인', '결제', '환불', '요금', '위약', '청구', '가입', '해지', '안 터', '터지', '지연', '중복', '백화', '버벅', '문의', '불편', '문제', '故', '안 나', '안나와']
  const score = (s) => KW.reduce((n, k) => n + (s.includes(k) ? 1 : 0), 0)
  cands.sort((a, b) => score(b) - score(a) || b.length - a.length)
  return cands[0].replace(/\s+/g, ' ').slice(0, 90)
}
export function deriveAction(group) {
  if (group === '장애/오류' || group === '성능') return { action: '개발 개선 검토', org: '개발' }
  if (group === '개선 요청/희망') return { action: 'UX 개선 검토', org: 'UX디자인' }
  return { action: '담당자 메일 전달', org: 'CX/운영' }
}
/* 조치 필요 = 처리 전 단계(신규·분류완료·처리필요)이면서, 분류 미확정(검토필요) 또는 우선순위 High.
   단, '단순 문의/불만/기타'(열림 그룹)는 일상 문의라 조치 필요 리스트에서 제외 — 장애/성능/개선만 큐에 노출. */
export const PRE_DONE = ['신규', '분류 완료', '처리 필요']
export function actionNeeded(v) {
  return v.group !== '단순 문의/불만/기타' && PRE_DONE.includes(v.status) && (v.review || v.severity === 'High')
}

/* ---------- 빈 컬럼 자동 생성(채널+내용 → 검토용 초안) ----------
   실제 인입은 인입채널·내용만 채워져 오고 VOC구분/대응영역/요약/답변/개발대응/진행상황은 비어 옴.
   아래 함수들이 그 값을 "초안"으로 제시 → 담당자 검수(AI 자동확정 아님). */
export function aiSummarize(content) {
  const t = String(content).replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const clause = t.split(/[.。!?\n]/)[0].trim()
  const s = clause.length >= 8 ? clause : t
  return s.length > 45 ? s.slice(0, 45) + '…' : s
}
/* 본문 형식 자동 판별 → 핵심 의도 텍스트 추출
   ① 상담 노트("고객요청내용: ㆍ…") → 요청 불릿, ② USER/CUSTOMER 전사 → 고객 발화, ③ 평문 → 원문 */
export function coreIssue(content) {
  const raw = String(content || '')
  const m = raw.match(/고객\s*요청\s*내용\s*[:：]?\s*([\s\S]*?)(?:처리\s*내용|작업\s*내용|상담\s*결과|조치\s*내용|답변\s*내용|$)/)
  if (m && m[1].trim().length >= 4) {
    const bul = m[1].split(/[\nㆍ•·]|\s-\s/).map((s) => s.trim()).filter((s) => s.length >= 4)
    if (bul.length) return bul.slice(0, 4).join(' / ')
  }
  return customerIssueText(raw)   // 전사면 고객 발화만, 아니면 원문
}
/* 구어체 선두 군더더기(맞장구·간투사) 제거 */
export const FILLER_LEAD = /^(예+|네+|아+|어+|음+|응+|그+|저+|저기|아니+요?|뭐|이게|그게|저는|제가|그러면은?|그래가지고|그래서|그러니까|근데|그런데|혹시|좀|지금|이제|일단|있잖아요?|저기요|다름이\s*아니라)\s+/
export function cleanClause(s) {
  let t = String(s).replace(/tag:[A-Z_]+\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 6; i++) { const n = t.replace(FILLER_LEAD, ''); if (n === t) break; t = n }
  return t.replace(/^[\s.,·ㆍ\-]+/, '').replace(/[\s.,]+$/, '').trim()
}
export const ISSUE_KW = ['결제', '선결제', '가상계좌', '납부', '연체', '미납', '환불', '청구', '요금', '요금제', '위약', '약정', '해지', '번호이동', '가입', '개통', '결합', '로밍', '출국', '해외', '유심', '이심', '데이터', '부가서비스', '멤버십', '쿠폰', '혜택', '영화', 'vip', '네트워크', '통화', '끊', '안터', '와이파이', '속도', '느', '인터넷', '로그인', '인증', '비밀번호', '아이디', '회원', '탈퇴', '오류', '에러', '안돼', '안되', '안됨', '먹통', '튕', '설치', '리모컨', 'iptv', '셋톱', '유독', '넷플릭스', '디즈니', '배송', '매장', '대리점', '상담', '기기', '기변', '단말', '문의', '신청', '변경', '조회', '확인', '취소', '불가', '안내', '어떻게', '얼마', '방법', '왜', '문제', '불편']
/* 핵심 의도 한 줄 요약: 노트/전사/평문 모두 → 신호어 밀집 절을 골라 군더더기 제거·축약 */
export function smartSummary(content) {
  const issue = coreIssue(content)
  const raw = String(issue || '').replace(/tag:[A-Z_]+\([^)]*\)/g, '')
  if (!raw.trim()) return aiSummarize(content)
  if (raw.includes(' / ')) { const s = raw.replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 60) + '…' : s } // 노트 불릿
  // 구어체 절 분리: 종결·연결어미 + 구두점
  const parts = raw.split(/(?<=거든요)|(?<=는데요)|(?<=는데)|(?<=구요)|(?<=고요)|(?<=려고요?)|(?<=려구요)|(?<=을까요)|(?<=나요)|(?<=드려요)|(?<=거예요)|(?<=합니다)|(?<=했어요)|(?<=해요)|[.!?。…\n·]/)
  let cands = parts.map(cleanClause).filter((s) => s.length >= 6)
  if (!cands.length) cands = [cleanClause(raw)].filter(Boolean)
  if (!cands.length) return aiSummarize(content)
  const score = (s) => { const sl = s.toLowerCase(); return ISSUE_KW.reduce((n, k) => n + (sl.includes(k) ? 1 : 0), 0) }
  cands.sort((a, b) => (score(b) - score(a)) || (Math.abs(a.length - 24) - Math.abs(b.length - 24)))
  let best = cands[0] || ''
  if (best.length > 46) best = best.slice(0, 46).replace(/\s+\S*$/, '') + '…'
  return best || aiSummarize(content)
}
/* 표준분류/정형분류 → 대응 영역(1 넓은 / 2 세부). 사내 라우팅 taxonomy (영역 트리 기준). */
export const AREA_BY_CAT = {
  // 열림 그룹 22개
  '요금제': ['상품/스토어', '모바일 요금제'], '요금/청구/납부/환불': ['MY', '요금/납부/청구'], '휴대폰결제/소액결제': ['MY', '휴대폰 결제'],
  '데이터(사용량/선물/충전)': ['MY', '데이터'], '부가서비스': ['상품/스토어', '모바일 부가서비스'], '앱·웹 이용문의': ['MY', '메뉴/GNB/위젯'],
  '검색/챗봇/AI': ['검색/챗봇', '검색/챗봇'], '해지/약정/위약금': ['상품/스토어', '모바일 가입'], '가입/개통/결합': ['상품/스토어', '모바일 가입'],
  '단말/기기/액세서리': ['상품/스토어', '액세서리/라이브'], '배송': ['상품/스토어', '액세서리/라이브'], '유심/이심/IMSI': ['상품/스토어', '유심/이심(eSIM)/너겟'],
  '설치/AS(홈상품)': ['상품/스토어', '홈 요금제/홈 부가서비스'], 'IPTV/셋톱박스': ['상품/스토어', '홈 요금제/홈 부가서비스'], '유독/모바일TV/익시오/스마트홈': ['상품/스토어', '기타(유독)'],
  '멤버십/쿠폰/혜택/VIP콕': ['혜택/멤버십', 'VIP콕(영화/구독/제휴)'], '회원/로그인/인증': ['MY', '회원/로그인/ID'],
  '네트워크/통신품질/와이파이': ['MY', '데이터'], '인터넷·통신속도 불만': ['MY', '데이터'], '로밍': ['상품/스토어', '로밍'],
  '상담/고객지원': ['MY', '고객지원'], '매장/대리점': ['MY', '고객지원'], '기타': ['MY', '메뉴/GNB/위젯'],
  // 정형 그룹 VOC구분2
  '로그인불가/로그인풀림': ['MY', '회원/로그인/ID'], '회원/로그인 개선': ['MY', '회원/로그인/ID'],
  '앱/웹 기능오류': ['MY', '메뉴/GNB/위젯'], '앱/웹 기능 개선': ['MY', '메뉴/GNB/위젯'], '앱/웹 접속불가': ['MY', '메뉴/GNB/위젯'],
  '앱/웹 속도 느림': ['MY', '메뉴/GNB/위젯'], '앱/웹 백화 현상': ['MY', '메뉴/GNB/위젯'], '앱/웹화면 데이터 정합성 이슈': ['MY', '메뉴/GNB/위젯'],
}
export function catToArea(group, cat) {
  return AREA_BY_CAT[cat] || ['MY', '메뉴/GNB/위젯']
}
export function ownerForArea(area1) { return OWNER_BY_AREA[area1] || '미지정' }
export function devNeeded(group) { return (group === '장애/오류' || group === '성능' || group === '개선 요청/희망') ? 'Y' : 'N' }
/* ── 분류별 고객 응대·내부 조치 가이드 (실 VOC taxonomy 기준) ── */
export const CAT_GUIDE = {
  '네트워크/통신품질/와이파이': { cust: '통신 품질 불편을 확인했습니다. 사용 지역·시간대를 확인해 망 품질을 점검하고, 필요 시 중계기 점검을 요청드리겠습니다.', act: '발생 지역·시간 확인 → 망 품질 점검 의뢰 후 회신' },
  '인터넷·통신속도 불만': { cust: '인터넷·데이터 속도 불편을 확인했습니다. 회선 상태와 속도를 점검해 원인을 안내드리겠습니다.', act: '회선 속도 점검 → 원인 안내, 필요 시 기사 방문' },
  '앱·웹 이용문의': { cust: '앱·웹 이용 방법 문의를 확인했습니다. 해당 메뉴 위치와 이용 방법을 안내드리겠습니다.', act: '이용 방법 안내' },
  '요금제': { cust: '요금제 관련 문의를 확인했습니다. 사용 패턴에 맞는 요금제를 비교해 안내드리겠습니다.', act: '사용량 기반 요금제 진단·추천' },
  '해지/약정/위약금': { cust: '해지·약정 관련 문의를 확인했습니다. 약정 잔여·예상 위약금을 정확히 확인해 안내드리겠습니다.', act: '약정/위약금 조회 → 정확 금액·절차 안내' },
  '가입/개통/결합': { cust: '가입·개통·결합 관련 문의를 확인했습니다. 진행 조건과 절차를 안내드리겠습니다.', act: '가입/결합 조건 확인 후 절차 안내' },
  '부가서비스': { cust: '부가서비스 관련 문의를 확인했습니다. 가입·해지·이용 방법을 안내드리겠습니다.', act: '부가서비스 가입/해지 처리·안내' },
  '데이터(사용량/선물/충전)': { cust: '데이터 관련 문의를 확인했습니다. 사용량·충전·선물 방법을 안내드리겠습니다.', act: '데이터 사용량 조회·충전/선물 안내' },
  '로밍': { cust: '로밍 관련 문의를 확인했습니다. 출국 전 로밍 요금제와 해외 이용 방법을 안내드리겠습니다.', act: '로밍 요금제/이용 방법 안내' },
  '유심/이심/IMSI': { cust: '유심·이심 관련 문의를 확인했습니다. 교체·전환 절차와 준비물을 안내드리겠습니다.', act: '유심/이심 교체·전환 절차 안내' },
  '단말/기기/액세서리': { cust: '단말기 관련 문의를 확인했습니다. 기기 설정·변경 방법을 안내드리겠습니다.', act: '기기 설정/변경 안내' },
  '멤버십/쿠폰/혜택/VIP콕': { cust: '멤버십·혜택 관련 문의를 확인했습니다. 쿠폰·혜택 사용 방법과 적용 여부를 확인해 안내드리겠습니다.', act: '쿠폰/혜택 적용 확인·안내' },
  '설치/AS(홈상품)': { cust: '설치·AS 관련 문의를 확인했습니다. 일정 확인 후 기사 방문을 안내드리겠습니다.', act: '설치/AS 일정 확인·배정' },
  'IPTV/셋톱박스': { cust: 'IPTV·셋톱박스 관련 문의를 확인했습니다. 증상 점검 후 해결 방법을 안내드리겠습니다.', act: '셋톱박스 점검·조치 안내' },
  '상담/고객지원': { cust: '상담 연결 불편을 확인했습니다. 빠르게 담당자가 연결되도록 조치하겠습니다.', act: '상담 이력 확인 → 우선 연결/콜백' },
  '매장/대리점': { cust: '매장 이용 관련 불편을 확인했습니다. 사실관계를 확인해 안내드리겠습니다.', act: '매장 사실관계 확인 후 회신' },
  '회원/로그인/인증': { cust: '로그인·인증 문제를 확인했습니다. 본인확인 후 정상 이용되도록 도와드리겠습니다.', act: '계정/인증 상태 점검 → 복구 안내' },
  '요금/청구/납부/환불': { cust: '요금·청구·납부 관련 문의를 확인했습니다. 청구 내역을 확인해 정확한 금액과 납부 방법을 안내드리겠습니다.', act: '청구/납부 내역 확인 → 정정·환불 필요 시 처리' },
  '휴대폰결제/소액결제': { cust: '휴대폰결제 관련 문의를 확인했습니다. 한도·이용 내역을 확인해 안내드리겠습니다.', act: '결제 한도/내역 확인·안내' },
  '유독/모바일TV/익시오/스마트홈': { cust: '유독·모바일TV 등 서비스 문의를 확인했습니다. 이용·해지 방법을 안내드리겠습니다.', act: '구독 서비스 이용/해지 안내' },
  '배송': { cust: '배송 관련 문의를 확인했습니다. 배송 현황을 확인해 안내드리겠습니다.', act: '배송 현황 확인·안내' },
  '검색/챗봇/AI': { cust: '검색·챗봇 이용 관련 문의를 확인했습니다. 정확한 결과가 나오도록 점검하겠습니다.', act: '검색/챗봇 동작 점검' },
}
export function guideFor(cat) { return CAT_GUIDE[cat] || null }
/* 고객 응대 초안(예상 답안): 분류 가이드 + 핵심 의도 반영 */
export function draftCustomerMsg(group, cat, summary) {
  const g = guideFor(cat)
  if (g) return (group === '장애/오류' || group === '성능') ? `불편을 드려 죄송합니다. ${g.cust}` : g.cust
  const lead = summary ? `요청하신 "${summary}" 건을 확인했습니다. ` : ''
  if (group === '장애/오류' || group === '성능') return `${lead}불편을 드려 죄송합니다. '${cat}' 증상을 담당 부서에서 확인 중이며, 조치되는 대로 신속히 안내드리겠습니다.`
  if (group === '개선 요청/희망') return `${lead}소중한 의견 감사합니다. '${cat}' 개선 의견을 담당 부서에 전달해 검토하겠습니다.`
  return `${lead}'${cat}' 관련 사항을 확인해 정확히 안내드리겠습니다. 추가 문의는 언제든 말씀해 주세요.`
}
/* 문자/푸시 초안(짧게, 항상 생성) */
export function draftSms(group, cat, summary) {
  const g = guideFor(cat)
  const apo = (group === '장애/오류' || group === '성능') ? '불편을 드려 죄송합니다. ' : ''
  const core = g ? g.cust : (group === '개선 요청/희망' ? `'${cat}' 개선 의견을 검토하겠습니다.` : `'${cat}' 문의를 확인해 안내드리겠습니다.`)
  let body = `[U+] 고객님, ${apo}${core}`
  return body.length > 110 ? body.slice(0, 108) + '…' : body
}
/* 분석용: 내용에서 실제 감지된 신호어(사전 단어) 추출 — 분류 근거 설명 */
export function detectedSignals(issue, cat) {
  const v = norm(issue), out = []
  const kws = (CAT_KW.find(([c]) => c === cat) || [null, []])[1]
  for (const k of kws) { if (out.length >= 3) break; const nk = norm(k); if (nk && v.includes(nk) && !out.includes(k)) out.push(k) }
  if (!out.length) { for (const [re, c] of PRIORITY_RULES) { if (c === cat && re.test(v)) { out.push(String(cat).split(/[/·]/)[0]); break } } }
  return [...new Set(out)].slice(0, 3)
}
export function severityReason(group, severity, issue) {
  if (group === '장애/오류') return '장애·오류 그룹'
  const v = norm(issue)
  if (/이중|중복청구|위약금|환불|미납|접속불가|먹통|불가|끊김|안터/.test(v)) return '고위험 신호어(환불·위약·중복청구 등) 감지'
  if (group === '성능') return '성능 저하'
  if (severity === 'Medium') return '불만·불편 표현 감지'
  return '일반 문의 수준'
}
/* Copilot AI 분석: 내용 기반 4줄(핵심 의도 → 분류 근거 → 심각도/감성 → 라우팅) */
export function buildAnalysis(o) {
  const sig = (o.signals && o.signals.length) ? ` — 신호어(${o.signals.join(', ')}) 감지` : (o.mode === '정형' ? ' — 장애/성능/개선 게이트 매칭' : '')
  return [
    `핵심 의도: ${o.summary || '내용 확인 필요'}`,
    `분류 근거: '${o.cat}'${sig} → 그룹 '${o.group}' (${o.mode})`,
    `심각도 ${o.severity} (${o.severityReason}) · 고객 감성 ${o.sentiment}`,
    `대응영역 ${o.area1} › ${o.area2} · 담당 ${o.owner} · 개발대응 ${o.dev} · 진행 ${o.status}`,
  ]
}

/* ---------- PII 마스킹 (입력/붙여넣기 시점 · 전화·이메일·이름) ---------- */
export function maskPII(s) {
  if (s == null || s === '') return s
  let t = String(s)
  t = t.replace(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g, '$1-****-$3')
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '***@***')
  t = t.replace(/([가-힣]{2,3})\s*(님|씨)(?![가-힣])/g, (_m, n, suf) => '○'.repeat(n.length) + suf)
  t = t.replace(/(저는|성함은|이름은|고객명|담당자)\s*([가-힣]{2,3})/g, (_m, lead, n) => lead + ' ' + '○'.repeat(n.length))
  return t
}

/* 채널값 정제 — 붙여넣기 열 밀림으로 채널칸에 문장/이메일/시간 등이 들어오면 '기타'로 버킷팅 */
export const KNOWN_CHANNELS = ['고객의소리', 'Call', '콜', '콜랩', 'Medallia', '메달리아', 'App Store', '앱스토어', '구글플레이', '고객센터', '공용메일', '채팅', '챗봇', '홈페이지', '웹', '앱']
export function cleanChannel(ch) {
  const s = String(ch || '').trim()
  if (!s) return '미상'
  if (KNOWN_CHANNELS.includes(s)) return s
  // 채널 같지 않은 값(문장·이메일·시간·날짜·과도하게 김) → 기타
  if (s.length > 10 || /@|https?:|[.,?!]|요청|예정|확인|드립니다|건입니다|^\d/.test(s)) return '기타'
  return s
}

/* ---------- 엑셀에서 복사한 셀(TSV) 붙여넣기 파싱 ----------
   탭=열 구분, 줄바꿈=행 구분.
   ① 첫 줄이 헤더면 이름으로 열을 찾음(열 순서 무관, 가장 견고)
   ② 헤더가 없고 열이 많으면 실제 파일의 고정 16열 레이아웃 위치로 매핑
   ③ 한 열이면 그 줄=내용 */
export const PASTE_HEADERS = {
  date: ['인입일자'], channel: ['인입채널', '채널'], customer: ['고객번호', 'ctn', '기기'],
  content: ['내용', '본문'], week: ['월내주차', '주차'], occur: ['발생일자'],
}
// 실제 파일 컬럼 순서: 0 인입일자 1 인입채널 2 고객번호 3~7 (구분/영역) 8 내용 9~13 (답변/개발/진행/티켓/비고) 14 월내주차 15 발생일자
export const PASTE_POS = { date: 0, channel: 1, customer: 2, content: 8, week: 14, occur: 15 }
// 엑셀/스프레드시트 클립보드(TSV)를 따옴표·줄바꿈을 고려해 2차원 격자로 파싱.
// - 탭=열 구분, 줄바꿈=행 구분 (단, "..."로 감싼 셀 안의 탭/줄바꿈은 셀 내용으로 보존)
// - 셀을 감싼 바깥 따옴표는 제거, 내부의 ""는 "로 복원
export function parseGrid(text) {
  const s = String(text).replace(/\r\n?/g, '\n')
  const rows = []; let row = [], cell = '', inQ = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQ) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else inQ = false }
      else cell += ch
    } else if (ch === '"' && cell === '') { inQ = true }       // 셀 시작 위치의 따옴표만 인용 시작으로 인식
    else if (ch === '\t') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => (c || '').trim() !== '')) // 완전 빈 행 제거
}
export function parsePaste(text) {
  const grid = parseGrid(text)
  if (!grid.length) return []
  const idx = {}
  grid[0].forEach((cell, i) => {
    const nc = norm(cell); if (!nc) return
    for (const [f, syns] of Object.entries(PASTE_HEADERS)) {
      if (idx[f] == null && syns.some((s) => { const ns = norm(s); return nc.includes(ns) || ns.includes(nc) })) idx[f] = i
    }
  })
  const hasHeader = idx.content != null || idx.channel != null
  const dataRows = hasHeader ? grid.slice(1) : grid
  const dateRe = /^\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}/
  const out = []
  for (const cells of dataRows) {
    let content = '', channel = '', customer = '', date = '', week = '', occur = ''
    if (hasHeader) {
      const g = (k) => (idx[k] != null ? (cells[idx[k]] || '').trim() : '')
      content = g('content'); channel = g('channel'); customer = g('customer'); date = g('date'); week = g('week'); occur = g('occur')
    } else if (cells.length >= 10) {
      const g = (i) => (cells[i] || '').trim() // 고정 16열 레이아웃 위치 매핑
      content = g(PASTE_POS.content); channel = g(PASTE_POS.channel); customer = g(PASTE_POS.customer)
      date = g(PASTE_POS.date); week = g(PASTE_POS.week); occur = g(PASTE_POS.occur)
    } else {
      const tr = cells.map((c) => (c || '').trim())
      if (tr.length === 1) { content = tr[0] }
      else {
        let rest = tr
        if (dateRe.test(tr[0])) { date = tr[0]; rest = tr.slice(1) } // 첫 열이 날짜면 인입일자로
        content = rest.slice().sort((a, b) => b.length - a.length)[0] || '' // 가장 긴 셀(전사/본문)을 내용으로
      }
    }
    if (!content) continue
    out.push({ content, channel: channel || '고객의소리', customer, date, week, occur })
  }
  return out
}

/* 화면에서 직접 입력한 VOC(채널+내용) → 우리 스키마로 분류·보강.
   구분1/2·대응영역·요약·답변·개발대응·진행상황을 모두 도출(검토용 초안). */
export function enrichRow(r, id, ov) {
  const content = maskPII(r.content || '(내용 없음)')
  const issue = customerIssueText(content)      // 전사면 고객 발화만, 아니면 원문 — 상담사 인사말 노이즈 제거
  // 1) 고객 발화 기준으로 그룹·분류 도출 (저장된 값 ov가 있으면 그 값을 우선 — 표시·생성 일관성)
  const cls = demoClassify(issue) || { group: '단순 문의/불만/기타', mode: '열림' }
  const mode = cls.mode
  let group = cls.group, cat, conf, review
  if (mode === '정형') { cat = pickFixedCat(group, issue); conf = '보통'; review = false }
  else { const p = pick22(issue); cat = p.cat; conf = p.conf; review = p.review }
  if (ov && ov.group) group = ov.group
  if (ov && ov.cat) cat = ov.cat       // 이후 답안·문자·분석·영역이 모두 최종 분류 기준으로 생성됨
  const severity = (ov && ov.severity) || deriveSeverity(group, issue)
  const sentiment = deriveSentiment('', group, issue)
  const { action, org } = deriveAction(group)
  // 2) 나머지 컬럼 자동 생성(검수용 초안) — 핵심 의도 기반 요약·답안·문자·분석
  const summary = smartSummary(content)
  const da = catToArea(group, cat)
  const area1 = (ov && ov.area1) || da[0], area2 = (ov && ov.area2) || da[1]
  const dev = devNeeded(group)
  const owner = (ov && ov.owner) || ownerForArea(area1)
  const signals = detectedSignals(issue, cat)
  const answer = draftCustomerMsg(group, cat, summary)
  const status = (ov && ov.status) || (severity === 'High' ? '처리 필요' : '분류 완료')
  // 3) 액션 초안: 문자/푸시는 항상 생성(분류별 안내), 메일은 정형/High면 담당 전달용
  const sms = draftSms(group, cat, summary)
  const mail = (group !== '단순 문의/불만/기타' || severity === 'High')
    ? { to: org, subject: `[VOC ${severity}] ${cat} — ${summary}`, body: `핵심 의도: ${summary}\n\n${content}\n\n분류: ${group} · ${cat} / 대응영역: ${area1} › ${area2}\n권장 조치: ${guideFor(cat) ? guideFor(cat).act : action}\n담당 검토 후 처리 요청 (개발 대응: ${dev}).` }
    : null
  return {
    id, source: 'input',
    channel: cleanChannel(r.channel), customer: maskPII(r.customer) || '****', customerRaw: (r.customer || '').trim(),
    date: r.date || '', week: r.week || '', occur: r.occur || '',
    content, summary, group, cat, severity, sentiment, status, conf, review, action, org, mode,
    area1, area2, devNeeded: dev, owner, jiraUrl: '', ownerNote: '',
    analysis: buildAnalysis({ summary, cat, group, mode, signals, severity, severityReason: severityReason(group, severity, issue), sentiment, area1, area2, owner, dev, status }),
    sms, mail, answer,
    improvement: { problem: summary, suggestion: `${guideFor(cat) ? guideFor(cat).act : org + ' 확인 후 개선/안내'}`, effect: '재문의·불편 감소' },
    ticket: '',
  }
}

/* ---------- 기간/주차 유틸 (추이·피벗 공통) ---------- */
export function weekKey(w) { const m = String(w).match(/(\d+)\D+(\d+)/); return m ? (+m[1]) * 10 + (+m[2]) : 9999 }
// 'YYYY.MM.DD' / 'YYYY.M.D' 등 → 'YYYY-MM-DD' (없으면 '')
export function toDay(s) { if (!s) return ''; const m = String(s).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '' }
export function recDay(d) { return toDay(d.date) || toDay(d.occur) }
