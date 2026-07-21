# 마음고요 관찰과 실천 CSV 규격

## 목적

이 CSV는 내담자가 상담자에게 생활자료를 전달하여 상황-생각-감정-몸반응-충동-문제행동 활성화 수준-대처-가치실천의 연쇄를 함께 분석하기 위한 자료입니다.

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
| `record_type` | `observation`, `practice_definition`, `practice_log`, `prediction`, `daily_checkin` 중 하나 |
| `id` | 기록 고유 ID |
| `date` | 기록 날짜. `YYYY-MM-DD`. 날짜 개념이 없는 `practice_definition`은 빈 문자열 |
| `updated_at` | 해당 기록의 마지막 수정 시각 (ISO 8601) |
| `exported_at` | CSV 파일 생성 시각 |
| `client_alias` | 보호설정에서 지정한 내담자 별칭 |
| `share_mode` | 상담자 기간 공유는 `counselor_full`, 모든 기록과 보관 상태를 담는 전체 백업은 `backup_full` |
| `range_days` | 내보낼 때 선택한 기간을 나타내는 기계 판독용 값. `7` / `14` / `28` 처럼 숫자이거나, 전체 기간이면 문자열 `"all"`. 사람이 읽는 기간 표현("최근 1주" 등)은 CSV에는 넣지 않고, 상담자 요약 텍스트에만 사용합니다. |
| `payload_json` | record_type별 세부 자료 JSON |

## 상담분석실 행복도 연동

CSV의 마지막 레코드 `payload_json`에는 아래 선택 필드가 포함될 수 있습니다. 별도 CSV 열은 추가하지 않습니다.

| 필드 | 표시명 | 형식 |
| --- | --- | --- |
| `personal_life_happiness` | 개인생활행복도 | 0~100 정수 |
| `intimate_relationship_happiness` | 친밀관계행복도 | 0~100 정수 |
| `social_life_happiness` | 사회생활행복도 | 0~100 정수 |
| `overall_happiness` | 전반적행복도 | 0~100 정수 |

- 네 값은 서로 독립적인 직접 평정값이며, 합계나 평균을 계산하지 않습니다.
- `0`과 `100`은 모두 유효합니다.
- 필드가 없거나 값이 유효하지 않으면 해당 값만 비어 있는 것으로 처리합니다.
- CSV를 다시 저장할 때 유효한 행복도 값과 기존의 알 수 없는 `payload_json` 필드를 보존합니다.

## observation payload

```json
{
  "time_slot": "저녁",
  "problem_labels": ["도박", "성(sex)"],
  "problem_domain": "urge",
  "behavior_areas": ["도박", "성(sex)"],
  "behavior_custom_areas": ["나만의 별칭"],
  "emotion": "불안",
  "emotion_custom": [],
  "body_reactions": ["가슴 답답함", "두근거림"],
  "body_custom": [],
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
  "value_action_draft": "상담에서 이 상황을 말하기",
  "archived": false
}
```

### observation 필드 설명

- v92부터 `problem_labels`가 관찰의 출발점이 되는 문제 라벨의 기준 필드입니다. 화면에서는 "지금 주로 관찰하려는 문제는 무엇인가요?"로 표시합니다. 도박, 성(sex), 스트레스, 심심함처럼 문제 영역 또는 촉발 단서를 행동으로 단정하지 않고 먼저 고릅니다.
- v92부터 `problem_domain`은 내담자가 고른 문제의 중심입니다. 허용값은 `urge`, `emotion`, `thought`, `behavior`, `body`, `relationship`, `unknown`입니다. 상담분석실은 이 값을 통해 내담자가 처음에 자신의 경험을 충동/감정/생각/행동/몸반응/관계·상황 중 어디에 가깝게 보았는지 확인합니다.
- `behavior_areas`/`behavior_custom_areas`는 v91까지 사용하던 필드명입니다. v92 CSV에서는 분석 앱 안정성을 위해 `behavior_areas`에 `problem_labels`와 같은 값을 호환용으로 함께 저장합니다. 새 분석 앱에서는 `problem_labels`와 `problem_domain`을 우선 사용합니다.
- 화면 표시명: v90부터 `situation`은 화면에서 "그 문제가 시작된 상황"으로 표시될 수 있습니다. CSV 필드명과 의미(상황 서술)는 그대로 유지합니다.
- `urge_initial_score`, `urge_end_score`: "감정/충동 발생 시점" 모드에서만 선택적으로 기록되는 충동 곡선 값입니다. `urge_score`는 그대로 정점(peak) 충동을 의미하며, 위험 신호·재발 신호 판정 로직은 모두 `urge_score` 기준을 그대로 사용합니다. 두 필드가 비어 있으면 그 기록에는 곡선 정보가 없다는 뜻입니다.
- `trigger_places`, `trigger_people`, `trigger_times`, `trigger_custom`: 반복되는 촉발 단서(장소/사람·상황/시간대)를 구조화해 기록한 값입니다. 모두 선택 입력이며, 비어 있는 배열이면 기록하지 않은 것입니다.
- `avoidance_tags`, `avoidance_custom`: 우울·무기력과 관련된 활동 회피 신호(약속 회피, 연락 두절, 위생/식사 소홀 등)를 별도로 기록한 값입니다. `behavior_areas`의 "회피/미루기"·"무기력"과는 별개로, 문제행동과 무관하게 일반적인 활동 축소를 추적하기 위한 필드입니다.
- `emotion_custom`, `body_custom`: 고정 어휘에 없는 감정·몸 반응을 자유 입력한 값입니다. 화면에서는 한 번에 하나만 입력하지만, 다른 자유 입력 필드(`behavior_custom_areas`, `trigger_custom`, `avoidance_custom`)와 형식을 통일하기 위해 항상 **배열**로 저장합니다(값이 있으면 원소 1개, 없으면 빈 배열).
- v93부터 관찰하기 화면에서는 `gratitude`, `value`, `value_action_draft`를 더 이상 입력받지 않습니다. 관찰하기는 관찰과 대처 성찰에 집중하고, 가치 기반 실천행동은 `practice_definition`/`practice_log`에서 관리합니다. CSV 호환을 위해 세 필드는 빈 문자열로 남습니다.
- `archived`: 이 기록을 화면에서 숨겼는지 여부. 상담자 공유(`counselor_full`)에는 숨기지 않은 기록만 포함되므로 항상 `false`입니다. 전체 백업(`backup_full`)에는 숨긴 기록도 `true`로 포함됩니다.

### 고정 어휘 목록 (이 목록의 항목을 삭제하거나 이름을 바꾸면 schema_version을 올려야 합니다)

이 필드들은 앱 코드에 정의된 고정 목록에서 값이 채워집니다. 목록에 항목을 **추가**하는 것은 필드 추가와 동일하게 취급하되(구버전 호환에 영향 없음), 기존 항목을 **삭제·개명**하는 것은 하위 호환이 깨지는 변경입니다.

| 필드 | 고정 어휘 |
| --- | --- |
| `problem_labels` | 도박, 성(sex), 스트레스, 심심함, 분노/짜증, 불안/걱정, 외로움/공허함, 회피/무기력 (그 외 값은 직접 입력으로 들어가며 호환용 `behavior_custom_areas`에도 저장될 수 있음) |
| `problem_domain` | `urge`, `emotion`, `thought`, `behavior`, `body`, `relationship`, `unknown` |
| `behavior_areas` | v92에서는 `problem_labels`와 같은 값을 호환용으로 저장 |
| `trigger_places` | 집, 직장/학교, 이동 중(차·대중교통), 술자리/모임, 온라인/SNS |
| `trigger_people` | 혼자 있을 때, 특정 인물과 함께, 갈등 직후, 사교 모임 상황 |
| `trigger_times` | 아침, 낮, 저녁, 밤/늦은 시간, 주말 |
| `avoidance_tags` | 약속/모임에 안 나감, 연락에 답하지 않음, 씻기/식사를 미룸, 하루 종일 집에만 있음, 해야 할 일을 미룸 |
| `time_slot` | 오전, 오후, 저녁, 감정/충동 발생 시점 |
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
  "reminder_times": ["08:00", "20:00"],
  "start_date": "2026-07-09",
  "barriers": "피곤함",
  "small_version": "현관 밖으로 나가기",
  "archived": false
}
```

새로 저장하는 `frequency`는 `daily` / `custom` 중 하나이며, `reminder_mode`는 `morning` / `times` / `none` 중 하나입니다. 이전 CSV의 `1week`는 시작일과 같은 요일의 `custom`으로, `3week`는 월·수·금의 `custom`으로 불러와 호환합니다.

`reminder_times`는 다른 다중값 필드(`custom_days` 등)와 형식을 통일하기 위해 배열로 저장합니다. 설정한 알림 시각이 없으면 빈 배열입니다.

`archived`는 실천행동을 화면에서 보관(중단) 처리했는지 나타내는 불리언입니다. 전체 백업에서는 보관된 실천 정의도 그대로 복원하기 위해 사용합니다.

## practice_log payload

```json
{
  "practice_id": "practice-id",
  "practice_value": "건강",
  "practice_name": "퇴근 후 10분 걷기",
  "target_count": 1,
  "pleasure_score": 8,
  "mastery_score": 7,
  "expected_pleasure_score": 3,
  "expected_mastery_score": 4,
  "practice_note": "5분이라도 걸었다",
  "archived": false
}
```

행동활성화(Behavioral Activation) 문헌에서는 실천 후 얻은 즐거움·성취감이 예상보다 컸는지가 우울 개선과 관련이 크다고 보고합니다. 이를 반영해 즐거움/성취감 두 축으로 나눠 기록합니다. 화면에는 "성취감"으로 표시되지만, CSV 필드 이름(`mastery_score`)은 화면 표시 문구와 무관한 안정적 식별자라 그대로 유지합니다.

- `pleasure_score`, `mastery_score`: 실천 후 실제로 느낀 즐거움과 성취감 (0~10). 화면 표시는 각각 "실제 즐거움", "실제 성취감"입니다.
- `expected_pleasure_score`, `expected_mastery_score`: 실천 전 예상한 즐거움·성취감 (0~10, 선택 입력). 값이 없으면 예상을 남기지 않은 기록입니다. 실제 값과 비교하면 "생각보다 즐거웠다/힘들었다"는 예측-경험 불일치를 분석할 수 있습니다.
- 이전 규격에는 두 값의 평균을 미리 계산해 저장한 `practice_score` 필드가 있었지만, `pleasure_score`와 `mastery_score`로부터 그대로 계산되는 값이라 제거했습니다. 평균 수행도가 필요하면 `(pleasure_score + mastery_score) / 2`로 직접 계산하십시오.

## prediction payload

```json
{
  "related_observation_id": "observation-id",
  "worry_text": "면접에서 완전히 얼어붙을 것 같다",
  "predicted_severity": 8,
  "status": "occurred",
  "actual_severity": 5,
  "resolved_at": "2026-07-08T00:00:00.000Z",
  "note": "",
  "archived": false
}
```

걱정한 구체적 결과가 실제로 어떻게 됐는지 나중에 돌아보고 비교하는 기록입니다. 관찰 기록에서 선택 입력으로 남기며, 해당 관찰 기록과 `related_observation_id`로 연결됩니다.

- `worry_text`: 구체적으로 걱정한 결과 (자유서술)
- `predicted_severity`: 그 일이 일어날 것 같다고 예상한 정도 (0~10)
- `status`: `pending`(아직 확인 전) / `occurred`(일어남) / `partial`(부분적으로 그러함) / `did_not_occur`(일어나지 않음) — 이 4개가 고정 어휘 목록입니다.
- `actual_severity`: 확인 시점에 남긴 실제 심각도 (0~10). `status`가 `pending`이면 비어 있습니다.
- `resolved_at`: 확인(상태 결정)한 시각. `status`가 `pending`이면 비어 있습니다.
- 상담자 분석 앱에서는 `status`가 `pending`이 아닌 기록들을 모아 "실제로 일어난 비율"을 계산할 수 있습니다. 예: `occurred` 건수 / (`occurred`+`partial`+`did_not_occur` 건수).

## daily_checkin payload

```json
{
  "expansion_score": 7,
  "note": "저녁에 오랜만에 친구와 산책",
  "gratitude_others": ["친구가 먼저 연락해줘서 고마웠다", "동료가 도와줬다"],
  "gratitude_self": ["힘들었지만 끝까지 버텨낸 나에게 고맙다"],
  "archived": false
}
```

문제행동이 줄어드는 것과 삶이 넓어지는 것은 서로 다른 차원이라는 문제의식(듀얼 연속체 모델)을 반영한 회고적 하루 마무리 체크인입니다. 관찰 기록과 달리 촉발 상황과 무관하게, 하루에 한 번만 기록합니다.

- `expansion_score`: "문제행동이 아닌 다른 방향으로 오늘 하루가 조금이라도 넓어지고, 그것이 만족스러웠는가"에 대한 0~10 점수. 앱 화면에서는 "삶의 확장감과 만족도"로 표시됩니다.
- `note`: 그렇게 느끼게 한 순간에 대한 자유서술 (선택 입력)
- `gratitude_others`, `gratitude_self`: **v101부터 문자열 배열.** 감사 기록을 "주변 사람에 대한 감사"와 "나 자신에 대한 감사" 두 축으로 나눠 기록합니다(둘 다 선택 입력, 빈 배열 가능). 원래 관찰(observation) 레코드에 있던 `gratitude` 필드는 v93에서 입력 화면이 사라지며 항상 빈 문자열로만 남게 되었는데, 이 두 필드가 그 역할을 대신합니다.
  - 만족도(`expansion_score`)는 하루에 한 번만 의미가 있어 다시 저장하면 덮어쓰지만, **감사는 하루에도 여러 번 생길 수 있고 각각이 유효한 자료라 배열로 누적**됩니다. 화면에서 "추가"를 누를 때마다 배열 끝에 새 항목이 붙고, 개별 항목을 삭제할 수도 있습니다.
  - **이전 버전 CSV와의 호환 (2단계)**:
    - v100 이전에 내보낸 CSV에는 이 두 필드가 아예 없습니다 → 빈 배열로 처리
    - v100에서는 이 필드가 잠깐 **문자열**로 존재했습니다(배열이 아니었습니다) → 값이 있으면 그 문자열 하나를 담은 배열로 취급(예: `"과거 감사"` → `["과거 감사"]`)
    - v101부터는 항상 배열입니다.
- **하루 1건 원칙**: 같은 날짜에 대해 여러 건이 존재하지 않습니다. 내담자가 같은 날 다시 저장하면 기존 레코드의 `id`가 유지된 채 필드만 갱신됩니다(`expansion_score`/`note`는 마지막 저장값으로 덮어쓰기, `gratitude_others`/`gratitude_self`는 누적). 따라서 상담자 분석 앱은 `date`별로 정확히 0건 또는 1건만 있다고 가정해도 됩니다.
- `action_level`(문제행동 활성화 수준)과 `expansion_score`는 서로 반비례하지 않을 수 있습니다. "문제행동은 줄었는데 삶의 확장감은 늘지 않은" 조합 자체가 상담에서 다뤄야 할 유의미한 신호입니다.
- 화면 표시명: v90부터 오늘 화면에서는 이 기록을 "오늘 하루 돌아보기"로 표시할 수 있습니다. CSV의 record_type과 필드명은 그대로 `daily_checkin`, `expansion_score`입니다.

## 화면 표시 별칭과 CSV의 관계

- 앱 화면(경험한 문제 칩, 기록 카드 등)에는 사용자가 보호하기 화면에서 설정한 별칭이 대신 표시될 수 있습니다.
- 그러나 CSV의 `problem_labels`, `behavior_areas`, `behavior_custom_areas` 값은 항상 원래 항목 이름(예: `도박`, `성(sex)`)으로 저장되며, 화면 표시 별칭의 영향을 받지 않습니다.
- 따라서 상담자 분석 앱은 이 문서의 "고정 어휘 목록"에 정의된 원래 항목 이름을 기준으로 안정적으로 분석할 수 있습니다.

## 재발 신호 로직 (앱 화면에 표시되는 참고 지표)

앱 화면(오늘 할 일, 재발예방 탭)에는 CSV와 별도로 클라이언트 측에서만 계산되는 "재발 신호" 참고 지표가 표시됩니다. CSV 자체에는 이 값이 별도 열로 저장되지 않으며, 아래 로직은 상담자 분석 앱에서 동일한 원자료(`observation` 레코드의 `emotion_score`, `thought_score`, `urge_score`, `coping_score`, `action_level`)로부터 동일하게 재현할 수 있도록 공유하는 참고 기준입니다. 임상적 판단을 대체하지 않으며, 상담에서 조정 가능한 참고값입니다.

- 관찰 창: 최근 3일 / 비교 창: 그 이전 3일
- 정서적 재발 신호: 최근 3일 평균 `emotion_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균이 이전 3일보다 2점 이상 상승, 또는 `coping_score` ≤ 3이 2회 이상 유지, 또는 이전 대비 2점 이상 하락, 또는 최근 3일 `emotion_score`의 표준편차 ≥ 2.5(기록이 3건 이상일 때만 적용, 감정 기복 자체를 신호로 봄)
- 인지적 재발 신호: 최근 3일 평균 `thought_score` ≥ 6, 또는 6점 이상 기록이 2회 이상, 또는 평균 `urge_score` ≥ 7, 또는 `urge_score` ≥ 7이면서 `action_level` = 0인 기록이 2회 이상
- 행동적 재발 신호: 최근 3일 중 `action_level` ≥ 1인 기록이 1건이라도 있으면 발생, `action_level` ≥ 4는 즉시 확인이 필요한 수준으로 별도 표시
- 두 개 이상의 재발 신호가 동시에 성립할 수 있으며, 이 경우 화면에는 겹쳐서 표시됩니다.
- 추세보기와 상담자 요약에는 선택한 기간 전체의 `emotion_score`, `urge_score` 표준편차("감정 기복", "충동 기복")도 별도로 표시됩니다. 평균이 낮아도 편차가 크면 정서 조절이 불안정하다는 신호일 수 있다는 문헌에 근거합니다.
- 재발예방 탭의 "단계별 위험도" 막대는 위 조건 중 최근 3일 동안 실제로 몇 개가 충족됐는지를 비율로 보여줍니다: 정서적 재발은 충족된 조건 수 ÷ 6, 인지적 재발은 충족된 조건 수 ÷ 4, 행동적 재발은 문제행동 활성화 수준 1점 이상 기록된 날 수 ÷ 3(관찰 창 일수). 예측 확률이 아니라 "지금까지 확인된 신호의 비율"입니다.

## CSV 가져오기 동작 (upsert)

- 가져오는 CSV의 각 행을 앱에 이미 있는 같은 `id`의 기록과 비교합니다.
- 같은 `id`가 없으면 새로 추가합니다.
- 같은 `id`가 있으면 `updated_at`을 비교해서, **가져오는 쪽이 더 최신이면 덮어쓰고, 그렇지 않으면 건너뜁니다.**
- 즉, 기기를 이전할 때뿐 아니라 같은 기기에서 CSV로 "복원"할 때도 실제로 최신 내용이 반영됩니다.
- 가져오기 결과 메시지에 "신규 N개 / 갱신 N개"로 항목별 처리 내역이 표시됩니다.
- 가져오기 전에 헤더 순서, 열 개수, 규격 버전, record_type, 중복 ID, 날짜·시각, JSON 형식, 하루마무리 날짜 중복을 파일 전체에서 검사합니다.
- 오류가 하나라도 있으면 어떤 행도 반영하지 않고 가져오기를 중단합니다. 손상된 행만 조용히 건너뛰는 부분 성공은 허용하지 않습니다.

## 전체 백업과 상담자 공유

- `backup_full`: 선택한 화면 공유 기간과 무관하게 모든 기록을 저장합니다. 숨긴 기록과 보관된 실천 정의를 포함하며 `range_days`는 `all`입니다.
- `counselor_full`: 화면에서 선택한 7일·14일·28일·전체 범위의 활성 기록만 저장합니다. 실천 정의는 수행 기록을 해석할 수 있도록 함께 저장합니다.
- 앱의 "최근 CSV 백업" 시각은 `backup_full`을 실제로 저장했을 때만 갱신됩니다. 상담자 공유 파일 생성은 백업 완료로 간주하지 않습니다.
- `archived`는 모든 record_type의 payload에 공통으로 포함되는 불리언(`true`/`false`) 필드입니다. `counselor_full`은 숨기지 않은 기록만 담으므로 항상 `false`이고, `backup_full`은 숨긴 기록도 `true`로 포함해 완전히 복원할 수 있게 합니다.

## 상담자 분석 앱에서의 권장 처리

- `schema_version`이 `maeumgoyo_csv_v1`인지 먼저 확인합니다. 다르면 이 문서의 해당 버전 규격을 따로 확인해야 합니다.
- `record_type`별로 `payload_json`을 JSON.parse 합니다.
- `observation` 행을 중심으로 상황-생각-감정-몸반응-충동-문제행동 활성화 수준-대처를 재구성합니다.
- `practice_log.practice_id`를 `practice_definition.id`와 연결합니다.
- `prediction.related_observation_id`를 `observation.id`와 연결합니다.
- `daily_checkin`은 `date`별로 최대 1건만 존재합니다.
- 범주형 필드(`behavior_areas`, `trigger_places` 등)를 분석할 때는 위 "고정 어휘 목록"에 정의된 값만 나온다고 가정해도 됩니다(단, `_custom` 계열 필드는 자유 입력이라 예외).
- 모든 payload의 배열 필드(`behavior_areas`, `emotion_custom`, `body_custom`, `trigger_*`, `avoidance_*`, `custom_days`, `reminder_times`)는 값이 없어도 빈 배열로 존재하며, 존재 자체가 생략되는 경우는 없습니다. 마찬가지로 `archived`는 모든 record_type에 항상 존재하는 불리언입니다.
- CSV는 상담자 치료자료 전체본이므로 가족 공유 자료로 사용하지 않습니다.

## 필드 도입 이력

| 시점 | 추가/변경 내용 |
| --- | --- |
| v89 행복도 연동 | CSV 마지막 레코드의 `payload_json`에 선택 필드 `personal_life_happiness`, `intimate_relationship_happiness`, `social_life_happiness`, `overall_happiness` 추가. 모두 0~100 정수이며, 기존 알 수 없는 payload 필드는 재저장 시 보존. |
| v90 화면 표시명 정리 | 화면에서 `behavior_areas`를 "경험한 문제", `situation`을 "그 문제가 시작된 상황", `daily_checkin` 카드를 "오늘 하루 돌아보기"로 표시할 수 있게 정리. CSV 필드명과 `schema_version`은 변경 없음. |
| v91 추세보기 간략화 | 내담자 앱의 추세보기 화면을 단순 자기점검 수준으로 간략화. 산점도, 촉발 단서-충동 관계, 긴 패턴 요약은 상담분석실 앱에서 다루는 방향으로 분리. CSV 필드명과 `schema_version`은 변경 없음. |
| v92 문제 라벨/문제 중심 | `observation.payload_json`에 `problem_labels` 배열과 `problem_domain` 문자열 추가. 관찰 출발점을 행동으로 단정하지 않고, 도박·성(sex)·스트레스·심심함 등 문제 라벨과 충동/감정/생각/행동/몸반응/관계·상황 중심을 분리. 기존 안정성을 위해 `behavior_areas`에는 `problem_labels`와 같은 값을 호환용으로 저장. |
| v93 관찰하기 4단계 정리 | 관찰하기 화면에서 감사 기록, 가치 선택, 가치 실천 초안, 실천행동 만들기 버튼 삭제. `insight` 화면 표시명을 "이번 기록을 남기며 알게 된 점"으로 변경. CSV 호환을 위해 `gratitude`, `value`, `value_action_draft`는 빈 문자열로 유지. |
| v94 관찰하기/실천하기 문구와 배치 정리 | 관찰하기 1단계 질문 문구를 기록 상황에 맞게 정리하고, `time_slot` 선택값 중 "충동 발생"을 "감정/충동 발생 시점"으로 변경. 회피 신호 입력을 3단계 강도 기록의 문제행동 활성화 수준 아래로 이동. 고위험 안내를 관찰 저장 버튼 아래로 이동. 실천하기 첫 제목을 삶의 경험 확장 메시지로 변경. |
| v95 관찰하기 상단 안내문 삭제 | 관찰하기 상단의 부담 완화 안내문을 삭제하고, 제목 다음에 바로 1단계 입력이 나오도록 정리. CSV 필드와 `schema_version` 변경 없음. |
| v96 실천 일정과 수행도 입력 정리 | 실천 빈도 선택을 `daily`와 `custom`으로 단순화하고, 기존 `1week`/`3week` 값은 맞춤 요일로 자동 변환. 실천 예정일에만 알림을 보내는 동작을 화면에 명확히 표시하고, 수행도 버튼을 못함·일부·했음 순서로 정렬. CSV 열과 `schema_version` 변경 없음. |
| v100 감사 기록을 daily_checkin으로 이동 | `daily_checkin.payload_json`에 `gratitude_others`(주변 사람에 대한 감사), `gratitude_self`(나 자신에 대한 감사) 필드 추가. 둘 다 선택 입력, 문자열. v93에서 관찰 화면 입력이 사라진 뒤 항상 빈 문자열로만 남던 `observation.gratitude`를 대체. 새 필드 추가이며 기존 필드를 없애거나 이름을 바꾸지 않았으므로 `schema_version`은 그대로 유지. v100 이전 CSV에는 이 필드들이 없으며, 없는 경우 빈 값으로 처리하면 됩니다(오류 아님). |
| v101 감사 필드를 문자열에서 배열로 | 만족도(`expansion_score`)는 하루 1번만 의미가 있어 덮어쓰기가 맞지만, 감사는 하루에도 여러 번 생기고 각각이 유효한 자료라는 점이 확인되어, `gratitude_others`/`gratitude_self`를 문자열에서 **문자열 배열**로 바꿨습니다. 화면에서 "추가"를 누를 때마다 배열에 항목이 쌓이고, 개별 삭제도 가능합니다. `schema_version`은 그대로 유지(필드 삭제·개명이 아니라 타입 변경이지만, 읽는 쪽에서 문자열이면 1개짜리 배열로 취급하도록 관대하게 처리하면 호환됩니다). v100(문자열)·v100 이전(필드 없음) CSV 둘 다 정상적으로 읽히는지 확인했습니다. |
| 구조 정리(현재, `maeumgoyo_csv_v1`) | 이전 버전과의 호환을 고려하지 않고 구조를 다시 정리: (1) `archived`를 모든 record_type에서 문자열 `"0"`/`"1"`이 아닌 진짜 JSON 불리언(`true`/`false`)으로 통일. (2) `emotion_custom`, `body_custom`을 다른 자유 입력 필드와 동일하게 배열로 통일. (3) `reminder_times`를 `custom_days`와 동일하게 배열로 통일. (4) `pleasure_score`/`mastery_score`의 평균을 미리 계산해 저장하던 파생 필드 `practice_score`를 제거. (5) 가져오기 검증에서 모든 필드가 실제로 존재하는지(타입뿐 아니라 존재 여부까지) 확인하도록 강화하고, `observation`의 `archived` 검증 누락을 수정. (6) 이 문서의 JSON 예시를 실제 내보내기 코드와 한 줄씩 대조해 일치시킴. |
| 정리 시점 | 이전까지의 모든 필드를 정리해 새 기준 버전으로 통합. `range_label`(문자열) → `range_days`(기계 판독용 숫자/`"all"`)로 교체. CSV 가져오기가 upsert(신규 추가 + 최신 갱신) 방식으로 동작하도록 변경. |
| 이전 이력 1 | `observation`, `practice_definition`, `practice_log` 3개 record_type과 공통 열 구조 도입 (넓은 표 구조에서 전환) |
| 이전 이력 2 | `practice_log`에 `pleasure_score`, `mastery_score`, `expected_pleasure_score`, `expected_mastery_score` 추가 |
| 이전 이력 3 | `observation`에 `urge_initial_score`, `urge_end_score` 추가 |
| 이전 이력 4 | `observation`에 `trigger_places`, `trigger_people`, `trigger_times`, `trigger_custom`, `avoidance_tags`, `avoidance_custom` 추가 |
| 이전 이력 5 | `prediction` record_type 신규 추가 |
| 이전 이력 6 | `daily_checkin` record_type 신규 추가 (증상/문제행동 감소와 별개로 삶의 확장감·만족도를 추적하기 위한 회고적 하루 체크인) |
| 안정화 1 | 전체 백업(`backup_full`)과 기간별 상담자 공유(`counselor_full`)를 분리하고, 전체 백업에 숨긴 기록과 보관 상태를 포함. 가져오기를 파일 단위 사전검증 방식으로 강화 |

앞으로 필드를 추가할 때마다 이 표에 새 행을 추가해주세요. 필드 이름 변경이나 삭제처럼 하위 호환이 깨지는 변경은 이 표가 아니라 "버저닝 정책"에 따라 `schema_version`을 올리고 새 섹션으로 문서화합니다.
