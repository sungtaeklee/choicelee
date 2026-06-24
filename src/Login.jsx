import React, { useState } from 'react'
import { COMPANY_DOMAINS, COMPANY_CODE, hashPw, loadAccounts, saveAccounts, isCompanyEmail, setSession } from './auth.js'

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
        <div className="auth-brandlock"><span className="brand-mark lg">U+</span><span className="brand-lock"><b className="brand-svc lg">VOICE</b><span className="brand-desc">VOC Action Copilot</span></span></div>
        <p className="auth-tagline">고객의 목소리를 분석해, 실행 가능한 CX 개선 액션으로 연결하는 AI 서비스</p>
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
        <p className="auth-slogan">고객의 목소리가 서비스 개선으로 이어지는 순간, <b>U+ VOICE</b></p>
        <p className="auth-note">⚠ 시연용 접근 게이트입니다. 실제 사내 전용 운영에는 사내 SSO 연동 또는 사내망 한정 배포가 필요합니다.</p>
      </div>
    </div>
  )
}

/* ---------- App ---------- */

export default Login
