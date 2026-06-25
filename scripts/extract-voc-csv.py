#!/usr/bin/env python3
# 실 VOC현황 CSV → 마스킹된 학습 데이터 JSON (개인정보 제거 후 에이전트 학습용)
# 사용: python3 scripts/extract-voc-csv.py "<csv경로>"  (기본: Downloads의 해당 파일)
import csv, json, re, sys, collections, os

DEFAULT = os.path.expanduser('~/Downloads/1120260608_VOC현황_디지털CX트라이브_ver1.10.csv')
path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT

# ---- 개인정보 마스킹 ----
def mask(s):
    if not s: return ''
    t = str(s)
    t = re.sub(r'[\w.+-]+@[\w.-]+\.\w+', '[메일]', t)                                   # 이메일
    t = re.sub(r'01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}', '[번호]', t)                     # 휴대폰
    t = re.sub(r'\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b', '[번호]', t)                   # 일반전화
    t = re.sub(r'\d{6}[-.\s]?[1-4]\d{6}', '[주민번호]', t)                               # 주민번호
    t = re.sub(r'\b\d{6,}\b', '[번호]', t)                                               # 고객번호/계정 등 긴 숫자
    # 주소 휴리스틱: 행정구역/도로명 + 숫자
    t = re.sub(r'[가-힣]+(시|군|구|읍|면|동|리|로|길)\s?\d[\d\-가-힣]*', '[주소]', t)
    t = re.sub(r'[가-힣A-Za-z]+(아파트|빌라|타워|오피스텔|맨션|빌딩)\s?\d*(동|호)?', '[주소]', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))

def dist(col, top=None):
    c = collections.Counter((r.get(col) or '').strip() for r in rows)
    c.pop('', None)
    items = c.most_common(top)
    return [{'k': k, 'n': v} for k, v in items]

# 학습예시(플래그 있는 행)만 추출 → 마스킹
GOLDEN = [r for r in rows if (r.get('학습예시') or '').strip()]
examples = []
for r in GOLDEN:
    text = (r.get('요약') or '').strip() or (r.get('내용') or '').strip()
    examples.append({
        'text': mask(text)[:90],
        'g1': (r.get('VOC 구분_1depth') or '').strip(),
        'g2': (r.get('VOC 구분_2depth') or '').strip(),
        'a1': (r.get('대응 영역 구분_1depth') or '').strip(),
        'a2': (r.get('대응 영역 구분_2depth') or '').strip(),
        'conf': (r.get('분류신뢰도') or '').strip(),
        'reason': mask((r.get('분류사유') or '').strip()),
    })

# 자유서술 분류사유(재분류 근거) — L코드 단독은 제외
rationale_free = []
for r in rows:
    rs = (r.get('분류사유') or '').strip()
    if rs and not re.fullmatch(r'\[?L\d{2}\]?.{0,8}', rs):
        rationale_free.append(mask(rs)[:140])
rationale_free = list(dict.fromkeys(rationale_free))[:20]

out = {
    'total': len(rows),
    'goldenCount': len(GOLDEN),
    'dist1d': dist('VOC 구분_1depth'),
    'distArea1': dist('대응 영역 구분_1depth'),
    'distArea2': dist('대응 영역 구분_2depth', 35),
    'confDist': dist('분류신뢰도'),
    'reasonCodes': dist('분류사유'),
    'rationaleFree': rationale_free,
    'examples': examples,
}
dst = os.path.join(os.path.dirname(__file__), 'voc-learning-data.json')
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'생성: {dst}  (전체 {len(rows)} · 학습예시 {len(GOLDEN)})')
