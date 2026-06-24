import React, { useState } from 'react'
import { Avatar } from './ui.jsx'
import { MEMBERS, memberLabel, searchMembers, LABELS_SUGGEST } from './directory.js'

/* ============================================================
   검색형 피커 — 담당자/보고자/참조자(사람)와 레이블을 텍스트가 아닌 검색으로 지정
   ============================================================ */
export function PeoplePicker({ value, onChange, multi = false, placeholder = '이름·팀 검색' }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false)
  const sel = multi ? (value || []) : (value ? [value] : [])
  const results = searchMembers(q).map(memberLabel).filter((l) => !sel.includes(l))
  const pick = (label) => { multi ? onChange([...(value || []), label]) : onChange(label); setQ(''); setOpen(false) }
  const remove = (label) => { multi ? onChange((value || []).filter((x) => x !== label)) : onChange('') }
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
          {results.map((l) => { const m = MEMBERS.find((x) => memberLabel(x) === l); return (
            <button key={l} className="pk-opt" onMouseDown={(e) => { e.preventDefault(); pick(l) }}>
              <Avatar name={l} size={24} />
              <span className="pk-opt-main"><b>{m?.name}</b> <span className="muted">{m?.team}</span><br /><span className="pk-opt-email">{m?.email}</span></span>
            </button>
          ) })}
        </div>
      )}
    </div>
  )
}

export function LabelPicker({ value, onChange }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false)
  const sel = value || []
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
