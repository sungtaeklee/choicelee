/* ============================================================
   NPS(Net Promoter Score) — VOC 신호 기반 프록시 + 집계·드라이버 분석
   데모: 설문 점수가 별도로 없으므로 감성·심각도·구분·콘텐츠로 0~10을 결정적으로 추정한다.
   (실배포 시 메달리아 등 실제 설문 점수로 교체 — npsScore만 바꾸면 됨)
   ============================================================ */
const PROMO_RE = /칭찬|감사|고맙|좋아요|최고|만족|친절|훌륭|빠르게 처리|덕분|잘 해결/
const DETRACT_RE = /불만|짜증|화[가나남]|최악|불편|불쾌|답답|환불|피해|손해|안\s?돼|안\s?되|안\s?터|먹통|왜\s?안|항의|실망|황당|도대체|두 ?번|또/

function hash(s) { let h = 0; const t = String(s || ''); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h }

/* 0~10 점수 (결정적) */
export function npsScore(v) {
  const t = `${v.content || ''} ${v.summary || ''}`
  const detractor = v.group === '불만' || v.severity === 'High' || v.sentiment === 'Negative' || DETRACT_RE.test(t)
  // 추천: 칭찬성 코멘트, 또는 처리 완료된 중립 건의 일부(만족 후기 — 결정적 분배)
  const resolvedHappy = !detractor && v.status === '처리 완료' && (hash(v.id) % 3 === 0)
  const promoter = !detractor && (PROMO_RE.test(t) || resolvedHappy || (v.group === '기타' && /칭찬|감사|좋/.test(t)))
  let lo, hi
  if (promoter) { lo = 9; hi = 10 } else if (detractor) { lo = 2; hi = 6 } else { lo = 7; hi = 8 }
  return lo + (hash(v.id) % (hi - lo + 1))
}
export function npsBucket(score) { return score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor' }
export const NPS_LABEL = { promoter: '추천', passive: '중립', detractor: '비추천' }
export const NPS_COLOR = { promoter: '#1a9c5b', passive: '#b45309', detractor: '#d92d20' }
export function npsOf(v) { const score = npsScore(v); return { score, bucket: npsBucket(score) } }

/* 집계: 분포 + NPS 지표(%추천 − %비추천) */
export function npsSummary(list) {
  const n = list.length || 0
  let p = 0, pa = 0, d = 0
  for (const v of list) { const b = npsBucket(npsScore(v)); if (b === 'promoter') p++; else if (b === 'passive') pa++; else d++ }
  const pct = (x) => (n ? Math.round(x / n * 100) : 0)
  return { n, promoter: p, passive: pa, detractor: d, pPct: pct(p), paPct: pct(pa), dPct: pct(d), nps: n ? Math.round((p - d) / n * 100) : 0 }
}

/* Copilot 드라이버 분석: 비추천(detractor)을 표준분류별로 묶어 'NPS를 깎는 원인 TOP' + 개선 시 상승 추정(%p) */
export function npsDrivers(list, topN = 5) {
  const n = list.length || 1
  const m = {}
  for (const v of list) {
    if (npsBucket(npsScore(v)) !== 'detractor') continue
    const k = v.cat || '기타'
    const e = m[k] || (m[k] = { cat: v.cat || '기타', group: v.group, area1: v.area1, n: 0, sampleId: '' })
    e.n++; if (!e.sampleId) e.sampleId = v.id
  }
  return Object.values(m).sort((a, b) => b.n - a.n).slice(0, topN)
    .map((e) => ({ ...e, lift: Math.max(1, Math.round(e.n / n * 100)) })) // 해소 시 NPS 약 +lift %p (추정)
}

/* 세그먼트(대응영역1)별 NPS */
export function npsBySegment(list) {
  const m = {}
  for (const v of list) { const k = v.area1 || '기타'; (m[k] || (m[k] = [])).push(v) }
  return Object.entries(m).map(([seg, arr]) => ({ seg, ...npsSummary(arr) })).sort((a, b) => a.nps - b.nps)
}
