import { enrichRow } from './classify.js'

/* ============================================================
   로컬 저장(재접속 유지) + 압축/복원
   파생 결과 전체가 아니라 입력 원본(채널·내용·실번호·일자·주차)만 저장하고,
   불러올 때 enrichRow로 다시 분류·생성한다. 용량을 줄이고, 분류기 개선 시 자동 반영.
   ============================================================ */
const LS_KEY = 'voc-action-copilot:added:v1'
const LS_ATTACH = 'voc-action-copilot:attach:v1'

/* 첨부(이미지/영상)는 용량이 커서 메인 레코드와 분리 저장 (케이스 id → [{name,type,dataUrl}]) */
function loadAttachMap() { try { return JSON.parse(localStorage.getItem(LS_ATTACH) || '{}') } catch { return {} } }
export function saveAttach(id, list) {
  try {
    const map = loadAttachMap()
    if (list && list.length) map[id] = list; else delete map[id]
    localStorage.setItem(LS_ATTACH, JSON.stringify(map))
    return true
  } catch { return false } // 저장 한도 초과 등 → 세션에는 남고 영속만 실패
}

// 압축 레코드 → 보강 레코드 (localStorage·seed.json 공통)
export function hydrate(recs) {
  if (!Array.isArray(recs)) return []
  const attach = loadAttachMap()
  return recs.map((r) => {
    const e = enrichRow({ channel: r.c, content: r.t, customer: r.n, date: r.d, week: r.w, occur: r.o }, r.id,
      { group: r.gr, cat: r.ct, area1: r.a1, area2: r.a2, severity: r.sv, status: r.s, owner: r.ow })
    const out = { ...e, jiraUrl: r.j || '', ownerNote: r.on || '', activity: Array.isArray(r.ac) ? r.ac : [], checklist: Array.isArray(r.ck) ? r.ck : null, links: Array.isArray(r.lk) ? r.lk : [], attachments: attach[r.id] || [] }
    if (Array.isArray(r.lb)) out.labels = r.lb
    if (r.rp != null) out.reporter = r.rp
    if (Array.isArray(r.wt)) out.watchers = r.wt
    // 지라 세부 필드
    if (r.rm != null) out.relatedMenu = r.rm
    if (r.et != null) out.errorType = r.et
    if (r.rl != null) out.resolveLevel = r.rl
    if (r.br != null) out.bugResult = r.br
    if (Array.isArray(r.ef)) out.effort = { plan: r.ef[0] || '', design: r.ef[1] || '', pub: r.ef[2] || '', dev: r.ef[3] || '' }
    if (r.ds != null) out.devStart = r.ds
    if (r.de != null) out.devEnd = r.de
    if (r.dp != null) out.deployEnd = r.dp
    if (r.im) {  // 사내 에이전트 등록 건: 에이전트 응대문 그대로 복원(템플릿 재생성 대신)
      out.imported = true
      if (r.aw) out.answer = r.aw
      if (r.pm) out.sms = r.pm
      if (r.mt || r.mb) out.mail = { to: (e.mail && e.mail.to) || e.org || '', subject: r.mt || '', body: r.mb || '' }
    }
    return out
  })
}
// 보강 레코드 → 압축 레코드 (저장·내보내기 공통)
export function toCompact(arr) {
  return (arr || []).map((v) => {
    const r = { id: v.id, c: v.channel, t: v.content, n: v.customerRaw || '', d: v.date || '', w: v.week || '', o: v.occur || '', s: v.status, ow: v.owner, j: v.jiraUrl || '', on: v.ownerNote || '', gr: v.group, ct: v.cat, a1: v.area1, a2: v.area2, sv: v.severity }
    if (v.activity && v.activity.length) r.ac = v.activity.slice(-30) // 활동 타임라인(최근 30개만 저장 — 용량 보호)
    if (v.checklist && v.checklist.length) r.ck = v.checklist          // 처리 체크리스트(사용자가 만진 경우만 저장)
    if (v.links && v.links.length) r.lk = v.links                      // 첨부/링크
    if (v.labels && v.labels.length) r.lb = v.labels                   // 레이블
    if (v.reporter) r.rp = v.reporter                                  // 보고자
    if (v.watchers && v.watchers.length) r.wt = v.watchers             // 참조자(watchers)
    // 지라 세부 필드 (값 있을 때만 저장)
    if (v.relatedMenu) r.rm = v.relatedMenu
    if (v.errorType) r.et = v.errorType
    if (v.resolveLevel) r.rl = v.resolveLevel
    if (v.bugResult) r.br = v.bugResult
    if (v.effort && (v.effort.plan || v.effort.design || v.effort.pub || v.effort.dev)) r.ef = [v.effort.plan || '', v.effort.design || '', v.effort.pub || '', v.effort.dev || '']
    if (v.devStart) r.ds = v.devStart
    if (v.devEnd) r.de = v.devEnd
    if (v.deployEnd) r.dp = v.deployEnd
    if (v.imported) { r.im = 1; r.aw = v.answer || ''; r.pm = v.sms || ''; r.mt = (v.mail && v.mail.subject) || ''; r.mb = (v.mail && v.mail.body) || '' }
    return r
  })
}
export function loadAdded() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY)
    if (!raw) return []
    return hydrate(JSON.parse(raw))
  } catch { return [] }
}
export function saveAdded(arr) {
  try {
    if (typeof localStorage === 'undefined') return true
    if (!arr.length) { localStorage.removeItem(LS_KEY); return true }
    localStorage.setItem(LS_KEY, JSON.stringify(toCompact(arr)))
    return true
  } catch { return false } // 저장 한도 초과 등
}
const LS_SENT = 'voc-action-copilot:sent:v1'
export function loadSent() { try { return JSON.parse(localStorage.getItem(LS_SENT) || '[]') } catch { return [] } }
export function saveSent(l) { try { localStorage.setItem(LS_SENT, JSON.stringify((l || []).slice(0, 500))) } catch { } }

/* 알림(담당 배정·멘션·참조자 추가 등) — 화면 우상단 벨에 표시. 단일 사용자 데모라 받은 알림 피드로 보관 */
const LS_NOTIF = 'voc-action-copilot:notif:v1'
export function loadNotifs() { try { return JSON.parse(localStorage.getItem(LS_NOTIF) || '[]') } catch { return [] } }
export function saveNotifs(l) { try { localStorage.setItem(LS_NOTIF, JSON.stringify((l || []).slice(0, 200))) } catch { } }
