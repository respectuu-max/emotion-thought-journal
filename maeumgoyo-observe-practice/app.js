const APP_VERSION = "v95"; // service-worker.js의 CACHE_NAME 버전과 함께 배포 때마다 갱신
const APP_SCHEMA_VERSION = "maeumgoyo_app_v2";
const CSV_SCHEMA_VERSION = "maeumgoyo_csv_v1";
const HAPPINESS_FIELDS = [
  "personal_life_happiness",
  "intimate_relationship_happiness",
  "social_life_happiness",
  "overall_happiness"
];
const CSV_RECORD_TYPES = ["observation", "practice_definition", "practice_log", "prediction", "daily_checkin"];
const LEGACY_STORAGE_KEY = "maeumgoyo.observePractice.v1";
const STORAGE_KEY = "maeumgoyo.observePractice.v2";
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
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
    const VALUE_GUIDE = {
      "건강": { description: "몸과 마음을 돌보며 살아가려는 방향", examples: ["물 한 잔 마시기", "10분만 걷기", "평소보다 30분 일찍 잠자리에 들기", "오늘 한 끼는 제때 챙겨 먹기"] },
      "관계": { description: "소중한 사람들과 연결되어 있으려는 방향", examples: ["가족에게 안부 문자 보내기", "오랜만에 연락 못 한 사람에게 먼저 연락하기", "대화할 때 상대방 말을 끝까지 듣기"] },
      "정직": { description: "나 자신과 다른 사람에게 솔직한 태도로 살아가려는 방향", examples: ["오늘 있었던 일을 상담자에게 있는 그대로 말하기", "하기 싫은 약속은 정직하게 거절하기", "실수를 감추지 않고 인정하기"] },
      "책임": { description: "내가 맡은 일과 관계를 성실히 지켜가려는 방향", examples: ["미뤄둔 답장 하나 보내기", "오늘 할 일 중 가장 작은 것 하나 끝내기", "약속 시간 지키기"] },
      "자기존중": { description: "나 자신을 함부로 대하지 않고 소중히 여기려는 방향", examples: ["스스로에게 비난 대신 격려의 말 한마디 해보기", "힘들 때 \"괜찮아\"라고 말해주기", "무리한 부탁은 거절하기"] },
      "성장": { description: "지금보다 조금씩 나아지고 배워가려는 방향", examples: ["관심 있던 것 5분만 찾아보기", "오늘 배운 것 한 줄 적어보기", "새로운 것 아주 조금 시도해보기"] },
      "안정": { description: "흔들리지 않는 편안한 일상을 만들어가려는 방향", examples: ["정해진 시간에 자고 일어나기", "방 한 구석 정리하기", "오늘 하루 일과를 간단히 계획해보기"] },
      "회복": { description: "지치고 상한 마음과 몸을 의도적으로 돌보며 채워가려는 방향", examples: ["의도적으로 10분 쉬기", "좋아하는 음악 듣기", "따뜻한 차 한잔 마시기"] },
      "자유": { description: "스스로 선택하며 나답게 살아가려는 방향", examples: ["오늘 저녁 메뉴는 내가 원하는 대로 골라보기", "쉬고 싶을 때 잠깐 쉬어도 된다고 스스로에게 허락하기", "답장을 꼭 바로 안 해도 된다고 허락하기"] },
      "배움": { description: "새로운 것을 알아가고 이해를 넓혀가려는 방향", examples: ["궁금했던 것 검색해보기", "책 한 페이지 읽기", "상담에서 배운 것 한 가지 다시 떠올려보기"] },
      "돌봄": { description: "나 또는 다른 사람을 살피고 챙기려는 방향", examples: ["화분에 물 주기", "반려동물과 시간 보내기", "나 자신을 위한 작은 간식 챙기기"] },
      "신뢰": { description: "약속을 지키고 믿을 수 있는 사람이 되어가려는 방향", examples: ["작은 약속 하나 지켜보기", "스스로에게 한 다짐 하나 실천해보기", "상담자에게 솔직하게 상황을 알리기"] },
      "절제": { description: "순간의 충동보다 내가 원하는 방향을 선택하려는 방향", examples: ["충동이 들 때 10분만 미뤄보기", "물 한 잔 마시고 잠시 자리 옮기기", "미리 정한 대체 행동 하나 해보기"] },
      "용기": { description: "두렵거나 불편해도 중요한 일을 시도해보려는 방향", examples: ["불편했던 대화를 다시 꺼내보기", "미뤄왔던 전화 한 통 해보기", "도움을 요청해보기"] },
      "의미": { description: "내 삶에 중요한 뜻과 목적을 찾아가려는 방향", examples: ["오늘 감사했던 일 하나 적어보기", "내게 의미 있었던 순간 떠올려보기", "소중한 사람에게 그 이유를 말해보기"] }
    };
    const emotions = ["불안", "외로움", "분노", "공허함", "수치심", "우울", "초조", "지루함", "피곤함", "무기력"];
    const bodies = ["가슴 답답함", "두근거림", "근육 긴장", "열감", "손 떨림", "시선 고정", "멍함", "얼어붙음", "호흡 짧음"];
    const defaultBehaviors = ["도박", "성(sex)", "스트레스", "심심함", "분노/짜증", "불안/걱정", "외로움/공허함", "회피/무기력"];
    const problemDomains = [
      { value: "urge", label: "충동" },
      { value: "emotion", label: "감정" },
      { value: "thought", label: "생각" },
      { value: "behavior", label: "행동" },
      { value: "body", label: "몸반응" },
      { value: "relationship", label: "관계/상황" },
      { value: "unknown", label: "잘 모르겠음" }
    ];
    const triggerPlaces = ["집", "직장/학교", "이동 중(차·대중교통)", "술자리/모임", "온라인/SNS"];
    const triggerPeople = ["혼자 있을 때", "특정 인물과 함께", "갈등 직후", "사교 모임 상황"];
    const triggerTimes = ["아침", "낮", "저녁", "밤/늦은 시간", "주말"];
    const avoidanceTags = ["약속/모임에 안 나감", "연락에 답하지 않음", "씻기/식사를 미룸", "하루 종일 집에만 있음", "해야 할 일을 미룸"];
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    // ===== 재발 신호 분석 (정서적 · 인지적 · 행동적 재발) =====
    // 상담이 없는 6일 동안의 관찰 기록(그때 느낀 감정/그때 든 생각/충동/문제행동 활성화 수준/대처)을 근거로
    // 세 단계의 재발 신호를 참고용으로 안내합니다. 진단이나 예측이 아니라, 스스로 조치할 기회를 알리는 장치입니다.
    const RELAPSE_WINDOW_DAYS = 3;          // "최근 상태"를 볼 때 쓰는 기본 관찰 창
    const RELAPSE_COMPARE_DAYS = 3;         // 추세 비교에 쓰는 그 이전 구간 길이
    const RELAPSE_EMOTION_HIGH = 6;         // 그때 느낀 감정 0~10점 중 이 이상이면 높음
    const RELAPSE_EMOTION_TREND_RISE = 2;   // 이전 구간 대비 이만큼 오르면 상승 추세로 봄
    const RELAPSE_COPING_LOW = 3;           // 대처 후 도움 정도 0~10점 중 이 이하면 낮음
    const RELAPSE_COPING_TREND_DROP = 2;    // 이전 구간 대비 이만큼 떨어지면 하락 추세로 봄
    const RELAPSE_THOUGHT_HIGH = 6;         // 그때 든 생각 0~10점 중 이 이상이면 높음
    const RELAPSE_URGE_HIGH = 7;            // 충동 0~10점 중 이 이상이면 높음
    const RELAPSE_ACTION_ANY = 1;           // 문제행동 활성화 수준 0~5점 중 1점 이상이면 행동적 재발로 봄
    const RELAPSE_ACTION_SEVERE = 4;        // 기존 고위험 기준과 동일(멈추기 어려운 수준)
    const RELAPSE_EMOTION_VARIABILITY_HIGH = 2.5; // 감정 점수 표준편차가 이 이상이면 "기복이 크다"로 봄 (0~10점 척도 기준)

    const RELAPSE_STAGE1_ACTIONS = [
      { title: "스트레스 낮추기", detail: "가벼운 운동, 산책, 좋아하는 취미를 10분만 해보세요. 감정을 건강하게 내보내는 데 도움이 됩니다." },
      { title: "지원 시스템에 연결하기", detail: "가족, 친구, 회복 모임 중 한 사람에게 지금 감정을 짧게 나눠보세요. 혼자 안고 있지 않는 것이 중요합니다." },
      { title: "생활 리듬 챙기기", detail: "오늘 식사와 수면 중 무너진 부분이 있는지 확인하고, 한 가지만이라도 챙겨보세요." },
      { title: "마음챙김 1분", detail: "잠시 호흡에 집중하며 지금 느껴지는 감정에 이름을 붙여보세요. '지금 나는 ○○을 느끼고 있다.'" },
      { title: "필요하면 전문가에게 미리 알리기", detail: "이런 상태가 며칠째 이어진다면, 다음 상담을 기다리지 말고 상담자에게 먼저 연락하는 것도 방법입니다." }
    ];
    const RELAPSE_STAGE2_TECHNIQUES = [
      { title: "STOP 기법", detail: "멈추기(Stop) → 한 걸음 물러서기(Take a step back, 깊게 숨쉬기) → 관찰하기(Observe, 판단 없이 지금 상태 보기) → 마음챙김으로 행동하기(Proceed mindfully, 목표와 가치를 생각해 선택하기)." },
      { title: "TIPP 기법", detail: "압도되는 감정을 빠르게 낮추는 응급 도구입니다. 찬물로 세수하기(온도) · 10분 빠르게 걷거나 몸 움직이기(강한 운동) · 4초 들이쉬고 6초 내쉬기(조절 호흡) · 근육을 5초 힘줬다 풀기(점진적 이완) 중 하나를 시도해보세요." },
      { title: "생각과 거리두기 (탈융합)", detail: "'한 번쯤 해도 되지 않을까'라는 생각이 들면, 그 생각을 사실로 여기지 말고 '지금 이런 생각이 떠올랐구나' 하고 한 걸음 떨어져서 바라보세요. 생각은 명령이 아니라 마음이 만들어낸 하나의 사건일 뿐입니다." },
      { title: "영화를 결말까지 돌려보기", detail: "그 행동을 하는 상상의 하이라이트만 보지 말고, 그 이후 벌어질 일까지 끝까지 재생해보세요." },
      { title: "미루기 전술", detail: "지금 결정하지 말고 30분에서 1시간만 미뤄보겠다고 스스로에게 말하세요. 그 사이 충동은 대개 약해지거나 감당할 수 있는 크기로 줄어듭니다." },
      { title: "결과 생각해보기", detail: "이 행동을 한 뒤 내일의 나는 어떤 기분일지, 무엇을 잃게 될지 짧게 적어보세요." },
      { title: "믿을 수 있는 사람과 대화하기", detail: "지금 드는 생각을 누군가에게 말하는 것만으로도 그 생각의 힘이 줄어듭니다." },
      { title: "트리거(촉발요인) 피하기", detail: "지금 있는 장소·사람·상황에서 잠시라도 벗어날 수 있는지 확인해보세요." }
    ];
    const RELAPSE_STAGE3_STEPS = [
      { title: "즉시 인정하기", detail: "지금 있었던 일을 스스로에게 숨기지 말고 인정하세요. 부정은 오히려 상황을 길게 만듭니다." },
      { title: "지원 요청하기", detail: "신뢰할 수 있는 사람이나 상담자에게 지금 상황을 알리세요. 솔직하게 이야기하는 것이 도움과 안내로 가는 문을 엽니다." },
      { title: "회복계획 다시 보기", detail: "다음 상담에서 이번 상황을 함께 검토할 수 있도록 무엇이 계기였는지 짧게 기록해두세요." },
      { title: "자기연민 연습하기", detail: "이것은 실패가 아니라 회복 여정의 일부입니다. 자신을 탓하기보다 다음 행동에 집중하세요." }
    ];
    const STOP_STEPS = [
      {
        title: "S · 멈추기 (Stop)",
        detail: "감정에 압도되거나 충동적으로 반응하려는 순간임을 알아차리면, 그대로 멈추세요. 몸을, 특히 말과 표정을 그대로 멈추고 움직이지 않습니다. 감정에 이름을 붙여보세요. '지금 나는 ○○을 느끼고 있다.'",
        questions: ["지금 이 강한 감정을 촉발한 상황은 무엇인가요?", "나는 지금 어떤 기분인가요?", "내가 막으려는 충동적 반응은 무엇인가요?"]
      },
      {
        title: "T · 한 걸음 물러서기 (Take a step back)",
        detail: "상황에서 몸과 마음 모두 한 걸음 물러서세요. 잠시 자리를 벗어나거나 깊게 숨을 쉬는 것도 방법입니다. 즉각 결정해야 하는 상황은 생각보다 많지 않습니다.",
        questions: ["지금 상황에서 잠깐의 거리를 어떻게 만들 수 있을까요?", "무엇이 나를 더 안정된 상태로 느끼게 해줄까요?"]
      },
      {
        title: "O · 관찰하기 (Observe)",
        detail: "판단 없이 내 안과 주변에서 일어나는 일을 살펴보세요. 감정, 생각, 몸의 감각뿐 아니라 주변 사람들이 하는 말과 행동에도 주의를 기울입니다. 성급하게 결론 내리지 말고 관련된 사실을 먼저 모으세요. 떠오르는 생각은 '지금 이런 생각이 스쳐가고 있다'고만 알아차리세요. 생각은 사실이 아니라 마음이 만들어낸 하나의 사건일 뿐이며, 반드시 따라야 할 명령이 아닙니다.",
        questions: ["나는 정서적으로 무엇을 느끼고 있나요?", "어떤 신체 감각을 알아차리고 있나요?", "어떤 생각들이 마음속을 스쳐가고 있나요?", "이 생각이 '사실'이 아니라 '지금 떠오른 생각'이라고 말해보면 어떤가요?"]
      },
      {
        title: "P · 마음챙김으로 행동하기 (Proceed mindfully)",
        detail: "멈추고, 물러서고, 관찰하는 시간을 가진 뒤에는 충동적으로 반응하기보다 목표와 가치에 맞는 반응을 의식적으로 선택하세요.",
        questions: ["이 상황을 다루는 가장 효과적인 방법은 무엇일까요?", "내 목표와 가치에 맞는 반응은 무엇일까요?", "지금 나 자신을 돌보기 위해 무엇을 할 수 있을까요?"]
      }
    ];
    const TIPP_STEPS = [
      {
        title: "T · 온도 변화 (Temperature)",
        detail: "감정이 압도적일 때는 대개 심박수가 올라가 있습니다. 차가운 자극은 심박수를 낮추는 데 도움이 됩니다. 반대로 우울하거나 기운이 가라앉아 있을 때는 따뜻한 자극이 도움이 될 수 있습니다.",
        tips: ["찬물로 얼굴 씻기, 또는 얼음을 손이나 얼굴에 잠시 대기", "기운이 없을 땐 따뜻한 차를 마시거나 담요를 덮고 몸을 데우기"]
      },
      {
        title: "I · 강한 운동 (Intense Exercise)",
        detail: "강한 감정으로 몸에 쌓인 에너지를 움직임으로 소모하세요. 특별한 장비 없이 10~15분 정도면 충분합니다.",
        tips: ["빠르게 걷거나 가볍게 뛰기", "제자리에서 점핑잭이나 줄넘기", "음악을 틀고 잠깐 춤추기"]
      },
      {
        title: "P · 조절 호흡 (Paced Breathing)",
        detail: "날숨을 들숨보다 길게 하면 신체 각성이 가라앉습니다.",
        tips: ["코로 4초 들이마시고 입으로 6초 내쉬기를 1~2분 반복하기"]
      },
      {
        title: "P · 점진적 근육 이완 (Progressive Muscle Relaxation)",
        detail: "긴장된 근육을 부위별로 5초간 힘을 주었다가 풀어주며 이완합니다.",
        tips: ["어깨와 등 → 팔 → 배와 허리 → 엉덩이 → 허벅지 → 종아리 순서로 진행하기"]
      }
    ];
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const state = {
      view: "today",
      observeMode: "저녁",
      observeStep: 0,
      practiceStep: 0,
      practiceValue: "",
      behavior: "",
      behaviorAreas: [],
      problemDomain: "unknown",
      problemDomainTouched: false,
      problemAutofillTarget: "",
      problemAutofillValue: "",
      emotion: "",
      emotionCustom: "",
      body: [],
      bodyCustom: "",
      value: "",
      triggerPlaces: [],
      triggerPeople: [],
      triggerTimes: [],
      avoidanceTags: [],
      customDays: [],
      shareRange: 7,
      trendRange: 14,
      shareMode: "counselorDetail",
      data: { schemaVersion: APP_SCHEMA_VERSION, observations: [], practices: [], logs: [], predictions: [], dailyCheckins: [], csvInterop: { happiness: {} }, settings: { alias: "", behaviorAliases: {}, noRecordReminderTime: "20:00", safetyContacts: [], weeklyFocus: "", onboardingSeen: false } },
      lastActive: Date.now()
    };

    function todayISO() {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now - offset).toISOString().slice(0, 10);
    }
    function toCanonicalDate(value) {
      const text = String(value || "").trim();
      const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
      const loose = text.match(/^(\d{4})[./년\s-]+(\d{1,2})[./월\s-]+(\d{1,2})/);
      if (loose) return `${loose[1]}-${loose[2].padStart(2, "0")}-${loose[3].padStart(2, "0")}`;
      const parsed = new Date(text);
      return Number.isNaN(parsed.getTime()) ? "" : dateToISO(parsed);
    }
    function dateObj(iso) {
      const normalized = toCanonicalDate(iso);
      return normalized ? new Date(normalized + "T00:00:00") : new Date(NaN);
    }
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
    function isPlainObject(value) {
      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }
    function normalizeHappiness(value) {
      const source = isPlainObject(value) ? value : {};
      const result = {};
      HAPPINESS_FIELDS.forEach(key => {
        const score = source[key];
        if (Number.isInteger(score) && score >= 0 && score <= 100) result[key] = score;
      });
      return result;
    }
    function normalizePreservedPayload(value) {
      if (!isPlainObject(value)) return {};
      const result = { ...value };
      HAPPINESS_FIELDS.forEach(key => delete result[key]);
      return result;
    }
    function payloadForExport(record, knownPayload) {
      return { ...normalizePreservedPayload(record && record._payloadJson), ...knownPayload };
    }
    function happinessFromLastCsvRows(rows, payloadIndex) {
      const lastRow = rows[rows.length - 1] || [];
      try {
        return normalizeHappiness(JSON.parse(lastRow[payloadIndex] || "{}"));
      } catch {
        return {};
      }
    }
    function thoughtScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 전혀 떠오르지 않음",
        "1점: 거의 떠오르지 않음",
        "2점: 아주 살짝 스침",
        "3점: 약하게 떠오름",
        "4점: 떠오르지만 쉽게 흘려보냄",
        "5점: 보통 정도로 떠오름",
        "6점: 자주 떠오름",
        "7점: 꽤 강하게 떠오름",
        "8점: 강하게 사로잡힘",
        "9점: 매우 강하게 사로잡힘",
        "10점: 온통 그 생각뿐임"
      ][value];
    }
    function emotionScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 매우 안정됨",
        "1점: 안정됨",
        "2점: 약간의 동요",
        "3점: 가벼운 불편함",
        "4점: 불편함이 느껴짐",
        "5점: 보통 수준의 불편함",
        "6점: 꽤 불편함",
        "7점: 상당히 불편함",
        "8점: 매우 불편함",
        "9점: 극심하게 불편함",
        "10점: 감당하기 어려움"
      ][value];
    }
    function urgeScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 전혀 없음",
        "1점: 거의 없음",
        "2점: 아주 약간 있음",
        "3점: 약하게 있음",
        "4점: 있지만 참을 만함",
        "5점: 보통 정도",
        "6점: 꽤 하고 싶음",
        "7점: 상당히 하고 싶음",
        "8점: 매우 강함",
        "9점: 억누르기 어려움",
        "10점: 통제 불가능하다고 느껴짐"
      ][value];
    }
    function actionLevelText(score) {
      const value = clampNumber(score, 0, 5, 0);
      return [
        "0점: 전혀 하지 않음",
        "1점: 아주 살짝 함",
        "2점: 부분적으로 함",
        "3점: 절반 정도 함",
        "4점: 대부분 함 (즉시 점검이 필요한 수준)",
        "5점: 완전히 함 (멈추기 매우 어려웠음)"
      ][value];
    }
    function severityColor(percent) {
      const p = Math.max(0, Math.min(100, percent));
      const stops = p <= 50
        ? [[61, 125, 77], [193, 132, 47], p / 50]
        : [[193, 132, 47], [182, 74, 69], (p - 50) / 50];
      const [from, to, t] = stops;
      const mix = (a, b) => Math.round(a + (b - a) * t);
      return `rgb(${mix(from[0], to[0])}, ${mix(from[1], to[1])}, ${mix(from[2], to[2])})`;
    }
    function paintIntensitySlider(id) {
      const input = $("#" + id);
      if (!input) return;
      const min = Number(input.min) || 0;
      const max = Number(input.max) || 10;
      const value = Number(input.value) || 0;
      const percent = ((value - min) / (max - min)) * 100;
      const color = severityColor(percent);
      input.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, var(--surface-2) ${percent}%, var(--surface-2) 100%)`;
      const help = $("#" + id + "Help");
      if (!help) return;
      const textMap = {
        thoughtScore: thoughtScoreText,
        emotionScore: emotionScoreText,
        urgeScore: urgeScoreText,
        urgeInitialScore: urgeScoreText,
        urgeEndScore: urgeScoreText,
        actionLevel: actionLevelText
      };
      const textFn = textMap[id];
      if (textFn) help.textContent = textFn(value);
    }
    function paintAllIntensitySliders() {
      ["thoughtScore", "emotionScore", "urgeScore", "urgeInitialScore", "urgeEndScore", "actionLevel"].forEach(paintIntensitySlider);
    }
    function expansionColor(percent) {
      const p = Math.max(0, Math.min(100, percent));
      const from = [176, 190, 214];
      const to = [108, 74, 168];
      const t = p / 100;
      const mix = (a, b) => Math.round(a + (b - a) * t);
      return `rgb(${mix(from[0], to[0])}, ${mix(from[1], to[1])}, ${mix(from[2], to[2])})`;
    }
    function expansionScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 오늘은 완전히 좁아진 하루였음",
        "1점: 많이 좁아진 느낌",
        "2점: 다소 많이 좁아진 느낌",
        "3점: 조금 좁았던 느낌",
        "4점: 좁음과 넓음이 비슷했음",
        "5점: 보통",
        "6점: 조금씩 넓어지는 느낌이 들었음",
        "7점: 꽤 넓어지는 느낌이 들었음",
        "8점: 넓어지고 만족스러웠음",
        "9점: 많이 넓어지고 매우 만족스러웠음",
        "10점: 오늘 하루 삶이 크게 넓어지고 매우 만족스러웠음"
      ][value];
    }
    function paintExpansionSlider() {
      const input = $("#expansionScore");
      if (!input) return;
      const value = Number(input.value) || 0;
      const percent = (value / 10) * 100;
      const color = expansionColor(percent);
      input.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, var(--surface-2) ${percent}%, var(--surface-2) 100%)`;
      const help = $("#expansionScoreHelp");
      if (help) help.textContent = expansionScoreText(value);
    }
    function masteryScoreText(score) {
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
    function pleasureScoreText(score) {
      const value = clampNumber(score, 0, 10, 0);
      return [
        "0점: 전혀 즐겁지 않았음",
        "1점: 거의 즐겁지 않았음",
        "2점: 조금 즐거웠음",
        "3점: 약간 즐거웠음",
        "4점: 보통보다 조금 낮음",
        "5점: 보통 정도 즐거웠음",
        "6점: 보통보다 조금 즐거웠음",
        "7점: 꽤 즐거웠음",
        "8점: 많이 즐거웠음",
        "9점: 매우 즐거웠음",
        "10점: 기대 이상으로 즐거웠음"
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
    function optionalScore(value) {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.min(10, number)) : null;
    }
    function cleanDate(value, fallback = todayISO()) {
      const normalized = toCanonicalDate(value);
      if (!normalized) return fallback;
      const parsed = dateObj(normalized);
      return Number.isNaN(parsed.getTime()) ? fallback : normalized;
    }
    function cleanTimeList(value) {
      return String(value || "")
        .split(",")
        .map(item => item.trim())
        .filter(item => /^([01]\d|2[0-3]):[0-5]\d$/.test(item))
        .slice(0, 6)
        .join(", ");
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
    function recordDate(record) {
      return toCanonicalDate(record?.date);
    }
    function sameRecordDate(record, day) {
      return recordDate(record) === day;
    }
    function normalizeObservation(record) {
      const body = Array.isArray(record.body) ? record.body.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const behaviorAreas = Array.isArray(record.behaviorAreas) ? record.behaviorAreas.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const behaviorCustomAreas = Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const problemLabels = Array.isArray(record.problemLabels) ? record.problemLabels.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : behaviorAreas;
      const triggerPlacesValue = Array.isArray(record.triggerPlaces) ? record.triggerPlaces.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const triggerPeopleValue = Array.isArray(record.triggerPeople) ? record.triggerPeople.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const triggerTimesValue = Array.isArray(record.triggerTimes) ? record.triggerTimes.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const triggerCustomValue = Array.isArray(record.triggerCustom) ? record.triggerCustom.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const avoidanceTagsValue = Array.isArray(record.avoidanceTags) ? record.avoidanceTags.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      const avoidanceCustomValue = Array.isArray(record.avoidanceCustom) ? record.avoidanceCustom.map(item => cleanText(item, TEXT_LIMITS.short)).filter(Boolean).slice(0, 8) : [];
      return {
        ...record,
        _payloadJson: normalizePreservedPayload(record._payloadJson),
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        date: cleanDate(record.date),
        mode: cleanText(record.mode, TEXT_LIMITS.short) || "저녁",
        behavior: cleanText(record.behavior, TEXT_LIMITS.medium),
        problemLabels,
        problemDomain: normalizeProblemDomain(record.problemDomain || defaultProblemDomainForLabels(problemLabels)),
        behaviorAreas: behaviorAreas.length ? behaviorAreas : problemLabels,
        behaviorCustomAreas,
        situation: cleanMultiline(record.situation, TEXT_LIMITS.long),
        triggerPlaces: triggerPlacesValue,
        triggerPeople: triggerPeopleValue,
        triggerTimes: triggerTimesValue,
        triggerCustom: triggerCustomValue,
        thoughtText: cleanMultiline(record.thoughtText, TEXT_LIMITS.long),
        emotion: cleanText(record.emotion, TEXT_LIMITS.short),
        emotionCustom: cleanText(record.emotionCustom, 10),
        body,
        bodyCustom: cleanText(record.bodyCustom, 10),
        avoidanceTags: avoidanceTagsValue,
        avoidanceCustom: avoidanceCustomValue,
        thoughtScore: clampNumber(record.thoughtScore, 0, 10, 0),
        emotionScore: clampNumber(record.emotionScore, 0, 10, 0),
        urgeScore: clampNumber(record.urgeScore, 0, 10, 0),
        urgeInitialScore: optionalScore(record.urgeInitialScore),
        urgeEndScore: optionalScore(record.urgeEndScore),
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
        _payloadJson: normalizePreservedPayload(record._payloadJson),
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
      const legacyScore = clampNumber(record.score, 0, 10, 0);
      const pleasureScore = clampNumber(record.pleasureScore, 0, 10, legacyScore);
      const masteryScore = clampNumber(record.masteryScore, 0, 10, legacyScore);
      return {
        ...record,
        _payloadJson: normalizePreservedPayload(record._payloadJson),
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        practiceId: cleanText(record.practiceId, TEXT_LIMITS.medium),
        date: cleanDate(record.date),
        pleasureScore,
        masteryScore,
        score: Math.round((pleasureScore + masteryScore) / 2),
        expectedPleasureScore: optionalScore(record.expectedPleasureScore),
        expectedMasteryScore: optionalScore(record.expectedMasteryScore),
        note: cleanMultiline(record.note, TEXT_LIMITS.long),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    const PREDICTION_STATUSES = ["pending", "occurred", "partial", "did_not_occur"];
    function normalizePrediction(record) {
      return {
        _payloadJson: normalizePreservedPayload(record._payloadJson),
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        date: cleanDate(record.date),
        relatedObservationId: cleanText(record.relatedObservationId, TEXT_LIMITS.medium),
        worryText: cleanMultiline(record.worryText, TEXT_LIMITS.long),
        predictedSeverity: clampNumber(record.predictedSeverity, 0, 10, 5),
        status: PREDICTION_STATUSES.includes(record.status) ? record.status : "pending",
        actualSeverity: optionalScore(record.actualSeverity),
        resolvedAt: record.resolvedAt || "",
        note: cleanMultiline(record.note, TEXT_LIMITS.medium),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    function normalizeDailyCheckin(record) {
      return {
        _payloadJson: normalizePreservedPayload(record._payloadJson),
        id: cleanText(record.id, TEXT_LIMITS.medium) || uid(),
        date: cleanDate(record.date),
        expansionScore: clampNumber(record.expansionScore, 0, 10, 5),
        note: cleanMultiline(record.note, TEXT_LIMITS.medium),
        archived: boolFlag(record.archived),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    }
    function normalizeBehaviorAliases(value) {
      const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
      const result = {};
      Object.entries(source).slice(0, 30).forEach(([key, alias]) => {
        const cleanKey = cleanText(key, TEXT_LIMITS.short);
        const cleanAlias = cleanText(alias, TEXT_LIMITS.short);
        if (cleanKey && cleanAlias) result[cleanKey] = cleanAlias;
      });
      return result;
    }
    function cleanPhone(value) {
      return String(value ?? "").replace(/[^0-9+\-() ]/g, "").trim().slice(0, 20);
    }
    function normalizeSafetyContacts(value) {
      const source = Array.isArray(value) ? value : [];
      const result = source.slice(0, 2).map(entry => ({
        name: cleanText(entry && entry.name, 20),
        phone: cleanPhone(entry && entry.phone)
      })).filter(entry => entry.name || entry.phone);
      return result;
    }
    function normalizeData(data) {
      const settings = data.settings || {};
      const csvInterop = isPlainObject(data.csvInterop) ? data.csvInterop : {};
      const fallback = isPlainObject(csvInterop.fallbackRecord) ? csvInterop.fallbackRecord : null;
      return {
        schemaVersion: APP_SCHEMA_VERSION,
        observations: Array.isArray(data.observations) ? data.observations.map(normalizeObservation) : [],
        practices: Array.isArray(data.practices) ? data.practices.map(normalizePractice) : [],
        logs: Array.isArray(data.logs) ? data.logs.map(normalizeLog) : [],
        predictions: Array.isArray(data.predictions) ? data.predictions.map(normalizePrediction) : [],
        dailyCheckins: Array.isArray(data.dailyCheckins) ? data.dailyCheckins.map(normalizeDailyCheckin) : [],
        csvInterop: {
          happiness: normalizeHappiness(csvInterop.happiness),
          fallbackRecord: fallback && CSV_RECORD_TYPES.includes(fallback.recordType) && fallback.id ? {
            recordType: fallback.recordType,
            id: cleanText(fallback.id, TEXT_LIMITS.medium),
            date: fallback.recordType === "practice_definition" ? "" : cleanDate(fallback.date),
            updatedAt: fallback.updatedAt || new Date().toISOString(),
            payload: normalizePreservedPayload(fallback.payload)
          } : null
        },
        settings: {
          alias: cleanText(settings.alias, TEXT_LIMITS.short),
          behaviorAliases: normalizeBehaviorAliases(settings.behaviorAliases),
          noRecordReminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.noRecordReminderTime || "") ? settings.noRecordReminderTime : "20:00",
          lastBackupAt: settings.lastBackupAt || "",
          safetyContacts: normalizeSafetyContacts(settings.safetyContacts),
          weeklyFocus: cleanMultiline(settings.weeklyFocus, TEXT_LIMITS.medium),
          onboardingSeen: Boolean(settings.onboardingSeen)
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
        state.data = { schemaVersion: APP_SCHEMA_VERSION, observations: [], practices: [], logs: [], predictions: [], dailyCheckins: [], csvInterop: { happiness: {} }, settings: { alias: "", noRecordReminderTime: "20:00", safetyContacts: [], weeklyFocus: "", onboardingSeen: false } };
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
    }
    function setObserveMode(mode) {
      state.observeMode = mode;
      $$("#observeModeButtons button").forEach(button => {
        button.classList.toggle("active", button.dataset.value === mode);
      });
      const curveBox = $("#urgeCurveBox");
      if (curveBox) curveBox.classList.toggle("hidden", mode !== "감정/충동 발생 시점");
    }
    function safetyContactsHtml() {
      const personal = state.data.settings.safetyContacts || [];
      const personalHtml = personal.length
        ? personal.map(c => `<p class="small">${escapeHtml(c.name || "비상 연락처")}: <a href="tel:${escapeHtml(c.phone.replace(/[^0-9+]/g, ""))}">${escapeHtml(c.phone)}</a></p>`).join("")
        : `<p class="small">보호하기 화면에서 나의 비상 연락처를 미리 등록해두면 여기에 표시됩니다.</p>`;
      return `
        <div class="small" style="font-weight:800;">위기 상담 (전국, 24시간)</div>
        <p class="small">자살예방상담전화 <a href="tel:1393">1393</a> · 정신건강 위기상담전화 <a href="tel:15770199">1577-0199</a> · 응급 <a href="tel:119">119</a></p>
        ${personal.length ? `<div class="small" style="font-weight:800; margin-top:6px;">나의 비상 연락처</div>` : ""}
        ${personalHtml}
      `;
    }
    function renderSafetyContactsInline() {
      const box1 = $("#safetyContactsInline");
      const box2 = $("#safetyContactsInlineRisk");
      const box3 = $("#safetyContactsInlineRelapse");
      const html = safetyContactsHtml();
      if (box1) box1.innerHTML = html;
      if (box2) box2.innerHTML = html;
      if (box3) box3.innerHTML = html;
    }
    function showRiskFollowup(show = true) {
      const box = $("#riskFollowup");
      if (!box) return;
      box.classList.toggle("hidden", !show);
      if (show) box.querySelectorAll("input[type='checkbox']").forEach(input => input.checked = false);
    }
    function createWizardController(config) {
      return {
        render() {
          const step = state[config.stepKey];
          $$(`#${config.formId} .wizard-step`).forEach(panel => panel.classList.toggle("active", Number(panel.dataset.step) === step));
          $$(`#${config.dotsId} .wizard-dot`).forEach((dot, i) => {
            dot.classList.toggle("done", i < step);
            dot.classList.toggle("current", i === step);
          });
          const titleBox = $(`#${config.titleId}`);
          const labelBox = $(`#${config.labelId}`);
          if (titleBox) titleBox.textContent = config.titles[step];
          if (labelBox) labelBox.textContent = config.labels[step];
          const backBtn = $(`#${config.backId}`);
          const nextBtn = $(`#${config.nextId}`);
          const saveBtn = $(`#${config.saveId}`);
          if (backBtn) backBtn.classList.toggle("hidden", step === 0);
          const isLastStep = step === config.titles.length - 1;
          if (nextBtn) nextBtn.classList.toggle("hidden", isLastStep);
          if (saveBtn) saveBtn.classList.toggle("hidden", !isLastStep);
          (config.lastStepOnlyIds || []).forEach(id => {
            const el = $("#" + id);
            if (el) el.classList.toggle("hidden", !isLastStep);
          });
        },
        go(delta) {
          const next = state[config.stepKey] + delta;
          if (next < 0 || next > config.titles.length - 1) return;
          state[config.stepKey] = next;
          this.render();
          const form = $(`#${config.formId}`);
          if (form && form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
    }
    const OBSERVE_STEP_TITLES = ["1 · 경험한 문제와 상황", "2 · 마음 관찰", "3 · 강도 기록", "4 · 대처와 성찰"];
    const OBSERVE_STEP_LABELS = [
      "1단계 / 4단계 · 30초면 충분합니다",
      "2단계 / 4단계 · 해당하는 것만 눌러주세요",
      "3단계 / 4단계 · 강도만 옮기면 됩니다",
      "4단계 / 4단계 · 여기부터는 전부 선택입니다"
    ];
    const observeWizard = createWizardController({
      formId: "observeForm", dotsId: "observeStepDots", titleId: "observeStepTitle", labelId: "observeStepLabel",
      backId: "observeStepBack", nextId: "observeStepNext", saveId: "observeStepSave", stepKey: "observeStep",
      titles: OBSERVE_STEP_TITLES, labels: OBSERVE_STEP_LABELS,
      lastStepOnlyIds: []
    });
    function renderObserveStep() { observeWizard.render(); }
    function goObserveStep(delta) { observeWizard.go(delta); }
    const PRACTICE_STEP_TITLES = ["1 · 가치와 실천행동", "2 · 빈도와 알림", "3 · 시작일과 대비책"];
    const PRACTICE_STEP_LABELS = [
      "1단계 / 3단계 · 무엇을, 어떤 가치로",
      "2단계 / 3단계 · 얼마나 자주 할지 정해요",
      "3단계 / 3단계 · 시작일과 최소 버전"
    ];
    const practiceWizard = createWizardController({
      formId: "practiceForm", dotsId: "practiceStepDots", titleId: "practiceStepTitle", labelId: "practiceStepLabel",
      backId: "practiceStepBack", nextId: "practiceStepNext", saveId: "practiceStepSave", stepKey: "practiceStep",
      titles: PRACTICE_STEP_TITLES, labels: PRACTICE_STEP_LABELS,
      lastStepOnlyIds: []
    });
    function renderPracticeStep() { practiceWizard.render(); }
    function goPracticeStep(delta) { practiceWizard.go(delta); }
    function startQuickObservation(kind = "observe") {
      setView("observe");
      $("#observeDate").value = todayISO();
      state.observeStep = 0;
      renderObserveStep();
      if (kind === "risk") {
        setObserveMode("감정/충동 발생 시점");
        $("#urgeScore").value = 8;
        $("#urgeScoreValue").textContent = "8";
        paintIntensitySlider("urgeScore");
        showRiskFollowup(true);
        const riskBox = $("#riskFollowup");
        if (riskBox && riskBox.scrollIntoView) riskBox.scrollIntoView({ behavior: "smooth", block: "center" });
        showToast("고위험 신호를 짧게 남기고, 먼저 안전한 곳으로 이동하세요.");
        return;
      }
      setObserveMode("저녁");
      showRiskFollowup(false);
      $("#situation").focus();
      showToast("지금의 상황, 감정, 몸 반응만 짧게 적어도 충분합니다.");
    }
    function applyChipVisibility(box, maxVisible) {
      if (!box || !maxVisible) return;
      const chips = Array.from(box.querySelectorAll(".chip"));
      const isSelected = chip => chip.classList.contains("active") || Boolean(chip.querySelector("input:checked"));
      const toCollapse = chips.filter((chip, i) => i >= maxVisible && !isSelected(chip));
      if (!toCollapse.length) return;
      toCollapse.forEach(chip => chip.classList.add("chip-collapsed"));
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "chip-more";
      moreBtn.textContent = `+ 더보기 (${toCollapse.length})`;
      moreBtn.setAttribute("aria-expanded", "false");
      moreBtn.setAttribute("aria-label", `숨겨진 항목 ${toCollapse.length}개 더보기`);
      moreBtn.addEventListener("click", () => {
        toCollapse.forEach(chip => chip.classList.remove("chip-collapsed"));
        moreBtn.remove();
      });
      box.appendChild(moreBtn);
    }
    function setChipGroup(containerId, items, key, activeValue = "", maxVisible = 0) {
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
        if (!button || !button.classList.contains("chip")) return;
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
      applyChipVisibility(box, maxVisible);
    }
    function setMultiChipGroup(containerId, items, stateKey) {
      const oldBox = $(containerId);
      const freshBox = oldBox.cloneNode(false);
      oldBox.replaceWith(freshBox);
      const box = $(containerId);
      const selected = new Set(state[stateKey] || []);
      box.innerHTML = items.map(item => `<button type="button" class="chip ${selected.has(item) ? "active" : ""}" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("");
      box.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !button.classList.contains("chip")) return;
        button.classList.toggle("active");
        const value = button.dataset.value;
        const list = state[stateKey] || [];
        state[stateKey] = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
      });
    }
    function learnedCustomBehaviorAreas() {
      const seen = new Set();
      const ordered = [];
      const sorted = activeObservations().slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      sorted.forEach(o => {
        const customValues = Array.isArray(o.behaviorCustomAreas) ? o.behaviorCustomAreas : [];
        customValues.forEach(value => {
          if (value && !defaultBehaviors.includes(value) && !seen.has(value)) {
            seen.add(value);
            ordered.push(value);
          }
        });
      });
      return ordered;
    }
    function normalizeProblemDomain(value) {
      const text = String(value || "").trim();
      return problemDomains.some(item => item.value === text) ? text : "unknown";
    }
    function defaultProblemDomainForLabel(label) {
      const text = String(label || "").trim();
      const map = {
        "도박": "urge",
        "성(sex)": "urge",
        "스트레스": "emotion",
        "심심함": "emotion",
        "분노/짜증": "emotion",
        "불안/걱정": "thought",
        "외로움/공허함": "emotion",
        "회피/무기력": "behavior"
      };
      return map[text] || "unknown";
    }
    function defaultProblemDomainForLabels(labels) {
      const list = Array.isArray(labels) ? labels : [];
      const found = list.map(defaultProblemDomainForLabel).find(value => value !== "unknown");
      return found || "unknown";
    }
    function problemLabelsFromRecord(record) {
      if (Array.isArray(record.problemLabels) && record.problemLabels.length) return record.problemLabels;
      return behaviorAreasFromRecord(record);
    }
    function selectedProblemLabels() {
      return selectedBehaviorAreas();
    }
    function setProblemDomainGroup() {
      const oldBox = $("#problemDomainChips");
      if (!oldBox) return;
      const freshBox = oldBox.cloneNode(false);
      oldBox.replaceWith(freshBox);
      const box = $("#problemDomainChips");
      const active = normalizeProblemDomain(state.problemDomain || defaultProblemDomainForLabels(state.behaviorAreas));
      box.innerHTML = problemDomains.map(item => `<button type="button" class="chip ${item.value === active ? "active" : ""}" data-value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button>`).join("");
      box.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !button.classList.contains("chip")) return;
        state.problemDomain = normalizeProblemDomain(button.dataset.value);
        state.problemDomainTouched = true;
        $$("#problemDomainChips button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        applyProblemAutofill();
      });
    }
    function updateProblemDomainFromLabels() {
      if (state.problemDomainTouched) return;
      const next = defaultProblemDomainForLabels(selectedProblemLabels());
      state.problemDomain = next;
      setProblemDomainGroup();
    }
    function canReplaceAutoFilled(selector) {
      const el = $(selector);
      if (!el) return false;
      const current = String(el.value || "");
      return !current.trim() || (state.problemAutofillTarget === selector && current === state.problemAutofillValue);
    }
    function setAutofillGuide(text) {
      const guide = $("#problemAutofillGuide");
      if (guide) guide.textContent = text;
    }
    function markAutofill(selector, value) {
      state.problemAutofillTarget = selector;
      state.problemAutofillValue = value;
    }
    function syncEmotionChipSelection() {
      $$("#emotionChips button").forEach(button => {
        button.classList.toggle("active", button.dataset.value === state.emotion);
      });
    }
    function applyProblemAutofill() {
      const labels = selectedProblemLabels();
      const text = labels.join(", ");
      const domain = normalizeProblemDomain(state.problemDomain || defaultProblemDomainForLabels(labels));
      if (!text) {
        setAutofillGuide("선택한 문제에 따라 가까운 중심을 먼저 표시합니다. 지금 경험에 더 맞게 바꿔도 됩니다.");
        return;
      }
      if (domain === "thought" && canReplaceAutoFilled("#thoughtText")) {
        $("#thoughtText").value = text;
        markAutofill("#thoughtText", text);
        setAutofillGuide("앞에서 적은 문제가 생각에 가까워 보여, '그때 든 생각'에 먼저 넣어두었습니다. 더 정확한 표현이 있으면 바꿔도 됩니다.");
        return;
      }
      if (domain === "emotion") {
        if (emotions.includes(text) && (!state.emotion || state.problemAutofillTarget === "emotion")) {
          state.emotion = text;
          markAutofill("emotion", text);
          syncEmotionChipSelection();
          setAutofillGuide("앞에서 적은 문제가 감정에 가까워 보여, '그때 느낀 감정'에 먼저 반영했습니다. 더 정확한 감정으로 바꿔도 됩니다.");
          return;
        }
        if (canReplaceAutoFilled("#emotionCustom")) {
          $("#emotionCustom").value = cleanText(text, 10);
          markAutofill("#emotionCustom", $("#emotionCustom").value);
          setAutofillGuide("앞에서 적은 문제가 감정에 가까워 보여, '그때 느낀 감정'에 먼저 넣어두었습니다. 더 정확한 감정으로 바꿔도 됩니다.");
          return;
        }
      }
      if (domain === "body" && canReplaceAutoFilled("#bodyCustom")) {
        $("#bodyCustom").value = cleanText(text, 10);
        markAutofill("#bodyCustom", $("#bodyCustom").value);
        setAutofillGuide("앞에서 적은 문제가 몸반응에 가까워 보여, '그때 느낀 몸 반응'에 먼저 넣어두었습니다. 더 정확한 표현이 있으면 바꿔도 됩니다.");
        return;
      }
      if (domain === "relationship" && canReplaceAutoFilled("#situation")) {
        $("#situation").value = text;
        markAutofill("#situation", text);
        setAutofillGuide("앞에서 적은 문제가 관계나 상황에 가까워 보여, '이 문제가 발생한 구체적 상황?'에 먼저 넣어두었습니다. 더 구체적인 장면으로 바꿔도 됩니다.");
        return;
      }
      if (domain === "urge") {
        setAutofillGuide("도박이나 성(sex)처럼 충동에 가까운 문제는 아래 강도 기록에서 충동 점수를 남기면 좋습니다. 실제 행동 여부는 문제행동수준에서 따로 기록합니다.");
        return;
      }
      if (domain === "behavior") {
        setAutofillGuide("행동에 가까운 문제라도 실제로 행동했는지는 아래 문제행동수준에서 따로 기록합니다.");
        return;
      }
      setAutofillGuide("지금 경험에 더 가까운 중심을 고르면, 해당 기록칸에 앞의 내용을 먼저 넣어둘 수 있습니다.");
    }
    function setBehaviorGroup(items, maxVisible = 0) {
      const oldBox = $("#behaviorChips");
      const freshBox = oldBox.cloneNode(false);
      oldBox.replaceWith(freshBox);
      const box = $("#behaviorChips");
      const selected = new Set(state.behaviorAreas || []);
      box.innerHTML = items.map(item => `
        <label class="chip ${selected.has(item) ? "active" : ""}">
          <input type="checkbox" value="${escapeHtml(item)}" ${selected.has(item) ? "checked" : ""}>
          ${escapeHtml(displayBehaviorLabel(item))}
        </label>
      `).join("");
      box.addEventListener("change", () => {
        state.behaviorAreas = $$("#behaviorChips input[type='checkbox']:checked").map(input => input.value);
        $$("#behaviorChips .chip").forEach(label => {
          const input = label.querySelector("input");
          label.classList.toggle("active", Boolean(input && input.checked));
        });
        updateProblemDomainFromLabels();
        applyProblemAutofill();
      });
      applyChipVisibility(box, maxVisible);
    }
    function initPickers() {
      const learnedBehaviors = learnedCustomBehaviorAreas();
      setBehaviorGroup([...learnedBehaviors, ...defaultBehaviors], learnedBehaviors.length + 6);
      const customInput = $("#behaviorCustom");
      if (customInput) {
        customInput.oninput = () => {
          updateProblemDomainFromLabels();
          applyProblemAutofill();
        };
      }
      setProblemDomainGroup();
      renderAliasTargetOptions();
      renderAliasList();
      setChipGroup("#emotionChips", emotions, "emotion", state.emotion, 6);
      setChipGroup("#bodyChips", bodies, "body", "", 6);
      renderPracticeValueChips();
      setMultiChipGroup("#triggerPlaceChips", triggerPlaces, "triggerPlaces");
      setMultiChipGroup("#triggerPeopleChips", triggerPeople, "triggerPeople");
      setMultiChipGroup("#triggerTimeChips", triggerTimes, "triggerTimes");
      setMultiChipGroup("#avoidanceChips", avoidanceTags, "avoidanceTags");
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
    function renderAliasTargetOptions() {
      const select = $("#aliasTarget");
      if (!select) return;
      const previous = select.value;
      select.innerHTML = defaultBehaviors.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
      if (previous && defaultBehaviors.includes(previous)) select.value = previous;
      const map = behaviorAliasMap();
      const input = $("#aliasInput");
      if (input && document.activeElement !== input) input.value = map[select.value] || "";
    }
    function renderAliasList() {
      const box = $("#aliasList");
      if (!box) return;
      const entries = Object.entries(behaviorAliasMap());
      box.textContent = entries.length
        ? `현재 별칭: ${entries.map(([original, alias]) => `${original} → ${alias}`).join(", ")}`
        : "설정된 별칭이 없습니다. 항목은 원래 이름 그대로 화면에 표시됩니다.";
    }
    function bindSliders() {
      const intensityIds = new Set(["thoughtScore", "emotionScore", "urgeScore", "urgeInitialScore", "urgeEndScore", "actionLevel"]);
      [["thoughtScore", "thoughtScoreValue"], ["emotionScore", "emotionScoreValue"], ["urgeScore", "urgeScoreValue"], ["urgeInitialScore", "urgeInitialScoreValue"], ["urgeEndScore", "urgeEndScoreValue"], ["actionLevel", "actionLevelValue"], ["copingScore", "copingScoreValue"], ["predictedSeverity", "predictedSeverityValue"]].forEach(([input, label]) => {
        $("#" + input).addEventListener("input", () => {
          $("#" + label).textContent = $("#" + input).value;
          if (intensityIds.has(input)) paintIntensitySlider(input);
        });
      });
      paintAllIntensitySliders();
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
    function activePredictions() { return (state.data.predictions || []).filter(record => !record.archived); }
    function activeDailyCheckins() { return (state.data.dailyCheckins || []).filter(record => !record.archived); }
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
    function behaviorAliasMap() {
      return state.data.settings.behaviorAliases || {};
    }
    function displayBehaviorLabel(original) {
      const map = behaviorAliasMap();
      return map[original] || original;
    }
    function displayBehaviorList(list) {
      return (Array.isArray(list) ? list : []).map(displayBehaviorLabel);
    }
    function behaviorAreaText(record) {
      const areas = behaviorAreasFromRecord(record);
      return areas.length ? displayBehaviorList(areas).join(", ") : "-";
    }
    function behaviorCustomText(record) {
      return Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.join(", ") : "";
    }
    function targetCount(practice) {
      return Math.max(1, Math.min(12, Number(practice.targetCount || 1) || 1));
    }
    function logsFor(practiceId, iso) {
      return activeLogs()
        .filter(l => l.practiceId === practiceId && sameRecordDate(l, iso))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
    function logFor(practiceId, iso) { return logsFor(practiceId, iso)[0]; }
    function recentObservations(days = 7) { return activeObservations().filter(o => dateObj(recordDate(o)) >= daysAgo(days - 1)); }
    function recentLogs(days = 7) { return activeLogs().filter(l => dateObj(recordDate(l)) >= daysAgo(days - 1)); }
    const TREND_DISPLAY_CAP = 60; // 이동평균/일별 상세 막대는 이 일수까지만 그려서 목록이 지나치게 길어지지 않게 합니다.
    function earliestRecordDaysAgo() {
      const all = [...activeObservations(), ...activeLogs(), ...activePredictions()];
      if (!all.length) return 14;
      const earliest = all.reduce((min, r) => {
        const d = recordDate(r);
        return !min || d < min ? d : min;
      }, null);
      const diffDays = Math.floor((dateObj(todayISO()) - dateObj(earliest)) / 86400000) + 1;
      return Math.min(3650, Math.max(1, diffDays));
    }
    function trendRangeDays() {
      return state.trendRange === "all" ? earliestRecordDaysAgo() : Number(state.trendRange);
    }
    function trendRangeLabel() {
      if (state.trendRange === "all") return "전체";
      const n = Number(state.trendRange);
      if (n === 7) return "최근 7일";
      if (n === 14) return "최근 14일";
      if (n === 28) return "최근 4주";
      return `최근 ${n}일`;
    }
    function avg(items, getter) { return items.length ? items.reduce((sum, item) => sum + getter(item), 0) / items.length : 0; }
    function stdDev(values) {
      if (values.length < 2) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    }
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

    function relapseRecentObservations(days = RELAPSE_WINDOW_DAYS) {
      return activeObservations().filter(o => dateObj(recordDate(o)) >= daysAgo(days - 1));
    }
    function relapseCompareObservations() {
      const start = daysAgo(RELAPSE_WINDOW_DAYS + RELAPSE_COMPARE_DAYS - 1);
      const end = daysAgo(RELAPSE_WINDOW_DAYS);
      return activeObservations().filter(o => {
        const d = dateObj(recordDate(o));
        return d >= start && d < end;
      });
    }
    // 최근 며칠(기본 3일)의 평균/추세를 보는 "지금 상태" 판단. 오늘 화면과 관찰 기록 직후 안내에 사용합니다.
    function computeRelapseSignal() {
      const recent = relapseRecentObservations();
      const result = {
        hasData: recent.length > 0,
        stage1: false, stage2: false, stage3: false, stage3Severe: false,
        avgEmotion: 0, avgThought: 0, avgUrge: 0, avgCoping: 0, emotionStdDev: 0,
        behavioralDays: [],
        reasons: { stage1: [], stage2: [], stage3: [] }
      };
      if (!recent.length) return result;
      const compare = relapseCompareObservations();
      const avgEmotion = avg(recent, o => Number(o.emotionScore));
      const avgThought = avg(recent, o => Number(o.thoughtScore));
      const avgUrge = avg(recent, o => Number(o.urgeScore));
      const avgCoping = avg(recent, o => Number(o.copingScore));
      const emotionStdDev = stdDev(recent.map(o => Number(o.emotionScore)));
      result.avgEmotion = avgEmotion; result.avgThought = avgThought; result.avgUrge = avgUrge; result.avgCoping = avgCoping;
      result.emotionStdDev = emotionStdDev;

      const highEmotionCount = recent.filter(o => Number(o.emotionScore) >= RELAPSE_EMOTION_HIGH).length;
      const compareAvgEmotion = compare.length ? avg(compare, o => Number(o.emotionScore)) : null;
      const compareAvgCoping = compare.length ? avg(compare, o => Number(o.copingScore)) : null;
      const emotionRising = compareAvgEmotion !== null && (avgEmotion - compareAvgEmotion) >= RELAPSE_EMOTION_TREND_RISE;
      const copingDropping = compareAvgCoping !== null && (compareAvgCoping - avgCoping) >= RELAPSE_COPING_TREND_DROP;
      const copingLow = avgCoping <= RELAPSE_COPING_LOW && recent.length >= 2;
      const emotionUnstable = recent.length >= 3 && emotionStdDev >= RELAPSE_EMOTION_VARIABILITY_HIGH;

      if (avgEmotion >= RELAPSE_EMOTION_HIGH) result.reasons.stage1.push(`최근 ${recent.length}일 평균 그때 느낀 감정 ${avgEmotion.toFixed(1)}/10`);
      if (highEmotionCount >= 2) result.reasons.stage1.push(`그때 느낀 감정 ${RELAPSE_EMOTION_HIGH}점 이상 기록 ${highEmotionCount}회`);
      if (emotionRising) result.reasons.stage1.push("최근 감정 강도가 이전보다 높아지는 추세");
      if (copingDropping) result.reasons.stage1.push("대처 후 도움 정도가 이전보다 낮아지는 추세");
      if (copingLow) result.reasons.stage1.push("대처 후 도움 정도가 낮게 유지됨");
      if (emotionUnstable) result.reasons.stage1.push(`감정 기복이 큼 (최근 ${recent.length}일 표준편차 ${emotionStdDev.toFixed(1)})`);
      result.stage1 = result.reasons.stage1.length > 0;

      const highThoughtCount = recent.filter(o => Number(o.thoughtScore) >= RELAPSE_THOUGHT_HIGH).length;
      const thinkingWithoutActing = recent.filter(o => Number(o.urgeScore) >= RELAPSE_URGE_HIGH && Number(o.actionLevel) === 0).length;
      if (avgThought >= RELAPSE_THOUGHT_HIGH) result.reasons.stage2.push(`최근 ${recent.length}일 평균 그때 든 생각 ${avgThought.toFixed(1)}/10`);
      if (highThoughtCount >= 2) result.reasons.stage2.push(`그때 든 생각 ${RELAPSE_THOUGHT_HIGH}점 이상 기록 ${highThoughtCount}회`);
      if (thinkingWithoutActing >= 2) result.reasons.stage2.push(`충동은 높지만(${RELAPSE_URGE_HIGH}점 이상) 아직 멈춘 상태로 기록된 경우 ${thinkingWithoutActing}회`);
      if (avgUrge >= RELAPSE_URGE_HIGH) result.reasons.stage2.push(`최근 평균 충동 ${avgUrge.toFixed(1)}/10`);
      result.stage2 = result.reasons.stage2.length > 0;

      const behavioralEvents = recent.filter(o => Number(o.actionLevel) >= RELAPSE_ACTION_ANY);
      result.behavioralDays = behavioralEvents.map(o => recordDate(o));
      result.stage3 = behavioralEvents.length > 0;
      result.stage3Severe = recent.some(o => Number(o.actionLevel) >= RELAPSE_ACTION_SEVERE);
      if (result.stage3) result.reasons.stage3.push(`최근 ${recent.length}일 중 문제행동 활성화 수준 ${RELAPSE_ACTION_ANY}점 이상 기록 ${behavioralEvents.length}회`);
      return result;
    }
    // 하루 단위 판정. 추세보기와 상담자 요약처럼 기간 전체를 되짚어 볼 때 사용합니다.
    function classifyDayRelapseStage(dayObservations) {
      if (!dayObservations.length) return { stage1: false, stage2: false, stage3: false, stage3Severe: false };
      const emotionScore = avg(dayObservations, o => Number(o.emotionScore));
      const thoughtScore = avg(dayObservations, o => Number(o.thoughtScore));
      const urgeScore = avg(dayObservations, o => Number(o.urgeScore));
      const copingScore = avg(dayObservations, o => Number(o.copingScore));
      const actionMax = Math.max(...dayObservations.map(o => Number(o.actionLevel)));
      return {
        stage1: emotionScore >= RELAPSE_EMOTION_HIGH || copingScore <= RELAPSE_COPING_LOW,
        stage2: thoughtScore >= RELAPSE_THOUGHT_HIGH || urgeScore >= RELAPSE_URGE_HIGH,
        stage3: actionMax >= RELAPSE_ACTION_ANY,
        stage3Severe: actionMax >= RELAPSE_ACTION_SEVERE
      };
    }
    function relapseSummaryForRange(observations) {
      const byDate = {};
      observations.forEach(o => { (byDate[o.date] ||= []).push(o); });
      let stage1Days = 0, stage2Days = 0, stage3Days = 0, stage3SevereDays = 0;
      const stage3Dates = [];
      Object.entries(byDate).forEach(([date, list]) => {
        const c = classifyDayRelapseStage(list);
        if (c.stage1) stage1Days++;
        if (c.stage2) stage2Days++;
        if (c.stage3) { stage3Days++; stage3Dates.push(date); }
        if (c.stage3Severe) stage3SevereDays++;
      });
      return { stage1Days, stage2Days, stage3Days, stage3SevereDays, stage3Dates: stage3Dates.sort(), totalDays: Object.keys(byDate).length };
    }
    function relapseStageLabel(signal) {
      if (signal.stage3Severe) return { level: "danger", text: "행동적 재발 · 지금 확인" };
      if (signal.stage3) return { level: "danger", text: "행동적 재발 신호" };
      if (signal.stage1 && signal.stage2) return { level: "warn", text: "정서적·인지적 재발 신호" };
      if (signal.stage2) return { level: "warn", text: "인지적 재발 신호" };
      if (signal.stage1) return { level: "warn", text: "정서적 재발 신호" };
      return { level: "ok", text: "특별한 재발 신호 없음" };
    }
    function relapseLevelClass(level) {
      if (level === "danger") return "level-danger";
      if (level === "warn") return "level-warn";
      return "level-ok";
    }
    function techniqueCardsHtml(items) {
      return items.map(item => `
        <div class="technique-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p class="small">${escapeHtml(item.detail)}</p>
        </div>
      `).join("");
    }
    function stopTippCardsHtml(steps) {
      return steps.map(step => `
        <div class="technique-card">
          <h4>${escapeHtml(step.title)}</h4>
          <p class="small">${escapeHtml(step.detail)}</p>
          ${Array.isArray(step.questions) && step.questions.length ? `
            <div class="small" style="margin-top:6px;"><strong>스스로에게 물어볼 질문</strong></div>
            <ul style="margin:4px 0 0; padding-left:18px;">${step.questions.map(q => `<li class="small">${escapeHtml(q)}</li>`).join("")}</ul>
          ` : ""}
          ${Array.isArray(step.tips) && step.tips.length ? `
            <div class="small" style="margin-top:6px;"><strong>시도해볼 행동</strong></div>
            <ul style="margin:4px 0 0; padding-left:18px;">${step.tips.map(t => `<li class="small">${escapeHtml(t)}</li>`).join("")}</ul>
          ` : ""}
        </div>
      `).join("");
    }
    function relapseStatusCardHtml(signal, { compact = false } = {}) {
      if (!signal.hasData) {
        return `<div class="relapse-status level-ok"><h3>재발 신호</h3><p class="small">최근 ${RELAPSE_WINDOW_DAYS}일 동안의 관찰 기록이 아직 없습니다. 관찰을 기록하면 신호를 확인할 수 있습니다.</p></div>`;
      }
      const label = relapseStageLabel(signal);
      const reasons = [...signal.reasons.stage1, ...signal.reasons.stage2, ...signal.reasons.stage3];
      const reasonsHtml = reasons.length && !compact
        ? `<ul>${reasons.slice(0, 6).map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
        : (reasons.length && compact ? `<p class="small">${escapeHtml(reasons[0])}</p>` : "");
      const jumpButton = compact ? `<div style="margin-top:8px;"><button class="ghost-btn" type="button" data-jump="relapse">자세히 보고 지금 해볼 것 찾기</button></div>` : "";
      return `
        <div class="relapse-status ${relapseLevelClass(label.level)}">
          <h3>${escapeHtml(label.text)}</h3>
          <p class="small">최근 ${RELAPSE_WINDOW_DAYS}일 평균 · 감정 ${signal.avgEmotion.toFixed(1)} · 생각 ${signal.avgThought.toFixed(1)} · 충동 ${signal.avgUrge.toFixed(1)} · 대처 도움 ${signal.avgCoping.toFixed(1)} (10점 만점)</p>
          ${reasonsHtml}
          ${jumpButton}
        </div>
      `;
    }
    function renderRelapseToday() {
      const box = $("#relapseStatusCard");
      if (!box) return;
      box.innerHTML = relapseStatusCardHtml(computeRelapseSignal(), { compact: true });
      $$("#relapseStatusCard [data-jump]").forEach(b => b.addEventListener("click", () => setView(b.dataset.jump)));
    }
    function relapseRiskPercentages(signal) {
      const stage1Max = 6;
      const stage2Max = 4;
      const stage1Pct = signal.hasData ? Math.round(Math.min(100, (signal.reasons.stage1.length / stage1Max) * 100)) : 0;
      const stage2Pct = signal.hasData ? Math.round(Math.min(100, (signal.reasons.stage2.length / stage2Max) * 100)) : 0;
      const stage3Pct = signal.hasData ? Math.round(Math.min(100, (signal.behavioralDays.length / RELAPSE_WINDOW_DAYS) * 100)) : 0;
      return { stage1Pct, stage2Pct, stage3Pct };
    }
    function riskBarColor(percent) {
      if (percent >= 50) return "var(--danger)";
      if (percent > 0) return "var(--accent)";
      return "var(--good)";
    }
    function relapseRiskBarsHtml(signal) {
      const { stage1Pct, stage2Pct, stage3Pct } = relapseRiskPercentages(signal);
      const rows = [
        { label: "정서적 재발 위험", percent: stage1Pct },
        { label: "인지적 재발 위험", percent: stage2Pct },
        { label: "행동적 재발 위험", percent: stage3Pct }
      ];
      return `
        <h3>단계별 위험도</h3>
        <p class="small">최근 ${RELAPSE_WINDOW_DAYS}일 기록을 바탕으로 각 단계에서 지금까지 확인된 신호가 얼마나 되는지 나타낸 참고 지표입니다. 진단이나 예측이 아닙니다.</p>
        <div style="height:8px"></div>
        ${rows.map(row => `
          <div class="risk-bar-row">
            <div class="risk-bar-label">${escapeHtml(row.label)}</div>
            <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${row.percent}%; background:${riskBarColor(row.percent)};"></div></div>
            <div class="risk-bar-percent">${row.percent}%</div>
          </div>
        `).join("")}
      `;
    }
    function renderRelapseRiskBars() {
      const box = $("#relapseRiskBars");
      if (!box) return;
      box.innerHTML = relapseRiskBarsHtml(computeRelapseSignal());
    }
    function renderRelapseView() {
      renderRelapseRiskBars();
      const signal = computeRelapseSignal();
      const fullBox = $("#relapseStatusFull");
      if (fullBox) fullBox.innerHTML = relapseStatusCardHtml(signal, { compact: false });
      const stage1Box = $("#stage1TechniqueList");
      if (stage1Box) stage1Box.innerHTML = techniqueCardsHtml(RELAPSE_STAGE1_ACTIONS);
      const stage2Box = $("#stage2TechniqueList");
      if (stage2Box) stage2Box.innerHTML = techniqueCardsHtml(RELAPSE_STAGE2_TECHNIQUES);
      const stage3Box = $("#stage3TechniqueList");
      if (stage3Box) stage3Box.innerHTML = techniqueCardsHtml(RELAPSE_STAGE3_STEPS);
      const stopBox = $("#stopStepList");
      if (stopBox) stopBox.innerHTML = stopTippCardsHtml(STOP_STEPS);
      const tippBox = $("#tippStepList");
      if (tippBox) tippBox.innerHTML = stopTippCardsHtml(TIPP_STEPS);
    }
    function showRelapseFollowup(entry) {
      const box = $("#relapseFollowup");
      if (!box) return;
      const signal = computeRelapseSignal();
      const behavioralNow = Number(entry.actionLevel) >= RELAPSE_ACTION_ANY;
      if (!behavioralNow && !signal.stage1 && !signal.stage2) {
        box.classList.add("hidden");
        box.innerHTML = "";
        return;
      }
      const sections = [];
      if (behavioralNow) {
        sections.push({ heading: "지금 바로: 문제 행동을 실수로 했다면", items: RELAPSE_STAGE3_STEPS });
      } else {
        if (signal.stage2) sections.push({ heading: "인지적 재발 신호 · 지금 해볼 수 있는 것", items: RELAPSE_STAGE2_TECHNIQUES.slice(0, 4) });
        if (signal.stage1) sections.push({ heading: "정서적 재발 신호 · 지금 해볼 수 있는 것", items: RELAPSE_STAGE1_ACTIONS.slice(0, 4) });
      }
      box.innerHTML = `
        <div class="safety-card">
          <h3>${behavioralNow ? "문제 행동이 기록되었습니다" : "재발 신호가 보입니다"}</h3>
          <p class="small">${behavioralNow ? "실수는 회복 여정의 끝이 아닙니다. 아래 순서대로 지금 조치해보세요." : "충동이 더 심해지기 전에, 지금 시도해볼 수 있는 방법입니다."}</p>
        </div>
        ${sections.map(section => `
          <div style="margin-top:10px;">
            <h3 style="font-size:15px;">${escapeHtml(section.heading)}</h3>
            ${techniqueCardsHtml(section.items)}
          </div>
        `).join("")}
        <div class="button-row" style="margin-top:6px;">
          <button class="ghost-btn" type="button" data-jump="relapse">재발예방 탭에서 더 보기</button>
        </div>
      `;
      box.classList.remove("hidden");
      $$("#relapseFollowup [data-jump]").forEach(b => b.addEventListener("click", () => setView(b.dataset.jump)));
    }
    function dailyAchievedFraction(practiceId, iso, target) {
      const logs = logsFor(practiceId, iso).slice(0, target);
      if (!logs.length) return 0;
      const scoreSum = logs.reduce((sum, log) => sum + clampNumber(log.score, 0, 10, 0) / 10, 0);
      return Math.min(target, scoreSum);
    }
    // 오늘부터 거슬러 올라가며, isDayBrokenFn이 true를 반환하는 날을 만나면 멈춥니다.
    // earliestDateStr 이전으로는 "기록이 없어서 알 수 없는 기간"으로 보고 계산하지 않습니다.
    function computeBackwardStreak(earliestDateStr, isDayBrokenFn) {
      if (!earliestDateStr) return null;
      const earliestObj = dateObj(earliestDateStr);
      let streak = 0;
      for (let i = 0; i < 3650; i++) {
        const iso = dateToISO(daysAgo(i));
        if (dateObj(iso) < earliestObj) break;
        if (isDayBrokenFn(iso)) break;
        streak += 1;
      }
      return streak;
    }
    // 문제행동 미발생 연속일수 (양성 강화 지표). 기록이 없는 날은 끊긴 것으로 보지 않고,
    // 문제행동 활성화 수준이 1점 이상 기록된 날만 연속기록을 끊는 날로 봅니다.
    function cleanStreakDays() {
      const observations = activeObservations();
      if (!observations.length) return null;
      const earliest = observations.reduce((min, o) => {
        const d = recordDate(o);
        return !min || d < min ? d : min;
      }, null);
      return computeBackwardStreak(earliest, iso => observations.some(o => sameRecordDate(o, iso) && Number(o.actionLevel) >= RELAPSE_ACTION_ANY));
    }
    // 관찰 또는 실천 기록을 이어온 연속일수 (참여도 지표). 상담자 요약에서 이탈 조짐을 조기에 확인하는 용도입니다.
    function engagementStreakDays() {
      const observations = activeObservations();
      const logs = activeLogs();
      if (!observations.length && !logs.length) return null;
      const all = [...observations, ...logs];
      const earliest = all.reduce((min, r) => {
        const d = recordDate(r);
        return !min || d < min ? d : min;
      }, null);
      const dateSet = new Set(all.map(recordDate));
      return computeBackwardStreak(earliest, iso => !dateSet.has(iso));
    }
    function updateMetrics() {
      const today = todayISO();
      const todayObs = activeObservations().filter(o => sameRecordDate(o, today));
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
            achievedCount += dailyAchievedFraction(p.id, d, target);
          }
        }
      });
      const restart = weekLogs.filter(l => Number(l.score) > 0).filter(l => {
        const prev = state.data.logs
          .filter(x => !x.archived && x.practiceId === l.practiceId && dateObj(recordDate(x)) < dateObj(recordDate(l)))
          .sort((a,b) => b.date.localeCompare(a.date) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
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
    function notificationStatusText() {
      if (!("Notification" in window)) return "이 브라우저는 기록 알림을 지원하지 않습니다.";
      if (Notification.permission !== "granted") return "알림이 꺼져 있어 기록 알림을 받을 수 없습니다.";
      return `알림이 켜져 있습니다. 미기록 알림 시간: ${noRecordReminderTime()}`;
    }
    function renderTodayTaskSummary() {
      const box = $("#todayTaskSummary");
      if (!box) return;
      const today = todayISO();
      const observationCount = activeObservations().filter(o => sameRecordDate(o, today)).length;
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
        <div class="button-row">
          <button class="solid-btn" type="button" data-scroll-target="todayPracticeList">실천 수행도 체크</button>
          <button class="ghost-btn" type="button" data-jump="observe">관찰기록 남기기</button>
        </div>
        <p class="small">${escapeHtml(notificationStatusText())}</p>
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
    function renderCleanStreak() {
      const box = $("#cleanStreakCard");
      if (!box) return;
      const streak = cleanStreakDays();
      if (streak === null) {
        box.innerHTML = `
          <div class="relapse-status level-ok">
            <h3>문제행동 미발생 연속일수</h3>
            <p class="small">첫 관찰 기록을 남기면 여기서 문제행동 미발생 연속일수를 확인할 수 있습니다.</p>
          </div>
        `;
        return;
      }
      const text = streak === 0
        ? "오늘부터 다시 새로 시작하는 중입니다. 오늘 문제행동 활성화 수준을 0점으로 기록하면 다음 문제행동 미발생 연속일수의 첫날이 됩니다."
        : `문제행동 없이 <strong>${streak}일째</strong> 이어가는 중입니다.`;
      box.innerHTML = `
        <div class="relapse-status level-ok">
          <h3>문제행동 미발생 연속일수</h3>
          <p class="small">${text}</p>
        </div>
      `;
    }
    function todayDailyCheckin() {
      return activeDailyCheckins().find(c => c.date === todayISO());
    }
    function renderDailyCheckinCard() {
      const scoreInput = $("#expansionScore");
      if (!scoreInput) return;
      const existing = todayDailyCheckin();
      scoreInput.value = existing ? existing.expansionScore : 5;
      $("#expansionScoreValue").textContent = scoreInput.value;
      $("#expansionNote").value = existing ? existing.note : "";
      paintExpansionSlider();
      const statusBox = $("#dailyCheckinStatus");
      const saveBtn = $("#saveDailyCheckin");
      if (existing) {
        statusBox.textContent = `오늘 기록됨 (${formatSavedTime(existing.updatedAt)}) · 다시 저장하면 갱신됩니다.`;
        saveBtn.textContent = "오늘 하루 돌아보기 수정";
      } else {
        statusBox.textContent = "";
        saveBtn.textContent = "오늘 하루 돌아보기 저장";
      }
    }
    function renderToday() {
      updateMetrics();
      renderFirstUseGuide();
      renderWeeklyFocus();
      renderTodayTaskSummary();
      renderCleanStreak();
      renderRelapseToday();
      renderDailyCheckinCard();
      const today = todayISO();
      const obs = activeObservations().filter(o => sameRecordDate(o, today)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      $("#todayObservations").innerHTML = obs.length ? obs.map(renderObservationItem).join("") : `<div class="empty">아직 오늘의 관찰 기록이 없습니다.</div>`;
      const practices = activePractices();
      $("#todayPracticeList").innerHTML = practices.length ? practices.map(p => renderPracticeToday(p)).join("") : `<div class="empty">아직 설정된 작은 실천행동이 없습니다.</div>`;
      bindInlineNavigation();
      bindTodayLogButtons();
      bindObservationActions();
    }
    function renderFirstUseGuide() {
      const box = $("#firstUseGuide");
      if (!box) return;
      box.classList.toggle("hidden", Boolean(state.data.settings.onboardingSeen));
    }
    function scrollToTodayPractice() {
      setView("today");
      setTimeout(() => {
        const target = $("#todayPracticeList");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
    function bindInlineNavigation() {
      $$("[data-scroll-target]").forEach(button => {
        if (button.dataset.boundScroll) return;
        button.dataset.boundScroll = "1";
        button.addEventListener("click", () => {
          const target = $(`#${selectorEscape(button.dataset.scrollTarget)}`);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      $$("[data-jump]").forEach(button => {
        if (button.dataset.boundJump) return;
        button.dataset.boundJump = "1";
        button.addEventListener("click", () => setView(button.dataset.jump));
      });
    }
    function renderWeeklyFocus() {
      const focus = cleanMultiline(state.data.settings.weeklyFocus, TEXT_LIMITS.medium);
      const display = $("#weeklyFocusDisplay");
      const input = $("#weeklyFocusInput");
      if (display) {
        display.textContent = focus
          ? `이번 주에는 이것만 우선 봅니다: ${focus}`
          : "상담자와 정한 기록 초점이 있으면 여기에 적어두세요. 예: 충동이 올라간 순간의 몸반응만 기록하기";
      }
      if (input && document.activeElement !== input) input.value = focus;
    }
    function triggerText(o) {
      const items = compactList([...(Array.isArray(o.triggerPlaces) ? o.triggerPlaces : []), ...(Array.isArray(o.triggerPeople) ? o.triggerPeople : []), ...(Array.isArray(o.triggerTimes) ? o.triggerTimes : []), ...(Array.isArray(o.triggerCustom) ? o.triggerCustom : [])]);
      return items.join(", ");
    }
    function avoidanceText(o) {
      const items = compactList([...(Array.isArray(o.avoidanceTags) ? o.avoidanceTags : []), ...(Array.isArray(o.avoidanceCustom) ? o.avoidanceCustom : [])]);
      return items.join(", ");
    }
    function renderObservationItem(o) {
      const risk = Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4;
      const hasCurve = o.urgeInitialScore !== null && o.urgeInitialScore !== undefined && o.urgeEndScore !== null && o.urgeEndScore !== undefined;
      const triggers = triggerText(o);
      const avoidance = avoidanceText(o);
      return `<div class="record-item">
        <div class="record-top"><strong>${escapeHtml(o.date)} · ${escapeHtml(o.mode)}</strong><span class="tag ${risk ? "danger" : ""}">${risk ? "고위험 신호" : escapeHtml(behaviorAreaText(o))}</span></div>
        <div class="small">감정: ${escapeHtml(emotionText(o))} · 몸 반응: ${escapeHtml(bodyText(o))}</div>
        <div class="small">사고/감정/충동: ${o.thoughtScore}/${o.emotionScore}/${o.urgeScore} · 문제행동 활성화 수준 ${o.actionLevel}/5</div>
        ${hasCurve ? `<div class="small">충동 흐름: 처음 ${o.urgeInitialScore} → 정점 ${o.urgeScore} → 끝 ${o.urgeEndScore}</div>` : ""}
        ${triggers ? `<div class="small">촉발 단서: ${escapeHtml(triggers)}</div>` : ""}
        ${avoidance ? `<div class="small">회피 신호: ${escapeHtml(avoidance)}</div>` : ""}
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
      const target = targetCount(p);
      const todayAverage = averageDailyLogScore(todayLogs);
      const logHistory = todayLogs.length ? `
        <div style="height:8px"></div>
        <div class="small"><strong>오늘 기록 ${todayLogs.length}/${target}회 · 하루 평균 ${todayAverage.toFixed(1)}점</strong></div>
        <div class="list">
          ${todayLogs.slice(0, 4).map(item => {
            const expectedText = item.expectedPleasureScore !== null && item.expectedMasteryScore !== null
              ? ` · 예상 즐거움 ${item.expectedPleasureScore}/성취감 ${item.expectedMasteryScore}`
              : "";
            return `<div class="plain-card small">즐거움 ${escapeHtml(item.pleasureScore)}/10 · 성취감 ${escapeHtml(item.masteryScore)}/10${expectedText} · ${escapeHtml(formatSavedTime(item.updatedAt))}${item.note ? `<br>${escapeHtml(item.note)}` : ""}<div class="button-row record-actions"><button class="danger-btn" type="button" data-delete-log="${escapeHtml(item.id)}">수행 기록 숨김</button></div></div>`;
          }).join("")}
        </div>
      ` : "";
      return `<div class="record-item">
        <div class="record-top"><strong>${escapeHtml(p.value || "가치")} · ${escapeHtml(p.name)}</strong><span class="tag ${due ? "" : "warn"}">${due ? "오늘 실천일" : "선택 기록"}</span></div>
        <div class="small">오늘 약속: ${target}회 · 현재 ${todayLogs.length}회 기록</div>
        <div class="small">30% 버전: ${escapeHtml(p.smallVersion || "-")}</div>
        <div style="height:8px"></div>
        <div class="small"><strong>오늘 했나요?</strong></div>
        <div class="button-row">
          <button class="ghost-btn" type="button" data-practice-quick="${escapeHtml(p.id)}" data-pleasure="6" data-mastery="8">했음</button>
          <button class="ghost-btn" type="button" data-practice-quick="${escapeHtml(p.id)}" data-pleasure="3" data-mastery="5">일부</button>
          <button class="ghost-btn" type="button" data-practice-quick="${escapeHtml(p.id)}" data-pleasure="0" data-mastery="0">못함</button>
        </div>
        <div class="slider-card">
          <div class="slider-top"><span>실제 성취감</span><span class="slider-value" data-practice-mastery-value="${escapeHtml(p.id)}">0</span></div>
          <input data-practice-mastery="${escapeHtml(p.id)}" type="range" min="0" max="10" value="0" aria-label="실제 성취감">
          <div class="small score-help" data-practice-mastery-help="${escapeHtml(p.id)}">${escapeHtml(masteryScoreText(0))}</div>
        </div>
        <details class="form-row">
          <summary>자세히 기록 (선택)</summary>
          <div style="height:8px"></div>
          <label class="checkline">
            <input type="checkbox" data-expect-toggle="${escapeHtml(p.id)}"> 시작하기 전 예상도 함께 남기기
          </label>
          <div class="hidden" data-expect-box="${escapeHtml(p.id)}">
            <div class="small">막상 해보면 예상과 다를 때가 많습니다. 그 차이 자체가 유용한 정보입니다.</div>
            <div class="slider-card">
              <div class="slider-top"><span>예상 즐거움</span><span class="slider-value" data-practice-expected-pleasure-value="${escapeHtml(p.id)}">5</span></div>
              <input data-practice-expected-pleasure="${escapeHtml(p.id)}" type="range" min="0" max="10" value="5" aria-label="예상 즐거움">
            </div>
            <div class="slider-card">
              <div class="slider-top"><span>예상 성취감</span><span class="slider-value" data-practice-expected-mastery-value="${escapeHtml(p.id)}">5</span></div>
              <input data-practice-expected-mastery="${escapeHtml(p.id)}" type="range" min="0" max="10" value="5" aria-label="예상 성취감">
            </div>
          </div>
          <div style="height:4px"></div>
          <div class="slider-card">
            <div class="slider-top"><span>실제 즐거움</span><span class="slider-value" data-practice-pleasure-value="${escapeHtml(p.id)}">0</span></div>
            <input data-practice-pleasure="${escapeHtml(p.id)}" type="range" min="0" max="10" value="0" aria-label="실제 즐거움">
            <div class="small score-help" data-practice-pleasure-help="${escapeHtml(p.id)}">${escapeHtml(pleasureScoreText(0))}</div>
            <div class="small">이 점수는 이 실천을 계속해야 할 이유가 아니라, 지금 즐거움을 느끼는 감각이 살아있는지 살펴보는 참고 지표입니다. 가치에 맞는 행동이 재미없어도 괜찮습니다.</div>
          </div>
          <textarea data-practice-note="${escapeHtml(p.id)}" maxlength="600" placeholder="방해요인, 도움이 된 조건, 짧은 성찰"></textarea>
        </details>
        <div style="height:8px"></div>
        <button class="solid-btn full" data-save-log="${escapeHtml(p.id)}" type="button">실천 수행도 체크 저장</button>
        ${logHistory}
      </div>`;
    }
    function bindTodayLogButtons() {
      $$("[data-practice-quick]").forEach(button => {
        button.addEventListener("click", () => {
          const id = button.dataset.practiceQuick;
          const container = button.closest(".record-item");
          const pleasureInput = container ? container.querySelector(`[data-practice-pleasure="${selectorEscape(id)}"]`) : null;
          const masteryInput = container ? container.querySelector(`[data-practice-mastery="${selectorEscape(id)}"]`) : null;
          if (pleasureInput) {
            pleasureInput.value = button.dataset.pleasure || "0";
            pleasureInput.dispatchEvent(new Event("input"));
          }
          if (masteryInput) {
            masteryInput.value = button.dataset.mastery || "0";
            masteryInput.dispatchEvent(new Event("input"));
          }
          container?.querySelectorAll("[data-practice-quick]").forEach(item => item.classList.remove("active"));
          button.classList.add("active");
        });
      });
      $$("[data-expect-toggle]").forEach(checkbox => {
        checkbox.addEventListener("change", () => {
          const id = checkbox.dataset.expectToggle;
          const container = checkbox.closest(".record-item");
          const box = container ? container.querySelector("[data-expect-box]") : $(`[data-expect-box="${selectorEscape(id)}"]`);
          if (box) box.classList.toggle("hidden", !checkbox.checked);
        });
      });
      $$("[data-practice-expected-pleasure]").forEach(input => {
        input.addEventListener("input", () => {
          const container = input.closest(".record-item");
          const label = container ? container.querySelector("[data-practice-expected-pleasure-value]") : null;
          if (label) label.textContent = input.value;
        });
      });
      $$("[data-practice-expected-mastery]").forEach(input => {
        input.addEventListener("input", () => {
          const container = input.closest(".record-item");
          const label = container ? container.querySelector("[data-practice-expected-mastery-value]") : null;
          if (label) label.textContent = input.value;
        });
      });
      $$("[data-practice-pleasure]").forEach(input => {
        input.addEventListener("input", () => {
          const id = input.dataset.practicePleasure;
          const container = input.closest(".record-item");
          const label = container ? container.querySelector("[data-practice-pleasure-value]") : $(`[data-practice-pleasure-value="${selectorEscape(id)}"]`);
          const help = container ? container.querySelector("[data-practice-pleasure-help]") : $(`[data-practice-pleasure-help="${selectorEscape(id)}"]`);
          if (label) label.textContent = input.value;
          if (help) help.textContent = pleasureScoreText(input.value);
        });
      });
      $$("[data-practice-mastery]").forEach(input => {
        input.addEventListener("input", () => {
          const id = input.dataset.practiceMastery;
          const container = input.closest(".record-item");
          const label = container ? container.querySelector("[data-practice-mastery-value]") : $(`[data-practice-mastery-value="${selectorEscape(id)}"]`);
          const help = container ? container.querySelector("[data-practice-mastery-help]") : $(`[data-practice-mastery-help="${selectorEscape(id)}"]`);
          if (label) label.textContent = input.value;
          if (help) help.textContent = masteryScoreText(input.value);
        });
      });
      $$("[data-save-log]").forEach(button => {
        button.addEventListener("click", () => {
          const id = button.dataset.saveLog;
          const container = button.closest(".record-item");
          const find = (attr) => container ? container.querySelector(`[${attr}="${selectorEscape(id)}"]`) : $(`[${attr}="${selectorEscape(id)}"]`);
          const pleasureInput = find("data-practice-pleasure");
          const masteryInput = find("data-practice-mastery");
          const noteInput = find("data-practice-note");
          const expectToggle = find("data-expect-toggle");
          const expectedPleasureInput = find("data-practice-expected-pleasure");
          const expectedMasteryInput = find("data-practice-expected-mastery");
          const pleasureScore = clampNumber(pleasureInput?.value, 0, 10, 0);
          const masteryScore = clampNumber(masteryInput?.value, 0, 10, 0);
          const note = cleanMultiline(noteInput?.value, TEXT_LIMITS.long);
          const includeExpected = Boolean(expectToggle?.checked);
          const entry = {
            id: uid(),
            practiceId: id,
            date: todayISO(),
            pleasureScore,
            masteryScore,
            score: Math.round((pleasureScore + masteryScore) / 2),
            expectedPleasureScore: includeExpected ? clampNumber(expectedPleasureInput?.value, 0, 10, null) : null,
            expectedMasteryScore: includeExpected ? clampNumber(expectedMasteryInput?.value, 0, 10, null) : null,
            note,
            updatedAt: new Date().toISOString()
          };
          state.data.logs.push(entry);
          if (!saveData()) return;
          renderAll();
          showToast("실천 수행도를 저장했습니다. 오늘의 작은 방향 전환이 기록으로 남았습니다.");
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
      state.behaviorAreas = problemLabelsFromRecord(record).filter(value => value !== "-");
      state.problemDomain = normalizeProblemDomain(record.problemDomain || defaultProblemDomainForLabels(state.behaviorAreas));
      state.problemDomainTouched = true;
      state.problemAutofillTarget = "";
      state.problemAutofillValue = "";
      state.emotion = record.emotion || "";
      state.body = Array.isArray(record.body) ? record.body.slice() : [];
      state.value = record.value || "";
      state.triggerPlaces = Array.isArray(record.triggerPlaces) ? record.triggerPlaces.slice() : [];
      state.triggerPeople = Array.isArray(record.triggerPeople) ? record.triggerPeople.slice() : [];
      state.triggerTimes = Array.isArray(record.triggerTimes) ? record.triggerTimes.slice() : [];
      state.avoidanceTags = Array.isArray(record.avoidanceTags) ? record.avoidanceTags.slice() : [];
      $("#behaviorCustom").value = Array.isArray(record.behaviorCustomAreas) ? record.behaviorCustomAreas.join(", ") : "";
      $("#triggerCustom").value = Array.isArray(record.triggerCustom) ? record.triggerCustom.join(", ") : "";
      $("#avoidanceCustom").value = Array.isArray(record.avoidanceCustom) ? record.avoidanceCustom.join(", ") : "";
      const hasTriggerData = state.triggerPlaces.length || state.triggerPeople.length || state.triggerTimes.length || $("#triggerCustom").value;
      const hasAvoidanceData = state.avoidanceTags.length || $("#avoidanceCustom").value;
      const triggerDetails = $("#triggerDetails");
      const avoidanceDetails = $("#avoidanceDetails");
      if (triggerDetails) triggerDetails.open = Boolean(hasTriggerData);
      if (avoidanceDetails) avoidanceDetails.open = Boolean(hasAvoidanceData);
      $("#situation").value = record.situation || "";
      $("#thoughtText").value = record.thoughtText || "";
      $("#emotionCustom").value = record.emotionCustom || "";
      $("#bodyCustom").value = record.bodyCustom || "";
      $("#thoughtScore").value = clampNumber(record.thoughtScore, 0, 10, 0);
      $("#emotionScore").value = clampNumber(record.emotionScore, 0, 10, 0);
      $("#urgeScore").value = clampNumber(record.urgeScore, 0, 10, 0);
      $("#urgeInitialScore").value = record.urgeInitialScore !== null && record.urgeInitialScore !== undefined ? record.urgeInitialScore : clampNumber(record.urgeScore, 0, 10, 0);
      $("#urgeEndScore").value = record.urgeEndScore !== null && record.urgeEndScore !== undefined ? record.urgeEndScore : clampNumber(record.urgeScore, 0, 10, 0);
      $("#actionLevel").value = clampNumber(record.actionLevel, 0, 5, 0);
      $("#coping").value = record.coping || "";
      $("#copingScore").value = clampNumber(record.copingScore, 0, 10, 0);
      $("#insight").value = record.insight || "";
      ["thoughtScore","emotionScore","urgeScore","urgeInitialScore","urgeEndScore","actionLevel","copingScore"].forEach(field => {
        $("#" + field + "Value").textContent = $("#" + field).value;
      });
      paintAllIntensitySliders();
      showRiskFollowup(clampNumber(record.urgeScore, 0, 10, 0) >= 8 || clampNumber(record.actionLevel, 0, 5, 0) >= 4);
      initPickers();
      state.observeStep = 0;
      renderObserveStep();
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
          <div class="small">기록 ${logs.length}회 · 평균 수행도 ${avg(logs, l => Number(l.score)).toFixed(1)} (즐거움 ${avg(logs, l => Number(l.pleasureScore)).toFixed(1)} · 성취감 ${avg(logs, l => Number(l.masteryScore)).toFixed(1)})</div>
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
      renderTodayTaskSummary();
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
      const hasObservation = activeObservations().some(record => sameRecordDate(record, today));
      const hasPracticeLog = activeLogs().some(record => sameRecordDate(record, today));
      if (hasObservation || hasPracticeLog) return;
      const key = `maeumgoyo.noRecordReminder.${today}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      notify("오늘 아직 관찰 기록과 실천 기록이 없습니다. 짧게라도 오늘의 마음과 작은 실천을 남겨보세요.");
    }
    function cleanDayCount(fromDaysAgo, toDaysAgo) {
      const observations = activeObservations();
      let count = 0;
      for (let i = toDaysAgo; i <= fromDaysAgo; i++) {
        const iso = dateToISO(daysAgo(i));
        const dayObs = observations.filter(o => sameRecordDate(o, iso));
        if (!dayObs.some(o => Number(o.actionLevel) >= RELAPSE_ACTION_ANY)) count++;
      }
      return count;
    }
    function weeklyPracticeRate(startDaysAgo, windowDays = 7) {
      let due = 0;
      let achieved = 0;
      activePractices().forEach(p => {
        for (let i = startDaysAgo; i < startDaysAgo + windowDays; i++) {
          const d = dateToISO(daysAgo(i));
          if (isPracticeDue(p, d)) {
            const target = targetCount(p);
            due += target;
            achieved += dailyAchievedFraction(p.id, d, target);
          }
        }
      });
      return due ? achieved / due : null;
    }
    function weeklyExpansionAvg(startDaysAgo, windowDays = 7) {
      const checkins = activeDailyCheckins().filter(c => {
        const d = dateObj(c.date);
        return d >= daysAgo(startDaysAgo + windowDays - 1) && d <= daysAgo(startDaysAgo);
      });
      return checkins.length ? avg(checkins, c => Number(c.expansionScore)) : null;
    }
    function buildWeeklyHighlights() {
      const thisWeek = activeObservations().filter(o => dateObj(recordDate(o)) >= daysAgo(6));
      const prevWeek = activeObservations().filter(o => {
        const d = dateObj(recordDate(o));
        return d >= daysAgo(13) && d < daysAgo(6);
      });
      const candidates = [];

      if (thisWeek.length && prevWeek.length) {
        const urgeNow = avg(thisWeek, o => Number(o.urgeScore));
        const urgePrev = avg(prevWeek, o => Number(o.urgeScore));
        if (urgePrev - urgeNow >= 1) candidates.push({ priority: urgePrev - urgeNow, text: `지난주보다 평균 충동이 ${(urgePrev - urgeNow).toFixed(1)}점 낮아졌습니다.` });

        const emotionNow = avg(thisWeek, o => Number(o.emotionScore));
        const emotionPrev = avg(prevWeek, o => Number(o.emotionScore));
        if (emotionPrev - emotionNow >= 1) candidates.push({ priority: emotionPrev - emotionNow, text: `지난주보다 평균 그때 느낀 감정이 ${(emotionPrev - emotionNow).toFixed(1)}점 낮아졌습니다.` });
      }

      const cleanThisWeek = cleanDayCount(6, 0);
      const cleanPrevWeek = cleanDayCount(13, 7);
      if (thisWeek.length && cleanThisWeek > cleanPrevWeek) {
        candidates.push({ priority: cleanThisWeek - cleanPrevWeek + 1, text: `지난주보다 문제행동 없이 보낸 날이 ${cleanThisWeek - cleanPrevWeek}일 늘었습니다 (이번 주 ${cleanThisWeek}일).` });
      } else if (thisWeek.length && cleanThisWeek === 7) {
        candidates.push({ priority: 1.5, text: "이번 주는 7일 모두 문제행동 없이 보냈습니다." });
      }

      const rateNow = weeklyPracticeRate(0);
      const ratePrev = weeklyPracticeRate(7);
      if (rateNow !== null && ratePrev !== null && rateNow - ratePrev >= 0.1) {
        candidates.push({ priority: (rateNow - ratePrev) * 5, text: `지난주보다 실천행동 수행도가 ${Math.round((rateNow - ratePrev) * 100)}%p 올라갔습니다.` });
      } else if (rateNow !== null && rateNow >= 0.7) {
        candidates.push({ priority: 1, text: `이번 주 실천행동을 목표 대비 ${Math.round(rateNow * 100)}% 수행했습니다.` });
      }

      const streak = cleanStreakDays();
      if (streak && streak >= 3) candidates.push({ priority: streak / 10, text: `문제행동 없이 ${streak}일째 이어가는 중입니다.` });

      const engagementStreak = engagementStreakDays();
      if (engagementStreak && engagementStreak >= 5) candidates.push({ priority: engagementStreak / 20, text: `${engagementStreak}일 연속으로 기록을 이어가고 있습니다.` });

      const expansionNow = weeklyExpansionAvg(0);
      const expansionPrev = weeklyExpansionAvg(7);
      if (expansionNow !== null && expansionPrev !== null && expansionNow - expansionPrev >= 1) {
        candidates.push({ priority: expansionNow - expansionPrev, text: `지난주보다 삶의 확장감과 만족도가 ${(expansionNow - expansionPrev).toFixed(1)}점 올라갔습니다.` });
      } else if (expansionNow !== null && expansionNow >= 7) {
        candidates.push({ priority: 1, text: `이번 주 삶의 확장감과 만족도가 평균 ${expansionNow.toFixed(1)}점으로 높게 유지되고 있습니다.` });
      }

      if (!candidates.length) {
        candidates.push({ priority: 0, text: thisWeek.length ? `이번 주도 관찰 기록 ${thisWeek.length}건을 남겼습니다. 기록을 이어가는 것 자체가 중요한 진전입니다.` : "이번 주 기록을 시작하면 여기에 변화가 표시됩니다." });
      }

      return candidates.sort((a, b) => b.priority - a.priority).slice(0, 2).map(c => c.text);
    }
    function renderWeeklyHighlights() {
      const box = $("#weeklyHighlights");
      if (!box) return;
      const highlights = buildWeeklyHighlights();
      box.innerHTML = `
        <div class="relapse-status level-ok">
          <h3>이번 주 하이라이트</h3>
          <ul>${highlights.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul>
        </div>
      `;
    }
    function worryResolutionStats() {
      const resolved = activePredictions().filter(p => p.status !== "pending");
      return {
        total: resolved.length,
        occurred: resolved.filter(p => p.status === "occurred").length,
        partial: resolved.filter(p => p.status === "partial").length,
        didNot: resolved.filter(p => p.status === "did_not_occur").length
      };
    }
    function renderWorryPendingItem(p) {
      const daysSince = Math.floor((dateObj(todayISO()) - dateObj(p.date)) / 86400000);
      const overdue = daysSince >= 14;
      return `<div class="record-item">
        <div class="record-top"><strong>${escapeHtml(p.date)}</strong><span class="tag ${overdue ? "warn" : ""}">${overdue ? "오래된 걱정" : `예상 ${p.predictedSeverity}/10`}</span></div>
        <div class="small">${escapeHtml(p.worryText)}</div>
        <div class="slider-card">
          <div class="slider-top"><span>실제로 그랬다면 심각도는?</span><span class="slider-value" data-actual-severity-value="${escapeHtml(p.id)}">${p.predictedSeverity}</span></div>
          <input type="range" min="0" max="10" value="${p.predictedSeverity}" data-actual-severity="${escapeHtml(p.id)}" aria-label="실제로 그랬다면 심각도는">
        </div>
        <div class="button-row record-actions">
          <button class="ghost-btn" type="button" data-resolve="${escapeHtml(p.id)}" data-status="did_not_occur">일어나지 않음</button>
          <button class="ghost-btn" type="button" data-resolve="${escapeHtml(p.id)}" data-status="partial">부분적으로 그랬음</button>
          <button class="danger-btn" type="button" data-resolve="${escapeHtml(p.id)}" data-status="occurred">일어났음</button>
        </div>
      </div>`;
    }
    function bindWorryActions() {
      $$("[data-actual-severity]").forEach(input => {
        input.addEventListener("input", () => {
          const id = input.dataset.actualSeverity;
          const label = $(`[data-actual-severity-value="${selectorEscape(id)}"]`);
          if (label) label.textContent = input.value;
        });
      });
      $$("[data-resolve]").forEach(button => {
        button.addEventListener("click", () => {
          const id = button.dataset.resolve;
          const status = button.dataset.status;
          const prediction = state.data.predictions.find(p => p.id === id);
          if (!prediction) return;
          const severityInput = $(`[data-actual-severity="${selectorEscape(id)}"]`);
          prediction.status = status;
          prediction.actualSeverity = clampNumber(severityInput?.value, 0, 10, prediction.predictedSeverity);
          prediction.resolvedAt = new Date().toISOString();
          prediction.updatedAt = new Date().toISOString();
          if (!saveData()) return;
          renderWorrySection();
          showToast("걱정을 확인했습니다.");
        });
      });
    }
    function renderWorrySection() {
      const summaryBox = $("#worrySummary");
      const listBox = $("#worryPendingList");
      if (!summaryBox || !listBox) return;
      const stats = worryResolutionStats();
      summaryBox.innerHTML = stats.total
        ? `<p class="small">확인한 걱정 ${stats.total}건 중 실제로 일어난 것은 ${stats.occurred}건(${Math.round((stats.occurred / stats.total) * 100)}%), 부분적으로 그랬던 것은 ${stats.partial}건, 일어나지 않은 것은 ${stats.didNot}건이었습니다.</p>`
        : `<p class="small">아직 확인된 걱정 기록이 없습니다. 관찰 기록에서 걱정되는 결과를 남기고, 나중에 여기서 확인해보세요.</p>`;
      const pending = activePredictions().filter(p => p.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
      listBox.innerHTML = pending.length ? pending.map(renderWorryPendingItem).join("") : `<div class="empty">확인할 걱정이 없습니다.</div>`;
      bindWorryActions();
    }
    function expansionSeriesData(totalDisplayDays = 14) {
      const displayDays = Math.max(1, Math.min(totalDisplayDays, TREND_DISPLAY_CAP));
      const checkins = activeDailyCheckins();
      return Array.from({ length: displayDays }, (_, i) => {
        const day = dateToISO(daysAgo(displayDays - 1 - i));
        const checkin = checkins.find(c => c.date === day);
        return { day, label: day.slice(5).replace("-", "/"), score: checkin ? checkin.expansionScore : null };
      });
    }
    function renderExpansionTrend() {
      const box = $("#expansionTrend");
      if (!box) return;
      const data = expansionSeriesData(trendRangeDays());
      const hasData = data.some(d => d.score !== null);
      if (!hasData) {
        box.innerHTML = `<div class="empty">아직 하루 마무리 기록이 없습니다. 오늘 할 일 화면에서 남겨보세요.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="small" style="margin-bottom:8px;">막대 색이 옅은 파랑일수록 낮은 점수, 진한 보라일수록 높은 점수입니다. (문제행동 그래프의 초록·주황·빨강과는 다른 색 체계입니다 — "위험도"가 아니라 "확장감"을 나타냅니다.)</div>
        <div class="trend-bar-list">
          ${data.map(d => `
            <div class="trend-day">
              <div class="trend-date">${escapeHtml(d.label)}</div>
              <div class="trend-bar-stack" aria-label="${escapeHtml(d.day)} 삶의 확장감과 만족도">
                ${d.score !== null
                  ? `<div class="trend-line" style="width:${Math.max(6, (d.score / 10) * 100)}%; background:${expansionColor((d.score / 10) * 100)};"><span>${d.score}</span></div>`
                  : `<span class="small" style="color:var(--muted);">기록 없음</span>`}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    function trendRangeStartDate() {
      return daysAgo(trendRangeDays() - 1);
    }
    function trendCheckins() {
      const start = trendRangeStartDate();
      return activeDailyCheckins().filter(c => dateObj(c.date) >= start);
    }
    function simpleTrendDates(maxDays = 14) {
      const displayDays = Math.max(1, Math.min(trendRangeDays(), maxDays));
      return Array.from({ length: displayDays }, (_, i) => dateToISO(daysAgo(displayDays - 1 - i)));
    }
    function simpleBarRow(label, value, detail, tone = "") {
      const score = clampNumber(value, 0, 10, 0);
      return `
        <div class="simple-trend-row">
          <div class="simple-trend-label">${escapeHtml(label)}</div>
          <div class="simple-trend-track"><div class="simple-trend-fill ${tone}" style="width:${Math.max(4, score * 10)}%"></div></div>
          <div class="simple-trend-note">${escapeHtml(detail)}</div>
        </div>
      `;
    }
    function renderSimpleSummary() {
      const box = $("#trendSimpleSummary");
      if (!box) return;
      const days = trendRangeDays();
      const observations = recentObservations(days);
      const logs = recentLogs(days);
      const checkins = trendCheckins();
      const actionDays = new Set(observations.filter(o => Number(o.actionLevel) > 0).map(recordDate));
      const emotionAvg = observations.length ? avg(observations, o => Number(o.emotionScore)).toFixed(1) : "-";
      const urgeAvg = observations.length ? avg(observations, o => Number(o.urgeScore)).toFixed(1) : "-";
      const practiceAvg = logs.length ? avg(logs, l => Number(l.score)).toFixed(1) : "-";
      const expansionAvg = checkins.length ? avg(checkins, c => Number(c.expansionScore)).toFixed(1) : "-";
      box.innerHTML = `
        <div class="simple-metric-grid">
          <div><strong>${observations.length}</strong><span>관찰기록</span></div>
          <div><strong>${logs.length}</strong><span>실천기록</span></div>
          <div><strong>${checkins.length}</strong><span>하루 돌아보기</span></div>
          <div><strong>${actionDays.size}</strong><span>문제행동 기록일</span></div>
        </div>
        <div class="summary-box simple-summary">
${trendRangeLabel()} 평균
감정 ${emotionAvg} · 충동 ${urgeAvg}
실천 수행도 ${practiceAvg} · 삶의 경험 확장 ${expansionAvg}
        </div>
      `;
    }
    function renderSimpleMindTrend() {
      const box = $("#trendSimpleMind");
      if (!box) return;
      const rows = simpleTrendDates().map(day => {
        const dayObservations = activeObservations().filter(o => sameRecordDate(o, day));
        const emotion = avg(dayObservations, o => Number(o.emotionScore));
        const urge = avg(dayObservations, o => Number(o.urgeScore));
        const value = dayObservations.length ? (emotion + urge) / 2 : 0;
        const detail = dayObservations.length ? `감정 ${emotion.toFixed(1)} · 충동 ${urge.toFixed(1)}` : "기록 없음";
        return simpleBarRow(day.slice(5).replace("-", "/"), value, detail, "mind");
      }).join("");
      box.innerHTML = `<div class="simple-trend-list">${rows}</div>`;
    }
    function renderSimpleExpansionTrend() {
      const box = $("#trendSimpleExpansion");
      if (!box) return;
      const checkins = activeDailyCheckins();
      const rows = simpleTrendDates().map(day => {
        const checkin = checkins.find(c => c.date === day);
        const value = checkin ? Number(checkin.expansionScore) : 0;
        const detail = checkin ? `${value}/10` : "기록 없음";
        return simpleBarRow(day.slice(5).replace("-", "/"), value, detail, "expansion");
      }).join("");
      box.innerHTML = `<div class="simple-trend-list">${rows}</div>`;
    }
    function renderSimplePracticeTrend() {
      const box = $("#trendSimplePractice");
      if (!box) return;
      const logs = activeLogs();
      const rows = simpleTrendDates().map(day => {
        const dayLogs = logs.filter(l => sameRecordDate(l, day));
        const value = averageDailyLogScore(dayLogs);
        const detail = dayLogs.length ? `${value.toFixed(1)}/10 · ${dayLogs.length}건` : "기록 없음";
        return simpleBarRow(day.slice(5).replace("-", "/"), value, detail, "practice");
      }).join("");
      box.innerHTML = `<div class="simple-trend-list">${rows}</div>`;
    }
    function renderSimpleQuestions() {
      const box = $("#trendSimpleQuestions");
      if (!box) return;
      const days = trendRangeDays();
      const observations = recentObservations(days);
      const logs = recentLogs(days);
      const highEmotion = observations.slice().sort((a, b) => Number(b.emotionScore) - Number(a.emotionScore))[0];
      const highUrge = observations.slice().sort((a, b) => Number(b.urgeScore) - Number(a.urgeScore))[0];
      const helpfulCoping = observations.slice().filter(o => o.coping && Number(o.copingScore) >= 6).sort((a, b) => Number(b.copingScore) - Number(a.copingScore))[0];
      const lowPractice = logs.length && avg(logs, l => Number(l.score)) < 5;
      const items = [
        highEmotion ? `가장 감정이 강했던 날(${recordDate(highEmotion)})에는 무엇이 먼저 시작되었나요?` : "이번 기간에 가장 기억나는 감정 장면은 무엇인가요?",
        highUrge ? `충동이 올라왔던 순간(${recordDate(highUrge)})에 행동으로 이어지기 전 틈이 있었나요?` : "충동이 크지 않았던 날에는 무엇이 도움이 되었나요?",
        helpfulCoping ? `도움이 컸던 대처(${helpfulCoping.coping})를 다음에도 쓸 수 있을까요?` : "다음에 감정이 올라오면 가장 먼저 시도할 대처는 무엇인가요?",
        lowPractice ? "실천행동을 더 작게 줄이면 다시 시작하기 쉬울까요?" : "다음 24시간 안에 이어갈 가장 작은 가치 행동은 무엇인가요?"
      ];
      box.innerHTML = `<ul class="simple-question-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }
    function renderTrend() {
      renderSimpleSummary();
      renderSimpleMindTrend();
      renderSimpleExpansionTrend();
      renderSimplePracticeTrend();
      renderSimpleQuestions();
    }
    function countTags(values) {
      const counts = {};
      values.map(value => String(value || "").trim()).filter(Boolean).forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
    }
    function topItems(values, limit = 3) {
      const top = countTags(values).slice(0, limit);
      return top.length ? top.map(({ tag, count }) => `${tag} ${count}회`).join(", ") : "아직 없음";
    }
    function observationTags(o) {
      return compactList([
        ...(Array.isArray(o.triggerPlaces) ? o.triggerPlaces : []),
        ...(Array.isArray(o.triggerPeople) ? o.triggerPeople : []),
        ...(Array.isArray(o.triggerTimes) ? o.triggerTimes : []),
        ...(Array.isArray(o.triggerCustom) ? o.triggerCustom : [])
      ]);
    }
    function triggerCorrelationData(days = 14, limit = 3) {
      const observations = recentObservations(days);
      const allTags = observations.flatMap(observationTags);
      const top = countTags(allTags).slice(0, limit);
      return top.map(({ tag, count }) => {
        const withTag = observations.filter(o => observationTags(o).includes(tag));
        const withoutTag = observations.filter(o => !observationTags(o).includes(tag));
        return {
          tag,
          count,
          withAvg: withTag.length ? avg(withTag, o => Number(o.urgeScore)) : 0,
          withoutAvg: withoutTag.length ? avg(withoutTag, o => Number(o.urgeScore)) : 0,
          withCount: withTag.length,
          withoutCount: withoutTag.length
        };
      });
    }
    function calendarHeatmapCells(weeks = 10) {
      const todayDow = dateObj(todayISO()).getDay();
      const cells = [];
      for (let col = 0; col < weeks; col++) {
        const weekIndexFromRight = weeks - 1 - col;
        for (let row = 0; row < 7; row++) {
          const daysAgoCount = weekIndexFromRight * 7 + (todayDow - row);
          cells.push({ col, row, iso: daysAgoCount < 0 ? null : dateToISO(daysAgo(daysAgoCount)) });
        }
      }
      return cells;
    }
    function dayProblemStatus(iso) {
      if (!iso) return null;
      const dayObs = activeObservations().filter(o => sameRecordDate(o, iso));
      if (!dayObs.length) return { hasData: false, maxAction: 0 };
      return { hasData: true, maxAction: Math.max(...dayObs.map(o => Number(o.actionLevel))) };
    }
    function heatmapCellColor(status) {
      if (!status) return "none";
      if (!status.hasData) return "var(--surface-2)";
      return severityColor((status.maxAction / 5) * 100);
    }
    function calendarHeatmapSvg(weeks = 10) {
      const cellSize = 14;
      const gap = 3;
      const offsetX = 20;
      const width = offsetX + weeks * (cellSize + gap);
      const height = 7 * (cellSize + gap);
      const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
      const labels = dayLabels.map((label, row) => row % 2 === 1
        ? `<text x="0" y="${row * (cellSize + gap) + cellSize - 3}" font-size="9" fill="#64736d">${label}</text>`
        : "").join("");
      const cells = calendarHeatmapCells(weeks).map(c => {
        const x = offsetX + c.col * (cellSize + gap);
        const y = c.row * (cellSize + gap);
        if (!c.iso) return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="none"/>`;
        const status = dayProblemStatus(c.iso);
        const color = heatmapCellColor(status);
        const strokeColor = status.hasData ? "none" : "var(--line)";
        return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${color}" stroke="${strokeColor}" stroke-width="1"><title>${escapeHtml(c.iso)}</title></rect>`;
      }).join("");
      return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="max-width:${width}px; display:block; margin:0 auto;" role="img" aria-label="최근 ${weeks}주 문제행동 캘린더">${labels}${cells}</svg>`;
    }
    function renderProblemBehaviorCalendar() {
      const box = $("#problemBehaviorCalendar");
      if (!box) return;
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot" style="background:var(--surface-2); border:1px solid var(--line);"></i>기록 없음</span>
          <span><i class="legend-dot" style="background:var(--good)"></i>문제행동 없음</span>
          <span><i class="legend-dot" style="background:var(--accent)"></i>일부 함</span>
          <span><i class="legend-dot" style="background:var(--danger)"></i>많이 함</span>
        </div>
        ${calendarHeatmapSvg(10)}
        <p class="small" style="text-align:center;">사각형에 마우스를 올리면 날짜가 보입니다</p>
      `;
    }
    function severityColorForActionLevel(actionLevel) {
      return severityColor((clampNumber(actionLevel, 0, 5, 0) / 5) * 100);
    }
    function emotionUrgeScatterSvg(observations) {
      const size = 300;
      const pad = 34;
      const bottom = size - 20;
      const plotSize = bottom - pad;
      const scaleX = v => pad + (clampNumber(v, 0, 10, 0) / 10) * plotSize;
      const scaleY = v => bottom - (clampNumber(v, 0, 10, 0) / 10) * plotSize;
      const ticks = [0, 2, 4, 6, 8, 10];
      const gridLines = ticks.map(t => `
        <line x1="${scaleX(t).toFixed(1)}" y1="${pad}" x2="${scaleX(t).toFixed(1)}" y2="${bottom}" stroke="var(--line)" stroke-width="1"/>
        <line x1="${pad}" y1="${scaleY(t).toFixed(1)}" x2="${bottom}" y2="${scaleY(t).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
        <text x="${scaleX(t).toFixed(1)}" y="${bottom + 12}" font-size="9" text-anchor="middle" fill="#64736d">${t}</text>
        <text x="${pad - 6}" y="${(scaleY(t) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="#64736d">${t}</text>
      `).join("");
      const points = observations.map(o => {
        const cx = scaleX(Number(o.emotionScore)).toFixed(1);
        const cy = scaleY(Number(o.urgeScore)).toFixed(1);
        const color = severityColorForActionLevel(o.actionLevel);
        return `<circle cx="${cx}" cy="${cy}" r="6" fill="${color}" fill-opacity="0.55" stroke="${color}" stroke-width="1.2"/>`;
      }).join("");
      return `
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" style="max-width:320px; display:block; margin:0 auto;" role="img" aria-label="감정과 충동의 산점도">
          ${gridLines}
          <line x1="${pad}" y1="${bottom}" x2="${bottom}" y2="${bottom}" stroke="#1d2924" stroke-width="1.5"/>
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${bottom}" stroke="#1d2924" stroke-width="1.5"/>
          ${points}
          <text x="${(pad + bottom) / 2}" y="${size - 2}" font-size="10" text-anchor="middle" fill="#1d2924" font-weight="700">그때 느낀 감정 (0~10)</text>
          <text x="12" y="${(pad + bottom) / 2}" font-size="10" text-anchor="middle" fill="#1d2924" font-weight="700" transform="rotate(-90 12 ${(pad + bottom) / 2})">충동 (0~10)</text>
        </svg>
      `;
    }
    function renderEmotionUrgeScatter() {
      const box = $("#emotionUrgeScatter");
      if (!box) return;
      const observations = recentObservations(trendRangeDays());
      if (!observations.length) {
        box.innerHTML = `<div class="empty">아직 산점도로 볼 관찰 기록이 없습니다.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot" style="background:var(--good)"></i>문제행동 없음</span>
          <span><i class="legend-dot" style="background:var(--accent)"></i>일부 함</span>
          <span><i class="legend-dot" style="background:var(--danger)"></i>많이 함</span>
        </div>
        ${emotionUrgeScatterSvg(observations)}
        <p class="small" style="text-align:center;">점 하나 = 관찰 기록 하나 · 오른쪽 위로 갈수록 감정과 충동이 함께 높았던 순간입니다 · 점 색이 진할수록 그 순간 문제행동이 있었습니다</p>
      `;
    }
    function renderTriggerCorrelation() {
      const box = $("#triggerCorrelation");
      if (!box) return;
      const data = triggerCorrelationData(trendRangeDays());
      if (!data.length) {
        box.innerHTML = `<div class="empty">아직 촉발 단서 기록이 충분하지 않아 비교할 수 없습니다. 관찰 기록에서 촉발 단서를 남기면 여기에 표시됩니다.</div>`;
        return;
      }
      box.innerHTML = `
        <p class="small">${escapeHtml(trendRangeLabel())} 중 자주 나온 촉발 단서가 있었던 날과 없었던 날의 평균 충동을 비교합니다.</p>
        <div style="height:8px"></div>
        ${data.map(item => `
          <div class="trigger-compare-row">
            <div class="trigger-label">${escapeHtml(item.tag)} (${item.count}회)</div>
            <div class="trend-bar-stack">
              <div class="trend-line obs" style="width:${trendWidth(item.withAvg, item.withCount)}%"><span>있음 · ${item.withCount}일 · ${item.withCount ? item.withAvg.toFixed(1) : "-"}</span></div>
              <div class="trend-line practice" style="width:${trendWidth(item.withoutAvg, item.withoutCount)}%"><span>없음 · ${item.withoutCount}일 · ${item.withoutCount ? item.withoutAvg.toFixed(1) : "-"}</span></div>
            </div>
          </div>
        `).join("")}
      `;
    }
    function buildReflectionSummary() {
      const rangeDays = trendRangeDays();
      const observations = recentObservations(rangeDays);
      const logs = recentLogs(rangeDays);
      const highRisk = observations.filter(o => Number(o.urgeScore) >= 8 || Number(o.actionLevel) >= 4);
      const resisted = observations.filter(o => Number(o.urgeScore) >= 5 && Number(o.actionLevel) <= 1);
      const emotionsSeen = observations.flatMap(o => compactList([o.emotion, o.emotionCustom]));
      const bodiesSeen = observations.flatMap(o => compactList([...(Array.isArray(o.body) ? o.body : []), o.bodyCustom]));
      const triggersSeen = observations.flatMap(o => compactList([...(Array.isArray(o.triggerPlaces) ? o.triggerPlaces : []), ...(Array.isArray(o.triggerPeople) ? o.triggerPeople : []), ...(Array.isArray(o.triggerTimes) ? o.triggerTimes : []), ...(Array.isArray(o.triggerCustom) ? o.triggerCustom : [])]));
      const avoidanceSeen = observations.flatMap(o => compactList([...(Array.isArray(o.avoidanceTags) ? o.avoidanceTags : []), ...(Array.isArray(o.avoidanceCustom) ? o.avoidanceCustom : [])]));
      const valuesSeen = observations.map(o => o.value).concat(state.data.practices.map(p => p.value));
      const helpfulCoping = observations
        .filter(o => Number(o.copingScore) >= 6 && o.coping)
        .map(o => o.coping)
        .slice(0, 3)
        .join(" / ") || "아직 없음";
      const relapse = relapseSummaryForRange(observations);
      const emotionVariability = stdDev(observations.map(o => Number(o.emotionScore)));
      const urgeVariability = stdDev(observations.map(o => Number(o.urgeScore)));
      const rangeCheckins = activeDailyCheckins().filter(c => dateObj(c.date) >= daysAgo(rangeDays - 1));
      const expansionAvgText = rangeCheckins.length ? avg(rangeCheckins, c => Number(c.expansionScore)).toFixed(1) : "기록 없음";
      return [
        `${trendRangeLabel()} 자기성찰 요약`,
        "",
        `관찰 기록: ${observations.length}건`,
        `실천 기록: ${logs.length}건`,
        `자주 나온 감정: ${topItems(emotionsSeen)}`,
        `자주 나온 몸 반응: ${topItems(bodiesSeen)}`,
        `자주 나온 촉발 단서: ${topItems(triggersSeen)}`,
        `자주 나온 회피 신호: ${topItems(avoidanceSeen)}`,
        `자주 선택한 가치: ${topItems(valuesSeen)}`,
        `고위험 신호: ${highRisk.length}건`,
        `충동은 높았지만 행동화하지 않은 기록: ${resisted.length}건`,
        `도움이 컸던 대처: ${helpfulCoping}`,
        `감정 기복(표준편차): ${emotionVariability.toFixed(1)} · 충동 기복(표준편차): ${urgeVariability.toFixed(1)} (숫자가 클수록 널뛰는 정도가 큼)`,
        `삶의 확장감과 만족도 평균: ${expansionAvgText} (하루 마무리 기록 ${rangeCheckins.length}건)`,
        "",
        `재발 신호 (${trendRangeLabel()}, 기록된 날 기준)`,
        `정서적 재발 신호 있었던 날: ${relapse.stage1Days}일`,
        `인지적 재발 신호 있었던 날: ${relapse.stage2Days}일`,
        `문제 행동이 기록된 날: ${relapse.stage3Days}일${relapse.stage3Dates.length ? ` (${relapse.stage3Dates.join(", ")})` : ""}`,
        "",
        "이번 주 점검 질문",
        "1. 위험 신호가 올라오기 전 가장 먼저 나타난 단서는 무엇이었나요?",
        "2. 충동을 행동으로 옮기지 않은 순간에 무엇이 도움이 되었나요?",
        "3. 다음 24시간 안에 가능한 가장 작은 가치 행동은 무엇인가요?"
      ].join("\n");
    }
    function trendSeriesData(totalDisplayDays = 14) {
      const displayDays = Math.max(1, Math.min(totalDisplayDays, TREND_DISPLAY_CAP));
      const days = Array.from({ length: displayDays }, (_, i) => {
        const d = daysAgo(displayDays - 1 - i);
        return dateToISO(d);
      });
      const observations = activeObservations();
      const logs = activeLogs();
      return days.map(day => {
        const dayObservations = observations.filter(o => sameRecordDate(o, day));
        const dayLogs = logs.filter(l => sameRecordDate(l, day));
        return {
          day,
          label: day.slice(5).replace("-", "/"),
          observation: avg(dayObservations, observationIntensity),
          practice: averageDailyLogScore(dayLogs),
          action: avg(dayObservations, o => Number(o.actionLevel) * 2),
          observationCount: dayObservations.length,
          logCount: dayLogs.length
        };
      });
    }
    function trendWidth(value, hasRecord) {
      const scoreWidth = Math.round(Math.max(0, Math.min(10, Number(value) || 0)) * 10);
      return hasRecord ? Math.max(6, scoreWidth) : 0;
    }
    function movingAverageSeries(windowSize = 7, displayDays = 14) {
      const totalDays = displayDays + windowSize - 1;
      const days = Array.from({ length: totalDays }, (_, i) => dateToISO(daysAgo(totalDays - 1 - i)));
      const observations = activeObservations();
      const logs = activeLogs();
      const daily = days.map(day => {
        const dayObservations = observations.filter(o => sameRecordDate(o, day));
        const dayLogs = logs.filter(l => sameRecordDate(l, day));
        return {
          day,
          observation: avg(dayObservations, observationIntensity),
          practice: averageDailyLogScore(dayLogs),
          action: avg(dayObservations, o => Number(o.actionLevel) * 2),
          hasObs: dayObservations.length > 0,
          hasLog: dayLogs.length > 0
        };
      });
      const result = [];
      for (let i = windowSize - 1; i < daily.length; i++) {
        const windowSlice = daily.slice(i - windowSize + 1, i + 1);
        const obsWindow = windowSlice.filter(d => d.hasObs);
        const logWindow = windowSlice.filter(d => d.hasLog);
        const current = daily[i];
        result.push({
          day: current.day,
          label: current.day.slice(5).replace("-", "/"),
          observation: obsWindow.length ? avg(obsWindow, d => d.observation) : 0,
          practice: logWindow.length ? avg(logWindow, d => d.practice) : 0,
          action: obsWindow.length ? avg(obsWindow, d => d.action) : 0,
          observationCount: obsWindow.length,
          logCount: logWindow.length
        });
      }
      return result;
    }
    function renderTrendMovingAverage() {
      const box = $("#trendMovingAverage");
      if (!box) return;
      const rangeDays = trendRangeDays();
      const windowSize = rangeDays <= 7 ? 3 : 7;
      const displayDays = Math.min(rangeDays, TREND_DISPLAY_CAP);
      const data = movingAverageSeries(windowSize, displayDays);
      const hasData = data.some(day => day.observationCount || day.logCount);
      if (!hasData) {
        box.innerHTML = `<div class="empty">아직 이동평균으로 볼 기록이 없습니다.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot obs"></i>관찰강도</span>
          <span><i class="legend-dot practice"></i>실천수행도</span>
          <span><i class="legend-dot action"></i>문제행동 활성화 수준</span>
        </div>
        <div class="trend-status">${windowSize}일 이동평균 (하루하루의 기복 대신 흐름을 봅니다)</div>
        <div class="trend-bar-list">
          ${data.map(day => `
            <div class="trend-day">
              <div class="trend-date">${escapeHtml(day.label)}</div>
              <div class="trend-bar-stack" aria-label="${escapeHtml(day.day)} ${windowSize}일 이동평균">
                <div class="trend-line obs" style="width:${trendWidth(day.observation, day.observationCount)}%"><span>${day.observationCount ? day.observation.toFixed(1) : ""}</span></div>
                <div class="trend-line practice" style="width:${trendWidth(day.practice, day.logCount)}%"><span>${day.logCount ? day.practice.toFixed(1) : ""}</span></div>
                <div class="trend-line action" style="width:${trendWidth(day.action, day.observationCount)}%"><span>${day.observationCount ? day.action.toFixed(1) : ""}</span></div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    function renderTrendBars() {
      const box = $("#trendBars");
      if (!box) return;
      const rangeDays = trendRangeDays();
      const data = trendSeriesData(rangeDays);
      const hasData = data.some(day => day.observationCount || day.logCount);
      if (!hasData) {
        box.innerHTML = `<div class="empty">아직 그래프로 볼 관찰 또는 실천 기록이 없습니다.</div>`;
        return;
      }
      const capped = rangeDays > TREND_DISPLAY_CAP;
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot obs"></i>관찰강도</span>
          <span><i class="legend-dot practice"></i>실천수행도</span>
          <span><i class="legend-dot action"></i>문제행동 활성화 수준</span>
        </div>
        <div class="trend-status">${escapeHtml(trendRangeLabel())}${capped ? ` 중 최근 ${TREND_DISPLAY_CAP}일` : ""}: 관찰 ${data.reduce((sum, day) => sum + day.observationCount, 0)}건, 실천 ${data.reduce((sum, day) => sum + day.logCount, 0)}건</div>
        <div class="trend-bar-list">
          ${data.map(day => `
            <div class="trend-day">
              <div class="trend-date">${escapeHtml(day.label)}</div>
              <div class="trend-bar-stack" aria-label="${escapeHtml(day.day)} 추세">
                <div class="trend-line obs" style="width:${trendWidth(day.observation, day.observationCount)}%"><span>${day.observationCount ? `${day.observation.toFixed(1)} · ${day.observationCount}건` : ""}</span></div>
                <div class="trend-line practice" style="width:${trendWidth(day.practice, day.logCount)}%"><span>${day.logCount ? `${day.practice.toFixed(1)} · ${day.logCount}건` : ""}</span></div>
                <div class="trend-line action" style="width:${trendWidth(day.action, day.observationCount)}%"><span>${day.observationCount ? day.action.toFixed(1) : ""}</span></div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    function trendLineChartSvg(trendData) {
      const width = 600;
      const height = 260;
      const padLeft = 34;
      const padRight = 12;
      const padTop = 16;
      const padBottom = 24;
      const plotWidth = width - padLeft - padRight;
      const plotHeight = height - padTop - padBottom;
      const n = trendData.length;
      const scaleX = i => padLeft + (n <= 1 ? 0 : (i / (n - 1)) * plotWidth);
      const scaleY = v => padTop + plotHeight - (clampNumber(v, 0, 10, 0) / 10) * plotHeight;
      const gridLines = [0, 2, 4, 6, 8, 10].map(t => {
        const y = scaleY(t).toFixed(1);
        return `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="4" y="${Number(y) + 4}" font-size="10" fill="#64736d">${t}</text>`;
      }).join("");
      const seriesMarkup = (values, color, counts) => {
        const points = values.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");
        const circles = values.map((v, i) => {
          const hasRecord = Number(counts[i] || 0) > 0;
          const r = hasRecord ? 4 : 2;
          const stroke = hasRecord ? `stroke="#ffffff" stroke-width="1.5"` : "";
          return `<circle cx="${scaleX(i).toFixed(1)}" cy="${scaleY(v).toFixed(1)}" r="${r}" fill="${color}" ${stroke}/>`;
        }).join("");
        return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>${circles}`;
      };
      const obsSeries = trendData.map(d => d.observation);
      const logSeries = trendData.map(d => d.practice);
      const actionSeries = trendData.map(d => d.action);
      const obsCounts = trendData.map(d => d.observationCount);
      const logCounts = trendData.map(d => d.logCount);
      const totalObservations = obsCounts.reduce((sum, count) => sum + count, 0);
      const totalLogs = logCounts.reduce((sum, count) => sum + count, 0);
      const svg = `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;" role="img" aria-label="관찰·실천·문제행동 활성화 수준 추세 그래프">
          ${gridLines}
          ${seriesMarkup(obsSeries, "#2f7567", obsCounts)}
          ${seriesMarkup(logSeries, "#c1842f", logCounts)}
          ${seriesMarkup(actionSeries, "#b64a45", obsCounts)}
        </svg>
      `;
      return { svg, totalObservations, totalLogs };
    }
    function renderTrendLineChart() {
      const box = $("#trendLineChart");
      if (!box) return;
      const trendData = trendSeriesData(trendRangeDays());
      const hasData = trendData.some(day => day.observationCount || day.logCount);
      if (!hasData) {
        box.innerHTML = `<div class="empty">아직 그래프로 볼 관찰 또는 실천 기록이 없습니다.</div>`;
        return;
      }
      const { svg, totalObservations, totalLogs } = trendLineChartSvg(trendData);
      box.innerHTML = `
        <div class="trend-legend">
          <span><i class="legend-dot obs"></i>관찰강도</span>
          <span><i class="legend-dot practice"></i>실천수행도</span>
          <span><i class="legend-dot action"></i>문제행동 활성화 수준</span>
        </div>
        <div class="chart-wrap">${svg}</div>
        <div class="trend-status">${escapeHtml(trendRangeLabel())} 관찰 ${totalObservations}건 · 실천 ${totalLogs}건</div>
      `;
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
      const triggersSeen = observations.flatMap(o => compactList([...(Array.isArray(o.triggerPlaces) ? o.triggerPlaces : []), ...(Array.isArray(o.triggerPeople) ? o.triggerPeople : []), ...(Array.isArray(o.triggerTimes) ? o.triggerTimes : []), ...(Array.isArray(o.triggerCustom) ? o.triggerCustom : [])]));
      const avoidanceSeen = observations.flatMap(o => compactList([...(Array.isArray(o.avoidanceTags) ? o.avoidanceTags : []), ...(Array.isArray(o.avoidanceCustom) ? o.avoidanceCustom : [])]));
      const relapse = relapseSummaryForRange(observations);
      const emotionVariability = stdDev(observations.map(o => Number(o.emotionScore)));
      const urgeVariability = stdDev(observations.map(o => Number(o.urgeScore)));
      const periodDays = state.shareRange === "all" ? null : Number(state.shareRange);
      const recordedObsDays = new Set(observations.map(o => o.date)).size;
      const recordedLogDays = new Set(logs.map(l => l.date)).size;
      const engagementStreak = engagementStreakDays();
      const rangeCheckins = rangeRecords(activeDailyCheckins());
      const expansionAvg = rangeCheckins.length ? avg(rangeCheckins, c => Number(c.expansionScore)) : null;
      const keySummary = [
        "핵심 요약:",
        `- 이번 기간 가장 높았던 위험 신호: ${highRisk.length}건`,
        `- 가장 많이 선택한 가치: ${topValues}`,
        `- 실천행동 평균 수행도: ${averageDailyLogScore(logs).toFixed(1)}점`,
        `- 삶의 확장감과 만족도 평균: ${expansionAvg !== null ? expansionAvg.toFixed(1) + "점" : "기록 없음"}`,
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
          `삶의 확장감과 만족도 평균: ${expansionAvg !== null ? expansionAvg.toFixed(1) + "점" : "기록 없음"}`,
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
        `감정 기복(표준편차): ${emotionVariability.toFixed(1)} · 충동 기복(표준편차): ${urgeVariability.toFixed(1)}`,
        `문제행동 활성화 수준 평균: ${avg(observations, o => Number(o.actionLevel)).toFixed(1)}점 / 5점`,
        `삶의 확장감과 만족도 평균: ${expansionAvg !== null ? expansionAvg.toFixed(1) + "점" : "기록 없음"} (하루 마무리 기록 ${rangeCheckins.length}건)`,
        `고위험 신호: ${highRisk.length}건`,
        `충동이 높았지만 행동화하지 않은 기록: ${resisted.length}건`,
        `실천 평균 수행도: ${averageDailyLogScore(logs).toFixed(1)}점`,
        `반복 방해요인: ${barrierText}`,
        `도움이 된 대처행동: ${helpful}`,
        `자주 나온 촉발 단서: ${topItems(triggersSeen)}`,
        `자주 나온 회피 신호: ${topItems(avoidanceSeen)}`,
        "",
        "참여도 (기록 자체를 이어가고 있는지 확인):",
        `- 관찰 기록한 날: ${recordedObsDays}일${periodDays ? ` / ${periodDays}일 중` : ""}`,
        `- 실천 기록한 날: ${recordedLogDays}일${periodDays ? ` / ${periodDays}일 중` : ""}`,
        `- 현재 연속 기록일수(관찰 또는 실천, 오늘까지): ${engagementStreak ?? 0}일`,
        "",
        "재발 신호 요약 (해당 기간, 기록된 날 기준):",
        `- 정서적 재발 신호가 있었던 날: ${relapse.stage1Days}일 / ${relapse.totalDays}일 중`,
        `- 인지적 재발 신호가 있었던 날: ${relapse.stage2Days}일 / ${relapse.totalDays}일 중`,
        `- 문제 행동이 기록된 날: ${relapse.stage3Days}일${relapse.stage3Dates.length ? ` (${relapse.stage3Dates.join(", ")})` : ""}`,
        `- 그중 즉시 개입이 필요한 수준(문제행동 활성화 수준 ${RELAPSE_ACTION_SEVERE}점 이상): ${relapse.stage3SevereDays}일`,
        "",
        "다음 상담 질문:",
        "1. 실천행동의 30% 버전이 충분히 작았는지 점검하기",
        "2. 고위험 시간대와 방해요인을 더 구체적으로 조정하기",
        "3. 선택한 가치가 실제 행동으로 이어지는지 확인하기",
        "4. 정서적·인지적 재발 신호가 있었던 날, 어떤 자기관리 조치를 시도했는지 확인하기",
        "5. 기록한 날이 줄어드는 시기가 있었다면, 그 시기에 무슨 일이 있었는지 확인하기"
      ].join("\n");
    }
    function rangeLabel() {
      if (state.shareRange === "all") return "전체";
      return `최근 ${Number(state.shareRange) === 7 ? "1주" : Number(state.shareRange) === 14 ? "2주" : "4주"}`;
    }
    function rangeDaysValue() {
      return state.shareRange === "all" ? "all" : Number(state.shareRange);
    }
    function buildCsv(options = {}) {
      const fullBackup = options.fullBackup === true;
      const summary = buildSummary("counselorDetail");
      const observations = fullBackup ? state.data.observations.slice() : rangeRecords(activeObservations());
      const logs = fullBackup ? state.data.logs.slice() : rangeRecords(activeLogs());
      const exportedAt = new Date().toISOString();
      const clientAlias = state.data.settings.alias || "";
      const csvShareMode = fullBackup ? "backup_full" : "counselor_full";
      const header = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];
      const rows = [header];
      const addRow = (type, id, date, updatedAt, payload) => {
        rows.push([
          CSV_SCHEMA_VERSION,
          type,
          id || "",
          date || "",
          updatedAt || "",
          exportedAt,
          clientAlias,
          csvShareMode,
          fullBackup ? "all" : rangeDaysValue(),
          JSON.stringify(payload)
        ]);
      };

      observations.forEach(o => {
        const problemLabels = Array.isArray(o.problemLabels) && o.problemLabels.length ? o.problemLabels : (Array.isArray(o.behaviorAreas) ? o.behaviorAreas : splitBehaviorCustom(o.behavior || ""));
        addRow("observation", o.id, o.date, o.updatedAt, payloadForExport(o, {
          time_slot: o.mode || "",
          problem_labels: problemLabels,
          problem_domain: normalizeProblemDomain(o.problemDomain || defaultProblemDomainForLabels(problemLabels)),
          behavior_areas: problemLabels,
          behavior_custom_areas: Array.isArray(o.behaviorCustomAreas) ? o.behaviorCustomAreas : [],
          emotion: o.emotion || "",
          emotion_custom: compactList([o.emotionCustom]),
          body_reactions: Array.isArray(o.body) ? o.body : [],
          body_custom: compactList([o.bodyCustom]),
          situation: o.situation || "",
          trigger_places: Array.isArray(o.triggerPlaces) ? o.triggerPlaces : [],
          trigger_people: Array.isArray(o.triggerPeople) ? o.triggerPeople : [],
          trigger_times: Array.isArray(o.triggerTimes) ? o.triggerTimes : [],
          trigger_custom: Array.isArray(o.triggerCustom) ? o.triggerCustom : [],
          avoidance_tags: Array.isArray(o.avoidanceTags) ? o.avoidanceTags : [],
          avoidance_custom: Array.isArray(o.avoidanceCustom) ? o.avoidanceCustom : [],
          thought_text: o.thoughtText || "",
          thought_score: o.thoughtScore ?? 0,
          emotion_score: o.emotionScore ?? 0,
          urge_score: o.urgeScore ?? 0,
          urge_initial_score: o.urgeInitialScore ?? "",
          urge_end_score: o.urgeEndScore ?? "",
          action_level: o.actionLevel ?? 0,
          coping: o.coping || "",
          coping_score: o.copingScore ?? 0,
          gratitude: o.gratitude || "",
          insight: o.insight || "",
          value: o.value || "",
          value_action_draft: o.valueActionDraft || "",
          archived: Boolean(o.archived)
        }));
      });

      state.data.practices.forEach(p => {
        addRow("practice_definition", p.id, "", p.updatedAt, payloadForExport(p, {
          practice_value: p.value || "",
          practice_name: p.name || "",
          practice_reason: p.reason || "",
          frequency: p.frequency || "daily",
          target_count: targetCount(p),
          custom_days: Array.isArray(p.customDays) ? p.customDays : [],
          reminder_mode: p.reminderMode || "morning",
          reminder_times: compactList(String(p.reminderTimes || "").split(",")),
          start_date: p.startDate || "",
          barriers: p.barriers || "",
          small_version: p.smallVersion || "",
          archived: Boolean(p.archived)
        }));
      });

      logs.forEach(l => {
        const p = state.data.practices.find(x => x.id === l.practiceId) || {};
        addRow("practice_log", l.id, l.date, l.updatedAt, payloadForExport(l, {
          practice_id: l.practiceId || "",
          practice_value: p.value || "",
          practice_name: p.name || "",
          target_count: targetCount(p),
          pleasure_score: l.pleasureScore ?? 0,
          mastery_score: l.masteryScore ?? 0,
          expected_pleasure_score: l.expectedPleasureScore ?? "",
          expected_mastery_score: l.expectedMasteryScore ?? "",
          practice_note: l.note || "",
          archived: Boolean(l.archived)
        }));
      });

      const predictions = fullBackup ? (state.data.predictions || []).slice() : rangeRecords(activePredictions());
      predictions.forEach(pr => {
        addRow("prediction", pr.id, pr.date, pr.updatedAt, payloadForExport(pr, {
          related_observation_id: pr.relatedObservationId || "",
          worry_text: pr.worryText || "",
          predicted_severity: pr.predictedSeverity ?? 5,
          status: pr.status || "pending",
          actual_severity: pr.actualSeverity ?? "",
          resolved_at: pr.resolvedAt || "",
          note: pr.note || "",
          archived: Boolean(pr.archived)
        }));
      });

      const dailyCheckins = fullBackup ? (state.data.dailyCheckins || []).slice() : rangeRecords(activeDailyCheckins());
      dailyCheckins.forEach(c => {
        addRow("daily_checkin", c.id, c.date, c.updatedAt, payloadForExport(c, {
          expansion_score: c.expansionScore ?? 5,
          note: c.note || "",
          archived: Boolean(c.archived)
        }));
      });

      const happiness = normalizeHappiness(state.data.csvInterop && state.data.csvInterop.happiness);
      const fallback = state.data.csvInterop && state.data.csvInterop.fallbackRecord;
      if (rows.length === 1 && Object.keys(happiness).length && fallback && CSV_RECORD_TYPES.includes(fallback.recordType)) {
        addRow(fallback.recordType, fallback.id, fallback.date, fallback.updatedAt, normalizePreservedPayload(fallback.payload));
      }
      if (rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        const lastPayload = JSON.parse(lastRow[9] || "{}");
        lastRow[9] = JSON.stringify({ ...lastPayload, ...happiness });
      }

      const csv = rows.map(row => row.map(escapeCsv).join(",")).join("\n");
      const nameMode = fullBackup ? "전체백업" : "상담자치료자료";
      const nameRange = fullBackup ? "전체" : rangeLabel();
      return { csv, blob: new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), fileName: `마음고요_관찰과실천_${nameMode}_${nameRange}_${todayISO()}.csv`, summary };
    }
    function verifyCurrentCsv() {
      const { csv } = buildCsv();
      const parsedRows = parseCsv(csv);
      const validation = validateCsvRows(parsedRows);
      const header = parsedRows[0] || [];
      const rows = parsedRows.slice(1);
      const report = {
        ok: validation.errors.length === 0,
        messages: validation.errors.slice(),
        counts: { observation: 0, practice_definition: 0, practice_log: 0, prediction: 0, daily_checkin: 0 }
      };
      const index = {};
      header.forEach((name, i) => index[name] = i);
      if (!("record_type" in index) || !("id" in index) || !("payload_json" in index) || !("date" in index)) return report;
      const payloadOf = (row, rowIndex) => {
        try {
          return JSON.parse(row[index.payload_json] || "{}");
        } catch {
          report.ok = false;
          report.messages.push(`${rowIndex + 2}행의 payload_json을 읽지 못했습니다.`);
          return {};
        }
      };
      rows.forEach((row, rowIndex) => {
        payloadOf(row, rowIndex);
        const type = row[index.record_type];
        if (type in report.counts) report.counts[type] += 1;
      });
      const expected = {
        observation: rangeRecords(activeObservations()).length,
        practice_definition: state.data.practices.length,
        practice_log: rangeRecords(activeLogs()).length,
        prediction: rangeRecords(activePredictions()).length,
        daily_checkin: rangeRecords(activeDailyCheckins()).length
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
        const payload = payloadOf(row, 0);
        if (row[index.date] !== record.date || Number(payload.urge_score) !== Number(record.urgeScore)) {
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
        const payload = payloadOf(row, 0);
        if (payload.practice_name !== (record.name || "") || payload.practice_value !== (record.value || "")) {
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
        const payload = payloadOf(row, 0);
        if (row[index.date] !== record.date || Number(payload.pleasure_score) !== Number(record.pleasureScore) || Number(payload.mastery_score) !== Number(record.masteryScore)) {
          report.ok = false;
          report.messages.push(`수행 기록 값 불일치: ${record.date}`);
        }
      });
      return report;
    }
    function renderCsvVerification() {
      const report = verifyCurrentCsv();
      const countText = `관찰 ${report.counts.observation}개, 실천행동 ${report.counts.practice_definition}개, 수행도 ${report.counts.practice_log}개, 걱정기록 ${report.counts.prediction}개, 하루마무리 ${report.counts.daily_checkin}개`;
      $("#shareInfo").textContent = report.ok
        ? `상담자 CSV 구조 점검 통과: ${countText}. 현재 범위의 상담자 치료자료를 다시 읽을 수 있는 구조입니다.`
        : `상담자 CSV 구조 점검 필요: ${report.messages.slice(0, 3).join(" / ")}`;
      showToast(report.ok ? "상담자 CSV 구조 점검을 통과했습니다." : "CSV 구조를 다시 확인해주세요.");
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
      if (quoted) throw new Error("닫히지 않은 CSV 따옴표가 있습니다.");
      row.push(cell);
      rows.push(row);
      return rows.filter(r => r.some(c => String(c).trim()));
    }
    function validateCsvRows(rows) {
      const errors = [];
      const warnings = [];
      const header = rows[0] || [];
      const required = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];
      if (header.length !== required.length || required.some((name, i) => header[i] !== name)) {
        errors.push("첫 행은 현재 규격의 10개 열과 순서가 정확히 일치해야 합니다.");
        return { errors, warnings };
      }
        const allowedTypes = new Set(CSV_RECORD_TYPES);
      const validDate = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const parsed = new Date(value + "T00:00:00Z");
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      };
      const ids = new Set();
      const dailyDates = new Set();
      const numberInRange = (value, min, max) => {
        if (value === "" || value === null || value === undefined) return false;
        const number = Number(value);
        return !Number.isNaN(number) && number >= min && number <= max;
      };
      const optionalNumberInRange = (value, min, max) => {
        if (value === "" || value === null || value === undefined) return true;
        return numberInRange(value, min, max);
      };
      const expectArray = (payload, key, line) => {
        if (!(key in payload)) { errors.push(`${line}행: ${key} 필드가 없습니다.`); return; }
        if (!Array.isArray(payload[key])) errors.push(`${line}행: ${key}는 배열이어야 합니다.`);
      };
      const expectString = (payload, key, line) => {
        if (!(key in payload)) { errors.push(`${line}행: ${key} 필드가 없습니다.`); return; }
        if (typeof payload[key] !== "string") errors.push(`${line}행: ${key}는 문자열이어야 합니다.`);
      };
      const expectBoolean = (payload, key, line) => {
        if (!(key in payload)) { errors.push(`${line}행: ${key} 필드가 없습니다.`); return; }
        if (typeof payload[key] !== "boolean") errors.push(`${line}행: ${key}는 true/false 값이어야 합니다.`);
      };
      rows.slice(1).forEach((row, offset) => {
        const line = offset + 2;
        if (row.length !== required.length) { errors.push(`${line}행: 열 개수가 ${required.length}개가 아닙니다.`); return; }
        const [version, type, id, date, updatedAt, exportedAt, , shareMode, rangeDays, payloadText] = row;
        if (version !== CSV_SCHEMA_VERSION) errors.push(`${line}행: 지원하지 않는 schema_version입니다.`);
        if (!allowedTypes.has(type)) errors.push(`${line}행: 알 수 없는 record_type입니다.`);
        if (!id) errors.push(`${line}행: id가 비어 있습니다.`);
        const idKey = `${type}\u0000${id}`;
        if (ids.has(idKey)) errors.push(`${line}행: 같은 record_type 안에 중복 id가 있습니다.`);
        ids.add(idKey);
        if (type !== "practice_definition" && !validDate(date)) errors.push(`${line}행: date가 유효한 YYYY-MM-DD 날짜가 아닙니다.`);
        if (type === "practice_definition" && date !== "") errors.push(`${line}행: practice_definition의 date는 빈 값이어야 합니다.`);
        if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) errors.push(`${line}행: updated_at이 올바르지 않습니다.`);
        if (!exportedAt || Number.isNaN(Date.parse(exportedAt))) errors.push(`${line}행: exported_at이 올바르지 않습니다.`);
        if (!["counselor_full", "backup_full"].includes(shareMode)) errors.push(`${line}행: share_mode가 올바르지 않습니다.`);
        if (!(rangeDays === "all" || [7, 14, 28].includes(Number(rangeDays)))) errors.push(`${line}행: range_days가 올바르지 않습니다.`);
        let payload = {};
        try {
          payload = JSON.parse(payloadText || "{}");
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) errors.push(`${line}행: payload_json은 JSON 객체여야 합니다.`);
        } catch {
          errors.push(`${line}행: payload_json을 읽을 수 없습니다.`);
          payload = null;
        }
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          HAPPINESS_FIELDS.forEach(key => {
            if (key in payload && !(Number.isInteger(payload[key]) && payload[key] >= 0 && payload[key] <= 100)) {
              warnings.push(`${line}행: ${key}는 0-100 범위 정수가 아니어서 무시됩니다.`);
            }
          });
          if (type === "observation") {
            ["behavior_areas", "behavior_custom_areas", "emotion_custom", "body_reactions", "body_custom", "trigger_places", "trigger_people", "trigger_times", "trigger_custom", "avoidance_tags", "avoidance_custom"].forEach(key => expectArray(payload, key, line));
            if ("problem_labels" in payload) expectArray(payload, "problem_labels", line);
            ["time_slot", "emotion", "situation", "thought_text", "coping", "gratitude", "insight", "value", "value_action_draft"].forEach(key => expectString(payload, key, line));
            if ("problem_domain" in payload) expectString(payload, "problem_domain", line);
            expectBoolean(payload, "archived", line);
            [["thought_score", 0, 10], ["emotion_score", 0, 10], ["urge_score", 0, 10], ["action_level", 0, 5], ["coping_score", 0, 10]].forEach(([key, min, max]) => {
              if (!numberInRange(payload[key], min, max)) errors.push(`${line}행: ${key}는 ${min}-${max} 범위 숫자여야 합니다.`);
            });
            [["urge_initial_score", 0, 10], ["urge_end_score", 0, 10]].forEach(([key, min, max]) => {
              if (!optionalNumberInRange(payload[key], min, max)) errors.push(`${line}행: ${key}는 비어 있거나 ${min}-${max} 범위 숫자여야 합니다.`);
            });
          }
          if (type === "practice_definition") {
            ["practice_value", "practice_name", "practice_reason", "start_date", "barriers", "small_version"].forEach(key => expectString(payload, key, line));
            expectArray(payload, "custom_days", line);
            expectArray(payload, "reminder_times", line);
            expectBoolean(payload, "archived", line);
            if (!["daily", "3week", "1week", "custom"].includes(payload.frequency)) errors.push(`${line}행: frequency 값이 올바르지 않습니다.`);
            if (!["morning", "times", "none"].includes(payload.reminder_mode)) errors.push(`${line}행: reminder_mode 값이 올바르지 않습니다.`);
            if (!numberInRange(payload.target_count, 1, 12)) errors.push(`${line}행: target_count는 1-12 범위 숫자여야 합니다.`);
          }
          if (type === "practice_log") {
            ["practice_id", "practice_value", "practice_name", "practice_note"].forEach(key => expectString(payload, key, line));
            expectBoolean(payload, "archived", line);
            if (!payload.practice_id) errors.push(`${line}행: practice_log에는 practice_id가 필요합니다.`);
            [["target_count", 1, 12], ["pleasure_score", 0, 10], ["mastery_score", 0, 10]].forEach(([key, min, max]) => {
              if (!numberInRange(payload[key], min, max)) errors.push(`${line}행: ${key}는 ${min}-${max} 범위 숫자여야 합니다.`);
            });
            [["expected_pleasure_score", 0, 10], ["expected_mastery_score", 0, 10]].forEach(([key, min, max]) => {
              if (!optionalNumberInRange(payload[key], min, max)) errors.push(`${line}행: ${key}는 비어 있거나 ${min}-${max} 범위 숫자여야 합니다.`);
            });
          }
          if (type === "prediction") {
            ["related_observation_id", "worry_text", "status", "resolved_at", "note"].forEach(key => expectString(payload, key, line));
            expectBoolean(payload, "archived", line);
            if (!numberInRange(payload.predicted_severity, 0, 10)) errors.push(`${line}행: predicted_severity는 0-10 범위 숫자여야 합니다.`);
            if (!optionalNumberInRange(payload.actual_severity, 0, 10)) errors.push(`${line}행: actual_severity는 비어 있거나 0-10 범위 숫자여야 합니다.`);
            if (!PREDICTION_STATUSES.includes(payload.status)) errors.push(`${line}행: prediction status 값이 올바르지 않습니다.`);
          }
          if (type === "daily_checkin") {
            expectString(payload, "note", line);
            expectBoolean(payload, "archived", line);
            if (!numberInRange(payload.expansion_score, 0, 10)) errors.push(`${line}행: expansion_score는 0-10 범위 숫자여야 합니다.`);
          }
        }
        if (type === "daily_checkin") {
          if (dailyDates.has(date)) errors.push(`${line}행: 같은 날짜의 daily_checkin이 중복되었습니다.`);
          dailyDates.add(date);
        }
      });
      return { errors, warnings };
    }
    function shouldUpsert(existing, newUpdatedAt) {
      if (!existing) return true;
      const newTime = Date.parse(newUpdatedAt || "");
      if (Number.isNaN(newTime)) return false;
      const existingTime = Date.parse(existing.updatedAt || "");
      if (Number.isNaN(existingTime)) return true;
      return newTime > existingTime;
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
        if (rows.length - 1 > MAX_IMPORT_ROWS) {
          $("#importInfo").textContent = "CSV 행이 너무 많습니다. 5,000행 이하의 파일만 가져올 수 있습니다.";
          showToast("CSV 행 수를 줄여주세요.");
          return;
        }
        const validation = validateCsvRows(rows);
        if (validation.errors.length) {
          $("#importInfo").textContent = `가져오기를 중단했습니다. 오류 ${validation.errors.length}개: ${validation.errors.slice(0, 3).join(" / ")}`;
          showToast("CSV 오류를 먼저 수정해주세요.");
          return;
        }
        const header = rows.shift() || [];
        const index = {};
        header.forEach((name, i) => index[name] = i);
        const requiredColumns = ["schema_version", "record_type", "id", "date", "updated_at", "exported_at", "client_alias", "share_mode", "range_days", "payload_json"];
        const missingColumns = requiredColumns.filter(name => !(name in index));
        if (missingColumns.length) {
          $("#importInfo").textContent = `CSV 필수 항목이 빠져 있습니다: ${missingColumns.join(", ")}`;
          showToast("CSV 구조를 확인해주세요.");
          return;
        }
        const cell = (row, name) => row[index[name]] ?? "";
        const stats = {
          observation: { added: 0, updated: 0 },
          practice_definition: { added: 0, updated: 0 },
          practice_log: { added: 0, updated: 0 },
          prediction: { added: 0, updated: 0 },
          daily_checkin: { added: 0, updated: 0 }
        };
        const dataBeforeImport = JSON.parse(JSON.stringify(state.data));
        const lastSourceRow = rows[rows.length - 1] || [];
        let lastSourcePayload = {};
        try {
          lastSourcePayload = JSON.parse(cell(lastSourceRow, "payload_json") || "{}");
        } catch {
          lastSourcePayload = {};
        }
        state.data.csvInterop = {
          happiness: happinessFromLastCsvRows(rows, index.payload_json),
          fallbackRecord: {
            recordType: cell(lastSourceRow, "record_type"),
            id: cell(lastSourceRow, "id"),
            date: cell(lastSourceRow, "date"),
            updatedAt: cell(lastSourceRow, "updated_at"),
            payload: normalizePreservedPayload(lastSourcePayload)
          }
        };
        const restoredHappinessCount = Object.keys(state.data.csvInterop.happiness).length;
        rows.forEach(row => {
          if (cell(row, "schema_version") !== CSV_SCHEMA_VERSION) return;
          const type = cell(row, "record_type");
          let payload = {};
          try {
            payload = JSON.parse(cell(row, "payload_json") || "{}");
          } catch {
            return;
          }
          if (type === "observation") {
            const id = cell(row, "id") || uid();
            const updatedAt = cell(row, "updated_at") || new Date().toISOString();
            const existingIndex = state.data.observations.findIndex(o => o.id === id);
            const existing = existingIndex >= 0 ? state.data.observations[existingIndex] : null;
            if (!shouldUpsert(existing, updatedAt)) return;
            const problemLabels = Array.isArray(payload.problem_labels) && payload.problem_labels.length ? payload.problem_labels : (Array.isArray(payload.behavior_areas) ? payload.behavior_areas : splitBehaviorCustom(payload.behavior_areas));
            const behaviorAreas = problemLabels;
            const behaviorCustomAreas = Array.isArray(payload.behavior_custom_areas) ? payload.behavior_custom_areas : splitBehaviorCustom(payload.behavior_custom_areas);
            const record = {
              _payloadJson: normalizePreservedPayload(payload),
              id,
              date: cleanDate(cell(row, "date") || todayISO()),
              mode: cleanText(payload.time_slot || "가져오기", TEXT_LIMITS.short),
              behavior: behaviorAreas.join(", "),
              problemLabels,
              problemDomain: normalizeProblemDomain(payload.problem_domain || defaultProblemDomainForLabels(problemLabels)),
              behaviorAreas,
              behaviorCustomAreas,
              situation: cleanMultiline(payload.situation, TEXT_LIMITS.long),
              triggerPlaces: Array.isArray(payload.trigger_places) ? payload.trigger_places : [],
              triggerPeople: Array.isArray(payload.trigger_people) ? payload.trigger_people : [],
              triggerTimes: Array.isArray(payload.trigger_times) ? payload.trigger_times : [],
              triggerCustom: Array.isArray(payload.trigger_custom) ? payload.trigger_custom : [],
              avoidanceTags: Array.isArray(payload.avoidance_tags) ? payload.avoidance_tags : [],
              avoidanceCustom: Array.isArray(payload.avoidance_custom) ? payload.avoidance_custom : [],
              thoughtText: cleanMultiline(payload.thought_text, TEXT_LIMITS.long),
              emotion: cleanText(payload.emotion, TEXT_LIMITS.short),
              emotionCustom: cleanText(Array.isArray(payload.emotion_custom) ? payload.emotion_custom.join(", ") : payload.emotion_custom, 10),
              body: Array.isArray(payload.body_reactions) ? payload.body_reactions : splitBehaviorCustom(String(payload.body_reactions || "").replace(/;/g, ",")),
              bodyCustom: cleanText(Array.isArray(payload.body_custom) ? payload.body_custom.join(", ") : payload.body_custom, 10),
              thoughtScore: clampNumber(payload.thought_score, 0, 10, 0),
              emotionScore: clampNumber(payload.emotion_score, 0, 10, 0),
              urgeScore: clampNumber(payload.urge_score, 0, 10, 0),
              urgeInitialScore: optionalScore(payload.urge_initial_score),
              urgeEndScore: optionalScore(payload.urge_end_score),
              actionLevel: clampNumber(payload.action_level, 0, 5, 0),
              coping: cleanMultiline(payload.coping, TEXT_LIMITS.long),
              copingScore: clampNumber(payload.coping_score, 0, 10, 0),
              gratitude: cleanMultiline(payload.gratitude, TEXT_LIMITS.medium),
              insight: cleanMultiline(payload.insight, TEXT_LIMITS.reflection),
              value: cleanText(payload.value, TEXT_LIMITS.short),
              valueActionDraft: cleanMultiline(payload.value_action_draft, TEXT_LIMITS.medium),
              archived: boolFlag(payload.archived),
              updatedAt
            };
            if (existingIndex >= 0) { state.data.observations[existingIndex] = record; stats.observation.updated++; }
            else { state.data.observations.push(record); stats.observation.added++; }
          }
          if (type === "practice_definition") {
            const id = cell(row, "id") || uid();
            const updatedAt = cell(row, "updated_at") || new Date().toISOString();
            const existingIndex = state.data.practices.findIndex(p => p.id === id);
            const existing = existingIndex >= 0 ? state.data.practices[existingIndex] : null;
            if (!shouldUpsert(existing, updatedAt)) return;
            const record = {
              _payloadJson: normalizePreservedPayload(payload),
              id,
              value: cleanText(payload.practice_value, TEXT_LIMITS.short),
              name: cleanMultiline(payload.practice_name, TEXT_LIMITS.medium),
              reason: cleanMultiline(payload.practice_reason, TEXT_LIMITS.long),
              frequency: payload.frequency || "daily",
              customDays: Array.isArray(payload.custom_days) ? payload.custom_days.map(Number).filter(n => !Number.isNaN(n)) : String(payload.custom_days || "").split(";").map(Number).filter(n => !Number.isNaN(n)),
              targetCount: clampNumber(payload.target_count, 1, 12, 1),
              reminderMode: payload.reminder_mode || "morning",
              reminderTimes: cleanTimeList(Array.isArray(payload.reminder_times) ? payload.reminder_times.join(", ") : payload.reminder_times),
              startDate: cleanDate(payload.start_date || todayISO()),
              barriers: cleanMultiline(payload.barriers, TEXT_LIMITS.long),
              smallVersion: cleanMultiline(payload.small_version, TEXT_LIMITS.medium),
              archived: boolFlag(payload.archived),
              updatedAt
            };
            if (existingIndex >= 0) { state.data.practices[existingIndex] = record; stats.practice_definition.updated++; }
            else { state.data.practices.push(record); stats.practice_definition.added++; }
          }
          if (type === "practice_log") {
            const id = cell(row, "id") || uid();
            const updatedAt = cell(row, "updated_at") || new Date().toISOString();
            const existingIndex = state.data.logs.findIndex(log => log.id === id);
            const existing = existingIndex >= 0 ? state.data.logs[existingIndex] : null;
            if (!shouldUpsert(existing, updatedAt)) return;
            const practiceId = payload.practice_id || "";
            if (practiceId && !state.data.practices.some(p => p.id === practiceId)) {
              state.data.practices.push({
                _payloadJson: {},
                id: practiceId,
                value: cleanText(payload.practice_value, TEXT_LIMITS.short),
                name: cleanMultiline(payload.practice_name, TEXT_LIMITS.medium),
                reason: "CSV에서 가져온 실천행동",
                frequency: "daily",
                customDays: [],
                targetCount: clampNumber(payload.target_count, 1, 12, 1),
                reminderMode: "morning",
                reminderTimes: "",
                startDate: cleanDate(cell(row, "date") || todayISO()),
                barriers: "",
                smallVersion: "",
                archived: false,
                updatedAt: new Date().toISOString()
              });
            }
            const pleasureScore = clampNumber(payload.pleasure_score, 0, 10, 0);
            const masteryScore = clampNumber(payload.mastery_score, 0, 10, 0);
            const record = {
              _payloadJson: normalizePreservedPayload(payload),
              id,
              practiceId,
              date: cleanDate(cell(row, "date") || todayISO()),
              score: Math.round((pleasureScore + masteryScore) / 2),
              pleasureScore,
              masteryScore,
              expectedPleasureScore: optionalScore(payload.expected_pleasure_score),
              expectedMasteryScore: optionalScore(payload.expected_mastery_score),
              note: cleanMultiline(payload.practice_note, TEXT_LIMITS.long),
              archived: boolFlag(payload.archived),
              updatedAt
            };
            if (existingIndex >= 0) { state.data.logs[existingIndex] = record; stats.practice_log.updated++; }
            else { state.data.logs.push(record); stats.practice_log.added++; }
          }
          if (type === "prediction") {
            const id = cell(row, "id") || uid();
            const updatedAt = cell(row, "updated_at") || new Date().toISOString();
            const existingIndex = state.data.predictions.findIndex(p => p.id === id);
            const existing = existingIndex >= 0 ? state.data.predictions[existingIndex] : null;
            if (!shouldUpsert(existing, updatedAt)) return;
            const record = {
              _payloadJson: normalizePreservedPayload(payload),
              id,
              date: cleanDate(cell(row, "date") || todayISO()),
              relatedObservationId: cleanText(payload.related_observation_id, TEXT_LIMITS.medium),
              worryText: cleanMultiline(payload.worry_text, TEXT_LIMITS.long),
              predictedSeverity: clampNumber(payload.predicted_severity, 0, 10, 5),
              status: PREDICTION_STATUSES.includes(payload.status) ? payload.status : "pending",
              actualSeverity: optionalScore(payload.actual_severity),
              resolvedAt: payload.resolved_at || "",
              note: cleanMultiline(payload.note, TEXT_LIMITS.medium),
              archived: boolFlag(payload.archived),
              updatedAt
            };
            if (existingIndex >= 0) { state.data.predictions[existingIndex] = record; stats.prediction.updated++; }
            else { state.data.predictions.push(record); stats.prediction.added++; }
          }
          if (type === "daily_checkin") {
            const importedId = cell(row, "id") || uid();
            const importedDate = cleanDate(cell(row, "date") || todayISO());
            const updatedAt = cell(row, "updated_at") || new Date().toISOString();
            const existingIndex = state.data.dailyCheckins.findIndex(c => c.id === importedId || c.date === importedDate);
            const existing = existingIndex >= 0 ? state.data.dailyCheckins[existingIndex] : null;
            if (!shouldUpsert(existing, updatedAt)) return;
            const id = existing ? existing.id : importedId;
            const record = {
              _payloadJson: normalizePreservedPayload(payload),
              id,
              date: importedDate,
              expansionScore: clampNumber(payload.expansion_score, 0, 10, 5),
              note: cleanMultiline(payload.note, TEXT_LIMITS.medium),
              archived: boolFlag(payload.archived),
              updatedAt
            };
            if (existingIndex >= 0) { state.data.dailyCheckins[existingIndex] = record; stats.daily_checkin.updated++; }
            else { state.data.dailyCheckins.push(record); stats.daily_checkin.added++; }
          }
        });
        if (!saveData()) {
          state.data = dataBeforeImport;
          return;
        }
        renderAll();
        $("#importInfo").textContent = `CSV를 가져왔습니다: 관찰 신규 ${stats.observation.added}개/갱신 ${stats.observation.updated}개, 실천행동 신규 ${stats.practice_definition.added}개/갱신 ${stats.practice_definition.updated}개, 수행도 신규 ${stats.practice_log.added}개/갱신 ${stats.practice_log.updated}개, 걱정기록 신규 ${stats.prediction.added}개/갱신 ${stats.prediction.updated}개, 하루마무리 신규 ${stats.daily_checkin.added}개/갱신 ${stats.daily_checkin.updated}개, 행복도 ${restoredHappinessCount}개 복원`;
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
      const problemLabels = selectedProblemLabels();
      const problemDomain = normalizeProblemDomain(state.problemDomain || defaultProblemDomainForLabels(problemLabels));
      const behaviorAreas = problemLabels;
      const behaviorCustomAreas = Array.from(new Set([
        ...behaviorAreas.filter(area => !defaultBehaviors.includes(area)),
        ...splitBehaviorCustom($("#behaviorCustom").value)
      ]));
      const behavior = behaviorAreas.join(", ");
      const id = $("#observeId").value || uid();
      const entry = {
        id,
        date: cleanDate($("#observeDate").value || todayISO()),
        mode: state.observeMode,
        behavior,
        problemLabels,
        problemDomain,
        behaviorAreas,
        behaviorCustomAreas,
        situation: cleanMultiline($("#situation").value, TEXT_LIMITS.long),
        triggerPlaces: state.triggerPlaces.slice(),
        triggerPeople: state.triggerPeople.slice(),
        triggerTimes: state.triggerTimes.slice(),
        triggerCustom: splitBehaviorCustom($("#triggerCustom").value),
        thoughtText: cleanMultiline($("#thoughtText").value, TEXT_LIMITS.long),
        emotion: cleanText(state.emotion, TEXT_LIMITS.short),
        emotionCustom: shortCustomValue("#emotionCustom"),
        body: state.body.slice(),
        bodyCustom: shortCustomValue("#bodyCustom"),
        avoidanceTags: state.avoidanceTags.slice(),
        avoidanceCustom: splitBehaviorCustom($("#avoidanceCustom").value),
        thoughtScore: clampNumber($("#thoughtScore").value, 0, 10, 0),
        emotionScore: clampNumber($("#emotionScore").value, 0, 10, 0),
        urgeScore: clampNumber($("#urgeScore").value, 0, 10, 0),
        urgeInitialScore: state.observeMode === "감정/충동 발생 시점" ? clampNumber($("#urgeInitialScore").value, 0, 10, 0) : null,
        urgeEndScore: state.observeMode === "감정/충동 발생 시점" ? clampNumber($("#urgeEndScore").value, 0, 10, 0) : null,
        actionLevel: clampNumber($("#actionLevel").value, 0, 5, 0),
        coping: cleanMultiline($("#coping").value, TEXT_LIMITS.long),
        copingScore: clampNumber($("#copingScore").value, 0, 10, 0),
        gratitude: "",
        insight: cleanMultiline($("#insight").value, TEXT_LIMITS.reflection),
        value: "",
        valueActionDraft: "",
        updatedAt: new Date().toISOString()
      };
      const index = state.data.observations.findIndex(o => o.id === id);
      if (index >= 0) state.data.observations[index] = { ...state.data.observations[index], ...entry };
      else state.data.observations.push(entry);
      const worryText = cleanMultiline($("#worryText").value, TEXT_LIMITS.long);
      if (worryText) {
        state.data.predictions.push({
          id: uid(),
          date: entry.date,
          relatedObservationId: id,
          worryText,
          predictedSeverity: clampNumber($("#predictedSeverity").value, 0, 10, 5),
          status: "pending",
          actualSeverity: null,
          resolvedAt: "",
          note: "",
          archived: false,
          updatedAt: new Date().toISOString()
        });
      }
      if (!saveData()) return;
      $("#observeForm").reset();
      resetObserveDefaults();
      renderAll();
      const isHighRisk = entry.urgeScore >= 8 || entry.actionLevel >= 4;
      showRiskFollowup(isHighRisk);
      showRelapseFollowup(entry);
      showToast(isHighRisk ? "고위험 신호를 저장했습니다. 지금은 안전한 장소와 연락을 먼저 챙겨주세요." : "기록했습니다. 상담에서 함께 다룰 장면 하나가 남았습니다.");
      if (!isHighRisk && activePractices().length) {
        setTimeout(() => {
          if (confirm("오늘 약속한 작은 실천도 확인해볼까요?\n\n확인을 누르면 수행도 체크로 이동합니다. 취소하면 오늘은 여기까지입니다.")) {
            scrollToTodayPractice();
          }
        }, 250);
      }
    }
    function resetObserveDefaults() {
      $("#observeId").value = "";
      $("#observeDate").value = todayISO();
      setObserveMode("저녁");
      state.behavior = "";
      state.behaviorAreas = [];
      state.problemDomain = "unknown";
      state.problemDomainTouched = false;
      state.problemAutofillTarget = "";
      state.problemAutofillValue = "";
      state.emotion = "";
      state.emotionCustom = "";
      state.body = [];
      state.bodyCustom = "";
      state.value = "";
      state.triggerPlaces = [];
      state.triggerPeople = [];
      state.triggerTimes = [];
      state.avoidanceTags = [];
      const triggerDetails = $("#triggerDetails");
      const avoidanceDetails = $("#avoidanceDetails");
      const worryDetails = $("#worryDetails");
      if (triggerDetails) triggerDetails.open = false;
      if (avoidanceDetails) avoidanceDetails.open = false;
      if (worryDetails) worryDetails.open = false;
      $("#predictedSeverity").value = 5;
      $("#predictedSeverityValue").textContent = "5";
      showRiskFollowup(false);
      const relapseFollowupBox = $("#relapseFollowup");
      if (relapseFollowupBox) { relapseFollowupBox.classList.add("hidden"); relapseFollowupBox.innerHTML = ""; }
      ["thoughtScore","emotionScore","urgeScore","urgeInitialScore","urgeEndScore","actionLevel","copingScore"].forEach(id => {
        $("#" + id).value = 0;
        $("#" + id + "Value").textContent = "0";
      });
      paintAllIntensitySliders();
      initPickers();
      state.observeStep = 0;
      renderObserveStep();
    }
    function practiceSubmit(event) {
      event.preventDefault();
      const id = $("#practiceId").value || uid();
      const entry = {
        id,
        value: currentPracticeValue(),
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
      const index = state.data.practices.findIndex(p => p.id === id);
      if (index >= 0) state.data.practices[index] = { ...state.data.practices[index], ...entry };
      else state.data.practices.push(entry);
      if (!saveData()) return;
      clearPracticeForm();
      renderAll();
      showToast("작은 실천행동을 저장했습니다.");
    }
    function currentPracticeValue() {
      return cleanText($("#practiceValueCustom").value || state.practiceValue || "", TEXT_LIMITS.short);
    }
    function setPracticeValueGuide() {
      const box = $("#practiceValueGuide");
      if (!box) return;
      const value = currentPracticeValue();
      const guide = VALUE_GUIDE[value];
      if (!value || !guide) { box.innerHTML = ""; return; }
      box.innerHTML = `
        <div class="plain-card" style="background:var(--surface-2);">
          <div class="small" style="font-weight:800; color:var(--brand-dark);">${escapeHtml(value)} — ${escapeHtml(guide.description)}</div>
          <div class="small" style="margin-top:6px;">아래 예시를 누르면 실천행동 칸에 채워집니다. 그대로 써도 되고, 자유롭게 고쳐도 됩니다.</div>
          <div class="chip-row" style="margin-top:8px;">
            ${guide.examples.map(example => `<button type="button" class="chip" data-value-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join("")}
          </div>
        </div>
      `;
    }
    function renderPracticeValueChips() {
      setChipGroup("#practiceValueChips", values, "practiceValue", state.practiceValue, 6);
      $("#practiceValueChips").addEventListener("click", () => setPracticeValueGuide());
      setPracticeValueGuide();
    }
    function editPractice(id) {
      const p = state.data.practices.find(x => x.id === id);
      if (!p) return;
      $("#practiceId").value = p.id;
      $("#practiceForm").dataset.editValue = p.value || "";
      $("#practiceForm").dataset.editName = p.name || "";
      state.practiceValue = values.includes(p.value) ? p.value : "";
      $("#practiceValueCustom").value = values.includes(p.value) ? "" : (p.value || "");
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
      state.practiceStep = 0;
      renderPracticeStep();
      renderPracticeValueChips();
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
      state.practiceValue = "";
      $$("#weekdayChips button").forEach(b => b.classList.remove("active"));
      $("#customDaysRow").style.display = "none";
      $("#reminderTimesRow").style.display = "none";
      state.practiceStep = 0;
      renderPracticeStep();
      renderPracticeValueChips();
    }
    function startFreshPracticeFromTopFields() {
      const form = $("#practiceForm");
      const id = $("#practiceId").value;
      if (!id) return;
      const originalValue = form.dataset.editValue || "";
      const originalName = form.dataset.editName || "";
      const currentValue = currentPracticeValue();
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
    function renderSharePreview() {
      $("#sharePreview").textContent = buildSummary(state.shareMode);
    }
    function renderAll() {
      if (state.view === "today") renderToday();
      renderObserveList();
      renderPracticeLogList();
      renderPracticeList();
      if (state.view === "trend") renderTrend();
      if (state.view === "relapse") renderRelapseView();
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
      $$("[data-jump]").forEach(b => {
        b.dataset.boundJump = "1";
        b.addEventListener("click", () => setView(b.dataset.jump));
      });
      $("#observeForm").addEventListener("submit", observeSubmit);
      $("#observeStepBack").addEventListener("click", () => goObserveStep(-1));
      $("#observeStepNext").addEventListener("click", () => goObserveStep(1));
      $("#practiceStepBack").addEventListener("click", () => goPracticeStep(-1));
      $("#practiceStepNext").addEventListener("click", () => goPracticeStep(1));
      $("#observeForm").addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
        if (state.observeStep === OBSERVE_STEP_TITLES.length - 1) return;
        event.preventDefault();
        goObserveStep(1);
      });
      $("#practiceForm").addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
        if (state.practiceStep === PRACTICE_STEP_TITLES.length - 1) return;
        event.preventDefault();
        goPracticeStep(1);
      });
      $("#observeQuickSave").addEventListener("click", () => {
        const form = $("#observeForm");
        if (form.requestSubmit) form.requestSubmit();
        else observeSubmit({ preventDefault: () => {}, target: form });
      });
      $("#practiceForm").addEventListener("submit", practiceSubmit);
      $("#practiceValueCustom").addEventListener("input", () => {
        setPracticeValueGuide();
        startFreshPracticeFromTopFields();
      });
      $("#practiceValueGuide").addEventListener("click", (event) => {
        const button = event.target.closest("[data-value-example]");
        if (!button) return;
        $("#practiceName").value = button.dataset.valueExample;
        $("#practiceName").focus();
      });
      $("#practiceName").addEventListener("input", startFreshPracticeFromTopFields);
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
      $("#quickPracticeCheck").addEventListener("click", scrollToTodayPractice);
      $("#jumpTodayPractice").addEventListener("click", scrollToTodayPractice);
      $("#dismissFirstUseGuide").addEventListener("click", () => {
        state.data.settings.onboardingSeen = true;
        if (!saveData()) return;
        renderFirstUseGuide();
      });
      $("#quickBackup").addEventListener("click", () => {
        const data = buildCsv({ fullBackup: true });
        downloadBlob(data.blob, data.fileName);
        state.data.settings.lastBackupAt = new Date().toISOString();
        saveData();
        showToast("모든 기록을 전체 백업했습니다.");
      });
      $("#saveWeeklyFocus").addEventListener("click", () => {
        state.data.settings.weeklyFocus = cleanMultiline($("#weeklyFocusInput").value, TEXT_LIMITS.medium);
        if (!saveData()) return;
        renderWeeklyFocus();
        showToast(state.data.settings.weeklyFocus ? "이번 주 기록 초점을 저장했습니다." : "이번 주 기록 초점을 비웠습니다.");
      });
      $("#expansionScore").addEventListener("input", () => {
        $("#expansionScoreValue").textContent = $("#expansionScore").value;
        paintExpansionSlider();
      });
      $("#saveDailyCheckin").addEventListener("click", () => {
        const existing = todayDailyCheckin();
        const expansionScore = clampNumber($("#expansionScore").value, 0, 10, 5);
        const note = cleanMultiline($("#expansionNote").value, TEXT_LIMITS.medium);
        if (existing) {
          existing.expansionScore = expansionScore;
          existing.note = note;
          existing.updatedAt = new Date().toISOString();
        } else {
          state.data.dailyCheckins.push({
            id: uid(),
            date: todayISO(),
            expansionScore,
            note,
            archived: false,
            updatedAt: new Date().toISOString()
          });
        }
        if (!saveData()) return;
        renderAll();
        showToast("오늘 하루 돌아보기를 저장했습니다.");
      });
      $("#rangeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        $$("#rangeButtons button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.shareRange = b.dataset.days === "all" ? "all" : Number(b.dataset.days);
        renderSharePreview();
      });
      $("#trendRangeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        $$("#trendRangeButtons button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.trendRange = b.dataset.days === "all" ? "all" : Number(b.dataset.days);
        renderTrend();
      });
      $("#shareModeButtons").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        $$("#shareModeButtons button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.shareMode = b.dataset.mode;
        renderSharePreview();
      });
      $("#buildPreview").addEventListener("click", () => {
        renderSharePreview();
        showToast("공유 미리보기를 만들었습니다.");
      });
      $("#downloadCsv").addEventListener("click", () => {
        const data = buildCsv();
        downloadBlob(data.blob, data.fileName);
        $("#shareInfo").textContent = `상담자 치료자료 전체본을 저장했습니다: ${data.fileName}`;
      });
      $("#downloadFullBackup").addEventListener("click", () => {
        const data = buildCsv({ fullBackup: true });
        downloadBlob(data.blob, data.fileName);
        state.data.settings.lastBackupAt = new Date().toISOString();
        if (!saveData()) return;
        $("#shareInfo").textContent = `숨긴 기록을 포함한 전체 백업을 저장했습니다: ${data.fileName}`;
      });
      $("#verifyCsv").addEventListener("click", renderCsvVerification);
      function prepareCsvForEmail() {
        const data = buildCsv();
        downloadBlob(data.blob, data.fileName);
        const subjectText = `마음고요 관찰과 실천 상담자 치료자료 ${todayISO()}`;
        const bodyText = `안녕하세요.\n\n마음고요 관찰과 실천 상담자 치료자료 전체본을 공유드립니다.\n범위: ${rangeLabel()}\n첨부할 파일명: ${data.fileName}\n\n파일 자동 첨부가 제한되어 CSV 파일을 먼저 저장했습니다. 메일 발송 전 파일을 직접 첨부해 주세요.`;
        return { fileName: data.fileName, subjectText, bodyText };
      }
      $("#shareNaver").addEventListener("click", () => {
        const { fileName, subjectText, bodyText } = prepareCsvForEmail();
        window.open("https://mail.naver.com/write/popup/?to=respectuu@naver.com", "_blank");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`제목: ${subjectText}\n\n${bodyText}`).catch(() => {});
          $("#shareInfo").textContent = `CSV를 저장했습니다: ${fileName}. 네이버 메일 작성 화면이 열리면, 제목/본문을 클립보드에서 붙여넣고 파일을 첨부해 주세요(네이버 메일은 URL로 내용을 자동 채우는 것을 지원하지 않아 클립보드로 복사했습니다).`;
        } else {
          $("#shareInfo").textContent = `CSV를 저장했습니다: ${fileName}. 네이버 메일 작성 화면에서 파일을 첨부하고 아래 내용을 직접 입력해 주세요.\n제목: ${subjectText}\n${bodyText}`;
        }
      });
      $("#shareGmail").addEventListener("click", () => {
        const { fileName, subjectText, bodyText } = prepareCsvForEmail();
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent("respectuu@naver.com")}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
        window.open(url, "_blank");
        $("#shareInfo").textContent = `CSV를 저장했습니다: ${fileName}. Gmail 작성 화면에서 방금 저장된 파일을 첨부해 주세요.`;
      });
      $("#shareOutlook").addEventListener("click", () => {
        const { fileName, subjectText, bodyText } = prepareCsvForEmail();
        const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent("respectuu@naver.com")}&subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
        window.open(url, "_blank");
        $("#shareInfo").textContent = `CSV를 저장했습니다: ${fileName}. Outlook 작성 화면에서 방금 저장된 파일을 첨부해 주세요.`;
      });
      $("#shareFile").addEventListener("click", async () => {
        const data = buildCsv();
        const file = new File([data.blob], data.fileName, { type: "text/csv" });
        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          try {
            await navigator.share({
              title: "마음고요 관찰과 실천",
              text: `받는사람: respectuu@naver.com\n\n${rangeLabel()} 상담자 치료자료 전체본입니다. 이 주소를 복사해서 받는사람 칸에 붙여넣어 주세요.`,
              files: [file]
            });
            $("#shareInfo").textContent = `상담자 치료자료 전체본을 공유했습니다: ${data.fileName} (받는사람 주소는 공유된 메시지 맨 앞에 있습니다)`;
            return;
          } catch (error) {
            if (error.name === "AbortError") return;
          }
        }
        downloadBlob(data.blob, data.fileName);
        const subject = encodeURIComponent(`마음고요 관찰과 실천 상담자 치료자료 ${todayISO()}`);
        const body = encodeURIComponent(`안녕하세요.\n\n마음고요 관찰과 실천 상담자 치료자료 전체본을 공유드립니다.\n범위: ${rangeLabel()}\n첨부할 파일명: ${data.fileName}\n\n파일 자동 첨부가 제한되어 CSV 파일을 먼저 저장했습니다. 메일 발송 전 파일을 직접 첨부해 주세요.`);
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
      $("#saveClientAlias").addEventListener("click", () => {
        const alias = cleanText($("#clientAliasInput").value, TEXT_LIMITS.short);
        state.data.settings.alias = alias;
        if (!saveData()) return;
        showToast(alias ? "내담자 별칭을 저장했습니다." : "내담자 별칭을 비웠습니다. CSV의 client_alias가 빈 값으로 저장됩니다.");
      });
      $("#saveSafetyContacts").addEventListener("click", () => {
        const contacts = [
          { name: $("#safetyContact1Name").value, phone: $("#safetyContact1Phone").value },
          { name: $("#safetyContact2Name").value, phone: $("#safetyContact2Phone").value }
        ];
        state.data.settings.safetyContacts = normalizeSafetyContacts(contacts);
        if (!saveData()) return;
        renderSafetyContactsInline();
        showToast("비상 연락처를 저장했습니다.");
      });
      $("#aliasTarget").addEventListener("change", () => {
        const map = behaviorAliasMap();
        $("#aliasInput").value = map[$("#aliasTarget").value] || "";
      });
      $("#saveAlias").addEventListener("click", () => {
        const target = $("#aliasTarget").value;
        const alias = cleanText($("#aliasInput").value, TEXT_LIMITS.short);
        if (!target) return showToast("별칭을 적용할 항목을 선택해주세요.");
        if (!alias) return showToast("별칭을 입력해주세요.");
        state.data.settings.behaviorAliases = { ...behaviorAliasMap(), [target]: alias };
        if (!saveData()) return;
        renderAliasList();
        renderAliasTargetOptions();
        initPickers();
        renderAll();
        showToast(`"${target}" 항목이 화면에는 "${alias}"(으)로 표시됩니다.`);
      });
      $("#clearAlias").addEventListener("click", () => {
        const target = $("#aliasTarget").value;
        const map = { ...behaviorAliasMap() };
        if (!target || !(target in map)) return showToast("이 항목에는 설정된 별칭이 없습니다.");
        delete map[target];
        state.data.settings.behaviorAliases = map;
        if (!saveData()) return;
        $("#aliasInput").value = "";
        renderAliasList();
        initPickers();
        renderAll();
        showToast(`"${target}" 항목의 별칭을 해제하고 원래 이름으로 되돌렸습니다.`);
      });
      ["click", "keydown", "touchstart"].forEach(name => document.addEventListener(name, touchActivity, { passive: true }));
      setInterval(() => {
        if (localStorage.getItem(PIN_KEY) && Date.now() - state.lastActive > AUTO_LOCK_MS) $("#lockScreen").classList.add("active");
      }, 15000);
      setInterval(() => {
        checkPracticeReminders();
        checkNoRecordReminder();
      }, 60000);
    }
    function init() {
      loadData();
      const versionTag = $("#appVersion");
      if (versionTag) versionTag.textContent = APP_VERSION;
      $("#noRecordReminderTime").value = noRecordReminderTime();
      $("#clientAliasInput").value = state.data.settings.alias || "";
      const savedContacts = state.data.settings.safetyContacts || [];
      $("#safetyContact1Name").value = savedContacts[0]?.name || "";
      $("#safetyContact1Phone").value = savedContacts[0]?.phone || "";
      $("#safetyContact2Name").value = savedContacts[1]?.name || "";
      $("#safetyContact2Phone").value = savedContacts[1]?.phone || "";
      renderSafetyContactsInline();
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
