const APP_VERSION = "20260710-v10";

const state = {
  rows: [],
  records: [],
  chains: [],
  activeView: "data",
  fileName: "",
  schemaVersion: "",
  shareMode: "",
  shareModeLabel: "",
  rangeLabel: "",
  thresholds: {
    urge: 8,
    action: 4,
    practice: 0,
  },
};

const els = {
  csvInput: document.getElementById("csvInput"),
  dropZone: document.getElementById("dropZone"),
  fileMeta: document.getElementById("fileMeta"),
  shareModeInfo: document.getElementById("shareModeInfo"),
  schemaInfo: document.getElementById("schemaInfo"),
  metrics: document.getElementById("metrics"),
  therapyMenu: document.getElementById("therapyMenu"),
  therapyView: document.getElementById("therapyView"),
  chainList: document.getElementById("chainList"),
  activeStepLabel: document.getElementById("activeStepLabel"),
  notes: document.getElementById("notes"),
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
  ["data", "1. 자료 확인", "공유 모드, 민감정보 제외, 분석 가능 범위"],
  ["feedback", "2. 오늘의 측정 피드백", "개인 내 변화, 좋아진 점, 주의할 점"],
  ["readiness", "3. 피드백 준비도", "변화언어, 유지언어, 피드백 제시 방식"],
  ["safety", "4. 위험·위기: STOP/TIPP 호흡훈련", "행동화 위기, 알아차림, 마음챙김 호흡"],
  ["chain", "5. 연쇄 이해", "트리거-생각-감정-몸-충동-행동"],
  ["success", "6. 성공·강도감소", "부분 성공, 보호요인, 행동 강도 감소"],
  ["practice", "7. 가치기반 실천·회복 유지", "작은 실천, 가치, 회복 유지 위험"],
  ["summary", "8. 회기 피드백 요약", "위험·변화·다음 주 실천 정리"],
];

const CATEGORY_LABELS = {
  situation: "상황",
  thought: "생각",
  emotion: "감정/몸반응",
  urge: "충동",
  action: "행동화",
  practice: "대처/실천",
};

const sampleCsv = `schema_version,record_type,id,date,updated_at,exported_at,client_alias,share_mode,range_label,payload_json
maeumgoyo_compact_v2,observation,o1,2026-07-07,2026-07-07,2026-07-10,K-001,counselor_full,최근 7일,"{""situation"":""퇴근 후 혼자 집에 있었고 술 생각이 강해짐"",""thought_text"":""오늘은 너무 힘들었으니 한 잔 정도는 괜찮다"",""emotion"":""공허감"",""body_reactions"":[""가슴 답답함"",""초조함""],""urge_score"":9,""action_level"":4,""coping"":""편의점 앞에서 10분 걷기"",""coping_score"":3,""value"":""가족과 약속 지키기"",""value_action_draft"":""집에 오면 바로 샤워하고 따뜻한 차 마시기""}"
maeumgoyo_compact_v2,observation,o2,2026-07-08,2026-07-08,2026-07-10,K-001,counselor_full,최근 7일,"{""situation"":""친구의 권유를 받음"",""thought_text"":""거절하면 관계가 어색해질 것이다"",""emotion"":""불안"",""body_reactions"":[""손에 땀""],""urge_score"":8,""action_level"":1,""coping"":""잠깐 화장실에 가서 STOP을 떠올림"",""coping_score"":7,""value"":""회복을 우선하기"",""value_action_draft"":""오늘은 약속이 있다고 말하기""}"
maeumgoyo_compact_v2,practice_definition,p1,2026-07-08,2026-07-08,2026-07-10,K-001,counselor_full,최근 7일,"{""practice_id"":""p1"",""practice_name"":""귀가 후 10분 산책"",""practice_value"":""몸을 먼저 안정시키기""}"
maeumgoyo_compact_v2,practice_log,l1,2026-07-09,2026-07-09,2026-07-10,K-001,counselor_full,최근 7일,"{""practice_id"":""p1"",""practice_score"":0,""memo"":""비가 와서 못 했다. 대신 바로 누웠다.""}"
maeumgoyo_compact_v2,observation,o3,2026-07-09,2026-07-09,2026-07-10,K-001,counselor_summary,최근 7일,"{""situation"":""민감 내용 제외"",""thought_text"":""나는 결국 못 바뀐다"",""emotion"":""수치심"",""body_reactions"":[""무기력""],""urge_score"":7,""action_level"":0,""coping"":""상담 메모 보기"",""coping_score"":5,""value"":""건강 회복"",""value_action_draft"":""내일 오전 병원 예약 확인""}"`;

function init() {
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

  [els.urgeThreshold, els.actionThreshold, els.practiceThreshold].forEach((input) => {
    input.addEventListener("input", () => {
      readThresholds();
      rebuildChains();
      render();
    });
  });

  els.sampleBtn.addEventListener("click", () => ingestCsv(sampleCsv, "예시 CSV"));
  els.resetBtn.addEventListener("click", resetAll);
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
  const reader = new FileReader();
  reader.onload = () => ingestCsv(String(reader.result || ""), file.name);
  reader.readAsText(file, "utf-8");
}

function ingestCsv(text, fileName) {
  resetDataOnly();
  state.fileName = fileName;
  state.rows = parseCsv(text);
  state.records = normalizeRows(state.rows);
  detectMeta();
  rebuildChains();
  render();
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

function normalizeRows(rows) {
  const compact = rows.some((row) => row.schema_version === "maeumgoyo_compact_v2" && "payload_json" in row);
  return compact ? normalizeCompactRows(rows) : normalizeLegacyRows(rows);
}

function normalizeCompactRows(rows) {
  const practiceDefs = new Map();
  const parsed = rows.map((row, index) => ({ row, index, payload: parsePayload(row.payload_json) }));

  parsed.forEach(({ row, payload }) => {
    if (row.record_type !== "practice_definition") return;
    const id = payload.practice_id || row.id;
    if (id) practiceDefs.set(id, payload);
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
      schemaVersion: row.schema_version || "",
      rangeLabel: row.range_label || "",
      payload,
    };

    if (row.record_type === "observation") {
      const chainId = `observation-${row.id || index + 1}`;
      pushRecord(records, base, chainId, "situation", "상황", payload.situation);
      pushRecord(records, base, chainId, "thought", "생각", payload.thought_text, score10(payload.thought_score));
      pushRecord(records, base, chainId, "emotion", payload.emotion || "감정/몸반응", joinText([payload.emotion, payload.emotion_custom, textList(payload.body_reactions), payload.body_custom]), score10(payload.emotion_score));
      pushRecord(records, base, chainId, "urge", "충동", payload.urge_note || "충동 강도 기록", score10(payload.urge_score), { urgeScore: score10(payload.urge_score) });
      pushRecord(records, base, chainId, "action", "문제행동 수준", payload.action_note || actionLabel(payload.action_level), null, { actionLevel: score5(payload.action_level) });
      pushRecord(records, base, chainId, "practice", "대처/가치실천", joinText([payload.coping, payload.value_action_draft, payload.value]), score10(payload.coping_score), { practiceScore: score10(payload.coping_score) });
    }

    if (row.record_type === "practice_log") {
      const def = practiceDefs.get(payload.practice_id) || {};
      const score = score10(payload.practice_score);
      pushRecord(
        records,
        base,
        `practice-${payload.practice_id || row.id || index + 1}`,
        "practice",
        def.practice_name || payload.practice_name || "실천행동 수행",
        joinText([def.practice_value, def.practice_name, payload.memo]),
        score,
        { practiceScore: score },
      );
    }
  });

  return records;
}

function normalizeLegacyRows(rows) {
  return rows.map((row, index) => {
    const recordType = row.record_type || row.type || row.category || "";
    const category = inferCategory(recordType);
    const content = row.content || row.memo || row.note || row.title || Object.values(row).filter(Boolean).join(" · ");
    const intensity = score10(row.intensity || row.score || row.urge_score || row.practice_score);
    return {
      id: `${row.id || "legacy"}-${index}`,
      client: row.client_id || row.client_alias || row.client || "내담자",
      chainId: row.chain_id || row.episode_id || `${row.client_id || "client"}-${row.created_at || row.date || index}`,
      date: row.created_at || row.date || "",
      createdAt: parseDate(row.created_at || row.date),
      category,
      title: row.title || CATEGORY_LABELS[category],
      content,
      intensity,
      redacted: isRedacted(content),
      recordType,
      sourceScores: {
        urgeScore: category === "urge" ? intensity : score10(row.urge_score),
        actionLevel: category === "action" ? score5(row.action_level || row.actionized) : score5(row.action_level),
        practiceScore: category === "practice" ? score10(row.practice_score || row.completed || row.intensity) : score10(row.practice_score),
      },
      payload: row,
    };
  });
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
    content: isRedacted(content) ? "" : String(content),
    redacted: isRedacted(content),
    intensity,
    recordType: base.recordType,
    shareMode: base.shareMode,
    sourceScores,
    payload: base.payload,
  });
}

function detectMeta() {
  const firstRow = state.rows[0] || {};
  const firstRecord = state.records[0] || {};
  state.schemaVersion = firstRow.schema_version || firstRecord.schemaVersion || "일반 CSV";
  state.shareMode = firstRow.share_mode || firstRecord.shareMode || "";
  state.rangeLabel = firstRow.range_label || firstRecord.rangeLabel || "";

  const modeLabels = {
    counselor_full: "상담자용 상세",
    counselor_summary: "상담자용 요약",
    family_recovery: "가족회복용",
  };
  state.shareModeLabel = modeLabels[state.shareMode] || (state.shareMode || "공유 모드 미표시");
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
      redactedCount: chain.records.filter((record) => record.redacted).length,
      text: chain.records.filter((record) => !record.redacted).map((record) => `${record.title} ${record.content}`).join(" "),
    };
  }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

function readThresholds() {
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
    ? `${state.fileName} · CSV ${state.rows.length}행 · 분석 기록 ${state.records.length}개`
    : "아직 불러온 파일이 없습니다.";

  const privacy = state.shareMode === "counselor_full"
    ? "상담자용 상세 모드입니다. 내담자가 공유한 상세 내용이 포함될 수 있습니다."
    : state.shareMode
      ? "요약/가족 공유 모드일 수 있습니다. 민감 내용 제외 표시를 확인하세요."
      : "공유 모드 정보가 없으므로 CSV 구조와 민감정보 제외 표시를 확인하세요.";

  els.shareModeInfo.innerHTML = `
    <span>공유 모드</span>
    <strong>${escapeHtml(state.shareModeLabel || "CSV를 불러오면 표시됩니다.")}</strong>
    <p>${escapeHtml(privacy)}</p>
  `;

  const redacted = state.records.filter((record) => record.redacted).length;
  els.schemaInfo.innerHTML = infoRows([
    ["스키마", state.schemaVersion || "-"],
    ["공유 모드", state.shareModeLabel || "-"],
    ["자료 범위", state.rangeLabel || "-"],
    ["내담자", unique(state.records.map((record) => record.client)).join(", ") || "-"],
    ["민감정보 제외", `${redacted}개 칸`],
  ]);
}

function renderMetrics() {
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).length;
  const success = chains((chain) => chain.highUrge && !chain.actionized).length;
  const missed = chains((chain) => chain.missedPractice).length;
  const feedbackSignals = chains((chain) => isMotivationDip(chain) || isLatentChain(chain) || isPartialSuccess(chain)).length;
  const redacted = state.records.filter((record) => record.redacted).length;
  els.metrics.innerHTML = [
    ["분석 기록", state.records.length],
    ["연쇄", state.chains.length],
    ["고위험", highRisk],
    ["성공/억제", success],
    ["실천 조정", missed],
    ["피드백 신호", feedbackSignals],
    ["민감 제외", redacted],
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
    data: ["CSV 구조 확인", "공유 모드 확인", "민감정보 제외 확인", "새 자료 사용 시 이전 분석 초기화"],
    feedback: ["평균/최고 충동", "문제행동 수준", "실천행동 수행도", "개인 내 변화 피드백"],
    readiness: ["변화언어 확인", "유지언어 확인", "양가감정 반영", "피드백 제시 방식 선택"],
    safety: ["행동화 위기 후보", "생각·충동 알아차림", "마음챙김 호흡 적용", "방해요인과 30초 과제"],
    chain: ["상황/트리거", "생각-감정-몸반응", "충동-문제행동", "고위험/저충동 잠복 연쇄"],
    success: ["충동 속 멈춤", "행동 강도 감소", "보호요인", "다음 주 재현 조건"],
    practice: ["가치 연결 실천", "작은 성공 경험", "회복 유지 위험", "다음 주 1% 행동"],
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
    safety: renderSafetyView,
    chain: renderChainUnderstandingView,
    success: renderSuccessView,
    practice: renderValuePracticeView,
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
  const redacted = state.records.filter((record) => record.redacted);
  const structural = [
    card("CSV 구조", `<p>스키마: <strong>${escapeHtml(state.schemaVersion)}</strong></p><p>record_type과 payload_json 기반 자료를 읽었습니다.</p>`, "focus"),
    card("공유 모드", `<p><strong>${escapeHtml(state.shareModeLabel)}</strong></p><p>${state.shareMode === "counselor_full" ? "상세 내용이 포함될 수 있습니다." : "민감정보가 제외되었을 수 있습니다."}</p>`, state.shareMode === "counselor_full" ? "ok" : "focus"),
    card("자료 보호", `<p>원본 CSV는 저장하지 않습니다.</p><p>요약 저장에는 현재 분석 요약과 상담 메모만 포함됩니다.</p>`, "ok"),
  ];
  const redactedCards = redacted.slice(0, 6).map((record) => recordCard(record, "민감정보 제외", "focus", ["기록 없음이 아니라 공유 설정 때문에 제외된 칸입니다."]));
  return workbench([
    ["자료 상태", structural],
    ["민감정보 제외", redactedCards],
    ["상담 전 확인", [
      card("확인 질문", "", "focus", ["이 파일의 공유 모드를 상담자가 이해했는가?", "민감정보 제외 칸을 결측치로 오해하지 않았는가?", "새 CSV를 불러오기 전 이전 자료가 제거되는가?"]),
    ]],
  ]);
}

function renderMeasurementFeedbackView() {
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "주의할 위험 피드백", "warn"));
  const success = chains((chain) => chain.highUrge && !chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "좋아진 점 피드백", "ok"));
  const partial = chains(isPartialSuccess).slice(0, 3).map((chain) => chainCard(chain, "강도감소 피드백", "ok"));
  const maintenance = chains(isMotivationDip).slice(0, 3).map((chain) => chainCard(chain, "회복 유지 위험", "focus"));
  return workbench([
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
  return workbench([
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

function renderFocusView() {
  const highRisk = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "위험 연쇄", "warn"));
  const success = chains((chain) => chain.highUrge && !chain.actionized).slice(0, 3).map((chain) => chainCard(chain, "성공/억제 연쇄", "ok"));
  const motivationDip = chains(isMotivationDip).slice(0, 4).map((chain) => chainCard(chain, "동기저하 신호", "focus"));
  const partial = chains(isPartialSuccess).slice(0, 3).map((chain) => chainCard(chain, "강도감소 성공", "ok"));
  const practice = chains((chain) => chain.missedPractice).slice(0, 3).map((chain) => chainCard(chain, "실천 조정", "focus"));
  return workbench([
    ["먼저 다룰 위험", highRisk],
    ["강화할 성공", success.concat(partial)],
    ["오늘의 선택", practice.concat([card("우선순위 질문", "", "focus", ["오늘 반드시 다룰 위험은 무엇인가?", "내담자가 이미 해낸 작은 변화는 무엇인가?", "다음 주 과제는 줄여야 하는가, 유지해야 하는가?"])])],
    ["동기저하 확인", motivationDip.concat([card("회복 안일감 점검", "", "focus", ["충동이 줄면서 실천행동도 같이 줄었는가?", "문제가 잦아든 것을 회복 완료로 해석하고 있는가?", "이번 주 회복행동을 유지해야 하는 이유는 무엇인가?"])])],
  ]);
}

function renderSafetyView() {
  const risky = chains((chain) => chain.highUrge || chain.actionized || hasSafetyWord(chain)).slice(0, 6);
  const breathingSuccess = chains((chain) => chain.highUrge && !chain.actionized && texts(chain, "practice")).slice(0, 6);
  const breathingBlocked = chains((chain) => chain.highUrge && chain.actionized && (chain.scores.practice === null || chain.scores.practice <= state.thresholds.practice)).slice(0, 6);
  return workbench([
    ["행동화 위기 후보", risky.map((chain) => chainCard(chain, "생각·충동 알아차림 점검", chain.actionized ? "warn" : "focus"))],
    ["호흡 적용/성공 후보", breathingSuccess.map((chain) => card("마음챙김 호흡 피드백", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", [
      "충동이 사라지지 않았더라도 행동화 강도가 낮아졌다면 성공입니다.",
      "생각을 없애려 하기보다 알아차리고 호흡으로 돌아온 순간을 찾습니다.",
      "호흡 전후 충동 점수가 어떻게 달라졌는지 묻습니다.",
    ]))],
    ["방해요인과 다음 훈련", breathingBlocked.concat(risky).slice(0, 6).map((chain) => card("30초 호흡 과제", `<p>${escapeHtml(chainSummary(chain))}</p>`, chain.actionized ? "warn" : "focus", [
      "충동을 너무 늦게 알아차렸는가?",
      "몸반응이 너무 강해서 먼저 자리를 옮겨야 했는가?",
      "생각을 없애려다 더 강해졌는가?",
      "다음에는 충동 몇 점에서 30초 호흡을 시작할 것인가?",
    ]))],
    ["안전 확인 질문", [card("회기 초반 확인", "", "warn", ["최근 사용량 변화나 과다사용 위험은?", "자해·타해·운전·폭력 위험은?", "위기 때 연락할 사람과 장소는?", "필요 시 의료/응급/지역자원 연결이 필요한가?"])]],
  ]);
}

function renderChainUnderstandingView() {
  const highRisk = chains((chain) => chain.actionized || chain.highUrge).slice(0, 6);
  const latent = chains(isLatentChain).slice(0, 6);
  const all = highRisk.concat(latent).slice(0, 8);
  return workbench([
    ["고위험 연쇄", highRisk.map((chain) => chainCard(chain, "트리거-충동-행동 연쇄", chain.actionized ? "warn" : "focus"))],
    ["저충동 잠복 연쇄", latent.map((chain) => card("충동은 낮지만 연쇄가 남아 있음", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "focus", [
      "충동이 낮아도 부정감정과 비합리적 사고가 남아 있는지 봅니다.",
      "도박중독 초기처럼 긴장 완화 뒤 회복행동이 약해지는 구간을 확인합니다.",
      "회피대처가 재발의 준비단계가 되지 않는지 점검합니다.",
    ]))],
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

function renderRelapseView() {
  const relapse = chains((chain) => chain.actionized || chain.highUrge).slice(0, 6);
  const latent = chains(isLatentChain).slice(0, 6);
  return workbench([
    ["재발 연쇄", relapse.map((chain) => chainCard(chain, "재발예방 분석", chain.actionized ? "warn" : "focus"))],
    ["저충동 잠복 연쇄", latent.map((chain) => card("도박 초기/긴장완화 후 점검", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "focus", ["충동이 낮아도 부정감정-비합리적 사고-몸반응이 이어지는가?", "가족에게 오픈한 뒤 긴장 완화가 실천 중단으로 이어지는가?", "불편감을 다루는 대처가 회피나 안일감으로 흐르지 않는가?"]))],
    ["허용사고/감정", relapse.concat(latent).slice(0, 6).map((chain) => card("개입 지점", `<p><strong>생각</strong>: ${texts(chain, "thought") || "기록 없음"}</p><p><strong>감정/몸</strong>: ${texts(chain, "emotion") || "기록 없음"}</p>`, "focus", ["이 생각이 행동 허가로 이어졌는가?", "행동화 직전 몸의 신호는 무엇인가?", "다음에는 어느 지점에서 10분을 벌 수 있는가?"]))],
    ["CBT 질문", [card("자동사고 검토", "", "focus", ["이 생각의 증거와 반대증거는?", "이 생각을 100% 믿으면 어떤 행동이 따라오는가?", "사용하지 않는 쪽의 균형 생각은?", "고위험 상황을 피하거나 바꾸는 계획은?"])]],
  ]);
}

function renderSuccessView() {
  const success = chains((chain) => chain.highUrge && !chain.actionized).slice(0, 6);
  const partial = chains(isPartialSuccess).slice(0, 6);
  const coping = chains((chain) => texts(chain, "practice")).slice(0, 6);
  return workbench([
    ["성공/억제 기록", success.map((chain) => chainCard(chain, "충동을 견딘 기록", "ok"))],
    ["강도감소 성공", partial.map((chain) => card("성중독/반복충동 변화 피드백", `<p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["성충동이나 생각이 남아 있어도 행동 강도가 낮아진 점을 변화로 피드백합니다.", "완전한 무증상보다 빈도·강도·지속시간·회복시간의 변화를 봅니다.", "무엇이 강도를 낮추는 데 도움이 되었는지 구체화합니다."]))],
    ["도움된 조건", coping.map((chain) => card("보호요인 후보", `<p>${texts(chain, "practice") || "기록 없음"}</p><p>${escapeHtml(scoreLine(chain))}</p>`, "ok", ["어떤 조건이 행동화를 낮췄는가?", "다음 주에도 재현할 수 있는가?", "누가/무엇이 보호요인이 되었는가?"]))],
    ["강화 문장", [card("상담자 반영", "", "ok", ["충동이 사라져서가 아니라, 충동이 있는 상태에서 멈춘 점을 강화합니다.", "결과보다 시도와 조건을 구체적으로 반영합니다.", "다음 주 반복 가능한 작은 행동으로 연결합니다."])]],
  ]);
}

function renderMotivationView() {
  const change = detectMotivation("change").slice(0, 8).map((item) => recordCard(item.record, item.label, "ok", ["이 말을 더 자세히 말해 달라고 요청합니다.", "원함/이유/필요/능력/실행 중 어디에 가까운지 봅니다."]));
  const sustain = detectMotivation("sustain").slice(0, 8).map((item) => recordCard(item.record, item.label, "focus", ["반박하지 말고 양가감정으로 반영합니다.", "유지언어 뒤에 숨은 욕구나 두려움을 확인합니다."]));
  const dips = chains(isMotivationDip).slice(0, 8).map((chain) => chainCard(chain, "충동 감소 후 실천저하", "focus"));
  return workbench([
    ["변화언어", change],
    ["유지언어", sustain],
    ["동기저하 신호", dips.concat([card("MI 재강화 질문", "", "focus", ["충동이 낮아진 지금에도 회복행동을 유지해야 하는 이유는?", "실천을 쉬면 어떤 신호가 먼저 돌아올까요?", "이번 주 회복을 1점이라도 지키는 행동은?", "가족 공개/문제 노출 이후 긴장이 풀린 것을 어떻게 다룰까요?"])])],
    ["MI 질문", [card("OARS 작업", "", "focus", ["열린 질문: 바뀐다면 무엇이 가장 먼저 달라질까요?", "인정: 이미 해낸 작은 시도는 무엇인가요?", "반영: 한편으론 원하고, 한편으론 두려운 마음이 있군요.", "요약: 위험과 바람, 다음 한 걸음을 함께 정리합니다."])]],
  ]);
}

function renderActivationView() {
  const smallWins = chains((chain) => chain.highUrge && !chain.actionized).concat(chains((chain) => chain.scores.practice !== null && chain.scores.practice > state.thresholds.practice)).slice(0, 8);
  return workbench([
    ["작은 긍정 경험", smallWins.map((chain) => chainCard(chain, "행동활성화 단서", "ok"))],
    ["자기효능감", smallWins.map((chain) => card("해낸 조건 찾기", `<p>${texts(chain, "practice") || chainSummary(chain)}</p>`, "ok", ["무엇이 0점이 아니라 1점을 만들었나?", "어떤 장소/시간/사람이 도움이 되었나?", "더 작은 버전으로 반복한다면?"]))],
    ["다음 행동", [card("강화할 행동", "", "focus", ["즐거움보다 회복 방향과 연결된 행동을 찾습니다.", "너무 큰 과제는 2분 행동으로 줄입니다.", "성공 가능성이 높은 시간과 장소를 정합니다.", "내담자의 말로 과제 이름을 붙입니다."])]],
  ]);
}

function renderValueView() {
  const valueChains = chains((chain) => texts(chain, "practice") || valueWords(chain.text)).slice(0, 8);
  return workbench([
    ["가치 단서", valueChains.map((chain) => chainCard(chain, "가치 방향 후보", "focus"))],
    ["회피와 가치", valueChains.map((chain) => card("ACT 질문", `<p>${texts(chain, "practice") || chainSummary(chain)}</p>`, "focus", ["이 행동은 고통을 줄이는 쪽인가, 삶을 넓히는 쪽인가?", "충동이 있어도 가능한 1% 가치행동은?", "회피의 단기 이득과 장기 비용은?"]))],
    ["방향 정리", [card("가치 기반 과제", "", "ok", ["가치 이름을 하나 정합니다.", "그 가치에 맞는 작은 행동을 정합니다.", "실패했을 때의 재시작 문장을 미리 만듭니다."])]],
  ]);
}

function renderValuePracticeView() {
  const groups = groupPractice();
  const performanceCards = groups.slice(0, 8).map((group) => {
    const kind = group.misses ? "warn" : "ok";
    return card(group.name, `<p>기록 ${group.count}개 · 평균 ${group.avg ?? "-"} / 10 · 저수행 ${group.misses}개</p><p>${escapeHtml(group.sample || "메모 없음")}</p>`, kind, [
      "과제가 너무 큰가?",
      "언제, 어디서, 무엇을 할지 충분히 구체적인가?",
      "이 행동은 어떤 가치와 연결되는가?",
      "다음 주에는 더 작은 1% 행동으로 만들 것인가?",
    ]);
  });
  const smallWins = chains((chain) => chain.highUrge && !chain.actionized)
    .concat(chains((chain) => chain.scores.practice !== null && chain.scores.practice > state.thresholds.practice))
    .slice(0, 6);
  const valueChains = chains((chain) => texts(chain, "practice") || valueWords(chain.text)).slice(0, 6);
  const maintenance = chains(isMotivationDip).slice(0, 6);

  return workbench([
    ["실천 수행도", performanceCards],
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

function renderPracticeView() {
  const groups = groupPractice();
  const cards = groups.slice(0, 8).map((group) => {
    const kind = group.misses ? "warn" : "ok";
    return card(group.name, `<p>기록 ${group.count}개 · 평균 ${group.avg ?? "-"} / 10 · 저수행 ${group.misses}개</p><p>${escapeHtml(group.sample || "메모 없음")}</p>`, kind, ["과제가 너무 큰가?", "언제/어디서/무엇을 할지 충분히 구체적인가?", "위기기술을 앞에 붙여야 하는가?", "다음 주에는 더 작은 버전으로 할 것인가?"]);
  });
  return workbench([
    ["수행도", cards],
    ["저수행 조정", chains((chain) => chain.missedPractice).slice(0, 6).map((chain) => chainCard(chain, "과제 조정 후보", "warn"))],
    ["조정 공식", [card("다음 과제 만들기", "", "focus", ["더 작게: 10분을 2분으로", "더 구체적으로: 언제/어디서/무엇을", "더 안전하게: 위기기술 먼저", "더 가치있게: 왜 하는지 한 문장 추가"])]],
  ]);
}

function renderSessionFeedbackSummaryView() {
  const risky = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3);
  const latent = chains(isLatentChain).slice(0, 3);
  const success = chains((chain) => chain.highUrge && !chain.actionized).concat(chains(isPartialSuccess)).slice(0, 4);
  const maintenance = chains(isMotivationDip).slice(0, 3);
  const changeTalk = detectMotivation("change").slice(0, 3);
  return workbench([
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

function renderSummaryView() {
  const risky = chains((chain) => chain.highUrge && chain.actionized).slice(0, 3);
  const success = chains((chain) => chain.highUrge && !chain.actionized).slice(0, 3);
  const feedback = chains((chain) => isMotivationDip(chain) || isLatentChain(chain) || isPartialSuccess(chain)).slice(0, 4);
  const changeTalk = detectMotivation("change").slice(0, 3);
  return workbench([
    ["위험 요약", risky.map((chain) => chainCard(chain, "위험 연쇄", "warn"))],
    ["성공·변화 요약", success.map((chain) => chainCard(chain, "성공 연쇄", "ok")).concat(changeTalk.map((item) => recordCard(item.record, item.label, "ok")))],
    ["측정기록 피드백", feedback.map((chain) => chainCard(chain, "피드백 치료 신호", isPartialSuccess(chain) ? "ok" : "focus"))],
    ["다음 회기", [card("요약 저장 안내", `<p>요약 저장 파일에는 원본 CSV가 저장되지 않고 현재 분석 요약과 상담 메모만 저장됩니다.</p>`, "focus", ["다음 회기 첫 질문은 무엇인가?", "확인할 위험 신호는 무엇인가?", "반복할 작은 실천행동은 무엇인가?", "내담자 말로 된 변화문장은 무엇인가?"])]],
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
            ${chain.steps[category].length ? chain.steps[category].map((record) => `<p>${record.redacted ? `<span class="redacted">공유 설정으로 제외됨</span>` : escapeHtml(record.content || record.title)}</p>`).join("") : `<p class="muted">기록 없음</p>`}
          </section>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function chainCard(chain, title, kind) {
  return card(title, `<p><strong>${escapeHtml(formatDate(chain.date))}</strong> · ${escapeHtml(chain.chainId)}</p><p>${escapeHtml(chainSummary(chain))}</p><p>${escapeHtml(scoreLine(chain))}</p><div class="tag-row">${riskTags(chain)}</div>`, kind);
}

function recordCard(record, title, kind, questions = []) {
  return card(title, `<p><strong>${escapeHtml(formatDate(record.createdAt))}</strong> · ${escapeHtml(CATEGORY_LABELS[record.category] || record.category)}</p><p>${record.redacted ? `<span class="redacted">공유 설정으로 제외됨</span>` : escapeHtml(record.content || record.title)}</p>`, kind, questions);
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

function copySessionSummary() {
  const text = buildSummaryText();
  navigator.clipboard?.writeText(text);
}

function exportSummary() {
  const payload = {
    app: "마음고요 상담분석실",
    version: APP_VERSION,
    privacyNotice: "원본 CSV는 저장하지 않고 현재 분석 요약, 상담 메모, 연쇄별 요약만 저장됨.",
    sourceFile: state.fileName,
    schemaVersion: state.schemaVersion,
    shareMode: state.shareMode,
    shareModeLabel: state.shareModeLabel,
    rangeLabel: state.rangeLabel,
    exportedAt: new Date().toISOString(),
    thresholds: state.thresholds,
    metrics: {
      records: state.records.length,
      chains: state.chains.length,
      highRiskChains: chains((chain) => chain.highUrge && chain.actionized).length,
      successChains: chains((chain) => chain.highUrge && !chain.actionized).length,
      missedPracticeChains: chains((chain) => chain.missedPractice).length,
      motivationDipChains: chains(isMotivationDip).length,
      latentChainCandidates: chains(isLatentChain).length,
      partialSuccessChains: chains(isPartialSuccess).length,
    },
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
  return [
    "마음고요 상담분석실 회기 요약",
    `자료: ${state.fileName || "-"}`,
    `공유 모드: ${state.shareModeLabel || "-"}`,
    `위험 연쇄: ${chains((chain) => chain.highUrge && chain.actionized).length}개`,
    `성공/억제 연쇄: ${chains((chain) => chain.highUrge && !chain.actionized).length}개`,
    `실천 조정 후보: ${chains((chain) => chain.missedPractice).length}개`,
    `동기저하 신호: ${chains(isMotivationDip).length}개`,
    `저충동 잠복 연쇄: ${chains(isLatentChain).length}개`,
    `강도감소 성공: ${chains(isPartialSuccess).length}개`,
    "원본 CSV는 저장하지 않고 현재 분석 요약만 저장됨.",
  ].join("\n");
}

async function refreshApp() {
  resetAll();
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

function resetAll() {
  resetDataOnly();
  els.csvInput.value = "";
  els.notes.value = "";
  render();
}

function resetDataOnly() {
  state.rows = [];
  state.records = [];
  state.chains = [];
  state.fileName = "";
  state.schemaVersion = "";
  state.shareMode = "";
  state.shareModeLabel = "";
  state.rangeLabel = "";
}

function parsePayload(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return {};
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
  return chain.steps[category].filter((record) => !record.redacted).map((record) => record.content).filter(Boolean).join(" / ");
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

function riskTags(chain) {
  const tags = [];
  if (chain.highUrge) tags.push(`<span class="tag warn">고충동</span>`);
  if (chain.actionized) tags.push(`<span class="tag warn">행동화</span>`);
  if (chain.missedPractice) tags.push(`<span class="tag warn">실천 조정</span>`);
  if (isMotivationDip(chain)) tags.push(`<span class="tag">동기저하</span>`);
  if (isLatentChain(chain)) tags.push(`<span class="tag">잠복연쇄</span>`);
  if (isPartialSuccess(chain)) tags.push(`<span class="tag ok">강도감소</span>`);
  if (chain.redactedCount) tags.push(`<span class="tag muted-tag">민감 제외 ${chain.redactedCount}</span>`);
  if (!tags.length) tags.push(`<span class="tag ok">안정</span>`);
  return tags.join("");
}

function detectMotivation(type) {
  const changeWords = ["원한다", "하고 싶", "줄이고", "끊", "바꾸", "회복", "가치", "약속", "해냈", "할 수", "준비", "시도", "예약"];
  const sustainWords = ["괜찮", "어쩔 수", "못 바뀐", "포기", "힘들었으니", "한 잔", "참을 수", "소용없", "무능", "부족"];
  const words = type === "change" ? changeWords : sustainWords;
  const label = type === "change" ? "변화언어 후보" : "유지언어 후보";
  return state.records
    .filter((record) => !record.redacted && words.some((word) => `${record.title} ${record.content}`.includes(word)))
    .map((record) => ({ record, label }));
}

function motivationCards(limit) {
  return detectMotivation("change").slice(0, limit).map((item) => recordCard(item.record, item.label, "ok"));
}

function hasSafetyWord(chain) {
  return ["자해", "죽", "과다", "응급", "폭력", "운전", "위험"].some((word) => chain.text.includes(word));
}

function valueWords(text) {
  return ["가족", "건강", "회복", "약속", "일", "관계", "삶", "가치"].some((word) => text.includes(word));
}

function negativeWords(text) {
  return ["불안", "수치", "분노", "우울", "공허", "외로", "초조", "답답", "무기력", "짜증", "두려", "불편", "힘들", "못 바뀐", "무능", "부족"].some((word) => text.includes(word));
}

function groupPractice() {
  const map = new Map();
  state.records.filter((record) => record.category === "practice").forEach((record) => {
    const key = record.title || record.chainId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  });
  return [...map.entries()].map(([name, records]) => {
    const scores = records.map((record) => record.sourceScores.practiceScore ?? record.intensity).filter((value) => Number.isFinite(Number(value))).map(Number);
    const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
    return {
      name,
      count: records.length,
      avg,
      misses: scores.filter((score) => score <= state.thresholds.practice).length,
      sample: records.map((record) => record.content).filter(Boolean).slice(0, 2).join(" / "),
    };
  });
}

function inferCategory(value) {
  const key = String(value || "").toLowerCase();
  if (key.includes("situation") || key.includes("상황")) return "situation";
  if (key.includes("thought") || key.includes("생각") || key.includes("사고")) return "thought";
  if (key.includes("emotion") || key.includes("body") || key.includes("감정") || key.includes("몸")) return "emotion";
  if (key.includes("urge") || key.includes("충동")) return "urge";
  if (key.includes("action") || key.includes("행동")) return "action";
  if (key.includes("practice") || key.includes("coping") || key.includes("실천") || key.includes("대처")) return "practice";
  return "situation";
}

function isRedacted(value) {
  return String(value || "").trim() === "민감 내용 제외";
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
  if (!Number.isFinite(number)) return null;
  return clamp(number > 10 ? Math.round(number / 10) : Math.round(number), 0, 10, null);
}

function score5(value) {
  if (value === true || value === "true" || value === "yes" || value === "1") return 5;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return clamp(Math.round(number), 0, 5, null);
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
