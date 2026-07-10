# 마음고요 관찰과 실천 CSV 규격

## 목적

이 CSV는 내담자가 상담자에게 생활자료를 전달하여 상황-생각-감정-몸반응-충동-문제행동수준-대처-가치실천의 연쇄를 함께 분석하기 위한 자료입니다.

## 현재 규격

- `schema_version`: `maeumgoyo_csv_v1` (정식 배포 전 정리한 기준 버전)
- 인코딩: UTF-8 with BOM
- 형식: CSV
- 한 행: 한 개의 기록
- 세부값: `payload_json` 안에 JSON 문자열로 저장

## 버저닝 정책

`schema_version`은 아래 규칙에 따라서만 올립니다.

- **필드를 추가만 하는 변경** (예: 새로운 선택 입력 필드, 새 record_type 추가): `schema_version`은 그대로 두고, 이 문서의 "필드 도입 이력" 표에만 기록합니다. 기존 필드의 이름·의미·타입은 건드리지 않는 것이 전제입니다.
- **하위 호환이 깨지는 변경** (필드 이름 변경, 필드 삭제, 값의 의미나 타입 변경, "고정 어휘 목록"에서 항목 삭제·이름 변경): 반드시 `schema_version`을 올립니다 (`maeumgoyo_csv_v1` → `maeumgoyo_csv_v2` 등).

이 규칙 덕분에 상담자 분석 앱은 "`schema_version`이 그대로면 이전에 읽던 필드는 최소한 그대로 존재한다"는 것을 신뢰할 수 있습니다. CSV 가져오기 로직도 `schema_version`이 다른 행은 읽지 않고 건너뛰므로, 구조가 다른 파일이 섞여도 기존 데이터를 깨뜨리지 않습니다.

## 공통 열

```text
schema_version,record_type,id,date,updated_at,exported_at,client_alias,share_mode,range_days,payload_json
```

| 열 | 설명 |
| --- | --- |
| `schema_version` | CSV 규격 버전. 현재 `maeumgoyo_csv_v1` |
| `record_type` | `observation`, `practice_definition`, `practice_log`, `prediction` 중 하나 |
| `id` | 기록 고유 ID |
| `date` | 기록 날짜. `YYYY-MM-DD` |
| `updated_at` | 해당 기록의 마지막 수정 시각 (ISO 8601) |
| `exported_at` | CSV 파일 생성 시각 |
| `client_alias` | 보호설정에서 지정한 내담자 별칭 |
| `share_mode` | CSV는 항상 `counselor_full` |
| `range_days` | 내보낼 때 선택한 기간을 나타내는 기계 판독용 값. `7` / `14` / `28` 처럼 숫자이거나, 전체 기간이면 문자열 `"all"`. 사람이 읽는 기간 표현("최근 1주" 등)은 CSV에는 넣지 않고, 상담자 요약 텍스트에만 사용합니다. |
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

### observation 필드 설명

- `urge_initial_score`, `urge_end_score`: "충동 발생" 모드에서만 선택적으로 기록되는 충동 곡선 값입니다. `urge_score`는 그대로 정점(peak) 충동을 의미하며, 위험 신호·재발 신호 판정 로직은 모두 `urge_score` 기준을 그대로 사용합니다. 두 필드가 비어 있으면 그 기록에는 곡선 정보가 없다는 뜻입니다.
- `trigger_places`, `trigger_people`, `trigger_times`, `trigger_custom`: 반복되는 촉발 단서(장소/사람·상황/시간대)를 구조화해 기록한 값입니다. 모두 선택 입력이며, 비어 있는 배열이면 기록하지 않은 것입니다.
- `avoidance_tags`, `avoidance_custom`: 우울·무기력과 관련된 활동 회피 신호(약속 회피, 연락 두절, 위생/식사 소홀 등)를 별도로 기록한 값입니다. `behavior_areas`의 "회피/미루기"·"무기력"과는 별개로, 문제행동과 무관하게 일반적인 활동 축소를 추적하기 위한 필드입니다.

### 고정 어휘 목록 (이 목록의 항목을 삭제하거나 이름을 바꾸면 schema_version을 올려야 합니다)

이 필드들은 앱 코드에 정의된 고정 목록에서 값이 채워집니다. 목록에 항목을 **추가**하는 것은 필드 추가와 동일하게 취급하되(구버전 호환에 영향 없음), 기존 항목을 **삭제·개명**하는 것은 하위 호환이 깨지는 변경입니다.

| 필드 | 고정 어휘 |
| --- | --- |
| `behavior_areas` | 도박, 성행동, 쇼핑, 음주, 게임, 스마트폰/인터넷, 회피/미루기, 분노표출, 과식, 자기비난, 무기력 (그 외 값은 `behavior_custom_areas`에 자유 입력으로 들어감) |
| `trigger_places` | 집, 직장/학교, 이동 중(차·대중교통), 술자리/모임, 온라인/SNS |
| `trigger_people` | 혼자 있을 때, 특정 인물과 함께, 갈등 직후, 사교 모임 상황 |
| `trigger_times` | 아침, 낮, 저녁, 밤/늦은 시간, 주말 |
| `avoidance_tags` | 약속/모임에 안 나감, 연락에 답하지 않음, 씻기/식사를 미룸, 하루 종일 집에만 있음, 해야 할 일을 미룸 |
| `time_slot` | 오전, 오후, 저녁, 충동 발생 |
| `value` | 건강, 관계, 정직, 책임, 자기존중, 성장, 안정, 회복, 자유, 배움, 돌봄, 신뢰, 절제, 용기, 의미 (직접 입력 가능) |
| `emotion` | 불안, 외로움, 분노, 공허함, 수치심, 우울, 초조, 지루함, 피곤함, 무기력 (그 외 값은 `emotion_custom`에 자유 입력으로 들어감) |
| `body_reactions` | 가슴 답답함, 두근거림, 근육 긴장, 열감, 손 떨림, 시선 고정, 멍함, 얼어붙음, 호흡 짧음 (그 외 값은 `body_custom`에 자유 입력으로 들어감) |

`emotion`, `body_reactions`는 자유 입력(`emotion_custom`, `body_custom`)의 비중이 커서, 위 목록에 없는 값이 섞여 있을 수 있습니다.

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

`frequency`는 `daily` / `custom` 중 하나, `reminder_mode`는 `morning` / `times` / `off` 중 하나입니다.

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

행동활성화(Behavioral Activation) 문헌에서는 실천 후 얻은 즐거움·숙달감이 예상보다 컸는지가 우울 개선과 관련이 크다고 보고합니다. 이를 반영해 단일 `practice_score`를 즐거움/숙달감 두 축으로 나누었습니다.

- `pleasure_score`, `mastery_score`: 실천 후 실제로 느낀 즐거움과 숙달감 (0~10). `practice_score`는 두 값의 평균으로 자동 계산되어 기존 통계·CSV 소비 로직과 호환됩니다.
- `expected_pleasure_score`, `expected_mastery_score`: 실천 전 예상한 즐거움·숙달감 (0~10, 선택 입력). 값이 없으면 예상을 남기지 않은 기록입니다. 실제 값과 비교하면 "생각보다 즐거웠다/힘들었다"는 예측-경험 불일치를 분석할 수 있습니다.

## prediction payload

```json
{
  "related_observation_id": "observation-id",
  "worry_text": "면접에서 완전히 얼어붙을 것 같다",
  "predicted_severity": 8,
  "status": "occurred",
  "actual_severity": 5,
  "resolved_at": "2026-07-08T00:00:00.000Z",
  "note": ""
}
```

걱정한 구체적 결과가 실제로 어떻게 됐는지 나중에 돌아보고 비교하는 기록입니다. 관찰 기록에서 선택 입력으로 남기며, 해당 관찰 기록과 `related_observation_id`로 연결됩니다.

- `worry_text`: 구체적으로 걱정한 결과 (자유서술)
- `predicted_severity`: 그 일이 일어날 것 같다고 예상한 정도 (0~10)
- `status`: `pending`(아직 확인 전) / `occurred`(일어남) / `partial`(부분적으로 그러함) / `did_not_occur`(일어나지 않음) — 이 4개가 고정 어휘 목록입니다.
- `actual_severity`: 확인 시점에 남긴 실제 심각도 (0~10). `status`가 `pending`이면 비어 있습니다.
- `resolved_at`: 확인(상태 결정)한 시각. `status`가 `pending`이면 비어 있습니다.
- 상담자 분석 앱에서는 `status`가 `pending`이 아닌 기록들을 모아 "실제로 일어난 비율"을 계산할 수 있습니다. 예: `occurred` 건수 / (`occurred`+`partial`+`did_not_occur` 건수).

## 화면 표시 별칭과 CSV의 관계

- 앱 화면(문제 행동 영역 칩, 기록 카드 등)에는 사용자가 보호하기 화면에서 설정한 별칭이 대신 표시될 수 있습니다.
- 그러나 CSV의 `behavior_areas`, `behavior_custom_areas` 값은 항상 원래 항목 이름(예: `도박`, `성행동`)으로 저장되며, 화면 표시 별칭의 영향을 받지 않습니다.
- 따라서 상담자 분석 앱은 이 문서의 "고정 어휘 목록"에 정의된 원래 항목 이름을 기준으로 안정적으로 분석할 수 있습니다.

## 재발 신호 로직 (앱 화면에 표시되는 참고 지표)

앱 화면(오늘할일, 재발예방 탭)에는 CSV와 별도로 클라이언트 측에서만 계산되는 "재발 신호" 참고 지표가 표시됩니다. CSV 자체에는 이 값이 별도 열로 저장되지 않으며, 아래 로직은 상담자 분석 앱에서 동일한 원자료(`observation` 레코드의 `emotion_score`, `thought_score`, `urge_score`, `coping_score`, `action_level`)로부터 동일하게 재현할 수 있도록 공유하는 참고 기준입니다. 임상적 판단을 대체하지 않으며, 상담에서 조정 가능한 참고값입니다.

- 관찰 창: 최근 3일 / 비교 창: 그 이전 3일
- 정서적 재발 신호: 최근 3일 평균 `emotion_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균이 이전 3일보다 2점 이상 상승, 또는 `coping_score` ≤ 3이 2회 이상 유지, 또는 이전 대비 2점 이상 하락, 또는 최근 3일 `emotion_score`의 표준편차 ≥ 2.5(기록이 3건 이상일 때만 적용, 감정 기복 자체를 신호로 봄)
- 인지적 재발 신호: 최근 3일 평균 `thought_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균 `urge_score` ≥ 7, 또는 `urge_score` ≥ 7이면서 `action_level` = 0인 기록이 2회 이상
- 행동적 재발 신호: 최근 3일 중 `action_level` ≥ 1인 기록이 1건이라도 있으면 발생, `action_level` ≥ 4는 즉시 확인이 필요한 수준으로 별도 표시
- 두 개 이상의 재발 신호가 동시에 성립할 수 있으며, 이 경우 화면에는 겹쳐서 표시됩니다.
- 추세보기와 상담자 요약에는 선택한 기간 전체의 `emotion_score`, `urge_score` 표준편차("감정 기복", "충동 기복")도 별도로 표시됩니다. 평균이 낮아도 편차가 크면 정서 조절이 불안정하다는 신호일 수 있다는 문헌에 근거합니다.
- 재발예방 탭의 "단계별 위험도" 막대는 위 조건 중 최근 3일 동안 실제로 몇 개가 충족됐는지를 비율로 보여줍니다: 정서적 재발은 충족된 조건 수 ÷ 6, 인지적 재발은 충족된 조건 수 ÷ 4, 행동적 재발은 문제행동수준 1점 이상 기록된 날 수 ÷ 3(관찰 창 일수). 예측 확률이 아니라 "지금까지 확인된 신호의 비율"입니다.

## CSV 가져오기 동작 (upsert)

- 가져오는 CSV의 각 행을 앱에 이미 있는 같은 `id`의 기록과 비교합니다.
- 같은 `id`가 없으면 새로 추가합니다.
- 같은 `id`가 있으면 `updated_at`을 비교해서, **가져오는 쪽이 더 최신이면 덮어쓰고, 그렇지 않으면 건너뜁니다.**
- 즉, 기기를 이전할 때뿐 아니라 같은 기기에서 CSV로 "복원"할 때도 실제로 최신 내용이 반영됩니다.
- 가져오기 결과 메시지에 "신규 N개 / 갱신 N개"로 항목별 처리 내역이 표시됩니다.

## 상담자 분석 앱에서의 권장 처리

- `schema_version`이 `maeumgoyo_csv_v1`인지 먼저 확인합니다. 다르면 이 문서의 해당 버전 규격을 따로 확인해야 합니다.
- `record_type`별로 `payload_json`을 JSON.parse 합니다.
- `observation` 행을 중심으로 상황-생각-감정-몸반응-충동-문제행동수준-대처를 재구성합니다.
- `practice_log.practice_id`를 `practice_definition.id`와 연결합니다.
- `prediction.related_observation_id`를 `observation.id`와 연결합니다.
- 범주형 필드(`behavior_areas`, `trigger_places` 등)를 분석할 때는 위 "고정 어휘 목록"에 정의된 값만 나온다고 가정해도 됩니다(단, `_custom` 계열 필드는 자유 입력이라 예외).
- CSV는 상담자 치료자료 전체본이므로 가족 공유 자료로 사용하지 않습니다.

## 필드 도입 이력

| 시점 | 추가/변경 내용 |
| --- | --- |
| 정리 시점(현재, `maeumgoyo_csv_v1`) | 이전까지의 모든 필드를 정리해 새 기준 버전으로 통합. `range_label`(문자열) → `range_days`(기계 판독용 숫자/`"all"`)로 교체. CSV 가져오기가 upsert(신규 추가 + 최신 갱신) 방식으로 동작하도록 변경. |
| 이전 이력 1 | `observation`, `practice_definition`, `practice_log` 3개 record_type과 공통 열 구조 도입 (넓은 표 구조에서 전환) |
| 이전 이력 2 | `practice_log`에 `pleasure_score`, `mastery_score`, `expected_pleasure_score`, `expected_mastery_score` 추가 |
| 이전 이력 3 | `observation`에 `urge_initial_score`, `urge_end_score` 추가 |
| 이전 이력 4 | `observation`에 `trigger_places`, `trigger_people`, `trigger_times`, `trigger_custom`, `avoidance_tags`, `avoidance_custom` 추가 |
| 이전 이력 5 | `prediction` record_type 신규 추가 |

앞으로 필드를 추가할 때마다 이 표에 새 행을 추가해주세요. 필드 이름 변경이나 삭제처럼 하위 호환이 깨지는 변경은 이 표가 아니라 "버저닝 정책"에 따라 `schema_version`을 올리고 새 섹션으로 문서화합니다.
