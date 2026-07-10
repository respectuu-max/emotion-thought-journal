# 마음고요 관찰과 실천 CSV 규격

## 목적

이 CSV는 내담자가 상담자에게 생활자료를 전달하여 상황-생각-감정-몸반응-충동-문제행동수준-대처-가치실천의 연쇄를 함께 분석하기 위한 자료입니다.

## 현재 규격

- `schema_version`: `maeumgoyo_compact_v2`
- 인코딩: UTF-8 with BOM
- 형식: CSV
- 한 행: 한 개의 기록
- 세부값: `payload_json` 안에 JSON 문자열로 저장

## 공통 열

```text
schema_version,record_type,id,date,updated_at,exported_at,client_alias,share_mode,range_label,payload_json
```

| 열 | 설명 |
| --- | --- |
| `schema_version` | CSV 규격 버전. 현재 `maeumgoyo_compact_v2` |
| `record_type` | `observation`, `practice_definition`, `practice_log` 중 하나 |
| `id` | 기록 고유 ID |
| `date` | 기록 날짜. `YYYY-MM-DD` |
| `updated_at` | 해당 기록의 마지막 수정 시각 |
| `exported_at` | CSV 파일 생성 시각 |
| `client_alias` | 보호설정에서 지정한 별칭 |
| `share_mode` | CSV는 항상 `counselor_full` |
| `range_label` | `최근 1주`, `최근 2주`, `4주`, `전체` 등 공유 범위 |
| `payload_json` | record_type별 세부 자료 JSON |

## observation payload

```json
{
  "time_slot": "저녁",
  "behavior_areas": ["도박", "성행동"],
  "behavior_custom_areas": ["나만의 별칭"],
  "emotion": "불안",
  "emotion_custom": "",
  "body_reactions": ["가슴 답답함", "두근거림"],
  "body_custom": "",
  "situation": "혼자 집에 있었음",
  "trigger_places": ["집"],
  "trigger_people": ["혼자 있을 때"],
  "trigger_times": ["밤/늦은 시간"],
  "trigger_custom": ["비 오는 날"],
  "avoidance_tags": ["연락에 답하지 않음"],
  "avoidance_custom": [],
  "thought_text": "잠깐만 보면 괜찮을 것 같았다",
  "thought_score": 7,
  "emotion_score": 8,
  "urge_score": 9,
  "urge_initial_score": 6,
  "urge_end_score": 2,
  "action_level": 1,
  "coping": "10분 미루고 밖으로 나감",
  "coping_score": 6,
  "gratitude": "",
  "insight": "",
  "value": "정직",
  "value_action_draft": "상담에서 이 상황을 말하기"
}
```

## observation payload 추가 필드 설명

- `urge_initial_score`, `urge_end_score`: "충동 발생" 모드에서만 선택적으로 기록되는 충동 곡선 값입니다. `urge_score`는 그대로 정점(peak) 충동을 의미하며, 기존 위험 신호·재발 신호 판정 로직은 모두 `urge_score` 기준을 그대로 사용합니다. 두 필드가 비어 있으면(값이 없으면) 그 기록에는 곡선 정보가 없다는 뜻입니다.
- `trigger_places`, `trigger_people`, `trigger_times`, `trigger_custom`: 반복되는 촉발 단서(장소/사람·상황/시간대)를 구조화해 기록한 값입니다. 모두 선택 입력이며, 비어 있는 배열이면 기록하지 않은 것입니다.
- `avoidance_tags`, `avoidance_custom`: 우울·무기력과 관련된 활동 회피 신호(약속 회피, 연락 두절, 위생/식사 소홀 등)를 별도로 기록한 값입니다. `behavior_areas`의 "회피/미루기"·"무기력"과는 별개로, 문제행동과 무관하게 일반적인 활동 축소를 추적하기 위한 필드입니다.

## practice_definition payload

```json
{
  "practice_value": "건강",
  "practice_name": "퇴근 후 10분 걷기",
  "practice_reason": "회피가 좁힌 생활반경을 넓힌다",
  "frequency": "daily",
  "target_count": 1,
  "custom_days": [1, 3, 5],
  "reminder_mode": "morning",
  "reminder_times": "08:00, 20:00",
  "start_date": "2026-07-09",
  "barriers": "피곤함",
  "small_version": "현관 밖으로 나가기",
  "archived": "0"
}
```

## practice_log payload

```json
{
  "practice_id": "practice-id",
  "practice_value": "건강",
  "practice_name": "퇴근 후 10분 걷기",
  "target_count": 1,
  "practice_score": 7,
  "pleasure_score": 8,
  "mastery_score": 7,
  "expected_pleasure_score": 3,
  "expected_mastery_score": 4,
  "practice_note": "5분이라도 걸었다"
}
```

## practice_log payload 추가 필드 설명

행동활성화(Behavioral Activation) 문헌에서는 실천 후 얻은 즐거움·숙달감이 예상보다 컸는지가 우울 개선과 관련이 크다고 보고합니다. 이를 반영해 기존 단일 `practice_score`를 즐거움/숙달감 두 축으로 나누었습니다.

- `pleasure_score`, `mastery_score`: 실천 후 실제로 느낀 즐거움과 숙달감 (0~10). `practice_score`는 두 값의 평균으로 자동 계산되어 기존 통계·CSV 소비 로직과 호환됩니다.
- `expected_pleasure_score`, `expected_mastery_score`: 실천 전 예상한 즐거움·숙달감 (0~10, 선택 입력). 값이 없으면 예상을 남기지 않은 기록입니다. 실제 값과 비교하면 "생각보다 즐거웠다/힘들었다"는 예측-경험 불일치를 분석할 수 있습니다.

## 화면 표시 별칭과 CSV의 관계

- 앱 화면(문제 행동 영역 칩, 기록 카드 등)에는 사용자가 보호하기 화면에서 설정한 별칭이 대신 표시될 수 있습니다.
- 그러나 CSV의 `behavior_areas`, `behavior_custom_areas` 값은 항상 원래 항목 이름(예: `도박`, `성행동`)으로 저장되며, 화면 표시 별칭의 영향을 받지 않습니다.
- 따라서 상담자 분석 앱은 이 문서에 정의된 원래 항목 이름을 기준으로 안정적으로 분석할 수 있습니다.

## 재발 신호 로직 (앱 화면에 표시되는 참고 지표)

앱 화면(오늘할일, 재발예방 탭)에는 CSV와 별도로 클라이언트 측에서만 계산되는 "재발 신호" 참고 지표가 표시됩니다. CSV 자체에는 이 값이 별도 열로 저장되지 않으며, 아래 로직은 상담자 분석 앱에서 동일한 원자료(`observation` 레코드의 `emotion_score`, `thought_score`, `urge_score`, `coping_score`, `action_level`)로부터 동일하게 재현할 수 있도록 공유하는 참고 기준입니다. 임상적 판단을 대체하지 않으며, 상담에서 조정 가능한 참고값입니다.

- 관찰 창: 최근 3일 / 비교 창: 그 이전 3일
- 정서적 재발 신호: 최근 3일 평균 `emotion_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균이 이전 3일보다 2점 이상 상승, 또는 `coping_score` ≤ 3이 2회 이상 유지, 또는 이전 대비 2점 이상 하락, 또는 최근 3일 `emotion_score`의 표준편차 ≥ 2.5(기록이 3건 이상일 때만 적용, 감정 기복 자체를 신호로 봄)
- 인지적 재발 신호: 최근 3일 평균 `thought_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균 `urge_score` ≥ 7, 또는 `urge_score` ≥ 7이면서 `action_level` = 0인 기록이 2회 이상
- 행동적 재발 신호: 최근 3일 중 `action_level` ≥ 1인 기록이 1건이라도 있으면 발생, `action_level` ≥ 4는 즉시 확인이 필요한 수준으로 별도 표시
- 두 개 이상의 재발 신호가 동시에 성립할 수 있으며, 이 경우 화면에는 겹쳐서 표시됩니다.
- 추세보기와 상담자 요약에는 선택한 기간 전체의 `emotion_score`, `urge_score` 표준편차("감정 기복", "충동 기복")도 별도로 표시됩니다. 평균이 낮아도 편차가 크면 정서 조절이 불안정하다는 신호일 수 있다는 문헌에 근거합니다.

## 상담자 분석 앱에서의 권장 처리

- `schema_version`이 `maeumgoyo_compact_v2`인지 먼저 확인합니다.
- `record_type`별로 `payload_json`을 JSON.parse 합니다.
- `observation` 행을 중심으로 상황-생각-감정-몸반응-충동-문제행동수준-대처를 재구성합니다.
- `practice_log.practice_id`를 `practice_definition.id`와 연결합니다.
- CSV는 상담자 치료자료 전체본이므로 가족 공유 자료로 사용하지 않습니다.
