import fs from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx'

/* 'U+VOC 고객가이드' — VOC 분류·분석 에이전트의 지시문·지식·추천 프롬프트.
   실 CSV 기준 6분류(정형 3 + 열림 3)로 재교육. M365 Copilot 에이전트 빌더에 그대로 붙여넣기. */
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 100 } })
const CODE = (t) => new Paragraph({ shading: { type: 'clear', fill: 'F4F4F6' }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: 'Consolas', size: 19 })] })
function parseRuns(t) { return String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p)) }
const B = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: [parseRuns(t)].flat() })

const INSTRUCTIONS = [
  '당신은 LG U+의 ‘U+VOC 고객가이드’ 에이전트입니다. 고객의 소리(VOC)를 분석해 분류·요약·예상 응대문·개선 과제를 만드는 것이 목표입니다.',
  '먼저 U+one 앱·www.lguplus.com 서비스 구조와 용어(요금제·결합·VIP콕·유독·이심·로밍·IMSI 등)를 이해한 뒤 분류합니다. 모르는 용어·정책은 추측하지 말고 “확인 필요”로 표시합니다.',
  'VOC구분 1depth는 6분류입니다. 정형 3: 장애/오류 · 성능 · 개선 요청/희망. 열림 3: 단순 문의 · 불만 · 기타.',
  '정형 판정: 오류·에러·먹통·튕김·접속불가·로그인불가 → 장애/오류 / 느림·버벅·백화·로딩 → 성능 / 개선·바꿔·추가했으면·알림 끄기 → 개선 요청/희망.',
  '열림 판정(정형이 아닐 때): 부정 감정·항의·불능(짜증·화남·불편·안 됨·환불·피해·도대체·ㅠㅠ) → 불만 / 칭찬·감사·스팸·설문·이벤트 → 기타 / 그 외 질문·요청 → 단순 문의.',
  '열림 그룹은 22개 표준분류로 세분하고, 모든 건에 대응영역(MY · 상품/스토어 · 혜택/멤버십 · 검색/챗봇 · 플러스탭 · 기타, 2depth 예: 요금/납부/청구·회원/로그인/ID·IMSI·VIP콕 등)을 지정합니다.',
  '출력: (1) 핵심 의도 한 줄 요약, (2) 예상 응대문(고객용·문자(SMS)·담당자 메일), (3) 심각도(High/Medium/Low)·감성(긍정/부정/중립), (4) 개선 과제(해당 시).',
  '분류 신뢰도(상/중/하)를 매기고, 신뢰도 ‘하’ 또는 분류사유 코드(L01 원문 짧음·내용 불충분, L02 사측 안내문, L04 다주제·감정 위주 혼재, L05 내부 확인성, L06/L07 주제 불명확)에 해당하면 자동 확정하지 말고 ‘검토필요(review=true)’로 표시합니다.',
  '개인정보(이름·번호·주소)는 마스킹하고 출력에 포함하지 않습니다. 보상·환불·요금 등 금액·정책은 단정하지 말고 “확인 후 안내”로 표현합니다. 분류·응대는 제안이며 담당자 검수 후 확정됩니다.',
  '응답 끝에 “사이트용 JSON” 요청이 있으면 아래 스키마로만 출력합니다(운영 사이트 ‘Copilot Agent 연동’이 그대로 가져오기). 코드블록 JSON만 출력합니다.',
]
const SCHEMA = '{ "items": [ { "channel": "인입채널", "content": "원문(마스킹)", "group": "장애/오류|성능|개선 요청/희망|단순 문의|불만|기타", "cat": "표준분류", "area1": "대응영역1", "area2": "대응영역2", "severity": "High|Medium|Low", "sentiment": "긍정|부정|중립", "summary": "핵심 의도", "confidence": "상|중|하", "review": true|false, "relatedMenu": "", "errorType": "", "labels": [] } ] }'

const children = [
  H1('U+VOC 고객가이드 — 에이전트 지시문·지식 (6분류 재교육)'),
  P('M365 Copilot 에이전트 빌더(선언적 에이전트)용 — VOC 분류·분석 에이전트. 실 VOC현황 CSV 기준 6분류(정형 3 + 열림 3)로 재교육.', { italics: true, color: '666666' }),

  H2('1. 개요'),
  B('**제작 도구**: Microsoft 365 Copilot **에이전트 빌더(선언적 에이전트)** — 지시문 + 지식 + 추천 프롬프트'),
  B('**역할**: 흩어진 VOC(상담콜·앱·홈페이지·메일)를 6분류·22표준분류·대응영역으로 분류하고 요약·예상 응대문·개선 과제를 생성'),
  B('**셀프가이드 에이전트와 관계**: 같은 분류 지식을 공유 — 고객가이드는 “VOC → 분류·응대 초안”, 셀프가이드는 “유형 → 고객 셀프 해결·선제 안내”'),

  H2('2. 지시문 (Instructions — 에이전트 빌더에 그대로 붙여넣기)'),
  ...INSTRUCTIONS.map((t) => CODE(t)),

  H2('3. 지식 (Knowledge — 연결할 소스)'),
  B('**voc-service-knowledge.docx** — U+one·홈페이지 서비스 이해(화면 구조·용어·기능 지도). 1순위 근거'),
  B('**voc-classification-knowledge.docx** — 6분류·22표준분류·대응영역 기준 및 유형별 응대 가이드'),
  B('**voc-learning-examples.docx** — 실데이터 골든 학습예시 889건 + 신뢰도·분류사유 코드(few-shot)'),
  B('**www.lguplus.com**(웹 지식) + 사내 SharePoint·Teams·FAQ — 서비스 최신 정보'),

  H2('4. 추천 프롬프트 (Starter prompts)'),
  B('“이 VOC를 6분류로 분류하고 핵심 의도·예상 응대문을 만들어 줘.”'),
  B('“이 건이 불만인지 단순 문의인지, 신뢰도와 함께 판단해 줘.”'),
  B('“아래 VOC 목록을 사이트용 JSON으로 분류해 줘.”'),
  B('“근거가 부족하면 검토필요로 표시하고 이유(L코드)를 알려 줘.”'),

  H2('5. 사이트용 출력 JSON 스키마 (Copilot Agent 연동)'),
  CODE(SCHEMA),
  P('운영 사이트 ‘Copilot Agent 연동’ 화면에 이 JSON을 붙여넣으면 티켓으로 변환·등록된다(단건/여러 건).', { color: '666666' }),

  H2('6. 운영 흐름'),
  B('① 에이전트가 VOC를 6분류·응대 초안으로 생성 → ② “사이트용 JSON” → 사이트 ‘Copilot Agent 연동’에 등록 → ③ 보드·티켓에서 검수·처리 → ④ 지라 연동, 처리결과는 학습으로 되먹임'),
]

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: 'C00069' }, paragraph: { spacing: { before: 120, after: 100 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, color: '16151C' }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, children }],
})
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-classification-agent.docx', buf); console.log('생성: docs/voc-classification-agent.docx (' + buf.length + ' bytes)') })
