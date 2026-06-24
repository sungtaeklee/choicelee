/* ============================================================
   AI 심층 분석 (서버리스 /api/analyze 경유)
   브라우저 → 같은 도메인 함수 → 서버에서 LLM 호출(사내망 직접호출 차단 우회).
   결과는 케이스 id 기준 localStorage 캐시. 실패 시 호출부에서 휴리스틱으로 폴백.
   ============================================================ */
export const AI_URL = '/api/analyze'
export const AI_AUTO = false  // 무료 토큰 절약: 케이스를 열어도 자동 실행하지 않고, 검수자가 'AI 분석 실행'을 눌렀을 때만 호출. 자동으로 돌리려면 true.
const AI_CACHE_KEY = 'voc-action-copilot:ai:v1'
export function aiCacheGet(id) { try { return (JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}'))[id] || null } catch { return null } }
export function aiCacheSet(id, result) { try { const m = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}'); m[id] = result; localStorage.setItem(AI_CACHE_KEY, JSON.stringify(m)) } catch { } }
export async function analyzeCaseAI(c) {
  const res = await fetch(AI_URL, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: c.content, channel: c.channel, hintGroup: c.group, hintCat: c.cat }),
  })
  const data = await res.json().catch(() => ({ ok: false, error: '응답 파싱 실패(함수 미배포일 수 있음)' }))
  if (!data || !data.ok) throw new Error(((data && data.error) || 'AI 분석 실패') + (data && data.provider ? ` [provider=${data.provider}]` : ''))
  return data.result
}
