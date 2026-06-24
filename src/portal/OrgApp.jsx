import React, { useState } from 'react'
import { DemoBanner } from '../ui.jsx'

const ORG_TREE = {
  name: 'LG유플러스', children: [
    { name: 'CEO' },
    { name: 'Consumer부문', children: [
      { name: 'Consumer기획담당' },
      { name: 'Consumer인사담당' },
      { name: '모바일/디지털사업그룹', children: [
        { name: '모바일사업담당' },
        { name: '요금상품담당' },
        { name: '디바이스/Seg담당' },
        { name: '디지털CX트라이브', children: [
          { name: '디지털CX전략팀' },
          { name: '디지털커머스CX팀' },
          { name: '디지털통합CX팀', people: ['p_khg', 'p_t1', 'p_t2'] },
          { name: '디자인시스템스쿼드', people: ['p_lst', 'p_lead', 'p_ux', 'p_fe', 'p_res', 'p_pm'] },
          { name: '디지털혜택CX팀' },
          { name: '디지털가입CX스쿼드' },
          { name: 'AI검색TF' },
        ] },
      ] },
      { name: 'MVNO사업담당' },
    ] },
  ],
}
const ORG_OPEN_DEFAULT = ['LG유플러스', 'Consumer부문', '모바일/디지털사업그룹', '디지털CX트라이브', '디자인시스템스쿼드']
const BREAD = 'Consumer부문 › 모바일/디지털사업그룹 › 디지털CX트라이브'
const ORG_PROFILES = {
  p_lst: { name: '이성택', title: 'UX Architect', team: '디자인시스템스쿼드', email: 'ds.architect@uplus-demo.kr', phone: '010-****-****', work: ['UX Architect', '[2025~] Communication service UX', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_khg: { name: '김형걸', title: 'CX 책임', team: '디지털통합CX팀', email: 'cx.lead@uplus-demo.kr', phone: '010-****-****', work: ['CX 책임', 'VOC 대응·개선 총괄', '- Copilot 경진대회 운영'], mission: '고객을 위한 디지털통합CX팀 미션' },
  p_lead: { name: '강도현', title: '스쿼드 리드', team: '디자인시스템스쿼드', email: 'ds.lead@uplus-demo.kr', phone: '010-****-****', work: ['Design System Lead', '[2024~] CX 디자인시스템 총괄', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_ux: { name: '이도현', title: 'UX Architect', team: '디자인시스템스쿼드', email: 'ds.ux@uplus-demo.kr', phone: '010-****-****', work: ['UX Architect', '[2025~] Communication service UX', '- 너겟 / VOC Action Copilot'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_fe: { name: '정우진', title: 'Frontend Engineer', team: '디자인시스템스쿼드', email: 'ds.fe@uplus-demo.kr', phone: '010-****-****', work: ['Frontend Engineer', 'React · 디자인시스템 컴포넌트', '- VOC Action Copilot 프로토타입'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_res: { name: '김하늘', title: 'UX Researcher', team: '디자인시스템스쿼드', email: 'ds.res@uplus-demo.kr', phone: '010-****-****', work: ['UX Researcher', 'VOC·사용성 리서치', '- 셀프 가이드 콘텐츠 검증'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_pm: { name: '최민재', title: 'Product Manager', team: '디자인시스템스쿼드', email: 'ds.pm@uplus-demo.kr', phone: '010-****-****', work: ['Product Manager', 'CX 프로덕트 기획', '- VOC 대응 프로세스 개선'], mission: '고객을 위한 디자인시스템스쿼드 미션' },
  p_t1: { name: '한지우', title: 'CX 기획', team: '디지털통합CX팀', email: 'cx.plan@uplus-demo.kr', phone: '010-****-****', work: ['CX Planner', 'VOC 운영·리포팅'], mission: '고객을 위한 디지털통합CX팀 미션' },
  p_t2: { name: '오세훈', title: 'CX 데이터', team: '디지털통합CX팀', email: 'cx.data@uplus-demo.kr', phone: '010-****-****', work: ['CX Data Analyst', 'VOC 분류·지표 분석'], mission: '고객을 위한 디지털통합CX팀 미션' },
}
function initials(n) { return (n || '·').slice(0, 1) }
function OrgApp({ notify }) {
  const [sel, setSel] = useState('p_lst')
  const [openSet, setOpenSet] = useState(() => new Set(ORG_OPEN_DEFAULT))
  const [q, setQ] = useState('')
  const toggle = (n) => setOpenSet((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x })
  const demo = (l) => notify && notify.toast(`${l} (데모 — 실제 동작 안 함)`)
  const p = ORG_PROFILES[sel] || ORG_PROFILES.p_ux
  const matches = q ? Object.entries(ORG_PROFILES).filter(([, v]) => (v.name + v.title + v.team).toLowerCase().includes(q.toLowerCase())) : null
  const Node = ({ node, depth }) => {
    const kids = node.children, ppl = node.people
    const hasKids = !!(kids || ppl)
    const isOpen = openSet.has(node.name)
    return (
      <div>
        <div className="org-node" style={{ paddingLeft: depth * 13 + 8 }} onClick={() => hasKids && toggle(node.name)}>
          <span className="org-tog">{hasKids ? (isOpen ? '▾' : '▸') : ''}</span>
          <span className="org-nm">{node.name}</span>
        </div>
        {isOpen && kids && kids.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}
        {isOpen && ppl && ppl.map((id) => {
          const pp = ORG_PROFILES[id] || { name: id }
          return <div key={id} className={'org-person' + (sel === id ? ' on' : '')} style={{ paddingLeft: (depth + 1) * 13 + 14 }} onClick={() => setSel(id)}><span className="org-pdot" />{pp.name} 님</div>
        })}
      </div>
    )
  }
  return (
    <div className="screen portal-screen mailwrap">
      <DemoBanner>조직 정보·연락처는 데모용 예시이며(개인정보 마스킹),</DemoBanner>
      <div className="orgapp">
        <aside className="org-side">
          <div className="org-search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="사원 / 부서 검색" />{q && <button onClick={() => setQ('')}>×</button>}</div>
          <div className="org-tree">
            {matches ? (
              matches.length ? matches.map(([id, v]) => (
                <div key={id} className={'org-person' + (sel === id ? ' on' : '')} style={{ paddingLeft: 12 }} onClick={() => setSel(id)}><span className="org-pdot" />{v.name} 님 <span className="muted">· {v.team}</span></div>
              )) : <div className="org-empty">검색 결과가 없습니다.</div>
            ) : <Node node={ORG_TREE} depth={0} />}
          </div>
        </aside>

        <section className="org-profile">
          <div className="op-banner">
            <div className="op-banner-actions">
              <button onClick={() => demo('프로필 정보 수정')}>프로필 정보 수정</button>
              <button onClick={() => demo('배경이미지 변경')}>배경이미지 변경</button>
            </div>
          </div>
          <div className="op-card">
            <div className="op-id">
              <div className="op-avatar">{initials(p.name)}</div>
              <div className="op-idmain">
                <div className="op-name">{p.name} <span className="op-title">· {p.title}</span></div>
                <div className="op-bread">{BREAD} › {p.team}</div>
                <div className="op-contact">
                  <span className="op-mode">선택근무(09:30~21:00)</span>
                  <span className="op-c"><b>이메일</b> {p.email}</span>
                  <span className="op-c"><b>연락처</b> {p.phone}</span>
                  <span className="op-c"><b>근무지</b> 서울 강서구 마곡 (용산사옥) · 데모</span>
                </div>
                <div className="op-btns">
                  <button onClick={() => demo('칭찬/감사 메시지 보내기')}>칭찬/감사 메시지 보내기</button>
                  <button onClick={() => demo('칭찬/감사 메시지함')}>칭찬/감사 메시지함</button>
                </div>
              </div>
            </div>
            <div className="op-stats">
              <div className="ops-row"><div className="ops-k">도전 등록률</div><div className="ops-v"><div className="ring"><span>0%</span></div></div><div className="ops-d"><b className="magenta">{p.mission}</b></div></div>
              <div className="ops-row"><div className="ops-k">과제 공감수</div><div className="ops-v"><span className="heart">♥ 0</span></div><div className="ops-d">AX 기반 일하는 방식 변화를 위한 나의 과제를 등록해주세요. <span className="muted">(데모)</span></div></div>
              <div className="ops-row"><div className="ops-k">현재 업무</div><div className="ops-v" /><div className="ops-d"><ul className="op-work">{p.work.map((w, i) => <li key={i}>{w}</li>)}</ul></div></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default OrgApp
