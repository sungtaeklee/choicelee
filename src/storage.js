import { enrichRow } from './classify.js'

/* ============================================================
   로컬 저장(재접속 유지) + 압축/복원
   파생 결과 전체가 아니라 입력 원본(채널·내용·실번호·일자·주차)만 저장하고,
   불러올 때 enrichRow로 다시 분류·생성한다. 용량을 줄이고, 분류기 개선 시 자동 반영.
   ============================================================ */
const LS_KEY = 'voc-action-copilot:added:v1'

// 압축 레코드 → 보강 레코드 (localStorage·seed.json 공통)
export function hydrate(recs) {
  if (!Array.isArray(recs)) return []
  return recs.map((r) => {
    const e = enrichRow({ channel: r.c, content: r.t, customer: r.n, date: r.d, week: r.w, occur: r.o }, r.id,
      { group: r.gr, cat: r.ct, area1: r.a1, area2: r.a2, severity: r.sv, status: r.s, owner: r.ow })
    const out = { ...e, jiraUrl: r.j || '', ownerNote: r.on || '' }
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
