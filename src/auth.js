/* ============================================================
   사내 전용 접근 (데모 게이트)
   ⚠ 백엔드가 없으므로 이건 시연용 게이트다. 진짜 접근 제어가 아니다(소스/스토리지로 우회 가능).
   실배포 시에는 사내 SSO 연동 또는 사내망/VPN 한정 배포가 필요하다.
   아래 두 상수를 실제 값으로 교체하세요.
   ============================================================ */
export const COMPANY_DOMAINS = ['lguplus.co.kr'] // 가입 허용 회사 이메일 도메인 (여러 개 가능)
export const COMPANY_CODE = 'UPLUS-CX-2026'      // 사내에 공유하는 가입 인증 코드(임시값 · 교체 권장)
const ACC_KEY = 'voc-action-copilot:accounts:v1'
const SESS_KEY = 'voc-action-copilot:session:v1'
export async function hashPw(pw, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export function loadAccounts() { try { return JSON.parse(localStorage.getItem(ACC_KEY)) || [] } catch { return [] } }
export function saveAccounts(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)) } catch { /* noop */ } }
export function isCompanyEmail(email) {
  const m = /^[^@\s]+@([^@\s]+)$/.exec(String(email).trim().toLowerCase())
  return !!m && COMPANY_DOMAINS.includes(m[1])
}
export function getSession() { try { return localStorage.getItem(SESS_KEY) || '' } catch { return '' } }
export function setSession(email) { try { email ? localStorage.setItem(SESS_KEY, email) : localStorage.removeItem(SESS_KEY) } catch { /* noop */ } }
