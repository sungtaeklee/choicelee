import React, { useState, useMemo, useEffect } from 'react'

/* ============================================================
   U+ VOC Action Copilot — 공모전 MVP (정적 프로토타입 · React)
   채널 수집 + 화면 직접 입력. 샘플은 하드코딩(입력분은 useState).
   분류표: depth1 4그룹(정형 3 + 열림 1) + 열림 그룹의 표준분류 22개.
   ============================================================ */

/* ---------- 분류표(확정본) ---------- */
const GROUPS = ['장애/오류', '성능', '개선 요청/희망', '단순 문의/불만/기타']
const GROUP_MODE = {
  '장애/오류': '정형', '성능': '정형', '개선 요청/희망': '정형', '단순 문의/불만/기타': '열림',
}
const FIXED_DEPTH2 = {
  '장애/오류': ['앱/웹 기능오류', '앱/웹 접속불가', '앱/웹화면 데이터 정합성 이슈', '로그인불가/로그인풀림', '기타'],
  '성능': ['앱/웹 속도 느림', '앱/웹 백화 현상'],
  '개선 요청/희망': ['앱/웹 기능 개선'],
}
const CAT22 = [
  '네트워크/통신품질/와이파이', '인터넷·통신속도 불만', '앱·웹 이용문의', '요금제', '해지/약정/위약금',
  '가입/개통/결합', '부가서비스', '데이터(사용량/선물/충전)', '로밍', '유심/이심/IMSI',
  '단말/기기/액세서리', '멤버십/쿠폰/혜택/VIP콕', '설치/AS(홈상품)', 'IPTV/셋톱박스', '상담/고객지원',
  '매장/대리점', '회원/로그인/인증', '요금/청구/납부/환불', '휴대폰결제/소액결제',
  '유독/모바일TV/익시오/스마트홈', '배송', '검색/챗봇/AI',
]
const GROUP_CLS = {
  '장애/오류': 'grp grp-fault', '성능': 'grp grp-perf',
  '개선 요청/희망': 'grp grp-improve', '단순 문의/불만/기타': 'grp grp-simple',
}

/* ---------- 데모용 경량 분류기 (직접 입력 → 게이트+22) ---------- */
const norm = (s) => String(s).toLowerCase().replace(/[\s()[\]{}/\\.,;:!?~·・"'`+\-_*=|]/g, '')
const FAULT_KW = ['오류', '안됨', '안됩', '안돼', '안되', '튕김', '튕겨', '튕기', '튕', '먹통', '접속불가', '접속안', '로그인불가', '로그인풀림', '에러', '깨짐', '실패']
const PERF_KW = ['느림', '느려', '느리', '백화', '버벅', '멈춤', '지연됨', '로딩']
const IMPROVE_KW = ['개선', '바꿔', '바뀌었으면', '추가했으면', '불편해서', '제안', '했으면좋겠', '좋겠', '었으면', '헷갈려서개선']
const CAT_KW = [
  ['네트워크/통신품질/와이파이', ['네트워크', '통화품질', '통신망', '와이파이', '중계기', '기지국', '통화끊김', '끊김', '끊기', '안터짐', '안터', '음영']],
  ['인터넷·통신속도 불만', ['통신속도', '인터넷속도', '데이터품질', '속도불만', '인터넷느림']],
  ['앱·웹 이용문의', ['앱이용문의', '앱이용', '위젯', '메뉴위치', '바코드', '사용법', '앱문의']],
  ['요금제', ['요금제변경', '요금제추천', '요금제진단', '나의요금제', '요금제']],
  ['해지/약정/위약금', ['위약금', '약정', '재약정', '반환금', '해지', '일시정지']],
  ['가입/개통/결합', ['가입정보', '결합', '개통', '번호이동', '가입']],
  ['부가서비스', ['부가서비스', '컬러링', '듀얼넘버', '착신전환', '휴대폰보험']],
  ['데이터(사용량/선물/충전)', ['데이터사용량', '데이터선물', '데이터충전', '데이터쿠폰', '데이터']],
  ['로밍', ['로밍요금', '해외문자', '로밍']],
  ['유심/이심/IMSI', ['유심교체', '이심', '심전환', 'imsi', '유심']],
  ['단말/기기/액세서리', ['기기변경', '단말기', '액세서리', '모바일신분증', '핸드폰', '휴대폰', '기기']],
  ['멤버십/쿠폰/혜택/VIP콕', ['멤버십', 'vip콕', 'vip', '쿠폰', '혜택', '이벤트', '제휴', '영화']],
  ['설치/AS(홈상품)', ['이전설치', '인터넷설치', '공유기', '리모컨', '홈상품', '설치']],
  ['IPTV/셋톱박스', ['iptv', '셋톱박스', '셋톱', '셋탑']],
  ['상담/고객지원', ['상담연결', '상담지연', '미답변', '고객센터', 'ars', '답변지연', '상담']],
  ['매장/대리점', ['대리점', '매장', '영업', '오프라인']],
  ['회원/로그인/인증', ['로그인', '본인인증', '인증번호', '회원가입', '회원탈퇴', '아이디', '비밀번호', '명의', '인증']],
  ['요금/청구/납부/환불', ['청구서', '청구', '요금조회', '납부', '미납', '자동이체', '환불', '과금', '이중청구', '중복결제', '요금']],
  ['휴대폰결제/소액결제', ['휴대폰결제', '소액결제', '결제한도']],
  ['유독/모바일TV/익시오/스마트홈', ['유독', '모바일tv', '익시오', 'ixio', '스마트홈', '넷플릭스', '디즈니', '티비', 'tv']],
  ['배송', ['배송', '택배', '수령', '배달', '도착']],
  ['검색/챗봇/AI', ['검색', '챗봇', '인공지능', 'ai']],
]
// 강한 우선순위 규칙: 모호한 일반 키워드보다 먼저 적용(예: '데이터' 단어가 있어도 연결 실패면 네트워크)
const PRIORITY_RULES = [
  [/안터|안터짐|안터져|안터지|터지지않|음영|신호.{0,2}약|신호.{0,2}없|신호불량|전파/, '네트워크/통신품질/와이파이'],
]
function demoClassify(text) {
  const v = norm(text)
  if (!v) return null
  // 게이트: 정형 그룹 먼저
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
function pickFixedCat(group, text) {
  const v = norm(text)
  if (group === '장애/오류') {
    if (/접속불가|접속안|먹통/.test(v)) return '앱/웹 접속불가'
    if (/정합성|데이터불일치|데이터안맞/.test(v)) return '앱/웹화면 데이터 정합성 이슈'
    if (/로그인/.test(v)) return '로그인불가/로그인풀림'
    if (/오류|에러|안됨|안돼|안되|튕|실패|깨짐|작동|동작|반응없|적용.{0,2}안/.test(v)) return '앱/웹 기능오류'
    return '기타'
  }
  if (group === '성능') return /백화/.test(v) ? '앱/웹 백화 현상' : '앱/웹 속도 느림'
  return '앱/웹 기능 개선' // 개선 요청/희망
}
function pick22(text) { // 열림 그룹 22개 분류: 우선순위 규칙 → 점수제(매칭 키워드 길이 합)
  const v = norm(text)
  for (const [re, cat] of PRIORITY_RULES) if (re.test(v)) return { cat, conf: '높음', review: false }
  const scores = {}
  for (const [cat, kws] of CAT_KW) { let s = 0; for (const kw of kws) { const nk = norm(kw); if (nk && v.includes(nk)) s += nk.length } if (s) scores[cat] = s }
  const e = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!e.length) return { cat: '기타', conf: '낮음', review: true }
  const tie = e[1] && e[1][1] === e[0][1]
  return { cat: e[0][0], conf: e[0][1] >= 4 ? '높음' : e[0][1] >= 2 ? '보통' : '낮음', review: e[0][1] < 2 || tie }
}
function deriveSeverity(group, text) {
  if (group === '장애/오류') return 'High'
  const v = norm(text)
  if (/이중|중복청구|위약금|환불|미납|접속불가|먹통|불가|끊김|안터/.test(v)) return 'High'
  if (group === '성능') return 'Medium'
  return /불만|짜증|항의|최악|화남|불편/.test(v) ? 'Medium' : 'Low'
}
function deriveSentiment(rawGroup, group, text) {
  if (group === '장애/오류' || group === '성능') return 'Negative'
  const v = norm(String(rawGroup) + ' ' + text)
  if (/불만|짜증|항의|최악|화남|불편|왜/.test(v)) return 'Negative'
  return 'Neutral'
}
function deriveAction(group) {
  if (group === '장애/오류' || group === '성능') return { action: '개발 개선 검토', org: '개발' }
  if (group === '개선 요청/희망') return { action: 'UX 개선 검토', org: 'UX디자인' }
  return { action: '담당자 메일 전달', org: 'CX/운영' }
}

/* ---------- 빈 컬럼 자동 생성(채널+내용 → 검토용 초안) ----------
   실제 인입은 인입채널·내용만 채워져 오고 VOC구분/대응영역/요약/답변/개발대응/진행상황은 비어 옴.
   아래 함수들이 그 값을 "초안"으로 제시 → 담당자 검수(AI 자동확정 아님). */
function aiSummarize(content) {
  const t = String(content).replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const clause = t.split(/[.。!?\n]/)[0].trim()
  const s = clause.length >= 8 ? clause : t
  return s.length > 45 ? s.slice(0, 45) + '…' : s
}
/* 표준분류 → 대응 영역(1 넓은 / 2 세부) 제안. 사내 라우팅 taxonomy라 가장 보정이 잦은 표. */
const AREA_BY_CAT = {
  '요금제': ['MY', '요금제'], '요금/청구/납부/환불': ['MY', '요금/청구'], '휴대폰결제/소액결제': ['MY', '휴대폰결제'],
  '데이터(사용량/선물/충전)': ['MY', '데이터'], '부가서비스': ['MY', '부가서비스'], '앱·웹 이용문의': ['MY', '앱/웹 이용'],
  '검색/챗봇/AI': ['MY', '검색/챗봇'], '해지/약정/위약금': ['상품/스토어', '해지/약정'], '가입/개통/결합': ['상품/스토어', '가입/개통'],
  '단말/기기/액세서리': ['상품/스토어', '단말/기기'], '배송': ['상품/스토어', '배송'], '유심/이심/IMSI': ['상품/스토어', '유심/이심'],
  '설치/AS(홈상품)': ['상품/스토어', '설치/AS'], 'IPTV/셋톱박스': ['상품/스토어', 'IPTV/셋톱'], '유독/모바일TV/익시오/스마트홈': ['상품/스토어', '유독/스마트홈'],
  '멤버십/쿠폰/혜택/VIP콕': ['혜택/멤버십', '멤버십/혜택'], '회원/로그인/인증': ['회원/로그인', '인증'],
  '네트워크/통신품질/와이파이': ['기타', '네트워크/품질'], '인터넷·통신속도 불만': ['기타', '인터넷/속도'], '로밍': ['기타', '로밍'],
  '상담/고객지원': ['기타', '고객센터'], '매장/대리점': ['기타', '매장/대리점'], '기타': ['기타', '기타'],
}
function catToArea(group, cat) {
  if (group === '장애/오류' || group === '성능' || group === '개선 요청/희망') return ['APP/WEB', cat]
  return AREA_BY_CAT[cat] || ['기타', cat]
}
function devNeeded(group) { return (group === '장애/오류' || group === '성능' || group === '개선 요청/희망') ? 'Y' : 'N' }
function draftAnswer(group, cat) {
  if (group === '장애/오류' || group === '성능') return `불편을 드려 죄송합니다. 말씀하신 '${cat}' 증상은 담당 부서에서 원인을 확인하고 있으며, 확인되는 대로 신속히 안내드리겠습니다.`
  if (group === '개선 요청/희망') return `소중한 의견 감사합니다. '${cat}' 관련 개선 의견을 담당 부서에 전달했으며 검토 후 반영을 추진하겠습니다.`
  return `문의 주신 '${cat}' 관련 내용을 확인하여 정확한 사항을 안내드리겠습니다. 추가로 궁금한 점이 있으시면 언제든 말씀해 주세요.`
}

/* ---------- PII 마스킹 (입력/붙여넣기 시점 · 전화·이메일·이름) ---------- */
function maskPII(s) {
  if (s == null || s === '') return s
  let t = String(s)
  t = t.replace(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g, '$1-****-$3')
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '***@***')
  t = t.replace(/([가-힣]{2,3})\s*(님|씨)(?![가-힣])/g, (_m, n, suf) => '○'.repeat(n.length) + suf)
  t = t.replace(/(저는|성함은|이름은|고객명|담당자)\s*([가-힣]{2,3})/g, (_m, lead, n) => lead + ' ' + '○'.repeat(n.length))
  return t
}

/* 채널값 정제 — 붙여넣기 열 밀림으로 채널칸에 문장/이메일/시간 등이 들어오면 '기타'로 버킷팅 */
const KNOWN_CHANNELS = ['고객의소리', 'Call', '콜', '콜랩', 'Medallia', '메달리아', 'App Store', '앱스토어', '구글플레이', '고객센터', '공용메일', '채팅', '챗봇', '홈페이지', '웹', '앱']
function cleanChannel(ch) {
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
const PASTE_HEADERS = {
  date: ['인입일자'], channel: ['인입채널', '채널'], customer: ['고객번호', 'ctn', '기기'],
  content: ['내용', '본문'], week: ['월내주차', '주차'], occur: ['발생일자'],
}
// 실제 파일 컬럼 순서: 0 인입일자 1 인입채널 2 고객번호 3~7 (구분/영역) 8 내용 9~13 (답변/개발/진행/티켓/비고) 14 월내주차 15 발생일자
const PASTE_POS = { date: 0, channel: 1, customer: 2, content: 8, week: 14, occur: 15 }
function parsePaste(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '')
  if (!lines.length) return []
  const idx = {}
  lines[0].split('\t').forEach((cell, i) => {
    const nc = norm(cell); if (!nc) return
    for (const [f, syns] of Object.entries(PASTE_HEADERS)) {
      if (idx[f] == null && syns.some((s) => { const ns = norm(s); return nc.includes(ns) || ns.includes(nc) })) idx[f] = i
    }
  })
  const hasHeader = idx.content != null || idx.channel != null
  const dataLines = hasHeader ? lines.slice(1) : lines
  const out = []
  for (const line of dataLines) {
    const cells = line.split('\t')
    let content = '', channel = '', customer = '', date = '', week = '', occur = ''
    if (hasHeader) {
      const g = (k) => (idx[k] != null ? (cells[idx[k]] || '').trim() : '')
      content = g('content'); channel = g('channel'); customer = g('customer'); date = g('date'); week = g('week'); occur = g('occur')
    } else if (cells.length >= 10) {
      const g = (i) => (cells[i] || '').trim() // 고정 16열 레이아웃 위치 매핑
      content = g(PASTE_POS.content); channel = g(PASTE_POS.channel); customer = g(PASTE_POS.customer)
      date = g(PASTE_POS.date); week = g(PASTE_POS.week); occur = g(PASTE_POS.occur)
    } else {
      content = cells.length === 1 ? cells[0].trim() : (cells.map((c) => c.trim()).sort((a, b) => b.length - a.length)[0] || '')
    }
    if (!content) continue
    out.push({ content, channel: channel || '고객의소리', customer, date, week, occur })
  }
  return out
}

/* 화면에서 직접 입력한 VOC(채널+내용) → 우리 스키마로 분류·보강.
   구분1/2·대응영역·요약·답변·개발대응·진행상황을 모두 도출(검토용 초안). */
function enrichRow(r, id) {
  const content = maskPII(r.content || '(내용 없음)')
  // 1) 채널+내용에서 그룹·분류 도출
  const cls = demoClassify(content) || { group: '단순 문의/불만/기타', mode: '열림' }
  const group = cls.group, mode = cls.mode
  let cat, conf, review
  if (mode === '정형') { cat = pickFixedCat(group, content); conf = '보통'; review = false }
  else { const p = pick22(content); cat = p.cat; conf = p.conf; review = p.review }
  const severity = deriveSeverity(group, content)
  const sentiment = deriveSentiment('', group, content)
  const { action, org } = deriveAction(group)
  // 2) 나머지 컬럼 자동 생성(검토용 초안)
  const summary = aiSummarize(content)
  const [area1, area2] = catToArea(group, cat)
  const dev = devNeeded(group)
  const answer = draftAnswer(group, cat)
  const status = severity === 'High' ? '처리 필요' : '분류 완료'
  // 3) 액션 초안 라우팅: 고객 응대 채널이면 문자 초안, 정형/High면 담당 메일 초안
  const toCustomer = /call|고객센터|고객의소리/i.test(r.channel || '')
  const sms = (group === '단순 문의/불만/기타' && toCustomer) ? answer : ''
  const mail = (group !== '단순 문의/불만/기타' || severity === 'High')
    ? { to: org, subject: `[VOC ${severity}] ${cat} — ${summary}`, body: `${content}\n\n분류: ${group} · ${cat} / 대응영역: ${area1} › ${area2}\n담당 검토 후 처리 요청 (개발 대응: ${dev}).` }
    : null
  return {
    id, source: 'input',
    channel: cleanChannel(r.channel), customer: maskPII(r.customer) || '****', customerRaw: (r.customer || '').trim(),
    date: r.date || '', week: r.week || '', occur: r.occur || '',
    content, summary, group, cat, severity, sentiment, status, conf, review, action, org, mode,
    area1, area2, devNeeded: dev,
    analysis: [
      `채널·내용 기반 분류 → '${group}' (${mode})`,
      mode === '정형' ? `정형 — 닫힌 분류값 '${cat}'로 매핑` : `열림 — 표준분류 22개 중 '${cat}'로 추론`,
      `대응 영역 초안: ${area1} › ${area2} · 개발 대응: ${dev} · 진행상황: ${status}`,
    ],
    sms, mail, answer,
    improvement: { problem: summary, suggestion: `${org} 확인 후 개선/안내`, effect: '재문의·불편 감소' },
    ticket: '',
  }
}

/* ---------- 로컬 저장(재접속 유지) ----------
   파생 결과 전체가 아니라 입력 원본(채널·내용·실번호·일자·주차)만 저장하고,
   불러올 때 enrichRow로 다시 분류·생성한다. 용량을 줄이고, 분류기 개선 시 자동 반영. */
const LS_KEY = 'voc-action-copilot:added:v1'
function loadAdded() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)
    if (!raw) return []
    const recs = JSON.parse(raw)
    if (!Array.isArray(recs)) return []
    return recs.map((r) => enrichRow({ channel: r.c, content: r.t, customer: r.n, date: r.d, week: r.w, occur: r.o }, r.id))
  } catch { return [] }
}
function saveAdded(arr) {
  try {
    if (typeof localStorage === 'undefined') return true
    if (!arr.length) { localStorage.removeItem(LS_KEY); return true }
    const recs = arr.map((v) => ({ id: v.id, c: v.channel, t: v.content, n: v.customerRaw || '', d: v.date || '', w: v.week || '', o: v.occur || '' }))
    localStorage.setItem(LS_KEY, JSON.stringify(recs))
    return true
  } catch { return false } // 저장 한도 초과 등
}

/* ---------- 사내 전용 접근 (데모 게이트) ----------
   ⚠ 백엔드가 없으므로 이건 시연용 게이트다. 진짜 접근 제어가 아니다(소스/스토리지로 우회 가능).
   실배포 시에는 사내 SSO 연동 또는 사내망/VPN 한정 배포가 필요하다.
   아래 두 상수를 실제 값으로 교체하세요. */
const COMPANY_DOMAINS = ['lguplus.co.kr'] // 가입 허용 회사 이메일 도메인 (여러 개 가능)
const COMPANY_CODE = 'UPLUS-CX-2026'      // 사내에 공유하는 가입 인증 코드(임시값 · 교체 권장)
const ACC_KEY = 'voc-action-copilot:accounts:v1'
const SESS_KEY = 'voc-action-copilot:session:v1'
async function hashPw(pw, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function loadAccounts() { try { return JSON.parse(localStorage.getItem(ACC_KEY)) || [] } catch { return [] } }
function saveAccounts(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)) } catch { /* noop */ } }
function isCompanyEmail(email) {
  const m = /^[^@\s]+@([^@\s]+)$/.exec(String(email).trim().toLowerCase())
  return !!m && COMPANY_DOMAINS.includes(m[1])
}
function getSession() { try { return localStorage.getItem(SESS_KEY) || '' } catch { return '' } }
function setSession(email) { try { email ? localStorage.setItem(SESS_KEY, email) : localStorage.removeItem(SESS_KEY) } catch { /* noop */ } }

/* ---------- 메타/배지 ---------- */
const SEVERITY = { High: 'sev sev-high', Medium: 'sev sev-med', Low: 'sev sev-low' }
const SENTIMENT = { Negative: 'sent sent-neg', Neutral: 'sent sent-neu', Positive: 'sent sent-pos' }
const STATUS = { '신규': 'stt stt-new', '분류 완료': 'stt stt-cls', '처리 필요': 'stt stt-todo', '처리 중': 'stt stt-doing', '처리 완료': 'stt stt-done' }
const CONF = { '높음': 'conf conf-h', '보통': 'conf conf-m', '낮음': 'conf conf-l' }
const KANBAN_COLS = ['신규', '분류 완료', '처리 필요', '처리 중', '처리 완료']

function ChannelIcon({ channel, size = 16 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (channel === 'Call') return <svg {...c}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
  if (channel === 'Medallia') return <svg {...c}><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 5-6" /></svg>
  if (channel === 'App Store') return <svg {...c}><rect x="5" y="2" width="14" height="20" rx="2.5" /><path d="M11 18h2" /></svg>
  return <svg {...c}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z" /></svg>
}

/* ---------- VOC 데이터: 예시 제거 — 실데이터(입력/붙여넣기)로만 채움 ---------- */
const VOCS = []

const EFFECTS = [
  { t: '상담 Call 감소', d: '반복 문의 자동 안내로 인입 축소' },
  { t: '1:1문의 감소', d: '셀프 확인 동선·안내문 제공' },
  { t: 'VOC 감소', d: '근본 원인 UX/개발 개선 연결' },
  { t: '협력업체 분류 비용 절감', d: '수작업 분류 → AI 자동 분류' },
  { t: '반복 업무 자동화', d: '분류·초안·정리 자동화' },
]

/* ---------- 공통 UI ---------- */
const SevBadge = ({ v }) => <span className={SEVERITY[v]}>{v}</span>
const SentBadge = ({ v }) => <span className={SENTIMENT[v]}>{v}</span>
const StatBadge = ({ v }) => <span className={STATUS[v]}>{v}</span>
const ConfBadge = ({ v }) => <span className={CONF[v]}>{v}</span>
const GroupBadge = ({ v }) => <span className={GROUP_CLS[v]}>{v}</span>
const Tag = ({ children }) => <span className="ctag">{children}</span>
const ChannelChip = ({ channel }) => <span className="chchip"><ChannelIcon channel={channel} /> {channel}</span>

/* ---------- 셸: 아이콘 레일 · 서브 LNB · 탑바 · Agent 패널 ---------- */
const RAIL_ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  mail: 'M3 6h18v12H3zM3.5 7l8.5 6 8.5-6', cal: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  org: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6', pay: 'M3 7h6l2 2h10v10H3z',
  chat: 'M4 5h16v11H9l-4 4v-4H4z', bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
}
const RailIcon = ({ d }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
function IconRail({ account, onLogout, notify }) {
  const items = [['home', '홈'], ['grid', '전체메뉴'], ['mail', '메일'], ['cal', '일정'], ['org', '조직도'], ['pay', '결재']]
  return (
    <nav className="rail">
      <div className="rail-top">
        {items.map(([k, l]) => <button key={k} className="rail-ic" title={`${l} · 데모 미구현`} onClick={() => notify.toast('이 데모에서는 Agent 화면만 동작합니다')}><RailIcon d={RAIL_ICONS[k]} /><span>{l}</span></button>)}
        <button className="rail-ic on" title="Agent"><RailIcon d={RAIL_ICONS.chat} /><span>Agent</span></button>
      </div>
      <div className="rail-bot">
        <div className="rail-ai">AI</div>
        <button className="rail-ic" title="알림 · 데모" onClick={() => notify.toast('알림 (데모)')}><RailIcon d={RAIL_ICONS.bell} /></button>
        <button className="rail-avatar" title={`${account} · 클릭하면 로그아웃`} onClick={onLogout}>{(account || 'U')[0].toUpperCase()}</button>
      </div>
    </nav>
  )
}
function SubLNB({ screen, setScreen }) {
  const items = [['dashboard', 'Dashboard'], ['inbox', 'VOC Inbox'], ['board', 'Classification Board'], ['detail', 'Case Detail & Action'], ['insight', 'Insight Report'], ['architecture', 'Architecture & Impact'], ['prompts', 'Copilot Prompt Templates']]
  return (
    <aside className="sublnb">
      <div className="slnb-brand"><span className="brand-mark">U+</span><span className="slnb-title">VOC Action <b>Copilot</b></span></div>
      <div className="slnb-sec-l">메뉴</div>
      <nav className="slnb-nav">{items.map(([k, l]) => <button key={k} className={'slnb-item' + (screen === k ? ' on' : '')} onClick={() => setScreen(k)}>{l}</button>)}</nav>
      <div className="slnb-sec-l">고정</div>
      <div className="slnb-pin">VOC 표준분류 22종<br />4그룹 게이트 분류 체계</div>
      <div className="slnb-foot">공모전 MVP · 사내 전용<br />Copilot 분류 · 사람 검수 후 처리</div>
    </aside>
  )
}
function Topbar({ title, onTogglePanel, panelOpen }) {
  return (
    <header className="topbar">
      <div className="crumb">U+ Agent<span className="crumb-sep">›</span>VOC Action Copilot<span className="crumb-sep">›</span><b>{title}</b></div>
      <div className="topbar-right">
        <span className="ai-pill">● Copilot 연결됨 (데모)</span>
        <button className="panel-tgl" onClick={onTogglePanel} title={panelOpen ? 'Agent 패널 접기' : 'Agent 패널 펼치기'}>{panelOpen ? '›' : '‹'}</button>
      </div>
    </header>
  )
}
function AgentPanel({ screen, caseId, added, notify, onClose, updateCases, selected, setSelected }) {
  const data = added || []
  const today = new Date().toISOString().slice(0, 10)
  const [done, setDone] = useState(null)
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
  const send = (el) => { const v = (el.value || '').trim(); if (!v) return; notify.toast('Copilot에 전달했습니다 (데모)'); el.value = '' }
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
      <div className="ap-head"><span className="ap-date">{today} · 선제조치 Copilot</span><button className="ap-x" onClick={onClose} title="패널 접기">›</button></div>
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
              <div key={v.id} className="ap-item">
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
      </div>
      <div className="ap-input">
        <input placeholder="고칠 내용을 말하면 뷰어에 반영해요" onKeyDown={(e) => { if (e.key === 'Enter') send(e.currentTarget) }} />
        <button className="ap-send" title="전달" onClick={(e) => send(e.currentTarget.previousSibling)}>↑</button>
      </div>
    </aside>
  )
}
const Toast = ({ msg, onClose }) => msg ? <div className="toast" onClick={onClose}>{msg}</div> : null
const Modal = ({ open, title, body, onClose }) => !open ? null : (
  <div className="modal-back" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-title">{title}</div><div className="modal-body">{body}</div><div className="modal-foot"><button className="btn btn-primary" onClick={onClose}>확인</button></div></div></div>
)

/* ---------- [1] Dashboard (실데이터 집계) ---------- */
const DONUT_COLORS = ['#e6007e', '#6938ef', '#1570ef', '#12b76a', '#f79009', '#98a2b3']
function Donut({ segments, total, centerLabel }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  const R = 52, C = 2 * Math.PI * R; let off = 0
  return (
    <svg viewBox="0 0 140 140" className="donut" role="img">
      <g transform="translate(70,70) rotate(-90)">
        <circle r={R} fill="none" stroke="var(--line-2)" strokeWidth="17" />
        {segments.map((s, i) => { const len = s.value / sum * C; const seg = <circle key={i} r={R} fill="none" stroke={s.color} strokeWidth="17" strokeLinecap="butt" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return seg })}
      </g>
      <text x="70" y="66" textAnchor="middle" className="donut-num">{total.toLocaleString()}</text>
      <text x="70" y="84" textAnchor="middle" className="donut-lbl">{centerLabel}</text>
    </svg>
  )
}
function Dashboard({ go, added, openCase, selected, setSelected }) {
  const data = added || []
  const total = data.length
  const reviewCnt = data.filter((v) => v.review).length
  const highCnt = data.filter((v) => v.severity === 'High').length
  const todoCnt = data.filter((v) => v.status === '처리 필요').length
  const autoRate = total ? Math.round(((total - reviewCnt) / total) * 100) : 0
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const stats = [
    { v: total.toLocaleString(), l: '전체 VOC', chip: '수집 누적' },
    { v: autoRate + '%', l: '자동 분류율', chip: '검토불요 기준', accent: true, cls: 'brand' },
    { v: todoCnt.toLocaleString(), l: '처리 필요', chip: `전체의 ${pct(todoCnt)}%` },
    { v: highCnt.toLocaleString(), l: 'High 리스크', chip: `전체의 ${pct(highCnt)}%`, warn: true, cls: 'up' },
    { v: reviewCnt.toLocaleString(), l: '검토 필요', chip: '사람 확인' },
  ]
  // 채널별 집계
  const chMap = {}; data.forEach((v) => { chMap[v.channel] = (chMap[v.channel] || 0) + 1 })
  const channels = Object.entries(chMap).map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n)
  // 표준분류 TOP 5
  const catMap = {}; data.forEach((v) => { catMap[v.cat] = (catMap[v.cat] || 0) + 1 })
  const top = Object.entries(catMap).map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 5)
  // 진행상황 분포
  const statusDist = KANBAN_COLS.map((k) => ({ k, n: data.filter((v) => v.status === k).length }))
  const maxStatus = Math.max(1, ...statusDist.map((s) => s.n))
  // 조치 필요(High) 리스트 — 우측 Agent의 일괄 조치가 여기 상태로 반영됨 (선택은 High 기준이라 조치 후에도 행 유지)
  const actionList = data.filter((v) => v.severity === 'High').slice(0, 10)
  // 그룹(증상 유형) 분포 — 도넛
  const grpMap = {}; data.forEach((v) => { grpMap[v.group] = (grpMap[v.group] || 0) + 1 })
  const groupSeg = GROUPS.filter((g) => grpMap[g]).map((g, i) => ({ label: g, value: grpMap[g], color: DONUT_COLORS[i % DONUT_COLORS.length] }))
  const allIds = actionList.map((v) => v.id)
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.includes(id))
  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const toggleAll = () => setSelected(allChecked ? [] : allIds)
  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">VOC Action Copilot</h1>
          <p className="page-sub">입력·붙여넣은 고객 VOC를 Copilot AI가 4그룹·22개 표준분류로 분류하고, 처리 액션과 개선 인사이트까지 연결합니다.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => go('insight')}>인사이트 보기</button>
          <button className="btn btn-primary" onClick={() => go('inbox')}>VOC 입력 시작</button>
        </div>
      </div>
      {total === 0 ? (
        <div className="panel empty-panel">아직 데이터가 없습니다. <b>VOC Inbox</b>에서 VOC를 입력하거나 엑셀을 붙여넣으면 여기에 실시간 집계됩니다.<div style={{ marginTop: '12px' }}><button className="btn btn-primary" onClick={() => go('inbox')}>VOC 입력하러 가기</button></div></div>
      ) : (
        <>
          <div className="kpi-row">{stats.map((s) => (
            <div key={s.l} className={'kpi-card' + (s.accent ? ' accent' : '') + (s.warn ? ' warn' : '')}>
              <div className="kpi-l">{s.l}</div>
              <div className="kpi-main"><span className="kpi-v">{s.v}</span>{s.chip && <span className={'kpi-chip' + (s.cls ? ' ' + s.cls : '')}>{s.chip}</span>}</div>
            </div>
          ))}</div>
          <h2 className="sec-title">분석 요약 <span className="sec-note">증상 유형 · 주요 이슈 · 진행상황</span></h2>
          <div className="chart3">
            <div className="panel chart-card">
              <div className="card-title">증상 유형 분류 <span className="muted">전체 누적</span></div>
              <div className="donut-wrap">
                <Donut segments={groupSeg} total={total} centerLabel="전체 VOC" />
                <ul className="donut-legend">{groupSeg.map((s) => <li key={s.label}><span className="lg-dot" style={{ background: s.color }} />{s.label}<b>{pct(s.value)}%</b></li>)}</ul>
              </div>
            </div>
            <div className="panel chart-card"><div className="card-title">주요 이슈 TOP 5 <span className="muted">표준분류 기준</span></div><ol className="top-list">{top.map((it, i) => <li key={it.t}><span className="rank">{i + 1}</span><span className="top-t">{it.t}</span><span className="top-n">{it.n.toLocaleString()}건</span></li>)}</ol></div>
            <div className="panel chart-card"><div className="card-title">진행상황 분포</div><div className="funnel">{statusDist.map((f) => <div key={f.k} className="fun-row"><span className="fun-k">{f.k}</span><div className="fun-bar-wrap"><div className="fun-bar" style={{ width: (f.n / maxStatus * 100) + '%' }}>{f.n.toLocaleString()}</div></div></div>)}</div></div>
          </div>
          <div className="panel">
            <div className="card-title">채널별 분포 <span className="muted">합계 {total.toLocaleString()}건</span></div>
            <div className="hbars">{channels.slice(0, 7).map((c) => (
              <div key={c.key} className="hbar-row">
                <span className="hbar-k"><ChannelIcon channel={c.key} size={15} />{c.key}</span>
                <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, c.n / channels[0].n * 100) + '%' }} /></div>
                <span className="hbar-n">{c.n.toLocaleString()}건</span>
              </div>
            ))}</div>
          </div>
          {actionList.length > 0 && (
            <>
              <h2 className="sec-title">조치 필요 VOC <span className="sec-note">High 리스크 {actionList.length}건 · 체크 후 우측 Agent에서 ‘선택 조치’, 미선택 시 ‘전체 조치’{selected.length ? ` · ${selected.length}건 선택됨` : ''}</span></h2>
              <div className="table-wrap">
                <table className="vtable">
                  <thead><tr><th className="cbx-col"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th><th>ID</th><th>고객번호</th><th>채널</th><th>표준분류</th><th>원인(요약)</th><th>주차</th><th>상태</th></tr></thead>
                  <tbody>{actionList.map((v) => (
                    <tr key={v.id} className={(v.status === '처리 완료' ? 'row-done' : '') + (selected.includes(v.id) ? ' row-sel' : '')}>
                      <td className="cbx-col" onClick={(e) => { e.stopPropagation(); toggle(v.id) }}><input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggle(v.id)} /></td>
                      <td className="mono" onClick={() => openCase && openCase(v.id)}>{v.id}</td>
                      <td className="muted nowrap" onClick={() => openCase && openCase(v.id)}>{v.customer}</td>
                      <td onClick={() => openCase && openCase(v.id)}><ChannelChip channel={v.channel} /></td>
                      <td onClick={() => openCase && openCase(v.id)}><Tag>{v.cat}</Tag></td>
                      <td className="cell-content" title={v.content} onClick={() => openCase && openCase(v.id)}>{v.summary || v.content}</td>
                      <td className="muted nowrap" onClick={() => openCase && openCase(v.id)}>{v.week || '-'}</td>
                      <td onClick={() => openCase && openCase(v.id)}><StatBadge v={v.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
          <div className="panel effect-panel">
            <div className="card-title">기대 효과</div>
            <div className="effect-row">{EFFECTS.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- [2] VOC Inbox (채널 수집 + 화면 직접 입력) ---------- */
const INPUT_CHANNELS = ['고객의소리', 'Call', 'Medallia', 'App Store', '고객센터']
function VOCInbox({ openCase, notify, added, setAdded }) {
  const [fch, setFch] = useState('전체'); const [fgrp, setFgrp] = useState('전체'); const [fst, setFst] = useState('전체')
  const [channel, setChannel] = useState('고객의소리'); const [customer, setCustomer] = useState(''); const [text, setText] = useState('')
  const [vDate, setVDate] = useState(''); const [vWeek, setVWeek] = useState(''); const [vOccur, setVOccur] = useState('')
  const [paste, setPaste] = useState('')
  const [result, setResult] = useState(null)
  const [seq, setSeq] = useState(() => added.reduce((m, v) => { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); return n > m ? n : m }, 0) + 1)
  const all = useMemo(() => [...added, ...VOCS], [added])
  const rows = all.filter((v) => (fch === '전체' || v.channel === fch) && (fgrp === '전체' || v.group === fgrp) && (fst === '전체' || v.status === fst))
  const chOpts = useMemo(() => {
    const base = ['전체', ...INPUT_CHANNELS]
    const extra = [...new Set(added.map((u) => u.channel))].filter((c) => c && !base.includes(c))
    return [...base, ...extra]
  }, [added])
  const Sel = ({ value, set, opts }) => <select className="flt" value={value} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
  const nid = (n) => `IN-${String(n).padStart(3, '0')}`
  const addVoc = () => {
    if (!text.trim()) { notify.toast('VOC 내용을 입력하세요'); return }
    const v = enrichRow({ channel, content: text.trim(), customer: customer.trim(), date: vDate.trim(), week: vWeek.trim(), occur: vOccur.trim() }, nid(seq))
    setAdded([v, ...added]); setSeq(seq + 1); setResult(v); setText(''); setCustomer('')
    notify.toast(`${v.id} 분류·추가됨 — ${v.group} · ${v.cat}`)
  }
  const addPaste = () => {
    const parsed = parsePaste(paste)
    if (!parsed.length) { notify.toast("붙여넣은 데이터에서 '내용'을 찾지 못했습니다 (헤더 행 포함 권장)"); return }
    const vs = parsed.map((row, k) => enrichRow(row, nid(seq + k)))
    setAdded([...vs, ...added]); setSeq(seq + vs.length); setResult(vs[0]); setPaste('')
    notify.toast(`${vs.length}건 분류·추가됨`)
  }
  return (
    <div className="screen">
      <div className="panel input-panel">
        <div className="ip-head">VOC 직접 입력 → Copilot 분류·추가 <span className="ip-note">인입일자·채널·고객번호·내용·주차·발생일자를 넣으면 VOC구분1/2·대응영역·요약·답변·개발대응·진행상황을 채워 목록에 추가 (데모: 키워드 기반 · 담당자 검수 후 처리)</span></div>
        <div className="input-grid">
          <label className="in-field"><span>인입일자</span><input className="in-text" placeholder="2026.03.01" value={vDate} onChange={(e) => setVDate(e.target.value)} /></label>
          <label className="in-field"><span>인입 채널</span><select className="flt" value={channel} onChange={(e) => setChannel(e.target.value)}>{INPUT_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="in-field"><span>고객번호 (선택)</span><input className="in-text" placeholder="010-1234-5678" value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
          <label className="in-field"><span>월 내 주차</span><input className="in-text" placeholder="02월4주차" value={vWeek} onChange={(e) => setVWeek(e.target.value)} /></label>
          <label className="in-field"><span>발생일자</span><input className="in-text" placeholder="2026.3.1" value={vOccur} onChange={(e) => setVOccur(e.target.value)} /></label>
        </div>
        <textarea className="input-ta" rows={3} placeholder="내용 — 예) 통화가 자주 끊기고 특정 지역에서 잘 안 터져요" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="ip-actions">
          <button className="btn btn-primary" onClick={addVoc}>Copilot 분류 후 추가</button>
          <button className="btn btn-ghost" onClick={() => { setText(''); setCustomer(''); setVDate(''); setVWeek(''); setVOccur(''); setResult(null) }}>초기화</button>
          {added.length > 0 && <button className="btn btn-ghost" onClick={() => { if (window.confirm(`저장된 입력 ${added.length.toLocaleString()}건을 모두 삭제할까요? (되돌릴 수 없습니다)`)) { setAdded([]); setResult(null) } }}>입력 항목 비우기</button>}
          {added.length > 0 && <span className="up-summary">입력 <b>{added.length}</b>건 · 표 상단에 표시됨</span>}
        </div>
        {result && (
          <div className="classify-out">
            <div className="co-row"><span className="co-k">VOC구분1</span><GroupBadge v={result.group} /><span className={'gate-pill ' + (result.mode === '정형' ? 'gate-fix' : 'gate-open')}>{result.mode}</span></div>
            <div className="co-row"><span className="co-k">표준분류</span><Tag>{result.cat}</Tag></div>
            <div className="co-row"><span className="co-k">대응 영역</span><span className="muted">{result.area1} › {result.area2}</span></div>
            <div className="co-row"><span className="co-k">요약</span><span className="muted">{result.summary}</span></div>
            <div className="co-row"><span className="co-k">진행 / 개발</span><StatBadge v={result.status} /><span className="muted">개발 대응: {result.devNeeded}</span></div>
            <div className="co-row"><span className="co-k">신뢰 / 검토</span><ConfBadge v={result.conf} />{result.review && <span className="rev-y">검토필요 Y</span>}</div>
            <p className="micro">{result.id} 추가됨 — 표/보드에서 확인하고 행을 클릭하면 답변 초안 등 상세가 열립니다. (담당자 검수 후 처리)</p>
          </div>
        )}
      </div>
      <div className="panel input-panel">
        <div className="ip-head">엑셀에서 붙여넣기 (일괄) <span className="ip-note">Excel에서 범위를 복사 → 붙여넣기. 헤더 포함이면 열 이름으로, 헤더 없이 전체 16열을 붙여넣으면 표준 컬럼 순서로 인식해 일괄 분류·추가합니다. 전화·이름은 마스킹됩니다.</span></div>
        <textarea className="input-ta" rows={4} placeholder={'인입일자\t인입 채널\t고객번호orCTNor기기\t...\t내용\t...\t월 내 주차\t발생일자\n2026.03.01\t고객의소리\t010-...\t...\t통화가 자주 끊겨요\t...\t02월4주차\t2026.3.1'} value={paste} onChange={(e) => setPaste(e.target.value)} />
        <div className="ip-actions">
          <button className="btn btn-primary" onClick={addPaste}>붙여넣기 분류·추가</button>
          <button className="btn btn-ghost" onClick={() => setPaste('')}>지우기</button>
        </div>
      </div>
      <div className="filters">
        <Sel value={fch} set={setFch} opts={chOpts} />
        <Sel value={fgrp} set={setFgrp} opts={['전체', ...GROUPS]} />
        <Sel value={fst} set={setFst} opts={['전체', ...KANBAN_COLS]} />
        <span className="flt-count">{rows.length.toLocaleString()}건{added.length > 0 && <span className="muted"> (입력 {added.length.toLocaleString()})</span>}</span>
      </div>
      {rows.length > 100 && <div className="list-note">전체 {rows.length.toLocaleString()}건 중 상위 100건만 표시합니다 — 채널·구분·상태 필터로 좁혀 보세요. 행을 클릭하면 내용·심각도·상태·검토·담당 등 상세가 열립니다. (집계·대시보드는 전체 기준)</div>}
      <div className="table-wrap">
        <table className="vtable">
          <thead><tr><th>ID</th><th>인입일자</th><th>채널</th><th>고객번호</th><th>VOC구분1</th><th>표준분류</th><th>대응영역</th><th>요약</th><th>주차</th><th>발생일자</th></tr></thead>
          <tbody>{rows.slice(0, 100).map((v) => (
            <tr key={v.id} className={v.source === 'input' ? 'row-up' : ''} onClick={() => openCase(v.id)}>
              <td className="mono">{v.id}{v.source === 'input' && <span className="src-pill">입력</span>}</td>
              <td className="muted nowrap">{v.date || '-'}</td>
              <td><ChannelChip channel={v.channel} /></td>
              <td className="muted nowrap">{v.customer}</td>
              <td><GroupBadge v={v.group} /></td><td><Tag>{v.cat}</Tag></td>
              <td className="muted nowrap">{[v.area1, v.area2].filter(Boolean).join(' › ') || '-'}</td>
              <td className="cell-content" title={v.content}>{v.summary || v.content}</td>
              <td className="muted nowrap">{v.week || '-'}</td><td className="muted nowrap">{v.occur || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- [3] Classification Board ---------- */
function ClassificationBoard({ openCase, notify, added, updateCases }) {
  const all = useMemo(() => [...(added || []), ...VOCS], [added])
  const [dragCol, setDragCol] = useState(null)
  const [dragId, setDragId] = useState(null)
  return (
    <div className="screen">
      <div className="board-top">
        <div className="gate-legend">
          {GROUPS.map((g) => <span key={g} className={GROUP_CLS[g] + ' gate-chip'}>{g}<em>{GROUP_MODE[g]}</em></span>)}
        </div>
        <button className="btn btn-primary" onClick={() => notify.modal('Copilot AI로 분류', '실제 적용 시 Copilot AI가 최신 수집 VOC를 4개 그룹·22개 표준분류 기준으로 분류합니다. 정형 그룹(장애/오류·성능·개선요청)은 닫힌 분류로 매핑하고, 열림 그룹은 22개로 추론합니다.')}>Copilot AI로 분류</button>
      </div>
      <div className="panel">
        <div className="block-label">열림 그룹 표준분류 22</div>
        <div className="cat22">{CAT22.map((c, i) => <span key={c} className="cat22-item"><b>{i + 1}</b>{c}</span>)}</div>
        <div className="block-label" style={{ marginTop: '10px' }}>정형 그룹(닫힌 분류 · AI 재판단 불필요)</div>
        <div className="fixed-list">{Object.entries(FIXED_DEPTH2).map(([g, arr]) => <div key={g} className="fx-row"><GroupBadge v={g} /><span className="muted">{arr.join(' · ')}</span></div>)}</div>
      </div>
      <div className="board-hint">💡 카드를 드래그해 다른 상태 열로 옮기면 진행상황이 바로 변경됩니다 (저장됨)</div>
      <div className="kanban">
        {KANBAN_COLS.map((col) => {
          const items = all.filter((v) => v.status === col)
          return (
            <div key={col} className={'kcol' + (dragCol === col ? ' kcol-over' : '')}
              onDragOver={(e) => { e.preventDefault(); if (dragCol !== col) setDragCol(col) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragCol((c) => c === col ? null : c) }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { updateCases([id], { status: col }); notify.toast(`${id} → ${col} (저장됨)`) } setDragCol(null); setDragId(null) }}>
              <div className="kcol-head"><span>{col}</span><span className="kcount">{items.length}</span></div>
              <div className="kcol-body">
                {items.map((v) => (
                  <div key={v.id} className={'kcard' + (dragId === v.id ? ' kcard-drag' : '')} draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.id); e.dataTransfer.effectAllowed = 'move'; setDragId(v.id) }}
                    onDragEnd={() => { setDragCol(null); setDragId(null) }}
                    onClick={() => openCase(v.id)}>
                    <div className="kcard-top"><ChannelChip channel={v.channel} /><SevBadge v={v.severity} /></div>
                    <div className="kcard-content">{v.content}</div>
                    <div className="kcard-foot"><GroupBadge v={v.group} /></div>
                    <div className="kcard-foot"><Tag>{v.cat}</Tag><span className="muted">{v.action}</span></div>
                  </div>
                ))}
                {items.length === 0 && <div className="kempty">{dragCol === col ? '여기로 이동' : '없음'}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- [4] Case Detail ---------- */
function CaseDetail({ caseId, notify, added }) {
  const [showNum, setShowNum] = useState(false)
  const all = [...(added || []), ...VOCS]
  const c = all.find((v) => v.id === caseId) || all[0]
  const copy = (t, l) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast(l + ' 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  if (!c) return <div className="screen"><div className="panel empty-panel">표시할 케이스가 없습니다. VOC Inbox에서 VOC를 입력하거나 엑셀을 붙여넣어 추가하세요.</div></div>
  const canReveal = c.customerRaw && c.customerRaw !== c.customer
  return (
    <div className="screen">
      <div className="case-grid">
        <div className="case-main">
          <div className="panel">
            <div className="case-top"><h2 className="case-id">{c.id}{c.source === 'input' && <span className="src-pill">입력</span>}</h2><div className="case-area"><GroupBadge v={c.group} /> <Tag>{c.cat}</Tag>{c.review && <span className="rev-y">검토필요</span>}</div></div>
            <div className="block-label" style={{ marginTop: '12px' }}>인입 정보</div>
            <div className="kv">
              <div className="kv-i"><span className="kv-k">인입일자</span><span className="kv-v">{c.date || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">인입 채널</span><span className="kv-v"><ChannelChip channel={c.channel} /></span></div>
              <div className="kv-i"><span className="kv-k">고객번호</span><span className="kv-v">{showNum && canReveal ? c.customerRaw : c.customer}{canReveal && <button className="num-btn" onClick={() => setShowNum(!showNum)}>{showNum ? '가리기' : '번호 보기'}</button>}</span></div>
              <div className="kv-i"><span className="kv-k">월 내 주차</span><span className="kv-v">{c.week || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">발생일자</span><span className="kv-v">{c.occur || '-'}</span></div>
            </div>
            <div className="block-label" style={{ marginTop: '12px' }}>분류 · 처리 정보</div>
            <div className="kv">
              <div className="kv-i"><span className="kv-k">VOC구분1</span><span className="kv-v"><GroupBadge v={c.group} /></span></div>
              <div className="kv-i"><span className="kv-k">표준분류(구분2)</span><span className="kv-v"><Tag>{c.cat}</Tag></span></div>
              <div className="kv-i"><span className="kv-k">대응 영역</span><span className="kv-v">{[c.area1, c.area2].filter(Boolean).join(' › ') || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">심각도</span><span className="kv-v"><SevBadge v={c.severity} /></span></div>
              <div className="kv-i"><span className="kv-k">감성</span><span className="kv-v"><SentBadge v={c.sentiment} /></span></div>
              <div className="kv-i"><span className="kv-k">신뢰도</span><span className="kv-v"><ConfBadge v={c.conf} /></span></div>
              <div className="kv-i"><span className="kv-k">검토필요</span><span className="kv-v">{c.review ? <span className="rev-y">Y</span> : 'N'}</span></div>
              <div className="kv-i"><span className="kv-k">진행상황</span><span className="kv-v"><StatBadge v={c.status} /></span></div>
              <div className="kv-i"><span className="kv-k">담당</span><span className="kv-v">{c.org}</span></div>
              <div className="kv-i"><span className="kv-k">개발 대응</span><span className="kv-v">{c.devNeeded || '-'}</span></div>
            </div>
            {c.summary && <div className="block" style={{ marginTop: '12px' }}><div className="block-label">AI 요약 초안</div><p className="voc-raw">{c.summary}</p></div>}
            <div className="block"><div className="block-label">VOC 원문(내용)</div><p className="voc-raw">{c.content}</p></div>
          </div>
          <div className="panel ai-panel"><div className="ai-head">Copilot AI 분석 <span className="ai-tag">초안 · 담당자 검수 필요</span></div><ul className="ai-list">{c.analysis.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
          {c.sms && <div className="panel"><div className="block-label">고객 문자/푸시 초안</div><div className="draft">{c.sms}</div><button className="btn btn-ghost sm" onClick={() => copy(c.sms, '문자 초안')}>문자 초안 복사</button></div>}
          {c.mail && <div className="panel"><div className="block-label">담당자 메일 초안</div><div className="draft"><div className="mail-line"><b>수신</b> {c.mail.to}</div><div className="mail-line"><b>제목</b> {c.mail.subject}</div><div className="mail-body">{c.mail.body}</div></div><button className="btn btn-ghost sm" onClick={() => copy(`수신: ${c.mail.to}\n제목: ${c.mail.subject}\n\n${c.mail.body}`, '메일 초안')}>메일 초안 복사</button></div>}
          <div className="panel"><div className="block-label">UX/개발 개선 요청</div><div className="impv"><div><span className="impv-k">문제</span>{c.improvement.problem}</div><div><span className="impv-k">제안</span>{c.improvement.suggestion}</div><div><span className="impv-k">기대효과</span>{c.improvement.effect}</div></div></div>
        </div>
        <div className="case-side">
          <div className="panel"><div className="block-label">추천 액션</div><div className="action-list"><div className="action-item">1. 고객 문자/푸시 안내</div><div className="action-item">2. 담당자 메일 전달</div><div className="action-item">3. UX/개발 개선 검토</div></div></div>
          <div className="panel"><div className="block-label">실행</div><div className="btn-col"><button className="btn btn-primary" onClick={() => notify.modal('개선 요청 등록', '실제 적용 시 사내 업무시스템(Jira 등)에 개선 요청이 등록됩니다. 본 MVP에서는 데모로 표시됩니다.')}>개선 요청 등록</button><button className="btn btn-ghost" onClick={() => notify.toast('처리 완료로 표시됨 (데모)')}>처리 완료 표시</button><button className="btn btn-ghost" onClick={() => notify.modal('발송 안내', '실제 적용 시 사내 문자/메일/업무시스템과 연동됩니다. 본 MVP에서는 실제 발송하지 않습니다.')}>고객 발송</button></div><p className="micro">최종 확정·발송·개발 반영은 담당자 검수 후 진행됩니다.</p></div>
        </div>
      </div>
    </div>
  )
}

/* ---------- [5] Insight Report (실데이터 집계) ---------- */
function InsightReport({ added }) {
  const data = added || []
  const dist = useMemo(() => {
    const m = {}; data.forEach((v) => { m[v.cat] = (m[v.cat] || 0) + 1 })
    const arr = Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
    const tot = data.length || 1; return arr.map((a) => ({ ...a, pct: Math.round((a.n / tot) * 100) }))
  }, [data])
  const groupSplit = useMemo(() => GROUPS.map((g) => ({ g, n: data.filter((v) => v.group === g).length })), [data])
  const maxPct = dist[0] ? dist[0].pct : 100
  const highList = data.filter((v) => v.severity === 'High')
  // 데이터 기반 자동 인사이트: 빈도 상위 분류 + 개발 대응 필요 건
  const devCnt = data.filter((v) => v.devNeeded === 'Y').length
  const insights = []
  if (dist[0]) insights.push(`가장 많은 유형은 '${dist[0].k}' (${dist[0].n}건, ${dist[0].pct}%) — 우선 대응 검토`)
  if (highList.length) insights.push(`High 리스크 ${highList.length}건 — 즉시 처리 우선순위`)
  if (devCnt) insights.push(`개발 대응 필요 ${devCnt}건 — 개발/UX 개선 과제로 연계`)
  const reviewN = data.filter((v) => v.review).length
  if (reviewN) insights.push(`검토필요 ${reviewN}건 — 담당자 분류 확인 필요`)
  if (data.length === 0) {
    return <div className="screen"><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC Inbox</b>에서 VOC를 입력하거나 엑셀을 붙여넣으면 분포·인사이트가 생성됩니다.</div></div>
  }
  return (
    <div className="screen">
      <div className="two-col">
        <div className="panel"><h2 className="sec-title">표준분류 분포 <span className="sec-note">전체 {data.length}건</span></h2><div className="dist">{dist.map((d) => <div key={d.k} className="dist-row"><span className="dist-k">{d.k}</span><div className="dist-bar-wrap"><div className="dist-bar" style={{ width: (d.pct / maxPct * 100) + '%' }} /></div><span className="dist-v">{d.pct}%</span></div>)}</div></div>
        <div className="panel"><h2 className="sec-title">VOC구분1(그룹) 분포</h2><div className="dist">{groupSplit.map((g) => <div key={g.g} className="dist-row"><span className="dist-k2"><GroupBadge v={g.g} /></span><div className="dist-bar-wrap"><div className="dist-bar" style={{ width: (g.n / (data.length || 1) * 100) + '%' }} /></div><span className="dist-v">{g.n}건</span></div>)}</div></div>
      </div>
      <div className="panel"><h2 className="sec-title">High 리스크 이슈</h2><ul className="risk-list">{highList.length ? highList.map((v) => <li key={v.id}><SevBadge v={v.severity} /> <span className="mono">{v.id}</span> {v.content}</li>) : <li className="muted">High 리스크 건이 없습니다.</li>}</ul></div>
      <h2 className="sec-title">자동 제안 인사이트</h2>
      <div className="card-row">{insights.map((t, i) => <div key={i} className="insight-card"><span className="insight-num">{i + 1}</span>{t}</div>)}</div>
      <h2 className="sec-title">기대효과</h2>
      <div className="effect-row">{EFFECTS.map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>
    </div>
  )
}

/* ---------- [6] Prompt Templates ---------- */
function PromptTemplates({ notify }) {
  const prompts = [
    { t: 'VOC 분류 프롬프트 (4그룹·22개)', p: '목적: VOC 자동 분류', body: '아래 VOC를 분류해줘.\n먼저 VOC구분1을 [장애/오류 · 성능 · 개선 요청/희망 · 단순 문의/불만/기타] 중 하나로 정하고,\n장애/오류·성능·개선 요청/희망이면 각 그룹의 닫힌 분류값으로,\n단순 문의/불만/기타이면 표준분류 22개 중 하나로 분류해줘.\n목록 밖 새 분류명은 만들지 말고, 모호하면 "기타 + 검토필요"로 표시해줘.' },
    { t: '고객 문자/푸시 생성 프롬프트', p: '목적: 고객 안내 초안', body: '아래 VOC에 대해 고객에게 보낼 문자/푸시 안내 초안을 작성해줘.\n사실 확인된 내용만, 오해를 푸는 데 집중해 정중·간결하게. 개인정보는 포함하지 마.' },
    { t: '담당자 메일 생성 프롬프트', p: '목적: 담당 조직 공유', body: '아래 High 심각도 VOC를 담당 조직에 공유할 메일 초안을 작성해줘.\n수신 조직·제목·VOC 요약·고객 혼선 포인트·개선 필요 화면·요청 액션 포함.' },
    { t: 'UX/개발 개선 요청 생성 프롬프트', p: '목적: 개선 과제화', body: '아래 VOC를 UX/개발 개선 요청으로 정리해줘.\n문제·제안·기대효과 형식, 반복 발생 가능성과 영향 범위 표기.' },
    { t: '인사이트 리포트 생성 프롬프트', p: '목적: 경영 보고용 요약', body: '분류된 VOC 전체로 표준분류 분포·High 리스크·개선 우선순위·기대효과를 요약해줘. 수치는 표/비율로.' },
  ]
  const copy = (t) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast('프롬프트 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  return (
    <div className="screen">
      <p className="lead">현업자가 Copilot AI로 VOC 분류·액션 생성을 재현할 수 있는 프롬프트입니다.</p>
      <div className="prompt-grid">{prompts.map((pr) => <div key={pr.t} className="prompt-card"><div className="pc-title">{pr.t}</div><div className="pc-purpose">{pr.p}</div><pre className="pc-body">{pr.body}</pre><div className="pc-actions"><button className="btn btn-ghost sm" onClick={() => copy(pr.body)}>복사</button><button className="btn btn-primary sm" onClick={() => notify.modal('Copilot에서 실행', '실제 적용 시 사내 Copilot 또는 Copilot Studio Agent로 연결됩니다.')}>Copilot에서 실행</button></div></div>)}</div>
    </div>
  )
}

/* ---------- [Arch] Architecture (패턴 설계) ---------- */
function Architecture() {
  const PIPE = [
    { k: '수집', d: '멀티채널 VOC 인입', pat: '팬아웃/팬인' },
    { k: 'Copilot 분류', d: '게이트 → 4그룹·22개', pat: '전문가 풀' },
    { k: '검수', d: '신뢰도·검토필요 → 사람 확인', pat: '생성-검증' },
    { k: '액션', d: '문자/메일/개선요청', pat: '파이프라인' },
    { k: '모니터링', d: '처리율·인사이트', pat: '파이프라인' },
  ]
  const PATTERNS = [
    { name: '파이프라인', cls: 'pat-pipe', desc: '순차적으로 의존하는 작업', where: '수집 → 분류 → 검수 → 액션 → 모니터링 전체 흐름', used: true },
    { name: '전문가 풀', cls: 'pat-pool', desc: '상황별 적합한 처리기를 선택 호출', where: '게이트: VOC구분1 보고 정형(크로스워크) vs 열림(22개 분류) 선택', used: true },
    { name: '생성-검증', cls: 'pat-gv', desc: '생성 후 품질 검수', where: 'Copilot이 분류·초안 생성 → 신뢰도/검토필요 플래그 → 사람 검수 (AI 자동확정 안 함)', used: true },
    { name: '팬아웃/팬인', cls: 'pat-fan', desc: '병렬로 독립 작업 후 통합', where: 'Call·메달리아·앱스토어·고객센터를 각각 분류 → 하나의 대시보드로 통합', used: true },
    { name: '감독자', cls: 'pat-sup', desc: '중앙 에이전트가 동적 분배', where: '현재 규모(일 수십 건·사람 검수 중심)엔 과도 → 미적용', used: false },
    { name: '계층적 위임', cls: 'pat-hier', desc: '상위 → 하위 재귀적 위임', where: '대규모 자동 처리용 → 향후 고도화 시 검토', used: false },
  ]
  return (
    <div className="screen">
      <div className="panel arch-intro">
        <div className="ai-head">설계 원칙 — 패턴으로 설계한 VOC 파이프라인</div>
        <p className="lead">단순 자동화가 아니라, 작업 특성에 맞는 아키텍처 패턴을 의도적으로 골라 조합했습니다. 핵심은 <b>전문가 풀(게이트)</b>과 <b>생성-검증(사람 검수)</b>입니다.</p>
      </div>

      <h2 className="sec-title">파이프라인 흐름 + 적용 패턴</h2>
      <div className="arch-flow">
        {PIPE.map((p, i) => (
          <React.Fragment key={p.k}>
            <div className="arch-node">
              <div className="arch-k">{p.k}</div>
              <div className="arch-d">{p.d}</div>
              <span className="arch-pat">{p.pat}</span>
            </div>
            {i < PIPE.length - 1 && <span className="flow-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>

      <h2 className="sec-title">아키텍처 패턴 매핑</h2>
      <div className="pat-grid">
        {PATTERNS.map((p) => (
          <div key={p.name} className={'pat-card ' + p.cls + (p.used ? '' : ' pat-off')}>
            <div className="pat-head"><span className="pat-name">{p.name}</span><span className={'pat-flag ' + (p.used ? 'on' : 'off')}>{p.used ? '적용' : '미적용'}</span></div>
            <div className="pat-desc">{p.desc}</div>
            <div className="pat-where">{p.where}</div>
          </div>
        ))}
      </div>

      <h2 className="sec-title">Before / After</h2>
      <div className="ba-grid">
        <div className="panel ba-before"><div className="ba-tag">Before</div><ul className="ba-list">{['협력업체 또는 사람이 VOC를 수작업 분류', '채널별로 흩어진 VOC를 수작업 취합', '상담사가 고객에게 다시 연락', '중요 이슈는 담당자가 별도로 판단', 'UX/개발 개선 과제 연결이 늦음', '상담 Call과 1:1문의가 반복 발생'].map((b, i) => <li key={i}>{b}</li>)}</ul></div>
        <div className="panel ba-after"><div className="ba-tag after">After</div><ul className="ba-list">{['수집된 VOC를 Copilot AI가 4그룹·22개 표준분류로 자동 분류', '대시보드에서 유형/심각도/담당조직/처리방식 확인', 'Call 유입 케이스는 문자/푸시 초안 생성', '중요 이슈는 담당자 메일 초안 생성', 'UX/개발 개선 필요 케이스는 개선 요청으로 정리', '분류-처리-결과까지 한 화면에서 관리'].map((a, i) => <li key={i}>{a}</li>)}</ul></div>
      </div>

      <h2 className="sec-title">연동 구조</h2>
      <div className="flow">{['Call / Medallia / App Store / 고객센터', 'VOC 자동 수집·연동', 'Copilot AI 분류 (4그룹·22개)', 'VOC Action Dashboard', '문자/푸시 · 담당자 메일 · UX/개발 개선', '결과 모니터링'].map((f, i) => <React.Fragment key={i}><div className="flow-node">{f}</div>{i < 5 && <span className="flow-arrow">→</span>}</React.Fragment>)}</div>

      <h2 className="sec-title">기대효과</h2>
      <div className="effect-row">{[...EFFECTS, { t: '디지털 채널 고객불편 감소', d: '근본 원인 개선으로 재발 방지' }].map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>

      <div className="note-box"><b>왜 이렇게 설계했나 · 고도화 안내</b> — 게이트(전문가 풀)로 정형/열림을 나눠 AI는 꼭 필요한 곳에만 쓰고, 생성-검증으로 사람이 마지막을 책임집니다. 감독자·계층적 위임은 지금 규모엔 과해 의도적으로 뺐고, 처리량이 커지면 도입합니다. 현재 MVP는 샘플 데이터 기반이며, 향후 상담어드바이스·메달리아·앱스토어·고객센터 연동, 문자/메일 발송(담당자 검수 후), Jira 티켓 생성(고도화 단계 선택 적용)이 가능합니다.</div>
    </div>
  )
}

/* ---------- 로그인 / 가입 게이트 ---------- */
function Login({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [code, setCode] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => {
    setErr('')
    const e = email.trim().toLowerCase()
    if (!e || !pw) { setErr('이메일과 비밀번호를 입력하세요'); return }
    setBusy(true)
    try {
      const accounts = loadAccounts()
      if (mode === 'signup') {
        if (!isCompanyEmail(e)) { setErr(`회사 이메일(@${COMPANY_DOMAINS.join(', @')})만 가입할 수 있습니다`); return }
        if (code.trim() !== COMPANY_CODE) { setErr('사내 인증 코드가 올바르지 않습니다'); return }
        if (pw.length < 6) { setErr('비밀번호는 6자 이상으로 설정하세요'); return }
        if (accounts.some((a) => a.email === e)) { setErr('이미 가입된 이메일입니다. 로그인하세요.'); return }
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36)
        accounts.push({ email: e, salt, hash: await hashPw(pw, salt) })
        saveAccounts(accounts); setSession(e); onAuthed(e)
      } else {
        const acc = accounts.find((a) => a.email === e)
        if (!acc) { setErr('가입된 계정이 없습니다. 먼저 가입하세요.'); return }
        if (await hashPw(pw, acc.salt) !== acc.hash) { setErr('비밀번호가 일치하지 않습니다'); return }
        setSession(e); onAuthed(e)
      }
    } catch { setErr('처리 중 오류가 발생했습니다 (보안 컨텍스트: https 또는 localhost 필요)') }
    finally { setBusy(false) }
  }
  const onKey = (ev) => { if (ev.key === 'Enter') submit() }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">U+</span><span className="brand-name">VOC Action <b>Copilot</b></span></div>
        <p className="auth-sub">사내 전용 — {mode === 'login' ? '로그인 후 이용하세요.' : '회사 이메일과 사내 인증 코드로 가입하세요.'}</p>
        <div className="auth-tabs">
          <button className={'auth-tab' + (mode === 'login' ? ' on' : '')} onClick={() => { setMode('login'); setErr('') }}>로그인</button>
          <button className={'auth-tab' + (mode === 'signup' ? ' on' : '')} onClick={() => { setMode('signup'); setErr('') }}>가입</button>
        </div>
        <label className="auth-field"><span>회사 이메일</span><input className="in-text" type="email" autoComplete="username" placeholder={`name@${COMPANY_DOMAINS[0]}`} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} /></label>
        <label className="auth-field"><span>비밀번호</span><input className="in-text" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'signup' ? '6자 이상' : ''} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={onKey} /></label>
        {mode === 'signup' && <label className="auth-field"><span>사내 인증 코드</span><input className="in-text" placeholder="회사에서 공유받은 코드" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey} /></label>}
        {err && <div className="auth-err">{err}</div>}
        <button className="btn btn-primary auth-submit" disabled={busy} onClick={submit}>{busy ? '처리 중…' : (mode === 'login' ? '로그인' : '가입하고 시작')}</button>
        <p className="auth-note">⚠ 시연용 접근 게이트입니다. 실제 사내 전용 운영에는 사내 SSO 연동 또는 사내망 한정 배포가 필요합니다.</p>
      </div>
    </div>
  )
}

/* ---------- App ---------- */
const TITLES = {
  dashboard: ['Dashboard', 'VOC 운영 현황과 AI 분류 효과'],
  architecture: ['Architecture & Impact', '패턴 설계 · Before/After · 기대효과'],
  inbox: ['VOC Inbox', '수집 VOC 목록 · 직접 입력 분류'],
  board: ['Classification Board', '4그룹 게이트 + 22개 표준분류'],
  detail: ['Case Detail & Action', '케이스 분석 및 액션'],
  insight: ['Insight Report', '개선 인사이트와 기대효과'],
  prompts: ['Copilot Prompt Templates', 'VOC 분류·액션 재현 프롬프트'],
}

export default function App() {
  const [authEmail, setAuthEmail] = useState(getSession)
  const [screen, setScreen] = useState('dashboard')
  const [caseId, setCaseId] = useState('VOC-1001')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState({ open: false, title: '', body: '' })
  const [panelOpen, setPanelOpen] = useState(true)
  const [selected, setSelected] = useState([]) // 체크박스로 선택한 케이스 id (대시보드 ↔ Agent 패널 공유)
  const [added, setAdded] = useState(loadAdded) // 입력/붙여넣은 VOC — localStorage에 저장되어 재접속 시 복원됨
  useEffect(() => {
    const ok = saveAdded(added)
    if (!ok && added.length) setToast('브라우저 저장 한도를 초과해 일부가 저장되지 않았을 수 있습니다')
  }, [added])
  const notify = useMemo(() => ({
    toast: (m) => { setToast(m); window.clearTimeout(window.__t); window.__t = window.setTimeout(() => setToast(''), 2200) },
    modal: (title, body) => setModal({ open: true, title, body }),
  }), [])
  const openCase = (id) => { setCaseId(id); setScreen('detail'); setPanelOpen(true) }
  const updateCases = (ids, patch) => setAdded((prev) => prev.map((v) => ids.includes(v.id) ? { ...v, ...patch } : v))
  const [t] = TITLES[screen]
  if (!authEmail) return <Login onAuthed={setAuthEmail} />
  return (
    <div className="app">
      <IconRail account={authEmail} onLogout={() => { setSession(''); setAuthEmail('') }} notify={notify} />
      <SubLNB screen={screen} setScreen={setScreen} />
      <div className="main">
        <Topbar title={t} onTogglePanel={() => setPanelOpen((o) => !o)} panelOpen={panelOpen} />
        <div className="content">
          {screen === 'dashboard' && <Dashboard go={setScreen} added={added} openCase={openCase} selected={selected} setSelected={setSelected} />}
          {screen === 'architecture' && <Architecture />}
          {screen === 'inbox' && <VOCInbox openCase={openCase} notify={notify} added={added} setAdded={setAdded} />}
          {screen === 'board' && <ClassificationBoard openCase={openCase} notify={notify} added={added} updateCases={updateCases} />}
          {screen === 'detail' && <CaseDetail caseId={caseId} notify={notify} added={added} />}
          {screen === 'insight' && <InsightReport added={added} />}
          {screen === 'prompts' && <PromptTemplates notify={notify} />}
        </div>
      </div>
      {panelOpen && <AgentPanel screen={screen} caseId={caseId} added={added} notify={notify} onClose={() => setPanelOpen(false)} updateCases={updateCases} selected={selected} setSelected={setSelected} />}
      <Toast msg={toast} onClose={() => setToast('')} />
      <Modal open={modal.open} title={modal.title} body={modal.body} onClose={() => setModal({ open: false, title: '', body: '' })} />
    </div>
  )
}
