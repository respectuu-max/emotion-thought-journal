const APP_VERSION = "20260717v66";

// 이 앱은 마음고요 관찰과 실천의 현재 CSV 규격(maeumgoyo_csv_v1)만 읽습니다.
// 구버전 CSV 하위 호환은 지원하지 않습니다 — 다른 규격의 CSV는 명확한 오류로 안내하고 중단합니다.
const CSV_SCHEMA = "maeumgoyo_csv_v1";
const REQUIRED_COLUMNS = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];
const RECORD_TYPES = ["observation", "practice_definition", "practice_log", "prediction", "daily_checkin"];
const ANALYSIS_SHARE_MODES = ["counselor_full", "backup_full"];

const state = {
  rows: [],
  records: [],
  chains: [],
  predictions: [],
  observationDays: [],
  dailyCheckins: [],
  reflectionDays: [],
  previousSnapshot: null,
  relapseWindow: null,
  activeView: "data",
  fileName: "",
  fileNames: [],
  shareMode: "",
  shareModeLabel: "",
  rangeLabel: "",
  rangeDays: null,
  importMessages: [],
  practicePlans: [],
  generatedClientAlias: "",
  projectNameOverride: "",
  previousAiContextText: "",
  previousAiContextFileName: "",
  patientMode: false,
  thresholds: {
    emotion: 7,
    cognitiveUrge: 6,
    urge: 8,
    action: 4,
    practice: 0,
  },
};

const els = {
  versionBadge: document.querySelector(".version-badge"),
  csvInput: document.getElementById("csvInput"),
  dropZone: document.getElementById("dropZone"),
  fileMeta: document.getElementById("fileMeta"),
  importStatus: document.getElementById("importStatus"),
  shareModeInfo: document.getElementById("shareModeInfo"),
  schemaInfo: document.getElementById("schemaInfo"),
  metrics: document.getElementById("metrics"),
  therapyMenu: document.getElementById("therapyMenu"),
  therapyView: document.getElementById("therapyView"),
  chainList: document.getElementById("chainList"),
  activeStepLabel: document.getElementById("activeStepLabel"),
  notes: document.getElementById("notes"),
  emotionThreshold: document.getElementById("emotionThreshold"),
  cognitiveUrgeThreshold: document.getElementById("cognitiveUrgeThreshold"),
  urgeThreshold: document.getElementById("urgeThreshold"),
  actionThreshold: document.getElementById("actionThreshold"),
  practiceThreshold: document.getElementById("practiceThreshold"),
  urgeGoalInput: document.getElementById("urgeGoalInput"),
  actionGoalInput: document.getElementById("actionGoalInput"),
  practiceGoalInput: document.getElementById("practiceGoalInput"),
  expansionGoalInput: document.getElementById("expansionGoalInput"),
  sampleBtn: document.getElementById("sampleBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  resetBtn: document.getElementById("resetBtn"),
  printBtn: document.getElementById("printBtn"),
  exportBtn: document.getElementById("exportBtn"),
  summaryArchiveBtn: document.getElementById("summaryArchiveBtn"),
  sessionPrepExportBtn: document.getElementById("sessionPrepExportBtn"),
  exportAiReportBtn: document.getElementById("exportAiReportBtn"),
  exportAiContextBtn: document.getElementById("exportAiContextBtn"),
  saveStatus: document.getElementById("saveStatus"),
  projectNameInput: document.getElementById("projectNameInput"),
  previousAiContextInput: document.getElementById("previousAiContextInput"),
  previousAiContextStatus: document.getElementById("previousAiContextStatus"),
  acceptedAiSuggestions: document.getElementById("acceptedAiSuggestions"),
  deferredAiSuggestions: document.getElementById("deferredAiSuggestions"),
  nextSessionQuestions: document.getElementById("nextSessionQuestions"),
  nextAiContext: document.getElementById("nextAiContext"),
  exportAccumulatedCsvBtn: document.getElementById("exportAccumulatedCsvBtn"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  patientModeBtn: document.getElementById("patientModeBtn"),
  reflectionDailyList: document.getElementById("reflectionDailyList"),
  copyAllReflectionBtn: document.getElementById("copyAllReflectionBtn"),
  copyReflectionPromptBtn: document.getElementById("copyReflectionPromptBtn"),
  copyDraftPromptBtn: document.getElementById("copyDraftPromptBtn"),
  previousSummaryInput: document.getElementById("previousSummaryInput"),
  sessionComparisonResult: document.getElementById("sessionComparisonResult"),
  weekFocusPlan: document.getElementById("weekFocusPlan"),
  atAGlanceBanner: document.getElementById("atAGlanceBanner"),
  buildAiReportBtn: document.getElementById("buildAiReportBtn"),
  aiReportBox: document.getElementById("aiReportBox"),
  copyAiReportBtn: document.getElementById("copyAiReportBtn"),
};

const VIEWS = [
  ["data", "1. 자료와 치료 프레임 확인", "CSV 구성, 자료 범위, 감정 감내력 창"],
  ["feedback", "2. 오늘 마음에 걸린 경험 지도", "경험한 문제, 정서/각성 흐름, 변화 단서"],
  ["chain", "3. 감정 중심 자동 연쇄 재구성", "관찰·기록한 문제-감정-생각-몸-충동-문제행동 활성화 수준"],
  ["readiness", "4. 개입 분기 판단", "CBT/DBT/ACT/행동활성화 연결"],
  ["safety", "5. 위기·충동 대처 훈련", "과각성·저각성에서 감정 감내력 창으로 돌아오기"],
  ["success", "6. 감정 감내력·부분변화", "불편함·고통·지루함·충동을 감내한 변화"],
  ["practice", "7. 가치기반 작은 실천 설계", "감정-충동-행동화 사이에 새 반응 넣기"],
  ["prediction", "8. 생각 검토·예기불안 검증", "자동사고, 파국예상, ACT 거리두기"],
  ["summary", "9. 회기 통합·다음 주 실험 설계", "연쇄·개입·실천·기록 초점 정리"],
];

const VIEW_USAGE = {
  data: { type: "required", label: "필수" },
  feedback: { type: "support", label: "보조" },
  chain: { type: "required", label: "필수" },
  readiness: { type: "optional", label: "선택" },
  safety: { type: "optional", label: "선택" },
  success: { type: "support", label: "보조" },
  practice: { type: "required", label: "필수" },
  prediction: { type: "optional", label: "선택" },
  summary: { type: "required", label: "필수" },
};

const SESSION_TASKS = {
  data: [
    "0-5분: 자료 기간, 기록량, 공유 모드와 민감정보 범위를 확인합니다.",
    "오늘 회기는 잘잘못 판정이 아니라 감정 감내력 창을 넓히는 작업임을 합의합니다.",
    "기록이 적거나 빠진 날은 결론을 내리기보다 가설로 다루겠다고 안내합니다.",
  ],
  feedback: [
    "5-12분: 그래프를 보며 이번 주 마음이 가장 자주 걸린 경험을 하나 고릅니다.",
    "문제행동 여부보다 경험한 문제, 정서/각성 흐름, 변화 단서를 먼저 보게 합니다.",
    "시간이 부족하면 이 단계는 3단계 연쇄 재구성 안에 짧게 흡수합니다.",
  ],
  chain: [
    "12-25분: 대표 장면 하나를 깊게 골라 회기의 중심 작업으로 다룹니다.",
    "관찰·기록한 문제 → 발생한 구체적 상황 → 감정 → 생각 → 몸반응 → 충동 → 문제행동 활성화 수준 → 회피 신호 → 대처행동 → 알게 된 점 순으로 따라갑니다.",
    "연쇄에서 끼어들 수 있는 작은 틈을 내담자와 함께 찾습니다.",
  ],
  readiness: [
    "25-32분: 오늘 어떤 개입으로 갈지 상담자가 임상적으로 판단합니다.",
    "생각이 핵심이면 CBT, 몸반응/충동이 핵심이면 DBT/TIPP, 회피·무기력이 핵심이면 행동활성화, 융합이 핵심이면 ACT로 연결합니다.",
    "화면을 길게 다루기보다 상담자가 방향을 잡는 선택 작업으로 사용합니다.",
  ],
  safety: [
    "32-38분: 충동, 행동화 위험, 과각성/저각성이 뚜렷할 때 깊게 다룹니다.",
    "STOP/TIPP, 특히 호흡으로 감정 감내력 창에 돌아오는 훈련을 합니다.",
    "위험이 낮은 주에는 조기 신호와 도움요청만 짧게 확인합니다.",
  ],
  success: [
    "38-43분: 감내한 순간, 늦춘 순간, 강도가 낮아진 순간을 찾아 동기를 강화합니다.",
    "완전히 안 한 것만 성공으로 보지 않고, 더 강한 자극으로 바로 가지 않은 장면을 회복 증거로 반영합니다.",
    "가능하면 짧게라도 거의 매 회기 넣어 자기효능감을 살립니다.",
  ],
  practice: [
    "43-48분: 다음 주에 실행할 30% 버전의 작은 행동실험을 정합니다.",
    "실천행동을 좋은 행동 추가가 아니라 감정-충동-행동화 사이에 넣을 새 반응으로 설계합니다.",
    "언제, 어디서, 무엇을, 얼마나 작게 할지 구체화합니다.",
  ],
  prediction: [
    "파국예상, 허용 생각, 합리화, 자기불신, 불안 예측이 두드러질 때 선택적으로 깊게 다룹니다.",
    "예상과 실제의 차이를 검증하고, 생각과 거리를 두는 ACT 문장으로 연결합니다.",
    "인지/불안이 핵심인 회기에서는 3단계 뒤에 배치합니다.",
  ],
  summary: [
    "48-50분: 오늘의 연쇄, 감내한 변화, 다음 주 30% 실천, 기록 초점을 한 문장으로 통합합니다.",
    "내담자가 다음 주에 붙잡을 회복 언어를 함께 만듭니다.",
    "다음 회기에서 확인할 수치와 장면을 정합니다.",
  ],
};


const CATEGORY_LABELS = {
  situation: "기록 시점·발생한 구체적 상황",
  thought: "그때 든 생각",
  emotion: "그때 느낀 감정·몸반응",
  urge: "충동/갈망 강도",
  action: "문제행동 활성화 수준",
  avoidance: "회피 신호",
  practice: "대처행동·성찰",
};

// maeumgoyo_csv_v1(현재 규격, 연동명세서 2.0) 예시. 3주(21일)치 회복 궤적을 담아, 초반엔 충동·문제행동이 높고
// 실천·경험 확장은 낮다가, 시간이 지나며 실천이 늘수록 경험 확장은 오르고 충동·문제행동은 낮아지는 흐름을 볼 수 있게 했습니다.
// 다중 관찰이 있는 날, 보관된 실천행동, 충동곡선, 예측 4종 상태, 매일 daily_checkin까지 모두 포함합니다.
const sampleCsv = `schema_version,record_type,id,date,updated_at,exported_at,client_alias,share_mode,range_days,payload_json
maeumgoyo_csv_v1,observation,obs-001,2026-06-20,2026-06-20T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""충동 발생"", ""behavior_areas"": [""도박""], ""behavior_custom_areas"": [], ""emotion"": ""공허함"", ""emotion_custom"": [], ""body_reactions"": [""가슴 답답함"", ""초조함""], ""body_custom"": [], ""situation"": ""혼자 집에 있었고 스마트폰으로 도박 사이트 생각이 남"", ""trigger_places"": [""집""], ""trigger_people"": [""혼자 있을 때""], ""trigger_times"": [""밤/늦은 시간""], ""trigger_custom"": [], ""avoidance_tags"": [""하루 종일 집에만 있음""], ""avoidance_custom"": [], ""thought_text"": ""한 번만 하면 스트레스가 풀릴 것 같다"", ""thought_score"": 7, ""emotion_score"": 7, ""urge_score"": 8, ""urge_initial_score"": 4, ""urge_end_score"": 7, ""action_level"": 3, ""coping"": ""10분 미루고 밖으로 나감"", ""coping_score"": 3, ""gratitude"": """", ""insight"": """", ""value"": ""자기존중"", ""value_action_draft"": ""잠들기 전 오늘 기록 남기기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-002,2026-06-21,2026-06-21T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""초조"", ""emotion_custom"": [], ""body_reactions"": [""손 떨림""], ""body_custom"": [], ""situation"": ""회사에서 스트레스 받은 뒤 퇴근길 편의점 앞을 서성임"", ""trigger_places"": [""직장/학교"", ""이동 중(차·대중교통)""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""한 잔 정도는 괜찮을 것이다"", ""thought_score"": 6, ""emotion_score"": 6, ""urge_score"": 7, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 2, ""coping"": ""편의점 앞에서 그냥 지나감"", ""coping_score"": 4, ""gratitude"": """", ""insight"": """", ""value"": ""책임"", ""value_action_draft"": ""다음엔 술자리 대신 약속을 미리 만들기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-003,2026-06-21,2026-06-21T08:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오전"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""초조"", ""emotion_custom"": [], ""body_reactions"": [""손 떨림""], ""body_custom"": [], ""situation"": ""아침에도 비슷한 생각이 스쳐감"", ""trigger_places"": [""직장/학교"", ""이동 중(차·대중교통)""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이 생각이 또 드는구나 하고 알아차림"", ""thought_score"": 6, ""emotion_score"": 6, ""urge_score"": 4, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""아침 루틴으로 전환"", ""coping_score"": 5, ""gratitude"": """", ""insight"": """", ""value"": ""책임"", ""value_action_draft"": ""다음엔 술자리 대신 약속을 미리 만들기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-004,2026-06-22,2026-06-22T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""분노"", ""emotion_custom"": [], ""body_reactions"": [""근육 긴장""], ""body_custom"": [], ""situation"": ""친구 모임에서 술을 계속 권유받음"", ""trigger_places"": [""술자리/모임""], ""trigger_people"": [""사교 모임 상황""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""오늘같은 날은 예외로 해도 된다"", ""thought_score"": 8, ""emotion_score"": 8, ""urge_score"": 9, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 4, ""coping"": ""화장실에 가서 숨 고르기"", ""coping_score"": 2, ""gratitude"": """", ""insight"": ""혼자 있는 시간이 위험하다는 걸 알았다"", ""value"": ""건강"", ""value_action_draft"": ""귀가 후 바로 샤워하기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-005,2026-06-23,2026-06-23T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""도박""], ""behavior_custom_areas"": [], ""emotion"": ""외로움"", ""emotion_custom"": [], ""body_reactions"": [""무기력""], ""body_custom"": [], ""situation"": ""혼자 저녁을 먹다가 갑자기 공허함이 몰려옴"", ""trigger_places"": [""집""], ""trigger_people"": [""혼자 있을 때""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [""하루 종일 집에만 있음""], ""avoidance_custom"": [], ""thought_text"": ""이렇게 사는 게 무슨 의미가 있나"", ""thought_score"": 5, ""emotion_score"": 5, ""urge_score"": 6, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 1, ""coping"": ""상담 메모를 다시 읽음"", ""coping_score"": 5, ""gratitude"": """", ""insight"": """", ""value"": ""회복"", ""value_action_draft"": ""돈 관련 생각 들면 가계부부터 보기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-006,2026-06-24,2026-06-24T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""밤/늦은 시간"", ""behavior_areas"": [""도박""], ""behavior_custom_areas"": [], ""emotion"": ""불안"", ""emotion_custom"": [], ""body_reactions"": [""가슴 답답함""], ""body_custom"": [], ""situation"": ""월급날이라 도박 사이트 생각이 강하게 남"", ""trigger_places"": [""집""], ""trigger_people"": [""혼자 있을 때""], ""trigger_times"": [""밤/늦은 시간""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""돈을 좀 벌어야 마음이 편해질 것 같다"", ""thought_score"": 7, ""emotion_score"": 7, ""urge_score"": 8, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 3, ""coping"": ""가계부를 보며 마음을 다잡음"", ""coping_score"": 3, ""gratitude"": """", ""insight"": """", ""value"": ""정직"", ""value_action_draft"": ""월급날엔 미리 계획 세우기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-007,2026-06-25,2026-06-25T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""분노"", ""emotion_custom"": [], ""body_reactions"": [""열감""], ""body_custom"": [], ""situation"": ""야근 후 스트레스가 심해서 술 생각이 남"", ""trigger_places"": [""직장/학교""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이 정도 스트레스는 풀어야 한다"", ""thought_score"": 6, ""emotion_score"": 6, ""urge_score"": 7, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 2, ""coping"": ""동료에게 잠깐 이야기함"", ""coping_score"": 4, ""gratitude"": """", ""insight"": """", ""value"": ""절제"", ""value_action_draft"": ""야근 후엔 바로 걷기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-008,2026-06-26,2026-06-26T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""충동 발생"", ""behavior_areas"": [""도박""], ""behavior_custom_areas"": [], ""emotion"": ""외로움"", ""emotion_custom"": [], ""body_reactions"": [""멍함""], ""body_custom"": [], ""situation"": ""주말 저녁 혼자 있는 시간이 길어짐"", ""trigger_places"": [""집""], ""trigger_people"": [""혼자 있을 때""], ""trigger_times"": [""주말""], ""trigger_custom"": [], ""avoidance_tags"": [""하루 종일 집에만 있음""], ""avoidance_custom"": [], ""thought_text"": ""혼자 있으면 결국 예전처럼 될 것 같다"", ""thought_score"": 7, ""emotion_score"": 8, ""urge_score"": 8, ""urge_initial_score"": 4, ""urge_end_score"": 7, ""action_level"": 4, ""coping"": ""TV를 틀어놓고 버팀"", ""coping_score"": 2, ""gratitude"": """", ""insight"": """", ""value"": ""안정"", ""value_action_draft"": ""주말 계획을 미리 세워두기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-009,2026-06-27,2026-06-27T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""회피/미루기""], ""behavior_custom_areas"": [], ""emotion"": ""피곤함"", ""emotion_custom"": [], ""body_reactions"": [""피곤함""], ""body_custom"": [], ""situation"": ""퇴근 후 걷기를 하려다 피곤해서 미룸"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""오늘은 피곤하니 다음에 하자"", ""thought_score"": 5, ""emotion_score"": 5, ""urge_score"": 6, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 2, ""coping"": ""그래도 5분만 걸음"", ""coping_score"": 5, ""gratitude"": """", ""insight"": """", ""value"": ""건강"", ""value_action_draft"": ""피곤해도 5분만이라도 걷기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-010,2026-06-28,2026-06-28T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""불안"", ""emotion_custom"": [], ""body_reactions"": [""손 떨림""], ""body_custom"": [], ""situation"": ""친구가 술자리에 불렀지만 짧게만 참석함"", ""trigger_places"": [""술자리/모임""], ""trigger_people"": [""사교 모임 상황""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""잠깐만 있다 와도 괜찮다"", ""thought_score"": 5, ""emotion_score"": 5, ""urge_score"": 5, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 1, ""coping"": ""짧게만 있다가 먼저 나옴"", ""coping_score"": 6, ""gratitude"": """", ""insight"": """", ""value"": ""관계"", ""value_action_draft"": ""모임 시간을 미리 정해두기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-011,2026-06-29,2026-06-29T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""지루함"", ""emotion_custom"": [], ""body_reactions"": [""가슴 답답함""], ""body_custom"": [], ""situation"": ""스트레스 받았지만 산책으로 대신함"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""걷고 나니 생각이 정리된다"", ""thought_score"": 6, ""emotion_score"": 6, ""urge_score"": 7, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 3, ""coping"": ""산책으로 대신함"", ""coping_score"": 4, ""gratitude"": """", ""insight"": ""걷고 나면 충동이 확실히 줄어든다"", ""value"": ""건강"", ""value_action_draft"": ""산책을 습관으로 만들기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-012,2026-06-29,2026-06-29T08:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오전"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""지루함"", ""emotion_custom"": [], ""body_reactions"": [""가슴 답답함""], ""body_custom"": [], ""situation"": ""오전에 짧게 산책하며 마음을 다잡음"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이 생각이 또 드는구나 하고 알아차림"", ""thought_score"": 6, ""emotion_score"": 6, ""urge_score"": 4, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""아침 루틴으로 전환"", ""coping_score"": 5, ""gratitude"": """", ""insight"": ""걷고 나면 충동이 확실히 줄어든다"", ""value"": ""건강"", ""value_action_draft"": ""산책을 습관으로 만들기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-013,2026-06-30,2026-06-30T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오후"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""초조"", ""emotion_custom"": [], ""body_reactions"": [""근육 긴장""], ""body_custom"": [], ""situation"": ""충동이 왔지만 상담 메모를 보며 넘김"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""낮""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이 순간만 넘기면 괜찮아질 것이다"", ""thought_score"": 4, ""emotion_score"": 4, ""urge_score"": 4, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""상담에서 배운 호흡법 사용"", ""coping_score"": 7, ""gratitude"": """", ""insight"": """", ""value"": ""회복"", ""value_action_draft"": ""충동 기록을 상담 전에 다시 보기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-014,2026-07-01,2026-07-01T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""안정"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""가족과 짧게 통화하며 안정감을 느낌"", ""trigger_places"": [""집""], ""trigger_people"": [""특정 인물과 함께""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""가족이 옆에 있다는 게 힘이 된다"", ""thought_score"": 5, ""emotion_score"": 5, ""urge_score"": 6, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 1, ""coping"": ""가족과 통화함"", ""coping_score"": 6, ""gratitude"": ""가족에게 감사함"", ""insight"": ""가족이 큰 힘이 된다"", ""value"": ""관계"", ""value_action_draft"": ""가족과 통화 시간 정해두기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-015,2026-07-02,2026-07-02T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""성취감"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""퇴근 후 걷기를 하고 일기를 씀"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""기록하니 내가 뭘 원하는지 보인다"", ""thought_score"": 4, ""emotion_score"": 4, ""urge_score"": 5, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 1, ""coping"": ""일기를 쓰며 정리함"", ""coping_score"": 6, ""gratitude"": """", ""insight"": """", ""value"": ""성장"", ""value_action_draft"": ""매일 짧게라도 기록하기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-016,2026-07-03,2026-07-03T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""충동 발생"", ""behavior_areas"": [""음주""], ""behavior_custom_areas"": [], ""emotion"": ""불안"", ""emotion_custom"": [], ""body_reactions"": [""가슴 답답함""], ""body_custom"": [], ""situation"": ""친구 모임에 갔지만 술은 마시지 않음"", ""trigger_places"": [""술자리/모임""], ""trigger_people"": [""사교 모임 상황""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""예전엔 이런 자리를 피할 수 없었는데 지금은 다르다"", ""thought_score"": 3, ""emotion_score"": 4, ""urge_score"": 4, ""urge_initial_score"": 0, ""urge_end_score"": 0, ""action_level"": 0, ""coping"": ""무알코올 음료로 대신함"", ""coping_score"": 7, ""gratitude"": """", ""insight"": """", ""value"": ""절제"", ""value_action_draft"": ""무알코올 음료를 미리 준비하기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-017,2026-07-04,2026-07-04T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오전"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""안정"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""아침 걷기를 하고 하루를 시작함"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""아침""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""몸을 움직이니 하루가 다르게 시작된다"", ""thought_score"": 3, ""emotion_score"": 3, ""urge_score"": 3, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""아침 걷기 그대로 함"", ""coping_score"": 8, ""gratitude"": """", ""insight"": """", ""value"": ""건강"", ""value_action_draft"": ""아침 루틴 유지하기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-018,2026-07-05,2026-07-05T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오후"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""편안함"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""동료와 점심을 편하게 먹음"", ""trigger_places"": [""직장/학교""], ""trigger_people"": [], ""trigger_times"": [""낮""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""사람들과 있는 게 편안하다"", ""thought_score"": 3, ""emotion_score"": 3, ""urge_score"": 4, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""동료와 대화하며 풀림"", ""coping_score"": 7, ""gratitude"": ""동료에게 감사함"", ""insight"": """", ""value"": ""관계"", ""value_action_draft"": ""동료와의 대화 시간 늘리기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-019,2026-07-06,2026-07-06T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""성취감"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""퇴근 후 가족과 저녁을 함께 함"", ""trigger_places"": [""집""], ""trigger_people"": [""특정 인물과 함께""], ""trigger_times"": [""저녁""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이런 평범한 시간이 소중하다"", ""thought_score"": 2, ""emotion_score"": 2, ""urge_score"": 2, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""가족과 저녁 시간 보냄"", ""coping_score"": 8, ""gratitude"": """", ""insight"": ""사람들과 있는 시간이 회복에 도움이 된다"", ""value"": ""가족"", ""value_action_draft"": ""가족 저녁 시간 지키기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-020,2026-07-07,2026-07-07T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""밤/늦은 시간"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""초조"", ""emotion_custom"": [], ""body_reactions"": [""근육 긴장""], ""body_custom"": [], ""situation"": ""잠깐 옛 습관 생각이 났지만 바로 알아차림"", ""trigger_places"": [""온라인/SNS""], ""trigger_people"": [], ""trigger_times"": [""밤/늦은 시간""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""예전 생각이 났지만 그냥 지나가는 생각일 뿐이다"", ""thought_score"": 3, ""emotion_score"": 3, ""urge_score"": 3, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 1, ""coping"": ""생각을 알아차리고 흘려보냄"", ""coping_score"": 6, ""gratitude"": """", ""insight"": """", ""value"": ""회복"", ""value_action_draft"": ""생각이 스칠 때 메모만 하고 넘기기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-021,2026-07-08,2026-07-08T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오후"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""기쁨"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""주말에 오랜만에 취미 활동을 함"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""주말""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""오랜만에 좋아하던 걸 하니 즐겁다"", ""thought_score"": 2, ""emotion_score"": 2, ""urge_score"": 2, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""취미 활동에 집중함"", ""coping_score"": 8, ""gratitude"": ""취미를 다시 찾은 것에 감사함"", ""insight"": """", ""value"": ""성장"", ""value_action_draft"": ""취미 시간을 주 2회로 늘리기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-022,2026-07-09,2026-07-09T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""오후"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""편안함"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""친구와 산책하며 대화함"", ""trigger_places"": [""집""], ""trigger_people"": [""특정 인물과 함께""], ""trigger_times"": [""주말""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""이야기를 나누니 마음이 가벼워진다"", ""thought_score"": 2, ""emotion_score"": 3, ""urge_score"": 3, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""친구와 산책함"", ""coping_score"": 7, ""gratitude"": """", ""insight"": """", ""value"": ""관계"", ""value_action_draft"": ""친구와의 산책을 정기화하기"", ""archived"": false}"
maeumgoyo_csv_v1,observation,obs-023,2026-07-10,2026-07-10T21:10:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""time_slot"": ""저녁"", ""behavior_areas"": [], ""behavior_custom_areas"": [], ""emotion"": ""성취감"", ""emotion_custom"": [], ""body_reactions"": [], ""body_custom"": [], ""situation"": ""한 주를 돌아보며 기록을 정리함"", ""trigger_places"": [""집""], ""trigger_people"": [], ""trigger_times"": [""주말""], ""trigger_custom"": [], ""avoidance_tags"": [], ""avoidance_custom"": [], ""thought_text"": ""한 주 동안 내가 꽤 노력했다는 게 보인다"", ""thought_score"": 2, ""emotion_score"": 2, ""urge_score"": 2, ""urge_initial_score"": """", ""urge_end_score"": """", ""action_level"": 0, ""coping"": ""한 주 기록을 정리하며 스스로 점검함"", ""coping_score"": 8, ""gratitude"": ""이번 주 스스로에게 감사함"", ""insight"": ""돌아보니 이번 주는 확실히 달랐다"", ""value"": ""성장"", ""value_action_draft"": ""다음 주 계획을 오늘 세워두기"", ""archived"": false}"
maeumgoyo_csv_v1,practice_definition,prac-201,,2026-06-20T08:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""practice_reason"": ""회피가 좁힌 생활반경을 넓힌다"", ""frequency"": ""daily"", ""target_count"": 1, ""custom_days"": [], ""reminder_mode"": ""morning"", ""reminder_times"": [], ""start_date"": ""2026-06-20"", ""barriers"": ""피곤함"", ""small_version"": ""현관 밖으로 나가기"", ""archived"": false}"
maeumgoyo_csv_v1,practice_definition,prac-202,,2026-06-20T08:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_value"": ""성장"", ""practice_name"": ""하루 감정 일기 쓰기"", ""practice_reason"": ""감정을 알아차리는 연습"", ""frequency"": ""1week"", ""target_count"": 1, ""custom_days"": [], ""reminder_mode"": ""none"", ""reminder_times"": [], ""start_date"": ""2026-06-22"", ""barriers"": ""귀찮음"", ""small_version"": ""한 줄만 쓰기"", ""archived"": false}"
maeumgoyo_csv_v1,practice_definition,prac-203,,2026-06-20T08:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_value"": ""관계"", ""practice_name"": ""예전에 시도했던 동호회 가입"", ""practice_reason"": ""고립감을 줄이려 했음"", ""frequency"": ""1week"", ""target_count"": 1, ""custom_days"": [], ""reminder_mode"": ""none"", ""reminder_times"": [], ""start_date"": ""2026-05-01"", ""barriers"": ""어색함"", ""small_version"": ""온라인으로만 참여"", ""archived"": true}"
maeumgoyo_csv_v1,practice_log,plog-024,2026-06-28,2026-06-28T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 4, ""mastery_score"": 3, ""expected_pleasure_score"": 3, ""expected_mastery_score"": 3, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-025,2026-06-30,2026-06-30T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 5, ""mastery_score"": 4, ""expected_pleasure_score"": 3, ""expected_mastery_score"": 3, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-026,2026-07-02,2026-07-02T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 6, ""mastery_score"": 5, ""expected_pleasure_score"": 3, ""expected_mastery_score"": 3, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-027,2026-07-04,2026-07-04T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 7, ""mastery_score"": 6, ""expected_pleasure_score"": 5, ""expected_mastery_score"": 5, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-028,2026-07-06,2026-07-06T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 8, ""mastery_score"": 7, ""expected_pleasure_score"": 5, ""expected_mastery_score"": 5, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-029,2026-07-08,2026-07-08T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 9, ""mastery_score"": 8, ""expected_pleasure_score"": 5, ""expected_mastery_score"": 5, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-030,2026-07-10,2026-07-10T20:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 10, ""mastery_score"": 9, ""expected_pleasure_score"": 5, ""expected_mastery_score"": 5, ""practice_note"": ""생각보다 개운했다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-031,2026-06-28,2026-06-28T21:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-202"", ""practice_value"": ""성장"", ""practice_name"": ""하루 감정 일기 쓰기"", ""target_count"": 1, ""pleasure_score"": 6, ""mastery_score"": 7, ""expected_pleasure_score"": 4, ""expected_mastery_score"": 4, ""practice_note"": ""쓰고 나니 생각이 정리됐다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-032,2026-07-05,2026-07-05T21:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-202"", ""practice_value"": ""성장"", ""practice_name"": ""하루 감정 일기 쓰기"", ""target_count"": 1, ""pleasure_score"": 6, ""mastery_score"": 7, ""expected_pleasure_score"": 4, ""expected_mastery_score"": 4, ""practice_note"": ""쓰고 나니 생각이 정리됐다"", ""archived"": false}"
maeumgoyo_csv_v1,practice_log,plog-033,2026-06-23,2026-06-23T22:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""practice_id"": ""prac-201"", ""practice_value"": ""건강"", ""practice_name"": ""퇴근 후 10분 걷기"", ""target_count"": 1, ""pleasure_score"": 0, ""mastery_score"": 0, ""expected_pleasure_score"": 3, ""expected_mastery_score"": 3, ""practice_note"": ""너무 지쳐서 못 했다"", ""archived"": false}"
maeumgoyo_csv_v1,prediction,pred-034,2026-06-22,2026-06-22T22:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""related_observation_id"": """", ""worry_text"": ""이번 주말엔 결국 또 도박 사이트를 볼 것 같다"", ""predicted_severity"": 8, ""status"": ""did_not_occur"", ""actual_severity"": 2, ""resolved_at"": ""2026-06-26T00:00:00.000Z"", ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,prediction,pred-035,2026-06-28,2026-06-28T22:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""related_observation_id"": """", ""worry_text"": ""친구 모임에 가면 결국 많이 마실 것 같다"", ""predicted_severity"": 7, ""status"": ""partial"", ""actual_severity"": 3, ""resolved_at"": ""2026-06-29T00:00:00.000Z"", ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,prediction,pred-036,2026-07-03,2026-07-03T22:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""related_observation_id"": """", ""worry_text"": ""가족 모임에서 예전 얘기가 나오면 무너질 것 같다"", ""predicted_severity"": 6, ""status"": ""occurred"", ""actual_severity"": 4, ""resolved_at"": ""2026-07-04T00:00:00.000Z"", ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,prediction,pred-037,2026-07-09,2026-07-09T22:30:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""related_observation_id"": """", ""worry_text"": ""다음 주에도 이 페이스를 유지할 수 있을지 걱정된다"", ""predicted_severity"": 5, ""status"": ""pending"", ""actual_severity"": """", ""resolved_at"": """", ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-038,2026-06-20,2026-06-20T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 2, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-039,2026-06-21,2026-06-21T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 3, ""note"": ""힘든 하루였다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-040,2026-06-22,2026-06-22T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 2, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-041,2026-06-23,2026-06-23T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 4, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-042,2026-06-24,2026-06-24T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 2, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-043,2026-06-25,2026-06-25T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 3, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-044,2026-06-26,2026-06-26T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 2, ""note"": ""그래도 버텼다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-045,2026-06-27,2026-06-27T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 4, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-046,2026-06-28,2026-06-28T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 5, ""note"": ""짧게라도 사람을 만났다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-047,2026-06-29,2026-06-29T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 4, ""note"": ""산책이 도움이 됐다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-048,2026-06-30,2026-06-30T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 6, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-049,2026-07-01,2026-07-01T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 5, ""note"": ""가족과 통화해서 좋았다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-050,2026-07-02,2026-07-02T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 6, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-051,2026-07-03,2026-07-03T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 6, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-052,2026-07-04,2026-07-04T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 7, ""note"": ""아침이 다르게 느껴졌다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-053,2026-07-05,2026-07-05T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 7, ""note"": ""동료와 편하게 지냈다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-054,2026-07-06,2026-07-06T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 8, ""note"": ""가족과 좋은 시간이었다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-055,2026-07-07,2026-07-07T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 6, ""note"": """", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-056,2026-07-08,2026-07-08T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 8, ""note"": ""취미를 다시 찾아서 좋았다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-057,2026-07-09,2026-07-09T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 7, ""note"": ""친구와 산책해서 좋았다"", ""archived"": false}"
maeumgoyo_csv_v1,daily_checkin,chk-058,2026-07-10,2026-07-10T23:00:00.000Z,2026-07-11T09:00:00.000Z,K-101,counselor_full,21,"{""expansion_score"": 8, ""note"": ""이번 주를 돌아보니 뿌듯하다"", ""archived"": false}"`;

function init() {
  if (els.versionBadge) els.versionBadge.textContent = APP_VERSION;
  document.title = `마음고요 상담분석실 ${APP_VERSION}`;
  renderMenu();
  bindEvents();
  applyPatientMode();
  initSidebarResize();
  render();
}

// 사이드바 폭을 마우스로 드래그해 조정합니다. PC 모니터가 큰 경우 상담 메모·AI 분석용 정리본·
// 자기성찰 요약문을 더 편하게 볼 수 있도록 280~720px 사이에서 자유롭게 늘리고 줄일 수 있습니다.
const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 720;

function initSidebarResize() {
  const handle = document.getElementById("sidebarResizeHandle");
  const shell = document.querySelector(".app-shell");
  if (!handle || !shell) return;
  let dragging = false;

  const setWidth = (px) => {
    const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, px));
    shell.style.setProperty("--sidebar-width", `${clamped}px`);
  };

  handle.addEventListener("mousedown", (event) => {
    dragging = true;
    handle.classList.add("dragging");
    event.preventDefault();
  });
  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const shellRect = shell.getBoundingClientRect();
    setWidth(event.clientX - shellRect.left);
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
  });
}

function bindEvents() {
  els.csvInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, () => els.dropZone.classList.remove("dragging"));
  });

  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  });

  [els.emotionThreshold, els.cognitiveUrgeThreshold, els.urgeThreshold, els.actionThreshold, els.practiceThreshold].forEach((input) => {
    input.addEventListener("input", () => {
      readThresholds();
      rebuildChains();
      render();
    });
  });

  [els.urgeGoalInput, els.actionGoalInput, els.practiceGoalInput, els.expansionGoalInput].forEach((input) => {
    input.addEventListener("input", () => render());
  });

  els.sampleBtn.addEventListener("click", () => ingestCsv(sampleCsv, "예시 CSV"));
  els.resetBtn.addEventListener("click", () => resetAll());
  els.printBtn.addEventListener("click", () => window.print());
  els.exportBtn.addEventListener("click", exportSummary);
  if (els.summaryArchiveBtn) els.summaryArchiveBtn.addEventListener("click", exportSummary);
  if (els.sessionPrepExportBtn) els.sessionPrepExportBtn.addEventListener("click", exportSessionPrepPackage);
  if (els.exportAiReportBtn) els.exportAiReportBtn.addEventListener("click", exportAiDetailedReport);
  if (els.exportAiContextBtn) els.exportAiContextBtn.addEventListener("click", exportAiSessionContext);
  if (els.projectNameInput) els.projectNameInput.addEventListener("input", () => {
    state.projectNameOverride = els.projectNameInput.value.trim();
    renderMeta();
  });
  if (els.previousAiContextInput) els.previousAiContextInput.addEventListener("change", readPreviousAiContextFile);
  els.exportAccumulatedCsvBtn.addEventListener("click", exportAccumulatedCsv);
  els.copySummaryBtn.addEventListener("click", copySessionSummary);
  els.refreshBtn.addEventListener("click", refreshApp);
  els.patientModeBtn.addEventListener("click", togglePatientMode);
  // 자기성찰 요약문은 CSV를 다시 불러올 때마다 목록 전체가 새로 그려지므로,
  // 각 항목에 리스너를 매번 새로 붙이지 않고 목록 컨테이너에서 한 번만 위임 처리합니다.
  els.reflectionDailyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-reflection]");
    if (!button) return;
    const day = state.reflectionDays[Number(button.dataset.copyReflection)];
    if (day) copyTextToClipboard(day.text, "자기성찰 요약문을 클립보드에 복사했습니다.");
  });
  els.copyAllReflectionBtn.addEventListener("click", () => {
    if (!state.reflectionDays.length) {
      showImportMessages(["복사할 자기성찰 요약문이 없습니다."]);
      return;
    }
    const combined = state.reflectionDays.map((day) => day.text).join("\n\n---\n\n");
    copyTextToClipboard(combined, `자기성찰 요약문 ${state.reflectionDays.length}건을 클립보드에 복사했습니다.`);
  });
  els.copyReflectionPromptBtn.addEventListener("click", () => {
    if (!state.reflectionDays.length) {
      showImportMessages(["복사할 자기성찰 요약문이 없습니다."]);
      return;
    }
    const combined = state.reflectionDays.map((day) => day.text).join("\n\n---\n\n");
    copyTextToClipboard(`${REFLECTION_AI_PROMPT}\n\n${combined}`, `AI 프롬프트와 자기성찰 요약문 ${state.reflectionDays.length}건을 함께 복사했습니다.`);
  });
  els.copyDraftPromptBtn.addEventListener("click", () => {
    if (!state.reflectionDays.length) {
      showImportMessages(["복사할 자기성찰 요약문이 없습니다."]);
      return;
    }
    const combined = state.reflectionDays.map((day) => day.text).join("\n\n---\n\n");
    copyTextToClipboard(`${REFLECTION_DRAFT_PROMPT}\n\n${combined}`, `AI 예비 반성문 초안 프롬프트와 자기성찰 요약문 ${state.reflectionDays.length}건을 함께 복사했습니다.`);
  });
  els.buildAiReportBtn.addEventListener("click", () => {
    if (!state.rows.length) {
      showImportMessages(["CSV를 먼저 불러오세요."]);
      return;
    }
    const usableRows = filterUsableRows(state.rows);
    if (!usableRows.length) {
      showImportMessages(["정리본을 만들 분석 대상 행이 없습니다."]);
      return;
    }
    els.aiReportBox.value = buildAiAnalysisReport(usableRows);
    els.aiReportBox.hidden = false;
    els.copyAiReportBtn.hidden = false;
  });
  // 클립보드 API가 막힌 환경에서는 텍스트 상자를 눌렀을 때 전체 선택해 Ctrl/Cmd+C로 수동 복사할 수 있게 합니다.
  els.aiReportBox.addEventListener("click", () => els.aiReportBox.select());
  els.copyAiReportBtn.addEventListener("click", () => {
    copyTextToClipboard(els.aiReportBox.value, "AI 분석용 정리본을 클립보드에 복사했습니다.");
  });
  els.previousSummaryInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (error) {
        showImportMessages(["이전 요약 파일의 형식이 올바르지 않습니다. JSON 파일인지 확인하세요."]);
        return;
      }
      const snapshot = extractSnapshotFromSummaryJson(parsed);
      if (!snapshot) {
        showImportMessages(["이 파일에서 비교할 수 있는 정보를 찾지 못했습니다. 마음고요 상담분석실에서 저장한 요약 파일인지 확인하세요."]);
        return;
      }
      state.previousSnapshot = snapshot;
      showImportMessages([`이전 요약(${snapshot.fileName || file.name})을 불러왔습니다.${snapshot.isLegacy ? " (예전 형식 — 일부 지표만 비교 가능)" : ""}`]);
      render();
    };
    reader.onerror = () => showImportMessages(["이전 요약 파일을 읽지 못했습니다."]);
    reader.readAsText(file);
  });
}

// 내담자용 보기 전환. 데이터를 다시 계산하지 않고 순수 CSS 클래스만 바꿉니다 —
// counselor-only 요소는 body.patient-mode 상태에 따라 CSS로만 숨겨지므로 재렌더링이 필요 없습니다.
function togglePatientMode() {
  state.patientMode = !state.patientMode;
  applyPatientMode();
}

function applyPatientMode() {
  document.body.classList.toggle("patient-mode", state.patientMode);
  els.patientModeBtn.textContent = state.patientMode ? "상담자용 보기로 전환" : "내담자용 보기";
}

function renderMenu() {
  els.therapyMenu.innerHTML = VIEWS.map(([id, title, desc]) => {
    const usage = VIEW_USAGE[id] || { type: "support", label: "보조" };
    const classes = [id === state.activeView ? "active" : "", `step-${usage.type}`].filter(Boolean).join(" ");
    return `
    <button type="button" data-view="${id}" class="${classes}">
      <span class="step-use-badge">${escapeHtml(usage.label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(desc)}</span>
    </button>
  `;
  }).join("");

  els.therapyMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      renderMenu();
      renderWeekFocusPlan();
      renderTherapyView();
    });
  });
}

function readFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    showImportMessages(["파일이 20MB를 초과합니다. CSV가 손상되었거나 여러 파일이 하나로 합쳐졌을 수 있습니다. (전체 백업 파일은 기간 제한이 없어 원래도 클 수 있습니다.)"]);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => ingestCsv(decodeCsv(reader.result), file.name);
  reader.onerror = () => showImportMessages(["파일을 읽지 못했습니다. CSV 파일인지와 파일 접근 권한을 확인하세요."]);
  reader.readAsArrayBuffer(file);
}

// v1 규격일 때, 분석에 실제로 사용할 행만 골라냅니다:
// schema_version이 다른 행(다른 CSV 규격이 섞여 들어온 경우)과
// share_mode가 counselor_full이 아닌 행(상담자 전체 자료가 아닌 경우)은 제외합니다.
// validateRows()가 이미 이런 행이 있으면 경고를 만들어 두므로, 여기서는 그 경고에 맞춰 실제로 걸러내기만 합니다.
// 분석에 실제로 쓸 행만 남깁니다: schema_version이 CSV_SCHEMA와 다르거나
// share_mode가 counselor_full이 아닌 행은 상담 분석 대상이 아니므로 제외합니다.
// (validateRows가 이미 이런 행이 있으면 경고를 만들어 두므로, 여기서는 그 경고에 맞춰 실제로 걸러내기만 합니다.)
function filterUsableRows(rows) {
  return rows.filter((row) => {
    if (row.schema_version !== CSV_SCHEMA || !ANALYSIS_SHARE_MODES.includes(row.share_mode)) return false;
    // practice_definition은 archived(중단된 실천)여도 참조용으로 항상 포함됩니다 — counselor_full도 마찬가지입니다(§4.2).
    // 실제 "목표치 계산에서 뺄지"는 여기서 걸러내지 않고 extractPracticePlans에서 처리합니다.
    if (row.record_type === "practice_definition") return true;
    const payload = parsePayload(row.payload_json) || {};
    return payload.archived !== true;
  });
}

function ingestCsv(text, fileName) {
  const parsedIncomingRows = parseCsv(text);
  const aliasResult = ensureClientAliases(parsedIncomingRows, fileName);
  const incomingRows = aliasResult.rows;

  const validation = validateRows(incomingRows);
  if (validation.errors.length) {
    state.importMessages = validation.errors;
    render();
    return;
  }

  const normalizedIncoming = dedupeRowsById(incomingRows);
  let rowsToUse = normalizedIncoming.rows;
  let mergeNotice = null;
  const dedupeNotice = normalizedIncoming.duplicateCount
    ? `같은 id가 반복된 기록 ${normalizedIncoming.duplicateCount}건은 updated_at이 더 최신인 기록만 반영했습니다.`
    : null;

  if (state.rows.length) {
    const mergeResult = mergeIncomingRows(state.rows, rowsToUse);
    if (mergeResult.error) {
      state.importMessages = [mergeResult.error];
      render();
      return;
    }
    rowsToUse = mergeResult.merged;
    mergeNotice = `이전에 누적된 자료(${state.rows.length}행)에 새로 불러온 파일(${incomingRows.length}행)을 합쳤습니다. 현재 누적 ${rowsToUse.length}행입니다.`;
  }

  const usableRows = filterUsableRows(rowsToUse);
  if (!usableRows.length) {
    state.importMessages = [`schema_version=${CSV_SCHEMA}이면서 share_mode가 counselor_full 또는 backup_full인 활성 행이 없어 분석할 자료가 없습니다.`];
    render();
    return;
  }

  state.rows = rowsToUse;
  state.fileName = fileName;
  state.fileNames = mergeNotice ? [...state.fileNames, fileName] : [fileName];

  const rangeWindow = resolveRangeWindow(usableRows);
  state.practicePlans = extractPracticePlans(usableRows, rangeWindow);
  state.records = normalizeRows(usableRows);
  if (els.projectNameInput && !els.projectNameInput.value.trim()) {
    els.projectNameInput.value = getProjectName();
    state.projectNameOverride = "";
  }
  state.predictions = extractPredictions(usableRows);
  state.observationDays = extractObservationDays(usableRows);
  state.dailyCheckins = extractDailyCheckins(usableRows);
  state.reflectionDays = extractDailyReflectionSummaries(usableRows);
  state.relapseWindow = computeRelapseWindowSignal(state.observationDays, rangeWindow.endTs);
  state.importMessages = [mergeNotice, dedupeNotice, ...aliasResult.warnings, ...validation.warnings].filter(Boolean);
  detectMeta(rangeWindow, usableRows);
  const accumulatedShareModes = unique(state.rows.map((row) => row.share_mode).filter(Boolean));
  if (accumulatedShareModes.length > 1) {
    state.importMessages = [
      `현재 누적 자료에 공유 모드가 ${accumulatedShareModes.join(", ")}로 섞여 있습니다. backup_full이 포함되면 분석 범위가 전체 기간 중심으로 넓어질 수 있으므로, 이번 주 회기 분석인지 전체 경과 분석인지 먼저 확인하세요.`,
      ...state.importMessages,
    ];
  }
  rebuildChains();
  render();
}

// --- 날짜/기간 계산 유틸 ---
// "YYYY-MM-DD" 또는 전체 ISO 타임스탬프에서 날짜 부분만 뽑아 UTC 자정 타임스탬프(ms)로 반환합니다.
// 요일 계산을 타임존에 관계없이 CSV 문자열 그대로 일관되게 하기 위해 UTC로 고정합니다.
function dateOnly(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const ts = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(ts) ? null : ts;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_DAYS = 400; // 방어적 상한(비정상 날짜로 인한 무한 루프 방지)

// CSV의 range_days(숫자 또는 "all")를 이용해 이 CSV가 다루는 날짜 구간을 계산합니다.
// range_days가 없거나 해석할 수 없으면 CSV에 실제로 등장하는 날짜의 최소~최대로 대체합니다.
function resolveRangeWindow(rows) {
  const firstRow = rows[0] || {};
  const isBackupFull = rows.some((row) => row.share_mode === "backup_full");
  // backup_full은 "선택한 공유 기간과 무관하게" 저장되는 파일이라, range_days 값이 무엇이든
  // 그 파일의 실제 내용을 설명하지 못합니다. 값을 신뢰하지 않고 항상 실제 관측된 날짜 범위를 씁니다.
  const rangeDaysRaw = isBackupFull ? "all" : rows.map((row) => row.range_days).find((value) => value !== undefined && value !== "");
  const exportedTs = dateOnly(firstRow.exported_at) ?? Date.now();
  const dataDates = rows.map((row) => dateOnly(row.date)).filter((value) => value !== null);
  let startTs;
  let endTs = exportedTs;
  let days = null;
  let label = "";

  if (rangeDaysRaw === "all") {
    startTs = dataDates.length ? Math.min(...dataDates) : endTs;
    label = isBackupFull ? "전체 백업 (전체 기간)" : "전체 기간";
  } else {
    days = wholeNumber(rangeDaysRaw);
    if (days !== null && days > 0) {
      startTs = endTs - (days - 1) * DAY_MS;
      label = `최근 ${days}일`;
    } else {
      startTs = dataDates.length ? Math.min(...dataDates) : endTs;
      days = null;
      label = "";
    }
  }

  if (dataDates.length) endTs = Math.max(endTs, Math.max(...dataDates));
  return { startTs, endTs, days, rangeDaysRaw: rangeDaysRaw ?? "", label };
}

function countMatchingDays(startTs, endTs, matcher) {
  if (startTs === null || endTs === null || startTs > endTs) return 0;
  let count = 0;
  let cursor = startTs;
  let guard = 0;
  while (cursor <= endTs && guard < MAX_WINDOW_DAYS) {
    if (matcher(new Date(cursor).getUTCDay())) count += 1;
    cursor += DAY_MS;
    guard += 1;
  }
  return count;
}

// maeumgoyo_csv_v1의 practice_definition은 요일 기반 빈도(frequency/custom_days)로 계획을 표현합니다.
// "약속 총 횟수"는 CSV의 실제 기간(range_days 또는 관측된 날짜 범위) 동안 그 요일 패턴이 며칠 해당하는지 세어 계산해야
// 정확합니다(예전처럼 "주당 일수 × 하루 횟수"로 단순 곱하면 기간이 7일이 아닐 때 틀립니다).
// "약속 총 횟수"는 CSV의 실제 기간(range_days 또는 관측된 날짜 범위) 동안 그 요일 패턴이 며칠 해당하는지 세어 계산해야
// 정확합니다("주당 일수 × 하루 횟수"로 단순 곱하면 기간이 7일이 아닐 때 틀립니다).
function extractPracticePlans(rows, window) {
  return rows
    .filter((row) => row.record_type === "practice_definition")
    .map((row) => {
      const payload = parsePayload(row.payload_json) || {};
      const frequency = ["daily", "1week", "3week", "custom"].includes(payload.frequency) ? payload.frequency : "daily";
      const targetCount = wholeNumber(payload.target_count) ?? 1;
      const customDays = Array.isArray(payload.custom_days)
        ? payload.custom_days.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        : [];
      const startTs = dateOnly(payload.start_date);
      const effectiveStart = startTs !== null ? Math.max(startTs, window.startTs) : window.startTs;
      const fixedWeekday = new Date(startTs !== null ? startTs : window.startTs).getUTCDay();

      const matches = (weekday) => {
        if (frequency === "daily") return true;
        if (frequency === "1week") return weekday === fixedWeekday;
        if (frequency === "3week") return [1, 3, 5].includes(weekday); // 월/수/금 고정 (앱 코드 기준)
        if (frequency === "custom") return customDays.includes(weekday);
        return true;
      };

      const occurrences = countMatchingDays(effectiveStart, window.endTs, matches);
      const plannedTotal = occurrences * targetCount;

      return {
        id: row.id || "",
        name: payload.practice_name || "실천행동",
        plannedTotal,
        frequency,
        targetCount,
        archived: payload.archived === true,
      };
    })
    // 보관(중단)된 실천은 목표치 계산에서 제외합니다. 그래도 그 실천에 달린 practice_log는
    // normalizeRows()가 원본 행에서 직접 이름을 찾아오므로 별도 그룹으로 계속 표시됩니다.
    .filter((plan) => (plan.id || plan.name) && !plan.archived);
}

// prediction record_type을 별도 목록으로 추출합니다(연쇄 카드가 아니라 예기불안 검증 자료).
function extractPredictions(rows) {
  return rows
    .filter((row) => row.record_type === "prediction")
    .map((row) => {
      const payload = parsePayload(row.payload_json) || {};
      const status = ["pending", "occurred", "partial", "did_not_occur"].includes(payload.status) ? payload.status : "pending";
      return {
        id: row.id || "",
        client: row.client_alias || "내담자",
        relatedObservationId: payload.related_observation_id || "",
        worryText: payload.worry_text || "",
        predictedSeverity: score10(payload.predicted_severity),
        status,
        actualSeverity: score10(payload.actual_severity),
        resolvedAt: payload.resolved_at || "",
        note: payload.note || "",
        date: row.date || "",
        createdAt: parseDate(row.date || row.updated_at),
      };
    });
}

// daily_checkin(v1.1 신규): 하루 1건, 문제행동수준과는 별개 축인 "삶의 경험 확장/만족도" 회고 점수.
// observation처럼 하루 여러 건이 아니라 date당 0~1건이라고 가정할 수 있습니다(명세서 §4-5).
function extractDailyCheckins(rows) {
  return rows
    .filter((row) => row.record_type === "daily_checkin")
    .map((row) => {
      const payload = parsePayload(row.payload_json) || {};
      return {
        id: row.id || "",
        dateTs: dateOnly(row.date),
        date: row.date || "",
        expansionScore: score10(payload.expansion_score),
        personalLifeHappiness: score100(payload.personal_life_happiness),
        intimateRelationshipHappiness: score100(payload.intimate_relationship_happiness),
        socialLifeHappiness: score100(payload.social_life_happiness),
        overallHappiness: score100(payload.overall_happiness),
        note: payload.note || "",
      };
    })
    .filter((entry) => entry.dateTs !== null);
}

// --- 재발신호 (연동명세서 §5-2) ---
// "마음고요 관찰과 실천" 앱 화면(오늘할일, 재발예방 탭)이 실제로 계산하는 것과 동일한 신호를
// 상담분석실에서도 동일한 원자료로 재현합니다. observation record_type에서만 값을 가져오며,
// CSV엔 이 신호 자체가 별도 열로 저장되지 않으므로 여기서 직접 계산합니다.
function asTagArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function displayTimeSlot(value) {
  const slot = String(value || "").trim();
  return slot === "충동 발생" || slot === "감정/충동 발생 시점" ? "감정/충동 발생 시점" : slot;
}

function extractObservationDays(rows) {
  return rows
    .filter((row) => row.record_type === "observation")
    .map((row) => {
      const payload = parsePayload(row.payload_json) || {};
      return {
        id: row.id || "",
        dateTs: dateOnly(row.date),
        emotionScore: score10(payload.emotion_score),
        thoughtScore: score10(payload.thought_score),
        urgeScore: score10(payload.urge_score),
        copingScore: score10(payload.coping_score),
        actionLevel: score5(payload.action_level),
        behaviorAreas: asTagArray(firstDefined(payload.problem_labels, payload.behavior_areas)),
        triggerPlaces: asTagArray(payload.trigger_places),
        triggerPeople: asTagArray(payload.trigger_people),
        triggerTimes: asTagArray(payload.trigger_times),
        avoidanceTags: asTagArray(payload.avoidance_tags),
      };
    })
    .filter((entry) => entry.dateTs !== null);
}

// 태그(behavior_areas/trigger_*/avoidance_tags)별로 등장 횟수와, 그 태그가 붙은 기록들의 평균 충동 점수를 집계합니다.
// 빈도만 보여주면 "자주 나오지만 위험하지 않은 태그"와 "드물지만 충동이 특히 높은 태그"를 구분할 수 없어서
// 평균 충동 점수를 함께 계산합니다.
function aggregateTagHeatmap(observationDays, field) {
  const map = new Map();
  observationDays.forEach((day) => {
    (day[field] || []).forEach((tag) => {
      if (!map.has(tag)) map.set(tag, { tag, count: 0, urgeSum: 0, urgeCount: 0 });
      const entry = map.get(tag);
      entry.count += 1;
      if (day.urgeScore !== null) {
        entry.urgeSum += day.urgeScore;
        entry.urgeCount += 1;
      }
    });
  });
  return [...map.values()]
    .map((entry) => ({
      tag: entry.tag,
      count: entry.count,
      avgUrge: entry.urgeCount ? Math.round((entry.urgeSum / entry.urgeCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);
}

// aggregateTagHeatmap과 같은 패턴이지만 평균 문제행동수준(action_level)도 함께 계산합니다.
// 관계적 촉발요인은 충동만이 아니라 "실제 행동으로 이어지는지"가 핵심이라 이 값이 따로 필요합니다.
function aggregateTagHeatmapWithAction(observationDays, field) {
  const map = new Map();
  observationDays.forEach((day) => {
    (day[field] || []).forEach((tag) => {
      if (!map.has(tag)) map.set(tag, { tag, count: 0, urgeSum: 0, urgeCount: 0, actionSum: 0, actionCount: 0 });
      const entry = map.get(tag);
      entry.count += 1;
      if (day.urgeScore !== null) {
        entry.urgeSum += day.urgeScore;
        entry.urgeCount += 1;
      }
      if (day.actionLevel !== null) {
        entry.actionSum += day.actionLevel;
        entry.actionCount += 1;
      }
    });
  });
  return [...map.values()]
    .map((entry) => ({
      tag: entry.tag,
      count: entry.count,
      avgUrge: entry.urgeCount ? Math.round((entry.urgeSum / entry.urgeCount) * 10) / 10 : null,
      avgAction: entry.actionCount ? Math.round((entry.actionSum / entry.actionCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);
}

function tagHeatmapRowsHtml(items) {
  if (!items.length) return `<p class="muted">기록된 값 없음</p>`;
  const maxCount = Math.max(...items.map((item) => item.count));
  return `<div class="heat-list">${items.slice(0, 8).map((item) => {
    const width = maxCount ? Math.round((item.count / maxCount) * 100) : 0;
    const color = item.avgUrge !== null && item.avgUrge >= 7 ? "#b65333" : "#176b5b";
    const urgeText = item.avgUrge !== null ? ` · 평균충동 ${item.avgUrge}/10` : "";
    return `<div class="heat-row"><span>${escapeHtml(item.tag)}</span><div class="heat-track"><div class="heat-fill" style="width:${width}%;background:${color}"></div></div><strong>${item.count}회${urgeText}</strong></div>`;
  }).join("")}</div>`;
}

const TAG_HEATMAP_FIELDS = [
  ["behaviorAreas", "경험한 문제"],
  ["triggerPlaces", "촉발 장소"],
  ["triggerPeople", "촉발 사람·상황"],
  ["triggerTimes", "촉발 시간대"],
  ["avoidanceTags", "회피 신호"],
];

function triggerHeatmapCard() {
  const sections = TAG_HEATMAP_FIELDS.map(([field, label]) => {
    const items = aggregateTagHeatmap(state.observationDays, field);
    return `<div class="heat-section"><h4>${escapeHtml(label)}</h4>${tagHeatmapRowsHtml(items)}</div>`;
  }).join("");
  return card(
    "경험한 문제·촉발단서 분석",
    `<p class="muted">평균충동이 높게 표시된 항목은 등장 횟수는 적어도 우선 확인할 가치가 있습니다.</p>${sections}`,
    "focus",
    ["가장 자주 등장하는 촉발단서는 무엇인가요?", "평균 충동이 가장 높은 항목은 등장 빈도와 일치하나요, 다른가요?", "이 패턴을 회피계획이나 환경조정에 어떻게 반영할까요?"],
  );
}

// trigger_people(혼자 있을 때/특정 인물과 함께/갈등 직후/사교 모임 상황)은 위 히트맵 안에도 있지만
// 다른 촉발단서 종류와 섞여 있어 두드러지지 않습니다. 관계·부부 문제로 상담하는 경우 이 축이 핵심이라
// 전용 카드로 분리하고, 충동뿐 아니라 실제 행동으로 이어졌는지(평균 문제행동수준)까지 함께 봅니다.
function findTagExample(field, tag) {
  const exampleChain = state.chains.find((chain) => {
    const payload = chain.records[0]?.payload || {};
    return asTagArray(payload[field]).includes(tag);
  });
  if (!exampleChain) return null;
  const payload = exampleChain.records[0]?.payload || {};
  if (!payload.situation) return null;
  return { date: exampleChain.date, situation: payload.situation };
}

function buildRelationalTriggerCard() {
  const stats = aggregateTagHeatmapWithAction(state.observationDays, "triggerPeople");
  if (!stats.length) {
    return card("관계적 촉발요인", "<p>trigger_people(혼자 있을 때/특정 인물과 함께/갈등 직후/사교 모임 상황) 기록이 없습니다.</p>", "focus");
  }

  const rows = stats.map((entry) => `<li><strong>${escapeHtml(entry.tag)}</strong> — ${entry.count}회, 평균 충동 ${entry.avgUrge ?? "-"}/10, 평균 문제행동수준 ${entry.avgAction ?? "-"}/5</li>`).join("");

  const topRisk = [...stats].sort((a, b) => (b.avgAction ?? -1) - (a.avgAction ?? -1))[0];
  const example = topRisk ? findTagExample("trigger_people", topRisk.tag) : null;
  const exampleHtml = example ? `<p class="muted">예시(${escapeHtml(formatDate(example.date))}, "${escapeHtml(topRisk.tag)}"): ${escapeHtml(example.situation)}</p>` : "";

  return card(
    "관계적 촉발요인",
    `<p>혼자 있을 때, 특정 인물과 함께, 갈등 직후, 사교 모임 상황이 각각 충동·문제행동수준과 어떻게 연결되는지 봅니다. 부부·관계 문제로 상담하는 경우 특히 중요한 축입니다.</p><ul>${rows}</ul>${exampleHtml}`,
    "focus",
    ["관계적 촉발요인 중 평균 문제행동수준이 가장 높은 것은 무엇인가요?", "그 상황을 피하기보다 다르게 대응할 방법이 있을까요?", "신뢰할 사람과 이 패턴을 미리 공유해둘 수 있을까요?"],
  );
}

// --- 시간대·요일 위험 패턴 ---
// time_slot("충동 발생"과 "감정/충동 발생 시점"은 관찰 방식 표시일 뿐 실제 시간대가 아니므로 제외)과 관찰 날짜의 요일별로
// 평균 충동·평균 문제행동수준을 집계해, 가장 위험도가 높은 시간대/요일을 짚어줍니다.
const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// --- 성공-실패 대조 분석 ---
// 충동 수준은 비슷했는데 결과(행동 여부)가 달랐던 순간을 짝지어 나란히 보여줍니다.
// 재발예방 이론(Marlatt)에서 고위험 상황의 성공/실패 사례를 대조하는 것과 같은 원리로,
// "그 차이가 무엇 때문이었는가"를 내담자가 스스로 짚어보게 돕는 자료입니다.
function computeSuccessFailurePairs(limit = 3) {
  const withScores = state.chains
    .filter((chain) => chain.chainId.startsWith("observation-"))
    .map((chain) => {
      const payload = chain.records[0]?.payload || {};
      return { chain, payload, urge: score10(payload.urge_score), action: score5(payload.action_level) };
    })
    .filter((entry) => entry.urge !== null && entry.action !== null);

  const successCases = withScores.filter((entry) => entry.action === 0);
  const failureCases = withScores.filter((entry) => entry.action >= 1);

  const pairs = [];
  const usedSuccessIds = new Set();
  failureCases
    .slice()
    .sort((a, b) => b.urge - a.urge)
    .forEach((failure) => {
      let best = null;
      let bestDiff = Infinity;
      successCases.forEach((success) => {
        if (usedSuccessIds.has(success.chain.chainId)) return;
        const diff = Math.abs(success.urge - failure.urge);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = success;
        }
      });
      if (best && bestDiff <= 2) {
        pairs.push({ failure, success: best, urgeDiff: bestDiff });
        usedSuccessIds.add(best.chain.chainId);
      }
    });

  return pairs.sort((a, b) => a.urgeDiff - b.urgeDiff).slice(0, limit);
}

function contrastSideHtml(entry, label) {
  const payload = entry.payload;
  return `
    <div class="contrast-side">
      <h4>${escapeHtml(label)} (${escapeHtml(formatDate(entry.chain.date))})</h4>
      <p><strong>충동</strong> ${entry.urge}/10 · <strong>행동</strong> ${entry.action}/5</p>
      <p><strong>상황</strong>: ${escapeHtml(payload.situation || "-")}</p>
      <p><strong>생각</strong>: ${escapeHtml(payload.thought_text || "-")}</p>
      <p><strong>대처</strong>: ${escapeHtml(payload.coping || "-")}</p>
    </div>
  `;
}

function buildSuccessFailureContrastCard() {
  const pairs = computeSuccessFailurePairs();
  if (!pairs.length) {
    return card(
      "성공-실패 대조 분석",
      "<p>충동 수준이 비슷하면서 결과가 달랐던 사례 쌍을 아직 찾지 못했습니다. 기록이 더 쌓이면 자동으로 채워집니다.</p>",
      "focus",
    );
  }

  const sections = pairs.map(({ failure, success, urgeDiff }, index) => `
    <div class="contrast-pair">
      <p class="muted">쌍 ${index + 1} — 충동 차이 ${urgeDiff}점</p>
      <div class="contrast-grid">
        ${contrastSideHtml(success, "참은 순간")}
        ${contrastSideHtml(failure, "행동으로 이어진 순간")}
      </div>
    </div>
  `).join("");

  return card(
    "성공-실패 대조 분석",
    `<p>충동 수준은 비슷했지만 결과가 달랐던 순간을 나란히 비교합니다. 그 차이가 무엇 때문이었는지 살펴보는 것 자체가 강력한 성찰 도구입니다.</p>${sections}`,
    "focus",
    ["두 상황에서 생각이나 대처 방식이 어떻게 달랐나요?", "참았던 순간의 무엇을 다음에도 의식적으로 쓸 수 있을까요?", "행동으로 이어진 순간에 그 방법을 썼다면 어땠을까요?"],
  );
}

// --- 반복되는 생각 패턴 ---
// 감정·촉발단서는 이미 빈도 집계가 있는데, 자동적 사고는 텍스트로만 보여서 반복 여부가 눈에 띄지 않았습니다.
// 글자 그대로 완전히 같은 문장만 모읍니다(비슷하지만 다르게 표현한 생각은 규칙 기반으로 묶으면 오탐이 생기므로 하지 않습니다).
function computeRepeatedThoughts(limit = 5) {
  const counts = new Map();
  state.chains.forEach((chain) => {
    if (!chain.chainId.startsWith("observation-")) return;
    const payload = chain.records[0]?.payload || {};
    const thought = (payload.thought_text || "").trim();
    if (!thought) return;
    if (!counts.has(thought)) counts.set(thought, { thought, count: 0, urgeSum: 0, urgeCount: 0, lastDate: null });
    const entry = counts.get(thought);
    entry.count += 1;
    const urge = score10(payload.urge_score);
    if (urge !== null) {
      entry.urgeSum += urge;
      entry.urgeCount += 1;
    }
    if (chain.date && (!entry.lastDate || chain.date > entry.lastDate)) entry.lastDate = chain.date;
  });

  return [...counts.values()]
    .filter((entry) => entry.count >= 2)
    .map((entry) => ({
      thought: entry.thought,
      count: entry.count,
      avgUrge: entry.urgeCount ? Math.round((entry.urgeSum / entry.urgeCount) * 10) / 10 : null,
      lastDate: entry.lastDate,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildRepeatedThoughtCard() {
  const repeated = computeRepeatedThoughts();
  if (!repeated.length) {
    return card(
      "반복되는 생각 패턴",
      "<p>글자 그대로 똑같이 2번 이상 반복된 생각이 아직 없습니다. 비슷하지만 다르게 표현한 생각은 여기 집계되지 않습니다.</p>",
      "focus",
    );
  }
  const rows = repeated.map((entry) => `<li>"${escapeHtml(entry.thought)}" — ${entry.count}회${entry.avgUrge !== null ? `, 평균 충동 ${entry.avgUrge}/10` : ""}${entry.lastDate ? `, 최근 ${escapeHtml(formatDate(entry.lastDate))}` : ""}</li>`).join("");
  return card(
    "반복되는 생각 패턴",
    `<p>글자 그대로 똑같이 반복된 생각만 모았습니다(비슷하지만 다르게 표현한 생각은 별도로 집계됩니다).</p><ul>${rows}</ul>`,
    "focus",
    ["이 생각이 반복될 때 공통된 상황이나 감정이 있나요?", "이 생각이 사실인지, 습관적으로 떠오르는 것인지 구분해볼 수 있을까요?"],
  );
}

function computeTimeRiskPatterns() {
  const bySlot = new Map();
  const byWeekday = new Map();

  state.chains.forEach((chain) => {
    if (!chain.chainId.startsWith("observation-")) return;
    const payload = chain.records[0]?.payload || {};
    const urge = score10(payload.urge_score);
    const action = score5(payload.action_level);

    const timeSlot = displayTimeSlot(payload.time_slot);
    if (timeSlot && timeSlot !== "감정/충동 발생 시점") {
      if (!bySlot.has(timeSlot)) bySlot.set(timeSlot, { urgeSum: 0, urgeCount: 0, actionSum: 0, actionCount: 0, count: 0 });
      const entry = bySlot.get(timeSlot);
      entry.count += 1;
      if (urge !== null) { entry.urgeSum += urge; entry.urgeCount += 1; }
      if (action !== null) { entry.actionSum += action; entry.actionCount += 1; }
    }

    if (chain.date) {
      const weekday = WEEKDAY_NAMES[chain.date.getUTCDay()];
      if (!byWeekday.has(weekday)) byWeekday.set(weekday, { urgeSum: 0, urgeCount: 0, actionSum: 0, actionCount: 0, count: 0 });
      const entry = byWeekday.get(weekday);
      entry.count += 1;
      if (urge !== null) { entry.urgeSum += urge; entry.urgeCount += 1; }
      if (action !== null) { entry.actionSum += action; entry.actionCount += 1; }
    }
  });

  const toRanked = (map) => [...map.entries()]
    .map(([key, entry]) => ({
      key,
      count: entry.count,
      avgUrge: entry.urgeCount ? Math.round((entry.urgeSum / entry.urgeCount) * 10) / 10 : null,
      avgAction: entry.actionCount ? Math.round((entry.actionSum / entry.actionCount) * 10) / 10 : null,
    }))
    .sort((a, b) => (b.avgAction ?? -1) - (a.avgAction ?? -1) || (b.avgUrge ?? -1) - (a.avgUrge ?? -1));

  return { slots: toRanked(bySlot), weekdays: toRanked(byWeekday) };
}

function buildTimeRiskPatternCard() {
  const { slots, weekdays } = computeTimeRiskPatterns();
  if (!slots.length && !weekdays.length) {
    return card("시간대·요일 위험 패턴", "<p>기록이 없어 계산할 수 없습니다.</p>", "focus");
  }

  const topSlot = slots[0];
  const topWeekday = weekdays[0];
  const summaryParts = [];
  if (topSlot && topSlot.avgAction !== null) summaryParts.push(`시간대는 "${topSlot.key}"(평균 문제행동 ${topSlot.avgAction}/5, ${topSlot.count}건)`);
  if (topWeekday && topWeekday.avgAction !== null) summaryParts.push(`요일은 "${topWeekday.key}요일"(평균 문제행동 ${topWeekday.avgAction}/5, ${topWeekday.count}건)`);
  const summaryText = summaryParts.length ? `${summaryParts.join(", ")}이 가장 위험도가 높습니다.` : "문제행동 기록이 없어 위험도 순위를 매길 수 없습니다.";

  const slotRows = slots.map((entry) => `<li>${escapeHtml(entry.key)}: 평균 충동 ${entry.avgUrge ?? "-"}/10, 평균 문제행동 ${entry.avgAction ?? "-"}/5 (${entry.count}건)</li>`).join("");
  const weekdayRows = weekdays.map((entry) => `<li>${escapeHtml(entry.key)}요일: 평균 충동 ${entry.avgUrge ?? "-"}/10, 평균 문제행동 ${entry.avgAction ?? "-"}/5 (${entry.count}건)</li>`).join("");

  return card(
    "시간대·요일 위험 패턴",
    `<p>${escapeHtml(summaryText)}</p>
     <h4>시간대별</h4><ul>${slotRows || "<li>기록 없음</li>"}</ul>
     <h4>요일별</h4><ul>${weekdayRows || "<li>기록 없음</li>"}</ul>`,
    "focus",
    ["가장 위험한 시간대·요일에 미리 대처 계획을 세울 수 있을까요?", "그 시간대·요일에 반복되는 상황이나 촉발단서가 있나요?"],
  );
}

// --- 감정·충동 산점도 / 문제행동 캘린더 히트맵 (시각화 구현 명세서 기반) ---
// 두 시각화가 공유하는 색상 함수. 0~50%는 초록→주황, 50~100%는 주황→빨강으로 2단 선형보간합니다.
function severityColor(percent) {
  const p = clamp(Number(percent) || 0, 0, 100);
  let from;
  let to;
  let t;
  if (p <= 50) {
    from = [61, 125, 77];
    to = [193, 132, 47];
    t = p / 50;
  } else {
    from = [193, 132, 47];
    to = [182, 74, 69];
    t = (p - 50) / 50;
  }
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function severityColorForActionLevel(actionLevel) {
  const level = clamp(Number(actionLevel) || 0, 0, 5);
  return severityColor((level / 5) * 100);
}

// 상담분석실은 CSV를 상담 시점에 열어보는 구조라, "오늘"을 실제 시스템 날짜가 아니라
// CSV에 담긴 observation 중 가장 최근 날짜로 잡습니다(명세서 §0-3).
function getAnchorDate(observationDays) {
  const dates = observationDays.map((day) => day.dateTs).filter((ts) => ts !== null);
  return dates.length ? Math.max(...dates) : dateOnly(new Date().toISOString());
}

// 집계하지 않습니다 — 관찰 기록 1건 = 점 1개. rangeDays가 없으면 전체 기간을 사용합니다.
function getScatterPoints(observationDays, anchorTs, rangeDays = null) {
  return observationDays
    .filter((day) => day.emotionScore !== null && day.urgeScore !== null)
    .filter((day) => {
      if (!rangeDays) return true;
      const daysBetween = Math.round((anchorTs - day.dateTs) / DAY_MS);
      return daysBetween < rangeDays;
    })
    .map((day) => ({
      x: clamp(day.emotionScore, 0, 10),
      y: clamp(day.urgeScore, 0, 10),
      color: severityColorForActionLevel(day.actionLevel ?? 0),
      dateTs: day.dateTs,
    }));
}

// 하루에 관찰이 여러 건이면 그날 중 가장 심각했던 action_level을 대표값으로 씁니다(평균이 아님).
function dayProblemStatus(observationDays, targetTs) {
  const dayEntries = observationDays.filter((day) => day.dateTs === targetTs);
  if (!dayEntries.length) return { hasData: false, maxAction: 0 };
  const maxAction = Math.max(...dayEntries.map((day) => day.actionLevel ?? 0));
  return { hasData: true, maxAction };
}

// weeks(기본 10) × 7행(일~토) 격자를 기준일 요일에 맞춰 배치합니다. 요일이 무엇이든 동일하게 작동합니다.
function calendarHeatmapCells(observationDays, anchorTs, weeks = 10) {
  const todayDow = new Date(anchorTs).getUTCDay(); // 0=일 ... 6=토
  const cells = [];
  for (let col = 0; col < weeks; col += 1) {
    const weekIndexFromRight = weeks - 1 - col;
    for (let row = 0; row < 7; row += 1) {
      const daysAgoCount = weekIndexFromRight * 7 + (todayDow - row);
      if (daysAgoCount < 0) {
        cells.push({ col, row, dateTs: null });
      } else {
        const dateTs = anchorTs - daysAgoCount * DAY_MS;
        cells.push({ col, row, dateTs, status: dayProblemStatus(observationDays, dateTs) });
      }
    }
  }
  return cells;
}

function heatmapCellColor(cell) {
  if (!cell || cell.dateTs === null) return "transparent";
  if (!cell.status.hasData) return "#eef4ef";
  return severityColorForActionLevel(cell.status.maxAction);
}

// --- 문제행동수준 × 삶의 경험 확장/만족도 (듀얼 연속체) ---
// expansion_score는 "위험도"가 아니라 별개 축이므로, 문제행동 계열(초록→주황→빨강)과는
// 눈에 띄게 다른 색 계열(파랑→보라)을 씁니다. 원본 관찰과실천 앱과 동일한 그라데이션입니다.
function expansionColor(score) {
  const s = clamp(Number(score) || 0, 0, 10);
  const from = [176, 190, 214];
  const to = [108, 74, 168];
  const t = s / 10;
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// 날짜별로 "그날의 문제행동 최댓값", "그날의 경험 확장 점수", "그날 실천 기록 여부"를 한 줄에 모읍니다.
// daily_checkin은 하루 최대 1건이라 가정하되(명세서 §4-5), 방어적으로 여러 건이면 마지막 값을 씁니다.
function buildDualAxisDays(observationDays, dailyCheckins, practiceRecords, days = 14) {
  const checkinByDate = new Map();
  dailyCheckins.forEach((entry) => { if (entry.dateTs !== null) checkinByDate.set(entry.dateTs, entry); });

  const practiceDateSet = new Set(
    practiceRecords
      .filter((record) => record.recordType === "practice_log")
      .map((record) => dateOnly(record.date))
      .filter((ts) => ts !== null),
  );

  const allDateTs = unique([
    ...observationDays.map((day) => day.dateTs),
    ...dailyCheckins.map((day) => day.dateTs),
    ...practiceDateSet,
  ]).filter((ts) => ts !== null).sort((a, b) => a - b);
  const recentDateTs = days ? allDateTs.slice(-days) : allDateTs;

  return recentDateTs.map((dateTs) => {
    const status = dayProblemStatus(observationDays, dateTs);
    const checkin = checkinByDate.get(dateTs);
    return {
      dateTs,
      hasAction: status.hasData,
      actionLevel: status.hasData ? status.maxAction : null,
      expansionScore: checkin ? checkin.expansionScore : null,
      hasPractice: practiceDateSet.has(dateTs),
    };
  });
}

const RELAPSE_WINDOW_DAYS = 3;
const RELAPSE_EMOTION_HIGH = 6;
const RELAPSE_EMOTION_RISE = 2;
const RELAPSE_COPING_LOW = 3;
const RELAPSE_COPING_DROP = 2;
const RELAPSE_EMOTION_VARIABILITY = 2.5;
const RELAPSE_THOUGHT_HIGH = 6;
const RELAPSE_URGE_HIGH = 7;
const RELAPSE_ACTION_SEVERE = 4;

function average(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function stddev(values) {
  if (values.length < 2) return null;
  const avg = average(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function entriesInWindow(days, windowEndTs, spanDays) {
  const windowStartTs = windowEndTs - (spanDays - 1) * DAY_MS;
  return days.filter((day) => day.dateTs >= windowStartTs && day.dateTs <= windowEndTs);
}

// referenceEndTs 기준 최근 3일(관찰 창)과 그 이전 3일(비교 창)을 비교해 재발신호를 계산합니다.
// 정서적/인지적 재발은 "충족된 조건 수"로, 행동적 재발은 "문제행동이 있었던 날 수"로 판정합니다(명세서 그대로).
function computeRelapseWindowSignal(days, referenceEndTs) {
  const recent = entriesInWindow(days, referenceEndTs, RELAPSE_WINDOW_DAYS);
  const compare = entriesInWindow(days, referenceEndTs - RELAPSE_WINDOW_DAYS * DAY_MS, RELAPSE_WINDOW_DAYS);

  const pick = (list, key) => list.map((entry) => entry[key]).filter((value) => value !== null);
  const recentEmotion = pick(recent, "emotionScore");
  const recentThought = pick(recent, "thoughtScore");
  const recentUrge = pick(recent, "urgeScore");
  const recentCoping = pick(recent, "copingScore");
  const compareEmotion = pick(compare, "emotionScore");
  const compareCoping = pick(compare, "copingScore");

  const emotionAvg = average(recentEmotion);
  const emotionAvgPrev = average(compareEmotion);
  const copingAvg = average(recentCoping);
  const copingAvgPrev = average(compareCoping);
  const emotionStd = recentEmotion.length >= 3 ? stddev(recentEmotion) : null;

  const emotionalConditions = [
    emotionAvg !== null && emotionAvg >= RELAPSE_EMOTION_HIGH,
    recentEmotion.filter((v) => v >= RELAPSE_EMOTION_HIGH).length >= 2,
    emotionAvg !== null && emotionAvgPrev !== null && emotionAvg - emotionAvgPrev >= RELAPSE_EMOTION_RISE,
    recentCoping.filter((v) => v <= RELAPSE_COPING_LOW).length >= 2,
    copingAvg !== null && copingAvgPrev !== null && copingAvgPrev - copingAvg >= RELAPSE_COPING_DROP,
    emotionStd !== null && emotionStd >= RELAPSE_EMOTION_VARIABILITY,
  ];
  const emotionalMetCount = emotionalConditions.filter(Boolean).length;

  const thoughtAvg = average(recentThought);
  const urgeAvg = average(recentUrge);
  const urgeHighNoActionCount = recent.filter((day) => day.urgeScore !== null && day.urgeScore >= RELAPSE_URGE_HIGH && day.actionLevel === 0).length;
  const cognitiveConditions = [
    thoughtAvg !== null && thoughtAvg >= RELAPSE_THOUGHT_HIGH,
    recentThought.filter((v) => v >= RELAPSE_THOUGHT_HIGH).length >= 2,
    urgeAvg !== null && urgeAvg >= RELAPSE_URGE_HIGH,
    urgeHighNoActionCount >= 2,
  ];
  const cognitiveMetCount = cognitiveConditions.filter(Boolean).length;

  const actionDays = new Set(recent.filter((day) => day.actionLevel !== null && day.actionLevel >= 1).map((day) => day.dateTs));
  const severeDays = new Set(recent.filter((day) => day.actionLevel !== null && day.actionLevel >= RELAPSE_ACTION_SEVERE).map((day) => day.dateTs));

  return {
    windowEndTs: referenceEndTs,
    recentCount: recent.length,
    compareCount: compare.length,
    emotional: { active: emotionalMetCount > 0, metCount: emotionalMetCount, ratio: emotionalMetCount / 6 },
    cognitive: { active: cognitiveMetCount > 0, metCount: cognitiveMetCount, ratio: cognitiveMetCount / 4 },
    behavior: { active: actionDays.size > 0, days: actionDays.size, severeDays: severeDays.size, ratio: actionDays.size / RELAPSE_WINDOW_DAYS },
  };
}

// --- 자료 누적 저장/병합 ---
// CSV 필드를 RFC4180 규칙으로 이스케이프합니다(쉼표·줄바꿈·따옴표가 있으면 큰따옴표로 감싸고 내부 따옴표는 두 번씩).
function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const CSV_COLUMNS = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];

function serializeRowsToCsv(rows) {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) => CSV_COLUMNS.map((column) => escapeCsvField(row[column])).join(","));
  return [header, ...lines].join("\n");
}

function clientAliasesForMerge(rows) {
  return unique(rows.map((row) => String(row.client_alias || "").trim()).filter(Boolean));
}

function hasBlankClientAlias(rows) {
  return rows.some((row) => !String(row.client_alias || "").trim());
}

function ensureClientAliases(rows, fileName) {
  const cloned = rows.map((row) => ({ ...row, client_alias: String(row.client_alias || "").trim() }));
  const nonBlankAliases = unique(cloned.map((row) => row.client_alias).filter(Boolean));
  const blankRows = cloned.filter((row) => !row.client_alias);
  if (!blankRows.length) return { rows: cloned, warnings: [] };

  if (nonBlankAliases.length === 1) {
    blankRows.forEach((row) => {
      row.client_alias = nonBlankAliases[0];
    });
    return {
      rows: cloned,
      warnings: [`client_alias가 비어 있는 행 ${blankRows.length}개에 같은 파일의 자료 코드 "${nonBlankAliases[0]}"를 보완했습니다.`],
    };
  }

  if (nonBlankAliases.length > 1) {
    return { rows: cloned, warnings: [] };
  }

  const alias = state.generatedClientAlias || buildTemporaryClientAlias(fileName);
  state.generatedClientAlias = alias;
  cloned.forEach((row) => {
    row.client_alias = alias;
  });
  return {
    rows: cloned,
    warnings: [`이 CSV에는 내담자 자료 코드(client_alias)가 없어 상담분석실에서 임시 코드 "${alias}"를 부여했습니다. 같은 탭에서 이어서 불러오는 빈 별칭 CSV에는 같은 임시 코드를 적용합니다. 다음부터는 최신 내담자용 앱에서 자동 별칭이 포함된 CSV를 내보내 주세요.`],
  };
}

function buildTemporaryClientAlias(fileName = "") {
  const datePart = dateStamp();
  const seedText = `${fileName || "csv"}-${Date.now()}-${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = ((hash << 5) - hash + seedText.charCodeAt(i)) | 0;
  }
  return `MG-UNKNOWN-${datePart}-${aliasCodeFromNumber(Math.abs(hash), 4)}`;
}

function aliasCodeFromNumber(number, length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = number || 1;
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += chars[value % chars.length];
    value = Math.floor(value / chars.length) + 7;
  }
  return code;
}

function getClientAlias() {
  return state.chains[0]?.client || state.records[0]?.client || state.rows[0]?.client_alias || state.generatedClientAlias || "내담자";
}

function getProjectName() {
  const manual = state.projectNameOverride || (els.projectNameInput ? els.projectNameInput.value.trim() : "");
  if (manual) return manual;
  const alias = getClientAlias();
  return alias === "내담자" ? "마음고요-내담자-미지정" : `마음고요-${alias}`;
}

function dedupeRowsById(rows) {
  const byId = new Map();
  const noIdRows = [];
  let duplicateCount = 0;
  rows.forEach((row) => {
    if (!row.id) {
      noIdRows.push(row);
      return;
    }
    const prior = byId.get(row.id);
    if (!prior) {
      byId.set(row.id, row);
      return;
    }
    duplicateCount += 1;
    const priorTs = Date.parse(prior.updated_at || "") || 0;
    const newTs = Date.parse(row.updated_at || "") || 0;
    if (newTs >= priorTs) byId.set(row.id, row);
  });
  return { rows: [...byId.values(), ...noIdRows], duplicateCount };
}

// 새로 불러온 행을 기존에 누적된 행과 합칩니다.
// 1) 내담자가 다르면(client_alias 불일치) 병합하지 않고 오류로 알립니다 — 실수로 다른 내담자 자료가
//    섞이는 걸 막기 위한 안전장치입니다.
// 2) 같은 id가 양쪽에 있으면 updated_at이 더 최신인 쪽만 남깁니다(명세서가 권장하는 병합 방식).
function mergeIncomingRows(existingRows, incomingRows) {
  if (hasBlankClientAlias(existingRows) || hasBlankClientAlias(incomingRows)) {
    return {
      merged: null,
      error: "내담자 별칭(client_alias)이 비어 있는 CSV는 여러 파일 누적 병합을 할 수 없습니다. 같은 내담자 자료인지 앱이 안전하게 확인할 수 없으므로, 먼저 '자료 제거'를 누른 뒤 한 파일만 분석하거나 내담자 별칭이 들어간 CSV를 사용하세요.",
    };
  }

  const existingClients = clientAliasesForMerge(existingRows);
  const incomingClients = clientAliasesForMerge(incomingRows);
  if (existingClients.length && incomingClients.length) {
    const mismatch = incomingClients.some((client) => !existingClients.includes(client));
    if (mismatch) {
      return {
        merged: null,
        error: `이전에 누적된 자료는 내담자 "${existingClients.join(", ")}"인데, 지금 불러온 파일은 "${incomingClients.join(", ")}"입니다. 서로 다른 내담자로 보여 병합하지 않았습니다. 이 내담자로 새로 시작하려면 "자료 제거"를 먼저 누르세요.`,
      };
    }
  }

  return { merged: dedupeRowsById([...existingRows, ...incomingRows]).rows, error: null };
}

function buildAccumulatedCsvFileName() {
  const clientAlias = getClientAlias();
  return `${sanitizeForFilename(clientAlias)}_${computeDataDateRangeLabel()}_전체자료.csv`;
}

function exportAccumulatedCsv() {
  if (!state.rows.length) {
    showImportMessages(["저장할 자료가 없습니다. CSV를 먼저 불러오세요."]);
    return;
  }
  if (!window.confirm("전체 자료 CSV에는 지금까지 누적된 모든 원본 기록(민감정보 포함)이 담깁니다. 승인된 보관 위치에 저장하시겠습니까?")) return;
  const filename = buildAccumulatedCsvFileName();
  downloadText(filename, serializeRowsToCsv(state.rows), "text/csv;charset=utf-8", els.exportAccumulatedCsvBtn);
}

function decodeCsv(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array();
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
  if (text.includes("�")) {
    try {
      const korean = new TextDecoder("euc-kr", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
      if (!korean.includes("�")) text = korean;
    } catch (error) {
      // Keep UTF-8 text when this browser cannot decode euc-kr.
    }
  }
  return text;
}

function validateRows(rows) {
  const errors = [];
  const warnings = [];
  if (!rows.length) return { errors: ["CSV에 읽을 수 있는 행이 없습니다."], warnings };

  const headers = Object.keys(rows[0]);
  REQUIRED_COLUMNS.forEach((header) => {
    if (!headers.includes(header)) errors.push(`필수 열 '${header}'이 없습니다. (${CSV_SCHEMA} 규격에는 이 열이 있어야 합니다)`);
  });
  if (errors.length) return { errors: unique(errors), warnings };

  let badJsonCount = 0;
  let unknownTypeCount = 0;
  let mismatchedVersionCount = 0;
  let invalidDateCount = 0;
  let nonCounselorModeCount = 0;
  const seenIds = new Set();
  const duplicateIds = new Set();
  const shareModesSeen = new Set();
  const seenCheckinDates = new Set();
  const duplicateCheckinDates = new Set();

  rows.forEach((row, index) => {
    if (row.schema_version !== CSV_SCHEMA) mismatchedVersionCount += 1;
    if (!row.payload_json || parsePayload(row.payload_json) === null) {
      badJsonCount += 1;
      if (badJsonCount <= 5) errors.push(`${index + 2}행의 payload_json 형식이 올바르지 않습니다.`);
    }
    if (!RECORD_TYPES.includes(row.record_type)) unknownTypeCount += 1;
    if (row.record_type !== "practice_definition" && !isValidRecordDate(row.date)) {
      invalidDateCount += 1;
      if (invalidDateCount <= 5) errors.push(`${index + 2}행의 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)`);
    }
    if (!ANALYSIS_SHARE_MODES.includes(row.share_mode)) nonCounselorModeCount += 1;
    else shareModesSeen.add(row.share_mode);
    if (row.id) {
      if (seenIds.has(row.id)) duplicateIds.add(row.id);
      seenIds.add(row.id);
    }
    if (row.record_type === "daily_checkin" && row.date) {
      if (seenCheckinDates.has(row.date)) duplicateCheckinDates.add(row.date);
      seenCheckinDates.add(row.date);
    }
  });

  if (badJsonCount > 5) errors.push(`이 밖에도 payload_json 형식이 올바르지 않은 행이 ${badJsonCount - 5}개 더 있습니다.`);
  if (mismatchedVersionCount) errors.push(`schema_version이 ${CSV_SCHEMA}가 아닌 행이 ${mismatchedVersionCount}개 있습니다.`);
  if (unknownTypeCount) errors.push(`허용되지 않는 record_type을 가진 행이 ${unknownTypeCount}개 있습니다.`);
  if (invalidDateCount > 5) errors.push(`이 밖에도 날짜 형식이 올바르지 않은 행이 ${invalidDateCount - 5}개 더 있습니다.`);
  // daily_checkin은 하루 최대 1건이 원칙입니다(명세서 §4-5). 여러 CSV를 합쳤거나 id가 달라진 경우
  // 같은 날짜에 2건 이상 보일 수 있어, 조용히 둘 다 반영하지 않고 알려줍니다.
  if (duplicateCheckinDates.size) warnings.push(`같은 날짜에 daily_checkin이 2건 이상 있는 날이 ${duplicateCheckinDates.size}일 있습니다(하루 1건 원칙 위반). 여러 CSV를 합쳤다면 최신 updated_at 기준으로 정리하는 것을 권장합니다.`);
  if (nonCounselorModeCount) warnings.push(`share_mode가 counselor_full 또는 backup_full이 아닌 행 ${nonCounselorModeCount}개는 상담 분석 대상이 아니므로 건너뜁니다.`);
  // counselor_full(선택한 기간만 공유)과 backup_full(기간 무관 전체 백업)은 서로 다른 저장 버튼으로 만들어지는
  // 별개의 파일입니다. 한 파일에 두 값이 같이 나타나면 실제 내보내기로는 생기지 않는 조합이라 알려줍니다.
  if (shareModesSeen.size > 1) warnings.push(`한 CSV 안에 share_mode가 여러 값(${[...shareModesSeen].join(", ")})으로 섞여 있습니다. counselor_full과 backup_full은 서로 다른 저장 버튼으로 만들어지는 별개의 파일이라, 두 파일이 실수로 합쳐졌을 가능성이 있습니다.`);
  if (duplicateIds.size) warnings.push(`같은 id가 여러 번 나타나는 기록이 ${duplicateIds.size}개 있습니다. 여러 주차 CSV를 합칠 때는 updated_at이 더 최신인 쪽만 반영하는 것을 권장합니다. 이번 분석에서는 먼저 나오는 행을 기준으로 처리합니다.`);
  if (rows.length > 5000) {
    warnings.push(shareModesSeen.has("backup_full") && !shareModesSeen.has("counselor_full")
      ? `행이 ${rows.length}개입니다. 전체 백업(backup_full)은 기간 제한이 없어 정상적으로도 이만큼 클 수 있습니다.`
      : `행이 ${rows.length}개로 상담자용 공유 CSV(최대 5,000행) 범위를 넘습니다. 여러 CSV를 이어붙였다면 의도한 파일이 맞는지 확인하세요.`);
  }

  const clients = unique(rows.map((row) => String(row.client_alias || "").trim()).filter(Boolean));
  const blankClientAliasCount = rows.filter((row) => !String(row.client_alias || "").trim()).length;
  if (blankClientAliasCount) warnings.push(`client_alias가 비어 있는 행이 ${blankClientAliasCount}개 있습니다. 상담분석실이 임시 자료 코드를 부여할 수 있지만, 다음부터는 자동 별칭이 포함된 내담자용 앱 CSV를 사용하세요.`);
  if (clients.length > 1) errors.push("한 번에 한 명의 내담자 CSV만 분석할 수 있습니다. 내담자별로 파일을 분리하세요.");

  const observationIds = new Set(rows.filter((row) => row.record_type === "observation").map((row) => row.id).filter(Boolean));
  const practiceDefinitionIds = new Set(rows.filter((row) => row.record_type === "practice_definition").map((row) => row.id).filter(Boolean));
  rows.forEach((row, index) => {
    const payload = parsePayload(row.payload_json);
    if (!payload) return;
    if (row.record_type === "practice_log" && !practiceDefinitionIds.has(payload.practice_id)) {
      errors.push(`${index + 2}행의 practice_log가 연결할 practice_definition을 찾지 못했습니다.`);
    }
    if (row.record_type === "prediction" && payload.related_observation_id && !observationIds.has(payload.related_observation_id)) {
      errors.push(`${index + 2}행의 prediction이 연결할 observation을 찾지 못했습니다.`);
    }
  });

  return { errors: unique(errors), warnings: unique(warnings) };
}

function isValidRecordDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] === undefined ? "" : values[index].trim();
    });
    return entry;
  });
}

// payload_json 내부 필드를 상담분석실 내부 레코드 모델(상황/생각/감정/충동/행동/실천)로 변환합니다.
function normalizeRows(rows) {
  const practiceDefs = new Map();
  const parsed = rows.map((row, index) => ({ row, index, payload: parsePayload(row.payload_json) || {} }));

  // v1에서는 practice_definition의 식별자가 payload가 아니라 행 자체의 id입니다.
  // (practice_log.payload.practice_id가 이 id를 참조합니다.)
  parsed.forEach(({ row, payload }) => {
    if (row.record_type !== "practice_definition") return;
    if (row.id) practiceDefs.set(row.id, payload);
  });

  const records = [];
  parsed.forEach(({ row, payload, index }) => {
    const base = {
      client: row.client_alias || "내담자",
      date: row.date || row.updated_at || row.exported_at || "",
      createdAt: parseDate(row.date || row.updated_at || row.exported_at),
      recordType: row.record_type || "",
      sourceId: row.id || `row-${index + 1}`,
      shareMode: row.share_mode || "",
      payload,
    };

    if (row.record_type === "observation") {
      const chainId = `observation-${row.id || index + 1}`;
      const problemLabels = joinText([textList(firstDefined(payload.problem_labels, payload.behavior_areas)), textList(payload.behavior_custom_areas)]);
      const triggerText = joinText([textList(payload.trigger_places), textList(payload.trigger_people), textList(payload.trigger_times), textList(payload.trigger_custom)]);
      const avoidanceText = joinText([textList(payload.avoidance_tags), textList(payload.avoidance_custom)]);
      const timeSlot = displayTimeSlot(payload.time_slot);

      pushRecord(
        records, base, chainId, "situation", "발생한 구체적 상황",
        joinText([timeSlot ? `기록 시점: ${timeSlot}` : "", problemLabels ? `관찰·기록한 문제: ${problemLabels}` : "", payload.problem_domain ? `문제의 중심 영역: ${payload.problem_domain}` : "", payload.situation, triggerText ? `촉발 단서: ${triggerText}` : ""]),
      );
      pushRecord(records, base, chainId, "thought", "생각", payload.thought_text, score10(payload.thought_score));
      pushRecord(
        records, base, chainId, "emotion", payload.emotion || "감정/몸반응",
        joinText([payload.emotion, payload.emotion_custom, textList(payload.body_reactions), payload.body_custom]),
        score10(payload.emotion_score),
      );

      // urge_score는 정점(peak) 값이며 위험 신호 판정의 기준입니다.
      // urge_initial_score/urge_end_score는 "충동 발생" 모드에서만 선택적으로 기록되는 충동 곡선입니다.
      const hasCurve = firstDefined(payload.urge_initial_score, payload.urge_end_score) !== undefined;
      const urgeContent = hasCurve
        ? joinText([
            payload.urge_initial_score !== undefined && payload.urge_initial_score !== "" ? `시작 ${payload.urge_initial_score}` : "",
            payload.urge_score !== undefined && payload.urge_score !== "" ? `정점 ${payload.urge_score}` : "",
            payload.urge_end_score !== undefined && payload.urge_end_score !== "" ? `종료 ${payload.urge_end_score}` : "",
          ])
        : "충동 강도 기록";
      pushRecord(
        records, base, chainId, "urge", "충동", urgeContent, score10(payload.urge_score),
        { urgeScore: score10(payload.urge_score), urgeInitialScore: score10(payload.urge_initial_score), urgeEndScore: score10(payload.urge_end_score) },
      );

      pushRecord(
        records, base, chainId, "action", "문제행동 활성화 수준",
        actionLabel(payload.action_level), null,
        { actionLevel: score5(payload.action_level) },
      );

      pushRecord(records, base, chainId, "avoidance", "회피 신호", avoidanceText);

      pushRecord(
        records, base, chainId, "practice", "대처행동·성찰",
        joinText([payload.coping ? `대처행동: ${payload.coping}` : "", payload.coping_score !== undefined && payload.coping_score !== "" ? `대처 후 도움 정도: ${payload.coping_score}/10` : "", payload.insight ? `이번 기록을 남기며 알게 된 점: ${payload.insight}` : ""]),
        score10(payload.coping_score),
        { practiceScore: score10(payload.coping_score) },
      );
    }

    if (row.record_type === "practice_log") {
      const def = practiceDefs.get(payload.practice_id) || {};
      const pleasure = score10(payload.pleasure_score);
      const mastery = score10(payload.mastery_score);
      // practice_score(평균 파생값)는 v2.0 규격에서 제거됐습니다. pleasure/mastery가 모두 있으면 평균을,
      // 하나만 있으면 그 값을 그대로 씁니다.
      const score = pleasure !== null && mastery !== null ? Math.round(((pleasure + mastery) / 2) * 10) / 10 : firstDefined(pleasure, mastery) ?? null;
      const completedCount = reportedCompletionCount(payload, score);
      // v1에는 observation_id/chain_id/episode_id 같은 연결 필드가 없어
      // practice_log는 항상 독립 연쇄(practice-{practice_id})로만 구성됩니다.
      pushRecord(
        records, base,
        `practice-${payload.practice_id || row.id || index + 1}`,
        "practice",
        def.practice_name || payload.practice_name || "실천행동 수행",
        joinText([def.practice_name, payload.practice_note]),
        score,
        {
          practiceScore: score,
          practiceId: payload.practice_id || "",
          completedCount,
          recordedScore: score !== null,
          pleasureScore: pleasure,
          masteryScore: mastery,
          expectedPleasureScore: score10(payload.expected_pleasure_score),
          expectedMasteryScore: score10(payload.expected_mastery_score),
        },
      );
    }

    // record_type === "prediction"/"daily_checkin"은 연쇄(chain) 레코드가 아니라 별도 자료이므로
    // 여기서는 만들지 않고 extractPredictions()/extractDailyCheckins()에서 각각 따로 관리합니다.
  });

  return records;
}

function pushRecord(records, base, chainId, category, title, content, intensity = null, sourceScores = {}) {
  if (content === undefined || content === null || content === "") return;
  records.push({
    id: `${base.sourceId}-${category}-${records.length}`,
    client: base.client,
    chainId,
    date: base.date,
    createdAt: base.createdAt,
    category,
    title,
    content: String(content),
    intensity,
    recordType: base.recordType,
    shareMode: base.shareMode,
    sourceScores,
    payload: base.payload,
  });
}

function detectMeta(rangeWindow, usableRows = []) {
  const modes = unique(usableRows.map((row) => row.share_mode).filter(Boolean));
  state.shareMode = modes.join(", ") || "counselor_full";
  state.shareModeLabel = modes.includes("backup_full")
    ? "전체 백업본(backup_full, 보관 기록 제외 분석)"
    : "상담자용 상세(counselor_full)";
  state.rangeDays = rangeWindow.days;
  state.rangeLabel = rangeWindow.label || (rangeWindow.rangeDaysRaw ? `${rangeWindow.rangeDaysRaw}` : "");
}

function rebuildChains() {
  readThresholds();
  const groups = new Map();

  state.records.forEach((record) => {
    const key = `${record.client}::${record.chainId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        client: record.client,
        chainId: record.chainId,
        date: record.createdAt,
        records: [],
        steps: {
          situation: [],
          thought: [],
          emotion: [],
          urge: [],
          action: [],
          avoidance: [],
          practice: [],
        },
      });
    }
    const chain = groups.get(key);
    chain.records.push(record);
    chain.steps[record.category].push(record);
    if (!chain.date || (record.createdAt && record.createdAt < chain.date)) chain.date = record.createdAt;
  });

  state.chains = [...groups.values()].map((chain) => {
    const scores = chainScores(chain);
    return {
      ...chain,
      scores,
      highUrge: scores.urge !== null && scores.urge >= state.thresholds.urge,
      actionized: scores.action !== null && scores.action >= state.thresholds.action,
      missedPractice: scores.practice !== null && scores.practice <= state.thresholds.practice,
      text: chain.records.map((record) => `${record.title} ${record.content}`).join(" "),
    };
  }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

function readThresholds() {
  state.thresholds.emotion = clamp(Number(els.emotionThreshold.value), 0, 10, 7);
  state.thresholds.cognitiveUrge = clamp(Number(els.cognitiveUrgeThreshold.value), 0, 10, 6);
  state.thresholds.urge = clamp(Number(els.urgeThreshold.value), 0, 10, 8);
  state.thresholds.action = clamp(Number(els.actionThreshold.value), 0, 5, 4);
  state.thresholds.practice = clamp(Number(els.practiceThreshold.value), 0, 10, 0);
}

function render() {
  renderMeta();
  renderMetrics();
  renderMenu();
  renderWeekFocusPlan();
  renderTherapyView();
  renderChains();
  renderReflectionDaily();
  renderSessionComparison();
  renderAtAGlanceStatus();
}


function renderWeekFocusPlan() {
  if (!els.weekFocusPlan) return;
  if (!state.records.length) {
    els.weekFocusPlan.innerHTML = `
      <div class="week-focus-card empty-focus">
        <strong>지난 한 주 평가</strong>
        <p>CSV를 불러오면 이번 주 자료를 바탕으로 회기 초점과 권장 작업 흐름을 제안합니다.</p>
      </div>
    `;
    return;
  }
  const plan = assessWeekFocus();
  els.weekFocusPlan.innerHTML = `
    <div class="week-focus-card ${escapeHtml(plan.kind)}">
      <div class="week-focus-head">
        <span class="step-use-badge">${escapeHtml(plan.badge)}</span>
        <strong>${escapeHtml(plan.title)}</strong>
      </div>
      <p>${escapeHtml(plan.summary)}</p>
      <dl>
        <dt>이번 회기 중점 주제</dt>
        <dd>${escapeHtml(plan.focus)}</dd>
        <dt>권장 작업 흐름</dt>
        <dd>${escapeHtml(plan.flow)}</dd>
        <dt>상담자 과업</dt>
        <dd>${escapeHtml(plan.task)}</dd>
      </dl>
      <p class="privacy-note">${escapeHtml(plan.note)}</p>
    </div>
  `;
}

function assessWeekFocus() {
  const total = state.chains.length || 1;
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).length;
  const actionized = chains((chain) => chain.actionized).length;
  const emotionalWarnings = chains((chain) => relapseSignals(chain).emotional.length > 0).length;
  const cognitiveWarnings = chains((chain) => relapseSignals(chain).cognitive.length > 0).length;
  const motivationDip = chains(isMotivationDip).length;
  const missed = chains((chain) => chain.missedPractice).length;
  const tolerance = chains(isDistressTolerance).length;
  const partial = chains(isPartialSuccess).length;
  const avgThought = avgScore(state.chains.map((chain) => chain.scores.thought));
  const avgUrge = avgScore(state.chains.map((chain) => chain.scores.urge));
  const avgAction = avgScore(state.chains.map((chain) => chain.scores.action));
  const avgExpansion = avgScore(state.dailyCheckins.map((entry) => entry.expansionScore));
  const predictionCount = state.predictions.length;

  const crisisScore =
    highRisk * 3 +
    actionized * 1.5 +
    (avgUrge !== null && avgUrge >= state.thresholds.urge ? 2 : 0) +
    (avgAction !== null && avgAction >= state.thresholds.action ? 2 : 0);
  const cognitiveScore =
    cognitiveWarnings * 2 +
    predictionCount * 1.5 +
    (avgThought !== null && avgThought >= 7 ? 2 : 0);
  const motivationScore =
    motivationDip * 2 +
    missed * 1.5 +
    (avgExpansion !== null && avgExpansion <= 4 ? 2 : 0) +
    (avgUrge !== null && avgUrge < state.thresholds.urge && missed > 0 ? 2 : 0);
  const toleranceScore = tolerance + partial;

  if (crisisScore >= 4 || highRisk > 0) {
    return {
      kind: "crisis",
      badge: "위기 초점",
      title: "위기의 한 주로 보입니다",
      summary: `고위험 연쇄 ${highRisk}개, 문제행동수준 기준 이상 ${actionized}개가 확인됩니다.`,
      focus: "감정 중심 자동 연쇄를 먼저 재구성하고, 위기·충동 대처 훈련을 깊게 다룹니다.",
      flow: "1 → 3 → 5 → 7 → 9",
      task: "행동화 직전의 신호, 과각성/저각성 상태, STOP/TIPP 호흡 방해요인, 조기 도움요청 계획을 확인합니다.",
      note: "위험 주간 판단은 진단이 아니라 이번 회기에서 안전과 재발예방을 먼저 다루기 위한 임상적 안내입니다.",
    };
  }
  if (cognitiveScore >= Math.max(4, motivationScore + 1)) {
    return {
      kind: "cognitive",
      badge: "인지·불안",
      title: "인지와 불안이 핵심인 한 주로 보입니다",
      summary: `인지 신호 ${cognitiveWarnings}개, 예기불안 검증 기록 ${predictionCount}개가 확인됩니다.`,
      focus: "자동사고, 허용 생각, 파국예상, 자기불신을 검토하고 생각과 거리를 둡니다.",
      flow: "1 → 3 → 8 → 7 → 9",
      task: "대표 연쇄에서 생각의 강도와 실제 결과를 비교하고, 다음 주에는 30% 행동실험으로 검증할 문장을 정합니다.",
      note: "인지·불안 초점은 생각을 반박하기보다, 생각이 감정 감내력 창을 좁히는 방식을 함께 관찰하기 위한 제안입니다.",
    };
  }
  if (motivationScore >= 4) {
    return {
      kind: "motivation",
      badge: "동기 저하",
      title: "회복 동기나 실천 유지가 약해진 한 주로 보입니다",
      summary: `실천 저수행 ${missed}개, 회복 유지 위험 ${motivationDip}개가 확인됩니다.`,
      focus: "좋아졌기 때문에 느슨해진 지점, 실천이 너무 크거나 애매했던 지점을 찾습니다.",
      flow: "1 → 2 → 6 → 7 → 9",
      task: "비난 없이 감내한 변화와 부분 성공을 먼저 피드백하고, 다음 주 실천을 30% 버전으로 줄입니다.",
      note: "동기 저하 판단은 의지가 약하다는 뜻이 아니라, 회복 행동을 생활 조건에 다시 맞춰야 한다는 신호입니다.",
    };
  }
  if (toleranceScore > 0) {
    return {
      kind: "tolerance",
      badge: "변화 강화",
      title: "감정 감내력과 부분변화를 강화하기 좋은 한 주입니다",
      summary: `감정 감내 기록 ${tolerance}개, 강도감소/부분변화 ${partial}개가 확인됩니다.`,
      focus: "불편함·지루함·흥분·충동을 즉시 회피하지 않은 장면을 회복 증거로 강화합니다.",
      flow: "1 → 2 → 3 → 6 → 7 → 9",
      task: "감내가 가능했던 조건을 찾고, 그 조건을 다음 주 30% 행동실험으로 재현합니다.",
      note: "완전한 무증상보다 감내 가능한 창이 조금 넓어진 장면을 찾는 것이 이 회기의 핵심입니다.",
    };
  }
  return {
    kind: "basic",
    badge: "기본 흐름",
    title: "기본 회기 흐름이 적합해 보입니다",
    summary: `총 연쇄 ${state.chains.length}개를 바탕으로 대표 장면을 하나 골라 깊게 다룹니다.`,
    focus: "자료 프레임을 확인한 뒤 대표 연쇄를 재구성하고, 다음 주 작은 행동실험을 설계합니다.",
    flow: "1 → 2 짧게 → 3 깊게 → 4 판단 → 필요 시 5 또는 8 → 6 짧게 → 7 → 9",
    task: "상담자는 자료를 평가표가 아니라 대화의 단서로 사용하고, 내담자가 직접 변화 지점을 발견하도록 돕습니다.",
    note: "자료가 적거나 편향되어 보이면 이 제안은 확정 판단이 아니라 회기 초반에 확인할 가설로 다룹니다.",
  };
}

function avgScore(values) {
  const nums = values.filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function renderMeta() {
  els.fileMeta.textContent = state.fileName
    ? state.fileNames.length > 1
      ? `누적 ${state.fileNames.length}개 파일(${state.fileNames.join(", ")}) · CSV ${state.rows.length}행 · 분석 기록 ${state.records.length}개${state.predictions.length ? ` · 예기불안 검증 ${state.predictions.length}개` : ""}`
      : `${state.fileName} · CSV ${state.rows.length}행 · 분석 기록 ${state.records.length}개${state.predictions.length ? ` · 예기불안 검증 ${state.predictions.length}개` : ""}`
    : "아직 불러온 파일이 없습니다.";

  const privacy = state.shareMode.includes("backup_full")
    ? "전체 백업본(backup_full)을 읽었습니다. 상담분석실은 보관 처리된 기록은 제외하고 활성 기록만 분석합니다. 자유서술 문장에는 민감정보가 포함될 수 있으므로 저장·전송·공유·접근 제한 등 보호 조치를 적용하세요."
    : "이 CSV는 항상 상담자 치료자료 전체본(counselor_full)입니다. 상황·생각 등 자유서술에 내담자가 실명이나 특정 가능한 정보를 직접 적었을 수 있으니, 저장·전송 시 암호화·접근 제한 등 민감정보 보호 조치를 적용하세요.";

  els.shareModeInfo.innerHTML = `
    <span>공유 모드</span>
    <strong>${escapeHtml(state.shareModeLabel || "CSV를 불러오면 표시됩니다.")}</strong>
    <p>${escapeHtml(privacy)}</p>
  `;
  showImportMessages(state.importMessages);

  const infoList = [
    ["스키마", state.fileName ? CSV_SCHEMA : "-"],
    ["공유 모드", state.shareModeLabel || "-"],
    ["자료 범위", state.rangeLabel || (state.rangeDays ? `최근 ${state.rangeDays}일` : "-")],
    ["내담자", unique(state.records.map((record) => record.client)).join(", ") || "-"],
    ["AI 프로젝트명", state.fileName ? getProjectName() : "-"],
    ["이전 AI 회기맥락", state.previousAiContextFileName || "-"],
  ];
  if (state.predictions.length) infoList.push(["예기불안 검증", `${state.predictions.length}개`]);
  els.schemaInfo.innerHTML = infoRows(infoList);
}

function showImportMessages(messages = []) {
  els.importStatus.hidden = !messages.length;
  els.importStatus.textContent = messages.join(" ");
}

function evidenceLevel(count) {
  if (count >= 15) {
    return {
      label: "반복 패턴 검토 가능",
      className: "ok",
      note: "여러 사건을 비교할 수 있어 반복되는 경향을 상담 주제로 삼기 좋습니다.",
    };
  }
  if (count >= 5) {
    return {
      label: "초기 패턴",
      className: "focus",
      note: "의미 있는 단서는 보이지만, 아직 단정하기보다 가설로 다루는 편이 좋습니다.",
    };
  }
  return {
    label: "해석 주의",
    className: "warn",
    note: "기록 수가 적어 한두 사건의 영향이 큽니다. 내담자 확인 질문을 먼저 사용하세요.",
  };
}

function signalEvidenceLevel(signalCount, totalCount) {
  if (!totalCount) {
    return {
      label: "자료 없음",
      className: "warn",
      note: "아직 비교할 기록이 없습니다.",
    };
  }
  if (signalCount === 0) {
    return {
      label: `신호 없음 0/${totalCount}`,
      className: "ok",
      note: "이번 자료에서는 기준을 넘는 반복 신호가 보이지 않습니다.",
    };
  }
  if (totalCount < 5) {
    return {
      label: `자료 적음 ${signalCount}/${totalCount}`,
      className: "warn",
      note: "기록 수가 적어 한 사건의 영향이 큽니다. 단정하기보다 확인 질문으로 다룹니다.",
    };
  }
  if (signalCount >= 5 || signalCount / totalCount >= 0.3) {
    return {
      label: `반복 신호 ${signalCount}/${totalCount}`,
      className: "warn",
      note: "여러 기록에서 반복되어 이번 회기의 주요 치료 초점으로 다루기 좋습니다.",
    };
  }
  if (signalCount >= 2) {
    return {
      label: `초기 반복 ${signalCount}/${totalCount}`,
      className: "focus",
      note: "두 번 이상 나타난 단서입니다. 패턴인지 우연인지 함께 확인합니다.",
    };
  }
  return {
    label: `단일 신호 1/${totalCount}`,
    className: "focus",
    note: "한 번 나타난 단서입니다. 사례를 자세히 듣되 전체 경향으로 단정하지 않습니다.",
  };
}

function metricBadge(label, className = "") {
  return `<span class="metric-badge ${escapeHtml(className)}">${escapeHtml(label)}</span>`;
}

function dominantChainProfile() {
  if (!state.chains.length) return null;
  const profiles = [
    {
      key: "행동화 위험형",
      match: (chain) => chain.highUrge && chain.actionized,
      meaning: "감정·생각이 충동을 거쳐 실제 문제행동으로 이어지는 경로가 두드러집니다.",
    },
    {
      key: "감정 감내형",
      match: (chain) => isDistressTolerance(chain),
      meaning: "충동은 있었지만 행동하지 않고 버틴 경험이 확인됩니다.",
    },
    {
      key: "감정-충동형",
      match: (chain) => chain.scores.emotion !== null && chain.scores.emotion >= state.thresholds.emotion && chain.scores.urge !== null && chain.scores.urge >= state.thresholds.urge,
      meaning: "강한 감정과 몸반응이 충동으로 이어지는 흐름이 중요해 보입니다.",
    },
    {
      key: "잠복 연쇄형",
      match: (chain) => isLatentChain(chain),
      meaning: "충동은 낮아 보여도 부정적 생각과 감정의 연쇄가 남아 있습니다.",
    },
    {
      key: "실천 회복형",
      match: (chain) => chain.scores.practice !== null && chain.scores.practice > state.thresholds.practice && !chain.actionized,
      meaning: "작은 실천이나 대처가 행동화 위험을 낮추는 보호 흐름으로 보입니다.",
    },
  ];
  const ranked = profiles
    .map((profile) => ({ ...profile, count: chains(profile.match).length }))
    .sort((a, b) => b.count - a.count);
  return ranked.find((profile) => profile.count > 0) || {
    key: "탐색 필요",
    count: state.chains.length,
    meaning: "아직 뚜렷한 한 가지 유형보다 개별 사건을 함께 확인하는 단계입니다.",
  };
}

function renderMetrics() {
  const t = state.thresholds;
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).length;
  const tolerance = chains(isDistressTolerance).length;
  const missed = chains((chain) => chain.missedPractice).length;
  const changeSignals = chains((chain) => isMotivationDip(chain) || isLatentChain(chain) || isPartialSuccess(chain)).length;
  const emotionalWarnings = chains((chain) => relapseSignals(chain).emotional.length > 0).length;
  const cognitiveWarnings = chains((chain) => relapseSignals(chain).cognitive.length > 0).length;
  const evidence = evidenceLevel(state.records.length);
  const emotionalEvidence = signalEvidenceLevel(emotionalWarnings, state.chains.length);
  const cognitiveEvidence = signalEvidenceLevel(cognitiveWarnings, state.chains.length);
  const profile = dominantChainProfile();

  const metrics = [
    ["자료량", state.records.length,
      `${metricBadge(evidence.label, evidence.className)}<b>기록의 양</b>입니다. ${escapeHtml(evidence.note)} 회기 초반에 <b>“이번 자료가 충분히 대표적인가?”</b>를 확인할 때 씁니다.`],
    ["연쇄 고리", state.chains.length,
      `${profile ? metricBadge(`${profile.key} ${profile.count}개`, "focus") : ""}<b>상황-생각-감정/몸-충동-행동/대처</b>로 묶어 보는 사건 단위입니다. ${profile ? escapeHtml(profile.meaning) : "아직 자료가 없어 주된 흐름을 판단하기 어렵습니다."} 내담자의 문제를 성격 문제가 아니라 <b>반복되는 마음-행동 경로</b>로 이해하게 돕습니다.`],
    ["위험 연쇄", highRisk,
      `<b>충동 ${t.urge}/10 이상</b>이면서 <b>문제행동 ${t.action}/5 이상</b>으로 이어진 기록입니다. 이 수치가 있으면 오늘은 원인 추궁보다 <b>재발예방·STOP/TIPP·도움요청</b>을 먼저 다룹니다.`],
    ["감정 감내력", tolerance,
      `<b>불편함·고통·지루함·흥분·충동이 있었지만 즉시 회피하거나 중독 행동으로 넘어가지 않은</b> 기록입니다. 여기서 충동은 감정 감내력 창 안에서 다루는 강한 정서/각성 신호이며, <b>감내하고 버티며 평온한 선택으로 돌아온 힘</b>을 보여줍니다.`],
    ["실천행동 조정 필요", missed,
      `<b>실천 점수 ${t.practice}/10 이하</b>로 기록된 부분입니다. 의지가 약하다는 뜻이 아니라, 실천이 현재 생활 조건에 비해 <b>너무 크거나 애매하거나 시간대가 맞지 않는다</b>는 조정 신호입니다.`],
    ["변화 포착 단서", changeSignals,
      `<b>강도감소 성공·잠복연쇄·동기저하</b>처럼 회기에서 바로 피드백할 만한 변화 자료입니다. 내담자에게는 <b>“문제가 작아진 지점, 아직 숨어 있는 위험, 다시 약해지는 동기”</b>를 구체적으로 보여주는 데 씁니다.`],
    ["정서 주의", emotionalWarnings,
      `${metricBadge(emotionalEvidence.label, emotionalEvidence.className)}<b>감정 강도 ${t.emotion}/10 이상</b>, 부정정서 표현, 실천 저수행이 잡힌 기록입니다. ${escapeHtml(emotionalEvidence.note)} 문제행동수준이 없더라도 마음 안에서는 이미 부담이 커졌을 수 있어 <b>정서 조절과 몸반응 안정화</b>를 확인합니다.`],
    ["인지 주의", cognitiveWarnings,
      `${metricBadge(cognitiveEvidence.label, cognitiveEvidence.className)}<b>충동 ${t.cognitiveUrge}/10 이상</b>이거나 문제행동을 정당화·접근하는 생각이 잡힌 기록입니다. ${escapeHtml(cognitiveEvidence.note)} “하고 싶다”보다 앞선 <b>허용 생각, 합리화, 자동사고</b>를 CBT/ACT 질문으로 검토합니다.`],
    ["예기불안 검증", state.predictions.length,
      `<b>예상한 나쁜 결과와 실제 결과</b>를 비교할 수 있는 기록입니다. 중독 행동이나 불안이 “분명히 일어날 것”이라는 믿음을 실제 자료와 대조해 <b>파국예상·재발예상·자기불신 예측</b>을 검증합니다.`],
  ];

  els.metrics.innerHTML = metrics
    .map(([label, value, desc]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong><p class="metric-desc">${desc}</p></div>`)
    .join("");
}
function renderTherapyView() {
  const view = VIEWS.find(([id]) => id === state.activeView) || VIEWS[0];
  els.activeStepLabel.textContent = view[1];

  const intro = renderIntro(state.activeView);
  const content = state.records.length ? renderWorkbench(state.activeView) : renderEmpty();
  els.therapyView.innerHTML = intro + content;
}

function renderIntro(viewId) {
  const intro = {
    data: {
      purpose: "자료를 해석하기 전에 기록량, 기간, CSV 구조와 함께 이 회기의 치료 프레임을 확인합니다. 핵심은 문제행동 판정이 아니라 감정 감내력 창을 넓히는 것입니다.",
      metrics: ["자료량"],
      guide: ["자료 대표성 확인", "record_type 구성 확인", "감정 감내력 창 설명", "오늘 다룰 기간 합의"],
      questions: ["이 자료가 이번 주 생활을 어느 정도 대표하나요?", "기록이 적은 날은 기록이 없었던 것인가요, 공유되지 않은 것인가요?", "이번 주에는 어떤 불편함이나 지루함을 즉시 피하지 않고 다루어보고 싶나요?"],
      feedback: "자료량이 적으면 결론보다 가설로 제시하고, 자료량이 충분하면 반복 패턴과 감내 가능한 창의 변화를 함께 찾습니다.",
    },
    feedback: {
      purpose: "측정치를 평가표가 아니라 거울처럼 사용해, 이번 주 마음에 걸린 경험과 과각성/저각성/감정 감내력 창의 움직임을 함께 봅니다.",
      metrics: ["자료량", "위험 연쇄", "감정 감내력", "변화 포착 단서"],
      guide: ["그래프 먼저 보기", "마음에 걸린 경험 찾기", "감내한 순간 확인", "다음 주 측정 초점 합의"],
      questions: ["그래프에서 가장 먼저 보이는 마음의 흐름은 무엇인가요?", "불편함·고통·지루함·충동을 즉시 없애지 않고 머문 지점이 있나요?", "주의해야 할 과각성 또는 저각성 신호는 어느 시점부터 보이나요?"],
      feedback: "위험 수치만 강조하지 않고, 내담자가 이미 해낸 작은 변화와 감정 감내 경험을 함께 피드백합니다.",
    },
    chain: {
      purpose: "중독 행동을 의지 부족으로 보지 않고, 오늘 마음에 걸린 경험에서 시작된 감정-생각-몸반응-충동-문제행동수준-대처의 자동 연쇄로 이해합니다.",
      metrics: ["연쇄 고리", "정서 주의", "인지 주의", "위험 연쇄"],
      guide: ["경험한 문제 확인", "감정-생각-몸반응 연결", "충동과 문제행동수준 지점 찾기", "끼어들 수 있는 틈 선택"],
      questions: ["이 연쇄에서 가장 먼저 알아차릴 수 있는 작은 신호는 무엇인가요?", "충동이 올라가기 전 마음속 문장이나 몸의 감각은 무엇이었나요?", "불편함을 없애려 하지 않고 30초라도 머무를 수 있는 지점은 어디였나요?"],
      feedback: "연쇄를 보이면 내담자는 문제를 자기비난이 아니라 수정 가능한 자동반응 패턴으로 이해할 수 있습니다.",
    },
    readiness: {
      purpose: "측정치가 어떤 개입으로 이어져야 하는지 판단합니다. 감정·생각·몸반응·충동·회피·실천 자료를 CBT, DBT, ACT, 행동활성화 중 적절한 작업으로 연결합니다.",
      metrics: ["변화 포착 단서", "실천행동 조정 필요", "정서 주의", "인지 주의"],
      guide: ["높은 감정+생각은 CBT", "강한 몸반응·충동은 DBT/TIPP", "생각에 붙잡힘은 ACT", "회피·저활동은 행동활성화"],
      questions: ["오늘 가장 먼저 다룰 지점은 생각, 몸반응, 충동, 회피, 실천 중 어디인가요?", "이 개입은 내담자의 감정 감내력 창을 넓히는 방향인가요?", "제가 자료를 보고 느낀 개입 후보를 함께 확인해도 괜찮을까요?"],
      feedback: "반박이나 설득보다 자율성, 선택권, 이미 나타난 변화의 의미를 먼저 반영합니다.",
    },
    safety: {
      purpose: "위기대처는 충동 억제가 아니라 과각성 또는 저각성 상태에서 감정 감내력 창으로 돌아오는 훈련입니다. 중독의 충동도 이 창 안에서 다루는 감정/각성 신호로 봅니다.",
      metrics: ["위험 연쇄", "정서 주의", "인지 주의"],
      guide: ["과각성·저각성 신호 확인", "행동화 임박 지점 찾기", "STOP/TIPP 호흡 후보 선택", "조기 도움요청 계획"],
      questions: ["위기 직전 과각성(불안·흥분·쾌감)과 저각성(지루함·무기력·공허감) 중 무엇이 더 가까웠나요?", "그때 30초 호흡에 집중하지 못하게 한 방해요인은 무엇이었나요?", "다음에는 누구에게, 어느 시점에 도움을 요청할까요?"],
      feedback: "위기대처는 실패를 추궁하는 시간이 아니라, 다음 위기에서 더 일찍 감정 감내력 창으로 돌아오는 지점을 찾는 훈련입니다.",
    },
    success: {
      purpose: "완전한 무증상만 성공으로 보지 않고, 불편함·고통·지루함·외로움·흥분·충동 속에서 더 강한 자극으로 회피하지 않은 경험과 행동 강도가 낮아진 변화를 회복 증거로 강화합니다.",
      metrics: ["감정 감내력", "변화 포착 단서", "위험 연쇄"],
      guide: ["감내한 경험 찾기", "행동 강도 감소 확인", "도움된 조건 추출", "다음 주 재현 계획"],
      questions: ["불편함이나 충동이 있었는데도 즉시 회피하지 않은 순간에 무엇이 달랐나요?", "문제가 10에서 7로 줄었다면 그 3만큼의 변화는 무엇이 만들었나요?", "다음 주에도 감정 감내력 창 안에 머무는 조건을 만들려면 무엇이 필요할까요?"],
      feedback: "내담자가 자기효능감을 느끼도록, 결과보다 감내한 과정과 평온한 선택을 구체적으로 반영합니다.",
    },
    practice: {
      purpose: "실천행동은 좋은 행동을 추가하는 과제가 아니라 감정-충동-행동화 사이에 새 반응을 끼워 넣어 감정 감내력 창을 넓히는 훈련입니다.",
      metrics: ["실천행동 조정 필요", "변화 포착 단서", "감정 감내력"],
      guide: ["저수행 이유를 비난 없이 확인", "30% 버전으로 줄이기", "가치와 평온함에 연결", "새 경험이 생각을 바꾸는 방식 확인"],
      questions: ["이 실천이 너무 컸다면 2분짜리 행동으로 줄이면 무엇이 될까요?", "이 행동은 더 큰 즐거움 찾기가 아니라 어떤 평온함과 가치 쪽으로 1% 움직이나요?", "작게라도 해본 뒤 나에 대한 생각이 조금 달라진 지점은 무엇인가요?"],
      feedback: "작은 실천은 자극 대체가 아니라 불편함을 감내하며 안정적인 삶의 방향을 반복 경험하는 회복 훈련입니다.",
    },
    prediction: {
      purpose: "파국예상과 실제 결과를 비교해 불안, 재발예상, 자기불신이 얼마나 정확했는지 자료로 검토하고, 생각과 거리를 두는 ACT 질문으로 연결합니다.",
      metrics: ["예기불안 검증", "인지 주의"],
      guide: ["예상 확인", "실제 결과 비교", "자동사고 거리두기", "다음 예측에 적용"],
      questions: ["예상은 실제보다 얼마나 컸나요?", "이 생각은 사실인가요, 아니면 익숙한 자동반응인가요?", "‘나는 지금 ~라는 생각을 하고 있다’라고 말하면 어떤 거리가 생기나요?"],
      feedback: "예상과 실제의 차이를 내담자의 착각으로 몰지 않고, 불안과 충동이 만들어낸 예측을 함께 검증하는 실험으로 다룹니다.",
    },
    summary: {
      purpose: "회기 말에는 마음에 걸린 경험, 자동 연쇄, 감정 감내력 창, 다음 주 30% 실천과 기록 초점을 한 장으로 정리합니다.",
      metrics: ["자료량", "위험 연쇄", "감정 감내력", "실천행동 조정 필요", "변화 포착 단서"],
      guide: ["오늘의 연쇄 1개", "감내한 변화 1개", "다음 주 30% 실천 1개", "다음 회기 확인 지표"],
      questions: ["오늘 자료를 보고 자신에 대해 새롭게 알게 된 점은 무엇인가요?", "다음 주에는 어떤 불편함을 즉시 피하지 않고 조금 더 머물러보고 싶나요?", "다음 회기에서 감정 감내력 창이 넓어진 증거로 어떤 수치를 보고 싶나요?"],
      feedback: "요약은 평가표가 아니라 내담자가 다음 주에 붙잡을 회복 언어와 작은 행동실험을 만드는 과정입니다.",
    },
  }[viewId];
  const title = VIEWS.find(([id]) => id === viewId)?.[1] || "치료작업";
  const metricBadges = intro.metrics.map((metric) => metricBadge(metric, "focus")).join("");
  const usage = VIEW_USAGE[viewId] || { type: "support", label: "보조" };
  const sessionTasks = SESSION_TASKS[viewId] || [];
  return `
    <div class="view-intro step-${usage.type}">
      <div class="view-intro-main">
        <div class="step-title-row">
          <h2>${escapeHtml(title)}</h2>
          <span class="step-use-badge">${escapeHtml(usage.label)}</span>
        </div>
        <p>${escapeHtml(intro.purpose)}</p>
        <div class="metric-link-row">${metricBadges}</div>
        <p class="therapeutic-stance"><strong>기본 방향:</strong> ${escapeHtml(intro.feedback)}</p>
        <p class="therapeutic-stance soft"><strong>측정치의 한계:</strong> 수치는 내담자의 삶 전체가 아니라 기록된 일부 경험입니다. 상담자는 수치를 단정의 근거가 아니라 대화를 여는 단서로 사용하고, 관계·가족·환경·수치심·회복 의미를 함께 확인합니다.</p>
      </div>
      <div class="intro-guidance">
        <h3>50분 회기 핵심 과업</h3>
        <ol class="session-tasks">${sessionTasks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        <h3>작업 순서</h3>
        <ol>${intro.guide.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        <h3>상담 질문</h3>
        <ul class="insight-questions">${intro.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function renderWorkbench(viewId) {
  const renderers = {
    data: renderDataView,
    feedback: renderMeasurementFeedbackView,
    readiness: renderFeedbackReadinessView,
    safety: renderRelapseEarlyWarningView,
    chain: renderChainUnderstandingView,
    success: renderSuccessView,
    practice: renderValuePracticeView,
    prediction: renderPredictionView,
    summary: renderSessionFeedbackSummaryView,
  };
  return (renderers[viewId] || renderers.data)();
}

function workbench(columns) {
  return `<div class="workbench-grid">${columns.map(([title, cards]) => `
    <section class="work-column">
      <h3 class="column-title">${escapeHtml(title)}</h3>
      ${cards.length ? cards.join("") : `<div class="empty">표시할 후보가 없습니다.</div>`}
    </section>
  `).join("")}</div>`;
}

function metricRoutingCard() {
  const routes = [
    ["자료량", "1. 자료 확인", "해석 안정성과 대표성을 먼저 확인합니다."],
    ["연쇄 고리", "3. 감정 중심 자동 연쇄 재구성", "오늘 마음에 걸린 경험에서 시작된 자동 연쇄를 상담 주제로 바꿉니다."],
    ["위험 연쇄", "5. 위기·충동 대처 훈련 · 3. 감정 중심 자동 연쇄 재구성", "재발예방, STOP/TIPP, 도움요청 계획으로 연결합니다."],
    ["감정 감내력", "6. 감정 감내력·부분변화", "불편함·고통·지루함·흥분·충동을 즉시 회피하지 않고 머문 힘을 회복 증거로 강화합니다."],
    ["실천행동 조정 필요", "7. 가치기반 작은 실천 설계", "실패가 아니라 더 작은 가치 행동으로 재설계합니다."],
    ["변화 포착 단서", "2. 측정 피드백 · 6. 성공 · 7. 실천", "좋아진 점, 숨어 있는 위험, 동기저하를 피드백합니다."],
    ["정서 주의", "5. 위기·충동 대처 훈련 · 3. 감정 중심 자동 연쇄 재구성", "감정과 몸반응이 충동으로 커지는 지점을 다룹니다."],
    ["인지 주의", "4. 개입 분기 판단 · 8. 생각 검토·예기불안 검증", "허용 생각, 합리화, 파국예상을 CBT/ACT 질문으로 검토합니다."],
    ["예기불안 검증", "8. 생각 검토·예기불안 검증", "예상과 실제 결과를 비교해 불안 예측을 재평가합니다."],
  ];
  const rows = routes.map(([metric, target, use]) => `
    <tr>
      <th>${escapeHtml(metric)}</th>
      <td>${escapeHtml(target)}</td>
      <td>${escapeHtml(use)}</td>
    </tr>
  `).join("");
  return card(
    "상단 9개 지표와 치료작업 연결",
    `<p>상단 수치는 요약으로 끝나지 않고, 아래 치료작업에서 구체적인 질문과 피드백으로 이어집니다.</p>
     <div class="route-table-wrap"><table class="route-table"><tbody>${rows}</tbody></table></div>`,
    "focus",
  );
}

function feedbackSafetyCard() {
  return card(
    "피드백 안전 확인",
    `<p><strong>측정 피드백은 평가가 아니라 공동 탐색입니다.</strong></p><p>수치를 보여주기 전에 내담자가 방어, 수치심, 무력감을 느끼지 않도록 동의와 안전감을 확인합니다.</p>`,
    "focus",
    [
      "이 자료를 함께 보는 것이 부담스럽지는 않나요?",
      "오늘은 어떤 수치를 조심스럽게 다루면 좋을까요?",
      "수치를 평가표가 아니라 회복을 돕는 지도처럼 사용해도 괜찮을까요?",
    ],
  );
}

function beyondNumbersCard() {
  return card(
    "측정치 너머 확인",
    `<p>기록된 점수는 중요한 단서이지만, 내담자의 실제 삶과 관계 전체를 대신하지는 않습니다. 점수가 좋아져도 고립, 비밀, 수치심, 무기력이 남아 있을 수 있고, 점수가 나빠도 이미 버틴 부분과 손상을 줄인 부분이 있을 수 있습니다.</p>`,
    "focus",
    [
      "이 수치가 말해주지 못하는 이번 주의 중요한 사건은 무엇인가요?",
      "기록하지 못했지만 마음속에서 크게 영향을 준 관계나 환경은 무엇인가요?",
      "수치와 다르게 실제 삶에서는 좋아졌거나 어려워진 부분이 있나요?",
    ],
  );
}

function lifeRecoveryCard() {
  return card(
    "삶의 회복 연결",
    `<p><strong>문제행동 감소의 의미는 삶이 다시 넓어지는 데 있습니다.</strong></p><p>충동이나 행동화 수치가 줄어든 날에 실제로 되찾은 시간, 관계, 돈, 자기존중감, 생활 리듬을 확인합니다.</p>`,
    "ok",
    [
      "문제행동이 줄어든 덕분에 이번 주 삶에서 무엇이 가능해졌나요?",
      "회복 때문에 되찾은 시간, 관계, 돈, 자존감은 무엇인가요?",
      "작은 실천 후 나에 대한 생각이 어떻게 달라졌나요?",
    ],
  );
}

function postActionRecoveryCard() {
  return card(
    "행동화 이후 회복 복귀",
    `<p>문제행동수준이 있었다면 회기는 처벌이나 추궁이 아니라 <strong>다시 회복 경로로 돌아오는 능력</strong>을 키우는 시간이 되어야 합니다.</p><p>행동화 여부만 보지 않고, 버틴 시간, 손상을 줄인 행동, 도움요청 가능성, 다음 복귀 지점을 함께 찾습니다.</p>`,
    "warn",
    [
      "문제행동 전 어느 지점까지는 버틸 수 있었나요?",
      "행동화 후 회복으로 돌아오는 데 무엇이 도움이 되었나요?",
      "다음에는 행동화 후 회복 시간을 10% 줄이려면 무엇이 필요할까요?",
    ],
  );
}

function recoveryIdentityCard() {
  return card(
    "회복 정체성 질문",
    `<p>장기 회복은 문제행동을 줄이는 것을 넘어 <strong>나는 어떤 사람으로 살아가고 있는가</strong>가 바뀌는 과정입니다. 작은 실천과 감정 감내 경험(중독의 충동을 포함)을 새로운 자기이해로 연결합니다.</p>`,
    "ok",
    [
      "이번 주 기록을 보면 나는 어떤 사람으로 변해가고 있나요?",
      "문제행동을 하지 않은 시간이 말해주는 나의 가능성은 무엇인가요?",
      "작은 실천을 반복하는 나는 예전의 나와 무엇이 달라지고 있나요?",
    ],
  );
}

function recoverySentenceCard() {
  return card(
    "이번 주 회복 문장 만들기",
    `<p>회기 말에는 수치를 한 문장으로 번역합니다. 이 문장은 다음 주 내담자가 붙잡을 회복 언어가 됩니다.</p><p><strong>예:</strong> “이번 주 나는 충동이 없어져서가 아니라, 충동이 있어도 2분 산책으로 방향을 바꿀 수 있음을 확인했다.”</p>`,
    "ok",
    [
      "이번 주 내가 새롭게 알게 된 나의 회복 능력은 무엇인가요?",
      "다음 주에 붙잡을 한 문장을 만든다면 어떻게 말할 수 있을까요?",
      "그 문장을 증명할 가장 작은 행동은 무엇인가요?",
    ],
  );
}

function addictionTypeFocusCard() {
  return card(
    "중독 유형별 초점 상기",
    `<p>앱은 공통 연쇄를 중심으로 분석하지만, 상담자는 중독 유형별로 놓치기 쉬운 초점을 함께 확인합니다.</p>
     <div class="route-table-wrap"><table class="route-table"><tbody>
       <tr><th>도박</th><td>돈 접근성, 손실추격, 비밀, 가족 공개 후 긴장 완화와 회복행동 저하를 확인합니다.</td></tr>
       <tr><th>성</th><td>반복적 성적 사고, 접근 행동, 행동 강도 감소, 수치심과 고립, 디지털 환경을 확인합니다.</td></tr>
       <tr><th>알코올·약물</th><td>신체 갈망, 사회적 압력, 금단/습관 루틴, 대체 대처와 의료적 위험을 확인합니다.</td></tr>
       <tr><th>게임·인터넷</th><td>시간 구조, 수면, 회피, 보상체계, 현실 활동 축소와 대체 활동을 확인합니다.</td></tr>
       <tr><th>공통</th><td>문제행동을 줄인 뒤 삶이 실제로 넓어졌는지, 관계와 환경이 회복을 돕는지 확인합니다.</td></tr>
     </tbody></table></div>`,
    "focus",
  );
}


function latestHappinessSnapshot() {
  const fields = ["personalLifeHappiness", "intimateRelationshipHappiness", "socialLifeHappiness", "overallHappiness"];
  return state.dailyCheckins
    .filter((entry) => fields.some((field) => entry[field] !== null && entry[field] !== undefined))
    .slice()
    .sort((a, b) => (b.dateTs || 0) - (a.dateTs || 0))[0] || null;
}

function happinessOverviewCard() {
  const labels = [
    ["personalLifeHappiness", "\uAC1C\uC778\uC0DD\uD65C"],
    ["intimateRelationshipHappiness", "\uCE5C\uBC00\uAD00\uACC4"],
    ["socialLifeHappiness", "\uC0AC\uD68C\uC0DD\uD65C"],
    ["overallHappiness", "\uC804\uBC18\uC801 \uD589\uBCF5\uB3C4"],
  ];
  const snapshot = latestHappinessSnapshot();
  if (!snapshot) {
    return card(
      "\uD589\uBCF5\uB3C4 4\uC601\uC5ED",
      `<p>\uC774\uBC88 CSV\uC5D0\uB294 v89 \uC774\uD6C4 \uC120\uD0DD \uD544\uB4DC\uC778 <strong>\uAC1C\uC778\uC0DD\uD65C\u00B7\uCE5C\uBC00\uAD00\uACC4\u00B7\uC0AC\uD68C\uC0DD\uD65C\u00B7\uC804\uBC18\uC801 \uD589\uBCF5\uB3C4</strong> \uAC12\uC774 \uC5C6\uAC70\uB098 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.</p><p>\uAC12\uC774 \uC5C6\uC5B4\uB3C4 \uC815\uC0C1 \uC790\uB8CC\uC774\uBA70, \uC788\uC73C\uBA74 \uC0B6\uC758 \uC601\uC5ED\uBCC4 \uD68C\uBCF5 \uBCC0\uD654\uB97C \uBCC4\uB3C4\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.</p>`,
      "focus",
      ["\uBB38\uC81C\uD589\uB3D9\uC218\uC900\uC774 \uB0AE\uC544\uC9C4 \uAC83\uACFC \uBCC4\uAC1C\uB85C, \uC2E4\uC81C \uC0B6\uC758 \uD589\uBCF5\uAC10\uC740 \uC5B4\uB290 \uC601\uC5ED\uC5D0\uC11C \uBA3C\uC800 \uC6C0\uC9C1\uC774\uACE0 \uC788\uB098\uC694?"],
    );
  }
  const rows = labels.map(([key, label]) => {
    const value = snapshot[key];
    return `<tr><th>${label}</th><td>${value === null || value === undefined ? "\uAE30\uB85D \uC5C6\uC74C" : `${value}/100`}</td></tr>`;
  }).join("");
  return card(
    "\uD589\uBCF5\uB3C4 4\uC601\uC5ED",
    `<p>\uAC00\uC7A5 \uCD5C\uADFC \uC624\uB298 \uD558\uB8E8 \uB3CC\uC544\uBCF4\uAE30(${escapeHtml(snapshot.date || "\uB0A0\uC9DC \uC5C6\uC74C")})\uC5D0 \uD3EC\uD568\uB41C \uC120\uD0DD \uD544\uB4DC\uC785\uB2C8\uB2E4.</p><div class="table-wrap"><table><tbody>${rows}</tbody></table></div><p><strong>\uBB38\uC81C \uAC10\uC18C</strong>\uC640 <strong>\uC0B6\uC758 \uD68C\uBCF5</strong>\uC774 \uAC19\uC740 \uC18D\uB3C4\uB85C \uC6C0\uC9C1\uC774\uB294\uC9C0 \uD655\uC778\uD569\uB2C8\uB2E4.</p>`,
    "ok",
    ["\uC5B4\uB290 \uC601\uC5ED\uC758 \uD589\uBCF5\uB3C4\uAC00 \uBA3C\uC800 \uD68C\uBCF5\uB418\uACE0 \uC788\uB098\uC694?", "\uB0AE\uC740 \uC601\uC5ED\uC740 \uB2E4\uC74C \uC8FC \uAC00\uCE58\uAE30\uBC18 \uC2E4\uCC9C\uD589\uB3D9\uC73C\uB85C \uC5B4\uB5BB\uAC8C \uC5F0\uACB0\uD560 \uC218 \uC788\uB098\uC694?"],
  );
}

function roleSeparationCard() {
  return card(
    "\uB0B4\uB2F4\uC790 \uC571\u00B7\uC0C1\uB2F4\uBD84\uC11D\uC2E4 \uC5ED\uD560",
    `<p><strong>\uB0B4\uB2F4\uC790 \uC571</strong>\uC740 \uAE30\uB85D\uC744 \uC9C0\uC18D\uD558\uAC8C \uD558\uB294 \uC0DD\uD65C \uB3C4\uAD6C\uC774\uACE0, <strong>\uC0C1\uB2F4\uBD84\uC11D\uC2E4</strong>\uC740 \uAC19\uC740 CSV \uC6D0\uC790\uB8CC\uB97C \uC0C1\uB2F4 \uC7A5\uBA74\uC5D0\uC11C \uAE4A\uC774 \uBD84\uC11D\uD574 \uAC1C\uC785\uC73C\uB85C \uC5F0\uACB0\uD558\uB294 \uCE58\uB8CC \uB3C4\uAD6C\uC785\uB2C8\uB2E4.</p><p>\uB0B4\uB2F4\uC790 \uC571\uC5D0\uC11C \uB2E8\uC21C\uD654\uB41C \uADF8\uB798\uD504\uC640 \uD328\uD134 \uD574\uC11D\uC740 \uC774 \uD654\uBA74\uC5D0\uC11C \uC0C1\uB2F4\uC790\uC640 \uD568\uAED8 \uB2E4\uB8F9\uB2C8\uB2E4.</p>`,
    "focus",
    ["\uC774 \uC790\uB8CC\uB97C \uB0B4\uB2F4\uC790\uC5D0\uAC8C \uD3C9\uAC00\uCC98\uB7FC \uBCF4\uC5EC\uC8FC\uC9C0 \uC54A\uACE0, \uC5B4\uB5A4 \uACF5\uB3D9 \uD0D0\uC0C9 \uC9C8\uBB38\uC73C\uB85C \uC5F4\uC5B4\uAC08\uAE4C\uC694?"],
  );
}


function affectToleranceFrameCard() {
  return card(
    "감정 감내력 창",
    `<p><strong>감정 감내력</strong>은 불편함·고통·지루함·외로움·불안·흥분·충동을 즉시 없애거나 더 강한 자극으로 회피하지 않고, 알아차리고 머물며 평온한 선택으로 돌아오는 힘입니다.</p><p>여기서 <strong>감정</strong>은 중독의 <strong>충동과 갈망</strong>을 포함합니다. 충동은 따로 떼어 참는 대상이 아니라, 감정 감내력 창 안에서 다루는 강한 정서/각성 신호입니다.</p><p>회복은 새로운 즐거움을 더 크게 찾는 과정이 아니라, 과각성(불안·흥분·쾌감)과 저각성(지루함·무기력·공허감)에 휩쓸리지 않고 감내 가능한 창을 넓히는 과정입니다.</p>`,
    "focus",
    [
      "이번 주 내담자는 어떤 불편함을 즉시 피하지 않고 머물렀나요?",
      "충동 뒤에 있던 감정이나 각성 상태는 과각성, 저각성, 감내 가능한 창 중 어디에 가까웠나요?",
      "평온한 선택으로 돌아오도록 도운 작은 조건은 무엇이었나요?",
    ],
  );
}

function arousalWindowCard() {
  const highArousal = state.observationDays.filter((day) => (day.emotionScore ?? 0) >= state.thresholds.emotion || (day.urgeScore ?? 0) >= state.thresholds.urge).length;
  const avoidance = state.observationDays.filter((day) => (day.avoidanceTags || []).length).length;
  const tolerated = chains(isDistressTolerance).length;
  return visualFeedback(
    "과각성·저각성·감정 감내력 창",
    "충동은 감정 감내력 창 안에서 다루는 강한 정서/각성 신호입니다. 수치는 과각성과 저각성에 휩쓸린 지점뿐 아니라, 그 안에서 머문 순간을 찾기 위한 단서입니다.",
    renderBarSummary([
      ["과각성 신호", highArousal * 16, "warn"],
      ["저각성/회피 신호", avoidance * 16, "focus"],
      ["감내한 기록", tolerated * 20, "ok"],
    ]),
    [
      "불안·흥분·쾌감이 올라와 더 강한 자극으로 가고 싶었던 순간은 어디였나요?",
      "지루함·무기력·공허감을 피하려고 자동행동으로 가던 순간은 어디였나요?",
      "그중 조금이라도 머물거나 늦추거나 다른 선택을 한 장면은 무엇인가요?",
    ],
  );
}

function renderDataView() {
  const typeCounts = state.rows.reduce((acc, row) => {
    acc[row.record_type] = (acc[row.record_type] || 0) + 1;
    return acc;
  }, {});
  const structural = [
    card("CSV 구조", `<p>스키마: <strong>${escapeHtml(CSV_SCHEMA)}</strong></p><p>record_type과 payload_json 기반 자료를 읽었습니다.</p>`, "focus"),
    card("공유 모드", `<p><strong>${escapeHtml(state.shareModeLabel)}</strong></p><p>이 CSV는 항상 상담자 치료자료 전체본이며, 요약·가족 공유용으로 만들어지지 않습니다.</p>`, "ok"),
    card("자료 보호", `<p>원본 CSV 파일 자체는 저장하지 않습니다.</p><p>단, "상담기록·비교 요약" 파일에는 내담자가 기록한 실제 문장이 연쇄별 요약으로 포함되므로 민감정보 문서로 보관해야 합니다.</p>`, "focus"),
    affectToleranceFrameCard(),
  ];
  const composition = [
    card(
      "레코드 구성",
      `<p>관찰 기록 ${typeCounts.observation || 0}건 · 실천행동 설정 ${typeCounts.practice_definition || 0}건 · 실천 수행 기록 ${typeCounts.practice_log || 0}건 · 오늘 하루 돌아보기 ${typeCounts.daily_checkin || 0}건 · 걱정 예측 기록 ${typeCounts.prediction || 0}건</p>`,
      "focus",
    ),
  ];
  const visual = visualFeedback(
    "자료 상태 시각 요약",
    "오늘 불러온 기록이 어떤 범위와 구성인지 먼저 확인합니다.",
    renderBarSummary([
      ["전체 기록", state.records.length * 5, "focus"],
      ["연쇄", state.chains.length * 10, "focus"],
      ["예기불안", state.predictions.length * 12, "focus"],
      ["실천 기록", state.records.filter((record) => record.category === "practice").length * 10, "ok"],
    ]),
    [
      "이 자료는 오늘 회기에서 함께 살펴보기에 충분한가요?",
      "실천 계획(practice_definition)은 있는데 실천 기록(practice_log)이 없는 항목은 없나요?",
      "오늘은 어느 기간의 변화를 중심으로 볼까요?",
    ],
  );
  return `<div class="counselor-only">${visual + workbench([
    ["자료 상태", structural],
    ["레코드 구성", composition],
    ["v91 \uBA85\uCE6D\u00B7\uC5ED\uD560", [roleSeparationCard(), happinessOverviewCard()]],
    ["지표 연결", [metricRoutingCard()]],
    ["측정치 한계", [beyondNumbersCard(), addictionTypeFocusCard()]],
    ["상담 전 확인", [
      card("확인 질문", "", "focus", ["이 파일의 자료 범위가 오늘 회기에서 다루려는 기간과 맞는가?", "practice_definition이 있는데 practice_log가 없는 항목은 없는가?", "새 CSV를 불러오기 전 이전 자료가 제거되는가?"]),
    ]],
  ])}</div><div class="patient-mode-only"><div class="empty">이 화면은 상담자 전용입니다. 다른 메뉴를 이용해주세요.</div></div>`;
}

function renderMeasurementFeedbackView() {
  const windowCard = arousalWindowCard();
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "주의할 위험 피드백", "warn"));
  const success = chains(isDistressTolerance).slice(0, 3).map((chain) => chainCard(chain, "감정 감내력 피드백", "ok"));
  const partial = chains(isPartialSuccess).slice(0, 3).map((chain) => chainCard(chain, "강도감소 피드백", "ok"));
  const maintenance = chains(isMotivationDip).slice(0, 3).map((chain) => chainCard(chain, "회복 유지 위험", "focus"));
  const weeklyVisual = visualFeedback(
    "주별 변화 피드백",
    "여러 주차 CSV를 누적했을 때, 주별 평균 충동·문제행동·실천 기록·성취감·삶의 경험 확장/만족도을 비교합니다.",
    renderWeeklyStatsGraph(),
    [
      "이번 주에 가장 좋아진 수치는 무엇이며, 그 변화가 생활 속 어떤 행동과 연결되어 있나요?",
      "충동은 낮아졌지만 실천 기록도 줄어든 주가 있다면, 회복 긴장감이 낮아진 신호일까요?",
      "문제행동이 완전히 사라지지 않았더라도 강도나 빈도가 낮아진 주는 어디인가요?",
      "다음 주에는 어떤 실천행동을 유지하고, 어떤 실천은 더 작게 조정해야 할까요?",
    ],
    renderWeeklyStatsTable(),
    ["urge", "action", "practice"],
  );
  const visual = visualFeedback(
    "오늘 마음에 걸린 경험 흐름",
    "감정, 충동, 문제행동수준, 실천행동을 같은 시간축에 놓고 내담자가 먼저 해석하도록 돕습니다.",
    renderTrendSvg(state.chains.slice().reverse()),
    [
      "그래프에서 가장 먼저 눈에 들어오는 변화는 무엇인가요?",
      "충동은 높았지만 문제행동수준이 낮아진 지점이 있나요?",
      "실천행동 점수가 낮아진 구간은 회복 유지 위험과 연결되나요?",
      "다음 주에도 확인하고 싶은 선은 충동, 행동화, 실천 중 무엇인가요?",
    ],
    renderBarSummary([
      ["위험 연쇄", chains((chain) => chain.highUrge && chain.actionized).length * 20, "warn"],
      ["감정 감내", chains(isDistressTolerance).length * 20, "ok"],
      ["회복 유지 위험", chains(isMotivationDip).length * 20, "focus"],
    ]),
    ["urge", "action", "practice"],
  );

  // 감정×충동 산점도 / 문제행동 캘린더 히트맵.
  // "오늘"을 시스템 날짜가 아니라 CSV 안의 가장 최근 observation 날짜로 고정합니다(상담 시점과 CSV 시점이 다를 수 있으므로).
  const anchorTs = getAnchorDate(state.observationDays);
  const scatterVisual = visualFeedback(
    "감정×충동 산점도",
    "감정이 강해질수록 충동도 함께 커지는지, 그 조합이 실제 문제행동으로 이어지는지 한눈에 확인합니다. 점 색은 그 기록의 문제행동수준입니다.",
    emotionUrgeScatterSvg(getScatterPoints(state.observationDays, anchorTs)),
    [
      "오른쪽 위(감정↑충동↑)에 점이 몰려 있나요, 흩어져 있나요?",
      "빨간 점(문제행동 많음)은 주로 어느 위치에 있나요?",
      "감정은 높았는데 충동은 낮았던 기록이 있다면, 그때 무엇이 달랐나요?",
    ],
  );
  const calendarVisual = visualFeedback(
    "문제행동 캘린더",
    "최근 10주를 요일별 격자로 배치했습니다. 회색은 '기록 없음'이지 실패가 아닙니다. 색이 진할수록 그날 중 가장 심각했던 문제행동수준입니다.",
    calendarHeatmapSvg(state.observationDays, anchorTs, 10),
    [
      "최근 몇 주와 그 이전을 비교하면 색이 옅어지고 있나요, 짙어지고 있나요?",
      "색이 특정 요일에 몰려 있나요?",
      "회색(기록 없음)이 유독 많은 구간이 있다면, 그 시기에 무슨 일이 있었나요?",
    ],
  );

  // 문제행동수준 vs 삶의 경험 확장/만족도 (듀얼 연속체) — daily_checkin(v1.1 신규) 반영.
  const dualAxisDays = buildDualAxisDays(state.observationDays, state.dailyCheckins, state.records, 14);
  const dualAxisVisual = visualFeedback(
    "문제행동수준과 삶의 경험 확장/만족도, 나란히 보기",
    "증상이 줄었다고 삶이 저절로 만족스러워지는 것은 아닙니다. 두 지표를 같은 시간축에 나란히 놓아 함께 움직이는지, 따로 움직이는지 확인합니다. 초록 점은 그날 작은 실천 기록이 있었다는 뜻입니다.",
    dualAxisTimelineSvg(dualAxisDays),
    [
      "문제행동이 줄어든 주에 경험 확장도 함께 올라갔나요, 그대로였나요?",
      "문제행동은 그대로인데 경험 확장이 올라간 날이 있다면, 그날 무엇이 달랐나요?",
      "실천 기록(초록 점)이 있는 날은 경험 확장이 대체로 더 높은 편인가요?",
    ],
  );
  const expansionScatterVisual = visualFeedback(
    "문제행동수준×경험 확장 산점도",
    "두 축이 반비례하는지(왼쪽 위로 몰림) 서로 독립적인지(흩어짐) 직접 확인합니다. 테두리가 있는 점은 그날 실천 기록이 있었던 날입니다.",
    expansionActionScatterSvg(dualAxisDays),
    [
      "문제행동이 낮은데 경험 확장도 낮은 날이 있다면, 그날은 어떤 하루였나요?",
      "테두리 있는 점(실천 기록 있음)이 위쪽(경험 확장 높음)에 몰려 있나요?",
      "이 두 지표를 따로 다뤄야 할 이유가 이 그래프에서 보이나요?",
    ],
  );

  return windowCard + visual + weeklyVisual + scatterVisual + calendarVisual + dualAxisVisual + expansionScatterVisual + workbench([
    ["피드백 안전", [feedbackSafetyCard(), beyondNumbersCard()]],
    ["삶의 회복", [lifeRecoveryCard()]],
    ["개인 내 변화", success.concat(partial)],
    ["주의할 점", highRisk.concat(maintenance)],
    ["상담자 질문", [
      card("피드백은 질문으로 시작", "", "focus", [
        "이 수치를 보면 어떤 점이 가장 먼저 눈에 들어오나요?",
        "좋아진 점이 있다면 무엇 때문이라고 생각하나요?",
        "예상과 다른 부분은 무엇인가요?",
        "다음 주에도 확인하고 싶은 측정치는 무엇인가요?",
      ]),
    ]],
  ]);
}

// 변화언어/유지언어 비율이 시간에 따라 늘고 있는지 줄고 있는지를 봅니다.
// 동기강화상담(MI)에서는 변화언어 비율의 증가 자체를 예후와 관련된 과정 지표로 봅니다.
// 기존 detectMotivation()은 스냅샷(지금 몇 건)만 보여주고 추세는 안 보여줘서 이 카드를 추가합니다.
function computeMotivationTrend() {
  const combined = [
    ...detectMotivation("change").map((item) => ({ date: item.record.createdAt, type: "change" })),
    ...detectMotivation("sustain").map((item) => ({ date: item.record.createdAt, type: "sustain" })),
  ]
    .filter((entry) => entry.date)
    .sort((a, b) => a.date - b.date);

  if (!combined.length) return { hasData: false };

  const changeRatio = (list) => (list.length ? list.filter((entry) => entry.type === "change").length / list.length : null);
  const totalChange = combined.filter((entry) => entry.type === "change").length;
  const totalSustain = combined.length - totalChange;
  const overallRatio = changeRatio(combined);

  const mid = Math.floor(combined.length / 2);
  const front = combined.slice(0, mid);
  const back = combined.slice(mid);
  const frontRatio = changeRatio(front);
  const backRatio = changeRatio(back);

  let trendText = "추세를 보기엔 기록이 부족함";
  let kind = "focus";
  let hasHalves = false;
  if (front.length && back.length && frontRatio !== null && backRatio !== null) {
    hasHalves = true;
    if (backRatio > frontRatio) {
      trendText = "후반부에 변화언어 비율 상승 — 동기가 강화되고 있는 신호일 수 있습니다";
      kind = "ok";
    } else if (backRatio < frontRatio) {
      trendText = "후반부에 변화언어 비율 하락 — 반박보다 양가감정을 반영하며 자율성을 강조하는 접근이 필요할 수 있습니다";
      kind = "warn";
    } else {
      trendText = "기간 내 큰 변화 없음";
    }
  }

  return { hasData: true, totalChange, totalSustain, overallRatio, hasHalves, frontRatio, backRatio, trendText, kind };
}

function buildMotivationTrendCard() {
  const result = computeMotivationTrend();

  if (!result.hasData) {
    return card("변화언어 비율 추세", "<p>변화언어·유지언어로 감지된 기록이 없습니다.</p>", "focus");
  }

  const halfCompare = result.hasHalves
    ? `<p>전반부 변화언어 비율 ${(result.frontRatio * 100).toFixed(0)}% → 후반부 ${(result.backRatio * 100).toFixed(0)}%</p>`
    : "";

  return card(
    "변화언어 비율 추세",
    `<p>변화언어(변화 의지가 담긴 표현)와 유지언어(현재 상태를 정당화하는 표현)의 비율이 시간에 따라 어떻게 바뀌는지 봅니다.</p>
     <p>전체: 변화언어 ${result.totalChange}건 · 유지언어 ${result.totalSustain}건 (변화언어 비율 ${result.overallRatio !== null ? (result.overallRatio * 100).toFixed(0) : "-"}%)</p>
     ${halfCompare}
     <p><strong>추세: ${result.trendText}</strong></p>`,
    result.kind,
  );
}

function renderFeedbackReadinessView() {
  const change = detectMotivation("change").slice(0, 8).map((item) => recordCard(item.record, item.label, "ok", [
    "이 말을 더 자세히 말해 달라고 요청합니다.",
    "측정 피드백을 변화언어와 연결합니다.",
  ]));
  const sustain = detectMotivation("sustain").slice(0, 8).map((item) => recordCard(item.record, item.label, "focus", [
    "반박하지 말고 양가감정으로 반영합니다.",
    "비교 피드백보다 선택권과 자율성을 먼저 강조합니다.",
  ]));
  const dips = chains(isMotivationDip).slice(0, 6).map((chain) => chainCard(chain, "회복 안일감/동기저하", "focus"));
  const changeCount = detectMotivation("change").length;
  const sustainCount = detectMotivation("sustain").length;
  const visual = visualFeedback(
    "개입 분기 판단",
    "변화언어와 유지언어의 균형을 보고 피드백을 바로 제시할지, 먼저 반영할지 결정합니다.",
    renderBarSummary([
      ["변화언어", changeCount * 12, "ok"],
      ["유지언어", sustainCount * 12, "warn"],
      ["회복 유지 위험", chains(isMotivationDip).length * 16, "focus"],
    ]),
    [
      "지금은 피드백을 직접 제시해도 될 만큼 변화언어가 충분한가요?",
      "유지언어가 높다면 어떤 두려움이나 욕구를 먼저 반영해야 할까요?",
      "측정치를 보여주기 전에 선택권과 자율성을 어떻게 확인할까요?",
    ],
  );
  return visual + workbench([
    ["변화언어 비율 추세", [buildMotivationTrendCard()]],
    ["변화언어", change],
    ["유지언어", sustain],
    ["피드백 방식", dips.concat([card("준비도 판단", "", "focus", [
      "변화언어가 많으면 측정 피드백을 구체적으로 제시합니다.",
      "유지언어가 많으면 공감, 반영, 양가감정 요약을 먼저 합니다.",
      "충동이 줄며 실천도 줄었다면 회복 유지 위험으로 다룹니다.",
      "내담자 자신의 이전 기록과 비교하는 개인 내 피드백을 우선합니다.",
    ])])],
  ]);
}

// 내담자가 실제로 "도움이 됐다"고 기록한 대처 방법을 모아 개인화된 안전계획 카드를 만듭니다.
// STOP/TIPP 같은 일반 기법과 달리, 이 사람에게 실제로 통했던 방법을 위기 순간 우선 참고자료로 제공합니다.
const SAFETY_COPING_THRESHOLD = 6;

// 문제행동(도박·음주 등)과는 별개로, 약속 회피·연락 두절 같은 일반적인 활동 축소(우울·무기력 신호)가
// 늘고 있는지 줄고 있는지를 봅니다. 촉발단서 히트맵에도 회피 신호가 있지만, 그건 빈도·평균충동 상관만
// 보여줄 뿐 시간에 따른 추세는 보여주지 않아서 이 카드를 별도로 둡니다.
// --- 한눈에 보기 (신호등 요약) ---
// 이미 계산된 값(공식 재발신호, 회피 신호 추세, 목표 달성 개수)만 조합합니다 — 새로운 판단 기준을
// 만들지 않고, 흩어져 있던 지표를 하나로 모아 CSV를 열자마자 종합 상태를 볼 수 있게 합니다.
function computeAtAGlanceStatus() {
  const signal = state.relapseWindow;
  const avoidance = computeAvoidanceTrend();
  const goals = computeGoalProgress();

  const scoredGoals = goals.filter((item) => item.actual !== null && item.actual !== undefined);
  const achievedGoals = scoredGoals.filter((item) => {
    const parts = goalRowParts(item);
    return parts && parts.achieved;
  });

  const hasOfficialSignal = !!(signal && (signal.emotional.active || signal.cognitive.active));
  const hasSevereAction = !!(signal && signal.behavior.severeDays > 0);
  const hasAnyAction = !!(signal && signal.behavior.days > 0);
  const avoidanceWarn = avoidance.hasData && avoidance.kind === "warn";
  const lowGoalAchievement = scoredGoals.length > 0 && achievedGoals.length < scoredGoals.length / 2;

  let level = "양호";
  const reasons = [];

  if (hasOfficialSignal || hasSevereAction) {
    level = "위험";
    if (hasOfficialSignal) reasons.push("공식 재발신호 활성");
    if (hasSevereAction) reasons.push(`즉시확인 필요 행동 ${signal.behavior.severeDays}일`);
  } else if (hasAnyAction || avoidanceWarn || lowGoalAchievement) {
    level = "주의";
    if (hasAnyAction) reasons.push(`문제행동 기록 ${signal.behavior.days}일`);
    if (avoidanceWarn) reasons.push("회피 신호 증가 추세");
    if (lowGoalAchievement) reasons.push(`목표 달성 ${achievedGoals.length}/${scoredGoals.length}`);
  } else {
    reasons.push(scoredGoals.length ? `목표 달성 ${achievedGoals.length}/${scoredGoals.length}` : "특이 신호 없음");
  }

  return { level, reasons, goalsAchieved: achievedGoals.length, goalsTotal: scoredGoals.length };
}

function renderAtAGlanceStatus() {
  if (!els.atAGlanceBanner) return;
  if (!state.records.length) {
    els.atAGlanceBanner.hidden = true;
    els.atAGlanceBanner.innerHTML = "";
    return;
  }
  const status = computeAtAGlanceStatus();
  const levelClass = status.level === "위험" ? "danger" : status.level === "주의" ? "caution" : "good";
  els.atAGlanceBanner.hidden = false;
  els.atAGlanceBanner.className = `at-a-glance counselor-only at-a-glance-${levelClass}`;
  els.atAGlanceBanner.innerHTML = `
    <span class="at-a-glance-dot" aria-hidden="true"></span>
    <strong>이번 주 종합 상태: ${escapeHtml(status.level)}</strong>
    <span class="at-a-glance-reasons">${escapeHtml(status.reasons.join(" · "))}</span>
  `;
}

function computeAvoidanceTrend() {
  const sorted = [...state.observationDays].sort((a, b) => a.dateTs - b.dateTs);
  const allTags = [];
  sorted.forEach((day) => allTags.push(...(day.avoidanceTags || [])));

  if (!allTags.length) return { hasData: false, totalDays: sorted.length };

  const topTags = topFrequency(allTags, 3);
  const perDayCounts = sorted.map((day) => (day.avoidanceTags || []).length);
  const daysWithAvoidance = perDayCounts.filter((count) => count > 0).length;

  let trendText = "추세를 보기엔 기록이 부족함";
  let kind = "focus";
  if (perDayCounts.length >= 2) {
    const mid = Math.floor(perDayCounts.length / 2);
    const frontAvg = average(perDayCounts.slice(0, mid));
    const backAvg = average(perDayCounts.slice(mid));
    if (backAvg > frontAvg) {
      trendText = "후반부에 증가 추세 — 우울·무기력이 진행되고 있을 수 있어 확인이 필요합니다";
      kind = "warn";
    } else if (backAvg < frontAvg) {
      trendText = "후반부에 감소 추세";
      kind = "ok";
    } else {
      trendText = "기간 내 큰 변화 없음";
    }
  }

  return { hasData: true, topTags, daysWithAvoidance, totalDays: sorted.length, trendText, kind };
}

function buildAvoidanceTrendCard() {
  const result = computeAvoidanceTrend();

  if (!result.hasData) {
    return card(
      "회피 신호 추세",
      "<p>문제행동수준과는 별개로, 약속 회피·연락 두절 같은 활동 축소 신호를 추적합니다. 이 기간에는 해당 기록이 없습니다.</p>",
      "ok",
    );
  }

  return card(
    "회피 신호 추세",
    `<p>문제행동(도박·음주 등)과는 별개로, 약속 회피·연락 두절 같은 일반적인 활동 축소를 추적합니다. 문제행동은 줄어도 이 신호가 늘고 있다면 우울·무기력이 진행되고 있을 수 있습니다.</p>
     <p>회피 신호가 있었던 관찰: ${result.daysWithAvoidance}건 / 전체 ${result.totalDays}건</p>
     <p>자주 나온 신호: ${result.topTags.map(([tag, count]) => `${tag} ${count}회`).join(", ")}</p>
     <p><strong>추세: ${result.trendText}</strong></p>`,
    result.kind,
  );
}

function computeSafetyPlanRanked() {
  const grouped = new Map();
  state.chains.forEach((chain) => {
    if (!chain.chainId.startsWith("observation-")) return;
    const payload = chain.records[0]?.payload || {};
    const copingText = (payload.coping || "").trim();
    const copingScore = score10(payload.coping_score);
    if (!copingText || copingScore === null || copingScore < SAFETY_COPING_THRESHOLD) return;
    if (!grouped.has(copingText)) grouped.set(copingText, { coping: copingText, scores: [], latestDate: null });
    const entry = grouped.get(copingText);
    entry.scores.push(copingScore);
    if (chain.date && (!entry.latestDate || chain.date > entry.latestDate)) entry.latestDate = chain.date;
  });
  return [...grouped.values()]
    .map((entry) => ({ coping: entry.coping, avg: average(entry.scores), count: entry.scores.length, latestDate: entry.latestDate }))
    .sort((a, b) => (b.avg - a.avg) || (b.count - a.count))
    .slice(0, 5);
}

function buildPersonalizedSafetyCard() {
  const ranked = computeSafetyPlanRanked();

  if (!ranked.length) {
    return card(
      "개인화된 안전계획",
      `<p>아직 도움 정도 ${SAFETY_COPING_THRESHOLD}점 이상으로 기록된 대처 사례가 없습니다. 기록이 쌓이면 이 카드가 자동으로 채워집니다.</p>`,
      "focus",
    );
  }

  const items = ranked.map((entry) => `<li><strong>${escapeHtml(entry.coping)}</strong> — 평균 도움 ${entry.avg.toFixed(1)}/10 (${entry.count}회 기록${entry.latestDate ? `, 최근 ${escapeHtml(formatDate(entry.latestDate))}` : ""})</li>`).join("");

  return card(
    "개인화된 안전계획 — 나에게 효과가 있었던 것들",
    `<p>지금까지 기록에서 도움 정도 ${SAFETY_COPING_THRESHOLD}점 이상으로 남긴 대처 방법입니다. 위기 순간에는 일반적인 기법보다, 이미 나에게 통했던 방법부터 먼저 시도해 봅니다.</p><ul>${items}</ul>`,
    "ok",
  );
}

function relapseWindowSummaryCard() {
  const signal = state.relapseWindow;
  if (!signal || (!signal.recentCount && !signal.compareCount)) {
    return card("공식 재발신호 (최근 3일 기준)", `<p>이 기간에는 observation 기록이 없어 계산할 수 없습니다.</p>`, "focus");
  }
  const kind = signal.behavior.severeDays > 0
    ? "warn"
    : (signal.emotional.active || signal.cognitive.active || signal.behavior.active)
      ? "focus"
      : "ok";
  return card(
    "공식 재발신호 (최근 3일 기준 · 연동명세서 §5-2)",
    `<p>내담자 앱 화면과 같은 계산식으로, 아래 개별 연쇄 카드와는 다른 기준입니다.</p>
     <p><strong>정서적 재발</strong>: 조건 ${signal.emotional.metCount}/6 충족 ${signal.emotional.active ? "(신호 있음)" : "(신호 없음)"}</p>
     <p><strong>인지적 재발</strong>: 조건 ${signal.cognitive.metCount}/4 충족 ${signal.cognitive.active ? "(신호 있음)" : "(신호 없음)"}</p>
     <p><strong>행동적 재발</strong>: 최근 3일 중 문제행동 기록 ${signal.behavior.days}일${signal.behavior.severeDays ? ` (그중 즉시확인 필요 수준 ${signal.behavior.severeDays}일)` : ""}</p>`,
    kind,
  );
}

function renderRelapseEarlyWarningView() {
  const signalRows = state.chains.map((chain) => ({ chain, signals: relapseSignals(chain) }));
  const emotional = signalRows.filter((item) => item.signals.emotional.length).slice(0, 6);
  const cognitive = signalRows.filter((item) => item.signals.cognitive.length).slice(0, 6);
  const behavioral = signalRows.filter((item) => item.signals.behavior.length).slice(0, 6);
  const overlap = signalRows.filter((item) => item.signals.emotional.length && item.signals.cognitive.length).slice(0, 6);
  const visual = visualFeedback(
    "6일 기록 기반 재발 조기경보",
    "정서적 재발과 인지적 재발은 순서대로만 나타나지 않으며, 같은 기록에서 함께 경고될 수 있습니다. 이 화면은 진단이 아니라 스스로 개입할 시점을 찾기 위한 안내입니다.",
    renderBarSummary([
      ["정서 신호", emotional.length * 16, "focus"],
      ["인지 신호", cognitive.length * 16, "warn"],
      ["두 신호 겹침", overlap.length * 20, "warn"],
      ["행동 후 연결", behavioral.length * 20, "warn"],
    ]),
    [
      `정서 점수 ${state.thresholds.emotion}/10 이상, 부정정서 표현, 실천 저수행을 먼저 확인합니다.`,
      `충동 ${state.thresholds.cognitiveUrge}/10 이상 또는 문제행동을 미화·합리화하는 생각을 인지 신호로 봅니다.`,
      "경고가 보이면 충동이 더 커지기 전에 한 가지 활동을 선택하고, 실행 뒤 다시 점수를 기록합니다.",
      "자해·타해·응급 위험, 통제 어려움이 있으면 혼자 해결하려 하지 말고 즉시 지역 응급체계·의료기관·신뢰할 수 있는 사람에게 연결합니다.",
    ],
  );
  return visual + workbench([
    ["개인화된 안전계획", [buildPersonalizedSafetyCard()]],
    ["공식 재발신호", [`<div class="counselor-only">${relapseWindowSummaryCard()}</div>`, `<div class="counselor-only">${buildAvoidanceTrendCard()}</div>`]],
    ["1. 정서적 재발 주의", emotional.map(({ chain, signals }) => relapseCard(chain, "emotional", signals.emotional))],
    ["2. 인지적 재발 경고", cognitive.map(({ chain, signals }) => relapseCard(chain, "cognitive", signals.cognitive))],
    ["정서·인지 신호 겹침", overlap.map(({ chain, signals }) => relapseCard(chain, "overlap", signals.emotional.concat(signals.cognitive)))],
    ["3. 행동 후 조기 회복", [postActionRecoveryCard()].concat(behavioral.map(({ chain, signals }) => relapseCard(chain, "behavior", signals.behavior))).concat([
      card("행동 기록이 없더라도 안전계획을 준비합니다", "", "focus", [
        "연락할 사람 1명과 안전한 장소 1곳을 미리 적어 둡니다.",
        "행동이 발생하면 숨기거나 처벌하지 말고, 가능한 빨리 사실을 인정하고 도움을 요청합니다.",
        "다음 상담 전이라도 통제가 어렵다면 상담기관·회복모임·의료 및 응급 자원에 연결합니다.",
      ]),
    ])],
  ]);
}

function relapseCard(chain, type, reasons) {
  const guidance = {
    emotional: [
      "정서에 이름 붙이기: ‘지금은 불안/수치심/분노가 올라온다’고 짧게 말해 봅니다.",
      "정서 안정화: 수면·식사·물·가벼운 걷기·샤워 중 지금 가능한 한 가지를 10분 실행합니다.",
      "압도되면 TIPP를 사용합니다: 안전한 범위의 온도 변화, 짧은 신체활동, 4초 들이마시고 6초 내쉬는 호흡, 근육 이완.",
      "심혈관·호흡기 등 의학적 문제가 있거나 어지러우면 온도 변화·강한 운동은 건너뛰고 의료진에게 확인합니다.",
      "고립 대신 신뢰할 사람에게 ‘지금 정서가 흔들린다’는 한 문장을 보냅니다.",
    ],
    cognitive: [
      "영화를 결말까지 돌리기: 문제행동 직후뿐 아니라 다음 날·다음 주에 생길 결과까지 적어 봅니다.",
      "미루기: 30분만 미루고 그동안 장소를 바꾸거나 신뢰할 사람에게 연락합니다.",
      "STOP: 멈추기 → 한 걸음 물러서서 호흡하기 → 생각·감정·몸을 관찰하기 → 목표와 가치에 맞게 주의 깊게 진행하기.",
      "생각을 사실로 따르지 말고 ‘문제행동을 권하는 생각이 지나가고 있다’고 알아차립니다.",
    ],
    overlap: [
      "정서와 생각이 함께 올라온 구간입니다. 먼저 TIPP 또는 4–6 호흡으로 몸의 각성을 낮춘 뒤 STOP을 적용합니다.",
      "혼자 판단하지 말고, 30분 미루기와 신뢰할 사람에게 연락하기를 함께 실행합니다.",
      "실행 뒤 충동·정서 점수를 다시 기록해 변화가 있었는지 확인합니다.",
    ],
    behavior: [
      "실수를 즉시 인정합니다. 이는 실패 판정이 아니라 더 큰 재발을 막는 조기 개입입니다.",
      "가능한 빨리 상담자·회복지원자·신뢰할 사람에게 사실과 현재 위험을 알립니다.",
      "오늘의 촉발요인·생각·감정·행동·도움 요청을 기록하고, 회복계획과 환경을 다시 조정합니다.",
    ],
  }[type];
  const title = {
    emotional: "정서적 재발 주의 신호",
    cognitive: "인지적 재발 경고 신호",
    overlap: "정서·인지 재발 신호 겹침",
    behavior: "행동적 재발 후 조기 회복",
  }[type];
  const kind = type === "emotional" ? "focus" : type === "behavior" || type === "overlap" ? "warn" : "warn";
  return card(title, `<p><strong>${escapeHtml(formatDate(chain.date))}</strong> · ${escapeHtml(reasons.join(" / "))}</p><p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, kind, guidance);
}

// --- 자기성찰 요약문 (반성문 참고자료) ---
// 절대 반성문을 대신 쓰지 않습니다. 기록이 있는 날짜마다, 그날의 마음(생각·감정·충동·몸반응)과
// 행동의 관계를 사실 그대로 정리한 순수 텍스트를 만듭니다. 상담자가 이 텍스트를 원자료 삼아
// (필요하면 AI 도구 등을 활용해) 성찰문 작성을 돕는 데 씁니다. 최대 14일치까지만 만듭니다.
const REFLECTION_DAY_LIMIT = 14;

// 상담자가 아래 자기성찰 요약문을 AI에 붙여넣을 때 함께 쓸 수 있는 안내 프롬프트입니다.
// 질문 생성 자체는 이 앱이 아니라 AI가 원자료를 읽고 판단하는 영역이라는 전제를 명시합니다.
const REFLECTION_AI_PROMPT = `아래는 내담자가 스스로 기록한 자기관찰 자료(날짜별 상황·생각·감정·충동·행동·실천)입니다.
이 자료를 바탕으로, 내담자가 스스로 답하며 자기 성찰을 심화할 수 있는 질문을 5개 이상 만들어 주세요.

조건:
- 막연한 일반론이 아니라, 아래 기록에 나온 구체적인 상황·생각·행동을 근거로 삼아 질문을 만들어 주세요.
- "무조건 잘못했다"는 결론을 유도하지 말고, 그 순간의 생각·감정·충동이 실제로 어떻게 행동으로(또는 행동으로 이어지지 않고) 연결됐는지 스스로 짚어보게 하는 질문으로 만들어 주세요.
- 자기비난만이 아니라, 기록에 있는 작은 실천이나 가치도 함께 짚어 균형 있게 만들어 주세요.
- 질문에 대한 답은 절대 대신 작성하지 마세요. 질문만 만들어 주세요.

[자기성찰 요약문]`;

// 예비 수준의 반성문 초안을 만들 때 함께 쓰는 프롬프트입니다. "최종본이 아니라 출발점"이라는 점과
// "근거 없는 상투적 문구 금지"를 명시해, 이 기능이 애초에 막으려던 형식적 반성문이 AI 버전으로
// 재생산되지 않도록 안전장치를 프롬프트 안에 직접 넣었습니다.
const REFLECTION_DRAFT_PROMPT = `아래는 내담자가 스스로 기록한 자기관찰 자료(날짜별 상황·생각·감정·충동·행동·실천)입니다.
이 자료를 바탕으로, 내담자가 반성문을 쓸 때 출발점으로 삼을 수 있는 예비 수준의 초안을 작성해 주세요.

조건:
- 이 초안은 최종본이 아니라 내담자가 자기 언어로 고쳐 쓰기 위한 출발점입니다. 그 사실을 초안 맨 앞에 한 줄로 명시해 주세요.
- 아래 기록에 실제로 나온 상황·생각·행동만 근거로 삼고, 기록에 없는 감정이나 반성을 지어내지 마세요.
- "죄송합니다", "다시는 안 그러겠습니다" 같은 근거 없는 상투적 문구로 채우지 말고, 그 순간 실제 생각·감정·충동이 어떻게 행동으로 이어졌는지를 구체적으로 서술하는 데 집중해 주세요.
- 자기비난만 나열하지 말고, 기록에 있는 대처 시도나 작은 실천, 가치도 균형 있게 포함해 주세요.
- 행동이 다른 사람에게 미쳤을 영향에 대한 서술은 기록에서 확인 가능한 범위 안에서만 조심스럽게 포함하고, 과장하거나 단정하지 마세요.
- 분량은 A4 반 페이지를 넘기지 마세요.

[자기성찰 요약문]`;

// 그 순간의 충동 점수와 실제 행동 수준을 대조해, "마음이 어떻게 행동으로(또는 행동으로 이어지지 않고)
// 연결됐는지"를 한 문장으로 요약합니다. 판단이 아니라 사실 연결이 목적입니다.
function relationshipNote(urgeScore, actionLevel) {
  if (urgeScore === null || actionLevel === null) return "";
  if (actionLevel >= 1 && urgeScore >= 6) return "충동이 높아지며 결국 행동으로 이어짐";
  if (actionLevel >= 1 && urgeScore < 6) return "충동이 크지 않았는데도 행동으로 이어짐 — 다른 요인 확인 필요";
  if (actionLevel === 0 && urgeScore >= 7) return "충동은 높았지만 행동으로 이어지지 않음(대처가 작동함)";
  return "";
}

function formatObservationBlock(payload, index, total) {
  const label = total > 1 ? `[관찰 ${index + 1}]` : "[관찰]";
  const trigger = joinText([textList(payload.trigger_places), textList(payload.trigger_people), textList(payload.trigger_times), textList(payload.trigger_custom)]);
  const problemLabels = joinText([textList(firstDefined(payload.problem_labels, payload.behavior_areas)), textList(payload.behavior_custom_areas)]);
  const emotionText = joinText([payload.emotion, textList(payload.emotion_custom)]);
  const bodyText = joinText([textList(payload.body_reactions), textList(payload.body_custom)]);
  const hasCurve = payload.urge_initial_score !== undefined && payload.urge_initial_score !== "" && payload.urge_end_score !== undefined && payload.urge_end_score !== "";
  const urgeText = hasCurve ? `시작 ${payload.urge_initial_score} → 정점 ${payload.urge_score ?? "-"} → 종료 ${payload.urge_end_score}` : `${payload.urge_score ?? "-"}/10`;
  const relation = relationshipNote(score10(payload.urge_score), score5(payload.action_level));
  const noted = joinText([
    payload.value ? `가치=${payload.value}` : "",
    payload.value_action_draft ? `다음 작은 행동="${payload.value_action_draft}"` : "",
    payload.insight ? `알아차림="${payload.insight}"` : "",
    payload.gratitude ? `감사="${payload.gratitude}"` : "",
  ]);
  return [
    `${label} 기록 시점: ${displayTimeSlot(payload.time_slot) || "기록 없음"}`,
    problemLabels ? `  관찰·기록한 문제: ${problemLabels}` : "",
    payload.problem_domain ? `  문제의 중심 영역: ${payload.problem_domain}` : "",
    `  발생한 구체적 상황: ${payload.situation || "기록 없음"}`,
    trigger ? `  촉발단서: ${trigger}` : "",
    `  생각(${payload.thought_score ?? "-"}/10): ${payload.thought_text || "기록 없음"}`,
    `  감정(${payload.emotion_score ?? "-"}/10): ${emotionText || "기록 없음"}`,
    `  몸 반응: ${bodyText || "기록 없음"}`,
    `  충동: ${urgeText}`,
    `  문제행동 활성화 수준: ${score5(payload.action_level) === null ? "기록 없음" : `${score5(payload.action_level)}/5`}`,
    joinText([textList(payload.avoidance_tags), textList(payload.avoidance_custom)]) ? `  회피 신호: ${joinText([textList(payload.avoidance_tags), textList(payload.avoidance_custom)])}` : "",
    payload.coping ? `  대처: ${payload.coping}` : "",
    relation ? `  → 마음-행동 관계: ${relation}` : "",
    noted ? `  스스로 적은 것: ${noted}` : "",
  ].filter(Boolean).join("\n");
}

function extractDailyReflectionSummaries(rows, limit = REFLECTION_DAY_LIMIT) {
  const parseRow = (row) => ({ row, payload: parsePayload(row.payload_json) || {} });
  const observations = rows.filter((row) => row.record_type === "observation").map(parseRow);
  const logs = rows.filter((row) => row.record_type === "practice_log").map(parseRow);
  const checkins = rows.filter((row) => row.record_type === "daily_checkin").map(parseRow);
  const predictions = rows.filter((row) => row.record_type === "prediction").map(parseRow);
  const defs = new Map();
  rows.filter((row) => row.record_type === "practice_definition").forEach((row) => defs.set(row.id, parsePayload(row.payload_json) || {}));

  const dateSet = new Set();
  [...observations, ...logs, ...checkins].forEach(({ row }) => { if (row.date) dateSet.add(row.date); });
  const sortedDates = [...dateSet].filter((date) => dateOnly(date) !== null).sort((a, b) => dateOnly(a) - dateOnly(b));
  const recentDates = limit ? sortedDates.slice(-limit) : sortedDates;

  return recentDates.map((date) => {
    const dayObs = observations.filter(({ row }) => row.date === date);
    const dayLogs = logs.filter(({ row }) => row.date === date);
    const dayCheckin = checkins.find(({ row }) => row.date === date);
    const dayPredictions = predictions.filter(({ row }) => row.date === date);

    const sections = [`[자기성찰 요약문 — ${date}]`, ""];

    if (dayObs.length) {
      sections.push("■ 그날 있었던 일 (마음과 행동)");
      dayObs.forEach(({ payload }, index) => sections.push(formatObservationBlock(payload, index, dayObs.length)));
      sections.push("");
    }

    if (dayLogs.length) {
      sections.push("■ 그날의 실천행동");
      dayLogs.forEach(({ payload }) => {
        const def = defs.get(payload.practice_id) || {};
        const name = def.practice_name || payload.practice_name || "실천행동";
        const pleasure = score10(payload.pleasure_score);
        const mastery = score10(payload.mastery_score);
        const expPleasure = score10(payload.expected_pleasure_score);
        const compare = pleasure !== null && expPleasure !== null ? ` (예상 즐거움 ${expPleasure} → 실제 ${pleasure})` : "";
        sections.push(`- ${name}: 즐거움 ${pleasure ?? "-"}/10, 성취감 ${mastery ?? "-"}/10${compare}${payload.practice_note ? ` · "${payload.practice_note}"` : ""}`);
      });
      sections.push("");
    }

    if (dayCheckin) {
      const expansion = score10(dayCheckin.payload.expansion_score);
      sections.push("■ 그날의 삶의 경험 확장/만족도");
      sections.push(`- ${expansion ?? "-"}/10${dayCheckin.payload.note ? ` · "${dayCheckin.payload.note}"` : ""}`);
      sections.push("");
    }

    if (dayPredictions.length) {
      const statusLabels = { pending: "확인 전", occurred: "실제로 일어남", partial: "부분적으로 그러함", did_not_occur: "일어나지 않음" };
      sections.push("■ 예기불안 검증");
      dayPredictions.forEach(({ payload }) => {
        const actual = score10(payload.actual_severity);
        sections.push(`- 걱정: "${payload.worry_text || ""}" (예상 ${payload.predicted_severity ?? "-"}/10) → ${statusLabels[payload.status] || payload.status}${actual !== null ? ` (실제 ${actual}/10)` : ""}`);
      });
      sections.push("");
    }

    return { date, dateTs: dateOnly(date), text: sections.join("\n").trim() };
  });
}

// --- AI 분석용 정리본 ---
// 「AI 분석용 정리본 생성」명세서 그대로 구현합니다. 이 기능은 진단이나 개입을 결정하지 않고,
// 데이터를 분석하기 좋은 형태로 "정리"만 합니다. 화면 텍스트 상자 + 클립보드 복사로만 제공하며,
// 파일 다운로드는 만들지 않습니다.
function topFrequency(items, limit) {
  const counts = new Map();
  items.forEach((item) => {
    if (!item) return;
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildAiReportSection1(observations, practiceDefs, practiceLogs, checkins) {
  const lines = [];

  const allTriggers = [];
  observations.forEach(({ payload }) => {
    allTriggers.push(...asTagArray(payload.trigger_places), ...asTagArray(payload.trigger_people), ...asTagArray(payload.trigger_times), ...asTagArray(payload.trigger_custom));
  });
  const topTriggers = topFrequency(allTriggers, 3);
  lines.push(`1) 상황과 촉발단서: 관찰 기록 ${observations.length}건.`);
  lines.push(`   자주 나온 촉발단서: ${topTriggers.length ? topTriggers.map(([tag, count]) => `${tag} ${count}회`).join(", ") : "기록 없음"}`);

  const thoughtScores = observations.map(({ payload }) => score10(payload.thought_score)).filter((v) => v !== null);
  lines.push(`2) 생각: 평균 강도 ${thoughtScores.length ? average(thoughtScores).toFixed(1) : "-"}/10`);

  const emotionScores = observations.map(({ payload }) => score10(payload.emotion_score)).filter((v) => v !== null);
  const allEmotions = [];
  observations.forEach(({ payload }) => {
    if (payload.emotion) allEmotions.push(payload.emotion);
    allEmotions.push(...asTagArray(payload.emotion_custom));
  });
  const topEmotions = topFrequency(allEmotions, 3);
  lines.push(`3) 감정: 평균 강도 ${emotionScores.length ? average(emotionScores).toFixed(1) : "-"}/10`);
  lines.push(`   자주 나온 감정: ${topEmotions.length ? topEmotions.map(([tag, count]) => `${tag} ${count}회`).join(", ") : "기록 없음"}`);

  const allBody = [];
  observations.forEach(({ payload }) => allBody.push(...asTagArray(payload.body_reactions), ...asTagArray(payload.body_custom)));
  const topBody = topFrequency(allBody, 3);
  lines.push(`4) 몸 반응: 자주 나온 반응 - ${topBody.length ? topBody.map(([tag, count]) => `${tag} ${count}회`).join(", ") : "기록 없음"}`);

  const urgeEntries = observations.map(({ row, payload }) => ({ date: row.date, score: score10(payload.urge_score) })).filter((entry) => entry.score !== null);
  const avgUrge = urgeEntries.length ? average(urgeEntries.map((entry) => entry.score)) : null;
  const maxUrge = urgeEntries.length ? urgeEntries.reduce((best, entry) => (entry.score > best.score ? entry : best)) : null;
  lines.push(`5) 충동: 평균(정점) ${avgUrge !== null ? avgUrge.toFixed(1) : "-"}/10`);
  lines.push(`   최고점: ${maxUrge ? `${maxUrge.score}/10 (${maxUrge.date})` : "기록 없음"}`);

  const actionScores = observations.map(({ payload }) => score5(payload.action_level)).filter((v) => v !== null);
  const avgAction = actionScores.length ? average(actionScores) : null;
  const actionDaySet = new Set(observations.filter(({ payload }) => (score5(payload.action_level) ?? 0) >= 1).map(({ row }) => row.date));
  lines.push(`6) 문제행동: 평균 활성화 수준 ${avgAction !== null ? avgAction.toFixed(1) : "-"}/5`);
  lines.push(`   1점 이상 기록된 날: ${actionDaySet.size}일`);

  const copingEntries = observations.filter(({ payload }) => payload.coping).map(({ row, payload }) => ({ date: row.date, coping: payload.coping, score: score10(payload.coping_score) }));
  const copingScores = copingEntries.map((entry) => entry.score).filter((v) => v !== null);
  const scoredCoping = copingEntries.filter((entry) => entry.score !== null);
  const bestCoping = scoredCoping.length ? scoredCoping.reduce((best, entry) => (entry.score > best.score ? entry : best)) : null;
  lines.push(`7) 대처: 평균 도움 정도 ${copingScores.length ? average(copingScores).toFixed(1) : "-"}/10`);
  lines.push(`   가장 도움이 됐던 대처: ${bestCoping ? `${bestCoping.date} - "${bestCoping.coping}"` : "기록 없음"}`);

  const values = [];
  observations.forEach(({ payload }) => { if (payload.value) values.push(payload.value); });
  practiceDefs.forEach(({ payload }) => { if (payload.practice_value) values.push(payload.practice_value); });
  const topValue = topFrequency(values, 1);
  const practiceAvgScores = practiceLogs
    .map(({ payload }) => {
      const pleasure = score10(payload.pleasure_score);
      const mastery = score10(payload.mastery_score);
      if (pleasure !== null && mastery !== null) return (pleasure + mastery) / 2;
      return pleasure ?? mastery;
    })
    .filter((v) => v !== null);
  lines.push(`8) 가치 기반 작은 실천행동: 가장 많이 선택한 가치 - ${topValue.length ? topValue[0][0] : "기록 없음"}`);
  lines.push(`   실천 평균 수행도: ${practiceAvgScores.length ? average(practiceAvgScores).toFixed(1) : "-"}/10`);

  if (!checkins.length) {
    lines.push("9) 삶의 경험 확장/만족도: 이번 기간 하루 마무리 기록 없음");
  } else {
    const expScores = checkins.map(({ payload }) => score10(payload.expansion_score)).filter((v) => v !== null);
    const avgExp = expScores.length ? average(expScores) : null;
    let trendText = "추세를 보기엔 기록이 부족함";
    if (checkins.length >= 2) {
      const mid = Math.floor(checkins.length / 2);
      const front = checkins.slice(0, mid).map(({ payload }) => score10(payload.expansion_score)).filter((v) => v !== null);
      const back = checkins.slice(mid).map(({ payload }) => score10(payload.expansion_score)).filter((v) => v !== null);
      if (front.length && back.length) {
        const frontAvg = average(front);
        const backAvg = average(back);
        trendText = backAvg > frontAvg ? "후반부에 상승 추세" : backAvg < frontAvg ? "후반부에 하락 추세" : "기간 내 큰 변화 없음";
      }
    }
    lines.push(`9) 삶의 경험 확장/만족도: 평균 ${avgExp !== null ? avgExp.toFixed(1) : "-"}/10`);
    lines.push(`   추세: ${trendText}`);
  }

  return lines.join("\n");
}

function buildAiReportSection2(observations) {
  if (!observations.length) return "(해당 기간에 관찰 기록이 없습니다.)";
  return observations.map(({ row, payload }) => {
    const lines = [`${row.date} · ${displayTimeSlot(payload.time_slot) || "-"}`];
    const problemText = joinText([textList(firstDefined(payload.problem_labels, payload.behavior_areas)), textList(payload.behavior_custom_areas)]);
    if (problemText) lines.push(`  관찰·기록한 문제: ${problemText}`);
    if (payload.problem_domain) lines.push(`  문제의 중심 영역: ${payload.problem_domain}`);
    if (payload.situation) lines.push(`  발생한 구체적 상황: ${payload.situation}`);
    const triggerText = joinText([textList(payload.trigger_places), textList(payload.trigger_people), textList(payload.trigger_times), textList(payload.trigger_custom)]);
    if (triggerText) lines.push(`  촉발단서: ${triggerText}`);
    if (payload.thought_text) lines.push(`  그때 든 생각의 강도(${payload.thought_score ?? "-"}/10): ${payload.thought_text}`);
    const emotionText = joinText([payload.emotion, textList(payload.emotion_custom)]);
    lines.push(`  그때 느낀 감정의 강도(${payload.emotion_score ?? "-"}/10): ${emotionText || "-"}`);
    const bodyText = joinText([textList(payload.body_reactions), textList(payload.body_custom)]);
    if (bodyText) lines.push(`  몸반응: ${bodyText}`);
    const hasCurve = displayTimeSlot(payload.time_slot) === "감정/충동 발생 시점" && payload.urge_initial_score !== undefined && payload.urge_initial_score !== "" && payload.urge_end_score !== undefined && payload.urge_end_score !== "";
    lines.push(`  충동: ${hasCurve ? `초기 ${payload.urge_initial_score} → 정점 ${payload.urge_score ?? "-"}/10 → 종료 ${payload.urge_end_score}` : `충동(정점): ${payload.urge_score ?? "-"}/10`}`);
    lines.push(`  문제행동 활성화 수준: ${payload.action_level ?? "-"}/5`);
    const avoidanceText = joinText([textList(payload.avoidance_tags), textList(payload.avoidance_custom)]);
    if (avoidanceText) lines.push(`  회피 신호: ${avoidanceText}`);
    if (payload.coping) lines.push(`  대처(도움 ${payload.coping_score ?? "-"}/10): ${payload.coping}`);
    if (payload.value || payload.value_action_draft) lines.push(`  가치/의도: ${payload.value || "-"} - ${payload.value_action_draft || "-"}`);
    return lines.join("\n");
  }).join("\n\n");
}

function buildTriggerUrgeComparison(observations, limit) {
  const allTags = [];
  observations.forEach(({ payload }) => {
    const tags = new Set([...asTagArray(payload.trigger_places), ...asTagArray(payload.trigger_people), ...asTagArray(payload.trigger_times), ...asTagArray(payload.trigger_custom)]);
    tags.forEach((tag) => allTags.push(tag));
  });
  const topTags = topFrequency(allTags, limit);
  if (!topTags.length) return "  (촉발단서 기록 없음)";
  return topTags.map(([tag, count]) => {
    const withGroup = [];
    const withoutGroup = [];
    observations.forEach(({ payload }) => {
      const tags = new Set([...asTagArray(payload.trigger_places), ...asTagArray(payload.trigger_people), ...asTagArray(payload.trigger_times), ...asTagArray(payload.trigger_custom)]);
      const urge = score10(payload.urge_score);
      if (urge === null) return;
      (tags.has(tag) ? withGroup : withoutGroup).push(urge);
    });
    const withAvg = withGroup.length ? average(withGroup).toFixed(1) : "-";
    const withoutAvg = withoutGroup.length ? average(withoutGroup).toFixed(1) : "-";
    return `  - ${tag} (${count}회): 있음 평균 충동 ${withAvg}점 / 없음 평균 충동 ${withoutAvg}점`;
  }).join("\n");
}

function buildAiReportSection3(rows, observations) {
  const observationDays = extractObservationDays(rows);
  const uniqueDates = [...new Set(observationDays.map((day) => day.dateTs))];
  let emotionalDayCount = 0;
  let cognitiveDayCount = 0;
  uniqueDates.forEach((dateTs) => {
    const signal = computeRelapseWindowSignal(observationDays, dateTs);
    if (signal.emotional.active) emotionalDayCount += 1;
    if (signal.cognitive.active) cognitiveDayCount += 1;
  });
  const actionDateTs = [...new Set(observationDays.filter((day) => (day.actionLevel ?? 0) >= 1).map((day) => day.dateTs))].sort((a, b) => a - b);
  const severeDateTs = actionDateTs.filter((ts) => observationDays.some((day) => day.dateTs === ts && (day.actionLevel ?? 0) >= 4));
  const totalDays = uniqueDates.length;

  return [
    `- 정서적 재발 신호가 있었던 날: ${emotionalDayCount}일 / ${totalDays}일 중`,
    `- 인지적 재발 신호가 있었던 날: ${cognitiveDayCount}일 / ${totalDays}일 중`,
    `- 문제행동이 기록된 날: ${actionDateTs.length}일 (${actionDateTs.map((ts) => formatDate(new Date(ts))).join(", ") || "없음"})`,
    `- 고위험 수준(문제행동수준 4점 이상): ${severeDateTs.length}일`,
    "",
    "반복되는 촉발 단서와 평균 충동 비교 (자주 나온 순, 상위 5개):",
    buildTriggerUrgeComparison(observations, 5),
  ].join("\n");
}

function buildAiReportSection4(practiceDefs, practiceLogs) {
  const activeDefs = practiceDefs.filter(({ payload }) => payload.archived !== true);
  if (!activeDefs.length) return "(활성 실천행동 계획이 없습니다.)";
  return activeDefs.map(({ row, payload }) => {
    const header = `- ${payload.practice_name || "실천행동"} (가치: ${payload.practice_value || "-"}) · 목표 ${payload.target_count ?? "-"}회/일`;
    const logs = practiceLogs.filter(({ payload: logPayload }) => logPayload.practice_id === row.id);
    if (!logs.length) return `${header}\n  이번 기간 수행 기록 없음`;
    const pleasureScores = logs.map(({ payload: p }) => score10(p.pleasure_score)).filter((v) => v !== null);
    const masteryScores = logs.map(({ payload: p }) => score10(p.mastery_score)).filter((v) => v !== null);
    const expectedScores = logs.map(({ payload: p }) => score10(p.expected_pleasure_score)).filter((v) => v !== null);
    const avgPleasure = pleasureScores.length ? average(pleasureScores) : null;
    const avgMastery = masteryScores.length ? average(masteryScores) : null;
    let secondLine = `  수행 ${logs.length}회 · 평균 즐거움 ${avgPleasure !== null ? avgPleasure.toFixed(1) : "-"} · 평균 성취감 ${avgMastery !== null ? avgMastery.toFixed(1) : "-"}`;
    if (expectedScores.length && avgPleasure !== null) {
      const avgExpected = average(expectedScores);
      const diff = avgPleasure - avgExpected;
      secondLine += `\n  예상 즐거움 평균 ${avgExpected.toFixed(1)} 대비 실제는 ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`;
    }
    return `${header}\n${secondLine}`;
  }).join("\n\n");
}

function buildAiReportSection5(checkins) {
  if (!checkins.length) return "(이번 기간 하루 마무리 기록 없음)";
  const scores = checkins.map(({ payload }) => score10(payload.expansion_score)).filter((v) => v !== null);
  const avg = scores.length ? average(scores) : null;
  const lines = [`평균 ${avg !== null ? avg.toFixed(1) : "-"}/10 (기록 ${checkins.length}일)`];
  checkins.forEach(({ row, payload }) => {
    const score = score10(payload.expansion_score);
    lines.push(`  ${row.date}: ${score !== null ? score : "-"}/10${payload.note ? ` - ${payload.note}` : ""}`);
  });
  return lines.join("\n");
}

const AI_REPORT_USAGE_NOTE = `이 문서는 마음고요 관찰과 실천 앱의 관찰 기록을 정리한 원자료 정리본입니다.
진단이나 치료 개입을 자동으로 결정하지 않으며, 상담자의 임상적 판단 아래 참고 자료로만 활용되어야 합니다.`;

// 정리본 맨 앞에 붙는 분석 요청 프롬프트입니다. 이 앱이 직접 진단·개입을 결정하지 않는다는 경계는 그대로 두되,
// 상담자가 이 정리본을 별도 AI에 붙여넣을 때 곧바로 쓸 수 있도록 요청 문구를 미리 포함해 둡니다.
const AI_REPORT_ANALYSIS_PROMPT = `아래는 내담자의 자기관찰 기록을 정리한 원자료입니다(9개 영역 요약, 관찰 기록 원자료, 재발 위험, 실천행동 효과, 삶의 경험 확장/만족도, 개인화된 안전계획, 회피 신호 추세, 관계적 촉발요인, 변화언어 비율 추세, 목표 대비 진행률 포함). 이 자료를 분석하여 아래 보고서 형식에 맞춰 작성해 주세요.

[보고서 형식]
1. 사례 개요 — 기간, 주요 경험한 문제, 전반적 패턴을 한 문단으로 요약
2. 심리학적 사례개념화(Case Formulation) — 다음 네 요인으로 구분해 서술
   - 유발요인(Predisposing factors)
   - 촉발요인(Precipitating factors)
   - 지속요인(Perpetuating factors)
   - 보호요인(Protective factors)
3. 기능분석 — 감정·생각·충동·문제행동 간의 연쇄관계 특성(관계적 촉발요인 포함)
4. 재발 위험 평가 — 재발 위험 및 재발 요소, 회피 신호 추세를 포함
5. 강점 및 자원 — 작은 실천행동의 효과, 개인화된 안전계획, 변화언어 비율 추세, 목표 대비 진행률
6. 치료적 개입 제안 — 위 분석에 근거한 구체적 개입 방향을 단기 목표와 장기 목표로 구분해 제안
7. 다음 회기를 위한 제언

조건:
- 아래 자료에 실제로 나온 수치와 서술에만 근거하고, 자료에 없는 내용을 지어내지 마세요.
- 확정적인 진단명을 붙이지 말고, 잠정적 개념화로 서술해 주세요.
- 이 분석과 제안은 상담자의 최종 임상적 판단을 대체하지 않는 참고 자료라는 점을 답변 마지막에 명시해 주세요.`;

function buildAiReportSection6() {
  const ranked = computeSafetyPlanRanked();
  if (!ranked.length) return `(도움 정도 ${SAFETY_COPING_THRESHOLD}점 이상으로 기록된 대처 사례가 없습니다.)`;
  return ranked.map((entry) => `- ${entry.coping} (평균 도움 ${entry.avg.toFixed(1)}/10, ${entry.count}회 기록${entry.latestDate ? `, 최근 ${formatDate(entry.latestDate)}` : ""})`).join("\n");
}

function buildAiReportSection7() {
  const result = computeAvoidanceTrend();
  if (!result.hasData) return "(회피 신호 기록이 없습니다.)";
  return [
    `회피 신호가 있었던 관찰: ${result.daysWithAvoidance}건 / 전체 ${result.totalDays}건`,
    `자주 나온 신호: ${result.topTags.map(([tag, count]) => `${tag} ${count}회`).join(", ")}`,
    `추세: ${result.trendText}`,
  ].join("\n");
}

function buildAiReportSection8() {
  const stats = aggregateTagHeatmapWithAction(state.observationDays, "triggerPeople");
  if (!stats.length) return "(관계적 촉발요인(trigger_people) 기록이 없습니다.)";
  const lines = stats.map((entry) => `- ${entry.tag}: ${entry.count}회, 평균 충동 ${entry.avgUrge ?? "-"}/10, 평균 문제행동수준 ${entry.avgAction ?? "-"}/5`);
  const topRisk = [...stats].sort((a, b) => (b.avgAction ?? -1) - (a.avgAction ?? -1))[0];
  const example = topRisk ? findTagExample("trigger_people", topRisk.tag) : null;
  if (example) lines.push(`예시(${formatDate(example.date)}, "${topRisk.tag}"): ${example.situation}`);
  return lines.join("\n");
}

function buildAiReportSection9() {
  const result = computeMotivationTrend();
  if (!result.hasData) return "(변화언어·유지언어로 감지된 기록이 없습니다.)";
  const lines = [`전체: 변화언어 ${result.totalChange}건 · 유지언어 ${result.totalSustain}건 (변화언어 비율 ${result.overallRatio !== null ? (result.overallRatio * 100).toFixed(0) : "-"}%)`];
  if (result.hasHalves) lines.push(`전반부 변화언어 비율 ${(result.frontRatio * 100).toFixed(0)}% → 후반부 ${(result.backRatio * 100).toFixed(0)}%`);
  lines.push(`추세: ${result.trendText}`);
  return lines.join("\n");
}

function buildAiReportSection10() {
  return computeGoalProgress().map(formatGoalRowText).join("\n");
}

function buildAiAnalysisReport(rows) {
  const parseRow = (row) => ({ row, payload: parsePayload(row.payload_json) || {} });
  const observations = rows.filter((row) => row.record_type === "observation").map(parseRow)
    .sort((a, b) => (dateOnly(a.row.date) ?? 0) - (dateOnly(b.row.date) ?? 0));
  const practiceDefs = rows.filter((row) => row.record_type === "practice_definition").map(parseRow);
  const practiceLogs = rows.filter((row) => row.record_type === "practice_log").map(parseRow);
  const checkins = rows.filter((row) => row.record_type === "daily_checkin").map(parseRow)
    .sort((a, b) => (dateOnly(a.row.date) ?? 0) - (dateOnly(b.row.date) ?? 0));

  const clientAlias = rows[0]?.client_alias || "내담자";
  const rangeText = state.rangeLabel || (state.rangeDays ? `최근 ${state.rangeDays}일` : "전체 기간");

  return [
    AI_REPORT_ANALYSIS_PROMPT,
    "",
    "=== 마음고요 관찰과 실천 — AI 분석용 정리본 ===",
    `기간: ${rangeText} · 내담자 별칭: ${clientAlias}`,
    `생성 시각: ${new Date().toISOString()}`,
    "",
    "[1. 9개 영역별 요약 통계]",
    buildAiReportSection1(observations, practiceDefs, practiceLogs, checkins),
    "",
    `[2. 관찰 기록 연쇄관계 원자료] (총 ${observations.length}건, 날짜순)`,
    buildAiReportSection2(observations),
    "",
    "[3. 재발 위험 및 요소]",
    buildAiReportSection3(rows, observations),
    "",
    "[4. 작은 실천행동의 효과]",
    buildAiReportSection4(practiceDefs, practiceLogs),
    "",
    "[5. 삶의 경험 확장/만족도]",
    buildAiReportSection5(checkins),
    "",
    "[6. 개인화된 안전계획 — 효과가 있었던 대처]",
    buildAiReportSection6(),
    "",
    "[7. 회피 신호 추세]",
    buildAiReportSection7(),
    "",
    "[8. 관계적 촉발요인]",
    buildAiReportSection8(),
    "",
    "[9. 변화언어 비율 추세]",
    buildAiReportSection9(),
    "",
    "[10. 목표 대비 진행률]",
    buildAiReportSection10(),
    "",
    "[11. 활용 안내]",
    AI_REPORT_USAGE_NOTE,
  ].join("\n");
}

function renderChainUnderstandingView() {
  const highRisk = chains((chain) => chain.actionized || chain.highUrge).slice(0, 6);
  const latent = chains(isLatentChain).slice(0, 6);
  const all = highRisk.concat(latent).slice(0, 8);
  const chainForGraph = all[0] || state.chains[0];
  const visual = visualFeedback(
    "연쇄 강도 지도",
    "한 기록 안에서 생각, 감정/몸반응, 충동, 행동화, 실천이 어디에서 커지고 작아지는지 봅니다.",
    chainForGraph ? renderChainBars(chainForGraph) : `<div class="empty">연쇄 그래프를 표시할 기록이 없습니다.</div>`,
    [
      "가장 높게 솟은 단계는 생각, 감정/몸반응, 충동, 행동화 중 어디인가요?",
      "행동화 직전 몸의 신호나 생각을 더 빨리 알아차릴 수 있었나요?",
      "충동은 낮지만 생각과 감정/몸반응이 남아 있는 잠복 연쇄가 보이나요?",
      "다음에는 어느 단계에서 개입하면 가장 현실적일까요?",
    ],
    all.length ? `<p class="muted">그래프 기준 기록: ${escapeHtml(formatDate(all[0].date))} · ${escapeHtml(all[0].chainId)}</p>` : "",
  );
  return visual + workbench([
    ["고위험 연쇄", highRisk.map((chain) => chainCard(chain, "트리거-충동-행동 연쇄", chain.actionized ? "warn" : "focus"))],
    ["저충동 잠복 연쇄", latent.map((chain) => card("충동은 낮지만 연쇄가 남아 있음", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "focus", [
      "충동이 낮아도 부정감정과 비합리적 사고가 남아 있는지 봅니다.",
      "도박중독 초기처럼 긴장 완화 뒤 회복행동이 약해지는 구간을 확인합니다.",
      "회피대처가 재발의 준비단계가 되지 않는지 점검합니다.",
    ]))],
    ["촉발단서 분석", [triggerHeatmapCard()]],
    ["관계적 촉발요인", [buildRelationalTriggerCard()]],
    ["시간대·요일 위험 패턴", [buildTimeRiskPatternCard()]],
    ["반복되는 생각 패턴", [buildRepeatedThoughtCard()]],
    ["연쇄 질문", all.map((chain) => card("상담자 탐색 질문", `<p><strong>생각</strong>: ${escapeHtml(texts(chain, "thought") || "기록 없음")}</p><p><strong>감정/몸</strong>: ${escapeHtml(texts(chain, "emotion") || "기록 없음")}</p>`, "focus", [
      "트리거는 무엇이었나요?",
      "행동화 직전 마음속 문장은 무엇이었나요?",
      "몸에서 가장 먼저 온 신호는 무엇이었나요?",
      "다음에는 어느 지점에서 개입할 수 있을까요?",
    ]))],
    ["CBT 검토", [card("자동사고 검토", "", "focus", [
      "이 생각의 증거와 반대증거는?",
      "이 생각을 100% 믿으면 어떤 행동이 따라오는가?",
      "사용하지 않는 쪽의 균형 생각은?",
      "고위험 상황을 피하거나 바꾸는 계획은?",
    ])]],
  ]);
}

function renderSuccessView() {
  const success = chains(isControlled).slice(0, 6);
  const partial = chains(isPartialSuccess).slice(0, 6);
  const coping = chains((chain) => texts(chain, "practice")).slice(0, 6);
  const visual = visualFeedback(
    "감정 감내력과 부분변화",
    "불편함·고통·지루함·흥분·충동이 남아 있어도 즉시 회피하지 않거나 행동화 강도가 낮아진 지점을 회복의 증거로 시각화합니다.",
    renderTrendSvg(state.chains.slice().reverse().filter((chain) => chain.highUrge || isPartialSuccess(chain) || texts(chain, "practice")), { only: ["urge", "action", "practice"] }),
    [
      "불편함이나 충동은 높았지만 행동화 선이 낮아진 지점이 있나요?",
      "그 지점에서 어떤 대처나 실천이 함께 있었나요?",
      "완전한 무증상이 아니어도 강도 감소를 변화로 인정할 수 있나요?",
      "다음 주에도 이 차이를 재현하려면 어떤 조건이 필요할까요?",
    ],
    "",
    ["urge", "action", "practice"],
  );
  return visual + workbench([
    ["성공-실패 대조", [buildSuccessFailureContrastCard()]],
    ["감정 감내력 기록", success.map((chain) => chainCard(chain, "불편함과 충동을 감내한 기록", "ok"))],
    ["강도감소 성공", partial.map((chain) => card("성중독/반복충동 변화 피드백", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["성충동이나 생각이 남아 있어도 행동 강도가 낮아진 점을 변화로 피드백합니다.", "완전한 무증상보다 빈도·강도·지속시간·회복시간의 변화를 봅니다.", "무엇이 강도를 낮추는 데 도움이 되었는지 구체화합니다."]))],
    ["도움된 조건", coping.map((chain) => card("보호요인 후보", `<p>${texts(chain, "practice") || "기록 없음"}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["어떤 조건이 행동화를 낮췄는가?", "다음 주에도 재현할 수 있는가?", "누가/무엇이 보호요인이 되었는가?"]))],
    ["강화 문장", [card("상담자 반영", "", "ok", ["충동이 사라져서가 아니라, 불편함·지루함·흥분·충동이 있는 상태에서 즉시 회피하지 않은 점을 강화합니다.", "결과보다 감내한 과정과 조건을 구체적으로 반영합니다.", "다음 주 반복 가능한 작은 행동으로 연결합니다."])]],
  ]);
}

function renderValuePracticeView() {
  const groups = groupPractice();
  const performanceCards = groups.slice(0, 8).map((group) => {
    const kind = group.misses ? "warn" : "ok";
    return card(group.name, `${practiceStatsHtml(group)}${pleasureMasteryHtml(group)}<p>${escapeHtml(group.sample || "메모 없음")}</p>`, kind, [
      "과제가 너무 큰가?",
      "언제, 어디서, 무엇을 할지 충분히 구체적인가?",
      "이 행동은 어떤 가치와 연결되는가?",
      "다음 주에는 더 작은 1% 행동으로 만들 것인가?",
    ]);
  });
  const smallWins = chains(isControlled)
    .concat(chains((chain) => chain.scores.practice !== null && chain.scores.practice > state.thresholds.practice))
    .slice(0, 6);
  const valueChains = chains((chain) => texts(chain, "practice") || valueWords(chain.text)).slice(0, 6);
  const maintenance = chains(isMotivationDip).slice(0, 6);
  const surprises = pleasureSurpriseRecords(6);

  const visual = visualFeedback(
    "가치기반 실천 흐름",
    "실천행동은 위기 탈출 기술이 아니라 삶의 방향을 만드는 반복 경험입니다.",
    renderTrendSvg(state.chains.slice().reverse(), { only: ["urge", "practice"] }),
    [
      "실천행동이 올라간 뒤 충동이나 문제행동수준이 달라진 지점이 있나요?",
      "충동이 낮아지면서 실천도 낮아진 회복 유지 위험 구간이 있나요?",
      "0이 아니라 1이 된 작은 행동은 무엇인가요?",
      "다음 주 가치 쪽으로 움직이는 1% 행동은 무엇인가요?",
    ],
    renderBarSummary(groups.slice(0, 4).map((group) => [group.name.slice(0, 8), group.plannedAverage === null ? 0 : group.plannedAverage * 10, group.misses ? "warn" : "ok"])),
    ["urge", "practice"],
  );
  return visual + workbench([
    ["실천 수행도", performanceCards],
    ["실천 재설계", [
      card("실천행동 조정 필요를 다루는 태도", `<p><strong>저수행은 실패 판정이 아니라 과제 크기와 생활 조건을 다시 맞추라는 자료입니다.</strong></p><p>상담자는 내담자가 위축되지 않도록 “이 행동을 못 한 이유”보다 “다음에는 성공 가능성을 높이려면 얼마나 작아져야 하는가”를 먼저 묻습니다.</p>`, "focus", [
        "이 행동을 10분에서 2분으로 줄이면 무엇이 남나요?",
        "실패하지 않기 위해서가 아니라 새로운 경험을 해보기 위해 무엇을 아주 작게 시도할까요?",
        "이 행동을 한 번이라도 하면 나에 대한 생각이 어떻게 달라질 수 있을까요?",
      ]),
      card("새 경험이 생각을 바꾸는 경로", `<p>가치 기반 실천은 단순 숙제가 아니라 <strong>새로운 경험 → 자기효능감 → 자동사고 수정 → 가치 있는 생활 습관</strong>으로 이어지는 회복 훈련입니다.</p><p>작은 행동의 효과는 즉시 기분이 좋아지는 것만이 아니라, “나는 조금이라도 움직일 수 있다”는 근거를 만드는 데 있습니다.</p>`, "ok", [
        "이 작은 행동이 반복되면 어떤 삶의 방향이 조금 넓어질까요?",
        "충동이나 무기력 속에서도 실행했다면, 그 경험은 어떤 새로운 생각을 만들까요?",
        "다음 주에는 결과보다 실행 경험 자체를 어떻게 기록할까요?",
      ]),
    ]],
    ["회복 정체성", [recoveryIdentityCard(), lifeRecoveryCard()]],
    ["예상보다 좋았던 실천", surprises.length
      ? surprises.map(pleasureSurpriseCard)
      : [card("아직 뚜렷한 예상-경험 차이 없음", "<p>practice_log에 expected_pleasure_score/expected_mastery_score가 기록되고, 실제 값이 예상보다 2점 이상 높을 때 여기에 표시됩니다.</p>", "focus")]],
    ["가치 연결 실천", valueChains.map((chain) => card("ACT 가치 방향", `<p>${escapeHtml(texts(chain, "practice") || chainSummary(chain))}</p>`, "focus", [
      "이 행동은 어떤 삶의 방향과 연결되어 있나요?",
      "고통을 피하는 쪽인가, 삶을 넓히는 쪽인가?",
      "그 가치 쪽으로 1% 움직이는 다음 행동은 무엇인가요?",
    ]))],
    ["작은 성공 경험", smallWins.map((chain) => card("0이 아닌 1", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", [
      "완벽하지 않아도 시도한 부분을 찾습니다.",
      "새로운 생각이나 자기효능감 단서를 확인합니다.",
      "다음 주에도 재현 가능한 조건을 찾습니다.",
    ]))],
    ["회복 유지 위험", maintenance.map((chain) => chainCard(chain, "좋아졌기 때문에 유지해야 할 행동", "focus")).concat([card("다음 주 1% 행동", "", "focus", [
      "충동이 낮아져도 유지해야 할 회복행동은 무엇인가요?",
      "너무 큰 과제는 2분 행동으로 줄입니다.",
      "언제, 어디서, 무엇을 할지 구체화합니다.",
      "내담자의 가치 언어로 과제 이름을 붙입니다.",
    ])])],
  ]);
}

const PREDICTION_STATUS_LABELS = {
  pending: "확인 전",
  occurred: "실제로 일어남",
  partial: "부분적으로 그러함",
  did_not_occur: "일어나지 않음",
};
const PREDICTION_STATUS_KIND = {
  pending: "focus",
  occurred: "warn",
  partial: "focus",
  did_not_occur: "ok",
};

// 예측(prediction)은 "실제로 일어난 비율"과 "예상 심각도 대비 실제 심각도 차이"로 요약합니다.
// 명세서 권장 계산: occurred / (occurred + partial + did_not_occur)
function predictionAccuracyStats(predictions) {
  const resolved = predictions.filter((p) => p.status !== "pending");
  const occurredCount = predictions.filter((p) => p.status === "occurred").length;
  const partialCount = predictions.filter((p) => p.status === "partial").length;
  const didNotOccurCount = predictions.filter((p) => p.status === "did_not_occur").length;
  const denom = occurredCount + partialCount + didNotOccurCount;
  const occurredRatio = denom ? occurredCount / denom : null;
  const gaps = resolved
    .filter((p) => p.predictedSeverity !== null && p.actualSeverity !== null)
    .map((p) => p.predictedSeverity - p.actualSeverity);
  return { resolvedCount: resolved.length, occurredCount, partialCount, didNotOccurCount, occurredRatio, avgGap: average(gaps) };
}

function predictionCard(prediction) {
  const relatedChain = state.chains.find((chain) => chain.chainId === `observation-${prediction.relatedObservationId}`);
  const context = relatedChain ? texts(relatedChain, "situation") : "";
  const hasBoth = prediction.predictedSeverity !== null && prediction.actualSeverity !== null;
  const gap = hasBoth ? prediction.predictedSeverity - prediction.actualSeverity : null;
  const severityLine = hasBoth
    ? `<p>예상 심각도 ${prediction.predictedSeverity}/10 → 실제 ${prediction.actualSeverity}/10 (예상이 실제보다 ${gap >= 0 ? `${gap}점 높음` : `${Math.abs(gap)}점 낮음`})</p>`
    : `<p>예상 심각도 ${prediction.predictedSeverity ?? "-"}/10${prediction.status === "pending" ? " · 아직 확인 전" : " · 실제 심각도 기록 없음"}</p>`;
  return card(
    `${escapeHtml(formatDate(prediction.createdAt))} · ${PREDICTION_STATUS_LABELS[prediction.status]}`,
    `${context ? `<p class="muted">상황: ${escapeHtml(context)}</p>` : ""}<p><strong>걱정</strong>: ${escapeHtml(prediction.worryText || "기록 없음")}</p>${severityLine}${prediction.note ? `<p>${escapeHtml(prediction.note)}</p>` : ""}`,
    PREDICTION_STATUS_KIND[prediction.status] || "focus",
    ["실제 결과와 비교했을 때 이 예측은 어느 정도 정확했나요?", "이런 걱정 패턴이 다른 상황에서도 반복되나요?", "다음에 비슷한 걱정이 들 때 무엇을 먼저 확인해볼까요?"],
  );
}

function renderPredictionView() {
  if (!state.predictions.length) {
    return workbench([["안내", [card("예기불안 검증 기록 없음", "<p>이 CSV에는 예기불안 검증(prediction) 기록이 없습니다.</p>", "focus")]]]);
  }

  const stats = predictionAccuracyStats(state.predictions);
  const pending = state.predictions.filter((p) => p.status === "pending");
  const occurred = state.predictions.filter((p) => p.status === "occurred");
  const partial = state.predictions.filter((p) => p.status === "partial");
  const didNotOccur = state.predictions.filter((p) => p.status === "did_not_occur");

  const visual = visualFeedback(
    "예기불안 예상 vs 실제 결과",
    "예상한 파국이나 재발이 실제로 얼마나 일어났는지 비교하면, 불안과 자기불신의 예측 패턴을 구체적인 근거로 다룰 수 있습니다.",
    renderBarSummary([
      ["일어남", occurred.length * 14, "warn"],
      ["부분적", partial.length * 14, "focus"],
      ["안 일어남", didNotOccur.length * 14, "ok"],
      ["확인 전", pending.length * 14, "focus"],
    ]),
    [
      stats.occurredRatio !== null ? `확인된 예측 중 실제로 일어난 비율은 ${Math.round(stats.occurredRatio * 100)}%입니다.` : "아직 상태가 확인된 예측이 없습니다.",
      stats.avgGap !== null ? `예상 심각도가 실제보다 평균 ${stats.avgGap.toFixed(1)}점 ${stats.avgGap >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
      "이 비율과 차이를 내담자와 함께 보며, 다음 걱정이 들 때 참고할 근거로 씁니다.",
    ].filter(Boolean),
  );

  return visual + workbench([
    ["확인 전", pending.map(predictionCard)],
    ["실제로 일어남", occurred.map(predictionCard)],
    ["부분적으로 그러함", partial.map(predictionCard)],
    ["일어나지 않음", didNotOccur.map(predictionCard)],
  ]);
}

// 상담자가 사이드바에 입력한 목표치(회복 목표)와 이번 기간 실제 값을 비교합니다.
// "위험 기준"은 경고를 띄우는 임계값이고, 이건 "이번 기간에 도달하고 싶은 목표"라 성격이 다릅니다.
// 충동/문제행동/실천완료율/경험 확장 평균 — 목표 대비 진행률과 지난 회기 비교가 공유하는 핵심 집계입니다.
function computeCoreAverages() {
  const urgeScores = state.observationDays.map((day) => day.urgeScore).filter((v) => v !== null);
  const actionScores = state.observationDays.map((day) => day.actionLevel).filter((v) => v !== null);
  const avgUrge = urgeScores.length ? average(urgeScores) : null;
  const avgAction = actionScores.length ? average(actionScores) : null;

  const activeGroups = groupPractice().filter((group) => group.plannedTotal);
  const totalPlanned = activeGroups.reduce((sum, group) => sum + (group.plannedTotal || 0), 0);
  const totalCompleted = activeGroups.reduce((sum, group) => sum + (group.completedCount || 0), 0);
  const practiceRate = totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) : null;

  const expansionScores = state.dailyCheckins.map((entry) => entry.expansionScore).filter((v) => v !== null);
  const avgExpansion = expansionScores.length ? average(expansionScores) : null;

  return { avgUrge, avgAction, practiceRate, avgExpansion };
}

function computeGoalProgress() {
  const urgeGoal = clamp(Number(els.urgeGoalInput?.value), 0, 10, 5);
  const actionGoal = clamp(Number(els.actionGoalInput?.value), 0, 5, 1);
  const practiceGoal = clamp(Number(els.practiceGoalInput?.value), 0, 100, 70);
  const expansionGoal = clamp(Number(els.expansionGoalInput?.value), 0, 10, 6);

  const { avgUrge, avgAction, practiceRate, avgExpansion } = computeCoreAverages();

  return [
    { label: "충동 평균(낮을수록 좋음)", actual: avgUrge, goal: urgeGoal, unit: "", higherIsBetter: false },
    { label: "문제행동 활성화 수준 평균(낮을수록 좋음)", actual: avgAction, goal: actionGoal, unit: "", higherIsBetter: false },
    { label: "실천 완료율(높을수록 좋음)", actual: practiceRate, goal: practiceGoal, unit: "%", higherIsBetter: true },
    { label: "삶의 경험 확장/만족도 평균(높을수록 좋음)", actual: avgExpansion, goal: expansionGoal, unit: "", higherIsBetter: true },
  ];
}

function goalRowParts(item) {
  const { actual, goal, higherIsBetter } = item;
  if (actual === null) return null;
  const achieved = higherIsBetter ? actual >= goal : actual <= goal;
  const diff = higherIsBetter ? actual - goal : goal - actual;
  return { achieved, diffAbs: Math.abs(diff) };
}

function formatGoalRowHtml(item) {
  const { label, actual, goal, unit } = item;
  if (actual === null) return `<li>${label}: 이번 기간 기록 없음 (목표 ${goal}${unit})</li>`;
  const { achieved, diffAbs } = goalRowParts(item);
  const diffText = achieved ? `목표 대비 ${diffAbs.toFixed(1)}${unit} 여유` : `목표까지 ${diffAbs.toFixed(1)}${unit} 남음`;
  return `<li>${label}: 이번 기간 ${actual.toFixed(1)}${unit} / 목표 ${goal}${unit} — <strong>${achieved ? "달성" : "미달"}</strong> (${diffText})</li>`;
}

function formatGoalRowText(item) {
  const { label, actual, goal, unit } = item;
  if (actual === null) return `- ${label}: 이번 기간 기록 없음 (목표 ${goal}${unit})`;
  const { achieved, diffAbs } = goalRowParts(item);
  const diffText = achieved ? `목표 대비 ${diffAbs.toFixed(1)}${unit} 여유` : `목표까지 ${diffAbs.toFixed(1)}${unit} 남음`;
  return `- ${label}: 이번 기간 ${actual.toFixed(1)}${unit} / 목표 ${goal}${unit} — ${achieved ? "달성" : "미달"} (${diffText})`;
}

function buildGoalProgressCard() {
  const items = computeGoalProgress().map(formatGoalRowHtml).join("");

  return card(
    "목표 대비 진행률",
    `<p>사이드바 "회복 목표"에서 설정한 값과 이번 기간 실제 평균을 비교합니다. 목표는 상담 중 언제든 조정할 수 있습니다.</p><ul>${items}</ul>`,
    "focus",
  );
}

function renderSessionFeedbackSummaryView() {
  const risky = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3);
  const latent = chains(isLatentChain).slice(0, 3);
  const success = chains(isControlled).concat(chains(isPartialSuccess)).slice(0, 4);
  const maintenance = chains(isMotivationDip).slice(0, 3);
  const changeTalk = detectMotivation("change").slice(0, 3);
  const visual = visualFeedback(
    "회기 통합·다음 주 실험 설계 그래프",
    "오늘 회기에서 발견한 위험과 변화, 다음 주에 계속 볼 측정치를 한 번 더 정리합니다.",
    renderTrendSvg(state.chains.slice().reverse()),
    [
      "이번 회기에서 가장 중요한 위험 신호는 어느 지점이었나요?",
      "그래프에서 변화가 시작된 지점은 어디였나요?",
      "다음 주에는 충동, 행동화, 실천 중 무엇을 가장 중점적으로 볼까요?",
      "다음 주 30초 호흡 과제와 1% 가치행동을 어떻게 기록할까요?",
    ],
    renderBarSummary([
      ["위험", risky.length * 25, "warn"],
      ["잠복", latent.length * 25, "focus"],
      ["성공", success.length * 20, "ok"],
      ["유지위험", maintenance.length * 25, "warn"],
    ]),
    ["urge", "action", "practice"],
  );
  return visual + workbench([
    ["오늘의 위험", risky.map((chain) => chainCard(chain, "고위험 연쇄", "warn")).concat(latent.map((chain) => chainCard(chain, "저충동 잠복 연쇄", "focus")))],
    ["오늘의 변화", success.map((chain) => chainCard(chain, isPartialSuccess(chain) ? "강도감소 성공" : "감정 감내력", "ok")).concat(changeTalk.map((item) => recordCard(item.record, item.label, "ok")))],
    ["회복 유지", maintenance.map((chain) => chainCard(chain, "회복 유지 위험", "focus"))],
    ["삶의 의미", [recoverySentenceCard(), recoveryIdentityCard()]],
    ["다음 주 계획", [buildGoalProgressCard(), card("회기 통합·다음 주 실험 설계", `<p>상담기록·비교 요약 파일에는 원본 CSV가 저장되지 않고 현재 분석 요약과 상담 메모만 저장됩니다.</p>`, "focus", [
      "다음 주 첫 번째로 확인할 위험 신호는 무엇인가?",
      "다시 재현할 작은 성공 조건은 무엇인가?",
      "위기 때 사용할 30초 마음챙김 호흡 과제는 무엇인가?",
      "가치 쪽으로 움직이는 1% 실천행동은 무엇인가?",
    ])]],
  ]);
}

function renderReflectionDaily() {
  if (!els.reflectionDailyList) return;
  if (!state.reflectionDays.length) {
    els.reflectionDailyList.innerHTML = `<p class="muted">CSV를 불러오면 기록이 있는 날짜별로 자동 생성됩니다.</p>`;
    return;
  }
  els.reflectionDailyList.innerHTML = state.reflectionDays.map((day, index) => `
    <article class="reflection-item">
      <div class="reflection-item-head">
        <strong>${escapeHtml(day.date)}</strong>
        <button type="button" class="secondary small" data-copy-reflection="${index}">복사</button>
      </div>
      <pre>${escapeHtml(day.text)}</pre>
    </article>
  `).join("");
}

function renderChains() {
  if (!state.chains.length) {
    els.chainList.innerHTML = renderEmpty();
    return;
  }

  els.chainList.innerHTML = state.chains.slice(0, 20).map((chain) => `
    <article class="chain">
      <div class="chain-head">
        <div>
          <strong>${escapeHtml(chain.client)} · ${escapeHtml(chain.chainId)}</strong>
          <div class="muted">${formatDate(chain.date)} · ${chain.records.length}개 기록</div>
        </div>
        <div class="tag-row">${riskTags(chain)}</div>
      </div>
      <div class="chain-steps">
        ${Object.keys(CATEGORY_LABELS).map((category) => `
          <section class="step">
            <h3>${CATEGORY_LABELS[category]}</h3>
            ${chain.steps[category].length ? chain.steps[category].map((record) => `<p>${escapeHtml(record.content || record.title)}</p>${category === "urge" ? renderUrgeCurveSvg(record.sourceScores || {}) : ""}`).join("") : `<p class="muted">기록 없음</p>`}
          </section>
        `).join("")}
      </div>
    </article>
  `).join("");
}

  // 충동곡선(시작→정점→종료)이 기록된 경우에만 작은 SVG로 표시합니다. "감정/충동 발생 시점" 모드에서만 선택적으로 기록되는 값이라
// 없는 경우가 대부분이며, 그때는 빈 문자열을 반환해 기존 텍스트 표시만 남습니다.
function renderUrgeCurveSvg(scores) {
  const hasStart = scores.urgeInitialScore !== null && scores.urgeInitialScore !== undefined;
  const hasEnd = scores.urgeEndScore !== null && scores.urgeEndScore !== undefined;
  // urge_score(정점)는 거의 항상 존재하는 필수값이라, 시작·종료가 둘 다 있을 때만 "곡선"으로 취급합니다.
  // 명세서: "두 필드가 비어 있으면 그 기록에는 곡선 정보가 없다는 뜻".
  if (!hasStart || !hasEnd) return "";
  const points = [scores.urgeInitialScore, scores.urgeScore, scores.urgeEndScore];
  const width = 160;
  const height = 64;
  const left = 10;
  const right = 10;
  const top = 8;
  const bottom = 18;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const labels = ["시작", "정점", "종료"];
  const xFor = (index) => left + (index / 2) * plotW;
  const yFor = (value) => top + plotH - (Math.max(0, Math.min(10, value)) / 10) * plotH;
  const validPoints = points.map((value, index) => (value === null || value === undefined ? null : [xFor(index), yFor(value)]));
  const path = validPoints
    .map((point, index) => (point ? `${index === 0 || !validPoints[index - 1] ? "M" : "L"}${point[0]},${point[1]}` : ""))
    .filter(Boolean)
    .join(" ");
  const circles = validPoints.filter(Boolean).map((point) => `<circle class="chart-point" cx="${point[0]}" cy="${point[1]}" r="3" stroke="#b65333"></circle>`).join("");
  const labelsHtml = labels.map((label, index) => `<text class="chart-label" x="${xFor(index) - 8}" y="${height - 4}" font-size="9">${label}</text>`).join("");
  return `<svg class="urge-curve" viewBox="0 0 ${width} ${height}" role="img" aria-label="충동 곡선(시작-정점-종료)">
    <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
    <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
    <path class="chart-line-urge" d="${path}"></path>
    ${circles}
    ${labelsHtml}
  </svg>`;
}

function chainCard(chain, title, kind) {
  return card(title, `<p><strong>${escapeHtml(formatDate(chain.date))}</strong> · ${escapeHtml(chain.chainId)}</p><p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p><div class="tag-row">${riskTags(chain)}</div>`, kind);
}

function recordCard(record, title, kind, questions = []) {
  return card(title, `<p><strong>${escapeHtml(formatDate(record.createdAt))}</strong> · ${escapeHtml(CATEGORY_LABELS[record.category] || record.category)}</p><p>${escapeHtml(record.content || record.title)}</p>`, kind, questions);
}

function weekStartTs(dateTs) {
  const day = new Date(dateTs).getUTCDay();
  const offset = (day + 6) % 7;
  return dateTs - offset * DAY_MS;
}

function ensureWeeklyBucket(map, dateTs) {
  const startTs = weekStartTs(dateTs);
  if (!map.has(startTs)) {
    map.set(startTs, {
      startTs,
      urge: [],
      action: [],
      practiceScore: [],
      pleasure: [],
      mastery: [],
      expansion: [],
      practiceLogs: 0,
      completedCount: 0,
      highRiskCount: 0,
    });
  }
  return map.get(startTs);
}

function recordDateTs(record) {
  if (record.date) {
    const ts = dateOnly(record.date);
    if (ts !== null) return ts;
  }
  if (record.createdAt instanceof Date && !Number.isNaN(record.createdAt.getTime())) {
    return dateOnly(record.createdAt.toISOString());
  }
  return null;
}

function computeWeeklyStats() {
  const map = new Map();
  state.observationDays.forEach((day) => {
    if (day.dateTs === null || day.dateTs === undefined) return;
    const bucket = ensureWeeklyBucket(map, day.dateTs);
    if (day.urgeScore !== null) bucket.urge.push(day.urgeScore);
    if (day.actionLevel !== null) bucket.action.push(day.actionLevel);
    if ((day.urgeScore ?? 0) >= state.thresholds.urge || (day.actionLevel ?? 0) >= state.thresholds.action) bucket.highRiskCount += 1;
  });

  state.records.filter((record) => record.category === "practice").forEach((record) => {
    const ts = recordDateTs(record);
    if (ts === null) return;
    const bucket = ensureWeeklyBucket(map, ts);
    const scores = record.sourceScores || {};
    const practiceScore = score10(scores.practiceScore ?? record.intensity);
    const pleasureScore = score10(scores.pleasureScore);
    const masteryScore = score10(scores.masteryScore);
    if (practiceScore !== null) bucket.practiceScore.push(practiceScore);
    if (pleasureScore !== null) bucket.pleasure.push(pleasureScore);
    if (masteryScore !== null) bucket.mastery.push(masteryScore);
    bucket.practiceLogs += 1;
    bucket.completedCount += Number(scores.completedCount) || 0;
  });

  state.dailyCheckins.forEach((day) => {
    if (day.dateTs === null || day.dateTs === undefined || day.expansionScore === null) return;
    ensureWeeklyBucket(map, day.dateTs).expansion.push(day.expansionScore);
  });

  return [...map.values()].sort((a, b) => a.startTs - b.startTs).map((week, index, weeks) => {
    const prev = index ? weeks[index - 1] : null;
    const avgUrge = average(week.urge);
    const avgAction = average(week.action);
    const avgPractice = average(week.practiceScore.length ? week.practiceScore : week.pleasure.concat(week.mastery));
    const avgPleasure = average(week.pleasure);
    const avgMastery = average(week.mastery);
    const avgExpansion = average(week.expansion);
    const prevUrge = prev ? average(prev.urge) : null;
    const prevAction = prev ? average(prev.action) : null;
    const prevPractice = prev ? average(prev.practiceScore.length ? prev.practiceScore : prev.pleasure.concat(prev.mastery)) : null;
    return {
      ...week,
      label: `${formatDate(new Date(week.startTs)).slice(5)}~${formatDate(new Date(week.startTs + 6 * DAY_MS)).slice(5)}`,
      avgUrge,
      avgAction,
      avgPractice,
      avgPleasure,
      avgMastery,
      avgExpansion,
      urgeDelta: avgUrge !== null && prevUrge !== null ? Math.round((avgUrge - prevUrge) * 10) / 10 : null,
      actionDelta: avgAction !== null && prevAction !== null ? Math.round((avgAction - prevAction) * 10) / 10 : null,
      practiceDelta: avgPractice !== null && prevPractice !== null ? Math.round((avgPractice - prevPractice) * 10) / 10 : null,
    };
  });
}

function renderWeeklyStatsGraph() {
  const weeks = computeWeeklyStats().slice(-12);
  if (!weeks.length) return `<div class="empty">주별로 묶을 날짜 기록이 아직 없습니다.</div>`;
  const width = 760;
  const height = 280;
  const left = 48;
  const right = 20;
  const top = 24;
  const bottom = 56;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const xFor = (index) => left + (weeks.length === 1 ? plotW / 2 : (index / (weeks.length - 1)) * plotW);
  const yFor = (value) => top + plotH - (Math.max(0, Math.min(10, value)) / 10) * plotH;
  const series = [
    ["chart-line-urge", "#b65333", (week) => week.avgUrge],
    ["chart-line-action", "#6a5acd", (week) => week.avgAction === null ? null : week.avgAction * 2],
    ["chart-line-practice", "#2f7b4f", (week) => week.avgPractice],
  ];
  const grid = [0, 2.5, 5, 7.5, 10].map((value) => {
    const y = yFor(value);
    return `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text class="chart-tick" x="12" y="${y + 4}">${value}</text>`;
  }).join("");
  const lines = series.map(([className, color, getter]) => {
    const points = weeks.map((week, index) => {
      const value = getter(week);
      return value === null || value === undefined ? null : [xFor(index), yFor(value)];
    });
    const path = points.map((point, index) => {
      if (!point) return "";
      return `${index === 0 || !points[index - 1] ? "M" : "L"}${point[0]},${point[1]}`;
    }).filter(Boolean).join(" ");
    const circles = points.filter(Boolean).map((point) => `<circle class="chart-point" cx="${point[0]}" cy="${point[1]}" r="4" stroke="${color}"></circle>`).join("");
    return path ? `<path class="${className}" d="${path}"></path>${circles}` : "";
  }).join("");
  const labels = weeks.map((week, index) => `<text class="chart-label weekly-label" x="${Math.max(8, xFor(index) - 30)}" y="${height - 22}">${escapeHtml(week.label)}</text>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="주별 측정치 변화 그래프">
    ${grid}
    <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
    <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
    ${lines}
    ${labels}
  </svg>`;
}

function formatDelta(value, lowerIsBetter = false) {
  if (value === null) return "-";
  const better = lowerIsBetter ? value < 0 : value > 0;
  const same = value === 0;
  return `<span class="${same ? "" : better ? "delta-good" : "delta-warn"}">${value > 0 ? "+" : ""}${value.toFixed(1)}</span>`;
}

function renderWeeklyStatsTable() {
  const weeks = computeWeeklyStats().slice(-8);
  if (!weeks.length) return `<p class="muted">주별 요약을 만들 날짜 기록이 아직 없습니다.</p>`;
  const rows = weeks.map((week) => `
    <tr>
      <td>${escapeHtml(week.label)}</td>
      <td>${week.avgUrge === null ? "-" : week.avgUrge.toFixed(1)} ${formatDelta(week.urgeDelta, true)}</td>
      <td>${week.avgAction === null ? "-" : week.avgAction.toFixed(1)} ${formatDelta(week.actionDelta, true)}</td>
      <td>${week.practiceLogs}건 / 완료 ${week.completedCount}</td>
      <td>${week.avgMastery === null ? "-" : week.avgMastery.toFixed(1)}</td>
      <td>${week.avgExpansion === null ? "-" : week.avgExpansion.toFixed(1)}</td>
      <td>${week.highRiskCount}</td>
    </tr>
  `).join("");
  return `<div class="weekly-table-wrap"><table class="weekly-table">
    <thead><tr><th>주차</th><th>충동</th><th>문제행동</th><th>실천</th><th>성취감</th><th>경험 확장</th><th>위험기록</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function visualFeedback(title, subtitle, mainHtml, prompts = [], sideHtml = "", legendKeys = null) {
  return `<div class="visual-feedback">
    <section class="visual-card">
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(subtitle)}</p>
      ${mainHtml}
      ${legendHtml(legendKeys)}
    </section>
    <section class="visual-card">
      <h3>그래프 기반 질문</h3>
      ${sideHtml}
      <ul class="feedback-prompts">${prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ul>
    </section>
  </div>`;
}

function legendHtml(keys) {
  // keys가 없으면(막대 요약 등 색상선이 없는 시각화) 범례를 표시하지 않습니다.
  // 실제로 그려진 선(options.only)과 다른 범례가 표시되는 것을 막기 위해 항상 키를 명시적으로 받습니다.
  if (!keys || !keys.length) return "";
  const items = {
    urge: ["#b65333", "충동"],
    action: ["#6a5acd", "문제행동수준"],
    practice: ["#2f7b4f", "실천"],
  };
  return `<div class="chart-legend">${keys
    .filter((key) => items[key])
    .map((key) => `<span><i class="legend-dot" style="background:${items[key][0]}"></i>${items[key][1]}</span>`)
    .join("")}</div>`;
}

function renderTrendSvg(chainsToShow = state.chains.slice().reverse(), options = {}) {
  const chains = chainsToShow.filter((chain) => chain.date).slice(-12);
  if (!chains.length) return `<div class="empty">그래프로 표시할 날짜 기록이 아직 충분하지 않습니다.</div>`;
  const width = 720;
  const height = 260;
  const left = 46;
  const right = 20;
  const top = 22;
  const bottom = 46;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const xFor = (index) => left + (chains.length === 1 ? plotW / 2 : (index / (chains.length - 1)) * plotW);
  const yFor = (value) => top + plotH - (Math.max(0, Math.min(10, value)) / 10) * plotH;
  const series = [
    ["urge", "chart-line-urge", "#b65333", (chain) => chain.scores.urge],
    ["action", "chart-line-action", "#6a5acd", (chain) => chain.scores.action === null ? null : chain.scores.action * 2],
    ["practice", "chart-line-practice", "#2f7b4f", (chain) => chain.scores.practice],
  ].filter(([key]) => !options.only || options.only.includes(key));

  const grid = [0, 2.5, 5, 7.5, 10].map((value) => {
    const y = yFor(value);
    return `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text class="chart-tick" x="12" y="${y + 4}">${value}</text>`;
  }).join("");

  const lines = series.map(([key, className, color, getter]) => {
    const points = chains.map((chain, index) => {
      const value = getter(chain);
      return value === null || value === undefined ? null : [xFor(index), yFor(value), value];
    });
    const path = points.map((point, index) => {
      if (!point) return "";
      const prefix = index === 0 || !points[index - 1] ? "M" : "L";
      return `${prefix}${point[0]},${point[1]}`;
    }).filter(Boolean).join(" ");
    const circles = points.filter(Boolean).map((point) => `<circle class="chart-point" cx="${point[0]}" cy="${point[1]}" r="4" stroke="${color}"></circle>`).join("");
    return path ? `<path class="${className}" d="${path}"></path>${circles}` : "";
  }).join("");

  const labels = chains.map((chain, index) => `<text class="chart-label" x="${Math.max(8, xFor(index) - 24)}" y="${height - 18}">${escapeHtml(formatDate(chain.date).slice(5))}</text>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="측정치 흐름 그래프">
    ${grid}
    <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
    <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
    ${lines}
    ${labels}
  </svg>`;
}

function renderChainBars(chain) {
  const items = [
    ["생각", chain.scores.thought],
    ["감정/몸", chain.scores.emotion],
    ["충동", chain.scores.urge],
    ["문제행동수준", chain.scores.action === null ? null : chain.scores.action * 2],
    ["실천", chain.scores.practice],
  ];
  return `<div class="bar-list">${items.map(([label, value]) => {
    const width = value === null ? 0 : Math.max(0, Math.min(100, value * 10));
    return `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><strong>${value === null ? "-" : Math.round(value)}</strong></div>`;
  }).join("")}</div>`;
}

function renderBarSummary(items) {
  return `<div class="bar-list">${items.map(([label, value, kind]) => {
    const width = Math.max(0, Math.min(100, Number(value) || 0));
    const color = kind === "warn" ? "#b65333" : kind === "ok" ? "#2f7b4f" : "#176b5b";
    return `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div><strong>${Math.round(value)}</strong></div>`;
  }).join("")}</div>`;
}

// 감정×충동 산점도. viewBox 300x300, 좌/하단 여백 34px, 상/우 여백 20px, 점 반지름 6px, 불투명도 0.55(명세서 §1-3).
function emotionUrgeScatterSvg(points) {
  if (!points.length) return `<div class="empty">아직 산점도로 볼 관찰 기록이 없습니다.</div>`;
  const left = 34;
  const right = 20;
  const top = 20;
  const bottom = 34;
  const size = 300;
  const plotW = size - left - right;
  const plotH = size - top - bottom;
  const xFor = (v) => left + (v / 10) * plotW;
  const yFor = (v) => (size - bottom) - (v / 10) * plotH;
  const ticks = [0, 2, 4, 6, 8, 10];

  const gridLines = ticks.map((t) => `
    <line class="chart-grid" x1="${xFor(t)}" y1="${top}" x2="${xFor(t)}" y2="${size - bottom}"></line>
    <line class="chart-grid" x1="${left}" y1="${yFor(t)}" x2="${size - right}" y2="${yFor(t)}"></line>
  `).join("");
  const xTicks = ticks.map((t) => `<text class="chart-tick" x="${xFor(t)}" y="${size - bottom + 14}" text-anchor="middle">${t}</text>`).join("");
  const yTicks = ticks.map((t) => `<text class="chart-tick" x="${left - 8}" y="${yFor(t) + 3}" text-anchor="end">${t}</text>`).join("");
  const circles = points.map((point) => `<circle cx="${xFor(point.x)}" cy="${yFor(point.y)}" r="6" fill="${point.color}" fill-opacity="0.55"><title>${escapeHtml(formatDate(new Date(point.dateTs)))} · 감정 ${point.x}/10 · 충동 ${point.y}/10</title></circle>`).join("");

  return `
    <svg viewBox="0 0 ${size} ${size + 34}" role="img" aria-label="감정과 충동의 산점도">
      <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${size - bottom}"></line>
      <line class="chart-axis" x1="${left}" y1="${size - bottom}" x2="${size - right}" y2="${size - bottom}"></line>
      ${gridLines}
      ${xTicks}
      ${yTicks}
      <text class="chart-label" x="${left + plotW / 2}" y="${size + 14}" text-anchor="middle">불편한 감정 (0~10)</text>
      <text class="chart-label" x="${-(top + plotH / 2)}" y="12" text-anchor="middle" transform="rotate(-90)">충동 (0~10)</text>
      ${circles}
    </svg>
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:${severityColor(0)}"></span>문제행동 없음</span>
      <span><span class="legend-dot" style="background:${severityColor(50)}"></span>일부 함</span>
      <span><span class="legend-dot" style="background:${severityColor(100)}"></span>많이 함</span>
    </div>
  `;
}

// 문제행동 캘린더 히트맵. weeks(기본 10) × 7행(일~토), GitHub 기여그래프 형식(명세서 §2).
function calendarHeatmapSvg(observationDays, anchorTs, weeks = 10) {
  if (!observationDays.length) {
    // 관찰 기록이 전혀 없어도 오류가 아니라 "기록 없음" 색으로 채운 빈 캘린더를 보여줍니다(명세서 §2-6).
  }
  const cells = calendarHeatmapCells(observationDays, anchorTs, weeks);
  const cellSize = 13;
  const gap = 3;
  const step = cellSize + gap;
  const leftLabelWidth = 24;
  const width = leftLabelWidth + weeks * step;
  const height = 7 * step + 6;
  const dowLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const dowText = dowLabels.map((label, row) => `<text class="chart-tick" x="0" y="${row * step + cellSize - 2}" font-size="9">${row % 2 === 1 ? label : ""}</text>`).join("");
  const rects = cells.map((cell) => {
    const x = leftLabelWidth + cell.col * step;
    const y = cell.row * step;
    const fill = heatmapCellColor(cell);
    if (cell.dateTs === null) return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="transparent"></rect>`;
    const title = `${escapeHtml(formatDate(new Date(cell.dateTs)))} · ${cell.status.hasData ? `문제행동수준 ${cell.status.maxAction}/5` : "기록 없음"}`;
    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fill}"><title>${title}</title></rect>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="문제행동 캘린더 히트맵">
      ${dowText}
      ${rects}
    </svg>
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:#eef4ef"></span>기록 없음</span>
      <span><span class="legend-dot" style="background:${severityColor(0)}"></span>문제행동 없음</span>
      <span><span class="legend-dot" style="background:${severityColor(50)}"></span>일부 함</span>
      <span><span class="legend-dot" style="background:${severityColor(100)}"></span>많이 함</span>
    </div>
  `;
}

// 문제행동(빨강 계열)과 경험 확장(파랑-보라 계열)을 같은 날짜축 위에 두 줄로 나란히 배치합니다.
// 절대 하나의 그래프로 합치지 않습니다 — 두 축이 독립적이라는 것(듀얼 연속체)을 색만 봐도 알 수 있게 하기 위함입니다.
function dualAxisTimelineSvg(days) {
  if (!days.length) return `<div class="empty">아직 문제행동·경험 확장을 나란히 비교할 자료가 없습니다.</div>`;
  const cellW = 28;
  const cellGap = 2;
  const cellH = 22;
  const rowGap = 4;
  const leftLabelWidth = 66;
  const width = leftLabelWidth + days.length * cellW;
  const rowActionY = 4;
  const rowExpansionY = rowActionY + cellH + rowGap;
  const rowPracticeY = rowExpansionY + cellH + rowGap;
  const rowPracticeHeight = 14;
  const axisLineY = rowPracticeY + rowPracticeHeight + 10;
  const axisTextY = axisLineY + 13;
  const height = axisTextY + 6;

  const actionCells = days.map((day, i) => {
    const x = leftLabelWidth + i * cellW;
    const fill = day.hasAction ? severityColorForActionLevel(day.actionLevel) : "#eef4ef";
    const title = `${escapeHtml(formatDate(new Date(day.dateTs)))} · 문제행동 ${day.hasAction ? `${day.actionLevel}/5` : "기록 없음"}`;
    return `<rect x="${x}" y="${rowActionY}" width="${cellW - cellGap}" height="${cellH}" rx="4" fill="${fill}"><title>${title}</title></rect>`;
  }).join("");

  const expansionCells = days.map((day, i) => {
    const x = leftLabelWidth + i * cellW;
    const fill = day.expansionScore !== null ? expansionColor(day.expansionScore) : "#eef4ef";
    const title = `${escapeHtml(formatDate(new Date(day.dateTs)))} · 경험 확장 ${day.expansionScore !== null ? `${day.expansionScore}/10` : "기록 없음"}`;
    return `<rect x="${x}" y="${rowExpansionY}" width="${cellW - cellGap}" height="${cellH}" rx="4" fill="${fill}"><title>${title}</title></rect>`;
  }).join("");

  const practiceMarks = days.map((day, i) => {
    if (!day.hasPractice) return "";
    const x = leftLabelWidth + i * cellW + (cellW - cellGap) / 2;
    return `<circle cx="${x}" cy="${rowPracticeY + rowPracticeHeight / 2}" r="3" fill="#2f7b4f"><title>이날 실천 기록 있음</title></circle>`;
  }).join("");

  // 날짜 라벨은 문제행동·경험 확장·실천 세 줄 모두에 공통으로 적용되는 축이므로,
  // "실천" 줄과 헷갈리지 않도록 구분선(axisLineY)을 넣고 충분히 아래로 띄웠습니다.
  // 칸 너비(28px)에 "07-05" 같은 라벨이 거의 꽉 차므로, 최소 2칸 간격을 두어 옆 라벨과 겹치지 않게 합니다.
  const showEvery = Math.max(2, Math.ceil(days.length / 6));
  const dateLabels = days.map((day, i) => {
    if (i % showEvery !== 0 && i !== days.length - 1) return "";
    const x = leftLabelWidth + i * cellW + (cellW - cellGap) / 2;
    return `<text class="chart-tick" x="${x}" y="${axisTextY}" text-anchor="middle" font-size="9">${formatDate(new Date(day.dateTs)).slice(5)}</text>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="문제행동수준과 삶의 경험 확장/만족도 나란히 보기">
      <text class="chart-label" x="0" y="${rowActionY + cellH / 2 + 4}" font-size="11">문제행동</text>
      <text class="chart-label" x="0" y="${rowExpansionY + cellH / 2 + 4}" font-size="11">경험 확장</text>
      <text class="chart-label" x="0" y="${rowPracticeY + rowPracticeHeight / 2 + 3}" font-size="9">실천</text>
      ${actionCells}
      ${expansionCells}
      ${practiceMarks}
      <line class="chart-axis" x1="${leftLabelWidth}" y1="${axisLineY}" x2="${width}" y2="${axisLineY}"></line>
      <text class="chart-tick" x="0" y="${axisTextY}" font-size="9">날짜</text>
      ${dateLabels}
    </svg>
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:${severityColor(0)}"></span>문제행동 낮음</span>
      <span><span class="legend-dot" style="background:${severityColor(100)}"></span>문제행동 높음</span>
      <span><span class="legend-dot" style="background:${expansionColor(0)}"></span>경험 확장 낮음</span>
      <span><span class="legend-dot" style="background:${expansionColor(10)}"></span>경험 확장 높음</span>
      <span><span class="legend-dot" style="background:#2f7b4f"></span>그날 실천 기록 있음</span>
    </div>
  `;
}

// 문제행동수준(X)과 경험 확장(Y)의 관계를 직접 산점도로 보여줍니다.
// 반비례한다면 좌상단(문제행동 낮음·경험 확장 높음)에 점이 몰릴 것이고, 독립적이라면 흩어져 나타납니다.
// 테두리가 있는 점은 그날 실천 기록이 있었던 날입니다(작은 실천행동과의 관계도 함께 확인).
function expansionActionScatterSvg(days) {
  const points = days.filter((day) => day.hasAction && day.expansionScore !== null);
  if (!points.length) return `<div class="empty">문제행동수준과 경험 확장 점수가 같은 날 함께 기록된 자료가 아직 없습니다.</div>`;
  const left = 40;
  const right = 20;
  const top = 20;
  const bottom = 34;
  const width = 300;
  const heightPlot = 260;
  const plotW = width - left - right;
  const plotH = heightPlot - top - bottom;
  const xFor = (v) => left + (v / 5) * plotW;
  const yFor = (v) => (heightPlot - bottom) - (v / 10) * plotH;
  const xTicks = [0, 1, 2, 3, 4, 5];
  const yTicks = [0, 2, 4, 6, 8, 10];

  const gridLines = [
    ...xTicks.map((t) => `<line class="chart-grid" x1="${xFor(t)}" y1="${top}" x2="${xFor(t)}" y2="${heightPlot - bottom}"></line>`),
    ...yTicks.map((t) => `<line class="chart-grid" x1="${left}" y1="${yFor(t)}" x2="${width - right}" y2="${yFor(t)}"></line>`),
  ].join("");
  const xTickText = xTicks.map((t) => `<text class="chart-tick" x="${xFor(t)}" y="${heightPlot - bottom + 14}" text-anchor="middle">${t}</text>`).join("");
  const yTickText = yTicks.map((t) => `<text class="chart-tick" x="${left - 8}" y="${yFor(t) + 3}" text-anchor="end">${t}</text>`).join("");
  const circles = points.map((day) => {
    const r = day.hasPractice ? 7 : 4;
    const color = severityColorForActionLevel(day.actionLevel);
    const title = `${formatDate(new Date(day.dateTs))} · 문제행동 ${day.actionLevel}/5 · 경험 확장 ${day.expansionScore}/10${day.hasPractice ? " · 실천 기록 있음" : ""}`;
    return `<circle cx="${xFor(day.actionLevel)}" cy="${yFor(day.expansionScore)}" r="${r}" fill="${color}" fill-opacity="0.6" stroke="${day.hasPractice ? "#176b5b" : "none"}" stroke-width="${day.hasPractice ? 2 : 0}"><title>${escapeHtml(title)}</title></circle>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${heightPlot + 34}" role="img" aria-label="문제행동수준과 경험 확장의 관계 산점도">
      <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${heightPlot - bottom}"></line>
      <line class="chart-axis" x1="${left}" y1="${heightPlot - bottom}" x2="${width - right}" y2="${heightPlot - bottom}"></line>
      ${gridLines}
      ${xTickText}
      ${yTickText}
      <text class="chart-label" x="${left + plotW / 2}" y="${heightPlot + 14}" text-anchor="middle">문제행동수준 (0~5)</text>
      <text class="chart-label" x="${-(top + plotH / 2)}" y="12" text-anchor="middle" transform="rotate(-90)">경험 확장·만족도 (0~10)</text>
      ${circles}
    </svg>
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:${severityColor(0)}"></span>문제행동 낮음</span>
      <span><span class="legend-dot" style="background:${severityColor(100)}"></span>문제행동 높음</span>
      <span>◎ 테두리 있는 점 = 그날 실천 기록 있음</span>
    </div>
  `;
}

function card(title, body, kind = "", questions = []) {
  return `<article class="card ${kind}">
    <h3>${escapeHtml(title)}</h3>
    ${body}
    ${questions.length ? `<ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>` : ""}
  </article>`;
}

function renderEmpty() {
  return `<div class="empty">CSV를 불러오면 이 작업 순서에 맞춘 내담자 자료 기반 분석이 표시됩니다.</div>`;
}

async function copyTextToClipboard(text, successMessage) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showImportMessages([`${successMessage} 민감정보가 포함될 수 있으니 필요한 곳에만 붙여넣으세요.`]);
  } catch (error) {
    showImportMessages(["복사하지 못했습니다. 브라우저의 클립보드 권한을 허용한 뒤 다시 시도하세요."]);
  }
}

async function copySessionSummary() {
  const text = buildSummaryText();
  await copyTextToClipboard(text, "회기 요약을 클립보드에 복사했습니다.");
}

// --- 지난 회기와 비교 ---
// CSV 자체는 저장하지 않는다는 원칙을 그대로 지키면서, 상담자가 이미 매주 만들고 있는
// "상담기록·비교 요약" JSON 파일을 다시 불러와 이번 주와 비교합니다. 오늘 이후 저장되는 요약에는
// 비교 전용 핵심 수치(weeklySnapshot)가 담기고, 그 이전에 이미 저장해둔 파일은
// chains[]/practiceGroups[]에서 최대한 값을 복원해 부분적으로라도 비교합니다.
function computeCurrentWeeklySnapshot() {
  const { avgUrge, avgAction, practiceRate, avgExpansion } = computeCoreAverages();
  const motivation = computeMotivationTrend();
  const changeTalkRatio = motivation.hasData && motivation.overallRatio !== null ? Math.round(motivation.overallRatio * 100) : null;
  const predictionStats = predictionAccuracyStats(state.predictions);
  const predictionOccurredRatio = state.predictions.length ? Math.round(predictionStats.occurredRatio * 100) : null;

  return {
    avgUrge,
    avgAction,
    practiceCompletionRate: practiceRate,
    avgExpansion,
    changeTalkRatio,
    predictionOccurredRatio,
    rangeLabel: state.rangeLabel || null,
    fileName: state.fileName || null,
    computedAt: new Date().toISOString(),
    isLegacy: false,
  };
}

function extractSnapshotFromSummaryJson(payload) {
  if (!payload || typeof payload !== "object") return null;

  if (payload.weeklySnapshot) {
    return { ...payload.weeklySnapshot, isLegacy: false };
  }

  // 이전 버전(weeklySnapshot 도입 이전)에 저장된 요약 파일 — 있는 데이터로 최대한 복원합니다.
  if (!Array.isArray(payload.chains)) return null;

  const urgeScores = payload.chains.map((chain) => chain.scores?.urge).filter((v) => v !== null && v !== undefined);
  const actionScores = payload.chains.map((chain) => chain.scores?.action).filter((v) => v !== null && v !== undefined);
  const avgUrge = urgeScores.length ? average(urgeScores) : null;
  const avgAction = actionScores.length ? average(actionScores) : null;

  let practiceCompletionRate = null;
  if (Array.isArray(payload.practiceGroups) && payload.practiceGroups.length) {
    const withPlanned = payload.practiceGroups.filter((group) => group.plannedTotal);
    const totalPlanned = withPlanned.reduce((sum, group) => sum + (group.plannedTotal || 0), 0);
    const totalCompleted = withPlanned.reduce((sum, group) => sum + (group.completedCount || 0), 0);
    practiceCompletionRate = totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) : null;
  }

  const predictionOccurredRatio = payload.predictionSummary && payload.predictionSummary.total
    ? Math.round((payload.predictionSummary.occurredRatio || 0) * 100)
    : null;

  return {
    avgUrge,
    avgAction,
    practiceCompletionRate,
    avgExpansion: null, // 예전 요약 파일에는 없던 값
    changeTalkRatio: null, // 예전 요약 파일에는 없던 값
    predictionOccurredRatio,
    rangeLabel: payload.rangeLabel || null,
    fileName: payload.sourceFile || null,
    computedAt: payload.exportedAt || null,
    isLegacy: true,
  };
}

const SNAPSHOT_METRICS = [
  ["avgUrge", "충동 평균", "", false],
  ["avgAction", "문제행동수준 평균", "", false],
  ["practiceCompletionRate", "실천 완료율", "%", true],
  ["avgExpansion", "삶의 경험 확장/만족도 평균", "", true],
  ["changeTalkRatio", "변화언어 비율", "%", true],
  ["predictionOccurredRatio", "예기불안이 실제로 일어난 비율", "%", false],
];

function renderSessionComparison() {
  if (!els.sessionComparisonResult) return;

  if (!state.previousSnapshot) {
    els.sessionComparisonResult.innerHTML = `<p class="muted">비교할 이전 요약 파일을 아직 불러오지 않았습니다.</p>`;
    return;
  }
  if (!state.records.length) {
    els.sessionComparisonResult.innerHTML = `<p class="muted">비교하려면 이번 주 CSV도 함께 불러오세요.</p>`;
    return;
  }

  const prev = state.previousSnapshot;
  const curr = computeCurrentWeeklySnapshot();

  const items = SNAPSHOT_METRICS.map(([key, label, unit, higherIsBetter]) => {
    const prevVal = prev[key];
    const currVal = curr[key];
    if (prevVal === null || prevVal === undefined) return `<li>${label}: 이전 요약에 없음 (이번 주 ${currVal !== null && currVal !== undefined ? currVal.toFixed(1) + unit : "기록 없음"})</li>`;
    if (currVal === null || currVal === undefined) return `<li>${label}: 이번 주 기록 없음 (이전 ${prevVal.toFixed(1)}${unit})</li>`;
    const diff = currVal - prevVal;
    const improved = higherIsBetter ? diff > 0 : diff < 0;
    const worsened = higherIsBetter ? diff < 0 : diff > 0;
    const arrow = improved ? "▲ 개선" : worsened ? "▼ 악화" : "- 변화 없음";
    return `<li>${label}: ${prevVal.toFixed(1)}${unit} → ${currVal.toFixed(1)}${unit} (${arrow})</li>`;
  }).join("");

  const legacyNote = prev.isLegacy
    ? `<p class="muted">이전 요약이 이번 비교 기능 도입 이전 형식이라, 경험 확장·변화언어 비율은 비교할 수 없습니다.</p>`
    : "";

  els.sessionComparisonResult.innerHTML = `
    <p class="muted">이전: ${escapeHtml(prev.fileName || "-")} (${escapeHtml(prev.rangeLabel || "-")}) → 이번: ${escapeHtml(state.fileName || "-")} (${escapeHtml(curr.rangeLabel || "-")})</p>
    <ul>${items}</ul>
    ${legacyNote}
  `;
}

function exportSummary() {
  if (!state.records.length) {
    showImportMessages(["저장할 분석 자료가 없습니다. CSV를 먼저 불러오세요."]);
    return;
  }
  if (!window.confirm("상담기록·비교 요약 파일에는 핵심 수치, 연쇄 요약, 상담 메모가 포함될 수 있습니다. 승인된 보관 위치에 저장하시겠습니까?")) return;
  const predictionStats = predictionAccuracyStats(state.predictions);
  const practiceGroups = groupPractice();
  const payload = {
    app: "마음고요 상담분석실",
    documentTitle: "상담기록·비교 요약",
    documentPurpose: "현재 회기 기록 보관과 다음 회기 변화 비교를 위한 요약 파일입니다. AI 회기 프로토콜 생성을 직접 목적으로 하는 파일이 아닙니다.",
    intendedUse: [
      "이번 회기 상담기록 보관",
      "다음 회기에서 이전 요약 JSON으로 불러와 변화 비교",
      "상담자가 핵심 수치와 연쇄 요약을 빠르게 재확인",
    ],
    notIncluded: "원본 CSV 전체 행은 저장하지 않습니다. 누적 원본자료 보관이 필요하면 '누적 원본자료 저장(CSV)'를 사용하세요.",
    weeklySnapshot: computeCurrentWeeklySnapshot(),
    version: APP_VERSION,
    privacyNotice: "이 앱은 원본 CSV 파일 자체를 브라우저나 서버에 저장하지 않습니다. 단, 이 요약 파일에는 CSV에 담겨 있던 내담자의 실제 문장(상황·생각·감정·실천 기록)이 연쇄별 요약 형태로 포함되어 있으므로, 상담 메모가 담긴 민감정보 문서로 간주하여 암호화 저장·접근 제한 등 안전하게 보관하시기 바랍니다.",
    sourceFile: state.fileName,
    schemaVersion: CSV_SCHEMA,
    shareMode: state.shareMode,
    shareModeLabel: state.shareModeLabel,
    rangeLabel: state.rangeLabel,
    rangeDays: state.rangeDays,
    exportedAt: new Date().toISOString(),
    thresholds: state.thresholds,
    metrics: {
      records: state.records.length,
      chains: state.chains.length,
      highRiskChains: chains((chain) => chain.highUrge && chain.actionized).length,
      successChains: chains(isControlled).length,
      missedPracticeChains: chains((chain) => chain.missedPractice).length,
      motivationDipChains: chains(isMotivationDip).length,
      latentChainCandidates: chains(isLatentChain).length,
      partialSuccessChains: chains(isPartialSuccess).length,
      emotionalRelapseWarnings: chains((chain) => relapseSignals(chain).emotional.length > 0).length,
      cognitiveRelapseWarnings: chains((chain) => relapseSignals(chain).cognitive.length > 0).length,
      behavioralRelapseSignals: chains((chain) => relapseSignals(chain).behavior.length > 0).length,
    },
    officialRelapseWindowSignal: state.relapseWindow,
    predictionSummary: {
      total: state.predictions.length,
      resolvedCount: predictionStats.resolvedCount,
      occurredCount: predictionStats.occurredCount,
      partialCount: predictionStats.partialCount,
      didNotOccurCount: predictionStats.didNotOccurCount,
      occurredRatio: predictionStats.occurredRatio,
      avgSeverityGap: predictionStats.avgGap,
    },
    practiceGroups: practiceGroups.map((group) => ({
      name: group.name,
      plannedTotal: group.plannedTotal,
      completedCount: group.completedCount,
      completionRate: group.completionRate,
      plannedAverage: group.plannedAverage,
      pleasureAvg: group.pleasureAvg,
      masteryAvg: group.masteryAvg,
      pleasureGap: group.pleasureGap,
      masteryGap: group.masteryGap,
    })),
    notes: els.notes.value,
    sessionSummary: buildSummaryText(),
    chains: state.chains.map((chain) => ({
      client: chain.client,
      chainId: chain.chainId,
      date: formatDate(chain.date),
      scores: chain.scores,
      highUrge: chain.highUrge,
      actionized: chain.actionized,
      missedPractice: chain.missedPractice,
      summary: chainSummary(chain),
    })),
  };
  const filename = buildSummaryFileName();
  downloadText(filename, JSON.stringify(payload, null, 2), "application/json;charset=utf-8", document.activeElement);
}

function exportAiDetailedReport() {
  if (!state.rows.length) {
    showImportMessages(["CSV를 먼저 불러오세요."]);
    return;
  }
  const usableRows = filterUsableRows(state.rows);
  if (!usableRows.length) {
    showImportMessages(["저장할 AI 상세분석 원자료가 없습니다."]);
    return;
  }
  const report = buildAiAnalysisReport(usableRows);
  if (els.aiReportBox) {
    els.aiReportBox.value = report;
    els.aiReportBox.hidden = false;
  }
  if (els.copyAiReportBtn) els.copyAiReportBtn.hidden = false;
  const filename = buildAiReportFileName();
  downloadText(filename, report, "text/plain;charset=utf-8", els.exportAiReportBtn);
}

function exportSessionPrepPackage() {
  if (!state.records.length) {
    showImportMessages(["저장할 회기준비 자료가 없습니다. CSV를 먼저 불러오세요."]);
    return;
  }
  if (!window.confirm("AI 회기준비 자료에는 최근 1~2주 핵심 문장, 프로젝트 연속성 프롬프트, 이전 회기맥락이 포함됩니다. 외부 AI에 사용하기 전 내담자 식별정보를 제거하세요.")) return;
  const filename = buildSessionPrepFileName();
  downloadText(filename, buildSessionPrepText(), "text/markdown;charset=utf-8", els.sessionPrepExportBtn);
}

function readPreviousAiContextFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.previousAiContextText = String(reader.result || "").trim();
    state.previousAiContextFileName = file.name;
    if (els.previousAiContextStatus) {
      els.previousAiContextStatus.textContent = `${file.name} 파일을 불러왔습니다. 새 AI 회기준비 자료에 자동 포함됩니다.`;
    }
    showImportMessages([`이전 AI 회기맥락(${file.name})을 불러왔습니다.`]);
    renderMeta();
  };
  reader.readAsText(file);
}

function exportAiSessionContext() {
  if (!state.records.length) {
    showImportMessages(["저장할 회기맥락 자료가 없습니다. CSV를 먼저 불러오세요."]);
    return;
  }
  if (!window.confirm("AI 회기맥락 누적 요약은 다음 회기 AI 준비자료에 이어 붙일 치료 연속성 기록입니다. 내담자 식별정보가 들어가지 않았는지 확인했습니까?")) return;
  const filename = buildAiContextFileName();
  downloadText(filename, buildAiSessionContextText(), "text/markdown;charset=utf-8", els.exportAiContextBtn);
}

function buildAiSessionContextText() {
  const focus = assessWeekFocus();
  const clientAlias = getClientAlias();
  const projectName = getProjectName();
  const riskChains = chains((chain) => chain.highUrge && chain.actionized).slice(0, 5);
  const toleranceChains = chains((chain) => isDistressTolerance(chain) || isPartialSuccess(chain)).slice(0, 5);
  return [
    "# 마음고요 AI 회기맥락 누적 요약",
    "",
    "## 1. 파일의 역할",
    "",
    "이 파일은 AI의 긴 답변 전체가 아니라, 상담자가 검토해 다음 회기에도 유지할 치료적 맥락만 남기는 누적 요약입니다.",
    "다음 회기의 `AI 회기준비 자료`를 만들 때 이전 맥락으로 불러와 사용하세요.",
    "",
    "## 2. 프로젝트 정보",
    "",
    `- 비식별 자료 코드: ${clientAlias}`,
    `- AI 프로젝트명: ${projectName}`,
    `- 회기맥락 저장일: ${new Date().toISOString()}`,
    `- 자료 범위: ${state.rangeLabel || (state.rangeDays ? `최근 ${state.rangeDays}일` : "-")}`,
    `- 원본 파일: ${state.fileNames.join(", ") || state.fileName || "-"}`,
    "",
    "## 3. 이번 회기의 핵심 판정",
    "",
    `- 판정: ${focus.title || "기본 회기 흐름"}`,
    `- 초점: ${focus.focus || "-"}`,
    `- 권장 흐름: ${focus.flow || "-"}`,
    "",
    "## 4. 주요 자동 연쇄 가설",
    "",
    riskChains.length ? riskChains.map((chain, index) => `- ${index + 1}. ${formatDate(chain.date)} / ${scoreLine(chain)} / ${chainSummary(chain)}`).join("\n") : "- 이번 자료에서 저장할 위험 연쇄 가설이 충분하지 않습니다.",
    "",
    "## 5. 감정 감내력 창 관련 변화",
    "",
    toleranceChains.length ? toleranceChains.map((chain, index) => `- ${index + 1}. ${formatDate(chain.date)} / ${scoreLine(chain)} / ${chainSummary(chain)}`).join("\n") : "- 감정 감내력 또는 부분변화 장면을 다음 회기에서 더 확인하세요.",
    "",
    "## 6. 실천행동 과제와 수행 장애물",
    "",
    buildPracticeContextLines(),
    "",
    "## 7. 상담자가 채택한 AI 제안",
    "",
    textOrDash(els.acceptedAiSuggestions?.value),
    "",
    "## 8. 상담자가 보류한 AI 제안·가설",
    "",
    textOrDash(els.deferredAiSuggestions?.value),
    "",
    "## 9. 다음 회기 확인할 질문",
    "",
    textOrDash(els.nextSessionQuestions?.value),
    "",
    "## 10. 다음 회기 AI에게 반드시 참고시킬 맥락",
    "",
    textOrDash(els.nextAiContext?.value),
    "",
    "## 11. 개인정보 보호 메모",
    "",
    "- 이 파일은 비식별 프로젝트명으로 관리하세요.",
    "- 실제 이름, 연락처, 기관명, 특정 가능한 장소명은 외부 AI에 입력하기 전 제거하세요.",
  ].join("\n");
}

function buildPracticeContextLines() {
  const groups = groupPractice().slice(0, 6);
  if (!groups.length) return "- 실천행동 자료가 충분하지 않습니다.";
  return groups.map((group) => {
    const completion = group.completionRate === null ? "계획 대비 완료율 계산 불가" : `완료율 ${group.completionRate}%`;
    const pleasure = group.pleasureAvg !== null ? `즐거움 ${group.pleasureAvg.toFixed(1)}/10` : "";
    const mastery = group.masteryAvg !== null ? `성취감 ${group.masteryAvg.toFixed(1)}/10` : "";
    return `- ${group.name}: ${[completion, pleasure, mastery].filter(Boolean).join(" · ")}${group.sample ? ` / 단서: ${group.sample}` : ""}`;
  }).join("\n");
}

function textOrDash(value) {
  const text = String(value || "").trim();
  return text || "- 아직 입력된 내용이 없습니다.";
}

function buildSessionPrepText() {
  const recentChains = getRecentChains(14);
  const focus = assessWeekFocus();
  const snapshot = computeCurrentWeeklySnapshot();
  const practiceGroups = groupPractice();
  const predictionStats = predictionAccuracyStats(state.predictions);
  const clientAlias = getClientAlias();
  const projectName = getProjectName();
  const topRisk = [...recentChains].sort((a, b) => riskWeight(b) - riskWeight(a)).slice(0, 6);
  const toleranceMoments = recentChains.filter((chain) => isDistressTolerance(chain) || isPartialSuccess(chain)).slice(0, 6);
  const practiceLines = practiceGroups.slice(0, 6).map((group) => {
    const completion = group.completionRate === null ? "계획 대비 완료율 계산 불가" : `완료율 ${group.completionRate}%`;
    const experience = [
      group.pleasureAvg !== null ? `즐거움 ${group.pleasureAvg.toFixed(1)}/10` : "",
      group.masteryAvg !== null ? `성취감 ${group.masteryAvg.toFixed(1)}/10` : "",
    ].filter(Boolean).join(", ");
    return `- ${group.name}: ${completion}${experience ? `, ${experience}` : ""}${group.sample ? ` / 단서: ${group.sample}` : ""}`;
  });

  return [
    "# 마음고요 AI 회기준비 자료",
    "",
    "## 1. 파일의 역할",
    "",
    "이 파일은 최근 1~2주 핵심 측정정보와 이전 회기 맥락을 함께 참고하여, AI 상담 보조도구가 이번 50분 회기의 구체적 작업 프로토콜을 제안하도록 돕는 마크다운 자료입니다.",
    "",
    "- 상담기록 보관용 원본이 아닙니다.",
    "- 원본 CSV 전체를 저장하지 않습니다.",
    "- 외부 AI에 입력하기 전 내담자 이름, 장소, 기관명 등 식별정보를 반드시 제거하세요.",
    "- AI가 만든 제안은 진단이나 지시가 아니라 상담자의 임상 판단을 돕는 초안입니다.",
    "",
    "## 2. 프로젝트 연속성 프롬프트",
    "",
    `이 내담자는 비식별 프로젝트명 \`${projectName}\` 아래에서 회기별 분석과 제안을 축적한다.`,
    "이전 회기 요약이 함께 제공되면, 이전 가설, 채택한 개입, 보류한 가설, 과제 수행 결과, 다음 확인점을 반드시 참고하여 이번 회기 자료를 해석하라.",
    "이번 회기 자료만 새 내담자의 독립 자료처럼 해석하지 말고, 반복 패턴과 치료적 누적 과제를 함께 고려하라.",
    "실명이나 개인정보가 아니라 비식별 자료 코드만 사용하라.",
    "",
    "## 3. 이전 회기 맥락",
    "",
    state.previousAiContextText
      ? `아래 내용은 상담자가 불러온 이전 AI 회기맥락 파일(${state.previousAiContextFileName || "이전 맥락"})입니다. 이번 회기 분석에서 반드시 참고하세요.\n\n${state.previousAiContextText}`
      : "불러온 이전 AI 회기맥락 파일이 없습니다. 이번 회기 자료만 기준으로 분석하되, 다음 회기부터 축적할 항목을 제안하세요.",
    "",
    "## 4. AI에게 요청할 작업",
    "",
    buildSessionPrepPrompt(),
    "",
    "## 5. 자료 범위",
    "",
    `- 비식별 자료 코드: ${clientAlias}`,
    `- AI 프로젝트명: ${projectName}`,
    `- 불러온 파일: ${state.fileNames.join(", ") || state.fileName || "-"}`,
    `- 공유 모드: ${state.shareModeLabel || "-"}`,
    `- 전체 자료 범위: ${state.rangeLabel || (state.rangeDays ? `최근 ${state.rangeDays}일` : "-")}`,
    `- 회기준비 요약 범위: 최신 기록 기준 최근 14일, 연쇄 ${recentChains.length}개`,
    "",
    "## 6. 지난 한 주 평가",
    "",
    `- 판정: ${focus.title || "기본 회기 흐름"}`,
    `- 초점: ${focus.focus || "자료를 함께 확인하며 회기 초점을 정합니다."}`,
    `- 권장 운영: ${focus.flow || "1 → 3 → 7 → 9"}`,
    "",
    "## 7. 핵심 수치",
    "",
    `- 관찰 기록: ${snapshot.records ?? state.records.length}개`,
    `- 연쇄 기록: ${snapshot.chains ?? state.chains.length}개`,
    `- 위험 연쇄: ${chains((chain) => chain.highUrge && chain.actionized).length}개`,
    `- 감정 감내력(충동 포함) 장면: ${chains(isDistressTolerance).length}개`,
    `- 강도감소·부분변화 장면: ${chains(isPartialSuccess).length}개`,
    `- 실천행동 조정 필요: ${chains((chain) => chain.missedPractice).length}개`,
    `- 동기저하 신호: ${chains(isMotivationDip).length}개`,
    `- 예기불안 검증 기록: ${state.predictions.length}건, 확인됨 ${predictionStats.resolvedCount}건`,
    "",
    "## 8. 이번 회기에서 우선 다룰 위험·자동 연쇄 후보",
    "",
    topRisk.length ? topRisk.map((chain, index) => `- ${index + 1}. ${formatDate(chain.date)} / ${scoreLine(chain)} / ${chainSummary(chain)}`).join("\n") : "- 최근 14일 안에 우선순위로 볼 연쇄가 충분하지 않습니다.",
    "",
    "## 9. 감정 감내력·부분변화 후보",
    "",
    toleranceMoments.length ? toleranceMoments.map((chain, index) => `- ${index + 1}. ${formatDate(chain.date)} / ${scoreLine(chain)} / ${chainSummary(chain)}`).join("\n") : "- 충동이나 불편함을 감내한 장면이 뚜렷하게 기록되지 않았습니다. 기록 누락인지 실제 부재인지 회기에서 확인하세요.",
    "",
    "## 10. 가치기반 작은 실천 자료",
    "",
    practiceLines.length ? practiceLines.join("\n") : "- 실천행동 기록이 충분하지 않습니다.",
    "",
    "## 11. 상담 메모",
    "",
    els.notes.value.trim() || "- 아직 입력된 상담 메모가 없습니다.",
    "",
    "## 12. 상담사가 AI 결과를 검토할 때의 기준",
    "",
    "- AI가 제안한 내용은 진단이나 지시가 아니라 회기 구성 초안입니다.",
    "- 위험 신호, 자해·타해 가능성, 법적·의학적 문제는 상담자의 직접 평가와 기관 절차를 우선합니다.",
    "- 내담자에게 전달할 피드백은 수치 판정이 아니라 알아차림, 감정 감내력, 가치기반 작은 행동을 강화하는 언어로 바꿔 사용하세요.",
  ].join("\n");
}

function getRecentChains(days = 14) {
  const dated = state.chains.filter((chain) => chain.date instanceof Date && !Number.isNaN(chain.date.getTime()));
  if (!dated.length) return state.chains.slice();
  const latest = Math.max(...dated.map((chain) => chain.date.getTime()));
  const cutoff = latest - (days - 1) * 24 * 60 * 60 * 1000;
  return dated.filter((chain) => chain.date.getTime() >= cutoff).sort((a, b) => a.date - b.date);
}

function riskWeight(chain) {
  return (chain.scores.urge || 0) * 2 + (chain.scores.action || 0) * 3 + (chain.scores.emotion || 0) + (chain.missedPractice ? 4 : 0);
}

function buildSummaryText() {
  const signal = state.relapseWindow;
  const predictionStats = predictionAccuracyStats(state.predictions);
  const lines = [
    "마음고요 상담분석실 회기 요약",
    `자료: ${state.fileName || "-"}`,
    `공유 모드: ${state.shareModeLabel || "-"}`,
    `자료 범위: ${state.rangeLabel || (state.rangeDays ? `최근 ${state.rangeDays}일` : "-")}`,
    "",
    "[공식 재발신호 (최근 3일 기준 · 연동명세서 §5-2)]",
  ];
  if (signal && (signal.recentCount || signal.compareCount)) {
    lines.push(`정서적 재발: 조건 ${signal.emotional.metCount}/6 충족 ${signal.emotional.active ? "(신호 있음)" : "(신호 없음)"}`);
    lines.push(`인지적 재발: 조건 ${signal.cognitive.metCount}/4 충족 ${signal.cognitive.active ? "(신호 있음)" : "(신호 없음)"}`);
    lines.push(`행동적 재발: 최근 3일 중 ${signal.behavior.days}일${signal.behavior.severeDays ? ` (즉시확인 필요 ${signal.behavior.severeDays}일)` : ""}`);
  } else {
    lines.push("이 기간에는 observation 기록이 없어 계산할 수 없음");
  }
  lines.push(
    "",
    "[상담자 조정 기준 요약]",
    `위험 연쇄: ${chains((chain) => chain.highUrge && chain.actionized).length}개`,
    `감정 감내력(충동 포함): ${chains(isDistressTolerance).length}개`,
    `실천행동 조정 필요: ${chains((chain) => chain.missedPractice).length}개`,
    `동기저하 신호: ${chains(isMotivationDip).length}개`,
    `저충동 잠복 연쇄: ${chains(isLatentChain).length}개`,
    `강도감소 성공: ${chains(isPartialSuccess).length}개`,
    `정서적 재발 주의(개별 기록): ${chains((chain) => relapseSignals(chain).emotional.length > 0).length}개`,
    `인지적 재발 경고(개별 기록): ${chains((chain) => relapseSignals(chain).cognitive.length > 0).length}개`,
    `행동 후 조기 도움 신호: ${chains((chain) => relapseSignals(chain).behavior.length > 0).length}개`,
    "",
    "[예기불안 검증]",
  );
  if (state.predictions.length) {
    lines.push(`예기불안 검증 기록 ${state.predictions.length}건 중 확인됨 ${predictionStats.resolvedCount}건`);
    lines.push(predictionStats.occurredRatio !== null ? `실제로 일어난 비율: ${Math.round(predictionStats.occurredRatio * 100)}%` : "확인된 예측 없음");
    if (predictionStats.avgGap !== null) lines.push(`평균 예상-실제 심각도 차이: ${predictionStats.avgGap.toFixed(1)}점`);
  } else {
    lines.push("예기불안 검증 기록 없음");
  }
  lines.push("", "원본 CSV는 저장하지 않고 현재 분석 요약만 저장됨.");
  return lines.join("\n");
}

async function refreshApp() {
  if (hasUnsavedContent() && !window.confirm("현재 불러온 자료와 상담 메모가 모두 지워집니다. 앱을 새로 적용할까요?")) return;
  resetAll(true);
  try {
    sessionStorage.clear();
  } catch (error) {
    // Ignore blocked storage.
  }
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch (error) {
    // File use usually has no Cache Storage.
  }
  window.location.replace(`${window.location.href.split("?")[0]}?appVersion=${APP_VERSION}&updated=${Date.now()}`);
}

function hasUnsavedContent() {
  return state.records.length > 0 || els.notes.value.trim() !== "";
}

function resetAll(skipConfirm = false) {
  if (!skipConfirm && hasUnsavedContent()) {
    const proceed = window.confirm("현재 불러온 자료와 상담 메모가 모두 지워집니다. 계속할까요?");
    if (!proceed) return;
  }
  resetDataOnly();
  els.csvInput.value = "";
  els.notes.value = "";
  render();
}

function resetDataOnly() {
  state.rows = [];
  state.records = [];
  state.chains = [];
  state.predictions = [];
  state.observationDays = [];
  state.dailyCheckins = [];
  state.reflectionDays = [];
  state.relapseWindow = null;
  state.fileName = "";
  state.fileNames = [];
  state.shareMode = "";
  state.shareModeLabel = "";
  state.rangeLabel = "";
  state.rangeDays = null;
  state.importMessages = [];
  state.practicePlans = [];
  state.generatedClientAlias = "";
  state.projectNameOverride = "";
  state.previousAiContextText = "";
  state.previousAiContextFileName = "";
  if (els.projectNameInput) els.projectNameInput.value = "";
  if (els.previousAiContextInput) els.previousAiContextInput.value = "";
  if (els.previousAiContextStatus) els.previousAiContextStatus.textContent = "이전 AI 회기맥락을 아직 불러오지 않았습니다.";
  [els.acceptedAiSuggestions, els.deferredAiSuggestions, els.nextSessionQuestions, els.nextAiContext].forEach((input) => {
    if (input) input.value = "";
  });
  if (els.aiReportBox) {
    els.aiReportBox.value = "";
    els.aiReportBox.hidden = true;
  }
  if (els.copyAiReportBtn) els.copyAiReportBtn.hidden = true;
}

function parsePayload(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return null;
  }
}

function chainScores(chain) {
  return {
    thought: maxScore(chain.steps.thought, "thoughtScore"),
    emotion: maxScore(chain.steps.emotion, "emotionScore"),
    urge: maxScore(chain.steps.urge, "urgeScore"),
    action: maxScore(chain.steps.action, "actionLevel"),
    practice: maxScore(chain.steps.practice, "practiceScore"),
  };
}

function maxScore(records, key) {
  const values = records.map((record) => record.sourceScores?.[key] ?? (key === "practiceScore" ? record.intensity : null)).filter((value) => Number.isFinite(Number(value))).map(Number);
  return values.length ? Math.max(...values) : null;
}

function chains(predicate) {
  return state.chains.filter(predicate);
}

function texts(chain, category) {
  return chain.steps[category].map((record) => record.content).filter(Boolean).join(" / ");
}

function chainSummary(chain) {
  return [
    texts(chain, "situation") && `상황: ${texts(chain, "situation")}`,
    texts(chain, "thought") && `생각: ${texts(chain, "thought")}`,
    texts(chain, "emotion") && `감정/몸: ${texts(chain, "emotion")}`,
    texts(chain, "avoidance") && `회피 신호: ${texts(chain, "avoidance")}`,
    texts(chain, "practice") && `대처/실천: ${texts(chain, "practice")}`,
  ].filter(Boolean).join(" · ") || "요약 가능한 내용이 적습니다.";
}

function scoreLine(chain) {
  const parts = [];
  if (chain.scores.urge !== null) parts.push(`충동 ${chain.scores.urge}/10`);
  if (chain.scores.action !== null) parts.push(`행동화 ${chain.scores.action}/5`);
  if (chain.scores.practice !== null) parts.push(`실천 ${chain.scores.practice}/10`);
  return parts.join(" · ") || "점수 기록 없음";
}

function isMotivationDip(chain) {
  const lowUrge = chain.scores.urge === null || chain.scores.urge < state.thresholds.urge;
  return lowUrge && chain.missedPractice;
}

function isLatentChain(chain) {
  const lowUrge = chain.scores.urge === null || chain.scores.urge < state.thresholds.urge;
  const hasInnerChain = Boolean(texts(chain, "thought") && texts(chain, "emotion"));
  const hasNegativeTone = negativeWords(chain.text);
  const noAction = !chain.actionized;
  return lowUrge && noAction && hasInnerChain && hasNegativeTone;
}

function isPartialSuccess(chain) {
  return chain.highUrge && chain.scores.action !== null && chain.scores.action > 0 && chain.scores.action < state.thresholds.action;
}

function isControlled(chain) {
  return chain.highUrge && chain.scores.action !== null && !chain.actionized;
}

function isDistressTolerance(chain) {
  return isControlled(chain);
}

function relapseSignals(chain) {
  const emotional = [];
  const cognitive = [];
  const behavior = [];
  const emotionText = texts(chain, "emotion");
  const thoughtText = texts(chain, "thought");
  const cognitiveWords = ["한 번", "해볼", "괜찮", "마지막", "보상", "몰래", "들키", "사용", "도박", "술", "약물", "음란물", "계획"];

  if (chain.scores.emotion !== null && chain.scores.emotion >= state.thresholds.emotion) emotional.push(`정서 강도 ${chain.scores.emotion}/10`);
  if (negativeWords(emotionText)) emotional.push("부정정서 표현");
  if (chain.missedPractice) emotional.push("실천 저수행");

  if (chain.scores.urge !== null && chain.scores.urge >= state.thresholds.cognitiveUrge) cognitive.push(`충동 ${chain.scores.urge}/10`);
  if (thoughtText && cognitiveWords.some((word) => thoughtText.includes(word))) cognitive.push("문제행동 접근 생각");
  if (detectMotivation("sustain").some((item) => item.record.chainId === chain.chainId)) cognitive.push("유지·합리화 언어");

  if (chain.scores.action !== null && chain.scores.action > 0) behavior.push(`행동화 ${chain.scores.action}/5`);
  if (chain.actionized) behavior.push("행동화 기준 초과");
  return { emotional: unique(emotional), cognitive: unique(cognitive), behavior: unique(behavior) };
}

function riskTags(chain) {
  const tags = [];
  if (chain.highUrge) tags.push(`<span class="tag warn">고충동</span>`);
  if (chain.actionized) tags.push(`<span class="tag warn">행동화</span>`);
  if (chain.missedPractice) tags.push(`<span class="tag warn">실천행동 조정</span>`);
  if (isMotivationDip(chain)) tags.push(`<span class="tag">동기저하</span>`);
  if (isLatentChain(chain)) tags.push(`<span class="tag">잠복연쇄</span>`);
  if (isPartialSuccess(chain)) tags.push(`<span class="tag ok">강도감소</span>`);
  const relapse = relapseSignals(chain);
  if (relapse.emotional.length) tags.push(`<span class="tag">정서 주의</span>`);
  if (relapse.cognitive.length) tags.push(`<span class="tag warn">인지 경고</span>`);
  if (relapse.behavior.length) tags.push(`<span class="tag warn">조기 도움</span>`);
  if (!tags.length) tags.push(`<span class="tag ok">안정</span>`);
  return tags.join("");
}

function detectMotivation(type) {
  const changeWords = ["원한다", "하고 싶", "줄이고", "끊", "바꾸", "회복", "가치", "약속", "해냈", "할 수", "준비", "시도", "예약"];
  const sustainWords = ["괜찮", "어쩔 수", "못 바뀐", "포기", "힘들었으니", "한 잔", "참을 수", "소용없", "무능", "부족"];
  const words = type === "change" ? changeWords : sustainWords;
  const label = type === "change" ? "변화언어 후보" : "유지언어 후보";
  // record.title은 "대처/가치실천"처럼 고정된 카테고리 이름이라, 내담자의 실제 말이 아닙니다.
  // 예전에는 title까지 같이 검사해서 "가치"라는 제목 자체 때문에 내용과 무관하게 오탐되는 문제가 있었습니다.
  return state.records
    .filter((record) => record.content && words.some((word) => record.content.includes(word)))
    .map((record) => ({ record, label }));
}

function motivationCards(limit) {
  return detectMotivation("change").slice(0, limit).map((item) => recordCard(item.record, item.label, "ok"));
}

function hasSafetyWord(chain) {
  return ["자해", "죽", "과다", "응급", "폭력", "운전", "위험"].some((word) => chain.text.includes(word));
}

function valueWords(text) {
  // "일"처럼 지나치게 일반적인 한 글자 단어는 "일요일", "며칠" 등과 오탐되어 제외했습니다.
  return ["가족", "건강", "회복", "약속", "관계", "삶", "가치"].some((word) => text.includes(word));
}

function negativeWords(text) {
  return ["불안", "수치", "분노", "우울", "공허", "외로", "초조", "답답", "무기력", "짜증", "두려", "불편", "힘들", "못 바뀐", "무능", "부족"].some((word) => text.includes(word));
}

function groupPractice() {
  const map = new Map();
  state.practicePlans.forEach((plan) => {
    map.set(plan.id || plan.name, { ...plan, records: [] });
  });
  state.records.filter((record) => record.category === "practice").forEach((record) => {
    const key = record.sourceScores?.practiceId || record.title || record.chainId;
    if (!map.has(key)) map.set(key, { id: key, name: record.title || "실천행동", plannedDays: null, plannedTimes: null, plannedTotal: null, records: [] });
    map.get(key).records.push(record);
  });
  return [...map.values()].map((group) => {
    const scores = group.records.map((record) => record.sourceScores.practiceScore ?? record.intensity).filter((value) => Number.isFinite(Number(value))).map(Number);
    const scoreSum = scores.reduce((sum, value) => sum + value, 0);
    const completedCount = group.records.reduce((sum, record) => sum + (Number(record.sourceScores?.completedCount) || 0), 0);
    const recordedCount = group.records.filter((record) => record.sourceScores?.recordedScore || Number.isFinite(Number(record.sourceScores?.practiceScore ?? record.intensity))).length;
    const plannedTotal = group.plannedTotal;
    const pick = (key) => group.records.map((record) => record.sourceScores?.[key]).filter((value) => value !== null && value !== undefined);
    const pleasureAvg = average(pick("pleasureScore"));
    const masteryAvg = average(pick("masteryScore"));
    const expectedPleasureAvg = average(pick("expectedPleasureScore"));
    const expectedMasteryAvg = average(pick("expectedMasteryScore"));
    return {
      name: group.name,
      count: group.records.length,
      plannedTotal,
      completedCount,
      recordedCount,
      completionRate: plannedTotal ? Math.round((completedCount / plannedTotal) * 100) : null,
      recordingRate: plannedTotal ? Math.round((recordedCount / plannedTotal) * 100) : null,
      plannedAverage: plannedTotal ? Math.round((scoreSum / plannedTotal) * 10) / 10 : null,
      misses: plannedTotal === null ? scores.filter((score) => score <= state.thresholds.practice).length : Math.max(0, plannedTotal - completedCount),
      sample: group.records.map((record) => record.content).filter(Boolean).slice(0, 2).join(" / "),
      pleasureAvg,
      masteryAvg,
      pleasureGap: pleasureAvg !== null && expectedPleasureAvg !== null ? Math.round((pleasureAvg - expectedPleasureAvg) * 10) / 10 : null,
      masteryGap: masteryAvg !== null && expectedMasteryAvg !== null ? Math.round((masteryAvg - expectedMasteryAvg) * 10) / 10 : null,
    };
  });
}

function pleasureMasteryHtml(group) {
  const parts = [];
  if (group.pleasureAvg !== null) {
    const gapText = group.pleasureGap !== null ? ` (예상 대비 ${group.pleasureGap >= 0 ? "+" : ""}${group.pleasureGap})` : "";
    parts.push(`즐거움 평균 ${group.pleasureAvg.toFixed(1)}/10${gapText}`);
  }
  if (group.masteryAvg !== null) {
    const gapText = group.masteryGap !== null ? ` (예상 대비 ${group.masteryGap >= 0 ? "+" : ""}${group.masteryGap})` : "";
    parts.push(`성취감 평균 ${group.masteryAvg.toFixed(1)}/10${gapText}`);
  }
  return parts.length ? `<p>${parts.join(" · ")}</p>` : "";
}

// 실천 후 즐거움/성취감이 예상보다 뚜렷하게(2점 이상) 컸던 개별 기록을 찾습니다.
// 행동활성화 문헌에서 우울 개선과 관련이 크다고 보는 "예상-경험 불일치" 순간을 그대로 뽑아 보여줍니다.
function pleasureSurpriseRecords(limit = 6) {
  return state.records
    .filter((record) => record.category === "practice" && record.recordType === "practice_log")
    .map((record) => {
      const s = record.sourceScores || {};
      const pleasureGap = s.pleasureScore !== null && s.pleasureScore !== undefined && s.expectedPleasureScore !== null && s.expectedPleasureScore !== undefined
        ? s.pleasureScore - s.expectedPleasureScore
        : null;
      const masteryGap = s.masteryScore !== null && s.masteryScore !== undefined && s.expectedMasteryScore !== null && s.expectedMasteryScore !== undefined
        ? s.masteryScore - s.expectedMasteryScore
        : null;
      const maxGap = Math.max(pleasureGap ?? -Infinity, masteryGap ?? -Infinity);
      return { record, pleasureGap, masteryGap, maxGap };
    })
    .filter((item) => item.maxGap >= 2)
    .sort((a, b) => b.maxGap - a.maxGap)
    .slice(0, limit);
}

function pleasureSurpriseCard({ record, pleasureGap, masteryGap }) {
  const s = record.sourceScores || {};
  const lines = [];
  if (pleasureGap !== null) lines.push(`즐거움: 예상 ${s.expectedPleasureScore}/10 → 실제 ${s.pleasureScore}/10 (+${pleasureGap})`);
  if (masteryGap !== null) lines.push(`성취감: 예상 ${s.expectedMasteryScore}/10 → 실제 ${s.masteryScore}/10 (+${masteryGap})`);
  return card(
    `${escapeHtml(formatDate(record.createdAt))} · ${escapeHtml(record.title)}`,
    `<p>${lines.join("<br>")}</p>${record.content ? `<p>${escapeHtml(record.content)}</p>` : ""}`,
    "ok",
    ["이 예상 밖의 긍정 경험이 왜 가능했나요?", "어떤 시간·장소·사람 조건이 다시 재현 가능한가요?", "이걸 다음 계획에 어떻게 반영할까요?"],
  );
}

function practiceStatsHtml(group) {
  if (group.plannedTotal === null || group.plannedTotal === 0) {
    return `<p>계획 횟수 정보 없음 · 기록 ${group.count}개</p><p class="muted">계획 반영 평균을 계산하려면 주당 일수와 하루 약속 횟수가 필요합니다.</p>`;
  }
  return `<p>약속 ${group.plannedTotal}회 · 완료 ${group.completedCount}회 (${group.completionRate}%) · 기록 ${group.recordedCount}회 (${group.recordingRate}%)</p><p><strong>계획 반영 평균 실천점수 ${group.plannedAverage} / 10</strong> · 미완료 ${group.misses}회</p>`;
}

function actionLabel(value) {
  const score = score5(value);
  return score === null ? "" : `문제행동 활성화 수준 ${score}/5`;
}

function textList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";
}

function joinText(values) {
  return values.map(textList).filter((value) => value !== undefined && value !== null && String(value).trim() !== "").join(" · ");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(/\./g, "-").replace(/\//g, "-"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "날짜 없음";
  return date.toISOString().slice(0, 10);
}

function score10(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10) return null;
  return Math.round(number);
}

function score100(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 100, null);
}

function score5(value) {
  if (value === true || value === "true" || value === "yes") return 5;
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 5, null);
}

function wholeNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function reportedCompletionCount(payload, score) {
  const explicit = wholeNumber(firstDefined(payload.completed_count, payload.completedCount, payload.completion_count));
  if (explicit !== null) return explicit;
  if (payload.completed === true || payload.completed === "true" || payload.completed === "yes") return 1;
  if (payload.completed === false || payload.completed === "false" || payload.completed === "no") return 0;
  return score !== null && score > 0 ? 1 : 0;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function clamp(number, min, max, fallback) {
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function infoRows(rows) {
  return rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
}

function downloadText(filename, text, mimeType = "application/json;charset=utf-8", triggerButton = null) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showSaveComplete(filename, triggerButton);
}

function showSaveComplete(filename, triggerButton = null) {
  const message = `저장 요청 완료: ${filename} · 브라우저 다운로드 폴더 또는 선택한 저장 위치를 확인하세요.`;
  if (els.saveStatus) {
    els.saveStatus.textContent = message;
    els.saveStatus.classList.add("saved");
  }
  showImportMessages([message]);
  flashSaveButton(triggerButton);
}

function flashSaveButton(button) {
  if (!button || !button.textContent) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "저장 요청 완료";
  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = original;
  }, 2200);
}

// 브라우저 다운로드 방식으로는 폴더를 자동으로 만들 수 없어(자바스크립트가 파일 시스템에 직접
// 접근할 수 없음), 대신 파일명만 보고도 어떤 내담자의 어느 기간 자료인지 알 수 있게 만듭니다.
function sanitizeForFilename(text) {
  return String(text || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim() || "내담자";
}

function computeDataDateRangeLabel() {
  const allDates = [
    ...state.observationDays.map((day) => day.dateTs),
    ...state.dailyCheckins.map((day) => day.dateTs),
  ].filter((ts) => ts !== null && ts !== undefined);
  if (!allDates.length) return dateStamp();
  const start = formatDate(new Date(Math.min(...allDates))).replace(/-/g, "");
  const end = formatDate(new Date(Math.max(...allDates))).replace(/-/g, "");
  return start === end ? start : `${start}~${end}`;
}

function buildSummaryFileName() {
  const clientAlias = getClientAlias();
  return `${sanitizeForFilename(clientAlias)}_${computeDataDateRangeLabel()}_상담기록요약.json`;
}

function buildSessionPrepFileName() {
  const clientAlias = getClientAlias();
  return `${sanitizeForFilename(clientAlias)}_${computeDataDateRangeLabel()}_AI회기준비자료.md`;
}

function buildAiContextFileName() {
  const clientAlias = getClientAlias();
  return `${sanitizeForFilename(clientAlias)}_${computeDataDateRangeLabel()}_AI회기맥락누적요약.md`;
}

function buildAiReportFileName() {
  const clientAlias = getClientAlias();
  return `${sanitizeForFilename(clientAlias)}_${computeDataDateRangeLabel()}_AI상세분석원자료.txt`;
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();




