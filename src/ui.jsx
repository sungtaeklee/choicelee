import React, { useState, useEffect, useMemo, useRef } from 'react'
import { GROUP_CLS, parseTranscript } from './classify.js'

/* ============================================================
   공용 UI 프리미티브 + 표시용 상수 (여러 화면이 공유)
   - 배지/칩/차트/모달 등 프레젠테이션 컴포넌트와 색상·상태 상수만 모음.
   - 화면별 컴포넌트(screens/*)와 App에서 import해 사용.
   ============================================================ */

/* ---------- 메타/배지 상수 ---------- */
export const SEVERITY = { High: 'sev sev-high', Medium: 'sev sev-med', Low: 'sev sev-low' }
export const SENTIMENT = { Negative: 'sent sent-neg', Neutral: 'sent sent-neu', Positive: 'sent sent-pos' }
export const STATUS = { '신규': 'stt stt-new', '분류 완료': 'stt stt-cls', '처리 필요': 'stt stt-todo', '처리 중': 'stt stt-doing', '보류(BLOCK)': 'stt stt-block', '처리 완료': 'stt stt-done' }
export const CONF = { '높음': 'conf conf-h', '보통': 'conf conf-m', '낮음': 'conf conf-l' }
export const KANBAN_COLS = ['신규', '분류 완료', '처리 필요', '처리 중', '보류(BLOCK)', '처리 완료']
export const COMBO_COLORS = ['#e6007e', '#6938ef', '#1570ef', '#12b76a', '#f79009', '#ef4444', '#06b6d4', '#9333ea', '#84cc16', '#64748b']
export const DONUT_COLORS = ['#e6007e', '#9b3fd4', '#4f7cf6', '#1bb59a', '#f5a623', '#9aa3b2']
export const RAIL_ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  mail: 'M3 6h18v12H3zM3.5 7l8.5 6 8.5-6', cal: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  org: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6', pay: 'M3 7h6l2 2h10v10H3z',
  chat: 'M4 5h16v11H9l-4 4v-4H4z', bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
}

/* ---------- VOC 데이터: 예시 제거 — 실데이터(입력/붙여넣기)로만 채움 ---------- */
export const VOCS = []
export const EFFECTS = [
  { t: '상담 Call 감소', d: '반복 문의 자동 안내로 인입 축소' },
  { t: '1:1문의 감소', d: '셀프 확인 동선·안내문 제공' },
  { t: 'VOC 감소', d: '근본 원인 UX/개발 개선 연결' },
  { t: '협력업체 분류 비용 절감', d: '수작업 분류 → AI 자동 분류' },
  { t: '반복 업무 자동화', d: '분류·초안·정리 자동화' },
]

/* ---------- 배지/칩 ---------- */
export function ChannelIcon({ channel, size = 16 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (channel === 'Call') return <svg {...c}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
  if (channel === 'Medallia') return <svg {...c}><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 5-6" /></svg>
  if (channel === 'App Store') return <svg {...c}><rect x="5" y="2" width="14" height="20" rx="2.5" /><path d="M11 18h2" /></svg>
  return <svg {...c}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z" /></svg>
}
export const SevBadge = ({ v }) => <span className={SEVERITY[v]}>{v}</span>
export const SentBadge = ({ v }) => <span className={SENTIMENT[v]}>{v}</span>
export const StatBadge = ({ v }) => <span className={STATUS[v]}>{v}</span>
export const ConfBadge = ({ v }) => <span className={CONF[v]}>{v}</span>
export const GroupBadge = ({ v }) => <span className={GROUP_CLS[v]}>{v}</span>
export const Tag = ({ children }) => <span className="ctag">{children}</span>
export const ChannelChip = ({ channel }) => <span className="chchip"><ChannelIcon channel={channel} /> {channel}</span>
export const RailIcon = ({ d }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
// 담당자 아바타(이니셜) — 이름 문자열에서 첫 글자, 빈 값이면 미지정 점선 원
const AV_COLORS = ['#e6007e', '#6938ef', '#1570ef', '#12b76a', '#f79009', '#06b6d4', '#9333ea']
/* 이름 → 고정 색 (보드 아바타·일정 캘린더가 동일 함수를 써서 담당자 색을 일치시킨다) */
export function avatarColor(name) {
  const n = String(name || '').trim(); if (!n) return '#9aa3b2'
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}
export function Avatar({ name, size = 22 }) {
  const n = String(name || '').trim()
  if (!n) return <span className="avatar avatar-none" title="미지정" style={{ width: size, height: size }} />
  const ch = n.replace(/^[^가-힣A-Za-z]+/, '')[0] || n[0]
  return <span className="avatar" title={n} style={{ width: size, height: size, background: avatarColor(n), fontSize: Math.round(size * 0.42) }}>{ch.toUpperCase()}</span>
}

/* ---------- 토스트 · 모달 · 페이지 헤더 ---------- */
export const Toast = ({ msg, action, onClose }) => msg ? (
  <div className="toast" role="status" aria-live="polite">
    <span className="toast-msg" onClick={onClose}>{msg}</span>
    {action && <button className="toast-act" onClick={(e) => { e.stopPropagation(); action.onClick(); onClose() }}>{action.label}</button>}
  </div>
) : null
export function Modal({ open, title, body, onClose, onConfirm, confirmLabel = '확인', danger = false }) {
  const ref = useRef(null)
  // Esc 닫기 + 포커스 트랩(Tab 순환) + 닫을 때 이전 포커스 복원 — 키보드 접근성
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const focusables = () => ref.current ? [...ref.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null) : []
    const f = focusables(); (f[0] || ref.current)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        const items = focusables(); if (!items.length) return
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" ref={ref} tabIndex={-1} onClick={(e) => e.stopPropagation()}><div className="modal-title">{title}</div><div className="modal-body">{body}</div><div className="modal-foot">
      {onConfirm && <button className="btn btn-ghost" onClick={onClose}>취소</button>}
      <button className={'btn btn-primary' + (danger ? ' danger' : '')} onClick={onConfirm ? () => { onConfirm(); onClose() } : onClose}>{onConfirm ? confirmLabel : '확인'}</button>
    </div></div></div>
  )
}
export const PageHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div><h1 className="page-title">{title}</h1>{sub && <p className="page-sub">{sub}</p>}</div>
    {children && <div className="page-actions">{children}</div>}
  </div>
)
export const ShareBadge = ({ state }) => {
  if (!state || state === 'local') return null
  const map = { connecting: ['● 공유 연결 중…', 'sb-wait'], online: ['● 공유 저장소 연결됨', 'sb-on'], error: ['● 공유 연결 오류', 'sb-err'] }
  const [label, cls] = map[state] || map.connecting
  return <span className={'share-badge ' + cls}>{label}</span>
}
export const DemoBanner = ({ children }) => <div className="demo-banner">데모 화면 — {children} 실제 적용 시 사내 시스템과 연동됩니다.</div>
export const Chev = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
export function CardHead({ title, sub, onMore }) {
  return (
    <div className="card-head">
      <span className="ch-title">{title}{sub && <span className="muted">{sub}</span>}</span>
      {onMore && <button className="ch-more" onClick={onMore} aria-label="더보기"><Chev /></button>}
    </div>
  )
}
export function AiBox({ q, rows, acts, dismissable = true }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="ai-box">
      {dismissable && <button className="ai-x" onClick={() => setOpen(false)} aria-label="닫기">×</button>}
      <div className="ai-box-q"><span className="ai-spark">✦</span>{q}</div>
      {rows && rows.length > 0 && <div className="ai-rows">{rows.map((r, i) => (
        <div key={i} className="ai-row"><span className={'ai-tag ' + r.tag}>{r.label}</span><span>{r.text}</span></div>
      ))}</div>}
      {acts && acts.length > 0 && <div className="ai-acts">{acts.map((a, i) => (
        <button key={i} className={'ai-pill-btn' + (a.primary ? ' primary' : '')} onClick={a.onClick}>{a.label}</button>
      ))}</div>}
    </div>
  )
}

/* ---------- 차트: 도넛 · 막대 · KPI · 다중라인 · 피벗 ---------- */
export function Donut({ segments, total, centerLabel }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  const R = 52, C = 2 * Math.PI * R, GAP = 3; let off = 0
  return (
    <svg viewBox="0 0 140 140" className="donut" role="img">
      <g transform="translate(70,70) rotate(-90)">
        <circle r={R} fill="none" stroke="var(--line-2)" strokeWidth="15" />
        {segments.map((s, i) => {
          const share = s.value / sum * C
          const len = Math.max(0.5, share - (segments.length > 1 ? GAP : 0))
          const seg = <circle key={i} r={R} fill="none" stroke={s.color} strokeWidth="15" strokeLinecap="butt" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
          off += share; return seg
        })}
      </g>
      <text x="70" y="65" textAnchor="middle" className="donut-num">{total.toLocaleString()}</text>
      <text x="70" y="83" textAnchor="middle" className="donut-lbl">{centerLabel}</text>
    </svg>
  )
}
/* 세로 막대 차트(최대값 강조) */
export function Bar({ data }) {
  const max = Math.max(1, ...data.map((d) => d.n))
  if (!data.length) return <p className="micro">표시할 데이터가 없습니다.</p>
  return (
    <div className="barc">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d.n / max) * 100))
        const top = d.n === max
        return (
          <div key={i} className="barc-col" title={`${d.k} · ${d.n}건`}>
            <div className="barc-track"><div className={'barc-fill' + (top ? ' top' : '')} style={{ height: h + '%' }}><span>{d.n}</span></div></div>
            <span className="barc-x">{d.k}</span>
          </div>
        )
      })}
    </div>
  )
}
/* KPI 카드(증감 델타). up=증가(빨강·나쁨), down=감소(파랑) */
export function DashKpi({ label, value, unit, delta, deltaLabel, sub, accent }) {
  return (
    <div className={'dkpi' + (accent ? ' dkpi-' + accent : '')}>
      <div className="dkpi-l">{label}</div>
      <div className="dkpi-v">{value}<span className="dkpi-u">{unit}</span></div>
      {typeof delta === 'number'
        ? <div className={'dkpi-d ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat')}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta)}건 <span>{deltaLabel}</span></div>
        : <div className="dkpi-d flat"><span>{sub}</span></div>}
    </div>
  )
}
/* 피벗(엑셀 1·2번 시트 대응) */
export function buildPivot(data, getL1, getL2) {
  const tree = {}
  for (const d of data) {
    const l1 = getL1(d) || '기타', l2 = getL2(d) || '기타', w = d.week || '미상'
    const t1 = tree[l1] || (tree[l1] = { sum: 0, byWeek: {}, cats: {} })
    t1.sum++; t1.byWeek[w] = (t1.byWeek[w] || 0) + 1
    const t2 = t1.cats[l2] || (t1.cats[l2] = { sum: 0, byWeek: {} })
    t2.sum++; t2.byWeek[w] = (t2.byWeek[w] || 0) + 1
  }
  return tree
}
export function PivotView({ tree, weeks, l1order }) {
  const known = (l1order || []).filter((k) => tree[k])
  const extra = Object.keys(tree).filter((k) => !known.includes(k))
  const l1s = [...known, ...extra]
  const grand = weeks.map((w) => l1s.reduce((s, l1) => s + (tree[l1].byWeek[w] || 0), 0))
  const grandSum = l1s.reduce((s, l1) => s + tree[l1].sum, 0)
  return (
    <div className="table-wrap"><table className="vtable pivot">
      <thead><tr><th className="pv-rowh">구분</th>{weeks.map((w) => <th key={w} className="pv-num">{w}</th>)}<th className="pv-num">합계</th></tr></thead>
      <tbody>
        {l1s.map((l1) => {
          const node = tree[l1]
          const cats = Object.entries(node.cats).sort((a, b) => b[1].sum - a[1].sum)
          return (
            <React.Fragment key={l1}>
              <tr className="pv-l1"><td>{l1}</td>{weeks.map((w) => <td key={w} className="pv-num">{node.byWeek[w] || ''}</td>)}<td className="pv-num pv-sum">{node.sum}</td></tr>
              {cats.map(([l2, c]) => <tr key={l2} className="pv-l2"><td>{l2}</td>{weeks.map((w) => <td key={w} className="pv-num">{c.byWeek[w] || ''}</td>)}<td className="pv-num">{c.sum}</td></tr>)}
            </React.Fragment>
          )
        })}
        <tr className="pv-total"><td>총합계</td>{grand.map((n, i) => <td key={i} className="pv-num">{n}</td>)}<td className="pv-num pv-sum">{grandSum}</td></tr>
      </tbody>
    </table></div>
  )
}
/* 다중 라인(꺾은선) 추이 — 라인/범례 클릭 시 강조 */
export function MultiLine({ labels, series, sel, onSel, perPoint = 0 }) {
  if (!labels.length || !series.length) return <p className="micro">표시할 데이터가 없습니다.</p>
  const H = 220, padT = 14, padB = 36, padL = 40, padR = 14, plotH = H - padT - padB
  const innerW = perPoint ? Math.max(560, labels.length * perPoint) : 660
  const W = innerW + padL + padR
  const maxV = Math.max(1, ...series.flatMap((s) => s.values))
  const x = (i) => padL + (labels.length === 1 ? innerW / 2 : i / (labels.length - 1) * innerW)
  const y = (v) => padT + plotH - (v / maxV) * plotH
  const pts = (vals) => vals.map((v, i) => [x(i), y(v)])
  const smooth = (vals) => {
    const p = pts(vals); if (!p.length) return ''
    if (p.length < 3) return p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ')
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    }
    return d
  }
  const path = (vals) => smooth(vals)
  const areaPath = (vals) => `${smooth(vals)} L${x(vals.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
  const selSeries = sel ? series.find((s) => s.key === sel) : null
  const lblStep = Math.max(1, Math.ceil(labels.length / 12))
  return (
    <svg className="ltrend" viewBox={`0 0 ${W} ${H}`} width={perPoint ? W : '100%'} height={H} preserveAspectRatio="xMinYMin meet">
      {selSeries && (
        <defs>
          <linearGradient id="ltFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={selSeries.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={selSeries.color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => { const yy = padT + plotH - f * plotH; return <line key={'g' + i} x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--line-2)" strokeWidth="1" strokeDasharray={f === 0 ? '0' : '3 4'} /> })}
      {[0, 0.5, 1].map((f, i) => { const yy = padT + plotH - f * plotH; return <text key={'a' + i} x={padL - 8} y={yy + 3.5} textAnchor="end" className="lt-axis">{Math.round(maxV * f)}</text> })}
      {labels.map((l, i) => (i % lblStep === 0 || i === labels.length - 1) ? <text key={i} x={x(i)} y={H - 12} textAnchor="middle" className="lt-axis">{l}</text> : null)}
      {selSeries && <path d={areaPath(selSeries.values)} fill="url(#ltFill)" stroke="none" />}
      {series.map((s) => { const on = !sel || sel === s.key; return <path key={s.key} className="lt-line" d={path(s.values)} fill="none" stroke={s.color} strokeWidth={sel === s.key ? 2.6 : 1.8} opacity={on ? 1 : 0.12} strokeLinejoin="round" strokeLinecap="round" onClick={() => onSel && onSel(sel === s.key ? null : s.key)}><title>{s.label}</title></path> })}
      {selSeries && selSeries.values.map((v, i) => (i === selSeries.values.length - 1 || labels.length <= 16) ? <circle key={i} cx={x(i)} cy={y(v)} r={i === selSeries.values.length - 1 ? 3.6 : 2.3} fill="#fff" stroke={selSeries.color} strokeWidth="1.8" /> : null)}
      {selSeries && selSeries.values.length > 0 && (() => {
        const li = selSeries.values.length - 1, lv = selSeries.values[li]
        return <text x={x(li)} y={Math.max(padT + 9, y(lv) - 9)} textAnchor="end" className="lt-end" fill={selSeries.color}>{lv}</text>
      })()}
    </svg>
  )
}

/* ---------- 테이블 정렬 ----------
   useSort(rows, accessors): 컬럼 키→값 추출 함수 맵을 받아 정렬된 행을 반환.
   toggle(key)로 오름차순 → 내림차순 → 해제 순환. 숫자는 수치 비교, 그 외 ko 로케일 비교. */
export function useSort(rows, accessors, initial = null) {
  const [sort, setSort] = useState(initial) // { key, dir: 1(오름) | -1(내림) }
  const sorted = useMemo(() => {
    if (!sort || !accessors[sort.key]) return rows
    const acc = accessors[sort.key]
    return [...rows].sort((a, b) => {
      const va = acc(a), vb = acc(b)
      const ea = va == null || va === '', eb = vb == null || vb === ''
      if (ea && eb) return 0
      if (ea) return 1   // 빈 값은 항상 뒤로
      if (eb) return -1
      const r = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va).localeCompare(String(vb), 'ko')
      return r * sort.dir
    })
  }, [rows, sort]) // eslint-disable-line
  const toggle = (key) => setSort((s) => (s && s.key === key) ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 })
  return { sorted, sort, toggle }
}
/* 정렬 가능한 테이블 헤더 셀 — 클릭/Enter/Space로 토글, 방향 화살표 + aria-sort */
export function SortTh({ k, sort, toggle, children, className }) {
  const active = sort && sort.key === k
  return (
    <th className={(className ? className + ' ' : '') + 'sortable' + (active ? ' sorted' : '')}
      onClick={() => toggle(k)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(k) } }}
      aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {children}<span className="sort-ar">{active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}

/* 전사(대화) → 채팅 말풍선 렌더 */
export function Transcript({ text }) {
  const turns = parseTranscript(text)
  if (!turns) return <p className="voc-raw">{text}</p>
  return (
    <div className="chat-log">
      {turns.map((t, i) => (
        <div key={i} className={'chat-row chat-' + t.side}>
          {t.side !== 'note' && <span className="chat-who">{t.label}</span>}
          <span className="chat-bubble">{t.text}</span>
        </div>
      ))}
    </div>
  )
}
