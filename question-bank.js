(function () {
  const BLOG_URL = "https://blog.naver.com/bojogaesam-ai-class";
  const OPTION_LABELS = ["1", "2", "3", "4", "5"];

  const CATEGORY_OPTIONS = [
    { value: "mixed", label: "전단원 랜덤", description: "1학기와 2학기 전체 복습" },
    { value: "1-1", label: "1학기 1단원", description: "세 자리 수" },
    { value: "1-2", label: "1학기 2단원", description: "여러 가지 도형" },
    { value: "1-3", label: "1학기 3단원", description: "덧셈과 뺄셈" },
    { value: "1-4", label: "1학기 4단원", description: "길이 재기" },
    { value: "1-5", label: "1학기 5단원", description: "분류하기" },
    { value: "1-6", label: "1학기 6단원", description: "곱셈" },
    { value: "2-1", label: "2학기 1단원", description: "네 자리 수" },
    { value: "2-2", label: "2학기 2단원", description: "곱셈구구" },
    { value: "2-3", label: "2학기 3단원", description: "길이 재기" },
    { value: "2-4", label: "2학기 4단원", description: "시각과 시간" },
    { value: "2-5", label: "2학기 5단원", description: "표와 그래프" },
    { value: "2-6", label: "2학기 6단원", description: "규칙 찾기" },
  ];

  const LESSON_OPTIONS_BY_CATEGORY = {
    "1-1": [
      { value: "hundreds-place-value", label: "1차시 자릿값", description: "100, 10, 1의 개수로 세 자리 수 읽기" },
      { value: "hundreds-compose-neighbor", label: "2차시 수의 구성", description: "전개식, 바로 앞뒤 수, 수의 순서 확인" },
      { value: "hundreds-compare", label: "3차시 수 비교", description: "백·십·일의 자리 순서로 큰 수 찾기" },
      { value: "1-1-core", label: "핵심 심화", description: "가까운 몇백, 빈칸 전개식, 세 수 배열" }
    ],
    "1-2": [
      { value: "shape-features", label: "1차시 도형 성질", description: "변, 꼭짓점, 굽은 선으로 도형 구별" },
      { value: "1-2-core", label: "2차시 생활 속 도형", description: "물건의 바깥 윤곽을 도형으로 연결" },
      { value: "shape-compose-stack", label: "3차시 칠교·쌓기", description: "칠교 조각과 쌓기나무를 보고 세기" },
      { value: "shape-pattern", label: "핵심 규칙", description: "도형 반복 규칙을 찾아 다음 모양 고르기" }
    ],
    "1-3": [
      { value: "addition-regrouping", label: "1차시 덧셈", description: "받아올림이 있거나 없는 덧셈 계산" },
      { value: "subtraction-regrouping", label: "2차시 뺄셈", description: "받아내림이 있거나 없는 뺄셈 계산" },
      { value: "missing-addend", label: "3차시 빈칸식", description: "전체와 부분 관계로 □ 찾기" },
      { value: "1-3-core", label: "문장제", description: "더 받은 것, 쓴 것, 모두를 식으로 바꾸기" }
    ],
    "1-4": [
      { value: "ruler-zero-ten", label: "1차시 자로 재기", description: "0 눈금과 시작 눈금을 확인해 길이 재기" },
      { value: "length-compare", label: "2차시 길이 비교", description: "두 길이의 차를 빼기로 구하기" },
      { value: "length-join", label: "3차시 길이 계산", description: "이어 붙이고 자르는 길이 문장제" },
      { value: "length-estimate", label: "4차시 어림", description: "상황에 알맞은 cm 길이를 고르기" },
      { value: "1-4-core", label: "핵심 심화", description: "전체-부분 길이와 시작 눈금 문제" }
    ],
    "1-5": [
      { value: "table-row-read", label: "1차시 표 읽기", description: "분류한 자료에서 항목과 수 읽기" },
      { value: "classify-compare", label: "2차시 분류 비교", description: "가장 많음, 차이, 분류 기준 판단" }
    ],
    "1-6": [
      { value: "equal-groups", label: "1차시 같은 수 묶음", description: "몇 개씩 몇 묶음인지 그림으로 세기" },
      { value: "repeated-addition", label: "2차시 곱셈식", description: "반복 덧셈을 곱셈식으로 나타내기" },
      { value: "1-6-core", label: "핵심 활용", description: "전체 수에 맞는 묶음 찾기" }
    ],
    "2-1": [
      { value: "thousands-place-value", label: "1차시 네 자리 수", description: "1000, 100, 10, 1의 자릿값 읽기" },
      { value: "2-1-core", label: "2차시 수의 순서", description: "바로 앞뒤 수와 이웃 수 찾기" },
      { value: "thousands-compare-boundary", label: "3차시 비교와 경계", description: "네 자리 수 비교, 가까운 몇백 찾기" }
    ],
    "2-2": [
      { value: "array-multiplication", label: "1차시 배열 곱셈", description: "한 줄의 수와 줄 수를 곱셈으로 연결" },
      { value: "multiplication-table-zero-one", label: "2차시 0과 1의 곱", description: "곱셈표에서 0, 1, 구구단 확인" },
      { value: "missing-factor", label: "3차시 빈칸 곱셈", description: "곱셈식의 빠진 수 찾기" }
    ],
    "2-3": [
      { value: "meter-length-estimate", label: "1차시 길이 어림", description: "m와 cm에 알맞은 실제 길이 고르기" },
      { value: "meter-centimeter-convert", label: "2차시 m와 cm", description: "100cm 묶음으로 단위 바꾸기" },
      { value: "long-length-compare-unit", label: "3차시 길이 비교", description: "긴 길이의 차와 알맞은 단위 판단" },
      { value: "2-3-core", label: "핵심 활용", description: "목표 길이까지 더 필요한 cm 구하기" }
    ],
    "2-4": [
      { value: "time-elapsed-clock", label: "1차시 시각 읽기", description: "긴바늘과 짧은바늘, 반 시각 읽기" },
      { value: "time-add-minutes", label: "2차시 몇 분 뒤", description: "분침 이동으로 뒤 시각 구하기" },
      { value: "time-day-cycle", label: "3차시 하루", description: "오전, 오후, 24시간 흐름 이해" },
      { value: "time-calendar", label: "4차시 달력", description: "요일, 날짜, 며칠 차이 계산" },
      { value: "2-4-core", label: "핵심 확인", description: "정각과 반 시각 표현 확인" }
    ],
    "2-5": [
      { value: "graph-row-read", label: "1차시 표 읽기", description: "표에서 항목과 수를 정확히 읽기" },
      { value: "graph-create", label: "2차시 표와 그래프", description: "조사 자료를 표와 그래프로 나타내기" },
      { value: "graph-interpret", label: "3차시 자료 해석", description: "가장 많음, 가장 적음, 차이, 전체 구하기" },
      { value: "2-5-core", label: "핵심 활용", description: "표를 그래프로 옮기는 칸 수 확인" }
    ],
    "2-6": [
      { value: "pattern-rule", label: "1차시 수·도형 규칙", description: "반복 묶음과 수 사이 변화를 찾기" },
      { value: "pattern-table-life", label: "2차시 표·생활 규칙", description: "덧셈표, 곱셈표, 쌓기, 동작 규칙 찾기" }
    ]
  };

  const TIMER_OPTIONS = [
    { value: 30, label: "30초", description: "짧은 집중" },
    { value: 60, label: "60초", description: "기본 게임" },
    { value: 90, label: "90초", description: "여유 있게" },
    { value: 120, label: "120초", description: "전체 복습" },
  ];

  const PLAYER_COUNT_OPTIONS = [
    { value: 1, label: "1명", description: "혼자 연습" },
    { value: 2, label: "2명", description: "대표 대결" },
    { value: 3, label: "3명", description: "소그룹" },
    { value: 4, label: "4명", description: "모둠 대결" },
    { value: 5, label: "5명", description: "기본 구성" },
  ];

  const DIFFICULTY_OPTIONS = [
    { value: "low", label: "기초", description: "하 · 그림으로 바로 확인", score: 1 },
    { value: "mid", label: "기본", description: "중 · 대표 풀이 적용", score: 2 },
    { value: "high", label: "심화", description: "상 · 빈칸·비교·변환", score: 3 },
  ];

  const CATEGORY_NAMES = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [item.value, item.label]));
  const DIFFICULTY_NAMES = Object.fromEntries(DIFFICULTY_OPTIONS.map((item) => [item.value, item.label]));
  const SCORE_BY_DIFFICULTY = Object.fromEntries(DIFFICULTY_OPTIONS.map((item) => [item.value, item.score]));

  const PLAYER_COLORS = [
    "linear-gradient(150deg, #08324a 0%, #0f6a7a 44%, #21b89f 72%, #5bd489 100%)",
    "linear-gradient(150deg, #0b2848 0%, #165d79 42%, #1a8db3 72%, #78d9ff 100%)",
    "linear-gradient(150deg, #3f2a14 0%, #7f5123 42%, #d47a36 72%, #ffbe6a 100%)",
    "linear-gradient(150deg, #0e2741 0%, #14507b 44%, #2a75d8 70%, #6ad4ff 100%)",
    "linear-gradient(150deg, #4a2314 0%, #8a4322 38%, #cf6848 68%, #ffb48a 100%)",
    "linear-gradient(150deg, #16314a 0%, #20586d 40%, #3c9c9f 70%, #89efd0 100%)",
  ];

  const ANIMAL_PLAYERS = ["🚀", "🌟", "🧩", "💎", "🎯", "🔢"];
  const STUDENT_NAMES = ["민지", "서준", "지우", "하람", "수아", "도윤", "예나", "현우", "다은", "민준"];
  const COUNT_ITEMS = ["구슬", "스티커", "연필", "카드", "별", "사탕", "책"];

  const UNIT_GENERATORS = {
    "1-1": [threeDigitPlaceValue, threeDigitRead, threeDigitCompare, skipCounting],
    "1-2": [shapeName, shapeParts, shapePick],
    "1-3": [addEquation, subEquation, missingAddend, storyAddSub],
    "1-4": [lengthCompare, lengthUnit, lengthAdd],
    "1-5": [classificationRule, classifyCount, tableQuestion],
    "1-6": [groupCounting, repeatedAddition, timesAsMany],
    "2-1": [fourDigitPlaceValue, fourDigitCompose, fourDigitCompare],
    "2-2": [multiplicationTable, missingFactor, tablePattern],
    "2-3": [meterCentimeter, lengthDifference, lengthConvert],
    "2-4": [readClock, elapsedTime, addMinutes, calendarQuestion],
    "2-5": [graphMost, graphDifference, tableTotal],
    "2-6": [numberPattern, shapePattern, operationPattern],
  };

  const WEEKDAY_NAMES = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

  function createPlayers(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `${index + 1}번`,
      animal: ANIMAL_PLAYERS[index % ANIMAL_PLAYERS.length],
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      soundText: ["딩동", "반짝", "좋아요", "정확해", "성공", "멋져"][index % 6],
    }));
  }

  function hasHangulFinalConsonant(word) {
    const last = String(word).trim().charCodeAt(String(word).trim().length - 1);
    if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) {
      return false;
    }

    return (last - 0xac00) % 28 !== 0;
  }

  function objectParticle(word) {
    return hasHangulFinalConsonant(word) ? "을" : "를";
  }

  function topicParticle(word) {
    return hasHangulFinalConsonant(word) ? "은" : "는";
  }

  function andParticle(word) {
    return hasHangulFinalConsonant(word) ? "과" : "와";
  }

  function createQuestion(category, difficulty, seed = Date.now()) {
    const unitId = category === "mixed" ? pick(Object.keys(UNIT_GENERATORS)) : category;
    const generator = pick(UNIT_GENERATORS[unitId] || UNIT_GENERATORS["1-3"]);
    const raw = generator(difficulty);
    const unit = CATEGORY_OPTIONS.find((item) => item.value === unitId);
    const answerText = String(raw.answer);
    const options = buildFiveChoiceSet(answerText, raw.distractors || []);
    return {
      id: `${unitId}-${difficulty}-${seed}-${Math.random().toString(16).slice(2)}`,
      unitId,
      unitLabel: unit ? `${unit.label} · ${unit.description}` : "전단원",
      difficulty,
      prompt: raw.prompt,
      sceneLines: raw.sceneLines || [],
      options,
      answer: options.indexOf(answerText),
      explanation: raw.explanation || "단위를 확인하고 차근차근 계산해요.",
    };
  }

  function buildFiveChoiceSet(answerText, distractors) {
    const seen = new Set([answerText]);
    const list = [answerText];
    shuffle(distractors.map(String)).forEach((item) => {
      if (list.length < 5 && !seen.has(item)) {
        seen.add(item);
        list.push(item);
      }
    });
    const parsed = answerText.match(/^(\d+)(.*)$/);
    let base = parsed ? Number(parsed[1]) : null;
    let suffix = parsed ? parsed[2] : "";
    let step = 1;
    while (list.length < 5 && base !== null && step < 40) {
      [base + step, base - step, base + step * 2].forEach((value) => {
        const text = `${value}${suffix}`;
        if (value >= 0 && list.length < 5 && !seen.has(text)) {
          seen.add(text);
          list.push(text);
        }
      });
      step += 1;
    }
    while (list.length < 5) {
      const text = String(rand(1, 99));
      if (!seen.has(text)) {
        seen.add(text);
        list.push(text);
      }
    }
    return shuffle(list);
  }

  function numberChoices(answer, min = 0, max = 9999) {
    return [-20, -10, -5, -2, -1, 1, 2, 5, 10, 20, 100, -100]
      .map((delta) => answer + delta)
      .filter((value) => value >= min && value <= max && value !== answer);
  }

  function withSuffix(values, suffix) {
    return values.map((value) => `${value}${suffix}`);
  }

  function threeDigitPlaceValue() {
    const n = rand(200, 899);
    const digits = String(n).split("").map(Number);
    const places = [["백", digits[0] * 100], ["십", digits[1] * 10], ["일", digits[2]]];
    const [place, answer] = pick(places);
    return {
      prompt: `${n}에서 ${place}의 자리 숫자가 나타내는 값은?`,
      answer,
      distractors: numberChoices(answer, 0, 900),
      sceneLines: [`백 ${digits[0]} · 십 ${digits[1]} · 일 ${digits[2]}`],
      explanation: "자리 이름과 숫자가 나타내는 값을 함께 봅니다.",
    };
  }

  function threeDigitRead() {
    const n = rand(200, 899);
    return {
      prompt: `${n}은 100이 몇 개, 10이 몇 개, 1이 몇 개인 수인가요?`,
      answer: `${Math.floor(n / 100)}, ${Math.floor((n % 100) / 10)}, ${n % 10}`,
      distractors: [`${Math.floor(n / 100)}, ${n % 10}, ${Math.floor((n % 100) / 10)}`, `${Math.floor(n / 100) + 1}, ${Math.floor((n % 100) / 10)}, ${n % 10}`, `${Math.floor(n / 100)}, ${Math.floor((n % 100) / 10) + 1}, ${n % 10}`],
      sceneLines: ["보기는 '100의 개수, 10의 개수, 1의 개수' 순서입니다."],
      explanation: "세 자리 수를 백, 십, 일로 나눕니다.",
    };
  }

  function threeDigitCompare() {
    const a = rand(120, 980);
    const b = different(rand(120, 980), a);
    return {
      prompt: `${a}와 ${b} 중 더 큰 수는?`,
      answer: Math.max(a, b),
      distractors: [Math.min(a, b), a + b, Math.abs(a - b), Math.max(a, b) - 10],
      sceneLines: ["백의 자리부터 차례대로 비교해요."],
      explanation: "큰 자리부터 비교하면 빠릅니다.",
    };
  }

  function skipCounting() {
    const start = rand(120, 620);
    const step = pick([10, 100]);
    const answer = start + step * 3;
    return {
      prompt: `${start}에서 ${step}씩 세 번 뛰어 세면?`,
      answer,
      distractors: numberChoices(answer, 0, 999),
      sceneLines: [`${start} → ${start + step} → ${start + step * 2} → ?`],
      explanation: "같은 크기만큼 세 번 더합니다.",
    };
  }

  function shapeName() {
    const target = pick([
      ["삼각형", "변 3개, 꼭짓점 3개"],
      ["사각형", "변 4개, 꼭짓점 4개"],
      ["원", "둥근 모양"],
    ]);
    return {
      prompt: `${target[1]}인 도형의 이름은?`,
      answer: target[0],
      distractors: ["삼각형", "사각형", "원", "오각형"],
      sceneLines: ["변과 꼭짓점을 세어 보세요."],
      explanation: "도형의 특징을 이름과 연결합니다.",
    };
  }

  function shapeParts() {
    const target = pick([["삼각형", 3], ["사각형", 4]]);
    return {
      prompt: `${target[0]}의 꼭짓점은 몇 개인가요?`,
      answer: `${target[1]}개`,
      distractors: ["0개", "2개", "3개", "4개", "5개"],
      sceneLines: [`${target[0]}의 모서리가 만나는 점을 세어 봅니다.`],
      explanation: "꼭짓점은 변과 변이 만나는 점입니다.",
    };
  }

  function shapePick() {
    return {
      prompt: "삼각형을 모두 고른 것은?",
      answer: "가, 다",
      distractors: ["가, 나", "나, 라", "다, 라", "가, 다", "나, 다"],
      sceneLines: ["가: 삼각형 · 나: 원 · 다: 삼각형 · 라: 사각형"],
      explanation: "변이 3개인 도형만 찾습니다.",
    };
  }

  function addEquation(difficulty) {
    const a = difficulty === "low" ? rand(12, 48) : rand(35, 89);
    const b = difficulty === "high" ? rand(18, 57) : rand(6, 34);
    return {
      prompt: `${a}+${b}의 값은?`,
      answer: a + b,
      distractors: numberChoices(a + b, 0, 160),
      sceneLines: ["일의 자리부터 계산해요.", "10이 넘으면 십의 자리로 받아올려요."],
      explanation: "일의 자리와 십의 자리를 나누어 계산합니다.",
    };
  }

  function subEquation(difficulty) {
    const a = difficulty === "low" ? rand(35, 78) : rand(62, 130);
    const b = rand(6, Math.min(58, a - 8));
    return {
      prompt: `${a}-${b}의 값은?`,
      answer: a - b,
      distractors: numberChoices(a - b, 0, 140),
      sceneLines: ["일의 자리에서 뺄 수 없으면 받아내림을 생각해요."],
      explanation: "큰 수에서 작은 수를 빼고 검산해 봅니다.",
    };
  }

  function missingAddend() {
    const missing = rand(8, 46);
    const add = rand(9, 38);
    return {
      prompt: `□+${add}=${missing + add}입니다. □에 알맞은 수는?`,
      answer: missing,
      distractors: numberChoices(missing, 0, 90),
      sceneLines: ["모르는 수는 전체에서 아는 수를 빼서 찾을 수 있어요."],
      explanation: "덧셈과 뺄셈의 관계를 이용합니다.",
    };
  }

  function storyAddSub(difficulty) {
    const name = pick(STUDENT_NAMES);
    const item = pick(COUNT_ITEMS);
    const start = rand(18, difficulty === "high" ? 76 : 48);
    const change = rand(5, 28);
    const add = Math.random() > 0.5;
    return {
      prompt: `${name}가 ${item} ${start}개를 가지고 ${add ? `${change}개를 더 받았습니다` : `${change}개를 썼습니다`}. 지금은 몇 개인가요?`,
      answer: add ? start + change : start - change,
      distractors: numberChoices(add ? start + change : start - change, 0, 120),
      sceneLines: [add ? "더 받으면 덧셈" : "쓰거나 없어지면 뺄셈"],
      explanation: "문장 속 변화가 더하기인지 빼기인지 먼저 정합니다.",
    };
  }

  function lengthCompare() {
    const a = rand(3, 11);
    const b = different(rand(3, 11), a);
    return {
      prompt: `가 ${a} cm, 나 ${b} cm입니다. 더 긴 것은?`,
      answer: a > b ? "가" : "나",
      distractors: ["가", "나", "둘 다 같음", "알 수 없음"],
      sceneLines: ["같은 단위끼리 수를 비교합니다."],
      explanation: "cm가 클수록 더 깁니다.",
    };
  }

  function lengthUnit() {
    const target = pick([["연필", "cm"], ["교실 문", "m"], ["책상", "cm"], ["복도", "m"]]);
    return {
      prompt: `${target[0]}의 길이를 나타내기에 알맞은 단위는?`,
      answer: target[1],
      distractors: ["cm", "m", "kg", "분", "개"],
      sceneLines: ["짧은 물건은 cm, 긴 거리는 m를 많이 씁니다."],
      explanation: "물건의 실제 크기를 떠올려 봅니다.",
    };
  }

  function lengthAdd() {
    const a = rand(12, 48);
    const b = rand(5, 37);
    return {
      prompt: `${a} cm와 ${b} cm를 이으면 모두 몇 cm인가요?`,
      answer: `${a + b} cm`,
      distractors: withSuffix(numberChoices(a + b, 0, 120), " cm"),
      sceneLines: ["같은 cm 단위이므로 수끼리 더합니다."],
      explanation: "단위가 같으면 숫자를 더합니다.",
    };
  }

  function classificationRule() {
    const rule = pick([
      ["날 수 있는 것", ["새", "나비"], ["의자", "공책"]],
      ["과일", ["사과", "바나나"], ["칠판", "연필"]],
      ["교실 물건", ["책상", "칠판"], ["구름", "강"]],
    ]);
    return {
      prompt: `'${rule[0]}'으로 분류되는 것은?`,
      answer: rule[1].join(", "),
      distractors: [rule[2].join(", "), [rule[1][0], rule[2][0]].join(", "), [rule[2][1], rule[1][1]].join(", ")],
      sceneLines: ["누가 보아도 같은 기준으로 나눌 수 있어야 해요."],
      explanation: "분류 기준에 맞는 것만 고릅니다.",
    };
  }

  function classifyCount() {
    const red = rand(3, 8);
    const blue = rand(2, 7);
    return {
      prompt: `빨간 카드 ${red}장, 파란 카드 ${blue}장입니다. 카드는 모두 몇 장인가요?`,
      answer: `${red + blue}장`,
      distractors: withSuffix(numberChoices(red + blue, 1, 20), "장"),
      sceneLines: ["분류한 수를 합해 전체 수를 구합니다."],
      explanation: "각 분류의 개수를 더합니다.",
    };
  }

  function tableQuestion() {
    const values = [["축구", rand(3, 8)], ["피구", rand(2, 8)], ["달리기", rand(1, 7)]];
    const top = values.slice().sort((a, b) => b[1] - a[1])[0];
    return {
      prompt: "표에서 가장 많은 학생이 고른 것은?",
      answer: top[0],
      distractors: values.map((v) => v[0]).concat("없음"),
      sceneLines: values.map((v) => `${v[0]} ${v[1]}명`),
      explanation: "표의 수를 비교합니다.",
    };
  }

  function groupCounting() {
    const groups = rand(2, 6);
    const each = rand(2, 5);
    return {
      prompt: `${each}개씩 ${groups}묶음이면 모두 몇 개인가요?`,
      answer: groups * each,
      distractors: numberChoices(groups * each, 1, 40),
      sceneLines: [`${each}+${each}+...을 ${groups}번 생각해요.`],
      explanation: "묶음 수와 한 묶음의 수를 곱합니다.",
    };
  }

  function repeatedAddition() {
    const each = rand(2, 6);
    const groups = rand(3, 5);
    return {
      prompt: `${Array(groups).fill(each).join("+")}을 곱셈식으로 나타내면?`,
      answer: `${each}×${groups}`,
      distractors: [`${groups}×${each}`, `${each}+${groups}`, `${groups}-${each}`, `${each}×${groups + 1}`],
      sceneLines: ["같은 수가 몇 번 더해졌는지 봅니다."],
      explanation: "같은 수의 반복덧셈은 곱셈으로 나타냅니다.",
    };
  }

  function timesAsMany() {
    const base = rand(2, 6);
    const times = rand(2, 5);
    return {
      prompt: `${base}의 ${times}배는 얼마인가요?`,
      answer: base * times,
      distractors: numberChoices(base * times, 1, 40),
      sceneLines: [`${base}를 ${times}번 더해도 같아요.`],
      explanation: "몇 배는 곱셈으로 구합니다.",
    };
  }

  function fourDigitPlaceValue() {
    const n = rand(1200, 9380);
    const digits = String(n).split("").map(Number);
    const places = [["천", digits[0] * 1000], ["백", digits[1] * 100], ["십", digits[2] * 10], ["일", digits[3]]];
    const [place, answer] = pick(places);
    return {
      prompt: `${n}에서 ${place}의 자리 숫자가 나타내는 값은?`,
      answer,
      distractors: numberChoices(answer, 0, 9000),
      sceneLines: [`천 ${digits[0]} · 백 ${digits[1]} · 십 ${digits[2]} · 일 ${digits[3]}`],
      explanation: "네 자리 수를 천, 백, 십, 일로 나누어 봅니다.",
    };
  }

  function fourDigitCompose() {
    const th = rand(1, 8);
    const h = rand(0, 9);
    const t = rand(0, 9);
    const o = rand(0, 9);
    const answer = th * 1000 + h * 100 + t * 10 + o;
    return {
      prompt: `1000이 ${th}개, 100이 ${h}개, 10이 ${t}개, 1이 ${o}개인 수는?`,
      answer,
      distractors: numberChoices(answer, 1000, 9999),
      sceneLines: ["천, 백, 십, 일의 값을 모두 더합니다."],
      explanation: "각 자리의 값을 더하면 수가 됩니다.",
    };
  }

  function fourDigitCompare() {
    const a = rand(1000, 9999);
    const b = different(rand(1000, 9999), a);
    return {
      prompt: `${a}와 ${b} 중 더 큰 수는?`,
      answer: Math.max(a, b),
      distractors: [Math.min(a, b), Math.abs(a - b), a + b, Math.max(a, b) - 100],
      sceneLines: ["천의 자리부터 차례대로 비교합니다."],
      explanation: "큰 자리부터 비교하면 빠릅니다.",
    };
  }

  function multiplicationTable() {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return {
      prompt: `${a}×${b}의 값은?`,
      answer: a * b,
      distractors: numberChoices(a * b, 1, 90),
      sceneLines: [`${a}단을 떠올려 봅니다.`],
      explanation: "구구단을 이용해 곱을 찾습니다.",
    };
  }

  function missingFactor() {
    const a = rand(2, 9);
    const b = rand(2, 9);
    return {
      prompt: `${a}×□=${a * b}입니다. □는?`,
      answer: b,
      distractors: numberChoices(b, 1, 9),
      sceneLines: ["곱셈구구에서 빠진 수를 찾습니다."],
      explanation: "몇을 곱해야 주어진 곱이 되는지 봅니다.",
    };
  }

  function tablePattern() {
    const dan = rand(2, 9);
    const start = rand(2, 5);
    const answer = dan * (start + 3);
    return {
      prompt: `${dan}단 규칙입니다. 빈칸에 알맞은 수는?`,
      answer,
      distractors: numberChoices(answer, 2, 90),
      sceneLines: [`${dan * start}, ${dan * (start + 1)}, ${dan * (start + 2)}, ?`],
      explanation: `계속 ${dan}씩 커집니다.`,
    };
  }

  function meterCentimeter() {
    const m = rand(1, 4);
    const cm = rand(5, 80);
    const answer = m * 100 + cm;
    return {
      prompt: `${m} m ${cm} cm는 몇 cm인가요?`,
      answer: `${answer} cm`,
      distractors: withSuffix(numberChoices(answer, 0, 600), " cm"),
      sceneLines: ["1 m = 100 cm"],
      explanation: "m를 cm로 바꾼 뒤 더합니다.",
    };
  }

  function lengthDifference() {
    const a = rand(120, 450);
    const b = rand(40, a - 20);
    return {
      prompt: `${a} cm에서 ${b} cm를 빼면?`,
      answer: `${a - b} cm`,
      distractors: withSuffix(numberChoices(a - b, 0, 500), " cm"),
      sceneLines: ["같은 cm 단위끼리 뺍니다."],
      explanation: "길이의 차는 뺄셈으로 구합니다.",
    };
  }

  function lengthConvert() {
    const cm = rand(110, 590);
    const m = Math.floor(cm / 100);
    const rest = cm % 100;
    return {
      prompt: `${cm} cm를 m와 cm로 나타내면?`,
      answer: `${m} m ${rest} cm`,
      distractors: [`${rest} m ${m} cm`, `${m + 1} m ${rest} cm`, `${m} m ${rest + 10} cm`, `${m} m ${Math.max(0, rest - 10)} cm`],
      sceneLines: ["100 cm씩 묶으면 1 m가 됩니다."],
      explanation: "100 cm 단위로 나눕니다.",
    };
  }

  function readClock() {
    const hour = rand(1, 12);
    const minute = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    return {
      prompt: `시계가 ${hour}시 ${minute}분을 가리킵니다. 바른 시각은?`,
      answer: `${hour}시 ${minute}분`,
      distractors: timeDistractors(hour, minute),
      sceneLines: ["긴바늘 한 칸은 5분입니다."],
      explanation: "짧은바늘은 시, 긴바늘은 분을 봅니다.",
    };
  }

  function elapsedTime() {
    const hour = rand(1, 10);
    const elapsed = pick([10, 20, 30, 40, 50]);
    return {
      prompt: `${hour}시에서 ${elapsed}분이 지나면?`,
      answer: `${hour}시 ${elapsed}분`,
      distractors: timeDistractors(hour, elapsed),
      sceneLines: ["분만큼 뒤로 이동합니다."],
      explanation: "지난 시간을 분으로 더합니다.",
    };
  }

  function addMinutes() {
    const hour = rand(1, 10);
    const minute = pick([5, 10, 15, 20, 25, 30]);
    const add = pick([10, 15, 20, 30]);
    const total = hour * 60 + minute + add;
    const answerHour = Math.floor(total / 60);
    const answerMinute = total % 60;
    return {
      prompt: `${hour}시 ${minute}분에서 ${add}분 뒤는?`,
      answer: `${answerHour}시 ${answerMinute}분`,
      distractors: timeDistractors(answerHour, answerMinute),
      sceneLines: ["60분이 되면 1시간이 됩니다."],
      explanation: "분을 더하고 60분을 넘는지 확인합니다.",
    };
  }

  function calendarQuestion() {
    const mode = pick(["weekday", "days-after", "date-difference"]);
    if (mode === "weekday") {
      const startIndex = rand(0, WEEKDAY_NAMES.length - 1);
      const offset = pick([1, 2, 3, 4, 5]);
      const answerIndex = (startIndex + offset) % WEEKDAY_NAMES.length;
      const answer = WEEKDAY_NAMES[answerIndex];
      return {
        prompt: `${WEEKDAY_NAMES[startIndex]}에서 ${offset}일 뒤는 무슨 요일인가요?`,
        answer,
        distractors: WEEKDAY_NAMES.filter((weekday) => weekday !== answer),
        sceneLines: ["시작 요일을 0칸으로 놓습니다.", "하루 뒤마다 한 칸씩 움직입니다."],
        explanation: "시작 요일을 세지 않고 다음 날부터 1일 뒤로 셉니다.",
      };
    }

    const month = pick([4, 5, 6, 9, 10, 11]);
    const startDay = rand(3, 18);
    const offset = pick([3, 4, 5, 6, 7, 8]);
    const targetDay = startDay + offset;
    if (mode === "days-after") {
      const answer = `${month}월 ${targetDay}일`;
      return {
        prompt: `${month}월 ${startDay}일에서 ${offset}일 뒤는 몇 월 며칠인가요?`,
        answer,
        distractors: calendarDateDistractors(month, targetDay),
        sceneLines: ["시작 날짜는 0칸입니다.", "다음 날짜부터 1일 뒤로 셉니다."],
        explanation: "며칠 뒤는 시작 날짜 다음 칸부터 1, 2, 3처럼 세어 갑니다.",
      };
    }

    const answer = `${offset}일`;
    return {
      prompt: `${month}월 ${startDay}일과 ${month}월 ${targetDay}일은 며칠 차이인가요?`,
      answer,
      distractors: numChoices(offset, "일", [-2, -1, 1, 2, 7]),
      sceneLines: ["두 날짜를 달력에서 찾습니다.", "사이의 칸 수를 셉니다."],
      explanation: "날짜 차이는 뒤 날짜에서 앞 날짜를 빼면 됩니다.",
    };
  }

  function calendarDateDistractors(month, day) {
    return [-2, -1, 1, 2, 7]
      .map((delta) => day + delta)
      .filter((candidate) => candidate >= 1 && candidate <= 31)
      .map((candidate) => `${month}월 ${candidate}일`);
  }

  function graphMost() {
    const values = graphValues();
    const top = values.slice().sort((a, b) => b.value - a.value)[0];
    return {
      prompt: "표에서 가장 많은 것은?",
      answer: top.label,
      distractors: values.map((v) => v.label).concat("같음"),
      sceneLines: values.map((v) => `${v.label} ${v.value}명`),
      explanation: "가장 큰 수를 찾습니다.",
    };
  }

  function graphDifference() {
    const values = graphValues();
    const sorted = values.slice().sort((a, b) => b.value - a.value);
    const answer = sorted[0].value - sorted[sorted.length - 1].value;
    return {
      prompt: "가장 많은 것과 가장 적은 것의 차이는?",
      answer: `${answer}명`,
      distractors: withSuffix(numberChoices(answer, 0, 10), "명"),
      sceneLines: values.map((v) => `${v.label} ${v.value}명`),
      explanation: "큰 수에서 작은 수를 뺍니다.",
    };
  }

  function tableTotal() {
    const values = graphValues();
    const answer = values.reduce((sum, item) => sum + item.value, 0);
    return {
      prompt: "조사한 학생은 모두 몇 명인가요?",
      answer: `${answer}명`,
      distractors: withSuffix(numberChoices(answer, 0, 40), "명"),
      sceneLines: values.map((v) => `${v.label} ${v.value}명`),
      explanation: "표의 모든 수를 더합니다.",
    };
  }

  function numberPattern() {
    const start = rand(2, 20);
    const step = pick([2, 3, 4, 5, 10]);
    const answer = start + step * 4;
    return {
      prompt: "수의 규칙을 찾아 빈칸에 알맞은 수를 고르세요.",
      answer,
      distractors: numberChoices(answer, 0, 100),
      sceneLines: [`${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, ?`],
      explanation: `계속 ${step}씩 커집니다.`,
    };
  }

  function shapePattern() {
    const seq = ["●", "▲", "■"];
    const start = rand(0, 2);
    const shown = [0, 1, 2, 3, 4].map((i) => seq[(start + i) % 3]);
    const answer = seq[(start + 5) % 3];
    return {
      prompt: "모양의 규칙을 보고 다음에 올 모양은?",
      answer,
      distractors: ["●", "▲", "■", "◆", "★"],
      sceneLines: [shown.concat("?").join("  ")],
      explanation: "반복되는 모양의 순서를 찾습니다.",
    };
  }

  function operationPattern() {
    const start = rand(1, 9);
    const rule = pick([["×2", (n) => n * 2], ["+3", (n) => n + 3], ["+5", (n) => n + 5]]);
    const a = start;
    const b = rule[1](a);
    const c = rule[1](b);
    const d = rule[1](c);
    return {
      prompt: `규칙 ${rule[0]}를 따라갈 때 빈칸은?`,
      answer: d,
      distractors: numberChoices(d, 0, 80),
      sceneLines: [`${a}, ${b}, ${c}, ?`],
      explanation: "앞의 수가 어떻게 변하는지 찾습니다.",
    };
  }

  function graphValues() {
    return shuffle(["축구", "피구", "달리기", "줄넘기", "독서"]).slice(0, 4).map((label) => ({
      label,
      value: rand(2, 9),
    }));
  }

  function formatMeterCentimeter(totalCm) {
    const meters = Math.floor(totalCm / 100);
    const cm = totalCm % 100;
    return cm === 0 ? `${meters}m` : `${meters}m ${cm}cm`;
  }

  function formatClockAnswer(hour, minute) {
    const h = ((hour - 1) % 12) + 1;
    return Number(minute) === 0 ? `${h}시 정각` : `${h}시 ${minute}분`;
  }

  function timeDistractors(hour, minute) {
    const h = ((hour - 1) % 12) + 1;
    return [
      formatClockAnswer(h, (minute + 5) % 60),
      formatClockAnswer(h === 12 ? 1 : h + 1, minute),
      formatClockAnswer(h, Math.max(0, minute - 5)),
      formatClockAnswer(h, minute)
    ];
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function different(value, other) {
    return value === other ? value + 1 : value;
  }

  function pick(list) {
    return list[rand(0, list.length - 1)];
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = rand(0, index);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  const CATEGORY_KEYS = CATEGORY_OPTIONS
    .map((option) => option.value)
    .filter((value) => value !== "mixed");

  const DISPLAY_CATEGORY_NAMES = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [
    item.value,
    item.value === "mixed" ? item.label : `${item.label} · ${item.description}`
  ]));

  const DISPLAY_SCORE_BY_DIFFICULTY = {
    low: 10,
    mid: 14,
    high: 18
  };

  const DENSE_QUESTION_COUNT = 96;
  const DIFFICULTY_BANDS = {
    low: { rank: "하", focus: "조건이 한눈에 보이는 한 단계 문제로 개념을 확인합니다." },
    mid: { rank: "중", focus: "대표 계산 절차와 표준 문장제를 식으로 바꾸어 풉니다." },
    high: { rank: "상", focus: "빈칸, 역문제, 비교, 단위 변환처럼 두 단계 생각을 이어 풉니다." }
  };
  const CHARACTER_PHOTO_PATH = "기본 그림";
  const SHAPE_FILL = {
    triangle: "#ff8f3f",
    square: "#ffd965",
    circle: "#1bb6a5",
    trapezoid: "#7cc7ff",
    rectangle: "#9f8cff"
  };
  const DISPLAY_ANIMAL_PLAYERS = [
    { name: "강아지", avatar: "🐶", voice: "puppy", soundText: "멍멍" },
    { name: "고양이", avatar: "🐱", voice: "kitten", soundText: "야옹" },
    { name: "병아리", avatar: "🐥", voice: "chick", soundText: "삐약" },
    { name: "오리", avatar: "🦆", voice: "duck", soundText: "꽥꽥" },
    { name: "개구리", avatar: "🐸", voice: "frog", soundText: "개굴" },
    { name: "별토끼", avatar: "⭐", voice: "puppy", soundText: "반짝" }
  ];

  function createDisplayPlayers(count) {
    return Array.from({ length: count }, (_, index) => {
      const player = DISPLAY_ANIMAL_PLAYERS[index % DISPLAY_ANIMAL_PLAYERS.length];
      return {
        id: `player-${index + 1}`,
        name: player.name,
        avatar: player.avatar,
        voice: player.voice,
        soundText: player.soundText,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length]
      };
    });
  }

  function clueScene(...lines) {
    return { type: "clues", lines };
  }

  function buildDenseBank() {
    return Object.fromEntries(CATEGORY_KEYS.map((category) => [
      category,
      {
        low: buildDenseDifficulty(category, "low"),
        mid: buildDenseDifficulty(category, "mid"),
        high: buildDenseDifficulty(category, "high"),
      },
    ]));
  }

  function buildDenseDifficulty(category, difficulty) {
    return Array.from({ length: DENSE_QUESTION_COUNT }, (_, index) => (
      buildDenseQuestion(category, difficulty, index + 1)
    ));
  }

  function buildDenseQuestion(category, difficulty, index) {
    const builders = {
      "1-1": buildHundredsQuestion,
      "1-2": buildShapeQuestion,
      "1-3": buildAddSubQuestion,
      "1-4": buildCmLengthQuestion,
      "1-5": buildClassifyQuestion,
      "1-6": buildMultiplicationIntroQuestion,
      "2-1": buildThousandsQuestion,
      "2-2": buildMultiplicationTableQuestion,
      "2-3": buildMeterLengthQuestion,
      "2-4": buildTimeQuestion,
      "2-5": buildTableGraphQuestion,
      "2-6": buildPatternQuestion,
    };
    return builders[category](difficulty, index);
  }

  function makeQuestion(category, difficulty, index, prompt, answerText, distractors, sceneLines, explanation, feedback) {
    const choices = makeChoiceSet(answerText, distractors, `${category}-${difficulty}-${index}`.length + index);
    const scene = normalizeScene(sceneLines);
    const lessonKey = inferQuestionLessonKey(category, prompt);
    const variantKey = inferQuestionVariantKey(category, prompt, scene, lessonKey);
    return {
      id: `${category}-${difficulty}-${String(index).padStart(2, "0")}`,
      category,
      unitId: category,
      unitLabel: DISPLAY_CATEGORY_NAMES[category],
      difficulty,
      difficultyRank: DIFFICULTY_BANDS[difficulty]?.rank || "중",
      difficultyFocus: DIFFICULTY_BANDS[difficulty]?.focus || DIFFICULTY_BANDS.mid.focus,
      lessonKey,
      variantKey,
      prompt,
      scene,
      sceneLines: scene.lines,
      options: choices.options,
      answer: choices.answer,
      explanation,
      feedback
    };
  }

  function inferQuestionLessonKey(category, prompt) {
    const text = String(prompt || "");
    const rules = [
      ["1-1", /100이|10이|1이/, "hundreds-place-value"],
      ["1-1", /더 큰 수/, "hundreds-compare"],
      ["1-1", /로 나타낸 수|바로 앞|바로 뒤/, "hundreds-compose-neighbor"],
      ["1-2", /변이|꼭짓점|굽은 선/, "shape-features"],
      ["1-2", /다음에 올 도형|규칙/, "shape-pattern"],
      ["1-2", /칠교|조각|쌓은|위에서|앞에서/, "shape-compose-stack"],
      ["1-3", /□/, "missing-addend"],
      ["1-3", /\+/, "addition-regrouping"],
      ["1-3", /-/, "subtraction-regrouping"],
      ["1-4", /어림|가장 알맞은|가장 가까운/, "length-estimate"],
      ["1-4", /이어 붙이면|합하면|더하면/, "length-join"],
      ["1-4", /보다 몇 cm 더|더 긴/, "length-compare"],
      ["1-4", /10cm|0 눈금|자를 사용할/, "ruler-zero-ten"],
      ["1-5", /표에서|몇 개인가요|몇 명인가요/, "table-row-read"],
      ["1-5", /합하면|모두|가장 많은|분류할 수 없는/, "classify-compare"],
      ["1-6", /개씩.*묶음|묶음이면|모두 .*개를/, "equal-groups"],
      ["1-6", /\+.*\+|×/, "repeated-addition"],
      ["2-1", /1000이|100이|10이|1이|로 나타낸 수/, "thousands-place-value"],
      ["2-1", /더 큰 수|가까운 몇백/, "thousands-compare-boundary"],
      ["2-2", /곱셈표|1단|0의 곱/, "multiplication-table-zero-one"],
      ["2-2", /×□/, "missing-factor"],
      ["2-2", /한 줄에|바둑돌|만들 수 있는|×/, "array-multiplication"],
      ["2-3", /어림|가장 알맞은|가장 가까운/, "meter-length-estimate"],
      ["2-3", /모두 몇 cm|m와 cm|cm를 m와 cm/, "meter-centimeter-convert"],
      ["2-3", /보다 몇 cm 더|알맞은 단위|문 높이|단위는/, "long-length-compare-unit"],
      ["2-4", /하루|오전|오후|24시간/, "time-day-cycle"],
      ["2-4", /달력|요일|날짜|며칠|몇 월/, "time-calendar"],
      ["2-4", /분 뒤|분 후|보다 몇 분 뒤/, "time-add-minutes"],
      ["2-4", /걸린 시간|부터.*까지|반|긴바늘|짧은바늘|30분을 다른 말/, "time-elapsed-clock"],
      ["2-5", /조사|표로 나타내|그래프로 나타내|그래프로 나타낼/, "graph-create"],
      ["2-5", /표에서|몇 명인가요/, "graph-row-read"],
      ["2-5", /모두|차이|가장 많은|가장 적은/, "graph-interpret"],
      ["2-6", /덧셈표|곱셈표|쌓은 모양|생활|동작|소리/, "pattern-table-life"],
      ["2-6", /빨강|파랑|다음에 올|규칙/, "pattern-rule"]
    ];
    const match = rules.find(([unit, regex]) => unit === category && regex.test(text));
    return match ? match[2] : `${category}-core`;
  }

  function inferQuestionVariantKey(category, prompt, scene, lessonKey) {
    const text = String(prompt || "");
    const scenePart = scene?.kind ? `${scene.type || "scene"}-${scene.kind}` : "";
    const rules = [
      ["1-1", /바로 앞|바로 뒤/, "neighbor"],
      ["1-1", /100이|10이|1이/, "place-count"],
      ["1-1", /로 나타낸 수/, "expanded"],
      ["1-1", /더 큰 수/, "compare"],
      ["1-2", /번호|어느 것/, "shape-pick"],
      ["1-2", /공통|같은 점/, "same-feature"],
      ["1-2", /꼭짓점.*모두|더하면/, "vertex-sum"],
      ["1-2", /쌓은|위에서|앞에서/, "stack-view"],
      ["1-3", /□.*\+|\+□/, "missing-addend"],
      ["1-3", /□.*-|-□/, "missing-subtraction"],
      ["1-3", /\+/, "addition"],
      ["1-3", /-/, "subtraction"],
      ["1-4", /0 눈금|시작 .*눈금/, "ruler-offset"],
      ["1-4", /이어 붙이면|합하면|더하면/, "join"],
      ["1-4", /더 긴|몇 cm 더/, "compare"],
      ["1-4", /어림|가장 알맞은|가장 가까운/, "estimate"],
      ["1-5", /표에서 \d+개인/, "row-match"],
      ["1-5", /표에서 .*몇/, "row-count"],
      ["1-5", /가장 많은|가장 적은/, "extreme"],
      ["1-5", /모두|합하면/, "total"],
      ["1-5", /분류할 수 없는|기준/, "criterion"],
      ["1-6", /곱셈식으로/, "repeated-to-expression"],
      ["1-6", /×.*값/, "multiply-value"],
      ["1-6", /몇 묶음/, "group-count"],
      ["1-6", /한 묶음/, "unknown-each"],
      ["1-6", /개씩 .*묶음/, "equal-groups-total"],
      ["2-1", /바로 앞|바로 뒤/, "neighbor"],
      ["2-1", /가까운 몇백/, "hundreds-boundary"],
      ["2-1", /세 수/, "order-three"],
      ["2-1", /더 큰 수/, "compare"],
      ["2-1", /1000이|100이|10이|1이/, "place-count"],
      ["2-2", /×□/, "missing-factor"],
      ["2-2", /곱셈표|1단|0의 곱/, "table-rule"],
      ["2-2", /한 줄에|바둑돌/, "array"],
      ["2-2", /만들 수 있는/, "target-product"],
      ["2-3", /m와 cm|cm를 m와 cm/, "unit-convert"],
      ["2-3", /모두 몇 cm|더하면/, "meter-centimeter-add"],
      ["2-3", /보다 몇 cm 더|차이/, "compare"],
      ["2-3", /어림|가장 알맞은|가장 가까운/, "estimate"],
      ["2-4", /무슨 요일/, "calendar-weekday"],
      ["2-4", /몇 월 며칠|일 뒤/, "calendar-days-after"],
      ["2-4", /며칠 차이/, "calendar-date-difference"],
      ["2-4", /분 뒤|분 후/, "time-add-minutes"],
      ["2-4", /걸린 시간|부터.*까지|보다 몇 분 뒤/, "elapsed"],
      ["2-4", /긴바늘|짧은바늘|반/, "clock-read"],
      ["2-4", /하루|오전|오후|24시간/, "day-cycle"],
      ["2-5", /조사한 자료|표로 나타내/, "survey-to-table"],
      ["2-5", /그래프로 나타낼 때/, "table-to-graph"],
      ["2-5", /표에서 \d+명인|명인 활동/, "row-match"],
      ["2-5", /표에서 .*몇 명/, "row-count"],
      ["2-5", /모두 몇 명/, "total"],
      ["2-5", /차이|가장 많은|가장 적은/, "compare"],
      ["2-6", /덧셈표/, "addition-table"],
      ["2-6", /곱셈표/, "multiplication-table"],
      ["2-6", /쌓은 모양/, "stacking"],
      ["2-6", /박수|발구르기|소리|동작/, "action-sound"],
      ["2-6", /□.*규칙/, "missing-pattern"],
      ["2-6", /다음에 올 색|빨강|파랑/, "color-repeat"]
    ];
    const match = rules.find(([unit, regex]) => unit === category && regex.test(text));
    const promptPart = match ? match[2] : compactVariantText(text);
    return [lessonKey, scenePart || promptPart].filter(Boolean).join(":");
  }

  function compactVariantText(text) {
    return String(text || "")
      .replace(/\d+/g, "#")
      .replace(/[?,.]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 48) || "core";
  }

  function makeChoiceSet(answerText, distractors, seed) {
    const seen = new Set();
    const values = [];
    [answerText, ...distractors].forEach((item) => {
      const text = String(item).trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      values.push(text);
    });

    while (values.length < 2) {
      values.push(values.length === 0 ? String(answerText) : "다른 답");
    }

    const selected = values.slice(0, 5).map((text) => ({ text, correct: text === String(answerText) }));
    const shift = seed % selected.length;
    const rotated = selected.slice(shift).concat(selected.slice(0, shift));
    return {
      options: rotated.map((item) => item.text),
      answer: rotated.findIndex((item) => item.correct)
    };
  }

  function numChoices(answer, suffix, deltas = [-2, -1, 1, 2, 10, -10]) {
    return deltas
      .map((delta) => answer + delta)
      .filter((value) => value >= 0)
      .map((value) => `${value}${suffix}`);
  }

  function makeFeedback(title, diagnosis, steps, nextAction, visualTitle = "조건 다시 짚기") {
    return { title, diagnosis, steps, nextAction, visualTitle };
  }

  function normalizeScene(sceneInput) {
    if (Array.isArray(sceneInput)) {
      return clueScene(...sceneInput);
    }

    if (sceneInput && typeof sceneInput === "object") {
      return {
        ...sceneInput,
        lines: Array.isArray(sceneInput.lines) ? sceneInput.lines : []
      };
    }

    return clueScene();
  }

  function typedScene(type, lines, payload = {}) {
    return {
      type,
      lines,
      ...payload
    };
  }

  function lengthScene(kind, lines, payload = {}) {
    return typedScene("length", lines, { kind, ...payload });
  }

  function timeScene(kind, lines, payload = {}) {
    return typedScene("time", lines, { kind, ...payload });
  }

  function shapeScene(kind, lines, payload = {}) {
    return typedScene("shape", lines, { kind, ...payload });
  }

  function multiplicationScene(kind, lines, payload = {}) {
    return typedScene("multiplication", lines, { kind, ...payload });
  }

  function graphScene(kind, lines, payload = {}) {
    return typedScene("graph", lines, { kind, ...payload });
  }

  function patternScene(kind, lines, payload = {}) {
    return typedScene("pattern", lines, { kind, ...payload });
  }

  function hasNumberFinalConsonant(value) {
    const digits = String(Math.abs(Number(value))).match(/\d/g);
    if (!digits || digits.length === 0) {
      return false;
    }

    return [0, 1, 3, 6, 7, 8].includes(Number(digits[digits.length - 1]));
  }

  function numberTopicParticle(value) {
    return hasNumberFinalConsonant(value) ? "은" : "는";
  }

  function numberSubjectParticle(value) {
    return hasNumberFinalConsonant(value) ? "이" : "가";
  }

  function numberAndParticle(value) {
    return hasNumberFinalConsonant(value) ? "과" : "와";
  }

  function numberObjectParticle(value) {
    return hasNumberFinalConsonant(value) ? "을" : "를";
  }

  function numberDirectionParticle(value) {
    const digits = String(Math.abs(Number(value))).match(/\d/g);
    const lastDigit = digits && digits.length ? Number(digits[digits.length - 1]) : null;
    const endsWithRieul = [1, 7, 8].includes(lastDigit);
    return hasNumberFinalConsonant(value) && !endsWithRieul ? "으로" : "로";
  }

  function formatNumberPair(left, right) {
    return `${left}${numberAndParticle(left)} ${right}`;
  }

  function numberIsLargerText(value) {
    return `${value}${numberSubjectParticle(value)} 더 큽니다`;
  }

  function formatExpandedNumber(parts) {
    const terms = parts.filter((value) => value > 0);
    return terms.length ? terms.join(" + ") : "0";
  }

  function selectDifficultyMode(difficulty, index, modeMap) {
    const modes = modeMap[difficulty] || modeMap.mid || modeMap.low;
    return modes[(index - 1) % modes.length];
  }

  function difficultyNumber(difficulty, index, lowRange, midRange, highRange) {
    const [min, max] = { low: lowRange, mid: midRange, high: highRange }[difficulty] || midRange;
    const span = max - min + 1;
    return min + ((index * 37 + difficultyOffset(difficulty) * 19) % span);
  }

  function buildHundredsQuestion(difficulty, index) {
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["place-count", "expanded", "neighbor", "compare-easy"],
      mid: ["place-count", "compare-tens", "expanded", "neighbor"],
      high: ["closest-smaller-hundred", "compare-close", "missing-expanded", "order-three"]
    });
    const number = difficultyNumber(difficulty, index, [120, 598], [201, 897], [101, 999]);
    const h = Math.floor(number / 100);
    const t = Math.floor((number % 100) / 10);
    const o = number % 10;

    if (mode === "order-three") {
      const middle = Math.min(970, Math.max(130, number));
      const numbers = [middle, middle + (index % 2 === 0 ? 8 : 20), middle - (index % 3 === 0 ? 9 : 30)];
      const sorted = [...numbers].sort((left, right) => left - right);
      const answer = sorted.join(", ");
      return makeQuestion("1-1", difficulty, index, `세 수 ${numbers.join(", ")}를 작은 수부터 차례로 쓰면?`, answer, [
        [...sorted].reverse().join(", "),
        [sorted[0], sorted[2], sorted[1]].join(", "),
        [sorted[1], sorted[0], sorted[2]].join(", "),
        numbers.join(", ")
      ], [
        "세 수를 모두 비교합니다.",
        "백의 자리부터 차례로 봅니다."
      ], "세 수의 순서는 가장 높은 자리부터 비교해 작은 수를 먼저 놓습니다.", makeFeedback(
        "세 수를 한 번에 줄 세워요.",
        "심화 순서 문제는 두 수만 비교하고 끝내면 빠뜨리기 쉽습니다.",
        [`먼저 백의 자리를 비교합니다.`, `백의 자리가 같으면 십의 자리, 일의 자리로 내려갑니다.`, `작은 수부터 쓰면 ${answer}입니다.`],
        "세 수를 비교할 때는 가장 작은 수에 1번, 다음 수에 2번, 가장 큰 수에 3번을 표시하세요."
      ));
    }

    if (mode === "missing-expanded") {
      const targetH = h;
      const targetT = 1 + ((index * 3) % 9);
      const targetO = 1 + ((index * 5) % 9);
      const target = targetH * 100 + targetT * 10 + targetO;
      const missing = targetT * 10;
      return makeQuestion("1-1", difficulty, index, `${targetH * 100} + □ + ${targetO} = ${target}입니다. □에 알맞은 수는?`, `${missing}`, numChoices(missing, "", [-20, -10, -1, 1, 10, 20]), [
        `${target} = ${targetH * 100} + ? + ${targetO}`,
        "빠진 자리 값을 찾습니다."
      ], "전개식의 빈칸은 빠진 자리의 값을 찾는 문제입니다.", makeFeedback(
        "빠진 자리 값을 찾아요.",
        "전개식 빈칸은 숫자 하나가 아니라 그 자리의 값이 들어갑니다.",
        [`${target}에서 백의 자리 값은 ${targetH * 100}입니다.`, `일의 자리 값은 ${targetO}입니다.`, `남은 십의 자리 값은 ${missing}입니다.`],
        "전개식 빈칸에는 자리 숫자가 아니라 10, 20, 30 같은 자리 값이 들어가는지 확인하세요."
      ));
    }

    if (mode === "place-count") {
      const answer = `${h}, ${t}, ${o}`;
      return makeQuestion("1-1", difficulty, index, `${number}${numberTopicParticle(number)} 100이 몇 개, 10이 몇 개, 1이 몇 개인 수인가요?`, answer, [
        `${h}, ${o}, ${t}`,
        `${h + 1}, ${Math.max(0, t - 1)}, ${o}`,
        `${Math.max(0, h - 1)}, ${t}, ${o}`,
        `${h}, ${t + 1}, ${Math.max(0, o - 1)}`
      ], [
        "보기는 100의 개수, 10의 개수, 1의 개수 순서입니다.",
        `${number} = ${formatExpandedNumber([h * 100, t * 10, o])}`
      ], "세 자리 수는 백의 자리, 십의 자리, 일의 자리로 나누어 읽습니다.", makeFeedback(
        "자릿값을 다시 확인해요.",
        "세 자리 수에서 왼쪽부터 백의 자리, 십의 자리, 일의 자리입니다.",
        [`${number}에서 백의 자리 숫자는 ${h}입니다.`, `십의 자리 숫자는 ${t}, 일의 자리 숫자는 ${o}입니다.`, `따라서 100은 ${h}개, 10은 ${t}개, 1은 ${o}개입니다.`],
        "숫자를 고르기 전에 각 자리 위에 백·십·일을 작게 써 보세요."
      ));
    }

    if (mode === "compare-easy" || mode === "compare-tens" || mode === "compare-close") {
      let other;
      if (mode === "compare-easy") {
        const otherH = h >= 5 ? h - 2 : h + 2;
        other = otherH * 100 + t * 10 + o;
      } else if (mode === "compare-tens") {
        const otherT = t >= 6 ? t - 3 : t + 3;
        other = h * 100 + otherT * 10 + o;
      } else {
        const otherO = o >= 5 ? o - 2 : o + 2;
        other = h * 100 + t * 10 + otherO;
      }
      const answer = number > other ? numberIsLargerText(number) : numberIsLargerText(other);
      return makeQuestion("1-1", difficulty, index, `${formatNumberPair(number, other)} 중 더 큰 수는 무엇인가요?`, answer, [
        number > other ? numberIsLargerText(other) : numberIsLargerText(number),
        "두 수가 같습니다",
        "십의 자리만 보고 고릅니다",
        "일의 자리만 보고 고릅니다"
      ], [
        `${number}`,
        `${other}`,
        "백의 자리부터 차례대로 비교하세요."
      ], "큰 수 비교는 가장 높은 자리부터 봅니다.", makeFeedback(
        "높은 자리부터 비교해요.",
        "세 자리 수의 크기는 백의 자리부터 비교해야 합니다.",
        [`${formatNumberPair(number, other)}의 백의 자리를 먼저 봅니다.`, "백의 자리가 같으면 십의 자리, 그래도 같으면 일의 자리를 봅니다.", `자리 비교를 끝내면 ${answer}입니다.`],
        "수 비교 문제에서는 오른쪽 숫자만 보지 말고 가장 왼쪽 자리부터 손가락으로 짚어 보세요."
      ));
    }

    if (mode === "expanded" || mode === "expanded-zero") {
      const target = mode === "expanded-zero"
        ? h * 100 + (index % 2 === 0 ? t * 10 : 0) + (index % 2 === 0 ? 0 : o)
        : number;
      const targetH = Math.floor(target / 100);
      const targetT = Math.floor((target % 100) / 10);
      const targetO = target % 10;
      const expanded = formatExpandedNumber([targetH * 100, targetT * 10, targetO]);
      return makeQuestion("1-1", difficulty, index, `${expanded}${numberDirectionParticle(target)} 나타낸 수는 무엇인가요?`, `${target}`, numChoices(target, "", [1, -1, 10, -10, 100, -100]), [
        `백의 자리 값 ${targetH * 100}`,
        `십의 자리 값 ${targetT * 10}`,
        `일의 자리 값 ${targetO}`
      ], "백, 십, 일을 모두 더합니다.", makeFeedback(
        "분해된 수를 다시 모아요.",
        "전개식은 백의 자리, 십의 자리, 일의 자리 값을 따로 보여 준 것입니다.",
        [`전개식 ${expanded}을 차례대로 봅니다.`, "0인 자리는 더해도 수가 달라지지 않습니다.", `모두 모으면 ${target}입니다.`],
        "전개식은 더하기 기호를 기준으로 세 조각을 하나씩 모으면 됩니다."
      ));
    }

    if (mode === "closest-smaller-hundred") {
      const rounded = Math.floor(number / 100) * 100;
      return makeQuestion("1-1", difficulty, index, `${number}보다 작은 가장 가까운 몇백은 무엇인가요?`, `${rounded}`, numChoices(rounded, "", [-200, -100, 100, 200, 10]), [
        `${number}`,
        "백 단위 경계를 찾습니다."
      ], "작은 쪽의 몇백은 백의 자리 아래를 내려놓고 찾습니다.", makeFeedback(
        "몇백의 경계를 찾아요.",
        "심화 단계에서는 수가 어느 백 단위 사이에 있는지 먼저 봐야 합니다.",
        [`${number}${numberTopicParticle(number)} ${rounded}과 ${rounded + 100} 사이에 있습니다.`, `${number}보다 작은 쪽의 몇백은 ${rounded}입니다.`, `따라서 정답은 ${rounded}입니다.`],
        `수직선 위에 ${rounded}, ${rounded + 100}을 먼저 적고 기준 수가 어디에 있는지 표시하세요.`
      ));
    }

    const before = Math.max(100, number - 1);
    const after = number + 1;
    return makeQuestion("1-1", difficulty, index, `${number}의 바로 앞의 수와 바로 뒤의 수를 차례로 고르세요.`, `${before}, ${after}`, [
      `${after}, ${before}`,
      `${number - 10}, ${number + 10}`,
      `${before - 1}, ${after + 1}`,
      `${number}, ${after}`
    ], [
      "바로 앞의 수는 1 작은 수입니다.",
      "바로 뒤의 수는 1 큰 수입니다."
    ], "수의 순서를 생각합니다.", makeFeedback(
      "수의 이웃을 찾아요.",
      "바로 앞과 바로 뒤는 10이나 100이 아니라 1만큼 움직입니다.",
      [`${number}보다 1 작은 수는 ${before}입니다.`, `${number}보다 1 큰 수는 ${after}입니다.`, `따라서 ${before}, ${after} 순서가 맞습니다.`],
      "앞뒤 수 문제에서는 기준 수를 가운데에 놓고 -1, +1을 적어 보세요."
    ));
  }

  function buildShapeQuestion(difficulty, index) {
    const shapes = [
      { name: "삼각형", sides: 3, vertices: 3 },
      { name: "사각형", sides: 4, vertices: 4 },
      { name: "오각형", sides: 5, vertices: 5 },
      { name: "육각형", sides: 6, vertices: 6 },
    ];
    const numberedShapes = [
      { kind: "triangle", name: "삼각형", label: "1", sides: 3, vertices: 3 },
      { kind: "circle", name: "원", label: "2", sides: 0, vertices: 0 },
      { kind: "rectangle", name: "사각형", label: "3", sides: 4, vertices: 4 },
      { kind: "trapezoid", name: "사각형", label: "4", sides: 4, vertices: 4 }
    ];
    const classroomShapeChoices = [
      { kind: "trapezoid", name: "사다리꼴 모양", label: "1", sides: 4, vertices: 4 },
      { kind: "triangle", name: "삼각형", label: "2", sides: 3, vertices: 3 },
      { kind: "circle", name: "원", label: "3", sides: 0, vertices: 0 },
      { kind: "rectangle", name: "사각형", label: "4", sides: 4, vertices: 4 }
    ];
    const objectShapes = [
      { name: "벽시계", kind: "circle", label: "원" },
      { name: "문", kind: "rectangle", label: "사각형" },
      { name: "창문", kind: "square", label: "사각형" },
      { name: "경고 표지", kind: "triangle", label: "삼각형" },
      { name: "동전", kind: "circle", label: "원" },
      { name: "교과서", kind: "rectangle", label: "사각형" }
    ];
    const tangramPieces = [
      { label: "1", letter: "ㄱ", kind: "triangle", name: "삼각형", vertices: 3 },
      { label: "2", letter: "ㄴ", kind: "triangle", name: "삼각형", vertices: 3 },
      { label: "3", letter: "ㄷ", kind: "triangle", name: "삼각형", vertices: 3 },
      { label: "4", letter: "ㄹ", kind: "square", name: "네모 조각", vertices: 4 },
      { label: "5", letter: "ㅁ", kind: "triangle", name: "삼각형", vertices: 3 },
      { label: "6", letter: "ㅂ", kind: "parallelogram", name: "옆으로 기울인 사각형", vertices: 4 },
      { label: "7", letter: "ㅅ", kind: "triangle", name: "삼각형", vertices: 3 }
    ];
    const stackChoiceGroups = [
      { label: "1", towers: [1, 3], caption: "1번" },
      { label: "2", towers: [3, 1], caption: "2번" },
      { label: "3", towers: [1, 3, 1], caption: "3번" }
    ];
    const stackFiveGroups = [
      { label: "1", towers: [1, 1, 3], caption: "1번" },
      { label: "2", towers: [1, 2, 1], caption: "2번" },
      { label: "3", towers: [1, 1, 1, 2], caption: "3번" },
      { label: "4", towers: [2, 1, 1], caption: "4번" },
      { label: "5", towers: [1, 1, 1, 1, 1], caption: "5번" }
    ];
    const stackDescribeGroup = [{ label: "가", towers: [2, 1, 1, 1], caption: "한 모양" }];
    const stackCompareGroups = [
      { label: "왼쪽", towers: [1, 2, 1], caption: "왼쪽" },
      { label: "오른쪽", towers: [2, 1, 2], caption: "오른쪽" }
    ];
    const shape = shapes[(index + difficultyOffset(difficulty)) % shapes.length];
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["numbered-shape-pick", "name-by-features", "vertex-count", "circle", "living-object-match", "tangram-count", "stack-first-floor", "living-common-shape"],
      mid: ["numbered-quadrilaterals", "same-feature", "wrong-generalization", "living-object-group", "vertex-sum-simple", "tangram-nontriangle-count", "tangram-square-label", "stack-total", "stack-highest", "shape-pattern"],
      high: ["total-vertices", "not-matching-feature", "shape-pattern-3", "total-sides", "living-vertex-total", "tangram-vertex-sum", "tangram-difference", "stack-compare-count", "stack-choice-description", "tangram-compose"]
    });

    if (mode === "numbered-shape-pick") {
      const specs = [
        {
          prompt: "삼각형인 도형의 번호는 어느 것인가요?",
          answer: "1번",
          targetLabels: ["1"],
          items: numberedShapes,
          targetName: "삼각형"
        },
        {
          prompt: "꼭짓점이 없는 도형의 번호는 어느 것인가요?",
          answer: "2번",
          targetLabels: ["2"],
          items: numberedShapes,
          targetName: "원"
        },
        {
          prompt: "곧은 선으로만 이루어진 도형의 번호는 어느 것인가요?",
          answer: "1번",
          targetLabels: ["1"],
          items: [
            { kind: "triangle", name: "삼각형", label: "1", sides: 3, vertices: 3 },
            { kind: "circle", name: "원", label: "2", sides: 0, vertices: 0 },
            { kind: "oval", name: "길쭉한 둥근 모양", label: "3", sides: 0, vertices: 0 },
            { kind: "semicircle", name: "반만 그린 둥근 모양", label: "4", sides: 0, vertices: 0 }
          ],
          targetName: "곧은 선 도형"
        }
      ];
      const spec = specs[(index - 1) % specs.length];
      return makeQuestion("1-2", difficulty, index, spec.prompt, spec.answer, ["2번", "3번", "4번", "1번"].filter((choice) => choice !== spec.answer), shapeScene("shape-grid", [
        "번호가 붙은 도형을 하나씩 봅니다.",
        `${spec.targetName}의 특징과 맞는 번호를 찾습니다.`
      ], {
        items: spec.items,
        targetLabels: spec.targetLabels,
        columns: 4,
        note: "테두리를 따라가며 조건과 맞는 번호 찾기"
      }), "번호가 붙은 도형은 이름보다 먼저 변, 꼭짓점, 굽은 선을 확인합니다.", makeFeedback(
        "번호 도형을 직접 확인해요.",
        "도형 이름만 떠올리면 비슷한 모양에 속기 쉽습니다.",
        ["각 보기의 테두리를 손가락으로 따라갑니다.", "곧은 변과 꼭짓점이 몇 개인지 봅니다.", `조건과 맞는 번호는 ${spec.answer}입니다.`],
        "번호 문제는 답을 고르기 전에 보기마다 '변, 꼭짓점, 굽은 선' 중 무엇이 보이는지 작게 표시하세요.",
        "번호 도형 다시 보기"
      ));
    }

    if (mode === "living-object-match") {
      const specs = [
        { object: "벽시계", targetName: "원", answer: "3번", items: classroomShapeChoices, targetLabels: ["3"] },
        { object: "교실 칠판", targetName: "사각형", answer: "4번", items: classroomShapeChoices, targetLabels: ["4"] },
        { object: "경고 표지", targetName: "삼각형", answer: "2번", items: classroomShapeChoices, targetLabels: ["2"] }
      ];
      const spec = specs[(index - 1) % specs.length];
      return makeQuestion("1-2", difficulty, index, `${spec.object}${andParticle(spec.object)} 가장 비슷한 모양의 번호를 고르세요.`, spec.answer, ["1번", "2번", "3번", "4번"].filter((choice) => choice !== spec.answer), shapeScene("shape-grid", [
        `${spec.object}의 바깥 윤곽을 떠올립니다.`,
        `${spec.targetName} 모양과 맞는 번호를 찾습니다.`
      ], {
        items: spec.items,
        targetLabels: spec.targetLabels,
        columns: 4,
        note: "생활 물건은 바깥 윤곽을 도형으로 바꾸어 보기"
      }), "생활 속 물건 문제는 물건 이름을 도형의 바깥 윤곽으로 바꾸어 생각합니다.", makeFeedback(
        "물건의 바깥 윤곽을 봐요.",
        "생활 속 도형은 색이나 쓰임이 아니라 바깥 모양을 보는 문제입니다.",
        [`${spec.object}의 바깥 윤곽을 떠올립니다.`, `그 윤곽은 ${spec.targetName} 모양입니다.`, `보기에서 ${spec.targetName} 모양은 ${spec.answer}입니다.`],
        "물건을 보면 먼저 손가락으로 바깥 선을 한 바퀴 따라가세요.",
        "생활 속 도형 연결"
      ));
    }

    if (mode === "living-common-shape") {
      return makeQuestion("1-2", difficulty, index, "동전과 바퀴의 공통된 모양으로 알맞은 것은 무엇인가요?", "원", ["삼각형", "사각형", "옆으로 기울인 사각형"], shapeScene("object-shapes", [
        "두 물건의 바깥 윤곽을 비교합니다.",
        "둘 다 둥근 모양입니다."
      ], {
        items: objectShapes.filter((item) => ["동전", "벽시계"].includes(item.name)).map((item, itemIndex) => ({
          ...item,
          name: itemIndex === 0 ? "동전" : "바퀴"
        })),
        targetNames: ["동전", "바퀴"],
        note: "공통 모양은 두 물건에 모두 있는 도형"
      }), "공통된 모양은 두 물건에서 모두 찾을 수 있는 도형을 고릅니다.", makeFeedback(
        "공통 모양을 겹쳐 봐요.",
        "한 물건만 보고 고르면 공통점을 놓칠 수 있습니다.",
        ["동전도 바깥이 둥근 모양입니다.", "바퀴도 바깥이 둥근 모양입니다.", "둘 다 꼭짓점이 없으므로 공통 모양은 원입니다."],
        "공통점 문제는 첫 번째 물건과 두 번째 물건에 모두 표시할 수 있는 모양만 남기세요.",
        "생활 속 공통 모양"
      ));
    }

    if (mode === "same-feature") {
      return makeQuestion("1-2", difficulty, index, "삼각형과 사각형의 같은 점으로 알맞은 것은 무엇인가요?", "둘 다 꼭짓점이 있습니다.", ["둘 다 둥근 모양입니다.", "둘 다 꼭짓점이 없습니다.", "둘 다 원입니다."], shapeScene("shape-grid", [
        "두 도형을 나란히 놓고 같은 점을 찾습니다.",
        "둘 다 곧은 변이 만나 꼭짓점이 생깁니다."
      ], {
        items: [
          { kind: "triangle", name: "삼각형", label: "삼각형", sides: 3, vertices: 3 },
          { kind: "square", name: "사각형", label: "사각형", sides: 4, vertices: 4 }
        ],
        targetLabels: ["삼각형", "사각형"],
        columns: 2,
        note: "다른 점 말고 두 도형에 모두 있는 특징 찾기"
      }), "같은 점을 묻는 문제는 두 도형에 모두 표시할 수 있는 특징만 골라야 합니다.", makeFeedback(
        "두 도형에 모두 표시해요.",
        "삼각형과 사각형은 변의 수는 다르지만 둘 다 꼭짓점이 있습니다.",
        ["삼각형의 꺾이는 곳을 표시합니다.", "사각형의 꺾이는 곳도 표시합니다.", "둘 다 꼭짓점이 있으므로 같은 점은 꼭짓점입니다."],
        "같은 점 문제에서는 두 그림에 모두 표시할 수 없는 보기는 지우세요.",
        "같은 점 찾기"
      ));
    }

    if (mode === "wrong-generalization") {
      return makeQuestion("1-2", difficulty, index, "옳지 않은 설명은 어느 것인가요?", "모든 원은 크기도 같습니다.", ["모든 삼각형은 변이 3개입니다.", "모든 원은 모양이 같습니다.", "모든 사각형은 꼭짓점이 4개입니다."], shapeScene("shape-grid", [
        "같은 이름의 도형도 크기는 달라질 수 있습니다.",
        "원은 모두 둥글지만 모두 같은 크기는 아닙니다."
      ], {
        items: [
          { kind: "circle", name: "작은 원", label: "작은 원", scale: 0.72, sides: 0, vertices: 0 },
          { kind: "circle", name: "큰 원", label: "큰 원", scale: 1.12, sides: 0, vertices: 0 },
          { kind: "triangle", name: "삼각형", label: "삼각형", sides: 3, vertices: 3 },
          { kind: "square", name: "사각형", label: "사각형", sides: 4, vertices: 4 }
        ],
        targetLabels: ["작은 원", "큰 원"],
        columns: 4,
        note: "모양의 이름과 크기는 구별하기"
      }), "도형의 이름은 모양의 특징으로 정하고, 크기는 달라도 같은 도형일 수 있습니다.", makeFeedback(
        "이름과 크기를 구별해요.",
        "원은 크기가 달라도 둥근 선으로 이루어지고 꼭짓점이 없으면 모두 원입니다.",
        ["작은 원과 큰 원을 비교합니다.", "둘 다 원이지만 크기는 다릅니다.", "따라서 '모든 원은 크기도 같습니다'는 옳지 않습니다."],
        "도형 설명에서 '모양'을 말하는지 '크기'까지 말하는지 나누어 읽으세요.",
        "도형 오개념 바로잡기"
      ));
    }

    if (mode === "living-object-group") {
      return makeQuestion("1-2", difficulty, index, "꼭짓점이 있는 물건만 모두 고른 것은 어느 것인가요?", "문, 창문", ["시계, 동전", "바퀴, 교과서", "시계, 문"], shapeScene("object-shapes", [
        "물건에서 찾을 수 있는 도형의 꼭짓점을 봅니다.",
        "문과 창문은 사각형 모양을 찾을 수 있습니다."
      ], {
        items: objectShapes,
        targetNames: ["문", "창문", "교과서"],
        note: "꼭짓점은 곧은 변과 변이 만나는 뾰족한 곳"
      }), "꼭짓점이 있는 물건은 사각형이나 삼각형 모양을 찾을 수 있는 물건입니다.", makeFeedback(
        "물건 속 꼭짓점을 표시해요.",
        "시계나 동전처럼 둥근 물건은 꼭짓점이 없지만, 문과 창문은 사각형 모양의 꼭짓점이 있습니다.",
        ["문에서 네 모서리를 표시합니다.", "창문에서도 네 모서리를 표시합니다.", "둥근 시계와 동전은 꼭짓점 표시가 되지 않습니다."],
        "생활 속 물건은 실제 물건 전체보다 그 안에서 찾을 수 있는 도형 모양을 보세요.",
        "생활 물건 분류"
      ));
    }

    if (mode === "vertex-sum-simple") {
      return makeQuestion("1-2", difficulty, index, "삼각형 1개와 사각형 1개의 꼭짓점 수를 모두 더하면 얼마인가요?", "7개", ["5개", "6개", "8개", "9개"], shapeScene("shape-grid", [
        "삼각형 1개: 꼭짓점 3개",
        "사각형 1개: 꼭짓점 4개",
        "3+4를 계산합니다."
      ], {
        items: [
          { kind: "triangle", name: "삼각형", label: "3개", sides: 3, vertices: 3 },
          { kind: "square", name: "사각형", label: "4개", sides: 4, vertices: 4 }
        ],
        targetLabels: ["3개", "4개"],
        columns: 2,
        note: "도형마다 꼭짓점 수를 따로 쓰고 더하기"
      }), "여러 도형의 꼭짓점 수는 도형별로 센 뒤 모두 더합니다.", makeFeedback(
        "도형별로 세고 더해요.",
        "두 도형을 한꺼번에 세면 빠뜨리기 쉬우므로 한 도형씩 나누어 봅니다.",
        ["삼각형의 꼭짓점은 3개입니다.", "사각형의 꼭짓점은 4개입니다.", "3+4=7개입니다."],
        "여러 도형이 나오면 도형 아래에 각각의 수를 먼저 적고 마지막에 더하세요.",
        "꼭짓점 합하기"
      ));
    }

    if (mode === "numbered-quadrilaterals") {
      return makeQuestion("1-2", difficulty, index, "번호가 붙은 도형 중 사각형만 모두 고른 것은 어느 것인가요?", "3번과 4번", ["1번과 2번", "2번과 4번", "1번과 3번", "2번과 3번"], shapeScene("shape-grid", [
        "사각형은 변이 4개이고 꼭짓점이 4개입니다.",
        "모양이 기울어져도 변이 4개이면 사각형입니다."
      ], {
        items: numberedShapes,
        targetLabels: ["3", "4"],
        columns: 4,
        note: "기울어진 모양도 변이 4개이면 사각형"
      }), "사각형은 정사각형처럼 반듯한 모양만 말하는 것이 아니라 변이 4개인 도형입니다.", makeFeedback(
        "사각형의 기준을 지켜요.",
        "기울어진 도형도 변과 꼭짓점이 4개이면 사각형입니다.",
        ["1번은 변이 3개라 삼각형입니다.", "3번과 4번은 각각 변과 꼭짓점이 4개입니다.", "따라서 사각형만 고르면 3번과 4번입니다."],
        "사각형을 찾을 때는 '네모처럼 보이는가'보다 변이 4개인지 먼저 세세요.",
        "사각형 분류"
      ));
    }

    if (mode === "tangram-nontriangle-count") {
      return makeQuestion("1-2", difficulty, index, "그림의 칠교 조각 중 삼각형이 아닌 조각은 모두 몇 개인가요?", "2개", ["1개", "3개", "4개", "5개"], shapeScene("tangram-labelled", [
        "칠교 조각 7개를 모양별로 나눕니다.",
        "삼각형이 아닌 조각은 네모 조각과 옆으로 기울인 사각형입니다."
      ], {
        pieces: tangramPieces,
        targetLabels: ["4", "6"],
        labelMode: "numbers",
        note: "삼각형이 아닌 조각만 남기기"
      }), "칠교판 문제는 전체 7개 중에서 묻는 조각만 표시하고 세어야 합니다.", makeFeedback(
        "삼각형이 아닌 조각만 남겨요.",
        "전체 조각을 모두 세면 안 되고, 조건에 맞지 않는 삼각형을 먼저 지워야 합니다.",
        ["1, 2, 3, 5, 7번은 삼각형입니다.", "4번은 네모 조각, 6번은 옆으로 기울인 사각형입니다.", "삼각형이 아닌 조각은 2개입니다."],
        "칠교 조각은 먼저 삼각형 조각에 표시하고, 표시되지 않은 조각을 세면 실수가 줄어듭니다.",
        "칠교 조각 분류"
      ));
    }

    if (mode === "tangram-square-label") {
      return makeQuestion("1-2", difficulty, index, "그림에서 네모 조각의 번호는 어느 것인가요?", "4번", ["3번", "5번", "6번", "7번"], shapeScene("tangram-labelled", [
        "칠교 조각 중 네 변의 길이가 같은 네모 조각을 찾습니다.",
        "안쪽 선이 아니라 한 조각의 바깥 윤곽을 봅니다."
      ], {
        pieces: tangramPieces,
        targetLabels: ["4"],
        labelMode: "numbers",
        note: "한 조각의 바깥 윤곽으로 이름 정하기"
      }), "칠교 조각의 이름은 완성 그림 전체가 아니라 조각 하나의 바깥 윤곽으로 판단합니다.", makeFeedback(
        "조각 하나의 바깥선을 봐요.",
        "칠교에서는 전체 판의 큰 네모가 아니라 번호가 붙은 조각 하나를 보아야 합니다.",
        ["각 조각의 바깥 선을 따로 따라갑니다.", "4번 조각은 변이 4개인 네모 조각입니다.", "따라서 네모 조각의 번호는 4번입니다."],
        "칠교 문제에서는 조각 사이의 선을 기준으로 한 조각씩 분리해서 보세요.",
        "칠교 네모 조각"
      ));
    }

    if (mode === "stack-first-floor") {
      return makeQuestion("1-2", difficulty, index, "그림의 1층에 쌓기나무는 몇 개인가요?", "4개", ["3개", "5개", "6개", "2개"], shapeScene("stack-workbook", [
        "바닥에 닿아 있는 쌓기나무만 셉니다.",
        "위에 올라간 나무는 1층 수에 넣지 않습니다."
      ], {
        groups: stackDescribeGroup,
        targetLabels: ["가"],
        ask: "first-floor",
        note: "1층은 바닥에 닿는 자리만 세기"
      }), "1층 쌓기나무는 전체 개수가 아니라 바닥에 직접 놓인 쌓기나무의 수입니다.", makeFeedback(
        "바닥에 닿은 자리만 세요.",
        "위에 올라간 쌓기나무까지 같이 세면 1층 수가 아니라 전체 수가 됩니다.",
        ["바닥 줄을 먼저 찾습니다.", "바닥에 닿는 쌓기나무는 4개입니다.", "위에 올라간 1개는 1층 수에 넣지 않습니다."],
        "쌓기나무 문제에서 '1층'이 나오면 맨 아래 줄에만 색칠하세요.",
        "쌓기나무 1층 세기"
      ));
    }

    if (mode === "stack-total") {
      return makeQuestion("1-2", difficulty, index, "그림의 쌓기나무는 모두 몇 개인가요?", "5개", ["4개", "6개", "7개", "8개"], shapeScene("stack-workbook", [
        "각 자리의 높이를 따로 봅니다.",
        "자리별 개수를 모두 더합니다."
      ], {
        groups: stackDescribeGroup,
        targetLabels: ["가"],
        ask: "total",
        note: "전체 개수는 자리별 높이 더하기"
      }), "쌓기나무 전체 개수는 위에서 보이는 자리 수가 아니라 모든 층의 쌓기나무를 더한 수입니다.", makeFeedback(
        "층별로 빠뜨리지 않고 세요.",
        "위에서 보이는 칸만 세면 위에 올라간 쌓기나무를 놓칩니다.",
        ["1층에는 4개가 있습니다.", "그 위에 1개가 더 있습니다.", "4+1=5개입니다."],
        "전체 개수는 먼저 1층을 세고, 위에 더 올라간 나무를 이어서 더하세요.",
        "쌓기나무 전체 세기"
      ));
    }

    if (mode === "stack-highest") {
      return makeQuestion("1-2", difficulty, index, "그림의 가장 높은 곳은 몇 층인가요?", "2층", ["1층", "3층", "4층", "5층"], shapeScene("stack-workbook", [
        "각 자리의 높이를 비교합니다.",
        "가장 많이 위로 쌓인 자리의 층수를 봅니다."
      ], {
        groups: stackDescribeGroup,
        targetLabels: ["가"],
        ask: "highest",
        note: "가장 높은 기둥의 층수 읽기"
      }), "가장 높은 곳은 쌓기나무 전체 개수가 아니라 한 기둥이 몇 층까지 올라갔는지를 봅니다.", makeFeedback(
        "가장 높은 기둥을 찾아요.",
        "전체 개수와 층수를 헷갈리면 답이 커질 수 있습니다.",
        ["각 자리의 높이를 비교합니다.", "왼쪽 자리는 2층까지 올라갔습니다.", "따라서 가장 높은 곳은 2층입니다."],
        "층수 문제는 가장 높은 기둥 하나에만 표시하고, 그 기둥의 칸 수를 세세요.",
        "쌓기나무 층수"
      ));
    }

    if (mode === "living-vertex-total") {
      return makeQuestion("1-2", difficulty, index, "문, 시계, 동전, 창문의 꼭짓점 수를 모두 더하면 얼마인가요?", "8개", ["4개", "6개", "10개", "12개"], shapeScene("object-shapes", [
        "문과 창문에서는 사각형 모양을 찾을 수 있습니다.",
        "시계와 동전은 둥글어서 꼭짓점이 없습니다."
      ], {
        items: objectShapes.filter((item) => ["문", "벽시계", "동전", "창문"].includes(item.name)).map((item) => ({
          ...item,
          name: item.name === "벽시계" ? "시계" : item.name
        })),
        targetNames: ["문", "창문"],
        note: "사각형 물건 2개: 4개씩, 둥근 물건 2개: 0개씩"
      }), "생활 속 물건의 꼭짓점 수는 그 물건에서 찾을 수 있는 도형 모양의 꼭짓점 수로 계산합니다.", makeFeedback(
        "물건별 꼭짓점을 나누어 세요.",
        "둥근 물건까지 꼭짓점이 있다고 생각하면 수가 커집니다.",
        ["문은 사각형 모양이라 꼭짓점 4개입니다.", "창문도 사각형 모양이라 꼭짓점 4개입니다.", "시계와 동전은 원 모양이라 0개, 모두 8개입니다."],
        "생활 속 꼭짓점 문제는 물건마다 4, 3, 0처럼 숫자를 써 놓고 마지막에 더하세요.",
        "생활 속 꼭짓점 합"
      ));
    }

    if (mode === "tangram-vertex-sum") {
      return makeQuestion("1-2", difficulty, index, "그림의 삼각형 조각들의 꼭짓점을 모두 더하면 몇 개인가요?", "15개", ["12개", "18개", "20개", "9개"], shapeScene("tangram-labelled", [
        "삼각형 조각은 1, 2, 3, 5, 7번입니다.",
        "삼각형 1개에는 꼭짓점이 3개입니다."
      ], {
        pieces: tangramPieces,
        targetLabels: ["1", "2", "3", "5", "7"],
        labelMode: "numbers",
        note: "삼각형 5개 × 꼭짓점 3개"
      }), "칠교의 여러 삼각형 조각을 세고, 한 삼각형의 꼭짓점 수를 곱해 계산합니다.", makeFeedback(
        "칠교 삼각형만 묶어요.",
        "삼각형 조각 수와 꼭짓점 수를 섞지 말고 두 단계로 봐야 합니다.",
        ["삼각형 조각은 5개입니다.", "삼각형 1개에는 꼭짓점이 3개입니다.", "5개 조각의 꼭짓점은 3×5=15개입니다."],
        "칠교 심화 문제는 '조각 수'를 먼저 쓰고, 그 다음 한 조각의 꼭짓점 수를 곱하세요.",
        "칠교 꼭짓점 합"
      ));
    }

    if (mode === "tangram-difference") {
      return makeQuestion("1-2", difficulty, index, "그림의 삼각형 조각 수와 사각형 조각 수의 차는 몇 개인가요?", "3개", ["1개", "2개", "4개", "5개"], shapeScene("tangram-labelled", [
        "삼각형 조각은 5개입니다.",
        "사각형으로 볼 수 있는 조각은 네모와 옆으로 기울인 사각형 2개입니다."
      ], {
        pieces: tangramPieces,
        targetLabels: ["1", "2", "3", "4", "5", "6", "7"],
        labelMode: "numbers",
        note: "두 종류를 각각 세고 큰 수에서 작은 수 빼기"
      }), "차를 묻는 칠교 문제는 두 종류의 조각 수를 각각 센 뒤 빼야 합니다.", makeFeedback(
        "각각 세고 차이를 구해요.",
        "차이는 전체 조각 수가 아니라 두 묶음의 수가 얼마나 다른지 묻는 말입니다.",
        ["삼각형 조각은 5개입니다.", "사각형 조각은 2개입니다.", "5-2=3개입니다."],
        "차이를 묻는 문제에서는 두 막대처럼 각각의 개수를 먼저 적고 큰 수에서 작은 수를 빼세요.",
        "칠교 조각 차이"
      ));
    }

    if (mode === "stack-compare-count") {
      return makeQuestion("1-2", difficulty, index, "두 모양 중 더 많은 쌓기나무를 쓴 모양은 어느 쪽인가요?", "오른쪽", ["왼쪽", "둘 다 같습니다", "알 수 없습니다"], shapeScene("stack-workbook", [
        "왼쪽과 오른쪽을 따로 셉니다.",
        "각 자리의 높이를 모두 더해 비교합니다."
      ], {
        groups: stackCompareGroups,
        targetLabels: ["오른쪽"],
        ask: "compare-total",
        note: "두 모양을 각각 세고 비교하기"
      }), "쌓기나무 비교는 보이는 넓이가 아니라 실제 사용한 쌓기나무 수를 각각 세어 비교합니다.", makeFeedback(
        "두 모양을 따로 세요.",
        "한쪽을 대충 더 커 보인다고 고르면 위에 쌓인 나무를 놓칠 수 있습니다.",
        ["왼쪽은 1+2+1=4개입니다.", "오른쪽은 2+1+2=5개입니다.", "더 많은 쌓기나무를 쓴 모양은 오른쪽입니다."],
        "비교 문제에서는 왼쪽 합과 오른쪽 합을 각각 쓴 뒤 큰 쪽에 표시하세요.",
        "쌓기나무 비교"
      ));
    }

    if (mode === "stack-choice-description") {
      return makeQuestion("1-2", difficulty, index, "쌓기나무 4개를 옆으로 나란히 놓고, 맨 왼쪽 쌓기나무 위에 2개를 올려 놓았습니다. 설명과 같은 모양은 어느 쪽인가요?", "왼쪽", ["오른쪽", "둘 다", "둘 다 아닙니다"], shapeScene("stack-workbook", [
        "먼저 1층에 4개를 나란히 놓습니다.",
        "맨 왼쪽 자리 위에 2개를 더 올립니다."
      ], {
        groups: [
          { label: "왼쪽", towers: [3, 1, 1, 1], caption: "왼쪽" },
          { label: "오른쪽", towers: [1, 1, 1, 3], caption: "오른쪽" }
        ],
        targetLabels: ["왼쪽"],
        ask: "description",
        note: "설명 순서대로 바닥 먼저, 그다음 위에 올리기"
      }), "쌓기나무 설명 문제는 말의 순서를 그림으로 옮겨야 합니다.", makeFeedback(
        "설명 순서대로 쌓아요.",
        "맨 왼쪽과 맨 오른쪽을 바꾸면 모양은 비슷해 보여도 조건이 달라집니다.",
        ["1층에 4개가 나란히 있습니다.", "맨 왼쪽 자리 위에 2개를 올리면 왼쪽 기둥이 3층이 됩니다.", "따라서 설명과 같은 모양은 왼쪽입니다."],
        "설명형 쌓기나무 문제는 '먼저 놓기'와 '위에 올리기'를 화살표 순서로 그리세요.",
        "쌓기나무 설명 옮기기"
      ));
    }

    if (mode === "tangram-count") {
      return makeQuestion("1-2", difficulty, index, "칠교판 조각 중 삼각형 조각은 모두 몇 개인가요?", "5개", ["3개", "4개", "6개", "7개"], shapeScene("tangram-labelled", [
        "칠교판 조각을 모양별로 분류합니다.",
        "삼각형 조각만 세어 봅니다."
      ], {
        pieces: tangramPieces,
        targetLabels: ["1", "2", "3", "5", "7"],
        labelMode: "numbers",
        note: "삼각형 조각 1, 2, 3, 5, 7번 표시하기"
      }), "칠교판은 조각의 모양을 구별하며 세어야 합니다.", makeFeedback(
        "칠교 조각을 모양별로 세요.",
        "칠교판 문제는 전체 조각 수를 묻는지, 특정 모양 조각 수를 묻는지 먼저 확인해야 합니다.",
        ["칠교판에는 여러 모양의 조각이 섞여 있습니다.", "삼각형 조각만 표시해서 셉니다.", "표시된 삼각형 조각은 5개입니다."],
        "도형 조각 문제는 먼저 같은 모양끼리 색 표시를 하고, 표시한 조각만 세세요."
      ));
    }

    if (mode === "tangram-compose") {
      const target = { answer: "사각형", pieces: ["삼각형", "삼각형"], hint: "두 삼각형의 긴 변을 맞대면 네 꼭짓점이 있는 바깥 윤곽이 생깁니다." };
      return makeQuestion("1-2", difficulty, index, "칠교 조각 중 삼각형 2개의 긴 변을 맞대어 빈틈없이 붙이면 만들 수 있는 도형은 무엇인가요?", target.answer, ["삼각형", "원", "오각형", "육각형"], shapeScene("tangram-compose", [
        "조각을 돌리고 뒤집어 빈틈없이 맞춥니다.",
        "완성된 바깥쪽 변을 봅니다."
      ], {
        pieces: target.pieces,
        target: target.answer
      }), "칠교 조각은 한 조각의 이름이 아니라 맞붙인 뒤 바깥 윤곽으로 완성 도형을 판단합니다.", makeFeedback(
        "바깥 윤곽을 따라가요.",
        "칠교 조각을 붙인 문제는 안쪽 선이 아니라 완성된 모양의 바깥쪽 변과 꼭짓점을 봐야 합니다.",
        ["두 조각을 빈틈없이 맞붙입니다.", "안쪽에 생긴 선은 완성 도형의 변으로 세지 않습니다.", `바깥 윤곽을 따라가면 ${target.answer}입니다.`],
        target.hint
      ));
    }

    if (mode === "stack-top-view" || mode === "stack-total") {
      const towers = [
        1 + (index % 3),
        2 + ((index + 1) % 2),
        1 + ((index + 2) % 3),
        1 + ((index + 3) % 2)
      ];
      const topCount = towers.filter((height) => height > 0).length;
      const totalBlocks = towers.reduce((sum, height) => sum + height, 0);
      const isTop = mode === "stack-top-view";
      const answer = isTop ? topCount : totalBlocks;
      return makeQuestion("1-2", difficulty, index, isTop
        ? "쌓은 모양을 위에서 보면 보이는 칸은 몇 칸인가요?"
        : "쌓은 모양에 사용한 쌓기나무는 모두 몇 개인가요?", `${answer}개`, numChoices(answer, "개", [-2, -1, 1, 2, 3]), shapeScene("stack-cubes", [
        "각 자리의 높이를 봅니다.",
        isTop ? "위에서 볼 때는 높이가 아니라 자리가 보입니다." : "모든 자리의 높이를 더합니다."
      ], {
        towers,
        ask: isTop ? "top" : "total",
        answer
      }), isTop ? "위에서 본 모양은 쌓은 높이와 상관없이 쌓기나무가 놓인 자리의 수를 봅니다." : "사용한 쌓기나무 수는 각 자리의 높이를 모두 더합니다.", makeFeedback(
        isTop ? "위에서 보이는 자리를 세요." : "자리별 높이를 모두 더해요.",
        isTop
          ? "쌓은 모양은 위에서 볼 때 높은 기둥도 한 자리로 보입니다."
          : "쌓기나무 전체 개수는 위에서 보이는 칸 수가 아니라 각 기둥의 높이를 더해야 합니다.",
        isTop
          ? ["쌓기나무가 놓인 자리를 찾습니다.", "높이가 2개나 3개여도 위에서는 한 칸입니다.", `보이는 자리는 ${answer}칸입니다.`]
          : towers.map((height, towerIndex) => `${towerIndex + 1}번째 자리: ${height}개`).concat(`모두 더하면 ${answer}개입니다.`),
        isTop ? "위에서 보는 문제는 '기둥의 꼭대기만 본다'고 생각하세요." : "전체 개수 문제는 높이 숫자를 모두 더하세요."
      ));
    }

    if (mode === "total-vertices" || mode === "total-sides") {
      const first = shapes[(index + 1) % shapes.length];
      const second = shapes[(index + 3) % shapes.length];
      const firstCount = mode === "total-vertices" ? first.vertices : first.sides;
      const secondCount = mode === "total-vertices" ? second.vertices : second.sides;
      const answer = firstCount * 2 + secondCount;
      const unit = mode === "total-vertices" ? "꼭짓점" : "변";
      return makeQuestion("1-2", difficulty, index, `${first.name} 2개와 ${second.name} 1개의 ${unit}은 모두 몇 개인가요?`, `${answer}개`, numChoices(answer, "개", [-3, -2, -1, 1, 2, 3]), [
        `${first.name} 1개: ${unit} ${firstCount}개`,
        `${second.name} 1개: ${unit} ${secondCount}개`,
        "같은 도형이 2개입니다."
      ], `여러 도형의 ${unit} 수는 도형마다 세고 모두 더합니다.`, makeFeedback(
        `${unit}을 도형별로 세요.`,
        "심화 도형 문제는 한 도형만 세는 것이 아니라 여러 도형의 수를 빠뜨리지 않고 모아야 합니다.",
        [`${first.name} 1개에는 ${unit}이 ${firstCount}개입니다.`, `${first.name} 2개는 ${firstCount * 2}개입니다.`, `${firstCount * 2}+${secondCount}=${answer}개입니다.`],
        "같은 도형이 여러 개 나오면 먼저 한 개의 수를 적고, 몇 개인지 곱한 뒤 더하세요."
      ));
    }

    if (mode === "not-matching-feature") {
      return makeQuestion("1-2", difficulty, index, `${shape.name}을 설명한 말이 아닌 것은 무엇인가요?`, "꼭짓점이 0개입니다", [
        `변이 ${shape.sides}개입니다`,
        `꼭짓점이 ${shape.vertices}개입니다`,
        "곧은 선으로 둘러싸여 있습니다",
        "꼭짓점이 0개입니다"
      ], [
        `${shape.name}: 변 ${shape.sides}개`,
        `${shape.name}: 꼭짓점 ${shape.vertices}개`,
        "틀린 설명을 찾습니다."
      ], "도형 설명 문제는 맞는 특징이 아니라 틀린 특징을 고르는 경우가 있습니다.", makeFeedback(
        "묻는 말을 먼저 확인해요.",
        "'아닌 것'을 묻고 있으므로 맞는 설명을 고르면 오답입니다.",
        [`${shape.name}은 변이 ${shape.sides}개입니다.`, `꼭짓점도 ${shape.vertices}개입니다.`, `꼭짓점이 0개라는 말은 ${shape.name}에 맞지 않습니다.`],
        "'아닌 것' 문제에서는 맞는 보기에 표시하지 말고, 틀린 설명을 찾는다고 크게 적어 두세요."
      ));
    }

    if (mode === "shape-pattern-3") {
      return makeQuestion("1-2", difficulty, index, "삼각형, 사각형, 원, 삼각형, 사각형, 원 다음에 올 도형은?", "삼각형", ["사각형", "원", "오각형"], [
        "삼각형-사각형-원",
        "세 도형이 한 묶음입니다."
      ], "세 도형이 한 묶음으로 반복되는 규칙을 찾습니다.", makeFeedback(
        "세 개짜리 반복 묶음을 찾아요.",
        "심화 도형 규칙은 두 개가 아니라 세 개가 한 묶음일 수 있습니다.",
        ["삼각형-사각형-원이 한 묶음입니다.", "그 묶음이 다시 반복됩니다.", "원 다음에는 새 묶음의 첫 도형인 삼각형이 옵니다."],
        "규칙 문제에서는 반복되는 가장 짧은 묶음을 괄호로 묶고 다음 자리를 보세요."
      ));
    }

    if (mode === "name-by-features") {
      return makeQuestion("1-2", difficulty, index, `변이 ${shape.sides}개이고 꼭짓점이 ${shape.vertices}개인 도형은 무엇인가요?`, shape.name, shapes.map((item) => item.name).filter((name) => name !== shape.name).concat(["원"]), [
        `변 ${shape.sides}개`,
        `꼭짓점 ${shape.vertices}개`,
        "변과 꼭짓점을 함께 세어 보세요."
      ], "도형의 이름은 변과 꼭짓점의 수와 연결됩니다.", makeFeedback(
        "변과 꼭짓점을 함께 세어요.",
        "도형 이름은 변의 개수와 꼭짓점의 개수를 함께 보면 정확해집니다.",
        [`이 도형은 변이 ${shape.sides}개입니다.`, `꼭짓점도 ${shape.vertices}개입니다.`, `그래서 ${shape.name}입니다.`],
        "도형 문제는 변만 보지 말고 꼭짓점까지 한 번 더 세어 보세요."
      ));
    }

    if (mode === "vertex-count") {
      return makeQuestion("1-2", difficulty, index, `${shape.name}의 꼭짓점은 몇 개인가요?`, `${shape.vertices}개`, numChoices(shape.vertices, "개", [-2, -1, 1, 2, 3]), [
        shape.name,
        "모서리가 만나는 뾰족한 점을 세어 보세요."
      ], "꼭짓점은 변과 변이 만나는 점입니다.", makeFeedback(
        "꼭짓점의 뜻을 다시 봐요.",
        "꼭짓점은 도형의 뾰족한 곳, 즉 변과 변이 만나는 점입니다.",
        [`${shape.name}은 변이 ${shape.sides}개입니다.`, `변들이 만나는 곳도 ${shape.vertices}개입니다.`, `따라서 꼭짓점은 ${shape.vertices}개입니다.`],
        "도형을 공중에 따라 그리며 꺾이는 곳마다 하나씩 세어 보세요."
      ));
    }

    if (mode === "circle") {
      return makeQuestion("1-2", difficulty, index, "다음 중 굽은 선으로만 이루어져 꼭짓점이 없는 도형은 무엇인가요?", "원", ["삼각형", "사각형"], [
        "꼭짓점이 없습니다.",
        "굽은 선으로 둘러싸여 있습니다."
      ], "원은 변과 꼭짓점이 없습니다.", makeFeedback(
        "꼭짓점이 없는 도형을 찾아요.",
        "원은 곧은 변이나 뾰족한 꼭짓점 없이 굽은 선으로 이어진 도형입니다.",
        ["삼각형, 사각형, 오각형은 꼭짓점이 있습니다.", "원은 뾰족한 곳이 없습니다.", "그래서 정답은 원입니다."],
        "보기의 모양을 떠올리며 뾰족한 곳이 있는지 먼저 확인하세요."
      ));
    }

    const sequence = ["삼각형", "사각형", "삼각형", "사각형"];
    return makeQuestion("1-2", difficulty, index, "삼각형, 사각형, 삼각형, 사각형 다음에 올 도형은?", "삼각형", ["사각형", "원"], sequence.concat(["?"]), "반복되는 도형 규칙을 찾습니다.", makeFeedback(
      "반복 단위를 찾아요.",
      "도형이 하나씩 바뀌는 것이 아니라 '삼각형, 사각형' 두 개가 한 묶음으로 반복됩니다.",
      ["앞에서부터 두 개씩 끊어 보면 삼각형-사각형입니다.", "그 묶음이 다시 반복됩니다.", "사각형 다음에는 새 묶음의 첫 도형인 삼각형이 옵니다."],
      "도형 규칙은 반복되는 가장 짧은 묶음을 먼저 동그라미 쳐 보세요."
    ));
  }

  function buildAddSubQuestion(difficulty, index) {
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["add-no-carry", "sub-no-borrow", "story-add-easy", "make-ten"],
      mid: ["add-carry", "sub-borrow", "story-add-carry", "missing-addend"],
      high: ["sub-borrow-split", "hundred-sub-borrow", "two-step-story", "missing-subtract"]
    });

    if (mode === "add-no-carry") {
      const onesA = 1 + (index % 4);
      const onesB = 1 + ((index * 2) % (8 - onesA));
      const a = 20 + ((index * 3) % 5) * 10 + onesA;
      const b = 10 + ((index * 5) % 4) * 10 + onesB;
      const result = a + b;
      return makeQuestion("1-3", difficulty, index, `${a}+${b}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        `일의 자리 ${a % 10}+${b % 10}`,
        `십의 자리 ${Math.floor(a / 10)}+${Math.floor(b / 10)}`,
        "자리끼리 더하면 됩니다."
      ], "일의 자리 합이 10보다 작으면 받아올림 없이 자리끼리 더합니다.", makeFeedback(
        "자리끼리 차례로 더해요.",
        "이 문제는 일의 자리에서 10개가 만들어지지 않으므로 받아올림이 없습니다.",
        [`일의 자리 ${a % 10}+${b % 10}=${result % 10}입니다.`, `십의 자리 ${Math.floor(a / 10)}+${Math.floor(b / 10)}=${Math.floor(result / 10)}입니다.`, `십의 자리 숫자는 ${Math.floor(result / 10)}, 일의 자리 숫자는 ${result % 10}이므로 ${a}+${b}=${result}입니다.`],
        "기초 덧셈은 일의 자리, 십의 자리를 따로 밑줄 치고 같은 자리끼리 더하세요."
      ));
    }

    if (mode === "sub-no-borrow") {
      const subTens = 1 + (index % 3);
      const subOnes = 1 + (index % 5);
      const big = (subTens + 3) * 10 + subOnes + 3;
      const sub = subTens * 10 + subOnes;
      const result = big - sub;
      return makeQuestion("1-3", difficulty, index, `${big}-${sub}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        `일의 자리 ${big % 10}-${sub % 10}`,
        `십의 자리 ${Math.floor(big / 10)}-${Math.floor(sub / 10)}`,
        "바로 뺄 수 있습니다."
      ], "일의 자리에서 바로 뺄 수 있으면 받아내림 없이 자리끼리 뺍니다.", makeFeedback(
        "뺄 수 있는 자리부터 빼요.",
        "일의 자리 수가 충분하므로 십의 자리를 바꾸지 않아도 됩니다.",
        [`일의 자리 ${big % 10}-${sub % 10}=${result % 10}입니다.`, `십의 자리 ${Math.floor(big / 10)}-${Math.floor(sub / 10)}=${Math.floor(result / 10)}입니다.`, `따라서 ${big}-${sub}=${result}입니다.`],
        "뺄셈은 먼저 일의 자리에서 바로 뺄 수 있는지 확인하세요."
      ));
    }

    if (mode === "story-add-easy") {
      const first = 20 + ((index * 3) % 4) * 10 + (index % 4);
      const more = 10 + ((index * 5) % 3) * 10 + (2 + (index % 3));
      const total = first + more;
      return makeQuestion("1-3", difficulty, index, `민지가 스티커 ${first}장을 가지고 있고 ${more}장을 더 받았습니다. 모두 몇 장인가요?`, `${total}장`, numChoices(total, "장", [-10, -1, 1, 10, 5, -5]), [
        `처음 ${first}장`,
        `더 받은 ${more}장`,
        "모두를 묻습니다."
      ], "더 받은 뒤 모두를 묻는 문제는 덧셈입니다.", makeFeedback(
        "늘어난 수를 더해요.",
        "'더 받았습니다'는 처음 수에 더 받은 수가 붙는 상황입니다.",
        [`처음은 ${first}장입니다.`, `더 받은 것은 ${more}장입니다.`, `모두는 ${first}+${more}=${total}장입니다.`],
        "문장제에서는 먼저 '처음', '더 받은 것', '모두'에 밑줄을 그어 보세요."
      ));
    }

    if (mode === "make-ten") {
      const left = 4 + (index % 5);
      const answer = 10 - left;
      return makeQuestion("1-3", difficulty, index, `${left}+□=10일 때 □에 알맞은 수는?`, `${answer}`, numChoices(answer, "", [-2, -1, 1, 2, 3]), [
        `${left}에서 10까지`,
        "10을 만드는 짝을 찾습니다."
      ], "10을 만드는 짝을 알면 받아올림 덧셈이 쉬워집니다.", makeFeedback(
        "10의 짝을 찾아요.",
        "기초 단계에서는 먼저 10을 만드는 수 짝을 익히는 것이 중요합니다.",
        [`${left}에서 10까지 더 가야 합니다.`, `${left}+${answer}=10입니다.`, `따라서 □=${answer}입니다.`],
        `손가락 10개 중 이미 있는 ${left}개를 접고 남은 손가락을 세어 보세요.`
      ));
    }

    if (mode === "add-carry") {
      const a = 30 + ((index * 7) % 3) * 10 + (6 + (index % 4));
      const b = 10 + ((index * 5) % 2) * 10 + (5 + ((index + 1) % 4));
      const result = a + b;
      return makeQuestion("1-3", difficulty, index, `${a}+${b}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        `일의 자리 ${a % 10}+${b % 10}`,
        "10개가 되면 십 1개로 바꿉니다.",
        "십의 자리에 붙여 더합니다."
      ], "더한 일의 자리 10개는 십 1개로 바꾸어 십의 자리에 붙입니다.", makeFeedback(
        "10개를 십 1개로 바꿔요.",
        "일의 자리 합이 10을 넘으면 일에 그대로 둘 수 없고 십의 자리로 올려야 합니다.",
        [`일의 자리 ${a % 10}+${b % 10}=${(a % 10) + (b % 10)}입니다.`, `10개를 십 1개로 바꾸고 남은 일은 ${result % 10}개입니다.`, `십의 자리까지 더하면 ${result}입니다.`],
        "받아올림은 '일 10개를 십 1개로 이름 바꾸기'라고 생각하세요."
      ));
    }

    if (mode === "sub-borrow") {
      const subOnes = 6 + (index % 4);
      const sub = (1 + (index % 3)) * 10 + subOnes;
      const big = (5 + ((index * 2) % 4)) * 10 + (subOnes - 3);
      const result = big - sub;
      return makeQuestion("1-3", difficulty, index, `${big}-${sub}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        `일의 자리 ${big % 10}-${sub % 10}`,
        "일이 모자라면 십 1개를 일 10개로 바꿉니다.",
        "바꾼 뒤 자리끼리 뺍니다."
      ], "받아내림은 큰 수를 계산하기 좋게 나누어 보는 방법입니다.", makeFeedback(
        "십 1개를 일 10개로 바꿔요.",
        "일의 자리에서 바로 뺄 수 없으면 십 1개를 일 10개로 바꾸어 일의 자리에 붙입니다.",
        [`${big % 10}에서 ${sub % 10}을 뺄 수 없습니다.`, `십 1개를 일 10개로 바꾸면 일의 자리가 ${(big % 10) + 10}개가 됩니다.`, `자리끼리 빼면 ${big}-${sub}=${result}입니다.`],
        "받아내림은 '십 1개를 일 10개로 바꾸어 쓰기'로 생각하세요."
      ));
    }

    if (mode === "story-add-carry") {
      const first = 48 + (index % 5);
      const more = 24 + ((index * 3) % 6);
      const total = first + more;
      return makeQuestion("1-3", difficulty, index, `민지가 스티커 ${first}장을 가지고 있고 ${more}장을 더 받았습니다. 모두 몇 장인가요?`, `${total}장`, numChoices(total, "장", [-10, -1, 1, 10, 5, -5]), [
        `처음 ${first}장`,
        `더 받은 ${more}장`,
        "전체를 구합니다."
      ], "처음 수와 더 받은 수를 한 막대에 이어 붙여 전체를 구합니다.", makeFeedback(
        "모두는 더하기예요.",
        "수가 늘어난 상황에서 모두를 물으면 덧셈으로 풀어야 합니다.",
        [`처음 ${first}장에 더 받은 ${more}장을 붙입니다.`, `식은 ${first}+${more}입니다.`, `계산하면 ${total}장입니다.`],
        "문장제는 숫자만 보지 말고 '더 받았다', '모두' 같은 행동 말을 먼저 표시하세요."
      ));
    }

    if (mode === "missing-addend") {
      const known = 18 + ((index * 5) % 30);
      const missing = 14 + ((index * 7) % 36);
      const total = known + missing;
      return makeQuestion("1-3", difficulty, index, `□+${known}=${total}일 때 □에 알맞은 수는?`, `${missing}`, numChoices(missing, "", [-10, -1, 1, 10, known, -known]), [
        `□ + ${known} = ${total}`,
        "전체에서 알고 있는 수를 뺍니다."
      ], "덧셈식의 빈칸은 전체에서 알고 있는 부분을 빼서 찾습니다.", makeFeedback(
        "빈칸은 전체에서 빼요.",
        "□가 있는 덧셈식은 '전체-알고 있는 부분'으로 빠진 부분을 찾습니다.",
        [`전체는 ${total}입니다.`, `이미 알고 있는 부분은 ${known}입니다.`, `${total}-${known}=${missing}이므로 □=${missing}입니다.`],
        "□식은 전체 수에 동그라미, 알고 있는 수에 밑줄을 그은 뒤 빼세요."
      ));
    }

    if (mode === "sub-borrow-split") {
      const big = 66 + ((index % 3) * 10);
      const sub = 18 + (index % 2);
      const result = big - sub;
      const bigTensPart = (Math.floor(big / 10) - 1) * 10;
      const bigOnesPart = 10 + (big % 10);
      const subTensPart = Math.floor(sub / 10) * 10;
      const subOnesPart = sub % 10;
      return makeQuestion("1-3", difficulty, index, `${big}-${sub}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        `${big}을 ${bigTensPart}과 ${bigOnesPart}으로 바꾸어 봅니다.`,
        `${bigTensPart}에서 ${subTensPart}을 빼고 ${bigOnesPart}에서 ${subOnesPart}을 뺍니다.`,
        "남은 두 수를 모읍니다."
      ], "일의 자리에서 뺄 수 없을 때는 처음 수를 계산하기 좋은 두 부분으로 나누어 봅니다.", makeFeedback(
        "큰 수를 두 부분으로 나누어 빼요.",
        `${big}을 ${bigTensPart}과 ${bigOnesPart}으로 바꾸면 일의 자리 뺄셈이 쉬워집니다.`,
        [`${bigTensPart}-${subTensPart}=${bigTensPart - subTensPart}입니다.`, `${bigOnesPart}-${subOnesPart}=${bigOnesPart - subOnesPart}입니다.`, `${bigTensPart - subTensPart}과 ${bigOnesPart - subOnesPart}을 모으면 ${result}입니다.`],
        "받아내림 문제는 '처음 수를 50과 16처럼 나누어 보기'로 설명하면 오개념이 줄어듭니다."
      ));
    }

    if (mode === "hundred-sub-borrow") {
      const sub = 23 + ((index * 5) % 15);
      const result = 100 - sub;
      const subTensPart = Math.floor(sub / 10) * 10;
      const subOnesPart = sub % 10;
      return makeQuestion("1-3", difficulty, index, `100-${sub}의 값은 무엇인가요?`, `${result}`, numChoices(result, "", [-10, -1, 1, 10, 9, -9]), [
        "100을 90과 10으로 바꾸어 봅니다.",
        `90에서 ${subTensPart}을 빼고 10에서 ${subOnesPart}을 뺍니다.`,
        "남은 수를 모읍니다."
      ], "100에서 빼기는 100을 90과 10으로 나누면 한국어식으로 이해하기 쉽습니다.", makeFeedback(
        "100을 90과 10으로 나누어요.",
        `100에서 ${sub}을 뺄 때 100을 90과 10으로 바꾸면 십과 일을 나누어 뺄 수 있습니다.`,
        [`${sub}은 ${subTensPart}과 ${subOnesPart}입니다.`, `90-${subTensPart}=${90 - subTensPart}, 10-${subOnesPart}=${10 - subOnesPart}입니다.`, `남은 수를 모으면 ${result}입니다.`],
        "100에서 빼는 문제는 '100을 90과 10으로 나누기'를 먼저 떠올리세요."
      ));
    }

    if (mode === "two-step-story") {
      const start = 45 + ((index * 3) % 20);
      const more = 18 + (index % 8);
      const used = 12 + ((index * 5) % 9);
      const answer = start + more - used;
      return makeQuestion("1-3", difficulty, index, `스티커가 ${start}장 있었고 ${more}장을 더 받았습니다. 그중 ${used}장을 썼다면 몇 장이 남았나요?`, `${answer}장`, numChoices(answer, "장", [-10, -1, 1, 10, 5, -5]), [
        `먼저 ${start}+${more}`,
        `그다음 ${used}장 빼기`,
        "두 단계 문제입니다."
      ], "늘어난 뒤 줄어든 상황이므로 먼저 더하고 나중에 뺍니다.", makeFeedback(
        "순서대로 두 번 계산해요.",
        "심화 문장제는 행동이 두 번 나오므로 한 번에 답을 찍으면 헷갈립니다.",
        [`먼저 받은 뒤의 수는 ${start}+${more}=${start + more}장입니다.`, `그중 ${used}장을 썼습니다.`, `${start + more}-${used}=${answer}장이 남습니다.`],
        "두 단계 문장제는 행동 말을 순서대로 번호 붙이고 식도 두 줄로 쓰세요."
      ));
    }

    const total = 70 + ((index * 7) % 25);
    const answer = 18 + ((index * 5) % 20);
    const remain = total - answer;
    return makeQuestion("1-3", difficulty, index, `${total}-□=${remain}일 때 □에 알맞은 수는?`, `${answer}`, numChoices(answer, "", [-10, -1, 1, 10, remain, -remain]), [
      `${total} - □ = ${remain}`,
      "처음 수와 남은 수의 차이를 찾습니다."
    ], "뺄셈식의 빈칸은 처음 수에서 남은 수를 빼서 찾습니다.", makeFeedback(
      "얼마를 뺐는지 찾아요.",
      "처음 수에서 얼마를 빼서 남은 수가 되었는지 묻는 역문제입니다.",
      [`처음 수는 ${total}입니다.`, `남은 수는 ${remain}입니다.`, `${total}-${remain}=${answer}이므로 □=${answer}입니다.`],
      "뺄셈 빈칸은 '처음-남은 것=뺀 것'으로 말해 보고 식을 세우세요."
    ));
  }

  function buildCmLengthQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const a = difficulty === "low"
      ? 12 + ((index * 4) % 24)
      : 18 + ((index * 4 + level * 7) % 58);
    const b = difficulty === "low"
      ? 5 + ((index * 3) % 16)
      : 5 + ((index * 6 + level * 3) % 35);
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["ruler-zero", "add-ten", "compare", "join", "estimate-object"],
      mid: ["join", "compare", "add-ten", "ruler-zero", "estimate-near"],
      high: ["two-step-length", "unknown-piece", "compare-after-add", "ruler-offset", "estimate-error"]
    });

    if (mode === "estimate-object") {
      const items = [
        { name: "연필", answer: 15, choices: ["2cm", "15cm", "80cm", "2m"], clue: "손 한 뼘보다 조금 긴 길이" },
        { name: "지우개", answer: 5, choices: ["5cm", "30cm", "90cm", "3m"], clue: "손가락 두세 마디 정도의 길이" },
        { name: "수학책의 짧은 쪽", answer: 20, choices: ["3cm", "20cm", "70cm", "2m"], clue: "한 뼘과 비슷한 길이" }
      ];
      const item = items[index % items.length];
      return makeQuestion("1-4", difficulty, index, `${item.name} 길이로 가장 알맞은 것은 무엇인가요?`, `${item.answer}cm`, item.choices.filter((choice) => choice !== `${item.answer}cm`), lengthScene("estimate", [
        item.name,
        item.clue,
        "너무 작거나 큰 보기는 지웁니다."
      ], {
        objectName: item.name,
        estimateCm: item.answer,
        clue: item.clue
      }), "길이를 어림할 때는 실제 물건의 크기와 cm 단위를 연결해 생각합니다.", makeFeedback(
        "몸 기준으로 어림해요.",
        "어림 문제는 정확히 재는 문제가 아니라, 물건의 크기에 가장 가까운 보기를 고르는 문제입니다.",
        [`${item.name}은 ${item.clue}입니다.`, "너무 작은 길이와 너무 큰 길이를 먼저 지웁니다.", `가장 알맞은 길이는 ${item.answer}cm입니다.`],
        "어림할 때는 손가락, 한 뼘, 팔 길이처럼 몸 기준을 먼저 떠올리세요."
      ));
    }

    if (mode === "estimate-near" || mode === "estimate-error") {
      const real = 18 + ((index * 7) % 43);
      const estimates = [real - 8, real - 2, real + 5].map((value) => Math.max(1, value));
      const best = estimates.reduce((winner, value) => Math.abs(value - real) < Math.abs(winner - real) ? value : winner, estimates[0]);
      return makeQuestion("1-4", difficulty, index, `${real}cm에 가장 가깝게 어림한 길이는 무엇인가요?`, `${best}cm`, estimates.filter((value) => value !== best).map((value) => `${value}cm`).concat(`${real + 15}cm`), lengthScene("estimate", [
        `실제 길이 ${real}cm`,
        "각 어림값과 실제 길이의 차이를 비교합니다.",
        "차이가 가장 작은 어림을 찾습니다."
      ], {
        realCm: real,
        estimates,
        estimateCm: best
      }), "가장 잘 어림한 값은 실제 길이와의 차이가 가장 작은 값입니다.", makeFeedback(
        "어림값과 실제 길이의 차이를 봐요.",
        "어림은 대충 고르는 것이 아니라, 실제 길이에 가장 가까운 값을 찾는 활동입니다.",
        estimates.map((value) => `${value}cm는 실제 길이와 ${Math.abs(value - real)}cm 차이입니다.`).concat(`차이가 가장 작은 것은 ${best}cm입니다.`),
        "어림값 비교는 실제 길이 위아래에 각 보기를 놓고, 남는 차이가 가장 짧은 것을 고르세요."
      ));
    }

    if (mode === "unknown-piece") {
      const total = 58 + ((index * 7) % 31);
      const known = 18 + ((index * 5) % 25);
      const answer = total - known;
      return makeQuestion("1-4", difficulty, index, `색 테이프 전체가 ${total}cm입니다. 한 부분이 ${known}cm이면 나머지 부분은 몇 cm인가요?`, `${answer}cm`, numChoices(answer, "cm", [-10, -2, -1, 1, 2, 10]), lengthScene("compare", [
        `전체 ${total}cm`,
        `한 부분 ${known}cm`,
        "나머지 부분을 찾습니다."
      ], {
        parts: [
          { label: "전체", cm: total, text: `${total}cm` },
          { label: "한 부분", cm: known, text: `${known}cm` }
        ],
        differenceCm: answer
      }), "전체에서 알고 있는 한 부분을 빼면 나머지 길이를 찾을 수 있습니다.", makeFeedback(
        "전체와 부분을 나눠 봐요.",
        "심화 길이 문제는 이어 붙이는 길이가 아니라 전체에서 빠진 한 부분을 거꾸로 찾습니다.",
        [`전체 길이는 ${total}cm입니다.`, `알고 있는 한 부분은 ${known}cm입니다.`, `${total}-${known}=${answer}cm가 나머지입니다.`],
        "전체-부분 문제는 전체 길이에 큰 괄호를 치고, 알고 있는 부분을 빼서 남은 부분을 찾으세요."
      ));
    }

    if (mode === "compare-after-add") {
      const joined = a + b;
      const base = Math.max(5, joined - (8 + (index % 11)));
      const diff = joined - base;
      return makeQuestion("1-4", difficulty, index, `${a}cm와 ${b}cm를 이어 붙인 길이는 ${base}cm보다 몇 cm 더 긴가요?`, `${diff}cm`, numChoices(diff, "cm", [-4, -2, -1, 1, 2, 4]), lengthScene("compare", [
        `${a}cm + ${b}cm`,
        `${base}cm와 비교`,
        "먼저 전체를 만든 뒤 비교합니다."
      ], {
        parts: [
          { label: "이어 붙인 길이", cm: joined, text: `${joined}cm` },
          { label: "비교 길이", cm: base, text: `${base}cm` }
        ],
        differenceCm: diff
      }), "이어 붙인 길이를 먼저 구하고, 그다음 비교 길이와 차이를 구합니다.", makeFeedback(
        "먼저 더하고 나중에 비교해요.",
        "심화 비교 문제는 바로 빼기 전에 비교할 첫 길이를 만들어야 합니다.",
        [`이어 붙이면 ${a}+${b}=${joined}cm입니다.`, `${joined}cm와 ${base}cm를 비교합니다.`, `${joined}-${base}=${diff}cm 더 깁니다.`],
        "두 단계 길이 비교는 1번 '이어 붙이기', 2번 '비교하기'로 나누어 식을 쓰세요."
      ));
    }

    if (mode === "ruler-offset") {
      const startTick = 2 + (index % 5);
      const endTick = startTick + 12 + ((index * 3) % 12);
      const answer = endTick - startTick;
      return makeQuestion("1-4", difficulty, index, `물건의 한쪽 끝이 ${startTick}cm 눈금, 다른 쪽 끝이 ${endTick}cm 눈금에 있습니다. 물건의 길이는 몇 cm인가요?`, `${answer}cm`, numChoices(answer, "cm", [-5, -2, -1, 1, 2, 5]), lengthScene("compare", [
        `시작 눈금 ${startTick}cm`,
        `끝 눈금 ${endTick}cm`,
        "끝 눈금에서 시작 눈금을 뺍니다."
      ], {
        parts: [
          { label: "끝 눈금", cm: endTick, text: `${endTick}cm` },
          { label: "시작 눈금", cm: startTick, text: `${startTick}cm` }
        ],
        differenceCm: answer
      }), "0이 아닌 눈금에서 시작하면 끝 눈금에서 시작 눈금을 빼야 실제 길이입니다.", makeFeedback(
        "0에서 시작하지 않았는지 확인해요.",
        "자를 0 눈금에 맞추지 않은 문제는 끝 눈금 숫자가 곧 길이가 아닙니다.",
        [`시작 눈금은 ${startTick}cm입니다.`, `끝 눈금은 ${endTick}cm입니다.`, `${endTick}-${startTick}=${answer}cm가 실제 길이입니다.`],
        "자 문제에서 시작이 0이 아니면 끝 숫자를 그대로 답으로 쓰지 말고 끝-시작을 하세요."
      ));
    }

    if (mode === "two-step-length") {
      const cut = 6 + (index % 8);
      const total = a + b;
      const answer = total - cut;
      return makeQuestion("1-4", difficulty, index, `${a}cm와 ${b}cm를 이어 붙인 뒤 ${cut}cm를 잘랐습니다. 남은 길이는 몇 cm인가요?`, `${answer}cm`, numChoices(answer, "cm", [-10, -2, -1, 1, 2, 10]), lengthScene("join", [
        `${a}cm + ${b}cm`,
        `${cut}cm 잘라냄`,
        "먼저 더하고 나중에 뺍니다."
      ], {
        parts: [
          { label: "첫 번째", cm: a, text: `${a}cm` },
          { label: "두 번째", cm: b, text: `${b}cm` }
        ],
        totalCm: answer
      }), "붙인 뒤 잘라낸 두 단계 상황이므로 덧셈 뒤 뺄셈을 합니다.", makeFeedback(
        "행동 순서대로 계산해요.",
        "심화 길이 문제는 길이가 늘어난 뒤 줄어드는 상황을 차례대로 봐야 합니다.",
        [`먼저 이어 붙이면 ${a}+${b}=${total}cm입니다.`, `그중 ${cut}cm를 잘라냅니다.`, `${total}-${cut}=${answer}cm가 남습니다.`],
        "문장 속 행동을 1번 '붙이기', 2번 '자르기'로 표시하고 식을 두 줄로 쓰세요."
      ));
    }

    if (mode === "join") {
      return makeQuestion("1-4", difficulty, index, `색 테이프 ${a}cm와 ${b}cm를 이어 붙이면 모두 몇 cm인가요?`, `${a + b}cm`, numChoices(a + b, "cm", [-10, -1, 1, 10, -5, 5]), lengthScene("join", [
        `${a}cm`,
        `${b}cm`,
        "이어 붙이면 길이를 더합니다."
      ], {
        parts: [
          { label: "첫 번째", cm: a, text: `${a}cm` },
          { label: "두 번째", cm: b, text: `${b}cm` }
        ],
        totalCm: a + b
      }), "전체 길이는 두 길이를 더합니다.", makeFeedback(
        "이어 붙인 길이는 더해요.",
        "두 길이를 붙이면 전체 길이가 되므로 덧셈을 사용합니다.",
        [`첫 번째 길이는 ${a}cm입니다.`, `두 번째 길이는 ${b}cm입니다.`, `${a}+${b}=${a + b}이므로 전체는 ${a + b}cm입니다.`],
        "길이 문제에서는 '이어 붙이면'은 더하기, '얼마나 더'는 빼기로 연결하세요."
      ));
    }

    if (mode === "compare") {
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      return makeQuestion("1-4", difficulty, index, `${longer}cm는 ${shorter}cm보다 몇 cm 더 긴가요?`, `${longer - shorter}cm`, numChoices(longer - shorter, "cm", [-10, -2, -1, 1, 2, 10]), lengthScene("compare", [
        `${longer}cm`,
        `${shorter}cm`,
        "차이를 묻고 있습니다."
      ], {
        parts: [
          { label: "긴 길이", cm: longer, text: `${longer}cm` },
          { label: "짧은 길이", cm: shorter, text: `${shorter}cm` }
        ],
        differenceCm: longer - shorter
      }), "얼마나 더 긴지는 큰 길이에서 작은 길이를 뺍니다.", makeFeedback(
        "차이는 빼기로 구해요.",
        "'몇 cm 더 긴가'는 두 길이의 차이를 묻는 말입니다.",
        [`더 긴 길이는 ${longer}cm입니다.`, `짧은 길이는 ${shorter}cm입니다.`, `${longer}-${shorter}=${longer - shorter}cm입니다.`],
        "비교 문제는 큰 수와 작은 수에 밑줄을 긋고 큰 수에서 작은 수를 빼세요."
      ));
    }

    if (mode === "add-ten") {
      const value = 30 + ((index * 9 + level * 4) % 60);
      return makeQuestion("1-4", difficulty, index, `${value}cm에 10cm를 더하면 몇 cm인가요?`, `${value + 10}cm`, numChoices(value + 10, "cm", [-20, -10, -1, 1, 10, 20]), lengthScene("add", [
        `${value}cm`,
        "10cm만큼 더 길어집니다."
      ], {
        parts: [
          { label: "처음", cm: value, text: `${value}cm` },
          { label: "더함", cm: 10, text: "10cm" }
        ],
        totalCm: value + 10
      }), "10cm 더 길어지면 십의 자리 길이가 1 늘어납니다.", makeFeedback(
        "10cm만큼 움직여요.",
        "10cm를 더하는 것은 길이 수에서 10을 더하는 것과 같습니다.",
        [`처음 길이는 ${value}cm입니다.`, `10cm를 더하면 ${value}+10입니다.`, `따라서 ${value + 10}cm입니다.`],
        "10씩 움직일 때는 십의 자리 변화를 먼저 보세요."
      ));
    }

    return makeQuestion("1-4", difficulty, index, "자를 사용할 때 0 눈금에서 시작해야 하는 까닭은 무엇인가요?", "길이를 정확하게 재기 위해서", [
      "자를 더 예쁘게 놓기 위해서",
      "숫자 1부터 세기 위해서"
    ], lengthScene("ruler-zero", [
      "0 눈금",
      "끝과 끝을 맞춰 재기"
    ]), "길이는 0 눈금부터 끝 눈금까지 읽어야 정확합니다.", makeFeedback(
      "0 눈금이 시작점이에요.",
      "길이를 잴 때 시작점이 달라지면 읽는 눈금도 달라져 정확하지 않습니다.",
      ["물건의 한쪽 끝을 0 눈금에 맞춥니다.", "다른 쪽 끝이 닿은 눈금을 읽습니다.", "그래야 실제 길이를 정확히 알 수 있습니다."],
      "자를 놓을 때 물건의 끝과 0 눈금이 딱 맞는지 먼저 확인하세요."
    ));
  }

  function buildClassifyQuestion(difficulty, index) {
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["row-read", "row-match", "most", "outlier"],
      mid: ["row-read", "row-match", "two-total", "most", "outlier"],
      high: ["row-match", "difference", "remaining-after-two", "pair-difference", "criterion-outlier"]
    });
    const fruits = ["사과", "배", "포도", "귤"];
    const counts = fruits.map((name, order) => ({ name, count: 2 + ((index + order * 3 + difficultyOffset(difficulty)) % 7) }));
    const target = counts[index % counts.length];

    if (mode === "remaining-after-two") {
      const total = counts.reduce((sum, item) => sum + item.count, 0);
      const excluded = counts[0].count + counts[1].count;
      const answer = total - excluded;
      return makeQuestion("1-5", difficulty, index, `표에서 ${counts[0].name}${andParticle(counts[0].name)} ${counts[1].name}${objectParticle(counts[1].name)} 빼면 나머지는 모두 몇 개인가요?`, `${answer}개`, numChoices(answer, "개", [-4, -2, -1, 1, 2, 4]), counts.map((item) => `${item.name} ${item.count}개`), "전체에서 두 항목을 제외한 나머지를 찾습니다.", makeFeedback(
        "빼고 남은 분류를 봐요.",
        "심화 분류 문제는 전체를 먼저 보고, 제외할 항목을 빼서 나머지를 찾습니다.",
        [`전체는 ${total}개입니다.`, `${counts[0].name}${andParticle(counts[0].name)} ${counts[1].name}는 ${excluded}개입니다.`, `${total}-${excluded}=${answer}개가 남습니다.`],
        "제외하는 문제는 빼야 할 항목에 X표를 하고, 남은 항목의 수만 더해도 됩니다."
      ));
    }

    if (mode === "criterion-outlier") {
      return makeQuestion("1-5", difficulty, index, "사과, 배, 포도, 연필 중 '먹을 수 있는 것'으로 분류할 수 없는 것은 무엇인가요?", "연필", ["사과", "배", "포도", "연필"], [
        "분류 기준: 먹을 수 있는 것",
        "기준에 맞지 않는 하나를 찾습니다."
      ], "분류 기준을 먼저 정하고 그 기준에 맞지 않는 것을 찾습니다.", makeFeedback(
        "기준에 맞지 않는 것을 찾아요.",
        "심화 분류 문제는 보기의 이름보다 분류 기준을 먼저 읽어야 합니다.",
        ["기준은 먹을 수 있는 것입니다.", "사과, 배, 포도는 먹을 수 있습니다.", "연필은 먹을 수 없으므로 기준에 맞지 않습니다."],
        "분류 문제에서는 '무엇끼리 같은가?'와 '무엇이 기준에서 벗어나는가?'를 따로 말해 보세요."
      ));
    }

    if (mode === "pair-difference") {
      const firstSum = counts[0].count + counts[1].count;
      const secondSum = counts[2].count + counts[3].count;
      const diff = Math.abs(firstSum - secondSum);
      const firstNames = `${counts[0].name}${andParticle(counts[0].name)} ${counts[1].name}`;
      const secondNames = `${counts[2].name}${andParticle(counts[2].name)} ${counts[3].name}`;
      return makeQuestion("1-5", difficulty, index, `${firstNames}, ${secondNames} 두 묶음의 개수 차이는 몇 개인가요?`, `${diff}개`, numChoices(diff, "개", [-3, -2, -1, 1, 2, 3]), counts.map((item) => `${item.name} ${item.count}개`), "두 항목씩 묶어 더한 뒤 두 묶음의 차이를 구합니다.", makeFeedback(
        "두 묶음을 각각 더한 뒤 비교해요.",
        "심화 분류표 문제는 항목 두 개씩 먼저 합하고, 그 합끼리 비교합니다.",
        [`${firstNames}는 ${counts[0].count}+${counts[1].count}=${firstSum}개입니다.`, `${secondNames}는 ${counts[2].count}+${counts[3].count}=${secondSum}개입니다.`, `두 묶음의 차이는 ${diff}개입니다.`],
        "두 묶음을 비교할 때는 각 묶음의 합을 먼저 쓰고, 마지막에 큰 합에서 작은 합을 빼세요."
      ));
    }

    if (mode === "difference") {
      const sorted = [...counts].sort((left, right) => right.count - left.count);
      const diff = sorted[0].count - sorted[sorted.length - 1].count;
      return makeQuestion("1-5", difficulty, index, `가장 많은 것과 가장 적은 것은 몇 개 차이인가요?`, `${diff}개`, numChoices(diff, "개", [-2, -1, 1, 2, 3]), counts.map((item) => `${item.name} ${item.count}개`), "가장 큰 수와 가장 작은 수를 찾아 차이를 구합니다.", makeFeedback(
        "큰 수와 작은 수를 골라 빼요.",
        "차이는 두 수를 더하는 것이 아니라 큰 수에서 작은 수를 빼서 구합니다.",
        [`가장 많은 것은 ${sorted[0].name} ${sorted[0].count}개입니다.`, `가장 적은 것은 ${sorted[sorted.length - 1].name} ${sorted[sorted.length - 1].count}개입니다.`, `${sorted[0].count}-${sorted[sorted.length - 1].count}=${diff}개입니다.`],
        "분류표 비교 문제에서는 가장 큰 수와 가장 작은 수에 각각 표시한 뒤 빼세요."
      ));
    }

    if (mode === "row-read") {
      return makeQuestion("1-5", difficulty, index, `표에서 ${target.name}${topicParticle(target.name)} 몇 개인가요?`, `${target.count}개`, numChoices(target.count, "개", [-2, -1, 1, 2, 3]), counts.map((item) => `${item.name} ${item.count}개`), "표에서 알맞은 항목의 개수를 읽습니다.", makeFeedback(
        "분류표에서 이름과 개수를 연결해요.",
        "표를 읽을 때는 찾는 이름의 줄을 먼저 찾고, 그 옆의 개수를 읽어야 합니다.",
        [`찾을 항목은 ${target.name}입니다.`, `표에서 ${target.name} 옆에는 ${target.count}개라고 되어 있습니다.`, `따라서 정답은 ${target.count}개입니다.`],
        "표를 읽을 때는 손가락으로 가로줄을 따라가며 이름과 개수를 연결하세요."
      ));
    }

    if (mode === "row-match") {
      const matched = counts[(index + 1) % counts.length];
      return makeQuestion("1-5", difficulty, index, `표에서 ${matched.count}개인 것은 무엇인가요?`, matched.name, counts.map((item) => item.name).filter((name) => name !== matched.name), counts.map((item) => `${item.name} ${item.count}개`), "표에서 수를 먼저 찾고 그 줄의 항목 이름을 읽습니다.", makeFeedback(
        "이번에는 숫자에서 이름으로 거꾸로 읽어요.",
        "표 읽기는 이름에서 수로 가기도 하고, 수에서 이름으로 되돌아가기도 합니다.",
        [`먼저 ${matched.count}개라고 적힌 줄을 찾습니다.`, `그 줄의 항목 이름은 ${matched.name}입니다.`, `따라서 정답은 ${matched.name}입니다.`],
        "표에서 수를 먼저 찾는 문제는 숫자에 표시한 뒤 왼쪽 이름으로 되돌아가세요."
      ));
    }

    if (mode === "two-total") {
      const total = counts[0].count + counts[1].count;
      return makeQuestion("1-5", difficulty, index, `${counts[0].name}${andParticle(counts[0].name)} ${counts[1].name}${objectParticle(counts[1].name)} 합하면 모두 몇 개인가요?`, `${total}개`, numChoices(total, "개", [-3, -1, 1, 3, 5]), counts.map((item) => `${item.name} ${item.count}개`), "두 항목의 개수를 더합니다.", makeFeedback(
        "두 분류를 합쳐요.",
        "두 종류를 모두 묻고 있으므로 각각의 개수를 찾아 더해야 합니다.",
        [`${counts[0].name}${topicParticle(counts[0].name)} ${counts[0].count}개입니다.`, `${counts[1].name}${topicParticle(counts[1].name)} ${counts[1].count}개입니다.`, `${counts[0].count}+${counts[1].count}=${total}개입니다.`],
        "두 항목이 나오면 표에서 각각의 개수를 동그라미 치고 더하세요."
      ));
    }

    if (mode === "most") {
      const sorted = [...counts].sort((left, right) => right.count - left.count);
      return makeQuestion("1-5", difficulty, index, "가장 많은 것은 무엇인가요?", sorted[0].name, counts.map((item) => item.name).filter((name) => name !== sorted[0].name).concat(["모두 같음"]), counts.map((item) => `${item.name} ${item.count}개`), "가장 큰 개수를 가진 항목을 찾습니다.", makeFeedback(
        "가장 큰 수를 찾아요.",
        "가장 많은 것을 찾으려면 이름이 아니라 개수를 비교해야 합니다.",
        counts.map((item) => `${item.name}${topicParticle(item.name)} ${item.count}개입니다.`).concat(`가장 큰 개수는 ${sorted[0].count}개이므로 ${sorted[0].name}입니다.`),
        "항목 이름보다 개수를 먼저 크게 표시해 보세요."
      ));
    }

    return makeQuestion("1-5", difficulty, index, "운동 도구로 분류할 수 없는 것은 무엇인가요?", "연필", ["공", "줄넘기", "훌라후프", "라켓"], [
      "공, 줄넘기, 훌라후프, 라켓은 운동 도구입니다.",
      "연필은 학용품입니다."
    ], "같은 기준에 맞지 않는 것을 찾습니다.", makeFeedback(
      "분류 기준을 먼저 말해요.",
      "분류 문제는 보기부터 고르지 말고 기준을 먼저 정해야 합니다.",
      ["기준은 운동 도구입니다.", "공, 줄넘기, 훌라후프, 라켓은 운동할 때 씁니다.", "연필은 학용품이므로 기준에 맞지 않습니다."],
      "분류 문제에서는 '무엇끼리 같은가?'를 먼저 말로 설명해 보세요."
    ));
  }

  function buildMultiplicationIntroQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const groups = difficulty === "low" ? 2 + (index % 3) : 2 + ((index + level) % 5);
    const each = difficulty === "low" ? 2 + ((index * 2) % 4) : 2 + ((index * 2 + level) % 6);
    const total = groups * each;
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["equal-groups", "group-count", "repeated-to-multiply", "value"],
      mid: ["equal-groups", "repeated-to-multiply", "value", "group-count"],
      high: ["group-count", "unknown-each", "compare-groups", "target-groups"]
    });

    if (mode === "equal-groups") {
      return makeQuestion("1-6", difficulty, index, `${each}개씩 ${groups}묶음이면 모두 몇 개인가요?`, `${total}개`, numChoices(total, "개", [-each, -1, 1, each, groups]), [
        `${each}개씩`,
        `${groups}묶음`,
        `${each}+${each}+...을 ${groups}번`
      ], "같은 수를 여러 번 더하는 것은 곱셈으로 나타낼 수 있습니다.", makeFeedback(
        "같은 수씩 묶어 세요.",
        "몇 개씩 몇 묶음인지 찾으면 곱셈식으로 바꿀 수 있습니다.",
        [`한 묶음에는 ${each}개가 있습니다.`, `그런 묶음이 ${groups}개입니다.`, `${each}×${groups}=${total}이므로 모두 ${total}개입니다.`],
        "묶음 문제는 '한 묶음의 수'와 '묶음 수'를 먼저 따로 표시하세요."
      ));
    }

    if (mode === "repeated-to-multiply") {
      return makeQuestion("1-6", difficulty, index, `${each}+${each}+${each}+${each}를 곱셈식으로 나타낸 것은?`, `${each}×4`, [`4×${each}`, `${each}+4`, `4+${each}`, `${each}×${groups}`], [
        `${each}가 4번 더해졌습니다.`,
        "같은 수를 반복해서 더합니다."
      ], "같은 수의 반복 덧셈은 곱셈식으로 나타냅니다.", makeFeedback(
        "반복되는 수와 횟수를 찾아요.",
        "반복 덧셈을 곱셈으로 바꿀 때는 같은 수가 몇 번 나오는지 세어야 합니다.",
        [`반복되는 수는 ${each}입니다.`, `${each}가 4번 나옵니다.`, `그래서 ${each}×4입니다.`],
        "반복 덧셈에서는 반복되는 수에 밑줄을 긋고 몇 번 나오는지 세어 보세요."
      ));
    }

    if (mode === "value") {
      return makeQuestion("1-6", difficulty, index, `${each}×${groups}의 값은 무엇인가요?`, `${total}`, numChoices(total, "", [-each, -1, 1, each, each * 2]), [
        `${each}를 ${groups}번 더합니다.`,
        `${each}×${groups}`
      ], "곱셈은 같은 수를 여러 번 더하는 계산입니다.", makeFeedback(
        "곱셈을 덧셈으로 풀어요.",
        "곱셈구구가 아직 헷갈리면 같은 수를 반복해서 더해도 됩니다.",
        [`${each}×${groups}은 ${each}를 ${groups}번 더하는 뜻입니다.`, `차례대로 더하면 ${total}입니다.`, `정답은 ${total}입니다.`],
        "곱셈이 어려울 때는 같은 수 뛰어 세기로 확인하세요."
      ));
    }

    if (mode === "unknown-each") {
      return makeQuestion("1-6", difficulty, index, `모두 ${total}개를 ${groups}묶음으로 똑같이 나누면 한 묶음에 몇 개인가요?`, `${each}개`, numChoices(each, "개", [-2, -1, 1, 2, 3]), [
        `전체 ${total}개`,
        `${groups}묶음`,
        "한 묶음의 수를 찾습니다."
      ], "전체를 같은 묶음 수로 나누어 한 묶음의 수를 찾습니다.", makeFeedback(
        "한 묶음에 들어갈 수를 찾아요.",
        "심화 묶음 문제는 전체와 묶음 수가 주어지고 한 묶음의 수를 거꾸로 찾습니다.",
        [`전체는 ${total}개입니다.`, `${groups}묶음으로 똑같이 나눕니다.`, `${each}개씩 넣으면 ${each}×${groups}=${total}이므로 한 묶음은 ${each}개입니다.`],
        "거꾸로 묶음 문제는 같은 수씩 넣어 보며 전체가 되는지 확인하세요."
      ));
    }

    if (mode === "compare-groups") {
      const eachA = 3 + (index % 4);
      const groupsA = 4 + (index % 3);
      const eachB = eachA + 1;
      const groupsB = Math.max(2, groupsA - 1);
      const totalA = eachA * groupsA;
      const totalB = eachB * groupsB;
      const answer = totalA > totalB ? `${eachA}개씩 ${groupsA}묶음` : `${eachB}개씩 ${groupsB}묶음`;
      return makeQuestion("1-6", difficulty, index, `${eachA}개씩 ${groupsA}묶음과 ${eachB}개씩 ${groupsB}묶음 중 더 많은 것은 무엇인가요?`, answer, [
        totalA > totalB ? `${eachB}개씩 ${groupsB}묶음` : `${eachA}개씩 ${groupsA}묶음`,
        "두 묶음이 같습니다",
        `${eachA + eachB}개입니다`
      ], [
        `${eachA}×${groupsA}`,
        `${eachB}×${groupsB}`,
        "두 전체 수를 비교합니다."
      ], "묶음끼리 비교할 때는 각각의 전체 수를 먼저 구해야 합니다.", makeFeedback(
        "각 묶음의 전체를 먼저 구해요.",
        "심화 곱셈 문제는 한 묶음만 계산하지 않고 두 상황을 계산해 비교합니다.",
        [`첫째는 ${eachA}×${groupsA}=${totalA}개입니다.`, `둘째는 ${eachB}×${groupsB}=${totalB}개입니다.`, `${totalA}과 ${totalB}을 비교하면 ${answer}이 더 많습니다.`],
        "묶음 비교 문제는 두 식을 나란히 쓰고 계산 결과끼리 비교하세요."
      ));
    }

    if (mode === "target-groups") {
      return makeQuestion("1-6", difficulty, index, `${total}개를 만들 수 있는 묶음은 무엇인가요?`, `${each}개씩 ${groups}묶음`, [
        `${groups}개씩 ${each + 1}묶음`,
        `${each + 1}개씩 ${groups}묶음`,
        `${each}개씩 ${Math.max(1, groups - 1)}묶음`,
        `${each + groups}개씩 1묶음`
      ], [
        `목표 ${total}개`,
        "보기마다 전체 수를 계산합니다."
      ], "목표 수를 만드는 묶음을 찾으려면 보기마다 몇 개인지 확인해야 합니다.", makeFeedback(
        "보기마다 곱해서 확인해요.",
        "심화 묶음 문제는 보기의 모양이 비슷하므로 전체 수가 목표와 같은지 직접 계산해야 합니다.",
        [`${each}개씩 ${groups}묶음은 ${each}×${groups}입니다.`, `${each}×${groups}=${total}개입니다.`, `목표 ${total}개와 같으므로 정답입니다.`],
        "목표 수 만들기 문제는 보기 옆에 곱셈 결과를 작게 적어 비교하세요."
      ));
    }

    return makeQuestion("1-6", difficulty, index, `모두 ${total}개를 ${each}개씩 묶으면 몇 묶음인가요?`, `${groups}묶음`, numChoices(groups, "묶음", [-2, -1, 1, 2, 3]), [
      `전체 ${total}개`,
      `한 묶음 ${each}개`
    ], "전체를 한 묶음의 수로 나누어 묶음 수를 찾습니다.", makeFeedback(
      "전체와 한 묶음을 나눠 봐요.",
      "묶음 수를 묻는 문제는 전체 안에 같은 묶음이 몇 번 들어가는지 찾는 문제입니다.",
      [`전체는 ${total}개입니다.`, `한 묶음은 ${each}개입니다.`, `${each}개씩 세면 ${groups}묶음입니다.`],
      "묶음 수 문제에서는 같은 수씩 동그라미 치며 몇 묶음인지 세어 보세요."
    ));
  }

  function buildThousandsQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const number = difficultyNumber(difficulty, index, [1100, 5999], [2001, 8999], [1001, 9999]);
    const th = Math.floor(number / 1000);
    const h = Math.floor((number % 1000) / 100);
    const t = Math.floor((number % 100) / 10);
    const o = number % 10;
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["place-count", "expanded", "neighbor", "place-count"],
      mid: ["place-count", "compare", "expanded", "boundary"],
      high: ["boundary", "compare-close", "missing-expanded", "order-three"]
    });

    if (mode === "order-three") {
      const middle = Math.min(9900, Math.max(1200, number));
      const numbers = [middle, middle + (index % 2 === 0 ? 37 : 64), middle - (index % 3 === 0 ? 45 : 108)];
      const sorted = [...numbers].sort((left, right) => left - right);
      const answer = sorted.join(", ");
      return makeQuestion("2-1", difficulty, index, `세 수 ${numbers.join(", ")}를 작은 수부터 차례로 쓰면?`, answer, [
        [...sorted].reverse().join(", "),
        [sorted[0], sorted[2], sorted[1]].join(", "),
        [sorted[1], sorted[0], sorted[2]].join(", "),
        numbers.join(", ")
      ], [
        "네 자리 수 세 개를 비교합니다.",
        "천의 자리부터 차례로 봅니다."
      ], "세 수를 줄 세울 때는 가장 높은 자리부터 차례로 비교합니다.", makeFeedback(
        "세 수를 한 번에 줄 세워요.",
        "심화 네 자리 수 문제는 비슷한 수가 여러 개라 한 자리만 보고 고르면 틀리기 쉽습니다.",
        ["천의 자리를 먼저 비교합니다.", "같으면 백, 십, 일의 자리로 내려갑니다.", `작은 수부터 쓰면 ${answer}입니다.`],
        "세 수를 비교할 때는 가장 작은 수에 1번, 다음 수에 2번, 가장 큰 수에 3번을 표시하세요."
      ));
    }

    if (mode === "missing-expanded") {
      const targetTh = th;
      const targetH = 1 + ((index * 2) % 9);
      const targetT = 1 + ((index * 3) % 9);
      const targetO = 1 + ((index * 5) % 9);
      const target = targetTh * 1000 + targetH * 100 + targetT * 10 + targetO;
      const missing = targetH * 100;
      return makeQuestion("2-1", difficulty, index, `${targetTh * 1000} + □ + ${targetT * 10} + ${targetO} = ${target}입니다. □에 알맞은 수는?`, `${missing}`, numChoices(missing, "", [-200, -100, -10, 10, 100, 200]), [
        `${target} = ${targetTh * 1000} + ? + ${targetT * 10} + ${targetO}`,
        "빠진 자리 값을 찾습니다."
      ], "전개식의 빈칸에는 빠진 자리의 값이 들어갑니다.", makeFeedback(
        "빠진 백의 자리 값을 찾아요.",
        "전개식 빈칸은 자리 숫자 하나가 아니라 그 자리의 실제 값을 써야 합니다.",
        [`${target}에서 천의 자리 값은 ${targetTh * 1000}입니다.`, `십의 자리와 일의 자리 값은 ${targetT * 10}, ${targetO}입니다.`, `빠진 백의 자리 값은 ${missing}입니다.`],
        "전개식 빈칸 문제는 □가 어느 자리 값인지 먼저 말하고, 100이나 200처럼 자리 값으로 쓰세요."
      ));
    }

    if (mode === "place-count") {
      const answer = `${th}, ${h}, ${t}, ${o}`;
      return makeQuestion("2-1", difficulty, index, `${number}${numberTopicParticle(number)} 1000이 몇 개, 100이 몇 개, 10이 몇 개, 1이 몇 개인 수인가요?`, answer, [
        `${th}, ${h}, ${o}, ${t}`,
        `${Math.max(0, th - 1)}, ${h + 1}, ${t}, ${o}`,
        `${th + 1}, ${Math.max(0, h - 1)}, ${t}, ${o}`,
        `${th}, ${h}, ${t + 1}, ${Math.max(0, o - 1)}`
      ], [
        `${number}`,
        `${formatExpandedNumber([th * 1000, h * 100, t * 10, o])}`
      ], "네 자리 수는 천, 백, 십, 일의 자리로 나누어 봅니다.", makeFeedback(
        "네 자리 자릿값을 차례로 읽어요.",
        "네 자리 수는 왼쪽부터 천의 자리, 백의 자리, 십의 자리, 일의 자리입니다.",
        [`천의 자리 숫자는 ${th}입니다.`, `백, 십, 일의 자리 숫자는 ${h}, ${t}, ${o}입니다.`, `따라서 ${answer}입니다.`],
        "네 자리 수 위에 천·백·십·일을 작게 적어 보세요."
      ));
    }

    if (mode === "compare" || mode === "compare-close") {
      const other = mode === "compare-close"
        ? number + (o >= 5 ? -3 : 3)
        : number + (index % 2 === 0 ? 508 : -407);
      const answer = number > other ? numberIsLargerText(number) : numberIsLargerText(other);
      return makeQuestion("2-1", difficulty, index, `${formatNumberPair(number, other)} 중 더 큰 수는?`, answer, [
        number > other ? numberIsLargerText(other) : numberIsLargerText(number),
        "두 수가 같습니다",
        "백의 자리만 비교합니다",
        "일의 자리만 비교합니다"
      ], [
        "천의 자리부터 비교합니다.",
        `${number}`,
        `${other}`
      ], "네 자리 수 비교도 가장 높은 자리부터 시작합니다.", makeFeedback(
        "천의 자리부터 비교해요.",
        "큰 수 비교는 가장 왼쪽의 높은 자리부터 차례대로 봐야 합니다.",
        [`${formatNumberPair(number, other)}의 천의 자리를 비교합니다.`, "천의 자리가 같으면 백, 십, 일의 자리로 내려갑니다.", `비교 결과 ${answer}입니다.`],
        "숫자가 길수록 가장 왼쪽 자리부터 차례대로 확인하세요."
      ));
    }

    if (mode === "expanded" || mode === "expanded-zero") {
      const target = mode === "expanded-zero"
        ? th * 1000 + h * 100 + (index % 2 === 0 ? t * 10 : 0) + (index % 2 === 0 ? 0 : o)
        : number;
      const targetTh = Math.floor(target / 1000);
      const targetH = Math.floor((target % 1000) / 100);
      const targetT = Math.floor((target % 100) / 10);
      const targetO = target % 10;
      const expanded = formatExpandedNumber([targetTh * 1000, targetH * 100, targetT * 10, targetO]);
      return makeQuestion("2-1", difficulty, index, `${expanded}${numberDirectionParticle(target)} 나타낸 수는?`, `${target}`, numChoices(target, "", [-1000, -100, -10, 10, 100, 1000]), [
        `천의 자리 값 ${targetTh * 1000}`,
        `백의 자리 값 ${targetH * 100}`,
        `십의 자리 값 ${targetT * 10}`,
        `일의 자리 값 ${targetO}`
      ], "각 자리 값을 모두 모아 네 자리 수를 만듭니다.", makeFeedback(
        "전개식을 한 수로 모아요.",
        "전개식은 각 자리의 값을 따로 보여 주는 식입니다.",
        [`전개식 ${expanded}을 차례대로 봅니다.`, "0인 자리는 더해도 수가 달라지지 않습니다.", `모으면 ${target}입니다.`],
        "전개식을 볼 때는 0의 개수가 어떤 자리인지 알려 준다고 생각하세요."
      ));
    }

    if (mode === "neighbor") {
      const before = number - 1;
      const after = number + 1;
      return makeQuestion("2-1", difficulty, index, `${number}의 바로 앞의 수와 바로 뒤의 수를 차례로 고르세요.`, `${before}, ${after}`, [
        `${after}, ${before}`,
        `${number - 10}, ${number + 10}`,
        `${before - 1}, ${after + 1}`,
        `${number}, ${after}`
      ], [
        "바로 앞의 수는 1 작은 수입니다.",
        "바로 뒤의 수는 1 큰 수입니다."
      ], "네 자리 수의 앞뒤도 1씩 움직여 찾습니다.", makeFeedback(
        "앞뒤 수는 1씩 움직여요.",
        "바로 앞과 바로 뒤는 10이나 100이 아니라 1만큼 차이납니다.",
        [`${number}보다 1 작은 수는 ${before}입니다.`, `${number}보다 1 큰 수는 ${after}입니다.`, `따라서 ${before}, ${after}입니다.`],
        "기준 수를 가운데에 놓고 왼쪽에는 -1, 오른쪽에는 +1을 적어 보세요."
      ));
    }

    const rounded = Math.floor(number / 100) * 100;
    return makeQuestion("2-1", difficulty, index, `${number}보다 작은 가장 가까운 몇백은 무엇인가요?`, `${rounded}`, numChoices(rounded, "", [-200, -100, 100, 200, 10]), [
      `${number}`,
      "백 단위 경계를 찾습니다."
    ], "작은 쪽의 몇백은 백의 자리 아래를 버려 찾습니다.", makeFeedback(
      "몇백의 경계를 찾아요.",
      "가까운 몇백을 찾을 때는 백 단위로 끊어 생각합니다.",
      [`${number}는 ${rounded}보다 크거나 같습니다.`, `다음 몇백은 ${rounded + 100}입니다.`, `따라서 작은 쪽 가까운 몇백은 ${rounded}입니다.`],
      "수직선 위에서 백 단위 눈금을 먼저 표시해 보세요."
    ));
  }

  function buildMultiplicationTableQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const easyFacts = [2, 3, 4, 5, 10];
    const a = difficulty === "low" ? easyFacts[index % easyFacts.length] : 2 + ((index + level) % 8);
    const b = difficulty === "low" ? 2 + ((index * 2) % 4) : 2 + ((index * 3 + level) % 8);
    const product = a * b;
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["value", "array", "one-zero", "array"],
      mid: ["value", "missing-factor", "array", "target-expression", "multiplication-table-grid"],
      high: ["missing-factor", "target-expression", "unknown-rows", "compare-products", "table-missing-cell"]
    });

    if (mode === "one-zero") {
      const base = 2 + (index % 8);
      const isZero = index % 2 === 0;
      const left = isZero ? base : 1;
      const right = isZero ? 0 : base;
      const answer = left * right;
      return makeQuestion("2-2", difficulty, index, isZero
        ? `0의 곱 ${base}×0의 값은 무엇인가요?`
        : `1단 곱셈구구 1×${base}의 값은 무엇인가요?`, `${answer}`, numChoices(answer, "", [-2, -1, 1, 2, base]), multiplicationScene("one-zero", [
        isZero ? "0묶음은 아무것도 없습니다." : "1묶음은 그 수 그대로입니다.",
        `${left}×${right}`
      ], {
        factorA: left,
        factorB: right,
        product: answer,
        mode: isZero ? "zero" : "one"
      }), isZero ? "0번 있는 묶음은 개수가 0입니다." : "1번 있는 묶음은 그 수 그대로입니다.", makeFeedback(
        isZero ? "0의 곱은 아무것도 없는 묶음이에요." : "1단은 그 수 그대로예요.",
        isZero
          ? "0의 곱은 수가 작아지는 것이 아니라, 묶음이 0개라서 전체가 0입니다."
          : "1을 곱하는 것은 그 수를 한 번만 놓는 뜻입니다.",
        isZero
          ? [`${base}개씩 담긴 묶음이 0개입니다.`, "놓인 묶음이 없으므로 셀 것도 없습니다.", "그래서 값은 0입니다."]
          : [`${base}개짜리 묶음이 1개입니다.`, `한 번만 놓으면 ${base}개입니다.`, `따라서 1×${base}=${base}입니다.`],
        isZero ? "0이 보이면 '묶음이 0개'인지 먼저 말해 보세요." : "1단은 한 묶음만 있으므로 원래 수와 같습니다."
      ));
    }

    if (mode === "multiplication-table-grid" || mode === "table-missing-cell") {
      const row = 2 + ((index + level) % 8);
      const col = 1 + ((index * 2 + level) % 9);
      const answer = row * col;
      return makeQuestion("2-2", difficulty, index, mode === "multiplication-table-grid"
        ? `곱셈표에서 ${row}단의 ${col}번째 칸에 들어갈 수는 무엇인가요?`
        : `곱셈표에서 가로 ${row}, 세로 ${col}이 만나는 칸의 수는 무엇인가요?`, `${answer}`, numChoices(answer, "", [-row, -col, row, col, -1, 1]), multiplicationScene("table-grid", [
        `${row}단`,
        `${col}번째 칸`,
        "행과 열이 만나는 칸을 봅니다."
      ], {
        row,
        col,
        product: answer
      }), "곱셈표는 행의 수와 열의 수가 만나는 칸에 두 수의 곱을 적습니다.", makeFeedback(
        "행과 열이 만나는 칸을 찾아요.",
        "곱셈표 문제는 숫자 목록을 외우는 것보다, 어떤 행과 열이 만났는지 보는 것이 핵심입니다.",
        [`${row}단 행을 찾습니다.`, `${col}번째 칸까지 갑니다.`, `${row}×${col}=${answer}이므로 그 칸에는 ${answer}이 들어갑니다.`],
        "곱셈표에서는 행을 먼저 손가락으로 따라가고, 열을 내려와 만나는 칸을 표시하세요."
      ));
    }

    if (mode === "value") {
      return makeQuestion("2-2", difficulty, index, `${a}×${b}의 값은?`, `${product}`, numChoices(product, "", [-a, -b, 1, -1, a, b]), [
        `${a}단`,
        `${a}씩 ${b}번`
      ], "곱셈구구를 이용해 값을 구합니다.", makeFeedback(
        "구구단을 차례로 떠올려요.",
        "곱셈은 같은 수를 여러 번 더한 결과입니다.",
        [`${a}×${b}는 ${a}를 ${b}번 더하는 뜻입니다.`, `구구단으로 ${a}×${b}=${product}입니다.`, `정답은 ${product}입니다.`],
        "헷갈리는 구구단은 앞뒤 단을 이용해 한 칸씩 이동해 보세요."
      ));
    }

    if (mode === "missing-factor") {
      return makeQuestion("2-2", difficulty, index, `${a}×□=${product}일 때 □에 알맞은 수는?`, `${b}`, numChoices(b, "", [-2, -1, 1, 2, 3]), [
        `${a}씩 몇 번이면 ${product}?`
      ], "곱셈식의 빈칸은 몇 번 더했는지 찾습니다.", makeFeedback(
        "몇 번 곱했는지 찾아요.",
        "곱셈식의 빈칸은 같은 수가 몇 묶음인지 묻는 자리입니다.",
        [`${a}씩 세어 봅니다.`, `${a}, ${a * 2}, ${a * 3} ... ${product}까지 갑니다.`, `${product}는 ${a}씩 ${b}번이므로 □=${b}입니다.`],
        "빈칸 곱셈은 뛰어 세기로 목표 수에 도착하는 횟수를 세세요."
      ));
    }

    if (mode === "array") {
      return makeQuestion("2-2", difficulty, index, `한 줄에 ${a}개씩 ${b}줄로 놓은 바둑돌은 모두 몇 개인가요?`, `${product}개`, numChoices(product, "개", [-a, -b, 1, -1, a, b]), [
        `한 줄 ${a}개`,
        `${b}줄`,
        "배열 상황입니다."
      ], "배열은 한 줄의 수와 줄 수를 곱합니다.", makeFeedback(
        "배열을 곱셈식으로 바꿔요.",
        "줄마다 같은 개수로 놓인 배열은 곱셈으로 빠르게 셀 수 있습니다.",
        [`한 줄에는 ${a}개가 있습니다.`, `그런 줄이 ${b}줄입니다.`, `${a}×${b}=${product}개입니다.`],
        "배열 문제는 가로 한 줄의 수와 줄 수를 먼저 찾으세요."
      ));
    }

    if (mode === "unknown-rows") {
      return makeQuestion("2-2", difficulty, index, `바둑돌 ${product}개를 한 줄에 ${a}개씩 놓으면 몇 줄이 되나요?`, `${b}줄`, numChoices(b, "줄", [-2, -1, 1, 2, 3]), [
        `전체 ${product}개`,
        `한 줄 ${a}개`,
        "줄 수를 거꾸로 찾습니다."
      ], "배열의 줄 수는 전체 안에 한 줄의 수가 몇 번 들어가는지 찾습니다.", makeFeedback(
        "전체에서 줄 수를 거꾸로 찾아요.",
        "심화 배열 문제는 전체 수와 한 줄의 수가 주어지고 줄 수를 찾습니다.",
        [`한 줄에 ${a}개씩 놓습니다.`, `${a}씩 세어 ${product}까지 가면 ${b}번입니다.`, `그래서 ${b}줄입니다.`],
        "거꾸로 배열 문제는 한 줄의 수로 뛰어 세어 목표 수에 도착하는 횟수를 세세요."
      ));
    }

    if (mode === "compare-products") {
      const leftA = a;
      const leftB = b;
      const rightA = Math.max(2, a - 1);
      const rightB = rightA * (b + 2) === leftA * leftB ? b + 3 : b + 2;
      const leftValue = leftA * leftB;
      const rightValue = rightA * rightB;
      const answer = leftValue > rightValue ? `${leftA}×${leftB}` : `${rightA}×${rightB}`;
      return makeQuestion("2-2", difficulty, index, `두 식 ${leftA}×${leftB}, ${rightA}×${rightB} 중 값이 더 큰 것은 무엇인가요?`, answer, [
        leftValue > rightValue ? `${rightA}×${rightB}` : `${leftA}×${leftB}`,
        "두 식의 값이 같습니다",
        `${leftA}+${leftB}`,
        `${rightA}+${rightB}`
      ], [
        `${leftA}×${leftB}`,
        `${rightA}×${rightB}`,
        "두 곱을 계산해 비교합니다."
      ], "곱셈식 비교는 두 식의 값을 각각 구한 뒤 비교합니다.", makeFeedback(
        "두 곱을 따로 계산해요.",
        "심화 곱셈구구 문제는 보기의 숫자 크기만 보고 고르면 안 됩니다.",
        [`${leftA}×${leftB}=${leftValue}입니다.`, `${rightA}×${rightB}=${rightValue}입니다.`, `더 큰 값은 ${answer}입니다.`],
        "곱셈식 비교는 식 옆에 계산 결과를 적고 결과끼리 비교하세요."
      ));
    }

    return makeQuestion("2-2", difficulty, index, `${product}${numberObjectParticle(product)} 만들 수 있는 곱셈식은 무엇인가요?`, `${a}×${b}`, [`${a}+${b}`, `${a}×${b + 1}`, `${a}×${Math.max(1, b - 1)}`, `${Math.max(1, a - 1)}×${b}`], [
      `목표 값 ${product}`,
      "곱해서 목표 값이 되는 식을 찾습니다."
    ], "보기의 곱셈식을 계산해 목표 값과 비교합니다.", makeFeedback(
      "보기 값을 하나씩 계산해요.",
      "곱셈식 찾기 문제는 보기마다 곱한 값을 직접 확인해야 합니다.",
      [`${a}×${b}를 계산합니다.`, `${a}×${b}=${product}입니다.`, `목표 값 ${product}와 같으므로 정답입니다.`],
      "비교 문제에서는 보기 옆에 계산 결과를 작게 적어 두세요."
    ));
  }

  function buildMeterLengthQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const meters = difficulty === "low" ? 1 + (index % 3) : 1 + ((index + level) % 5);
    const cm = difficulty === "low" ? [0, 10, 20, 50][index % 4] : 5 + ((index * 7 + level * 3) % 90);
    const totalCm = meters * 100 + cm;
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["unit-choice", "m-to-cm", "cm-to-m", "m-to-cm", "estimate-meter-unit"],
      mid: ["m-to-cm", "compare", "cm-to-m", "unit-choice", "estimate-meter-near"],
      high: ["two-step-meter", "add-over-meter", "compare-mixed", "missing-extra", "estimate-meter-gap"]
    });

    if (mode === "estimate-meter-unit") {
      const items = [
        { name: "교실 문의 높이", answer: "2m", clue: "어른 키보다 조금 큽니다.", distractors: ["20cm", "80cm", "20m"] },
        { name: "복도 한쪽 끝에서 다른 쪽 끝까지", answer: "20m", clue: "여러 걸음을 걸어야 합니다.", distractors: ["20cm", "2m", "200m"] },
        { name: "책상 높이", answer: "70cm", clue: "허리보다 낮고 무릎보다 높습니다.", distractors: ["7cm", "7m", "70m"] }
      ];
      const item = items[index % items.length];
      return makeQuestion("2-3", difficulty, index, `${item.name}로 가장 알맞은 길이는 무엇인가요?`, item.answer, item.distractors, lengthScene("estimate", [
        item.name,
        item.clue,
        "cm와 m 중 어울리는 단위를 고릅니다."
      ], {
        objectName: item.name,
        estimateText: item.answer,
        clue: item.clue
      }), "큰 길이는 m, 짧은 길이는 cm처럼 대상의 크기에 맞는 단위를 고릅니다.", makeFeedback(
        "길이에 어울리는 단위를 골라요.",
        "2학기 길이 어림은 cm와 m를 상황에 맞게 고르는 힘이 중요합니다.",
        [item.clue, "너무 작거나 너무 큰 보기를 지웁니다.", `가장 알맞은 길이는 ${item.answer}입니다.`],
        "어림 문제는 실제로 걸어 볼 수 있는 길이인지, 손으로 잴 만한 길이인지 먼저 생각하세요."
      ));
    }

    if (mode === "estimate-meter-near" || mode === "estimate-meter-gap") {
      const real = 110 + ((index * 23) % 250);
      const estimates = [real - 40, real + 15, real + 70].map((value) => Math.max(10, value));
      const best = estimates.reduce((winner, value) => Math.abs(value - real) < Math.abs(winner - real) ? value : winner, estimates[0]);
      return makeQuestion("2-3", difficulty, index, `${formatMeterCentimeter(real)}에 가장 가깝게 어림한 길이는 무엇인가요?`, formatMeterCentimeter(best), estimates.filter((value) => value !== best).map(formatMeterCentimeter).concat(formatMeterCentimeter(real + 120)), lengthScene("estimate", [
        `실제 길이 ${formatMeterCentimeter(real)}`,
        "m와 cm를 모두 cm로 바꾸어 비교합니다.",
        "차이가 가장 작은 어림을 고릅니다."
      ], {
        realCm: real,
        estimates,
        estimateCm: best
      }), "m와 cm가 섞인 어림값도 모두 cm로 바꾸면 차이를 비교할 수 있습니다.", makeFeedback(
        "같은 단위로 바꿔 어림을 비교해요.",
        "m와 cm가 섞이면 보기의 크기가 비슷해 보여도 실제 차이가 다릅니다.",
        estimates.map((value) => `${formatMeterCentimeter(value)}는 실제 길이와 ${Math.abs(value - real)}cm 차이입니다.`).concat(`가장 가까운 어림은 ${formatMeterCentimeter(best)}입니다.`),
        "어림값을 비교할 때는 먼저 모두 cm로 바꾼 뒤, 실제 길이와의 차이를 보세요."
      ));
    }

    if (mode === "add-over-meter") {
      const baseMeters = 2 + (index % 4);
      const baseCm = 65 + ((index * 5) % 25);
      const extra = 25 + ((index * 7) % 30);
      const baseTotal = baseMeters * 100 + baseCm;
      const answerTotal = baseTotal + extra;
      const answerText = formatMeterCentimeter(answerTotal);
      return makeQuestion("2-3", difficulty, index, `${baseMeters}m ${baseCm}cm에 ${extra}cm를 더하면 몇 m 몇 cm인가요?`, answerText, [
        `${baseMeters}m ${baseCm + extra}cm`,
        formatMeterCentimeter(answerTotal - 10),
        formatMeterCentimeter(answerTotal + 10),
        `${baseMeters + 1}m ${baseCm}cm`
      ], lengthScene("m-to-cm", [
        `${baseMeters}m ${baseCm}cm = ${baseTotal}cm`,
        `${extra}cm 더하기`,
        "100cm가 넘으면 1m로 바꿉니다."
      ], {
        meters: Math.floor(answerTotal / 100),
        cm: answerTotal % 100,
        totalCm: answerTotal
      }), "cm가 100이 넘으면 100cm를 1m로 바꾸어 정리합니다.", makeFeedback(
        "100cm를 1m로 바꿔요.",
        "심화 길이 문제는 cm끼리 더한 뒤 100cm가 넘는지 확인해야 합니다.",
        [`먼저 모두 cm로 보면 ${baseTotal}+${extra}=${answerTotal}cm입니다.`, `${answerTotal}cm는 ${answerText}입니다.`, `따라서 정답은 ${answerText}입니다.`],
        "m와 cm가 함께 있는 덧셈은 cm가 100을 넘는 순간 1m로 바꾸어 정리하세요."
      ));
    }

    if (mode === "compare-mixed") {
      const leftTotal = totalCm;
      const rightTotal = Math.max(100, leftTotal - (35 + (index % 20)));
      const rightText = `${rightTotal}cm`;
      const diff = leftTotal - rightTotal;
      return makeQuestion("2-3", difficulty, index, `${meters}m ${cm}cm는 ${rightText}보다 몇 cm 더 긴가요?`, `${diff}cm`, numChoices(diff, "cm", [-20, -10, -1, 1, 10, 20]), lengthScene("compare", [
        `${meters}m ${cm}cm = ${leftTotal}cm`,
        `${rightText}`,
        "같은 cm로 맞추어 비교합니다."
      ], {
        parts: [
          { label: "긴 길이", cm: leftTotal, text: `${meters}m ${cm}cm` },
          { label: "짧은 길이", cm: rightTotal, text: rightText }
        ],
        differenceCm: diff
      }), "m와 cm가 섞인 길이는 같은 cm 단위로 바꾼 뒤 차이를 구합니다.", makeFeedback(
        "단위를 맞춘 뒤 빼요.",
        "심화 길이 비교는 한쪽만 m와 cm로 되어 있어도 둘 다 cm로 맞추어야 합니다.",
        [`${meters}m ${cm}cm는 ${leftTotal}cm입니다.`, `비교할 길이는 ${rightTotal}cm입니다.`, `${leftTotal}-${rightTotal}=${diff}cm 더 깁니다.`],
        "단위가 다르면 계산 전에 두 길이 아래에 cm 값을 적어 같은 단위로 맞추세요."
      ));
    }

    if (mode === "missing-extra") {
      const startTotal = totalCm;
      const targetTotal = startTotal + 40 + ((index * 6) % 50);
      const answer = targetTotal - startTotal;
      const targetText = formatMeterCentimeter(targetTotal);
      return makeQuestion("2-3", difficulty, index, `${meters}m ${cm}cm에서 ${targetText}가 되려면 몇 cm 더 길어져야 하나요?`, `${answer}cm`, numChoices(answer, "cm", [-20, -10, -1, 1, 10, 20]), lengthScene("compare", [
        `${meters}m ${cm}cm = ${startTotal}cm`,
        `${targetText} = ${targetTotal}cm`,
        "목표까지 차이를 구합니다."
      ], {
        parts: [
          { label: "목표", cm: targetTotal, text: targetText },
          { label: "처음", cm: startTotal, text: `${meters}m ${cm}cm` }
        ],
        differenceCm: answer
      }), "목표 길이와 처음 길이를 같은 단위로 바꾼 뒤 차이를 구합니다.", makeFeedback(
        "목표까지 남은 길이를 찾아요.",
        "심화 길이 문제는 더한 결과가 주어지고 얼마를 더해야 하는지 거꾸로 찾습니다.",
        [`처음 길이는 ${startTotal}cm입니다.`, `목표 길이는 ${targetTotal}cm입니다.`, `${targetTotal}-${startTotal}=${answer}cm 더 길어져야 합니다.`],
        "목표가 있는 문제는 목표 길이에서 처음 길이를 빼서 더 필요한 길이를 찾으세요."
      ));
    }

    if (mode === "two-step-meter") {
      const extra = 20 + (index % 6) * 5;
      const answer = totalCm + extra;
      return makeQuestion("2-3", difficulty, index, `${meters}m ${cm}cm보다 ${extra}cm 더 긴 길이는 모두 몇 cm인가요?`, `${answer}cm`, numChoices(answer, "cm", [-100, -10, -1, 1, 10, 100]), lengthScene("m-to-cm", [
        `${meters}m ${cm}cm = ${totalCm}cm`,
        `${extra}cm 더 김`,
        "같은 단위로 바꾸고 더합니다."
      ], {
        meters,
        cm,
        totalCm: answer
      }), "m와 cm를 cm로 맞춘 뒤 더 긴 만큼을 더합니다.", makeFeedback(
        "같은 단위로 맞추고 계산해요.",
        "단위가 섞인 비교 문제는 먼저 모두 cm로 바꾸어야 계산이 자연스럽습니다.",
        [`${meters}m는 ${meters * 100}cm입니다.`, `${meters}m ${cm}cm는 ${totalCm}cm입니다.`, `${extra}cm 더 길면 ${totalCm}+${extra}=${answer}cm입니다.`],
        "m와 cm가 같이 나오면 계산 전에 cm 값으로 한 번 정리하세요."
      ));
    }

    if (mode === "m-to-cm") {
      const lengthText = formatMeterCentimeter(totalCm);
      return makeQuestion("2-3", difficulty, index, `${lengthText}는 모두 몇 cm인가요?`, `${totalCm}cm`, numChoices(totalCm, "cm", [-100, -10, -1, 1, 10, 100]), lengthScene("m-to-cm", [
        "1m = 100cm",
        `${meters}m = ${meters * 100}cm`,
        `${cm}cm를 더합니다.`
      ], {
        meters,
        cm,
        totalCm
      }), "m를 cm로 바꾸어 더합니다.", makeFeedback(
        "m를 cm로 바꿔요.",
        "m와 cm가 섞이면 먼저 같은 단위로 바꾸어야 합니다.",
        [`1m는 100cm입니다.`, `${meters}m는 ${meters * 100}cm입니다.`, `${meters * 100}+${cm}=${totalCm}cm입니다.`],
        "단위가 섞인 길이 문제는 모두 cm로 바꾼 뒤 계산하세요."
      ));
    }

    if (mode === "compare") {
      const other = totalCm + 30 + index;
      const otherText = formatMeterCentimeter(other);
      const baseText = formatMeterCentimeter(totalCm);
      return makeQuestion("2-3", difficulty, index, `${otherText}는 ${baseText}보다 몇 cm 더 긴가요?`, `${other - totalCm}cm`, numChoices(other - totalCm, "cm", [-20, -10, -1, 1, 10, 20]), lengthScene("compare", [
        `${Math.floor(other / 100)}m ${other % 100}cm = ${other}cm`,
        `${meters}m ${cm}cm = ${totalCm}cm`
      ], {
        parts: [
          { label: "긴 길이", cm: other, text: otherText },
          { label: "짧은 길이", cm: totalCm, text: baseText }
        ],
        differenceCm: other - totalCm
      }), "두 길이를 같은 단위로 바꾸고 뺍니다.", makeFeedback(
        "같은 단위로 바꾼 뒤 비교해요.",
        "m와 cm가 섞인 길이를 비교하려면 두 길이를 모두 cm로 바꾸어야 합니다.",
        [`첫 길이는 ${other}cm입니다.`, `둘째 길이는 ${totalCm}cm입니다.`, `차이는 ${other}-${totalCm}=${other - totalCm}cm입니다.`],
        "길이 비교 전에는 두 길이 아래에 cm 값을 각각 적으세요."
      ));
    }

    if (mode === "cm-to-m") {
      const answerText = formatMeterCentimeter(totalCm);
      return makeQuestion("2-3", difficulty, index, `${totalCm}cm를 m와 cm로 나타내면?`, answerText, [
        formatMeterCentimeter(totalCm + 10),
        formatMeterCentimeter(totalCm + 100),
        formatMeterCentimeter(Math.max(0, totalCm - 100)),
        formatMeterCentimeter(Math.max(0, totalCm - 10))
      ], lengthScene("cm-to-m", [
        `${totalCm}cm`,
        "100cm씩 묶으면 m가 됩니다."
      ], {
        meters,
        cm,
        totalCm
      }), "100cm를 1m로 바꾸어 나타냅니다.", makeFeedback(
        "100cm씩 묶어요.",
        "cm를 m와 cm로 바꿀 때는 100cm가 몇 묶음인지 봅니다.",
        [`${totalCm}cm 안에는 100cm가 ${meters}묶음 있습니다.`, `남은 길이는 ${cm}cm입니다.`, `따라서 ${answerText}입니다.`],
        "cm를 m로 바꿀 때는 100씩 동그라미 친다고 생각하세요."
      ));
    }

    return makeQuestion("2-3", difficulty, index, "교실 문 높이에 가장 알맞은 단위는 무엇인가요?", "m", ["cm"], lengthScene("unit-choice", [
      "교실 문은 사람 키보다 큰 길이입니다.",
      "큰 길이는 m를 쓰면 편합니다."
    ]), "큰 길이는 m 단위를 사용합니다.", makeFeedback(
      "대상에 맞는 단위를 골라요.",
      "길이의 단위는 재는 대상의 크기에 맞게 골라야 합니다.",
      ["교실 문 높이는 꽤 긴 길이입니다.", "cm로 쓰면 수가 너무 커집니다.", "그래서 m가 알맞습니다."],
      "단위 문제는 실제 물건의 크기를 몸으로 떠올려 보세요."
    ));
  }

  function buildTimeQuestion(difficulty, index) {
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["clock-hands", "half-hour", "add-within-hour", "calendar-weekday", "calendar-days-after", "day-hours", "am-pm-read", "calendar-date-difference"],
      mid: ["clock-hands", "elapsed-within-hour", "add-within-hour", "calendar-weekday", "calendar-days-after", "day-hours", "am-pm-read", "calendar-date-difference"],
      high: ["elapsed-over-hour", "add-over-hour", "later-than", "calendar-weekday", "calendar-days-after", "calendar-date-difference", "day-boundary", "am-pm-read", "clock-hands"]
    });
    const baseHour = 1 + ((index + difficultyOffset(difficulty)) % 11);
    const lowMinute = [0, 10, 20, 30][index % 4];
    const lowAdd = [10, 10, 20, 20][index % 4];
    const midMinute = [5, 10, 15, 20][index % 4];
    const midAdd = [10, 15, 20, 25][index % 4];
    const highMinute = [35, 40, 45, 50][index % 4];
    const highAdd = [25, 30, 35, 40][index % 4];
    const toClock = (totalMinutes) => ({
      hour: ((Math.floor(totalMinutes / 60) - 1) % 12) + 1,
      minute: totalMinutes % 60
    });

    if (mode === "day-hours") {
      return makeQuestion("2-4", difficulty, index, "하루는 모두 몇 시간인가요?", "24시간", ["12시간", "10시간", "60시간"], timeScene("day-cycle", [
        "오전 12시간",
        "오후 12시간",
        "오전과 오후를 합칩니다."
      ], {
        morningHours: 12,
        afternoonHours: 12,
        totalHours: 24
      }), "하루는 오전 12시간과 오후 12시간을 합한 24시간입니다.", makeFeedback(
        "하루를 오전과 오후로 나눠요.",
        "하루의 시간은 시계 한 바퀴만 생각하면 12시간으로 착각하기 쉽습니다.",
        ["오전은 12시간입니다.", "오후도 12시간입니다.", "12+12=24시간이므로 하루는 24시간입니다."],
        "하루 문제에서는 시계가 오전에 한 바퀴, 오후에 한 바퀴 돈다고 생각하세요."
      ));
    }

    if (mode === "am-pm-read") {
      const scenes = [
        { event: "아침에 학교에 가는 8시", answer: "오전", clue: "아침은 낮 12시 전입니다." },
        { event: "저녁을 먹는 7시", answer: "오후", clue: "저녁은 낮 12시 뒤입니다." },
        { event: "잠자리에 드는 10시", answer: "오후", clue: "밤 시간은 오후입니다." }
      ];
      const item = scenes[index % scenes.length];
      return makeQuestion("2-4", difficulty, index, `${item.event}는 오전과 오후 중 무엇이 알맞나요?`, item.answer, [item.answer === "오전" ? "오후" : "오전"], timeScene("day-cycle", [
        item.event,
        "낮 12시를 기준으로 앞뒤를 나눕니다.",
        item.clue
      ], {
        event: item.event,
        answer: item.answer
      }), "오전과 오후는 낮 12시를 기준으로 나누어 생활 장면과 연결합니다.", makeFeedback(
        "낮 12시를 기준으로 나눠요.",
        "오전/오후 문제는 숫자만 보고 고르면 안 되고, 하루 중 언제 일어나는 일인지 봐야 합니다.",
        [item.event, item.clue, `따라서 알맞은 말은 ${item.answer}입니다.`],
        "오전/오후를 고를 때는 아침·낮·저녁·밤 장면을 먼저 떠올리세요."
      ));
    }

    if (mode === "day-boundary") {
      return makeQuestion("2-4", difficulty, index, "오전과 오후는 각각 몇 시간씩인가요?", "12시간씩", ["6시간씩", "10시간씩", "24시간씩"], timeScene("day-cycle", [
        "하루 24시간",
        "오전과 오후로 반씩 나눕니다.",
        "24를 둘로 나눕니다."
      ], {
        morningHours: 12,
        afternoonHours: 12,
        totalHours: 24
      }), "하루 24시간을 오전과 오후 두 부분으로 나누면 각각 12시간입니다.", makeFeedback(
        "하루를 두 부분으로 똑같이 나눠요.",
        "오전과 오후는 하루 전체가 아니라 하루를 나눈 두 부분입니다.",
        ["하루는 24시간입니다.", "오전과 오후 두 부분으로 나눕니다.", "24시간을 반으로 나누면 12시간씩입니다."],
        "오전/오후 문제는 하루 전체 24시간과 반쪽 12시간을 구분하세요."
      ));
    }

    if (mode === "calendar-weekday") {
      return buildCalendarWeekdayQuestion(difficulty, index);
    }

    if (mode === "calendar-days-after") {
      return buildCalendarDaysAfterQuestion(difficulty, index);
    }

    if (mode === "calendar-date-difference") {
      return buildCalendarDateDifferenceQuestion(difficulty, index);
    }

    if (mode === "add-minutes" || mode === "add-within-hour" || mode === "add-over-hour") {
      const hour = baseHour;
      const minute = mode === "add-over-hour" ? highMinute : mode === "add-within-hour" ? midMinute : lowMinute;
      const add = mode === "add-over-hour" ? highAdd : mode === "add-within-hour" ? midAdd : lowAdd;
      const totalMinutes = hour * 60 + minute + add;
      const after = toClock(totalMinutes);
      const crossesHour = minute + add >= 60;
      const toNextHour = crossesHour ? 60 - minute : null;
      const remainingAfterHour = crossesHour ? add - toNextHour : null;
      const answerText = formatClockAnswer(after.hour, after.minute);
      return makeQuestion("2-4", difficulty, index, `${hour}시 ${minute}분에서 ${add}분 뒤의 시각은?`, answerText, timeDistractors(after.hour, after.minute), timeScene("add-minutes", [
        `처음 시각 ${hour}시 ${minute}분`,
        `${add}분 뒤`
      ], {
        start: { hour, minute },
        end: { hour: after.hour, minute: after.minute },
        minutes: add
      }), crossesHour ? "분이 60이 되면 다음 시각의 정각으로 넘어갑니다." : "분을 더해도 60분이 넘지 않으면 시는 그대로입니다.", makeFeedback(
        crossesHour ? "정각까지 먼저 가요." : "분을 먼저 더해요.",
        crossesHour
          ? "상급 시간 문제는 60분을 넘어가는 순간을 정확히 잡아야 합니다."
          : "시각 계산은 분을 먼저 더하고 60분이 넘는지 확인합니다.",
        crossesHour
          ? [`${minute}분에서 정각까지는 ${toNextHour}분입니다.`, `${add}분 중 ${toNextHour}분을 쓰면 ${remainingAfterHour}분이 남습니다.`, `다음 시각에서 ${remainingAfterHour}분 더 가면 ${answerText}입니다.`]
          : [`${minute}분에 ${add}분을 더합니다.`, "60분보다 작으므로 시는 그대로입니다.", `따라서 ${answerText}입니다.`],
        crossesHour
          ? "60분을 넘는 문제는 '정각까지 몇 분, 정각 뒤 몇 분'으로 둘로 나누어 세세요."
          : "시각 문제는 분끼리 먼저 계산한 뒤 시를 조정하세요."
      ));
    }

    if (mode === "elapsed-within-hour" || mode === "elapsed-over-hour" || mode === "later-than") {
      const hour = baseHour;
      const minute = mode === "elapsed-within-hour" ? midMinute : highMinute;
      const add = mode === "elapsed-within-hour" ? midAdd : highAdd;
      const totalMinutes = hour * 60 + minute + add;
      const after = toClock(totalMinutes);
      const crossesHour = minute + add >= 60;
      const toNextHour = crossesHour ? 60 - minute : null;
      const remainingAfterHour = crossesHour ? after.minute : null;
      const endText = formatClockAnswer(after.hour, after.minute);
      const prompt = mode === "later-than"
        ? `${endText}은 ${hour}시 ${minute}분보다 몇 분 뒤인가요?`
        : `${hour}시 ${minute}분부터 ${endText}까지 걸린 시간은?`;
      return makeQuestion("2-4", difficulty, index, prompt, `${add}분`, numChoices(add, "분", [-10, -5, 5, 10, 15]), timeScene("elapsed", [
        `시작 ${hour}시 ${minute}분`,
        `끝 ${endText}`
      ], {
        start: { hour, minute },
        end: { hour: after.hour, minute: after.minute },
        minutes: add
      }), crossesHour ? "정각을 지나가는 걸린 시간은 앞부분과 뒷부분을 나누어 더합니다." : "시작 시각에서 끝 시각까지 지난 분을 셉니다.", makeFeedback(
        crossesHour ? "정각 앞뒤로 나누어 세요." : "시작과 끝 사이를 세요.",
        crossesHour
          ? "상급 걸린 시간은 한 번에 빼기보다 정각까지, 정각부터 끝까지로 나누면 안전합니다."
          : "걸린 시간은 시계가 움직인 만큼을 묻는 말입니다.",
        crossesHour
          ? [`${hour}시 ${minute}분에서 다음 정각까지 ${toNextHour}분입니다.`, `정각에서 ${endText}까지 ${remainingAfterHour}분입니다.`, `${toNextHour}+${remainingAfterHour}=${add}분입니다.`]
          : [`시작은 ${hour}시 ${minute}분입니다.`, `끝은 ${endText}입니다.`, `분침이 ${add}분 움직였으므로 ${add}분입니다.`],
        crossesHour
          ? "시를 넘는 시간은 수직선에 정각을 가운데 표시하고 양쪽 시간을 더하세요."
          : "걸린 시간 문제는 시작 시각과 끝 시각을 수직선처럼 놓고 사이를 세세요."
      ));
    }

    if (mode === "half-hour") {
      const hour = baseHour;
      const halfHour = (hour % 12) + 1;
      return makeQuestion("2-4", difficulty, index, `${hour}시 30분을 다른 말로 바르게 나타낸 것은?`, `${hour}시 반`, [`${halfHour}시 반`, `${hour}시 15분`, `${hour}시 50분`, `${hour}시 정각`], timeScene("half-hour", [
        "30분은 반입니다.",
        `${hour}시 30분`
      ], {
        time: { hour, minute: 30 }
      }), "30분은 한 시간의 반이므로 '반'이라고 말합니다.", makeFeedback(
        "30분은 반이에요.",
        "한 시간은 60분이고, 그 절반은 30분입니다.",
        [`${hour}시 30분은 ${hour}시에서 30분 지난 시각입니다.`, "30분은 반이라고 말합니다.", `따라서 ${hour}시 반입니다.`],
        "시각 표현에서 '반'을 보면 30분으로 바꾸어 생각하세요."
      ));
    }

    return makeQuestion("2-4", difficulty, index, "긴바늘이 12를 가리키고 짧은바늘이 7을 가리키면 몇 시인가요?", "7시", ["12시", "6시", "7시 30분", "12시 7분"], timeScene("clock-hands", [
      "긴바늘 12",
      "짧은바늘 7",
      "정각입니다."
    ], {
      hour: 7,
      minute: 0,
      hourHand: 7,
      minuteHand: 12
    }), "긴바늘이 12이면 정각이고 짧은바늘이 시를 알려 줍니다.", makeFeedback(
      "긴바늘과 짧은바늘 역할을 나눠요.",
      "긴바늘은 분, 짧은바늘은 시를 나타냅니다.",
      ["긴바늘이 12에 있으면 00분입니다.", "짧은바늘이 7에 있으므로 7시입니다.", "그래서 정답은 7시입니다."],
      "시계 문제는 긴바늘을 먼저 보고 정각인지 확인한 뒤 짧은바늘을 보세요."
    ));
  }

  function buildCalendarWeekdayQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const startWeekdayIndex = (index * 2 + level) % WEEKDAY_NAMES.length;
    const offset = [1, 2, 3, 4, 5][(index + level) % 5];
    const answerWeekdayIndex = (startWeekdayIndex + offset) % WEEKDAY_NAMES.length;
    const startWeekday = WEEKDAY_NAMES[startWeekdayIndex];
    const answerText = WEEKDAY_NAMES[answerWeekdayIndex];
    return makeQuestion("2-4", difficulty, index, `달력에서 ${startWeekday}로부터 ${offset}일 뒤는 무슨 요일인가요?`, answerText, WEEKDAY_NAMES.filter((weekday) => weekday !== answerText), timeScene("calendar-weekday", [
      `${startWeekday}은 0칸`,
      `하루 뒤마다 한 칸`,
      `${offset}칸 뒤의 요일 찾기`
    ], {
      calendarType: "weekday",
      weekdays: WEEKDAY_NAMES,
      startWeekdayIndex,
      answerWeekdayIndex,
      offset
    }), "요일 문제는 시작 요일을 1로 세지 않고, 다음 날부터 1일 뒤로 셉니다.", makeFeedback(
      "시작 요일을 0칸으로 놓아요.",
      "요일은 원처럼 이어지므로 시작 칸에서 하루 뒤마다 한 칸씩 이동합니다.",
      [`${startWeekday}은 시작이므로 0칸입니다.`, `다음 날부터 1, 2, 3처럼 ${offset}칸을 셉니다.`, `${offset}칸 뒤에 도착한 요일이 ${answerText}입니다.`],
      "달력 문제는 먼저 시작 칸에 손가락을 놓고, 다음 칸부터 하나씩 세어 보세요."
    ));
  }

  function buildCalendarDaysAfterQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const months = [4, 5, 6, 9, 10, 11];
    const offsets = [3, 4, 5, 6, 7, 8];
    const month = months[(index + level) % months.length];
    const offset = offsets[(index * 2 + level) % offsets.length];
    const startDay = 3 + ((index * 3 + level * 2) % 17);
    const targetDay = startDay + offset;
    const answerText = `${month}월 ${targetDay}일`;
    return makeQuestion("2-4", difficulty, index, `달력에서 ${month}월 ${startDay}일에서 ${offset}일 뒤는 몇 월 며칠인가요?`, answerText, calendarDateDistractors(month, targetDay), timeScene("calendar-days-after", [
      `${month}월 ${startDay}일은 0칸`,
      `다음 날부터 1일 뒤`,
      `${offset}칸 이동`
    ], {
      calendarType: "days-after",
      month,
      startDay,
      targetDay,
      offset,
      visibleStart: Math.max(1, startDay - 2),
      visibleEnd: Math.min(31, targetDay + 2)
    }), "며칠 뒤는 시작 날짜를 빼고 다음 날짜부터 1일 뒤로 세어야 합니다.", makeFeedback(
      "시작 날짜는 0칸이에요.",
      "며칠 뒤를 묻는 문제는 시작 날짜 자체를 세면 하루가 많아집니다.",
      [`${month}월 ${startDay}일에 먼저 서 있습니다.`, `다음 날을 1일 뒤로 세고 ${offset}칸 이동합니다.`, `도착한 날짜가 ${answerText}입니다.`],
      "날짜 문제는 시작일 아래에 0을 쓰고, 다음 날짜부터 1, 2, 3을 적어 보세요."
    ));
  }

  function buildCalendarDateDifferenceQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const months = [4, 5, 6, 9, 10, 11];
    const gaps = [5, 6, 7, 8, 9, 10, 12];
    const month = months[(index + level * 2) % months.length];
    const gap = gaps[(index + level) % gaps.length];
    const startDay = 2 + ((index * 4 + level * 3) % 13);
    const targetDay = startDay + gap;
    const answerText = `${gap}일`;
    return makeQuestion("2-4", difficulty, index, `달력에서 ${month}월 ${startDay}일과 ${month}월 ${targetDay}일은 며칠 차이인가요?`, answerText, numChoices(gap, "일", [-2, -1, 1, 2, 7]), timeScene("calendar-date-difference", [
      `앞 날짜 ${startDay}일은 0칸`,
      `뒤 날짜 ${targetDay}일까지의 칸 수`,
      `${targetDay}-${startDay}`
    ], {
      calendarType: "date-difference",
      month,
      startDay,
      targetDay,
      offset: gap,
      visibleStart: startDay,
      visibleEnd: targetDay
    }), "날짜 차이는 두 날짜 사이의 칸 수이므로 뒤 날짜에서 앞 날짜를 뺍니다.", makeFeedback(
      "사이의 칸 수를 봐요.",
      "날짜 차이는 시작 날짜 이름을 세는 것이 아니라, 시작 날짜에서 뒤 날짜까지 움직인 칸 수입니다.",
      [`${startDay}일을 0칸으로 놓습니다.`, `${targetDay}일까지 간 칸 수는 ${targetDay}-${startDay}입니다.`, `그래서 ${answerText} 차이입니다.`],
      "두 날짜 차이는 달력 칸에 0, 1, 2를 적어 보면 왜 빼기인지 바로 보입니다."
    ));
  }

  function buildTableGraphQuestion(difficulty, index) {
    const labels = ["축구", "피구", "달리기", "줄넘기"];
    const values = labels.map((label, order) => ({ label, value: 2 + ((index * 2 + order * 3 + difficultyOffset(difficulty)) % 8) }));
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["row-read", "row-match", "most", "survey-to-table", "difference", "table-to-graph"],
      mid: ["row-read", "row-match", "total", "difference", "table-to-graph", "two-items"],
      high: ["row-match", "pair-vs-one", "difference", "remaining-one", "compare-two-pairs", "survey-missing"]
    });

    if (mode === "survey-to-table" || mode === "survey-missing") {
      const target = values[index % values.length];
      const responses = values.flatMap((item) => Array.from({ length: item.value }, () => item.label));
      const shownResponses = responses;
      return makeQuestion("2-5", difficulty, index, `조사한 자료를 표로 나타내려고 합니다. ${target.label}${objectParticle(target.label)} 고른 학생은 몇 명인가요?`, `${target.value}명`, numChoices(target.value, "명", [-2, -1, 1, 2, 3]), graphScene("survey-to-table", [
        "조사 자료에서 같은 이름을 표시합니다.",
        `${target.label}만 골라 셉니다.`,
        "센 수를 표에 적습니다."
      ], {
        values,
        responses: shownResponses,
        target: target.label
      }), "조사 자료를 표로 만들 때는 같은 답끼리 표시하고 개수를 세어 항목별 수를 적습니다.", makeFeedback(
        "같은 이름끼리 표시해요.",
        "표 만들기 문제는 이미 완성된 표를 읽는 것이 아니라, 조사한 답에서 같은 항목을 모아 세는 활동입니다.",
        [`조사 자료에서 ${target.label}에 표시합니다.`, `표시된 ${target.label}의 수를 셉니다.`, `따라서 표에는 ${target.value}명으로 적습니다.`],
        "표로 나타낼 때는 같은 이름에 같은 색 표시를 하고, 빠뜨린 답이 없는지 마지막에 전체 수를 확인하세요."
      ));
    }

    if (mode === "table-to-graph") {
      const target = values[(index + 1) % values.length];
      return makeQuestion("2-5", difficulty, index, `표를 그래프로 나타낼 때 ${target.label} 줄에는 그림을 몇 개 붙여야 하나요?`, `${target.value}개`, numChoices(target.value, "개", [-2, -1, 1, 2, 3]), graphScene("table-to-graph", [
        "표의 수를 그래프 그림 수로 옮깁니다.",
        `${target.label} 줄을 찾습니다.`,
        "수만큼 그림을 붙입니다."
      ], {
        values,
        target: target.label
      }), "그래프로 나타낼 때는 표의 항목과 수를 그대로 대응시켜 같은 수만큼 그림을 붙입니다.", makeFeedback(
        "표의 수를 그림 수로 옮겨요.",
        "그래프 만들기 문제는 막대가 예쁘게 보이는 것보다 표의 수와 그림 수가 정확히 같아야 합니다.",
        [`표에서 ${target.label}${topicParticle(target.label)} ${target.value}명입니다.`, `그래프의 ${target.label} 줄에 그림을 ${target.value}개 붙입니다.`, "항목 이름과 그림 수가 서로 맞아야 합니다."],
        "표에서 그래프로 옮길 때는 항목 이름을 먼저 맞추고, 숫자만큼 하나씩 체크하며 붙이세요."
      ));
    }

    if (mode === "row-match") {
      const target = values[(index + 2) % values.length];
      return makeQuestion("2-5", difficulty, index, `표에서 ${target.value}명인 활동은 무엇인가요?`, target.label, values.map((item) => item.label).filter((label) => label !== target.label), graphScene("row-match", [
        "숫자를 먼저 찾고 활동 이름을 읽습니다.",
        `${target.value}명인 줄을 찾습니다.`,
        "그 줄의 항목 이름을 확인합니다."
      ], {
        values,
        target: target.label
      }), "표를 거꾸로 읽을 때는 숫자를 먼저 찾고 같은 줄의 항목 이름으로 되돌아갑니다.", makeFeedback(
        "숫자에서 이름으로 거꾸로 읽어요.",
        "표와 그래프는 항목에서 수로 읽을 수도 있고, 수에서 항목으로 되돌아 읽을 수도 있습니다.",
        [`먼저 ${target.value}명이라고 적힌 줄을 찾습니다.`, `그 줄의 활동 이름은 ${target.label}입니다.`, `따라서 정답은 ${target.label}입니다.`],
        "숫자가 조건인 문제는 숫자에 표시한 뒤 같은 줄의 이름까지 가로로 따라가세요."
      ));
    }

    if (mode === "pair-vs-one") {
      const first = values[index % values.length];
      const second = values[(index + 2) % values.length];
      const compare = values[(index + 1) % values.length];
      const pairTotal = first.value + second.value;
      const diff = Math.abs(pairTotal - compare.value);
      return makeQuestion("2-5", difficulty, index, `${first.label}${andParticle(first.label)} ${second.label}${objectParticle(second.label)} 좋아하는 학생은 ${compare.label}${objectParticle(compare.label)} 좋아하는 학생과 몇 명 차이인가요?`, `${diff}명`, numChoices(diff, "명", [-3, -2, -1, 1, 2, 3]), values.map((item) => `${item.label} ${item.value}명`), "두 항목을 먼저 더한 뒤 한 항목과 비교합니다.", makeFeedback(
        "두 항목 합과 한 항목을 비교해요.",
        "심화 그래프 문제는 두 항목의 합을 먼저 만들고, 그 합과 다른 항목을 비교합니다.",
        [`${first.label}${andParticle(first.label)} ${second.label}는 ${first.value}+${second.value}=${pairTotal}명입니다.`, `${compare.label}${objectParticle(compare.label)} 좋아하는 학생은 ${compare.value}명입니다.`, `차이는 ${diff}명입니다.`],
        "두 항목과 한 항목을 비교할 때는 두 항목의 합을 먼저 적고 나서 차이를 구하세요."
      ));
    }

    if (mode === "remaining-one") {
      const total = values.reduce((sum, item) => sum + item.value, 0);
      const target = values[index % values.length];
      const answer = total - target.value;
      return makeQuestion("2-5", difficulty, index, `표에 조사된 학생이 모두 ${total}명입니다. ${target.label}${objectParticle(target.label)} 좋아하는 학생을 빼면 나머지는 몇 명인가요?`, `${answer}명`, numChoices(answer, "명", [-5, -2, -1, 1, 2, 5]), values.map((item) => `${item.label} ${item.value}명`), "전체에서 한 항목을 제외한 나머지를 찾습니다.", makeFeedback(
        "전체에서 한 항목을 빼요.",
        "심화 표 문제는 전체와 제외할 항목을 확인한 뒤 나머지를 구합니다.",
        [`전체는 ${total}명입니다.`, `${target.label}${objectParticle(target.label)} 좋아하는 학생은 ${target.value}명입니다.`, `${total}-${target.value}=${answer}명입니다.`],
        "나머지를 묻는 문제는 제외할 항목에 X표를 하고 전체에서 그 수를 빼세요."
      ));
    }

    if (mode === "compare-two-pairs") {
      const firstSum = values[0].value + values[1].value;
      const secondSum = values[2].value + values[3].value;
      const diff = Math.abs(firstSum - secondSum);
      const firstNames = `${values[0].label}${andParticle(values[0].label)} ${values[1].label}`;
      const secondNames = `${values[2].label}${andParticle(values[2].label)} ${values[3].label}`;
      return makeQuestion("2-5", difficulty, index, `${firstNames}, ${secondNames} 두 묶음의 학생 수 차이는 몇 명인가요?`, `${diff}명`, numChoices(diff, "명", [-3, -2, -1, 1, 2, 3]), values.map((item) => `${item.label} ${item.value}명`), "두 항목씩 묶어 더한 뒤 두 묶음의 차이를 구합니다.", makeFeedback(
        "두 묶음을 각각 더한 뒤 비교해요.",
        "심화 그래프 문제는 항목 두 개씩 먼저 합하고, 그 합끼리 비교합니다.",
        [`${firstNames}는 ${values[0].value}+${values[1].value}=${firstSum}명입니다.`, `${secondNames}는 ${values[2].value}+${values[3].value}=${secondSum}명입니다.`, `두 묶음의 차이는 ${diff}명입니다.`],
        "두 묶음을 비교할 때는 각 묶음의 합을 먼저 적고, 마지막에 큰 합에서 작은 합을 빼세요."
      ));
    }

    if (mode === "two-items") {
      const first = values[index % values.length];
      const second = values[(index + 2) % values.length];
      const total = first.value + second.value;
      return makeQuestion("2-5", difficulty, index, `${first.label}${andParticle(first.label)} ${second.label}${objectParticle(second.label)} 좋아하는 학생은 모두 몇 명인가요?`, `${total}명`, numChoices(total, "명", [-5, -2, -1, 1, 2, 5]), values.map((item) => `${item.label} ${item.value}명`), "두 항목의 수를 찾아 더합니다.", makeFeedback(
        "두 줄을 찾아 더해요.",
        "표와 그래프에서 두 항목을 묻는 문제는 각 항목의 수를 정확히 찾은 뒤 더해야 합니다.",
        [`${first.label}${topicParticle(first.label)} ${first.value}명입니다.`, `${second.label}${topicParticle(second.label)} ${second.value}명입니다.`, `${first.value}+${second.value}=${total}명입니다.`],
        "두 항목 이름에 밑줄을 긋고, 표에서 찾은 숫자 옆에 체크한 뒤 더하세요."
      ));
    }

    if (mode === "row-read") {
      const target = values[index % values.length];
      return makeQuestion("2-5", difficulty, index, `표에서 ${target.label}${objectParticle(target.label)} 좋아하는 학생은 몇 명인가요?`, `${target.value}명`, numChoices(target.value, "명", [-2, -1, 1, 2, 3]), values.map((item) => `${item.label} ${item.value}명`), "표에서 알맞은 항목의 수를 읽습니다.", makeFeedback(
        "표의 줄을 정확히 따라가요.",
        "표 읽기는 항목 이름과 숫자를 정확히 연결하는 것이 중요합니다.",
        [`찾을 항목은 ${target.label}입니다.`, `표에서 ${target.label} 옆에는 ${target.value}명이라고 되어 있습니다.`, `정답은 ${target.value}명입니다.`],
        "표에서는 손가락으로 항목 이름에서 숫자까지 가로로 따라가세요."
      ));
    }

    if (mode === "total") {
      const total = values.reduce((sum, item) => sum + item.value, 0);
      return makeQuestion("2-5", difficulty, index, "표에 조사된 학생은 모두 몇 명인가요?", `${total}명`, numChoices(total, "명", [-5, -2, -1, 1, 2, 5]), values.map((item) => `${item.label} ${item.value}명`), "전체 학생 수는 모든 항목의 수를 더합니다.", makeFeedback(
        "전체는 모두 더해요.",
        "표 전체의 수를 묻는 문제는 각 항목의 수를 빠뜨리지 않고 모두 더해야 합니다.",
        values.map((item) => `${item.label} ${item.value}명`).concat(`모두 더하면 ${total}명입니다.`),
        "전체를 구할 때는 더한 항목에 체크 표시를 하며 빠뜨리지 않게 하세요."
      ));
    }

    if (mode === "difference") {
      const sorted = [...values].sort((a, b) => b.value - a.value);
      const diff = sorted[0].value - sorted[sorted.length - 1].value;
      return makeQuestion("2-5", difficulty, index, "가장 많은 항목과 가장 적은 항목의 차이는 몇 명인가요?", `${diff}명`, numChoices(diff, "명", [-2, -1, 1, 2, 3]), values.map((item) => `${item.label} ${item.value}명`), "가장 큰 수와 가장 작은 수의 차를 구합니다.", makeFeedback(
        "큰 수와 작은 수를 골라 빼요.",
        "차이를 묻는 문제는 가장 큰 수에서 가장 작은 수를 빼야 합니다.",
        [`가장 많은 항목은 ${sorted[0].label} ${sorted[0].value}명입니다.`, `가장 적은 항목은 ${sorted[sorted.length - 1].label} ${sorted[sorted.length - 1].value}명입니다.`, `${sorted[0].value}-${sorted[sorted.length - 1].value}=${diff}명입니다.`],
        "그래프 비교 문제는 가장 큰 막대와 가장 작은 막대를 먼저 찾으세요."
      ));
    }

    const sorted = [...values].sort((a, b) => b.value - a.value);
    return makeQuestion("2-5", difficulty, index, "가장 많은 학생이 고른 활동은 무엇인가요?", sorted[0].label, values.map((item) => item.label).filter((label) => label !== sorted[0].label).concat(["모두 같음"]), values.map((item) => `${item.label} ${item.value}명`), "가장 큰 수를 가진 항목을 찾습니다.", makeFeedback(
      "가장 큰 막대를 찾아요.",
      "가장 많은 항목은 이름보다 숫자를 비교해서 골라야 합니다.",
      values.map((item) => `${item.label}: ${item.value}명`).concat(`가장 큰 수는 ${sorted[0].value}명이므로 ${sorted[0].label}입니다.`),
      "그래프에서는 가장 높은 막대나 가장 큰 숫자에 먼저 표시하세요."
    ));
  }

  function buildPatternQuestion(difficulty, index) {
    const level = difficultyOffset(difficulty);
    const mode = selectDifficultyMode(difficulty, index, {
      low: ["increase", "color-repeat", "action-sound", "color-repeat"],
      mid: ["increase", "decrease", "color-repeat", "addition-table-rule", "stacking-pattern"],
      high: ["missing-middle", "multiplication-table-rule", "alternating-step", "stacking-pattern", "action-sound"]
    });
    const start = difficulty === "low" ? 2 + (index % 5) : 2 + ((index + level) % 9);
    const step = difficulty === "low" ? [2, 3][index % 2] : [2, 3, 4, 5][(index + level) % 4];

    if (mode === "addition-table-rule") {
      const row = 3 + (index % 4);
      const sequence = [row + 1, row + 2, row + 3, row + 4];
      return makeQuestion("2-6", difficulty, index, `덧셈표에서 ${row}이 있는 줄을 오른쪽으로 한 칸씩 가면 수는 어떻게 변하나요?`, "1씩 커집니다", ["2씩 커집니다", "1씩 작아집니다", "항상 같습니다"], patternScene("addition-table", [
        `${row}+1, ${row}+2, ${row}+3, ${row}+4`,
        sequence.join(", "),
        "오른쪽으로 갈 때 변화량을 봅니다."
      ], {
        row,
        sequence,
        change: 1
      }), "덧셈표는 한 수를 고정하고 다른 수가 1씩 커지면 합도 1씩 커지는 규칙이 있습니다.", makeFeedback(
        "덧셈표의 한 방향을 따라가요.",
        "표 규칙은 칸 안의 수만 보지 말고, 어느 방향으로 움직이는지 봐야 합니다.",
        [`${row}+1=${sequence[0]}입니다.`, `${row}+2=${sequence[1]}, ${row}+3=${sequence[2]}입니다.`, "오른쪽으로 한 칸 갈 때마다 더하는 수가 1 커지므로 합도 1씩 커집니다."],
        "덧셈표에서는 행 또는 열을 하나 고정하고, 옆 칸과의 차이를 화살표 위에 적어 보세요."
      ));
    }

    if (mode === "multiplication-table-rule") {
      const dan = 2 + ((index + level) % 8);
      const sequence = [dan, dan * 2, dan * 3, dan * 4];
      return makeQuestion("2-6", difficulty, index, `곱셈표 ${dan}단에서 오른쪽으로 한 칸씩 갈 때 수는 어떻게 변하나요?`, `${dan}씩 커집니다`, [`1씩 커집니다`, `${Math.max(1, dan - 1)}씩 커집니다`, `${dan}씩 작아집니다`], patternScene("multiplication-table", [
        `${dan}×1, ${dan}×2, ${dan}×3, ${dan}×4`,
        sequence.join(", "),
        "한 칸 옆으로 갈 때의 차이를 봅니다."
      ], {
        dan,
        sequence,
        change: dan
      }), "곱셈표의 한 단에서는 곱하는 횟수가 1 늘 때마다 그 단의 수만큼 커집니다.", makeFeedback(
        "곱셈표의 한 단은 같은 만큼 뛰어요.",
        "곱셈표 규칙은 덧셈표처럼 항상 1씩 커지지 않습니다. 몇 단인지에 따라 변화량이 달라집니다.",
        [`${dan}단의 값은 ${sequence.join(", ")}입니다.`, `이웃한 두 수의 차이는 ${dan}입니다.`, `따라서 오른쪽으로 한 칸 갈 때마다 ${dan}씩 커집니다.`],
        "곱셈표에서는 한 단의 첫 두 칸을 빼서 변화량을 찾고, 같은 차이가 계속되는지 확인하세요."
      ));
    }

    if (mode === "stacking-pattern") {
      const heights = [1 + (index % 2), 2 + (index % 2), 3 + (index % 2)];
      const next = heights[heights.length - 1] + 1;
      return makeQuestion("2-6", difficulty, index, `쌓은 모양의 높이가 ${heights.join("층, ")}층으로 변합니다. 다음 모양은 몇 층인가요?`, `${next}층`, numChoices(next, "층", [-2, -1, 1, 2]), patternScene("stacking", [
        heights.map((height) => `${height}층`).join(" → "),
        "한 모양마다 1층씩 높아집니다.",
        "다음 높이를 찾습니다."
      ], {
        heights,
        next
      }), "쌓은 모양 규칙은 모양이 어떻게 변하는지 높이, 방향, 개수 중 무엇이 달라지는지 봅니다.", makeFeedback(
        "쌓은 모양의 변화를 봐요.",
        "쌓은 모양 규칙은 그림 전체가 아니라 바뀌는 부분을 찾아야 합니다.",
        [`높이가 ${heights[0]}층에서 ${heights[1]}층으로 1층 커졌습니다.`, `${heights[1]}층에서 ${heights[2]}층도 1층 커졌습니다.`, `다음은 ${next}층입니다.`],
        "쌓은 모양은 각 단계에서 새로 붙은 쌓기나무에 표시하면 규칙이 보입니다."
      ));
    }

    if (mode === "action-sound") {
      const pattern = ["박수", "박수", "발구르기"];
      const shown = pattern.concat(pattern).slice(0, 5);
      return makeQuestion("2-6", difficulty, index, `${shown.join(", ")}, □의 규칙에서 □에 알맞은 동작은?`, "발구르기", ["박수", "손흔들기", "점프"], patternScene("action-sound", [
        "박수-박수-발구르기",
        "세 동작이 한 묶음입니다.",
        "묶음의 마지막 동작을 찾습니다."
      ], {
        pattern,
        shown,
        next: "발구르기"
      }), "생활 속 규칙은 소리나 동작도 반복되는 가장 짧은 묶음을 찾으면 다음을 알 수 있습니다.", makeFeedback(
        "동작도 묶음으로 반복돼요.",
        "생활 규칙은 숫자가 없어도 반복되는 순서가 있습니다.",
        ["박수-박수-발구르기가 한 묶음입니다.", "다음 묶음도 박수-박수-발구르기입니다.", "따라서 빈칸에는 발구르기가 옵니다."],
        "동작 규칙은 소리 내어 말하며 반복 묶음에 괄호를 쳐 보세요."
      ));
    }

    if (mode === "missing-middle") {
      const seq = [start, start + step, start + step * 2, start + step * 3];
      return makeQuestion("2-6", difficulty, index, `${seq[0]}, □, ${seq[2]}, ${seq[3]}의 규칙에서 □는?`, `${seq[1]}`, numChoices(seq[1], "", [-step, -1, 1, step, step * 2]), [
        `${seq[0]}에서 ${seq[2]}까지 두 칸`,
        `한 칸마다 ${step}씩 커집니다.`
      ], "가운데 빈칸은 앞뒤 수의 간격을 나누어 찾습니다.", makeFeedback(
        "앞뒤 수 사이를 나누어 봐요.",
        "가운데 빈칸은 앞 수에서 한 칸만 움직인 수입니다.",
        [`${seq[2]}-${seq[0]}=${step * 2}입니다.`, `두 칸 차이이므로 한 칸은 ${step}입니다.`, `${seq[0]}+${step}=${seq[1]}이므로 □=${seq[1]}입니다.`],
        "빈칸이 가운데 있으면 앞뒤 수 사이에 작은 화살표를 두 개 그리고 한 칸의 차이를 찾으세요."
      ));
    }

    if (mode === "alternating-step") {
      const smallStep = 2 + (index % 2);
      const bigStep = smallStep + 2;
      const seq = [
        start,
        start + smallStep,
        start + smallStep + bigStep,
        start + smallStep + bigStep + smallStep,
        start + smallStep + bigStep + smallStep + bigStep
      ];
      const answer = seq[4] + smallStep;
      return makeQuestion("2-6", difficulty, index, `${seq.join(", ")}, □의 규칙에서 □는?`, `${answer}`, numChoices(answer, "", [-bigStep, -smallStep, -1, 1, smallStep, bigStep]), [
        `+${smallStep}, +${bigStep}가 번갈아 나옵니다.`,
        seq.join(", ") + ", ?"
      ], "두 가지 변화가 번갈아 나오는 규칙을 찾습니다.", makeFeedback(
        "번갈아 나오는 규칙을 찾아요.",
        "심화 규칙은 같은 수만 더하는 것이 아니라 두 변화가 번갈아 나올 수 있습니다.",
        [`${seq[0]}에서 ${seq[1]}은 +${smallStep}입니다.`, `${seq[1]}에서 ${seq[2]}는 +${bigStep}입니다.`, `+${smallStep}, +${bigStep}가 반복되므로 다음은 +${smallStep}, 답은 ${answer}입니다.`],
        "규칙이 한 번에 보이지 않으면 숫자 사이마다 +몇인지 써서 반복되는 변화 묶음을 찾으세요."
      ));
    }

    if (mode === "increase") {
      const seq = [start, start + step, start + step * 2, start + step * 3];
      return makeQuestion("2-6", difficulty, index, `${seq[0]}, ${seq[1]}, ${seq[2]}, □의 규칙에서 □는?`, `${seq[3]}`, numChoices(seq[3], "", [-step, -1, 1, step, step * 2]), [
        `규칙: ${step}씩 커집니다.`,
        seq.slice(0, 3).join(", ") + ", ?"
      ], "앞의 수가 일정하게 얼마나 커지는지 찾습니다.", makeFeedback(
        "수 사이의 차이를 찾아요.",
        "수 배열의 규칙은 이웃한 두 수의 차이를 보면 잘 보입니다.",
        [`${seq[1]}-${seq[0]}=${step}입니다.`, `${seq[2]}-${seq[1]}=${step}입니다.`, `계속 ${step}씩 커지므로 다음 수는 ${seq[3]}입니다.`],
        "규칙 찾기에서는 숫자 사이에 +몇인지 먼저 적어 보세요."
      ));
    }

    if (mode === "decrease") {
      const seq = [start + step * 3, start + step * 2, start + step, start];
      return makeQuestion("2-6", difficulty, index, `${seq[0]}, ${seq[1]}, ${seq[2]}, □의 규칙에서 □는?`, `${seq[3]}`, numChoices(seq[3], "", [-step, -1, 1, step, step * 2]), [
        `규칙: ${step}씩 작아집니다.`,
        seq.slice(0, 3).join(", ") + ", ?"
      ], "앞의 수가 일정하게 얼마나 작아지는지 찾습니다.", makeFeedback(
        "작아지는 규칙을 찾아요.",
        "수 배열은 커질 수도 있고 작아질 수도 있으므로 방향을 확인해야 합니다.",
        [`${seq[0]}에서 ${seq[1]}로 갈 때 ${step} 작아집니다.`, `${seq[1]}에서 ${seq[2]}로 갈 때도 ${step} 작아집니다.`, `따라서 다음 수는 ${seq[3]}입니다.`],
        "규칙을 찾을 때는 +인지 -인지 방향 표시를 꼭 하세요."
      ));
    }

    if (mode === "color-repeat") {
      return makeQuestion("2-6", difficulty, index, "빨강, 파랑, 파랑, 빨강, 파랑, 파랑 다음에 올 색은?", "빨강", ["파랑", "노랑", "초록", "보라"], [
        "빨강-파랑-파랑",
        "같은 묶음이 반복됩니다."
      ], "반복되는 묶음을 찾습니다.", makeFeedback(
        "반복 묶음을 찾아요.",
        "색 규칙은 가장 짧게 반복되는 묶음을 찾으면 다음을 쉽게 알 수 있습니다.",
        ["빨강-파랑-파랑이 한 묶음입니다.", "그 묶음이 다시 반복됩니다.", "파랑 다음에는 새 묶음의 첫 색인 빨강이 옵니다."],
        "색이나 도형 규칙은 반복되는 묶음에 괄호를 쳐 보세요."
      ));
    }

    return makeQuestion("2-6", difficulty, index, "2, 4, 8, 16, □의 규칙을 설명한 것은?", "앞 수에 2를 곱합니다", ["2씩 더합니다", "4씩 더합니다", "앞 수에서 2를 뺍니다", "항상 10을 더합니다"], [
      "2→4",
      "4→8",
      "8→16"
    ], "앞 수가 두 배씩 커지는 규칙입니다.", makeFeedback(
      "덧셈 규칙인지 곱셈 규칙인지 봐요.",
      "수 사이의 차이가 계속 달라진다면 더하기 규칙이 아닐 수 있습니다.",
      ["2에서 4는 2배입니다.", "4에서 8도 2배입니다.", "8에서 16도 2배이므로 앞 수에 2를 곱하는 규칙입니다."],
      "규칙 설명 문제에서는 이웃한 두 수를 여러 쌍 확인하세요."
    ));
  }

  function difficultyOffset(difficulty) {
    return { low: 0, mid: 1, high: 2 }[difficulty] || 0;
  }

  const DISPLAY_QUESTION_BANK = buildDenseBank();

  Object.assign(window, {
    BLOG_URL,
    OPTION_LABELS,
    CATEGORY_KEYS,
    CATEGORY_OPTIONS,
    LESSON_OPTIONS_BY_CATEGORY,
    DIFFICULTY_OPTIONS,
    TIMER_OPTIONS,
    PLAYER_COUNT_OPTIONS,
    DIFFICULTY_NAMES,
    CATEGORY_NAMES: DISPLAY_CATEGORY_NAMES,
    PLAYER_COLORS,
    ANIMAL_PLAYERS: DISPLAY_ANIMAL_PLAYERS,
    SHAPE_FILL,
    SCORE_BY_DIFFICULTY: DISPLAY_SCORE_BY_DIFFICULTY,
    CHARACTER_PHOTO_PATH,
    DISPLAY_QUESTION_BANK,
    createPlayers: createDisplayPlayers
  });

  window.Math2GameBank = {
    OPTION_LABELS,
    CATEGORY_OPTIONS,
    LESSON_OPTIONS_BY_CATEGORY,
    TIMER_OPTIONS,
    PLAYER_COUNT_OPTIONS,
    DIFFICULTY_OPTIONS,
    CATEGORY_NAMES: DISPLAY_CATEGORY_NAMES,
    DIFFICULTY_NAMES,
    SCORE_BY_DIFFICULTY: DISPLAY_SCORE_BY_DIFFICULTY,
    createPlayers: createDisplayPlayers,
    createQuestion,
    DISPLAY_QUESTION_BANK,
  };
})();
