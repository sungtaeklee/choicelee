import React, { useState, useMemo, useEffect, useRef } from 'react'
import { sharedEnabled, listAll, listSince, insertMany, clearAll } from './shared.js'
import { hydrate, toCompact, loadAdded, saveAdded, loadSent, saveSent } from './storage.js'
import { VOCS, Toast, Modal, ShareBadge } from './ui.jsx'
import VOCTrends from './screens/VOCTrends.jsx'
import VOCInbox from './screens/VOCInbox.jsx'
import CaseDetail from './screens/CaseDetail.jsx'
import InsightReport from './screens/InsightReport.jsx'
import ClassificationBoard from './screens/ClassificationBoard.jsx'
import HomePortal from './screens/HomePortal.jsx'
import ImportResult from './screens/ImportResult.jsx'
import SelfGuide from './screens/SelfGuide.jsx'
import AllMenu from './screens/Solution.jsx'
import IconRail from './shell/IconRail.jsx'
import SubLNB from './shell/SubLNB.jsx'
import Topbar from './shell/Topbar.jsx'
import AgentPanel from './shell/AgentPanel.jsx'
import MailApp from './portal/MailApp.jsx'
import CalendarApp from './portal/CalendarApp.jsx'
import OrgApp from './portal/OrgApp.jsx'
import ApprovalApp from './portal/ApprovalApp.jsx'
import Login from './Login.jsx'
import AutoDemo from './AutoDemo.jsx'
import { getSession, setSession } from './auth.js'

/* ============================================================
   U+ VOICE · VOC Action Copilot — 공모전 MVP (정적 프로토타입 · React)
   VOC Orchestration & Insight-driven CX Engine
   채널 수집 + 화면 직접 입력. 샘플은 하드코딩(입력분은 useState).
   분류표: depth1 4그룹(정형 3 + 열림 1) + 열림 그룹의 표준분류 22개.
   ============================================================ */

const PORTAL_TITLES = { home: '통합 홈', mail: '메일', cal: '일정', org: '조직도', pay: '결재', grid: '솔루션 설명' }
const TITLES = {
  trends: ['기간별·영역별 추이', 'VOC구분·대응영역 추이와 원문 검색'],
  backlog: ['개선 백로그', '우선순위 매긴 서비스 개선 과제'],
  selfguide: ['셀프 해결 가이드', '엔진② · 접수 전 셀프 해결 시나리오'],
  inbox: ['VOC 수집·입력', '수집 VOC 목록 · 직접 입력 분류'],
  board: ['VOC 보드', '티켓을 보고·판단·처리하는 작업 보드'],
  detail: ['VOC 처리', '케이스 분석 및 액션'],
  insight: ['인사이트 리포트', '개선 인사이트와 기대효과'],
  import: ['VOC 결과 불러오기', '사내 에이전트 JSON → 카드'],
}

/* ---------- 자동 시연 (심사용): 화면 자동 이동 + 음성(브라우저 TTS) + 자막 ---------- */
export default function App() {
  const [authEmail, setAuthEmail] = useState(getSession)
  const [screen, setScreen] = useState('inbox')
  const [caseId, setCaseId] = useState('VOC-1001')
  const [toast, setToast] = useState('')
  const [toastAction, setToastAction] = useState(null) // 토스트의 실행취소 버튼 {label, onClick}
  const [modal, setModal] = useState({ open: false, title: '', body: '' })
  const [panelMode, setPanelMode] = useState('split') // 'split'(분할·기본) | 'collapsed'(Nav 전체) | 'expanded'(Agent 전체)
  const [railView, setRail] = useState('home') // 'home'|'agent'|'mail'|'cal'|'org'|'pay'|'grid'
  const [homeAi, setHomeAi] = useState(false) // 홈 우측: false=홈(컴팩트 패널) / true=AI 펼침 워크스페이스
  const [selected, setSelected] = useState([]) // 체크박스로 선택한 케이스 id (대시보드 ↔ Agent 패널 공유)
  const [added, setAdded] = useState(() => (sharedEnabled ? [] : loadAdded())) // 공유 모드면 서버에서, 아니면 localStorage에서
  const [sentLog, setSentLog] = useState(loadSent)
  const [shareState, setShareState] = useState(sharedEnabled ? 'connecting' : 'local') // 'connecting'|'online'|'error'|'local'
  const [showShared, setShowShared] = useState(false) // 공유 저장소 도구 모달 (상단바에서 열기)
  const [solDoc, setSolDoc] = useState('architecture') // 솔루션 설명 탭 (자동 시연이 제어)
  const [demo, setDemo] = useState(false) // 자동 시연 실행 여부
  const seededRef = useRef(false)
  const lastTsRef = useRef('')

  // 공유 모드: 서버에서 전체 로드 + 주기적 폴링으로 실시간 누적
  useEffect(() => {
    if (!sharedEnabled) return
    let cancelled = false
    const mergeIn = (recs) => {
      if (!recs || !recs.length) return
      const hy = hydrate(recs)
      setAdded((prev) => {
        const have = new Set(prev.map((v) => v.id))
        const fresh = hy.filter((v) => !have.has(v.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })
    }
    listAll().then(({ recs, lastTs }) => {
      if (cancelled) return
      lastTsRef.current = lastTs || ''
      setAdded(hydrate(recs))
      setShareState('online')
    }).catch(() => { if (!cancelled) setShareState('error') })
    const t = setInterval(() => {
      listSince(lastTsRef.current).then(({ recs, lastTs }) => {
        if (cancelled) return
        if (lastTs && lastTs > lastTsRef.current) lastTsRef.current = lastTs
        mergeIn(recs)
        setShareState('online')
      }).catch(() => { if (!cancelled) setShareState('error') })
    }, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // 로컬 모드: 내 localStorage가 비어 있으면 배포본 seed.json을 로드(공유 모드에선 사용 안 함)
  useEffect(() => {
    if (sharedEnabled || added.length) return
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((recs) => { if (!cancelled && Array.isArray(recs) && recs.length) { seededRef.current = true; setAdded(hydrate(recs)) } })
      .catch(() => { })
    return () => { cancelled = true }
  }, []) // 최초 1회
  useEffect(() => { saveSent(sentLog) }, [sentLog])
  // 공유 저장소 도구 모달: Esc로 닫기 (커스텀 모달 접근성)
  useEffect(() => {
    if (!showShared) return
    const onKey = (e) => { if (e.key === 'Escape') setShowShared(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showShared])
  const addSent = (e) => { setSentLog((l) => [{ id: 'S' + Date.now(), date: new Date().toLocaleString('ko-KR'), ...e }, ...l]); if (e.caseId) logActivity(e.caseId, 'send', `${e.kind} 발송 → ${e.to || '고객'}: ${String(e.content || '').slice(0, 40)}`) }
  useEffect(() => {
    if (sharedEnabled) return // 공유 모드는 서버가 원본 — localStorage 저장 안 함
    if (seededRef.current) { seededRef.current = false; return } // 공유 seed 로드분은 저장하지 않음(개인 입력만 저장)
    const ok = saveAdded(added)
    // 저장 한도 오류 토스트: 중요한 메시지라 5초간 표시 후 자동 닫힘(수동 클릭도 가능)
    if (!ok && added.length) { setToast('브라우저 저장 한도를 초과해 일부가 저장되지 않았을 수 있습니다'); window.clearTimeout(window.__t); window.__t = window.setTimeout(() => setToast(''), 5000) }
  }, [added])
  const notify = useMemo(() => ({
    // toast(메시지) 또는 toast(메시지, 실행취소함수) — undo가 있으면 '실행취소' 버튼 + 더 길게 표시
    toast: (m, undo) => {
      setToast(m); setToastAction(typeof undo === 'function' ? { label: '실행취소', onClick: undo } : null)
      window.clearTimeout(window.__t); window.__t = window.setTimeout(() => { setToast(''); setToastAction(null) }, undo ? 6000 : 2200)
    },
    modal: (title, body) => setModal({ open: true, title, body }),
    // 확인/취소 다이얼로그 (window.confirm 대체 — 디자인 일관성·접근성)
    confirm: (title, body, onConfirm, opts = {}) => setModal({ open: true, title, body, onConfirm, confirmLabel: opts.confirmLabel || '확인', danger: !!opts.danger }),
  }), [])
  const openCase = (id) => { setRail('agent'); setCaseId(id); setScreen('detail'); setPanelMode((m) => m === 'collapsed' ? 'split' : m) }
  const goAgent = (s) => { setRail('agent'); if (s) setScreen(s) }
  // 자동 시연 내비게이션 — 한 스텝의 위치로 이동
  const demoNav = (step) => {
    if (!step) return
    if (step.caseId) setCaseId(step.caseId)
    if (step.doc) setSolDoc(step.doc)
    if (step.screen) { setScreen(step.screen); setPanelMode('split') }
    if (step.rail) setRail(step.rail)
  }
  const demoSampleId = (added[0] && added[0].id) || (typeof VOCS !== 'undefined' && VOCS[0] && VOCS[0].id) || 'VOC-1001'
  // 공유 모드: 새 VOC를 서버에 적재(누적). 압축 레코드 배열을 받는다.
  const sharedInsert = (compactRecs) => { if (sharedEnabled) insertMany(compactRecs).catch(() => setToast('공유 저장소 적재 실패 — 네트워크를 확인하세요')) }
  // 공유 저장소 도구(데모): 샘플 시드 / 비우기 — 상단바 버튼에서 호출
  const seedShared = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}seed.json`, { cache: 'no-store' })
      const recs = await r.json()
      if (!Array.isArray(recs) || !recs.length) { notify.toast('seed.json이 비어 있어요'); return }
      sharedInsert(recs)
      notify.toast(`샘플 ${recs.length.toLocaleString()}건을 공유 저장소에 넣었어요 (잠시 후 모두에게 표시)`)
    } catch { notify.toast('샘플 시드를 넣지 못했어요') }
  }
  const wipeShared = () => {
    notify.confirm('공유 데이터 비우기', '공유 저장소의 모든 VOC를 삭제합니다. 로그인한 모든 사용자에게 반영됩니다. 계속할까요?', async () => {
      try { await clearAll(); setAdded([]); notify.toast('공유 데이터를 비웠어요') } catch { notify.toast('삭제하지 못했어요 — 네트워크를 확인하세요') }
    }, { danger: true, confirmLabel: '모두 삭제' })
  }
  const updateCases = (ids, patch) => setAdded((prev) => {
    const stamp = new Date().toISOString()
    const next = prev.map((v) => {
      if (!ids.includes(v.id)) return v
      const merged = { ...v, ...patch }
      // 티켓 활동 자동 기록(감사 이력) — 실제로 바뀐 상태·담당만
      const logs = []
      if (patch.status && patch.status !== v.status) logs.push({ t: stamp, who: authEmail, kind: 'status', text: `진행상황: ${v.status} → ${patch.status}` })
      if (patch.owner && patch.owner !== v.owner) logs.push({ t: stamp, who: authEmail, kind: 'owner', text: `담당 배정: ${patch.owner}` })
      if (logs.length) merged.activity = [...(v.activity || []), ...logs]
      return merged
    })
    if (sharedEnabled) { const changed = next.filter((v) => ids.includes(v.id)); insertMany(toCompact(changed), true).catch(() => { }) }
    return next
  })
  // 티켓 활동 추가(코멘트·발송 등) — Jira의 코멘트/이력을 사이트에 내재화
  const logActivity = (id, kind, text) => setAdded((prev) => {
    const stamp = new Date().toISOString()
    const next = prev.map((v) => v.id === id ? { ...v, activity: [...(v.activity || []), { t: stamp, who: authEmail, kind, text }] } : v)
    if (sharedEnabled) insertMany(toCompact(next.filter((v) => v.id === id)), true).catch(() => { })
    return next
  })
  // 일괄 변경 + 실행취소: 변경 전 값을 스냅샷해 토스트의 '실행취소'로 원복 (id별 이전 값이 다르므로 개별 복원)
  const bulkPatch = (ids, patch, label) => {
    const idset = new Set(ids)
    const snap = added.filter((v) => idset.has(v.id)).map((v) => { const prev = {}; Object.keys(patch).forEach((k) => { prev[k] = v[k] }); return { id: v.id, prev } })
    updateCases(ids, patch)
    notify.toast(label || `${ids.length}건 변경됨`, snap.length ? () => { setAdded((cur) => { const m = new Map(snap.map((s) => [s.id, s.prev])); const nx = cur.map((v) => m.has(v.id) ? { ...v, ...m.get(v.id) } : v); if (sharedEnabled) insertMany(toCompact(nx.filter((v) => m.has(v.id))), true).catch(() => { }); return nx }); notify.toast('실행취소됨') } : undefined)
  }
  const [t] = TITLES[screen]
  const _d = new Date() // 로컬(KST) 날짜 — toISOString(UTC)은 저녁에 하루 어긋날 수 있어 사용하지 않음
  const agentTitle = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')} · 선제조치 Copilot`
  if (!authEmail) return <Login onAuthed={setAuthEmail} />
  return (
    <div className="app">
      <IconRail account={authEmail} onLogout={() => { setSession(''); setAuthEmail('') }} notify={notify} railView={railView} setRail={setRail} />
      {railView === 'agent' ? (
        <>
          <SubLNB screen={screen} setScreen={setScreen} />
          <div className={'workspace mode-' + panelMode}>
            <Topbar title={t} mode={panelMode} setMode={setPanelMode} agentTitle={agentTitle} shareState={shareState} sharedEnabled={sharedEnabled} onShareTools={() => setShowShared(true)} />
            <div className="workbody">
              {panelMode !== 'expanded' && (
                <main className="main-nav">
                  <div className="content">
                    {screen === 'trends' && <VOCTrends added={added} openCase={openCase} />}
                    {screen === 'inbox' && <VOCInbox openCase={openCase} notify={notify} added={added} setAdded={setAdded} shared={sharedEnabled} sharedInsert={sharedInsert} />}
                    {screen === 'board' && <ClassificationBoard openCase={openCase} notify={notify} added={added} updateCases={updateCases} />}
                    {screen === 'detail' && <CaseDetail caseId={caseId} notify={notify} added={added} updateCases={updateCases} bulkPatch={bulkPatch} addSent={addSent} addComment={logActivity} sentLog={sentLog} account={authEmail} openCase={openCase} />}
                    {screen === 'insight' && <InsightReport added={added} openCase={openCase} updateCases={updateCases} bulkPatch={bulkPatch} notify={notify} addSent={addSent} />}
                    {screen === 'selfguide' && <SelfGuide added={added} notify={notify} />}
                    {screen === 'import' && <ImportResult notify={notify} added={added} setAdded={setAdded} shared={sharedEnabled} sharedInsert={sharedInsert} openCase={openCase} />}
                  </div>
                </main>
              )}
              {panelMode !== 'collapsed' && (
                <AgentPanel screen={screen} caseId={caseId} added={added} notify={notify} updateCases={updateCases} selected={selected} setSelected={setSelected} openCase={openCase} />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="workspace portal">
          <header className="portal-top">
            <div className="crumb">U+ Work<span className="crumb-sep">›</span><b>{PORTAL_TITLES[railView]}</b></div>
            <div className="pt-right">
              {railView === 'home' && (
                <div className="ai-toggle" role="tablist" aria-label="홈/AI 전환">
                  <button className={homeAi ? '' : 'on'} onClick={() => setHomeAi(false)}>홈</button>
                  <button className={homeAi ? 'on' : ''} onClick={() => setHomeAi(true)}>✦ AI</button>
                </div>
              )}
              <ShareBadge state={shareState} />
              <span className="ai-pill">● 통합 업무 · 데모</span>
            </div>
          </header>
          <main className={'portal-body' + (railView === 'home' ? ' home-body' : '')}>
            {railView === 'home' ? (
              <HomePortal account={authEmail} added={added} goAgent={goAgent} setRail={setRail} openCase={openCase} notify={notify} aiMode={homeAi} setAiMode={setHomeAi} />
            ) : (
              <div className="content">
                {railView === 'mail' && <MailApp sentLog={sentLog} notify={notify} openCase={openCase} />}
                {railView === 'cal' && <CalendarApp />}
                {railView === 'org' && <OrgApp notify={notify} />}
                {railView === 'pay' && <ApprovalApp notify={notify} />}
                {railView === 'grid' && <AllMenu goAgent={goAgent} setRail={setRail} notify={notify} doc={solDoc} setDoc={setSolDoc} />}
              </div>
            )}
          </main>
        </div>
      )}
      <Toast msg={toast} action={toastAction} onClose={() => { setToast(''); setToastAction(null) }} />
      <Modal open={modal.open} title={modal.title} body={modal.body} onConfirm={modal.onConfirm} confirmLabel={modal.confirmLabel} danger={modal.danger} onClose={() => setModal({ open: false, title: '', body: '' })} />
      {sharedEnabled && showShared && (
        <div className="modal-overlay" onClick={() => setShowShared(false)}>
          <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><b>공유 저장소 도구 <span className="muted" style={{ fontWeight: 400 }}>· 공모전 데모용</span></b><button className="modal-x" aria-label="닫기" onClick={() => setShowShared(false)}>✕</button></div>
            <p className="modal-note">입력·붙여넣은 VOC가 공유 저장소에 적재되어 로그인한 모든 사용자 화면에 수 초 내 누적 표시됩니다. 현재 <b>{added.length.toLocaleString()}</b>건 공유 중.</p>
            <div className="ip-actions">
              <button className="btn btn-ghost" onClick={() => { seedShared() }}>공유 데이터에 샘플 시드 넣기</button>
              <button className="btn btn-ghost danger" onClick={() => { wipeShared() }}>공유 데이터 비우기</button>
            </div>
          </div>
        </div>
      )}
      {!demo && <button className="demo-fab" onClick={() => setDemo(true)} title="서비스 핵심을 1~2분 음성으로 자동 안내">▶ 자동 시연</button>}
      {demo && <AutoDemo nav={demoNav} hasData={added.length > 0} sampleId={demoSampleId} onClose={() => setDemo(false)} />}
    </div>
  )
}
