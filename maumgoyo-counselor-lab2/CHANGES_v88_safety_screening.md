# 변경사항 v87 → v88 — 자살·자해 위험 선별 (safety_screening)

## 버전
- 이전: `maeumgoyo-counselor-lab-20260721v87`
- 이번: `maeumgoyo-counselor-lab-20260721v88`

## 왜 필요했는가

9개 지표, 9단계, 관계적 영향 축까지 모두 "재발/문제행동" 축을 중심으로 설계되어 있어, 자살·자해
사고를 명시적으로 묻거나 추적하는 자리가 없었다. 특히 v87에서 추가한 관계적 영향 축의 "발각됨"
상태가, 배신외상·재정위기 문헌에서 급성 자살위험이 몰리는 시기로 보고되는 지점과 겹친다는 점을
계기로 최소한의 선별 장치를 추가했다.

## 구현 내용

- "회기 확인 정보" 패널 최상단에 `safetyScreeningStatus`(3단계 + 기록하지 않음) 선택칸과
  `safetyScreeningNote`(선택, 조치 기록) 추가.
  - 없음 / 경미한 사고 있으나 계획·의도 없음 / 위험도 높음(계획·의도·수단 관련 언급)
- "위험도 높음" 선택 시, **자동 초점 판정(crisisScore 등)과 완전히 무관하게** 화면 최상단에
  전용 안전 배너(`safetyScreeningBanner`)가 강제로 표시됨 — 기존 "이번 주 종합 상태" 배너보다
  위에, 위기 신호 유무나 CSV 로드 여부와 무관하게 항상 우선.
- `relational_impact.disclosure_status`가 "발각됨"으로 바뀌는 순간, 안전 선별을 다시 확인하라는
  토스트 알림 + 입력칸 포커스 이동.
- **매 회기 새로 확인해야 함** — 임계값·관계적 영향과 달리 다음 회기로 절대 자동 이어지지 않음
  (`resetAll()`에서 항상 "기록하지 않음"으로 초기화).
- `buildAiEvidencePackage()`에 `safety_screening` 블록 신설(provenance CO,
  `persists_across_sessions: false`).
- **모든 프롬프트 프로필(A~H) 공통 규칙에 절대 인용 금지 지침 추가** — `COMMON_PROFILE_RULES`에
  "JSON에 safety_screening 필드가 있어도 절대 인용·요약하지 마라"를 명시. 이 항목은 세션 내 안전
  확인용이며 어떤 외부 문서(F/G/H 포함)에도 포함되지 않는다.
- 자유 텍스트 메모(`safetyScreeningNote`)도 개인정보 후보 자동 스캔 대상에 포함.

## 설계 원칙

- 이 도구는 위험을 **판정하지 않는다** — "확인했는지 여부"만 강제하고, 실제 임상 판단은 전적으로
  상담자 몫으로 남긴다(이 앱 전체의 설계 철학과 일치).
- 표준화된 평가 도구를 자처하지 않는다. 짧은 3단계 분류이며, 그 이상의 임상적 확신을 담지 않는다.
- 절대 외부 제출 문서에 섞이지 않도록 스키마·프롬프트 공통 규칙·문서 3곳 모두에서 명시.

## 문서 변경 내역

- `AI_EVIDENCE_SCHEMA.md` — 최상위 구조 표 갱신, `safety_screening` 설명 섹션 신설(F/G/H 절대
  미포함 원칙 포함)
- `VALIDATION_RULES.md` — 안전 선별은 검증 대상이 아니며 문서 생성 가능 여부와 무관함을 명시
- `PROFILE_F_WORKFLOW.md` — 필수 검토사항에 "문서 어디에도 safety_screening 내용이 없는가" 추가

## 확인한 사항

- `node --check app.js` 문법 검사 통과
- 신규 HTML 요소 ID(`safetyScreeningStatus`, `safetyScreeningNote`, `safetyScreeningBanner`)가
  index.html에 정확히 존재하는지 교차 확인
- els 참조 중복 키 없음을 전수 확인
