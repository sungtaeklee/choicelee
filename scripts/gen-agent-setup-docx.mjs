import fs from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx'

/* 한 장짜리 — M365 Copilot 에이전트 2종 세팅 체크리스트 (담당자 전달용) */
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 80 } })
const CODE = (t) => new Paragraph({ shading: { type: 'clear', fill: 'F4F4F6' }, spacing: { after: 50 }, children: [new TextRun({ text: t, font: 'Consolas', size: 19 })] })
function parseRuns(t) { return String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p)) }
const CHK = (t) => new Paragraph({ numbering: { reference: 'c', level: 0 }, spacing: { after: 40 }, children: [parseRuns(t)].flat() })
const B = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 40 }, children: [parseRuns(t)].flat() })

const children = [
  H1('M365 Copilot 에이전트 세팅 체크리스트'),
  P('U+ VOICE · VOC Action Copilot — 에이전트 2종(분류·분석 / 셀프가이드)을 에이전트 빌더로 만드는 1장 가이드', { italics: true, color: '666666' }),

  H2('공통 절차 (두 에이전트 동일)'),
  CHK('**M365 Copilot → 에이전트 → 에이전트 만들기 → 구성(Configure)** 선택 (Copilot Studio 아님)'),
  CHK('**이름·설명** 입력 → **지시문(Instructions)** 붙여넣기(아래) → **지식(Knowledge)** 업로드 → **추천 프롬프트** 입력'),
  CHK('**지식 공통**: voc-classification-knowledge.docx (4그룹·22분류·대응 가이드) + 사내 SharePoint·Teams·FAQ 연결'),
  CHK('**저장 → 채팅에서 테스트 → 공유**(심사/동료 계정 추가) — M365 Copilot 라이선스 보유 사내 계정만 접근'),

  H2('에이전트 ① ‘U+VOC voice’ — 분류·분석'),
  P('지시문(요지): 흩어진 VOC를 4그룹·22분류·대응영역으로 분류하고 요약·예상 응대문(고객/문자/담당자 메일)·개선 과제 생성. “사이트용” 요청 시 구조화 JSON 출력.', {}),
  P('추천 프롬프트:', { bold: true }),
  CODE('이 VOC를 분류하고 요약·예상 응대문을 만들어 줘'),
  CODE('아래 VOC 목록을 사이트용 JSON으로 분류해 줘'),
  P('활용: JSON 출력 → 사이트 ‘Copilot Agent 연동’에 붙여넣기 → 티켓 자동 생성', { color: '666666' }),

  H2('에이전트 ② ‘U+VOC 셀프가이드’ — 고객 셀프 해결'),
  P('지시문(붙여넣기):', { bold: true }),
  CODE('당신은 LG U+의 ‘U+VOC 셀프가이드’ 에이전트입니다. VOC를 22분류로 파악한 뒤'),
  CODE('① 고객 셀프 해결 단계 3~4개(존댓말·메뉴경로) ② 선제 안내문(이메일 제목+본문, 문자 1건)'),
  CODE('③ 상담 연결 기준 을 출력. 지식에 있는 것만, 개인정보 금지, 금액·정책은 “확인 후 안내”.'),
  CODE('생성물은 검수 후 노출되는 초안. “사이트용”이면 {유형,셀프단계[],선제안내{이메일,문자},상담연결조건} JSON.'),
  P('추천 프롬프트:', { bold: true }),
  CODE('‘앱/웹 접속불가’ 셀프 해결 단계를 4개 만들어 줘'),
  CODE('‘요금/청구’ 선제 안내문(이메일·문자) 초안 써 줘'),
  P('활용: 생성물 검수 → 사이트 ‘셀프 해결 가이드’(✦ Copilot 생성)에 반영 + 선제 안내 발송', { color: '666666' }),

  H2('포지셔닝 (한 줄)'),
  B('고객이 에이전트와 직접 대화하지 않습니다. **담당자가 Copilot으로 생성 → 검수 → 사이트가 고객에 노출**하는 구조 (두 에이전트 동일)'),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: 'C00069' }, paragraph: { spacing: { before: 100, after: 100 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, color: '16151C' }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } }] },
      { reference: 'c', levels: [{ level: 0, format: LevelFormat.BULLET, text: '☐', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } }] },
    ],
  },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }],
})
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-agent-setup-checklist.docx', buf); console.log('생성: docs/voc-agent-setup-checklist.docx (' + buf.length + ' bytes)') })
