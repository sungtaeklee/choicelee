/* ============================================================
   공유 저장소 (실시간 누적) — Supabase REST + 폴링
   - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 있으면 "공유 모드"로 동작.
   - 없으면 sharedEnabled=false → 앱은 로컬(localStorage+seed.json)로 폴백.
   - 의존성 없음(fetch만 사용). 웹소켓 대신 폴링이라 제한적 사내망에서도 통과 가능성이 높다.
   테이블 스키마(한 번만):
     create table voc_records ( id text primary key, rec jsonb not null, created_at timestamptz default now() );
     alter table voc_records disable row level security;   -- 데모용(공개). 운영에선 정책으로 대체.
   ============================================================ */
const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const sharedEnabled = !!(URL && KEY)
const TABLE = import.meta.env.VITE_SUPABASE_TABLE || 'voc_records'
const base = sharedEnabled ? `${String(URL).replace(/\/$/, '')}/rest/v1/${TABLE}` : ''
const headers = sharedEnabled ? { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } : {}

// 전체 목록 → { recs:[압축], lastTs }
export async function listAll() {
  const res = await fetch(`${base}?select=rec,created_at&order=created_at.asc`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error('list ' + res.status)
  const rows = await res.json()
  return rowsToResult(rows)
}
// 특정 시각 이후 → { recs, lastTs }
export async function listSince(ts) {
  if (!ts) return listAll()
  const res = await fetch(`${base}?select=rec,created_at&created_at=gte.${encodeURIComponent(ts)}&order=created_at.asc`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error('listSince ' + res.status)
  return rowsToResult(await res.json())
}
function rowsToResult(rows) {
  const recs = (rows || []).map((r) => r.rec).filter(Boolean)
  let lastTs = ''
  for (const r of rows || []) { if (r.created_at && r.created_at > lastTs) lastTs = r.created_at }
  return { recs, lastTs }
}
// 압축 레코드 배열 저장. merge=true면 같은 id 갱신(상태/담당/활동 편집 반영), 아니면 중복 무시.
// ★ merge(수정) 시 created_at을 현재 시각으로 갱신 — 수정은 default now()가 안 바뀌므로 직접 세팅.
//   그래야 listSince(created_at 기준)가 수정분을 다시 돌려줘 다른 사용자에게 실시간 반영된다.
export async function insertMany(compactRecs, merge = false) {
  if (!compactRecs || !compactRecs.length) return
  const nowTs = merge ? new Date().toISOString() : null
  const body = compactRecs.map((r) => (nowTs ? { id: r.id, rec: r, created_at: nowTs } : { id: r.id, rec: r }))
  const res = await fetch(`${base}?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: `return=minimal,resolution=${merge ? 'merge-duplicates' : 'ignore-duplicates'}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('insert ' + res.status)
}
// 공유 데이터 전체 삭제(데모 초기화용)
export async function clearAll() {
  const res = await fetch(`${base}?id=neq.__none__`, { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } })
  if (!res.ok) throw new Error('clear ' + res.status)
}
