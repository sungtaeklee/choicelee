/* ============================================================
   VOC 케이스 → 사내 Jira 티켓 형식 JSON (추출/자동생성 연동용)
   표준 필드 + customFields(이름 키 — 사내 Jira 커스텀필드 ID로 매핑).
   보드 일괄 추출 / 상세 단건 추출 공통 사용.
   ============================================================ */
export function buildJiraIssue(c) {
  const eff = c.effort || {}
  const description = [
    '■ 고객정보 (휴대폰번호/청구계정번호/명의자명/사업자고객여부)',
    `  - ${c.customer || '(마스킹)'}`,
    '■ 발생일시(일자/시간)',
    `  - ${c.occur || c.date || '미상'}`,
    '■ 고객문의 및 확인요청 사항',
    `  - ${c.content || c.summary || ''}`,
    '■ 고객 이용 채널',
    `  - ${c.channel || '미상'}`,
    '■ 핵심 의도',
    `  - ${c.summary || ''}`,
  ].join('\n')
  return {
    key: c.id,
    fields: {
      summary: `${c.cat}${c.summary ? ' — ' + c.summary.slice(0, 40) : ''}_${c.id}`,
      issuetype: '버그(VOC)',
      status: c.status,
      priority: c.severity,
      labels: c.labels || [],
      components: [c.area1].filter(Boolean),
      assignee: c.owner || '',
      reporter: c.reporter || '',
      watchers: c.watchers || [],
      description,
      customFields: {
        'VOC구분': c.group, '표준분류': c.cat, '대응영역': `${c.area1} › ${c.area2}`,
        '관련메뉴': c.relatedMenu || '', '오류타입': c.errorType || '', '처리가능단계': c.resolveLevel || '',
        '기획 실공수(Day)': eff.plan || '', '디자인 실공수(Day)': eff.design || '', '퍼블리싱 실공수(Day)': eff.pub || '', '개발 실공수(Day)': eff.dev || '',
        'BUG 처리 결과': c.bugResult || '', '개발 착수일자': c.devStart || '', '개발 완료일자': c.devEnd || '', '배포 완료일자': c.deployEnd || '',
        '감성': c.sentiment, '신뢰도': c.conf, '검토필요': c.review ? 'Y' : 'N',
      },
      comments: (c.activity || []).filter((a) => a.kind === 'comment' || a.kind === 'status').map((a) => ({ author: a.who, created: a.t, body: a.text })),
      links: (c.links || []).map((l) => l.url),
    },
  }
}

/* VOC 케이스 배열 → Jira "CSV 가져오기"용 CSV (Power Automate 없이 Jira Import로 일괄 생성)
   - 표준 필드 + 커스텀필드를 컬럼으로 평면화. Jira 가져오기 마법사에서 컬럼↔필드 매핑 1회. */
export function toJiraCsv(cases) {
  const cols = ['Summary', 'Issue Type', 'Priority', 'Status', 'Labels', 'Assignee', 'Reporter', 'Components', 'Description',
    'VOC구분', '표준분류', '대응영역', '관련메뉴', '오류타입', '처리가능단계',
    '기획 실공수(Day)', '디자인 실공수(Day)', '퍼블리싱 실공수(Day)', '개발 실공수(Day)',
    'BUG 처리 결과', '개발 착수일자', '개발 완료일자', '배포 완료일자']
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const rows = (cases || []).map((c) => {
    const j = buildJiraIssue(c).fields, cf = j.customFields
    return [j.summary, j.issuetype, j.priority, j.status, (j.labels || []).join(' '), j.assignee, j.reporter, (j.components || []).join(' '), j.description,
      cf['VOC구분'], cf['표준분류'], cf['대응영역'], cf['관련메뉴'], cf['오류타입'], cf['처리가능단계'],
      cf['기획 실공수(Day)'], cf['디자인 실공수(Day)'], cf['퍼블리싱 실공수(Day)'], cf['개발 실공수(Day)'],
      cf['BUG 처리 결과'], cf['개발 착수일자'], cf['개발 완료일자'], cf['배포 완료일자']].map(esc).join(',')
  })
  return [cols.map(esc).join(','), ...rows].join('\r\n')
}
export function exportCsv(text, filename) {
  try {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }) // BOM: 한글 깨짐 방지
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch { /* noop */ }
}

/* 사내 Jira 프로젝트 인입 메일 주소 (Jira 관리자: 메일 핸들러 1회 설정 시 메일→이슈 자동 생성)
   설정 우선순위: 앱에서 입력한 값(localStorage) → 배포 환경변수(VITE_JIRA_INTAKE_EMAIL) → 기본 placeholder */
export const JIRA_INTAKE_PLACEHOLDER = 'jira-voc@your-domain.atlassian.net'
const LS_JIRA = 'voc-action-copilot:jiraEmail'
export function jiraIntakeEmail() {
  try { const o = localStorage.getItem(LS_JIRA); if (o && o.trim()) return o.trim() } catch { /* noop */ }
  try { if (import.meta && import.meta.env && import.meta.env.VITE_JIRA_INTAKE_EMAIL) return import.meta.env.VITE_JIRA_INTAKE_EMAIL } catch { /* noop */ }
  return JIRA_INTAKE_PLACEHOLDER
}
export function setJiraIntakeEmail(v) { try { v ? localStorage.setItem(LS_JIRA, v) : localStorage.removeItem(LS_JIRA) } catch { /* noop */ } }

/* 사내 Jira 인스턴스(베이스 URL·프로젝트) — 실제: lgdigitalcommerce.atlassian.net / 프로젝트 VOC.
   설정 우선순위: 앱 입력값 → 환경변수(VITE_JIRA_BASE) → 기본값. */
export const JIRA_BASE_DEFAULT = 'https://lgdigitalcommerce.atlassian.net'
export const JIRA_PROJECT = 'VOC'
const LS_JIRABASE = 'voc-action-copilot:jiraBase'
export function jiraBase() {
  try { const o = localStorage.getItem(LS_JIRABASE); if (o && o.trim()) return o.trim().replace(/\/$/, '') } catch { /* noop */ }
  try { if (import.meta && import.meta.env && import.meta.env.VITE_JIRA_BASE) return String(import.meta.env.VITE_JIRA_BASE).replace(/\/$/, '') } catch { /* noop */ }
  return JIRA_BASE_DEFAULT
}
export function setJiraBase(v) { try { v ? localStorage.setItem(LS_JIRABASE, v) : localStorage.removeItem(LS_JIRABASE) } catch { /* noop */ } }
export const jiraBrowseUrl = (key) => `${jiraBase()}/browse/${key}`

/* 내부망 연결 테스트 — 브라우저에서 직접 점검.
   ① 네트워크 도달(no-cors: 응답만 오면 성공, 차단이면 실패) ② REST 직접호출 가능 여부(CORS).
   브라우저는 보안상 atlassian.net REST를 교차출처로 못 읽는 게 정상(=서버 프록시 필요)이므로,
   reachable=true & corsOk=false 면 '망은 열렸고, 실시간 API는 서버 프록시로 연동'이 결론. */
export async function testJiraConn(timeoutMs = 7000) {
  const base = jiraBase()
  const out = { base, reachable: false, corsOk: false, status: 0, note: '' }
  const withTimeout = (p, ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return [c.signal, () => clearTimeout(t)] }
  try {
    const [signal, clear] = withTimeout(null, timeoutMs)
    await fetch(`${base}/favicon.ico?cb=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal })
    clear(); out.reachable = true
  } catch (e) { out.note = '네트워크 도달 불가 — 내부망/방화벽에서 ' + base + ' 아웃바운드가 막혀 있을 수 있습니다.'; return out }
  try {
    const [signal, clear] = withTimeout(null, timeoutMs)
    const res = await fetch(`${base}/rest/api/3/serverInfo`, { cache: 'no-store', signal })
    clear(); out.status = res.status; out.corsOk = true
    out.note = '브라우저에서 REST 직접호출까지 가능(CORS 허용). 단, 인증 토큰은 서버에만 두세요.'
  } catch {
    out.corsOk = false
    out.note = '망은 열렸지만 브라우저 REST 직접호출은 CORS로 차단(정상). 실시간 API는 서버 프록시(/api)로 연동하세요. CSV 가져오기·메일 등록은 그대로 사용 가능.'
  }
  return out
}
/* VOC 케이스 → Jira 메일 등록용 mailto (메일 클라이언트가 제목·본문 채워 열림 → 발송하면 이슈 생성) */
export function jiraMailto(c) {
  const j = buildJiraIssue(c).fields, cf = j.customFields
  const body = [
    j.description, '',
    `[VOC구분] ${cf['VOC구분']} / ${cf['표준분류']}`,
    `[대응영역] ${cf['대응영역']}`,
    `[심각도] ${j.priority}  [담당자] ${j.assignee}  [보고자] ${j.reporter}`,
    `[레이블] ${(j.labels || []).join(', ')}`,
    `[관련메뉴] ${cf['관련메뉴']}  [오류타입] ${cf['오류타입']}`,
    `[원본 VOC ID] ${c.id}`,
  ].join('\n')
  return `mailto:${jiraIntakeEmail()}?subject=${encodeURIComponent(j.summary)}&body=${encodeURIComponent(body)}`
}

/* 서버 프록시(/api/jira) 호출 — 토큰은 서버에만. action: ping|meta|create|search */
export async function jiraApi(action, payload = {}) {
  try {
    const res = await fetch('/api/jira', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
    if (!res.ok) return { ok: false, error: `프록시 응답 ${res.status} — 배포 환경에서만 동작(/api 서버리스)` }
    return await res.json()
  } catch (e) { return { ok: false, error: '프록시 호출 실패 — 로컬(vite)에선 /api가 없을 수 있어요. 배포본에서 확인하세요.' } }
}
/* VOC 케이스 → 사내 Jira 이슈 생성(API) */
export async function createJiraTicket(c) {
  const j = buildJiraIssue(c).fields
  return jiraApi('create', { summary: j.summary, description: j.description, labels: j.labels })
}

/* 문자열 → 클립보드 복사 + 파일 다운로드 (둘 다 시도, 실패해도 무해) */
export function exportJson(obj, filename) {
  const json = JSON.stringify(obj, null, 2)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).catch(() => { })
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch { /* noop */ }
  return json
}
