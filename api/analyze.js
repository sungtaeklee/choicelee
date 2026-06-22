/* ============================================================
   /api/analyze — VOC AI 심층 분석 (서버리스, 제공자 무관)
   - 브라우저가 같은 도메인의 이 함수를 호출 → 함수가 서버(Vercel)에서 LLM 호출.
     사내 Wi-Fi의 "브라우저 → api.anthropic.com" 차단 정책의 영향을 받지 않는다.
   - API 키는 클라이언트에 절대 노출하지 않고 Vercel 환경변수에서만 읽는다.
   - 제공자 전환은 코드 수정 없이 환경변수로:
       LLM_PROVIDER = 'anthropic' (기본) | 'azure'
     [anthropic]  ANTHROPIC_API_KEY, ANTHROPIC_MODEL(기본 claude-sonnet-4-6)
     [azure]      AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY,
                  AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION(기본 2024-08-01-preview)
   - 실패 시 { ok:false, error } 반환 → 클라이언트는 휴리스틱으로 폴백한다.
   ============================================================ */

const GROUPS = ['장애/오류', '성능', '개선 요청/희망', '단순 문의/불만/기타']
const CAT22 = [
  '네트워크/통신품질/와이파이', '인터넷·통신속도 불만', '앱·웹 이용문의', '요금제', '해지/약정/위약금',
  '가입/개통/결합', '부가서비스', '데이터(사용량/선물/충전)', '로밍', '유심/이심/IMSI',
  '단말/기기/액세서리', '멤버십/쿠폰/혜택/VIP콕', '설치/AS(홈상품)', 'IPTV/셋톱박스', '상담/고객지원',
  '매장/대리점', '회원/로그인/인증', '요금/청구/납부/환불', '휴대폰결제/소액결제',
  '유독/모바일TV/익시오/스마트홈', '배송', '검색/챗봇/AI', '기타',
]

/* 외부 반출 전 2차 PII 마스킹(방어적) — 전화/이메일/주민번호류 */
function maskPII(s) {
  return String(s || '')
    .replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, '010-****-****')
    .replace(/\b\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g, (m) => (m.replace(/\D/g, '').length >= 9 ? '***-****-****' : m))
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '***@***')
    .replace(/\b\d{6}[-\s]?[1-4]\d{6}\b/g, '******-*******')
}

const SYSTEM = `당신은 LG U+의 VOC(고객의 소리) 분석 전문가입니다. 한국어로 답합니다.
입력된 VOC 원문(상담 전사/메모/리뷰 등)을 분석해 아래 JSON 스키마로만 응답하세요. 설명·머리말·코드펜스 없이 순수 JSON 객체 하나만 출력합니다.

분류 규칙:
- "group"은 반드시 다음 중 하나: ${GROUPS.join(' / ')}
- "cat"은 가능하면 다음 표준분류 중 하나로: ${CAT22.join(', ')}
- 장애/성능/개선 그룹이면 cat은 해당 증상(예: 앱/웹 기능오류, 앱/웹 접속불가, 앱/웹 속도 느림, 앱/웹 기능 개선)으로.

JSON 스키마:
{
  "summary": "고객이 원하는 핵심을 한 문장으로(40자 내외, 인사말·군더더기 제외)",
  "rootCause": "추정되는 근본 원인 한 문장",
  "group": "위 group 중 하나",
  "cat": "표준분류 한 개",
  "reason": "그 분류로 본 근거를 짧게(감지된 신호 표현 포함)",
  "sentiment": "긍정|중립|부정",
  "urgency": "높음|보통|낮음",
  "customerReply": "고객에게 보낼 정중한 응대 초안 2~3문장",
  "smsDraft": "고객 문자/푸시용 1문장(90자 내외, '[U+]'로 시작)",
  "nextActions": ["내부 처리 단계 2~4개"]
}
원문에 정보가 부족하면 추정임을 reason에 표시하되 스키마는 반드시 채우세요.`

function buildUserPrompt({ content, channel, hintGroup, hintCat }) {
  const hint = (hintGroup || hintCat) ? `\n\n[참고: 키워드 기반 1차 분류 = ${hintGroup || '-'} / ${hintCat || '-'} (검증·정정 가능)]` : ''
  return `인입 채널: ${channel || '미상'}\nVOC 원문:\n"""\n${content}\n"""${hint}`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/* 일시 오류(429/5xx·네트워크) 시 잠깐 쉬었다 재시도 — 무료 등급의 순간 과부하(503) 흡수 */
async function fetchWithRetry(url, opts, label, retries = 1) {
  let last
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res
    try { res = await fetch(url, opts) }
    catch (e) { last = new Error(label + ' 네트워크 오류 ' + (e && e.message || e)); if (attempt < retries) { await sleep(1200 * (attempt + 1)); continue } throw last }
    if (res.ok) return res
    const status = res.status, text = (await res.text()).slice(0, 200)
    last = new Error(label + ' ' + status + ' ' + text)
    if ((status === 429 || status >= 500) && attempt < retries) { await sleep(1200 * (attempt + 1)); continue }
    throw last
  }
  throw last
}

async function callAnthropic({ system, user, signal }) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY 미설정')
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1536, system, messages: [{ role: 'user', content: user }] }),
  }, 'anthropic')
  const data = await res.json()
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
}

async function callAzure({ system, user, signal }) {
  const ep = process.env.AZURE_OPENAI_ENDPOINT, key = process.env.AZURE_OPENAI_KEY
  const dep = process.env.AZURE_OPENAI_DEPLOYMENT, ver = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview'
  if (!ep || !key || !dep) throw new Error('Azure OpenAI 환경변수 미설정')
  const url = `${String(ep).replace(/\/$/, '')}/openai/deployments/${dep}/chat/completions?api-version=${ver}`
  const res = await fetchWithRetry(url, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 1536, temperature: 0.2, response_format: { type: 'json_object' },
    }),
  }, 'azure')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

/* 범용 OpenAI 호환 — 무료 제공자 다수 지원(코드 수정 없이 환경변수만):
   Google Gemini  OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai  OPENAI_MODEL=gemini-2.5-flash
   Groq           OPENAI_BASE_URL=https://api.groq.com/openai/v1                            OPENAI_MODEL=llama-3.3-70b-versatile
   OpenRouter     OPENAI_BASE_URL=https://openrouter.ai/api/v1                              OPENAI_MODEL=google/gemini-flash-1.5:free
   Cerebras       OPENAI_BASE_URL=https://api.cerebras.ai/v1                                OPENAI_MODEL=llama-3.3-70b */
async function callOpenAICompat({ system, user, signal }) {
  const base = process.env.OPENAI_BASE_URL, key = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL
  if (!base || !key || !model) throw new Error('OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL 미설정')
  const url = `${String(base).replace(/\/$/, '')}/chat/completions`
  const res = await fetchWithRetry(url, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model, max_tokens: 1536, temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  }, 'openai-compat')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function tryParse(t) { try { return JSON.parse(t) } catch { return null } }
/* 잘린 JSON 복구: 열린 따옴표/괄호 닫고 trailing comma 제거 */
function repairJson(t) {
  let s = String(t)
  if (((s.match(/(?<!\\)"/g) || []).length) % 2 === 1) s += '"'
  const oa = (s.match(/\[/g) || []).length, ca = (s.match(/\]/g) || []).length
  const ob = (s.match(/\{/g) || []).length, cb = (s.match(/\}/g) || []).length
  s += ']'.repeat(Math.max(0, oa - ca)) + '}'.repeat(Math.max(0, ob - cb))
  return s.replace(/,\s*([}\]])/g, '$1')
}
function parseModelJson(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const i = t.indexOf('{'), j = t.lastIndexOf('}')
  if (i >= 0 && j > i) t = t.slice(i, j + 1)
  else if (i >= 0) t = t.slice(i)            // 닫힘 '}' 없음(잘림) → 시작부터 보존 후 복구
  let o = tryParse(t) || tryParse(repairJson(t))
  if (!o) {                                  // 그래도 실패 시 정규식으로 핵심 필드만 추출
    const get = (k) => { const m = t.match(new RegExp('"' + k + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')); return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ') : '' }
    o = { summary: get('summary'), rootCause: get('rootCause'), group: get('group'), cat: get('cat'), reason: get('reason'), sentiment: get('sentiment'), urgency: get('urgency'), customerReply: get('customerReply'), smsDraft: get('smsDraft'), nextActions: [] }
    if (!o.summary && !o.cat) throw new Error('JSON 파싱 실패(응답 형식 확인 필요)')
  }
  // 스키마 정규화 + 안전값
  const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt)
  return {
    summary: String(o.summary || '').slice(0, 120),
    rootCause: String(o.rootCause || '').slice(0, 200),
    group: oneOf(o.group, GROUPS, '단순 문의/불만/기타'),
    cat: String(o.cat || '기타').slice(0, 40),
    reason: String(o.reason || '').slice(0, 240),
    sentiment: oneOf(o.sentiment, ['긍정', '중립', '부정'], '중립'),
    urgency: oneOf(o.urgency, ['높음', '보통', '낮음'], '보통'),
    customerReply: String(o.customerReply || '').slice(0, 600),
    smsDraft: String(o.smsDraft || '').slice(0, 140),
    nextActions: Array.isArray(o.nextActions) ? o.nextActions.slice(0, 4).map((x) => String(x).slice(0, 120)) : [],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const content = maskPII(body.content || '').slice(0, 6000)
    if (!content.trim()) { res.status(400).json({ ok: false, error: '내용 없음' }); return }
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase()
    const system = SYSTEM
    const user = buildUserPrompt({ content, channel: body.channel, hintGroup: body.hintGroup, hintCat: body.hintCat })

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 25000)
    let raw
    try {
      raw = provider === 'azure'
        ? await callAzure({ system, user, signal: ctrl.signal })
        : provider === 'openai'
          ? await callOpenAICompat({ system, user, signal: ctrl.signal })
          : await callAnthropic({ system, user, signal: ctrl.signal })
    } finally { clearTimeout(timer) }

    const result = parseModelJson(raw)
    res.status(200).json({ ok: true, provider, result })
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e).slice(0, 300) })
  }
}
