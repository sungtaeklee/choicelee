import fs from 'fs'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from 'docx'

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] })
const P = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, ...o })], spacing: { after: 100 } })
const B = (t) => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: [parseRuns(t)].flat() })
// **bold** 간단 파서
function parseRuns(t) {
  const parts = String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((p) => p.startsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true }) : new TextRun(p))
}

const children = [
  H1('U+ VOICE · VOC Action Copilot'),
  P('Microsoft 365 Copilot 활용 경진대회 제출 개요 — 고객의 소리(VOC)를 AI로 자동 분류·대응하고, 사내 운영 사이트에서 티켓처럼 처리하는 CX 코파일럿', { italics: true, color: '666666' }),

  H2('1. 한 줄 소개'),
  P('“M365 Copilot 에이전트로 VOC를 분류·응대 초안까지 만들고, 그 결과를 사내 VOC 운영 사이트(보드·처리)로 연동해 지라 없이 한 곳에서 처리한다.”'),

  H2('2. 에이전트 — ‘U+VOC voice’'),
  B('**제작 도구**: Microsoft 365 Copilot의 **에이전트 빌더(선언적 에이전트)** — Copilot Studio가 아님 (지시문 + 지식 + 추천 프롬프트로 구성, 별도 코드/플로우 없음)'),
  B('**역할**: 흩어진 VOC(상담콜·앱·홈페이지·메일)를 **4개 그룹·22개 표준분류·대응영역**으로 분류하고, 요약·예상 응대문(고객/문자/담당자 메일)·개선 과제를 생성'),
  B('**근거(지식)**: 분류 기준 문서 + 사내 SharePoint·Teams·메일을 지식으로 연결해 출처 기반 응답'),
  B('**출력**: 사람이 읽는 답변 + “사이트용” 요청 시 구조화 JSON(분류·응대·신호어·레이블·검토필요 등) 출력'),

  H2('3. 사이트 — 사내 VOC 운영(지라형 티켓)'),
  B('**VOC 보드**: 검색·담당자·구분 필터 + 카드(유형·우선순위·라벨·담당자·SLA) + 단계 이동(드래그/버튼) — 보고·판단·배정'),
  B('**VOC 처리(티켓 상세)**: 보고자·담당자·레이블·참조자(검색형 지정), 관련메뉴·오류타입·처리가능단계·실공수(기획/디자인/퍼블/개발)·BUG 처리결과·개발 착수/완료/배포일자, 처리 체크리스트, SLA, 관련 VOC, 활동 타임라인(코멘트·이력), 이미지/영상 첨부'),
  B('**인사이트**: 기간·영역별 추이, High 리스크, 유사 VOC 묶음·개선 우선순위, 클러스터 일괄 응대'),

  H2('4. 연결고리 (양방향)'),
  B('**에이전트 → 사이트**: 에이전트가 만든 JSON을 ‘Copilot Agent 연동’ 화면이 받아 **우리 운영 스키마로 변환·티켓 등록**(단건/여러 건 일괄)'),
  B('**사이트 → 사내 Jira**: 티켓을 지라 형식으로 추출 — 표준 필드 + 커스텀필드(관련메뉴·오류타입·실공수·BUG결과·개발일자 등)'),

  H2('5. 사내 Jira 티켓 생성 — 3가지 방식 (쉬운 순)'),
  B('**① CSV 가져오기(권장·자동화 불필요)**: 보드에서 ‘지라 CSV’로 추출 → Jira ‘이슈 가져오기(Import)’에 업로드 → 컬럼↔필드 매핑 1회 → 일괄 생성'),
  B('**② 메일 등록**: VOC 처리에서 ‘지라 메일 등록’ → 제목·본문이 채워진 메일을 사내 Jira 프로젝트 주소로 발송 → 이슈 생성 (Jira 관리자가 메일 핸들러 1회 설정)'),
  B('**③ 자동 생성(고급)**: CSV/REST API를 Power Automate·Jira 커넥터로 연결해 완전 자동 생성 — 커스텀필드는 이름→Jira 필드 ID 1회 매핑'),

  H2('6. 사내망·보안'),
  B('LLM 키는 서버에만 두고 클라이언트 비노출, 외부 직접호출 없이 **JSON 핸드오프**로 사내 망분리 환경에서도 성립'),
  B('개인정보(이름·번호·주소)는 마스킹 전제로 처리, 분류·응대는 ‘제안’이며 담당자 검수 후 확정'),

  H2('7. 기대효과'),
  B('상담 인입·반복 문의 감소(셀프 안내·자동 응대 초안), 협력업체 수기 분류 비용 절감, 처리 속도·일관성 향상'),
  B('VOC가 보드·티켓·인사이트로 이어지는 **닫힌 루프** — 별도 Jira 없이 분류→처리→이력까지 한 곳에서'),

  H2('제출물'),
  B('에이전트: ‘U+VOC voice’ (M365 Copilot 에이전트 빌더 — 공유 링크/계정 추가로 전달)'),
  B('사이트: U+ VOICE (VOC 보드 · VOC 처리 · 인사이트 · Copilot Agent 연동)'),
  B('지식 문서: voc-classification-knowledge.docx (에이전트 Knowledge용 분류 기준)'),
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
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('docs/voc-copilot-submission.docx', buf); console.log('생성: docs/voc-copilot-submission.docx (' + buf.length + ' bytes)') })
