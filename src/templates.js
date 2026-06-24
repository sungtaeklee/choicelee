import { draftCustomerMsg, guideFor } from './classify.js'

/* ============================================================
   응대 템플릿 라이브러리 — 재사용 가능한 응대문 스니펫 + 클러스터 공통 응대문 생성
   · REPLY_TEMPLATES: 어디서나 1클릭으로 삽입하는 표준 문구(사과·확인중·완료 등)
   · buildClusterReply: 유사 VOC 묶음(영역·유형)에 보낼 공통 응대문 초안
   ============================================================ */
export const REPLY_TEMPLATES = [
  { key: 'apology', label: '사과·공감', text: '불편을 드려 진심으로 죄송합니다. 말씀해 주신 내용을 확인했습니다.' },
  { key: 'checking', label: '확인 중 안내', text: '현재 담당 부서에서 원인을 확인하고 있으며, 확인되는 대로 신속히 안내드리겠습니다.' },
  { key: 'delay', label: '처리 지연 양해', text: '처리에 시간이 걸려 양해 부탁드립니다. 최대한 빠르게 진행해 안내드리겠습니다.' },
  { key: 'done', label: '해결 완료', text: '요청하신 사항이 정상 처리되었습니다. 추가로 불편하신 점이 있으면 언제든 말씀해 주세요.' },
  { key: 'improve', label: '개선 의견 접수', text: '소중한 의견 감사합니다. 담당 부서에 전달해 개선을 검토하겠습니다.' },
  { key: 'guide', label: '셀프 조치 안내', text: '앱을 최신 버전으로 업데이트하신 뒤 재시도를 부탁드리며, 증상이 지속되면 바로 도와드리겠습니다.' },
  { key: 'thanks', label: '감사 마무리', text: '문의해 주셔서 감사합니다. 더 나은 서비스로 보답하겠습니다.' },
]

/* 심각도별 SLA 목표 처리 기한(일) — 상태별 SLA의 기준값 */
export const SLA_DAYS = { High: 1, Medium: 3, Low: 7 }

/* 분류 가이드(권장 조치)를 단계로 분해해 기본 처리 체크리스트 생성 */
export function defaultChecklist(cat) {
  const g = guideFor(cat)
  const steps = (g ? g.act : '').split(/→|·|,|\/|및/).map((s) => s.trim()).filter((s) => s.length >= 2)
  const base = steps.length ? steps : ['내용·이력 확인', '담당 배정', '고객 안내', '처리 결과 확인']
  return base.slice(0, 6).map((text) => ({ text, done: false }))
}

/* 유사 VOC 클러스터(영역·유형) 공통 응대문 — 분류 가이드 기반 초안 */
export function buildClusterReply(group, cat) {
  const g = guideFor(cat)
  const base = draftCustomerMsg(group, cat, '')
  // 동일 유형 다건에 공통 발송하는 안내문 톤으로 정리
  return g ? base : `'${cat}' 관련 문의를 확인했습니다. ${base}`
}
