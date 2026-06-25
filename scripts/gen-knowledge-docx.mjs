import fs from 'fs'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
import { GROUPS, FIXED_DEPTH2, CAT22, AREA_TREE, OWNER_BY_AREA, AREA_BY_CAT, CAT_GUIDE } from '../src/classify.js'

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, opts = {}) => new Paragraph({ children: [new TextRun({ text: t, ...opts })], spacing: { after: 80 } })
const bullet = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: [new TextRun(t)] })
const num = (t) => new Paragraph({ numbering: { reference: 'n', level: 0 }, children: [new TextRun(t)] })
const mono = (t) => new Paragraph({ children: [new TextRun({ text: t, font: 'Courier New', size: 18 })], spacing: { after: 0 } })

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders = { top: border, bottom: border, left: border, right: border }
const cell = (text, w, head = false) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA },
  shading: head ? { fill: 'F0E0EC', type: ShadingType.CLEAR } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({ children: [new TextRun({ text, bold: head, size: 20 })] })],
})
const mapTable = () => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680],
  rows: [
    new TableRow({ children: [cell('표준분류', 4680, true), cell('대응영역 (depth1 › depth2)', 4680, true)] }),
    ...Object.entries(AREA_BY_CAT).map(([cat, [a1, a2]]) => new TableRow({ children: [cell(cat, 4680), cell(`${a1} › ${a2}`, 4680)] })),
  ],
})

const children = [
  H1('U+ VOICE — VOC 분류 기준 (Copilot Studio Agent Knowledge)'),
  P('사내 Copilot Studio Agent ‘U+VOC 고객가이드’의 지식(Knowledge)으로 업로드해 분류·대응의 일관성을 보장하기 위한 기준 문서입니다. (앱 소스 src/classify.js에서 생성)', { italics: true, color: '666666' }),

  H2('1. VOC구분 6그룹'),
  ...GROUPS.map((g, i) => num(g)),
  P('정형 그룹의 닫힌 분류(구분2):', { bold: true }),
  ...Object.entries(FIXED_DEPTH2).map(([g, arr]) => bullet(`${g}: ${arr.join(' · ')}`)),
  P('정형 3그룹(장애/오류·성능·개선 요청/희망)은 위 닫힌 분류로 매핑, 그 외는 ‘단순 문의/불만/기타’로 보고 아래 22표준분류로 분류합니다.', { color: '666666' }),

  H2('2. 표준분류 22 (철자 그대로 사용)'),
  ...CAT22.map((c) => num(c)),

  H2('3. 대응영역 트리 (depth1 › depth2)'),
  ...Object.entries(AREA_TREE).map(([a1, a2s]) => bullet(`${a1}: ${a2s.join(' · ')}`)),
  P('영역별 담당(참고):', { bold: true }),
  ...Object.entries(OWNER_BY_AREA).map(([a, o]) => bullet(`${a} → ${o}`)),

  H2('4. 표준분류 → 대응영역 권장 매핑'),
  mapTable(),

  H2('5. 분류별 권장 응대·조치'),
  ...Object.entries(CAT_GUIDE).flatMap(([cat, g]) => [
    P(cat, { bold: true }),
    bullet(`고객 응대: ${g.cust}`),
    bullet(`내부 조치: ${g.act}`),
  ]),

  H2('6. 심각도(severity) 판정 기준'),
  bullet('높음(High): 장애/오류 그룹 전체, 또는 이중·중복청구·위약금·환불·미납·접속불가·먹통·불가·끊김·안터 등 고위험 신호어'),
  bullet('보통(Medium): 성능 저하, 또는 불만·짜증·항의·최악·화남·불편 등 불만 표현'),
  bullet('낮음(Low): 일반 문의 수준'),

  H2('7. 출력 형식 (사이트 연동용 구조화 JSON)'),
  P('“JSON으로/구조화 결과/사이트용으로” 요청 시, 설명·코드펜스 없이 아래 객체 하나(여러 건이면 { "items": [ … ] })만 출력합니다.'),
  ...`{
  "voc": "고객 발화 원문(마스킹됨)",
  "channel": "Call | App Store | Medallia | 고객의소리 | 고객센터 (선택)",
  "classification": {
    "group": "장애/오류 | 성능 | 개선 요청/희망 | 단순 문의/불만/기타",
    "category": "22표준분류 중 하나(철자 그대로)",
    "depth1": "MY | 검색/챗봇 | 혜택/멤버십 | 상품/스토어",
    "depth2": "대응영역 트리의 depth2 값",
    "severity": "높음 | 보통 | 낮음",
    "sentiment": "긍정 | 중립 | 부정",
    "urgency": "높음 | 보통 | 낮음",
    "signals": ["판단 근거 신호어"],
    "relatedMenu": "관련 메뉴/경로 (예: 마이페이지_가입정보)",
    "errorType": "연동오류 | 앱/웹 기능오류 | 데이터 정합성 | 접속불가 | 성능 지연 | 기획/정책 | 기타"
  },
  "reviewNeeded": true,
  "confidence": "높음 | 보통 | 낮음",
  "labels": ["VOC", "전사IT업무요청"],
  "insight": { "intent": "핵심 의도 1줄", "risk": "예상 리스크" },
  "actions": { "ownerTeam": ["담당/연계 대상"], "checkpoints": ["확인 점검 항목"] },
  "response": {
    "customerMessage": "고객 응대문",
    "pushMessage": "[U+] 로 시작하는 1~2문장",
    "internalMail": { "title": "담당자 메일 제목", "body": "담당자 메일 본문" }
  },
  "improvements": ["개선 제안"]
}`.split('\n').map(mono),

  H2('규칙'),
  bullet('표/트리에 없으면 가장 가까운 항목 + 값 뒤에 “(확인 필요)”.'),
  bullet('정책·수치(위약금·요율·일정)는 근거 없으면 “(확인 필요)”.'),
  bullet('개발 영역 필드(처리가능단계·실공수·BUG처리결과·개발 일자)는 사람이 채움 — 에이전트가 만들지 않음.'),
  bullet('상담 전사(STT)면 고객 발화만 기준으로 분류.'),
  bullet('개인정보(이름·번호·주소)는 마스킹. JSON 외 텍스트·코드펜스 출력 금지.'),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: 'C00069' }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: '16151C' }, paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children,
  }],
})
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-classification-knowledge.docx', buf); console.log('생성: docs/voc-classification-knowledge.docx (' + buf.length + ' bytes)') })
