# 변경사항 v86 → v87 — 4번 판단근거 기록 + 관계적 손상 축

## 버전
- 이전: `maeumgoyo-counselor-lab-20260721v86` (개인별 임계값 보정 반영판)
- 이번: `maeumgoyo-counselor-lab-20260721v87` (4번 판단근거 + 관계적 영향 반영판)

## 1) 4번(개입 분기 판단) 판단근거 기록

- 9단계 중 4번만 특정 record_type에 대응하지 않는 순수 임상판단이라, "왜 5번이 아니라 8번을
  택했는가"를 나중에 재구성할 수 없다는 이전 지적을 반영.
- "이번 회기 판단 기록" 패널(기존 CO 필드들과 같은 자리)에 `interventionBranchNote` 텍스트칸 추가.
- `buildCounselorEvidenceItems()`에 `CO-BRANCH-001`(intervention_branch_rationale)로 반영.
- `treatment_participation.intervention_branch_rationale`로 AI 표준 근거자료에 포함.
- AI 전달용 회기연결 메모(MD) 11번 섹션에도 함께 저장(다음 회기 연속성).
- 개인정보 후보 자동 스캔 대상에도 포함.

## 2) 관계적 손상 축 (relational_impact)

- 범위: 성중독뿐 아니라 도박·알코올 등 가족 신뢰 손상이 흔한 **모든 사례에 공통**으로 적용
  (사용자 확인: "모든 사례 공통으로").
- 구현 범위: 이번에는 **상담자 직접 입력(CO) 필드만** 구현. 내담자용 앱(CSV) 측 확장은 하지 않음
  (사용자 확인: "CO 필드만").
- "회기 확인 정보" 패널에 "관계적 영향 확인(선택)" 하위 블록 신설:
  - 공개·발각 상태 (기록안함/해당없음/비공개/부분공개/공개함/발각됨)
  - 관계 회복 진행 상태 (기록안함/해당없음/시도전/진행중/안정화)
  - 상담자 관찰 메모(자유 텍스트) — **화면에 "실명·식별정보 금지" 경고 문구 포함**
- `buildAiEvidencePackage()`에 `relational_impact` 최상위 블록 신설(provenance CO).
- `PROFILE_F_PROMPT`에 반영: 상태 라벨만 사실로 제시하고, 자유 텍스트 메모의 제3자 신원 관련
  표현은 절대 그대로 인용하지 않도록 명시. relational_impact가 not_recorded/not_applicable이면
  F 문서에서 항목 자체를 생략하도록 지침 추가.
- 자체검사 목록에 "제3자 신원을 짐작할 수 있는 표현을 옮기지 않았는가" 항목 추가.

## 안전장치 요약

- 관계적 영향은 **provenance CO**로 명시 — 내담자 자기보고나 독립적 확인을 대체하지 않음을 문서
  자체에 남김.
- 상태 구분(범주)만 구조화하고, 자유 텍스트는 상담자 관찰 메모 하나로 제한.
- 화면 입력 단계, AI 표준 근거자료의 limitation 문구, F 프롬프트, 자체검사까지 4곳에서 반복적으로
  "제3자 신원 정보 금지"를 상기시킴.

## 문서 변경 내역

- `AI_EVIDENCE_SCHEMA.md` — 최상위 구조 표 갱신, `intervention_branch_rationale`·`relational_impact`
  설명 섹션 신설
- `VALIDATION_RULES.md` — 두 필드 모두 검증 오류·경고 대상이 아님을 명시, 자동 스캔의 한계(서술적
  제3자 단서는 못 잡음) 재확인
- `PROFILE_F_WORKFLOW.md` — 필수 검토사항에 두 항목 점검 문구 추가

## 확인한 사항

- `node --check app.js` 문법 검사 통과
- 신규 HTML 요소 ID(`interventionBranchNote`, `relationalDisclosureStatus`, `relationalRepairStatus`,
  `relationalImpactNote`)가 index.html에 정확히 존재하는지 교차 확인
