# 변경사항 — daily_checkin 감사 기록(gratitude_others/gratitude_self) 반영 + 버전 갱신

## 버전

- 이전: `maeumgoyo-counselor-lab-20260718v84` (파일명: `app-20260717-v66-stage4.js`, `styles-20260717-v66-stage4.css`)
- 이번: `maeumgoyo-counselor-lab-20260721v85` (파일명: `app-20260721-v85.js`, `styles-20260721-v85.css`)

`app.js`의 `APP_VERSION` 상수와 `index.html`의 `<link>`/`<script>` 캐시버스터(`?v=...`) 값을 함께 갱신했습니다.
파일명·버전 문자열·캐시버스터가 서로 어긋나지 않도록 세 곳을 한 번에 맞췄습니다.

이 묶음은 기존 v84 앱에 daily_checkin의 `gratitude_others`(타인에 대한 감사),
`gratitude_self`(자신에 대한 감사) 두 필드를 반영한 v85 버전입니다.

## 바뀐 파일

- `app-20260721-v85.js` (구 `app-20260717-v66-stage4.js`) — 아래 "코드 변경 내역" 참고
- `styles-20260721-v85.css` (구 `styles-20260717-v66-stage4.css`) — 파일명만 버전에 맞춰 변경, 내용 변경 없음
- `index.html` — 새 파일명·버전으로 `<link>`/`<script>` 참조 갱신
- `AI_EVIDENCE_SCHEMA.md` — `gratitude_reflection` 서브블록 설명 추가
- `VALIDATION_RULES.md` — 감사 항목이 검증 오류·경고 대상이 아님을 명시
- `PROFILE_F_WORKFLOW.md` — 필수 검토사항에 감사 기록 점검 항목 추가

## 바뀌지 않은 파일 (참고용으로 그대로 포함)

- `PROMPT_PROFILE_GUIDE.md`, `README.md`

## 코드 변경 내역 (app.js)

1. `normalizeGratitudeList()` 신설 — v100 이전(필드 없음) / v100(문자열) / v101(배열) 세 버전 모두 호환
2. `extractDailyCheckins()`에 `gratitudeOthers`/`gratitudeSelf` 필드 추가
3. `computeGratitudeMeasures()`, `pickRepresentativeGratitude()` 신설 — 건수·기록일수·근거ID·대표 원문 집계
4. `computeCurrentWeeklySnapshot()`에 감사 건수 포함 — 단 `SNAPSHOT_METRICS`에는 넣지 않아 회기비교 화면의
   "▲개선/▼악화" 자동 라벨링 대상에서 제외 (선택 입력 항목이라 건수만으로 개선/악화를 매기지 않기 위함)
5. `renderSessionComparison()`에 감사 건수 변화를 화살표 없이 중립적으로 표시하는 줄 추가
6. `exportSummary()`(이번 회기 비교용 요약 저장) 페이로드에 `gratitudeSummary`(직전 대비 변화 포함),
   `gratitudeHighlights`(대표 원문) 추가
7. `buildAiEvidencePackage()`(AI 표준 근거자료 저장)의 `current_period_app_measures`에
   `gratitude_reflection` 블록 추가 — 건수, 기록일수, 직전 스냅샷 대비 차이, 대표 원문(SR 근거ID 포함)
8. 최상위 `limitations`에 감사 항목 해석 한계 문구 추가
9. `extractDailyReflectionSummaries()`의 날짜별 블록에 그날의 감사 원문 병기
10. `PROFILE_F_PROMPT`에 감사 기록 분석 지침, "이번 주 감사 기록" 표, 직전 주 비교표 행, 자체검사 항목 추가
11. `APP_VERSION`을 `maeumgoyo-counselor-lab-20260721v85`로 갱신

## 확인한 사항

- `node --check app.js` 문법 검사 통과
- `normalizeGratitudeList()` 단위 테스트 통과 (세 버전 CSV 형식 + 실제 v101 예시)
- `index.html`의 `<link>`/`<script>` 참조가 새 파일명·버전과 일치하는지 확인

## 아직 반영하지 않은 것 (필요시 요청)

- 감사 내용에 대한 AI 기반 주제 분류(관계/자기효능감 등) — 원하시면 별도로 설계
