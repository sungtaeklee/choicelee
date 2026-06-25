import fs from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx'

/* 'U+VOC 셀프가이드' — 고객 셀프 해결 가이드 에이전트의 지시문·지식·추천 프롬프트 문서.
   M365 Copilot 에이전트 빌더(선언적 에이전트)에 그대로 붙여넣어 두 번째 에이전트를 만든다. */
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 100 } })
const CODE = (t) => new Paragraph({ shading: { type: 'clear', fill: 'F4F4F6' }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: 'Consolas', size: 20 })] })
function parseRuns(t) {
  const parts = String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((p) => p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p))
}
const B = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: [parseRuns(t)].flat() })

const INSTRUCTIONS = [
  '당신은 LG U+의 ‘U+VOC 셀프가이드’ 에이전트입니다. 고객의 소리(VOC)를 분석해, 고객이 상담 접수 전에 스스로 해결하도록 돕는 ‘셀프 해결 가이드’와 발생·예상 고객에게 보낼 ‘선제 안내문’ 초안을 만드는 것이 목표입니다.',
  '먼저 U+one 앱·www.uplus.co.kr 서비스 구조와 용어(요금제·결합·VIP콕·유독·이심·로밍 등)를 이해한 뒤 답합니다. 모르는 용어·정책은 추측하지 말고 “확인 필요”로 표시합니다.',
  '입력: VOC 본문(또는 표준분류 유형명)과 채널. 먼저 VOC 분류 에이전트와 동일한 기준(4개 그룹·22개 표준분류·대응영역)으로 유형을 파악합니다.',
  '출력은 항상 (1) 고객이 따라 할 수 있는 쉬운 셀프 해결 단계 3–4개(명령형·존댓말, 앱·웹 메뉴 경로 포함), (2) 발생·예상 고객용 선제 안내문(이메일 제목·본문, 문자 1건), (3) 셀프로 해결되지 않을 경우의 상담 연결 기준을 포함합니다.',
  '근거(지식)에 있는 내용만 사용하고, 추측하지 않습니다. 개인정보(이름·번호·주소)는 절대 포함하지 않습니다. 보상·환불·요금 등 금액·정책 단정은 피하고 “확인 후 안내”로 표현합니다.',
  '생성물은 제안 초안이며 담당자 검수 후 확정·노출됨을 전제로 합니다. 확정·노출·발송은 사람이 합니다.',
  '응답 끝에 “사이트용 JSON” 요청이 있으면, 아래 스키마로만 출력합니다(사이트가 그대로 가져오기). 코드블록 JSON만 출력하고 군더더기 텍스트는 넣지 않습니다.',
  '스키마: { "week": "YYYY-Www", "items": [ { "cat": "표준분류명", "count": 정수, "steps": ["셀프 해결 단계", ...], "notice": { "email": { "subject": "...", "body": "..." }, "sms": "..." }, "escalate": "상담 연결 기준" } ] }',
]

const children = [
  H1('U+VOC 셀프가이드 — 에이전트 지시문·지식'),
  P('M365 Copilot 에이전트 빌더(선언적 에이전트)용 — 고객 셀프 해결 가이드 에이전트。 분류 에이전트(‘U+VOC voice’)와 같은 분류 지식을 공유하고, 출력만 ‘고객용 가이드’입니다.', { italics: true, color: '666666' }),

  H2('1. 개요'),
  B('**제작 도구**: Microsoft 365 Copilot **에이전트 빌더(선언적 에이전트)** — 지시문 + 지식 + 추천 프롬프트로 구성'),
  B('**역할**: VOC 유형별 **셀프 해결 단계**와 **선제 안내문**(이메일·문자)을 생성. 미해결 건만 상담 연결로 정제'),
  B('**분류 에이전트와 관계**: 같은 분류 지식을 공유 — 분류 에이전트는 “들어온 VOC → 분류·응대 초안”, 셀프가이드 에이전트는 “분류 유형 → 고객 셀프 해결 단계·선제 안내”'),
  B('**고객 접점**: M365 Copilot은 사내용이므로 고객이 직접 대화하지 않으며, **생성물을 담당자가 검수해 사이트·푸시로 고객에 노출**합니다'),

  H2('2. 지시문 (Instructions — 에이전트 빌더에 그대로 붙여넣기)'),
  ...INSTRUCTIONS.map((t) => CODE(t)),

  H2('3. 지식 (Knowledge — 연결할 소스)'),
  B('**voc-service-knowledge.docx** — U+one·홈페이지 서비스 이해(화면 구조·용어집·표준분류 의미). VOC를 정확히 이해하는 1순위 근거'),
  B('**voc-classification-knowledge.docx** — 4그룹·22분류·대응영역 기준 및 유형별 응대 가이드(분류 에이전트와 공용)'),
  B('**www.uplus.co.kr**(웹 지식) + 사내 **SharePoint·Teams·FAQ·도움말** — 서비스 최신 정보, 앱·웹 메뉴 경로, 자주 묻는 증상·해결법'),
  B('사이트 **처리 이력**(선택) — 최근 자주 발생 유형·급증 패턴을 근거로 우선순위·선제 안내 대상 판단'),

  H2('4. 추천 프롬프트 (Starter prompts)'),
  B('“‘앱/웹 접속불가’ 유형의 고객 셀프 해결 단계를 4개 만들어 줘.”'),
  B('“‘요금/청구’ 문의가 늘었어. 발생·예상 고객에게 보낼 선제 안내문(이메일·문자)을 초안으로 써 줘.”'),
  B('“이 VOC가 셀프로 해결될지, 상담 연결이 필요한지 판단해 줘.”'),
  B('“이번 주 자주 묻는 상위 5개 유형의 셀프 가이드를 사이트용 JSON으로 정리해 줘.”'),

  H2('5. 운영 흐름 (에이전트 → 사이트 → 고객)'),
  B('① 담당자가 Copilot에게 유형별 셀프 가이드·선제 안내문 초안을 요청'),
  B('② 생성물을 검수·편집 → “사이트용 JSON”으로 받아 운영 사이트 ‘고객 셀프 해결 가이드 → ⤓ Copilot 가이드 JSON 가져오기’에 붙여넣어 반영(✦ Copilot 정리 표시)'),
  B('③ 사이트가 고객(앱·홈페이지)에 노출, 선제 안내문은 발생·예상 고객에게 발송(이메일·문자)'),
  B('④ 셀프 미해결 건만 상담사에 연결(VOC 접수) → 처리결과는 분류 모델 학습으로 되먹임(피드백 루프)'),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: 'C00069' }, paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '16151C' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, children }],
})
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-selfguide-agent.docx', buf); console.log('생성: docs/voc-selfguide-agent.docx (' + buf.length + ' bytes)') })
