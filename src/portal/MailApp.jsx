import React, { useState } from 'react'
import { DemoBanner, useSort, SortTh } from '../ui.jsx'

const SENT_SORT = { date: (s) => s.date, kind: (s) => s.kind, owner: (s) => s.owner, to: (s) => s.to, caseId: (s) => s.caseId, content: (s) => s.content }
function SentLogTable({ sentLog, openCase }) {
  const log = sentLog || []
  const { sorted, sort, toggle } = useSort(log, SENT_SORT)
  if (!log.length) return <div className="panel empty-panel">아직 발송 이력이 없습니다. <b>VOC Agent › VOC 처리</b>에서 메일/문자를 발송(데모)하면 담당자·수신·내용·발송일이 여기에 기록됩니다.</div>
  return (
    <div className="table-wrap"><table className="vtable">
      <thead><tr>
        <SortTh k="date" sort={sort} toggle={toggle}>발송일시</SortTh>
        <SortTh k="kind" sort={sort} toggle={toggle}>유형</SortTh>
        <SortTh k="owner" sort={sort} toggle={toggle}>담당자</SortTh>
        <SortTh k="to" sort={sort} toggle={toggle}>수신</SortTh>
        <SortTh k="caseId" sort={sort} toggle={toggle}>케이스</SortTh>
        <SortTh k="content" sort={sort} toggle={toggle}>내용</SortTh>
      </tr></thead>
      <tbody>{sorted.map((s) => (
        <tr key={s.id}><td className="nowrap muted">{s.date}</td><td><span className={'kind ' + (s.kind === '메일' ? 'kind-mail' : 'kind-sms')}>{s.kind}</span></td><td className="nowrap">{s.owner}</td><td className="nowrap">{s.to}</td><td className="mono nowrap">{s.caseId && openCase ? <button className="link-id" onClick={() => openCase(s.caseId)} title="케이스 열기">{s.caseId}</button> : s.caseId}</td><td className="cell-content" title={s.content}>{s.content}</td></tr>
      ))}</tbody>
    </table></div>
  )
}

/* ---------- 통합 홈(포털) + 업무 앱 (데모) ---------- */

const MAIL_FOLDERS = [
  ['inbox', '받은메일함'], ['sent', '보낸메일함'], ['draft', '임시보관함'],
  ['sched', '예약메일함'], ['spam', '스팸메일함'], ['trash', '휴지통'],
]
const MAIL_ARCHIVE = ['VOC 리포트', '셀프가이드', '개선 과제']
const INBOX_DEMO = [
  { id: 'm1', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[VOC High] 요금/청구 이중납부 급증 — 담당 전달 요청', size: '12.4KB', date: '26.06.22 09:41', star: true, attach: false, unread: true, body: '금주 요금/청구 영역에서 이중납부 관련 VOC가 전주 대비 38% 증가했습니다.\nHigh 우선순위 6건을 담당 조직에 전달합니다.\n\n· 대응영역: MY › 요금/납부/청구\n· 대표 사례: VOC-2026-0612 외 5건\n· 권장 조치: 청구 내역 점검 → 정정/환불, 안내 문자 발송\n\n— U+ VOICE · VOC Action Copilot (데모)' },
  { id: 'm2', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[이상 감지] 장애/오류 그룹 급증 알림 (02월 4주차)', size: '9.1KB', date: '26.06.22 08:30', star: false, attach: false, unread: true, body: '앱/웹 접속불가 관련 VOC가 단시간 급증했습니다. 추이 화면에서 확인하세요. (데모)' },
  { id: 'm3', type: 'Ex', from: 'Figma', ext: true, subj: '2 new comments in 너겟 3.0 / VOC 대시보드', size: '58.2KB', date: '26.06.21 17:05', star: false, attach: false, unread: true, body: 'VOC 대시보드 시안에 코멘트 2건이 추가되었습니다. (데모)' },
  { id: 'm4', type: 'T', from: 'CX기획팀', ext: false, subj: 'VOC 주간 리포트 공유 (06/16~06/22)', size: '176.9KB', date: '26.06.21 15:35', star: true, attach: true, unread: false, body: '금주 VOC 주간 리포트를 공유합니다. 첨부 참고 바랍니다. (데모)' },
  { id: 'm5', type: 'T', from: '디자인시스템스쿼드', ext: false, subj: '[검수요청] 셀프 가이드 콘텐츠 1차 검수', size: '431.3KB', date: '26.06.20 08:13', star: false, attach: true, unread: false, body: '셀프 가이드 콘텐츠 초안 검수를 요청드립니다. (데모)' },
  { id: 'm6', type: 'Ex', from: 'Jira', ext: true, subj: '[Jira] DCBGIT-40580 에서 사용자를 멘션했습니다', size: '19.1KB', date: '26.06.20 10:34', star: false, attach: false, unread: false, body: 'VOC 분류 개선 티켓에 멘션되었습니다. (데모)' },
  { id: 'm7', type: 'T', from: 'Work Innovation CoE', ext: false, subj: '데이터 설계 과정 교육 신청 안내 (~6/25)', size: '88.0KB', date: '26.06.19 15:35', star: false, attach: false, unread: false, body: '데이터 설계 교육 신청 안내입니다. (데모)' },
  { id: 'm8', type: 'B', from: 'App Store 모니터링', ext: false, subj: '앱스토어 평점 모니터링 알림 — 평균 4.3 (▲0.1)', size: '7.7KB', date: '26.06.19 09:27', star: false, attach: false, unread: false, body: '주간 앱스토어 평점이 0.1 상승했습니다. (데모)' },
  { id: 'm9', type: 'Ex', from: 'Figma', ext: true, subj: '1 new file pinned to 디지털사업트라이브', size: '46.8KB', date: '26.06.18 10:35', star: false, attach: false, unread: false, body: '새 파일이 고정되었습니다. (데모)' },
  { id: 'm10', type: 'T', from: 'CX운영팀', ext: false, subj: '[공지] 하반기 VOC 처리 SLA 기준 변경 안내', size: '24.4KB', date: '26.06.18 14:43', star: false, attach: false, unread: false, body: '하반기 VOC 처리 SLA 기준이 변경됩니다. (데모)' },
  { id: 'm11', type: 'B', from: 'U+ VOICE · VOC Agent', ext: false, subj: '[VOC] 로밍 문의 패턴 리포트 — 출국 전 가입 안내 강화 제안', size: '11.2KB', date: '26.06.17 11:20', star: false, attach: false, unread: false, body: '로밍 문의가 출국 직전에 집중됩니다. 사전 안내 푸시를 제안합니다. (데모)' },
  { id: 'm12', type: 'T', from: '맹희경/디지털가입CX', ext: false, subj: '너겟 3.0 / 친구추천 고도화 검토 회신', size: '52.2KB', date: '26.06.17 09:52', star: false, attach: false, unread: false, body: '검토 의견 회신드립니다. (데모)' },
]
const MailType = ({ t }) => <span className={'mtype mtype-' + t} title={t === 'Ex' ? '외부' : t === 'B' ? '시스템' : '사내'}>{t}</span>
const Clip = () => <svg className="mclip" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
function MailApp({ sentLog, notify, openCase }) {
  const [folder, setFolder] = useState('inbox')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const PAGE = 10
  const sent = (sentLog || []).map((s) => ({
    id: s.id, type: s.kind === '메일' ? 'T' : 'B', from: s.owner || '담당자', ext: false,
    subj: `[${s.kind}] ${s.content}`, size: '—', date: s.date, star: false, attach: false, unread: false, caseId: s.caseId,
    body: `유형: ${s.kind}\n수신: ${s.to}\n케이스: ${s.caseId}\n\n${s.content}` }))
  const source = folder === 'inbox' ? INBOX_DEMO : folder === 'sent' ? sent : []
  const list = q ? source.filter((m) => (m.subj + ' ' + m.from).toLowerCase().includes(q.toLowerCase())) : source
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages)
  const items = list.slice((cur - 1) * PAGE, cur * PAGE)
  const unread = INBOX_DEMO.filter((m) => m.unread).length
  const go = (f) => { setFolder(f); setPage(1); setQ(''); setOpen(null) }
  const demo = (label) => notify && notify.toast(`${label} (데모 — 실제 동작 안 함)`)
  const count = (f) => f === 'inbox' ? unread : f === 'sent' ? sent.length : f === 'trash' ? 0 : 0
  return (
    <div className="screen portal-screen mailwrap">
      <DemoBanner>받은메일함은 예시 데이터이며, 보낸메일함은 VOC Agent 발송 이력과 연동됩니다.</DemoBanner>
      <div className="mailapp">
        <aside className="mbox-side">
          <button className="mbox-compose" onClick={() => demo('메일쓰기')}>메일쓰기</button>
          <div className="mbox-quick">
            <button onClick={() => demo('안읽음')}><b>{unread}</b><span>안읽음</span></button>
            <button onClick={() => demo('별표')}><b>★</b><span>별표</span></button>
            <button onClick={() => demo('첨부')}><b>◍</b><span>첨부</span></button>
          </div>
          <div className="mbox-group">
            <div className="mbox-gh">메일함</div>
            {MAIL_FOLDERS.map(([k, l]) => (
              <button key={k} className={'mbox-item' + (folder === k ? ' on' : '')} onClick={() => go(k)}>
                <span>{l}</span>{count(k) > 0 && <span className="mbox-count">{count(k)}</span>}
              </button>
            ))}
          </div>
          <div className="mbox-group">
            <div className="mbox-gh">보관함</div>
            {MAIL_ARCHIVE.map((a) => <button key={a} className="mbox-item sub" onClick={() => demo(a)}><span>{a}</span></button>)}
          </div>
          <div className="mbox-storage"><div className="mbox-bar"><span style={{ width: '12%' }} /></div><span className="micro">136.8MB / 2GB</span></div>
        </aside>

        <section className="mbox-main">
          {open ? (
            <div className="mread">
              <div className="mbox-toolbar">
                <button className="mt-btn" onClick={() => setOpen(null)}>← 목록</button>
                <button className="mt-btn" onClick={() => demo('답장')}>답장</button>
                <button className="mt-btn" onClick={() => demo('전달')}>전달</button>
                <button className="mt-btn" onClick={() => demo('삭제')}>삭제</button>
                {open.caseId && openCase && <button className="mt-btn mt-case" onClick={() => openCase(open.caseId)}>↗ 케이스 {open.caseId} 열기</button>}
              </div>
              <div className="mread-head">
                <h2>{open.subj}</h2>
                <div className="mread-meta"><MailType t={open.type} />{open.ext && <span className="ext-badge">외부메일</span>}<span className="mr-from">{open.from}</span><span className="mr-date">{open.date}</span></div>
              </div>
              <pre className="mread-body">{open.body || '(내용 없음)'}</pre>
            </div>
          ) : (
            <>
              <div className="mbox-toolbar">
                <div className="mt-title">{MAIL_FOLDERS.find(([k]) => k === folder)[1]}</div>
                <div className="mt-search"><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="메일 검색 (제목·보낸사람)" /></div>
                <div className="mt-tools">
                  {['읽음', '삭제', '이동', '답장', '전달', '스팸신고'].map((b) => <button key={b} className="mt-btn" onClick={() => demo(b)}>{b}</button>)}
                </div>
              </div>
              <div className="mbox-listhead">
                <span className="ml-c">전체 <b>{list.length}</b></span>
                <span className="ml-sort">보낸사람 · 제목 · 크기 · <b>날짜▾</b></span>
              </div>
              {items.length ? (
                <ul className="mbox-list">
                  {items.map((m) => (
                    <li key={m.id} className={'mbox-row' + (m.unread ? ' unread' : '')} onClick={() => setOpen(m)}>
                      <MailType t={m.type} />
                      <span className="mr-star">{m.star ? '★' : ''}</span>
                      <span className="mr-from" title={m.from}>{m.from}</span>
                      {m.ext && <span className="ext-badge">외부메일</span>}
                      <span className="mr-subj">{m.subj}{m.attach && <Clip />}</span>
                      <span className="mr-size">{m.size}</span>
                      <span className="mr-date">{m.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="panel empty-panel">{folder === 'sent' ? 'VOC Agent › VOC 처리에서 메일/문자를 발송(데모)하면 여기에 보낸 메일로 기록됩니다.' : '메일이 없습니다.'}</div>
              )}
              {pages > 1 && (
                <div className="mbox-pager">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default MailApp
