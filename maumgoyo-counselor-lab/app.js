const state = {
  rows: [],
  normalized: [],
  chains: [],
  filtered: [],
  fileName: "",
  mappings: {},
  schemaVersion: "",
  rangeLabel: "",
  shareMode: "",
  shareModeLabel: "",
  shareModePrivacy: "",
  thresholds: {
    urgeScore: 8,
    actionLevel: 4,
    practiceMissScore: 0,
  },
};

const CATEGORY_LABELS = {
  situation: "상황",
  thought: "생각",
  emotion: "감정",
  urge: "충동",
  action: "행동화",
  practice: "실천행동",
  note: "메모",
  unknown: "기타",
};

const RECORD_TYPE_ALIASES = {
  situation: ["situation", "context", "event", "trigger", "상황", "사건", "촉발"],
  thought: ["thought", "cognition", "belief", "automatic_thought", "생각", "자동사고", "믿음"],
  emotion: ["emotion", "feeling", "mood", "affect", "감정", "기분", "정서"],
  urge: ["urge", "impulse", "craving", "충동", "욕구"],
  action: ["action", "behavior", "acting_out", "actionization", "행동", "행동화", "반응"],
  practice: ["practice", "skill", "homework", "coping", "실천", "실천행동", "대처", "과제"],
  note: ["note", "memo", "reflection", "메모", "기록", "성찰"],
};

const FIELD_ALIASES = {
  recordType: ["record_type", "type", "category", "kind", "기록유형", "유형", "분류"],
  createdAt: ["created_at", "timestamp", "datetime", "date", "time", "recorded_at", "날짜", "시간", "기록일시", "작성일"],
  clientId: ["client_id", "client", "user_id", "nickname", "name", "내담자", "사용자", "이름"],
  chainId: ["chain_id", "episode_id", "session_id", "event_id", "group_id", "연쇄id", "에피소드id", "회기id"],
  content: ["content", "text", "body", "description", "detail", "memo", "내용", "기록", "설명", "메모"],
  intensity: ["intensity", "score", "rating", "level", "strength", "severity", "강도", "점수", "수준"],
  valence: ["valence", "pleasantness", "emotion_valence", "정서가", "쾌불쾌"],
  completed: ["completed", "done", "is_done", "success", "performed", "수행", "완료", "실천여부", "성공"],
  actionized: ["actionized", "acted", "acting_out", "did_action", "행동화여부", "행동화", "실행"],
  title: ["title", "label", "name", "제목", "라벨"],
};

const sampleCsv = `client_id,created_at,chain_id,record_type,title,content,intensity,completed,actionized
K-001,2026-07-01 21:10,A1,situation,퇴근 후 대화,"배우자가 늦게 왔냐고 묻자 비난처럼 들림",,,
K-001,2026-07-01 21:11,A1,thought,자동사고,"나는 항상 부족하고 또 혼날 것이다",72,,
K-001,2026-07-01 21:12,A1,emotion,불안,"가슴 답답함과 초조함",84,,
K-001,2026-07-01 21:13,A1,urge,회피 충동,"방에 들어가 대화를 끊고 싶음",78,,
K-001,2026-07-01 21:15,A1,action,행동화,"문을 세게 닫고 대화를 중단함",65,,true
K-001,2026-07-02 08:30,A1,practice,호흡 후 재접근,"10분 뒤 감정 강도를 말로 설명하기",55,true,
K-001,2026-07-04 19:35,A2,situation,업무 메신저,"상사가 짧게 수정 요청을 보냄",,,
K-001,2026-07-04 19:37,A2,thought,평가 두려움,"내가 무능하다고 생각할 것이다",68,,
K-001,2026-07-04 19:38,A2,emotion,수치심,"얼굴이 뜨거워지고 숨고 싶음",74,,
K-001,2026-07-04 19:39,A2,urge,반박 충동,"바로 변명 메시지를 보내고 싶음",61,,
K-001,2026-07-04 19:43,A2,practice,사실 확인,"요청 내용을 세 문장으로 정리한 뒤 답장",80,true,
K-001,2026-07-06 22:02,A3,situation,가족 통화,"부모님이 앞으로의 계획을 물음",,,
K-001,2026-07-06 22:03,A3,thought,압박감,"기대에 못 미치면 실망시킬 것이다",81,,
K-001,2026-07-06 22:04,A3,emotion,분노,"목소리가 커질 것 같음",77,,
K-001,2026-07-06 22:05,A3,urge,끊기 충동,"전화를 끊고 싶음",88,,
K-001,2026-07-06 22:06,A3,action,행동화,"대답 없이 통화를 종료함",82,,true
K-001,2026-07-07 09:00,A3,practice,사후 복구,"문자로 통화가 어려웠다고 설명하기",20,false,`;

const els = {
  csvInput: document.getElementById("csvInput"),
  dropZone: document.getElementById("dropZone"),
  fileMeta: document.getElementById("fileMeta"),
  shareModeInfo: document.getElementById("shareModeInfo"),
  clientFilter: document.getElementById("clientFilter"),
  fromDate: document.getElementById("fromDate"),
  toDate: document.getElementById("toDate"),
  typeFilter: document.getElementById("typeFilter"),
  riskFilter: document.getElementById("riskFilter"),
  keywordFilter: document.getElementById("keywordFilter"),
  urgeThreshold: document.getElementById("urgeThreshold"),
  actionThreshold: document.getElementById("actionThreshold"),
  practiceMissThreshold: document.getElementById("practiceMissThreshold"),
  mappingList: document.getElementById("mappingList"),
  metrics: document.getElementById("metrics"),
  focusList: document.getElementById("focusList"),
  trendChart: document.getElementById("trendChart"),
  chartMode: document.getElementById("chartMode"),
  chainView: document.getElementById("chainView"),
  tableView: document.getElementById("tableView"),
  chainViewBtn: document.getElementById("chainViewBtn"),
  tableViewBtn: document.getElementById("tableViewBtn"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  resetBtn: document.getElementById("resetBtn"),
  printBtn: document.getElementById("printBtn"),
  exportBtn: document.getElementById("exportBtn"),
  copyFocusBtn: document.getElementById("copyFocusBtn"),
  counselorNotes: document.getElementById("counselorNotes"),
};

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

  const headers = rows[0].map((header) => header.trim().replace(/^\ufeff/, ""));
  return rows.slice(1).map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] === undefined ? "" : values[index].trim();
    });
    return entry;
  });
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "");
}

function findField(headers, aliases) {
  const normalizedHeaders = headers.map((header) => [header, normalizeKey(header)]);
  const normalizedAliases = aliases.map(normalizeKey);
  const exact = normalizedHeaders.find(([, key]) => normalizedAliases.includes(key));
  if (exact) return exact[0];
  const partial = normalizedHeaders.find(([, key]) => normalizedAliases.some((alias) => key.includes(alias) || alias.includes(key)));
  return partial ? partial[0] : "";
}

function inferMappings(rows) {
  const headers = Object.keys(rows[0] || {});
  return Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([field, aliases]) => [field, findField(headers, aliases)])
  );
}

function categoryFromType(recordType, row) {
  const source = normalizeKey(recordType || Object.values(row).join(" "));
  for (const [category, aliases] of Object.entries(RECORD_TYPE_ALIASES)) {
    if (aliases.map(normalizeKey).some((alias) => source.includes(alias))) return category;
  }
  return "unknown";
}

function toNumber(value) {
  const match = String(value || "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function toBool(value) {
  const normalized = normalizeKey(value);
  if (["true", "yes", "y", "1", "done", "completed", "success", "완료", "수행", "성공", "예"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "pending", "fail", "미완료", "미수행", "실패", "아니오"].includes(normalized)) return false;
  return null;
}

function toDate(value) {
  if (!value) return null;
  const normalized = String(value).replace(/\./g, "-").replace(/\//g, "-");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function dateKey(date) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeRows(rows) {
  state.mappings = inferMappings(rows);
  if (isMaeumgoyoCompactV2Csv(rows)) return normalizeMaeumgoyoCompactV2Rows(rows);
  if (isMaeumgoyoV9Csv(rows)) return normalizeMaeumgoyoV9Rows(rows);
  return rows.map((row, index) => {
    const get = (field) => row[state.mappings[field]] || "";
    const createdAt = toDate(get("createdAt"));
    const recordType = get("recordType");
    const category = categoryFromType(recordType, row);
    const intensity = toNumber(get("intensity"));
    const completed = toBool(get("completed"));
    const actionized = toBool(get("actionized"));
    const content = get("content") || get("title") || Object.values(row).filter(Boolean).join(" · ");

    return {
      id: `r${index}`,
      row,
      category,
      recordType: recordType || CATEGORY_LABELS[category],
      createdAt,
      date: dateKey(createdAt),
      clientId: get("clientId") || "내담자 미지정",
      chainId: get("chainId") || `${get("clientId") || "client"}-${dateKey(createdAt) || "unknown"}-${Math.floor(index / 6)}`,
      title: get("title"),
      content,
      intensity,
      completed,
      actionized,
      redacted: isRedactedText(content),
    };
  });
}

function isRedactedText(value) {
  return String(value || "").trim() === "민감 내용 제외";
}

function visibleContent(record) {
  if (record.redacted) return "공유 설정으로 제외됨";
  return record.content;
}

function isMaeumgoyoCompactV2Csv(rows) {
  return rows.some((row) => String(row.schema_version || "").trim() === "maeumgoyo_compact_v2" && "payload_json" in row);
}

function isMaeumgoyoV9Csv(rows) {
  return rows.some((row) => ["observation", "practice_definition", "practice_log"].includes(String(row.record_type || "").trim()));
}

function parsePayloadJson(row) {
  try {
    const value = row.payload_json || "{}";
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return { _parseError: true };
  }
}

function textList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  return value || "";
}

function detectShareMode(rows) {
  const mode = rows.map((row) => row.share_mode).find(Boolean) || "";
  state.schemaVersion = rows.map((row) => row.schema_version).find(Boolean) || "";
  state.rangeLabel = rows.map((row) => row.range_label).find(Boolean) || "";
  const labels = {
    counselor: "상담자용 상세",
    counselorDetail: "상담자용 상세",
    counselor_full: "상담자 치료자료 전체본",
    counselorSummary: "상담자용 요약",
    family: "가족회복용",
  };
  const privacy = {
    counselor: "상세 공유 모드입니다. CSV에 상황과 생각 등 상담용 세부 내용이 포함될 수 있습니다.",
    counselorDetail: "상세 공유 모드입니다. CSV에 상황과 생각 등 상담용 세부 내용이 포함될 수 있습니다.",
    counselor_full: "상담자 치료자료 전체본입니다. 상황, 생각, 감정, 몸반응, 충동, 문제행동수준, 대처와 실천 기록이 포함됩니다.",
    counselorSummary: "요약 공유 모드입니다. 일부 민감 내용이 제외되었을 수 있습니다.",
    family: "가족회복용 공유 모드입니다. 민감한 상황·생각·개인 메모가 제외되었을 가능성이 높습니다.",
  };
  state.shareMode = mode;
  state.shareModeLabel = labels[mode] || (mode ? `알 수 없는 공유 모드: ${mode}` : "공유 모드 정보 없음");
  state.shareModePrivacy = privacy[mode] || "CSV 안에서 share_mode 값을 찾지 못했습니다. 민감정보 제외 여부를 원본 내보내기 설정과 함께 확인하세요.";
}

function normalizeMaeumgoyoCompactV2Rows(rows) {
  state.mappings = {
    recordType: "record_type",
    createdAt: "date",
    clientId: "client_alias",
    chainId: "id",
    content: "payload_json",
    intensity: "payload_json",
    completed: "payload_json",
    actionized: "payload_json",
    title: "",
  };

  const validRows = rows
    .filter((row) => String(row.schema_version || "").trim() === "maeumgoyo_compact_v2")
    .map((row, index) => ({ row, index, payload: parsePayloadJson(row) }))
    .filter((entry) => !entry.payload._parseError);

  const clientId = validRows.map(({ row }) => row.client_alias).find(Boolean) || "CSV 내담자";
  const practices = new Map();
  validRows.filter(({ row }) => row.record_type === "practice_definition").forEach(({ row, payload }) => {
    const id = row.id || payload.practice_id;
    if (id) practices.set(id, { row, payload });
  });

  const records = [];
  const addRecord = ({ row, payload, index, category, title, content, intensity = null, completed = null, actionized = null, offset = 0, sourceScores = {}, chainId = "" }) => {
    const redacted = isRedactedText(content);
    if (!content && intensity === null && completed === null && actionized === null) return;
    const baseDate = toDate(row.date || row.updated_at);
    const createdAt = baseDate ? new Date(baseDate.getTime() + offset) : null;
    records.push({
      id: `${row.id || payload.practice_id || "row"}-${category}-${index}-${offset}`,
      row,
      payload,
      category,
      recordType: row.record_type,
      createdAt,
      date: dateKey(baseDate),
      clientId,
      chainId: chainId || (row.record_type === "practice_log" ? `practice-${payload.practice_id || row.id || index}` : `observation-${row.id || index}`),
      title,
      content,
      intensity,
      completed,
      actionized,
      sourceScores,
      redacted,
    });
  };

  validRows.forEach(({ row, payload, index }) => {
    if (row.record_type === "observation") {
      const behaviorText = [textList(payload.behavior_areas), textList(payload.behavior_custom_areas)].filter(Boolean).join(" · ");
      const emotionText = [payload.emotion, payload.emotion_custom, textList(payload.body_reactions), payload.body_custom].filter(Boolean).join(" · ");
      const observationChain = `observation-${row.id || index}`;

      addRecord({ row, payload, index, category: "situation", title: "상황", content: payload.situation || behaviorText, offset: 0, chainId: observationChain });
      addRecord({ row, payload, index, category: "thought", title: "생각", content: payload.thought_text, intensity: scale10(payload.thought_score), offset: 1, sourceScores: { thoughtScore: Number(payload.thought_score || 0) }, chainId: observationChain });
      addRecord({ row, payload, index, category: "emotion", title: payload.emotion || "감정·몸반응", content: emotionText, intensity: scale10(payload.emotion_score), offset: 2, sourceScores: { emotionScore: Number(payload.emotion_score || 0) }, chainId: observationChain });
      addRecord({ row, payload, index, category: "urge", title: "충동", content: behaviorText || "충동 강도 기록", intensity: scale10(payload.urge_score), offset: 3, sourceScores: { urgeScore: Number(payload.urge_score || 0) }, chainId: observationChain });
      addRecord({
        row,
        payload,
        index,
        category: "action",
        title: "문제행동 수준",
        content: `문제행동수준 ${payload.action_level || 0}/5`,
        intensity: scale5(payload.action_level),
        actionized: Number(payload.action_level || 0) >= state.thresholds.actionLevel,
        offset: 4,
        sourceScores: { actionLevel: Number(payload.action_level || 0) },
        chainId: observationChain,
      });
      addRecord({
        row,
        payload,
        index,
        category: "practice",
        title: "대처와 가치실천",
        content: [payload.coping, payload.value_action_draft, payload.value].filter(Boolean).join(" · "),
        intensity: scale10(payload.coping_score),
        completed: null,
        offset: 5,
        sourceScores: { copingScore: Number(payload.coping_score || 0) },
        chainId: observationChain,
      });
    }

    if (row.record_type === "practice_log") {
      const practice = practices.get(payload.practice_id) || {};
      const practicePayload = practice.payload || {};
      const score = Number(payload.practice_score || 0);
      addRecord({
        row,
        payload,
        index,
        category: "practice",
        title: practicePayload.practice_name || payload.practice_name || "실천행동 수행",
        content: [practicePayload.practice_value || payload.practice_value, practicePayload.practice_name || payload.practice_name, payload.practice_note].filter(Boolean).join(" · "),
        intensity: scale10(score),
        completed: score > state.thresholds.practiceMissScore,
        offset: 0,
        sourceScores: { practiceScore: score },
        chainId: `practice-${payload.practice_id || row.id || index}`,
      });
    }
  });

  return records;
}

function normalizeMaeumgoyoV9Rows(rows) {
  state.mappings = {
    recordType: "record_type",
    createdAt: "date",
    clientId: "",
    chainId: "id",
    content: "situation",
    intensity: "emotion_score",
    completed: "practice_score",
    actionized: "action_level",
    title: "",
  };

  const clientId = "CSV 내담자";
  const practices = new Map();
  rows.filter((row) => row.record_type === "practice_definition").forEach((row) => {
    const id = row.practice_id || row.id;
    if (id) practices.set(id, row);
  });

  const records = [];
  const addRecord = ({ row, index, category, title, content, intensity = null, completed = null, actionized = null, offset = 0, sourceScores = {} }) => {
    const redacted = isRedactedText(content);
    if (!content && intensity === null && completed === null && actionized === null) return;
    const baseDate = toDate(row.date || row.updated_at);
    const createdAt = baseDate ? new Date(baseDate.getTime() + offset) : null;
    records.push({
      id: `${row.id || row.practice_id || "row"}-${category}-${index}-${offset}`,
      row,
      category,
      recordType: row.record_type,
      createdAt,
      date: dateKey(baseDate),
      clientId,
      chainId: row.record_type === "practice_log" ? `practice-${row.practice_id || row.id || index}` : `observation-${row.id || index}`,
      title,
      content,
      intensity,
      completed,
      actionized,
      sourceScores,
      redacted,
    });
  };

  rows.forEach((row, index) => {
    if (row.record_type === "observation") {
      addRecord({ row, index, category: "situation", title: "상황", content: row.situation || row.behavior_areas || row.behavior_custom_areas, offset: 0 });
      addRecord({ row, index, category: "thought", title: "생각", content: row.thought_text, intensity: scale10(row.thought_score), offset: 1, sourceScores: { thoughtScore: Number(row.thought_score || 0) } });
      addRecord({ row, index, category: "emotion", title: row.emotion || "감정", content: [row.emotion, row.body_reactions].filter(Boolean).join(" · "), intensity: scale10(row.emotion_score), offset: 2, sourceScores: { emotionScore: Number(row.emotion_score || 0) } });
      addRecord({ row, index, category: "urge", title: "충동", content: row.behavior_areas || row.behavior_custom_areas || "충동 강도 기록", intensity: scale10(row.urge_score), offset: 3, sourceScores: { urgeScore: Number(row.urge_score || 0) } });
      addRecord({
        row,
        index,
        category: "action",
        title: "행동화 수준",
        content: `행동수준 ${row.action_level || 0}/5`,
        intensity: scale5(row.action_level),
        actionized: Number(row.action_level || 0) >= state.thresholds.actionLevel,
        offset: 4,
        sourceScores: { actionLevel: Number(row.action_level || 0) },
      });
      addRecord({
        row,
        index,
        category: "practice",
        title: "대처와 가치 행동 초안",
        content: [row.coping, row.value_action_draft, row.value].filter(Boolean).join(" · "),
        intensity: scale10(row.coping_score),
        completed: null,
        offset: 5,
        sourceScores: { copingScore: Number(row.coping_score || 0) },
      });
    }

    if (row.record_type === "practice_log") {
      const practice = practices.get(row.practice_id) || {};
      const score = Number(row.practice_score || 0);
      addRecord({
        row,
        index,
        category: "practice",
        title: practice.practice_name || row.practice_name || "실천행동 수행",
        content: [practice.practice_value || row.practice_value, practice.practice_name || row.practice_name, row.practice_note].filter(Boolean).join(" · "),
        intensity: scale10(score),
        completed: score > state.thresholds.practiceMissScore,
        offset: 0,
        sourceScores: { practiceScore: score },
      });
    }
  });

  return records;
}

function scale10(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(10, number)) * 10) : null;
}

function scale5(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(5, number)) * 20) : null;
}

function isHighUrgeRecord(record) {
  if (record.sourceScores?.urgeScore !== undefined) return Number(record.sourceScores.urgeScore) >= state.thresholds.urgeScore;
  return (record.intensity || 0) >= state.thresholds.urgeScore * 10;
}

function isActionizedRecord(record) {
  if (record.sourceScores?.actionLevel !== undefined) return Number(record.sourceScores.actionLevel) >= state.thresholds.actionLevel;
  return record.actionized === true;
}

function isMissedPracticeRecord(record) {
  if (record.sourceScores?.practiceScore !== undefined) return Number(record.sourceScores.practiceScore) <= state.thresholds.practiceMissScore;
  return record.completed === false;
}

function isCompletedPracticeRecord(record) {
  if (record.sourceScores?.practiceScore !== undefined) return Number(record.sourceScores.practiceScore) > state.thresholds.practiceMissScore;
  return record.completed === true;
}

function buildChains(records) {
  const groups = new Map();
  records.forEach((record) => {
    const key = `${record.clientId}::${record.chainId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  return [...groups.entries()].map(([key, group]) => {
    group.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    const steps = {};
    Object.keys(CATEGORY_LABELS).forEach((category) => {
      steps[category] = group.filter((record) => record.category === category);
    });
    const firstDate = group.find((record) => record.createdAt)?.createdAt || null;
    const highUrge = steps.urge.some(isHighUrgeRecord);
    const actionized = steps.action.some(isActionizedRecord) || group.some(isActionizedRecord);
    const missedPractice = steps.practice.some(isMissedPracticeRecord);
    return {
      key,
      clientId: group[0]?.clientId || "내담자 미지정",
      chainId: group[0]?.chainId || key,
      firstDate,
      records: group,
      steps,
      highUrge,
      actionized,
      missedPractice,
    };
  }).sort((a, b) => (b.firstDate?.getTime() || 0) - (a.firstDate?.getTime() || 0));
}

function applyFilters() {
  const client = els.clientFilter.value;
  const type = els.typeFilter.value;
  const risk = els.riskFilter.value;
  const keyword = els.keywordFilter.value.trim().toLowerCase();
  const from = els.fromDate.value;
  const to = els.toDate.value;

  const filteredRecords = state.normalized.filter((record) => {
    if (client !== "all" && record.clientId !== client) return false;
    if (type !== "all" && record.category !== type) return false;
    if (from && record.date < from) return false;
    if (to && record.date > to) return false;
    if (keyword && !JSON.stringify(record.row).toLowerCase().includes(keyword) && !record.content.toLowerCase().includes(keyword)) return false;
    return true;
  });

  let chains = buildChains(filteredRecords);
  if (risk !== "all") chains = chains.filter((chain) => chain[risk === "high_urge" ? "highUrge" : risk === "actionized" ? "actionized" : "missedPractice"]);
  state.filtered = filteredRecords;
  state.chains = chains;
  render();
}

function populateFilters() {
  const clients = unique(state.normalized.map((record) => record.clientId));
  els.clientFilter.innerHTML = `<option value="all">전체</option>${clients.map((client) => `<option value="${escapeHtml(client)}">${escapeHtml(client)}</option>`).join("")}`;
  els.typeFilter.innerHTML = `<option value="all">전체</option>${Object.entries(CATEGORY_LABELS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}`;

  const dates = state.normalized.map((record) => record.date).filter(Boolean).sort();
  els.fromDate.value = dates[0] || "";
  els.toDate.value = dates[dates.length - 1] || "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function render() {
  renderShareMode();
  renderMappings();
  renderMetrics();
  renderFocus();
  renderChart();
  renderChains();
  renderTable();
}

function renderShareMode() {
  if (!els.shareModeInfo) return;
  const restricted = state.shareMode === "family" || state.shareMode === "counselorSummary" || !state.shareMode;
  els.shareModeInfo.classList.toggle("restricted", restricted);
  els.shareModeInfo.innerHTML = `
    <span>공유 모드</span>
    <strong>${escapeHtml(state.shareModeLabel || "CSV를 불러오면 표시됩니다.")}</strong>
    <p>${escapeHtml(state.shareModePrivacy || "민감정보 제외 여부를 여기서 확인할 수 있습니다.")}</p>
    ${state.schemaVersion || state.rangeLabel ? `<p>${escapeHtml([state.schemaVersion, state.rangeLabel].filter(Boolean).join(" · "))}</p>` : ""}
  `;
}

function renderMappings() {
  const labels = {
    recordType: "record_type",
    createdAt: "날짜",
    clientId: "내담자",
    chainId: "연쇄 ID",
    content: "내용",
    intensity: "강도",
    completed: "수행 여부",
    actionized: "행동화 여부",
  };
  els.mappingList.innerHTML = Object.entries(labels)
    .map(([field, label]) => `<dt>${label}</dt><dd>${escapeHtml(state.mappings[field] || "미인식")}</dd>`)
    .join("");
}

function renderMetrics() {
  const records = state.filtered;
  const chains = state.chains;
  const days = unique(records.map((record) => record.date)).length;
  const emotionAvg = average(records.filter((record) => record.category === "emotion").map((record) => record.intensity));
  const urgeAvg = average(records.filter((record) => record.category === "urge").map((record) => record.intensity));
  const actionCount = chains.filter((chain) => chain.actionized).length;
  const practices = records.filter((record) => record.category === "practice");
  const practiceRate = practices.length ? Math.round((practices.filter(isCompletedPracticeRecord).length / practices.length) * 100) : null;

  const metrics = [
    ["기록 일수", `${days}`, `${records.length}개 기록`],
    ["연쇄 고리", `${chains.length}`, "분석 단위"],
    ["평균 감정 강도", scoreText(emotionAvg), "0-100 기준"],
    ["평균 충동 강도", scoreText(urgeAvg), "0-100 기준"],
    ["행동화 연쇄", `${actionCount}`, `${percent(actionCount, chains.length)}%`],
    ["실천 수행도", practiceRate === null ? "-" : `${practiceRate}%`, `${practices.length}개 실천`],
  ];

  els.metrics.innerHTML = metrics.map(([label, value, sub]) => `<div class="metric"><span>${label}</span><strong>${value}</strong><em>${sub}</em></div>`).join("");
}

function renderFocus() {
  const chains = state.chains;
  if (!chains.length) {
    els.focusList.innerHTML = getEmptyHtml();
    return;
  }

  const highUrges = chains.filter((chain) => chain.highUrge);
  const actionized = chains.filter((chain) => chain.actionized);
  const missed = chains.filter((chain) => chain.missedPractice);
  const topThoughts = topTerms(chains.flatMap((chain) => chain.steps.thought.filter((record) => !record.redacted).map((record) => record.content)));
  const topEmotions = topTerms(chains.flatMap((chain) => chain.steps.emotion.filter((record) => !record.redacted).map((record) => record.title || record.content)));

  const items = [
    [`충동 강도 ${state.thresholds.urgeScore}/10 이상 연쇄가 ${highUrges.length}건입니다. 행동화 직전의 신체 신호와 회피·반박 충동을 우선 점검하세요.`, highUrges.length > 0],
    [`행동수준 ${state.thresholds.actionLevel}/5 이상 연쇄는 ${actionized.length}건입니다. 행동 직전 생각과 대안 행동의 시간 간격을 상담에서 복기할 수 있습니다.`, actionized.length > 0],
    [`실천 점수 ${state.thresholds.practiceMissScore}/10 이하 기록이 포함된 연쇄는 ${missed.length}건입니다. 과제 난이도, 실행 시점, 환경 단서가 현실적인지 조정해 보세요.`, missed.length > 0],
    [`반복 생각 단서: ${topThoughts || "충분한 생각 기록 없음"}`, false],
    [`반복 감정 단서: ${topEmotions || "충분한 감정 기록 없음"}`, false],
  ];

  els.focusList.innerHTML = items.map(([text, warn]) => `<div class="focus-item ${warn ? "warn" : ""}">${escapeHtml(text)}</div>`).join("");
}

function renderChart() {
  const canvas = els.trendChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  const mode = els.chartMode.value;
  const records = state.filtered.filter((record) => {
    if (mode === "emotion") return record.category === "emotion" && record.intensity !== null;
    if (mode === "urge") return record.category === "urge" && record.intensity !== null;
    return record.category === "practice";
  });

  const byDate = new Map();
  records.forEach((record) => {
    const key = record.date || "날짜 없음";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(mode === "practice" ? (isCompletedPracticeRecord(record) ? 100 : 0) : record.intensity);
  });

  const points = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => [date, average(values)]);
  drawAxes(ctx, width, height);

  if (!points.length) {
    ctx.fillStyle = "#65736b";
    ctx.font = "16px Segoe UI";
    ctx.fillText("차트에 표시할 기록이 없습니다.", 36, 58);
    return;
  }

  const left = 54;
  const right = 24;
  const top = 24;
  const bottom = 46;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const xFor = (index) => left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const yFor = (value) => top + plotH - (Math.max(0, Math.min(100, value)) / 100) * plotH;

  ctx.strokeStyle = mode === "urge" ? "#b45f3a" : mode === "practice" ? "#26704c" : "#21685b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach(([, value], index) => {
    const x = xFor(index);
    const y = yFor(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach(([date, value], index) => {
    const x = xFor(index);
    const y = yFor(value);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#16493f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#65736b";
    ctx.font = "12px Segoe UI";
    ctx.fillText(date.slice(5), Math.max(6, x - 18), height - 18);
  });
}

function drawAxes(ctx, width, height) {
  const left = 54;
  const top = 24;
  const bottom = 46;
  const plotH = height - top - bottom;
  ctx.strokeStyle = "#d7ddd8";
  ctx.lineWidth = 1;
  ctx.font = "12px Segoe UI";
  ctx.fillStyle = "#65736b";
  [0, 25, 50, 75, 100].forEach((value) => {
    const y = top + plotH - (value / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
    ctx.fillText(String(value), 18, y + 4);
  });
}

function renderChains() {
  if (!state.chains.length) {
    els.chainView.innerHTML = getEmptyHtml();
    return;
  }

  els.chainView.innerHTML = state.chains.map((chain) => {
    const riskTags = [
      chain.highUrge ? `<span class="tag warn">충동 높음</span>` : "",
      chain.actionized ? `<span class="tag warn">행동화</span>` : "",
      chain.missedPractice ? `<span class="tag warn">실천 미수행</span>` : "",
    ].join("");
    return `
      <article class="chain">
        <div class="chain-header">
          <div>
            <div class="chain-title">${escapeHtml(chain.clientId)} · ${escapeHtml(chain.chainId)}</div>
            <div class="chain-meta">${formatDate(chain.firstDate)} · ${chain.records.length}개 기록</div>
          </div>
          <div class="tag-row">${riskTags || `<span class="tag ok">안정</span>`}</div>
        </div>
        <div class="chain-steps">
          ${["situation", "thought", "emotion", "urge", "action", "practice"].map((category) => renderStep(category, chain.steps[category])).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderStep(category, records) {
  const body = records.length
    ? records.map((record) => {
      const tags = [
        record.redacted ? `<span class="tag muted-tag">민감정보 제외</span>` : "",
        record.intensity !== null ? `<span class="tag">강도 ${record.intensity}</span>` : "",
        record.category === "practice" && isCompletedPracticeRecord(record) ? `<span class="tag ok">수행</span>` : "",
        record.category === "practice" && isMissedPracticeRecord(record) ? `<span class="tag warn">미수행</span>` : "",
        record.category === "action" && isActionizedRecord(record) ? `<span class="tag warn">행동화</span>` : "",
      ].join("");
      const text = record.title ? `${record.title}: ${visibleContent(record)}` : visibleContent(record);
      return `<p class="${record.redacted ? "redacted-text" : ""}">${escapeHtml(text)}</p><div class="tag-row">${tags}</div>`;
    }).join("")
    : `<p class="muted">기록 없음</p>`;
  return `<section class="step"><h3>${CATEGORY_LABELS[category]}</h3>${body}</section>`;
}

function renderTable() {
  if (!state.filtered.length) {
    els.tableView.innerHTML = getEmptyHtml();
    return;
  }

  const rows = state.filtered.slice().sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  els.tableView.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>날짜</th><th>내담자</th><th>연쇄</th><th>유형</th><th>내용</th><th>상태</th><th>강도</th><th>수행</th><th>행동화</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((record) => `
          <tr>
            <td>${formatDate(record.createdAt)}</td>
            <td>${escapeHtml(record.clientId)}</td>
            <td>${escapeHtml(record.chainId)}</td>
            <td>${CATEGORY_LABELS[record.category]}</td>
            <td class="${record.redacted ? "redacted-text" : ""}">${escapeHtml(record.title ? `${record.title}: ${visibleContent(record)}` : visibleContent(record))}</td>
            <td>${record.redacted ? `<span class="tag muted-tag">민감정보 제외</span>` : ""}</td>
            <td>${record.intensity ?? ""}</td>
            <td>${boolText(record.category === "practice" ? isCompletedPracticeRecord(record) : record.completed)}</td>
            <td>${boolText(record.category === "action" ? isActionizedRecord(record) : record.actionized)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getEmptyHtml() {
  return document.getElementById("emptyStateTemplate").innerHTML;
}

function average(values) {
  const nums = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!nums.length) return null;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function scoreText(value) {
  return value === null ? "-" : String(value);
}

function percent(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

function boolText(value) {
  if (value === true) return "예";
  if (value === false) return "아니오";
  return "";
}

function topTerms(texts) {
  const counts = new Map();
  const stop = new Set(["그리고", "하지만", "나는", "내가", "것이다", "같음", "하고", "싶음", "있음", "없음"]);
  texts.join(" ").split(/[\s,.;:!?·"()]+/).forEach((term) => {
    const clean = term.trim();
    if (clean.length < 2 || stop.has(clean)) return;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([term, count]) => `${term}(${count})`).join(", ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ingestCsv(text, fileName = "예시 데이터") {
  clearAnalysisState({ keepFileInput: true });
  const rows = parseCsv(text);
  state.rows = rows;
  detectShareMode(rows);
  state.normalized = normalizeRows(rows);
  state.fileName = fileName;
  els.fileMeta.textContent = `${fileName} · ${rows.length}개 행 · ${unique(state.normalized.map((record) => record.clientId)).length}명`;
  populateFilters();
  applyFilters();
}

function clearAnalysisState(options = {}) {
  state.rows = [];
  state.normalized = [];
  state.chains = [];
  state.filtered = [];
  state.fileName = "";
  state.mappings = {};
  state.shareMode = "";
  state.shareModeLabel = "";
  state.shareModePrivacy = "";
  state.schemaVersion = "";
  state.rangeLabel = "";
  els.fileMeta.textContent = "아직 불러온 파일이 없습니다.";
  els.clientFilter.innerHTML = "";
  els.typeFilter.innerHTML = "";
  els.fromDate.value = "";
  els.toDate.value = "";
  els.riskFilter.value = "all";
  els.keywordFilter.value = "";
  els.counselorNotes.value = "";
  if (!options.keepFileInput) els.csvInput.value = "";
  render();
}

function readThresholds() {
  state.thresholds.urgeScore = clampNumber(els.urgeThreshold.value, 0, 10, 8);
  state.thresholds.actionLevel = clampNumber(els.actionThreshold.value, 0, 5, 4);
  state.thresholds.practiceMissScore = clampNumber(els.practiceMissThreshold.value, 0, 10, 0);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function handleThresholdChange() {
  readThresholds();
  if (state.normalized.length) applyFilters();
  else render();
}

function downloadText(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportSummary() {
  const summary = {
    app: "마음고요 상담분석실",
    privacyNotice: "원본 CSV는 이 요약 파일에 저장하지 않습니다. 현재 화면에서 계산된 분석 요약, 상담 메모, 연쇄별 요약 정보만 포함됩니다.",
    sourceFile: state.fileName,
    sourceSchemaVersion: state.schemaVersion,
    sourceRangeLabel: state.rangeLabel,
    sourceShareMode: state.shareMode,
    sourceShareModeLabel: state.shareModeLabel,
    sourceShareModePrivacy: state.shareModePrivacy,
    exportedAt: new Date().toISOString(),
    thresholds: {
      urgeScoreHighAtOrAbove: state.thresholds.urgeScore,
      actionLevelActionizedAtOrAbove: state.thresholds.actionLevel,
      practiceScoreMissedAtOrBelow: state.thresholds.practiceMissScore,
    },
    metrics: {
      records: state.filtered.length,
      chains: state.chains.length,
      actionizedChains: state.chains.filter((chain) => chain.actionized).length,
      highUrgeChains: state.chains.filter((chain) => chain.highUrge).length,
      missedPracticeChains: state.chains.filter((chain) => chain.missedPractice).length,
    },
    focus: [...els.focusList.querySelectorAll(".focus-item")].map((node) => node.textContent),
    notes: els.counselorNotes.value,
    chains: state.chains.map((chain) => ({
      clientId: chain.clientId,
      chainId: chain.chainId,
      firstDate: chain.firstDate?.toISOString() || null,
      highUrge: chain.highUrge,
      actionized: chain.actionized,
      missedPractice: chain.missedPractice,
      records: chain.records.map((record) => ({
        category: record.category,
        recordType: record.recordType,
        createdAt: record.createdAt?.toISOString() || null,
        title: record.title,
        content: record.redacted ? null : record.content,
        displayContent: visibleContent(record),
        redacted: record.redacted === true,
        intensity: record.intensity,
        completed: record.category === "practice" ? isCompletedPracticeRecord(record) : record.completed,
        actionized: record.category === "action" ? isActionizedRecord(record) : record.actionized,
      })),
    })),
  };
  downloadText(`maeumgoyo-summary-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(summary, null, 2));
}

function copyFocus() {
  const text = [...els.focusList.querySelectorAll(".focus-item")].map((node) => `- ${node.textContent}`).join("\n");
  navigator.clipboard?.writeText(text);
}

function initialize() {
  readThresholds();
  render();
  els.csvInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      ingestCsv(text, file.name);
      event.target.value = "";
    });
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragging");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (file) file.text().then((text) => ingestCsv(text, file.name));
  });

  [els.clientFilter, els.fromDate, els.toDate, els.typeFilter, els.riskFilter, els.keywordFilter].forEach((control) => {
    control.addEventListener("input", applyFilters);
  });
  [els.urgeThreshold, els.actionThreshold, els.practiceMissThreshold].forEach((control) => {
    control.addEventListener("input", handleThresholdChange);
  });
  els.chartMode.addEventListener("input", renderChart);
  els.loadSampleBtn.addEventListener("click", () => ingestCsv(sampleCsv));
  els.resetBtn.addEventListener("click", () => clearAnalysisState());
  els.printBtn.addEventListener("click", () => window.print());
  els.exportBtn.addEventListener("click", exportSummary);
  els.copyFocusBtn.addEventListener("click", copyFocus);
  els.chainViewBtn.addEventListener("click", () => {
    els.chainViewBtn.classList.add("active");
    els.tableViewBtn.classList.remove("active");
    els.chainView.classList.remove("hidden");
    els.tableView.classList.add("hidden");
  });
  els.tableViewBtn.addEventListener("click", () => {
    els.tableViewBtn.classList.add("active");
    els.chainViewBtn.classList.remove("active");
    els.tableView.classList.remove("hidden");
    els.chainView.classList.add("hidden");
  });
  try {
    localStorage.removeItem("maeumgoyoCounselorNotes");
  } catch (error) {
    // Some privacy modes block localStorage. The app does not need it.
  }
}

initialize();
