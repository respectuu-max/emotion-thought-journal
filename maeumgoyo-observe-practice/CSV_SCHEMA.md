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
  "thought_text": "잠깐만 보면 괜찮을 것 같았다",
  "thought_score": 7,
  "emotion_score": 8,
  "urge_score": 9,
  "action_level": 1,
  "coping": "10분 미루고 밖으로 나감",
  "coping_score": 6,
  "gratitude": "",
  "insight": "",
  "value": "정직",
  "value_action_draft": "상담에서 이 상황을 말하기"
}
```

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
  "practice_note": "5분이라도 걸었다"
}
```

## 화면 표시 별칭과 CSV의 관계

- 앱 화면(문제 행동 영역 칩, 기록 카드 등)에는 사용자가 보호하기 화면에서 설정한 별칭이 대신 표시될 수 있습니다.
- 그러나 CSV의 `behavior_areas`, `behavior_custom_areas` 값은 항상 원래 항목 이름(예: `도박`, `성행동`)으로 저장되며, 화면 표시 별칭의 영향을 받지 않습니다.
- 따라서 상담자 분석 앱은 이 문서에 정의된 원래 항목 이름을 기준으로 안정적으로 분석할 수 있습니다.

## 상담자 분석 앱에서의 권장 처리

- `schema_version`이 `maeumgoyo_compact_v2`인지 먼저 확인합니다.
- `record_type`별로 `payload_json`을 JSON.parse 합니다.
- `observation` 행을 중심으로 상황-생각-감정-몸반응-충동-문제행동수준-대처를 재구성합니다.
- `practice_log.practice_id`를 `practice_definition.id`와 연결합니다.
- CSV는 상담자 치료자료 전체본이므로 가족 공유 자료로 사용하지 않습니다.
