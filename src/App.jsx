import React, { useState, useMemo, useEffect, useRef } from 'react'
import { sharedEnabled, listAll, listSince, insertMany, clearAll } from './shared.js'

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
  '장애/오류': ['로그인불가/로그인풀림', '앱/웹 기능오류', '앱/웹 접속불가', '앱/웹화면 데이터 정합성 이슈', '기타'],
  '성능': ['앱/웹 속도 느림', '앱/웹 백화 현상'],
  '개선 요청/희망': ['앱/웹 기능 개선', '회원/로그인 개선', '기타'],
}
/* 대응영역 트리 (엑셀 '오류VOC인입영역' 기준) — 1depth → 2depth */
const AREA_TREE = {
  'MY': ['가입정보관리', '요금/납부/청구', '회원/로그인/ID', '휴대폰 결제', '데이터', '고객지원', '자녀 통신요금 관리', '메뉴/GNB/위젯', '결합할인'],
  '검색/챗봇': ['검색/챗봇'],
  '혜택/멤버십': ['VIP콕(영화/구독/제휴)', '바코드/메뉴', '유플미션/출석체크', '멤버십(등급/정책)', '유플투쁠'],
  '상품/스토어': ['기타(유독)', '로밍', '모바일 가입', '유심/이심(eSIM)/너겟', '모바일 요금제', '모바일 부가서비스', '홈 요금제/홈 부가서비스', '액세서리/라이브'],
}
const AREA1_LIST = Object.keys(AREA_TREE)
/* 영역별 담당자 매핑 (임시 예시 — 김형걸 담당자 표 입수 시 교체) */
const OWNER_BY_AREA = {
  'MY': '김민수 · MY서비스팀',
  '검색/챗봇': '이서연 · AI검색팀',
  '혜택/멤버십': '박지훈 · 멤버십팀',
  '상품/스토어': '최유진 · 커머스팀',
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
  if (group === '개선 요청/희망') {
    if (/로그인|회원|아이디|비밀번호|인증|가입/.test(v)) return '회원/로그인 개선'
    if (/개선|추가|바꿔|바뀌|좋겠|불편|제안|했으면/.test(v)) return '앱/웹 기능 개선'
    return '기타'
  }
  return '앱/웹 기능 개선'
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
/* 표준분류/정형분류 → 대응 영역(1 넓은 / 2 세부). 사내 라우팅 taxonomy (영역 트리 기준). */
const AREA_BY_CAT = {
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
function catToArea(group, cat) {
  return AREA_BY_CAT[cat] || ['MY', '메뉴/GNB/위젯']
}
function ownerForArea(area1) { return OWNER_BY_AREA[area1] || '미지정' }
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
    area1, area2, devNeeded: dev, owner: ownerForArea(area1), jiraUrl: '', ownerNote: '',
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
// 압축 레코드 → 보강 레코드 (localStorage·seed.json 공통)
function hydrate(recs) {
  if (!Array.isArray(recs)) return []
  return recs.map((r) => {
    const e = enrichRow({ channel: r.c, content: r.t, customer: r.n, date: r.d, week: r.w, occur: r.o }, r.id)
    return { ...e, status: r.s || e.status, owner: r.ow || e.owner, jiraUrl: r.j || '', ownerNote: r.on || '' }
  })
}
// 보강 레코드 → 압축 레코드 (저장·내보내기 공통)
function toCompact(arr) {
  return (arr || []).map((v) => ({ id: v.id, c: v.channel, t: v.content, n: v.customerRaw || '', d: v.date || '', w: v.week || '', o: v.occur || '', s: v.status, ow: v.owner, j: v.jiraUrl || '', on: v.ownerNote || '' }))
}
function loadAdded() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)
    if (!raw) return []
    return hydrate(JSON.parse(raw))
  } catch { return [] }
}
function saveAdded(arr) {
  try {
    if (typeof localStorage === 'undefined') return true
    if (!arr.length) { localStorage.removeItem(LS_KEY); return true }
    localStorage.setItem(LS_KEY, JSON.stringify(toCompact(arr)))
    return true
  } catch { return false } // 저장 한도 초과 등
}
const LS_SENT = 'voc-action-copilot:sent:v1'
function loadSent() { try { return JSON.parse(localStorage.getItem(LS_SENT) || '[]') } catch { return [] } }
function saveSent(l) { try { localStorage.setItem(LS_SENT, JSON.stringify((l || []).slice(0, 500))) } catch { } }

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
function IconRail({ account, onLogout, notify, railView, setRail }) {
  const items = [['home', '홈'], ['grid', '전체메뉴'], ['mail', '메일'], ['cal', '일정'], ['org', '조직도'], ['pay', '결재']]
  return (
    <nav className="rail">
      <div className="rail-top">
        {items.map(([k, l]) => <button key={k} className={'rail-ic' + (railView === k ? ' on' : '')} title={l} onClick={() => setRail(k)}><RailIcon d={RAIL_ICONS[k]} /><span>{l}</span></button>)}
        <button className={'rail-ic' + (railView === 'agent' ? ' on' : '')} title="VOC Agent" onClick={() => setRail('agent')}><RailIcon d={RAIL_ICONS.chat} /><span>Agent</span></button>
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
  const SECTIONS = [
    { label: '현황 · 분석', items: [['trends', '기간별·영역별 추이']] },
    { label: '수집 · 자동분류', items: [['inbox', 'VOC 수집·입력'], ['board', '분류 보드']] },
    { label: '처리 · 개선', items: [['detail', '케이스 처리'], ['backlog', '개선 백로그'], ['insight', '인사이트 리포트']] },
    { label: '셀프 해결 · 엔진②', items: [['selfguide', '셀프 해결 가이드']] },
  ]
  return (
    <aside className="sublnb">
      <div className="slnb-brand"><span className="brand-mark">U+</span><span className="slnb-title">VOC Action <b>Copilot</b></span></div>
      {SECTIONS.map((sec) => (
        <React.Fragment key={sec.label}>
          <div className="slnb-sec-l">{sec.label}</div>
          <nav className="slnb-nav">{sec.items.map(([k, l]) => <button key={k} className={'slnb-item' + (screen === k ? ' on' : '')} onClick={() => setScreen(k)}>{l}</button>)}</nav>
        </React.Fragment>
      ))}
      <div className="slnb-sec-l">분류 체계</div>
      <div className="slnb-pin">4그룹 게이트 + 표준분류 22종<br />Copilot 분류 · 사람 검수 후 처리</div>
      <div className="slnb-foot">공모전 MVP · 사내 전용</div>
    </aside>
  )
}
function ShareBadge({ state }) {
  if (!state || state === 'local') return null
  const map = { connecting: ['● 공유 연결 중…', 'sb-wait'], online: ['● 공유 저장소 연결됨', 'sb-on'], error: ['● 공유 연결 오류', 'sb-err'] }
  const [label, cls] = map[state] || map.connecting
  return <span className={'share-badge ' + cls}>{label}</span>
}
function Topbar({ title, mode, setMode, agentTitle, shareState }) {
  return (
    <header className="topbar">
      {mode !== 'expanded' && (
        <div className="tb-main">
          <div className="crumb">U+ Agent<span className="crumb-sep">›</span>VOC Action Copilot<span className="crumb-sep">›</span><b>{title}</b></div>
          <div className="tb-main-right">
            <ShareBadge state={shareState} />
            <span className="ai-pill">● Copilot 연결됨 (데모)</span>
            {mode === 'collapsed' && <button className="tb-open" onClick={() => setMode('split')} title="Agent 패널 열기"><span className="tb-open-i">‹</span>Agent</button>}
          </div>
        </div>
      )}
      {mode !== 'collapsed' && (
        <div className="tb-agent">
          <span className="tb-agent-title">{agentTitle}</span>
          <div className="tb-agent-ctrl">
            <button onClick={() => setMode(mode === 'expanded' ? 'split' : 'expanded')} title={mode === 'expanded' ? '분할 보기' : 'Agent 전체화면'}>{mode === 'expanded' ? '⤡' : '⤢'}</button>
            {mode !== 'expanded' && <button onClick={() => setMode('collapsed')} title="Agent 패널 접기">»</button>}
          </div>
        </div>
      )}
    </header>
  )
}
function AgentPanel({ screen, caseId, added, notify, updateCases, selected, setSelected }) {
  const data = added || []
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

/* 공통 페이지 헤더 (모든 화면 상단 통일) */
const PageHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div><h1 className="page-title">{title}</h1>{sub && <p className="page-sub">{sub}</p>}</div>
    {children && <div className="page-actions">{children}</div>}
  </div>
)

/* ---------- [추이·영역] 피벗 + 원문검색 (엑셀 1·2번 시트 대응) ---------- */
function weekKey(w) { const m = String(w).match(/(\d+)\D+(\d+)/); return m ? (+m[1]) * 10 + (+m[2]) : 9999 }
// 'YYYY.MM.DD' / 'YYYY.M.D' 등 → 'YYYY-MM-DD' (없으면 '')
function toDay(s) { if (!s) return ''; const m = String(s).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '' }
function recDay(d) { return toDay(d.date) || toDay(d.occur) }
function buildPivot(data, getL1, getL2) {
  const tree = {}
  for (const d of data) {
    const l1 = getL1(d) || '기타', l2 = getL2(d) || '기타', w = d.week || '미상'
    const t1 = tree[l1] || (tree[l1] = { sum: 0, byWeek: {}, cats: {} })
    t1.sum++; t1.byWeek[w] = (t1.byWeek[w] || 0) + 1
    const t2 = t1.cats[l2] || (t1.cats[l2] = { sum: 0, byWeek: {} })
    t2.sum++; t2.byWeek[w] = (t2.byWeek[w] || 0) + 1
  }
  return tree
}
function PivotView({ tree, weeks, l1order }) {
  const known = (l1order || []).filter((k) => tree[k])
  const extra = Object.keys(tree).filter((k) => !known.includes(k))
  const l1s = [...known, ...extra]
  const grand = weeks.map((w) => l1s.reduce((s, l1) => s + (tree[l1].byWeek[w] || 0), 0))
  const grandSum = l1s.reduce((s, l1) => s + tree[l1].sum, 0)
  return (
    <div className="table-wrap"><table className="vtable pivot">
      <thead><tr><th className="pv-rowh">구분</th>{weeks.map((w) => <th key={w} className="pv-num">{w}</th>)}<th className="pv-num">합계</th></tr></thead>
      <tbody>
        {l1s.map((l1) => {
          const node = tree[l1]
          const cats = Object.entries(node.cats).sort((a, b) => b[1].sum - a[1].sum)
          return (
            <React.Fragment key={l1}>
              <tr className="pv-l1"><td>{l1}</td>{weeks.map((w) => <td key={w} className="pv-num">{node.byWeek[w] || ''}</td>)}<td className="pv-num pv-sum">{node.sum}</td></tr>
              {cats.map(([l2, c]) => <tr key={l2} className="pv-l2"><td>{l2}</td>{weeks.map((w) => <td key={w} className="pv-num">{c.byWeek[w] || ''}</td>)}<td className="pv-num">{c.sum}</td></tr>)}
            </React.Fragment>
          )
        })}
        <tr className="pv-total"><td>총합계</td>{grand.map((n, i) => <td key={i} className="pv-num">{n}</td>)}<td className="pv-num pv-sum">{grandSum}</td></tr>
      </tbody>
    </table></div>
  )
}
function VOCTrends({ added }) {
  const data0 = added || []
  const [d1, setD1] = useState(''); const [d2, setD2] = useState('')
  const [q, setQ] = useState(''); const [fw, setFw] = useState('전체'); const [fa, setFa] = useState('전체')
  // 기간 필터(시작·종료일) — 전체 화면에 적용
  const data = useMemo(() => data0.filter((d) => {
    const dd = recDay(d); if (!d1 && !d2) return true; if (!dd) return false
    if (d1 && dd < d1) return false; if (d2 && dd > d2) return false; return true
  }), [data0, d1, d2])
  const weeks = useMemo(() => [...new Set(data.map((d) => d.week).filter(Boolean))].sort((a, b) => weekKey(a) - weekKey(b)), [data])
  // 일별 추이
  const byDay = useMemo(() => {
    const m = {}; for (const d of data) { const k = recDay(d); if (k) m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([day, n]) => ({ day, n }))
  }, [data])
  const maxD = Math.max(1, ...byDay.map((x) => x.n))
  const dayRange = useMemo(() => { const ds = data0.map(recDay).filter(Boolean).sort(); return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null }, [data0])
  const pv1 = useMemo(() => buildPivot(data, (d) => d.group, (d) => d.cat), [data])
  const pv2 = useMemo(() => buildPivot(data, (d) => d.area1, (d) => d.area2), [data])
  const totalsByWeek = weeks.map((w) => ({ w, n: data.filter((d) => d.week === w).length }))
  const maxW = Math.max(1, ...totalsByWeek.map((t) => t.n))
  // 발생영역 히트맵: 대응영역1 × 주차 집중도
  const heat = useMemo(() => {
    const rows = AREA1_LIST.filter((a) => data.some((d) => d.area1 === a))
    const grid = rows.map((a) => ({ area: a, cells: weeks.map((w) => data.filter((d) => d.area1 === a && d.week === w).length), sum: data.filter((d) => d.area1 === a).length }))
    const max = Math.max(1, ...grid.flatMap((r) => r.cells))
    return { rows: grid, max }
  }, [data, weeks])
  const results = data.filter((d) => (fw === '전체' || d.week === fw) && (fa === '전체' || d.area1 === fa) && (!q || (d.content || '').includes(q) || (d.summary || '').includes(q)))
  if (!data0.length) return <div className="screen"><PageHead title="기간별·영역별 추이" sub="VOC구분·대응영역 추이와 원문 검색" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 입력하거나 붙여넣으면 추이·영역 피벗이 생성됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="기간별·영역별 추이" sub="① 기간 필터 · 일별/주차별 추이 · ② 영역별(대응영역) · ③ 원문 검색" />
      <div className="panel">
        <div className="card-title">기간 필터 <span className="muted">시작·종료일로 전체 집계를 좁혀 봅니다{dayRange ? ` · 데이터 범위 ${dayRange.min} ~ ${dayRange.max}` : ''}</span></div>
        <div className="date-filter">
          <label>시작일 <input type="date" value={d1} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD1(e.target.value)} /></label>
          <span className="df-sep">~</span>
          <label>종료일 <input type="date" value={d2} min={dayRange?.min} max={dayRange?.max} onChange={(e) => setD2(e.target.value)} /></label>
          {(d1 || d2) && <button className="btn btn-ghost sm" onClick={() => { setD1(''); setD2('') }}>기간 초기화</button>}
          <span className="muted nowrap">표시 {data.length.toLocaleString()}건{(d1 || d2) ? ` / 전체 ${data0.length.toLocaleString()}` : ''}</span>
        </div>
      </div>
      <div className="panel">
        <div className="card-title">일별 VOC 추이 <span className="muted">{byDay.length}일 · 최대 {maxD.toLocaleString()}건/일</span></div>
        {byDay.length ? (
          <div className="trend-bars day-bars">{byDay.map((t) => <div key={t.day} className="tb-col" title={`${t.day} · ${t.n}건`}><div className="tb-v">{t.n}</div><div className="tb-bar" style={{ height: Math.max(4, t.n / maxD * 120) + 'px' }} /><div className="tb-k">{t.day.slice(5).replace('-', '/')}</div></div>)}</div>
        ) : <p className="micro">일자(인입일자/발생일자) 정보가 있는 데이터가 없어 일별 추이를 표시할 수 없습니다.</p>}
      </div>
      <div className="panel">
        <div className="card-title">주차별 VOC 추이 <span className="muted">{data.length.toLocaleString()}건 · {weeks.length}개 주차</span></div>
        <div className="trend-bars">{totalsByWeek.map((t) => <div key={t.w} className="tb-col"><div className="tb-v">{t.n}</div><div className="tb-bar" style={{ height: Math.max(4, t.n / maxW * 120) + 'px' }} /><div className="tb-k">{t.w}</div></div>)}</div>
      </div>
      <div className="panel"><div className="card-title">① 기간별 VOC 추이 <span className="muted">VOC구분1 · 구분2 × 주차</span></div><PivotView tree={pv1} weeks={weeks} l1order={GROUPS} /></div>
      <div className="panel"><div className="card-title">② 영역별 VOC <span className="muted">대응영역1 · 2 × 주차</span></div><PivotView tree={pv2} weeks={weeks} l1order={AREA1_LIST} /></div>
      <div className="panel">
        <div className="card-title">발생영역 히트맵 <span className="muted">문제 집중 구간 · 대응영역 × 주차</span></div>
        <div className="table-wrap"><table className="vtable heatmap">
          <thead><tr><th className="hm-rowh">대응영역</th>{weeks.map((w) => <th key={w} className="hm-col">{w}</th>)}<th className="hm-col">합계</th></tr></thead>
          <tbody>{heat.rows.map((r) => (
            <tr key={r.area}><td className="hm-area">{r.area}</td>{r.cells.map((n, i) => {
              const o = n / heat.max
              return <td key={i} className="hm-cell" style={{ background: n ? `rgba(230,0,126,${0.12 + o * 0.78})` : 'transparent', color: o > 0.5 ? '#fff' : 'var(--ink)' }}>{n || ''}</td>
            })}<td className="hm-sum">{r.sum.toLocaleString()}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="micro">색이 진할수록 해당 주차·영역에 VOC가 집중됨을 의미합니다 (가장 진한 칸 = {heat.max}건).</p>
      </div>
      <div className="panel">
        <div className="card-title">③ 기간·영역별 VOC 원문 검색</div>
        <div className="search-row">
          <select value={fw} onChange={(e) => setFw(e.target.value)}><option>전체</option>{weeks.map((w) => <option key={w}>{w}</option>)}</select>
          <select value={fa} onChange={(e) => setFa(e.target.value)}><option>전체</option>{AREA1_LIST.map((a) => <option key={a}>{a}</option>)}</select>
          <input placeholder="원문 키워드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="muted nowrap">{results.length.toLocaleString()}건</span>
        </div>
        <div className="table-wrap"><table className="vtable">
          <thead><tr><th>ID</th><th>주차</th><th>채널</th><th>구분</th><th>대응영역</th><th>원문</th></tr></thead>
          <tbody>{results.slice(0, 200).map((d) => (
            <tr key={d.id}><td className="mono">{d.id}</td><td className="nowrap muted">{d.week || '-'}</td><td><ChannelChip channel={d.channel} /></td><td className="nowrap"><GroupBadge v={d.group} /> <Tag>{d.cat}</Tag></td><td className="nowrap muted">{d.area1} › {d.area2}</td><td className="cell-content" title={d.content}>{d.content}</td></tr>
          ))}</tbody>
        </table></div>
        {results.length > 200 && <p className="micro">상위 200건만 표시 — 검색어/필터로 좁혀주세요.</p>}
      </div>
    </div>
  )
}

/* ---------- 공통: 도넛 차트 + 색상 (홈 현황 요약에서 사용) ---------- */
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
/* ---------- [2] VOC Inbox (채널 수집 + 화면 직접 입력) ---------- */
const INPUT_CHANNELS = ['고객의소리', 'Call', 'Medallia', 'App Store', '고객센터']
const SHEET_COLS = [
  { k: 'date', label: '인입일자', w: 108 }, { k: 'channel', label: '인입채널', w: 104 },
  { k: 'customer', label: '고객번호', w: 128 }, { k: 'content', label: '내용', w: 340 },
  { k: 'week', label: '월내주차', w: 96 }, { k: 'occur', label: '발생일자', w: 104 },
]
const emptyRow = () => ({ date: '', channel: '', customer: '', content: '', week: '', occur: '' })
function PasteSheetModal({ onClose, onSubmit }) {
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, emptyRow))
  const setCell = (ri, k, val) => setRows((rs) => rs.map((r, i) => i === ri ? { ...r, [k]: val } : r))
  const filled = rows.filter((r) => (r.content || '').trim()).length
  const onPaste = (e, ri, ci) => {
    const text = (e.clipboardData || window.clipboardData).getData('text')
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return // 단일 셀 → 기본 붙여넣기
    e.preventDefault()
    const grid = text.replace(/\r/g, '').split('\n').filter((l) => l !== '').map((l) => l.split('\t'))
    const maxCols = Math.max(...grid.map((g) => g.length))
    const headerNamed = /인입일자|채널|고객번호|내용|주차|발생/.test((grid[0] || []).join(' '))
    if (maxCols >= 10 || headerNamed) { // 전체 export(16열) 또는 헤더 포함 → 표준 파서로 인식
      const parsed = parsePaste(text)
      if (parsed.length) { setRows([...parsed.map((p) => ({ date: p.date || '', channel: p.channel || '', customer: p.customer || '', content: p.content || '', week: p.week || '', occur: p.occur || '' })), emptyRow(), emptyRow()]); return }
    }
    setRows((rs) => { // 6열 이하 → 엑셀처럼 현재 셀 기준 위치 채우기
      const next = rs.map((r) => ({ ...r }))
      grid.forEach((cells, r) => { const tr = ri + r; while (next.length <= tr) next.push(emptyRow()); cells.forEach((val, c) => { const col = SHEET_COLS[ci + c]; if (col) next[tr][col.k] = (val || '').trim() }) })
      return next
    })
  }
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal sheet-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>엑셀 시트로 입력 · 붙여넣기</b><button className="modal-x" aria-label="닫기" onClick={onClose}>✕</button></div>
        <p className="modal-note">셀에 직접 입력하거나, Excel에서 범위를 복사해 셀에 <b>붙여넣기(Ctrl+V)</b> 하세요 — 헤더·전체 열도 자동 인식합니다. <b>내용</b>이 있는 행만 추가되며, 전화·이름은 추가 시 자동 마스킹됩니다.</p>
        <div className="sheet-wrap">
          <table className="sheet">
            <thead><tr><th className="sh-rownum"></th>{SHEET_COLS.map((c) => <th key={c.k} style={{ minWidth: c.w }}>{c.label}{c.k === 'content' && <span className="sh-req"> *</span>}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}><td className="sh-rownum">{ri + 1}</td>{SHEET_COLS.map((c, ci) => (
                <td key={c.k}><input value={r[c.k]} onChange={(e) => setCell(ri, c.k, e.target.value)} onPaste={(e) => onPaste(e, ri, ci)} /></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
        <div className="modal-foot">
          <div className="mf-left">
            <button className="btn btn-ghost sm" onClick={() => setRows((rs) => [...rs, ...Array.from({ length: 5 }, emptyRow)])}>행 추가</button>
            <button className="btn btn-ghost sm" onClick={() => setRows(Array.from({ length: 8 }, emptyRow))}>전체 지우기</button>
            <span className="muted">내용 입력 {filled}행</span>
          </div>
          <div className="mf-right">
            <button className="btn btn-ghost" onClick={onClose}>닫기</button>
            <button className="btn btn-primary" disabled={!filled} onClick={() => onSubmit(rows)}>분류·추가 ({filled}건)</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function VOCInbox({ openCase, notify, added, setAdded, shared, sharedInsert, clearShared }) {
  const [fch, setFch] = useState('전체'); const [fgrp, setFgrp] = useState('전체'); const [fst, setFst] = useState('전체')
  const [channel, setChannel] = useState('고객의소리'); const [customer, setCustomer] = useState(''); const [text, setText] = useState('')
  const [vDate, setVDate] = useState(''); const [vWeek, setVWeek] = useState(''); const [vOccur, setVOccur] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
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
  // 공유 모드: 사용자 간 충돌 없도록 전역 고유 ID
  const uid = (k = '') => 'IN-' + Date.now().toString(36) + String(k) + Math.random().toString(36).slice(2, 6)
  const addVoc = () => {
    if (!text.trim()) { notify.toast('VOC 내용을 입력하세요'); return }
    const v = enrichRow({ channel, content: text.trim(), customer: customer.trim(), date: vDate.trim(), week: vWeek.trim(), occur: vOccur.trim() }, shared ? uid() : nid(seq))
    setAdded([v, ...added]); if (!shared) setSeq(seq + 1); setResult(v); setText(''); setCustomer('')
    if (shared) sharedInsert(toCompact([v]))
    notify.toast(`${v.id} 분류·추가됨 — ${v.group} · ${v.cat}`)
  }
  const addSheet = (sheetRows) => {
    const valid = (sheetRows || []).filter((r) => (r.content || '').trim())
    if (!valid.length) { notify.toast('내용이 입력된 행이 없습니다'); return }
    const vs = valid.map((row, k) => enrichRow({ content: row.content, channel: row.channel || '고객의소리', customer: row.customer, date: row.date, week: row.week, occur: row.occur }, shared ? uid(k) : nid(seq + k)))
    setAdded([...vs, ...added]); if (!shared) setSeq(seq + vs.length); setResult(vs[0])
    if (shared) sharedInsert(toCompact(vs))
    setSheetOpen(false)
    notify.toast(`${vs.length}건 분류·추가됨`)
  }
  const seedShared = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      const recs = await r.json()
      if (!Array.isArray(recs) || !recs.length) { notify.toast('seed.json이 비어 있어요'); return }
      sharedInsert(recs)
      notify.toast(`샘플 ${recs.length.toLocaleString()}건을 공유 저장소에 넣었어요 (잠시 후 모두에게 표시)`)
    } catch { notify.toast('샘플 시드를 넣지 못했어요') }
  }
  const wipeShared = async () => {
    if (!window.confirm('공유 저장소의 모든 VOC를 삭제합니다.\n로그인한 모든 사용자에게 반영됩니다. 계속할까요?')) return
    try { await clearShared(); setAdded([]); notify.toast('공유 데이터를 비웠어요') } catch { notify.toast('삭제하지 못했어요 — 네트워크를 확인하세요') }
  }
  return (
    <div className="screen">
      <PageHead title="VOC 수집·입력" sub="채널 수집 + 화면 직접 입력 → Copilot이 4그룹·22분류·대응영역·초안까지 자동 생성 (담당자 검수 후 처리)" />
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
          {!shared && added.length > 0 && <button className="btn btn-ghost" onClick={() => { if (window.confirm(`저장된 입력 ${added.length.toLocaleString()}건을 모두 삭제할까요? (되돌릴 수 없습니다)`)) { setAdded([]); setResult(null) } }}>입력 항목 비우기</button>}
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
            <div className="co-ans"><div className="co-ans-k">예상 답안 (고객 응대 초안)</div><div className="co-ans-v">{result.answer}</div></div>
            <div className="co-ans"><div className="co-ans-k">예상 처리 방안</div><div className="co-ans-v">{result.action}{result.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''} · 담당 {result.org}</div></div>
            <p className="micro">{result.id} 추가됨 — 표/보드에서 확인하고 행을 클릭하면 답변 초안 등 상세가 열립니다. (담당자 검수 후 처리)</p>
          </div>
        )}
      </div>
      <div className="panel input-panel">
        <div className="ip-head">엑셀에서 붙여넣기 (일괄) <span className="ip-note">엑셀처럼 시트에 입력하거나, Excel에서 범위를 복사해 시트에 붙여넣으면 표준 컬럼으로 인식해 일괄 분류·추가합니다. 전화·이름은 마스킹됩니다.</span></div>
        <div className="ip-actions">
          <button className="btn btn-primary" onClick={() => setSheetOpen(true)}>엑셀 시트로 입력 / 붙여넣기 열기</button>
        </div>
      </div>
      {sheetOpen && <PasteSheetModal onClose={() => setSheetOpen(false)} onSubmit={addSheet} />}
      {shared && (
        <div className="panel input-panel">
          <div className="ip-head">공유 저장소 (실시간 누적) <span className="ip-note">입력·붙여넣은 VOC가 공유 저장소에 적재되어, 로그인한 모든 사용자 화면에 수 초 내 누적 표시됩니다. 아래는 데모 편의 기능이에요.</span></div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={seedShared}>공유 데이터에 샘플 시드 넣기</button>
            <button className="btn btn-ghost danger" onClick={wipeShared}>공유 데이터 비우기</button>
            <span className="up-summary">현재 <b>{added.length.toLocaleString()}</b>건 · 공유</span>
          </div>
        </div>
      )}
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
      <PageHead title="분류 보드" sub="4그룹 게이트 + 22개 표준분류 · 카드를 드래그해 진행상황을 바꿀 수 있어요" />
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
function CaseDetail({ caseId, notify, added, updateCases, addSent }) {
  const [showNum, setShowNum] = useState(false)
  const [own, setOwn] = useState(''); const [jira, setJira] = useState('')
  const [snd, setSnd] = useState({ kind: '문자', to: '', body: '' })
  const all = [...(added || []), ...VOCS]
  const c = all.find((v) => v.id === caseId) || all[0]
  useEffect(() => {
    if (!c) return
    setOwn(c.owner || ''); setJira(c.jiraUrl || '')
    setSnd({ kind: '문자', to: c.customerRaw || c.customer || '', body: c.sms || '' })
  }, [c && c.id])
  const copy = (t, l) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => notify.toast(l + ' 복사됨')).catch(() => notify.toast('복사 실패')); else notify.toast('복사 불가') }
  const doSend = () => {
    if (!snd.to.trim() || !snd.body.trim()) { notify.toast('수신·내용을 입력하세요'); return }
    if (addSent) addSent({ caseId: c.id, kind: snd.kind, owner: own || c.owner || '미지정', to: snd.to.trim(), content: snd.body.trim() })
    notify.toast(`${snd.kind} 발송 기록됨 (데모) — 메일 › 발송 이력에 추가`)
  }
  if (!c) return <div className="screen"><div className="panel empty-panel">표시할 케이스가 없습니다. VOC Inbox에서 VOC를 입력하거나 엑셀을 붙여넣어 추가하세요.</div></div>
  const canReveal = c.customerRaw && c.customerRaw !== c.customer
  return (
    <div className="screen">
      <PageHead title="케이스 처리" sub="분류 결과 확인 · 문자/메일 초안 · 처리 상태 관리" />
      <div className="case-grid">
        <div className="case-main">
          <div className="panel">
            <div className="case-top"><h2 className="case-id">{c.id}{c.source === 'input' && <span className="src-pill">입력</span>}</h2><div className="case-area"><GroupBadge v={c.group} /> <Tag>{c.cat}</Tag>{c.review && <span className="rev-y">검토필요</span>}</div></div>
            <div className="block-label">인입 정보</div>
            <div className="kv">
              <div className="kv-i"><span className="kv-k">인입일자</span><span className="kv-v">{c.date || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">인입 채널</span><span className="kv-v"><ChannelChip channel={c.channel} /></span></div>
              <div className="kv-i"><span className="kv-k">고객번호</span><span className="kv-v">{showNum && canReveal ? c.customerRaw : c.customer}{canReveal && <button className="num-btn" onClick={() => setShowNum(!showNum)}>{showNum ? '가리기' : '번호 보기'}</button>}</span></div>
              <div className="kv-i"><span className="kv-k">월 내 주차</span><span className="kv-v">{c.week || '-'}</span></div>
              <div className="kv-i"><span className="kv-k">발생일자</span><span className="kv-v">{c.occur || '-'}</span></div>
            </div>
            <div className="block-label">분류 · 처리 정보</div>
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
            {c.summary && <div className="block"><div className="block-label">AI 요약 초안</div><p className="voc-raw">{c.summary}</p></div>}
            <div className="block"><div className="block-label">VOC 원문(내용)</div><p className="voc-raw">{c.content}</p></div>
          </div>
          <div className="panel ai-panel"><div className="ai-head">Copilot AI 분석 <span className="ai-tag">초안 · 담당자 검수 필요</span></div><ul className="ai-list">{c.analysis.map((a, i) => <li key={i}>{a}</li>)}</ul>
            <div className="ai-ans"><div className="ai-ans-k">예상 답안 (고객 응대 초안)</div><div className="ai-ans-v">{c.answer}</div></div>
            <div className="ai-ans"><div className="ai-ans-k">예상 처리 방안</div><div className="ai-ans-v">{c.action}{c.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''} · 담당 {c.org}</div></div>
          </div>
          {c.sms && <div className="panel"><div className="block-label">고객 문자/푸시 초안</div><div className="draft">{c.sms}</div><button className="btn btn-ghost sm" onClick={() => copy(c.sms, '문자 초안')}>문자 초안 복사</button></div>}
          {c.mail && <div className="panel"><div className="block-label">담당자 메일 초안</div><div className="draft"><div className="mail-line"><b>수신</b> {c.mail.to}</div><div className="mail-line"><b>제목</b> {c.mail.subject}</div><div className="mail-body">{c.mail.body}</div></div><button className="btn btn-ghost sm" onClick={() => copy(`수신: ${c.mail.to}\n제목: ${c.mail.subject}\n\n${c.mail.body}`, '메일 초안')}>메일 초안 복사</button></div>}
          <div className="panel"><div className="block-label">UX/개발 개선 요청</div><div className="impv"><div><span className="impv-k">문제</span>{c.improvement.problem}</div><div><span className="impv-k">제안</span>{c.improvement.suggestion}</div><div><span className="impv-k">기대효과</span>{c.improvement.effect}</div></div></div>
        </div>
        <div className="case-side">
          <div className="panel"><div className="block-label">예상 처리 방안</div><div className="action-list"><div className="action-item">{c.action}{c.devNeeded === 'Y' ? ' · 개발 대응 필요' : ''}</div><div className="action-item muted">담당 영역: {c.area1} › {c.area2}</div></div></div>
          <div className="panel owner-panel">
            <div className="block-label">담당자 작업</div>
            <label className="of-row"><span>진행상황</span><select value={c.status} onChange={(e) => updateCases && updateCases([c.id], { status: e.target.value })}>{KANBAN_COLS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="of-row"><span>담당자</span><input value={own} onChange={(e) => setOwn(e.target.value)} onBlur={() => updateCases && updateCases([c.id], { owner: own })} placeholder="영역 담당자" /></label>
            <label className="of-row"><span>Jira URL</span><input value={jira} onChange={(e) => setJira(e.target.value)} onBlur={() => updateCases && updateCases([c.id], { jiraUrl: jira })} placeholder="https://jira… (표시용)" /></label>
            {c.jiraUrl && <a className="jira-link" href={c.jiraUrl} target="_blank" rel="noreferrer">티켓 열기 ↗</a>}
            <button className="btn btn-ghost sm" onClick={() => notify.modal('개선 요청 등록', '실제 적용 시 사내 업무시스템(Jira 등)에 개선 요청이 등록됩니다. 본 MVP는 데모 표시입니다.')}>개선 요청 등록</button>
          </div>
          <div className="panel">
            <div className="block-label">메일 · 문자 발송 <span className="muted" style={{ fontWeight: 400 }}>데모 · 실제 발송 안 함</span></div>
            <label className="of-row"><span>유형</span><select value={snd.kind} onChange={(e) => setSnd({ ...snd, kind: e.target.value })}><option>문자</option><option>메일</option></select></label>
            <label className="of-row"><span>수신</span><input value={snd.to} onChange={(e) => setSnd({ ...snd, to: e.target.value })} placeholder="수신 번호/이메일" /></label>
            <textarea className="of-area" value={snd.body} onChange={(e) => setSnd({ ...snd, body: e.target.value })} placeholder="발송 내용" />
            <button className="btn btn-primary" onClick={doSend}>발송 (데모)</button>
            <p className="micro">발송 시 ‘메일 › 발송 이력’에 담당자·수신·내용·발송일이 기록됩니다. 최종 발송·개발 반영은 담당자 검수 후 진행됩니다.</p>
          </div>
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
      <PageHead title="인사이트 리포트" sub="표준분류·그룹 분포와 개선 인사이트" />
      <div className="two-col">
        <div className="panel">
          <div className="card-title">표준분류 분포 <span className="muted">전체 {data.length.toLocaleString()}건</span></div>
          <div className="hbars hbars-wide">{dist.slice(0, 12).map((d) => (
            <div key={d.k} className="hbar-row">
              <span className="hbar-k" title={d.k}>{d.k}</span>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, d.pct / maxPct * 100) + '%' }} /></div>
              <span className="hbar-n">{d.n.toLocaleString()}건</span>
            </div>
          ))}</div>
        </div>
        <div className="panel">
          <div className="card-title">그룹(VOC구분1) 분포</div>
          <div className="hbars hbars-wide">{groupSplit.map((g) => (
            <div key={g.g} className="hbar-row">
              <span className="hbar-k"><GroupBadge v={g.g} /></span>
              <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.max(3, g.n / (data.length || 1) * 100) + '%' }} /></div>
              <span className="hbar-n">{g.n.toLocaleString()}건</span>
            </div>
          ))}</div>
        </div>
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
      <PageHead title="Copilot 프롬프트" sub="현업자가 Copilot AI로 VOC 분류·액션 생성을 재현할 수 있는 프롬프트입니다." />
      <div className="prompt-grid">{prompts.map((pr) => <div key={pr.t} className="prompt-card"><div className="pc-title">{pr.t}</div><div className="pc-purpose">{pr.p}</div><pre className="pc-body">{pr.body}</pre><div className="pc-actions"><button className="btn btn-ghost sm" onClick={() => copy(pr.body)}>복사</button><button className="btn btn-primary sm" onClick={() => notify.modal('Copilot에서 실행', '실제 적용 시 사내 Copilot 또는 Copilot Studio Agent로 연결됩니다.')}>Copilot에서 실행</button></div></div>)}</div>
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
  const intake = [
    { t: '채널 수집', d: '상담콜 · 메달리아 · U+one 앱 · 홈페이지' },
    { t: '데이터 전처리', d: 'STT · 개인정보 마스킹' },
    { t: '자동 분류 · 분석', d: '4그룹·22개 표준분류 라벨링 · 우선순위화' },
    { t: '피드백 · 처리결과 학습', d: '분류 정확도 개선에 반영' },
  ]
  const operate = [
    { t: 'VOC 관리 대시보드', d: '유형·영역별 발생 추이 · 처리현황 · 담당자' },
    { t: '분석 · 개선 인사이트 도출', d: '개선과제 → 서비스 반영' },
    { t: '담당자 알림 + 예상 해결안 안내', d: '케이스별 처리 가이드' },
    { t: '고객 안내', d: '문자 · 푸시 · 메일 초안' },
    { t: '서비스 반영', d: '근본 원인 개선' },
  ]
  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">솔루션 구조 (TO-BE)</h1>
          <p className="page-sub">Copilot 데이터 파이프라인 + 두 개의 엔진으로 수집·분류부터 셀프 해결·예방까지 자동화.</p>
        </div>
      </div>

      <div className="pipe-strip">{['데이터 수집', '정제 · 비식별화', '임베딩 · 자동 분류', '개선 인사이트', '셀프 가이드'].map((s, i, a) => (
        <React.Fragment key={s}><span className={'pipe-step' + (i >= 2 ? ' on' : '')}>{s}</span>{i < a.length - 1 && <span className="pipe-ar">→</span>}</React.Fragment>
      ))}</div>
      <div className="eng-grid">
        <div className="panel eng-card">
          <div className="eng-h">엔진 ① <b>VOC 분류 · 분석 에이전트</b></div>
          <ul className="eng-list">{['유형·발생영역 다중 라벨 자동 분류', '감성·긴급도 스코어링으로 우선순위화', '영역별 개선 과제를 원인·액션과 함께 자동 제안', '실시간 트렌드·발생영역 히트맵 대시보드 제공'].map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="panel eng-card eng-2">
          <div className="eng-h">엔진 ② <b>고객 셀프 해결 가이드 에이전트</b></div>
          <ul className="eng-list">{['상담 인입콜 STT(정답 데이터) 학습', '자주 묻는 VOC를 셀프 해결 시나리오로 변환', '접수 전 단계에서 고객 맞춤 가이드 노출', '미해결 건만 정제해 상담사 연결'].map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>

      <h2 className="sec-title">처리 흐름 (Flow Chart)</h2>
      <FlowMap />

      <h2 className="sec-title">단계별 상세 <span className="sec-note">3개 레인 · 수집부터 반영까지</span></h2>
      <div className="flowchart">
        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">1</span>고객 접점 · 셀프 해결</div>
          <Box t="VOC 발생" />
          <Arrow />
          <div className="fc-decision"><span className="fc-dtag">분기</span><span className="fc-dia">◆</span>셀프 가이드로 해결 가능?</div>
          <div className="fc-branch">
            <div className="fc-leg">
              <span className="fc-yes">예</span>
              <Box t="고객 셀프 해결 · 사전 예방" d="접수 전 맞춤 가이드 제공" />
              <Arrow />
              <div className="fc-pill end">END · 인입콜 · VOC 감소</div>
            </div>
            <div className="fc-leg">
              <span className="fc-no">아니오</span>
              <Box t="상담 연결 · VOC 접수" d="미해결 건만 상담사에 전달" />
              <Arrow />
              <div className="fc-next">↳ 레인 2 수집으로 유입</div>
            </div>
          </div>
        </div>

        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">2</span>수집 · 자동 분류</div>
          {intake.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < intake.length - 1 && <Arrow />}</React.Fragment>)}
          <div className="fc-loop">⟲ 학습 결과는 자동 분류 모델로 되먹임 (피드백 루프)</div>
        </div>

        <div className="fc-lane">
          <div className="fc-lane-h"><span className="n">3</span>운영 · 서비스 반영</div>
          {operate.map((s, i) => <React.Fragment key={s.t}><Box t={s.t} d={s.d} />{i < operate.length - 1 && <Arrow />}</React.Fragment>)}
          <Arrow />
          <div className="fc-pill end">END · 처리율 · 속도 향상</div>
        </div>
      </div>

      <div className="note-box"><b>흐름 요약</b> — 고객 VOC는 먼저 <b>셀프 가이드</b>로 해결을 시도해 인입콜·VOC 자체를 줄이고(레인 1), 미해결 건만 상담 연결로 접수됩니다. 접수된 VOC는 <b>수집·전처리·자동 분류</b>(레인 2)를 거쳐 <b>대시보드·인사이트·담당자 알림·고객 안내·서비스 반영</b>(레인 3)으로 처리되며, 처리결과는 다시 분류 모델 학습으로 되먹임됩니다.</div>

      <h2 className="sec-title">활용 배경 · 문제 인식 (AS-IS)</h2>
      <div className="two-col">
        <div className="panel">
          <div className="card-title">현재 처리 프로세스</div>
          <ol className="asis-steps">{[['인입 · 수집', '채널별 VOC를 개별 채널에서 수집'], ['전처리', '중복·오탈자 정리 · 개인정보 비식별화'], ['수기 분석 · 분류', '유형·발생영역을 담당자가 판단·태깅'], ['집계 · 리포팅', '엑셀 취합 후 정기 리포트 수작성'], ['개선', '①~④ 텀으로 개선 반영 지연']].map(([t, d], i) => <li key={t}><b>{t}</b> — {d}</li>)}</ol>
        </div>
        <div className="panel">
          <div className="card-title">페인포인트 · 근본 원인</div>
          <div className="pain-chips">{['일일 150~200건', '분류·태깅 수작업', 'Edge case 지식 단절'].map((p) => <span key={p} className="pain-chip">{p}</span>)}</div>
          <ul className="asis-pain">{['수기 처리로 분류 기준 불명확', '전처리·태깅에 리소스 집중 → 개선 액션 후순위', '동일 유형 VOC·인입콜 반복으로 업무 가중', '분류·분석을 사람에 의존 + 사후 처리 중심 + 셀프 채널 부재'].map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>

      <h2 className="sec-title">Before / After</h2>
      <div className="ba-grid">
        <div className="panel ba-before"><div className="ba-tag">Before</div><ul className="ba-list">{['협력업체·사람이 VOC를 수작업 분류', '채널별로 흩어진 VOC를 수작업 취합', '상담사가 고객에게 다시 연락', '중요 이슈는 담당자가 별도로 판단', 'UX/개발 개선 과제 연결이 늦음', '상담 Call과 1:1 문의가 반복 발생'].map((b, i) => <li key={i}>{b}</li>)}</ul></div>
        <div className="panel ba-after"><div className="ba-tag after">After</div><ul className="ba-list">{['수집된 VOC를 Copilot AI가 4그룹·22개 표준분류로 자동 분류', '대시보드에서 유형·심각도·담당조직·처리방식 확인', '셀프 가이드로 사전 해결 → 인입콜·VOC 감소', '중요 이슈는 담당자 메일·문자 초안 자동 생성', 'UX/개발 개선 필요 케이스는 개선 요청으로 정리', '분류–처리–결과까지 한 화면에서 관리'].map((a, i) => <li key={i}>{a}</li>)}</ul></div>
      </div>

      <h2 className="sec-title">기대 효과</h2>
      <div className="effect-row">{[...EFFECTS, { t: '디지털 채널 고객불편 감소', d: '근본 원인 개선으로 재발 방지' }].map((e) => <div key={e.t} className="effect-card"><div className="effect-t">{e.t}</div><div className="effect-d">{e.d}</div></div>)}</div>

      <h2 className="sec-title">구현 로드맵</h2>
      <div className="roadmap">
        <div className="rm-step rm-now"><div className="rm-t">PoC <span className="rm-badge">현재</span></div><div className="rm-d">핵심 분류·대시보드 프로토타입 동작</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">파일럿</div><div className="rm-d">실 VOC·STT 데이터로 정확도 고도화</div></div>
        <span className="rm-ar">→</span>
        <div className="rm-step"><div className="rm-t">전사 확산</div><div className="rm-d">CX 전 영역·타 채널로 확대 적용</div></div>
      </div>

      <div className="note-box"><b>설계 메모</b> — 게이트(전문가 풀)로 정형/열림을 나눠 AI는 꼭 필요한 곳에만 쓰고, 생성–검증으로 사람이 마지막을 책임집니다. 현재 MVP는 입력·붙여넣은 데이터 기반이며, 향후 상담어드바이스·메달리아·앱스토어·고객센터 연동, 문자/메일 발송(담당자 검수 후), 개선 티켓 생성(고도화 단계 선택 적용)이 가능합니다.</div>
    </div>
  )
}

/* ---------- [엔진②] 고객 셀프 해결 가이드 ---------- */
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
  const data = added || []
  const total = data.length
  const catMap = {}; data.forEach((v) => { catMap[v.cat] = (catMap[v.cat] || 0) + 1 })
  const top = Object.entries(catMap).map(([cat, n]) => ({ cat, n })).sort((a, b) => b.n - a.n).slice(0, 8)
  const covered = top.filter((t) => SELF_GUIDE[t.cat]).reduce((s, t) => s + t.n, 0)
  const selfRate = total ? Math.round(covered / total * 100) : 0
  if (!total) return <div className="screen"><PageHead title="고객 셀프 해결 가이드" sub="엔진② · 접수 전 셀프 해결 시나리오" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 자주 묻는 유형이 셀프 해결 가이드로 변환됩니다.</div></div>
  return (
    <div className="screen">
      <PageHead title="고객 셀프 해결 가이드" sub="엔진② · 상담 인입콜 STT(정답 데이터) 학습 → 자주 묻는 VOC를 접수 전 셀프 해결 시나리오로 제공" />
      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-l">자주 묻는 유형</div><div className="kpi-main"><span className="kpi-v">{top.length}</span><span className="kpi-chip">셀프 가이드화</span></div></div>
        <div className="kpi-card accent brand"><div className="kpi-l">셀프 가이드 커버율</div><div className="kpi-main"><span className="kpi-v">{selfRate}%</span><span className="kpi-chip brand">상위 유형 기준</span></div></div>
        <div className="kpi-card"><div className="kpi-l">예상 인입콜 감소</div><div className="kpi-main"><span className="kpi-v">{covered.toLocaleString()}</span><span className="kpi-chip">접수 전 자가 해결(데모)</span></div></div>
      </div>
      <h2 className="sec-title">자주 묻는 VOC → 셀프 해결 시나리오 <span className="sec-note">빈도 상위 {top.length}개 유형</span></h2>
      <div className="guide-grid">{top.map((t) => {
        const steps = SELF_GUIDE[t.cat] || GUIDE_FALLBACK
        return (
          <div key={t.cat} className="guide-card">
            <div className="guide-head"><span className="guide-cat">{t.cat}</span><span className="guide-freq">{t.n.toLocaleString()}건</span></div>
            <ol className="guide-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <div className="guide-foot"><button className="btn btn-ghost sm" onClick={() => notify.toast('셀프 해결 완료 (데모) — 인입콜 1건 예방')}>해결됐어요</button><button className="btn btn-ghost sm" onClick={() => notify.toast('미해결 — 상담사 연결 (데모)')}>상담 연결</button></div>
          </div>
        )
      })}</div>
      <div className="note-box"><b>엔진② 동작</b> — 상담 인입콜 STT(정답 데이터)를 학습해 자주 묻는 VOC를 셀프 해결 시나리오로 변환하고, 접수 전 단계에서 고객 맞춤 가이드를 노출합니다. <b>미해결 건만</b> 정제해 상담사에 연결하고, 처리결과는 분류 모델 학습으로 되먹임됩니다(피드백 루프).</div>
    </div>
  )
}

/* ---------- [개선 백로그] 우선순위 매긴 서비스 개선 과제 ---------- */
function Backlog({ added, openCase }) {
  const data = added || []
  if (!data.length) return <div className="screen"><PageHead title="개선 백로그" sub="우선순위가 매겨진 서비스 개선 과제" /><div className="panel empty-panel">집계할 데이터가 없습니다. <b>VOC 수집·입력</b>에서 VOC를 추가하면 영역·유형별 개선 과제가 우선순위와 함께 정리됩니다.</div></div>
  const map = {}
  data.forEach((v) => {
    const key = v.area1 + '||' + v.cat
    const m = map[key] || (map[key] = { area1: v.area1, area2: v.area2, cat: v.cat, group: v.group, n: 0, high: 0, dev: 0, owner: v.owner, action: v.action, sample: '', sampleId: '' })
    m.n++; if (v.severity === 'High') m.high++; if (v.devNeeded === 'Y') m.dev++
    if (!m.sample) { m.sample = v.summary || v.content; m.sampleId = v.id }
  })
  const items = Object.values(map).map((m) => ({ ...m, score: m.high * 3 + m.n + (m.dev ? 2 : 0) })).sort((a, b) => b.score - a.score).slice(0, 20)
  const pr = (i) => i < 3 ? 'P1' : i < 8 ? 'P2' : 'P3'
  return (
    <div className="screen">
      <PageHead title="개선 백로그" sub="VOC 근거와 함께 원인·액션을 도출하고 빈도·심각도로 우선순위를 매긴 서비스 개선 과제" />
      <div className="table-wrap"><table className="vtable backlog">
        <thead><tr><th>우선순위</th><th>대응영역</th><th>유형</th><th>건수</th><th>High</th><th>개발</th><th>제안 액션</th><th>담당</th><th>대표 원문</th></tr></thead>
        <tbody>{items.map((m, i) => (
          <tr key={m.area1 + m.cat} onClick={() => m.sampleId && openCase(m.sampleId)} className="row-click">
            <td><span className={'pr-badge pr-' + pr(i).toLowerCase()}>{pr(i)}</span></td>
            <td className="nowrap muted">{m.area1} › {m.area2}</td>
            <td className="nowrap"><GroupBadge v={m.group} /> <Tag>{m.cat}</Tag></td>
            <td className="pv-num">{m.n.toLocaleString()}</td>
            <td className="pv-num">{m.high || ''}</td>
            <td className="pv-num">{m.dev ? 'Y' : ''}</td>
            <td className="nowrap">{m.action}</td>
            <td className="nowrap muted">{m.owner}</td>
            <td className="cell-content" title={m.sample}>{m.sample}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="micro">우선순위 = High 건수×3 + 건수 + 개발대응 가중치. 행을 클릭하면 대표 케이스로 이동합니다. (실제 적용 시 Jira 백로그로 연계)</p>
    </div>
  )
}

/* ---------- [발송 이력] 메일·문자 발송 이력 — 메일 앱에 임베드 ---------- */
function SentLogTable({ sentLog }) {
  const log = sentLog || []
  if (!log.length) return <div className="panel empty-panel">아직 발송 이력이 없습니다. <b>VOC Agent › 케이스 처리</b>에서 메일/문자를 발송(데모)하면 담당자·수신·내용·발송일이 여기에 기록됩니다.</div>
  return (
    <div className="table-wrap"><table className="vtable">
      <thead><tr><th>발송일시</th><th>유형</th><th>담당자</th><th>수신</th><th>케이스</th><th>내용</th></tr></thead>
      <tbody>{log.map((s) => (
        <tr key={s.id}><td className="nowrap muted">{s.date}</td><td><span className={'kind ' + (s.kind === '메일' ? 'kind-mail' : 'kind-sms')}>{s.kind}</span></td><td className="nowrap">{s.owner}</td><td className="nowrap">{s.to}</td><td className="mono nowrap">{s.caseId}</td><td className="cell-content" title={s.content}>{s.content}</td></tr>
      ))}</tbody>
    </table></div>
  )
}

/* ---------- 통합 홈(포털) + 업무 앱 (데모) ---------- */
const PORTAL_TITLES = { home: '통합 홈', mail: '메일', cal: '일정', org: '조직도', pay: '결재', grid: '전체메뉴' }
const DemoBanner = ({ children }) => <div className="demo-banner">데모 화면 — {children} 실제 적용 시 사내 시스템과 연동됩니다.</div>
/* ---------- 홈 공통: 섹션 헤더 · 시그니처 AI 제안 박스 ---------- */
const Chev = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
function CardHead({ title, sub, onMore }) {
  return (
    <div className="card-head">
      <span className="ch-title">{title}{sub && <span className="muted">{sub}</span>}</span>
      {onMore && <button className="ch-more" onClick={onMore} aria-label="더보기"><Chev /></button>}
    </div>
  )
}
function AiBox({ q, rows, acts, dismissable = true }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="ai-box">
      {dismissable && <button className="ai-x" onClick={() => setOpen(false)} aria-label="닫기">×</button>}
      <div className="ai-box-q"><span className="ai-spark">✦</span>{q}</div>
      {rows && rows.length > 0 && <div className="ai-rows">{rows.map((r, i) => (
        <div key={i} className="ai-row"><span className={'ai-tag ' + r.tag}>{r.label}</span><span>{r.text}</span></div>
      ))}</div>}
      {acts && acts.length > 0 && <div className="ai-acts">{acts.map((a, i) => (
        <button key={i} className={'ai-pill-btn' + (a.primary ? ' primary' : '')} onClick={a.onClick}>{a.label}</button>
      ))}</div>}
    </div>
  )
}
function HomePortal({ account, added, goAgent, setRail, openCase, notify, aiMode, setAiMode }) {
  const data = added || []
  const total = data.length
  const todo = data.filter((v) => v.status === '처리 필요').length
  const high = data.filter((v) => v.severity === 'High').length
  const doing = data.filter((v) => v.status === '처리 중').length
  const review = data.filter((v) => v.review).length
  const autoRate = total ? Math.round(((total - review) / total) * 100) : 0
  const pct = (n) => total ? Math.round((n / total) * 100) : 0
  const name = (account || 'U+').split('@')[0]
  const [caseTab, setCaseTab] = useState('high')
  // 집계
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
  const a0 = alerts[0]
  // 조치 필요 케이스 (탭)
  const caseSets = {
    high: data.filter((v) => v.severity === 'High'),
    review: data.filter((v) => v.review),
    doing: data.filter((v) => v.status === '처리 중'),
  }
  const caseList = (caseSets[caseTab] || []).slice(0, 4)
  // 우측 패널 todo 추천용 — 이상탐지/유형 막대 · 검토 인용 · 처리 스텝퍼
  const topGroups = [...groupSeg].sort((x, y) => y.value - x.value).slice(0, 2)
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
  const askDemo = (label) => notify && notify.toast(`Copilot에 요청했어요 — ${label} (데모)`)
  const sendDemo = (el) => { const v = (el.value || '').trim(); if (!v) return; if (notify) notify.toast('Copilot에 전달했어요 (데모)'); el.value = '' }

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
          <button className="chip-btn" onClick={() => goAgent('backlog')}>개선 우선순위</button>
        </div>
        <div className="ai-input as-launch" role="button" tabIndex={0} onClick={() => setAiMode && setAiMode(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAiMode && setAiMode(true) } }}>
          <div className="ai-i-top"><span className="ai-spark">✦</span>AI</div>
          <input readOnly placeholder="VOC 관련 무엇이든 물어보세요" onFocus={() => setAiMode && setAiMode(true)} />
          <div className="ai-i-bot">
            <div className="ai-i-tools"><span>⌕ 리서치</span><span>✎ 툴</span></div>
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
              <div className="ai-i-tools"><span onClick={() => askDemo('리서치')}>⌕ 리서치</span><span onClick={() => askDemo('툴')}>✎ 툴</span></div>
              <button className="ai-send" onClick={(e) => sendDemo(e.currentTarget.closest('.aiw-inputbox').querySelector('input'))}>↑</button>
            </div>
          </div>
          <div className="aiw-chips">
            <button className="chip-btn" onClick={() => goAgent('trends')}>오늘 급증 VOC 정리해줘</button>
            <button className="chip-btn" onClick={() => goAgent('detail')}>검토필요 케이스 보여줘</button>
            <button className="chip-btn" onClick={() => goAgent('backlog')}>개선 우선순위 알려줘</button>
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
              <div className="ai-acts"><button className="ai-pill-btn primary" onClick={() => goAgent('inbox')}>VOC 입력하러 가기</button><button className="ai-pill-btn" onClick={() => setRail('grid')}>전체메뉴</button></div>
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
                <div className="sub-l">개선 백로그 후보 (대응영역)</div>
                <ul className="mini-list">{topArea.map((it) => (
                  <li key={it.t}><span className="mini-t">{it.t}</span><span className="mini-n">{it.n.toLocaleString()}건</span></li>
                ))}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => goAgent('selfguide')}>셀프 가이드</button><button className="ai-pill-btn" onClick={() => goAgent('backlog')}>개선 백로그</button></div>
            </div>

            {/* 즐겨찾는 메뉴 */}
            <div className="hcard">
              <CardHead title="즐겨찾는 메뉴" onMore={() => setRail('grid')} />
              <div className="fav-grid">
                {[['inbox', 'VOC 입력'], ['board', '분류 보드'], ['trends', '추이'], ['detail', '케이스 처리'], ['insight', '인사이트'], ['selfguide', '셀프 가이드']].map(([k, l]) => (
                  <button key={k} className="fav-cell" onClick={() => goAgent(k)}>{l}</button>
                ))}
              </div>
              <AiBox q="자주 보는 화면을 홈에 더 추가해드릴까요?" acts={[{ label: '메뉴 편집', onClick: () => askDemo('즐겨찾기 편집') }]} />
            </div>

            {/* 오늘의 업무 (포털 데모) */}
            <div className="hcard">
              <CardHead title="오늘의 업무" sub="메일 · 일정 · 결재" />
              <div className="sub-block">
                <div className="sub-l">메일</div>
                <ul className="home-list">{[['VOC 주간 리포트 공유', 'CX기획팀 · 10:24'], ['앱스토어 평점 모니터링 알림', '운영봇 · 어제']].map(([t, m], i) => <li key={i}><span className="hl-t">{t}</span><span className="hl-m">{m}</span></li>)}</ul>
              </div>
              <div className="sub-block">
                <div className="sub-l">오늘 일정</div>
                <ul className="home-list">{[['10:00', 'VOC 분류 기준 리뷰'], ['14:00', '개선 백로그 우선순위 회의']].map(([tm, t], i) => <li key={i}><span className="hl-time">{tm}</span><span className="hl-t">{t}</span></li>)}</ul>
              </div>
              <div className="ai-acts"><button className="ai-pill-btn" onClick={() => setRail('mail')}>메일</button><button className="ai-pill-btn" onClick={() => setRail('cal')}>일정</button><button className="ai-pill-btn" onClick={() => setRail('pay')}>결재</button></div>
            </div>

          </div>
          )}
        </div>
      </section>
      {aiPanel}
    </div>
  )
}
function MailApp({ sentLog }) {
  const rows = [['VOC 주간 리포트 공유', 'CX기획팀', '오늘 10:24', true], ['[결재] 4월 개선 과제 승인 요청', '김형걸', '오늘 09:10', true], ['앱스토어 평점 모니터링 알림', '운영봇', '어제', false], ['셀프 가이드 콘텐츠 검수 요청', '디자인시스템스쿼드', '어제', false], ['장애/오류 급증 이상 감지 통보', 'VOC Agent', '2일 전', false]]
  const sentN = (sentLog || []).length
  return (
    <div className="screen portal-screen">
      <PageHead title="메일" sub="사내 메일 · VOC 발송 이력" />
      <DemoBanner>메일 목록은 예시이며,</DemoBanner>
      <div className="panel"><ul className="mail-list">{rows.map(([t, f, d, un], i) => (
        <li key={i} className={un ? 'unread' : ''}><span className="ml-dot" /><span className="ml-from">{f}</span><span className="ml-subj">{t}</span><span className="ml-date">{d}</span></li>
      ))}</ul></div>
      <h2 className="sec-title">발송 이력 <span className="sec-note">VOC Agent에서 발송한 메일·문자{sentN ? ` ${sentN}건` : ''} · 담당자/수신/내용/발송일</span></h2>
      <SentLogTable sentLog={sentLog} />
    </div>
  )
}
function CalendarApp() {
  const sch = [['10:00', '11:00', 'VOC 분류 기준 리뷰', 'CX기획'], ['14:00', '15:00', '개선 백로그 우선순위 회의', '디지털CX'], ['16:30', '17:00', '셀프 가이드 시나리오 점검', '디자인시스템']]
  return (
    <div className="screen portal-screen">
      <PageHead title="일정" sub="오늘 일정 · 데모" />
      <DemoBanner>일정은 예시이며,</DemoBanner>
      <div className="panel"><ul className="sched-list">{sch.map(([s, e, t, who], i) => (
        <li key={i}><span className="sc-time">{s}<small>–{e}</small></span><span className="sc-bar" /><span className="sc-body"><b>{t}</b><span className="muted">{who}</span></span></li>
      ))}</ul></div>
    </div>
  )
}
function OrgApp() {
  const teams = [['디지털CX', ['CX기획팀', '디자인시스템스쿼드', 'VOC운영팀']], ['MY서비스', ['MY서비스팀', '회원/로그인팀']], ['커머스', ['커머스팀', '멤버십팀']], ['AI', ['AI검색팀', 'Copilot TF']]]
  return (
    <div className="screen portal-screen">
      <PageHead title="조직도" sub="CX 디지털 조직 · 데모" />
      <DemoBanner>조직 정보는 예시이며,</DemoBanner>
      <div className="org-grid">{teams.map(([g, subs]) => (
        <div key={g} className="panel org-card"><div className="org-h">{g}</div><ul className="org-subs">{subs.map((s) => <li key={s}>{s}</li>)}</ul></div>
      ))}</div>
    </div>
  )
}
function ApprovalApp({ notify }) {
  const rows = [['4월 VOC 개선 과제 승인', '디자인시스템스쿼드', '대기'], ['셀프 가이드 콘텐츠 게시', 'VOC운영팀', '대기'], ['3월 VOC 리포트 결재', 'CX기획팀', '완료']]
  return (
    <div className="screen portal-screen">
      <PageHead title="결재" sub="결재 대기·이력 · 데모" />
      <DemoBanner>결재 항목은 예시이며,</DemoBanner>
      <div className="panel"><table className="vtable"><thead><tr><th>문서</th><th>상신</th><th>상태</th><th></th></tr></thead>
        <tbody>{rows.map(([t, who, st], i) => (
          <tr key={i}><td>{t}</td><td className="muted nowrap">{who}</td><td><span className={'appr ' + (st === '완료' ? 'appr-done' : 'appr-wait')}>{st}</span></td><td>{st === '대기' && <button className="btn btn-ghost sm" onClick={() => notify.toast('결재 승인 (데모)')}>승인</button>}</td></tr>
        ))}</tbody></table></div>
    </div>
  )
}
function AllMenu({ goAgent, setRail, notify }) {
  const [doc, setDoc] = useState(null) // null | 'architecture' | 'prompts'
  const apps = [['home', '통합 홈'], ['mail', '메일'], ['cal', '일정'], ['org', '조직도'], ['pay', '결재']]
  const agentScreens = [['trends', '기간별·영역별 추이'], ['inbox', 'VOC 수집·입력'], ['board', '분류 보드'], ['detail', '케이스 처리'], ['backlog', '개선 백로그'], ['insight', '인사이트 리포트'], ['selfguide', '셀프 해결 가이드']]
  const docs = [['architecture', '솔루션 구조', 'AS-IS / TO-BE · 처리 흐름 · 로드맵'], ['prompts', 'Copilot 프롬프트', 'VOC 분류·액션 재현 프롬프트']]
  if (doc) {
    return (
      <div className="screen portal-screen">
        <button className="btn btn-ghost sm back-btn" onClick={() => setDoc(null)}>← 전체메뉴</button>
        {doc === 'architecture' && <Architecture />}
        {doc === 'prompts' && <PromptTemplates notify={notify} />}
      </div>
    )
  }
  return (
    <div className="screen portal-screen">
      <PageHead title="전체메뉴" sub="업무 앱과 VOC Agent 메뉴 바로가기" />
      <h2 className="sec-title">업무 앱</h2>
      <div className="tile-row">{apps.map(([k, l]) => <button key={k} className="home-tile" onClick={() => setRail(k)}><span className="tile-ic"><RailIcon d={RAIL_ICONS[k]} /></span><span className="tile-l">{l}</span></button>)}</div>
      <h2 className="sec-title">VOC Agent</h2>
      <div className="menu-grid">{agentScreens.map(([k, l]) => <button key={k} className="menu-cell" onClick={() => goAgent(k)}>{l}</button>)}</div>
      <h2 className="sec-title">설계 · 도구 <span className="sec-note">솔루션 구조와 Copilot 프롬프트는 여기에서 확인합니다</span></h2>
      <div className="tile-row">{docs.map(([k, l, d]) => (
        <button key={k} className="home-tile" onClick={() => setDoc(k)}>
          <span className="tile-l">{l}</span><span className="tile-s">{d}</span>
        </button>
      ))}</div>
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
  trends: ['기간별·영역별 추이', 'VOC구분·대응영역 추이와 원문 검색'],
  backlog: ['개선 백로그', '우선순위 매긴 서비스 개선 과제'],
  selfguide: ['셀프 해결 가이드', '엔진② · 접수 전 셀프 해결 시나리오'],
  inbox: ['VOC 수집·입력', '수집 VOC 목록 · 직접 입력 분류'],
  board: ['분류 보드', '4그룹 게이트 + 22개 표준분류'],
  detail: ['케이스 처리', '케이스 분석 및 액션'],
  insight: ['인사이트 리포트', '개선 인사이트와 기대효과'],
}

export default function App() {
  const [authEmail, setAuthEmail] = useState(getSession)
  const [screen, setScreen] = useState('inbox')
  const [caseId, setCaseId] = useState('VOC-1001')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState({ open: false, title: '', body: '' })
  const [panelMode, setPanelMode] = useState('split') // 'split'(분할·기본) | 'collapsed'(Nav 전체) | 'expanded'(Agent 전체)
  const [railView, setRail] = useState('home') // 'home'|'agent'|'mail'|'cal'|'org'|'pay'|'grid'
  const [homeAi, setHomeAi] = useState(false) // 홈 우측: false=홈(컴팩트 패널) / true=AI 펼침 워크스페이스
  const [selected, setSelected] = useState([]) // 체크박스로 선택한 케이스 id (대시보드 ↔ Agent 패널 공유)
  const [added, setAdded] = useState(() => (sharedEnabled ? [] : loadAdded())) // 공유 모드면 서버에서, 아니면 localStorage에서
  const [sentLog, setSentLog] = useState(loadSent)
  const [shareState, setShareState] = useState(sharedEnabled ? 'connecting' : 'local') // 'connecting'|'online'|'error'|'local'
  const seededRef = useRef(false)
  const lastTsRef = useRef('')

  // 공유 모드: 서버에서 전체 로드 + 주기적 폴링으로 실시간 누적
  useEffect(() => {
    if (!sharedEnabled) return
    let cancelled = false
    const mergeIn = (recs) => {
      if (!recs || !recs.length) return
      const hy = hydrate(recs)
      setAdded((prev) => {
        const have = new Set(prev.map((v) => v.id))
        const fresh = hy.filter((v) => !have.has(v.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })
    }
    listAll().then(({ recs, lastTs }) => {
      if (cancelled) return
      lastTsRef.current = lastTs || ''
      setAdded(hydrate(recs))
      setShareState('online')
    }).catch(() => { if (!cancelled) setShareState('error') })
    const t = setInterval(() => {
      listSince(lastTsRef.current).then(({ recs, lastTs }) => {
        if (cancelled) return
        if (lastTs && lastTs > lastTsRef.current) lastTsRef.current = lastTs
        mergeIn(recs)
        setShareState('online')
      }).catch(() => { if (!cancelled) setShareState('error') })
    }, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // 로컬 모드: 내 localStorage가 비어 있으면 배포본 seed.json을 로드(공유 모드에선 사용 안 함)
  useEffect(() => {
    if (sharedEnabled || added.length) return
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((recs) => { if (!cancelled && Array.isArray(recs) && recs.length) { seededRef.current = true; setAdded(hydrate(recs)) } })
      .catch(() => { })
    return () => { cancelled = true }
  }, []) // 최초 1회
  useEffect(() => { saveSent(sentLog) }, [sentLog])
  const addSent = (e) => setSentLog((l) => [{ id: 'S' + Date.now(), date: new Date().toLocaleString('ko-KR'), ...e }, ...l])
  useEffect(() => {
    if (sharedEnabled) return // 공유 모드는 서버가 원본 — localStorage 저장 안 함
    if (seededRef.current) { seededRef.current = false; return } // 공유 seed 로드분은 저장하지 않음(개인 입력만 저장)
    const ok = saveAdded(added)
    if (!ok && added.length) setToast('브라우저 저장 한도를 초과해 일부가 저장되지 않았을 수 있습니다')
  }, [added])
  const notify = useMemo(() => ({
    toast: (m) => { setToast(m); window.clearTimeout(window.__t); window.__t = window.setTimeout(() => setToast(''), 2200) },
    modal: (title, body) => setModal({ open: true, title, body }),
  }), [])
  const openCase = (id) => { setRail('agent'); setCaseId(id); setScreen('detail'); setPanelMode((m) => m === 'collapsed' ? 'split' : m) }
  const goAgent = (s) => { setRail('agent'); if (s) setScreen(s) }
  // 공유 모드: 새 VOC를 서버에 적재(누적). 압축 레코드 배열을 받는다.
  const sharedInsert = (compactRecs) => { if (sharedEnabled) insertMany(compactRecs).catch(() => setToast('공유 저장소 적재 실패 — 네트워크를 확인하세요')) }
  const updateCases = (ids, patch) => setAdded((prev) => {
    const next = prev.map((v) => ids.includes(v.id) ? { ...v, ...patch } : v)
    if (sharedEnabled) { const changed = next.filter((v) => ids.includes(v.id)); insertMany(toCompact(changed), true).catch(() => { }) }
    return next
  })
  const [t] = TITLES[screen]
  const agentTitle = new Date().toISOString().slice(0, 10) + ' · 선제조치 Copilot'
  if (!authEmail) return <Login onAuthed={setAuthEmail} />
  return (
    <div className="app">
      <IconRail account={authEmail} onLogout={() => { setSession(''); setAuthEmail('') }} notify={notify} railView={railView} setRail={setRail} />
      {railView === 'agent' ? (
        <>
          <SubLNB screen={screen} setScreen={setScreen} />
          <div className={'workspace mode-' + panelMode}>
            <Topbar title={t} mode={panelMode} setMode={setPanelMode} agentTitle={agentTitle} shareState={shareState} />
            <div className="workbody">
              {panelMode !== 'expanded' && (
                <main className="main-nav">
                  <div className="content">
                    {screen === 'trends' && <VOCTrends added={added} />}
                    {screen === 'inbox' && <VOCInbox openCase={openCase} notify={notify} added={added} setAdded={setAdded} shared={sharedEnabled} sharedInsert={sharedInsert} clearShared={clearAll} />}
                    {screen === 'board' && <ClassificationBoard openCase={openCase} notify={notify} added={added} updateCases={updateCases} />}
                    {screen === 'detail' && <CaseDetail caseId={caseId} notify={notify} added={added} updateCases={updateCases} addSent={addSent} />}
                    {screen === 'insight' && <InsightReport added={added} />}
                    {screen === 'backlog' && <Backlog added={added} openCase={openCase} />}
                    {screen === 'selfguide' && <SelfGuide added={added} notify={notify} />}
                  </div>
                </main>
              )}
              {panelMode !== 'collapsed' && (
                <AgentPanel screen={screen} caseId={caseId} added={added} notify={notify} updateCases={updateCases} selected={selected} setSelected={setSelected} />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="workspace portal">
          <header className="portal-top">
            <div className="crumb">U+ Work<span className="crumb-sep">›</span><b>{PORTAL_TITLES[railView]}</b></div>
            <div className="pt-right">
              {railView === 'home' && (
                <div className="ai-toggle" role="tablist" aria-label="홈/AI 전환">
                  <button className={homeAi ? '' : 'on'} onClick={() => setHomeAi(false)}>홈</button>
                  <button className={homeAi ? 'on' : ''} onClick={() => setHomeAi(true)}>✦ AI</button>
                </div>
              )}
              <ShareBadge state={shareState} />
              <span className="ai-pill">● 통합 업무 · 데모</span>
            </div>
          </header>
          <main className={'portal-body' + (railView === 'home' ? ' home-body' : '')}>
            {railView === 'home' ? (
              <HomePortal account={authEmail} added={added} goAgent={goAgent} setRail={setRail} openCase={openCase} notify={notify} aiMode={homeAi} setAiMode={setHomeAi} />
            ) : (
              <div className="content">
                {railView === 'mail' && <MailApp sentLog={sentLog} />}
                {railView === 'cal' && <CalendarApp />}
                {railView === 'org' && <OrgApp />}
                {railView === 'pay' && <ApprovalApp notify={notify} />}
                {railView === 'grid' && <AllMenu goAgent={goAgent} setRail={setRail} notify={notify} />}
              </div>
            )}
          </main>
        </div>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
      <Modal open={modal.open} title={modal.title} body={modal.body} onClose={() => setModal({ open: false, title: '', body: '' })} />
    </div>
  )
}
