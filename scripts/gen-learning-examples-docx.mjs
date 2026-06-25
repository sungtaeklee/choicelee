import fs from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx'

/* 실 VOC현황 CSV(디지털CX트라이브) → 에이전트 학습용 Knowledge.
   분포 분석 + 신뢰도 기준 + 분류사유 코드 + 골든 학습예시(개인정보 마스킹).
   데이터: scripts/voc-learning-data.json (extract-voc-csv.py가 생성) */
const data = JSON.parse(fs.readFileSync(new URL('./voc-learning-data.json', import.meta.url)))

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 80 } })
function runs(t) { return String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p)) }
const B = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 28 }, children: [runs(t)].flat() })
const EX = (t) => new Paragraph({ numbering: { reference: 'ex', level: 0 }, spacing: { after: 18 }, children: [runs(t)].flat() })

// 분류사유 코드 의미(파일 분석 기준)
const REASON_LEGEND = [
  '**L01** — 원문이 너무 짧음·내용 불충분·모호·이모지만 존재 (분류 근거 부족)',
  '**L02** — 사측 발송 안내문 등으로 분류 모호',
  '**L04** — 복수 주제 혼재·감정/비난 위주·경위가 길고 복합',
  '**L05** — 내부 확인성(추가 확인 필요)',
  '**L06 · L07** — 주제 불명확',
]
const G_ORDER = ['장애/오류', '성능', '개선 요청/희망', '단순 문의', '불만', '기타']
const fmtDist = (arr, top) => (top ? arr.slice(0, top) : arr).map((x) => `${x.k}(${x.n})`).join(' · ')

// 골든 예시 그룹화
const byG = {}
for (const e of data.examples) { (byG[e.g1] || (byG[e.g1] = [])).push(e) }
const groups = [...G_ORDER.filter((g) => byG[g]), ...Object.keys(byG).filter((g) => !G_ORDER.includes(g))]

const exLine = (e) => {
  const area = [e.a1, e.a2].filter(Boolean).join(' › ')
  const tail = [e.g2 && `[${e.g2}]`, area && `영역: ${area}`, e.conf && `신뢰도 ${e.conf}`, e.reason && `사유 ${e.reason}`].filter(Boolean).join(' · ')
  return `${e.text || '(빈 요약)'}  →  ${tail}`
}

const children = [
  H1('VOC 분류 학습 데이터 (디지털CX트라이브 실데이터)'),
  P('실 VOC현황 CSV를 분석한 에이전트 학습용 지식. 분포·신뢰도 기준·분류사유 코드와 골든 학습예시를 담는다. 모든 예시는 개인정보(번호·주소·메일)를 마스킹했다.', { italics: true, color: '666666' }),

  H2('1. 데이터 분석 요약'),
  B(`전체 ${data.total.toLocaleString()}건 중 **골든 학습예시 ${data.goldenCount}건** 추출(라벨 검증된 예시)`),
  B(`**VOC구분 1depth**: ${fmtDist(data.dist1d)}`),
  B(`**대응영역 1depth**: ${fmtDist(data.distArea1)}`),
  B(`**대응영역 2depth(상위)**: ${fmtDist(data.distArea2, 18)}`),
  B(`**분류 신뢰도 분포**: ${fmtDist(data.confDist)}`),
  P('주의: 1depth는 실데이터에서 단순 문의·불만·기타가 분리돼 있고, 대응영역에 IMSI·플러스탭·인터넷/TV 가입·제휴(네이버 등)가 포함된다.', { color: '666666' }),

  H2('2. 분류 신뢰도 기준 (상 / 중 / 하)'),
  B('**상** — 원문이 명확하고 단일 주제, 근거가 충분 → 자동 분류 신뢰'),
  B('**중** — 주제는 잡히나 일부 모호 → 담당 검수 권장'),
  B('**하** — 근거 부족·다주제·감정 위주 → 반드시 사람 검토(검토필요)'),

  H2('3. 분류사유 코드 (낮은 신뢰도/검토 사유)'),
  ...REASON_LEGEND.map((t) => B(t)),
  P('재분류 근거 예시(자유 서술):', { bold: true }),
  ...data.rationaleFree.map((t) => B(t)),

  H2(`4. 골든 학습예시 (${data.goldenCount}건 · 마스킹) — 요약 → 정답 라벨`),
  P('형식: 요약 → [VOC구분 2depth] · 영역: 1depth › 2depth · 신뢰도 · 사유. 에이전트가 이 매핑을 few-shot으로 학습한다.', { color: '666666' }),
  ...groups.flatMap((g) => [H2(`· ${g} (${byG[g].length}건)`), ...byG[g].map((e) => EX(exLine(e)))]),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 29, bold: true, color: 'C00069' }, paragraph: { spacing: { before: 120, after: 90 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, color: '16151C' }, paragraph: { spacing: { before: 150, after: 60 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 230 } } } }] },
      { reference: 'ex', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 200 } } } }] },
    ],
  },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }],
})
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-learning-examples.docx', buf); console.log('생성: docs/voc-learning-examples.docx (' + buf.length + ' bytes)') })
