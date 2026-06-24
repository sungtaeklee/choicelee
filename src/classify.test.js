import { describe, it, expect } from 'vitest'
import {
  norm, demoClassify, pick22, pickFixedCat, deriveSeverity, deriveSentiment,
  customerIssueText, parseTranscript, smartSummary, maskPII, cleanChannel,
  parsePaste, parseGrid, catToArea, actionNeeded, weekKey, toDay, recDay,
  enrichRow, GROUPS,
} from './classify.js'

/* ============================================================
   분류·파싱 순수 로직 회귀 테스트
   - 데모 분류기의 핵심 동작과, 리뷰에서 고친 버그(주차 정렬)를 고정한다.
   ============================================================ */

describe('norm', () => {
  it('공백·기호 제거 + 소문자화', () => {
    expect(norm('  로그인 (안돼요)! ')).toBe('로그인안돼요')
    expect(norm('Wi-Fi')).toBe('wifi')
  })
})

describe('demoClassify — 게이트 + 우선순위 규칙', () => {
  it('우선순위 도메인 신호가 장애 게이트보다 먼저 잡힌다 (로밍)', () => {
    const r = demoClassify('로밍이 안돼요')
    expect(r.group).toBe('단순 문의/불만/기타')
    expect(r.cat).toBe('로밍')
    expect(r.conf).toBe('높음')
  })
  it('장애 키워드 → 장애/오류 게이트', () => {
    const r = demoClassify('앱이 자꾸 튕겨요')
    expect(r.group).toBe('장애/오류')
    expect(r.mode).toBe('정형')
  })
  it('성능 키워드 중 "백화"는 백화 현상으로', () => {
    expect(demoClassify('화면이 백화돼요').cat).toBe('앱/웹 백화 현상')
    expect(demoClassify('앱이 너무 느려요').cat).toBe('앱/웹 속도 느림')
  })
  it('개선 요청 키워드 → 개선 그룹', () => {
    expect(demoClassify('이 기능 좀 개선해주세요').group).toBe('개선 요청/희망')
  })
  it('UX 개선 요청(폰트 확대·알림 설정)이 기타가 아닌 개선 그룹으로 분류된다', () => {
    const r1 = enrichRow({ channel: 'Call', content: '앱 글씨가 작아서 시니어가 쓰기 불편해요 크게 키워주세요' }, 'T-A')
    expect(r1.group).toBe('개선 요청/희망')
    expect(r1.cat).not.toBe('기타')
    const r2 = enrichRow({ channel: 'Call', content: '알림이 너무 많아요 유튜브 프리미엄 관련 알림만 끄게 해주세요' }, 'T-B')
    expect(r2.group).toBe('개선 요청/희망')
    expect(r2.cat).not.toBe('기타')
  })
  it('빈 입력 → null', () => {
    expect(demoClassify('   ')).toBeNull()
  })
})

describe('pick22 — 22분류 점수제', () => {
  it('고위험 신호어가 모이면 요금/청구로', () => {
    expect(pick22('위약금 환불 문의').cat).toBe('요금/청구/납부/환불')
  })
  it('매칭 없으면 기타 + 검토필요', () => {
    const r = pick22('zzzzz 알 수 없는 내용 qqqq')
    expect(r.cat).toBe('기타')
    expect(r.review).toBe(true)
  })
})

describe('pickFixedCat — 정형 그룹 세부분류', () => {
  it('장애 + 접속불가 → 앱/웹 접속불가', () => {
    expect(pickFixedCat('장애/오류', '앱 먹통이라 접속불가')).toBe('앱/웹 접속불가')
  })
  it('장애 + 로그인 → 로그인불가/로그인풀림', () => {
    expect(pickFixedCat('장애/오류', '로그인이 안됨')).toBe('로그인불가/로그인풀림')
  })
})

describe('deriveSeverity / deriveSentiment', () => {
  it('장애는 항상 High', () => {
    expect(deriveSeverity('장애/오류', '아무거나')).toBe('High')
  })
  it('고위험 신호어(환불 등)는 High로 승격', () => {
    expect(deriveSeverity('단순 문의/불만/기타', '중복결제 환불 요청')).toBe('High')
  })
  it('장애/성능 감성은 Negative', () => {
    expect(deriveSentiment('', '성능', '느림')).toBe('Negative')
  })
})

describe('parseTranscript / customerIssueText', () => {
  const t = '상담사: 안녕하세요 무엇을 도와드릴까요?\n고객: 로그인이 자꾸 풀려요\n고객: 재설치해도 똑같아요'
  it('화자 2명 이상이면 대화로 파싱', () => {
    const turns = parseTranscript(t)
    expect(turns).not.toBeNull()
    expect(turns.length).toBe(3)
  })
  it('고객 발화만 추출(상담사 인사말 제거)', () => {
    const issue = customerIssueText(t)
    expect(issue).toContain('로그인이 자꾸 풀려요')
    expect(issue).not.toContain('무엇을 도와드릴까요')
  })
  it('화자 없는 평문은 원문 그대로', () => {
    expect(customerIssueText('그냥 평범한 한 줄')).toBe('그냥 평범한 한 줄')
  })
})

describe('maskPII — 개인정보 마스킹', () => {
  it('휴대폰 번호 가운데 마스킹', () => {
    expect(maskPII('연락처 010-1234-5678')).toContain('010-****-5678')
  })
  it('이메일 마스킹', () => {
    expect(maskPII('test@lguplus.co.kr 로 회신')).toContain('***@***')
  })
  it('이름+님 마스킹', () => {
    expect(maskPII('김철수님 안녕하세요')).toContain('○○○님')
  })
})

describe('cleanChannel — 채널 정제', () => {
  it('알려진 채널은 보존', () => {
    expect(cleanChannel('Call')).toBe('Call')
  })
  it('문장/이메일 등 비채널값은 기타로', () => {
    expect(cleanChannel('고객님께 확인 후 회신드립니다')).toBe('기타')
  })
  it('빈 값은 미상', () => {
    expect(cleanChannel('')).toBe('미상')
  })
})

describe('parseGrid / parsePaste — 붙여넣기 파싱', () => {
  it('따옴표 안의 줄바꿈/탭을 셀로 보존', () => {
    const grid = parseGrid('a\t"여러\n줄\t셀"\tc')
    expect(grid[0]).toEqual(['a', '여러\n줄\t셀', 'c'])
  })
  it('헤더가 있으면 이름으로 열 매핑', () => {
    const tsv = '인입채널\t내용\nCall\t로그인이 안돼요'
    const rows = parsePaste(tsv)
    expect(rows.length).toBe(1)
    expect(rows[0].channel).toBe('Call')
    expect(rows[0].content).toBe('로그인이 안돼요')
  })
  it('내용이 없는 행은 제외', () => {
    expect(parsePaste('내용\n\n').length).toBe(0)
  })
})

describe('주차 정렬 (weekKey) — 리뷰에서 고친 버그', () => {
  it('4주차가 10주차보다 앞선다 (사전식이면 깨짐)', () => {
    const weeks = ['02월10주차', '02월4주차', '01월2주차']
    const sorted = [...weeks].sort((a, b) => weekKey(a) - weekKey(b))
    expect(sorted).toEqual(['01월2주차', '02월4주차', '02월10주차'])
  })
})

describe('toDay / recDay — 날짜 정규화', () => {
  it('YYYY.M.D → YYYY-MM-DD', () => {
    expect(toDay('2026.3.1')).toBe('2026-03-01')
    expect(toDay('')).toBe('')
  })
  it('recDay는 date 우선, 없으면 occur', () => {
    expect(recDay({ date: '', occur: '2026.5.9' })).toBe('2026-05-09')
  })
})

describe('actionNeeded — 조치 필요 판정', () => {
  it('단순 문의/불만/기타는 항상 제외', () => {
    expect(actionNeeded({ group: '단순 문의/불만/기타', status: '처리 필요', severity: 'High' })).toBe(false)
  })
  it('장애 + High + 처리 전 단계 → 조치 필요', () => {
    expect(actionNeeded({ group: '장애/오류', status: '분류 완료', severity: 'High', review: false })).toBe(true)
  })
  it('처리 완료 건은 제외', () => {
    expect(actionNeeded({ group: '장애/오류', status: '처리 완료', severity: 'High' })).toBe(false)
  })
})

describe('catToArea — 분류 → 대응영역 매핑', () => {
  it('알려진 분류는 매핑, 미지정은 기본값', () => {
    expect(catToArea('단순 문의/불만/기타', '로밍')).toEqual(['상품/스토어', '로밍'])
    expect(catToArea('단순 문의/불만/기타', '존재하지않는분류')).toEqual(['MY', '메뉴/GNB/위젯'])
  })
})

describe('enrichRow — 통합 보강', () => {
  it('채널+내용에서 전체 스키마를 생성', () => {
    const v = enrichRow({ channel: 'Call', content: '앱이 자꾸 튕겨요' }, 'T-1')
    expect(v.id).toBe('T-1')
    expect(GROUPS).toContain(v.group)
    expect(v.group).toBe('장애/오류')
    expect(v.severity).toBe('High')
    expect(v.answer).toBeTruthy()
    expect(v.sms.startsWith('[U+]')).toBe(true)
    expect(v.analysis.length).toBe(4)
  })
  it('ov(저장값)가 있으면 분류를 그대로 존중', () => {
    const v = enrichRow({ channel: 'Call', content: '아무 내용' }, 'T-2', { group: '성능', cat: '앱/웹 백화 현상' })
    expect(v.group).toBe('성능')
    expect(v.cat).toBe('앱/웹 백화 현상')
  })
  it('전화번호는 마스킹되어 저장', () => {
    const v = enrichRow({ channel: 'Call', content: '문의', customer: '010-1234-5678' }, 'T-3')
    expect(v.customer).toContain('****')
    expect(v.customerRaw).toBe('010-1234-5678')
  })
})
