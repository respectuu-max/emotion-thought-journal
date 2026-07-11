const APP_VERSION = "20260710v21";

// 이 앱은 마음고요 관찰과 실천의 현재 CSV 규격(maeumgoyo_csv_v1)만 읽습니다.
// 구버전 CSV 하위 호환은 지원하지 않습니다 — 다른 규격의 CSV는 명확한 오류로 안내하고 중단합니다.
const CSV_SCHEMA = "maeumgoyo_csv_v1";
const REQUIRED_COLUMNS = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];
const RECORD_TYPES = ["observation", "practice_definition", "practice_log", "prediction"];

const state = {
  rows: [],
  records: [],
  chains: [],
  predictions: [],
  observationDays: [],
  relapseWindow: null,
  activeView: "data",
  fileName: "",
  shareMode: "",
  shareModeLabel: "",
  rangeLabel: "",
  rangeDays: null,
  importMessages: [],
  practicePlans: [],
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
  sampleBtn: document.getElementById("sampleBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  resetBtn: document.getElementById("resetBtn"),
  printBtn: document.getElementById("printBtn"),
  exportBtn: document.getElementById("exportBtn"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
};

const VIEWS = [
  ["data", "1. 자료 확인", "CSV 구성, 자료 범위, 상담 전 확인"],
  ["feedback", "2. 오늘의 측정 피드백", "개인 내 변화, 좋아진 점, 주의할 점"],
  ["readiness", "3. 피드백 준비도", "변화언어, 유지언어, 피드백 제시 방식"],
  ["safety", "4. 재발 조기경보·위기대처", "정서·인지 신호, STOP/TIPP, 조기 도움요청"],
  ["chain", "5. 연쇄 이해", "트리거-생각-감정-몸-충동-행동"],
  ["success", "6. 성공·강도감소", "부분 성공, 보호요인, 행동 강도 감소"],
  ["practice", "7. 가치기반 실천·회복 유지", "작은 실천, 가치, 회복 유지 위험"],
  ["prediction", "8. 걱정-결과 비교", "예상한 심각도와 실제 결과, 인지왜곡 재검토"],
  ["summary", "9. 회기 피드백 요약", "위험·변화·다음 주 실천 정리"],
];

const CATEGORY_LABELS = {
  situation: "상황",
  thought: "생각",
  emotion: "감정/몸반응",
  urge: "충동",
  action: "행동화",
  practice: "대처/실천",
};

// maeumgoyo_csv_v1(현재 규격) 예시. schema_version, share_mode, range_days 등 공통 열과
// observation/practice_definition/practice_log/prediction 4개 record_type을 모두 포함해
// "예시" 버튼만으로도 v1 파싱 경로 전체(연쇄, 실천 계획 완료율, 예측 비교)를 확인할 수 있게 했습니다.
const sampleCsv = `schema_version,record_type,id,date,updated_at,exported_at,client_alias,share_mode,range_days,payload_json
maeumgoyo_csv_v1,observation,o1,2026-07-05,2026-07-05T21:10:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""time_slot"":""저녁"",""behavior_areas"":[""음주""],""emotion"":""공허함"",""body_reactions"":[""가슴 답답함"",""초조함""],""situation"":""퇴근 후 혼자 집에 있었고 술 생각이 강해짐"",""trigger_places"":[""집""],""trigger_people"":[""혼자 있을 때""],""trigger_times"":[""밤/늦은 시간""],""avoidance_tags"":[""연락에 답하지 않음""],""thought_text"":""오늘은 너무 힘들었으니 한 잔 정도는 괜찮다"",""thought_score"":7,""emotion_score"":8,""urge_score"":9,""urge_initial_score"":6,""urge_end_score"":3,""action_level"":4,""coping"":""편의점 앞에서 10분 걷기"",""coping_score"":3,""value"":""가족과 약속 지키기"",""value_action_draft"":""집에 오면 바로 샤워하고 따뜻한 차 마시기""}"
maeumgoyo_csv_v1,observation,o2,2026-07-07,2026-07-07T13:20:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""time_slot"":""오후"",""behavior_areas"":[""회피/미루기""],""emotion"":""불안"",""body_reactions"":[""손 떨림""],""situation"":""친구의 권유를 받음"",""trigger_people"":[""특정 인물과 함께""],""thought_text"":""거절하면 관계가 어색해질 것이다"",""thought_score"":6,""emotion_score"":6,""urge_score"":8,""action_level"":1,""coping"":""잠깐 화장실에 가서 STOP을 떠올림"",""coping_score"":7,""value"":""회복을 우선하기"",""value_action_draft"":""오늘은 약속이 있다고 말하기""}"
maeumgoyo_csv_v1,observation,o3,2026-07-09,2026-07-09T22:05:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""time_slot"":""저녁"",""emotion"":""수치심"",""body_reactions"":[""무기력""],""situation"":""자기 전에 스마트폰을 오래 봄"",""thought_text"":""나는 결국 못 바뀐다"",""thought_score"":5,""emotion_score"":6,""urge_score"":4,""action_level"":0,""coping"":""상담 메모 보기"",""coping_score"":5,""gratitude"":""오늘은 저녁을 챙겨 먹었다"",""value"":""건강 회복"",""value_action_draft"":""내일 오전 병원 예약 확인""}"
maeumgoyo_csv_v1,practice_definition,p1,,2026-07-01T08:00:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""practice_value"":""건강"",""practice_name"":""귀가 후 10분 걷기"",""practice_reason"":""회피가 좁힌 생활반경을 넓힌다"",""frequency"":""3week"",""target_count"":1,""start_date"":""2026-07-01"",""small_version"":""현관 밖으로 나가기"",""archived"":""0""}"
maeumgoyo_csv_v1,practice_log,l1,2026-07-06,2026-07-06T20:30:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""practice_id"":""p1"",""practice_value"":""건강"",""practice_name"":""귀가 후 10분 걷기"",""target_count"":1,""pleasure_score"":6,""mastery_score"":5,""expected_pleasure_score"":3,""expected_mastery_score"":3,""practice_note"":""생각보다 개운했다""}"
maeumgoyo_csv_v1,practice_log,l2,2026-07-08,2026-07-08T21:00:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""practice_id"":""p1"",""practice_value"":""건강"",""practice_name"":""귀가 후 10분 걷기"",""target_count"":1,""pleasure_score"":0,""mastery_score"":0,""practice_note"":""비가 와서 못 했다. 대신 바로 누웠다.""}"
maeumgoyo_csv_v1,prediction,pr1,2026-07-07,2026-07-08T09:00:00.000Z,2026-07-10T09:00:00.000Z,K-001,counselor_full,7,"{""related_observation_id"":""o2"",""worry_text"":""거절하면 그 친구가 완전히 멀어질 것이다"",""predicted_severity"":8,""status"":""occurred"",""actual_severity"":3,""resolved_at"":""2026-07-09T00:00:00.000Z"",""note"":""다음 날 평소처럼 연락이 왔다""}"`;

function init() {
  if (els.versionBadge) els.versionBadge.textContent = APP_VERSION;
  document.title = `마음고요 상담분석실 ${APP_VERSION}`;
  renderMenu();
  bindEvents();
  render();
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

  els.sampleBtn.addEventListener("click", () => ingestCsv(sampleCsv, "예시 CSV"));
  els.resetBtn.addEventListener("click", () => resetAll());
  els.printBtn.addEventListener("click", () => window.print());
  els.exportBtn.addEventListener("click", exportSummary);
  els.copySummaryBtn.addEventListener("click", copySessionSummary);
  els.refreshBtn.addEventListener("click", refreshApp);
}

function renderMenu() {
  els.therapyMenu.innerHTML = VIEWS.map(([id, title, desc]) => `
    <button type="button" data-view="${id}" class="${id === state.activeView ? "active" : ""}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(desc)}</span>
    </button>
  `).join("");

  els.therapyMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      renderMenu();
      renderTherapyView();
    });
  });
}

function readFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showImportMessages(["파일이 5MB를 초과합니다. 필요한 기간과 한 명의 내담자 자료만 포함한 CSV를 사용하세요."]);
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
  return rows.filter((row) => row.schema_version === CSV_SCHEMA && row.share_mode === "counselor_full");
}

function ingestCsv(text, fileName) {
  resetDataOnly();
  state.fileName = fileName;
  state.rows = parseCsv(text);

  const validation = validateRows(state.rows);
  if (validation.errors.length) {
    state.importMessages = validation.errors;
    state.rows = [];
    state.fileName = "";
    render();
    return;
  }

  const usableRows = filterUsableRows(state.rows);
  if (!usableRows.length) {
    state.importMessages = [`schema_version=${CSV_SCHEMA}이면서 share_mode=counselor_full인 행이 없어 분석할 자료가 없습니다.`];
    state.rows = [];
    state.fileName = "";
    render();
    return;
  }

  const rangeWindow = resolveRangeWindow(usableRows);
  state.practicePlans = extractPracticePlans(usableRows, rangeWindow);
  state.records = normalizeRows(usableRows);
  state.predictions = extractPredictions(usableRows);
  state.observationDays = extractObservationDays(usableRows);
  state.relapseWindow = computeRelapseWindowSignal(state.observationDays, rangeWindow.endTs);
  state.importMessages = validation.warnings;
  detectMeta(rangeWindow);
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
  const rangeDaysRaw = rows.map((row) => row.range_days).find((value) => value !== undefined && value !== "");
  const exportedTs = dateOnly(firstRow.exported_at) ?? Date.now();
  const dataDates = rows.map((row) => dateOnly(row.date)).filter((value) => value !== null);
  let startTs;
  let endTs = exportedTs;
  let days = null;
  let label = "";

  if (rangeDaysRaw === "all") {
    startTs = dataDates.length ? Math.min(...dataDates) : endTs;
    label = "전체 기간";
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
        archived: payload.archived === "1" || payload.archived === true,
      };
    })
    .filter((plan) => plan.id || plan.name);
}

// prediction record_type을 별도 목록으로 추출합니다(연쇄 카드가 아니라 걱정-결과 비교 자료).
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

// --- 재발신호 (연동명세서 §5-2) ---
// "마음고요 관찰과 실천" 앱 화면(오늘할일, 재발예방 탭)이 실제로 계산하는 것과 동일한 신호를
// 상담분석실에서도 동일한 원자료로 재현합니다. observation record_type에서만 값을 가져오며,
// CSV엔 이 신호 자체가 별도 열로 저장되지 않으므로 여기서 직접 계산합니다.
function asTagArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
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
        behaviorAreas: asTagArray(payload.behavior_areas),
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
  ["behaviorAreas", "문제행동 영역"],
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
    "촉발단서·문제행동영역 분석",
    `<p class="muted">평균충동이 높게 표시된 항목은 등장 횟수는 적어도 우선 확인할 가치가 있습니다.</p>${sections}`,
    "focus",
    ["가장 자주 등장하는 촉발단서는 무엇인가요?", "평균 충동이 가장 높은 항목은 등장 빈도와 일치하나요, 다른가요?", "이 패턴을 회피계획이나 환경조정에 어떻게 반영할까요?"],
  );
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
  let nonCounselorModeCount = 0;
  const seenIds = new Set();
  const duplicateIds = new Set();

  rows.forEach((row, index) => {
    if (row.schema_version !== CSV_SCHEMA) mismatchedVersionCount += 1;
    if (row.payload_json && parsePayload(row.payload_json) === null) {
      badJsonCount += 1;
      if (badJsonCount <= 5) errors.push(`${index + 2}행의 payload_json 형식이 올바르지 않습니다.`);
    }
    if (row.record_type && !RECORD_TYPES.includes(row.record_type)) unknownTypeCount += 1;
    if (row.share_mode !== "counselor_full") nonCounselorModeCount += 1;
    if (row.id) {
      if (seenIds.has(row.id)) duplicateIds.add(row.id);
      seenIds.add(row.id);
    }
  });

  if (badJsonCount > 5) errors.push(`이 밖에도 payload_json 형식이 올바르지 않은 행이 ${badJsonCount - 5}개 더 있습니다.`);
  if (mismatchedVersionCount) warnings.push(`schema_version이 ${CSV_SCHEMA}가 아닌 행 ${mismatchedVersionCount}개는 건너뜁니다.`);
  if (unknownTypeCount) warnings.push(`알 수 없는 record_type을 가진 행 ${unknownTypeCount}개는 건너뜁니다.`);
  if (nonCounselorModeCount) warnings.push(`share_mode가 counselor_full이 아닌 행 ${nonCounselorModeCount}개는 상담자 전체 자료가 아니므로 건너뜁니다.`);
  if (duplicateIds.size) warnings.push(`같은 id가 여러 번 나타나는 기록이 ${duplicateIds.size}개 있습니다. 여러 주차 CSV를 합칠 때는 updated_at이 더 최신인 쪽만 반영하는 것을 권장합니다. 이번 분석에서는 먼저 나오는 행을 기준으로 처리합니다.`);
  if (rows.length > 5000) warnings.push(`행이 ${rows.length}개로 앱이 정상적으로 만드는 CSV(최대 5,000행) 범위를 넘습니다. 여러 CSV를 이어붙였다면 의도한 파일이 맞는지 확인하세요.`);

  const clients = unique(rows.map((row) => row.client_alias));
  if (clients.length > 1) errors.push("한 번에 한 명의 내담자 CSV만 분석할 수 있습니다. 내담자별로 파일을 분리하세요.");

  return { errors: unique(errors), warnings: unique(warnings) };
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
      const behaviorAreas = joinText([textList(payload.behavior_areas), textList(payload.behavior_custom_areas)]);
      const triggerText = joinText([textList(payload.trigger_places), textList(payload.trigger_people), textList(payload.trigger_times), textList(payload.trigger_custom)]);
      const avoidanceText = joinText([textList(payload.avoidance_tags), textList(payload.avoidance_custom)]);

      pushRecord(
        records, base, chainId, "situation", "상황",
        joinText([payload.situation, triggerText ? `촉발단서: ${triggerText}` : "", behaviorAreas ? `관련 영역: ${behaviorAreas}` : "", avoidanceText ? `회피 신호: ${avoidanceText}` : ""]),
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
        records, base, chainId, "action", "문제행동 수준",
        actionLabel(payload.action_level), null,
        { actionLevel: score5(payload.action_level) },
      );

      pushRecord(
        records, base, chainId, "practice", "대처/가치실천",
        joinText([payload.coping, payload.value_action_draft, payload.value, payload.gratitude ? `감사: ${payload.gratitude}` : "", payload.insight ? `알아차림: ${payload.insight}` : ""]),
        score10(payload.coping_score),
        { practiceScore: score10(payload.coping_score) },
      );
    }

    if (row.record_type === "practice_log") {
      const def = practiceDefs.get(payload.practice_id) || {};
      const pleasure = score10(payload.pleasure_score);
      const mastery = score10(payload.mastery_score);
      const rawScore = score10(payload.practice_score);
      // practice_score는 pleasure/mastery의 평균으로 자동 계산되는 하위호환용 필드입니다.
      // pleasure/mastery가 모두 있으면 그 평균을 신뢰하고, 없으면 practice_score나 단일값으로 대체합니다.
      const score = pleasure !== null && mastery !== null ? Math.round(((pleasure + mastery) / 2) * 10) / 10 : firstDefined(rawScore, pleasure, mastery) ?? null;
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

    // record_type === "prediction"은 연쇄(chain) 레코드가 아니라 별도의 관찰-예측 비교 자료이므로
    // 여기서는 만들지 않고 extractPredictions()에서 state.predictions로 따로 관리합니다.
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

function detectMeta(rangeWindow) {
  state.shareMode = "counselor_full"; // v1 CSV는 항상 counselor_full만 존재(다른 값은 이미 필터링됨)
  state.shareModeLabel = "상담자용 상세(치료자료 전체본)";
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
  renderTherapyView();
  renderChains();
}

function renderMeta() {
  els.fileMeta.textContent = state.fileName
    ? `${state.fileName} · CSV ${state.rows.length}행 · 분석 기록 ${state.records.length}개${state.predictions.length ? ` · 예측 기록 ${state.predictions.length}개` : ""}`
    : "아직 불러온 파일이 없습니다.";

  const privacy = "이 CSV는 항상 상담자 치료자료 전체본(counselor_full)입니다. 상황·생각 등 자유서술에 내담자가 실명이나 특정 가능한 정보를 직접 적었을 수 있으니, 저장·전송 시 암호화·접근 제한 등 민감정보 보호 조치를 적용하세요.";

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
  ];
  if (state.predictions.length) infoList.push(["걱정-결과 예측", `${state.predictions.length}개`]);
  els.schemaInfo.innerHTML = infoRows(infoList);
}

function showImportMessages(messages = []) {
  els.importStatus.hidden = !messages.length;
  els.importStatus.textContent = messages.join(" ");
}

function renderMetrics() {
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).length;
  const success = chains(isControlled).length;
  const missed = chains((chain) => chain.missedPractice).length;
  const feedbackSignals = chains((chain) => isMotivationDip(chain) || isLatentChain(chain) || isPartialSuccess(chain)).length;
  const emotionalWarnings = chains((chain) => relapseSignals(chain).emotional.length > 0).length;
  const cognitiveWarnings = chains((chain) => relapseSignals(chain).cognitive.length > 0).length;
  els.metrics.innerHTML = [
    ["분석 기록", state.records.length],
    ["연쇄", state.chains.length],
    ["고위험", highRisk],
    ["성공/억제", success],
    ["실천 조정", missed],
    ["피드백 신호", feedbackSignals],
    ["정서 주의", emotionalWarnings],
    ["인지 주의", cognitiveWarnings],
    ["예측 기록", state.predictions.length],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderTherapyView() {
  const view = VIEWS.find(([id]) => id === state.activeView) || VIEWS[0];
  els.activeStepLabel.textContent = view[1];

  const intro = renderIntro(state.activeView);
  const content = state.records.length ? renderWorkbench(state.activeView) : renderEmpty();
  els.therapyView.innerHTML = intro + content;
}

function renderIntro(viewId) {
  const guide = {
    data: ["CSV 구조 확인", "레코드 구성 확인", "자료 범위 확인", "새 자료 사용 시 이전 분석 초기화"],
    feedback: ["평균/최고 충동", "문제행동 수준", "실천행동 수행도", "개인 내 변화 피드백"],
    readiness: ["변화언어 확인", "유지언어 확인", "양가감정 반영", "피드백 제시 방식 선택"],
    safety: ["정서·인지 신호 동시 점검", "단계별 자가관리", "STOP/TIPP 위기대처", "행동 후 조기 도움요청"],
    chain: ["상황/트리거", "생각-감정-몸반응", "충동-문제행동", "고위험/저충동 잠복 연쇄"],
    success: ["충동 속 멈춤", "행동 강도 감소", "보호요인", "다음 주 재현 조건"],
    practice: ["가치 연결 실천", "작은 성공 경험", "회복 유지 위험", "다음 주 1% 행동"],
    prediction: ["걱정한 결과 예측 확인", "실제로 일어난 결과와 비교", "예측-경험 불일치 확인", "파국적 사고 재검토"],
    summary: ["위험요약", "성공요약", "변화언어", "다음 회기 확인점"],
  }[viewId];
  const title = VIEWS.find(([id]) => id === viewId)?.[1] || "치료작업";
  return `
    <div class="view-intro">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">내담자 자료를 상담 회기 작업 순서에 맞게 재배열합니다.</p>
      </div>
      <ol>${guide.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
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

function renderDataView() {
  const typeCounts = state.rows.reduce((acc, row) => {
    acc[row.record_type] = (acc[row.record_type] || 0) + 1;
    return acc;
  }, {});
  const structural = [
    card("CSV 구조", `<p>스키마: <strong>${escapeHtml(CSV_SCHEMA)}</strong></p><p>record_type과 payload_json 기반 자료를 읽었습니다.</p>`, "focus"),
    card("공유 모드", `<p><strong>${escapeHtml(state.shareModeLabel)}</strong></p><p>이 CSV는 항상 상담자 치료자료 전체본이며, 요약·가족 공유용으로 만들어지지 않습니다.</p>`, "ok"),
    card("자료 보호", `<p>원본 CSV 파일 자체는 저장하지 않습니다.</p><p>단, "요약 저장" 파일에는 내담자가 기록한 실제 문장이 연쇄별 요약으로 포함되므로 민감정보 문서로 보관해야 합니다.</p>`, "focus"),
  ];
  const composition = [
    card(
      "레코드 구성",
      `<p>observation ${typeCounts.observation || 0}건 · practice_definition ${typeCounts.practice_definition || 0}건 · practice_log ${typeCounts.practice_log || 0}건 · prediction ${typeCounts.prediction || 0}건</p>`,
      "focus",
    ),
  ];
  const visual = visualFeedback(
    "자료 상태 시각 요약",
    "오늘 불러온 기록이 어떤 범위와 구성인지 먼저 확인합니다.",
    renderBarSummary([
      ["전체 기록", state.records.length * 5, "focus"],
      ["연쇄", state.chains.length * 10, "focus"],
      ["예측 기록", state.predictions.length * 12, "focus"],
      ["실천 기록", state.records.filter((record) => record.category === "practice").length * 10, "ok"],
    ]),
    [
      "이 자료는 오늘 회기에서 함께 살펴보기에 충분한가요?",
      "실천 계획(practice_definition)은 있는데 실천 기록(practice_log)이 없는 항목은 없나요?",
      "오늘은 어느 기간의 변화를 중심으로 볼까요?",
    ],
  );
  return visual + workbench([
    ["자료 상태", structural],
    ["레코드 구성", composition],
    ["상담 전 확인", [
      card("확인 질문", "", "focus", ["이 파일의 자료 범위가 오늘 회기에서 다루려는 기간과 맞는가?", "practice_definition이 있는데 practice_log가 없는 항목은 없는가?", "새 CSV를 불러오기 전 이전 자료가 제거되는가?"]),
    ]],
  ]);
}

function renderMeasurementFeedbackView() {
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "주의할 위험 피드백", "warn"));
  const success = chains(isControlled).slice(0, 3).map((chain) => chainCard(chain, "좋아진 점 피드백", "ok"));
  const partial = chains(isPartialSuccess).slice(0, 3).map((chain) => chainCard(chain, "강도감소 피드백", "ok"));
  const maintenance = chains(isMotivationDip).slice(0, 3).map((chain) => chainCard(chain, "회복 유지 위험", "focus"));
  const visual = visualFeedback(
    "오늘의 측정치 흐름",
    "충동, 행동화, 실천행동을 같은 시간축에 놓고 내담자가 먼저 해석하도록 돕습니다.",
    renderTrendSvg(state.chains.slice().reverse()),
    [
      "그래프에서 가장 먼저 눈에 들어오는 변화는 무엇인가요?",
      "충동은 높았지만 행동화가 낮아진 지점이 있나요?",
      "실천행동 점수가 낮아진 구간은 회복 유지 위험과 연결되나요?",
      "다음 주에도 확인하고 싶은 선은 충동, 행동화, 실천 중 무엇인가요?",
    ],
    renderBarSummary([
      ["고위험", chains((chain) => chain.highUrge && chain.actionized).length * 20, "warn"],
      ["성공/억제", chains(isControlled).length * 20, "ok"],
      ["회복 유지 위험", chains(isMotivationDip).length * 20, "focus"],
    ]),
    ["urge", "action", "practice"],
  );
  return visual + workbench([
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
    "피드백 준비도",
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
    ["공식 재발신호", [relapseWindowSummaryCard()]],
    ["1. 정서적 재발 주의", emotional.map(({ chain, signals }) => relapseCard(chain, "emotional", signals.emotional))],
    ["2. 인지적 재발 경고", cognitive.map(({ chain, signals }) => relapseCard(chain, "cognitive", signals.cognitive))],
    ["정서·인지 신호 겹침", overlap.map(({ chain, signals }) => relapseCard(chain, "overlap", signals.emotional.concat(signals.cognitive)))],
    ["3. 행동 후 조기 회복", behavioral.map(({ chain, signals }) => relapseCard(chain, "behavior", signals.behavior)).concat([
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
    "성공·강도감소 변화",
    "충동이 남아 있어도 행동화 강도가 낮아진 지점을 회복의 증거로 시각화합니다.",
    renderTrendSvg(state.chains.slice().reverse().filter((chain) => chain.highUrge || isPartialSuccess(chain) || texts(chain, "practice")), { only: ["urge", "action", "practice"] }),
    [
      "충동은 높았지만 행동화 선이 낮아진 지점이 있나요?",
      "그 지점에서 어떤 대처나 실천이 함께 있었나요?",
      "완전한 무증상이 아니어도 강도 감소를 변화로 인정할 수 있나요?",
      "다음 주에도 이 차이를 재현하려면 어떤 조건이 필요할까요?",
    ],
    "",
    ["urge", "action", "practice"],
  );
  return visual + workbench([
    ["성공/억제 기록", success.map((chain) => chainCard(chain, "충동을 견딘 기록", "ok"))],
    ["강도감소 성공", partial.map((chain) => card("성중독/반복충동 변화 피드백", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["성충동이나 생각이 남아 있어도 행동 강도가 낮아진 점을 변화로 피드백합니다.", "완전한 무증상보다 빈도·강도·지속시간·회복시간의 변화를 봅니다.", "무엇이 강도를 낮추는 데 도움이 되었는지 구체화합니다."]))],
    ["도움된 조건", coping.map((chain) => card("보호요인 후보", `<p>${texts(chain, "practice") || "기록 없음"}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["어떤 조건이 행동화를 낮췄는가?", "다음 주에도 재현할 수 있는가?", "누가/무엇이 보호요인이 되었는가?"]))],
    ["강화 문장", [card("상담자 반영", "", "ok", ["충동이 사라져서가 아니라, 충동이 있는 상태에서 멈춘 점을 강화합니다.", "결과보다 시도와 조건을 구체적으로 반영합니다.", "다음 주 반복 가능한 작은 행동으로 연결합니다."])]],
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
      "실천행동이 올라간 뒤 충동이나 행동화가 달라진 지점이 있나요?",
      "충동이 낮아지면서 실천도 낮아진 회복 유지 위험 구간이 있나요?",
      "0이 아니라 1이 된 작은 행동은 무엇인가요?",
      "다음 주 가치 쪽으로 움직이는 1% 행동은 무엇인가요?",
    ],
    renderBarSummary(groups.slice(0, 4).map((group) => [group.name.slice(0, 8), group.plannedAverage === null ? 0 : group.plannedAverage * 10, group.misses ? "warn" : "ok"])),
    ["urge", "practice"],
  );
  return visual + workbench([
    ["실천 수행도", performanceCards],
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
    return workbench([["안내", [card("예측 기록 없음", "<p>이 CSV에는 걱정-결과 예측(prediction) 기록이 없습니다.</p>", "focus")]]]);
  }

  const stats = predictionAccuracyStats(state.predictions);
  const pending = state.predictions.filter((p) => p.status === "pending");
  const occurred = state.predictions.filter((p) => p.status === "occurred");
  const partial = state.predictions.filter((p) => p.status === "partial");
  const didNotOccur = state.predictions.filter((p) => p.status === "did_not_occur");

  const visual = visualFeedback(
    "예상한 결과 vs 실제 결과",
    "걱정한 일이 실제로 얼마나 일어났는지 돌아보면, 파국적 예측 패턴을 구체적인 근거로 다룰 수 있습니다.",
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

function renderSessionFeedbackSummaryView() {
  const risky = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3);
  const latent = chains(isLatentChain).slice(0, 3);
  const success = chains(isControlled).concat(chains(isPartialSuccess)).slice(0, 4);
  const maintenance = chains(isMotivationDip).slice(0, 3);
  const changeTalk = detectMotivation("change").slice(0, 3);
  const visual = visualFeedback(
    "회기 피드백 요약 그래프",
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
    ["오늘의 변화", success.map((chain) => chainCard(chain, isPartialSuccess(chain) ? "강도감소 성공" : "성공/억제 연쇄", "ok")).concat(changeTalk.map((item) => recordCard(item.record, item.label, "ok")))],
    ["회복 유지", maintenance.map((chain) => chainCard(chain, "회복 유지 위험", "focus"))],
    ["다음 주 계획", [card("회기 피드백 요약", `<p>요약 저장 파일에는 원본 CSV가 저장되지 않고 현재 분석 요약과 상담 메모만 저장됩니다.</p>`, "focus", [
      "다음 주 첫 번째로 확인할 위험 신호는 무엇인가?",
      "다시 재현할 작은 성공 조건은 무엇인가?",
      "위기 때 사용할 30초 마음챙김 호흡 과제는 무엇인가?",
      "가치 쪽으로 움직이는 1% 실천행동은 무엇인가?",
    ])]],
  ]);
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

// 충동곡선(시작→정점→종료)이 기록된 경우에만 작은 SVG로 표시합니다. "충동 발생" 모드에서만 선택적으로 기록되는 값이라
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
    action: ["#6a5acd", "행동화"],
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
    ["행동화", chain.scores.action === null ? null : chain.scores.action * 2],
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

async function copySessionSummary() {
  const text = buildSummaryText();
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showImportMessages(["회기 요약을 클립보드에 복사했습니다. 민감정보가 포함될 수 있으니 필요한 곳에만 붙여넣으세요."]);
  } catch (error) {
    showImportMessages(["요약을 복사하지 못했습니다. 브라우저의 클립보드 권한을 허용한 뒤 다시 시도하세요."]);
  }
}

function exportSummary() {
  if (!state.records.length) {
    showImportMessages(["저장할 분석 자료가 없습니다. CSV를 먼저 불러오세요."]);
    return;
  }
  if (!window.confirm("요약 파일에는 실제 기록 문장과 상담 메모가 포함될 수 있습니다. 승인된 보관 위치에 저장하시겠습니까?")) return;
  const predictionStats = predictionAccuracyStats(state.predictions);
  const practiceGroups = groupPractice();
  const payload = {
    app: "마음고요 상담분석실",
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
  downloadText(`maeumgoyo-counselor-summary-${dateStamp()}.json`, JSON.stringify(payload, null, 2));
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
    `성공/억제 연쇄: ${chains(isControlled).length}개`,
    `실천 조정 후보: ${chains((chain) => chain.missedPractice).length}개`,
    `동기저하 신호: ${chains(isMotivationDip).length}개`,
    `저충동 잠복 연쇄: ${chains(isLatentChain).length}개`,
    `강도감소 성공: ${chains(isPartialSuccess).length}개`,
    `정서적 재발 주의(개별 기록): ${chains((chain) => relapseSignals(chain).emotional.length > 0).length}개`,
    `인지적 재발 경고(개별 기록): ${chains((chain) => relapseSignals(chain).cognitive.length > 0).length}개`,
    `행동 후 조기 도움 신호: ${chains((chain) => relapseSignals(chain).behavior.length > 0).length}개`,
    "",
    "[걱정-결과 비교]",
  );
  if (state.predictions.length) {
    lines.push(`예측 기록 ${state.predictions.length}건 중 확인됨 ${predictionStats.resolvedCount}건`);
    lines.push(predictionStats.occurredRatio !== null ? `실제로 일어난 비율: ${Math.round(predictionStats.occurredRatio * 100)}%` : "확인된 예측 없음");
    if (predictionStats.avgGap !== null) lines.push(`평균 예상-실제 심각도 차이: ${predictionStats.avgGap.toFixed(1)}점`);
  } else {
    lines.push("예측 기록 없음");
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
  state.relapseWindow = null;
  state.fileName = "";
  state.shareMode = "";
  state.shareModeLabel = "";
  state.rangeLabel = "";
  state.rangeDays = null;
  state.importMessages = [];
  state.practicePlans = [];
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
  if (chain.missedPractice) tags.push(`<span class="tag warn">실천 조정</span>`);
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
  return state.records
    .filter((record) => words.some((word) => `${record.title} ${record.content}`.includes(word)))
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
    parts.push(`숙달감 평균 ${group.masteryAvg.toFixed(1)}/10${gapText}`);
  }
  return parts.length ? `<p>${parts.join(" · ")}</p>` : "";
}

// 실천 후 즐거움/숙달감이 예상보다 뚜렷하게(2점 이상) 컸던 개별 기록을 찾습니다.
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
  if (masteryGap !== null) lines.push(`숙달감: 예상 ${s.expectedMasteryScore}/10 → 실제 ${s.masteryScore}/10 (+${masteryGap})`);
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
  return score === null ? "" : `문제행동 수준 ${score}/5`;
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
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10) return null;
  return Math.round(number);
}

function score5(value) {
  if (value === true || value === "true" || value === "yes") return 5;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 5, null);
}

function wholeNumber(value) {
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

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
