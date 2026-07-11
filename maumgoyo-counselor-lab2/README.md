# 마음고요 상담분석실 v11 (20260710v20 — 촉발단서 히트맵 · 충동곡선 시각화)

## 이 버전에서 바뀐 것

### 촉발단서·문제행동영역 히트맵 (v20)
"연쇄 이해" 탭에 새 카드로 추가했습니다. `behavior_areas`, `trigger_places`, `trigger_people`, `trigger_times`, `avoidance_tags` 각각에 대해 등장 횟수와 그 태그가 붙은 기록들의 평균 충동 점수를 함께 보여줍니다. 등장 빈도는 낮지만 평균 충동이 높은 항목(예: 드물게 나오지만 나올 때마다 충동이 강한 상황)을 놓치지 않도록, 빈도만이 아니라 평균 충동 점수도 함께 표시합니다.

### 충동곡선 시각화 (v20)
`urge_initial_score`/`urge_end_score`가 둘 다 기록된 경우("충동 발생" 모드) "연쇄 기록 전체 보기"의 충동 카드에 시작→정점→종료 3점 미니 그래프를 추가했습니다. 둘 중 하나라도 없으면(대부분의 경우) 기존처럼 텍스트만 표시됩니다.

### 요약 저장·인쇄 폴리싱 (v19)
"요약 저장"/"요약 복사"에 공식 재발신호, 걱정-결과 비교 통계, 실천별 즐거움/숙달감 평균을 반영했습니다. 인쇄 시 카드가 페이지 경계에서 잘리지 않도록 CSS를 정리했고, 탭이 9개로 늘어난 데 맞춰 메뉴를 3×3 그리드로 바꿨습니다.

### 8. 걱정-결과 비교 탭 + 즐거움·숙달감 비교 (v17~v18)
`prediction`과 `pleasure_score`/`mastery_score`/`expected_*`를 전용 화면으로 노출합니다.

### CSV 읽기 + 공식 재발신호 + 죽은 코드 정리 (v15~v16)
`maeumgoyo_csv_v1` 전용 단일 읽기 경로, 연동명세서 §5-2 3일 슬라이딩 윈도우 재발신호, 미사용 코드 제거.

## 현재 상태

CSV의 모든 record_type(`observation`/`practice_definition`/`practice_log`/`prediction`)과 주요 필드가 화면에 반영되어 있습니다. 추가로 계획된 항목은 없으며, 이후 변경은 실제 사용 중 발견되는 이슈를 기준으로 진행하는 것을 권장합니다.

## 실행 방법

1. 이전 폴더와 다른 새 폴더에 압축을 풉니다.
2. 기존에 열어 둔 앱 창을 닫고, 새 폴더의 `index.html`을 최신 웹 브라우저에서 엽니다.
3. CSV 파일을 선택하거나 화면 위로 끌어 놓습니다.
4. 화면의 9단계 메뉴에서 측정치 기반 상담 피드백을 검토합니다.

화면 상단 배지가 `20260710v16`이면 이 버전이 적용된 것입니다.

## CSV 형식

- **유일하게 지원하는 규격**: `maeumgoyo_csv_v1`. 공통 열은 `schema_version, record_type, id, date, updated_at, exported_at, client_alias, share_mode, range_days, payload_json`이며, `record_type`은 `observation`/`practice_definition`/`practice_log`/`prediction` 중 하나입니다.
- `schema_version`이 `maeumgoyo_csv_v1`이 아니거나 `share_mode`가 `counselor_full`이 아닌 행은 자동으로 걸러지고 사이드바에 안내가 표시됩니다.
- **실천 계획 완료율**: `practice_definition.frequency`(`daily`/`1week`/`3week`/`custom`), `target_count`, `custom_days`, `start_date`와 CSV의 `range_days`를 이용해 그 기간에 실제로 해당하는 요일이 며칠인지 세어 "약속 총 횟수"를 계산합니다.
- **실천 기록-관찰 연쇄 연결**: v1 CSV의 `practice_log`에는 관찰 기록과 연결하는 필드가 없으므로, 모든 실천 기록은 독립된 연쇄로 표시됩니다.

## 자료 보호 안내

- 이 앱은 불러온 CSV를 브라우저 메모리에서만 처리하며, 원본 파일을 저장하지 않습니다.
- 요약 복사, 인쇄, 요약 저장 결과에는 실제 기록 문장과 상담 메모가 포함될 수 있습니다.
- 승인된 기기와 암호화된 보관 위치에서만 사용하세요.
- 한 번에 한 명의 내담자로 구성된 CSV만 분석할 수 있습니다.

## 구성 파일

- `index.html`: 앱 화면
- `styles-20260710-v11.css`: 화면 스타일
- `app-20260710-v11.js`: CSV 읽기(v1 전용)·재발신호 계산·분석·피드백 로직


