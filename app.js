const GROWTH_STAGES = [
  { name: "수학 새싹", title: "2학년 수학 감각을 깨우는 수학 새싹", threshold: 0, accent: "#7ef0c2" },
  { name: "개념 점화", title: "수와 도형, 측정 감각이 켜진 개념 점화", threshold: 5, accent: "#7cc7ff" },
  { name: "문제 해결 가속", title: "조건을 읽고 식으로 옮기는 문제 해결 가속", threshold: 10, accent: "#ffd66e" },
  { name: "전단원 마스터", title: "2학년 수학 전단원을 연결하는 황금 로켓", threshold: 15, accent: "#ff9ad2" }
];

const PLAYER_RETRY_DELAY_MS = 900;
const PLAYER_CORRECT_DELAY_MS = 1500;
const PLAYER_EXPLANATION_DELAY_MS = 5000;
const PLAYER_EXTRA_CHANCES = 2;
const LEARNING_RECORDS_STORAGE_KEY = "bojogae.math2.allUnits.learningRecords.v2";

const DEFAULT_CHARACTER_PHOTO_ASPECT = 1;
const STUDENT_CLASS_MAX = 20;
const STUDENT_NUMBER_MAX = 50;
const LESSON_ALL_VALUE = "all";
const SEMESTER_UNIT_KEYS = {
  "semester-1": ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6"],
  "semester-2": ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6"]
};
const SEMESTER_CATEGORY_OPTIONS = [
  { value: "semester-1", label: "1학기 종합", description: "1학기 1~6단원 핵심 문제" },
  { value: "semester-2", label: "2학기 종합", description: "2학기 1~6단원 핵심 문제" }
];
const CATEGORY_SELECTION_OPTIONS = [
  CATEGORY_OPTIONS.find((option) => option.value === "mixed"),
  ...SEMESTER_CATEGORY_OPTIONS,
  ...CATEGORY_OPTIONS.filter((option) => option.value !== "mixed")
].filter(Boolean);
const CATEGORY_NAME_OVERRIDES = {
  "semester-1": "1학기 종합",
  "semester-2": "2학기 종합"
};

const state = {
  category: "mixed",
  lessonKey: LESSON_ALL_VALUE,
  timer: 60,
  playerCount: 5,
  players: createPlayers(5),
  screen: "start",
  timerLeft: 0,
  timerHandle: null,
  audioContext: null,
  sessionToken: 0,
  gameEnded: false,
  sessionId: "",
  startedAt: null,
  endedAt: null,
  submissionSaved: false,
  savedSubmissionRecordsByPlayer: {},
  personalizedPracticePlansByPlayer: {},
  practiceMode: null,
  totalCorrect: 0,
  totalAnswered: 0,
  characterPhotoUrl: CHARACTER_PHOTO_PATH,
  characterPhotoLabel: CHARACTER_PHOTO_PATH,
  characterPhotoAspect: DEFAULT_CHARACTER_PHOTO_ASPECT,
  characterObjectUrl: null,
  scores: createScoreState(createPlayers(5))
};

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const submitScreen = document.getElementById("submitScreen");
const categoryChoices = document.getElementById("categoryChoices");
const lessonChoices = document.getElementById("lessonChoices");
const timerChoices = document.getElementById("timerChoices");
const playerCountChoices = document.getElementById("playerCountChoices");
const selectionSummary = document.getElementById("selectionSummary");
const characterPhotoInput = document.getElementById("characterPhotoInput");
const characterPhotoStatus = document.getElementById("characterPhotoStatus");
const startGameButton = document.getElementById("startGameButton");
const settingsBadge = document.getElementById("settingsBadge");
const timerValue = document.getElementById("timerValue");
const timerFill = document.getElementById("timerFill");
const progressValue = document.getElementById("progressValue");
const growthStageBadge = document.getElementById("growthStageBadge");
const growthHeadline = document.getElementById("growthHeadline");
const growthSubline = document.getElementById("growthSubline");
const growthMeterFill = document.getElementById("growthMeterFill");
const characterShell = document.getElementById("characterShell");
const playerBoard = document.getElementById("playerBoard");
const winnerHeadline = document.getElementById("winnerHeadline");
const winnerSummary = document.getElementById("winnerSummary");
const resultGrid = document.getElementById("resultGrid");
const studentSubmitSummary = document.getElementById("studentSubmitSummary");
const studentResultForms = document.getElementById("studentResultForms");
const saveLearningDataButton = document.getElementById("saveLearningDataButton");
const showResultButton = document.getElementById("showResultButton");
const submitBackToHomeButton = document.getElementById("submitBackToHomeButton");
const openSubmitButton = document.getElementById("openSubmitButton");
const restartButton = document.getElementById("restartButton");
const backToHomeButton = document.getElementById("backToHomeButton");
const blogLink = document.getElementById("blogLink");
const homeButton = document.getElementById("homeButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const celebrationLayer = document.getElementById("celebrationLayer");
const celebrationBanner = document.getElementById("celebrationBanner");

blogLink.href = BLOG_URL;

init();

function init() {
  playerBoard.addEventListener("pointerdown", handlePlayerAnswer);
  startGameButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  backToHomeButton.addEventListener("click", goHome);
  homeButton.addEventListener("click", goHome);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  openSubmitButton.addEventListener("click", showStudentSubmitScreen);
  saveLearningDataButton.addEventListener("click", saveLearningDataFromSubmit);
  showResultButton.addEventListener("click", showResults);
  submitBackToHomeButton.addEventListener("click", goHome);
  studentResultForms.addEventListener("change", handleStudentSelectionChange);
  studentResultForms.addEventListener("click", handleStudentSubmitAction);
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  window.addEventListener("beforeunload", releaseCharacterPhotoUrl);

  if (characterPhotoInput) {
    characterPhotoInput.addEventListener("change", handleCharacterPhotoChange);
  }

  renderStartControls();
  renderCharacterPhotoStatus();
  renderGrowthPanel();
  renderPlayerBoard();
  initStorageBridge();
  syncFullscreenButton();
}

function initStorageBridge() {
  if (window.location.hash !== "#storageBridge") {
    return;
  }

  document.documentElement.classList.add("storage-bridge-mode");
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || typeof message !== "object" || !message.storageBridgeRequestId) {
      return;
    }

    if (message.type === "learning-records-read") {
      event.source?.postMessage({
        type: "learning-records-response",
        storageBridgeRequestId: message.storageBridgeRequestId,
        records: loadLearningRecords()
      }, "*");
      return;
    }

    if (message.type === "learning-records-write" && Array.isArray(message.records)) {
      saveLearningRecords(message.records);
      event.source?.postMessage({
        type: "learning-records-response",
        storageBridgeRequestId: message.storageBridgeRequestId,
        records: loadLearningRecords()
      }, "*");
      return;
    }

    if (message.type === "question-visual-render") {
      const questionRecord = message.questionRecord || {};
      const question = resolveStoredQuestionForVisual(questionRecord);
      const selectedText = getStoredQuestionSelectedText(questionRecord);
      const correctText = questionRecord.correctText || compactOptionText(question.options?.[question.answer] || "");
      const revealAnswer = message.revealAnswer === true;
      const visualHtml = revealAnswer
        ? buildFeedbackClueVisual(question, selectedText, correctText)
        : renderQuestionLearningVisual(question, { revealAnswer: false });

      event.source?.postMessage({
        type: "question-visual-render-response",
        storageBridgeRequestId: message.storageBridgeRequestId,
        visualHtml,
        prompt: question.prompt,
        correctText,
        category: question.category,
        categoryName: resolveQuestionCategory(question),
        scene: cloneLearningRecordData(question.scene || null)
      }, "*");
    }
  });
}

function resolveStoredQuestionForVisual(questionRecord) {
  const bankQuestion = findQuestionInBankByRecord(questionRecord);
  const baseQuestion = bankQuestion || {
    id: questionRecord.questionId || `stored-${Date.now()}`,
    category: questionRecord.category || "mixed",
    difficulty: questionRecord.difficulty || "mid",
    prompt: questionRecord.prompt || "문항",
    scene: null,
    sceneLines: [],
    options: questionRecord.correctText ? [questionRecord.correctText] : ["정답"],
    answer: 0
  };
  const options = Array.isArray(questionRecord.options) && questionRecord.options.length
    ? questionRecord.options
    : [...(baseQuestion.options || [])];
  let answer = Number.isInteger(questionRecord.answerIndex) ? questionRecord.answerIndex : baseQuestion.answer;
  const correctText = questionRecord.correctText || "";

  if (!Number.isInteger(answer) || !options[answer] || (correctText && compactOptionText(options[answer]) !== correctText)) {
    const matchedIndex = options.findIndex((option) => compactOptionText(option) === correctText);
    answer = matchedIndex >= 0 ? matchedIndex : Math.max(0, Math.min(Number(baseQuestion.answer) || 0, options.length - 1));
  }

  return {
    ...baseQuestion,
    id: questionRecord.questionId || baseQuestion.id,
    category: questionRecord.category || baseQuestion.category,
    difficulty: questionRecord.difficulty || baseQuestion.difficulty,
    prompt: questionRecord.prompt || baseQuestion.prompt,
    lessonKey: questionRecord.lessonKey || baseQuestion.lessonKey,
    variantKey: questionRecord.variantKey || baseQuestion.variantKey,
    scene: questionRecord.scene || baseQuestion.scene || null,
    sceneLines: questionRecord.sceneLines || baseQuestion.sceneLines || baseQuestion.scene?.lines || [],
    options,
    answer
  };
}

function findQuestionInBankByRecord(questionRecord) {
  const bank = window.Math2GameBank?.DISPLAY_QUESTION_BANK || window.DISPLAY_QUESTION_BANK || {};
  const questionId = String(questionRecord.questionId || "");
  const baseQuestionId = questionId.replace(/-as-(low|mid|high)-\d+$/, "");
  const category = questionRecord.category || "";
  const difficulty = questionRecord.difficulty || "";
  const candidates = [
    ...(category && difficulty ? bank[category]?.[difficulty] || [] : []),
    ...(category ? Object.values(bank[category] || {}).flat() : []),
    ...Object.values(bank).flatMap((group) => Object.values(group || {}).flat())
  ];

  return candidates.find((question) => question.id === questionId || question.id === baseQuestionId)
    || candidates.find((question) => question.prompt === questionRecord.prompt && compactOptionText(question.options?.[question.answer] || "") === questionRecord.correctText)
    || null;
}

function getStoredQuestionSelectedText(questionRecord) {
  const attempts = Array.isArray(questionRecord.attempts) ? questionRecord.attempts : [];
  const wrongAttempt = attempts.find((attempt) => !attempt.correct);
  return wrongAttempt?.selectedText || questionRecord.wrongSelections?.[0] || "";
}

function cloneLearningRecordData(value) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function renderStartControls() {
  ensureValidLessonSelection();

  renderChoiceButtons(categoryChoices, CATEGORY_SELECTION_OPTIONS, state.category, (value) => {
    state.category = value;
    state.lessonKey = LESSON_ALL_VALUE;
    renderStartControls();
  });

  renderChoiceButtons(lessonChoices, getLessonOptionsForCategory(state.category), state.lessonKey, (value) => {
    state.lessonKey = value;
    renderStartControls();
  });

  renderChoiceButtons(timerChoices, TIMER_OPTIONS, state.timer, (value) => {
    state.timer = value;
    renderStartControls();
  });

  renderChoiceButtons(playerCountChoices, PLAYER_COUNT_OPTIONS, state.playerCount, (value) => {
    state.playerCount = value;
    state.players = createPlayers(value);
    renderStartControls();
  });

  selectionSummary.innerHTML = [
    summaryPill("범위", getSelectedScopeName()),
    summaryPill("전체 시간", `${state.timer}초`),
    summaryPill("참여 인원", `${state.playerCount}명`)
  ].join("");
}

function getCategoryName(category) {
  return CATEGORY_NAME_OVERRIDES[category] || CATEGORY_NAMES[category] || CATEGORY_NAMES.mixed;
}

function isUnitCategory(category) {
  return CATEGORY_KEYS.includes(category);
}

function getQuestionUnitKeys(category) {
  if (category === "mixed") {
    return [...CATEGORY_KEYS];
  }

  if (SEMESTER_UNIT_KEYS[category]) {
    return [...SEMESTER_UNIT_KEYS[category]];
  }

  return isUnitCategory(category) ? [category] : [...CATEGORY_KEYS];
}

function getLessonOptionsForCategory(category) {
  if (!isUnitCategory(category)) {
    return [{
      value: LESSON_ALL_VALUE,
      label: category === "mixed" ? "전단원 종합" : "학기 종합",
      description: category === "mixed"
        ? "1학기와 2학기 모든 핵심 문제를 섞어서 출제"
        : `${getCategoryName(category)} 전체 핵심 문제를 섞어서 출제`
    }];
  }

  const unitName = getCategoryName(category);
  const lessonOptions = (LESSON_OPTIONS_BY_CATEGORY[category] || [])
    .filter((option) => hasQuestionsForLesson(category, option.value));
  return [
    {
      value: LESSON_ALL_VALUE,
      label: "단원 종합",
      description: `${unitName} 전체 핵심 문제를 섞어서 출제`
    },
    ...lessonOptions
  ];
}

function hasQuestionsForLesson(category, lessonKey) {
  return DIFFICULTY_OPTIONS.some((difficulty) => (
    (DISPLAY_QUESTION_BANK[category]?.[difficulty.value] || []).some((question) => question.lessonKey === lessonKey)
  ));
}

function getSelectedLessonOption() {
  return getLessonOptionsForCategory(state.category)
    .find((option) => option.value === state.lessonKey)
    || getLessonOptionsForCategory(state.category)[0];
}

function ensureValidLessonSelection() {
  const options = getLessonOptionsForCategory(state.category);
  if (!options.some((option) => option.value === state.lessonKey)) {
    state.lessonKey = LESSON_ALL_VALUE;
  }
}

function getSelectedScopeName() {
  const categoryName = getCategoryName(state.category);
  const lesson = getSelectedLessonOption();

  if (!isUnitCategory(state.category)) {
    return categoryName;
  }

  return state.lessonKey === LESSON_ALL_VALUE
    ? `${categoryName} · 단원 종합`
    : `${categoryName} · ${lesson.label}`;
}

function getCompactScopeName() {
  const lesson = getSelectedLessonOption();
  if (!isUnitCategory(state.category)) {
    return getCategoryName(state.category);
  }

  const unitLabel = CATEGORY_OPTIONS.find((option) => option.value === state.category)?.label || getCategoryName(state.category);
  return state.lessonKey === LESSON_ALL_VALUE ? `${unitLabel} 단원 종합` : `${unitLabel} ${lesson.label}`;
}

function renderChoiceButtons(container, options, selectedValue, onSelect) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    if (String(option.value) === String(selectedValue)) {
      button.classList.add("is-selected");
    }
    button.innerHTML = `<strong>${option.label}</strong><span>${option.description}</span>`;
    button.addEventListener("click", () => onSelect(option.value));
    container.appendChild(button);
  });
}

function summaryPill(label, value) {
  return `<div class="summary-pill"><span>${label}</span><strong>${value}</strong></div>`;
}

function handleCharacterPhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  releaseCharacterPhotoUrl();
  state.characterObjectUrl = URL.createObjectURL(file);
  state.characterPhotoUrl = state.characterObjectUrl;
  state.characterPhotoLabel = file.name;
  loadCharacterPhotoAspect(state.characterPhotoUrl, () => {
    renderCharacterPhotoStatus();
    renderGrowthPanel();
  });
  event.target.value = "";
}

function releaseCharacterPhotoUrl() {
  if (!state.characterObjectUrl) {
    return;
  }

  URL.revokeObjectURL(state.characterObjectUrl);
  state.characterObjectUrl = null;
}

function loadCharacterPhotoAspect(src, onComplete) {
  const image = new Image();

  image.addEventListener("load", () => {
    state.characterPhotoAspect = image.naturalWidth > 0 && image.naturalHeight > 0
      ? image.naturalWidth / image.naturalHeight
      : DEFAULT_CHARACTER_PHOTO_ASPECT;
    onComplete();
  });

  image.addEventListener("error", () => {
    state.characterPhotoAspect = DEFAULT_CHARACTER_PHOTO_ASPECT;
    onComplete();
  });

  image.src = src;
}

function renderCharacterPhotoStatus() {
  if (!characterPhotoStatus) {
    return;
  }

  const sourceText = state.characterObjectUrl
    ? "현재 주인공 사진: 가져온 사진"
    : `현재 주인공 사진: ${CHARACTER_PHOTO_PATH}`;

  characterPhotoStatus.textContent = sourceText;
}

function startGame() {
  primeAudio();
  if (state.practiceMode?.previousTimer) {
    state.timer = state.practiceMode.previousTimer;
  }
  state.sessionToken += 1;
  state.gameEnded = false;
  state.sessionId = createSessionId();
  state.startedAt = Date.now();
  state.endedAt = null;
  state.submissionSaved = false;
  state.savedSubmissionRecordsByPlayer = {};
  state.personalizedPracticePlansByPlayer = {};
  state.practiceMode = null;
  state.totalCorrect = 0;
  state.totalAnswered = 0;

  clearTimers();
  clearPlayerDelays();
  resetCelebration();

  state.players = createPlayers(state.playerCount);
  state.scores = createScoreState(state.players);
  state.timerLeft = state.timer;

  switchScreen("game");
  updateGameStatus();
  renderGrowthPanel();
  renderPlayerBoard();
}

function goHome() {
  state.sessionToken += 1;
  state.gameEnded = false;
  if (state.practiceMode?.previousTimer) {
    state.timer = state.practiceMode.previousTimer;
  }
  state.practiceMode = null;
  clearTimers();
  clearPlayerDelays();
  resetCelebration();
  switchScreen("start");
  renderStartControls();
}

function switchScreen(screen) {
  state.screen = screen;
  startScreen.classList.toggle("active", screen === "start");
  gameScreen.classList.toggle("active", screen === "game");
  resultScreen.classList.toggle("active", screen === "result");
  submitScreen.classList.toggle("active", screen === "submit");
}

function buildQuestionPool(category, difficulty, lessonKey = state.lessonKey) {
  const unitKeys = getQuestionUnitKeys(category);
  const fullPool = unitKeys.flatMap((key) => DISPLAY_QUESTION_BANK[key]?.[difficulty] || []);

  if (unitKeys.length === 1 && lessonKey && lessonKey !== LESSON_ALL_VALUE) {
    const lessonPool = fullPool.filter((question) => question.lessonKey === lessonKey);
    if (lessonPool.length) {
      return arrangeDiverseQuestionPool(lessonPool);
    }

    const lessonFallbackPool = buildCrossDifficultyLessonPool(unitKeys[0], lessonKey, difficulty);
    return arrangeDiverseQuestionPool(lessonFallbackPool.length ? lessonFallbackPool : fullPool);
  }

  return arrangeDiverseQuestionPool(fullPool);
}

function buildCrossDifficultyLessonPool(unitKey, lessonKey, selectedDifficulty) {
  return DIFFICULTY_OPTIONS.flatMap((option) => (
    (DISPLAY_QUESTION_BANK[unitKey]?.[option.value] || [])
      .filter((question) => question.lessonKey === lessonKey)
      .map((question, index) => (
        question.difficulty === selectedDifficulty
          ? question
          : {
              ...question,
              id: `${question.id}-as-${selectedDifficulty}-${index}`,
              difficulty: selectedDifficulty
            }
      ))
  ));
}

function arrangeDiverseQuestionPool(pool) {
  const groups = new Map();

  shuffle([...pool]).forEach((question) => {
    const key = getQuestionVariantSignature(question);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(question);
  });

  const shuffledGroups = shuffle([...groups.values()])
    .sort((left, right) => right.length - left.length);
  const arranged = [];
  let picked = true;

  while (picked) {
    picked = false;
    shuffledGroups.forEach((group) => {
      const question = group.shift();
      if (question) {
        arranged.push(question);
        picked = true;
      }
    });
  }

  return arranged;
}

function getReadyPlayerCount() {
  return state.players.filter((player) => Boolean(state.scores[player.id]?.difficulty)).length;
}

function areAllPlayersReady() {
  return state.players.length > 0 && getReadyPlayerCount() === state.players.length;
}

function maybeStartTimer() {
  if (state.gameEnded || state.timerHandle || !areAllPlayersReady()) {
    return;
  }

  state.timerLeft = state.timer;
  updateGameStatus();
  state.timerHandle = window.setInterval(() => {
    state.timerLeft -= 1;
    updateGameStatus();
    if (state.timerLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function getSceneSignature(question) {
  if (!question?.scene) {
    return "";
  }

  return JSON.stringify(question.scene);
}

function getQuestionVariantSignature(question) {
  return question?.variantKey || question?.lessonKey || question?.id || "";
}

function assignNextQuestion(playerId) {
  const playerState = state.scores[playerId];
  const pool = [...(playerState.questionPool || [])];

  playerState.currentQuestion = null;
  playerState.locked = false;
  playerState.lastAnswer = null;
  playerState.revealCorrect = null;
  playerState.lastOutcome = null;
  playerState.wrongAttemptsCurrent = 0;
  playerState.currentQuestionStartedAt = null;
  playerState.currentQuestionAttempts = [];
  playerState.currentQuestionRecordClosed = false;
  playerState.isCelebrating = false;
  playerState.celebrationText = "";
  playerState.isShaking = false;
  playerState.showExplanation = false;
  playerState.explanationTitle = "";
  playerState.explanationBody = "";
  playerState.retryHint = "";

  if (!playerState.difficulty || pool.length === 0) {
    playerState.status = playerState.difficulty ? "문제 준비 중" : "난이도 고르기";
    return;
  }

  const activeQuestions = state.players
    .filter((player) => player.id !== playerId)
    .map((player) => state.scores[player.id].currentQuestion)
    .filter(Boolean);
  const activeIds = new Set(activeQuestions.map((question) => question.id));
  const activePrompts = new Set(activeQuestions.map((question) => question.prompt));
  const activeScenes = new Set(activeQuestions.map(getSceneSignature));
  const activeVariants = new Set(activeQuestions.map(getQuestionVariantSignature));
  const seenIds = new Set(playerState.history);
  const recentIds = new Set(playerState.history.slice(-3));
  const recentVariants = new Set((playerState.variantHistory || []).slice(-3));

  let candidates = pool.filter((question) => (
    !activeIds.has(question.id)
    && !recentIds.has(question.id)
    && !seenIds.has(question.id)
  ));
  candidates = candidates.filter((question) => (
    !activePrompts.has(question.prompt)
    && !activeScenes.has(getSceneSignature(question))
  ));
  candidates = preferDifferentQuestionVariants(candidates, recentVariants, activeVariants);

  if (candidates.length === 0) {
    candidates = pool.filter((question) => !activeIds.has(question.id) && !seenIds.has(question.id));
    candidates = preferDifferentQuestionVariants(candidates, recentVariants, activeVariants);
  }

  if (candidates.length === 0) {
    candidates = pool.filter((question) => !activeIds.has(question.id) && !recentIds.has(question.id));
    candidates = preferDifferentQuestionVariants(candidates, recentVariants, activeVariants);
  }

  if (candidates.length === 0) {
    candidates = pool;
  }

  playerState.currentQuestion = candidates[0] || null;
  rememberAssignedQuestionVariant(playerState, playerState.currentQuestion);
  playerState.currentQuestionStartedAt = playerState.currentQuestion ? Date.now() : null;
  playerState.status = playerState.currentQuestion ? "문제 푸는 중" : "문제 준비 완료";
}

function preferDifferentQuestionVariants(candidates, recentVariants, activeVariants) {
  if (!candidates.length) {
    return candidates;
  }

  const withoutActiveVariants = candidates.filter((question) => !activeVariants.has(getQuestionVariantSignature(question)));
  const activeSafeCandidates = withoutActiveVariants.length ? withoutActiveVariants : candidates;
  const withoutRecentVariants = activeSafeCandidates.filter((question) => !recentVariants.has(getQuestionVariantSignature(question)));
  return withoutRecentVariants.length ? withoutRecentVariants : activeSafeCandidates;
}

function rememberAssignedQuestionVariant(playerState, question) {
  if (!question) {
    return;
  }

  if (!Array.isArray(playerState.variantHistory)) {
    playerState.variantHistory = [];
  }

  playerState.variantHistory.push(getQuestionVariantSignature(question));
  if (playerState.variantHistory.length > 12) {
    playerState.variantHistory.splice(0, playerState.variantHistory.length - 12);
  }
}

function updateGameStatus() {
  const stageInfo = getGrowthStageInfo();
  const readyCount = getReadyPlayerCount();
  const readinessText = areAllPlayersReady()
    ? "개인별 난이도 완료"
    : `난이도 선택 ${readyCount}/${state.players.length}`;
  settingsBadge.textContent = `${getCompactScopeName()} · 전체 ${state.timer}초 · ${state.playerCount}명 · ${readinessText}`;
  progressValue.textContent = areAllPlayersReady()
    ? `총 정답 ${state.totalCorrect}개`
    : `난이도 선택 ${readyCount}명`;
  growthStageBadge.textContent = stageInfo.stage.name;
  timerValue.textContent = String(Math.max(0, state.timerLeft)).padStart(2, "0");
  timerFill.style.width = `${(Math.max(0, state.timerLeft) / state.timer) * 100}%`;
}

function renderGrowthPanel() {
  const stageInfo = getGrowthStageInfo();
  growthHeadline.textContent = stageInfo.stage.title;
  growthSubline.textContent = `현재 ${stageInfo.stage.name} 단계 · ${getCompactScopeName()} · 총 정답 ${state.totalCorrect}개 · 친구 ${state.players.length}명이 각자 다른 문제를 풀고 있어요.`;
  growthMeterFill.style.width = `${stageInfo.progress}%`;
  characterShell.innerHTML = renderCharacterIllustrationCompact(stageInfo);
}

function getGrowthStageInfo() {
  let stageIndex = 0;
  GROWTH_STAGES.forEach((stage, index) => {
    if (state.totalCorrect >= stage.threshold) {
      stageIndex = index;
    }
  });
  const stage = GROWTH_STAGES[stageIndex];
  const nextThreshold = GROWTH_STAGES[stageIndex + 1]?.threshold ?? stage.threshold;
  const progress = stageIndex === GROWTH_STAGES.length - 1
    ? 100
    : ((state.totalCorrect - stage.threshold) / (nextThreshold - stage.threshold)) * 100;

  return {
    stageIndex,
    stage,
    progress: Math.max(0, Math.min(100, progress)),
    cheerLevel: Math.min(1, state.totalCorrect / 12)
  };
}

function renderCharacterIllustration(stageInfo) {
  const badgeColors = ["#ff8f3f", "#2d70f4", "#1bb6a5", "#9b7cff"];
  const stageShapes = [
    "triangle",
    "square",
    "circle",
    "trapezoid"
  ].map((kind) => `<div style="width:40px;height:40px;">${shapeSVG({ kind }, "shape-svg")}</div>`);

  const photoMarkup = state.characterPhotoUrl && state.characterPhotoUrl !== CHARACTER_PHOTO_PATH
    ? `
      <div style="width:128px;height:128px;border-radius:32px;overflow:hidden;border:4px solid rgba(255,255,255,0.75);box-shadow:0 18px 28px rgba(0,0,0,0.18);">
        <img src="${state.characterPhotoUrl}" alt="${stageInfo.stage.name}" style="width:100%;height:100%;object-fit:cover;">
      </div>
    `
    : `
      <div style="width:128px;height:128px;border-radius:32px;background:linear-gradient(145deg,#fdf7ff,#ddf2ff);display:grid;place-items:center;border:4px solid rgba(255,255,255,0.7);box-shadow:0 18px 28px rgba(0,0,0,0.18);">
        <div style="width:86px;height:86px;border-radius:24px;background:${stageInfo.stage.accent};display:grid;place-items:center;transform:rotate(-6deg);">
          <div style="display:grid;grid-template-columns:repeat(2,40px);gap:6px;">
            ${stageShapes.join("")}
          </div>
        </div>
      </div>
    `;

  const chips = GROWTH_STAGES.map((stage, index) => `
    <div style="
      padding:8px 12px;
      border-radius:999px;
      font-size:0.82rem;
      font-weight:700;
      color:${index <= stageInfo.stageIndex ? "#081425" : "#dce8ff"};
      background:${index <= stageInfo.stageIndex ? stage.accent : "rgba(255,255,255,0.12)"};
      border:1px solid ${index <= stageInfo.stageIndex ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)"};
    ">${stage.name}</div>
  `).join("");

  return `
    <div style="display:grid;gap:16px;justify-items:center;">
      ${photoMarkup}
      <div style="display:grid;gap:10px;justify-items:center;text-align:center;">
        <strong style="font-size:1.15rem;color:#f7fbff;">${stageInfo.stage.name}</strong>
              <span style="color:#dce8ff;font-size:0.92rem;">정답이 늘어날수록 수학 로켓이 더 단단해져요.</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:320px;">
        ${chips}
      </div>
    </div>
  `;
}

function renderCharacterIllustrationCompact(stageInfo) {
  const stageShapes = [
    "triangle",
    "square",
    "circle",
    "trapezoid"
  ].map((kind) => `<div class="growth-stage-shape">${shapeSVG({ kind }, "shape-svg")}</div>`).join("");

  const photoMarkup = state.characterPhotoUrl && state.characterPhotoUrl !== CHARACTER_PHOTO_PATH
    ? `
      <div class="growth-stage-portrait is-photo">
        <img class="growth-stage-photo" src="${state.characterPhotoUrl}" alt="${stageInfo.stage.name}">
      </div>
    `
    : `
      <div class="growth-stage-portrait is-illustrated">
        <div class="growth-stage-shape-cluster" style="--stage-accent:${stageInfo.stage.accent};">
          ${stageShapes}
        </div>
      </div>
    `;

  const chips = GROWTH_STAGES.map((stage, index) => `
    <div class="growth-stage-chip ${index <= stageInfo.stageIndex ? "is-active" : ""}" style="--chip-accent:${stage.accent};">${stage.name}</div>
  `).join("");

  return `
    <div class="growth-stage-card">
      <div class="growth-stage-visual">
        ${photoMarkup}
      </div>
      <div class="growth-stage-body">
        <div class="growth-stage-copy">
          <strong class="growth-stage-name">${stageInfo.stage.name}</strong>
              <span class="growth-stage-caption">정답이 늘어날수록 수학 로켓이 더 단단해져요.</span>
        </div>
        <div class="growth-stage-chip-list">
          ${chips}
        </div>
      </div>
    </div>
  `;
}

function applyPlayerDifficultySelection(playerId, difficulty) {
  const playerState = state.scores[playerId];

  if (!playerState || playerState.difficulty || state.gameEnded) {
    return;
  }

  playerState.difficulty = difficulty;
  playerState.questionPool = buildQuestionPool(state.category, difficulty);

  if (areAllPlayersReady()) {
    state.players.forEach((player) => assignNextQuestion(player.id));
    maybeStartTimer();
  } else {
    playerState.status = `${DIFFICULTY_NAMES[difficulty]} 선택 완료`;
  }

  updateGameStatus();
  renderPlayerBoard();
}

function handlePlayerAnswer(event) {
  if (state.screen !== "game" || state.gameEnded) {
    return;
  }

  const explanationButton = event.target.closest(".explanation-confirm-button");
  if (explanationButton) {
    const playerId = explanationButton.dataset.player;
    const playerState = state.scores[playerId];
    if (!playerState?.showExplanation || !playerState.currentQuestion) {
      return;
    }

    clearTimeout(playerState.pendingHandle);
    playerState.pendingHandle = null;
    playerState.showExplanation = false;
    playerState.feedbackConfirmed += 1;
    playerState.status = "다음 문제로 이동!";
    assignNextQuestion(playerId);
    renderPlayerBoard();
    return;
  }

  const difficultyButton = event.target.closest(".difficulty-select-button");
  if (difficultyButton) {
    applyPlayerDifficultySelection(
      difficultyButton.dataset.player,
      difficultyButton.dataset.difficulty
    );
    return;
  }

  const button = event.target.closest(".answer-button");
  if (!button) {
    return;
  }

  primeAudio();

  const playerId = button.dataset.player;
  const optionIndex = Number(button.dataset.option);
  const playerState = state.scores[playerId];
  const player = state.players.find((item) => item.id === playerId);

  if (playerState.locked || !playerState.currentQuestion) {
    return;
  }

  const isCorrect = optionIndex === playerState.currentQuestion.answer;
  const answeredQuestion = playerState.currentQuestion;
  const sessionToken = state.sessionToken;
  const answeredAt = Date.now();
  const attemptNumber = playerState.wrongAttemptsCurrent + 1;

  playerState.locked = true;
  playerState.lastAnswer = optionIndex;
  playerState.showExplanation = false;
  playerState.explanationTitle = "";
  playerState.explanationBody = "";
  state.totalAnswered += 1;
  recordQuestionAttempt(playerState, answeredQuestion, optionIndex, isCorrect, attemptNumber, answeredAt);

  if (isCorrect) {
    const earned = SCORE_BY_DIFFICULTY[playerState.difficulty] || SCORE_BY_DIFFICULTY.mid;
    playerState.score += earned;
    playerState.correct += 1;
    if (playerState.wrongAttemptsCurrent > 0) {
      playerState.retrySuccess += 1;
    }
    finalizeQuestionRecord(playerState, answeredQuestion, "correct", answeredAt);
    playerState.status = playerState.wrongAttemptsCurrent > 0 ? `재도전 성공 +${earned}점` : `정답 +${earned}점`;
    playerState.revealCorrect = answeredQuestion.answer;
    playerState.lastOutcome = "correct";
    playerState.history.push(answeredQuestion.id);
    playerState.wrongAttemptsCurrent = 0;
    playerState.retryHint = "";
    playerState.isCelebrating = true;
    playerState.isShaking = false;
    state.totalCorrect += 1;
    playerState.celebrationText = `${player?.soundText || "딩동"}! 성장 ${getAnimalGrowthState(playerState.correct).level}단계!`;

    updateGameStatus();
    renderGrowthPanel();
    triggerCelebration(playerId);
    playAnimalSound(player);
  } else {
    playerState.wrong += 1;
    playerState.isCelebrating = false;

    if (playerState.wrongAttemptsCurrent < PLAYER_EXTRA_CHANCES) {
      playerState.wrongAttemptsCurrent += 1;
      const chancesLeft = PLAYER_EXTRA_CHANCES - playerState.wrongAttemptsCurrent + 1;
      playerState.revealCorrect = null;
      playerState.lastOutcome = "retry";
      playerState.isShaking = true;
      playerState.retryHint = attemptNumber === 1
        ? buildFirstWrongHint(answeredQuestion, optionIndex)
        : playerState.retryHint;
      playerState.status = attemptNumber === 1 ? "힌트 보고 다시 도전" : `오답! ${chancesLeft}번 더 도전`;
      triggerWrongAnswerFeedback();
    } else {
      playerState.wrongAttemptsCurrent += 1;
      playerState.revealCorrect = answeredQuestion.answer;
      playerState.lastOutcome = "wrong-final";
      playerState.retryHint = "";
      playerState.isShaking = false;
      playerState.showExplanation = true;
      playerState.finalWrong += 1;
      playerState.feedbackShown += 1;
      finalizeQuestionRecord(playerState, answeredQuestion, "wrong-final", answeredAt);
      playerState.explanationTitle = `정답은 ${OPTION_LABELS[answeredQuestion.answer]}번 ${compactOptionText(answeredQuestion.options[answeredQuestion.answer])}`;
      playerState.explanationBody = buildFriendlyExplanation(answeredQuestion);
      playerState.status = "설명 읽고 확인 누르기";
      playerState.history.push(answeredQuestion.id);
    }
  }

  renderPlayerBoard();

  const delay = playerState.lastOutcome === "retry"
    ? PLAYER_RETRY_DELAY_MS
    : PLAYER_CORRECT_DELAY_MS;
  if (playerState.lastOutcome === "correct") {
    playerState.pendingHandle = window.setTimeout(() => {
      if (sessionToken !== state.sessionToken || state.gameEnded) {
        return;
      }
      assignNextQuestion(playerId);
      renderPlayerBoard();
    }, delay);
  } else if (playerState.lastOutcome === "retry") {
    playerState.pendingHandle = window.setTimeout(() => {
      if (sessionToken !== state.sessionToken || state.gameEnded) {
        return;
      }
      playerState.locked = false;
      playerState.isShaking = false;
      playerState.status = playerState.retryHint ? "힌트 보고 다시 골라요" : "다시 골라 보세요";
      renderPlayerBoard();
    }, delay);
  } else {
    playerState.pendingHandle = null;
  }
}

function recordQuestionAttempt(playerState, question, optionIndex, isCorrect, attemptNumber, answeredAt) {
  const selectedText = question.options[optionIndex] || "";
  const correctText = question.options[question.answer] || "";
  const elapsedMs = playerState.currentQuestionStartedAt
    ? Math.max(0, answeredAt - playerState.currentQuestionStartedAt)
    : 0;

  playerState.currentQuestionAttempts.push({
    attemptNumber,
    answeredAt: new Date(answeredAt).toISOString(),
    elapsedMs,
    selectedIndex: optionIndex,
    selectedText: compactOptionText(selectedText),
    correctIndex: question.answer,
    correctText: compactOptionText(correctText),
    correct: isCorrect
  });
}

function finalizeQuestionRecord(playerState, question, outcome, answeredAt) {
  if (playerState.currentQuestionRecordClosed) {
    return;
  }

  const elapsedMs = playerState.currentQuestionStartedAt
    ? Math.max(0, answeredAt - playerState.currentQuestionStartedAt)
    : 0;
  const attempts = playerState.currentQuestionAttempts.map((attempt) => ({ ...attempt }));
  const wrongSelections = attempts
    .filter((attempt) => !attempt.correct)
    .map((attempt) => attempt.selectedText);

  playerState.questionRecords.push({
    questionId: question.id,
    category: question.category || state.category,
    categoryName: resolveQuestionCategory(question),
    difficulty: playerState.difficulty,
    difficultyName: DIFFICULTY_NAMES[playerState.difficulty] || "",
    lessonKey: question.lessonKey || "",
    variantKey: question.variantKey || "",
    prompt: question.prompt,
    scene: cloneLearningRecordData(question.scene || null),
    sceneLines: cloneLearningRecordData(question.sceneLines || question.scene?.lines || []),
    options: (question.options || []).map((option) => compactOptionText(option)),
    answerIndex: question.answer,
    correctText: compactOptionText(question.options[question.answer] || ""),
    explanation: question.explanation || "",
    outcome,
    finalCorrect: outcome === "correct",
    attempts,
    attemptCount: attempts.length,
    wrongSelections,
    elapsedMs
  });
  playerState.totalQuestionTimeMs += elapsedMs;
  playerState.currentQuestionRecordClosed = true;
}

function closeOpenQuestionRecordsOnEnd() {
  const endedAt = Date.now();
  Object.values(state.scores).forEach((playerState) => {
    if (
      playerState.currentQuestion
      && playerState.currentQuestionAttempts.length > 0
      && !playerState.currentQuestionRecordClosed
    ) {
      finalizeQuestionRecord(playerState, playerState.currentQuestion, "time-up", endedAt);
    }
  });
}

function getAnimalGrowthState(correctCount) {
  if (correctCount >= 7) {
    return { level: 5, title: "별빛 점프", scale: 1.26, glow: 1 };
  }

  if (correctCount >= 5) {
    return { level: 4, title: "반짝 스타", scale: 1.2, glow: 0.84 };
  }

  if (correctCount >= 3) {
    return { level: 3, title: "쑥쑥 성장", scale: 1.14, glow: 0.68 };
  }

  if (correctCount >= 1) {
    return { level: 2, title: "새싹 미소", scale: 1.08, glow: 0.52 };
  }

  return { level: 1, title: "준비 씨앗", scale: 1, glow: 0.36 };
}

function renderAnimalStage(player, playerState) {
  const growthState = getAnimalGrowthState(playerState.correct);
  const speech = !playerState.difficulty
    ? "난이도 골라요!"
    : !playerState.currentQuestion && !state.gameEnded
      ? "친구 기다려요!"
    : playerState.isCelebrating
      ? `${player.soundText}! 신나요!`
      : playerState.isShaking
        ? "다시 도전!"
        : playerState.correct > 0
          ? `성장 ${growthState.level}단계`
          : "준비 완료";

  const classNames = ["animal-stage", `animal-${player.voice}`];
  if (playerState.isCelebrating) {
    classNames.push("is-celebrating");
  }
  if (playerState.correct > 0) {
    classNames.push("is-grown");
  }

  return `
    <div class="${classNames.join(" ")}" style="--animal-scale:${growthState.scale};--animal-glow:${growthState.glow};">
      <div class="animal-bubble">${speech}</div>
      <div class="animal-avatar-shell" aria-hidden="true">
        <span class="animal-sparkle animal-sparkle--a">✦</span>
        <span class="animal-sparkle animal-sparkle--b">✧</span>
        <span class="animal-sparkle animal-sparkle--c">★</span>
        <div class="animal-avatar">
          <span class="animal-emoji">${player.avatar}</span>
          <span class="animal-face">
            <span class="animal-eye animal-eye--left"></span>
            <span class="animal-eye animal-eye--right"></span>
            <span class="animal-cheek animal-cheek--left"></span>
            <span class="animal-cheek animal-cheek--right"></span>
            <span class="animal-mouth"></span>
          </span>
        </div>
      </div>
      <div class="animal-name">${player.name}</div>
      <div class="animal-growth-badge">성장 ${growthState.level}단계 · ${growthState.title}</div>
    </div>
  `;
}

function renderProblemStage(player, playerState, question) {
  if (!question) {
    return renderAnimalStage(player, playerState);
  }

  return `
    <div class="problem-stage">
      <div class="problem-stage-head">
        <span>${player.avatar} ${escapeHtml(player.name)}</span>
        <strong>${escapeHtml(resolveQuestionCategory(question))}</strong>
      </div>
      ${renderQuestionLearningVisual(question, { revealAnswer: false })}
    </div>
  `;
}

function renderQuestionLearningVisual(question, options = {}) {
  const category = question.category || "";
  const prompt = question.prompt || "";
  const graphItems = parseLabeledCounts(question);
  const revealAnswer = options.revealAnswer === true;
  const sceneType = question.scene?.type || "";

  if (sceneType === "shape") {
    return renderStructuredShapeVisual(question.scene, { revealAnswer });
  }

  if (sceneType === "multiplication") {
    return renderStructuredMultiplicationVisual(question.scene, { revealAnswer });
  }

  if (sceneType === "graph") {
    return renderStructuredGraphVisual(question.scene, { revealAnswer });
  }

  if (sceneType === "pattern") {
    return renderStructuredPatternVisual(question.scene, { revealAnswer });
  }

  if (category === "1-5" && /분류할 수 없는|기준|먹을 수 있는|운동 도구/.test(prompt) && !graphItems.length) {
    return renderMiniClassifyVisual(prompt);
  }

  if (category === "1-5" || category === "2-5" || graphItems.length >= 3) {
    return renderMiniBarGraph(graphItems);
  }

  if (category === "2-4" || isTimeLearningPrompt(prompt)) {
    return renderMiniTimeVisual(question, { revealAnswer });
  }

  if (category === "1-4" || category === "2-3" || prompt.includes("cm") || prompt.includes("m")) {
    return renderMiniLengthVisual(question, { revealAnswer });
  }

  if (category === "1-1" || category === "2-1" || prompt.includes("자리") || prompt.includes("1000")) {
    return renderMiniPlaceValueVisual(prompt, { revealAnswer });
  }

  if (category === "1-2" || prompt.includes("도형") || prompt.includes("변") || prompt.includes("꼭짓점")) {
    return renderMiniShapeVisual(prompt, { revealAnswer });
  }

  if (category === "1-6" || category === "2-2" || prompt.includes("×") || prompt.includes("묶음")) {
    return renderMiniMultiplicationVisual(prompt);
  }

  if (category === "2-6" || prompt.includes("규칙")) {
    return renderMiniPatternVisual(question);
  }

  if (category === "1-3" || prompt.includes("+") || prompt.includes("-") || prompt.includes("□") || isAddSubStoryPrompt(prompt)) {
    return renderMiniNumberLineVisual(prompt, { revealAnswer });
  }

  return revealAnswer
    ? renderQuestionClueVisual(question)
    : `<div class="problem-visual-card problem-visual-card--neutral"></div>`;
}

function isTimeLearningPrompt(prompt) {
  const text = String(prompt || "");
  return /\d{1,2}시/.test(text)
    || /긴바늘|짧은바늘|시각|시간|정각|반/.test(text)
    || /달력|요일|날짜|며칠|몇 월/.test(text)
    || /\d+분\s*(뒤|후|동안|까지|걸린)/.test(text);
}

function isAddSubStoryPrompt(prompt) {
  const text = String(prompt || "");
  const hasTwoNumbers = (text.match(/\d+/g) || []).length >= 2;
  return hasTwoNumbers && /더 받|모두|합|늘|받았|얻|샀|가지고.*더|썼|남|빼|차이|덜|줄|잃|꺼냈|가져갔/.test(text);
}

function renderQuestionClueList(question) {
  const lines = Array.isArray(question.scene?.lines) ? question.scene.lines : question.sceneLines || [];
  if (!lines.length) {
    return "";
  }

  return `
    <div class="problem-clue-list">
      ${lines.slice(0, 5).map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
    </div>
  `;
}

function renderQuestionClueVisual(question) {
  const lines = Array.isArray(question.scene?.lines) ? question.scene.lines : question.sceneLines || [];
  return `
    <div class="problem-visual-card problem-visual-card--clues">
      ${(lines.length ? lines : [question.explanation || "문제의 조건을 다시 확인하세요."])
        .slice(0, 4)
        .map((line) => `<span>${escapeHtml(line)}</span>`)
        .join("")}
    </div>
  `;
}

function parseLabeledCounts(question) {
  const lines = Array.isArray(question.scene?.lines) ? question.scene.lines : question.sceneLines || [];
  return lines
    .map((line) => {
      const match = String(line).trim().match(/^(.+?)\s+(\d+)(명|개|장|cm)?$/);
      return match ? { label: match[1].trim(), value: Number(match[2]), unit: match[3] || "" } : null;
    })
    .filter(Boolean);
}

function renderMiniBarGraph(items) {
  if (!items.length) {
    return `<div class="problem-visual-card">표에 있는 이름과 수를 차례대로 확인하세요.</div>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="problem-visual-card problem-bar-graph">
      <div class="problem-table">
        ${items.slice(0, 5).map((item) => `
          <div class="problem-table-row">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}${escapeHtml(item.unit)}</strong>
          </div>
        `).join("")}
      </div>
      <div class="problem-bars">
        ${items.slice(0, 5).map((item) => `
          <div class="problem-bar-row">
            <span>${escapeHtml(item.label)}</span>
            <div><i style="width:${Math.max(8, Math.round(item.value / max * 100))}%"></i></div>
            <strong>${item.value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderMiniClassifyVisual(prompt) {
  const items = parseClassificationItems(prompt);
  const criterion = parseClassificationCriterion(prompt);
  return `
    <div class="problem-visual-card problem-classify-visual">
      <strong>${escapeHtml(criterion || "분류 기준")}</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderMiniTimeVisual(questionOrPrompt, options = {}) {
  const question = questionOrPrompt && typeof questionOrPrompt === "object" ? questionOrPrompt : null;
  const prompt = question ? question.prompt || "" : String(questionOrPrompt || "");
  const scene = question?.scene?.type === "time" ? question.scene : null;
  const revealAnswer = options.revealAnswer === true;

  if (scene) {
    return renderStructuredTimeVisual(scene, { revealAnswer });
  }

  const handMatch = prompt.match(/긴바늘이\s*(\d+).*?짧은바늘이\s*(\d+)/);
  if (handMatch) {
    const minuteFromHand = Number(handMatch[1]) % 12 * 5;
    const hourFromHand = Number(handMatch[2]);
    return `
      <div class="problem-visual-card problem-time-visual">
        ${renderMiniClock(hourFromHand, minuteFromHand, "시계")}
        <div class="problem-time-chip">긴바늘 ${handMatch[1]} · 짧은바늘 ${handMatch[2]}</div>
      </div>
    `;
  }

  const times = [...prompt.matchAll(/(\d{1,2})시\s*(\d{1,2})?분?/g)]
    .map((match) => ({ hour: Number(match[1]), minute: Number(match[2] || 0) }))
    .slice(0, 2);
  const minuteMatches = [...prompt.matchAll(/(\d+)분\s*(뒤|후|걸린|동안|까지)?/g)];
  const minuteMatch = minuteMatches.find((match) => Boolean(match[2])) || minuteMatches.at(-1);

  if (!times.length) {
    return `<div class="problem-visual-card problem-time-line"><span>시계</span></div>`;
  }

  const timeChip = times.length >= 2
    ? `${minutesBetweenTimes(times[0], times[1])}분 사이`
    : minuteMatch
      ? `${minuteMatch[1]}분${minuteMatch[2] ? ` ${minuteMatch[2]}` : ""}`
      : "";

  return `
    <div class="problem-visual-card problem-time-visual">
      ${times.map((time, index) => renderMiniClock(time.hour, time.minute, index === 0 ? "시작" : "끝")).join("")}
      ${timeChip ? `<div class="problem-time-chip">${escapeHtml(timeChip)}</div>` : ""}
    </div>
  `;
}

function renderStructuredTimeVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  const start = scene.start;
  const end = scene.end;
  const minutes = Number(scene.minutes);

  if (String(scene.kind || "").startsWith("calendar-")) {
    return renderMiniCalendarVisual(scene, { revealAnswer });
  }

  if (scene.kind === "day-cycle") {
    return `
      <div class="problem-visual-card problem-day-cycle">
        <div class="day-cycle-ring">
          <span>오전</span>
          <strong>${revealAnswer ? `${scene.morningHours || 12}시간` : "?"}</strong>
          <span>오후</span>
          <strong>${revealAnswer ? `${scene.afternoonHours || 12}시간` : "?"}</strong>
        </div>
        <div class="day-cycle-note">${escapeHtml(scene.event || (revealAnswer ? `하루 ${scene.totalHours || 24}시간` : "낮 12시를 기준으로 나누기"))}</div>
      </div>
    `;
  }

  if ((scene.kind === "add-minutes" || scene.kind === "elapsed") && start) {
    const shouldShowEnd = scene.kind === "elapsed" || revealAnswer;
    const bridgeMinutes = scene.kind === "elapsed" && !revealAnswer
      ? "?분"
      : (Number.isFinite(minutes) ? `${minutes}분` : "?분");
    return `
      <div class="problem-visual-card problem-time-visual problem-time-visual--structured">
        ${renderMiniClock(start.hour, start.minute, scene.kind === "elapsed" ? "시작" : "처음")}
        <div class="problem-time-bridge">
          <i></i>
          <strong>${bridgeMinutes}</strong>
          <span>${scene.kind === "elapsed" ? "걸린 시간" : "뒤로 이동"}</span>
        </div>
        ${shouldShowEnd && end ? renderMiniClock(end.hour, end.minute, "끝") : renderUnknownClock("끝 시각")}
      </div>
    `;
  }

  if (scene.kind === "half-hour" && scene.time) {
    return `
      <div class="problem-visual-card problem-time-visual problem-time-visual--structured">
        ${renderMiniClock(scene.time.hour, scene.time.minute, "시계")}
        <div class="problem-time-chip">30분은 한 시간의 반</div>
      </div>
    `;
  }

  if (scene.kind === "clock-hands") {
    return `
      <div class="problem-visual-card problem-time-visual problem-time-visual--structured">
        ${renderMiniClock(scene.hour || 7, scene.minute || 0, "시계")}
        <div class="clock-role-mini">
          <span>긴바늘 ${scene.minuteHand || 12} → 00분</span>
          <span>짧은바늘 ${scene.hourHand || scene.hour || 7} → ${scene.hour || 7}시</span>
        </div>
      </div>
    `;
  }

  return `<div class="problem-visual-card problem-time-line"><span>시계</span></div>`;
}

function renderMiniCalendarVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  const weekdays = Array.isArray(scene.weekdays) && scene.weekdays.length
    ? scene.weekdays
    : ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  const kind = scene.calendarType || scene.kind;

  if (kind === "weekday" || scene.kind === "calendar-weekday") {
    const startIndex = Number(scene.startWeekdayIndex ?? 0);
    const answerIndex = Number(scene.answerWeekdayIndex ?? ((startIndex + Number(scene.offset || 0)) % weekdays.length));
    const offset = Number(scene.offset || 0);
    const pathIndexes = new Set();
    if (revealAnswer) {
      for (let step = 0; step <= offset; step += 1) {
        pathIndexes.add((startIndex + step) % weekdays.length);
      }
    }
    return `
      <div class="problem-visual-card problem-calendar-visual">
        <div class="calendar-week-row">
          ${weekdays.map((weekday, index) => {
            const classes = [
              "calendar-day-chip",
              index === startIndex ? "is-start" : "",
              revealAnswer && index === answerIndex ? "is-answer" : "",
              pathIndexes.has(index) ? "is-path" : ""
            ].filter(Boolean).join(" ");
            return `<span class="${classes}" style="--order:${(index - startIndex + weekdays.length) % weekdays.length}">${escapeHtml(weekday.replace("요일", ""))}</span>`;
          }).join("")}
        </div>
        <div class="calendar-jump-note">${escapeHtml(weekdays[startIndex])}에서 ${offset}칸 이동</div>
      </div>
    `;
  }

  const month = Number(scene.month || 5);
  const startDay = Number(scene.startDay || 1);
  const targetDay = Number(scene.targetDay || startDay + Number(scene.offset || 0));
  const offset = Number(scene.offset || Math.max(0, targetDay - startDay));
  const visibleStart = Math.max(1, Number(scene.visibleStart || startDay - 2));
  const visibleEnd = Math.min(31, Number(scene.visibleEnd || targetDay + 2));
  const days = Array.from({ length: visibleEnd - visibleStart + 1 }, (_, index) => visibleStart + index);
  const isDateDifference = kind === "date-difference" || scene.kind === "calendar-date-difference";
  const shouldMarkTarget = revealAnswer || isDateDifference;
  const jumpNote = isDateDifference
    ? (revealAnswer ? `${startDay}일에서 ${offset}칸 → ${targetDay}일` : `${startDay}일부터 ${targetDay}일까지 사이 세기`)
    : `${startDay}일에서 ${offset}칸${shouldMarkTarget ? ` → ${targetDay}일` : ""}`;

  return `
    <div class="problem-visual-card problem-calendar-visual problem-calendar-visual--dates">
      <div class="calendar-month-label">${month}월</div>
      <div class="calendar-date-strip">
        ${days.map((day) => {
          const distance = day - startDay;
          const isPath = revealAnswer && day >= startDay && day <= targetDay;
          const classes = [
            "calendar-date-chip",
            day === startDay ? "is-start" : "",
            shouldMarkTarget && day === targetDay ? "is-answer" : "",
            isPath ? "is-path" : ""
          ].filter(Boolean).join(" ");
          const label = day === startDay
            ? "0"
            : (isPath && distance > 0 ? `${distance}` : "");
          return `<span class="${classes}" style="--order:${Math.max(0, distance)}"><b>${day}</b>${label ? `<em>${label}</em>` : ""}</span>`;
        }).join("")}
      </div>
      <div class="calendar-jump-note">${escapeHtml(jumpNote)}</div>
    </div>
  `;
}

function renderUnknownClock(label) {
  return `
    <div class="mini-clock-card mini-clock-card--unknown">
      <div class="mini-clock-label">${escapeHtml(label)}</div>
      <div class="mini-clock mini-clock--unknown"><span>?</span></div>
    </div>
  `;
}

function renderMiniClock(hour, minute, label) {
  const minuteDeg = minute * 6;
  const hourDeg = ((hour % 12) * 30) + minute * 0.5;
  return `
    <div class="mini-clock-card">
      <div class="mini-clock-label">${label} ${hour}시 ${minute}분</div>
      <div class="mini-clock">
        <span class="clock-mark clock-mark--12">12</span>
        <span class="clock-mark clock-mark--3">3</span>
        <span class="clock-mark clock-mark--6">6</span>
        <span class="clock-mark clock-mark--9">9</span>
        <i class="clock-hand clock-hour" style="transform:rotate(${hourDeg}deg)"></i>
        <i class="clock-hand clock-minute" style="transform:rotate(${minuteDeg}deg)"></i>
        <b></b>
      </div>
    </div>
  `;
}

function renderMiniLengthVisual(question, options = {}) {
  const scene = question?.scene?.type === "length" ? question.scene : null;
  const revealAnswer = options.revealAnswer === true;

  if (scene) {
    return renderStructuredLengthVisual(scene, { revealAnswer });
  }

  const text = `${question.prompt || ""} ${(question.scene?.lines || []).join(" ")}`;
  const values = [...text.matchAll(/(\d+)\s*(m|cm)/g)]
    .map((match) => ({ value: Number(match[1]), unit: match[2], cm: match[2] === "m" ? Number(match[1]) * 100 : Number(match[1]) }))
    .slice(0, 4);

  if (!values.length) {
    return `<div class="problem-visual-card problem-length-visual"><span>길이</span></div>`;
  }

  const max = Math.max(...values.map((item) => item.cm), 1);
  return `
    <div class="problem-visual-card problem-length-visual">
      ${values.map((item) => `
        <div class="length-row">
          <span>${item.value}${item.unit}</span>
          <div><i style="width:${Math.max(12, Math.round(item.cm / max * 100))}%"></i></div>
          <strong>${revealAnswer || item.unit === "cm" ? `${item.cm}cm` : "100cm씩"}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStructuredLengthVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;

  if (scene.kind === "estimate") {
    const realCm = Number(scene.realCm || scene.estimateCm || 0);
    const estimateCm = Number(scene.estimateCm || realCm || 0);
    const estimates = Array.isArray(scene.estimates) && scene.estimates.length
      ? scene.estimates
      : [Math.max(1, estimateCm - 8), estimateCm, estimateCm + 12];
    const max = Math.max(...estimates, realCm, estimateCm, 1);
    return `
      <div class="problem-visual-card problem-length-estimate">
        <strong>${escapeHtml(scene.objectName || scene.estimateText || "어림")}</strong>
        ${scene.clue ? `<small>${escapeHtml(scene.clue)}</small>` : ""}
        <div class="estimate-scale">
          ${estimates.slice(0, 4).map((value) => `
            <span class="${revealAnswer && value === estimateCm ? "is-nearest" : ""}" style="--w:${Math.round(value / max * 100)}%">
              <i></i><b>${value}cm</b>
            </span>
          `).join("")}
        </div>
        ${scene.estimateText ? `<div class="length-equation">${revealAnswer ? escapeHtml(scene.estimateText) : "알맞은 길이 고르기"}</div>` : ""}
      </div>
    `;
  }

  if (scene.kind === "m-to-cm") {
    const meters = Number(scene.meters) || 0;
    const cm = Number(scene.cm) || 0;
    const totalCm = Number(scene.totalCm) || meters * 100 + cm;
    return `
      <div class="problem-visual-card problem-length-visual problem-length-visual--structured">
        <div class="mini-meter-bundles">
          ${Array.from({ length: Math.min(meters, 5) }, () => `<span>100cm</span>`).join("")}
          ${cm ? `<i>${cm}cm</i>` : ""}
        </div>
        <div class="length-equation">${meters}m ${cm}cm = ${revealAnswer ? `${totalCm}cm` : "?cm"}</div>
      </div>
    `;
  }

  if (scene.kind === "cm-to-m") {
    const meters = Number(scene.meters) || 0;
    const cm = Number(scene.cm) || 0;
    const totalCm = Number(scene.totalCm) || meters * 100 + cm;
    return `
      <div class="problem-visual-card problem-length-visual problem-length-visual--structured">
        <div class="mini-meter-bundles">
          ${Array.from({ length: Math.min(meters, 5) }, () => `<span>1m</span>`).join("")}
          ${cm ? `<i>${cm}cm</i>` : ""}
        </div>
        <div class="length-equation">${totalCm}cm = ${revealAnswer ? `${meters}m ${cm}cm` : "?m ?cm"}</div>
      </div>
    `;
  }

  if (scene.kind === "unit-choice") {
    return `
      <div class="problem-visual-card problem-length-visual problem-length-visual--unit">
        <div class="mini-door-shape">교실 문</div>
        <div class="mini-unit-row"><span>cm<br><small>작은 물건</small></span><span>m<br><small>큰 길이</small></span></div>
      </div>
    `;
  }

  if (scene.kind === "ruler-zero") {
    return `
      <div class="problem-visual-card problem-length-visual problem-length-visual--ruler">
        <div class="mini-ruler-track">${Array.from({ length: 9 }, (_, index) => `<span>${index}</span>`).join("")}</div>
        <div class="mini-ruler-object">시작은 0 눈금</div>
      </div>
    `;
  }

  const parts = Array.isArray(scene.parts) ? scene.parts : [];
  if (!parts.length) {
    return `<div class="problem-visual-card problem-length-visual"><span>길이</span></div>`;
  }

  const max = Math.max(...parts.map((item) => Number(item.cm) || 0), Number(scene.totalCm) || 0, 1);
  const rows = parts.map((item) => renderLengthBarRow(item, max)).join("");
  const equation = scene.kind === "compare"
    ? `${parts[0]?.cm ?? "?"} - ${parts[1]?.cm ?? "?"} = ${revealAnswer ? `${scene.differenceCm}cm` : "?cm"}`
    : `${parts.map((item) => item.cm).join(" + ")} = ${revealAnswer ? `${scene.totalCm}cm` : "?cm"}`;

  return `
    <div class="problem-visual-card problem-length-visual problem-length-visual--structured">
      ${rows}
      <div class="length-equation">${escapeHtml(equation)}</div>
    </div>
  `;
}

function renderLengthBarRow(item, max) {
  const cm = Number(item.cm) || 0;
  const text = item.text || `${cm}cm`;
  const label = item.label || text;
  return `
    <div class="length-row">
      <span>${escapeHtml(label)}</span>
      <div><i style="width:${Math.max(12, Math.round(cm / max * 100))}%"></i></div>
      <strong>${escapeHtml(text)}</strong>
    </div>
  `;
}

function renderMiniPlaceValueVisual(prompt, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  if (/바로 앞|바로 뒤/.test(prompt)) {
    const number = extractFirstNumber(prompt);
    if (Number.isFinite(number)) {
      const before = number - 1;
      const after = number + 1;
      const leftValue = revealAnswer ? before : "?";
      const rightValue = revealAnswer ? after : "?";
      return `
        <div class="problem-visual-card problem-neighbor-hint ${revealAnswer ? "is-revealed" : ""}">
          <p>기준 수에서 한 칸만 움직여요</p>
          <div class="neighbor-hint-line">
            <span class="neighbor-slot ${revealAnswer ? "is-revealed-slot" : "is-unknown"}">
              <em>바로 앞</em>
              <strong>${leftValue}</strong>
            </span>
            <i aria-hidden="true">-1</i>
            <span class="neighbor-slot is-center">
              <em>기준 수</em>
              <strong>${number}</strong>
            </span>
            <i aria-hidden="true">+1</i>
            <span class="neighbor-slot ${revealAnswer ? "is-revealed-slot" : "is-unknown"}">
              <em>바로 뒤</em>
              <strong>${rightValue}</strong>
            </span>
          </div>
        </div>
      `;
    }
  }

  if (/□/.test(prompt) && /\+/.test(prompt)) {
    const leftSide = String(prompt || "").split("=")[0];
    const tokens = leftSide.split("+").map((token) => token.trim()).filter(Boolean);
    return `
      <div class="problem-visual-card problem-expanded-place problem-expanded-place--missing ${revealAnswer ? "is-revealed" : ""}">
        ${tokens.slice(0, 5).map((token, index) => `
          <span class="${token.includes("□") ? "is-missing" : ""}">${token.includes("□") ? "□" : escapeHtml(token)}</span>
          ${index < Math.min(tokens.length, 5) - 1 ? `<i>+</i>` : ""}
        `).join("")}
        <strong>= ${revealAnswer ? escapeHtml(String(prompt).split("=")[1]?.match(/\d+/)?.[0] || "?") : "?"}</strong>
      </div>
    `;
  }

  const expandedExpression = String(prompt || "").match(/\d+(?:\s*\+\s*\d+)+/);
  if (expandedExpression) {
    const parts = expandedExpression[0].split(/\s*\+\s*/).map(Number);
    const total = parts.reduce((sum, value) => sum + value, 0);
    return `
      <div class="problem-visual-card problem-expanded-place ${revealAnswer ? "is-revealed" : ""}">
        ${parts.slice(0, 5).map((part, index) => `
          <span>${part}</span>
          ${index < Math.min(parts.length, 5) - 1 ? `<i>+</i>` : ""}
        `).join("")}
        ${revealAnswer ? `<strong>= ${total}</strong>` : `<strong>= ?</strong>`}
      </div>
    `;
  }

  const number = extractFirstNumber(prompt);
  if (!Number.isFinite(number)) {
    return `<div class="problem-visual-card problem-place-value"><span>천</span><span>백</span><span>십</span><span>일</span></div>`;
  }

  const digits = String(number).split("").map(Number);
  const labels = digits.length >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"];
  return `
    <div class="problem-visual-card problem-place-value">
      ${labels.map((label, index) => `
        <div>
          <span>${label}</span>
          <strong>${digits[index] ?? 0}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStructuredShapeVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  if (scene.kind === "shape-grid") {
    const items = Array.isArray(scene.items) ? scene.items : [];
    const targetLabels = new Set((scene.targetLabels || []).map(String));
    return `
      <div class="problem-visual-card problem-shape-grid-board ${revealAnswer ? "is-revealed" : ""}">
        <div class="shape-grid" style="--columns:${scene.columns || Math.min(items.length || 1, 4)}">
          ${items.map((item) => {
            const label = String(item.label || item.name || "");
            const isTarget = revealAnswer && targetLabels.has(label);
            return `
              <div class="shape-card ${isTarget ? "is-target" : ""}" style="--shape-scale:${item.scale || 1}">
                ${shapeSVG(item, "shape-svg")}
                <small>${escapeHtml(label)}</small>
              </div>
            `;
          }).join("")}
        </div>
        <div class="shape-grid-note">${escapeHtml(revealAnswer ? (scene.answerNote || scene.note || "조건에 맞는 도형을 표시했어요") : (scene.note || "조건에 맞는 도형을 찾아요"))}</div>
      </div>
    `;
  }

  if (scene.kind === "object-shapes") {
    const items = Array.isArray(scene.items) ? scene.items : [];
    const targetNames = new Set((scene.targetNames || []).map(String));
    return `
      <div class="problem-visual-card problem-object-shapes ${revealAnswer ? "is-revealed" : ""}">
        <div class="object-shape-grid">
          ${items.map((item) => {
            const isTarget = revealAnswer && targetNames.has(String(item.name || ""));
            return `
              <div class="object-shape-card ${isTarget ? "is-target" : ""}">
                ${shapeSVG({ kind: item.kind || "circle" }, "shape-svg")}
                <b>${escapeHtml(item.name || "")}</b>
                <small>${escapeHtml(item.label || "")}</small>
              </div>
            `;
          }).join("")}
        </div>
        <div class="shape-grid-note">${escapeHtml(revealAnswer ? (scene.answerNote || scene.note || "맞는 물건을 표시했어요") : (scene.note || "물건의 바깥 윤곽을 도형으로 바꾸어 봐요"))}</div>
      </div>
    `;
  }

  if (scene.kind === "tangram-labelled") {
    return renderTangramLabelledVisual(scene, revealAnswer);
  }

  if (scene.kind === "stack-workbook") {
    return renderStackWorkbookVisual(scene, revealAnswer);
  }

  if (scene.kind === "tangram-count") {
    const pieces = [
      "triangle", "triangle", "triangle", "triangle", "triangle", "square", "parallelogram"
    ];
    return `
      <div class="problem-visual-card problem-tangram-board ${revealAnswer ? "is-revealed" : ""}">
        <div class="tangram-piece-row">
          ${pieces.map((kind, index) => `<span class="${kind === "triangle" ? "is-target" : ""}">${renderTangramPiece(kind)}${revealAnswer && kind === "triangle" ? `<b>${index + 1 <= 5 ? index + 1 : ""}</b>` : ""}</span>`).join("")}
        </div>
        <div class="tangram-note">${revealAnswer ? "삼각형 조각만 세면 5개" : "같은 모양 조각을 찾아 세기"}</div>
      </div>
    `;
  }

  if (scene.kind === "tangram-compose") {
    const target = shapeNameToKind(scene.target || "사각형");
    return `
      <div class="problem-visual-card problem-tangram-compose ${revealAnswer ? "is-revealed" : ""}">
        <div class="compose-pieces">
          ${renderSimpleShape("triangle")}
          ${renderSimpleShape("triangle")}
        </div>
        <i></i>
        <div class="compose-target">${revealAnswer ? renderSimpleShape(target) : "<strong>?</strong>"}</div>
        <small>${revealAnswer ? `바깥 윤곽: ${escapeHtml(scene.target || "")}` : "조각을 돌려 맞춘 뒤 바깥 윤곽 보기"}</small>
      </div>
    `;
  }

  if (scene.kind === "stack-cubes") {
    const towers = Array.isArray(scene.towers) ? scene.towers : [1, 2, 1, 3];
    const maxHeight = Math.max(...towers, 1);
    const askTop = scene.ask === "top";
    return `
      <div class="problem-visual-card problem-stack-board ${askTop ? "is-top-question" : ""}">
        <div class="stack-towers" style="--max-stack:${maxHeight}">
          ${towers.map((height) => `
            <span style="--h:${height}">
              ${Array.from({ length: height }, () => "<i></i>").join("")}
              ${revealAnswer ? `<b>${askTop ? "1칸" : `${height}개`}</b>` : ""}
            </span>
          `).join("")}
        </div>
        <div class="stack-top-strip">
          ${towers.map((height) => `<span class="${height > 0 ? "is-filled" : ""}"></span>`).join("")}
        </div>
        <small>${askTop ? "위에서 보면 높이가 아니라 자리가 보여요" : "각 자리의 높이를 모두 더해요"}</small>
      </div>
    `;
  }

  return renderMiniShapeVisual((scene.lines || []).join(" "), options);
}

function renderTangramLabelledVisual(scene, revealAnswer) {
  const targetLabels = new Set((scene.targetLabels || []).map(String));
  const labelMode = scene.labelMode === "letters" ? "letter" : "label";
  const pieces = [
    { label: "1", letter: "ㄱ", kind: "triangle", name: "삼각형", labelX: 134, labelY: 74, points: [[18, 18], [242, 18], [130, 130]], fill: "#8f969d" },
    { label: "2", letter: "ㄴ", kind: "triangle", name: "삼각형", labelX: 208, labelY: 132, points: [[242, 18], [242, 242], [130, 130]], fill: "#c7ccd1" },
    { label: "3", letter: "ㄷ", kind: "triangle", name: "삼각형", labelX: 48, labelY: 84, points: [[18, 18], [18, 130], [74, 74]], fill: "#757c83" },
    { label: "4", letter: "ㄹ", kind: "square", name: "네모 조각", labelX: 64, labelY: 132, points: [[18, 130], [74, 74], [130, 130], [74, 186]], fill: "#f7fbff" },
    { label: "5", letter: "ㅁ", kind: "triangle", name: "삼각형", labelX: 130, labelY: 160, points: [[74, 186], [130, 130], [186, 186]], fill: "#eef1f4" },
    { label: "6", letter: "ㅂ", kind: "parallelogram", name: "옆으로 기울인 사각형", labelX: 168, labelY: 204, points: [[74, 186], [186, 186], [242, 242], [130, 242]], fill: "#d6dce2" },
    { label: "7", letter: "ㅅ", kind: "triangle", name: "삼각형", labelX: 50, labelY: 204, points: [[18, 130], [18, 242], [130, 242]], fill: "#626971" }
  ];
  const polygonMarkup = pieces.map((piece) => {
    const label = String(piece[labelMode]);
    const points = piece.points.map(([x, y]) => `${x},${y}`).join(" ");
    const isTarget = revealAnswer && targetLabels.has(label);
    const fill = isTarget ? "#fff1a6" : piece.fill;
    const stroke = isTarget ? "#eb9f18" : "#404854";
    return `
      <polygon class="${isTarget ? "is-target" : ""}" points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${isTarget ? 4 : 2.5}" stroke-linejoin="round"></polygon>
      <g>
        <circle cx="${piece.labelX}" cy="${piece.labelY}" r="16" fill="rgba(255,255,255,0.82)" stroke="${stroke}" stroke-width="2.3"></circle>
        <text x="${piece.labelX}" y="${piece.labelY + 7}" text-anchor="middle" font-size="22" font-weight="900" fill="#20384f">${escapeHtml(label)}</text>
      </g>
    `;
  }).join("");

  return `
    <div class="problem-visual-card problem-tangram-labelled ${revealAnswer ? "is-revealed" : ""}">
      <svg viewBox="0 0 260 260" role="img" aria-label="번호가 붙은 칠교 조각">
        <rect x="4" y="4" width="252" height="252" rx="22" fill="rgba(255,255,255,0.98)"></rect>
        ${polygonMarkup}
        <rect x="18" y="18" width="224" height="224" fill="none" stroke="#404854" stroke-width="2.8"></rect>
      </svg>
      <div class="tangram-note">${escapeHtml(revealAnswer ? (scene.note || "조건에 맞는 조각을 표시했어요") : "조각 하나씩 바깥 윤곽을 보고 분류하기")}</div>
    </div>
  `;
}

function renderStackWorkbookVisual(scene, revealAnswer) {
  const groups = Array.isArray(scene.groups) && scene.groups.length
    ? scene.groups
    : [{ label: "가", towers: [2, 1, 1, 1], caption: "한 모양" }];
  const targetLabels = new Set((scene.targetLabels || []).map(String));
  const maxHeight = Math.max(1, ...groups.flatMap((group) => Array.isArray(group.towers) ? group.towers : [1]));

  return `
    <div class="problem-visual-card problem-stack-workbook ${revealAnswer ? "is-revealed" : ""}" style="--max-stack:${maxHeight};--stack-group-count:${Math.min(groups.length, 5)}">
      <div class="stack-workbook-grid">
        ${groups.map((group) => {
          const towers = Array.isArray(group.towers) ? group.towers : [1];
          const total = towers.reduce((sum, height) => sum + height, 0);
          const firstFloor = towers.filter((height) => height > 0).length;
          const highest = Math.max(...towers, 0);
          const isTarget = revealAnswer && targetLabels.has(String(group.label));
          const metric = scene.ask === "first-floor"
            ? `1층 ${firstFloor}개`
            : scene.ask === "highest"
              ? `가장 높은 곳 ${highest}층`
              : scene.ask === "description"
                ? group.caption || group.label
                : `모두 ${total}개`;
          return `
            <div class="stack-workbook-card ${isTarget ? "is-target" : ""}">
              <b>${escapeHtml(group.caption || group.label || "")}</b>
              <div class="stack-workbook-towers">
                ${towers.map((height) => `
                  <span style="--h:${height}">
                    ${Array.from({ length: height }, () => "<i></i>").join("")}
                  </span>
                `).join("")}
              </div>
              <small>${escapeHtml(revealAnswer ? metric : (group.caption || group.label || ""))}</small>
            </div>
          `;
        }).join("")}
      </div>
      <div class="shape-grid-note">${escapeHtml(revealAnswer ? (scene.note || "조건에 맞는 모양을 표시했어요") : (scene.note || "쌓인 자리와 높이를 나누어 봐요"))}</div>
    </div>
  `;
}

function renderTangramPiece(kind) {
  if (kind === "square") {
    return `<svg class="mini-shape-svg" viewBox="0 0 100 100" aria-hidden="true"><rect x="18" y="18" width="64" height="64" rx="6"></rect></svg>`;
  }
  if (kind === "parallelogram") {
    return `<svg class="mini-shape-svg" viewBox="0 0 100 100" aria-hidden="true"><polygon points="30,18 88,18 70,82 12,82"></polygon></svg>`;
  }
  return renderSimpleShape("triangle");
}

function renderMiniShapeVisual(prompt, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  const isFeatureToName = /변이\s*\d+개|꼭짓점이\s*\d+개|굽은 선/.test(prompt)
    && !/삼각형|사각형|오각형|육각형|원/.test(prompt);
  const isShapePattern = /다음에 올 도형|도형.*다음/.test(prompt);

  if (!revealAnswer && isShapePattern) {
    return `
      <div class="problem-visual-card problem-shape-condition problem-shape-condition--pattern">
        <span>삼각형</span>
        <span>사각형</span>
        <span>삼각형</span>
        <span>사각형</span>
        <strong>?</strong>
      </div>
    `;
  }

  if (!revealAnswer && isFeatureToName) {
    const sideCount = (prompt.match(/변이\s*(\d+)개/) || [])[1];
    const vertexCount = (prompt.match(/꼭짓점이\s*(\d+)개/) || [])[1];
    const curveText = prompt.includes("굽은 선") ? "굽은 선" : "곧은 변";
    return `
      <div class="problem-visual-card problem-shape-condition">
        <span>${escapeHtml(curveText)}</span>
        <span>변 ${escapeHtml(sideCount || "?")}개</span>
        <span>꼭짓점 ${escapeHtml(vertexCount || "0")}개</span>
      </div>
    `;
  }

  const shapeName = prompt.includes("원") ? "원"
    : prompt.includes("육각") || prompt.includes("6") ? "육각형"
      : prompt.includes("오각") || prompt.includes("5") ? "오각형"
        : prompt.includes("사각") || prompt.includes("4") ? "사각형"
          : "삼각형";
  const shapeMap = {
    "삼각형": "triangle",
    "사각형": "square",
    "오각형": "pentagon",
    "육각형": "hexagon",
    "원": "circle"
  };
  return `
    <div class="problem-visual-card problem-shape-visual">
      ${renderSimpleShape(shapeMap[shapeName] || "triangle")}
      <span>${shapeName}</span>
    </div>
  `;
}

function renderSimpleShape(kind) {
  const paths = {
    triangle: `<polygon points="50,8 92,88 8,88"></polygon>`,
    square: `<rect x="16" y="16" width="68" height="68" rx="8"></rect>`,
    pentagon: `<polygon points="50,8 92,38 76,88 24,88 8,38"></polygon>`,
    hexagon: `<polygon points="28,10 72,10 94,50 72,90 28,90 6,50"></polygon>`,
    circle: `<circle cx="50" cy="50" r="38"></circle>`
  };
  return `<svg class="mini-shape-svg" viewBox="0 0 100 100" aria-hidden="true">${paths[kind] || paths.triangle}</svg>`;
}

function renderStructuredMultiplicationVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  if (scene.kind === "one-zero") {
    const factorA = Number(scene.factorA || 0);
    const factorB = Number(scene.factorB || 0);
    const mode = scene.mode || (factorA === 0 || factorB === 0 ? "zero" : "one");
    const groupCount = Math.max(0, Math.min(mode === "zero" ? 0 : Math.max(factorA, factorB), 8));
    return `
      <div class="problem-visual-card problem-one-zero">
        <div class="zero-one-groups">
          ${groupCount ? Array.from({ length: groupCount }, () => "<i></i>").join("") : "<span>0묶음</span>"}
        </div>
        <strong>${factorA}×${factorB}${revealAnswer ? `=${scene.product}` : ""}</strong>
      </div>
    `;
  }

  if (scene.kind === "table-grid") {
    const row = Number(scene.row || 2);
    const col = Number(scene.col || 1);
    const rows = [row - 1, row, row + 1].filter((value) => value >= 1);
    const cols = [Math.max(1, col - 1), col, col + 1];
    return `
      <div class="problem-visual-card problem-multiply-table">
        <div class="multiply-table-mini" style="--cols:${cols.length + 1}">
          <span></span>
          ${cols.map((value) => `<b>${value}</b>`).join("")}
          ${rows.map((r) => `
            <b>${r}단</b>
            ${cols.map((c) => {
              const isTarget = r === row && c === col;
              return `<span class="${isTarget ? "is-target" : ""}">${isTarget ? (revealAnswer ? row * col : "□") : ""}</span>`;
            }).join("")}
          `).join("")}
        </div>
        <small>${row}단에서 ${col}번째 칸</small>
      </div>
    `;
  }

  return renderMiniMultiplicationVisual((scene.lines || []).join(" "));
}

function renderMiniMultiplicationVisual(prompt) {
  const model = parseMultiplicationPromptModel(prompt);
  if (model.mode === "repeated-addition") {
    return `
      <div class="problem-visual-card problem-addition-strip">
        ${model.values.map((value, index) => `
          <span>${value}</span>
          ${index < model.values.length - 1 ? `<i>+</i>` : ""}
        `).join("")}
      </div>
    `;
  }

  if (model.mode === "equation") {
    return `
      <div class="problem-visual-card problem-equation-strip">
        <span>${model.each}</span>
        <i>×</i>
        <span>${model.groups}</span>
      </div>
    `;
  }

  if (model.mode === "total-items") {
    const safeTotal = Math.max(1, Math.min(model.total, 42));
    const columns = Math.min(7, Math.ceil(Math.sqrt(safeTotal)));
    return `
      <div class="problem-visual-card problem-loose-dots" style="--dot-columns:${columns}">
        ${Array.from({ length: safeTotal }, () => `<i></i>`).join("")}
      </div>
    `;
  }

  if (model.mode === "target-items") {
    const safeTotal = Math.max(1, Math.min(model.total, 42));
    const columns = Math.min(7, Math.ceil(Math.sqrt(safeTotal)));
    return `
      <div class="problem-visual-card problem-loose-dots problem-loose-dots--target" style="--dot-columns:${columns}">
        ${Array.from({ length: safeTotal }, () => `<i></i>`).join("")}
        <strong>목표 ${model.total}개</strong>
      </div>
    `;
  }

  const each = model.each;
  const groups = model.groups;
  const safeEach = Math.max(1, Math.min(each, 8));
  const safeGroups = Math.max(1, Math.min(groups || 4, 6));

  return `
    <div class="problem-visual-card problem-groups">
      ${Array.from({ length: safeGroups }, (_, group) => `
        <div class="dot-group" aria-label="${group + 1}묶음">
          ${Array.from({ length: safeEach }, () => `<i></i>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function parseMultiplicationPromptModel(prompt) {
  const text = String(prompt || "");
  let match = text.match(/(\d+)\s*×\s*(\d+)/);
  if (match) {
    return { mode: "equation", each: Number(match[1]), groups: Number(match[2]) };
  }

  match = text.match(/(?:모두\s*)?(\d+)\s*개(?:를|을)?.*?(\d+)\s*개씩/);
  if (match) {
    const total = Number(match[1]);
    const each = Number(match[2]);
    return { mode: "total-items", total, each, groups: Math.max(1, Math.ceil(total / Math.max(each, 1))) };
  }

  match = text.match(/(\d+)\s*개를 만들 수 있는 묶음/);
  if (match) {
    const total = Number(match[1]);
    return { mode: "target-items", total, each: 1, groups: total };
  }

  match = text.match(/(\d+)\s*개씩\s*(\d+)/);
  if (match) {
    return { each: Number(match[1]), groups: Number(match[2]) };
  }

  match = text.match(/(\d+)\s*씩\s*(\d+)\s*(?:번|묶음|묶|줄)/);
  if (match) {
    return { each: Number(match[1]), groups: Number(match[2]) };
  }

  const repeatedAddition = text.match(/\d+(?:\s*\+\s*\d+)+/);
  if (repeatedAddition) {
    const values = repeatedAddition[0].split(/\s*\+\s*/).map(Number);
    if (values.length > 1 && values.every((value) => value === values[0])) {
      return { mode: "repeated-addition", each: values[0], groups: values.length, values };
    }
  }

  match = text.match(/(\d+)\s*(?:묶음|묶|줄|번)/);
  if (match) {
    return { each: 1, groups: Number(match[1]) };
  }

  return { each: 3, groups: 4 };
}

function renderMiniPatternVisual(question) {
  const text = `${question.prompt || ""} ${(question.scene?.lines || []).join(" ")}`;
  const tokens = text.match(/\d+|\?|□|빨강|파랑|노랑|초록|삼각형|사각형|원/g) || [];
  const visibleTokens = tokens.slice(0, 6);
  return `
    <div class="problem-visual-card problem-pattern">
      ${visibleTokens.map((token, index) => `<span class="${index === visibleTokens.length - 1 ? "is-next" : ""}">${escapeHtml(token)}</span>`).join("")}
    </div>
  `;
}

function renderStructuredGraphVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  const values = Array.isArray(scene.values) ? scene.values : [];
  if (scene.kind === "survey-to-table") {
    const responses = Array.isArray(scene.responses) ? scene.responses : values.flatMap((item) => Array.from({ length: item.value || 0 }, () => item.label));
    const target = scene.target || values[0]?.label || "";
    return `
      <div class="problem-visual-card problem-survey-board ${revealAnswer ? "is-revealed" : ""}">
        <div class="survey-chip-cloud">
          ${responses.map((item) => `<span class="${item === target ? "is-target" : ""}">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="survey-table-mini">
          ${values.map((item) => `<span><b>${escapeHtml(item.label)}</b><i>${revealAnswer || item.label !== target ? `${item.value}명` : "?명"}</i></span>`).join("")}
        </div>
      </div>
    `;
  }

  if (scene.kind === "table-to-graph") {
    const target = scene.target || values[0]?.label || "";
    const max = Math.max(...values.map((item) => Number(item.value) || 0), 1);
    return `
      <div class="problem-visual-card problem-table-to-graph">
        <div class="survey-table-mini">
          ${values.map((item) => `<span><b>${escapeHtml(item.label)}</b><i>${item.value}명</i></span>`).join("")}
        </div>
        <div class="problem-bars">
          ${values.map((item) => `
            <div class="problem-bar-row ${item.label === target ? "is-target" : ""}">
              <span>${escapeHtml(item.label)}</span>
              <div><i style="width:${revealAnswer || item.label !== target ? Math.max(8, Math.round(item.value / max * 100)) : 10}%"></i></div>
              <strong>${revealAnswer || item.label !== target ? item.value : "?"}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  return renderMiniBarGraph(values);
}

function renderStructuredPatternVisual(scene, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  if (scene.kind === "addition-table" || scene.kind === "multiplication-table") {
    const sequence = Array.isArray(scene.sequence) ? scene.sequence : [2, 4, 6, 8];
    const change = Number(scene.change || 1);
    return `
      <div class="problem-visual-card problem-table-pattern">
        <div class="pattern-number-row">
          ${sequence.map((value, index) => `
            <span>${value}</span>
            ${index < sequence.length - 1 ? `<i>+${change}</i>` : ""}
          `).join("")}
        </div>
        <small>${scene.kind === "addition-table" ? "덧셈표" : "곱셈표"} 한 줄의 변화</small>
      </div>
    `;
  }

  if (scene.kind === "stacking") {
    const heights = Array.isArray(scene.heights) ? scene.heights : [1, 2, 3];
    const maxHeight = Math.max(...heights, Number(scene.next || 0), 1);
    return `
      <div class="problem-visual-card problem-stack-pattern" style="--max-stack:${maxHeight}">
        ${heights.map((height) => `<span>${Array.from({ length: height }, () => "<i></i>").join("")}</span>`).join("")}
        <b>${revealAnswer ? Array.from({ length: Number(scene.next || maxHeight) }, () => "<i></i>").join("") : "?"}</b>
      </div>
    `;
  }

  if (scene.kind === "action-sound") {
    const shown = Array.isArray(scene.shown) ? scene.shown : ["박수", "박수", "발구르기", "박수", "박수"];
    return `
      <div class="problem-visual-card problem-action-pattern">
        ${shown.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        <strong>${revealAnswer ? escapeHtml(scene.next || "") : "?"}</strong>
      </div>
    `;
  }

  return renderMiniPatternVisual({ prompt: "", scene });
}

function renderMiniNumberLineVisual(prompt, options = {}) {
  const revealAnswer = options.revealAnswer === true;
  const blankAddLeft = prompt.match(/□\s*\+\s*(\d+)\s*=\s*(\d+)/);
  if (blankAddLeft) {
    const known = Number(blankAddLeft[1]);
    const total = Number(blankAddLeft[2]);
    const missing = total - known;
    return `
      <div class="problem-visual-card problem-number-line">
        <div class="number-line-track">
          <span>${total}</span>
          <i></i>
          <strong>-${known}</strong>
          <span>${revealAnswer ? missing : "□"}</span>
        </div>
        <small>${revealAnswer ? `□ + ${known} = ${total} → ${total} - ${known} = ${missing}` : `□ + ${known} = ${total}`}</small>
      </div>
    `;
  }

  const blankAddRight = prompt.match(/(\d+)\s*\+\s*□\s*=\s*(\d+)/);
  if (blankAddRight) {
    const known = Number(blankAddRight[1]);
    const total = Number(blankAddRight[2]);
    const missing = total - known;
    return `
      <div class="problem-visual-card problem-number-line">
        <div class="number-line-track">
          <span>${total}</span>
          <i></i>
          <strong>-${known}</strong>
          <span>${revealAnswer ? missing : "□"}</span>
        </div>
        <small>${revealAnswer ? `${known} + □ = ${total} → ${total} - ${known} = ${missing}` : `${known} + □ = ${total}`}</small>
      </div>
    `;
  }

  const blankSubLeft = prompt.match(/□\s*-\s*(\d+)\s*=\s*(\d+)/);
  if (blankSubLeft) {
    const sub = Number(blankSubLeft[1]);
    const result = Number(blankSubLeft[2]);
    const missing = result + sub;
    return `
      <div class="problem-visual-card problem-number-line">
        <div class="number-line-track">
          <span>${result}</span>
          <i></i>
          <strong>+${sub}</strong>
          <span>${revealAnswer ? missing : "□"}</span>
        </div>
        <small>${revealAnswer ? `□ - ${sub} = ${result} → ${result} + ${sub} = ${missing}` : `□ - ${sub} = ${result}`}</small>
      </div>
    `;
  }

  const blankSubRight = prompt.match(/(\d+)\s*-\s*□\s*=\s*(\d+)/);
  if (blankSubRight) {
    const start = Number(blankSubRight[1]);
    const result = Number(blankSubRight[2]);
    const missing = start - result;
    return `
      <div class="problem-visual-card problem-number-line">
        <div class="number-line-track">
          <span>${start}</span>
          <i></i>
          <strong>-${result}</strong>
          <span>${revealAnswer ? missing : "□"}</span>
        </div>
        <small>${revealAnswer ? `${start} - □ = ${result} → ${start} - ${result} = ${missing}` : `${start} - □ = ${result}`}</small>
      </div>
    `;
  }

  const numbers = (prompt.match(/\d+/g) || []).map(Number);
  const left = numbers[0];
  const right = numbers[1];
  const operator = prompt.includes("-") ? "-" : "+";
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return `<div class="problem-visual-card problem-number-line"><span>?</span></div>`;
  }
  const result = operator === "+" ? left + right : left - right;
  return `
    <div class="problem-visual-card problem-number-line">
      <div class="number-line-track">
        <span>${left}</span>
        <i></i>
        <strong>${operator}${right}</strong>
        <span>${revealAnswer ? result : "?"}</span>
      </div>
      <small>${left} ${operator} ${right} = ${revealAnswer ? result : "?"}</small>
    </div>
  `;
}

function renderPlayerBoard() {
  playerBoard.style.setProperty("--player-columns", String(Math.min(state.players.length, 6)));
  playerBoard.dataset.playerCount = String(state.players.length);
  playerBoard.innerHTML = state.players.map((player) => {
    const playerState = state.scores[player.id];
    const question = playerState.currentQuestion;
    const isChoosingDifficulty = !playerState.difficulty && !state.gameEnded;
    const isWaitingForStart = !isChoosingDifficulty && !question && !state.gameEnded;
    const promptText = isChoosingDifficulty
      ? `${player.name}의 난이도를 골라 주세요.`
      : isWaitingForStart
        ? `${player.name}은 ${DIFFICULTY_NAMES[playerState.difficulty]} 준비가 끝났어요.`
        : question
          ? question.prompt
          : "전체 시간이 끝났어요.";
    const promptSizeClass = question ? getPromptSizeClass(question.prompt) : "";
    const isBasicPrompt = playerState.difficulty === "low" && promptSizeClass === "player-prompt--short";
    const optionLabels = question
      ? question.options.map((_, index) => OPTION_LABELS[index] || String(index + 1))
      : [];
    const optionSizeClass = question && question.options.every((option) => compactOptionText(option).length <= 7)
      ? "answer-grid--roomy"
      : "";
    const buttons = optionLabels.map((label, index) => {
      const classNames = ["answer-button"];

      if (playerState.lastAnswer === index) {
        classNames.push("is-selected");
        if (playerState.lastOutcome === "correct" && playerState.revealCorrect === index) {
          classNames.push("is-correct");
        } else if (playerState.lastOutcome === "retry" || playerState.lastOutcome === "wrong-final") {
          classNames.push("is-wrong");
        }
      } else if (
        playerState.revealCorrect === index &&
        playerState.locked &&
        (playerState.lastOutcome === "correct" || playerState.lastOutcome === "wrong-final")
      ) {
        classNames.push("is-correct");
      }

      return `
        <button
          type="button"
          class="${classNames.join(" ")}"
          data-player="${player.id}"
          data-option="${index}"
          ${state.gameEnded || playerState.locked || !question ? "disabled" : ""}
        >
          <span class="answer-label">${label}</span>
          <span class="answer-copy">${question ? question.options[index] : ""}</span>
        </button>
      `;
    }).join("");
    const difficultyButtons = DIFFICULTY_OPTIONS.map((option) => `
      <button
        type="button"
        class="difficulty-select-button difficulty-select-button--${option.value}"
        data-player="${player.id}"
        data-difficulty="${option.value}"
      >
        <strong>${option.label}</strong>
        <span>${option.description}</span>
      </button>
    `).join("");
    const retryHintMarkup = question && playerState.lastOutcome === "retry" && playerState.retryHint
      ? `
        <div class="player-retry-hint" role="status">
          <span>힌트</span>
          <strong>${escapeHtml(playerState.retryHint)}</strong>
        </div>
      `
      : "";

    const answerAreaMarkup = isChoosingDifficulty
      ? `
          <div class="difficulty-select-grid">
            <p class="difficulty-select-note">문제 나오기 전에 ${player.name}의 난이도를 골라 주세요.</p>
            ${difficultyButtons}
          </div>
        `
      : isWaitingForStart
        ? `
          <div class="difficulty-select-grid difficulty-select-grid--waiting">
            <p class="difficulty-select-note">${player.name} · ${DIFFICULTY_NAMES[playerState.difficulty]} 선택 완료</p>
            <div class="player-wait-card">다른 친구들이 난이도를 고르는 중이에요.<br>모두 고르면 동시에 시작해요.</div>
          </div>
        `
      : `
        <div class="answer-stack ${retryHintMarkup ? "has-hint" : ""}">
          ${retryHintMarkup}
          <div class="answer-grid ${optionSizeClass}" style="--option-count:${Math.max(2, optionLabels.length)}">${buttons}</div>
        </div>
      `;

    const explanationOverlay = playerState.showExplanation && question
      ? renderPlayerExplanationOverlay(player, question, playerState)
      : "";

    const successStamp = playerState.isCelebrating
      ? `<div class="player-stamp" aria-hidden="true"><span>참 잘했어요</span></div>`
      : "";

    const celebrationNote = playerState.isCelebrating && playerState.celebrationText
      ? `<div class="player-celebration-note">${playerState.celebrationText}</div>`
      : "";

    return `
      <article class="player-panel ${playerState.isCelebrating ? "is-celebrating" : ""} ${playerState.isShaking ? "is-shaking" : ""} ${playerState.showExplanation ? "is-explaining" : ""}" style="background:${player.color}">
        <div class="player-head">
          <div class="player-head-copy">
            <div class="player-identity">
              <span class="player-avatar-chip" aria-hidden="true">${player.avatar}</span>
              <strong>${player.name}</strong>
            </div>
            <span class="player-status-badge">${playerState.status}</span>
          </div>
          <span class="player-score">${playerState.score}점</span>
        </div>
        <div class="player-question ${isBasicPrompt ? "player-question--basic" : ""}">
          <p class="player-kicker">${isChoosingDifficulty ? "첫 화면 · 난이도 선택" : isWaitingForStart ? "난이도 선택 완료" : question ? "문제를 읽고 답을 골라요" : "놀이 마침"}</p>
          <p class="player-prompt ${isBasicPrompt ? "player-prompt--basic" : ""} ${promptSizeClass}">${escapeHtml(promptText)}</p>
        </div>
        <div class="player-scene">
          ${question ? renderProblemStage(player, playerState, question) : (isChoosingDifficulty || isWaitingForStart || !state.gameEnded ? renderAnimalStage(player, playerState) : `<div class="player-finished">${player.avatar} 수고했어요!</div>`)}
        </div>
        <div class="player-answer-shell">
          ${answerAreaMarkup}
          ${successStamp}
          ${celebrationNote}
        </div>
        ${explanationOverlay}
      </article>
    `;
  }).join("");
}

function getPromptSizeClass(prompt) {
  const compact = String(prompt || "").replace(/\s+/g, "");
  if (compact.length <= 18) {
    return "player-prompt--short";
  }
  if (compact.length <= 26) {
    return "player-prompt--medium";
  }
  if (compact.length <= 42) {
    return "player-prompt--long";
  }
  return "player-prompt--xlong";
}

function compactOptionText(optionText) {
  return optionText.replace(": ", " ").replace(/\s+/g, " ");
}

function numberLastDigit(value) {
  const number = Math.abs(Number(value));
  return Number.isFinite(number) ? number % 10 : 0;
}

function numberHasFinalConsonant(value) {
  return [0, 1, 3, 6, 7, 8].includes(numberLastDigit(value));
}

function numberObjectParticle(value) {
  return numberHasFinalConsonant(value) ? "을" : "를";
}

function numberSubjectParticle(value) {
  return numberHasFinalConsonant(value) ? "이" : "가";
}

function numberDirectionParticle(value) {
  const lastDigit = numberLastDigit(value);
  const endsWithRieul = [1, 7, 8].includes(lastDigit);
  return numberHasFinalConsonant(value) && !endsWithRieul ? "으로" : "로";
}

function buildBorrowSplitParts(left, right, result = left - right) {
  const leftOnes = Math.abs(left) % 10;
  const rightOnes = Math.abs(right) % 10;
  const splitMain = left - leftOnes - 10;
  const splitOnes = leftOnes + 10;
  const rightMain = right - rightOnes;
  const resultMain = splitMain - rightMain;
  const resultOnes = splitOnes - rightOnes;

  return {
    left,
    right,
    result,
    splitMain,
    splitOnes,
    rightMain,
    rightOnes,
    resultMain,
    resultOnes
  };
}

function formatBorrowSplitKeyLine(parts) {
  return `${parts.left}${numberObjectParticle(parts.left)} ${parts.splitMain}과 ${parts.splitOnes}${numberDirectionParticle(parts.splitOnes)} 바꿔요. ${parts.splitMain}에서 ${parts.rightMain}${numberObjectParticle(parts.rightMain)} 빼고 ${parts.splitOnes}에서 ${parts.rightOnes}${numberObjectParticle(parts.rightOnes)} 빼면 ${parts.result}${numberSubjectParticle(parts.result)} 남아요.`;
}

function formatBorrowSplitProof(parts, includeResult = true) {
  const proof = `${parts.splitMain}-${parts.rightMain}=${parts.resultMain}, ${parts.splitOnes}-${parts.rightOnes}=${parts.resultOnes}`;
  return includeResult ? `${proof} → ${parts.result}` : proof;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampFeedbackText(text, maxLength = 88) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const softCut = normalized.slice(0, maxLength);
  const lastStop = Math.max(
    softCut.lastIndexOf("."),
    softCut.lastIndexOf("?"),
    softCut.lastIndexOf("!")
  );
  const cutIndex = lastStop > 32 ? lastStop + 1 : maxLength;
  return `${normalized.slice(0, cutIndex).replace(/[,\s]+$/, "")}...`;
}

function renderPlayerExplanationOverlay(player, question, playerState) {
  const feedback = buildDetailedExplanation(question, playerState.lastAnswer);
  const selectedText = Number.isInteger(playerState.lastAnswer) && question.options[playerState.lastAnswer]
    ? compactOptionText(question.options[playerState.lastAnswer])
    : "";
  const correctText = playerState.revealCorrect !== null && question.options[playerState.revealCorrect]
    ? compactOptionText(question.options[playerState.revealCorrect])
    : "";
  const boardSummary = buildTeacherBoardSummary(question, feedback, selectedText, correctText);
  const selectedAnswer = renderExplanationAnswerChip("내 답", selectedText, "selected");
  const correctAnswer = renderExplanationAnswerChip("정답", correctText, "correct");
  const visualMarkup = `
    <section class="player-explanation-visual-card teacher-board-visual-card">
      <h4>${escapeHtml(feedback.visualTitle || "그림으로 다시 보기")}</h4>
      ${feedback.visualMarkup || renderQuestionLearningVisual(question, { revealAnswer: true })}
    </section>
  `;
  const answerMarkup = selectedAnswer || correctAnswer
    ? `
        <div class="teacher-board-answer-stack">
          ${selectedAnswer}
          ${correctAnswer}
        </div>
      `
    : "";

  return `
    <div class="player-explanation-overlay">
      <div class="player-explanation player-explanation--teacher-board">
        <div class="player-explanation-top teacher-board-top">
          <div class="teacher-board-heading">
            <strong>${escapeHtml(feedback.title)}</strong>
            <div class="teacher-board-keyline">
              <span>핵심</span>
              <b>${escapeHtml(boardSummary.keyLine)}</b>
            </div>
            ${renderTeacherPrinciplePanel(boardSummary)}
          </div>
        </div>
        <div class="teacher-board-main">
          <section class="teacher-board-visual">
            <div class="player-explanation-problem teacher-board-problem">${escapeHtml(question.prompt)}</div>
            <div class="teacher-board-canvas">
              ${visualMarkup}
            </div>
          </section>
        </div>
        <div class="teacher-board-bottom">
          ${answerMarkup}
          <button type="button" class="explanation-confirm-button teacher-board-confirm-button" data-player="${player.id}">
            확인
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderExplanationAnswerChip(label, text, modifier) {
  if (!text) {
    return "";
  }

  return `
    <div class="player-explanation-answer player-explanation-answer--${modifier}">
      <span class="player-explanation-answer-label">${escapeHtml(label)}</span>
      <span class="player-explanation-answer-text">${escapeHtml(text)}</span>
    </div>
  `;
}

function buildTeacherBoardSummary(question, feedback, selectedText, correctText) {
  const category = question.category || "";
  const prompt = question.prompt || "";
  const items = parseLabeledCounts(question);
  const shortAnswer = correctText ? clampFeedbackText(correctText, 18) : "정답 확인";
  const sceneKind = question.scene?.kind || "";
  const numbers = (prompt.match(/\d+/g) || []).map(Number);
  const base = {
    type: "number",
    keyLine: feedback.nextAction || feedback.learningGoal || "문제에서 묻는 말을 먼저 표시해요.",
    cueLabel: "묻는 말",
    cueMeaning: "무엇을 구하라는 말인지 먼저 찾기",
    actionLabel: "그림 행동",
    actionText: "조건을 그림 위에 표시하기",
    whyLabel: "왜?",
    whyText: `표시한 조건이 답 ${shortAnswer}로 이어져요.`,
    proofText: correctText ? `답 ${correctText}` : "정답 확인",
    checkText: "단위와 묻는 말을 다시 맞춰 보기",
    points: []
  };
  let model = null;

  if (category === "1-5" || category === "2-5" || items.length >= 3) {
    const maxItem = items.reduce((best, item) => !best || item.value > best.value ? item : best, null);
    const minItem = items.reduce((best, item) => !best || item.value < best.value ? item : best, null);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const target = items.find((item) => prompt.includes(item.label));
    const mentionedItems = items.filter((item) => prompt.includes(item.label));
    const unit = maxItem?.unit || minItem?.unit || (category === "2-5" ? "명" : "개");
    if (/합하면/.test(prompt) && mentionedItems.length >= 2) {
      const mentionedTotal = mentionedItems.reduce((sum, item) => sum + item.value, 0);
      model = {
        type: "table",
        keyLine: "두 항목을 ‘합하면’은 그 두 줄의 수만 더하라는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: `${mentionedItems.map((item) => item.label).join(" + ")}만 합치기`,
        actionLabel: "해야 할 일",
        actionText: "문제에 나온 두 항목의 줄에만 표시하기",
        whyText: "표 전체가 아니라 문제에서 이름을 말한 항목들만 함께 묻고 있어요.",
        proofText: `${mentionedItems.map((item) => item.value).join(" + ")} = ${mentionedTotal}${unit}`,
        checkText: "문제에 나온 이름만 더했는지 확인해요."
      };
    } else if (/모두|합하면/.test(prompt)) {
      model = {
        type: "table",
        keyLine: "‘모두’는 하나도 빠뜨리지 않고 전부 더하라는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: "모두 몇 명/개 = 전체를 구하기",
        actionLabel: "해야 할 일",
        actionText: "표의 모든 숫자를 체크하며 더하기",
        whyText: "각 줄은 서로 다른 항목이에요. 전체를 알려면 모든 줄의 수가 한 번씩 들어가야 해요.",
        proofText: items.length ? `${items.map((item) => item.value).join(" + ")} = ${total}${unit}` : `답 ${shortAnswer}`,
        checkText: `더한 항목 수와 표의 항목 수가 같은지 확인해요.`
      };
    } else if (/차이|몇.*더/.test(prompt)) {
      model = {
        type: "table",
        keyLine: "‘차이’는 큰 수에서 작은 수를 빼서 남는 만큼을 보는 거예요.",
        cueLabel: "문제 말",
        cueMeaning: "차이 = 얼마나 다른가",
        actionLabel: "해야 할 일",
        actionText: "가장 큰 수와 가장 작은 수에 표시하기",
        whyText: "두 막대를 같은 시작점에 놓으면 긴 막대에서 남는 부분이 차이예요.",
        proofText: maxItem && minItem ? `${maxItem.value} - ${minItem.value} = ${maxItem.value - minItem.value}${unit}` : `답 ${shortAnswer}`,
        checkText: "이름을 빼는 것이 아니라 수끼리 빼는지 확인해요."
      };
    } else if (/가장 많은|가장 큰/.test(prompt) && maxItem) {
      model = {
        type: "table",
        keyLine: "‘가장 많은’은 이름이 아니라 숫자가 가장 큰 줄을 고르는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: "가장 많은 = 제일 큰 수",
        actionLabel: "해야 할 일",
        actionText: "각 줄의 수를 비교하고 가장 큰 수에 동그라미",
        whyText: `${maxItem.label}의 수 ${maxItem.value}${maxItem.unit || unit}가 표에서 가장 커요.`,
        proofText: `${maxItem.label} ${maxItem.value}${maxItem.unit || unit} → 답 ${shortAnswer}`,
        checkText: "막대 길이와 숫자가 같은 항목을 가리키는지 확인해요."
      };
    } else if (minItem && /가장 적은|가장 작은/.test(prompt)) {
      model = {
        type: "table",
        keyLine: "‘가장 적은’은 숫자가 가장 작은 줄을 찾으라는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: "가장 적은 = 제일 작은 수",
        actionLabel: "해야 할 일",
        actionText: "각 줄의 수를 비교하고 가장 작은 수에 동그라미",
        whyText: `${minItem.label}의 수 ${minItem.value}${minItem.unit || unit}가 표에서 가장 작아요.`,
        proofText: `${minItem.label} ${minItem.value}${minItem.unit || unit} → 답 ${shortAnswer}`,
        checkText: "가장 짧은 막대와 숫자가 맞는지 확인해요."
      };
    } else if (/분류할 수 없는|기준/.test(prompt)) {
      model = {
        type: "classify",
        keyLine: "분류 문제는 보기보다 먼저 ‘기준’을 말해야 해요.",
        cueLabel: "문제 말",
        cueMeaning: "분류할 수 없는 것 = 기준에 안 맞는 것",
        actionLabel: "해야 할 일",
        actionText: "같은 것끼리 묶고, 묶이지 않는 하나 찾기",
        whyText: "운동 도구 기준으로 보면 공, 줄넘기, 훌라후프, 라켓은 같은 묶음이고 연필은 학용품이에요.",
        proofText: `기준 밖의 것 → ${shortAnswer}`,
        checkText: "정답이 왜 같은 묶음에 못 들어가는지 말로 설명해요."
      };
    } else {
      model = {
        type: "table",
        keyLine: "표는 위아래로 훑지 말고, 찾은 이름의 같은 줄을 가로로 따라가요.",
        cueLabel: "문제 말",
        cueMeaning: `${target?.label || "찾는 항목"}의 수를 묻기`,
        actionLabel: "해야 할 일",
        actionText: "항목 이름에서 옆 숫자까지 손가락으로 따라가기",
        whyText: target ? `${target.label} 옆에 적힌 수가 바로 ${target.label}의 수예요.` : "같은 줄의 이름과 수가 서로 짝이에요.",
        proofText: target ? `${target.label} → ${target.value}${target.unit || unit}` : `답 ${shortAnswer}`,
        checkText: "다른 줄의 숫자를 읽지 않았는지 확인해요."
      };
    }
  } else if (category === "1-4" || category === "2-3" || prompt.includes("cm") || prompt.includes("m")) {
    const lengthValues = extractLengthValuesFromQuestion(question);
    if (/0\s*눈금|0 눈금/.test(prompt) || sceneKind === "ruler-zero") {
      model = {
        type: "length",
        keyLine: "길이는 숫자를 세는 게 아니라 시작점에서 끝점까지의 거리예요.",
        cueLabel: "문제 말",
        cueMeaning: "0 눈금에서 시작 = 시작점을 맞추기",
        actionLabel: "해야 할 일",
        actionText: "물건의 한쪽 끝을 0에 맞추고 끝 눈금 읽기",
        whyText: "1부터 재면 처음 1cm가 빠진 것처럼 보여 실제 길이와 달라져요.",
        proofText: "시작 0 → 끝 눈금 = 실제 길이",
        checkText: "물건의 왼쪽 끝과 0 눈금이 딱 맞는지 봐요."
      };
    } else if (/한쪽 끝|다른 쪽 끝|시작 눈금|끝 눈금/.test(prompt) && lengthValues.length >= 2) {
      const start = Math.min(lengthValues[0].cm, lengthValues[1].cm);
      const end = Math.max(lengthValues[0].cm, lengthValues[1].cm);
      model = {
        type: "length",
        keyLine: "0에서 시작하지 않으면 끝 눈금에서 시작 눈금을 빼야 실제 길이예요.",
        cueLabel: "문제 말",
        cueMeaning: `시작 ${start}cm, 끝 ${end}cm`,
        actionLabel: "해야 할 일",
        actionText: "끝 눈금에서 시작 눈금까지 지나간 칸만 표시하기",
        whyText: "자는 숫자 자체가 길이가 아니라 두 눈금 사이의 거리예요.",
        proofText: `${end} - ${start} = ${end - start}cm`,
        checkText: "끝 눈금 숫자를 그대로 답으로 쓰지 않았는지 확인해요."
      };
    } else if (/알맞은 단위|단위는/.test(prompt) || sceneKind === "unit-choice") {
      model = {
        type: "length",
        keyLine: "단위는 물건의 크기에 맞춰 고르는 약속이에요.",
        cueLabel: "문제 말",
        cueMeaning: "알맞은 단위 = cm와 m 중 자연스러운 것",
        actionLabel: "해야 할 일",
        actionText: "손가락만 한 길이인지, 사람 키만 한 길이인지 떠올리기",
        whyText: "교실 문처럼 큰 길이는 cm로 쓰면 수가 너무 커서 m가 편해요.",
        proofText: `큰 길이 → m → 답 ${shortAnswer}`,
        checkText: "실제로 몸으로 재면 어느 단위가 편한지 생각해요."
      };
    } else if (/보다 몇 cm 더|차이/.test(prompt) || sceneKind === "compare") {
      const sceneParts = Array.isArray(question.scene?.parts)
        ? question.scene.parts.map((part) => ({ ...part, cm: Number(part.cm) })).filter((part) => Number.isFinite(part.cm))
        : [];
      const compareValues = sceneParts.length >= 2 ? sceneParts : lengthValues;
      const longer = compareValues.reduce((best, item) => !best || item.cm > best.cm ? item : best, null);
      const shorter = compareValues.reduce((best, item) => !best || item.cm < best.cm ? item : best, null);
      model = {
        type: "length",
        keyLine: "‘몇 cm 더 긴가’는 두 길이에서 남는 부분을 묻는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: "더 긴가 = 차이 구하기",
        actionLabel: "해야 할 일",
        actionText: "두 길이의 시작점을 맞추고 남는 꼬리 보기",
        whyText: "긴 길이 전체가 답이 아니라, 짧은 길이보다 더 남은 부분만 답이에요.",
        proofText: longer && shorter ? `${longer.cm} - ${shorter.cm} = ${longer.cm - shorter.cm}cm` : `답 ${shortAnswer}`,
        checkText: "큰 길이에서 작은 길이를 뺐는지 확인해요."
      };
    } else if (/m와 cm로|cm를 m/.test(prompt) || sceneKind === "cm-to-m") {
      const totalCm = lengthValues[0]?.cm || extractFirstNumber(prompt);
      const meters = Math.floor(totalCm / 100);
      const rest = totalCm % 100;
      model = {
        type: "length",
        keyLine: "100cm가 모이면 1m예요. 100씩 묶고 남은 cm를 봐요.",
        cueLabel: "문제 말",
        cueMeaning: "m와 cm로 = 100cm 묶음 만들기",
        actionLabel: "해야 할 일",
        actionText: "100cm씩 동그라미 치고 남은 cm 세기",
        whyText: `${totalCm}cm 안에 100cm 묶음이 ${meters}개 있고 ${rest}cm가 남아요.`,
        proofText: `${totalCm}cm = ${meters}m ${rest}cm`,
        checkText: "남은 cm가 100보다 작은지 확인해요."
      };
    } else if (sceneKind === "m-to-cm" || (/모두 몇 cm/.test(prompt) && /\d+\s*m/.test(prompt))) {
      const meters = question.scene?.meters ?? lengthValues.find((item) => item.unit === "m")?.value;
      const cm = question.scene?.cm ?? lengthValues.find((item) => item.unit === "cm")?.value ?? 0;
      model = {
        type: "length",
        keyLine: "m와 cm가 함께 나오면 먼저 모두 cm로 바꿔야 계산할 수 있어요.",
        cueLabel: "문제 말",
        cueMeaning: "모두 몇 cm = cm 단위로 답하기",
        actionLabel: "해야 할 일",
        actionText: "1m를 100cm로 바꾸고 남은 cm 더하기",
        whyText: "서로 다른 단위끼리는 바로 더하지 않고 같은 이름으로 맞춘 뒤 더해요.",
        proofText: Number.isFinite(meters) ? `${meters}m = ${meters * 100}cm, ${meters * 100} + ${cm} = ${shortAnswer}` : `답 ${shortAnswer}`,
        checkText: "답의 단위가 cm인지 확인해요."
      };
    } else if (/이어 붙이면|합하면|더하면/.test(prompt) || sceneKind === "join" || sceneKind === "add") {
      const values = lengthValues.map((item) => item.cm);
      model = {
        type: "length",
        keyLine: "‘이어 붙이면’은 두 길이가 한 줄로 합쳐지므로 더하기예요.",
        cueLabel: "문제 말",
        cueMeaning: "이어 붙이면/더하면 = 전체 길이",
        actionLabel: "해야 할 일",
        actionText: "두 길이를 끝과 끝으로 붙여 한 줄 만들기",
        whyText: "길이가 사라지지 않고 뒤에 이어지므로 전체는 두 길이를 합친 만큼이에요.",
        proofText: values.length >= 2 ? `${values[0]} + ${values[1]} = ${shortAnswer}` : `답 ${shortAnswer}`,
        checkText: "답에도 cm가 붙어 있는지 확인해요."
      };
    } else {
      model = {
        type: "length",
        keyLine: "길이 문제는 단위와 비교 말을 먼저 표시하면 계산이 보여요.",
        cueLabel: "문제 말",
        cueMeaning: "길이의 전체, 차이, 단위 중 무엇을 묻는지 찾기",
        actionLabel: "해야 할 일",
        actionText: "cm와 m에 밑줄 긋고 같은 단위끼리 보기",
        whyText: "길이는 숫자만 맞아도 단위가 틀리면 답이 달라져요.",
        proofText: `답 ${shortAnswer}`,
        checkText: "답의 단위가 문제에서 묻는 단위와 같은지 봐요."
      };
    }
  } else if (category === "2-4" || isTimeLearningPrompt(prompt)) {
    const times = [...prompt.matchAll(/(\d{1,2})시\s*(\d{1,2})?분?/g)]
      .map((match) => ({ hour: Number(match[1]), minute: Number(match[2] || 0) }));
    if (/달력|요일|날짜|며칠|몇 월/.test(prompt) || String(sceneKind || "").startsWith("calendar-")) {
      const offset = question.scene?.offset ?? extractFirstNumber(correctText);
      model = {
        type: "time",
        keyLine: "달력 문제는 시작 날짜를 0칸으로 두고 다음 칸부터 1일 뒤로 세요.",
        cueLabel: "문제 말",
        cueMeaning: /차이/.test(prompt) ? "며칠 차이 = 사이의 칸 수" : "며칠 뒤 = 다음 날짜부터 세기",
        actionLabel: "해야 할 일",
        actionText: "시작 칸에 0을 쓰고 하루씩 칸을 옮기기",
        whyText: "시작 날짜를 1로 세면 하루가 많아지므로 달력 위의 칸 수로 보아야 정확해요.",
        proofText: Number.isFinite(offset) ? `움직인 칸 = ${offset}칸 → 답 ${shortAnswer}` : `답 ${shortAnswer}`,
        checkText: "시작 날짜를 세어 넣지 않았는지 확인해요."
      };
    } else if (/걸린 시간|까지/.test(prompt) || sceneKind === "elapsed") {
      const minutes = question.scene?.minutes ?? (times.length >= 2 ? minutesBetweenTimes(times[0], times[1]) : extractFirstNumber(correctText));
      model = {
        type: "time",
        keyLine: "‘걸린 시간’은 끝 시각이 아니라 시계가 움직인 양이에요.",
        cueLabel: "문제 말",
        cueMeaning: "부터~까지 = 사이의 시간",
        actionLabel: "해야 할 일",
        actionText: "시작 시각과 끝 시각을 시간선 양끝에 놓기",
        whyText: "시계가 시작에서 끝까지 몇 분 움직였는지를 세면 걸린 시간이 나와요.",
        proofText: Number.isFinite(minutes) ? `움직인 양 = ${minutes}분` : `답 ${shortAnswer}`,
        checkText: "답이 시각인지 시간인지 헷갈리지 않아요."
      };
    } else if (/반/.test(prompt) || sceneKind === "half-hour") {
      model = {
        type: "time",
        keyLine: "‘반’은 한 시간 60분의 절반인 30분이에요.",
        cueLabel: "문제 말",
        cueMeaning: "반 = 30분",
        actionLabel: "해야 할 일",
        actionText: "분침이 6까지 갔는지 보기",
        whyText: "시계 한 바퀴 60분 중 절반을 돌면 30분이라서 ‘반’이라고 말해요.",
        proofText: `${numbers[0] || ""}시 30분 = ${shortAnswer}`,
        checkText: "몇 시 반인지, 다음 시 반인지 다시 봐요."
      };
    } else if (/긴바늘|짧은바늘/.test(prompt) || sceneKind === "clock-hands") {
      model = {
        type: "time",
        keyLine: "긴바늘은 분, 짧은바늘은 시를 알려 줘요.",
        cueLabel: "문제 말",
        cueMeaning: "긴바늘 12 = 00분",
        actionLabel: "해야 할 일",
        actionText: "긴바늘로 분을 보고, 짧은바늘로 시 읽기",
        whyText: "긴바늘이 12에 있으면 정각이고, 짧은바늘이 가리키는 숫자가 몇 시인지 알려 줘요.",
        proofText: `짧은바늘 7 → 답 ${shortAnswer}`,
        checkText: "긴바늘과 짧은바늘 역할을 바꾸지 않았는지 봐요."
      };
    } else {
      const add = question.scene?.minutes ?? Number((prompt.match(/(\d+)분\s*(뒤|후)/) || [])[1]);
      model = {
        type: "time",
        keyLine: "‘몇 분 뒤’는 지금 시각에서 분침을 그만큼 앞으로 움직이는 말이에요.",
        cueLabel: "문제 말",
        cueMeaning: "분 뒤 = 시각을 앞으로 이동",
        actionLabel: "해야 할 일",
        actionText: "분을 먼저 더하고 60분이 넘는지 확인",
        whyText: "60분이 되면 1시간이 지나가므로 시가 1 커져요.",
        proofText: Number.isFinite(add) && times[0] ? `${times[0].minute}분 + ${add}분 → ${shortAnswer}` : `답 ${shortAnswer}`,
        checkText: "분이 60 이상이면 시를 바꿨는지 확인해요."
      };
    }
  } else if (category === "1-2" || prompt.includes("도형")) {
    if (/다음에 올|규칙/.test(prompt)) {
      model = {
        type: "shape",
        keyLine: "도형 규칙은 하나씩 외우지 말고 반복되는 가장 작은 묶음을 찾아요.",
        cueLabel: "문제 말",
        cueMeaning: "다음에 올 = 반복 묶음의 다음 자리",
        actionLabel: "해야 할 일",
        actionText: "삼각형-사각형처럼 반복 묶음을 괄호로 묶기",
        whyText: "한 묶음이 끝나면 다시 묶음의 첫 도형으로 돌아가요.",
        proofText: `삼각형-사각형 / 삼각형-사각형 / 다음 ${shortAnswer}`,
        checkText: "반복 묶음이 가장 짧은지 확인해요."
      };
    } else {
      model = {
        type: "shape",
        keyLine: "도형 이름은 외우는 것보다 변과 꼭짓점을 직접 세면 보여요.",
        cueLabel: "문제 말",
        cueMeaning: /굽은 선|꼭짓점이 없는/.test(prompt) ? "굽은 선 = 꼭짓점 없음" : "꼭짓점/변의 수 묻기",
        actionLabel: "해야 할 일",
        actionText: "손가락으로 변을 따라가고 꺾이는 곳에 점 찍기",
        whyText: /원/.test(correctText) ? "원은 계속 굽은 선이라 뾰족하게 꺾이는 꼭짓점이 없어요." : "꺾이는 곳을 모두 세면 꼭짓점 수가 나와요.",
        proofText: `특징 확인 → 답 ${shortAnswer}`,
        checkText: "굽은 선과 곧은 선을 섞어 세지 않았는지 봐요."
      };
    }
  } else if (category === "1-6" || category === "2-2" || prompt.includes("×") || prompt.includes("묶음")) {
    const multiplication = parseMultiplicationSummary(question, correctText);
    model = {
      type: "multiply",
      keyLine: multiplication.keyLine,
      cueLabel: "문제 말",
      cueMeaning: multiplication.cueMeaning,
      actionLabel: "해야 할 일",
      actionText: multiplication.actionText,
      whyText: multiplication.whyText,
      proofText: multiplication.proofText,
      checkText: multiplication.checkText
    };
  } else if (category === "2-6" || prompt.includes("규칙")) {
    model = buildPatternSummary(question, correctText);
  } else if (category === "1-1" || category === "2-1" || prompt.includes("자리") || prompt.includes("1000")) {
    model = buildPlaceValueSummary(question, correctText);
  } else if (category === "1-3" || prompt.includes("+") || prompt.includes("-") || prompt.includes("□") || isAddSubStoryPrompt(prompt)) {
    model = buildAddSubSummary(question, correctText);
  } else {
    model = {};
  }

  const merged = { ...base, ...(model || {}) };
  const points = [
    { label: "말", text: merged.cueMeaning },
    { label: "행동", text: merged.actionText },
    { label: "확인", text: merged.checkText }
  ];

  return {
    ...merged,
    keyLine: clampFeedbackText(merged.keyLine, 74),
    cueMeaning: clampFeedbackText(merged.cueMeaning, 42),
    actionText: clampFeedbackText(merged.actionText, 46),
    whyText: clampFeedbackText(merged.whyText, 74),
    proofText: clampFeedbackText(merged.proofText, 58),
    checkText: clampFeedbackText(merged.checkText, 46),
    selectedText,
    correctText,
    points
  };
}

function renderTeacherPrinciplePanel(summary) {
  const cards = [
    {
      modifier: "cue",
      label: normalizeTeacherPrincipleLabel(summary.cueLabel || "볼 곳"),
      title: summary.cueMeaning || "묻는 말 찾기",
      body: summary.keyLine || "문제에서 묻는 말을 먼저 표시해요."
    },
    {
      modifier: "proof",
      label: "답 확인",
      title: summary.proofText || "정답 확인",
      body: summary.checkText || "단위와 묻는 말을 다시 봐요."
    }
  ].filter((card) => card.modifier !== "cue" || !isRedundantProblemCue(summary));

  return `
    <div class="teacher-principle-panel teacher-principle-panel--${escapeHtml(summary.type || "number")}">
      ${cards.map((card) => `
        <article class="teacher-principle-card teacher-principle-card--${card.modifier}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.title)}</strong>
          ${card.modifier === "action" && summary.actionVisual
            ? renderTeacherActionMini(summary.actionVisual)
            : `<p>${escapeHtml(card.body)}</p>`}
        </article>
      `).join("")}
    </div>
  `;
}

function normalizeTeacherPrincipleLabel(label) {
  const text = String(label || "").trim();
  if (!text || text === "문제 말") {
    return "볼 곳";
  }
  if (text === "그림 행동") {
    return "그림으로 보기";
  }
  return text;
}

function isRedundantProblemCue(summary) {
  const cue = String(summary?.cueMeaning || "").replace(/\s+/g, " ").trim();
  return /^\d+\s*-\s*\d+\s*=\s*\d+에서\s*\d+\s*빼기$/.test(cue);
}

function renderTeacherActionMini(actionVisual) {
  if (!actionVisual) {
    return "";
  }

  if (actionVisual.type === "carryTens") {
    const tensSum = Math.max(10, Math.min(19, Number(actionVisual.tensSum) || 10));
    const remainder = Math.max(0, tensSum - 10);

    return `
      <div class="teacher-action-mini teacher-action-mini--hundred" aria-label="십의 자리 10개를 1백으로 올리기">
        <div class="teacher-action-rods">
          ${renderPlaceTokens(10, "십", "teacher-action-ten-token", 10)}
        </div>
        <b>10십</b>
        <i class="teacher-action-arrow" aria-hidden="true"></i>
        <em>1백</em>
        <small>남은 십 ${remainder}</small>
      </div>
    `;
  }

  if (actionVisual.type === "borrowOnes") {
    const changedTens = Math.max(0, Math.min(9, Number(actionVisual.changedTens) || 0));
    const changedOnes = Math.max(0, Math.min(19, Number(actionVisual.changedOnes) || 0));

    return `
      <div class="teacher-action-mini teacher-action-mini--borrow" aria-label="십 1개를 일 10개로 바꾸어 받아내림하기">
        <div class="teacher-action-rods teacher-action-rods--borrow">
          ${renderPlaceTokens(changedTens, "십", "teacher-action-ten-token", 9)}
        </div>
        <b>${changedTens}십</b>
        <i class="teacher-action-arrow" aria-hidden="true"></i>
        <em>${changedOnes}일</em>
        <small>1십을 10일로 바꿈</small>
      </div>
    `;
  }

  if (actionVisual.type !== "carryOnes") {
    return "";
  }

  const onesA = Math.max(0, Math.min(9, Number(actionVisual.onesA) || 0));
  const onesB = Math.max(0, Math.min(9, Number(actionVisual.onesB) || 0));
  const neededFromB = Math.max(0, 10 - onesA);
  const secondInBundle = Math.min(onesB, neededFromB);
  const remainder = Math.max(0, onesB - secondInBundle);

  return `
    <div class="teacher-action-mini teacher-action-mini--carry" aria-label="일의 자리 ${onesA}개와 ${onesB}개를 10개로 묶어 십의 자리로 올리기">
      <div class="teacher-action-dots">
        ${renderCarryBundleDots(onesA, secondInBundle)}
        <span class="teacher-action-ring" aria-hidden="true"></span>
      </div>
      <b>10개</b>
      <i class="teacher-action-arrow" aria-hidden="true"></i>
      <em>1십</em>
      <small>남은 일 ${remainder}</small>
    </div>
  `;
}

function extractLengthValuesFromQuestion(question) {
  const text = `${question.prompt || ""} ${(question.scene?.lines || []).join(" ")}`;
  return [...text.matchAll(/(\d+)\s*(m|cm)/g)]
    .map((match) => ({
      value: Number(match[1]),
      unit: match[2],
      cm: match[2] === "m" ? Number(match[1]) * 100 : Number(match[1])
    }));
}

function buildAddSubSummary(question, correctText) {
  const prompt = question.prompt || "";
  const model = parseAddSubModel(question, correctText);
  if (!model) {
    return {
      type: "addsub",
      keyLine: "덧셈·뺄셈은 문제 속 행동이 늘어나는지 줄어드는지 보면 보여요.",
      cueLabel: "문제 말",
      cueMeaning: "늘어남/줄어듦 찾기",
      actionText: "수직선이나 묶음 그림에 표시하기",
      whyText: "상황이 커지면 더하고, 줄거나 차이를 보면 빼요.",
      proofText: `답 ${correctText}`,
      checkText: "식과 문장 행동이 같은지 확인해요."
    };
  }

  if (model.blank) {
    if (model.operator === "+") {
      return {
        type: "addsub",
        keyLine: "덧셈식의 빈칸은 전체에서 알고 있는 부분을 빼면 찾아요.",
        cueLabel: "문제 말",
        cueMeaning: "□ = 빠진 부분",
        actionText: "전체와 알고 있는 수를 먼저 표시하기",
        whyText: "전체는 두 부분을 합친 수예요. 한 부분을 알면 나머지는 빼서 찾을 수 있어요.",
        proofText: `${model.total} - ${model.known} = ${model.missing}`,
        checkText: `□에 ${model.missing}을 넣어 식이 맞는지 봐요.`
      };
    }

    const proof = model.missingSide === "right"
      ? `${model.total} - ${model.result} = ${model.missing}`
      : `${model.result} + ${model.known} = ${model.missing}`;
    return {
      type: "addsub",
      keyLine: "뺄셈식의 빈칸은 처음 수, 빠진 수, 남은 수의 관계로 찾아요.",
      cueLabel: "문제 말",
      cueMeaning: "□ = 처음 수 또는 빠진 수",
      actionText: "처음·빠진 것·남은 것을 막대에 표시하기",
      whyText: "뺄셈은 전체에서 한 부분이 빠져 남은 부분을 보는 계산이에요.",
      proofText: proof,
      checkText: "찾은 □를 넣고 다시 빼 보세요."
    };
  }

  if (model.operator === "+") {
    const onesA = model.left % 10;
    const onesB = model.right % 10;
    const onesSum = onesA + onesB;
    const hasCarry = onesSum >= 10;
    const tensA = Math.floor((model.left % 100) / 10);
    const tensB = Math.floor((model.right % 100) / 10);
    const carryToTens = hasCarry ? 1 : 0;
    const tensSum = tensA + tensB + carryToTens;
    const hasHundredCarry = tensSum >= 10;

    if (hasHundredCarry) {
      const incomingText = carryToTens ? "+1" : "";
      return {
        type: "addsub",
        keyLine: carryToTens
          ? "일의 자리에서 1십을 올린 뒤, 십의 자리 10십을 1백으로 바꿔요."
          : "십의 자리 합이 10십이 되면 1백으로 받아올려요.",
        cueLabel: "문제 말",
        cueMeaning: /더 받|모두|합/.test(prompt) ? "더 받음/모두 = 더하기" : "+ 기호 = 두 수 합치기",
        actionText: `십의 자리 ${tensA}+${tensB}${incomingText}=${tensSum}에서 10십을 1백으로 올리기`,
        whyText: "십 모형 10개는 백 모형 1개와 같아요. 남은 십만 십의 자리에 둬요.",
        proofText: `${model.left} + ${model.right} = ${model.result}`,
        checkText: "백의 자리에 받아올린 1백을 표시했는지 봐요.",
        actionVisual: { type: "carryTens", tensA, tensB, carryToTens, tensSum }
      };
    }

    if (/\d+\s*\+\s*\d+/.test(prompt) && !/더 받|모두|합|가지고/.test(prompt)) {
      return {
        type: "addsub",
        keyLine: hasCarry
          ? "일의 자리 합이 10이 넘으면 10개를 십의 자리 1개로 받아올려요."
          : "덧셈식은 같은 자리끼리 더해요. 10이나 20은 십의 자리에 붙어요.",
        cueLabel: "문제 말",
        cueMeaning: "+ 기호 = 두 수 합치기",
        actionText: hasCarry
          ? `일의 자리 ${onesA}+${onesB}에서 정확히 10개를 묶어 1십으로 올리기`
          : "십의 자리와 일의 자리를 나누어 더하기",
        whyText: hasCarry
          ? "일 모형 10개는 십 모형 1개와 같아서 자리집을 옮겨야 해요."
          : "10은 일의 자리 10개가 아니라 십의 자리 1개라 십의 자리 쪽에 더해요.",
        proofText: `${model.left} + ${model.right} = ${model.result}`,
        checkText: hasCarry ? "받아올린 1을 십의 자리에 더했는지 봐요." : "일의 자리까지 그대로 맞는지 확인해요.",
        actionVisual: hasCarry ? { type: "carryOnes", onesA, onesB } : null
      };
    }

    const cue = /더 받|모두|합/.test(prompt) ? "더 받음/모두 = 더하기" : "+ 기호 = 두 수 합치기";
    return {
      type: "addsub",
      keyLine: hasCarry
        ? "더 받은 수를 합칠 때도 일의 자리 10개는 십의 자리 1개로 바꿔요."
        : "‘더 받다’, ‘모두’는 수가 늘어나 전체가 되는 상황이에요.",
      cueLabel: "문제 말",
      cueMeaning: cue,
      actionText: hasCarry
        ? `일의 자리 ${onesA}+${onesB}에서 정확히 10개를 묶어 1십으로 올리기`
        : "처음 수와 더해진 수를 한 막대에 이어 붙이기",
      whyText: hasCarry
        ? "일 모형 10개는 십 모형 1개와 같아요. 남은 일의 자리만 아래에 남겨요."
        : "두 부분이 함께 전체가 되므로 덧셈으로 합쳐요.",
      proofText: `${model.left} + ${model.right} = ${model.result}`,
      checkText: hasCarry ? "일의 자리에는 남은 개수만, 십의 자리에는 받아올린 1을 더해요." : "답이 처음 수보다 커졌는지 확인해요.",
      actionVisual: hasCarry ? { type: "carryOnes", onesA, onesB } : null
    };
  }

  return {
    type: "addsub",
    keyLine: (() => {
      const leftOnes = model.left % 10;
      const rightOnes = model.right % 10;
      const split = buildBorrowSplitParts(model.left, model.right, model.result);
      return leftOnes < rightOnes
        ? formatBorrowSplitKeyLine(split)
        : "일의 자리끼리 먼저 빼고, 십의 자리끼리 빼요.";
    })(),
    cueLabel: "문제 말",
    cueMeaning: `${model.left}-${model.right} = ${model.left}에서 ${model.right} 빼기`,
    actionText: (() => {
      const leftOnes = model.left % 10;
      const rightOnes = model.right % 10;
      const leftTens = Math.floor((model.left % 100) / 10);
      const rightTens = Math.floor((model.right % 100) / 10);
      const split = buildBorrowSplitParts(model.left, model.right, model.result);
      return leftOnes < rightOnes
        ? formatBorrowSplitProof(split, false)
        : `${leftOnes}-${rightOnes}=${model.result % 10}, ${leftTens}-${rightTens}=${Math.floor((model.result % 100) / 10)}`;
    })(),
    whyText: (() => {
      const leftOnes = model.left % 10;
      const rightOnes = model.right % 10;
      const split = buildBorrowSplitParts(model.left, model.right, model.result);
      return leftOnes < rightOnes
        ? `${model.left}${numberObjectParticle(model.left)} ${split.splitMain}과 ${split.splitOnes}${numberDirectionParticle(split.splitOnes)} 나누면 큰 묶음과 일의 자리를 각각 뺄 수 있어요.`
        : "같은 자리끼리 빼야 십은 십끼리, 일은 일끼리 정확히 남아요.";
    })(),
    proofText: (() => {
      const leftOnes = model.left % 10;
      const rightOnes = model.right % 10;
      const leftTens = Math.floor((model.left % 100) / 10);
      const rightTens = Math.floor((model.right % 100) / 10);
      const split = buildBorrowSplitParts(model.left, model.right, model.result);
      return leftOnes < rightOnes
        ? formatBorrowSplitProof(split)
        : `${leftOnes}-${rightOnes}=${model.result % 10}, ${leftTens}-${rightTens}=${Math.floor((model.result % 100) / 10)} → ${model.result}`;
    })(),
    checkText: `${model.result} + ${model.right} = ${model.left}인지 되돌려 확인해요.`,
    actionVisual: (() => {
      const leftOnes = model.left % 10;
      const rightOnes = model.right % 10;
      const leftTens = Math.floor((model.left % 100) / 10);
      return leftOnes < rightOnes
        ? model.left < 100
          ? { type: "borrowOnes", changedTens: leftTens - 1, changedOnes: leftOnes + 10 }
          : null
        : null;
    })()
  };
}

function buildPlaceValueSummary(question, correctText) {
  const prompt = question.prompt || "";
  const numbers = (prompt.match(/\d+/g) || []).map(Number);
  if (/중 더 큰 수/.test(prompt) && numbers.length >= 2) {
    const first = String(numbers[0]).padStart(Math.max(String(numbers[0]).length, String(numbers[1]).length), "0");
    const second = String(numbers[1]).padStart(first.length, "0");
    const diffIndex = first.split("").findIndex((digit, index) => digit !== second[index]);
    const labels = first.length >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"].slice(-first.length);
    const place = labels[Math.max(0, diffIndex)] || "높은 자리";
    return {
      type: "place",
      keyLine: "큰 수 비교는 가장 높은 자리부터 보고, 처음 다른 자리에서 결정돼요.",
      cueLabel: "문제 말",
      cueMeaning: "더 큰 수 = 자리별 비교",
      actionText: `${place} 자리처럼 처음 다른 자리에 표시하기`,
      whyText: "높은 자리는 낮은 자리보다 훨씬 큰 값을 가지므로 먼저 비교해야 해요.",
      proofText: `처음 다른 자리 비교 → ${correctText}`,
      checkText: "일의 자리부터 비교하지 않았는지 확인해요."
    };
  }

  if (/바로 앞|바로 뒤/.test(prompt) && numbers.length) {
    return {
      type: "place",
      keyLine: "바로 앞과 바로 뒤는 수직선에서 딱 한 칸 움직인 수예요.",
      cueLabel: "문제 말",
      cueMeaning: "바로 앞 = -1, 바로 뒤 = +1",
      actionText: `${numbers[0]}을 가운데 두고 양쪽 한 칸 보기`,
      whyText: "‘바로’는 10칸이나 100칸이 아니라 1칸만 움직인다는 뜻이에요.",
      proofText: `${numbers[0] - 1}, ${numbers[0]}, ${numbers[0] + 1}`,
      checkText: "앞뒤 순서를 바꾸지 않았는지 봐요."
    };
  }

  if (/가까운 몇백/.test(prompt) && numbers.length) {
    const lower = Math.floor(numbers[0] / 100) * 100;
    return {
      type: "place",
      keyLine: "‘작은 가장 가까운 몇백’은 그 수가 지나온 왼쪽 백 단위예요.",
      cueLabel: "문제 말",
      cueMeaning: "작은 몇백 = 백 단위 왼쪽 경계",
      actionText: "수직선에 백 단위 눈금 두 개를 표시하기",
      whyText: `${numbers[0]}은 ${lower}과 ${lower + 100} 사이에 있고, 작은 쪽은 ${lower}이에요.`,
      proofText: `${lower} < ${numbers[0]} < ${lower + 100}`,
      checkText: "더 큰 쪽 몇백을 고르지 않았는지 확인해요."
    };
  }

  if (/\+/.test(prompt)) {
    return {
      type: "place",
      keyLine: "전개식은 각 자리의 값을 따로 풀어 쓴 모습이에요.",
      cueLabel: "문제 말",
      cueMeaning: "100+10+1 조각을 한 수로 모으기",
      actionText: "천·백·십·일 자리 조각을 자리집에 넣기",
      whyText: "0의 개수는 그 숫자가 어느 자리 값인지 알려 줘요.",
      proofText: `${prompt.split("로")[0].replace("나타낸 수는?", "").trim()} → ${correctText}`,
      checkText: "각 자리 숫자가 한 칸씩 들어갔는지 봐요."
    };
  }

  return {
    type: "place",
    keyLine: "자릿값은 숫자가 들어간 자리 이름이 그 숫자의 크기를 정해요.",
    cueLabel: "문제 말",
    cueMeaning: "몇 개씩 = 자리 숫자 읽기",
    actionText: "왼쪽부터 천·백·십·일 자리 이름 붙이기",
    whyText: "같은 4라도 백의 자리에 있으면 400, 일의 자리에 있으면 4예요.",
    proofText: `자리 숫자 → ${correctText}`,
    checkText: "자리 순서를 왼쪽부터 읽었는지 확인해요."
  };
}

function parseMultiplicationSummary(question, correctText) {
  const prompt = question.prompt || "";
  const model = parseMultiplicationModel(question, correctText);
  let match = prompt.match(/(\d+)개씩\s*(\d+)묶음/);
  if (match) {
    const each = Number(match[1]);
    const groups = Number(match[2]);
    return {
      keyLine: "‘몇 개씩 몇 묶음’은 같은 수가 여러 번 있는 곱셈 상황이에요.",
      cueMeaning: "한 묶음의 수 × 묶음 수",
      actionText: `${each}개를 한 묶음으로 그리고 ${groups}묶음 세기`,
      whyText: `같은 ${each}개 묶음이 ${groups}번 있으니 ${each}를 ${groups}번 더한 것과 같아요.`,
      proofText: `${each} × ${groups} = ${each * groups}`,
      checkText: "한 묶음의 수와 묶음 수를 바꾸어 읽지 않았는지 봐요."
    };
  }

  match = prompt.match(/모두\s*(\d+)개를\s*(\d+)개씩/);
  if (match) {
    const total = Number(match[1]);
    const each = Number(match[2]);
    const groups = extractFirstNumber(correctText);
    return {
      keyLine: "묶음 수를 묻는 문제는 전체 안에 같은 묶음이 몇 번 들어가는지 보는 문제예요.",
      cueMeaning: "전체 ÷ 한 묶음 = 묶음 수",
      actionText: `${each}개씩 동그라미 치며 묶음 개수 세기`,
      whyText: `전체 ${total}개를 ${each}개씩 나누면 같은 묶음이 ${groups}개 생겨요.`,
      proofText: `${each}씩 ${groups}묶음 = ${total}`,
      checkText: "답 단위가 ‘묶음’인지 확인해요."
    };
  }

  const repeated = prompt.match(/^(\d+)(\+\d+)+/);
  if (repeated) {
    const addends = (prompt.match(/\d+/g) || []).map(Number);
    const each = addends[0];
    const groups = addends.length;
    return {
      keyLine: "반복 덧셈은 같은 수가 몇 번 나오는지 세어 곱셈식으로 바꿔요.",
      cueMeaning: "같은 수 반복 = 곱셈",
      actionText: `반복되는 수 ${each}에 밑줄 긋고 ${groups}번 세기`,
      whyText: `${each}가 ${groups}번 반복되므로 ${each}×${groups}로 쓸 수 있어요.`,
      proofText: `${addends.join(" + ")} = ${each} × ${groups}`,
      checkText: "반복되는 수와 반복 횟수를 바꾸지 않았는지 봐요."
    };
  }

  if (/×□/.test(prompt) && model) {
    return {
      keyLine: "곱셈 빈칸은 목표 수까지 같은 수로 몇 번 뛰었는지를 묻는 자리예요.",
      cueMeaning: "□ = 몇 번",
      actionText: `${model.each}씩 뛰어 세어 ${model.product}에 도착하기`,
      whyText: `${model.each}씩 ${model.groups}번 뛰면 ${model.product}에 도착해요.`,
      proofText: `${model.each} × ${model.groups} = ${model.product}`,
      checkText: "□가 곱한 결과가 아니라 횟수인지 확인해요."
    };
  }

  if (/만들 수 있는 곱셈식/.test(prompt) && model) {
    return {
      keyLine: "곱셈식 고르기는 보기마다 계산해서 목표 수와 같은지 비교해요.",
      cueMeaning: "목표 수를 만드는 식 찾기",
      actionText: "보기 곱셈식의 값을 옆에 작게 쓰기",
      whyText: `${model.each}와 ${model.groups}를 곱하면 목표 수 ${model.product}가 돼요.`,
      proofText: `${model.each} × ${model.groups} = ${model.product}`,
      checkText: "더하기식과 곱셈식을 헷갈리지 않았는지 봐요."
    };
  }

  if (model) {
    return {
      keyLine: "곱셈은 같은 수를 여러 번 더하는 것을 짧게 쓴 계산이에요.",
      cueMeaning: "몇씩 몇 번 = 곱셈",
      actionText: `한 줄 ${model.each}개와 ${model.groups}줄을 표시하기`,
      whyText: `${model.each}개씩 ${model.groups}번 있으므로 ${model.each}를 ${model.groups}번 더해요.`,
      proofText: `${model.each} × ${model.groups} = ${model.product}`,
      checkText: "같은 수 묶음인지 먼저 확인해요."
    };
  }

  return {
    keyLine: "곱셈은 같은 크기의 묶음이 반복될 때 쓰는 계산이에요.",
    cueMeaning: "같은 묶음 찾기",
    actionText: "한 묶음과 묶음 수를 나누어 표시하기",
    whyText: "같은 묶음이 반복되면 하나씩 세는 대신 뛰어 세거나 곱해요.",
    proofText: `답 ${correctText}`,
    checkText: "묶음 크기가 모두 같은지 확인해요."
  };
}

function buildPatternSummary(question, correctText) {
  const prompt = question.prompt || "";
  const nums = (prompt.match(/\d+/g) || []).map(Number);
  if (/빨강|파랑|색/.test(prompt)) {
    return {
      type: "pattern",
      keyLine: "색 규칙은 반복되는 가장 작은 묶음을 찾으면 다음 색이 보여요.",
      cueLabel: "문제 말",
      cueMeaning: "다음 색 = 반복 묶음의 다음 자리",
      actionText: "빨강-파랑-파랑을 한 묶음으로 괄호 치기",
      whyText: "한 묶음이 끝나면 다시 묶음의 첫 색으로 돌아가요.",
      proofText: `빨강-파랑-파랑 / 빨강-파랑-파랑 / 다음 ${correctText}`,
      checkText: "묶음이 너무 길거나 짧지 않은지 확인해요."
    };
  }

  if (/곱합니다|설명한 것/.test(prompt)) {
    return {
      type: "pattern",
      keyLine: "차이가 계속 달라지면 더하기가 아니라 곱하기 규칙일 수 있어요.",
      cueLabel: "문제 말",
      cueMeaning: "규칙 설명 = 이웃한 수의 관계 말하기",
      actionText: "2→4, 4→8, 8→16을 각각 비교하기",
      whyText: "각 수가 앞 수의 2배가 되므로 같은 곱하기 행동이 반복돼요.",
      proofText: "2×2=4, 4×2=8, 8×2=16",
      checkText: "한 쌍만 보지 말고 여러 쌍에서 맞는지 봐요."
    };
  }

  if (nums.length >= 3) {
    const diff1 = nums[1] - nums[0];
    const diff2 = nums[2] - nums[1];
    const step = Math.abs(diff1 || diff2);
    const direction = diff1 < 0 || diff2 < 0 ? "작아지는" : "커지는";
    const sign = direction === "작아지는" ? "-" : "+";
    return {
      type: "pattern",
      keyLine: `수 규칙은 이웃한 수 사이에 같은 변화가 반복되는지 보는 거예요.`,
      cueLabel: "문제 말",
      cueMeaning: `□ = ${step}씩 ${direction} 다음 수`,
      actionText: `숫자 사이에 ${sign}${step} 화살표 쓰기`,
      whyText: `앞에서도 ${step}씩 ${direction} 행동이 반복되므로 □에도 같은 행동을 해요.`,
      proofText: `${nums[0]} ${sign}${step} → ${nums[1]} ${sign}${step} → ${nums[2]} ${sign}${step} → ${correctText}`,
      checkText: "변화 방향이 +인지 -인지 확인해요."
    };
  }

  return {
    type: "pattern",
    keyLine: "규칙은 답 하나가 아니라 계속 반복된 행동을 찾는 거예요.",
    cueLabel: "문제 말",
    cueMeaning: "다음 = 같은 행동 한 번 더",
    actionText: "앞의 두 칸 사이 변화를 표시하기",
    whyText: "같은 행동이 반복되면 다음 칸도 그 행동을 이어 가요.",
    proofText: `답 ${correctText}`,
    checkText: "앞쪽 규칙이 뒤쪽에도 맞는지 확인해요."
  };
}

function renderTeacherBoardSteps(points) {
  const safePoints = Array.isArray(points) && points.length
    ? points
    : [
      { label: "1", text: "묻는 말 표시" },
      { label: "2", text: "그림 위에 표시" },
      { label: "답", text: "정답 연결" }
    ];

  return `
    <div class="teacher-board-mini-steps">
      ${safePoints.slice(0, 3).map((point) => `
        <div class="teacher-board-mini-step">
          <span>${escapeHtml(point.label)}</span>
          <strong>${escapeHtml(point.text)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTeacherAnnotationLayer(question, boardSummary) {
  const type = boardSummary.annotationType || "number";
  const note = boardSummary.annotationNote || "표시";
  const subNote = boardSummary.annotationSubNote || "답";

  return `
    <div class="teacher-annotation-layer teacher-annotation-layer--${escapeHtml(type)}" aria-hidden="true">
      <span class="teacher-highlighter teacher-highlight--one"></span>
      <span class="teacher-underline teacher-underline--one"></span>
      <span class="teacher-pen-circle teacher-circle--one"></span>
      <span class="teacher-pen-arrow teacher-arrow--one"></span>
      <span class="teacher-pen-note teacher-note--one">${escapeHtml(note)}</span>
      <span class="teacher-pen-note teacher-note--two">${escapeHtml(subNote)}</span>
    </div>
  `;
}

function renderFeedbackCoachCards(feedback) {
  const cards = Array.isArray(feedback.strategyCards) && feedback.strategyCards.length
    ? feedback.strategyCards
    : [
      { title: "어디를 볼까?", body: feedback.diagnosis || "문제에서 묻는 말을 먼저 찾습니다." },
      { title: "그림 행동", body: feedback.representationSteps?.[0] || "조건을 그림에 표시합니다." },
      { title: "난이도 생각", body: feedback.difficultyFocus || feedback.nextAction || "마지막에 식으로 확인합니다." }
    ];

  return `
    <div class="feedback-coach-cards">
      ${cards.slice(0, 3).map((card, index) => `
        <article class="feedback-coach-card">
          <span>${index + 1}</span>
          <strong>${escapeHtml(card.title || "생각")}</strong>
          <p>${escapeHtml(clampFeedbackText(card.body || "", 74))}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function buildDetailedExplanation(question, selectedIndex) {
  const category = resolveQuestionCategory(question);
  const selectedText = Number.isInteger(selectedIndex) && question.options[selectedIndex]
    ? compactOptionText(question.options[selectedIndex])
    : "";
  const correctText = compactOptionText(question.options[question.answer]);
  let baseFeedback;

  if (question.feedback) {
    baseFeedback = {
      tag: `${category} 다시 보기`,
      title: question.feedback.title || "아직 정답이 아니에요.",
      diagnosis: question.feedback.diagnosis || buildQuestionDiagnosis(question, selectedText, correctText),
      steps: question.feedback.steps?.length ? question.feedback.steps : buildFallbackExplanationSteps(question, correctText),
      nextAction: question.feedback.nextAction || buildCategoryReminder(category),
      visualTitle: question.feedback.visualTitle || "문제 조건 다시 보기",
      visualMarkup: question.feedback.visualMarkup || buildFeedbackClueVisual(question, selectedText, correctText)
    };
  } else {
    const walkthrough = buildQuestionWalkthrough(question, correctText, selectedText);
    baseFeedback = {
      tag: `${category} 다시 보기`,
      title: "아직 정답이 아니에요.",
      diagnosis: walkthrough.diagnosis || buildQuestionDiagnosis(question, selectedText, correctText),
      steps: walkthrough.steps?.length ? walkthrough.steps : buildFallbackExplanationSteps(question, correctText),
      nextAction: walkthrough.nextAction || buildCategoryReminder(category),
      visualTitle: walkthrough.visualTitle || "그림으로 다시 보기",
      visualMarkup: walkthrough.visualMarkup || buildFallbackVisual(question, correctText, selectedText)
    };
  }

  return enrichFeedbackForElementaryLearner(question, selectedIndex, baseFeedback);
}

function enrichFeedbackForElementaryLearner(question, selectedIndex, feedback) {
  const category = resolveQuestionCategory(question);
  const selectedText = Number.isInteger(selectedIndex) && question.options[selectedIndex]
    ? compactOptionText(question.options[selectedIndex])
    : "";
  const correctText = compactOptionText(question.options[question.answer]);
  const misconception = inferStudentMisconception(question, selectedText, correctText);
  const representation = buildRepresentationBridge(question, selectedText, correctText);
  const teachingGuide = getLessonTeachingGuide(question);
  const representationSteps = teachingGuide.representationSteps?.length
    ? teachingGuide.representationSteps
    : representation.steps;
  const selfCheck = teachingGuide.selfCheck?.length
    ? teachingGuide.selfCheck
    : buildSelfCheckQuestions(question);
  const difficultyFocus = buildDifficultyFocus(question, teachingGuide);

  return {
    ...feedback,
    tag: teachingGuide.lessonName ? `${category} · ${teachingGuide.lessonName}` : feedback.tag,
    learningGoal: teachingGuide.goal || buildLearningGoalText(question, category),
    misconceptionTitle: misconception.title,
    misconception: misconception.message,
    representationTitle: teachingGuide.representationTitle || representation.title,
    representationSteps,
    selfCheck,
    difficultyFocus,
    strategyCards: buildLessonStrategyCards(question, teachingGuide, misconception, representationSteps, difficultyFocus),
    visualMarkup: feedback.visualMarkup || buildFeedbackClueVisual(question, selectedText, correctText)
  };
}

function buildLearningGoalText(question, category) {
  const key = question.category || "";
  if (key === "1-1" || key === "2-1" || category.includes("자리 수")) {
    return "숫자의 자리값을 보고 수의 크기와 뜻을 정확히 읽기";
  }
  if (key === "1-2" || category.includes("도형")) {
    return "도형의 변, 꼭짓점, 반복 규칙을 근거로 설명하기";
  }
  if (key === "1-3" || category.includes("덧셈") || category.includes("뺄셈")) {
    return "문제 상황을 식으로 바꾸고 자리값을 지키며 계산하기";
  }
  if (key === "1-4" || key === "2-3" || category.includes("길이")) {
    return "길이를 같은 단위로 맞추고 더하거나 비교하기";
  }
  if (key === "1-6" || key === "2-2" || category.includes("곱셈")) {
    return "같은 수 묶음을 곱셈식과 뛰어 세기로 연결하기";
  }
  if (key === "2-4" || category.includes("시각") || category.includes("시간")) {
    return "시각과 걸린 시간을 구분하고 분 단위 변화를 읽기";
  }
  if (key === "1-5" || key === "2-5" || category.includes("표") || category.includes("분류")) {
    return "표와 그래프에서 항목, 수, 전체, 차이를 정확히 읽기";
  }
  if (key === "2-6" || category.includes("규칙")) {
    return "수와 모양 사이의 변화를 찾아 다음 항을 예측하기";
  }
  return "문제의 조건을 말, 그림, 식으로 연결해 정답을 스스로 설명하기";
}

function inferStudentMisconception(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const selectedNumber = extractFirstNumber(selectedText);
  const correctNumber = extractFirstNumber(correctText);
  const category = resolveQuestionCategory(question);

  if (!selectedText) {
    return {
      title: "선택을 다시 세워 봐요",
      message: "방금 고른 답을 알 수 없어서 문제의 조건과 정답을 먼저 나란히 놓고 다시 생각해 볼게요."
    };
  }

  if (Number.isFinite(selectedNumber) && Number.isFinite(correctNumber)) {
    const gap = selectedNumber - correctNumber;
    const absGap = Math.abs(gap);
    if (absGap === 0 && selectedText !== correctText) {
      return {
        title: "수는 맞고 표현이 달라요",
        message: "숫자 값은 가까웠지만 단위나 표현 방식이 문제에서 묻는 형태와 달랐을 가능성이 큽니다."
      };
    }
    if (prompt.includes("m") || prompt.includes("cm") || category.includes("길이")) {
      if (absGap >= 90) {
        return {
          title: "단위 변환을 놓쳤을 수 있어요",
          message: "m와 cm가 함께 나오면 1m를 100cm로 바꾼 뒤 계산해야 합니다. 단위가 다른 채로 더하거나 비교하면 답이 크게 달라져요."
        };
      }
      return {
        title: "길이의 차이를 다시 봐요",
        message: gap > 0
          ? "고른 답이 정답보다 큽니다. 두 길이를 비교할 때 더해야 할 상황과 빼야 할 상황을 바꾸어 생각했을 수 있어요."
          : "고른 답이 정답보다 작습니다. 한 길이를 빠뜨렸거나 차이를 구할 때 작은 수를 한 번 더 뺐을 수 있어요."
      };
    }
    if (prompt.includes("시") || prompt.includes("분") || category.includes("시각") || category.includes("시간")) {
      return {
        title: "시각과 시간을 구분해요",
        message: "시각은 시계가 가리키는 한 순간이고, 시간은 시작과 끝 사이의 양입니다. 분을 더할 때 60분이 넘는지도 꼭 확인해야 해요."
      };
    }
    if ((question.category === "1-3" || category.includes("덧셈") || category.includes("뺄셈")) && absGap === 1) {
      return {
        title: "일의 자리 한 칸을 다시 봐요",
        message: "정답과 1 차이입니다. 계산 방법은 거의 잡았고, 마지막 일의 자리에서 하나를 더 세었거나 덜 세었을 가능성이 큽니다."
      };
    }
    if (absGap === 1) {
      return {
        title: "마지막 한 칸을 확인해요",
        message: "정답과 1 차이입니다. 마지막 일의 자리 계산, 앞/뒤 수, 또는 표에서 한 항목을 하나 더 세었는지 확인하면 바로 고칠 수 있어요."
      };
    }
    if ([9, 10, 11].includes(absGap)) {
      return {
        title: "10 묶음 이동을 확인해요",
        message: "정답과 거의 10 차이입니다. 받아올림, 받아내림, 10cm, 10씩 커지는 규칙처럼 '10 묶음'을 놓쳤을 가능성이 커요."
      };
    }
    if ([90, 100, 110, 900, 1000, 1100].includes(absGap)) {
      return {
        title: "자리값 한 칸을 다시 봐요",
        message: "정답과 100 또는 1000 가까이 차이가 납니다. 백의 자리와 천의 자리, 또는 1m=100cm 변환을 헷갈렸을 수 있어요."
      };
    }
    return {
      title: gap > 0 ? "조금 더 많이 세었어요" : "조금 덜 세었어요",
      message: gap > 0
        ? `고른 답이 정답보다 ${absGap}만큼 큽니다. 더하지 않아도 되는 수를 더했거나, 비교 문제에서 큰 수를 다시 더했을 수 있어요.`
        : `고른 답이 정답보다 ${absGap}만큼 작습니다. 필요한 수를 빠뜨렸거나, 묶음 하나를 덜 센 것인지 확인해 보세요.`
    };
  }

  if (question.category === "1-2" || category.includes("도형")) {
    return {
      title: "도형의 이름보다 특징을 먼저 봐요",
      message: "도형 문제는 느낌으로 고르기보다 변의 수, 꼭짓점의 수, 굽은 선이 있는지를 근거로 말해야 합니다."
    };
  }
  if (question.category === "1-5" || question.category === "2-5" || category.includes("표") || category.includes("분류")) {
    return {
      title: "항목과 수를 정확히 연결해요",
      message: "표와 그래프에서는 이름을 찾은 뒤 옆의 수를 읽어야 합니다. 전체, 가장 많은 것, 차이를 묻는 말도 구분해야 해요."
    };
  }
  if (question.category === "2-6" || category.includes("규칙")) {
    return {
      title: "반복되는 묶음이나 변화량을 찾아요",
      message: "규칙 문제는 바로 다음 답을 찍기보다 앞의 두 칸 사이가 어떻게 변하는지 여러 번 확인해야 합니다."
    };
  }
  if (question.category === "1-6" || question.category === "2-2" || category.includes("곱셈")) {
    return {
      title: "한 묶음과 묶음 수를 나누어 봐요",
      message: "곱셈 문제는 전체를 바로 세기보다 '한 묶음에 몇 개', '그 묶음이 몇 개'인지 구분해야 합니다."
    };
  }
  return {
    title: "문제가 묻는 말을 다시 잡아요",
    message: "답을 고르기 전에 문제에서 구하라는 것이 전체인지, 차이인지, 이름인지, 단위인지 먼저 말로 정리하면 실수가 줄어듭니다."
  };
}

function buildRepresentationBridge(question, selectedText, correctText) {
  const category = resolveQuestionCategory(question);
  const key = question.category || "";

  if (key === "1-1" || key === "2-1" || category.includes("자리 수")) {
    return {
      title: "자리표로 다시 보기",
      steps: ["천·백·십·일 칸을 그립니다.", "숫자를 한 자리씩 칸에 넣습니다.", "가장 높은 자리부터 읽거나 비교합니다.", "답을 다시 문제의 표현으로 바꿉니다."]
    };
  }
  if (key === "1-2" || category.includes("도형")) {
    return {
      title: "손가락으로 도형 따라가기",
      steps: ["변을 하나씩 따라가며 셉니다.", "꺾이는 꼭짓점을 점으로 찍습니다.", "변과 꼭짓점의 수가 같은 도형 이름을 찾습니다.", "굽은 선이 있으면 원인지 다시 확인합니다."]
    };
  }
  if (key === "1-3" || category.includes("덧셈") || category.includes("뺄셈")) {
    return {
      title: "자리값판으로 계산하기",
      steps: ["십의 자리와 일의 자리를 나눠 씁니다.", "일의 자리부터 계산합니다.", "10이 넘거나 부족하면 받아올림·받아내림을 표시합니다.", "마지막 답을 문제 상황에 넣어 말이 되는지 확인합니다."]
    };
  }
  if (key === "1-4" || key === "2-3" || category.includes("길이")) {
    return {
      title: "길이선을 그려 보기",
      steps: ["두 길이를 같은 단위로 맞춥니다.", "이어 붙이는 문제인지 비교하는 문제인지 표시합니다.", "더하기 또는 빼기 식을 세웁니다.", "답 끝에 cm 또는 m 단위를 붙입니다."]
    };
  }
  if (key === "2-4" || category.includes("시각") || category.includes("시간")) {
    return {
      title: "시계와 시간선으로 보기",
      steps: ["시작 시각과 끝 시각을 따로 표시합니다.", "분침이 몇 분 움직였는지 먼저 봅니다.", "60분이 넘으면 1시간으로 바꿉니다.", "시각을 묻는지 걸린 시간을 묻는지 다시 읽습니다."]
    };
  }
  if (key === "1-5" || key === "2-5" || category.includes("표") || category.includes("분류")) {
    return {
      title: "표에 표시하며 읽기",
      steps: ["찾을 항목 이름에 표시합니다.", "그 옆의 수를 가로로 따라 읽습니다.", "전체는 모두 더하고, 차이는 큰 수에서 작은 수를 뺍니다.", "가장 많은 것은 수가 가장 큰 항목입니다."]
    };
  }
  if (key === "1-6" || key === "2-2" || category.includes("곱셈")) {
    return {
      title: "묶음 그림으로 보기",
      steps: ["한 묶음에 몇 개인지 동그라미 칩니다.", "묶음이 몇 개인지 셉니다.", "같은 수를 뛰어 세거나 곱셈식으로 씁니다.", "전체 수와 맞는지 다시 세어 확인합니다."]
    };
  }
  if (key === "2-6" || category.includes("규칙")) {
    return {
      title: "수 사이에 규칙 쓰기",
      steps: ["이웃한 두 수 사이에 +, -, × 규칙을 써 봅니다.", "같은 변화가 반복되는지 확인합니다.", "도형이나 색은 반복 묶음을 괄호로 묶습니다.", "찾은 규칙을 다음 칸에 그대로 적용합니다."]
    };
  }

  return {
    title: "말·그림·식으로 연결하기",
    steps: ["문제가 묻는 말을 동그라미 칩니다.", "주어진 수와 단위를 그림에 적습니다.", "그림을 식으로 바꾸어 계산합니다.", "답이 문제의 질문에 맞는지 읽어 봅니다."]
  };
}

function buildSelfCheckQuestions(question) {
  const category = resolveQuestionCategory(question);
  if (question.category === "2-4" || category.includes("시각") || category.includes("시간")) {
    return ["시각을 묻나요, 걸린 시간을 묻나요?", "분을 더했을 때 60분이 넘나요?", "답에 시/분 표현이 맞나요?"];
  }
  if (question.category === "1-4" || question.category === "2-3" || category.includes("길이")) {
    return ["m와 cm를 같은 단위로 맞췄나요?", "이어 붙이는 건가요, 차이를 묻나요?", "답에 길이 단위를 붙였나요?"];
  }
  if (question.category === "1-5" || question.category === "2-5" || category.includes("표")) {
    return ["어떤 항목을 읽어야 하나요?", "전체, 가장 많은 것, 차이 중 무엇을 묻나요?", "표의 줄을 끝까지 따라갔나요?"];
  }
  if (question.category === "2-6" || category.includes("규칙")) {
    return ["앞의 두 칸 사이 변화가 같나요?", "더하기 규칙인가요, 곱하기 규칙인가요?", "반복 묶음은 어디까지인가요?"];
  }
  if (question.category === "1-3" || category.includes("덧셈") || category.includes("뺄셈")) {
    return ["일의 자리부터 계산했나요?", "받아올림·받아내림을 표시했나요?", "문장 속 상황이 더하기인가요, 빼기인가요?"];
  }
  if (question.category === "1-2" || category.includes("도형")) {
    return ["변을 모두 세었나요?", "꼭짓점을 빠뜨리지 않았나요?", "굽은 선이 있는 도형인가요?"];
  }
  if (question.category === "1-6" || question.category === "2-2" || category.includes("곱셈")) {
    return ["한 묶음은 몇 개인가요?", "묶음은 몇 개인가요?", "뛰어 세기 결과와 곱셈식이 같나요?"];
  }
  return ["문제가 구하라는 것은 무엇인가요?", "자리값이나 받아올림을 표시했나요?", "답을 문제에 다시 넣어도 말이 되나요?"];
}

function getLessonTeachingGuide(question) {
  const prompt = question.prompt || "";
  const key = question.category || "";
  const rules = [
    {
      key: "1-1",
      test: /100이 몇 개|100이|10이 몇 개|1이 몇 개/,
      guide: makeTeachingGuide(
        "자릿값 분해",
        "백·십·일 자리집에 숫자를 한 칸씩 넣고 수의 뜻을 읽기",
        "먼저 수를 백·십·일 자리집으로 나눠 봐요.",
        "각 자리의 숫자를 모형 개수로 바꾸어 놓습니다.",
        "답은 숫자 하나가 아니라 '백, 십, 일의 개수' 순서로 말합니다.",
        ["백의 자리 숫자는 무엇인가요?", "십과 일의 순서를 바꾸지 않았나요?", "답을 보기의 순서대로 썼나요?"]
      )
    },
    {
      key: "1-1",
      test: /중 더 큰 수|더 큰 수/,
      guide: makeTeachingGuide(
        "수 비교",
        "가장 높은 자리부터 처음 달라지는 자리까지 비교하기",
        "왼쪽의 가장 큰 자리부터 두 수를 세로로 맞춥니다.",
        "처음 숫자가 달라지는 칸에 표시합니다.",
        "그 칸의 숫자가 큰 수를 답으로 고릅니다.",
        ["가장 왼쪽 자리부터 봤나요?", "처음 다른 자리를 찾았나요?", "일의 자리부터 비교하지 않았나요?"]
      )
    },
    {
      key: "1-1",
      test: /로 나타낸 수|바로 앞|바로 뒤/,
      guide: makeTeachingGuide(
        "수 만들기와 이웃 수",
        "전개된 자리 조각을 모으거나 수직선 한 칸을 움직이기",
        "100, 10, 1 조각을 자리집에 모읍니다.",
        "바로 앞뒤는 수직선에서 한 칸만 움직입니다.",
        "만든 수를 다시 읽어 문제 표현과 맞춥니다.",
        ["0의 개수가 자리 이름과 맞나요?", "바로 앞뒤를 10씩 움직이지 않았나요?", "만든 수를 다시 읽었나요?"]
      )
    },
    {
      key: "1-2",
      test: /변이|꼭짓점|굽은 선|도형은 무엇/,
      guide: makeTeachingGuide(
        "도형 특징",
        "이름을 외우기보다 변·꼭짓점·굽은 선을 근거로 고르기",
        "도형의 테두리를 손가락으로 따라갑니다.",
        "꺾이는 점에는 점을 찍고, 곧은 변을 하나씩 셉니다.",
        "세어 낸 특징과 맞는 이름을 고릅니다.",
        ["변을 빠뜨리지 않았나요?", "꼭짓점은 꺾이는 곳만 셌나요?", "굽은 선이면 꼭짓점이 0개인가요?"]
      )
    },
    {
      key: "1-2",
      test: /다음에 올 도형|규칙/,
      guide: makeTeachingGuide(
        "도형 반복",
        "가장 짧게 반복되는 도형 묶음을 찾아 다음을 예측하기",
        "앞에서부터 같은 묶음이 어디까지인지 괄호로 묶습니다.",
        "묶음이 끝난 뒤에는 첫 도형으로 돌아갑니다.",
        "다음 칸이 묶음의 몇 번째 자리인지 확인합니다.",
        ["반복 묶음을 너무 길게 잡지 않았나요?", "묶음이 끝났나요?", "다음은 새 묶음의 첫 자리인가요?"]
      )
    },
    {
      key: "1-3",
      test: /□/,
      guide: makeTeachingGuide(
        "전체-부분 빈칸",
        "빈칸을 찍지 않고 전체 막대에서 아는 부분을 빼서 찾기",
        "전체 수를 긴 막대 위에 먼저 씁니다.",
        "이미 아는 부분을 색으로 덮습니다.",
        "남은 부분이 □인지 확인하고 거꾸로 식을 세웁니다.",
        ["전체는 어느 수인가요?", "아는 부분은 어느 수인가요?", "□가 답인지, 빼는 수인지 구분했나요?"]
      )
    },
    {
      key: "1-3",
      test: /더 받|받았습니다|모두 몇|가지고 있고/,
      guide: makeTeachingGuide(
        "문장제 덧셈",
        "처음 수와 늘어난 수를 두 부분으로 놓고 전체를 구하기",
        "문장에서 처음 가진 수와 더 받은 수를 각각 표시합니다.",
        "두 부분을 한 막대나 자리값판에 나란히 붙입니다.",
        "모두를 묻고 있으므로 두 수를 더해 전체를 확인합니다.",
        ["처음 수는 무엇인가요?", "더 받은 수는 무엇인가요?", "모두를 묻기 때문에 더했나요?"]
      )
    },
    {
      key: "1-3",
      test: /남|썼|줄|빼|차이|덜/,
      guide: makeTeachingGuide(
        "문장제 뺄셈",
        "처음 전체에서 사라진 부분을 덜어 남은 부분 구하기",
        "처음 있던 전체 수를 긴 막대에 씁니다.",
        "쓴 것, 줄어든 것, 빼는 부분을 색으로 덮습니다.",
        "남은 부분이나 차이를 묻고 있으므로 뺄셈으로 확인합니다.",
        ["처음 전체는 무엇인가요?", "덜어진 부분은 무엇인가요?", "남은 부분을 묻나요?"]
      )
    },
    {
      key: "1-3",
      test: /\+/,
      guide: makeTeachingGuide(
        "받아올림 덧셈",
        "일의 자리 10개를 십 1개로 바꾸고 십의 자리로 넘기기",
        "일의 자리부터 더해 10개 묶음이 생기는지 봅니다.",
        "10일은 1십으로 이름을 바꾸어 가운데 자리로 옮깁니다.",
        "십의 자리까지 더한 뒤 답의 자리값을 읽습니다.",
        ["일의 자리부터 계산했나요?", "10일을 1십으로 바꿨나요?", "십의 자리에 올린 1을 더했나요?"]
      )
    },
    {
      key: "1-3",
      test: /-/,
      guide: makeTeachingGuide(
        "받아내림 뺄셈",
        "일의 자리에서 부족하면 십 1개를 일 10개로 바꾸기",
        "먼저 일의 자리끼리 뺄 수 있는지 봅니다.",
        "부족하면 십 1개를 일 10개로 풀어 놓습니다.",
        "일을 뺀 뒤 십의 자리도 줄어든 수로 계산합니다.",
        ["일의 자리에서 바로 뺄 수 있나요?", "십의 자리가 1 줄었나요?", "바꾼 뒤 수를 다시 썼나요?"]
      )
    },
    {
      key: "1-4",
      test: /이어 붙이면|합하면|더하면/,
      guide: makeTeachingGuide(
        "길이 이어 붙이기",
        "두 길이를 한 줄로 붙여 전체 길이를 더하기",
        "두 테이프의 시작과 끝을 같은 줄에 놓습니다.",
        "이어진 전체 길이가 되므로 두 수를 더합니다.",
        "답 끝에 cm 단위를 붙입니다.",
        ["붙인 문제인가요?", "두 길이를 모두 사용했나요?", "cm 단위를 붙였나요?"]
      )
    },
    {
      key: "1-4",
      test: /보다 몇 cm 더|더 긴/,
      guide: makeTeachingGuide(
        "길이 차이",
        "같은 시작점에 맞추고 남는 꼬리만 빼기로 구하기",
        "두 테이프의 왼쪽 끝을 같은 곳에 맞춥니다.",
        "긴 테이프에서 짧은 테이프를 덮고 남는 부분을 봅니다.",
        "남는 꼬리 길이를 큰 수-작은 수로 구합니다.",
        ["두 길이의 시작점을 맞췄나요?", "전체를 다시 더하지 않았나요?", "큰 수에서 작은 수를 뺐나요?"]
      )
    },
    {
      key: "1-4",
      test: /10cm|0 눈금|자를 사용할/,
      guide: makeTeachingGuide(
        "자와 10cm",
        "0 눈금에서 재고, 10cm 변화는 십의 자리 한 칸으로 보기",
        "자를 쓸 때 물건 끝을 0 눈금에 맞춥니다.",
        "10cm를 더하면 수직선에서 10만큼 이동합니다.",
        "끝 눈금이나 이동한 칸이 답이 됩니다.",
        ["0 눈금에서 시작했나요?", "10을 더할 때 십의 자리가 변했나요?", "눈금 숫자만 세지 않았나요?"]
      )
    },
    {
      key: "1-5",
      test: /표에서|몇 개인가요|몇 명인가요/,
      guide: makeTeachingGuide(
        "표 한 줄 읽기",
        "항목 이름에서 수까지 가로줄을 따라 정확히 연결하기",
        "찾을 항목 이름에 먼저 표시합니다.",
        "같은 줄을 옆으로 따라가 숫자를 읽습니다.",
        "읽은 수의 단위가 개/명인지 붙입니다.",
        ["찾을 이름을 표시했나요?", "같은 가로줄을 따라갔나요?", "단위를 붙였나요?"]
      )
    },
    {
      key: "1-5",
      test: /합하면|모두|가장 많은|분류할 수 없는|기준/,
      guide: makeTeachingGuide(
        "분류와 비교",
        "기준을 말한 뒤 항목별 수를 더하거나 큰 수를 찾기",
        "먼저 분류 기준이나 묻는 말을 동그라미 칩니다.",
        "필요한 항목의 수에만 표시합니다.",
        "전체는 더하고, 가장 많은 것은 큰 수를 고릅니다.",
        ["분류 기준을 말했나요?", "필요한 항목만 골랐나요?", "전체와 가장 많은 것을 구분했나요?"]
      )
    },
    {
      key: "1-6",
      test: /개씩.*묶음|묶음이면|모두 .*개를/,
      guide: makeTeachingGuide(
        "같은 묶음",
        "한 묶음의 수와 묶음 수를 나누어 곱셈으로 연결하기",
        "한 묶음 안에 몇 개가 있는지 먼저 동그라미 칩니다.",
        "같은 묶음이 몇 번 있는지 셉니다.",
        "같은 수 더하기와 곱셈식이 같은지 확인합니다.",
        ["한 묶음은 몇 개인가요?", "묶음은 몇 개인가요?", "전체와 묶음 수를 바꾸지 않았나요?"]
      )
    },
    {
      key: "1-6",
      test: /\+.*\+|×/,
      guide: makeTeachingGuide(
        "반복 덧셈과 곱셈",
        "반복되는 수와 반복 횟수를 찾아 곱셈식으로 쓰기",
        "반복되는 같은 수에 밑줄을 긋습니다.",
        "몇 번 반복되는지 손가락으로 셉니다.",
        "반복되는 수 × 반복 횟수로 식을 씁니다.",
        ["같은 수가 반복되나요?", "몇 번 반복되는지 셌나요?", "더하기와 곱하기 식이 같은 뜻인가요?"]
      )
    },
    {
      key: "2-1",
      test: /1000이|100이|10이|1이|로 나타낸 수/,
      guide: makeTeachingGuide(
        "네 자리 자릿값",
        "천·백·십·일 자리의 숫자와 자리값을 연결하기",
        "천·백·십·일 네 칸을 왼쪽부터 만듭니다.",
        "각 숫자를 자기 자리집에 넣습니다.",
        "전개식 조각은 같은 자리로 다시 모읍니다.",
        ["천의 자리부터 읽었나요?", "0의 개수와 자리 이름이 맞나요?", "네 칸 순서를 지켰나요?"]
      )
    },
    {
      key: "2-1",
      test: /더 큰 수|가까운 몇백/,
      guide: makeTeachingGuide(
        "네 자리 비교와 경계",
        "가장 높은 자리부터 비교하고 백 단위 경계를 수직선에서 찾기",
        "두 수를 같은 자리끼리 세로로 맞춥니다.",
        "처음 다른 자리나 지나온 몇백 경계에 표시합니다.",
        "비교한 자리나 경계가 답이 되는지 말합니다.",
        ["천의 자리부터 비교했나요?", "백 단위 경계는 어디인가요?", "작은 쪽 경계를 묻나요?"]
      )
    },
    {
      key: "2-2",
      test: /×□/,
      guide: makeTeachingGuide(
        "빈칸 곱셈",
        "목표 수까지 같은 수로 몇 번 뛰는지 세기",
        "한 번에 뛰는 수를 확인합니다.",
        "0에서 목표 수까지 같은 간격으로 뛰어 셉니다.",
        "□는 도착한 값이 아니라 뛴 횟수입니다.",
        ["몇씩 뛰나요?", "목표 수는 무엇인가요?", "□를 전체 값으로 착각하지 않았나요?"]
      )
    },
    {
      key: "2-2",
      test: /한 줄에|바둑돌|만들 수 있는|×/,
      guide: makeTeachingGuide(
        "배열과 구구단",
        "한 줄의 수와 줄 수를 배열 그림·뛰어 세기·식으로 연결하기",
        "한 줄에 있는 개수를 가로로 표시합니다.",
        "그런 줄이 몇 줄인지 세로로 셉니다.",
        "줄마다 같은 수를 뛰어 세어 곱셈식과 맞춥니다.",
        ["한 줄은 몇 개인가요?", "줄은 몇 줄인가요?", "보기의 식을 직접 계산했나요?"]
      )
    },
    {
      key: "2-3",
      test: /모두 몇 cm|m와 cm|cm를 m와 cm/,
      guide: makeTeachingGuide(
        "m-cm 변환",
        "1m=100cm를 100 묶음으로 보고 같은 단위로 바꾸기",
        "m가 보이면 100cm 묶음으로 바꿉니다.",
        "남은 cm를 100 묶음 뒤에 붙입니다.",
        "같은 단위가 된 뒤 더하거나 다시 m와 cm로 나눕니다.",
        ["1m를 100cm로 바꿨나요?", "남은 cm를 빠뜨리지 않았나요?", "답 단위가 문제와 같나요?"]
      )
    },
    {
      key: "2-3",
      test: /보다 몇 cm 더|알맞은 단위|문 높이|단위는/,
      guide: makeTeachingGuide(
        "긴 길이 비교",
        "두 길이를 cm로 맞추거나 실제 물건 크기에 맞는 단위 고르기",
        "비교할 두 길이를 모두 cm로 바꿉니다.",
        "같은 시작점에 맞추어 남는 부분을 봅니다.",
        "단위 문제는 몸이나 교실 물건의 실제 크기를 떠올립니다.",
        ["두 길이를 같은 단위로 맞췄나요?", "큰 길이에서 작은 길이를 뺐나요?", "m가 자연스러운 물건인가요?"]
      )
    },
    {
      key: "2-4",
      test: /분 뒤|분 후/,
      guide: makeTeachingGuide(
        "몇 분 뒤 시각",
        "분을 먼저 움직이고 60분이 되면 1시간으로 바꾸기",
        "시작 시각을 시계나 시간선에 표시합니다.",
        "분침을 주어진 분만큼 먼저 움직입니다.",
        "60분을 넘으면 시를 1 크게 바꿉니다.",
        ["분을 먼저 더했나요?", "60분을 넘었나요?", "답은 시각인가요?"]
      )
    },
    {
      key: "2-4",
      test: /걸린 시간|부터.*까지|반|긴바늘|짧은바늘/,
      guide: makeTeachingGuide(
        "시각과 시간 구분",
        "시계가 가리키는 순간과 움직인 양을 구분하기",
        "시작과 끝을 시간선의 두 점으로 표시합니다.",
        "두 점 사이에 분침이 움직인 양을 적습니다.",
        "반은 30분, 긴바늘은 분, 짧은바늘은 시로 읽습니다.",
        ["시각을 묻나요, 시간을 묻나요?", "긴바늘과 짧은바늘 역할을 나눴나요?", "30분을 반으로 읽었나요?"]
      )
    },
    {
      key: "2-5",
      test: /표에서|몇 명인가요/,
      guide: makeTeachingGuide(
        "표와 그래프 읽기",
        "항목-수-막대 길이를 같은 줄에서 연결하기",
        "찾을 항목 이름에 표시합니다.",
        "같은 줄의 숫자와 막대 끝을 함께 봅니다.",
        "단위가 명인지 개수인지 확인합니다.",
        ["항목 이름을 정확히 찾았나요?", "가로줄을 따라갔나요?", "막대 길이와 숫자가 맞나요?"]
      )
    },
    {
      key: "2-5",
      test: /모두|차이|가장 많은|가장 적은/,
      guide: makeTeachingGuide(
        "자료 해석",
        "전체는 모두 더하고, 차이는 가장 큰 수와 작은 수를 비교하기",
        "표의 각 행을 하나씩 체크합니다.",
        "전체는 체크한 수를 모두 더합니다.",
        "차이는 가장 큰 막대에서 가장 작은 막대만큼을 덮고 남은 부분입니다.",
        ["모든 항목을 체크했나요?", "가장 큰 수와 작은 수를 찾았나요?", "전체와 차이를 구분했나요?"]
      )
    },
    {
      key: "2-6",
      test: /빨강|파랑|다음에 올|규칙/,
      guide: makeTeachingGuide(
        "규칙 찾기",
        "이웃한 칸 사이 변화나 반복 묶음을 표시해 다음 칸 예측하기",
        "숫자 사이에는 +, -, × 화살표를 직접 씁니다.",
        "색과 도형은 가장 짧은 반복 묶음을 괄호로 묶습니다.",
        "마지막 칸에도 같은 행동을 한 번 더 적용합니다.",
        ["변화량이 계속 같나요?", "반복 묶음은 어디까지인가요?", "더하기가 아니면 곱하기도 확인했나요?"]
      )
    }
  ];
  const rule = rules.find((item) => item.key === key && item.test.test(prompt));
  return rule ? rule.guide : getUnitDefaultTeachingGuide(question);
}

function makeTeachingGuide(lessonName, goal, look, move, confirm, selfCheck) {
  return {
    lessonName,
    goal,
    look,
    move,
    confirm,
    representationTitle: "다음 문제에서 할 행동",
    representationSteps: [look, move, confirm],
    selfCheck
  };
}

function getUnitDefaultTeachingGuide(question) {
  const category = question.category || "";
  const fallbackByUnit = {
    "1-1": makeTeachingGuide("자리값 확인", "자리집을 만들어 숫자의 뜻을 읽기", "높은 자리부터 칸을 나눕니다.", "숫자를 알맞은 자리집에 넣습니다.", "자리 이름을 붙여 답을 확인합니다.", ["어느 자리부터 봤나요?", "자리 이름이 맞나요?", "답 순서가 맞나요?"]),
    "1-2": makeTeachingGuide("도형 특징", "도형의 구성 요소를 근거로 고르기", "테두리를 따라갑니다.", "변과 꼭짓점을 셉니다.", "특징과 이름을 연결합니다.", ["변을 셌나요?", "꼭짓점을 셌나요?", "굽은 선이 있나요?"]),
    "1-3": makeTeachingGuide("자리값 계산", "오른쪽 자리부터 계산하며 10 묶음을 바꾸기", "일의 자리부터 계산합니다.", "10 묶음이 생기거나 부족하면 바로 옆 자리와 바꿉니다.", "십의 자리까지 계산해 답을 읽습니다.", ["일의 자리부터 했나요?", "받아올림/받아내림을 표시했나요?", "자리별 답을 합쳤나요?"]),
    "1-4": makeTeachingGuide("길이 재기", "길이를 같은 단위와 같은 시작점으로 맞추기", "길이와 단위를 찾습니다.", "더하기인지 비교인지 표시합니다.", "계산 뒤 단위를 붙입니다.", ["단위가 같나요?", "더하기인가요 비교인가요?", "답에 단위를 붙였나요?"]),
    "1-5": makeTeachingGuide("분류 읽기", "기준과 항목을 연결해 표를 읽기", "분류 기준을 먼저 말합니다.", "필요한 항목의 수만 표시합니다.", "전체·차이·가장 많음을 구분합니다.", ["기준을 찾았나요?", "항목과 수가 연결됐나요?", "무엇을 묻나요?"]),
    "1-6": makeTeachingGuide("같은 수 묶음", "묶음 그림과 반복 덧셈을 곱셈으로 연결하기", "한 묶음의 수를 찾습니다.", "묶음 수를 셉니다.", "반복 덧셈이나 곱셈식으로 확인합니다.", ["한 묶음은 몇 개인가요?", "묶음은 몇 개인가요?", "전체와 맞나요?"]),
    "2-1": makeTeachingGuide("네 자리 수", "천·백·십·일의 자리값을 지키기", "네 자리집을 만듭니다.", "각 숫자를 자리집에 넣습니다.", "높은 자리부터 비교하거나 읽습니다.", ["천의 자리부터 봤나요?", "백·십·일 순서를 지켰나요?", "전개식과 같은가요?"]),
    "2-2": makeTeachingGuide("곱셈구구", "배열·뛰어 세기·곱셈식을 연결하기", "한 줄 또는 한 묶음을 찾습니다.", "몇 줄 또는 몇 번인지 셉니다.", "뛰어 세기로 답을 확인합니다.", ["몇씩 뛰나요?", "몇 번 뛰나요?", "식과 그림이 같은가요?"]),
    "2-3": makeTeachingGuide("m와 cm", "100cm 묶음으로 길이 단위를 바꾸기", "m와 cm를 찾습니다.", "m는 100cm 묶음으로 바꿉니다.", "같은 단위로 계산합니다.", ["1m=100cm인가요?", "같은 단위인가요?", "단위를 다시 붙였나요?"]),
    "2-4": makeTeachingGuide("시각과 시간", "분침의 움직임과 시각 표현을 구분하기", "시작 시각을 표시합니다.", "분이 얼마나 움직였는지 봅니다.", "시각인지 걸린 시간인지 답을 맞춥니다.", ["시각인가요 시간인가요?", "분침을 먼저 봤나요?", "60분을 확인했나요?"]),
    "2-5": makeTeachingGuide("자료 해석", "표와 그래프에서 항목·수·비교를 연결하기", "항목 이름에 표시합니다.", "수와 막대를 같은 줄에서 봅니다.", "전체·차이·가장 많음을 구분합니다.", ["항목을 찾았나요?", "숫자를 정확히 읽었나요?", "무엇을 묻나요?"]),
    "2-6": makeTeachingGuide("규칙 적용", "변화 화살표나 반복 묶음을 다음 칸에 적용하기", "칸 사이 변화를 적습니다.", "같은 변화가 반복되는지 봅니다.", "마지막에도 같은 행동을 합니다.", ["변화가 같은가요?", "반복 묶음이 보이나요?", "다음 칸에 같은 규칙을 썼나요?"])
  };
  return fallbackByUnit[category] || makeTeachingGuide(
    "문제 구조 확인",
    "문제의 조건을 그림·말·식으로 연결하기",
    "묻는 말을 먼저 찾습니다.",
    "주어진 수와 단위를 그림에 표시합니다.",
    "계산 뒤 답이 질문에 맞는지 확인합니다.",
    ["무엇을 구하나요?", "조건을 모두 썼나요?", "답 표현이 맞나요?"]
  );
}

function buildDifficultyFocus(question, guide) {
  const tier = {
    low: "하",
    mid: "중",
    high: "상"
  }[question.difficulty] || "중";
  const focusByTier = {
    low: `${tier} 난이도: 그림이나 자리집에서 바로 보이는 조건을 놓치지 않는 연습입니다.`,
    mid: `${tier} 난이도: 조건을 식으로 바꾸고 대표 풀이 순서를 적용하는 연습입니다.`,
    high: `${tier} 난이도: 빈칸, 비교, 변환처럼 두 생각을 이어야 하므로 표시를 먼저 해야 합니다.`
  };
  if (question.difficulty === "low" && guide.look) {
    return `${tier} 난이도: ${guide.look}`;
  }
  if (question.difficulty === "mid" && guide.move) {
    return `${tier} 난이도: ${guide.move}`;
  }
  if (question.difficulty === "high" && guide.confirm) {
    return `${tier} 난이도: ${guide.confirm}`;
  }
  return focusByTier[question.difficulty] || focusByTier.mid;
}

function buildLessonStrategyCards(question, guide, misconception, representationSteps, difficultyFocus) {
  return [
    {
      title: "어디를 볼까?",
      body: guide.look || misconception.message
    },
    {
      title: "그림 행동",
      body: guide.move || representationSteps[0] || "조건을 그림 위에 표시합니다."
    },
    {
      title: "난이도 구분",
      body: difficultyFocus || "문제가 묻는 말을 답의 단위와 함께 확인합니다."
    }
  ];
}

function extractFirstNumber(text) {
  const match = String(text || "").replace(/,/g, "").match(/-?\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

function buildFeedbackClueVisual(question, selectedText, correctText) {
  const intuitiveVisual = renderFeedbackIntuitiveVisual(question, selectedText, correctText);

  return `
    <div class="feedback-visual-first">
      ${intuitiveVisual}
    </div>
  `;
}

function renderFeedbackIntuitiveVisual(question, selectedText, correctText) {
  const conceptVisual = renderConceptFeedbackVisual(question, selectedText, correctText);
  if (conceptVisual) {
    return `<div class="feedback-concept-visual">${conceptVisual}</div>`;
  }

  return `<div class="feedback-concept-visual">${renderQuestionLearningVisual(question, { revealAnswer: true })}</div>`;
}

function renderConceptFeedbackVisual(question, selectedText, correctText) {
  const category = question.category || "";
  const prompt = question.prompt || "";

  if (category === "1-5" || category === "2-5") {
    return renderTableConceptFeedback(question, selectedText, correctText);
  }

  if (category === "1-4" || category === "2-3" || prompt.includes("cm") || prompt.includes("m")) {
    return renderLengthConceptFeedback(question, selectedText, correctText);
  }

  if (category === "2-4" || prompt.includes("시") || prompt.includes("분")) {
    return renderTimeConceptFeedback(question, selectedText, correctText);
  }

  if (category === "1-2" || prompt.includes("도형") || prompt.includes("변") || prompt.includes("꼭짓점")) {
    return renderShapeConceptFeedback(question, selectedText, correctText);
  }

  if (category === "1-1" || category === "2-1" || prompt.includes("자리") || prompt.includes("1000")) {
    return renderPlaceValueConceptFeedback(question, selectedText, correctText);
  }

  if (category === "1-6" || category === "2-2" || prompt.includes("×") || prompt.includes("묶음")) {
    return renderMultiplicationConceptFeedback(question, selectedText, correctText);
  }

  if (category === "2-6" || prompt.includes("규칙")) {
    return renderPatternConceptFeedback(question, selectedText, correctText);
  }

  if (category === "1-3" || prompt.includes("+") || prompt.includes("-") || prompt.includes("□") || isAddSubStoryPrompt(prompt)) {
    return renderAddSubConceptFeedback(question, selectedText, correctText);
  }

  return "";
}

function renderAddSubConceptFeedback(question, selectedText, correctText) {
  const model = parseAddSubModel(question, correctText);
  if (!model) {
    return renderQuestionLearningVisual(question, { revealAnswer: true });
  }

  if (model.blank) {
    return renderBlankBarFeedback(model);
  }

  if (model.operator === "+") {
    return renderAdditionBlockFeedback(model);
  }

  return renderSubtractionBlockFeedback(model);
}

function parseAddSubModel(question, correctText) {
  const prompt = question.prompt || "";
  const correctNumber = extractFirstNumber(correctText);
  let match = prompt.match(/□\s*\+\s*(\d+)\s*=\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { blank: true, operator: "+", missingSide: "left", known: Number(match[1]), total: Number(match[2]), missing: correctNumber };
  }

  match = prompt.match(/(\d+)\s*\+\s*□\s*=\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { blank: true, operator: "+", missingSide: "right", known: Number(match[1]), total: Number(match[2]), missing: correctNumber };
  }

  match = prompt.match(/□\s*-\s*(\d+)\s*=\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { blank: true, operator: "-", missingSide: "left", known: Number(match[1]), total: correctNumber, result: Number(match[2]), missing: correctNumber };
  }

  match = prompt.match(/(\d+)\s*-\s*□\s*=\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { blank: true, operator: "-", missingSide: "right", total: Number(match[1]), result: Number(match[2]), missing: correctNumber };
  }

  match = prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { left: Number(match[1]), operator: match[2], right: Number(match[3]), result: correctNumber };
  }

  const numbers = (prompt.match(/\d+/g) || []).map(Number);
  if (numbers.length >= 2 && Number.isFinite(correctNumber)) {
    const isSubtract = /썼|남|빼|차이|덜|줄/.test(prompt);
    return { left: numbers[0], operator: isSubtract ? "-" : "+", right: numbers[1], result: correctNumber };
  }

  return null;
}

function renderTenRods(count, limit = 6, faded = 0) {
  const safeCount = Math.max(0, Math.min(count, limit));
  return Array.from({ length: safeCount }, (_, index) => `<i class="${index < faded ? "is-faded" : ""}"></i>`).join("");
}

function renderDots(count, marked = 0) {
  const safeCount = Math.max(0, Math.min(count, 16));
  return Array.from({ length: safeCount }, (_, index) => `<i class="${index < marked ? "is-marked" : ""}"></i>`).join("");
}

function renderStudentPrompt(text) {
  return `<div class="student-think-prompt">${escapeHtml(text)}</div>`;
}

function renderFeedbackAnswerLine(selectedText, correctText) {
  if (!selectedText) {
    return `<div class="feedback-answer-line"><span>바른 생각</span><strong>${escapeHtml(correctText)}</strong></div>`;
  }

  return `
    <div class="feedback-answer-line">
      <span>내 답 ${escapeHtml(selectedText)}</span>
      <i></i>
      <strong>고쳐 볼 답 ${escapeHtml(correctText)}</strong>
    </div>
  `;
}

function renderObjectDots(count, className = "") {
  const safeCount = Math.max(0, Math.min(count, 36));
  return Array.from({ length: safeCount }, (_, index) => `<i class="${className}" style="--dot:${index}"></i>`).join("");
}

function renderCarryBundleDots(firstCount, secondCount) {
  const firstDots = Math.max(0, Math.min(10, firstCount));
  const secondDots = Math.max(0, Math.min(10 - firstDots, secondCount));
  return [
    ...Array.from({ length: firstDots }, (_, index) => `<i class="is-first" style="--dot:${index}"></i>`),
    ...Array.from({ length: secondDots }, (_, index) => `<i class="is-second" style="--dot:${firstDots + index}"></i>`)
  ].join("");
}

function renderBaseTenNumber(number, title, options = {}) {
  const tens = Math.max(0, Math.floor(number / 10));
  const ones = Math.max(0, number % 10);
  const crossedTens = options.crossedTens || 0;
  const crossedOnes = options.crossedOnes || 0;
  return `
    <div class="teach-base-ten-number">
      <strong>${escapeHtml(title)}</strong>
      <div class="teach-base-ten-zones">
        <div>
          <span>십</span>
          <div class="teach-rods">${renderTenRods(tens, 9, crossedTens)}</div>
        </div>
        <div>
          <span>일</span>
          <div class="teach-ones">${renderDots(ones, crossedOnes)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderAddendBlocks(value, label) {
  return `
    <div class="addend-block">
      <strong>${escapeHtml(label)} ${value}</strong>
      <div class="addend-ten">${renderTenRods(Math.floor(value / 10), 6)}</div>
      <div class="addend-one">${renderDots(value % 10)}</div>
    </div>
  `;
}

function renderBlankBarFeedback(model) {
  const total = model.total || model.result + model.known || 1;
  const known = model.known || model.result || 1;
  const missing = model.missing || Math.max(0, total - known);
  const equation = model.operator === "-"
    ? model.missingSide === "right"
      ? `${total} - □ = ${model.result}`
      : `□ - ${known} = ${model.result}`
    : model.missingSide === "right"
      ? `${known} + □ = ${total}`
      : `□ + ${known} = ${total}`;
  const whole = model.operator === "-" && model.missingSide === "left" ? missing : total;
  const knownPart = model.operator === "-" && model.missingSide === "right" ? model.result : known;
  const missingPart = model.operator === "-" && model.missingSide === "left" ? model.result : missing;
  const denominator = Math.max(whole, knownPart + missingPart, 1);
  const piecePercent = (value) => Math.max(22, Math.min(78, Math.round(value / denominator * 100)));
  const knownPercent = piecePercent(knownPart);
  const missingPercent = Math.max(22, 100 - knownPercent);
  const knownLabel = model.operator === "-"
    ? model.missingSide === "right"
      ? `남은 부분 ${model.result}`
      : `빼낸 부분 ${known}`
    : `아는 부분 ${known}`;
  const missingLabel = model.operator === "-"
    ? model.missingSide === "right"
      ? `빈칸 ${missing}`
      : `남은 부분 ${model.result}`
    : `빈칸 ${missing}`;
  const knownSegment = {
    className: "part-segment--known",
    label: knownLabel,
    value: knownPart,
    percent: knownPercent
  };
  const missingSegment = {
    className: "part-segment--missing",
    label: missingLabel,
    value: missingPart,
    percent: missingPercent
  };
  const segments = model.operator === "+" && model.missingSide === "left"
    ? [missingSegment, knownSegment]
    : [knownSegment, missingSegment];
  const relation = model.operator === "+"
    ? `${whole} - ${known} = ${missing}`
    : model.missingSide === "right"
      ? `${whole} - ${model.result} = ${missing}`
      : `${known} + ${model.result} = ${whole}`;
  const countStart = model.operator === "+"
    ? known
    : model.missingSide === "right"
      ? model.result
      : known;
  const countEnd = whole;
  const countJump = Math.max(0, countEnd - countStart);
  const thinking = model.operator === "+"
    ? "전체 막대를 아는 부분과 빈칸으로 나눠 보세요. 빈칸은 전체에서 아는 부분을 뺀 길이예요."
    : model.missingSide === "right"
      ? "처음 막대에서 남은 부분을 확인하면, 빠져나간 빈칸 부분만 또렷하게 보입니다."
      : "빼낸 부분과 남은 부분을 다시 붙이면 처음 수가 됩니다.";
  const segmentMarkup = segments.map((segment) => `
          <span class="part-segment ${segment.className}" style="--piece:${segment.percent}%">
            <em>${escapeHtml(segment.label)}</em>
            <strong>${segment.value}</strong>
          </span>
        `).join("");

  return `
    <div class="concept-card concept-card--bar teach-card">
      <div class="teach-head">
        <span>전체-부분 막대</span>
        <strong>${escapeHtml(equation)}</strong>
      </div>
      <div class="part-whole-board part-whole-board--teach">
        <div class="whole-bar-label">
          <span>${model.operator === "-" && model.missingSide === "left" ? "처음 수" : "전체"}</span>
          <strong>${whole}</strong>
        </div>
        <div class="unknown-addend-board">
          ${segmentMarkup}
        </div>
        <div class="bar-reasoning-row">
          <span>전체</span>
          <i aria-hidden="true"></i>
          <span>부분을 빼면 빈칸</span>
        </div>
        <div class="fact-family-board">
          <span>${escapeHtml(equation)}</span>
          <b>${escapeHtml(relation)}</b>
        </div>
        <div class="count-up-strip" aria-label="${countStart}에서 ${countEnd}까지 ${countJump}만큼">
          <span>${countStart}</span>
          <i><b>+${countJump}</b></i>
          <span>${countEnd}</span>
        </div>
      </div>
      ${renderStudentPrompt(thinking)}
    </div>
  `;
}

function renderAdditionBlockFeedback(model) {
  if (Math.max(model.left, model.right, model.result) >= 100) {
    return renderThreePlaceAddFeedback(model);
  }

  const onesA = model.left % 10;
  const onesB = model.right % 10;
  const onesSum = onesA + onesB;
  const carry = onesSum >= 10;
  const secondInBundle = carry ? Math.min(onesB, Math.max(0, 10 - onesA)) : 0;
  const remainderOnes = carry ? onesSum - 10 : onesSum;
  const resultOnes = model.result % 10;
  const resultTens = Math.floor(model.result / 10);
  const tensA = Math.floor(model.left / 10);
  const tensB = Math.floor(model.right / 10);
  const beforeTens = tensA + tensB;
  const carriedTens = carry ? 1 : 0;

  if (carry) {
    return `
      <div class="concept-card concept-card--regroup concept-card--carry teach-card">
        <div class="teach-head">
          <span>받아올림 장면</span>
          <strong>${model.left} + ${model.right}</strong>
        </div>
        <div class="carry-regroup-board">
          <section class="carry-step carry-step--ones">
            <div class="carry-step-title">
              <span>1</span>
              <strong>일의 자리부터 봐요</strong>
              <b>${onesA}+${onesB}=${onesSum}</b>
            </div>
            <div class="carry-dot-workspace">
              <div class="carry-bundle-ten" aria-label="일의 자리에서 정확히 10개 묶기">
                <div class="carry-bundle-dots">
                  ${renderCarryBundleDots(onesA, secondInBundle)}
                </div>
                <i class="carry-bundle-ring" aria-hidden="true"></i>
                <strong>정확히 10개</strong>
              </div>
              <div class="carry-remainder-box ${remainderOnes ? "" : "is-zero"}">
                <div>${remainderOnes ? renderObjectDots(remainderOnes, "is-remainder") : "<em>0</em>"}</div>
                <strong>남은 일 ${remainderOnes}개</strong>
              </div>
            </div>
          </section>
          <div class="carry-down-arrow" aria-hidden="true">
            <span>10개 → 1십</span>
          </div>
          <section class="carry-step carry-step--tens">
            <div class="carry-step-title">
              <span>2</span>
              <strong>십의 자리에 1십을 올려요</strong>
              <b>${beforeTens}십+${carriedTens}십=${resultTens}십</b>
            </div>
            <div class="carry-tens-workspace">
              <div class="teach-rods carry-tens-rods">
                ${renderTenRods(beforeTens, 8)}
                <i class="new-ten-rod" title="받아올린 1십"></i>
              </div>
              <small>기존 ${beforeTens}십에 받아올린 1십을 더해요.</small>
            </div>
          </section>
        </div>
        <div class="after-board">
          <span>바꾼 뒤</span>
          <strong>${resultTens}십 ${resultOnes}일 = ${model.result}</strong>
        </div>
        ${renderStudentPrompt("일의 자리 10개는 사라지는 게 아니라 십 1개로 이름을 바꾸는 거예요.")}
      </div>
    `;
  }

  return `
    <div class="concept-card concept-card--regroup concept-card--place-add teach-card">
      <div class="teach-head">
        <span>자리값 덧셈</span>
        <strong>${model.left} + ${model.right}</strong>
      </div>
      <div class="place-add-board" aria-label="같은 자리끼리 따로 더하기">
        <section class="place-add-step place-add-step--ones">
          <div class="place-add-step-head">
            <span>일</span>
            <strong>일의 자리</strong>
            <b>${onesA}+${onesB}=${resultOnes}</b>
          </div>
          <div class="place-add-model place-add-model--ones">
            <div class="teach-ones">${renderCarryBundleDots(onesA, onesB)}</div>
          </div>
          <small>일 ${resultOnes}개</small>
        </section>
        <section class="place-add-step place-add-step--tens">
          <div class="place-add-step-head">
            <span>십</span>
            <strong>십의 자리</strong>
            <b>${tensA}+${tensB}=${resultTens}</b>
          </div>
          <div class="place-add-model place-add-model--tens">
            <div class="teach-rods">${renderTenRods(beforeTens, 8)}</div>
          </div>
          <small>십 ${resultTens}개</small>
        </section>
      </div>
      <div class="after-board after-board--place-add">
        <span>자리별 답</span>
        <strong>${resultTens}십 ${resultOnes}일 = ${model.result}</strong>
      </div>
      ${renderStudentPrompt("같은 자리끼리 따로 더한 뒤, 십의 자리와 일의 자리를 붙여 답을 읽어요.")}
    </div>
  `;
}

function renderSubtractionBlockFeedback(model) {
  if (Math.max(model.left, model.right, model.result) >= 100) {
    return renderThreePlaceSubFeedback(model);
  }

  const leftOnes = model.left % 10;
  const rightOnes = model.right % 10;
  const borrow = leftOnes < rightOnes;
  const changedTens = Math.max(0, Math.floor(model.left / 10) - (borrow ? 1 : 0));
  const changedOnes = leftOnes + (borrow ? 10 : 0);
  const resultTens = Math.floor(model.result / 10);
  const resultOnes = model.result % 10;
  const changedTensValue = changedTens * 10;
  const rightTensValue = Math.floor(model.right / 10) * 10;
  const resultTensValue = resultTens * 10;
  const splitProof = borrow
    ? `${changedTensValue}-${rightTensValue}=${resultTensValue}, ${changedOnes}-${rightOnes}=${resultOnes} → ${model.result}`
    : `${resultTensValue}과 ${resultOnes} = ${model.result}`;

  return `
    <div class="concept-card concept-card--borrow teach-card">
      <div class="teach-head">
        <span>${borrow ? "받아내림 장면" : "자리값 뺄셈"}</span>
        <strong>${model.left} - ${model.right}</strong>
      </div>
      <div class="subtraction-workbench ${borrow ? "is-borrow" : ""}">
        ${renderBaseTenNumber(model.left, "처음 수")}
        <div class="borrow-transform">
          <div class="borrow-moving-rod" aria-hidden="true"></div>
          <div class="borrow-units">${borrow ? renderObjectDots(10, "is-new") : ""}</div>
          <span>${borrow ? `${model.left} → ${changedTensValue}과 ${changedOnes}` : "일의 자리에서 바로 빼기"}</span>
        </div>
        <div class="borrow-after">
          <strong>${borrow ? `${changedTensValue}과 ${changedOnes}` : "바꾼 뒤"}</strong>
          <div class="teach-rods">${renderTenRods(changedTens, 8)}</div>
          <div class="teach-ones">${renderDots(changedOnes, rightOnes)}</div>
        </div>
      </div>
      <div class="after-board">
        <span>남은 수</span>
        <strong>${splitProof}</strong>
      </div>
      ${renderStudentPrompt(borrow ? `${model.left}${numberObjectParticle(model.left)} ${changedTensValue}과 ${changedOnes}${numberDirectionParticle(changedOnes)} 바꾸면, ${changedTensValue}에서 ${rightTensValue}${numberObjectParticle(rightTensValue)} 빼고 ${changedOnes}에서 ${rightOnes}${numberObjectParticle(rightOnes)} 빼요.` : "먼저 일의 자리끼리 빼고, 그다음 십의 자리를 빼요.")}
    </div>
  `;
}

function getThreeDigits(number) {
  return {
    h: Math.floor(number / 100),
    t: Math.floor((number % 100) / 10),
    o: number % 10
  };
}

function formatThreeDigitParts(digits, total) {
  const parts = [];
  if (digits.h > 0) {
    parts.push(`${digits.h}백`);
  }
  if (digits.t > 0) {
    parts.push(`${digits.t}십`);
  }
  if (digits.o > 0) {
    parts.push(`${digits.o}일`);
  }
  return `${parts.length ? parts.join(" ") : "0"} = ${total}`;
}

function renderPlaceTokens(count, label, className, limit = 12) {
  const safeCount = Math.max(0, Math.min(count, limit));
  return Array.from({ length: safeCount }, (_, index) => `<i class="${className}" title="${label} ${index + 1}"></i>`).join("");
}

function renderTenBundleExchange(tensRemain) {
  const remainderMarkup = tensRemain > 0
    ? renderPlaceTokens(tensRemain, "남은 십", "ten-token is-remain-ten", 9)
    : `<span class="empty-remainder">0십</span>`;

  return `
    <div class="ten-exchange-board">
      <div class="ten-bundle-box">
        <div class="ten-bundle-rods">${renderPlaceTokens(10, "묶는 십", "ten-token", 10)}</div>
        <strong>10십 = 1백</strong>
        <small>정확히 10개 묶음</small>
        <i class="ten-bundle-ring" aria-hidden="true"></i>
      </div>
      <div class="ten-remainder-box ${tensRemain === 0 ? "is-empty" : ""}">
        <div class="ten-remainder-rods">${remainderMarkup}</div>
        <strong>${tensRemain}십 남음</strong>
      </div>
    </div>
  `;
}

function renderOneBundleExchange(onesRemain) {
  const remainderMarkup = onesRemain > 0
    ? renderPlaceTokens(onesRemain, "남은 일", "unit-token is-remain-one", 9)
    : `<span class="empty-remainder empty-remainder--ones">0일</span>`;

  return `
    <div class="one-exchange-board">
      <div class="one-bundle-box">
        <div class="one-bundle-dots">${renderPlaceTokens(10, "묶는 일", "unit-token", 10)}</div>
        <strong>10일 = 1십</strong>
        <small>먼저 10개 묶음</small>
        <i class="one-bundle-ring" aria-hidden="true"></i>
      </div>
      <div class="one-remainder-box ${onesRemain === 0 ? "is-empty" : ""}">
        <div class="one-remainder-dots">${remainderMarkup}</div>
        <strong>${onesRemain}일 남음</strong>
      </div>
    </div>
  `;
}

function renderThreePlaceAddFeedback(model) {
  const left = getThreeDigits(model.left);
  const right = getThreeDigits(model.right);
  const onesSum = left.o + right.o;
  const carryToTens = Math.floor(onesSum / 10);
  const onesRemain = onesSum % 10;
  const tensSum = left.t + right.t + carryToTens;
  const carryToHundreds = Math.floor(tensSum / 10);
  const tensRemain = tensSum % 10;
  const hundredsSum = left.h + right.h + carryToHundreds;

  return `
    <div class="concept-card concept-card--regroup concept-card--hundred-carry teach-card">
      <div class="teach-head">
        <span>세 자리 덧셈</span>
        <strong>${model.left} + ${model.right}</strong>
      </div>
      <div class="hundred-carry-board">
        <section class="hundred-carry-step hundred-carry-step--ones">
          <div class="hundred-carry-step-head">
            <span>1</span>
            <strong>일의 자리</strong>
            <b>${left.o}+${right.o}=${onesSum}</b>
          </div>
          ${carryToTens
            ? renderOneBundleExchange(onesRemain)
            : `
              <div class="hundred-simple-place">
                <div class="hundred-simple-tokens">${renderPlaceTokens(onesRemain, "일", "unit-token", 15)}</div>
                <strong>남은 일 ${onesRemain}개</strong>
              </div>
            `}
        </section>
        <div class="hundred-carry-arrow" aria-hidden="true">
          <span>${carryToTens ? "10일 → 1십" : "그다음 십의 자리"}</span>
        </div>
        <section class="hundred-carry-step hundred-carry-step--tens">
          <div class="hundred-carry-step-head">
            <span>2</span>
            <strong>십의 자리</strong>
            <b>${left.t}+${right.t}${carryToTens ? "+1" : ""}=${tensSum}</b>
          </div>
          ${carryToHundreds
            ? renderTenBundleExchange(tensRemain)
            : `
              <div class="hundred-simple-place">
                <div class="hundred-simple-tokens hundred-simple-tens">${renderPlaceTokens(tensRemain, "십", "ten-token", 12)}</div>
                <strong>남은 십 ${tensRemain}개</strong>
              </div>
            `}
        </section>
        <div class="hundred-carry-arrow hundred-carry-arrow--hundreds" aria-hidden="true">
          <span>${carryToHundreds ? "10십 → 1백" : "마지막 백의 자리"}</span>
        </div>
      </div>
      <div class="after-board">
        <span>자리값 확인</span>
        <strong>${hundredsSum}백 ${tensRemain}십 ${onesRemain}일 = ${model.result}</strong>
      </div>
      ${renderStudentPrompt(carryToHundreds ? `먼저 일의 자리 ${left.o}+${right.o}=${onesSum}에서 10일을 1십으로 올려요. 다음 십의 자리 ${left.t}+${right.t}+1=${tensSum}에서 10십은 1백이 되고, 마지막에 백의 자리를 확인해요.` : "계산 순서는 항상 일의 자리, 십의 자리, 백의 자리입니다. 오른쪽에서 왼쪽으로 차례대로 자리값을 바꿔요.")}
    </div>
  `;
}

function renderThreePlaceSubFeedback(model) {
  const left = getThreeDigits(model.left);
  const right = getThreeDigits(model.right);
  const onesBorrow = left.o < right.o;

  if (onesBorrow) {
    return renderBorrowSplitFeedback(model);
  }

  const onesTop = left.o + (onesBorrow ? 10 : 0);
  const tensAfterOnes = left.t - (onesBorrow ? 1 : 0);
  const tensBorrow = tensAfterOnes < right.t;
  const tensTop = tensAfterOnes + (tensBorrow ? 10 : 0);
  const hundredsAfterBorrow = left.h - (tensBorrow ? 1 : 0);
  const result = getThreeDigits(model.result);

  return `
    <div class="concept-card concept-card--borrow teach-card">
      <div class="teach-head">
        <span>세 자리 뺄셈</span>
        <strong>${model.left} - ${model.right}</strong>
      </div>
      <div class="three-place-feedback is-sub">
        <div class="three-place-column ${tensBorrow ? "is-lending" : ""}">
          <span>백</span>
          <div class="place-token-row">${renderPlaceTokens(left.h, "백", "hundred-token")}</div>
          <strong>${left.h}백${tensBorrow ? " → 10십으로 바꿈" : ""}</strong>
          <small>${hundredsAfterBorrow > 0 ? `${hundredsAfterBorrow}백 남김` : "백은 남기지 않음"}</small>
        </div>
        <div class="three-place-column ${tensBorrow || onesBorrow ? "is-changing" : ""}">
          <span>십</span>
          <div class="place-token-row">${renderPlaceTokens(tensTop, "십", "ten-token")}</div>
          <strong>${tensTop}십에서 ${right.t}십 빼기</strong>
          <small>${onesBorrow ? "1십을 일 10개로 바꾼 뒤 " : ""}${result.t}십 남김</small>
        </div>
        <div class="three-place-column ${onesBorrow ? "is-changing" : ""}">
          <span>일</span>
          <div class="place-token-row">${renderPlaceTokens(onesTop, "일", "unit-token")}</div>
          <strong>${onesTop}일에서 ${right.o}일 빼기</strong>
          <small>${result.o}일 남김</small>
        </div>
      </div>
      <div class="after-board">
        <span>남은 수</span>
        <strong>${formatThreeDigitParts(result, model.result)}</strong>
      </div>
      ${renderStudentPrompt(tensBorrow ? `십의 자리 ${left.t}십으로는 ${right.t}십을 뺄 수 없어서, 백 1개를 십 10개로 바꿔요.` : "뺄셈도 같은 자리끼리 뺍니다. 부족한 자리만 바로 왼쪽 자리에서 바꿔 와요.")}
    </div>
  `;
}

function renderBorrowSplitFeedback(model) {
  const parts = buildBorrowSplitParts(model.left, model.right, model.result);
  const splitTensCount = Math.max(0, Math.floor(parts.splitMain / 10));
  const rightTensCount = Math.max(0, Math.floor(parts.rightMain / 10));
  const resultTensCount = Math.max(0, Math.floor(parts.resultMain / 10));

  return `
    <div class="concept-card concept-card--borrow concept-card--borrow-split teach-card">
      <div class="teach-head">
        <span>받아내림 장면</span>
        <strong>${model.left} - ${model.right}</strong>
      </div>
      <div class="borrow-split-board">
        <section class="borrow-split-card borrow-split-card--start">
          <span>처음 수</span>
          <strong>${parts.left} → ${parts.splitMain}과 ${parts.splitOnes}</strong>
          <div class="borrow-split-parts">
            <div class="borrow-split-part">
              <b>${parts.splitMain}</b>
              <div class="teach-rods">${renderPlaceTokens(splitTensCount, "십", "ten-token", 12)}</div>
            </div>
            <div class="borrow-split-part">
              <b>${parts.splitOnes}</b>
              <div class="teach-ones">${renderPlaceTokens(parts.splitOnes, "일", "unit-token", 15)}</div>
            </div>
          </div>
        </section>
        <section class="borrow-split-card borrow-split-card--subtract">
          <span>빼는 수</span>
          <strong>${parts.right} → ${parts.rightMain}과 ${parts.rightOnes}</strong>
          <div class="borrow-split-parts">
            <div class="borrow-split-part is-subtract">
              <b>-${parts.rightMain}</b>
              <div class="teach-rods">${renderPlaceTokens(rightTensCount, "십", "ten-token is-faded", 12)}</div>
            </div>
            <div class="borrow-split-part is-subtract">
              <b>-${parts.rightOnes}</b>
              <div class="teach-ones">${renderPlaceTokens(parts.rightOnes, "일", "unit-token is-marked", 15)}</div>
            </div>
          </div>
        </section>
      </div>
      <div class="borrow-split-result">
        <span>${parts.splitMain}-${parts.rightMain}=${parts.resultMain}</span>
        <span>${parts.splitOnes}-${parts.rightOnes}=${parts.resultOnes}</span>
      </div>
      <div class="after-board">
        <span>남은 수</span>
        <strong>${formatBorrowSplitProof(parts)}</strong>
      </div>
      ${renderStudentPrompt(formatBorrowSplitKeyLine(parts))}
    </div>
  `;
}

function renderTableConceptFeedback(question, selectedText, correctText) {
  if (question.scene?.type === "graph" && /survey|table-to-graph/.test(question.scene.kind || "")) {
    return renderGraphCreateFeedback(question, selectedText, correctText);
  }

  const items = parseLabeledCounts(question);
  if (!items.length) {
    if (/분류할 수 없는|기준|먹을 수 있는|운동 도구/.test(question.prompt || "")) {
      return renderClassificationOutlierFeedback(question, selectedText, correctText);
    }
    return renderQuestionLearningVisual(question, { revealAnswer: true });
  }

  const prompt = question.prompt || "";
  const orderedMentioned = getMentionedTableItems(items, prompt);
  if (/두 묶음|묶음의.*차이|두 묶음의/.test(prompt) && orderedMentioned.length >= 4) {
    return renderTablePairGroupFeedback(orderedMentioned.slice(0, 2), orderedMentioned.slice(2, 4), selectedText, correctText);
  }

  if (/빼면|제외|나머지/.test(prompt) && orderedMentioned.length) {
    return renderTableRemainderFeedback(items, orderedMentioned, selectedText, correctText);
  }

  if (/차이|몇.*더/.test(prompt) && orderedMentioned.length >= 3) {
    return renderTablePairVsOneFeedback(orderedMentioned.slice(0, 2), orderedMentioned[2], selectedText, correctText);
  }

  if (/합하면|모두/.test(prompt) && orderedMentioned.length >= 2 && !/조사된 학생|표에 조사/.test(prompt)) {
    return renderTableSelectedTotalFeedback(orderedMentioned, selectedText, correctText);
  }

  const target = items.find((item) => prompt.includes(item.label));
  const max = Math.max(...items.map((item) => item.value));
  const min = Math.min(...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const isTotal = /모두|합하면/.test(prompt);
  const isDiff = /차이|몇.*더/.test(prompt);
  const isMost = !isDiff && /가장 많은|가장 큰/.test(prompt);
  const title = isTotal
    ? "각 행을 체크하며 빠짐없이 모두 더해요"
    : isDiff
      ? "가장 긴 막대와 가장 짧은 막대의 남는 부분을 봐요"
      : isMost
        ? "숫자가 가장 큰 행 하나를 찾아요"
        : "이름에서 숫자까지 같은 줄로 따라가요";
  const equation = isTotal
    ? `${items.map((item) => item.value).join(" + ")} = ${total}`
    : isDiff
      ? `${max} - ${min} = ${max - min}`
      : isMost
        ? `${sorted[0].label} ${sorted[0].value}${sorted[0].unit}`
        : `${target ? target.label : "찾은 행"} → ${escapeHtml(correctText)}`;

  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head">
        <span>표/그래프 읽기</span>
        <strong>${title}</strong>
      </div>
      <div class="table-highlight-board teach-table-board ${isTotal ? "is-total" : ""} ${isDiff ? "is-diff" : ""} ${isMost ? "is-most" : ""}">
        <div class="table-scan-line" aria-hidden="true"></div>
        ${items.map((item) => {
          const isTarget = target ? item.label === target.label : isDiff ? item.value === max || item.value === min : isMost ? item.value === max : isTotal;
          const isLargest = isMost && item.value === max;
          const barPercent = Math.max(10, Math.round(item.value / max * 100));
          const gapPercent = isDiff && item.value === max ? Math.round((max - min) / max * 100) : 0;
          return `
            <div class="table-highlight-row ${isTarget ? "is-target" : ""} ${isLargest ? "is-largest" : ""}">
              <span>${escapeHtml(item.label)}</span>
              <div>
                <i style="width:${barPercent}%">${isLargest ? `<span class="bar-end-marker" aria-hidden="true"></span>` : ""}</i>
                ${gapPercent ? `<b style="width:${gapPercent}%"></b>` : ""}
              </div>
              <strong>${item.value}${escapeHtml(item.unit)}</strong>
            </div>
          `;
        }).join("")}
      </div>
      <div class="concept-equation">${equation}</div>
      ${renderStudentPrompt(isTotal ? "더한 행에 표시가 생기는지 보며 빠뜨린 항목이 없는지 확인해요." : isDiff ? "차이는 두 막대를 같은 시작점에 맞췄을 때 남는 꼬리예요." : "행을 세로로 내려 읽지 말고, 같은 줄을 가로로 따라가요.")}
    </div>
  `;
}

function renderGraphCreateFeedback(question, selectedText, correctText) {
  const scene = question.scene || {};
  const visual = renderStructuredGraphVisual(scene, { revealAnswer: true });
  const title = scene.kind === "survey-to-table" ? "조사 자료를 표로 만들기" : "표를 그래프로 옮기기";
  const principle = scene.kind === "survey-to-table"
    ? "같은 답끼리 표시하고 센 수를 표에 적어요"
    : "표의 숫자만큼 같은 줄에 그림을 붙여요";
  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head"><span>${title}</span><strong>${principle}</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(principle)}
    </div>
  `;
}

function parseClassificationItems(prompt) {
  const beforeJung = String(prompt || "").split("중")[0];
  const separators = beforeJung.includes(",") ? /,/ : /\s+(?:와|과)\s+/;
  return beforeJung
    .split(separators)
    .map((item) => item.replace(/['"‘’“”]/g, "").trim())
    .filter((item) => item && !/다음|보기/.test(item))
    .slice(0, 6);
}

function parseClassificationCriterion(prompt) {
  const quoted = String(prompt || "").match(/['"‘’“”]([^'"‘’“”]+)['"‘’“”]/);
  if (quoted) {
    return quoted[1];
  }
  if (/운동 도구/.test(prompt)) return "운동 도구";
  if (/먹을 수 있는/.test(prompt)) return "먹을 수 있는 것";
  return "분류 기준";
}

function renderClassificationOutlierFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const criterion = parseClassificationCriterion(prompt);
  const items = parseClassificationItems(prompt);
  const answer = correctText || "기준 밖";
  return `
    <div class="concept-card concept-card--table concept-card--classify teach-card">
      <div class="teach-head"><span>분류 기준</span><strong>기준에 맞는 것들을 먼저 묶고, 남는 하나를 찾아요</strong></div>
      <div class="classify-outlier-board">
        <div class="classify-criterion"><span>기준</span><strong>${escapeHtml(criterion)}</strong></div>
        <div class="classify-items">
          ${items.map((item) => `
            <span class="${item === answer ? "is-outlier" : "is-inside"}">
              ${escapeHtml(item)}
              <b>${item === answer ? "기준 밖" : "기준 안"}</b>
            </span>
          `).join("")}
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("분류 문제는 보기부터 고르면 헷갈려요. 먼저 기준을 말하고, 기준 안에 들어가는 것에 체크하면 남는 것이 답입니다.")}
    </div>
  `;
}

function getMentionedTableItems(items, prompt) {
  return items
    .map((item) => ({ ...item, mentionIndex: String(prompt).indexOf(item.label) }))
    .filter((item) => item.mentionIndex >= 0)
    .sort((left, right) => left.mentionIndex - right.mentionIndex);
}

function renderTableMiniRows(items, options = {}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const targets = new Set((options.targets || []).map((item) => item.label));
  const excluded = new Set((options.excluded || []).map((item) => item.label));
  return `
    <div class="table-highlight-board teach-table-board ${options.modifier || ""}">
      <div class="table-scan-line" aria-hidden="true"></div>
      ${items.map((item) => `
        <div class="table-highlight-row ${targets.has(item.label) ? "is-target" : ""} ${excluded.has(item.label) ? "is-excluded" : ""}">
          <span>${escapeHtml(item.label)}</span>
          <div><i style="width:${Math.max(10, Math.round(item.value / max * 100))}%"></i></div>
          <strong>${item.value}${escapeHtml(item.unit)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTableSelectedTotalFeedback(items, selectedText, correctText) {
  const unit = items[0]?.unit || "";
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head"><span>표 합치기</span><strong>문제에 나온 항목만 골라 더해요</strong></div>
      ${renderTableMiniRows(items, { targets: items, modifier: "is-selected-total" })}
      <div class="group-equation-board">
        ${items.map((item) => `<span>${escapeHtml(item.label)} ${item.value}</span>`).join("<i>+</i>")}
        <strong>${total}${escapeHtml(unit)}</strong>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("표 전체가 아니라 문제에서 이름을 부른 줄만 체크하고 더해요. 체크 개수와 더한 숫자 개수가 같아야 해요.")}
    </div>
  `;
}

function renderTablePairVsOneFeedback(pairItems, compareItem, selectedText, correctText) {
  const unit = compareItem?.unit || pairItems[0]?.unit || "";
  const pairTotal = pairItems.reduce((sum, item) => sum + item.value, 0);
  const diff = Math.abs(pairTotal - compareItem.value);
  const max = Math.max(pairTotal, compareItem.value, 1);
  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head"><span>두 줄 vs 한 줄</span><strong>두 항목을 먼저 합친 뒤 한 항목과 비교해요</strong></div>
      <div class="group-compare-board">
        <div>
          <span>${pairItems.map((item) => escapeHtml(item.label)).join(" + ")}</span>
          <i style="width:${Math.round(pairTotal / max * 100)}%"></i>
          <strong>${pairItems.map((item) => item.value).join("+")}=${pairTotal}${escapeHtml(unit)}</strong>
        </div>
        <div>
          <span>${escapeHtml(compareItem.label)}</span>
          <i style="width:${Math.round(compareItem.value / max * 100)}%"></i>
          <strong>${compareItem.value}${escapeHtml(unit)}</strong>
        </div>
        <b>차이 ${diff}${escapeHtml(unit)}</b>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("두 항목이 한쪽 편이면 먼저 한 막대로 합쳐요. 그다음 비교 막대와 남는 꼬리만 봅니다.")}
    </div>
  `;
}

function renderTablePairGroupFeedback(firstGroup, secondGroup, selectedText, correctText) {
  const unit = firstGroup[0]?.unit || secondGroup[0]?.unit || "";
  const firstTotal = firstGroup.reduce((sum, item) => sum + item.value, 0);
  const secondTotal = secondGroup.reduce((sum, item) => sum + item.value, 0);
  const diff = Math.abs(firstTotal - secondTotal);
  const max = Math.max(firstTotal, secondTotal, 1);
  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head"><span>묶음 비교</span><strong>각 묶음의 합을 만든 뒤 합끼리 빼요</strong></div>
      <div class="group-compare-board group-compare-board--pairs">
        <div>
          <span>${firstGroup.map((item) => escapeHtml(item.label)).join(" + ")}</span>
          <i style="width:${Math.round(firstTotal / max * 100)}%"></i>
          <strong>${firstGroup.map((item) => item.value).join("+")}=${firstTotal}${escapeHtml(unit)}</strong>
        </div>
        <div>
          <span>${secondGroup.map((item) => escapeHtml(item.label)).join(" + ")}</span>
          <i style="width:${Math.round(secondTotal / max * 100)}%"></i>
          <strong>${secondGroup.map((item) => item.value).join("+")}=${secondTotal}${escapeHtml(unit)}</strong>
        </div>
        <b>${Math.max(firstTotal, secondTotal)}-${Math.min(firstTotal, secondTotal)}=${diff}${escapeHtml(unit)}</b>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("두 묶음 비교는 네 숫자를 한 번에 섞지 않아요. 왼쪽 묶음 합, 오른쪽 묶음 합을 먼저 따로 만듭니다.")}
    </div>
  `;
}

function renderTableRemainderFeedback(items, excludedItems, selectedText, correctText) {
  const unit = items[0]?.unit || "";
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const excludedTotal = excludedItems.reduce((sum, item) => sum + item.value, 0);
  const remain = total - excludedTotal;
  const remainItems = items.filter((item) => !excludedItems.some((excluded) => excluded.label === item.label));
  return `
    <div class="concept-card concept-card--table teach-card">
      <div class="teach-head"><span>빼고 남기기</span><strong>제외할 줄에 X표를 하고 남은 줄만 봐요</strong></div>
      ${renderTableMiniRows(items, { targets: remainItems, excluded: excludedItems, modifier: "is-remainder" })}
      <div class="group-equation-board">
        <span>전체 ${total}${escapeHtml(unit)}</span>
        <i>-</i>
        <span>뺄 것 ${excludedTotal}${escapeHtml(unit)}</span>
        <strong>${remain}${escapeHtml(unit)}</strong>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("나머지는 전체에서 제외할 항목을 빼도 되고, X표 하지 않은 줄만 더해도 같은 답이 나와요.")}
    </div>
  `;
}

function renderLengthConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const scene = question.scene?.type === "length" ? question.scene : null;
  const text = `${question.prompt || ""} ${(question.scene?.lines || []).join(" ")}`;
  const values = [...text.matchAll(/(\d+)\s*(m|cm)/g)]
    .map((match) => ({ value: Number(match[1]), unit: match[2], cm: match[2] === "m" ? Number(match[1]) * 100 : Number(match[1]) }))
    .slice(0, 4);

  if (scene?.kind === "estimate" || /어림|가장 알맞은|가장 가깝/.test(prompt)) {
    return renderLengthEstimateFeedback(question, selectedText, correctText);
  }

  if (/한쪽 끝|다른 쪽 끝|시작 눈금|끝 눈금/.test(prompt) && values.length >= 2) {
    return renderRulerOffsetFeedback(values[0].cm, values[1].cm, selectedText, correctText);
  }

  if (/0\s*눈금|0 눈금|자를 사용할/.test(prompt)) {
    return renderZeroRulerFeedback(selectedText, correctText);
  }

  if (/알맞은 단위|단위는/.test(prompt)) {
    return renderUnitChoiceFeedback(prompt, selectedText, correctText);
  }

  if (/m와 cm로|나타내면/.test(prompt) && values.length) {
    return renderCmToMeterFeedback(values[0].cm, correctText);
  }

  if (/몇 m 몇 cm/.test(prompt) && /더하면/.test(prompt) && values.length >= 2) {
    const hasMeterAndCmBase = values[0]?.unit === "m" && values[1]?.unit === "cm" && values[2];
    const baseCm = hasMeterAndCmBase ? values[0].cm + values[1].cm : values[0].cm;
    const extraCm = hasMeterAndCmBase ? values[2].cm : values[1].cm;
    return renderCmOverflowFeedback({ cm: baseCm }, extraCm, selectedText, correctText);
  }

  if (/모두 몇 cm/.test(prompt) && values.some((item) => item.unit === "m")) {
    return renderMeterToCmFeedback(values, correctText);
  }

  if (/전체가|나머지 부분|한 부분/.test(prompt) && values.length >= 2) {
    return renderLengthPartWholeFeedback(values[0], values[1], selectedText, correctText);
  }

  if (/이어 붙인 뒤|잘랐/.test(prompt) && values.length >= 3) {
    return renderLengthTwoStepFeedback(values[0], values[1], values[2], selectedText, correctText);
  }

  if (/이어 붙인 길이.*보다|이어 붙인.*보다/.test(prompt) && values.length >= 3) {
    return renderLengthJoinThenCompareFeedback(values[0], values[1], values[2], selectedText, correctText);
  }

  if (/되려면|더 길어져야/.test(prompt) && values.length >= 2) {
    return renderLengthGoalGapFeedback(values[0], values[1], selectedText, correctText);
  }

  if (/이어 붙이면|합하면|더하면/.test(prompt) && values.length >= 2) {
    return renderTapeJoinFeedback(values[0], values[1], correctText);
  }

  if (/보다 몇 cm 더/.test(prompt) && values.length >= 2) {
    return renderTapeCompareFeedback(values[0], values[1], correctText);
  }

  if (/10cm를 더하면/.test(prompt) && values.length) {
    return renderLengthJumpFeedback(values[0].cm, 10, correctText);
  }

  const visual = renderQuestionLearningVisual(question, { revealAnswer: true });
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>길이 보기</span><strong>길이는 0에서 시작해 같은 단위끼리 맞춰요</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("길이를 더하거나 비교하기 전에 두 길이의 단위가 같은지 먼저 확인해요.")}
    </div>
  `;
}

function renderLengthEstimateFeedback(question, selectedText, correctText) {
  const scene = question.scene?.type === "length" ? question.scene : {};
  const estimates = Array.isArray(scene.estimates) && scene.estimates.length
    ? scene.estimates
    : [extractFirstNumber(correctText)].filter(Number.isFinite);
  const realCm = Number(scene.realCm || scene.estimateCm || extractFirstNumber(correctText) || 1);
  const max = Math.max(realCm, ...estimates, 1);
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>길이 어림</span><strong>몸 기준으로 너무 작은 값과 큰 값을 먼저 지워요</strong></div>
      <div class="length-estimate-feedback">
        ${scene.objectName ? `<strong>${escapeHtml(scene.objectName)}</strong>` : ""}
        ${scene.clue ? `<p>${escapeHtml(scene.clue)}</p>` : ""}
        <div class="estimate-scale">
          ${estimates.slice(0, 4).map((value) => `
            <span class="${String(correctText).includes(String(value)) ? "is-nearest" : ""}" style="--w:${Math.round(value / max * 100)}%">
              <i></i><b>${value}cm</b>
            </span>
          `).join("")}
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("어림은 찍는 것이 아니라 비교 기준을 쓰는 거예요. 한 뼘, 손가락, 걸음 같은 기준으로 보기 중 가장 가까운 길이를 고릅니다.")}
    </div>
  `;
}

function renderLengthPartWholeFeedback(totalItem, knownItem, selectedText, correctText) {
  const total = Math.max(totalItem.cm, knownItem.cm);
  const known = Math.min(totalItem.cm, knownItem.cm);
  const missing = Math.max(0, total - known);
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>전체-부분</span><strong>전체 막대에서 아는 부분을 가리면 나머지가 보여요</strong></div>
      <div class="length-part-whole-board">
        <div class="whole-bar-label"><span>전체</span><strong>${total}cm</strong></div>
        <div class="unknown-addend-board">
          <span class="part-segment part-segment--known" style="--piece:${Math.round(known / total * 100)}%">
            <em>아는 부분</em><strong>${known}cm</strong>
          </span>
          <span class="part-segment part-segment--missing" style="--piece:${Math.round(missing / total * 100)}%">
            <em>나머지</em><strong>${missing}cm</strong>
          </span>
        </div>
      </div>
      <div class="concept-equation">${total} - ${known} = ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("전체-부분 문제는 더 붙이는 장면이 아니에요. 전체에서 이미 아는 부분을 빼면 빈 부분이 남습니다.")}
    </div>
  `;
}

function renderLengthTwoStepFeedback(first, second, cut, selectedText, correctText) {
  const total = first.cm + second.cm;
  const remain = total - cut.cm;
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>두 단계 길이</span><strong>먼저 붙이고, 그다음 잘라요</strong></div>
      <div class="length-two-step-board">
        <div class="tape-join-board">
          <span class="tape-piece tape-a" style="--w:${Math.round(first.cm / total * 100)}%">${first.cm}cm</span>
          <span class="tape-piece tape-b" style="--w:${Math.round(second.cm / total * 100)}%">${second.cm}cm</span>
        </div>
        <div class="cut-strip"><span>${cut.cm}cm 자름</span><i></i><strong>남은 ${remain}cm</strong></div>
      </div>
      <div class="concept-equation">${first.cm}+${second.cm}=${total}, ${total}-${cut.cm}=${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("문장 속 행동 순서가 풀이 순서예요. 붙이기 1번, 자르기 2번으로 나누면 실수가 줄어요.")}
    </div>
  `;
}

function renderLengthJoinThenCompareFeedback(first, second, base, selectedText, correctText) {
  const joined = first.cm + second.cm;
  const diff = Math.abs(joined - base.cm);
  const max = Math.max(joined, base.cm, 1);
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>붙인 뒤 비교</span><strong>비교할 첫 길이를 먼저 만들어야 해요</strong></div>
      <div class="tape-compare-board tape-compare-board--joined">
        <div><span>이어 붙인 길이</span><i style="width:${Math.round(joined / max * 100)}%"></i><strong>${first.cm}+${second.cm}=${joined}cm</strong></div>
        <div><span>비교 길이</span><i style="width:${Math.round(base.cm / max * 100)}%"></i><b style="width:${Math.round(diff / max * 100)}%">${diff}cm</b></div>
      </div>
      <div class="concept-equation">${joined} - ${base.cm} = ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("비교 문제처럼 보여도 앞에 ‘이어 붙인 길이’가 있으면 먼저 더해서 새 막대를 만든 뒤 비교해요.")}
    </div>
  `;
}

function renderLengthGoalGapFeedback(startItem, targetItem, selectedText, correctText) {
  const start = Math.min(startItem.cm, targetItem.cm);
  const target = Math.max(startItem.cm, targetItem.cm);
  const gap = target - start;
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>목표까지</span><strong>처음 길이에서 목표 길이까지 빈 구간을 봐요</strong></div>
      <div class="length-goal-board" style="--start:${Math.round(start / target * 100)}%">
        <span>처음 ${start}cm</span>
        <i></i>
        <strong>목표 ${target}cm</strong>
        <b>더 필요한 ${gap}cm</b>
      </div>
      <div class="concept-equation">${target} - ${start} = ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("목표가 주어진 문제는 목표에서 처음을 빼요. 더 필요한 길이만 빈 구간으로 남습니다.")}
    </div>
  `;
}

function renderRulerOffsetFeedback(startCm, endCm, selectedText, correctText) {
  const start = Math.min(startCm, endCm);
  const end = Math.max(startCm, endCm);
  const length = end - start;
  const maxTick = Math.max(end + 1, 8);
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>0 아닌 눈금</span><strong>끝 눈금을 그대로 읽지 말고 시작 눈금을 빼요</strong></div>
      <div class="ruler-offset-board" style="--start:${Math.round(start / maxTick * 100)}%;--end:${Math.round(end / maxTick * 100)}%">
        <div class="ruler-track">${Array.from({ length: Math.min(maxTick + 1, 18) }, (_, index) => `<span>${index}</span>`).join("")}</div>
        <div class="ruler-offset-object"><i></i><strong>${length}cm</strong></div>
      </div>
      <div class="concept-equation">${end} - ${start} = ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("시작이 0이 아니면 끝 눈금 숫자는 길이가 아니에요. 시작에서 끝까지 지나간 칸 수가 길이입니다.")}
    </div>
  `;
}

function renderCmOverflowFeedback(baseItem, extraCm, selectedText, correctText) {
  const base = baseItem.cm;
  const total = base + extraCm;
  const meters = Math.floor(total / 100);
  const rest = total % 100;
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>100cm 넘김</span><strong>cm가 100이 되면 1m로 이름을 바꿔요</strong></div>
      <div class="cm-overflow-board">
        <div><span>처음</span><strong>${base}cm</strong></div>
        <i>+${extraCm}cm</i>
        <div><span>합</span><strong>${total}cm</strong></div>
        <b>${meters}m ${rest}cm</b>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("100cm 묶음은 m 자리로 올라가고, 묶고 남은 cm만 cm 자리에 남아요.")}
    </div>
  `;
}

function renderZeroRulerFeedback(selectedText, correctText) {
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>자 사용법</span><strong>물건 끝과 0 눈금을 먼저 맞춰요</strong></div>
      <div class="ruler-demo">
        <div class="ruler-track">${Array.from({ length: 9 }, (_, index) => `<span>${index}</span>`).join("")}</div>
        <div class="ruler-object is-wrong">1부터 재면 시작이 밀려요</div>
        <div class="ruler-object is-correct">0부터 재면 실제 길이</div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("길이는 '눈금 숫자 세기'가 아니라 시작점부터 끝점까지의 거리예요.")}
    </div>
  `;
}

function renderUnitChoiceFeedback(prompt, selectedText, correctText) {
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>단위 고르기</span><strong>물건 크기에 어울리는 단위를 골라요</strong></div>
      <div class="unit-choice-scene">
        <div class="door-shape"><span>교실 문</span></div>
        <div class="unit-chip-row">
          <span class="${correctText === "cm" ? "is-correct" : ""}">cm<br><small>작은 물건</small></span>
          <span class="${correctText === "m" ? "is-correct" : ""}">m<br><small>큰 길이</small></span>
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("연필처럼 작은 길이는 cm, 문처럼 큰 길이는 m가 자연스러워요.")}
    </div>
  `;
}

function renderTapeJoinFeedback(first, second, correctText) {
  const total = first.cm + second.cm;
  const max = Math.max(total, 1);
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>이어 붙이기</span><strong>두 테이프를 끝과 끝으로 붙이면 전체 길이</strong></div>
      <div class="tape-join-board">
        <span class="tape-piece tape-a" style="--w:${Math.round(first.cm / max * 100)}%">${first.value}${first.unit}</span>
        <span class="tape-piece tape-b" style="--w:${Math.round(second.cm / max * 100)}%">${second.value}${second.unit}</span>
      </div>
      <div class="concept-equation">${first.cm} + ${second.cm} = ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("이어 붙였으니 두 길이가 한 줄로 합쳐져요. 그래서 더하기예요.")}
    </div>
  `;
}

function renderTapeCompareFeedback(first, second, correctText) {
  const longer = first.cm >= second.cm ? first : second;
  const shorter = first.cm >= second.cm ? second : first;
  const max = Math.max(longer.cm, 1);
  const gap = longer.cm - shorter.cm;
  return `
    <div class="concept-card concept-card--length concept-card--length-compare teach-card">
      <div class="teach-head"><span>길이 비교</span><strong>같은 시작점에 맞추고 남는 꼬리를 봐요</strong></div>
      <div class="tape-compare-board tape-compare-board--diff">
        <div><span>${longer.value}${longer.unit}</span><i style="width:${Math.round(longer.cm / max * 100)}%"></i></div>
        <div><span>${shorter.value}${shorter.unit}</span><i style="width:${Math.round(shorter.cm / max * 100)}%"></i><b style="width:${Math.round(gap / max * 100)}%">${gap}cm</b></div>
      </div>
      <div class="concept-equation">${longer.cm} - ${shorter.cm} = ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("몇 cm 더 긴지는 큰 길이 전체가 아니라, 짧은 길이보다 남는 부분만 세요.")}
    </div>
  `;
}

function renderLengthJumpFeedback(startCm, jump, correctText) {
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>10cm 이동</span><strong>수직선에서 10만큼 오른쪽으로 움직여요</strong></div>
      <div class="length-jump-board">
        <span>${startCm}</span>
        <i></i>
        <strong>+${jump}cm</strong>
        <span>${startCm + jump}</span>
      </div>
      <div class="concept-equation">${startCm} + ${jump} = ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("10cm를 더하면 일의 자리가 아니라 십의 자리가 한 칸 커져요.")}
    </div>
  `;
}

function renderMeterToCmFeedback(values, correctText) {
  const meterItem = values.find((item) => item.unit === "m");
  const cmItem = values.find((item) => item.unit === "cm");
  const meterCount = meterItem ? meterItem.value : 0;
  const restCm = cmItem ? cmItem.cm : 0;
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>단위 바꾸기</span><strong>1m는 100cm 묶음이에요</strong></div>
      <div class="meter-bundle-board">
        ${Array.from({ length: Math.min(meterCount, 5) }, () => `<span>100cm</span>`).join("")}
        ${restCm ? `<i>${restCm}cm</i>` : ""}
      </div>
      <div class="concept-equation">${meterCount}m = ${meterCount * 100}cm, 그래서 ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("m와 cm가 섞이면 먼저 모두 cm로 바꾼 뒤 더해요.")}
    </div>
  `;
}

function renderCmToMeterFeedback(totalCm, correctText) {
  const meters = Math.floor(totalCm / 100);
  const rest = totalCm % 100;
  return `
    <div class="concept-card concept-card--length teach-card">
      <div class="teach-head"><span>100cm 묶기</span><strong>100cm씩 묶으면 m가 돼요</strong></div>
      <div class="meter-bundle-board is-reverse">
        ${Array.from({ length: Math.min(meters, 5) }, () => `<span>1m</span>`).join("")}
        ${rest ? `<i>${rest}cm 남음</i>` : ""}
      </div>
      <div class="concept-equation">${totalCm}cm = ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("100cm 묶음의 개수가 m, 묶고 남은 길이가 cm예요.")}
    </div>
  `;
}

function renderTimeConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const scene = question.scene?.type === "time" ? question.scene : null;
  if (String(scene?.kind || "").startsWith("calendar-") || /달력|요일|날짜|며칠|몇 월/.test(prompt)) {
    return renderCalendarConceptFeedback(question, selectedText, correctText);
  }

  if (scene?.kind === "day-cycle" || /하루|오전|오후|24시간/.test(prompt)) {
    return renderDayCycleFeedback(question, selectedText, correctText);
  }

  const times = [...prompt.matchAll(/(\d{1,2})시\s*(\d{1,2})?분?/g)]
    .map((match) => ({ hour: Number(match[1]), minute: Number(match[2] || 0) }));
  const minuteChangeMatches = [...prompt.matchAll(/(\d+)분\s*(뒤|후|동안|까지|걸린)?/g)];
  const minuteChangeMatch = minuteChangeMatches.find((match) => Boolean(match[2])) || minuteChangeMatches.at(-1);
  const minuteChange = Number(minuteChangeMatch?.[1]);

  if (/반/.test(prompt) || /30분을 다른 말/.test(prompt)) {
    const hour = times[0]?.hour || extractFirstNumber(prompt) || 1;
    return renderHalfHourFeedback(hour, selectedText, correctText);
  }

  if (/긴바늘/.test(prompt) && /짧은바늘/.test(prompt)) {
    return renderClockHandRoleFeedback(prompt, selectedText, correctText);
  }

  if (times.length >= 2 || Number.isFinite(minuteChange)) {
    const start = times[0] || { hour: 7, minute: 0 };
    const end = times[1] || parseKoreanTimeText(correctText) || addMinutesToTime(start, minuteChange || 0);
    const isElapsedPrompt = times.length >= 2 && /걸린 시간|부터|까지/.test(prompt);
    const elapsed = isElapsedPrompt
      ? minutesBetweenTimes(start, end)
      : (Number.isFinite(minuteChange) ? minuteChange : minutesBetweenTimes(start, end));
    if (start.minute + elapsed >= 60 || (times.length >= 2 && end.hour !== start.hour)) {
      return renderTimeSplitFeedback(start, end, elapsed, isElapsedPrompt || /보다 몇 분 뒤/.test(prompt), selectedText, correctText);
    }
    return `
      <div class="concept-card concept-card--time teach-card">
        <div class="teach-head"><span>${/걸린 시간|까지/.test(prompt) ? "걸린 시간" : "몇 분 뒤"}</span><strong>시작과 끝 사이를 시간선으로 봐요</strong></div>
        <div class="time-feedback-board">
          ${renderMiniClock(start.hour, start.minute, "시작")}
          <div class="time-bridge">
            <i></i>
            <strong>${elapsed}분 이동</strong>
          </div>
          ${renderMiniClock(end.hour, end.minute, "끝")}
        </div>
        <div class="concept-equation">${escapeHtml(correctText)}</div>
        ${renderStudentPrompt(/걸린 시간|까지/.test(prompt) ? "걸린 시간은 시계가 움직인 양이에요. 끝 시각 자체와 헷갈리지 않아요." : "분을 먼저 움직이고, 60분이 되면 시가 1 커져요.")}
      </div>
    `;
  }

  const visual = renderQuestionLearningVisual(question, { revealAnswer: true });
  return `
    <div class="concept-card concept-card--time teach-card">
      <div class="teach-head"><span>시계 읽기</span><strong>긴바늘은 분, 짧은바늘은 시를 말해요</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("긴바늘로 분을 먼저 확인하고, 짧은바늘로 시를 읽어요.")}
    </div>
  `;
}

function renderDayCycleFeedback(question, selectedText, correctText) {
  const scene = question.scene?.type === "time" ? question.scene : {};
  const event = scene.event || "";
  return `
    <div class="concept-card concept-card--time teach-card">
      <div class="teach-head"><span>하루의 시간</span><strong>오전 12시간과 오후 12시간을 합쳐요</strong></div>
      <div class="day-cycle-feedback">
        <div><span>오전</span><strong>12시간</strong></div>
        <i>+</i>
        <div><span>오후</span><strong>12시간</strong></div>
        <b>${escapeHtml(correctText)}</b>
      </div>
      ${event ? `<div class="concept-equation">${escapeHtml(event)}</div>` : `<div class="concept-equation">12+12=24시간</div>`}
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(/오전|오후/.test(question.prompt || "") ? "오전과 오후는 숫자만 보는 것이 아니라 하루 중 장면을 보고 낮 12시 앞뒤를 나누어요." : "시계가 오전에 한 바퀴, 오후에 한 바퀴 돌면 하루 24시간이 됩니다.")}
    </div>
  `;
}

function renderCalendarConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const scene = question.scene?.type === "time"
    ? question.scene
    : inferCalendarSceneFromPrompt(prompt, correctText);
  const kind = scene.calendarType || scene.kind || "";
  const isWeekday = kind === "weekday" || scene.kind === "calendar-weekday";
  const startDay = Number(scene.startDay || 1);
  const targetDay = Number(scene.targetDay || startDay + Number(scene.offset || 0));
  const offset = Number(scene.offset || Math.max(0, targetDay - startDay));
  const month = Number(scene.month || 5);
  const weekdays = Array.isArray(scene.weekdays) && scene.weekdays.length
    ? scene.weekdays
    : ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  const startWeekday = weekdays[Number(scene.startWeekdayIndex || 0)] || weekdays[0];
  const headLabel = isWeekday ? "요일 세기" : "달력 세기";
  const headText = isWeekday
    ? "오늘은 0칸, 내일부터 1칸씩 움직여요"
    : "시작 날짜는 0칸, 다음 날짜부터 1일 뒤예요";
  const equation = isWeekday
    ? `${startWeekday} 0칸 → ${offset}칸 뒤 = ${escapeHtml(correctText)}`
    : (kind === "date-difference" || scene.kind === "calendar-date-difference")
      ? `${targetDay} - ${startDay} = ${escapeHtml(correctText)}`
      : `${month}월 ${startDay}일 + ${offset}칸 = ${escapeHtml(correctText)}`;
  const promptText = isWeekday
    ? "요일 문제는 시작 요일을 1로 세면 하루가 많아져요. 손가락을 시작 칸에 놓고 다음 칸부터 1, 2, 3으로 세세요."
    : "며칠 뒤와 날짜 차이는 시작 칸을 0으로 두면 헷갈리지 않아요. 다음 날짜부터 1일 뒤가 시작됩니다.";

  return `
    <div class="concept-card concept-card--time concept-card--calendar teach-card">
      <div class="teach-head"><span>${headLabel}</span><strong>${headText}</strong></div>
      <div class="calendar-feedback-board">
        ${renderMiniCalendarVisual(scene, { revealAnswer: true })}
        <div class="calendar-count-rule">
          <span>시작</span>
          <i></i>
          <strong>0칸</strong>
          <i></i>
          <span>다음 칸부터 1</span>
        </div>
      </div>
      <div class="concept-equation">${equation}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(promptText)}
    </div>
  `;
}

function inferCalendarSceneFromPrompt(prompt, correctText) {
  const weekdays = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  const weekdayMatch = String(prompt || "").match(/(월요일|화요일|수요일|목요일|금요일|토요일|일요일)에서\s*(\d+)일 뒤/);
  if (weekdayMatch) {
    const startWeekdayIndex = Math.max(0, weekdays.indexOf(weekdayMatch[1]));
    const offset = Number(weekdayMatch[2]);
    const answerIndexFromText = weekdays.indexOf(String(correctText || "").trim());
    const answerWeekdayIndex = answerIndexFromText >= 0
      ? answerIndexFromText
      : ((startWeekdayIndex + offset) % weekdays.length);
    return {
      type: "time",
      kind: "calendar-weekday",
      calendarType: "weekday",
      weekdays,
      startWeekdayIndex,
      answerWeekdayIndex,
      offset
    };
  }

  const daysAfterMatch = String(prompt || "").match(/(\d+)월\s*(\d+)일에서\s*(\d+)일 뒤/);
  if (daysAfterMatch) {
    const month = Number(daysAfterMatch[1]);
    const startDay = Number(daysAfterMatch[2]);
    const offset = Number(daysAfterMatch[3]);
    const answerMatch = String(correctText || "").match(/(\d+)월\s*(\d+)일/);
    const targetDay = Number(answerMatch?.[2] || startDay + offset);
    return {
      type: "time",
      kind: "calendar-days-after",
      calendarType: "days-after",
      month,
      startDay,
      targetDay,
      offset,
      visibleStart: Math.max(1, startDay - 2),
      visibleEnd: Math.min(31, targetDay + 2)
    };
  }

  const diffMatch = String(prompt || "").match(/(\d+)월\s*(\d+)일과\s*(\d+)월\s*(\d+)일/);
  if (diffMatch) {
    const month = Number(diffMatch[1]);
    const startDay = Number(diffMatch[2]);
    const targetDay = Number(diffMatch[4]);
    return {
      type: "time",
      kind: "calendar-date-difference",
      calendarType: "date-difference",
      month,
      startDay,
      targetDay,
      offset: Math.max(0, targetDay - startDay),
      visibleStart: startDay,
      visibleEnd: targetDay
    };
  }

  return {
    type: "time",
    kind: "calendar-days-after",
    calendarType: "days-after",
    month: 5,
    startDay: 1,
    targetDay: 2,
    offset: 1,
    visibleStart: 1,
    visibleEnd: 4
  };
}

function renderTimeSplitFeedback(start, end, elapsed, isElapsedPrompt, selectedText, correctText) {
  const toHour = start.minute === 0 ? 0 : 60 - start.minute;
  const remaining = Math.max(0, elapsed - toHour);
  const nextHour = addMinutesToTime(start, toHour || 60);
  const middleLabel = toHour ? `${nextHour.hour}시 정각` : `${start.hour}시 정각`;
  return `
    <div class="concept-card concept-card--time teach-card">
      <div class="teach-head"><span>${isElapsedPrompt ? "걸린 시간" : "몇 분 뒤"}</span><strong>정각까지 먼저 가고, 남은 분을 이어 가요</strong></div>
      <div class="time-split-board">
        <div class="time-split-clock">${renderMiniClock(start.hour, start.minute, "시작")}</div>
        <div class="time-split-jump"><span>정각까지</span><strong>${toHour}분</strong></div>
        <div class="time-split-middle"><b>${escapeHtml(middleLabel)}</b></div>
        <div class="time-split-jump time-split-jump--remain"><span>남은 분</span><strong>${remaining}분</strong></div>
        <div class="time-split-clock">${renderMiniClock(end.hour, end.minute, "끝")}</div>
      </div>
      <div class="concept-equation">${toHour}+${remaining}=${elapsed}분 → ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("60분을 지나가는 시간은 한 번에 빼지 말고 정각을 징검다리로 삼아요. 정각까지 몇 분, 정각 뒤 몇 분으로 나누면 보여요.")}
    </div>
  `;
}

function parseKoreanTimeText(text) {
  const match = String(text || "").match(/(\d{1,2})시\s*(\d{1,2})?분?/);
  return match ? { hour: Number(match[1]), minute: Number(match[2] || 0) } : null;
}

function addMinutesToTime(time, minutes) {
  const total = time.hour * 60 + time.minute + minutes;
  return { hour: ((Math.floor(total / 60) - 1) % 12) + 1, minute: total % 60 };
}

function minutesBetweenTimes(start, end) {
  let startTotal = start.hour * 60 + start.minute;
  let endTotal = end.hour * 60 + end.minute;
  if (endTotal < startTotal) {
    endTotal += 12 * 60;
  }
  return endTotal - startTotal;
}

function renderHalfHourFeedback(hour, selectedText, correctText) {
  return `
    <div class="concept-card concept-card--time teach-card">
      <div class="teach-head"><span>반 읽기</span><strong>30분은 한 시간의 절반이에요</strong></div>
      <div class="half-clock-board">
        ${renderMiniClock(hour, 30, `${hour}시 30분`)}
        <div class="half-clock-fill" aria-hidden="true"></div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("분침이 6까지 오면 60분 중 30분, 즉 반만큼 지난 거예요.")}
    </div>
  `;
}

function renderClockHandRoleFeedback(prompt, selectedText, correctText) {
  const handMatch = prompt.match(/긴바늘이\s*(\d+).*?짧은바늘이\s*(\d+)/);
  const minute = handMatch ? Number(handMatch[1]) % 12 * 5 : 0;
  const hour = handMatch ? Number(handMatch[2]) : extractFirstNumber(correctText) || 7;
  return `
    <div class="concept-card concept-card--time teach-card">
      <div class="teach-head"><span>바늘 역할</span><strong>긴바늘 12는 00분, 짧은바늘은 시</strong></div>
      <div class="clock-role-board">
        ${renderMiniClock(hour, minute, "시계")}
        <div class="clock-role-labels">
          <span>긴바늘 → 분</span>
          <span>짧은바늘 → 시</span>
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("긴바늘이 12에 있으면 정각이에요. 그때 짧은바늘 숫자가 몇 시인지 알려 줘요.")}
    </div>
  `;
}

function renderShapeConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const scene = question.scene?.type === "shape" ? question.scene : null;
  const sceneDrivenKinds = new Set(["tangram-count", "tangram-compose", "tangram-labelled", "stack-cubes", "stack-workbook"]);
  if (sceneDrivenKinds.has(scene?.kind)) {
    return renderShapeSceneFeedback(question, selectedText, correctText);
  }

  if (/다음에 올 도형|규칙/.test(prompt)) {
    return renderShapePatternFeedback(question, selectedText, correctText);
  }

  if (/모두 몇|2개와|1개의/.test(prompt) && /변|꼭짓점/.test(prompt)) {
    return renderShapeTotalCountFeedback(question, selectedText, correctText);
  }

  if (/아닌 것은|맞지 않는|설명한 말이 아닌/.test(prompt)) {
    return renderShapeWrongFeatureFeedback(question, selectedText, correctText);
  }

  if (scene?.kind === "shape-grid" || scene?.kind === "object-shapes") {
    return renderShapeSceneFeedback(question, selectedText, correctText);
  }

  const shapeText = correctText || prompt || "";
  const kind = shapeText.includes("원") ? "circle"
    : shapeText.includes("육각") ? "hexagon"
      : shapeText.includes("오각") ? "pentagon"
        : shapeText.includes("사각") ? "square"
          : "triangle";
  const vertices = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, circle: 0 }[kind];
  const sides = vertices;
  const shapeName = { triangle: "삼각형", square: "사각형", pentagon: "오각형", hexagon: "육각형", circle: "원" }[kind];

  return `
    <div class="concept-card concept-card--shape teach-card">
      <div class="teach-head">
        <span>도형 특징</span>
        <strong>${kind === "circle" ? "굽은 선은 꼭짓점을 만들지 않아요" : "따라 그리고, 꺾이는 곳만 세요"}</strong>
      </div>
      <div class="shape-feature-board">
        <div class="shape-trace-board shape-trace-board--${kind}">
          ${renderSimpleShape(kind)}
          <div class="vertex-dots">${Array.from({ length: vertices }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div>
        </div>
        <div class="shape-count-stack">
          <span>변 <strong>${kind === "circle" ? 0 : sides}</strong></span>
          <span>꼭짓점 <strong>${vertices}</strong></span>
          <span>${shapeName}</span>
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(kind === "circle" ? "뾰족하게 꺾이는 곳이 없으면 꼭짓점도 0개예요." : "이름을 외우기 전에 변과 꼭짓점이 같은 수인지 손가락으로 확인해요.")}
    </div>
  `;
}

function renderShapeSceneFeedback(question, selectedText, correctText) {
  const scene = question.scene || {};
  const visual = renderStructuredShapeVisual(scene, { revealAnswer: true });
  const isSizeMisconception = scene.kind === "shape-grid"
    && (`${scene.note || ""} ${correctText || ""}`).includes("크기");
  const sceneText = {
    "stack-cubes": {
      title: scene.ask === "top" ? "위에서 본 모양" : "쌓기나무 세기",
      principle: scene.ask === "top" ? "위에서 볼 때는 높이가 아니라 놓인 자리만 보여요" : "전체 개수는 각 자리의 높이를 모두 더해요"
    },
    "stack-workbook": {
      title: "쌓기나무 보기",
      principle: scene.ask === "first-floor"
        ? "1층은 바닥에 직접 닿은 쌓기나무만 세요"
        : scene.ask === "highest"
          ? "층수는 가장 높은 기둥 하나의 높이를 읽어요"
          : scene.ask === "description"
            ? "설명 순서대로 바닥을 놓고 위에 올려요"
            : "자리별 높이를 따로 세고 모두 더해요"
    },
    "tangram-compose": {
      title: "칠교로 도형 만들기",
      principle: "안쪽 선 말고 완성된 바깥 윤곽을 따라가요"
    },
    "tangram-labelled": {
      title: "칠교 조각 분류",
      principle: "조각 하나씩 바깥 윤곽을 보고 조건에 맞는 조각만 표시해요"
    },
    "shape-grid": {
      title: isSizeMisconception ? "도형 설명 확인" : "번호 도형 확인",
      principle: isSizeMisconception
        ? "도형 이름과 크기는 따로 봐요"
        : "이름을 외우기 전에 테두리를 따라가며 변과 꼭짓점을 확인해요"
    },
    "object-shapes": {
      title: "생활 속 도형",
      principle: "물건의 쓰임보다 바깥 윤곽을 도형으로 바꾸어 봐요"
    }
  }[scene.kind] || {
    title: "칠교 조각 분류",
    principle: "찾는 모양 조각만 표시하고 세요"
  };
  return `
    <div class="concept-card concept-card--shape teach-card">
      <div class="teach-head"><span>${sceneText.title}</span><strong>${sceneText.principle}</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
    </div>
  `;
}

function renderShapePatternFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const pattern = prompt.includes("원")
    ? ["triangle", "square", "circle"]
    : ["triangle", "square"];
  const labels = { triangle: "삼각형", square: "사각형", circle: "원" };
  const groupMarkup = pattern.map((kind) => renderSimpleShape(kind)).join("");
  return `
    <div class="concept-card concept-card--shape teach-card">
      <div class="teach-head"><span>도형 규칙</span><strong>가장 짧은 반복 묶음을 찾아요</strong></div>
      <div class="shape-pattern-board">
        <div class="pattern-group">${groupMarkup}<b>1묶음</b></div>
        <div class="pattern-group">${groupMarkup}<b>2묶음</b></div>
        <div class="pattern-next">${renderSimpleShape(pattern[0])}<strong>다음: ${escapeHtml(correctText)}</strong></div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(`${pattern.map((kind) => labels[kind]).join("-")}이 한 묶음이에요. 묶음이 끝나면 다시 첫 도형으로 돌아가요.`)}
    </div>
  `;
}

function renderShapeTotalCountFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const unit = prompt.includes("꼭짓점") ? "꼭짓점" : "변";
  const lines = Array.isArray(question.scene?.lines) ? question.scene.lines : question.sceneLines || [];
  const countLines = lines
    .map((line) => {
      const match = String(line).match(/(삼각형|사각형|오각형|육각형|원).*?(\d+)개/);
      return match ? { name: match[1], count: Number(match[2]) } : null;
    })
    .filter(Boolean);
  const firstName = (prompt.match(/(삼각형|사각형|오각형|육각형|원)\s*2개/) || [])[1] || countLines[0]?.name || "도형";
  const secondName = (prompt.match(/와\s*(삼각형|사각형|오각형|육각형|원)\s*1개/) || prompt.match(/과\s*(삼각형|사각형|오각형|육각형|원)\s*1개/) || [])[1] || countLines[1]?.name || "도형";
  const firstCount = countLines[0]?.count || getShapeFeatureCount(firstName);
  const secondCount = countLines[1]?.count || getShapeFeatureCount(secondName);
  const answer = extractFirstNumber(correctText) || firstCount * 2 + secondCount;
  return `
    <div class="concept-card concept-card--shape teach-card">
      <div class="teach-head"><span>여러 도형 세기</span><strong>한 개의 ${unit} 수를 적고, 도형 개수만큼 곱해요</strong></div>
      <div class="shape-total-board">
        <div>
          <span>${escapeHtml(firstName)} 2개</span>
          <div>${renderSimpleShape(shapeNameToKind(firstName))}${renderSimpleShape(shapeNameToKind(firstName))}</div>
          <strong>${firstCount}×2=${firstCount * 2}</strong>
        </div>
        <i>+</i>
        <div>
          <span>${escapeHtml(secondName)} 1개</span>
          <div>${renderSimpleShape(shapeNameToKind(secondName))}</div>
          <strong>${secondCount}</strong>
        </div>
      </div>
      <div class="concept-equation">${firstCount * 2}+${secondCount}=${answer}개</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(`같은 도형이 2개면 ${unit}도 두 번 세야 해요. 한 개의 수를 적고 도형 개수를 곱한 뒤 더합니다.`)}
    </div>
  `;
}

function renderShapeWrongFeatureFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const shapeName = (prompt.match(/(삼각형|사각형|오각형|육각형|원)/) || [])[1] || "도형";
  const kind = shapeNameToKind(shapeName);
  const featureCount = getShapeFeatureCount(shapeName);
  return `
    <div class="concept-card concept-card--shape teach-card">
      <div class="teach-head"><span>아닌 것 찾기</span><strong>맞는 설명을 지우고, 틀린 설명 하나를 남겨요</strong></div>
      <div class="shape-wrong-board">
        <div class="shape-trace-board shape-trace-board--${kind}">
          ${renderSimpleShape(kind)}
          <div class="vertex-dots">${Array.from({ length: kind === "circle" ? 0 : featureCount }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div>
        </div>
        <div class="shape-wrong-list">
          <span>변 ${kind === "circle" ? 0 : featureCount}개</span>
          <span>꼭짓점 ${kind === "circle" ? 0 : featureCount}개</span>
          <strong>틀린 설명: ${escapeHtml(correctText)}</strong>
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("'아닌 것' 문제는 맞는 설명을 고르는 문제가 아니에요. 맞는 특징에 체크하고 남는 틀린 말을 고릅니다.")}
    </div>
  `;
}

function shapeNameToKind(name) {
  if (String(name).includes("원")) return "circle";
  if (String(name).includes("육각")) return "hexagon";
  if (String(name).includes("오각")) return "pentagon";
  if (String(name).includes("사각")) return "square";
  return "triangle";
}

function getShapeFeatureCount(name) {
  const kind = shapeNameToKind(name);
  return { triangle: 3, square: 4, pentagon: 5, hexagon: 6, circle: 0 }[kind] || 3;
}

function renderPlaceValueConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  const numbers = (prompt.match(/\d+/g) || []).map(Number);

  if (/세 수/.test(prompt) && /작은 수부터|차례로/.test(prompt) && numbers.length >= 3) {
    return renderPlaceOrderFeedback(numbers.slice(0, 3), selectedText, correctText);
  }

  if (/중 더 큰 수/.test(prompt) && numbers.length >= 2) {
    return renderPlaceCompareFeedback(numbers[0], numbers[1], selectedText, correctText);
  }

  if (/바로 앞|바로 뒤/.test(prompt) && numbers.length) {
    return renderNeighborNumberFeedback(numbers[0], selectedText, correctText);
  }

  if (/가까운 몇백/.test(prompt) && numbers.length) {
    return renderHundredBoundaryFeedback(numbers[0], selectedText, correctText);
  }

  if (/□/.test(prompt) && /\+/.test(prompt)) {
    return renderMissingExpandedPlaceFeedback(prompt, selectedText, correctText);
  }

  if (/\+/.test(prompt)) {
    const answerNumber = extractFirstNumber(correctText);
    return renderExpandedNumberFeedback(prompt, answerNumber, selectedText, correctText);
  }

  const number = numbers[0] || extractFirstNumber(correctText);
  return renderPlaceDecomposeFeedback(number, selectedText, correctText);
}

function renderPlaceDecomposeFeedback(number, selectedText, correctText) {
  const digits = String(number).split("").map(Number);
  const labels = digits.length >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"];
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>자릿값</span><strong>숫자를 자리집에 한 칸씩 넣어요</strong></div>
      <div class="place-house-board">
        ${labels.map((label, index) => `
          <div>
            <span>${label}</span>
            <strong>${digits[index] ?? 0}</strong>
          </div>
        `).join("")}
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("왼쪽부터 높은 자리예요. 자리 이름을 붙이면 숫자의 뜻이 달라 보여요.")}
    </div>
  `;
}

function renderPlaceOrderFeedback(numbers, selectedText, correctText) {
  const sorted = [...numbers].sort((left, right) => left - right);
  const width = Math.max(...numbers.map((number) => String(number).length));
  const labels = width >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"].slice(-width);
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>세 수 줄 세우기</span><strong>가장 높은 자리부터 비교해 1, 2, 3번을 붙여요</strong></div>
      <div class="place-order-board">
        <div class="place-order-labels">${labels.map((label) => `<span>${label}</span>`).join("")}</div>
        ${numbers.map((number) => {
          const rank = sorted.indexOf(number) + 1;
          const digits = String(number).padStart(width, "0").split("");
          return `
            <div class="place-order-row ${rank === 1 ? "is-smallest" : ""}">
              <b>${rank}번</b>
              ${digits.map((digit) => `<span>${digit}</span>`).join("")}
              <strong>${number}</strong>
            </div>
          `;
        }).join("")}
      </div>
      <div class="concept-equation">${sorted.join(" < ")} → ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("세 수를 비교할 때는 일의 자리부터 보지 않아요. 천/백의 자리부터 내려오며 처음 다른 자리에서 순서가 정해집니다.")}
    </div>
  `;
}

function renderMissingExpandedPlaceFeedback(prompt, selectedText, correctText) {
  const equation = String(prompt).match(/(.+?)=/);
  const leftExpression = equation ? equation[1] : prompt;
  const knownParts = (leftExpression.match(/\d+/g) || []).map(Number);
  const target = extractFirstNumber(String(prompt).split("=")[1] || "");
  const missing = extractFirstNumber(correctText);
  const allParts = Number.isFinite(missing)
    ? insertMissingPart(leftExpression, knownParts, missing)
    : knownParts;
  const orderedEquation = allParts.map((part) => part.isMissing ? "□" : String(part.value)).join(" + ");
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>전개식 빈칸</span><strong>□에는 자리 숫자가 아니라 빠진 자리값이 들어가요</strong></div>
      <div class="missing-expanded-board">
        ${allParts.map((part) => `
          <span class="${part.isMissing ? "is-missing" : ""}">
            <em>${escapeHtml(part.label)}</em>
            <strong>${part.value}</strong>
          </span>
        `).join("")}
      </div>
      <div class="concept-equation">${orderedEquation} = ${Number.isFinite(target) ? target : "목표 수"}, □=${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("예를 들어 십의 자리 빈칸이면 3이 아니라 30이 들어가요. 빈칸이 어느 자리값인지 먼저 말해 봅니다.")}
    </div>
  `;
}

function insertMissingPart(expression, knownParts, missing) {
  const tokens = String(expression).split("+").map((token) => token.trim());
  let numberIndex = 0;
  return tokens.map((token) => {
    if (token.includes("□")) {
      return { value: missing, label: getPlaceValueLabel(missing), isMissing: true };
    }
    const value = knownParts[numberIndex++] || 0;
    return { value, label: getPlaceValueLabel(value), isMissing: false };
  });
}

function getPlaceValueLabel(value) {
  const number = Math.abs(Number(value) || 0);
  if (number >= 1000) return "천";
  if (number >= 100) return "백";
  if (number >= 10) return "십";
  return "일";
}

function renderPlaceCompareFeedback(first, second, selectedText, correctText) {
  const a = String(first).padStart(Math.max(String(first).length, String(second).length), "0").split("");
  const b = String(second).padStart(a.length, "0").split("");
  const labels = a.length >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"].slice(-a.length);
  const diffIndex = a.findIndex((digit, index) => digit !== b[index]);
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>수 비교</span><strong>가장 높은 자리부터 내려오며 처음 다른 곳을 봐요</strong></div>
      <div class="compare-place-board">
        ${labels.map((label, index) => `
          <div class="${index === diffIndex ? "is-decision" : ""}">
            <span>${label}</span>
            <strong>${a[index]}</strong>
            <strong>${b[index]}</strong>
          </div>
        `).join("")}
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("처음으로 달라지는 자리에서 큰 숫자를 가진 수가 더 커요.")}
    </div>
  `;
}

function renderNeighborNumberFeedback(number, selectedText, correctText) {
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>앞뒤 수</span><strong>바로 앞은 -1, 바로 뒤는 +1</strong></div>
      <div class="neighbor-line-board">
        <span>${number - 1}</span>
        <i></i>
        <strong>${number}</strong>
        <i></i>
        <span>${number + 1}</span>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("바로 앞뒤는 10이나 100이 아니라 한 칸만 움직이는 수예요.")}
    </div>
  `;
}

function renderHundredBoundaryFeedback(number, selectedText, correctText) {
  const lower = Math.floor(number / 100) * 100;
  const upper = lower + 100;
  const position = Math.max(8, Math.min(92, Math.round((number - lower) / 100 * 100)));
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>몇백 경계</span><strong>백 단위 눈금 사이에서 작은 쪽 경계를 찾아요</strong></div>
      <div class="hundred-boundary-board" style="--pos:${position}%">
        <span>${lower}</span>
        <i></i>
        <strong>${number}</strong>
        <span>${upper}</span>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("보다 작은 가장 가까운 몇백은 현재 수가 지나온 왼쪽 백 단위예요.")}
    </div>
  `;
}

function renderExpandedNumberFeedback(prompt, answerNumber, selectedText, correctText) {
  const expression = (String(prompt).match(/\d+(?:\s*\+\s*\d+)+/) || [String(prompt)])[0];
  const parts = (expression.match(/\d+/g) || []).map(Number);
  return `
    <div class="concept-card concept-card--placevalue teach-card">
      <div class="teach-head"><span>전개식 모으기</span><strong>각 자리 조각을 같은 집에 모아요</strong></div>
      <div class="expanded-number-board">
        ${parts.slice(0, 4).map((part) => `<span>${part}</span>`).join("<i>+</i>")}
        <strong>${Number.isFinite(answerNumber) ? answerNumber : escapeHtml(correctText)}</strong>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("0의 개수는 자리 이름을 알려 줘요. 조각을 모두 모으면 한 수가 돼요.")}
    </div>
  `;
}

function renderMultiplicationConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  if (question.scene?.type === "multiplication" && /one-zero|table-grid/.test(question.scene.kind || "")) {
    return renderMultiplicationSceneFeedback(question, selectedText, correctText);
  }

  const model = parseMultiplicationModel(question, correctText);
  if (!model) {
    return `
      <div class="concept-card concept-card--groups teach-card">
        <div class="teach-head"><span>곱셈 묶음</span><strong>한 묶음의 수와 묶음 수를 나누어 봐요</strong></div>
        ${renderQuestionLearningVisual(question, { revealAnswer: true })}
        <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      </div>
    `;
  }

  if (/×□/.test(prompt)) {
    return renderMissingFactorFeedback(model, selectedText, correctText);
  }

  if (model.mode === "compare-groups" || model.mode === "compare-products") {
    return renderMultiplicationCompareFeedback(model, selectedText, correctText);
  }

  if (model.mode === "group-count" || model.mode === "unknown-each" || model.mode === "target-groups") {
    return renderMultiplicationReverseFeedback(model, selectedText, correctText);
  }

  if (model.mode === "repeated-addition") {
    return renderRepeatedAdditionFeedback(model, selectedText, correctText);
  }

  return renderArrayMultiplicationFeedback(model, selectedText, correctText);
}

function renderMultiplicationSceneFeedback(question, selectedText, correctText) {
  const scene = question.scene || {};
  const visual = renderStructuredMultiplicationVisual(scene, { revealAnswer: true });
  const isTable = scene.kind === "table-grid";
  const title = isTable ? "곱셈표 읽기" : (scene.mode === "zero" ? "0의 곱" : "1단 곱");
  const principle = isTable
    ? "행과 열이 만나는 칸을 찾아요"
    : (scene.mode === "zero" ? "묶음이 0개면 전체도 0이에요" : "한 묶음만 있으면 원래 수 그대로예요");
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>${title}</span><strong>${principle}</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(principle)}
    </div>
  `;
}

function parseMultiplicationModel(question, correctText) {
  const prompt = question.prompt || "";
  let match = prompt.match(/(\d+)\s*×\s*□\s*=\s*(\d+)/);
  if (match) {
    const each = Number(match[1]);
    const product = Number(match[2]);
    const groups = extractFirstNumber(correctText);
    return Number.isFinite(groups) ? { mode: "missing-factor", each, groups, product } : null;
  }

  match = prompt.match(/(\d+)개씩\s*(\d+)묶음과\s*(\d+)개씩\s*(\d+)묶음/);
  if (match) {
    const left = { each: Number(match[1]), groups: Number(match[2]) };
    const right = { each: Number(match[3]), groups: Number(match[4]) };
    left.product = left.each * left.groups;
    right.product = right.each * right.groups;
    return { mode: "compare-groups", left, right, product: Math.max(left.product, right.product) };
  }

  match = prompt.match(/두 식\s*(\d+)\s*×\s*(\d+),\s*(\d+)\s*×\s*(\d+)/);
  if (match) {
    const left = { each: Number(match[1]), groups: Number(match[2]) };
    const right = { each: Number(match[3]), groups: Number(match[4]) };
    left.product = left.each * left.groups;
    right.product = right.each * right.groups;
    return { mode: "compare-products", left, right, product: Math.max(left.product, right.product) };
  }

  match = prompt.match(/(\d+)\s*×\s*(\d+)/);
  if (match) {
    const each = Number(match[1]);
    const groups = Number(match[2]);
    return { mode: "array", each, groups, product: each * groups };
  }

  const repeated = prompt.match(/^\s*(\d+)(?:\s*\+\s*\d+)+/);
  if (repeated) {
    const values = (prompt.match(/\d+/g) || []).map(Number);
    const each = values[0];
    const groups = values.filter((value) => value === each).length;
    return { mode: "repeated-addition", each, groups, product: each * groups, values: values.slice(0, groups) };
  }

  match = prompt.match(/모두\s*(\d+)개를\s*(\d+)개씩\s*묶으면/);
  if (match) {
    const product = Number(match[1]);
    const each = Number(match[2]);
    const groups = extractFirstNumber(correctText);
    return Number.isFinite(groups) ? { mode: "group-count", each, groups, product } : null;
  }

  match = prompt.match(/모두\s*(\d+)개를\s*(\d+)묶음으로/);
  if (match) {
    const product = Number(match[1]);
    const groups = Number(match[2]);
    const each = extractFirstNumber(correctText);
    return Number.isFinite(each) ? { mode: "unknown-each", each, groups, product } : null;
  }

  match = prompt.match(/(\d+)개를 만들 수 있는 묶음/);
  if (match) {
    const product = Number(match[1]);
    const answerMatch = String(correctText).match(/(\d+)개씩\s*(\d+)묶음/);
    if (answerMatch) {
      const each = Number(answerMatch[1]);
      const groups = Number(answerMatch[2]);
      return { mode: "target-groups", each, groups, product };
    }
  }

  match = prompt.match(/(\d+)개씩\s*(\d+)묶음/);
  if (match) {
    const each = Number(match[1]);
    const groups = Number(match[2]);
    return { mode: "array", each, groups, product: each * groups };
  }

  match = prompt.match(/한 줄에\s*(\d+)개씩\s*(\d+)줄/);
  if (match) {
    const each = Number(match[1]);
    const groups = Number(match[2]);
    return { mode: "array", each, groups, product: each * groups };
  }

  match = prompt.match(/바둑돌\s*(\d+)개를\s*한 줄에\s*(\d+)개씩/);
  if (match) {
    const product = Number(match[1]);
    const each = Number(match[2]);
    const groups = extractFirstNumber(correctText);
    return Number.isFinite(groups) ? { mode: "group-count", each, groups, product } : null;
  }

  match = prompt.match(/(\d+)을 만들 수 있는 곱셈식/);
  if (match) {
    const product = Number(match[1]);
    const factorMatch = correctText.match(/(\d+)\s*×\s*(\d+)/);
    if (factorMatch) {
      return { mode: "target-expression", each: Number(factorMatch[1]), groups: Number(factorMatch[2]), product };
    }
  }

  return null;
}

function renderArrayMultiplicationFeedback(model, selectedText, correctText) {
  const each = Math.max(1, Math.min(model.each, 9));
  const groups = Math.max(1, Math.min(model.groups, 8));
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>배열/묶음</span><strong>${model.each}개씩 ${model.groups}줄을 같은 묶음으로 봐요</strong></div>
      <div class="array-board" style="--cols:${each}">
        ${Array.from({ length: groups }, (_, row) => `
          <div class="array-row">
            ${Array.from({ length: each }, (_, col) => `<i style="--r:${row};--c:${col}"></i>`).join("")}
            <span>${model.each}개</span>
          </div>
        `).join("")}
      </div>
      <div class="skip-count-strip">
        ${Array.from({ length: Math.min(model.groups, 8) }, (_, index) => `<span>${model.each * (index + 1)}</span>`).join("")}
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("전체를 하나씩 세지 말고, 같은 줄을 몇 번 더했는지 뛰어 세어 봐요.")}
    </div>
  `;
}

function renderMissingFactorFeedback(model, selectedText, correctText) {
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>빈칸 곱셈</span><strong>${model.each}씩 뛰어 세어 목표 ${model.product}에 도착해요</strong></div>
      <div class="factor-jump-board">
        ${Array.from({ length: model.groups + 1 }, (_, index) => `<span class="${index === model.groups ? "is-target" : ""}">${model.each * index}</span>`).join("")}
      </div>
      <div class="concept-equation">${model.each}씩 ${model.groups}번 = ${model.product}</div>
      ${renderStudentPrompt("□는 답 자체가 아니라, 목표 수까지 몇 번 뛰었는지를 묻는 자리예요.")}
    </div>
  `;
}

function renderRepeatedAdditionFeedback(model, selectedText, correctText) {
  const values = model.values?.length ? model.values : Array.from({ length: model.groups }, () => model.each);
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>반복 덧셈</span><strong>같은 수와 반복 횟수를 나누어 봐요</strong></div>
      <div class="repeated-add-board">
        ${values.map((value, index) => `
          <span>
            <b>${value}</b>
            <em>${index + 1}번째</em>
          </span>
        `).join("<i>+</i>")}
      </div>
      <div class="concept-equation">${model.each}가 ${model.groups}번 → ${model.each}×${model.groups}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("곱셈식으로 바꿀 때 앞 숫자는 반복되는 수, 뒤 숫자는 몇 번 반복되는지예요.")}
    </div>
  `;
}

function renderMultiplicationReverseFeedback(model, selectedText, correctText) {
  const modeText = model.mode === "unknown-each"
    ? "한 묶음의 수 찾기"
    : model.mode === "target-groups"
      ? "목표 수 만들기"
      : "묶음 수 찾기";
  const visibleGroupCount = Math.min(model.groups, 8);
  const visibleDotsPerGroup = Math.min(model.each, 8);
  const dotColumns = visibleDotsPerGroup <= 4 ? 2 : visibleDotsPerGroup <= 6 ? 3 : 4;
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>${modeText}</span><strong>전체를 같은 크기 묶음으로 나누어 확인해요</strong></div>
      <div class="reverse-group-board" style="--cols:${dotColumns}">
        ${Array.from({ length: visibleGroupCount }, (_, groupIndex) => `
          <div>
            ${Array.from({ length: visibleDotsPerGroup }, () => `<i></i>`).join("")}
            <span>${groupIndex + 1}묶음</span>
          </div>
        `).join("")}
      </div>
      <div class="skip-count-strip">
        ${Array.from({ length: visibleGroupCount }, (_, index) => `<span>${model.each * (index + 1)}</span>`).join("")}
      </div>
      <div class="concept-equation">${model.each}×${model.groups}=${model.product}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(model.mode === "unknown-each" ? "전체와 묶음 수가 주어지면, 각 묶음에 똑같이 들어갈 수를 찾아요." : "목표 수까지 같은 수로 몇 번 가는지 뛰어 세면 묶음 수가 보입니다.")}
    </div>
  `;
}

function renderMultiplicationCompareFeedback(model, selectedText, correctText) {
  const left = model.left;
  const right = model.right;
  const max = Math.max(left.product, right.product, 1);
  return `
    <div class="concept-card concept-card--groups teach-card">
      <div class="teach-head"><span>곱 비교</span><strong>숫자 모양이 아니라 두 곱의 결과끼리 비교해요</strong></div>
      <div class="multiply-compare-board">
        <div class="${left.product >= right.product ? "is-larger" : ""}">
          <span>${left.each}×${left.groups}</span>
          <i style="width:${Math.round(left.product / max * 100)}%"></i>
          <strong>${left.product}</strong>
        </div>
        <div class="${right.product >= left.product ? "is-larger" : ""}">
          <span>${right.each}×${right.groups}</span>
          <i style="width:${Math.round(right.product / max * 100)}%"></i>
          <strong>${right.product}</strong>
        </div>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("묶음 크기가 커도 묶음 수가 적으면 전체가 작을 수 있어요. 두 식의 값을 먼저 적고 비교합니다.")}
    </div>
  `;
}

function renderPatternSceneFeedback(question, selectedText, correctText) {
  const scene = question.scene || {};
  const visual = renderStructuredPatternVisual(scene, { revealAnswer: true });
  const title = /table/.test(scene.kind || "") ? "표에서 규칙 찾기"
    : scene.kind === "stacking" ? "쌓은 모양 규칙"
      : scene.kind === "action-sound" ? "생활 속 규칙"
        : "규칙 찾기";
  const principle = /table/.test(scene.kind || "") ? "한 방향으로 움직이며 이웃한 칸의 차이를 봐요"
    : scene.kind === "stacking" ? "단계마다 새로 늘어난 부분을 표시해요"
      : scene.kind === "action-sound" ? "반복되는 가장 짧은 동작 묶음을 찾아요"
        : "반복되는 변화량을 확인해요";
  return `
    <div class="concept-card concept-card--pattern teach-card">
      <div class="teach-head"><span>${title}</span><strong>${principle}</strong></div>
      ${visual}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt(principle)}
    </div>
  `;
}

function renderPatternConceptFeedback(question, selectedText, correctText) {
  const prompt = question.prompt || "";
  if (question.scene?.type === "pattern") {
    return renderPatternSceneFeedback(question, selectedText, correctText);
  }

  const nums = (prompt.match(/\d+/g) || []).map(Number);

  if (/빨강|파랑/.test(prompt)) {
    return `
      <div class="concept-card concept-card--pattern teach-card">
        <div class="teach-head"><span>반복 규칙</span><strong>가장 짧게 반복되는 색 묶음을 찾아요</strong></div>
        <div class="color-pattern-board">
          <div><span class="red">빨강</span><span class="blue">파랑</span><span class="blue">파랑</span><b>1묶음</b></div>
          <div><span class="red">빨강</span><span class="blue">파랑</span><span class="blue">파랑</span><b>2묶음</b></div>
          <strong class="red">다음: ${escapeHtml(correctText)}</strong>
        </div>
        ${renderStudentPrompt("묶음의 마지막이 끝났으니 다음은 새 묶음의 첫 색이에요.")}
      </div>
    `;
  }

  if (/곱합니다|설명/.test(prompt) || nums.join(",").startsWith("2,4,8,16")) {
    return `
      <div class="concept-card concept-card--pattern teach-card">
        <div class="teach-head"><span>규칙 설명</span><strong>차이가 달라지면 곱하기 규칙도 확인해요</strong></div>
        <div class="rule-compare-board">
          <div><span>2</span><i>+2</i><span>4</span><i>+4</i><span>8</span><i>+8</i><span>16</span></div>
          <div class="is-correct"><span>2</span><i>×2</i><span>4</span><i>×2</i><span>8</span><i>×2</i><span>16</span></div>
        </div>
        ${renderFeedbackAnswerLine(selectedText, correctText)}
        ${renderStudentPrompt("더하는 수가 계속 바뀌면, 곱하기처럼 같은 행동이 반복되는지 봐요.")}
      </div>
    `;
  }

  if (/□/.test(prompt) && nums.length >= 3 && /,\s*□\s*,/.test(prompt)) {
    return renderMissingMiddlePatternFeedback(prompt, selectedText, correctText);
  }

  if (/□/.test(prompt) && nums.length >= 5) {
    return renderAlternatingPatternFeedback(nums.slice(0, 5), selectedText, correctText);
  }

  if (nums.length >= 3) {
    const seq = nums.slice(0, 3);
    const step = seq[1] - seq[0];
    const next = seq[2] + step;
    return `
      <div class="concept-card concept-card--pattern teach-card">
        <div class="teach-head"><span>수 규칙</span><strong>이웃한 수 사이의 화살표가 같은지 봐요</strong></div>
        <div class="number-pattern-board">
          <span>${seq[0]}</span><i>${step > 0 ? "+" : ""}${step}</i>
          <span>${seq[1]}</span><i>${step > 0 ? "+" : ""}${step}</i>
          <span>${seq[2]}</span><i>${step > 0 ? "+" : ""}${step}</i>
          <strong>${next}</strong>
        </div>
        ${renderFeedbackAnswerLine(selectedText, correctText)}
        ${renderStudentPrompt("앞의 두 번 변화가 같으면, 마지막 칸에도 같은 변화를 한 번 더 해요.")}
      </div>
    `;
  }

  return `
    <div class="concept-card concept-card--pattern teach-card">
      <div class="teach-head"><span>규칙 찾기</span><strong>칸 사이의 변화를 써 놓고 반복을 봐요</strong></div>
      ${renderQuestionLearningVisual(question, { revealAnswer: true })}
      <div class="concept-equation">답: ${escapeHtml(correctText)}</div>
      ${renderStudentPrompt("규칙은 답 하나가 아니라, 앞에서 계속 반복된 행동이에요.")}
    </div>
  `;
}

function renderMissingMiddlePatternFeedback(prompt, selectedText, correctText) {
  const match = String(prompt).match(/(\d+)\s*,\s*□\s*,\s*(\d+)\s*,\s*(\d+)/);
  const first = match ? Number(match[1]) : 0;
  const third = match ? Number(match[2]) : 0;
  const fourth = match ? Number(match[3]) : 0;
  const missing = extractFirstNumber(correctText);
  const step = Number.isFinite(missing) ? missing - first : Math.round((third - first) / 2);
  return `
    <div class="concept-card concept-card--pattern teach-card">
      <div class="teach-head"><span>가운데 빈칸</span><strong>두 칸 사이 변화를 한 칸씩 나누어 봐요</strong></div>
      <div class="missing-pattern-board">
        <span>${first}</span><i>+${step}</i>
        <strong>□=${Number.isFinite(missing) ? missing : first + step}</strong><i>+${step}</i>
        <span>${third}</span><i>+${fourth - third}</i>
        <span>${fourth}</span>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("빈칸이 가운데 있으면 앞 수에서 바로 답으로 뛰지 않아요. 한 칸 변화가 몇인지 먼저 찾습니다.")}
    </div>
  `;
}

function renderAlternatingPatternFeedback(nums, selectedText, correctText) {
  const diffs = nums.slice(1).map((value, index) => value - nums[index]);
  const next = extractFirstNumber(correctText);
  const nextDiff = Number.isFinite(next) ? next - nums[nums.length - 1] : diffs[0];
  return `
    <div class="concept-card concept-card--pattern teach-card">
      <div class="teach-head"><span>번갈아 규칙</span><strong>변화가 두 가지이면 +작게, +크게가 반복되는지 봐요</strong></div>
      <div class="alternating-pattern-board">
        ${nums.map((value, index) => `
          <span>${value}</span>
          ${index < diffs.length ? `<i class="${index % 2 ? "is-second" : ""}">${diffs[index] > 0 ? "+" : ""}${diffs[index]}</i>` : ""}
        `).join("")}
        <i class="is-next">${nextDiff > 0 ? "+" : ""}${nextDiff}</i>
        <strong>${Number.isFinite(next) ? next : escapeHtml(correctText)}</strong>
      </div>
      ${renderFeedbackAnswerLine(selectedText, correctText)}
      ${renderStudentPrompt("차이가 계속 같지 않으면 틀린 규칙이 아니에요. 두 변화가 번갈아 반복되는지 색을 달리해 표시해 봅니다.")}
    </div>
  `;
}

function buildQuestionWalkthrough(question, correctText, selectedText) {
  return buildRelationWalkthrough(question, correctText, selectedText)
    || buildBlankEquationWalkthrough(question, correctText, selectedText)
    || buildChoiceWalkthrough(question, correctText, selectedText)
    || buildThreeCalcWalkthrough(question, correctText, selectedText)
    || buildArithmeticWalkthrough(question, correctText, selectedText)
    || {
      diagnosis: "",
      steps: buildFallbackExplanationSteps(question, correctText),
      nextAction: buildCategoryReminder(resolveQuestionCategory(question)),
      visualTitle: "문제를 다시 읽어 보기",
      visualMarkup: buildFallbackVisual(question, correctText, selectedText)
    };
}

function buildRelationWalkthrough(question, correctText) {
  const prompt = question.prompt;
  const addMatch = prompt.match(/(\d+)\+(\d+)=(\d+)/);
  const subMatch = prompt.match(/(\d+)-(\d+)=(\d+)/);

  if ((prompt.includes("같은 뜻의 뺄셈식") || prompt.includes("또 다른 뺄셈식")) && addMatch) {
    const left = Number(addMatch[1]);
    const right = Number(addMatch[2]);
    const total = Number(addMatch[3]);
    return {
      diagnosis: `덧셈식에서는 전체가 ${total}, 부분이 ${left}와 ${right}예요. 같은 뜻의 뺄셈식은 전체에서 한 부분을 빼서 다른 부분을 찾는 식이어야 해요.`,
      steps: [
        `${left}+${right}=${total}에서 전체는 ${total}예요.`,
        `전체 ${total}에서 부분 ${right}를 빼면 다른 부분 ${left}가 남아요.`,
        `그래서 ${total}-${right}=${left}가 같은 뜻의 식이에요.`,
        `정답은 ${correctText}예요.`
      ],
      nextAction: "덧셈식이 보이면 전체와 부분을 먼저 찾고, 뺄셈식으로 거꾸로 바꾸어 보세요.",
      visualTitle: "식의 관계를 한눈에 보기",
      visualMarkup: renderEquationFamilyVisual([
        `${left}+${right}=${total}`,
        `${total}-${right}=${left}`,
        `${total}-${left}=${right}`
      ], "하나의 덧셈식은 두 개의 같은 뜻 뺄셈식으로 이어져요.")
    };
  }

  if (prompt.includes("같은 뜻의 덧셈식") && subMatch) {
    const total = Number(subMatch[1]);
    const sub = Number(subMatch[2]);
    const answer = Number(subMatch[3]);
    return {
      diagnosis: `뺄셈식에서는 전체가 ${total}, 빠져나간 수가 ${sub}, 남은 수가 ${answer}예요. 같은 뜻의 덧셈식은 남은 수와 빠져나간 수를 합해 전체를 만드는 식이어야 해요.`,
      steps: [
        `${total}-${sub}=${answer}에서 남은 수는 ${answer}예요.`,
        `남은 수 ${answer}와 빠져나간 수 ${sub}를 더하면 다시 전체 ${total}가 돼요.`,
        `그래서 ${answer}+${sub}=${total}이 같은 뜻의 식이에요.`,
        `정답은 ${correctText}예요.`
      ],
      nextAction: "뺄셈식은 남은 수 + 빠진 수 = 전체로 다시 이어 보면 훨씬 쉬워져요.",
      visualTitle: "전체와 부분 연결하기",
      visualMarkup: renderEquationFamilyVisual([
        `${total}-${sub}=${answer}`,
        `${answer}+${sub}=${total}`
      ], "뺄셈식을 거꾸로 보면 덧셈식이 돼요.")
    };
  }

  return null;
}

function buildBlankEquationWalkthrough(question, correctText) {
  const prompt = question.prompt.replace(/\s+/g, "");
  let match = prompt.match(/^□([+\-])(\d+)=(\d+)/);
  if (match) {
    const operator = match[1];
    const known = Number(match[2]);
    const total = Number(match[3]);
    if (operator === "+") {
      const missing = total - known;
      return {
        diagnosis: `□가 앞에 있는 덧셈식은 전체 ${total}에서 알고 있는 수 ${known}을 빼면 모르는 수를 찾을 수 있어요.`,
        steps: [
          `□+${known}=${total}에서 □는 빠진 부분이에요.`,
          `전체 ${total}에서 알고 있는 수 ${known}을 빼면 ${missing}이에요.`,
          `그래서 □=${missing}이고 정답은 ${correctText}예요.`
        ],
        nextAction: "□가 있는 덧셈식은 전체에서 알려진 수를 빼는 거꾸로 계산을 떠올려 보세요.",
        visualTitle: "빈칸을 거꾸로 찾기",
        visualMarkup: renderBlankEquationVisual(`□+${known}=${total}`, [
          `전체 ${total}`,
          `알고 있는 수 ${known}`,
          `남는 수 ${missing}`
        ])
      };
    }

    const missing = total + known;
    return {
      diagnosis: `□에서 ${known}을 뺐더니 ${total}가 되었다면, 시작한 수 □는 결과와 뺀 수를 다시 더해 찾을 수 있어요.`,
      steps: [
        `□-${known}=${total}이면 □에서 ${known}이 빠져나간 거예요.`,
        `빠져나가기 전 수를 찾으려면 ${total}+${known}을 해요.`,
        `그래서 □=${missing}이고 정답은 ${correctText}예요.`
      ],
      nextAction: "□-수=결과 꼴은 결과와 뺀 수를 다시 더해 처음 수를 찾으면 돼요.",
      visualTitle: "처음 수 되돌리기",
      visualMarkup: renderBlankEquationVisual(`□-${known}=${total}`, [
        `남은 수 ${total}`,
        `빠진 수 ${known}`,
        `처음 수 ${missing}`
      ])
    };
  }

  match = prompt.match(/^(\d+)([+\-])□=(\d+)/);
  if (!match) {
    return null;
  }

  const known = Number(match[1]);
  const operator = match[2];
  const total = Number(match[3]);
  if (operator === "+") {
    const missing = total - known;
    return {
      diagnosis: `알고 있는 수 ${known}에 무엇을 더해야 ${total}가 되는지 찾는 문제예요. 전체에서 이미 있는 수를 빼면 □가 나와요.`,
      steps: [
        `${known}+□=${total}에서 □는 더해진 수예요.`,
        `전체 ${total}에서 ${known}을 빼면 ${missing}이 남아요.`,
        `그래서 □=${missing}이고 정답은 ${correctText}예요.`
      ],
      nextAction: "덧셈식의 빈칸은 전체에서 알고 있는 수를 빼면 빠르게 찾을 수 있어요.",
      visualTitle: "빈칸 위치 바꾸어 생각하기",
      visualMarkup: renderBlankEquationVisual(`${known}+□=${total}`, [
        `전체 ${total}`,
        `처음 수 ${known}`,
        `더해진 수 ${missing}`
      ])
    };
  }

  const missing = known - total;
  return {
    diagnosis: `${known}에서 무엇을 빼면 ${total}가 되는지 찾는 문제예요. 처음 수 ${known}와 남은 수 ${total}의 차가 □예요.`,
    steps: [
      `${known}-□=${total}에서 □는 빠져나간 수예요.`,
      `처음 수 ${known}에서 남은 수 ${total}를 빼면 ${missing}이에요.`,
      `그래서 □=${missing}이고 정답은 ${correctText}예요.`
    ],
    nextAction: "뺄셈식의 빈칸은 처음 수와 남은 수의 차를 보면 바로 찾을 수 있어요.",
    visualTitle: "남은 수와 빠진 수 비교하기",
    visualMarkup: renderBlankEquationVisual(`${known}-□=${total}`, [
      `처음 수 ${known}`,
      `남은 수 ${total}`,
      `빠진 수 ${missing}`
    ])
  };
}

function buildChoiceWalkthrough(question, correctText, selectedText) {
  const prompt = question.prompt;

  if (prompt.includes("가장 큰 식")) {
    const compared = question.options
      .map((option) => ({ option: compactOptionText(option), value: evaluateMathExpression(option) }))
      .filter((item) => item.value !== null);
    if (compared.length) {
      return {
        diagnosis: "이 문제는 식만 보고 고르는 것이 아니라, 각 보기의 값을 끝까지 계산한 뒤 서로 비교해야 해요.",
        steps: [
          ...compared.map((item) => `${item.option} = ${item.value}`),
          `가장 큰 값이 나오는 식은 ${correctText}예요.`
        ],
        nextAction: "비교 문제는 각 보기 옆에 답을 먼저 적어 놓고 그 답끼리 비교해 보세요.",
        visualTitle: "보기 값을 모두 비교하기",
        visualMarkup: renderCompareVisual(compared, correctText, selectedText)
      };
    }
  }

  if (prompt.includes("바르게 계산한 학생은 누구")) {
    const expressionMatch = prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
    const actualValue = expressionMatch ? evaluateMathExpression(`${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}`) : null;
    if (actualValue !== null) {
      return {
        diagnosis: "친구 이름을 바로 고르기보다 먼저 식의 값을 직접 구한 뒤, 그 값을 말한 친구를 찾으면 돼요.",
        steps: [
          `${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}=${actualValue}를 먼저 구해요.`,
          `보기 중 ${actualValue}라고 말한 친구를 찾으면 돼요.`,
          `그래서 정답은 ${correctText}예요.`
        ],
        nextAction: "누가 맞았는지 묻는 문제는 식을 먼저 풀고, 그 답과 같은 말을 한 친구를 찾으세요.",
        visualTitle: "학생들의 답 비교하기",
        visualMarkup: renderChoiceMatchVisual(question, correctText, selectedText)
      };
    }
  }

  if (prompt.includes("바르게 계산한 식은 무엇")) {
    const expressionMatch = prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
    const actualValue = expressionMatch ? evaluateMathExpression(`${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}`) : null;
    if (actualValue !== null) {
      return {
        diagnosis: "이 문제는 보기 식이 맞는지 하나씩 확인하는 문제예요. 먼저 원래 식의 값을 구해 두면 훨씬 쉽게 찾을 수 있어요.",
        steps: [
          `먼저 ${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}=${actualValue}를 구해요.`,
          `보기 중 왼쪽 계산 결과와 오른쪽 답이 모두 맞는 식만 남겨요.`,
          `그래서 정답은 ${correctText}예요.`
        ],
        nextAction: "바른 식 찾기는 원래 식의 답을 먼저 구한 뒤 보기와 대조하면 실수가 줄어요.",
        visualTitle: "보기 식 하나씩 확인하기",
        visualMarkup: renderChoiceMatchVisual(question, correctText, selectedText)
      };
    }
  }

  if (prompt.includes("잘못 계산했어요")) {
    const expressionMatch = prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
    const actualValue = expressionMatch ? evaluateMathExpression(`${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}`) : null;
    if (actualValue !== null) {
      return {
        diagnosis: "친구가 말한 값이 보여도 그대로 고르지 말고, 원래 식을 다시 계산해서 바른 값을 찾아야 해요.",
        steps: [
          `원래 식 ${expressionMatch[1]}${expressionMatch[2]}${expressionMatch[3]}를 다시 계산해요.`,
          `계산 결과는 ${actualValue}예요.`,
          `그래서 바르게 고친 값은 ${correctText}예요.`
        ],
        nextAction: "고쳐 계산 문제는 친구 답을 보지 말고 원래 식부터 다시 계산해 보세요.",
        visualTitle: "잘못 나온 값 고쳐 보기",
        visualMarkup: renderChoiceMatchVisual(question, correctText, selectedText)
      };
    }
  }

  if (prompt.includes("알맞은 식은 무엇")) {
    return {
      diagnosis: "이 문제는 문장에서 수가 늘어나는지 줄어드는지 먼저 보고, 모르는 자리에 □를 두어 식을 만드는 문제예요.",
      steps: buildFallbackExplanationSteps(question, correctText),
      nextAction: "문장제에서 □식 만들기는 처음 수, 변한 수, 마지막 수를 순서대로 표시하면 쉬워져요.",
      visualTitle: "문장을 식으로 바꾸기",
      visualMarkup: renderChoiceMatchVisual(question, correctText, selectedText)
    };
  }

  return null;
}

function buildThreeCalcWalkthrough(question, correctText) {
  const match = question.prompt.match(/(\d+)\s*([+\-])\s*(\d+)\s*([+\-])\s*(\d+)/);
  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[3]);
  const third = Number(match[5]);
  const firstResult = match[2] === "+" ? first + second : first - second;
  const finalResult = match[4] === "+" ? firstResult + third : firstResult - third;

  return {
    diagnosis: "세 수 계산은 한 번에 끝내기보다 앞 계산 결과를 먼저 만들고, 그 값을 다음 식에 이어 넣는 순서를 지켜야 해요.",
    steps: [
      `먼저 ${first}${match[2]}${second}=${firstResult}를 구해요.`,
      `그다음 ${firstResult}${match[4]}${third}=${finalResult}를 계산해요.`,
      `그래서 정답은 ${correctText}예요.`
    ],
    nextAction: "세 수 계산은 첫 번째 계산 결과를 작게 적어 두고 다음 식으로 이어 가면 훨씬 정확해져요.",
    visualTitle: "계산 순서 따라가기",
    visualMarkup: renderThreeCalcVisual([
      `${first}${match[2]}${second}`,
      `${firstResult}${match[4]}${third}`,
      `${finalResult}`
    ])
  };
}

function buildArithmeticWalkthrough(question, correctText) {
  const arithmetic = parseQuestionArithmetic(question);
  if (!arithmetic) {
    return null;
  }

  const { left, operator, right } = arithmetic;

  if (operator === "+") {
    const onesSum = (left % 10) + (right % 10);
    const result = left + right;
    const tensSum = Math.floor((left % 100) / 10) + Math.floor((right % 100) / 10) + Math.floor(onesSum / 10);
    const needsHundredCarry = result >= 100 || tensSum >= 10;
    const carryText = onesSum >= 10
      ? `일의 자리 ${left % 10}+${right % 10}=${onesSum}이므로 ${Math.floor(onesSum / 10)}십 ${onesSum % 10}일로 바꾸어 생각해요.`
      : needsHundredCarry
        ? `일의 자리 ${left % 10}+${right % 10}=${onesSum}을 놓고, 십의 자리에서 10십이 되는지 봐요.`
      : `일의 자리 ${left % 10}+${right % 10}=${onesSum}을 먼저 구해요.`;
    return {
      diagnosis: onesSum >= 10
        ? "이 덧셈은 일의 자리 합이 10을 넘어서 받아올림을 챙겨야 하는 문제예요."
        : needsHundredCarry
          ? "이 덧셈은 십의 자리 합이 10십이 되어 1백으로 받아올림해야 하는 문제예요."
        : "이 덧셈은 십의 자리와 일의 자리를 차례대로 더하면 쉽게 풀 수 있는 문제예요.",
      steps: [
        `${left}와 ${right}의 십의 자리, 일의 자리를 나누어 봐요.`,
        carryText,
        `십의 자리까지 합치면 ${left}+${right}=${result}가 되어 정답은 ${correctText}예요.`
      ],
      nextAction: onesSum >= 10
        ? "덧셈은 일의 자리부터 보고 10이 되면 1십을 올린다는 점을 꼭 기억해 보세요."
        : needsHundredCarry
          ? "십의 자리에서 10십이 되면 1백으로 올리고, 십의 자리는 남은 십만 적어 보세요."
        : "덧셈은 일의 자리부터 차례대로 더하는 습관을 들이면 더 빨라져요.",
      visualTitle: needsHundredCarry
        ? "10십을 1백으로 바꾸기"
        : onesSum >= 10
          ? "수막대 움직임: 10개를 묶어 올리기"
          : "십과 일을 나누어 더하기",
      visualMarkup: needsHundredCarry
        ? renderThreePlaceAddFeedback({ left, operator: "+", right, result })
        : onesSum >= 10
          ? renderCarryVisual(left, right)
          : renderSimpleAddVisual(left, right)
    };
  }

  const needsBorrow = left % 10 < right % 10;
  const result = left - right;
  const borrowLeftTens = Math.floor(left / 10);
  const borrowLeftOnes = left % 10;
  const borrowRightTensValue = Math.floor(right / 10) * 10;
  const borrowRightOnes = right % 10;
  const borrowChangedTensValue = (borrowLeftTens - 1) * 10;
  const borrowChangedOnes = borrowLeftOnes + 10;
  const borrowResultTensValue = Math.floor(result / 10) * 10;
  const borrowResultOnes = result % 10;
  const regroupText = needsBorrow
    ? `${left}${numberObjectParticle(left)} ${borrowChangedTensValue}과 ${borrowChangedOnes}${numberDirectionParticle(borrowChangedOnes)} 바꾸어 생각할 수 있어요.`
    : `일의 자리 ${left % 10}-${right % 10}을 그대로 계산할 수 있어요.`;
  const resultStep = needsBorrow
    ? `${borrowChangedTensValue}-${borrowRightTensValue}=${borrowResultTensValue}, ${borrowChangedOnes}-${borrowRightOnes}=${borrowResultOnes}이므로 정답은 ${correctText}예요.`
    : `차례대로 빼면 ${left}-${right}=${result}가 되어 정답은 ${correctText}예요.`;
  return {
    diagnosis: needsBorrow
      ? "이 뺄셈은 일의 자리에서 바로 뺄 수 없어서 받아내림을 해야 하는 문제예요."
      : "이 뺄셈은 자리끼리 맞추어 차례대로 빼면 되는 문제예요.",
    steps: [
      `${left}에서 ${right}를 뺄 때 먼저 일의 자리를 살펴봐요.`,
      regroupText,
      resultStep
    ],
    nextAction: needsBorrow
      ? "뺄셈은 처음 수를 십 단위와 남은 일 단위로 다시 나눈 뒤, 각각 빼면 보여요."
      : "뺄셈은 일의 자리와 십의 자리를 같은 자리끼리 맞추어 계산해 보세요.",
    visualTitle: needsBorrow ? `${left}${numberObjectParticle(left)} ${borrowChangedTensValue}과 ${borrowChangedOnes}${numberDirectionParticle(borrowChangedOnes)} 바꾸기` : "자리끼리 맞추어 빼기",
    visualMarkup: needsBorrow ? renderBorrowVisual(left, right) : renderSimpleSubVisual(left, right)
  };
}

function parseQuestionArithmetic(question) {
  const directMatch = question.prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (directMatch) {
    return {
      left: Number(directMatch[1]),
      operator: directMatch[2],
      right: Number(directMatch[3])
    };
  }

  const numbers = (question.prompt.match(/\d+/g) || []).map(Number);
  if (numbers.length < 2) {
    return null;
  }

  if (question.category && question.category.startsWith("add")) {
    return { left: numbers[0], operator: "+", right: numbers[1] };
  }

  if (question.category && question.category.startsWith("sub")) {
    return { left: numbers[0], operator: "-", right: numbers[1] };
  }

  if (question.category === "1-3" || isAddSubStoryPrompt(question.prompt)) {
    const prompt = question.prompt || "";
    const isSubtract = /썼|남|빼|차이|덜|줄|잃|꺼냈|가져갔/.test(prompt);
    const isAdd = /더 받|모두|합|늘|받았|얻|샀|가지고.*더/.test(prompt);
    if (isAdd || isSubtract) {
      return { left: numbers[0], operator: isSubtract ? "-" : "+", right: numbers[1] };
    }
  }

  return null;
}

function buildFallbackVisual(question, correctText, selectedText) {
  return `
    <div class="explanation-story-card">
      <div class="equation-chip ${selectedText ? "is-selected" : ""}">${escapeHtml(selectedText || "내 답 다시 보기")}</div>
      <div class="equation-arrow">→</div>
      <div class="equation-chip is-accent">${escapeHtml(correctText)}</div>
      <p class="visual-caption">${escapeHtml(question.explanation || "문제의 뜻을 다시 읽고 정답과 연결해 보세요.")}</p>
    </div>
  `;
}

function renderEquationFamilyVisual(equations, caption) {
  return `
    <div class="equation-family">
      ${equations.map((equation, index) => `
        <div class="equation-chip ${index === equations.length - 1 ? "is-accent" : ""}">
          ${escapeHtml(equation)}
        </div>
      `).join('<div class="equation-arrow">→</div>')}
    </div>
    <p class="visual-caption">${escapeHtml(caption)}</p>
  `;
}

function renderBlankEquationVisual(equation, labels) {
  return `
    <div class="equation-family">
      <div class="equation-chip is-accent">${escapeHtml(equation)}</div>
    </div>
    <div class="flow-track">
      ${labels.map((label) => `
        <div class="flow-step">
          <strong>${escapeHtml(label)}</strong>
        </div>
      `).join('<div class="equation-arrow">→</div>')}
    </div>
  `;
}

function renderThreeCalcVisual(steps) {
  return `
    <div class="flow-track">
      ${steps.map((step, index) => `
        <div class="flow-step ${index === steps.length - 1 ? "is-accent" : ""}">
          <strong>${escapeHtml(step)}</strong>
          <span>${index === steps.length - 1 ? "정답" : `${index + 1}단계`}</span>
        </div>
      `).join('<div class="equation-arrow">→</div>')}
    </div>
  `;
}

function renderChoiceMatchVisual(question, correctText, selectedText) {
  const rows = question.options.map((option) => {
    const compact = compactOptionText(option);
    const stateClass = compact === correctText
      ? "is-correct"
      : compact === selectedText
        ? "is-selected"
        : "";
    return `
      <div class="choice-check-row ${stateClass}">
        <span>${escapeHtml(compact)}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="choice-check-list">
      ${rows}
    </div>
    <p class="visual-caption">보기를 하나씩 살펴보며 정답과 연결되는 식이나 답을 찾으면 돼요.</p>
  `;
}

function renderCompareVisual(items, correctText, selectedText) {
  const rows = items.map((item) => {
    const stateClass = item.option === correctText
      ? "is-correct"
      : item.option === selectedText
        ? "is-selected"
        : "";
    return `
      <div class="compare-row ${stateClass}">
        <span>${escapeHtml(item.option)}</span>
        <strong>${item.value}</strong>
      </div>
    `;
  }).join("");

  return `
    <div class="compare-strip">
      ${rows}
    </div>
    <p class="visual-caption">각 식의 값을 먼저 적고, 그 값들끼리 크기를 비교하면 정답이 또렷하게 보여요.</p>
  `;
}

function renderRods(count, crossed = 0) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => `
    <div class="base-ten-rod ${index < crossed ? "is-crossed" : ""}"></div>
  `).join("");
}

function renderUnits(count, crossed = 0) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => `
    <div class="base-ten-unit ${index < crossed ? "is-crossed" : ""}"></div>
  `).join("");
}

function renderNumberBoard(tens, ones, title) {
  return `
    <div class="place-board">
      <div class="place-zone">
        <h5>${escapeHtml(title)} · 십의 자리 ${tens}십</h5>
        <div class="blocks">${renderRods(tens)}</div>
      </div>
      <div class="place-zone">
        <h5>${escapeHtml(title)} · 일의 자리 ${ones}일</h5>
        <div class="blocks">${renderUnits(ones)}</div>
      </div>
    </div>
  `;
}

function renderCarryVisual(left, right) {
  return renderAdditionBlockFeedback({
    left,
    operator: "+",
    right,
    result: left + right
  });
}

function renderBorrowVisual(left, right) {
  return renderSubtractionBlockFeedback({
    left,
    operator: "-",
    right,
    result: left - right
  });
}

function renderSimpleAddVisual(left, right) {
  return renderAdditionBlockFeedback({
    left,
    operator: "+",
    right,
    result: left + right
  });
}

function renderSimpleSubVisual(left, right) {
  const result = left - right;
  return `
    ${renderNumberBoard(Math.floor(left / 10), left % 10, `${left}`)}
    <div class="place-board">
      <div class="place-zone">
        <h5>뺀 수 ${right}</h5>
        <div class="blocks">${renderRods(Math.floor(right / 10))}${renderUnits(right % 10)}</div>
      </div>
      <div class="place-zone">
        <h5>남은 수 ${result}</h5>
        <div class="blocks">${renderRods(Math.floor(result / 10))}${renderUnits(result % 10)}</div>
      </div>
    </div>
    <p class="visual-caption">왼쪽은 십의 자리, 오른쪽은 일의 자리예요. 같은 자리끼리 맞추어 차례대로 빼면 돼요.</p>
  `;
}

function buildQuestionDiagnosis(question, selectedText, correctText) {
  if (!selectedText) {
    return "선택한 답을 다시 확인하고, 식의 뜻과 계산 순서를 천천히 다시 살펴보면 정답에 가까워질 수 있어요.";
  }

  const selectedValue = extractChoiceNumber(selectedText);
  const correctValue = extractChoiceNumber(correctText);
  if (selectedValue !== null && correctValue !== null) {
    const gap = selectedValue - correctValue;
    if (Math.abs(gap) === 10) {
      return `고른 답 ${selectedText}은 정답 ${correctText}와 10 차이가 나요. 십의 자리 받아올림이나 받아내림을 놓쳤을 가능성이 커요.`;
    }

    if (Math.abs(gap) === 1) {
      return `고른 답 ${selectedText}은 정답 ${correctText}와 1 차이예요. 마지막 일의 자리 계산을 다시 보면 바로 잡을 수 있어요.`;
    }

    if (gap > 0) {
      return `고른 답 ${selectedText}은 정답 ${correctText}보다 ${gap}만큼 커요. 어느 자리에서 더 많이 계산했는지 다시 살펴보면 좋아요.`;
    }

    return `고른 답 ${selectedText}은 정답 ${correctText}보다 ${Math.abs(gap)}만큼 작아요. 빠뜨린 수나 받아올림, 받아내림이 없는지 다시 확인해 보세요.`;
  }

  if (question.prompt.includes("가장 큰 식")) {
    return "이 문제는 식의 모양이 아니라 계산 결과를 비교해야 해요. 각 보기의 답을 끝까지 구해야 정답을 찾을 수 있어요.";
  }

  if (question.category === "relation") {
    return "같은 뜻의 식은 전체와 부분의 자리가 서로 맞아야 해요. 숫자만 바꾸어 쓰면 같은 뜻이 되지 않을 수 있어요.";
  }

  if (question.category === "blankEq") {
    return "□ 문제는 모르는 수를 거꾸로 찾는 문제예요. 어떤 수를 더하거나 빼야 하는지 다시 연결해 보세요.";
  }

  return `고른 답은 ${selectedText}이지만, 이 문제의 정답은 ${correctText}예요. 식의 뜻을 한 번 더 읽고 차례대로 계산해 보세요.`;
}

function buildFallbackExplanationSteps(question, correctText) {
  const explanation = question.explanation || buildFriendlyExplanation(question);
  const coreSteps = String(explanation)
    .split(".")
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!coreSteps.length) {
    return [`정답은 ${correctText}예요.`, "문제의 식과 조건을 다시 차례대로 살펴보세요."];
  }

  if (!coreSteps.some((step) => step.includes(correctText))) {
    coreSteps.push(`정답은 ${correctText}예요.`);
  }

  return coreSteps;
}

function buildCategoryReminder(category) {
  return {
    "덧셈 방법 1": "덧셈은 십과 일을 나누어 보고, 일의 자리부터 더해 보세요.",
    "덧셈 방법 2": "받아올림이 보이면 일의 자리 10개를 1십으로 바꾸는 장면을 떠올려 보세요.",
    "덧셈 익힘": "큰 수 덧셈은 자리 맞추기와 받아올림 표시를 꼭 확인해 보세요.",
    "뺄셈 방법 1": "뺄셈은 전체에서 얼마나 줄어드는지 차분하게 보는 습관이 중요해요.",
    "뺄셈 방법 2": "받아내림이 필요하면 1십을 10일로 바꾸어 적고 시작해 보세요.",
    "뺄셈 익힘": "자리끼리 맞추어 빼고, 줄어든 십의 자리를 마지막에 다시 확인해 보세요.",
    "세 수 계산": "세 수 계산은 첫 계산 결과를 적어 두고 다음 식으로 이어 가면 실수가 줄어요.",
    "식의 관계": "전체와 부분을 먼저 찾은 뒤 덧셈식과 뺄셈식을 서로 바꾸어 보세요.",
    "□가 있는 식": "□는 거꾸로 계산하거나 반대 연산으로 찾는다는 점을 꼭 기억해 보세요."
  }[category] || "식의 뜻을 먼저 읽고, 한 번에 하나씩 계산하면 훨씬 안정적으로 풀 수 있어요.";
}

function extractChoiceNumber(text) {
  const match = String(text).trim().match(/^(-?\d+)/);
  return match ? Number(match[1]) : null;
}

function evaluateMathExpression(expression) {
  const normalized = String(expression).replace(/\s+/g, "");
  const tokens = normalized.match(/\d+|[+\-]/g);
  if (!tokens || !tokens.length || !/^\d+$/.test(tokens[0])) {
    return null;
  }

  let total = Number(tokens[0]);
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index];
    const next = Number(tokens[index + 1]);
    if (!Number.isFinite(next)) {
      return null;
    }
    total = operator === "+" ? total + next : total - next;
  }
  return total;
}

function buildFriendlyExplanation(question) {
  if (question.explanation) {
    return question.explanation;
  }

  const category = resolveQuestionCategory(question);
  const correctText = compactOptionText(question.options[question.answer]);
  const categoryRule = {
    "덧셈 방법 1": "수를 십과 일로 나누거나 묶어서 더하면 훨씬 쉬워져요.",
    "덧셈 방법 2": "받아올림이 생길 때는 십이 되는 수를 먼저 떠올리면 좋아요.",
    "덧셈 익힘": "십의 자리와 일의 자리를 차례대로 더하면 실수가 줄어요.",
    "뺄셈 방법 1": "전체 수에서 얼마나 줄어드는지 차분하게 빼 보면 정답이 보여요.",
    "뺄셈 방법 2": "받아내림이 있을 때는 십을 하나 옮겨 생각하면 쉬워져요.",
    "뺄셈 익힘": "자리끼리 맞추어 빼면 더 빠르고 정확해져요.",
    "세 수 계산": "앞의 계산 결과를 다음 식에 이어 넣으며 차례대로 풀면 돼요.",
    "식의 관계": "덧셈식과 뺄셈식이 같은 뜻인지 거꾸로 연결해 보면 좋아요.",
    "□가 있는 식": "모르는 수는 거꾸로 계산하거나 반대 연산으로 찾을 수 있어요."
  }[category] || "수를 하나씩 따져 보면 다음 문제는 더 빨라질 거예요.";

  if (question.scene?.type === "clues" && Array.isArray(question.scene.lines)) {
    return `${question.scene.lines.join(" ")} 그래서 정답은 ${correctText}예요. ${categoryRule}`;
  }

  if (question.prompt.includes("몇") || correctText.includes("개") || correctText.includes("층")) {
    return `수를 세는 문제는 조건을 한 줄씩 읽고 차례대로 더하면 정답이 보여요. 정답은 ${correctText}예요. ${categoryRule}`;
  }

  if (question.prompt.includes("옳지 않은") || question.prompt.includes("없는") || question.prompt.includes("아닌")) {
    return `보기 하나하나를 식과 조건에 맞게 비교해 보면 알맞지 않은 것을 찾을 수 있어요. 정답은 ${correctText}예요. ${categoryRule}`;
  }

  return `정답은 ${correctText}예요. 식과 조건을 한 번 더 연결해 보면 다음 문제는 더 빨라질 거예요. ${categoryRule}`;
}

function buildFirstWrongHint(question, selectedIndex) {
  const prompt = question.prompt || "";
  const selectedText = Number.isInteger(selectedIndex) && question.options?.[selectedIndex]
    ? compactOptionText(question.options[selectedIndex])
    : "";

  if (question.feedback?.nextAction) {
    return clampFeedbackText(question.feedback.nextAction, 64);
  }

  if (question.scene?.type === "time" || isTimeLearningPrompt(prompt)) {
    if (/긴바늘|짧은바늘/.test(prompt)) {
      return "긴바늘은 분, 짧은바늘은 시를 알려 줘요.";
    }
    if (/걸린 시간|부터.*까지/.test(prompt)) {
      return "끝 시각을 고르지 말고, 시작과 끝 사이의 분을 세어 보세요.";
    }
    return "분을 먼저 움직이고, 60분이 되면 시를 1 올려요.";
  }

  if (question.scene?.type === "length" || /cm|m|길이|단위|자/.test(prompt)) {
    if (/보다 몇 cm 더|더 긴/.test(prompt)) {
      return "긴 길이와 짧은 길이를 같은 시작점에 맞추고 남는 부분을 봐요.";
    }
    if (/m와 cm|모두 몇 cm|cm를 m와 cm/.test(prompt)) {
      return "m와 cm가 함께 나오면 먼저 모두 cm로 바꾸어 보세요.";
    }
    return "길이는 같은 단위끼리 더하거나 비교해야 해요.";
  }

  if (/1000이|100이|10이|1이|자리/.test(prompt)) {
    return "왼쪽부터 큰 자리 이름을 붙이고 숫자를 하나씩 확인해요.";
  }

  if (/더 큰 수|비교/.test(prompt)) {
    return "가장 왼쪽의 큰 자리부터 차례대로 비교해요.";
  }

  if (/□/.test(prompt)) {
    return "□를 찾을 때는 전체에서 알고 있는 수를 거꾸로 생각해요.";
  }

  if (selectedText) {
    return `${selectedText} 말고, 문제의 조건을 한 줄씩 다시 짚어 보세요.`;
  }

  return "문제에서 묻는 말과 보기의 단위를 한 번 더 맞춰 보세요.";
}

function resolveQuestionCategory(questionOrId) {
  if (questionOrId && typeof questionOrId === "object" && questionOrId.category) {
    return getCategoryName(questionOrId.category);
  }

  if (typeof questionOrId === "string") {
    return getCategoryName(questionOrId);
  }

  return getCategoryName("mixed");
}

function endGame() {
  if (state.gameEnded) {
    return;
  }

  state.gameEnded = true;
  state.endedAt = Date.now();
  closeOpenQuestionRecordsOnEnd();
  clearTimers();
  clearPlayerDelays();
  renderPlayerBoard();
  showStudentSubmitScreen();
}

function showResults() {
  switchScreen("result");
  const totalScore = state.players.reduce((sum, player) => sum + state.scores[player.id].score, 0);

  resultGrid.style.setProperty("--result-columns", String(Math.min(state.players.length, 6)));
  winnerHeadline.textContent = state.players.length ? `전체 학생 점수 총합 ${totalScore}점` : "결과를 확인해 보세요";
  winnerSummary.textContent = `친구 ${state.players.length}명 · 총 정답 ${state.totalCorrect}개`;
  resultGrid.innerHTML = state.players.map((player) => {
    const playerState = state.scores[player.id];
    return `
      <article class="result-card">
        <h3>${player.avatar} ${player.name}</h3>
        <p>정답 ${playerState.correct}개 · 오답 ${playerState.wrong}개</p>
        <strong class="result-score">${playerState.score}점</strong>
      </article>
    `;
  }).join("");
}

function showStudentSubmitScreen() {
  switchScreen("submit");
  renderStudentSubmitScreen();
}

function renderStudentSubmitScreen() {
  const totalScore = state.players.reduce((sum, player) => sum + state.scores[player.id].score, 0);
  const totalQuestions = state.players.reduce((sum, player) => sum + state.scores[player.id].questionRecords.length, 0);

  studentSubmitSummary.textContent = `전체 ${state.players.length}명 · 총점 ${totalScore}점 · 기록된 풀이 ${totalQuestions}문항`;
  studentResultForms.style.setProperty("--student-submit-columns", String(Math.min(state.players.length, 5)));
  studentResultForms.innerHTML = state.players.map((player) => {
    const playerState = state.scores[player.id];
    const savedRecord = state.savedSubmissionRecordsByPlayer[player.id] || null;
    const practicePlan = state.personalizedPracticePlansByPlayer[player.id] || null;
    const questionCount = playerState.questionRecords.length;
    const avgMs = questionCount ? Math.round(playerState.totalQuestionTimeMs / questionCount) : 0;
    const accuracy = getRecordAccuracyPercent(playerState.questionRecords);
    const cardHelp = savedRecord
      ? `${savedRecord.studentKey}으로 저장 완료 · 맞춤 재도전 문제 ${practicePlan?.questions?.length || 0}문항 준비`
      : "입력 후 저장하면 선생님 전용 관리 파일에 풀이 기록이 누적됩니다.";
    return `
      <article class="student-submit-card" data-player="${player.id}">
        <div class="student-submit-head">
          <div>
            <h3>${player.avatar} ${player.name}</h3>
            <p>${DIFFICULTY_NAMES[playerState.difficulty] || "난이도 미선택"} · ${getSelectedScopeName()}</p>
          </div>
          <strong>${playerState.score}점</strong>
        </div>
        <div class="student-submit-metrics">
          <span>정답 <strong>${playerState.correct}</strong></span>
          <span>오답 선택 <strong>${playerState.wrong}</strong></span>
          <span>정확도 <strong>${accuracy}%</strong></span>
          <span>평균 ${formatSeconds(avgMs)}</span>
        </div>
        <div class="student-input-row">
          <label>
            <span>반</span>
            <select data-field="classNumber" data-player="${player.id}" aria-label="${player.name} 반 선택">
              <option value="">반 선택</option>
              ${renderNumberSelectOptions(1, STUDENT_CLASS_MAX, "반")}
            </select>
          </label>
          <label>
            <span>번호</span>
            <select data-field="studentNumber" data-player="${player.id}" aria-label="${player.name} 번호 선택">
              <option value="">번호 선택</option>
              ${renderNumberSelectOptions(1, STUDENT_NUMBER_MAX, "번")}
            </select>
          </label>
        </div>
        <p class="student-submit-help">${escapeHtml(cardHelp)}</p>
        ${savedRecord ? renderPersonalizedPracticeLauncher(player, savedRecord, practicePlan) : ""}
      </article>
    `;
  }).join("");
  syncStudentSubmitSelections();
  applySavedStudentSubmitState();
}

function renderPersonalizedPracticeLauncher(player, savedRecord, practicePlan) {
  const focusText = practicePlan?.focusText || "맞춤 복습";
  const modeText = practicePlan?.mode === "challenge"
    ? "심화 문장제 도전"
    : practicePlan?.mode === "extension"
      ? "새 유형 확장"
      : "부담 낮춘 재도전";
  return `
    <div class="student-practice-launch">
      <div>
        <span>${escapeHtml(modeText)}</span>
        <strong>${escapeHtml(focusText)}</strong>
      </div>
      <button class="primary-button student-practice-button" type="button" data-personalized-practice data-player="${player.id}">
        맞춤 다시 풀기
      </button>
    </div>
  `;
}

function applySavedStudentSubmitState() {
  Object.entries(state.savedSubmissionRecordsByPlayer || {}).forEach(([playerId, record]) => {
    const card = studentResultForms.querySelector(`.student-submit-card[data-player="${playerId}"]`);
    if (!card) {
      return;
    }

    const classSelect = card.querySelector('[data-field="classNumber"]');
    const numberSelect = card.querySelector('[data-field="studentNumber"]');
    if (classSelect) {
      classSelect.value = record.classNumber || "";
      classSelect.disabled = true;
    }
    if (numberSelect) {
      numberSelect.value = record.studentNumber || "";
      numberSelect.disabled = true;
    }
    card.classList.add("is-saved");
  });
}

function renderNumberSelectOptions(start, end, suffix) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return `<option value="${value}">${value}${suffix}</option>`;
  }).join("");
}

function handleStudentSelectionChange(event) {
  const select = event.target.closest(".student-input-row select");
  if (!select) {
    return;
  }

  if (select.dataset.field === "classNumber") {
    syncAllStudentClassSelections(select.value);
  }

  syncStudentSubmitSelections(select);
}

function handleStudentSubmitAction(event) {
  const practiceButton = event.target.closest("[data-personalized-practice]");
  if (!practiceButton) {
    return;
  }

  const playerId = practiceButton.dataset.player;
  startPersonalizedPractice(playerId);
}

function syncAllStudentClassSelections(classNumber) {
  studentResultForms.querySelectorAll('[data-field="classNumber"]').forEach((select) => {
    select.value = classNumber;
    select.closest(".student-submit-card")?.classList.remove("is-invalid");
  });
}

function syncStudentSubmitSelections(changedSelect = null) {
  const numberSelects = Array.from(studentResultForms.querySelectorAll('[data-field="studentNumber"]'));

  if (changedSelect?.dataset.field === "studentNumber" && changedSelect.value) {
    numberSelects.forEach((select) => {
      if (select !== changedSelect && select.value === changedSelect.value) {
        select.value = "";
        select.closest(".student-submit-card")?.classList.add("is-invalid");
      }
    });
  } else {
    const seenNumbers = new Set();
    numberSelects.forEach((select) => {
      if (!select.value) {
        return;
      }

      if (seenNumbers.has(select.value)) {
        select.value = "";
        select.closest(".student-submit-card")?.classList.add("is-invalid");
        return;
      }

      seenNumbers.add(select.value);
    });
  }

  const selectedNumbers = new Set(numberSelects.map((select) => select.value).filter(Boolean));
  numberSelects.forEach((select) => {
    Array.from(select.options).forEach((option) => {
      option.disabled = Boolean(option.value && option.value !== select.value && selectedNumbers.has(option.value));
    });

    select.closest(".student-submit-card")?.classList.toggle(
      "is-number-selected",
      Boolean(select.value)
    );
  });

  studentResultForms.querySelectorAll(".student-submit-card").forEach((card) => {
    const classSelect = card.querySelector('[data-field="classNumber"]');
    const numberSelect = card.querySelector('[data-field="studentNumber"]');
    if (classSelect?.value && numberSelect?.value) {
      card.classList.remove("is-invalid");
    }
  });
}

function saveLearningDataFromSubmit() {
  if (state.submissionSaved) {
    studentSubmitSummary.textContent = "이번 평가 결과는 이미 저장되어 있어요. 선생님은 교사용 파일에서 누적 결과를 확인할 수 있습니다.";
    return;
  }

  const cards = Array.from(studentResultForms.querySelectorAll(".student-submit-card"));
  const invalidCards = [];
  const studentInfoByPlayer = {};

  syncStudentSubmitSelections();

  cards.forEach((card) => {
    const playerId = card.dataset.player;
    const classInput = card.querySelector('[data-field="classNumber"]');
    const numberInput = card.querySelector('[data-field="studentNumber"]');
    const classNumber = classInput.value;
    const studentNumber = numberInput.value;
    const isValid = classNumber && studentNumber;

    card.classList.toggle("is-invalid", !isValid);
    if (!isValid) {
      invalidCards.push(card);
      return;
    }

    studentInfoByPlayer[playerId] = { classNumber, studentNumber };
  });

  if (invalidCards.length > 0) {
    studentSubmitSummary.textContent = "반과 번호가 비어 있는 학생이 있어요. 빈칸을 먼저 채워 주세요.";
    invalidCards[0].querySelector("select")?.focus();
    return;
  }

  const newRecords = state.players.map((player) => (
    buildLearningRecord(player, state.scores[player.id], studentInfoByPlayer[player.id])
  ));
  const savedRecords = loadLearningRecords();
  const allRecords = [...savedRecords, ...newRecords];
  saveLearningRecords(allRecords);
  state.submissionSaved = true;
  state.savedSubmissionRecordsByPlayer = Object.fromEntries(newRecords.map((record) => [record.playerId, record]));
  state.personalizedPracticePlansByPlayer = Object.fromEntries(newRecords.map((record) => [
    record.playerId,
    buildPersonalizedPracticePlan(
      allRecords.filter((item) => item.studentKey === record.studentKey),
      record
    )
  ]));
  saveLearningDataButton.disabled = true;
  saveLearningDataButton.textContent = "저장 완료";
  renderStudentSubmitScreen();
  studentSubmitSummary.textContent = `${newRecords.length}명의 평가 결과를 저장했습니다. 학생별 맞춤 다시 풀기 버튼이 준비되었습니다.`;
}

function startPersonalizedPractice(playerId) {
  const savedRecordsByPlayer = { ...(state.savedSubmissionRecordsByPlayer || {}) };
  const clickedRecord = savedRecordsByPlayer[playerId];
  if (!clickedRecord) {
    window.alert("먼저 반과 번호를 저장한 뒤 맞춤 다시 풀기를 시작할 수 있어요.");
    return;
  }

  const allRecords = loadLearningRecords();
  const practiceEntries = state.players
    .map((player) => {
      const savedRecord = savedRecordsByPlayer[player.id];
      if (!savedRecord) {
        return null;
      }

      const studentRecords = allRecords.filter((record) => record.studentKey === savedRecord.studentKey);
      const plan = state.personalizedPracticePlansByPlayer[player.id]
        || buildPersonalizedPracticePlan(studentRecords, savedRecord);
      return plan.questions.length ? { player, savedRecord, plan } : null;
    })
    .filter(Boolean);

  if (!practiceEntries.length) {
    window.alert("맞춤 재도전 문제를 만들 기록이 아직 충분하지 않아요.");
    return;
  }

  primeAudio();
  const previousTimer = state.timer;
  state.sessionToken += 1;
  state.gameEnded = false;
  state.sessionId = createSessionId();
  state.startedAt = Date.now();
  state.endedAt = null;
  state.submissionSaved = false;
  state.savedSubmissionRecordsByPlayer = {};
  state.personalizedPracticePlansByPlayer = {};
  state.practiceMode = {
    active: true,
    sourceRecordId: clickedRecord.id,
    sourceStudentKey: clickedRecord.studentKey,
    focusText: "학생별 맞춤 재도전",
    mode: practiceEntries.some((entry) => entry.plan.mode === "challenge") ? "challenge" : "review",
    targetTypes: practiceEntries.flatMap((entry) => entry.plan.targetTypes || []),
    previousTimer,
    plansByPlayer: Object.fromEntries(practiceEntries.map((entry) => [
      entry.player.id,
      {
        sourceRecordId: entry.savedRecord.id,
        sourceStudentKey: entry.savedRecord.studentKey,
        focusText: entry.plan.focusText,
        mode: entry.plan.mode,
        targetTypes: entry.plan.targetTypes || []
      }
    ]))
  };
  state.totalCorrect = 0;
  state.totalAnswered = 0;

  clearTimers();
  clearPlayerDelays();
  resetCelebration();

  state.players = state.players.map((player) => {
    const savedRecord = savedRecordsByPlayer[player.id];
    return savedRecord
      ? {
          ...player,
          name: savedRecord.studentKey,
          avatar: savedRecord.playerAvatar || player.avatar,
          animal: savedRecord.playerAvatar || player.animal,
          soundText: "좋아요"
        }
      : player;
  });
  state.scores = createScoreState(state.players);
  state.timer = practiceEntries.some((entry) => entry.plan.mode === "challenge")
    ? Math.max(state.timer, 180)
    : Math.max(state.timer, 120);
  state.timerLeft = state.timer;

  practiceEntries.forEach(({ player, plan }) => {
    const playerState = state.scores[player.id];
    if (!playerState) {
      return;
    }

    playerState.difficulty = plan.difficulty;
    playerState.questionPool = arrangeDiverseQuestionPool(plan.questions);
    playerState.status = plan.mode === "challenge" ? "심화 문장제 도전" : "맞춤 재도전";
  });

  switchScreen("game");
  practiceEntries.forEach(({ player }) => assignNextQuestion(player.id));
  maybeStartTimer();
  updateGameStatus();
  renderGrowthPanel();
  renderPlayerBoard();
}

function buildPersonalizedPracticePlan(studentRecords, anchorRecord) {
  const anchorQuestions = Array.isArray(anchorRecord.questionRecords) ? anchorRecord.questionRecords : [];
  const growth = analyzeStudentGrowthByQuestionType(studentRecords);
  const recoveredKeys = new Set(growth.recovered.map((item) => item.key));
  const ongoingKeys = growth.ongoing.map((item) => item.key);
  const anchorSupportKeys = uniqueStrings(anchorQuestions
    .filter(isQuestionRecordNeedingSupport)
    .map(getQuestionTypeKey)
    .filter(Boolean)
    .filter((key) => !recoveredKeys.has(key)));
  const targetKeys = uniqueStrings([...anchorSupportKeys, ...ongoingKeys].filter((key) => !recoveredKeys.has(key)));
  const cleanCorrectQuestions = anchorQuestions.filter(isQuestionRecordCleanCorrect);
  const seen = buildSeenQuestionSet(studentRecords);
  const allCleanCorrect = anchorQuestions.length > 0 && anchorQuestions.every(isQuestionRecordCleanCorrect);
  const baseDifficulty = anchorRecord.difficulty || "mid";
  const targetDifficulty = allCleanCorrect ? getNextDifficulty(baseDifficulty) : baseDifficulty;
  let questions = [];
  let mode = "review";
  let focusText = "오답 유형 중심 + 자신 있게 맞힌 유형 섞기";

  if (allCleanCorrect) {
    mode = baseDifficulty === "high" ? "challenge" : "extension";
    focusText = baseDifficulty === "high" ? "3줄 이상 심화 문장제" : "새 차시·새 유형 확장";
    questions = baseDifficulty === "high"
      ? buildAdvancedStoryChallengeQuestions(anchorRecord)
      : pickDifferentTypeQuestions({
          difficulty: targetDifficulty,
          seen,
          excludeKeys: new Set(anchorQuestions.map(getQuestionTypeKey).filter(Boolean)),
          limit: 8
        });
  } else {
    const focusQuestions = pickQuestionsForTypeKeys(targetKeys, baseDifficulty, seen, 5);
    const warmupQuestions = pickWarmupQuestions(cleanCorrectQuestions, baseDifficulty, seen, 2);
    const extensionQuestions = pickDifferentTypeQuestions({
      difficulty: baseDifficulty,
      seen,
      excludeKeys: new Set([...targetKeys, ...cleanCorrectQuestions.map(getQuestionTypeKey).filter(Boolean)]),
      limit: 1
    });
    questions = interleavePracticeQuestions(focusQuestions, warmupQuestions, extensionQuestions).slice(0, 8);
    if (!focusQuestions.length) {
      focusText = "가볍게 성공 경험을 쌓는 확인 문제";
    } else {
      const label = growth.ongoing.find((item) => targetKeys.includes(item.key))?.label
        || getQuestionTypeLabel(anchorQuestions.find((question) => targetKeys.includes(getQuestionTypeKey(question))))
        || "보충 유형";
      focusText = `${label} 중심 + 쉬운 성공 문제 섞기`;
    }
  }

  if (!questions.length) {
    questions = pickDifferentTypeQuestions({ difficulty: targetDifficulty, seen, excludeKeys: new Set(), limit: 8 });
  }

  return {
    mode,
    difficulty: targetDifficulty,
    focusText,
    targetTypes: targetKeys.map((key) => ({
      key,
      label: growth.ongoing.find((item) => item.key === key)?.label || key
    })),
    questions: questions.map((question, index) => cloneQuestionForPersonalizedPractice(question, index, mode))
  };
}

function analyzeStudentGrowthByQuestionType(records) {
  const states = new Map();
  const sortedEvents = [...(records || [])]
    .sort((left, right) => new Date(left.savedAt || left.endedAt || 0) - new Date(right.savedAt || right.endedAt || 0))
    .flatMap((record, recordIndex) => (
      (Array.isArray(record.questionRecords) ? record.questionRecords : []).map((questionRecord, questionIndex) => ({
        record,
        recordIndex,
        questionIndex,
        questionRecord
      }))
    ));

  sortedEvents.forEach((event) => {
    const key = getQuestionTypeKey(event.questionRecord);
    if (!key) {
      return;
    }

    if (!states.has(key)) {
      states.set(key, {
        key,
        label: getQuestionTypeLabel(event.questionRecord, event.record),
        supportCount: 0,
        cleanAfterSupportCount: 0,
        supportOpen: false,
        lastSupportPrompt: "",
        lastSeenAt: ""
      });
    }

    const stateForType = states.get(key);
    stateForType.label = stateForType.label || getQuestionTypeLabel(event.questionRecord, event.record);
    stateForType.lastSeenAt = event.record.savedAt || event.record.endedAt || "";

    if (isQuestionRecordNeedingSupport(event.questionRecord)) {
      stateForType.supportCount += 1;
      stateForType.supportOpen = true;
      stateForType.lastSupportPrompt = event.questionRecord.prompt || "";
      return;
    }

    if (stateForType.supportOpen && isQuestionRecordCleanCorrect(event.questionRecord)) {
      stateForType.cleanAfterSupportCount += 1;
      stateForType.supportOpen = false;
    }
  });

  const supported = Array.from(states.values()).filter((item) => item.supportCount > 0);
  return {
    recovered: supported.filter((item) => !item.supportOpen && item.cleanAfterSupportCount > 0),
    ongoing: supported.filter((item) => item.supportOpen)
  };
}

function isQuestionRecordNeedingSupport(questionRecord) {
  return Boolean(questionRecord && (!questionRecord.finalCorrect || (questionRecord.attemptCount || 0) > 1));
}

function isQuestionRecordCleanCorrect(questionRecord) {
  return Boolean(questionRecord && questionRecord.finalCorrect && (questionRecord.attemptCount || 0) <= 1);
}

function getQuestionTypeKey(questionRecord) {
  if (!questionRecord) {
    return "";
  }
  return questionRecord.variantKey
    || [questionRecord.category, questionRecord.lessonKey, normalizePromptType(questionRecord.prompt)].filter(Boolean).join(":");
}

function normalizePromptType(prompt) {
  return String(prompt || "")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

function getQuestionTypeLabel(questionRecord, parentRecord = {}) {
  if (!questionRecord) {
    return "";
  }
  const category = questionRecord.categoryName || parentRecord.categoryName || getCategoryName(questionRecord.category || parentRecord.category);
  const lesson = getLessonLabel(questionRecord.category || parentRecord.category, questionRecord.lessonKey || parentRecord.lessonKey);
  return [category, lesson].filter(Boolean).join(" · ") || "맞춤 유형";
}

function getLessonLabel(category, lessonKey) {
  if (!category || !lessonKey || lessonKey === LESSON_ALL_VALUE) {
    return "";
  }
  return (LESSON_OPTIONS_BY_CATEGORY[category] || []).find((lesson) => lesson.value === lessonKey)?.label || "";
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSeenQuestionSet(records) {
  const questionRecords = (records || []).flatMap((record) => (
    Array.isArray(record.questionRecords) ? record.questionRecords : []
  ));
  return {
    ids: new Set(questionRecords.map((question) => question.questionId).filter(Boolean)),
    prompts: new Set(questionRecords.map((question) => question.prompt).filter(Boolean)),
    typeKeys: new Set(questionRecords.map(getQuestionTypeKey).filter(Boolean)),
    lessonKeys: new Set(questionRecords.map((question) => question.lessonKey).filter(Boolean))
  };
}

function getNextDifficulty(difficulty) {
  if (difficulty === "low") return "mid";
  if (difficulty === "mid") return "high";
  return "high";
}

function getAllBankQuestions(difficulty = "") {
  return Object.values(DISPLAY_QUESTION_BANK || {}).flatMap((group) => (
    Object.entries(group || {}).flatMap(([level, questions]) => (
      !difficulty || difficulty === level ? questions : []
    ))
  ));
}

function pickQuestionsForTypeKeys(typeKeys, difficulty, seen, limit) {
  const picked = [];
  const usedIds = new Set();

  typeKeys.forEach((key) => {
    if (picked.length >= limit) {
      return;
    }

    const sameDifficulty = getAllBankQuestions(difficulty).filter((question) => getQuestionTypeKey(question) === key);
    const anyDifficulty = getAllBankQuestions().filter((question) => getQuestionTypeKey(question) === key);
    const candidates = preferUnseenQuestions(sameDifficulty.length ? sameDifficulty : anyDifficulty, seen, usedIds);
    if (candidates[0]) {
      picked.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
  });

  if (picked.length < limit) {
    typeKeys.forEach((key) => {
      if (picked.length >= limit) {
        return;
      }
      const lessonKey = key.split(":")[0];
      const lessonCandidates = getAllBankQuestions(difficulty).filter((question) => question.lessonKey && key.includes(question.lessonKey));
      preferUnseenQuestions(lessonCandidates, seen, usedIds).slice(0, limit - picked.length).forEach((question) => {
        picked.push(question);
        usedIds.add(question.id);
      });
    });
  }

  return picked;
}

function pickWarmupQuestions(cleanCorrectQuestions, difficulty, seen, limit) {
  const keys = uniqueStrings(cleanCorrectQuestions.map(getQuestionTypeKey));
  return pickQuestionsForTypeKeys(keys, difficulty, seen, limit);
}

function pickDifferentTypeQuestions({ difficulty, seen, excludeKeys = new Set(), limit = 8 }) {
  const candidates = getAllBankQuestions(difficulty)
    .filter((question) => !excludeKeys.has(getQuestionTypeKey(question)))
    .filter((question) => !seen.typeKeys.has(getQuestionTypeKey(question)) || !seen.lessonKeys.has(question.lessonKey));
  const fallback = getAllBankQuestions(difficulty).filter((question) => !excludeKeys.has(getQuestionTypeKey(question)));
  return preferUnseenQuestions(candidates.length ? candidates : fallback, seen, new Set()).slice(0, limit);
}

function preferUnseenQuestions(candidates, seen, usedIds = new Set()) {
  const shuffled = shuffle([...candidates]).filter((question) => !usedIds.has(question.id));
  const unseen = shuffled.filter((question) => !seen.ids.has(question.id) && !seen.prompts.has(question.prompt));
  return unseen.length ? unseen : shuffled;
}

function interleavePracticeQuestions(focusQuestions, warmupQuestions, extensionQuestions) {
  const result = [];
  const sources = [warmupQuestions, focusQuestions, focusQuestions.slice(1), extensionQuestions, focusQuestions.slice(2), warmupQuestions.slice(1)];
  sources.forEach((source) => {
    source.forEach((question) => {
      if (!result.some((item) => item.id === question.id)) {
        result.push(question);
      }
    });
  });
  return result;
}

function cloneQuestionForPersonalizedPractice(question, index, mode) {
  return {
    ...question,
    id: `${question.id || "personalized"}-review-${Date.now()}-${index}`,
    difficulty: question.difficulty || "mid",
    practiceMode: mode,
    variantKey: question.variantKey || getQuestionTypeKey(question) || `personalized:${index}`
  };
}

function buildAdvancedStoryChallengeQuestions(anchorRecord) {
  const seed = Number(anchorRecord.studentNumber || 1);
  const specs = [
    {
      category: "1-3",
      lessonKey: "1-3-core",
      variantKey: "advanced-story:add-sub-two-step",
      prompt: `하린이는 스티커 ${48 + seed}장을 가지고 있었습니다.\n친구에게 ${17 + seed % 4}장을 더 받고, 꾸미기에 ${26 + seed % 5}장을 썼습니다.\n하린이에게 남은 스티커는 모두 몇 장인가요?`,
      answer: `${48 + seed + 17 + seed % 4 - (26 + seed % 5)}장`,
      unit: "장",
      explanation: "처음 수에 더 받은 수를 더한 뒤, 쓴 수를 빼요."
    },
    {
      category: "2-4",
      lessonKey: "time-add-minutes",
      variantKey: "advanced-story:elapsed-time-two-step",
      prompt: "도서관 수업은 9시 35분에 시작했습니다.\n책 읽기를 25분 하고, 기록 쓰기를 15분 더 했습니다.\n수업이 끝난 시각은 몇 시 몇 분인가요?",
      answer: "10시 15분",
      distractors: ["10시 5분", "10시 10분", "9시 75분", "10시 25분"],
      explanation: "25분과 15분을 합쳐 40분 뒤 시각을 구해요."
    },
    {
      category: "2-2",
      lessonKey: "array-multiplication",
      variantKey: "advanced-story:multiply-plus",
      prompt: "한 모둠에 학생이 4명씩 앉았습니다.\n그런 모둠이 6개 있고, 발표 도우미 3명이 더 왔습니다.\n교실에 있는 학생은 모두 몇 명인가요?",
      answer: "27명",
      unit: "명",
      explanation: "4명씩 6모둠을 먼저 곱하고 3명을 더해요."
    },
    {
      category: "2-3",
      lessonKey: "meter-centimeter-convert",
      variantKey: "advanced-story:length-convert-two-step",
      prompt: "민지는 1m 20cm 리본을 가지고 있습니다.\n선물 포장에 45cm를 쓰고, 30cm를 더 이어 붙였습니다.\n리본은 이제 몇 cm인가요?",
      answer: "105cm",
      unit: "cm",
      explanation: "1m 20cm를 120cm로 바꾸고, 45cm를 뺀 뒤 30cm를 더해요."
    }
  ];

  return specs.map((spec, index) => makePersonalizedQuestion(spec, index));
}

function makePersonalizedQuestion(spec, index) {
  const answerText = String(spec.answer);
  const options = buildPersonalizedChoiceSet(answerText, spec.distractors, spec.unit);
  return {
    id: `personalized-${spec.variantKey}-${index}`,
    category: spec.category,
    unitId: spec.category,
    unitLabel: getCategoryName(spec.category),
    difficulty: "high",
    lessonKey: spec.lessonKey,
    variantKey: spec.variantKey,
    prompt: spec.prompt,
    sceneLines: spec.prompt.split("\n"),
    options,
    answer: options.indexOf(answerText),
    explanation: spec.explanation,
    feedback: {
      title: "문장을 줄별로 나누어 봐요.",
      diagnosis: "심화 문장제는 행동이 여러 번 나오므로 한 번에 계산하면 헷갈릴 수 있어요.",
      steps: [spec.explanation, "문장 한 줄마다 식을 하나씩 세우면 안정적으로 풀 수 있어요."],
      nextAction: "처음, 변화, 묻는 말을 줄마다 표시하세요."
    }
  };
}

function buildPersonalizedChoiceSet(answerText, distractors = [], unit = "") {
  const seen = new Set([answerText]);
  const choices = [answerText];
  (distractors || []).forEach((item) => {
    const text = String(item);
    if (choices.length < 5 && !seen.has(text)) {
      seen.add(text);
      choices.push(text);
    }
  });

  const parsed = answerText.match(/^(\d+)(.*)$/);
  if (parsed) {
    const base = Number(parsed[1]);
    const suffix = parsed[2] || unit || "";
    [1, -1, 5, -5, 10, -10, 15, -15].forEach((delta) => {
      const value = base + delta;
      const text = `${value}${suffix}`;
      if (value >= 0 && choices.length < 5 && !seen.has(text)) {
        seen.add(text);
        choices.push(text);
      }
    });
  }

  while (choices.length < 5) {
    const text = `${choices.length + 1}${unit}`;
    if (!seen.has(text)) {
      seen.add(text);
      choices.push(text);
    }
  }

  return shuffle(choices);
}

function buildLearningRecord(player, playerState, studentInfo) {
  const questionRecords = playerState.questionRecords.map((record) => ({
    ...record,
    attempts: record.attempts.map((attempt) => ({ ...attempt }))
  }));
  const questionCount = questionRecords.length;
  const avgQuestionTimeMs = questionCount ? Math.round(playerState.totalQuestionTimeMs / questionCount) : 0;
  const practiceMeta = state.practiceMode?.plansByPlayer?.[player.id] || null;
  const isPersonalizedPractice = Boolean(state.practiceMode?.active && practiceMeta);

  return {
    id: `${state.sessionId}-${player.id}`,
    sessionId: state.sessionId,
    savedAt: new Date().toISOString(),
    startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : "",
    endedAt: state.endedAt ? new Date(state.endedAt).toISOString() : "",
    classNumber: studentInfo.classNumber,
    studentNumber: studentInfo.studentNumber,
    studentKey: `${studentInfo.classNumber}반 ${studentInfo.studentNumber}번`,
    playerId: player.id,
    playerName: player.name,
    playerAvatar: player.avatar,
    category: isPersonalizedPractice ? "personalized-review" : state.category,
    categoryName: isPersonalizedPractice ? `맞춤 재도전 · ${practiceMeta.focusText}` : getSelectedScopeName(),
    lessonKey: isPersonalizedPractice ? "personalized-review" : state.lessonKey,
    lessonName: isPersonalizedPractice ? practiceMeta.focusText : getSelectedLessonOption()?.label || "",
    unitKeys: isPersonalizedPractice
      ? uniqueStrings(questionRecords.map((record) => record.category).filter(Boolean))
      : getQuestionUnitKeys(state.category),
    difficulty: playerState.difficulty,
    difficultyName: DIFFICULTY_NAMES[playerState.difficulty] || "",
    timer: state.timer,
    score: playerState.score,
    correct: playerState.correct,
    wrongSelections: playerState.wrong,
    totalAttempts: playerState.correct + playerState.wrong,
    questionCount,
    accuracyPercent: getRecordAccuracyPercent(questionRecords),
    avgQuestionTimeMs,
    retrySuccess: playerState.retrySuccess,
    finalWrong: playerState.finalWrong,
    feedbackShown: playerState.feedbackShown,
    feedbackConfirmed: playerState.feedbackConfirmed,
    practiceMode: isPersonalizedPractice ? "personalized-review" : "regular",
    practiceSourceRecordId: practiceMeta?.sourceRecordId || "",
    practiceFocusText: practiceMeta?.focusText || "",
    practicePlanMode: practiceMeta?.mode || "",
    practiceTargetTypes: cloneLearningRecordData(practiceMeta?.targetTypes || []),
    weakCategories: getWeakCategories(questionRecords),
    questionRecords
  };
}

function getWeakCategories(questionRecords) {
  const counts = questionRecords.reduce((accumulator, record) => {
    if (!record.finalCorrect || record.attemptCount > 1) {
      accumulator[record.categoryName] = (accumulator[record.categoryName] || 0) + 1;
    }
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
}

function getRecordAccuracyPercent(questionRecords) {
  if (!questionRecords.length) {
    return 0;
  }

  const correctCount = questionRecords.filter((record) => record.finalCorrect).length;
  return Math.round((correctCount / questionRecords.length) * 100);
}

function loadLearningRecords() {
  try {
    const rawRecords = window.localStorage.getItem(LEARNING_RECORDS_STORAGE_KEY);
    const parsedRecords = rawRecords ? JSON.parse(rawRecords) : [];
    return Array.isArray(parsedRecords) ? parsedRecords : [];
  } catch (error) {
    console.warn("학습 데이터 불러오기 실패", error);
    return [];
  }
}

function saveLearningRecords(records) {
  try {
    window.localStorage.setItem(LEARNING_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("학습 데이터 저장 실패", error);
    window.alert("브라우저 저장 공간에 결과를 저장하지 못했어요.");
  }
}

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${seconds}초`;
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createScoreState(players) {
  return players.reduce((accumulator, player) => {
    accumulator[player.id] = {
      difficulty: null,
      questionPool: [],
      score: 0,
      correct: 0,
      wrong: 0,
      retrySuccess: 0,
      finalWrong: 0,
      feedbackShown: 0,
      feedbackConfirmed: 0,
      currentQuestion: null,
      currentQuestionStartedAt: null,
      currentQuestionAttempts: [],
      currentQuestionRecordClosed: false,
      locked: false,
      lastAnswer: null,
      revealCorrect: null,
      lastOutcome: null,
      wrongAttemptsCurrent: 0,
      isCelebrating: false,
      celebrationText: "",
      isShaking: false,
      showExplanation: false,
      explanationTitle: "",
      explanationBody: "",
      retryHint: "",
      status: "난이도 고르기",
      history: [],
      variantHistory: [],
      questionRecords: [],
      totalQuestionTimeMs: 0,
      pendingHandle: null
    };
    return accumulator;
  }, {});
}

function clearTimers() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function clearPlayerDelays() {
  Object.values(state.scores).forEach((playerState) => {
    clearTimeout(playerState.pendingHandle);
    playerState.pendingHandle = null;
  });
}

function primeAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
}

function playAnimalSound(player) {
  if (!state.audioContext) {
    return;
  }

  const now = state.audioContext.currentTime + 0.01;
  const voice = player?.voice || "puppy";

  if (voice === "kitten") {
    scheduleAnimalTone("triangle", 820, 520, now, 0.32, 0.08);
    scheduleAnimalTone("triangle", 620, 760, now + 0.17, 0.18, 0.05);
    return;
  }

  if (voice === "chick") {
    [0, 0.09, 0.18].forEach((offset) => {
      scheduleAnimalTone("sine", 1280, 980, now + offset, 0.09, 0.045);
    });
    return;
  }

  if (voice === "duck") {
    scheduleAnimalTone("sawtooth", 520, 240, now, 0.16, 0.07);
    scheduleAnimalTone("sawtooth", 420, 210, now + 0.15, 0.16, 0.07);
    return;
  }

  if (voice === "frog") {
    scheduleAnimalTone("square", 210, 120, now, 0.2, 0.08);
    scheduleAnimalTone("square", 180, 105, now + 0.16, 0.22, 0.08);
    return;
  }

  scheduleAnimalTone("square", 340, 180, now, 0.12, 0.08);
  scheduleAnimalTone("square", 280, 150, now + 0.14, 0.12, 0.08);
}

function scheduleAnimalTone(type, startFrequency, endFrequency, startTime, duration, peakGain) {
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, endFrequency), startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function triggerWrongAnswerFeedback() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([90, 50, 90]);
  }
}

function triggerCelebration(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    return;
  }

  celebrationBanner.textContent = `${player.name} 정답!`;
  celebrationBanner.classList.add("is-active");
  celebrationLayer.innerHTML = Array.from({ length: 10 }, (_, index) => {
    const left = 8 + (index * 9);
    const delay = index * 0.05;
    const color = ["#ff8f3f", "#ffd565", "#1bb6a5", "#2d70f4", "#9b7cff"][index % 5];
    return `
      <span style="
        position:absolute;
        left:${left}%;
        top:-24px;
        width:12px;
        height:12px;
        border-radius:4px;
        background:${color};
        transform:rotate(${index * 18}deg);
        animation:fall-shape 900ms ease ${delay}s forwards;
      "></span>
    `;
  }).join("");

  window.setTimeout(() => resetCelebration(), 850);
}

function resetCelebration() {
  celebrationLayer.innerHTML = "";
  celebrationBanner.classList.remove("is-active");
  celebrationBanner.textContent = "";
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.error("전체 화면 전환 실패", error);
  }
}

function syncFullscreenButton() {
  fullscreenButton.textContent = document.fullscreenElement ? "전체 화면 종료" : "전체 화면";
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function renderScene(scene) {
  if (!scene) {
    return "";
  }

  if (scene.type === "image") {
    return `
      <div class="scene-shell scene-image-shell">
        <img class="scene-image" src="${scene.src}" alt="${scene.alt || "문제 그림"}">
      </div>
    `;
  }

  if (scene.type === "svg") {
    return `
      <div class="scene-shell scene-svg-shell ${scene.className || ""}">
        <svg class="scene-illustration" viewBox="${scene.viewBox || "0 0 320 220"}" role="img" aria-label="${scene.alt || "문제 그림"}">
          ${scene.markup}
        </svg>
      </div>
    `;
  }

  if (scene.type === "single") {
    return `<div class="scene-shell scene-single-shell"><div class="shape-single">${shapeSVG(scene.item, "shape-svg")}</div></div>`;
  }

  if (scene.type === "grid") {
    return `
      <div class="scene-shell scene-grid-shell">
        <div class="shape-grid" style="--columns:${scene.columns || 4}">
          ${scene.items.map((item) => `
            <div class="shape-card">
              ${shapeSVG(item, "shape-svg")}
              ${item.label ? `<small>${item.label}</small>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (scene.type === "clues") {
    return `
      <div class="scene-shell scene-clue-shell">
        <div class="clue-stack">${scene.lines.map((line) => `<div class="clue-pill">${line}</div>`).join("")}</div>
      </div>
    `;
  }

  if (scene.type === "groupCount") {
    return `
      <div class="scene-shell scene-group-shell">
        <div class="shape-grid" style="--columns:${scene.groups.length}">
          ${scene.groups.map((group) => `
            <div class="shape-card">
              <small>${group.label}</small>
              <div class="shape-grid" style="--columns:1">
                ${group.items.map((item) => `<div class="shape-card">${shapeSVG(item, "shape-svg")}</div>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  return "";
}

function shapeSVG(item, className, options = {}) {
  const fill = SHAPE_FILL[item.kind] || "#8a94a6";
  const rotate = item.rotate || 0;
  const label = options.showLabel && item.label
    ? `<text x="50" y="95" text-anchor="middle" font-size="12" fill="#5a6570" font-weight="700">${escapeHtml(item.label)}</text>`
    : "";

  const wrappers = {
    triangle: `<polygon points="50,10 88,82 12,82" fill="${fill}" />`,
    "triangle-right": `<polygon points="18,16 18,84 84,84" fill="${fill}" />`,
    square: `<rect x="18" y="18" width="64" height="64" fill="${fill}" />`,
    rectangle: `<rect x="12" y="26" width="76" height="48" fill="${fill}" />`,
    diamond: `<polygon points="50,10 88,50 50,90 12,50" fill="${fill}" />`,
    trapezoid: `<polygon points="24,20 76,20 90,82 10,82" fill="${fill}" />`,
    circle: `<circle cx="50" cy="50" r="34" fill="${fill}" />`,
    oval: `<ellipse cx="50" cy="50" rx="38" ry="28" fill="${fill}" />`,
    semicircle: `<path d="M15,68 A35,35 0 0 1 85,68 L15,68 Z" fill="${fill}" />`,
    pentagon: `<polygon points="50,10 88,36 74,82 26,82 12,36" fill="${fill}" />`,
    "open-triangle": `<polyline points="50,12 88,82 18,82" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />`,
    "open-quad": `<polyline points="18,18 82,18 82,82 36,82" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />`
  };

  return `
    <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(${rotate} 50 50)">
        ${wrappers[item.kind] || wrappers.circle}
      </g>
      ${label}
    </svg>
  `;
}
