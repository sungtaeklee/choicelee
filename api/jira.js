/* ============================================================
   /api/jira — 사내 Jira(Cloud) 서버 프록시
   - 브라우저는 같은 도메인의 이 함수만 호출 → 함수가 서버(Vercel)에서 Jira REST 호출.
     (브라우저 → atlassian.net 직접호출은 CORS로 막히므로 서버 프록시로 우회)
   - API 토큰은 클라이언트에 절대 노출하지 않고 Vercel 환경변수에서만 읽는다.
   필요 환경변수:
     JIRA_BASE      = https://lgdigitalcommerce.atlassian.net  (기본값)
     JIRA_EMAIL     = 봇/담당 계정 이메일
     JIRA_API_TOKEN = Atlassian API 토큰 (id.atlassian.com/manage-profile/security/api-tokens)
     JIRA_PROJECT   = VOC  (기본값)
     JIRA_ISSUETYPE = 이슈 타입 이름 (기본 'Task' — 프로젝트에 맞게: 작업/버그 등)
   actions(POST body.action): 'ping' | 'meta' | 'create' | 'search'
   ============================================================ */
const ENV = (k, d = '') => (process.env[k] || d)
const base = () => ENV('JIRA_BASE', 'https://lgdigitalcommerce.atlassian.net').replace(/\/$/, '')
const project = () => ENV('JIRA_PROJECT', 'VOC')

function authHeader() {
  const email = ENV('JIRA_EMAIL'), token = ENV('JIRA_API_TOKEN')
  if (!email || !token) return null
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

async function jira(path, { method = 'GET', body, signal } = {}) {
  const auth = authHeader()
  if (!auth) throw new Error('서버에 JIRA_EMAIL / JIRA_API_TOKEN 환경변수가 설정되지 않았습니다')
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  const text = await res.text()
  let data; try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text.slice(0, 300) } }
  if (!res.ok) { const e = new Error(`Jira ${res.status}: ${(data.errorMessages || []).join(' ') || JSON.stringify(data.errors || data).slice(0, 200)}`); e.status = res.status; throw e }
  return data
}

// 평문(여러 줄) → Atlassian Document Format(ADF) — v3 description 형식
function toADF(text) {
  const lines = String(text || '').split('\n')
  return { type: 'doc', version: 1, content: lines.map((l) => ({ type: 'paragraph', content: l ? [{ type: 'text', text: l }] : [] })) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return }
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const action = body.action || 'ping'
    if (action === 'ping') {
      const me = await jira('/rest/api/3/myself', { signal: ctrl.signal })
      res.status(200).json({ ok: true, base: base(), project: project(), me: { accountId: me.accountId, displayName: me.displayName, email: me.emailAddress } })
    } else if (action === 'meta') {
      const meta = await jira(`/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(project())}&expand=projects.issuetypes.fields`, { signal: ctrl.signal })
      const proj = (meta.projects || [])[0] || {}
      res.status(200).json({ ok: true, project: proj.key, issueTypes: (proj.issuetypes || []).map((it) => it.name) })
    } else if (action === 'create') {
      const { summary, description, labels, issueType } = body
      if (!summary) { res.status(400).json({ ok: false, error: 'summary 필요' }); return }
      const fields = {
        project: { key: project() },
        summary: String(summary).slice(0, 250),
        issuetype: { name: issueType || ENV('JIRA_ISSUETYPE', 'Task') },
        description: toADF(description || summary),
      }
      if (Array.isArray(labels) && labels.length) fields.labels = labels.map((l) => String(l).replace(/\s+/g, '_')).slice(0, 20)
      const created = await jira('/rest/api/3/issue', { method: 'POST', body: { fields }, signal: ctrl.signal })
      res.status(200).json({ ok: true, key: created.key, url: `${base()}/browse/${created.key}` })
    } else if (action === 'search') {
      const jql = body.jql || `project = ${project()} ORDER BY created DESC`
      const r = await jira(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${Math.min(50, body.max || 20)}&fields=summary,status,assignee`, { signal: ctrl.signal })
      res.status(200).json({ ok: true, total: r.total, issues: (r.issues || []).map((i) => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name, assignee: i.fields?.assignee?.displayName, url: `${base()}/browse/${i.key}` })) })
    } else {
      res.status(400).json({ ok: false, error: '알 수 없는 action: ' + action })
    }
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e).slice(0, 300) })
  } finally { clearTimeout(timer) }
}
