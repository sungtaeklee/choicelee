import React, { useState, useRef } from 'react'
import { Avatar } from './ui.jsx'
import { allMembers, memberLabel, searchMembers, LABELS_SUGGEST } from './directory.js'

/* ============================================================
   검색형 피커 — 담당자/보고자/참조자(사람)와 레이블을 텍스트가 아닌 검색으로 지정
   ============================================================ */
export function PeoplePicker({ value, onChange, multi = false, placeholder = '이름·팀 검색' }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false)
  // 저장 데이터가 배열이 아니어도(문자열 등) 죽지 않도록 안전 보정
  const arr = multi ? (Array.isArray(value) ? value : (value ? [value] : [])) : null
  const sel = multi ? arr : (value ? [value] : [])
  const results = searchMembers(q).map(memberLabel).filter((l) => !sel.includes(l))
  const pick = (label) => { onChange(multi ? [...arr, label] : label); setQ(''); setOpen(false) }
  const remove = (label) => { onChange(multi ? arr.filter((x) => x !== label) : '') }
  return (
    <div className="pk" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <div className="pk-chips">
        {sel.map((l) => (
          <span key={l} className="pk-chip"><Avatar name={l} size={18} /><span>{l}</span>
            <button className="chip-x" aria-label="제거" onMouseDown={(e) => { e.preventDefault(); remove(l) }}>✕</button></span>
        ))}
        {(multi || !value) && <input className="pk-in" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }} placeholder={placeholder} />}
      </div>
      {open && results.length > 0 && (
        <div className="pk-drop">
          {results.map((l) => { const m = allMembers().find((x) => memberLabel(x) === l); return (
            <button key={l} className="pk-opt" onMouseDown={(e) => { e.preventDefault(); pick(l) }}>
              <Avatar name={l} size={24} />
              <span className="pk-opt-main"><b>{typeof m?.name === 'string' ? m.name : ''}</b> <span className="muted">{typeof m?.team === 'string' ? m.team : ''}</span><br /><span className="pk-opt-email">{typeof m?.email === 'string' ? m.email : ''}</span></span>
            </button>
          ) })}
        </div>
      )}
    </div>
  )
}

/* 멘션 입력 — 텍스트에어리어에서 '@' 입력 시 구성원 자동완성. 선택하면 '@이름 ' 삽입(알림 트리거) */
export function MentionInput({ value, onChange, placeholder, className = 'of-area' }) {
  const ref = useRef(null)
  const [men, setMen] = useState(null) // { start, query } | null
  const sync = (val, caret) => {
    const m = val.slice(0, caret).match(/@([가-힣A-Za-z]{0,10})$/)
    setMen(m ? { start: caret - m[0].length, query: m[1] } : null)
  }
  const onInput = (e) => { onChange(e.target.value); sync(e.target.value, e.target.selectionStart) }
  const pick = (name) => {
    const el = ref.current; if (!el || !men) return
    const before = value.slice(0, men.start), after = value.slice(el.selectionStart)
    const ins = '@' + name + ' ', next = before + ins + after
    onChange(next); setMen(null)
    requestAnimationFrame(() => { try { el.focus(); const p = (before + ins).length; el.setSelectionRange(p, p) } catch { /* noop */ } })
  }
  const results = men ? searchMembers(men.query, 6) : []
  return (
    <div className="men-wrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMen(null) }}>
      <textarea ref={ref} className={className} value={value} placeholder={placeholder}
        onChange={onInput} onKeyUp={(e) => sync(e.target.value, e.target.selectionStart)} onClick={(e) => sync(e.target.value, e.target.selectionStart)} />
      {men && results.length > 0 && (
        <div className="men-drop">
          {results.map((m) => (
            <button key={m.email} className="pk-opt" onMouseDown={(e) => { e.preventDefault(); pick(m.name) }}>
              <Avatar name={memberLabel(m)} size={22} />
              <span className="pk-opt-main"><b>{m.name}</b> <span className="muted">{m.team}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LabelPicker({ value, onChange }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false)
  const sel = Array.isArray(value) ? value : []
  const kw = q.trim()
  const results = LABELS_SUGGEST.filter((l) => !sel.includes(l) && l.toLowerCase().includes(kw.toLowerCase()))
  const canAdd = kw && !sel.includes(kw)
  const add = (l) => { onChange([...new Set([...sel, l])]); setQ(''); setOpen(false) }
  return (
    <div className="pk" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <div className="pk-chips">
        {sel.map((l) => <span key={l} className="jlabel">{l}<button className="chip-x" aria-label="제거" onMouseDown={(e) => { e.preventDefault(); onChange(sel.filter((x) => x !== l)) }}>✕</button></span>)}
        <input className="pk-in" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) { e.preventDefault(); add(kw) } }} placeholder="＋ 레이블 검색/추가" />
      </div>
      {open && (results.length > 0 || canAdd) && (
        <div className="pk-drop">
          {results.map((l) => <button key={l} className="pk-opt pk-opt-lbl" onMouseDown={(e) => { e.preventDefault(); add(l) }}><span className="jlabel">{l}</span></button>)}
          {canAdd && <button className="pk-opt pk-opt-lbl" onMouseDown={(e) => { e.preventDefault(); add(kw) }}>＋ “{kw}” 새 레이블 추가</button>}
        </div>
      )}
    </div>
  )
}
