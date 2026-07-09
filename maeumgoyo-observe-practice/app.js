const APP_SCHEMA_VERSION = "maeumgoyo_app_v2";
const LEGACY_STORAGE_KEY = "maeumgoyo.observePractice.v1";
const STORAGE_KEY = "maeumgoyo.observePractice.v2";
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
const REDACTED_TEXT = "민감 내용 제외";
const TEXT_LIMITS = {
  short: 40,
  medium: 160,
  long: 600,
  reflection: 800
};
    const PIN_KEY = "maeumgoyo.observePractice.pin";
    const RECOVERY_KEY = "maeumgoyo.observePractice.recovery";
    const AUTO_LOCK_MS = 5 * 60 * 1000;
    const values = ["건강", "관계", "정직", "책임", "자기존중", "성장", "안정", "회복", "자유", "배움", "돌봄", "신뢰", "절제", "용기", "의미"];
    const emotions = ["불안", "외로움", "분노", "공허함", "수치심", "우울", "초조", "지루함", "피곤함", "무기력"];
    const bodies = ["가슴 답답함", "두근거림", "근육 긴장", "열감", "손 떨림", "시선 고정", "멍함", "얼어붙음", "호흡 짧음"];
    const defaultBehaviors = ["도박", "성행동", "쇼핑", "음주", "게임", "스마트폰/인터넷", "회피/미루기", "분노표출", "과식", "자기비난", "무기력"];
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const state = {
      view: "today",
      observeMode: "저녁",
      behavior: "",
      behaviorAreas: [],
      emotion: "",
      emotionCustom: "",
      body: [],
      bodyCustom: "",
      value: "",
      customDays: [],
      shareRange: 7,
      shareMode: "counselorDetail",
      redactions: { thoughts: true, details: true, private: true },
      data: { schemaVersion: APP_SCHEMA_VERSION, observations: [], practices: [], logs: [], settings: { alias: "", noRecordReminderTime: "20:00" } },
      lastActive: Date.now()
    };

    function todayISO() {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now - offset).toISOString().slice(0, 10);
    }
    function dateObj(iso) { return new Date(iso + "T00:00:00"); }
    function daysAgo(n) { const d = dateObj(todayISO()); d.setDate(d.getDate() - n); return d; }
    function dateToISO(date) {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date - offset).toISOString().slice(0, 10);
    }
    function formatSavedTime(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    function escapeCsv(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
    function practiceScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 전혀 하지 못함",
        "1점: 마음속으로 떠올림",
        "2점: 시작 준비를 함",
        "3점: 30% 버전만 시도함",
        "4점: 아주 일부 수행함",
        "5점: 절반 정도 수행함",
        "6점: 절반보다 조금 더 수행함",
        "7점: 대부분 수행함",
        "8점: 거의 계획대로 수행함",
        "9점: 계획대로 수행하고 흐름도 좋았음",
        "10점: 계획한 대로 충분히 수행함"
      ][value];
    }
    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
    function shortCustomValue(selector) {
      return String($(selector)?.value || "").trim().slice(0, 10);
    }
    function cleanText(value, limit = TEXT_LIMITS.long) {
      return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
    }
    function cleanMultiline(value, limit = TEXT_LIMITS.long) {
      return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, limit);
    }
    function clampNumber(value, min, max, fallback = min) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.max(min, Math.min(max, number));
    }
    function cleanDate(value, fallback = todayISO()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return fallback;
      const parsed = dateObj(value);
      return Number.isNaN(parsed.getTime()) ? fallback : value;
    }
    function cleanTimeList(value) {
      return String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(item => /^([01]\d|2[0-3]):[0-5]\d$/.test(item))
        .slice(0, 6)
        .join(", ");
    }
    function isRedacted(value) {
      return String(value || "").trim() === REDACTED_TEXT;
    }
    function compactList(values) {
      return values.map(value => String(value || "").trim()).filter(Boolean);
    }
    function emotionText(record) {
      return compactList([record.emotion, record.emotionCustom]).join(", ") || "-";
    }
    function bodyText(record) {
      return compactList([...(Array.isArray(record.body) ? record.body : []), record.bodyCustom]).join(", ") || "-";
    }
    function selectorEscape(value) {
      if (window.CSS && typeof CSS.escape === "function") return CSS.escape(value);
      return String(value).replace(/["\\]/g, "\\$&");
    }
    function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
    function boolFlag(value) {
      return value === true || value === "1" || value === 1;
    }
    function normalizeObservation(record) {
      const body = Array.isArray(record.body) ? record.body.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const behaviorAreas = Array.isArray(record.behaviorAreas) ? record.behaviorAreas.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const behaviorCustomAreas = Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      return {
        ...record,
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        date: cleanDate(record.date),
        mode: cleanText(record.mode, TEXT_LIMITS.short) || "저녁",
        behavior: cleanText(record.behavior, TEXT_LIMITS.medium),
        behaviorAreas,
        behaviorCustomAreas,
        situation: cleanMultiline(record.situation, TEXT_LIMITS.long),
        thoughtText: cleanMultiline(record.thoughtText, TEXT_LIMITS.long),
        emotion: cleanText(record.emotion, TEXT_LIMITS.short),
        emotionCustom: cleanText(record.emotionCustom, 10),
        body,
        bodyCustom: cleanText(record.bodyCustom, 10),
        thoughtScore: clampNumber(record.thoughtScore, 0, 10, 0),
        emotionScore: clampNumber(record.emotionScore, 0, 10, 0),
        urgeScore: clampNumber(record.urgeScore, 0, 10, 0),
        actionLevel: clampNumber(record.actionLevel, 0, 5, 0),
        coping: cleanMultiline(record.coping, TEXT_LIMITS.long),
        copingScore: clampNumber(record.copingScore, 0, 10, 0),
        gratitude: cleanMultiline(record.gratitude, TEXT_LIMITS.medium),
        insight: cleanMultiline(record.insight, TEXT_LIMITS.reflection),
        value: cleanText(record.value, TEXT_LIMITS.short),
        valueActionDraft: cleanMultiline(record.valueActionDraft, TEXT_LIMITS.medium),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    function normalizePractice(record) {
      const days = Array.isArray(record.customDays) ? record.customDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6) : [];
      const frequency = ["daily", "1week", "3week", "custom"].includes(record.frequency) ? record.frequency : "daily";
      return {
        ...record,
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        value: cleanText(record.value, TEXT_LIMITS.short),
        name: cleanMultiline(record.name, TEXT_LIMITS.medium),
        reason: cleanMultiline(record.reason, TEXT_LIMITS.long),
        frequency,
        customDays: [...new Set(days)],
        targetCount: clampNumber(record.targetCount, 1, 12, 1),
        reminderMode: ["morning", "times", "none"].includes(record.reminderMode) ? record.reminderMode : "morning",
        reminderTimes: cleanTimeList(record.reminderTimes),
        startDate: cleanDate(record.startDate),
        barriers: cleanMultiline(record.barriers, TEXT_LIMITS.long),
        smallVersion: cleanMultiline(record.smallVersion, TEXT_LIMITS.medium),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    function normalizeLog(record) {
      return {
        ...record,
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        practiceId: cleanText(record.practiceId, TEXT_LIMITS.medium),
        date: cleanDate(record.date),
        score: clampNumber(record.score, 0, 10, 0),
        note: cleanMultiline(record.note, TEXT_LIMITS.long),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    function normalizeData(data) {
      const settings = data.settings || {};
      return {
        schemaVersion: APP_SCHEMA_VERSION,
        observations: Array.isArray(data.observations) ? data.observations.map(normalizeObservation) : [],
        practices: Array.isArray(data.practices) ? data.practices.map(normalizePractice) : [],
        logs: Array.isArray(data.logs) ? data.logs.map(normalizeLog) : [],
        settings: {
          alias: cleanText(settings.alias, TEXT_LIMITS.short),
          noRecordReminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.noRecordReminderTime || "") ? settings.noRecordReminderTime : "20:00",
          lastBackupAt: settings.lastBackupAt || ""
        }
      };
    }
    function saveData() {
      try {
        state.data = normalizeData(state.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
        return true;
      } catch (error) {
        console.error("Failed to save app data", error);
        showToast("기록을 저장하지 못했습니다. 저장공간 또는 브라우저 설정을 확인해주세요.");
        return false;
      }
    }
    function loadData() {
      try {
        const current = localStorage.getItem(STORAGE_KEY);
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        const parsed = JSON.parse(current || legacy || "{}");
        state.data = normalizeData(parsed);
        if (!current && legacy) saveData();
      } catch {
        state.data = { schemaVersion: APP_SCHEMA_VERSION, observations: [], practices: [], logs: [], settings: { alias: "", noRecordReminderTime: "20:00" } };
        showToast("저장된 기록을 읽지 못해 새 기록 공간으로 시작합니다.");
      }
    }
    function showToast(message) {
      const toast = $("#toast");
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
    }
    function setView(view) {
      state.view = view;
      $$(".view").forEach(v => v.classList.toggle("active", v.id === `${view}View`));
      $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
      renderAll();
      if (view === "trend") requestAnimationFrame(drawTrend);
    }
    function setObserveMode(mode) {
      state.observeMode = mode;
      $$("#observeModeButtons button").forEach(button => {
        button.classList.toggle("active", button.dataset.value === mode);
      });
    }
    function showRiskFollowup(show = true) {
      const box = $("#riskFollowup");
      if (!box) return;
      box.classList.toggle("hidden", !show);
      if (show) box.querySelectorAll("input[type='checkbox']").forEach(input => input.checked = false);
    }
    function startQuickObservation(kind = "observe") {
      setView("observe");
      $("#observeDate").value = todayISO();
      if (kind === "risk") {
        setObserveMode("충동 발생");
        $("#urgeScore").value = 8;
        $("#urgeScoreValue").textContent = "8";
        showRiskFollowup(true);
        $("#situation").focus();
        showToast("고위험 신호를 짧게 남기고, 먼저 안전한 곳으로 이동하세요.");
        return;
      }
      setObserveMode("저녁");
      showRiskFollowup(false);
      $("#situation").focus();
      showToast("지금의 상황, 감정, 몸 반응만 짧게 적어도 충분합니다.");
    }
    function setChipGroup(containerId, items, key, activeValue = "") {
      const oldBox = $(containerId);
      const freshBox = oldBox.cloneNode(false);
      oldBox.replaceWith(freshBox);
      const box = $(containerId);
      box.innerHTML = items.map((item, index) => {
        const active = key === "body" ? state.body.includes(item) : item === activeValue || item === state[key] || (!activeValue && !state[key] && index === 0 && key === "behavior");
        return `<button type="button" class="chip ${active ? "active" : ""}" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`;
      }).join("");
      box.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        if (key === "body") {
          button.classList.toggle("active");
          const value = button.dataset.value;
          if (state.body.includes(value)) state.body = state.body.filter(v => v !== value);
          else state.body.push(value);
          return;
        }
        $$("#" + box.id + " button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        state[key] = button.dataset.value;
      });
    }
    function setBehaviorGroup(items) {
      const oldBox = $("#behaviorChips");
      const freshBox = oldBox.cloneNode(false);
      oldBox.replaceWith(freshBox);
      const box = $("#behaviorChips");
      const selected = new Set(state.behaviorAreas || []);
      box.innerHTML = items.map(item => `
        <label class="chip ${selected.has(item) ? "active" : ""}">
          <input type="checkbox" value="${escapeHtml(item)}" ${selected.has(item) ? "checked" : ""}>
          ${escapeHtml(item)}
        </label>
      `).join("");
      box.addEventListener("change", () => {
        state.behaviorAreas = $$("#behaviorChips input[type='checkbox']:checked").map(input => input.value);
        $$("#behaviorChips .chip").forEach(label => {
          const input = label.querySelector("input");
          label.classList.toggle("active", Boolean(input && input.checked));
        });
      });
    }
    function initPickers() {
      const alias = state.data.settings.alias || "";
      const aliasItems = alias && !["도박", "성행동", "쇼핑"].includes(alias) ? [alias] : [];
      const behaviorItems = ["도박", "성행동", ...aliasItems, ...defaultBehaviors.filter(v => !["도박", "성행동"].includes(v))];
      setBehaviorGroup(behaviorItems);
      setChipGroup("#emotionChips", emotions, "emotion", state.emotion);
      setChipGroup("#bodyChips", bodies, "body");
      setChipGroup("#valueChips", values, "value", state.value);
      const oldDayBox = $("#weekdayChips");
      const freshDayBox = oldDayBox.cloneNode(false);
      oldDayBox.replaceWith(freshDayBox);
      const dayBox = $("#weekdayChips");
      dayBox.innerHTML = weekdays.map((d, i) => `<button type="button" class="chip" data-day="${i}">${d}</button>`).join("");
      dayBox.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const day = Number(button.dataset.day);
        button.classList.toggle("active");
        if (state.customDays.includes(day)) state.customDays = state.customDays.filter(v => v !== day);
        else state.customDays.push(day);
      });
    }
    function bindSliders() {
      [["thoughtScore", "thoughtScoreValue"], ["emotionScore", "emotionScoreValue"], ["urgeScore", "urgeScoreValue"], ["actionLevel", "actionLevelValue"], ["copingScore", "copingScoreValue"]].forEach(([input, label]) => {
        $("#" + input).addEventListener("input", () => $("#" + label).textContent = $("#" + input).value);
      });
    }
    function rangeRecords(items, field = "date") {
      if (state.shareRange === "all") return items.slice();
      const start = daysAgo(Number(state.shareRange) - 1);
      return items.filter(item => dateObj(item[field]) >= start);
    }
    function isPracticeDue(practice, iso) {
      const day = dateObj(iso).getDay();
      if (practice.frequency === "daily") return true;
      if (practice.frequency === "1week") return day === dateObj(practice.startDate || todayISO()).getDay();
      if (practice.frequency === "3week") return [1, 3, 5].includes(day);
      if (practice.frequency === "custom") return (practice.customDays || []).includes(day);
      return true;
    }
    function activePractices() { return state.data.practices.filter(p => !p.archived); }
    function activeObservations() { return state.data.observations.filter(record => !record.archived); }
    function activeLogs() { return state.data.logs.filter(record => !record.archived); }
    function hiddenRecordCount() {
      return state.data.observations.filter(record => record.archived).length + state.data.logs.filter(record => record.archived).length;
    }
    function splitBehaviorCustom(text) {
      return String(text || "").split(/[,\n]/).map(value => cleanText(value, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8);
    }
    function selectedBehaviorAreas() {
      const checked = $$("#behaviorChips input[type='checkbox']:checked").map(input => input.value);
      return Array.from(new Set([...checked, ...splitBehaviorCustom($("#behaviorCustom").value)]));
    }
    function behaviorAreasFromRecord(record) {
      if (Array.isArray(record.behaviorAreas) && record.behaviorAreas.length) return record.behaviorAreas;
      if (record.behavior) return [record.behavior];
      return [];
    }
    function behaviorAreaText(record) {
      const areas = behaviorAreasFromRecord(record);
      return areas.length ? areas.join(", ") : "-";
    }
    function behaviorCustomText(record) {
      return Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.join(", ") : "";
    }
    function targetCount(practice) {
      return Math.max(1, Math.min(12, Number(practice.targetCount || 1) || 1));
    }
    function logsFor(practiceId, iso) {
      return activeLogs()
        .filter(l => l.practiceId === practiceId && l.date === iso)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
    function logFor(practiceId, iso) { return logsFor(practiceId, iso)[0]; }
    function recentObservations(days = 7) { return activeObservations().filter(o => dateObj(o.date) >= daysAgo(days - 1)); }
    function recentLogs(days = 7) { return activeLogs().filter(l => dateObj(l.date) >= daysAgo(days - 1)); }
    function avg(items, getter) { return items.length ? items.reduce((sum, item) => sum + getter(item), 0) / items.length : 0; }
    function averageDailyLogScore(logs) {
      const groups = {};
      logs.forEach(log => {
        const key = `${log.practiceId}|${log.date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
      });
      const dayPracticeAverages = Object.values(groups).map(group => avg(group, item => Number(item.score)));
      return avg(dayPracticeAverages, value => value);
    }
    function observationIntensity(o) { return (Number(o.thoughtScore) + Number(o.emotionScore) + Number(o.urgeScore)) / 3; }
    function updateMetrics() {
      const today = todayISO();
      const todayObs = activeObservations().filter(o => o.date === today);
      const weekObs = recentObservations(7);
      const weekLogs = recentLogs(7);
      let dueCount = 0;
      let achievedCount = 0;
      activePractices().forEach(p => {
        for (let i = 0; i < 7; i++) {
          const d = dateToISO(daysAgo(i));
          if (isPracticeDue(p, d)) {
            const target = targetCount(p);
            dueCount += target;
            achievedCount += Math.min(logsFor(p.id, d).length, target);
          }
        }
      });
      const restart = weekLogs.filter(l => Number(l.score) > 0).filter(l => {
        const prev = state.data.logs
          .filter(x => !x.archived && x.practiceId === l.practiceId && dateObj(x.date) < dateObj(l.date))
          .sort((a,b) => b.date.localeCompare(a.date))[0];
        return prev && Number(prev.score) === 0;
      }).length;
      $("#todayLabel").textContent = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
      $("#todayObserveCount").textContent = todayObs.length;
      $("#weekIntensity").textContent = avg(weekObs, observationIntensity).toFixed(1);
      $("#riskCount").textContent = weekObs.filter(o => Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4).length;
      $("#activePracticeCount").textContent = activePractices().length;
      $("#practiceRate").textContent = dueCount ? `${Math.round(achievedCount / dueCount * 100)}%` : "0%";
      $("#restartDays").textContent = restart;
    }
    function renderTodayTaskSummary() {
      const box = $("#todayTaskSummary");
      if (!box) return;
      const today = todayISO();
      const observationCount = activeObservations().filter(o => o.date === today).length;
      let dueTargets = 0;
      let loggedCount = 0;
      activePractices().forEach(practice => {
        if (!isPracticeDue(practice, today)) return;
        const target = targetCount(practice);
        dueTargets += target;
        loggedCount += Math.min(logsFor(practice.id, today).length, target);
      });
      const remaining = Math.max(0, dueTargets - loggedCount);
      const lastBackup = state.data.settings.lastBackupAt ? formatSavedTime(state.data.settings.lastBackupAt) : "아직 없음";
      const backupWarning = backupAgeWarning();
      box.innerHTML = `
        <h3>오늘 할 일</h3>
        <p class="small">관찰 기록: ${observationCount > 0 ? `완료 ${observationCount}건` : "아직 없음"}</p>
        <p class="small">실천 기록: ${dueTargets ? `${loggedCount}/${dueTargets}회` : "오늘 예정된 실천 없음"}</p>
        <p class="small">오늘 남은 실천: ${remaining}회</p>
        <p class="small">미기록 알림: ${noRecordReminderTime()}</p>
        <p class="small">최근 CSV 백업: ${escapeHtml(lastBackup)}</p>
        ${backupWarning ? `<p class="small backup-warning">${escapeHtml(backupWarning)}</p>` : ""}
      `;
    }
    function backupAgeWarning() {
      const hasRecords = activeObservations().length || state.data.practices.length || activeLogs().length;
      if (!hasRecords) return "";
      if (!state.data.settings.lastBackupAt) return "아직 CSV 백업이 없습니다. 공유하기에서 한 번 저장해두면 안전합니다.";
      const last = new Date(state.data.settings.lastBackupAt);
      if (Number.isNaN(last.getTime())) return "최근 CSV 백업 시간을 확인하지 못했습니다. 새로 백업해두는 것을 권장합니다.";
      const ageDays = Math.floor((Date.now() - last.getTime()) / 86400000);
      if (ageDays >= 7) return `CSV 백업 후 ${ageDays}일이 지났습니다. 기록을 잃지 않도록 다시 저장해두세요.`;
      return "";
    }
    function renderToday() {
      updateMetrics();
      renderNotificationStatus();
      renderTodayTaskSummary();
      const today = todayISO();
      const obs = activeObservations().filter(o => o.date === today).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      $("#todayObservations").innerHTML = obs.length ? obs.map(renderObservationItem).join("") : `<div class="empty">아직 오늘의 관찰 기록이 없습니다.</div>`;
      const practices = activePractices();
      $("#todayPracticeList").innerHTML = practices.length ? practices.map(p => renderPracticeToday(p)).join("") : `<div class="empty">아직 설정된 작은 실천행동이 없습니다.</div>`;
      bindTodayLogButtons();
      bindObservationActions();
    }
    function renderObservationItem(o) {
      const risk = Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4;
      return `<div class="record-item">
        <div class="record-top"><strong>${escapeHtml(o.date)} · ${escapeHtml(o.mode)}</strong><span class="tag ${risk ? "danger" : ""}">${risk ? "고위험 신호" : escapeHtml(behaviorAreaText(o))}</span></div>
        <div class="small">감정: ${escapeHtml(emotionText(o))} · 몸 반응: ${escapeHtml(bodyText(o))} · 가치: ${escapeHtml(o.value || "-")}</div>
        <div class="small">사고/감정/충동: ${o.thoughtScore}/${o.emotionScore}/${o.urgeScore} · 행동수준 ${o.actionLevel}/5</div>
        ${o.valueActionDraft ? `<div class="small">가치 실천 초안: ${escapeHtml(o.valueActionDraft)}</div>` : ""}
        <div class="button-row record-actions">
          <button class="ghost-btn" type="button" data-edit-observation="${escapeHtml(o.id)}">수정</button>
          <button class="danger-btn" type="button" data-delete-observation="${escapeHtml(o.id)}">숨김</button>
        </div>
      </div>`;
    }
    function renderPracticeToday(p) {
      const today = todayISO();
      const due = isPracticeDue(p, today);
      const todayLogs = logsFor(p.id, today);
      const log = todayLogs[0];
      const target = targetCount(p);
      const todayAverage = averageDailyLogScore(todayLogs);
      const currentScore = log ? clampNumber(log.score, 0, 10, 0) : 0;
      const logHistory = todayLogs.length ? `
        <div style="height:8px"></div>
        <div class="small"><strong>오늘 기록 ${todayLogs.length}/${target}회 · 하루 평균 ${todayAverage.toFixed(1)}점</strong></div>
        <div class="list">
          ${todayLogs.slice(0, 4).map(item => `<div class="plain-card small">수행도 ${escapeHtml(item.score)}/10 · ${escapeHtml(formatSavedTime(item.updatedAt))}${item.note ? `<br>${escapeHtml(item.note)}` : ""}<div class="button-row record-actions"><button class="danger-btn" type="button" data-delete-log="${escapeHtml(item.id)}">수행 기록 숨김</button></div></div>`).join("")}
        </div>
      ` : "";
      return `<div class="record-item">
        <div class="record-top"><strong>${escapeHtml(p.value || "가치")} · ${escapeHtml(p.name)}</strong><span class="tag ${due ? "" : "warn"}">${due ? "오늘 실천일" : "선택 기록"}</span></div>
        <div class="small">오늘 약속: ${target}회 · 현재 ${todayLogs.length}회 기록</div>
        <div class="small">30% 버전: ${escapeHtml(p.smallVersion || "-")}</div>
        <div style="height:8px"></div>
        <div class="slider-card">
          <div class="slider-top"><span>오늘 수행도</span><span class="slider-value" data-practice-score-value="${escapeHtml(p.id)}">${currentScore}</span></div>
          <input data-practice-score="${escapeHtml(p.id)}" type="range" min="0" max="10" value="${currentScore}">
          <div class="small score-help" data-practice-score-help="${escapeHtml(p.id)}">${escapeHtml(practiceScoreText(currentScore))}</div>
        </div>
        <textarea data-practice-note="${escapeHtml(p.id)}" maxlength="600" placeholder="방해요인, 도움이 된 조건, 짧은 성찰"></textarea>
        <div style="height:8px"></div>
        <button class="solid-btn full" data-save-log="${escapeHtml(p.id)}" type="button">오늘 실천 추가 기록</button>
        ${logHistory}
      </div>`;
    }
    function bindTodayLogButtons() {
      $$("[data-practice-score]").forEach(input => {
        input.addEventListener("input", () => {
          const id = input.dataset.practiceScore;
          const container = input.closest(".record-item");
          const label = container ? container.querySelector("[data-practice-score-value]") : $(`[data-practice-score-value="${selectorEscape(id)}"]`);
          const help = container ? container.querySelector("[data-practice-score-help]") : $(`[data-practice-score-help="${selectorEscape(id)}"]`);
          if (label) label.textContent = input.value;
          if (help) help.textContent = practiceScoreText(input.value);
        });
      });
      $$("[data-save-log]").forEach(button => {
        button.addEventListener("click", () => {
          const id = button.dataset.saveLog;
          const container = button.closest(".record-item");
          const scoreInput = container ? container.querySelector("[data-practice-score]") : $(`[data-practice-score="${selectorEscape(id)}"]`);
          const noteInput = container ? container.querySelector("[data-practice-note]") : $(`[data-practice-note="${selectorEscape(id)}"]`);
          const score = clampNumber(scoreInput?.value, 0, 10, 0);
          const note = cleanMultiline(noteInput?.value, TEXT_LIMITS.long);
          const entry = { id: uid(), practiceId: id, date: todayISO(), score, note, updatedAt: new Date().toISOString() };
          state.data.logs.push(entry);
          if (!saveData()) return;
          renderAll();
          showToast("오늘의 실천 기록을 저장했습니다.");
        });
      });
      $$("[data-delete-log]").forEach(button => {
        button.addEventListener("click", () => deletePracticeLog(button.dataset.deleteLog));
      });
    }
    function renderObserveList() {
      const records = activeObservations().slice().sort((a,b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12);
      $("#observeList").innerHTML = records.length ? records.map(renderObservationItem).join("") : `<div class="empty">저장된 관찰 기록이 없습니다.</div>`;
      bindObservationActions();
    }
    function bindObservationActions() {
      $$("[data-edit-observation]").forEach(button => {
        button.addEventListener("click", () => editObservation(button.dataset.editObservation));
      });
      $$("[data-delete-observation]").forEach(button => {
        button.addEventListener("click", () => deleteObservation(button.dataset.deleteObservation));
      });
    }
    function editObservation(id) {
      const record = state.data.observations.find(item => item.id === id);
      if (!record) return;
      $("#observeId").value = record.id;
      $("#observeDate").value = cleanDate(record.date);
      setObserveMode(record.mode || "저녁");
      state.behaviorAreas = behaviorAreasFromRecord(record).filter(value => value !== "-");
      state.emotion = record.emotion || "";
      state.body = Array.isArray(record.body) ? record.body.slice() : [];
      state.value = record.value || "";
      $("#behaviorCustom").value = Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.join(", ") : "";
      $("#situation").value = record.situation || "";
      $("#thoughtText").value = record.thoughtText || "";
      $("#emotionCustom").value = record.emotionCustom || "";
      $("#bodyCustom").value = record.bodyCustom || "";
      $("#thoughtScore").value = clampNumber(record.thoughtScore, 0, 10, 0);
      $("#emotionScore").value = clampNumber(record.emotionScore, 0, 10, 0);
      $("#urgeScore").value = clampNumber(record.urgeScore, 0, 10, 0);
      $("#actionLevel").value = clampNumber(record.actionLevel, 0, 5, 0);
      $("#coping").value = record.coping || "";
      $("#copingScore").value = clampNumber(record.copingScore, 0, 10, 0);
      $("#gratitude").value = record.gratitude || "";
      $("#insight").value = record.insight || "";
      $("#valueCustom").value = record.value || "";
      $("#valueActionDraft").value = record.valueActionDraft || "";
      ["thoughtScore","emotionScore","urgeScore","actionLevel","copingScore"].forEach(field => {
        $("#" + field + "Value").textContent = $("#" + field).value;
      });
      showRiskFollowup(clampNumber(record.urgeScore, 0, 10, 0) >= 8 || clampNumber(record.actionLevel, 0, 5, 0) >= 4);
      initPickers();
      setView("observe");
      $("#situation").focus();
      showToast("관찰 기록을 불러왔습니다. 수정 후 다시 저장하세요.");
    }
    function deleteObservation(id) {
      const record = state.data.observations.find(item => item.id === id);
      if (!record) return;
      if (!confirm(`${record.date || "선택한"} 관찰 기록을 목록과 통계에서 숨길까요? 보호하기 화면에서 다시 복원할 수 있습니다.`)) return;
      record.archived = true;
      record.updatedAt = new Date().toISOString();
      if ($("#observeId").value === id) resetObserveDefaults();
      if (!saveData()) return;
      renderAll();
      showToast("관찰 기록을 숨겼습니다.");
    }
    function deletePracticeLog(id) {
      const log = state.data.logs.find(item => item.id === id);
      if (!log) return;
      if (!confirm(`${log.date || "선택한"} 수행 기록을 숨길까요? 보호하기 화면에서 다시 복원할 수 있습니다.`)) return;
      log.archived = true;
      log.updatedAt = new Date().toISOString();
      if (!saveData()) return;
      renderAll();
      showToast("수행 기록을 숨겼습니다.");
    }
    function renderPracticeList() {
      const practices = state.data.practices.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      $("#practiceList").innerHTML = practices.length ? practices.map(p => {
      const logs = activeLogs().filter(l => l.practiceId === p.id);
        return `<div class="record-item">
          <div class="record-top"><strong>${escapeHtml(p.value || "가치")} · ${escapeHtml(p.name)}</strong><span class="tag">${escapeHtml(frequencyLabel(p.frequency))}</span></div>
          <div class="small">이유: ${escapeHtml(p.reason || "-")}</div>
          <div class="small">약속: ${escapeHtml(frequencyLabel(p.frequency))} · 실천일마다 ${targetCount(p)}회</div>
          <div class="small">알림: ${escapeHtml(reminderLabel(p))}</div>
          <div class="small">방해요인: ${escapeHtml(p.barriers || "-")}</div>
          <div class="small">30% 버전: ${escapeHtml(p.smallVersion || "-")}</div>
          <div class="small">기록 ${logs.length}회 · 평균 수행도 ${avg(logs, l => Number(l.score)).toFixed(1)}</div>
          <div style="height:8px"></div>
          <div class="button-row">
            <button class="ghost-btn" type="button" data-edit-practice="${escapeHtml(p.id)}">수정</button>
            <button class="danger-btn" type="button" data-archive-practice="${escapeHtml(p.id)}">${p.archived ? "복원" : "보관"}</button>
          </div>
        </div>`;
      }).join("") : `<div class="empty">가치 기반 작은 실천행동을 1개 이상 설정해보세요.</div>`;
      $$("[data-edit-practice]").forEach(b => b.addEventListener("click", () => editPractice(b.dataset.editPractice)));
      $$("[data-archive-practice]").forEach(b => b.addEventListener("click", () => {
        const p = state.data.practices.find(x => x.id === b.dataset.archivePractice);
        if (!p) return;
        p.archived = !p.archived;
        p.updatedAt = new Date().toISOString();
        if (!saveData()) return;
        renderAll();
      }));
    }
    function renderPracticeLogList() {
      const box = $("#practiceLogList");
      if (!box) return;
      const practices = activePractices();
      box.innerHTML = practices.length ? practices.map(p => renderPracticeToday(p)).join("") : `<div class="empty">먼저 가치 기반 작은 실천행동을 설정해주세요.</div>`;
      bindTodayLogButtons();
    }
    function frequencyLabel(value) {
      return { daily: "매일", "3week": "주 3일", "1week": "주 1일", custom: "맞춤 요일" }[value] || value;
    }
    function reminderTimesForPractice(practice) {
      if ((practice.reminderMode || "morning") === "none") return [];
      if ((practice.reminderMode || "morning") === "times") {
        return String(practice.reminderTimes || "")
          .split(",")
          .map(v => v.trim())
          .filter(v => /^\d{1,2}:\d{2}$/.test(v))
          .map(v => {
            const [h, m] = v.split(":");
            return `${String(Number(h)).padStart(2, "0")}:${m}`;
          });
      }
      return ["08:00"];
    }
    function reminderLabel(practice) {
      if ((practice.reminderMode || "morning") === "none") return "사용 안 함";
      const times = reminderTimesForPractice(practice);
      if ((practice.reminderMode || "morning") === "times") return times.length ? times.join(", ") : "시간 미설정";
      return "매일 아침 하루 일정 알림";
    }
    function notify(message) {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      navigator.serviceWorker?.ready
        .then(reg => reg.showNotification("마음고요 관찰과 실천", { body: message, icon: "./app-icon-192.png" }))
        .catch(() => new Notification("마음고요 관찰과 실천", { body: message, icon: "./app-icon-192.png" }));
    }
    function noRecordReminderTime() {
      return state.data.settings.noRecordReminderTime || "20:00";
    }
    function renderNotificationStatus() {
      const box = $("#notificationStatus");
      if (!box) return;
      if (!("Notification" in window)) {
        box.textContent = "이 브라우저는 기록 알림을 지원하지 않습니다.";
        return;
      }
      if (Notification.permission !== "granted") {
        box.textContent = "알림이 꺼져 있어 기록 알림을 받을 수 없습니다.";
        return;
      }
      box.textContent = `알림이 켜져 있습니다. 미기록 알림 시간: ${noRecordReminderTime()}`;
    }
    function renderHiddenRecordStatus() {
      const info = $("#hiddenRecordInfo");
      const button = $("#restoreHiddenRecords");
      if (!info || !button) return;
      const observationCount = state.data.observations.filter(record => record.archived).length;
      const logCount = state.data.logs.filter(record => record.archived).length;
      const total = observationCount + logCount;
      info.textContent = total
        ? `숨긴 기록: 관찰 ${observationCount}건, 수행 ${logCount}건`
        : "숨긴 기록이 없습니다.";
      button.disabled = total === 0;
    }
    function restoreHiddenRecords() {
      const total = hiddenRecordCount();
      if (!total) {
        showToast("복원할 숨긴 기록이 없습니다.");
        return;
      }
      if (!confirm(`숨긴 기록 ${total}건을 다시 목록과 통계에 보이게 할까요?`)) return;
      state.data.observations.forEach(record => { if (record.archived) record.archived = false; });
      state.data.logs.forEach(record => { if (record.archived) record.archived = false; });
      if (!saveData()) return;
      renderAll();
      showToast("숨긴 기록을 복원했습니다.");
    }
    function checkPracticeReminders() {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = todayISO();
      activePractices().forEach(practice => {
        if (!isPracticeDue(practice, today)) return;
        if (!reminderTimesForPractice(practice).includes(time)) return;
        const key = `maeumgoyo.reminded.${practice.id}.${today}.${time}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        notify(`${practice.name} · 오늘 약속 ${targetCount(practice)}회입니다.`);
      });
    }
    function checkNoRecordReminder() {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (time !== noRecordReminderTime()) return;
      const today = todayISO();
      const hasObservation = activeObservations().some(record => record.date === today);
      const hasPracticeLog = activeLogs().some(record => record.date === today);
      if (hasObservation || hasPracticeLog) return;
      const key = `maeumgoyo.noRecordReminder.${today}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      notify("오늘 아직 관찰 기록과 실천 기록이 없습니다. 짧게라도 오늘의 마음과 작은 실천을 남겨보세요.");
    }
    function renderTrend() {
      try { drawTrend(); } catch (error) { console.warn("Trend canvas draw failed", error); }
      renderTrendBars();
      $("#patternSummary").textContent = buildReflectionSummary();
    }
    function topItems(values, limit = 3) {
      const counts = {};
      values.map(value => String(value || "").trim()).filter(Boolean).forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([value, count]) => `${value} ${count}회`)
        .join(", ") || "아직 없음";
    }
    function buildReflectionSummary() {
      const observations = recentObservations(14);
      const logs = recentLogs(14);
      const highRisk = observations.filter(o => Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4);
      const resisted = observations.filter(o => Number(o.urgeScore) >= 5 && Number(o.actionLevel) <= 1);
      const emotionsSeen = observations.flatMap(o => compactList([o.emotion, o.emotionCustom]));
      const bodiesSeen = observations.flatMap(o => compactList([...(Array.isArray(o.body) ? o.body : []), o.bodyCustom]));
      const valuesSeen = observations.map(o => o.value).concat(state.data.practices.map(p => p.value));
      const helpfulCoping = observations
        .filter(o => Number(o.copingScore) >= 6 && o.coping)
        .map(o => o.coping)
        .slice(0, 3)
        .join(" / ") || "아직 없음";
      return [
        "최근 2주 자기성찰 요약",
        "",
        `관찰 기록: ${observations.length}건`,
        `실천 기록: ${logs.length}건`,
        `자주 나온 감정: ${topItems(emotionsSeen)}`,
        `자주 나온 몸 반응: ${topItems(bodiesSeen)}`,
        `자주 선택한 가치: ${topItems(valuesSeen)}`,
        `고위험 신호: ${highRisk.length}건`,
        `충동은 높았지만 행동화하지 않은 기록: ${resisted.length}건`,
        `도움이 컸던 대처: ${helpfulCoping}`,
        "",
        "이번 주 점검 질문",
        "1. 위험 신호가 올라오기 전 가장 먼저 나타난 단서는 무엇이었나요?",
        "2. 충동을 행동으로 옮기지 않은 순간에 무엇이 도움이 되었나요?",
        "3. 다음 24시간 안에 가능한 가장 작은 가치 행동은 무엇인가요?"
      ].join("\n");
    }
    function trendSeriesData() {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = daysAgo(13 - i);
        return dateToISO(d);
      });
      return days.map(day => ({
        day,
        label: day.slice(5).replace("-", "/"),
        observation: avg(activeObservations().filter(o => o.date === day), observationIntensity),
        practice: averageDailyLogScore(activeLogs().filter(l => l.date === day)),
        action: avg(activeObservations().filter(o => o.date === day), o => Number(o.actionLevel) * 2),
        observationCount: activeObservations().filter(o => o.date === day).length,
        logCount: activeLogs().filter(l => l.date === day).length
      }));
    }
    function renderTrendBars() {
      const box = $("#trendBars");
      if (!box) return;
      const data = trendSeriesData();
      const hasData = data.some(day => day.observationCount || day.logCount);
      if (!hasData) {
        box.innerHTML = `<div class="empty">아직 그래프로 볼 관찰 또는 실천 기록이 없습니다.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot obs"></i>관찰강도</span>
          <span><i class="legend-dot practice"></i>실천수행도</span>
          <span><i class="legend-dot action"></i>행동수준</span>
        </div>
        <div class="trend-bar-list">
          ${data.map(day => `
            <div class="trend-day">
              <div class="trend-date">${escapeHtml(day.label)}</div>
              <div class="trend-bar-stack" aria-label="${escapeHtml(day.day)} 추세">
                <div class="trend-line obs" style="width:${Math.round(Math.max(0, Math.min(10, day.observation)) * 10)}%"><span>${day.observation ? day.observation.toFixed(1) : ""}</span></div>
                <div class="trend-line practice" style="width:${Math.round(Math.max(0, Math.min(10, day.practice)) * 10)}%"><span>${day.practice ? day.practice.toFixed(1) : ""}</span></div>
                <div class="trend-line action" style="width:${Math.round(Math.max(0, Math.min(10, day.action)) * 10)}%"><span>${day.action ? day.action.toFixed(1) : ""}</span></div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    function drawTrend() {
      const canvas = $("#trendCanvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || canvas.parentElement?.clientWidth || 320;
      const displayHeight = rect.height || canvas.parentElement?.clientHeight || 280;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(displayWidth * dpr));
      canvas.height = Math.max(1, Math.floor(displayHeight * dpr));
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      const pad = 38;
      const width = Math.max(1, displayWidth - pad * 2);
      const height = Math.max(1, displayHeight - pad * 2);
      ctx.strokeStyle = "#d9e2dd";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = pad + height - (i / 5) * height;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + width, y); ctx.stroke();
        ctx.fillStyle = "#64736d"; ctx.font = "12px sans-serif"; ctx.fillText(String(i * 2), 8, y + 4);
      }
      const trendData = trendSeriesData();
      const obsSeries = trendData.map(day => day.observation);
      const logSeries = trendData.map(day => day.practice);
      const actionSeries = trendData.map(day => day.action);
      drawLine(ctx, obsSeries, "#2f7567", pad, width, height);
      drawLine(ctx, logSeries, "#c1842f", pad, width, height);
      drawLine(ctx, actionSeries, "#b64a45", pad, width, height);
      ctx.fillStyle = "#1d2924"; ctx.font = "12px sans-serif";
      ctx.fillText("관찰강도", pad, 16);
      ctx.fillStyle = "#c1842f"; ctx.fillText("실천수행도", pad + 72, 16);
      ctx.fillStyle = "#b64a45"; ctx.fillText("행동수준", pad + 158, 16);
    }
    function drawLine(ctx, values, color, pad, width, height) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = pad + (values.length === 1 ? 0 : i / (values.length - 1) * width);
        const y = pad + height - (Math.max(0, Math.min(10, v)) / 10) * height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = color;
      values.forEach((v, i) => {
        const x = pad + (values.length === 1 ? 0 : i / (values.length - 1) * width);
        const y = pad + height - (Math.max(0, Math.min(10, v)) / 10) * height;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    function buildSummary(mode = state.shareMode) {
      const observations = rangeRecords(activeObservations());
      const logs = rangeRecords(activeLogs());
      const practices = state.data.practices;
      const highRisk = observations.filter(o => Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4);
      const resisted = observations.filter(o => Number(o.urgeScore) >= 5 && Number(o.actionLevel) <= 1);
      const valueCounts = {};
      observations.forEach(o => { if (o.value) valueCounts[o.value] = (valueCounts[o.value] || 0) + 1; });
      practices.forEach(p => { if (p.value) valueCounts[p.value] = (valueCounts[p.value] || 0) + 1; });
      const topValues = Object.entries(valueCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(v => v[0]).join(", ") || "아직 없음";
      const barrierText = practices.map(p => p.barriers).filter(Boolean).slice(0, 4).join(" / ") || "아직 없음";
      const helpful = observations.map(o => o.coping).filter(Boolean).slice(0, 4).join(" / ") || "아직 없음";
      const keySummary = [
        "핵심 요약:",
        `- 이번 기간 가장 높았던 위험 신호: ${highRisk.length}건`,
        `- 가장 많이 선택한 가치: ${topValues}`,
        `- 실천행동 평균 수행도: ${averageDailyLogScore(logs).toFixed(1)}점`,
        `- 다음 상담에서 조정할 점: 30% 버전, 고위험 시간대, 반복 방해요인`
      ];
      if (mode === "family") {
        return [
          "가족/배우자 회복 과정 요약",
          "",
          `기록 기간: ${rangeLabel()}`,
          `관찰한 날/기록 수: ${new Set(observations.map(o => o.date)).size}일 / ${observations.length}건`,
          `위험 신호를 알아차린 횟수: ${highRisk.length}건`,
          `충동이 있었지만 문제 행동으로 이어지지 않은 기록: ${resisted.length}건`,
          `가치 기반 실천 기록: ${logs.length}건`,
          `실천 평균 수행도: ${averageDailyLogScore(logs).toFixed(1)}점`,
          `주요 가치: ${topValues}`,
          "",
          "가족이 도울 수 있는 방식: 비난보다 실천을 이어갈 환경을 함께 만들고, 구체적 원자료 공개보다 회복 노력과 다음 행동을 확인합니다."
        ].join("\n");
      }
      return [
        mode === "counselorDetail" ? "상담자 상세 공유 요약" : "상담자 요약 공유",
        "",
        ...keySummary,
        "",
        `기록 기간: ${rangeLabel()}`,
        `관찰 기록: ${observations.length}건`,
        `실천 기록: ${logs.length}건`,
        `주요 가치: ${topValues}`,
        `사고·감정·충동 평균: ${avg(observations, observationIntensity).toFixed(1)}점`,
        `문제 행동 수준 평균: ${avg(observations, o => Number(o.actionLevel)).toFixed(1)}점 / 5점`,
        `고위험 신호: ${highRisk.length}건`,
        `충동이 높았지만 행동화하지 않은 기록: ${resisted.length}건`,
        `실천 평균 수행도: ${averageDailyLogScore(logs).toFixed(1)}점`,
        `반복 방해요인: ${barrierText}`,
        `도움이 된 대처행동: ${helpful}`,
        "",
        "다음 상담 질문:",
        "1. 실천행동의 30% 버전이 충분히 작았는지 점검하기",
        "2. 고위험 시간대와 방해요인을 더 구체적으로 조정하기",
        "3. 선택한 가치가 실제 행동으로 이어지는지 확인하기"
      ].join("\n");
    }
    function rangeLabel() {
      if (state.shareRange === "all") return "전체";
      return `최근 ${Number(state.shareRange) === 7 ? "1주" : Number(state.shareRange) === 14 ? "2주" : "4주"}`;
    }
    function buildCsv() {
      const summary = buildSummary(state.shareMode);
      const observations = rangeRecords(activeObservations());
      const logs = rangeRecords(activeLogs());
      const header = [
        "schema_version", "record_type", "id", "date", "updated_at", "time_slot",
        "behavior_areas", "behavior_custom_areas", "emotion", "emotion_custom", "body_reactions", "body_custom",
        "situation", "thought_text", "thought_score", "emotion_score", "urge_score", "action_level",
        "coping", "coping_score", "gratitude", "insight", "value", "value_action_draft",
        "practice_id", "practice_value", "practice_name", "practice_reason", "frequency", "target_count",
        "custom_days", "reminder_mode", "reminder_times", "start_date", "barriers", "small_version",
        "practice_score", "practice_note", "archived", "share_mode", "range_label"
      ];
      const rows = [header];
      const redactDetails = state.shareMode === "family" || state.redactions.details;
      const redactThoughts = state.shareMode === "family" || state.redactions.thoughts;
      const redactPrivate = state.shareMode === "family" || state.redactions.private;

      observations.forEach(o => {
        rows.push([
          "maeumgoyo_v2", "observation", o.id || "", o.date || "", o.updatedAt || "", o.mode || "",
          redactDetails ? "민감 내용 제외" : behaviorAreaText(o),
          redactDetails ? "민감 내용 제외" : behaviorCustomText(o),
          o.emotion || "", o.emotionCustom || "", Array.isArray(o.body) ? o.body.join("; ") : "", o.bodyCustom || "",
          redactDetails ? "민감 내용 제외" : (o.situation || ""),
          redactThoughts ? "민감 내용 제외" : (o.thoughtText || ""),
          o.thoughtScore ?? 0, o.emotionScore ?? 0, o.urgeScore ?? 0, o.actionLevel ?? 0,
          o.coping || "", o.copingScore ?? 0, o.gratitude || "",
          redactPrivate ? "민감 내용 제외" : (o.insight || ""),
          o.value || "", o.valueActionDraft || "",
          "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
          state.shareMode, rangeLabel()
        ]);
      });

      state.data.practices.forEach(p => {
        rows.push([
          "maeumgoyo_v2", "practice_definition", p.id || "", "", p.updatedAt || "", "",
          "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
          p.value || "", "",
          p.id || "", p.value || "", p.name || "", p.reason || "", p.frequency || "daily", targetCount(p),
          Array.isArray(p.customDays) ? p.customDays.join(";") : "", p.reminderMode || "morning", p.reminderTimes || "",
          p.startDate || "", p.barriers || "", p.smallVersion || "",
          "", "", p.archived ? "1" : "0", state.shareMode, rangeLabel()
        ]);
      });

      logs.forEach(l => {
        const p = state.data.practices.find(x => x.id === l.practiceId) || {};
        rows.push([
          "maeumgoyo_v2", "practice_log", l.id || "", l.date || "", l.updatedAt || "", "",
          "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
          p.value || "", "",
          l.practiceId || "", p.value || "", p.name || "", "", "", targetCount(p),
          "", "", "", "", "", "",
          l.score ?? 0, redactPrivate ? "민감 내용 제외" : (l.note || ""), "", state.shareMode, rangeLabel()
        ]);
      });

      const csv = rows.map(row => row.map(escapeCsv).join(",")).join("\n");
      const nameMode = state.shareMode === "family" ? "가족회복요약" : state.shareMode === "counselorSummary" ? "상담자요약" : "상담자상세";
      return { csv, blob: new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), fileName: `마음고요_관찰과실천_${nameMode}_${rangeLabel()}_${todayISO()}.csv`, summary };
    }
    function verifyCurrentCsv() {
      const { csv } = buildCsv();
      const rows = parseCsv(csv);
      const header = rows.shift() || [];
      const report = {
        ok: true,
        messages: [],
        counts: { observation: 0, practice_definition: 0, practice_log: 0 }
      };
      if (header[0] !== "schema_version" || header[1] !== "record_type") {
        report.ok = false;
        report.messages.push("첫 열 구조가 올바르지 않습니다.");
      }
      const index = {};
      header.forEach((name, i) => index[name] = i);
      ["schema_version", "record_type", "id", "date", "updated_at"].forEach(name => {
        if (!(name in index)) {
          report.ok = false;
          report.messages.push(`필수 항목 누락: ${name}`);
        }
      });
      rows.forEach((row, rowIndex) => {
        if (row.length !== header.length) {
          report.ok = false;
          report.messages.push(`${rowIndex + 2}행의 칸 수가 맞지 않습니다.`);
        }
        if (row[index.schema_version] !== "maeumgoyo_v2") {
          report.ok = false;
          report.messages.push(`${rowIndex + 2}행의 schema_version이 맞지 않습니다.`);
        }
        const type = row[index.record_type];
        if (type in report.counts) report.counts[type] += 1;
        else {
          report.ok = false;
          report.messages.push(`${rowIndex + 2}행의 record_type을 알 수 없습니다.`);
        }
      });
      const expected = {
        observation: rangeRecords(activeObservations()).length,
        practice_definition: state.data.practices.length,
        practice_log: rangeRecords(activeLogs()).length
      };
      Object.entries(expected).forEach(([key, count]) => {
        if (report.counts[key] !== count) {
          report.ok = false;
          report.messages.push(`${key} 개수가 예상과 다릅니다. 예상 ${count}개, 확인 ${report.counts[key]}개`);
        }
      });
      const byId = (type) => rows.filter(row => row[index.record_type] === type).reduce((map, row) => {
        map[row[index.id]] = row;
        return map;
      }, {});
      const observationRows = byId("observation");
      activeObservations().forEach(record => {
        if (state.shareRange !== "all" && dateObj(record.date) < daysAgo(Number(state.shareRange) - 1)) return;
        const row = observationRows[record.id];
        if (!row) {
          report.ok = false;
          report.messages.push(`관찰 기록 누락: ${record.date}`);
          return;
        }
        if (row[index.date] !== record.date || Number(row[index.urge_score]) !== Number(record.urgeScore)) {
          report.ok = false;
          report.messages.push(`관찰 기록 값 불일치: ${record.date}`);
        }
      });
      const practiceRows = byId("practice_definition");
      state.data.practices.forEach(record => {
        const row = practiceRows[record.id];
        if (!row) {
          report.ok = false;
          report.messages.push(`실천행동 누락: ${record.name || record.value || record.id}`);
          return;
        }
        if (row[index.practice_name] !== (record.name || "") || row[index.practice_value] !== (record.value || "")) {
          report.ok = false;
          report.messages.push(`실천행동 값 불일치: ${record.name || record.id}`);
        }
      });
      const logRows = byId("practice_log");
      activeLogs().forEach(record => {
        if (state.shareRange !== "all" && dateObj(record.date) < daysAgo(Number(state.shareRange) - 1)) return;
        const row = logRows[record.id];
        if (!row) {
          report.ok = false;
          report.messages.push(`수행 기록 누락: ${record.date}`);
          return;
        }
        if (row[index.date] !== record.date || Number(row[index.practice_score]) !== Number(record.score)) {
          report.ok = false;
          report.messages.push(`수행 기록 값 불일치: ${record.date}`);
        }
      });
      return report;
    }
    function renderCsvVerification() {
      const report = verifyCurrentCsv();
      const countText = `관찰 ${report.counts.observation}개, 실천행동 ${report.counts.practice_definition}개, 수행도 ${report.counts.practice_log}개`;
      $("#shareInfo").textContent = report.ok
        ? `CSV 복원 점검 통과: ${countText}. 현재 범위의 백업 파일을 다시 읽을 수 있는 구조입니다.`
        : `CSV 복원 점검 필요: ${report.messages.slice(0, 3).join(" / ")}`;
      showToast(report.ok ? "CSV 복원 점검을 통과했습니다." : "CSV 구조를 다시 확인해주세요.");
    }
    function parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = "";
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (quoted) {
          if (char === '"' && next === '"') {
            cell += '"';
            i++;
          } else if (char === '"') {
            quoted = false;
          } else {
            cell += char;
          }
        } else if (char === '"') {
          quoted = true;
        } else if (char === ",") {
          row.push(cell);
          cell = "";
        } else if (char === "\n") {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = "";
        } else if (char !== "\r") {
          cell += char;
        }
      }
      row.push(cell);
      rows.push(row);
      return rows.filter(r => r.some(c => String(c).trim()));
    }
    function importCsvFile(file) {
      if (!file) {
        showToast("가져올 CSV 파일을 선택해주세요.");
        return;
      }
      if (file.size > MAX_CSV_BYTES) {
        $("#importInfo").textContent = "CSV 파일이 너무 큽니다. 2MB 이하의 백업 파일만 가져올 수 있습니다.";
        showToast("CSV 파일 크기를 줄여주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let rows = [];
        try {
          rows = parseCsv(String(reader.result || "").replace(/^\ufeff/, ""));
        } catch {
          $("#importInfo").textContent = "CSV 파일을 읽지 못했습니다. 파일 형식을 확인해주세요.";
          showToast("CSV를 읽지 못했습니다.");
          return;
        }
        if (rows.length > MAX_IMPORT_ROWS) {
          $("#importInfo").textContent = "CSV 행이 너무 많습니다. 5,000행 이하의 파일만 가져올 수 있습니다.";
          showToast("CSV 행 수를 줄여주세요.");
          return;
        }
        const header = rows.shift() || [];
        if (header[0] !== "schema_version" || header[1] !== "record_type") {
          $("#importInfo").textContent = "새 CSV 구조(maeumgoyo_v2)로 저장한 파일만 가져올 수 있습니다.";
          return;
        }
        const index = {};
        header.forEach((name, i) => index[name] = i);
        const requiredColumns = ["schema_version", "record_type", "id", "date", "updated_at"];
        const missingColumns = requiredColumns.filter(name => !(name in index));
        if (missingColumns.length) {
          $("#importInfo").textContent = `CSV 필수 항목이 빠져 있습니다: ${missingColumns.join(", ")}`;
          showToast("CSV 구조를 확인해주세요.");
          return;
        }
        const cell = (row, name) => row[index[name]] ?? "";
        const before = {
          observations: state.data.observations.length,
          practices: state.data.practices.length,
          logs: state.data.logs.length
        };
        rows.forEach(row => {
          if (cell(row, "schema_version") !== "maeumgoyo_v2") return;
          const type = cell(row, "record_type");
          if (type === "observation") {
            const id = cell(row, "id") || uid();
            if (state.data.observations.some(o => o.id === id)) return;
            const behaviorAreas = splitBehaviorCustom(cell(row, "behavior_areas"));
            const behaviorCustomAreas = splitBehaviorCustom(cell(row, "behavior_custom_areas"));
            state.data.observations.push({
              id,
              date: cleanDate(cell(row, "date") || todayISO()),
              mode: cleanText(cell(row, "time_slot") || "가져오기", TEXT_LIMITS.short),
              behavior: behaviorAreas.join(", "),
              behaviorAreas,
              behaviorCustomAreas,
              situation: isRedacted(cell(row, "situation")) ? "" : cleanMultiline(cell(row, "situation"), TEXT_LIMITS.long),
              thoughtText: isRedacted(cell(row, "thought_text")) ? "" : cleanMultiline(cell(row, "thought_text"), TEXT_LIMITS.long),
              emotion: cleanText(cell(row, "emotion"), TEXT_LIMITS.short),
              emotionCustom: cleanText(cell(row, "emotion_custom"), 10),
              body: splitBehaviorCustom(cell(row, "body_reactions").replace(/;/g, ",")),
              bodyCustom: cleanText(cell(row, "body_custom"), 10),
              thoughtScore: clampNumber(cell(row, "thought_score"), 0, 10, 0),
              emotionScore: clampNumber(cell(row, "emotion_score"), 0, 10, 0),
              urgeScore: clampNumber(cell(row, "urge_score"), 0, 10, 0),
              actionLevel: clampNumber(cell(row, "action_level"), 0, 5, 0),
              coping: cleanMultiline(cell(row, "coping"), TEXT_LIMITS.long),
              copingScore: clampNumber(cell(row, "coping_score"), 0, 10, 0),
              gratitude: cleanMultiline(cell(row, "gratitude"), TEXT_LIMITS.medium),
              insight: isRedacted(cell(row, "insight")) ? "" : cleanMultiline(cell(row, "insight"), TEXT_LIMITS.reflection),
              value: cleanText(cell(row, "value"), TEXT_LIMITS.short),
              valueActionDraft: cleanMultiline(cell(row, "value_action_draft"), TEXT_LIMITS.medium),
              updatedAt: cell(row, "updated_at") || new Date().toISOString()
            });
          }
          if (type === "practice_definition") {
            const id = cell(row, "practice_id") || cell(row, "id") || uid();
            if (state.data.practices.some(p => p.id === id)) return;
            state.data.practices.push({
              id,
              value: cleanText(cell(row, "practice_value") || cell(row, "value"), TEXT_LIMITS.short),
              name: cleanMultiline(cell(row, "practice_name"), TEXT_LIMITS.medium),
              reason: cleanMultiline(cell(row, "practice_reason"), TEXT_LIMITS.long),
              frequency: cell(row, "frequency") || "daily",
              customDays: String(cell(row, "custom_days") || "").split(";").map(Number).filter(n => !Number.isNaN(n)),
              targetCount: clampNumber(cell(row, "target_count"), 1, 12, 1),
              reminderMode: cell(row, "reminder_mode") || "morning",
              reminderTimes: cleanTimeList(cell(row, "reminder_times")),
              startDate: cleanDate(cell(row, "start_date") || todayISO()),
              barriers: cleanMultiline(cell(row, "barriers"), TEXT_LIMITS.long),
              smallVersion: cleanMultiline(cell(row, "small_version"), TEXT_LIMITS.medium),
              archived: cell(row, "archived") === "1",
              updatedAt: cell(row, "updated_at") || new Date().toISOString()
            });
          }
          if (type === "practice_log") {
            const id = cell(row, "id") || uid();
            if (state.data.logs.some(log => log.id === id)) return;
            const practiceId = cell(row, "practice_id");
            if (practiceId && !state.data.practices.some(p => p.id === practiceId)) {
              state.data.practices.push({
                id: practiceId,
                value: cleanText(cell(row, "practice_value"), TEXT_LIMITS.short),
                name: cleanMultiline(cell(row, "practice_name"), TEXT_LIMITS.medium),
                reason: "CSV에서 가져온 실천행동",
                frequency: "daily",
                customDays: [],
                targetCount: clampNumber(cell(row, "target_count"), 1, 12, 1),
                reminderMode: "morning",
                reminderTimes: "",
                startDate: cleanDate(cell(row, "date") || todayISO()),
                barriers: "",
                smallVersion: "",
                archived: false,
                updatedAt: new Date().toISOString()
              });
            }
            state.data.logs.push({
              id,
              practiceId,
              date: cleanDate(cell(row, "date") || todayISO()),
              score: clampNumber(cell(row, "practice_score"), 0, 10, 0),
              note: isRedacted(cell(row, "practice_note")) ? "" : cleanMultiline(cell(row, "practice_note"), TEXT_LIMITS.long),
              updatedAt: cell(row, "updated_at") || new Date().toISOString()
            });
          }
        });
        if (!saveData()) return;
        renderAll();
        $("#importInfo").textContent = `CSV를 가져왔습니다: 관찰 ${state.data.observations.length - before.observations}개, 실천행동 ${state.data.practices.length - before.practices}개, 수행도 ${state.data.logs.length - before.logs}개`;
        showToast("CSV를 가져왔습니다.");
      };
      reader.readAsText(file, "utf-8");
    }
    function downloadBlob(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    function observeSubmit(event) {
      event.preventDefault();
      const value = cleanText($("#valueCustom").value || state.value || "", TEXT_LIMITS.short);
      const behaviorAreas = selectedBehaviorAreas();
      const behaviorCustomAreas = splitBehaviorCustom($("#behaviorCustom").value);
      const behavior = behaviorAreas.join(", ");
      const id = $("#observeId").value || uid();
      const entry = {
        id,
        date: cleanDate($("#observeDate").value || todayISO()),
        mode: state.observeMode,
        behavior,
        behaviorAreas,
        behaviorCustomAreas,
        situation: cleanMultiline($("#situation").value, TEXT_LIMITS.long),
        thoughtText: cleanMultiline($("#thoughtText").value, TEXT_LIMITS.long),
        emotion: cleanText(state.emotion, TEXT_LIMITS.short),
        emotionCustom: shortCustomValue("#emotionCustom"),
        body: state.body.slice(),
        bodyCustom: shortCustomValue("#bodyCustom"),
        thoughtScore: clampNumber($("#thoughtScore").value, 0, 10, 0),
        emotionScore: clampNumber($("#emotionScore").value, 0, 10, 0),
        urgeScore: clampNumber($("#urgeScore").value, 0, 10, 0),
        actionLevel: clampNumber($("#actionLevel").value, 0, 5, 0),
        coping: cleanMultiline($("#coping").value, TEXT_LIMITS.long),
        copingScore: clampNumber($("#copingScore").value, 0, 10, 0),
        gratitude: cleanMultiline($("#gratitude").value, TEXT_LIMITS.medium),
        insight: cleanMultiline($("#insight").value, TEXT_LIMITS.reflection),
        value,
        valueActionDraft: cleanMultiline($("#valueActionDraft").value, TEXT_LIMITS.medium),
        updatedAt: new Date().toISOString()
      };
      const index = state.data.observations.findIndex(o => o.id === id);
      if (index >= 0) state.data.observations[index] = entry;
      else state.data.observations.push(entry);
      if (!saveData()) return;
      $("#observeForm").reset();
      resetObserveDefaults();
      renderAll();
      const isHighRisk = entry.urgeScore >= 8 || entry.actionLevel >= 4;
      showRiskFollowup(isHighRisk);
      showToast(isHighRisk ? "고위험 신호를 저장했습니다. 지금은 안전한 장소와 연락을 먼저 챙겨주세요." : "관찰 기록을 저장했습니다.");
    }
    function resetObserveDefaults() {
      $("#observeId").value = "";
      $("#observeDate").value = todayISO();
      setObserveMode("저녁");
      state.behavior = "";
      state.behaviorAreas = [];
      state.emotion = "";
      state.emotionCustom = "";
      state.body = [];
      state.bodyCustom = "";
      state.value = "";
      showRiskFollowup(false);
      ["thoughtScore","emotionScore","urgeScore","actionLevel","copingScore"].forEach(id => {
        $("#" + id).value = 0;
        $("#" + id + "Value").textContent = "0";
      });
      initPickers();
    }
    function practiceSubmit(event) {
      event.preventDefault();
      const id = $("#practiceId").value || uid();
      const entry = {
        id,
        value: cleanText($("#practiceValue").value, TEXT_LIMITS.short),
        name: cleanMultiline($("#practiceName").value, TEXT_LIMITS.medium),
        reason: cleanMultiline($("#practiceReason").value, TEXT_LIMITS.long),
        frequency: $("#frequency").value,
        customDays: state.customDays.slice(),
        targetCount: clampNumber($("#targetCount").value, 1, 12, 1),
        reminderMode: $("#reminderMode").value,
        reminderTimes: cleanTimeList($("#reminderTimes").value),
        startDate: cleanDate($("#practiceStart").value || todayISO()),
        barriers: cleanMultiline($("#barriers").value, TEXT_LIMITS.long),
        smallVersion: cleanMultiline($("#smallVersion").value, TEXT_LIMITS.medium),
        archived: false,
        updatedAt: new Date().toISOString()
      };
      if (!entry.value || !entry.name) {
        showToast("가치와 실천행동을 입력해주세요.");
        return;
      }
      if (!entry.smallVersion && !confirm("30% 버전의 최소 행동이 비어 있습니다. 기분이 좋지 않은 날에도 이어갈 수 있도록 최소 행동을 정하는 것을 권장합니다. 그래도 저장할까요?")) {
        return;
      }
      const index = state.data.practices.findIndex(p => p.id === id);
      if (index >= 0) state.data.practices[index] = { ...state.data.practices[index], ...entry };
      else state.data.practices.push(entry);
      if (!saveData()) return;
      clearPracticeForm();
      renderAll();
      showToast("작은 실천행동을 저장했습니다.");
    }
    function editPractice(id) {
      const p = state.data.practices.find(x => x.id === id);
      if (!p) return;
      $("#practiceId").value = p.id;
      $("#practiceForm").dataset.editValue = p.value || "";
      $("#practiceForm").dataset.editName = p.name || "";
      $("#practiceValue").value = p.value || "";
      $("#practiceName").value = p.name || "";
      $("#practiceReason").value = p.reason || "";
      $("#frequency").value = p.frequency || "daily";
      $("#targetCount").value = targetCount(p);
      $("#reminderMode").value = p.reminderMode || "morning";
      $("#reminderTimes").value = p.reminderTimes || "";
      $("#practiceStart").value = p.startDate || todayISO();
      $("#barriers").value = p.barriers || "";
      $("#smallVersion").value = p.smallVersion || "";
      state.customDays = p.customDays || [];
      $$("#weekdayChips button").forEach(b => b.classList.toggle("active", state.customDays.includes(Number(b.dataset.day))));
      $("#customDaysRow").style.display = $("#frequency").value === "custom" ? "block" : "none";
      $("#reminderTimesRow").style.display = $("#reminderMode").value === "times" ? "block" : "none";
      setView("practice");
    }
    function clearPracticeForm() {
      $("#practiceForm").reset();
      $("#practiceId").value = "";
      $("#practiceForm").dataset.editValue = "";
      $("#practiceForm").dataset.editName = "";
      $("#practiceStart").value = todayISO();
      $("#targetCount").value = 1;
      $("#reminderMode").value = "morning";
      $("#reminderTimes").value = "";
      state.customDays = [];
      $$("#weekdayChips button").forEach(b => b.classList.remove("active"));
      $("#customDaysRow").style.display = "none";
      $("#reminderTimesRow").style.display = "none";
    }
    function startFreshPracticeFromTopFields() {
      const form = $("#practiceForm");
      const id = $("#practiceId").value;
      if (!id) return;
      const originalValue = form.dataset.editValue || "";
      const originalName = form.dataset.editName || "";
      const currentValue = $("#practiceValue").value.trim();
      const currentName = $("#practiceName").value.trim();
      if (currentValue === originalValue && currentName === originalName) return;
      $("#practiceId").value = "";
      form.dataset.editValue = "";
      form.dataset.editName = "";
      $("#practiceReason").value = "";
      $("#frequency").value = "daily";
      $("#targetCount").value = 1;
      $("#reminderMode").value = "morning";
      $("#reminderTimes").value = "";
      $("#practiceStart").value = todayISO();
      $("#barriers").value = "";
      $("#smallVersion").value = "";
      state.customDays = [];
      $$("#weekdayChips button").forEach(b => b.classList.remove("active"));
      $("#customDaysRow").style.display = "none";
      $("#reminderTimesRow").style.display = "none";
      showToast("새 실천행동 입력으로 전환했습니다.");
    }
    function sendObservationToPractice() {
      const value = cleanText($("#valueCustom").value || state.value, TEXT_LIMITS.short);
      const action = cleanMultiline($("#valueActionDraft").value, TEXT_LIMITS.medium);
      if (!value && !action) {
        showToast("먼저 가치와 작은 행동 초안을 입력해주세요.");
        return;
      }
      clearPracticeForm();
      $("#practiceValue").value = value;
      $("#practiceName").value = action;
      $("#practiceStart").value = todayISO();
      setView("practice");
      showToast("가치와 행동 초안을 실천 설정으로 옮겼습니다.");
    }
    function renderSharePreview() {
      $("#sharePreview").textContent = buildSummary(state.shareMode);
    }
    function renderAll() {
      if (state.view === "today") renderToday();
      renderObserveList();
      renderPracticeLogList();
      renderPracticeList();
      if (state.view === "trend") renderTrend();
      if (state.view === "share") renderSharePreview();
      renderHiddenRecordStatus();
    }
    function checkLock() {
      const pin = localStorage.getItem(PIN_KEY);
      if (pin) $("#lockScreen").classList.add("active");
    }
    function unlock() {
      const pin = localStorage.getItem(PIN_KEY);
      const recovery = localStorage.getItem(RECOVERY_KEY);
      if ($("#unlockPin").value === pin || (recovery && $("#unlockPin").value === recovery)) {
        $("#lockScreen").classList.remove("active");
        $("#unlockPin").value = "";
        $("#unlockMessage").textContent = "";
      } else {
        $("#unlockMessage").textContent = "PIN이 맞지 않습니다.";
      }
    }
    function generateRecoveryCode() {
      if (crypto.getRandomValues) {
        return Array.from(crypto.getRandomValues(new Uint32Array(2)))
          .map(n => n.toString(36).slice(0, 4).toUpperCase())
          .join("-");
      }
      return `${Math.random().toString(36).slice(2, 6)}-${Date.now().toString(36).slice(-4)}`.toUpperCase();
    }
    async function applyAppUpdate() {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
      } finally {
        window.location.reload();
      }
    }
    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.register("./service-worker.js").then(registration => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showToast("새 버전이 준비되었습니다. 보호하기에서 앱 업데이트를 적용할 수 있습니다.");
            }
          });
        });
      }).catch(() => {});
    }
    function resetLockedApp() {
      if (!confirm("PIN을 잊은 경우 기록 보호를 위해 모든 기록과 PIN을 삭제한 뒤 초기화합니다. 계속할까요?")) return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(PIN_KEY);
      localStorage.removeItem(RECOVERY_KEY);
      window.location.reload();
    }
    function touchActivity() { state.lastActive = Date.now(); }
    function setupEvents() {
      $$(".tab").forEach(tab => tab.addEventListener("click", () => setView(tab.dataset.view)));
      $$("[data-jump]").forEach(b => b.addEventListener("click", () => setView(b.dataset.jump)));
      $("#observeForm").addEventListener("submit", observeSubmit);
      $("#practiceForm").addEventListener("submit", practiceSubmit);
      $("#practiceValue").addEventListener("input", startFreshPracticeFromTopFields);
      $("#practiceName").addEventListener("input", startFreshPracticeFromTopFields);
      $("#sendToPractice").addEventListener("click", sendObservationToPractice);
      $("#clearPracticeForm").addEventListener("click", clearPracticeForm);
      $("#frequency").addEventListener("change", () => $("#customDaysRow").style.display = $("#frequency").value === "custom" ? "block" : "none");
      $("#reminderMode").addEventListener("change", () => $("#reminderTimesRow").style.display = $("#reminderMode").value === "times" ? "block" : "none");
      $("#requestNotification").addEventListener("click", async () => {
        if (!("Notification" in window)) {
          showToast("이 브라우저는 알림을 지원하지 않습니다.");
          return;
        }
        const result = await Notification.requestPermission();
        showToast(result === "granted" ? "알림 권한이 허용되었습니다." : "알림 권한이 허용되지 않았습니다.");
        renderNotificationStatus();
      });
      $("#observeModeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        setObserveMode(b.dataset.value);
      });
      $("#quickObserve").addEventListener("click", () => startQuickObservation("observe"));
      $("#quickRisk").addEventListener("click", () => startQuickObservation("risk"));
      $("#quickBackup").addEventListener("click", () => {
        setView("share");
        showToast("CSV 저장으로 현재 기록을 백업할 수 있습니다.");
      });
      $("#rangeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        $$("#rangeButtons button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.shareRange = b.dataset.days === "all" ? "all" : Number(b.dataset.days);
        renderSharePreview();
      });
      $("#shareModeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        $$("#shareModeButtons button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.shareMode = b.dataset.mode;
        renderSharePreview();
      });
      $$("[data-redact]").forEach(b => b.addEventListener("click", () => {
        b.classList.toggle("active");
        state.redactions[b.dataset.redact] = b.classList.contains("active");
        renderSharePreview();
      }));
      $("#buildPreview").addEventListener("click", () => {
        renderSharePreview();
        showToast("공유 미리보기를 만들었습니다.");
      });
      $("#downloadCsv").addEventListener("click", () => {
        const data = buildCsv();
        downloadBlob(data.blob, data.fileName);
        state.data.settings.lastBackupAt = new Date().toISOString();
        if (!saveData()) return;
        $("#shareInfo").textContent = `저장한 파일: ${data.fileName}`;
      });
      $("#verifyCsv").addEventListener("click", renderCsvVerification);
      $("#shareFile").addEventListener("click", async () => {
        const data = buildCsv();
        const file = new File([data.blob], data.fileName, { type: "text/csv" });
        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          try {
            await navigator.share({ title: "마음고요 관찰과 실천", text: `${rangeLabel()} 기록 공유입니다. 받는 사람: respectuu@naver.com`, files: [file] });
            $("#shareInfo").textContent = `공유한 파일: ${data.fileName}`;
            return;
          } catch (error) {
            if (error.name === "AbortError") return;
          }
        }
        downloadBlob(data.blob, data.fileName);
        state.data.settings.lastBackupAt = new Date().toISOString();
        if (!saveData()) return;
        const subject = encodeURIComponent(`마음고요 관찰과 실천 공유 ${todayISO()}`);
        const body = encodeURIComponent(`안녕하세요.\n\n마음고요 관찰과 실천 기록을 공유드립니다.\n범위: ${rangeLabel()}\n첨부할 파일명: ${data.fileName}\n\n파일 자동 첨부가 제한되어 CSV 파일을 먼저 저장했습니다. 메일 발송 전 파일을 직접 첨부해 주세요.`);
        window.location.href = `mailto:respectuu@naver.com?subject=${subject}&body=${body}`;
      });
      $("#importCsv").addEventListener("click", () => importCsvFile($("#importFile").files[0]));
      $("#savePin").addEventListener("click", () => {
        const pin = $("#pinInput").value.trim().slice(0, 32);
        if (pin.length < 4) return showToast("PIN은 4자리 이상으로 설정해주세요.");
        const recovery = generateRecoveryCode();
        localStorage.setItem(PIN_KEY, pin);
        localStorage.setItem(RECOVERY_KEY, recovery);
        $("#pinInput").value = "";
        $("#recoveryInfo").textContent = `복구코드: ${recovery}  이 코드는 PIN을 잊었을 때 사용합니다. 안전한 곳에 따로 적어두세요.`;
        showToast("PIN을 저장했습니다.");
      });
      $("#lockNow").addEventListener("click", () => $("#lockScreen").classList.add("active"));
      $("#updateApp").addEventListener("click", applyAppUpdate);
      $("#saveNoRecordReminderTime").addEventListener("click", () => {
        const time = $("#noRecordReminderTime").value || "20:00";
        state.data.settings.noRecordReminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "20:00";
        if (!saveData()) return;
        renderNotificationStatus();
        showToast("미기록 알림 시간을 저장했습니다.");
      });
      $("#unlockButton").addEventListener("click", unlock);
      $("#unlockPin").addEventListener("keydown", e => { if (e.key === "Enter") unlock(); });
      $("#resetLockedApp").addEventListener("click", resetLockedApp);
      $("#restoreHiddenRecords").addEventListener("click", restoreHiddenRecords);
      $("#saveAlias").addEventListener("click", () => {
        const alias = cleanText($("#aliasInput").value, TEXT_LIMITS.short);
        if (!alias) return showToast("별칭을 입력해주세요.");
        state.data.settings.alias = alias;
        if (!saveData()) return;
        initPickers();
        showToast("별칭을 저장했습니다.");
      });
      ["click", "keydown", "touchstart"].forEach(name => document.addEventListener(name, touchActivity, { passive: true }));
      setInterval(() => {
        if (localStorage.getItem(PIN_KEY) && Date.now() - state.lastActive > AUTO_LOCK_MS) $("#lockScreen").classList.add("active");
      }, 15000);
      setInterval(() => {
        checkPracticeReminders();
        checkNoRecordReminder();
      }, 60000);
      window.addEventListener("resize", () => { if (state.view === "trend") drawTrend(); });
    }
    function init() {
      loadData();
      $("#noRecordReminderTime").value = noRecordReminderTime();
      initPickers();
      bindSliders();
      setupEvents();
      resetObserveDefaults();
      clearPracticeForm();
      renderAll();
      checkLock();
      checkPracticeReminders();
      checkNoRecordReminder();
      registerServiceWorker();
    }
    init();
