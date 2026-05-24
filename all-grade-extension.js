(function () {
  const bank = window.Math2GameBank || {};
  const categoryOptions = window.CATEGORY_OPTIONS || bank.CATEGORY_OPTIONS || [];
  const lessonOptionsByCategory = window.LESSON_OPTIONS_BY_CATEGORY || bank.LESSON_OPTIONS_BY_CATEGORY || {};
  const displayQuestionBank = window.DISPLAY_QUESTION_BANK || bank.DISPLAY_QUESTION_BANK || {};
  const categoryKeys = window.CATEGORY_KEYS || [];
  const categoryNames = window.CATEGORY_NAMES || {};

  const GRADE_OPTIONS = [
    { value: 1, label: "1학년", description: "수 감각과 모양을 그림으로 확인" },
    { value: 2, label: "2학년", description: "기존 2학년 전 단원 문제" },
    { value: 3, label: "3학년", description: "나눗셈, 곱셈, 분수의 기초" },
    { value: 4, label: "4학년", description: "큰 수, 각도, 그래프, 소수" },
    { value: 5, label: "5학년", description: "약수와 배수, 분수, 넓이" },
    { value: 6, label: "6학년", description: "비율, 입체, 원, 심화 문장제" }
  ];

  const DIFFICULTY_META = {
    low: { rank: "기초", focus: "한눈에 보이는 수와 그림으로 원리를 확인합니다." },
    mid: { rank: "기본", focus: "대표 풀이 절차를 식과 그림으로 연결합니다." },
    high: { rank: "심화", focus: "조건을 두 번 이상 연결해 문장제를 해결합니다." }
  };

  const QUESTION_COUNT_PER_DIFFICULTY = 54;

  const UNIT_BLUEPRINTS = [
    gradeBlueprint(1, [
      [
        unit("9까지의 수", "9까지의 수 읽기와 순서", "number", ["수를 세어 읽기", "크기 비교", "순서와 위치"]),
        unit("여러 가지 모양", "생활 속 모양 찾기", "geometry", ["동그라미·세모·네모", "모양 분류", "모양 만들기"]),
        unit("덧셈과 뺄셈", "10 안에서 더하고 빼기", "addSub", ["더하기 상황", "빼기 상황", "식으로 나타내기"]),
        unit("비교하기", "길이, 무게, 넓이 비교", "measure", ["길이 비교", "무게 비교", "넓이 비교"]),
        unit("50까지의 수", "10개 묶음과 낱개", "number", ["10개씩 묶기", "50까지의 순서", "수의 크기 비교"])
      ],
      [
        unit("100까지의 수", "10개 묶음으로 수 보기", "number", ["몇십 몇", "수 배열", "바로 앞과 바로 뒤"]),
        unit("덧셈과 뺄셈", "받아올림 없는 계산과 생활 문제", "addSub", ["두 수 더하기", "두 수 빼기", "문장제"]),
        unit("여러 가지 모양", "모양의 특징과 만들기", "geometry", ["모양 특징", "같은 모양 찾기", "규칙 만들기"]),
        unit("시계 보기와 규칙", "몇 시와 반, 반복 규칙", "measure", ["몇 시", "몇 시 30분", "시간 순서"]),
        unit("분류하기", "기준을 정해 모으기", "data", ["기준 찾기", "개수 세기", "표로 나타내기"]),
        unit("규칙 찾기", "수와 모양의 반복", "pattern", ["반복 묶음", "늘어나는 규칙", "다음 항 찾기"])
      ]
    ]),
    gradeBlueprint(3, [
      [
        unit("덧셈과 뺄셈", "세 자리 수 계산", "addSub", ["받아올림 덧셈", "받아내림 뺄셈", "문장제"]),
        unit("평면도형", "각과 도형의 구성 요소", "geometry", ["선분과 직선", "각", "삼각형과 사각형"]),
        unit("나눗셈", "똑같이 나누기와 포함제", "division", ["똑같이 나누기", "몇 묶음", "나눗셈식"]),
        unit("곱셈", "두 자리 수 곱셈의 기초", "multiply", ["몇십 곱하기", "두 자리 수와 한 자리 수", "문장제"]),
        unit("길이와 시간", "길이 단위와 걸린 시간", "measure", ["mm와 cm", "km와 m", "걸린 시간"]),
        unit("분수와 소수", "부분과 전체, 소수 첫걸음", "fraction", ["분수 읽기", "분수 크기", "소수 한 자리"])
      ],
      [
        unit("곱셈", "두 자리 수와 두 자리 수", "multiply", ["곱셈의 자리값", "부분 곱", "어림"]),
        unit("나눗셈", "나머지가 있는 나눗셈", "division", ["몫 구하기", "나머지", "검산"]),
        unit("원", "원의 중심, 반지름, 지름", "geometry", ["원의 구성 요소", "반지름과 지름", "원 그리기"]),
        unit("분수", "분수의 크기와 전체", "fraction", ["단위분수", "분수 비교", "전체 구하기"]),
        unit("들이와 무게", "L, mL, kg, g", "measure", ["들이 계산", "무게 계산", "단위 바꾸기"]),
        unit("자료의 정리", "표와 그림그래프", "data", ["표 읽기", "그림그래프", "차이와 합"])
      ]
    ]),
    gradeBlueprint(4, [
      [
        unit("큰 수", "만, 억 단위와 수의 크기", "number", ["자리값", "수의 크기 비교", "어림"]),
        unit("각도", "각의 크기와 어림", "measure", ["각도 읽기", "각도 계산", "삼각형의 각"]),
        unit("곱셈과 나눗셈", "큰 수의 곱셈과 나눗셈", "multiplyDivision", ["몇십·몇백 곱하기", "나눗셈 몫", "검산"]),
        unit("평면도형의 이동", "밀기, 뒤집기, 돌리기", "geometry", ["밀기", "뒤집기", "돌리기"]),
        unit("막대그래프", "자료를 막대로 나타내기", "data", ["막대그래프 읽기", "그래프 그리기", "자료 해석"]),
        unit("규칙 찾기", "계산식과 대응 규칙", "pattern", ["수 배열", "계산식 규칙", "생활 규칙"])
      ],
      [
        unit("분수의 덧셈과 뺄셈", "분모가 같은 분수 계산", "fraction", ["분수 더하기", "분수 빼기", "대분수"]),
        unit("삼각형", "삼각형의 이름과 성질", "geometry", ["변으로 분류", "각으로 분류", "성질 적용"]),
        unit("소수의 덧셈과 뺄셈", "자릿값 맞추어 계산", "decimal", ["소수 비교", "소수 덧셈", "소수 뺄셈"]),
        unit("사각형", "평행과 수직, 사각형 분류", "geometry", ["평행과 수직", "사각형 이름", "성질 비교"]),
        unit("꺾은선그래프", "변화를 선으로 나타내기", "data", ["그래프 읽기", "변화 비교", "자료 설명"]),
        unit("다각형", "다각형과 대각선", "geometry", ["다각형 이름", "둘레", "대각선"])
      ]
    ]),
    gradeBlueprint(5, [
      [
        unit("자연수의 혼합 계산", "계산 순서와 괄호", "mixedCalc", ["곱셈·나눗셈 먼저", "괄호", "문장제"]),
        unit("약수와 배수", "약수, 배수, 공약수와 공배수", "factorMultiple", ["약수", "배수", "최대공약수·최소공배수"]),
        unit("규칙과 대응", "두 양의 관계", "pattern", ["대응표", "식 만들기", "생활 속 대응"]),
        unit("약분과 통분", "분수의 크기 비교", "fraction", ["약분", "통분", "분수 비교"]),
        unit("분수의 덧셈과 뺄셈", "분모가 다른 분수 계산", "fraction", ["통분해서 더하기", "통분해서 빼기", "문장제"]),
        unit("다각형의 둘레와 넓이", "둘레, 넓이, 단위넓이", "area", ["둘레", "직사각형 넓이", "평행사변형과 삼각형"])
      ],
      [
        unit("수의 범위와 어림하기", "이상, 이하, 반올림", "number", ["수의 범위", "반올림", "올림과 버림"]),
        unit("분수의 곱셈", "분수와 자연수, 분수끼리 곱하기", "fraction", ["분수×자연수", "자연수×분수", "분수×분수"]),
        unit("합동과 대칭", "겹쳐지는 도형과 대칭", "geometry", ["합동", "선대칭", "점대칭"]),
        unit("소수의 곱셈", "소수점 위치와 어림", "decimal", ["소수×자연수", "소수×소수", "어림"]),
        unit("직육면체", "겨냥도와 전개도", "solid", ["구성 요소", "겨냥도", "전개도"]),
        unit("평균과 가능성", "대표값과 가능성 말", "data", ["평균", "가능성", "자료 해석"])
      ]
    ]),
    gradeBlueprint(6, [
      [
        unit("분수의 나눗셈", "분수 나눗셈의 뜻과 계산", "fractionDiv", ["분수÷자연수", "분수÷분수", "문장제"]),
        unit("각기둥과 각뿔", "입체도형의 구성 요소", "solid", ["밑면과 옆면", "전개도", "꼭짓점과 모서리"]),
        unit("소수의 나눗셈", "소수점 위치와 몫", "decimalDiv", ["소수÷자연수", "소수÷소수", "어림과 검산"]),
        unit("비와 비율", "두 양의 관계와 백분율", "ratio", ["비", "비율", "백분율"]),
        unit("여러 가지 그래프", "그래프 선택과 해석", "data", ["띠그래프", "원그래프", "그래프 비교"]),
        unit("직육면체의 부피와 겉넓이", "입체의 크기", "volume", ["부피", "겉넓이", "단위 바꾸기"])
      ],
      [
        unit("분수의 나눗셈", "역수와 나눗셈 활용", "fractionDiv", ["계산 원리", "비교 문장제", "검산"]),
        unit("소수의 나눗셈", "몫의 크기와 어림", "decimalDiv", ["자릿값", "몫 비교", "생활 문제"]),
        unit("공간과 입체", "쌓기나무와 위치", "solid", ["위에서 본 모양", "앞에서 본 모양", "쌓기나무 수"]),
        unit("비례식과 비례배분", "같은 비와 나누어 갖기", "ratio", ["비례식", "비례배분", "생활 문제"]),
        unit("원의 넓이", "원주율과 원의 넓이", "area", ["원주", "원의 넓이", "복합 도형"]),
        unit("원기둥, 원뿔, 구", "회전체의 특징", "solid", ["원기둥", "원뿔", "구"])
      ]
    ])
  ];

  markExistingGradeTwo();
  installGradeUnits();
  exposeAllGradeMetadata();

  function gradeBlueprint(grade, semesters) {
    return { grade, semesters };
  }

  function unit(title, description, domain, lessons) {
    return { title, description, domain, lessons };
  }

  function markExistingGradeTwo() {
    categoryOptions.forEach((option) => {
      if (/^[12]-\d+$/.test(option.value)) {
        const [semester, unitNumber] = option.value.split("-").map(Number);
        option.grade = 2;
        option.semester = semester;
        option.unitNumber = unitNumber;
      }
    });
  }

  function installGradeUnits() {
    const existing = new Set(categoryOptions.map((option) => option.value));
    UNIT_BLUEPRINTS.forEach((gradeSet) => {
      gradeSet.semesters.forEach((semesterUnits, semesterIndex) => {
        const semester = semesterIndex + 1;
        semesterUnits.forEach((blueprint, unitIndex) => {
          const unitNumber = unitIndex + 1;
          const key = `g${gradeSet.grade}-${semester}-${unitNumber}`;
          const fullUnit = {
            ...blueprint,
            key,
            grade: gradeSet.grade,
            semester,
            unitNumber,
            label: `${semester}학기 ${unitNumber}단원`,
            unitLabel: `${gradeSet.grade}학년 ${semester}학기 ${unitNumber}단원 · ${blueprint.title}`
          };

          if (!existing.has(key)) {
            categoryOptions.push({
              value: key,
              label: `${semester}학기 ${unitNumber}단원`,
              description: blueprint.title,
              grade: gradeSet.grade,
              semester,
              unitNumber
            });
            existing.add(key);
          }

          categoryNames[key] = `${fullUnit.unitLabel}`;
          if (!categoryKeys.includes(key)) {
            categoryKeys.push(key);
          }
          lessonOptionsByCategory[key] = fullUnit.lessons.map((lessonTitle, lessonIndex) => ({
            value: `${key}-lesson-${lessonIndex + 1}`,
            label: `${lessonIndex + 1}차시 ${lessonTitle}`,
            description: `${blueprint.title}에서 ${lessonTitle}을 새 문제로 연습`
          }));
          displayQuestionBank[key] = buildUnitBank(fullUnit);
        });
      });
    });
  }

  function buildUnitBank(unitInfo) {
    return {
      low: buildDifficultyBank(unitInfo, "low"),
      mid: buildDifficultyBank(unitInfo, "mid"),
      high: buildDifficultyBank(unitInfo, "high")
    };
  }

  function buildDifficultyBank(unitInfo, difficulty) {
    return Array.from({ length: QUESTION_COUNT_PER_DIFFICULTY }, (_, index) => (
      createOriginalQuestion(unitInfo, difficulty, index + 1)
    ));
  }

  function createOriginalQuestion(unitInfo, difficulty, index) {
    const domain = unitInfo.domain;
    const lesson = getLesson(unitInfo, index);
    if (domain === "addSub") return buildAddSubQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "multiply") return buildMultiplyQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "division") return buildDivisionQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "multiplyDivision") return index % 2 ? buildMultiplyQuestion(unitInfo, difficulty, index, lesson) : buildDivisionQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "fraction" || domain === "fractionDiv") return buildFractionQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "decimal" || domain === "decimalDiv") return buildDecimalQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "geometry" || domain === "solid") return buildGeometryQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "measure" || domain === "area" || domain === "volume") return buildMeasureQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "data") return buildDataQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "pattern") return buildPatternQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "ratio") return buildRatioQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "mixedCalc") return buildMixedCalcQuestion(unitInfo, difficulty, index, lesson);
    if (domain === "factorMultiple") return buildFactorMultipleQuestion(unitInfo, difficulty, index, lesson);
    return buildNumberQuestion(unitInfo, difficulty, index, lesson);
  }

  function getLesson(unitInfo, index) {
    const options = lessonOptionsByCategory[unitInfo.key] || [];
    return options[(index - 1) % Math.max(1, options.length)] || {
      value: `${unitInfo.key}-lesson-1`,
      label: "1차시 핵심",
      description: unitInfo.description
    };
  }

  function buildNumberQuestion(unitInfo, difficulty, index, lesson) {
    const level = diffLevel(difficulty);
    if (unitInfo.grade === 1) {
      const max = unitInfo.semester === 1 ? 50 : 100;
      const a = 10 + ((index * 7 + level * 3) % (max - 10));
      const tens = Math.floor(a / 10) * 10;
      const ones = a - tens;
      if (difficulty === "low") {
        const b = Math.min(max, a + 3 + (index % 4));
        return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${a}과 ${b} 중 더 큰 수는 무엇인가요?`, `${b}`, numericDistractors(b, "", [a - b, -1, 1, -10, 10]), conceptScene("place", {
          title: "큰 수를 찾기",
          values: [`${a}`, `${b}`],
          hint: "십의 자리부터 보고, 같으면 일의 자리를 봐요.",
          expression: `${a} < ?`,
          steps: [`${a}보다 ${b}가 오른쪽에 있는 수입니다.`, `따라서 더 큰 수는 ${b}입니다.`]
        }), `${a}와 ${b}를 수직선에서 생각하면 ${b}가 더 오른쪽에 있습니다.`, numberFeedback("십의 자리부터 비교해요.", "큰 수를 고를 때는 수를 하나씩 세기보다 자리값을 먼저 봅니다.", [`${a}와 ${b}의 십의 자리를 봅니다.`, "십의 자리가 크면 그 수가 더 큽니다."], "두 수를 비교할 때는 왼쪽 자리부터 차례로 확인하세요."));
      }
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${a}은 10개 묶음과 낱개로 어떻게 나타낼까요?`, `${tens}과 ${ones}`, [`${tens - 10}과 ${ones + 10}`, `${tens}과 ${ones + 1}`, `${tens + 10}과 ${Math.max(0, ones - 10)}`, `${ones}과 ${tens}`], conceptScene("place", {
        title: "10개 묶음으로 보기",
        values: [`10개 묶음 ${tens / 10}개`, `낱개 ${ones}개`],
        publicValues: ["10개씩 먼저 묶기", "남은 낱개 따로 보기"],
        hideValuesUntilReveal: true,
        hint: "10개가 모이면 10 한 묶음입니다.",
        expression: `${a} = ${tens} + ${ones}`,
        steps: [`${a}은 ${tens}과 ${ones}로 나눌 수 있습니다.`, `그래서 10개 묶음 ${tens / 10}개와 낱개 ${ones}개입니다.`]
      }), `${a}은 ${tens}과 ${ones}로 나누어 봅니다.`, numberFeedback("몇십 몇을 한국어식으로 나누어 봐요.", "10개 묶음과 낱개를 분명히 보면 수의 크기가 안정됩니다.", [`${a}을 ${tens}과 ${ones}로 나눕니다.`, `${tens}은 10개 묶음 ${tens / 10}개입니다.`], "‘몇십 몇’은 먼저 10개 묶음, 그다음 낱개로 말하게 하세요."));
    }

    const place = unitInfo.grade >= 4 ? 10000 : 1000;
    const value = place + ((index * 137 + level * 421) % (place * 8));
    const rounded = Math.round(value / 100) * 100;
    if (difficulty === "high") {
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${value}를 백의 자리까지 반올림하면 얼마인가요?`, `${rounded}`, numericDistractors(rounded, "", [-100, 100, -10, 10, 200]), conceptScene("place", {
        title: "어림하기",
        values: [`처음 수 ${value}`, `백의 자리까지`],
        hint: "십의 자리 숫자가 5 이상인지 먼저 봐요.",
        expression: `${value} → ?`,
        steps: [`${value}에서 십의 자리 숫자를 확인합니다.`, `백의 자리까지 반올림하면 ${rounded}입니다.`]
      }), "반올림은 남길 자리 바로 오른쪽 숫자를 보고 결정합니다.", numberFeedback("남길 자리 바로 오른쪽을 봐요.", "반올림에서 학생들이 모든 자리를 한꺼번에 보려다 헷갈릴 수 있습니다.", ["백의 자리까지 남깁니다.", "십의 자리 숫자가 5 이상이면 백의 자리를 1 올립니다."], "어림 문제는 ‘남길 자리’에 동그라미를 치고 판단하게 하세요."));
    }

    const digit = Math.floor(value / 100) % 10;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${value}에서 백의 자리 숫자는 무엇인가요?`, `${digit}`, numericDistractors(digit, "", [-2, -1, 1, 2, 3]), conceptScene("place", {
      title: "자리값 확인",
      values: [`수 ${value}`, "만/천/백/십/일 자리"],
      hint: "오른쪽에서 세 번째 자리가 백의 자리입니다.",
      expression: `${value}`,
      steps: [`${value}의 오른쪽에서 세 번째 자리를 봅니다.`, `백의 자리 숫자는 ${digit}입니다.`]
    }), "오른쪽에서 일, 십, 백 순서로 자리를 확인합니다.", numberFeedback("오른쪽에서 일·십·백 순서로 봐요.", "자리 이름과 자리 숫자를 구별해야 합니다.", ["오른쪽 첫째 자리는 일의 자리입니다.", "오른쪽 셋째 자리가 백의 자리입니다."], "자리값 문제는 자리판을 손가락으로 짚으며 읽게 하세요."));
  }

  function buildAddSubQuestion(unitInfo, difficulty, index, lesson) {
    const level = diffLevel(difficulty);
    const max = unitInfo.grade <= 1 ? 20 : unitInfo.grade === 3 ? 999 : 9999;
    const a = unitInfo.grade <= 1 ? 8 + (index % 9) : 120 + ((index * 37 + level * 43) % Math.min(700, max - 150));
    const b = unitInfo.grade <= 1 ? 2 + ((index + level) % 7) : 24 + ((index * 19 + level * 11) % 260);
    if (difficulty !== "high" && (index + level) % 2 === 0) {
      const answer = a + b;
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${a}+${b}의 값은 무엇인가요?`, `${answer}`, numericDistractors(answer), conceptScene("numberLine", {
        title: "더하기는 앞으로 가기",
        values: [`처음 수 ${a}`, `더할 수 ${b}`],
        hint: "큰 수부터 두고, 더할 수를 자리별로 나누어 더해요.",
        expression: `${a}+${b}`,
        steps: [`${b}를 자리별로 나누어 더합니다.`, `${a}+${b}=${answer}입니다.`]
      }), `${b}를 자리별로 나누어 ${a}에 더하면 ${answer}입니다.`, addSubFeedback("자리별로 나누어 더해요.", "받아올림이 있어도 일의 자리와 십의 자리를 분리하면 안정됩니다.", [`${b}를 자리별로 나누어 봅니다.`, `${a}에 차례대로 더합니다.`, `마지막에 ${answer}이 됩니다.`], "더하기는 수직선에서 앞으로 가는 느낌으로 설명하세요."));
    }

    const minuend = a + b + (difficulty === "high" ? 35 : 0);
    const subtrahend = b + (difficulty === "high" ? 18 : 0);
    const answer = minuend - subtrahend;
    const splitTens = Math.floor(minuend / 10) * 10 - 10;
    const splitOnes = minuend - splitTens;
    const subTens = Math.floor(subtrahend / 10) * 10;
    const subOnes = subtrahend - subTens;
    const highPrompt = `${unitInfo.grade >= 3 ? "민지가" : "지후가"} 색종이 ${minuend}장을 가지고 있었습니다.\n친구에게 ${subtrahend}장을 주었습니다.\n남은 색종이는 몇 장인가요?`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, difficulty === "high" ? highPrompt : `${minuend}-${subtrahend}의 값은 무엇인가요?`, `${answer}`, numericDistractors(answer), conceptScene("split", {
      title: "받아내림은 수를 편하게 바꾸기",
      values: [`${minuend}을 ${splitTens}과 ${splitOnes}으로`, `${subtrahend}을 ${subTens}과 ${subOnes}으로`],
      hint: "일의 자리에서 먼저 뺄 수 있는지 확인해요.",
      expression: `${minuend}-${subtrahend}`,
      steps: [`${minuend}을 ${splitTens}과 ${splitOnes}으로 바꿉니다.`, `${splitTens}에서 ${subTens}을 빼고, ${splitOnes}에서 ${subOnes}을 빼면 ${answer}입니다.`]
    }), `${minuend}을 ${splitTens}과 ${splitOnes}으로 바꾸어 한국식 자리값으로 설명합니다.`, addSubFeedback("빼기 어려우면 수를 편하게 바꾸어요.", "‘몇십 몇일’처럼 어색하게 말하지 않고, 66을 50과 16으로 바꾸듯 설명합니다.", [`${minuend}을 ${splitTens}과 ${splitOnes}으로 바꿉니다.`, `${splitTens}에서 ${subTens}을 뺍니다.`, `${splitOnes}에서 ${subOnes}을 빼서 합합니다.`], "받아내림은 ‘빌린다’보다 ‘수를 편하게 바꾼다’는 말로 먼저 안내하세요."));
  }

  function buildMultiplyQuestion(unitInfo, difficulty, index, lesson) {
    const level = diffLevel(difficulty);
    const groups = 3 + ((index + level) % 7);
    const each = 2 + ((index * 2 + level) % 8);
    const extra = difficulty === "high" ? 2 + (index % 6) : 0;
    const answer = groups * each + extra;
    const prompt = difficulty === "high"
      ? `한 모둠에 학생이 ${each}명씩 앉았습니다.\n그런 모둠이 ${groups}개 있고, 발표 도우미 ${extra}명이 더 왔습니다.\n교실에 있는 학생은 모두 몇 명인가요?`
      : `${each}명씩 ${groups}모둠이면 모두 몇 명인가요?`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, prompt, `${answer}명`, numericDistractors(answer, "명", [-each, each, -1, 1, extra || 2]), conceptScene("groups", {
      title: "같은 수씩 여러 묶음",
      values: [`${each}명씩`, `${groups}모둠`, extra ? `더 온 ${extra}명` : ""].filter(Boolean),
      groups,
      each,
      extra,
      unit: "명",
      hint: "같은 수씩 반복되면 곱셈으로 짧게 세어요.",
      expression: extra ? `${each}×${groups}+${extra}` : `${each}×${groups}`,
      steps: [`${each}명씩 ${groups}모둠은 ${each}×${groups}입니다.`, extra ? `여기에 ${extra}명을 더합니다.` : "더 온 사람은 없습니다.", `모두 ${answer}명입니다.`]
    }), "같은 수씩 여러 묶음이면 곱셈을 사용합니다.", multiplyFeedback("같은 수씩 묶이면 곱셈이에요.", "학생이 무작정 더하기만 하지 않도록 ‘한 묶음의 수’와 ‘묶음 수’를 구별합니다.", [`한 묶음은 ${each}명입니다.`, `묶음은 ${groups}개입니다.`, extra ? `남은 ${extra}명을 마지막에 더합니다.` : "곱셈식으로 한 번에 셉니다."], "묶음 그림에서는 한 줄에 몇 개인지와 줄이 몇 개인지를 말로 확인하세요."));
  }

  function buildDivisionQuestion(unitInfo, difficulty, index, lesson) {
    const divisor = 2 + (index % 8);
    const quotient = 3 + ((index * 3 + diffLevel(difficulty)) % 9);
    const remainder = difficulty === "high" ? (index % divisor) : 0;
    const total = divisor * quotient + remainder;
    const answer = remainder ? `${quotient}개씩, ${remainder}개 남음` : `${quotient}개`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `구슬 ${total}개를 ${divisor}명에게 똑같이 나누어 주면 한 명에게 몇 개씩 줄 수 있나요?`, answer, [`${quotient + 1}개`, `${Math.max(1, quotient - 1)}개`, `${divisor}개`, `${total - divisor}개`], conceptScene("groups", {
      title: "똑같이 나누기",
      values: [`전체 ${total}개`, `${divisor}명에게 나누기`],
      groups: divisor,
      each: quotient,
      extra: remainder,
      unit: "개",
      hint: "전체를 같은 크기 묶음으로 나눕니다.",
      expression: `${total}÷${divisor}`,
      steps: [`${divisor}명에게 똑같이 나누면 한 명에게 ${quotient}개씩입니다.`, remainder ? `${remainder}개는 남습니다.` : "남는 구슬은 없습니다."]
    }), "나눗셈은 전체를 같은 크기로 나누거나 몇 묶음인지 보는 계산입니다.", divideFeedback("같은 양으로 나누어요.", "나눗셈은 곱셈과 연결해 검산하면 오개념을 줄일 수 있습니다.", [`${divisor}명에게 같은 수씩 나눕니다.`, `${divisor}×${quotient}=${divisor * quotient}입니다.`, remainder ? `전체 ${total}개에서 ${remainder}개가 남습니다.` : "전체와 정확히 맞습니다."], "나눗셈 뒤에는 곱셈으로 다시 맞는지 확인하게 하세요."));
  }

  function buildFractionQuestion(unitInfo, difficulty, index, lesson) {
    const denom = [4, 5, 6, 8, 10, 12][index % 6];
    const left = 1 + (index % (denom - 2));
    const right = 1 + ((index + 2) % (denom - left - 1 || 1));
    if (unitInfo.domain === "fractionDiv") {
      const whole = 2 + (index % 5);
      const answer = `${whole}/${denom}`;
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${whole}을 ${denom}명이 똑같이 나누면 한 명의 몫은 얼마인가요?`, answer, [`${denom}/${whole}`, `${whole + 1}/${denom}`, `${whole}/${denom + 1}`, `${Math.max(1, whole - 1)}/${denom}`], fractionScene(`${whole}÷${denom}`, answer, "전체를 똑같이 나누면 분모는 나누는 수가 됩니다."), "분수 나눗셈은 전체를 같은 크기로 나눈 한 몫을 보는 상황에서 출발합니다.", fractionFeedback("나눈 한 몫을 분수로 봐요.", "분수 나눗셈은 공식을 먼저 외우기보다 전체를 똑같이 나누는 그림으로 시작합니다.", [`${whole}을 ${denom}등분합니다.`, `한 사람이 가지는 양은 ${answer}입니다.`], "분수 계산은 그림과 식을 꼭 연결하세요."));
    }

    const sum = Math.min(denom - 1, left + right);
    const answer = `${sum}/${denom}`;
    const prompt = difficulty === "low"
      ? `전체를 ${denom}칸으로 똑같이 나누고 ${left}칸을 색칠했습니다. 색칠한 부분은 전체의 얼마인가요?`
      : `${left}/${denom}+${right}/${denom}의 값은 무엇인가요?`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, prompt, difficulty === "low" ? `${left}/${denom}` : answer, [`${right}/${denom}`, `${left + right}/${denom + 1}`, `${Math.abs(left - right)}/${denom}`, `${denom}/${sum}`], fractionScene(difficulty === "low" ? `${left}/${denom}` : `${left}/${denom}+${right}/${denom}`, difficulty === "low" ? `${left}/${denom}` : answer, "분모가 같으면 같은 크기의 칸을 세는 것입니다."), "분모가 같은 분수는 같은 크기의 칸을 몇 칸 모았는지 봅니다.", fractionFeedback("같은 크기의 칸을 세어요.", "분모가 같은 분수의 계산에서 분모까지 더하는 오개념을 막아야 합니다.", ["분모는 한 전체를 몇 칸으로 나누었는지를 말합니다.", "분자가 색칠한 칸 수입니다.", "같은 크기 칸끼리는 분자만 더하거나 뺍니다."], "분수는 항상 전체가 무엇인지 먼저 묻게 하세요."));
  }

  function buildDecimalQuestion(unitInfo, difficulty, index, lesson) {
    const a = Number((1 + (index % 8) + (index % 10) / 10).toFixed(1));
    const b = Number((0.3 + ((index + diffLevel(difficulty)) % 6) / 10).toFixed(1));
    const answer = unitInfo.domain === "decimalDiv" ? Number((a / 2).toFixed(1)) : Number((a + b).toFixed(1));
    const prompt = unitInfo.domain === "decimalDiv"
      ? `${a}L 주스를 2명이 똑같이 나누면 한 명은 몇 L씩 마실 수 있나요?`
      : `${a}+${b}의 값은 무엇인가요?`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, prompt, `${answer}`, decimalDistractors(answer), conceptScene("place", {
      title: "소수점 맞추기",
      values: [`${a}`, unitInfo.domain === "decimalDiv" ? "2명에게 나누기" : `+ ${b}`],
      hint: "소수는 같은 자리끼리 맞추어 계산해요.",
      expression: unitInfo.domain === "decimalDiv" ? `${a}÷2` : `${a}+${b}`,
      steps: [`소수점의 위치를 먼저 확인합니다.`, `계산하면 ${answer}입니다.`]
    }), "소수 계산은 소수점을 기준으로 같은 자리끼리 맞춥니다.", numberFeedback("소수점이 기준이에요.", "소수 계산에서 자릿값 정렬이 흐트러지면 답의 크기가 크게 달라집니다.", ["소수점을 세로로 맞춥니다.", "같은 자리끼리 계산합니다.", "답에도 소수점을 내려 씁니다."], "계산 전 어림값을 먼저 말해 답의 크기를 확인하게 하세요."));
  }

  function buildGeometryQuestion(unitInfo, difficulty, index, lesson) {
    if (unitInfo.domain === "solid") {
      const faces = unitInfo.title.includes("각기둥") ? 5 + (index % 3) : 6;
      const answer = unitInfo.title.includes("직육면체") ? "6개" : `${faces}개`;
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${unitInfo.title}에서 면의 수를 확인하는 문제입니다. 알맞은 설명은 무엇인가요?`, unitInfo.title.includes("직육면체") ? "직육면체의 면은 6개입니다." : `입체도형의 면을 하나씩 세면 ${faces}개입니다.`, ["모서리만 세면 됩니다.", "꼭짓점 수와 면의 수는 항상 같습니다.", "보이지 않는 면은 세지 않습니다.", "밑면은 면이 아닙니다."], conceptScene("geometry", {
        title: "보이는 면과 보이지 않는 면",
        values: ["앞면", "윗면", "옆면", "뒤쪽 면도 세기"],
        hint: "입체도형은 보이지 않는 면도 전체의 일부입니다.",
        expression: answer,
        steps: ["보이는 면만 세지 않습니다.", `전체 면의 수를 세면 ${answer}입니다.`]
      }), "입체도형은 보이지 않는 면과 모서리도 함께 세어야 합니다.", geometryFeedback("보이지 않는 부분도 세어요.", "입체도형에서 보이는 그림만 세면 항상 부족합니다.", ["앞, 뒤, 왼쪽, 오른쪽, 위, 아래처럼 방향을 정해 셉니다.", "이미 센 면은 다시 세지 않습니다."], "입체도형은 실제 상자나 쌓기나무를 돌려 보며 설명하면 좋습니다."));
    }

    const sides = [3, 4, 5, 6][index % 4];
    const name = { 3: "삼각형", 4: "사각형", 5: "오각형", 6: "육각형" }[sides];
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `변이 ${sides}개인 도형의 이름은 무엇인가요?`, name, ["삼각형", "사각형", "오각형", "육각형"].filter((item) => item !== name), conceptScene("geometry", {
      title: "변을 따라 세기",
      values: [`변 ${sides}개`, `꼭짓점 ${sides}개`],
      hint: "도형 이름은 외우기 전에 변을 손가락으로 따라 세어요.",
      expression: `${sides}개 → ?`,
      steps: [`변을 하나씩 세면 ${sides}개입니다.`, `변이 ${sides}개인 도형은 ${name}입니다.`]
    }), "도형 이름보다 변과 꼭짓점을 직접 세는 것이 먼저입니다.", geometryFeedback("외우기 전에 직접 세어요.", "도형 이름 암기만 하면 크기나 방향이 바뀌었을 때 헷갈릴 수 있습니다.", ["테두리를 손가락으로 따라갑니다.", "곧은 변이 몇 개인지 셉니다.", "그 수에 맞는 이름을 고릅니다."], "도형은 크기와 방향을 바꾸어도 같은 특징을 유지한다는 점을 강조하세요."));
  }

  function buildMeasureQuestion(unitInfo, difficulty, index, lesson) {
    if (unitInfo.domain === "area") {
      const width = 4 + (index % 8);
      const height = 3 + ((index + 2) % 6);
      const answer = width * height;
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `가로 ${width}cm, 세로 ${height}cm인 직사각형의 넓이는 몇 cm²인가요?`, `${answer}cm²`, numericDistractors(answer, "cm²", [-width, width, -height, height]), conceptScene("array", {
        title: "넓이는 1cm²가 몇 개인지 세기",
        values: [`가로 ${width}cm`, `세로 ${height}cm`],
        hint: "가로 한 줄의 칸 수와 줄 수를 곱해요.",
        expression: `${width}×${height}`,
        steps: [`한 줄에 ${width}칸이 있습니다.`, `${height}줄이므로 ${width}×${height}=${answer}입니다.`]
      }), "넓이는 단위넓이가 몇 개 들어가는지 보는 것입니다.", measureFeedback("단위넓이를 배열로 봐요.", "넓이를 둘레와 혼동하지 않도록 칸을 채운다는 느낌을 분명히 합니다.", [`가로 방향으로 ${width}칸입니다.`, `세로 방향으로 ${height}줄입니다.`, `전체 칸 수는 ${answer}칸입니다.`], "둘레는 테두리, 넓이는 안쪽을 채우는 양이라고 구분하게 하세요."));
    }

    if (unitInfo.domain === "volume") {
      const w = 3 + (index % 5);
      const h = 2 + ((index + 1) % 4);
      const d = 2 + ((index + 3) % 4);
      const answer = w * h * d;
      return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `가로 ${w}cm, 세로 ${d}cm, 높이 ${h}cm인 직육면체의 부피는 몇 cm³인가요?`, `${answer}cm³`, numericDistractors(answer, "cm³", [-w * h, w * h, -d, d]), conceptScene("array", {
        title: "부피는 1cm³가 몇 개인지 보기",
        values: [`가로 ${w}`, `세로 ${d}`, `높이 ${h}`],
        hint: "바닥 한 층의 칸 수를 구하고 높이만큼 쌓아요.",
        expression: `${w}×${d}×${h}`,
        steps: [`바닥은 ${w}×${d}=${w * d}개입니다.`, `${h}층이므로 ${answer}cm³입니다.`]
      }), "부피는 단위부피를 층으로 쌓은 양입니다.", measureFeedback("한 층을 구한 뒤 쌓아요.", "부피 공식은 바닥 한 층의 칸 수에서 출발해야 이해가 됩니다.", ["바닥 한 층의 넓이를 먼저 구합니다.", "그 층이 몇 층 있는지 곱합니다."], "부피는 공식보다 쌓기나무 한 층 그림으로 시작하세요."));
    }

    const startHour = 8 + (index % 4);
    const startMinute = [0, 10, 20, 30][index % 4];
    const elapsed = 15 + (index % 4) * 10 + diffLevel(difficulty) * 5;
    const endMinuteTotal = startHour * 60 + startMinute + elapsed;
    const endText = `${Math.floor(endMinuteTotal / 60)}시 ${endMinuteTotal % 60}분`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${startHour}시 ${startMinute}분부터 ${elapsed}분 뒤의 시각은 언제인가요?`, endText, [`${startHour}시 ${startMinute + elapsed}분`, `${startHour + 1}시 ${Math.max(0, startMinute + elapsed - 60)}분`, `${startHour}시 ${startMinute}분`, `${startHour + 2}시 ${endMinuteTotal % 60}분`], conceptScene("numberLine", {
      title: "시간은 60분마다 1시간",
      values: [`시작 ${startHour}시 ${startMinute}분`, `${elapsed}분 뒤`],
      hint: "60분이 되면 1시간으로 바꾸어요.",
      expression: `${startMinute}+${elapsed}`,
      steps: [`분을 더합니다.`, `60분이 넘으면 1시간을 올려 ${endText}입니다.`]
    }), "시간 계산은 60분이 1시간이라는 단위를 기준으로 봅니다.", measureFeedback("60분을 1시간으로 바꾸어요.", "시간 단원에서 100분처럼 계산하는 오개념을 막아야 합니다.", ["분끼리 먼저 더합니다.", "60분이 되면 1시간으로 바꿉니다."], "시각 문제는 수직선처럼 흘러가는 방향을 표시해 주세요."));
  }

  function buildDataQuestion(unitInfo, difficulty, index, lesson) {
    const labels = ["축구", "피구", "달리기", "줄넘기"];
    const values = labels.map((_, itemIndex) => 3 + ((index * (itemIndex + 2) + itemIndex * 3) % 8));
    const maxIndex = values.indexOf(Math.max(...values));
    const minIndex = values.indexOf(Math.min(...values));
    const answer = difficulty === "high" ? `${values[maxIndex] - values[minIndex]}명` : labels[maxIndex];
    const prompt = difficulty === "high"
      ? `표에서 가장 많은 항목과 가장 적은 항목의 차이는 몇 명인가요?`
      : `표에서 가장 많은 학생이 고른 항목은 무엇인가요?`;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, prompt, answer, difficulty === "high" ? numericDistractors(values[maxIndex] - values[minIndex], "명") : labels.filter((item) => item !== labels[maxIndex]), conceptScene("table", {
      title: "표는 같은 줄을 따라 읽기",
      table: labels.map((label, itemIndex) => ({ label, value: values[itemIndex], unit: "명" })),
      hint: "항목 이름에서 옆의 수까지 같은 줄로 따라가요.",
      expression: difficulty === "high" ? "가장 많은 수 - 가장 적은 수" : "가장 큰 수 찾기",
      steps: [`가장 많은 항목은 ${labels[maxIndex]} ${values[maxIndex]}명입니다.`, `가장 적은 항목은 ${labels[minIndex]} ${values[minIndex]}명입니다.`]
    }), "표와 그래프는 항목 이름과 수를 같은 줄에서 연결해 읽어야 합니다.", dataFeedback("이름과 수를 같은 줄로 따라가요.", "학생들이 표의 줄을 건너 읽으면 엉뚱한 항목을 답할 수 있습니다.", ["항목 이름을 먼저 찾습니다.", "손가락으로 같은 줄을 따라 수를 읽습니다.", "비교가 필요하면 가장 큰 수와 작은 수를 표시합니다."], "표 읽기는 형광펜으로 같은 줄을 연결하듯 안내하세요."));
  }

  function buildPatternQuestion(unitInfo, difficulty, index, lesson) {
    const start = 2 + (index % 8);
    const step = 2 + ((index + diffLevel(difficulty)) % 6);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const answer = sequence[3];
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${sequence[0]}, ${sequence[1]}, ${sequence[2]}, □의 규칙에서 □는 무엇인가요?`, `${answer}`, numericDistractors(answer, "", [-step, step, -1, 1, step * 2]), conceptScene("pattern", {
      title: "이웃한 수 사이의 변화",
      values: sequence.slice(0, 3).map(String),
      hint: "앞 수에서 다음 수로 갈 때 얼마나 변하는지 봐요.",
      expression: `+${step}`,
      steps: [`${sequence[0]}에서 ${sequence[1]}로 ${step} 커집니다.`, `같은 규칙으로 다음 수는 ${answer}입니다.`]
    }), "규칙은 처음 두 수만 보지 말고 여러 쌍에서 같은지 확인합니다.", patternFeedback("같은 변화가 반복되는지 확인해요.", "한 번만 보고 규칙을 정하면 우연히 맞아 보일 수 있습니다.", ["첫 번째 변화량을 찾습니다.", "두 번째 변화량도 같은지 확인합니다.", "같으면 다음에 같은 변화를 적용합니다."], "규칙은 화살표 위에 +, -, ×를 직접 써 보게 하세요."));
  }

  function buildRatioQuestion(unitInfo, difficulty, index, lesson) {
    const total = 20 + (index % 8) * 5;
    const part = 5 + (index % 4) * 5;
    const percent = Math.round((part / total) * 100);
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `전체 ${total}명 중 ${part}명이 안경을 썼습니다. 안경을 쓴 학생의 비율은 몇 %인가요?`, `${percent}%`, numericDistractors(percent, "%", [-10, 10, -5, 5]), conceptScene("ratio", {
      title: "비율은 전체 중에서 차지하는 정도",
      values: [`전체 ${total}명`, `부분 ${part}명`],
      hint: "부분을 전체로 나눈 뒤 100을 곱해요.",
      expression: `${part}÷${total}×100`,
      steps: [`${part}÷${total}=${part / total}입니다.`, `백분율로 나타내면 ${percent}%입니다.`]
    }), "비율은 부분과 전체를 헷갈리지 않는 것이 핵심입니다.", ratioFeedback("부분과 전체를 먼저 정해요.", "비율 문제에서 학생들은 부분과 전체의 위치를 자주 바꿉니다.", ["전체가 무엇인지 먼저 밑줄 칩니다.", "부분이 무엇인지 동그라미 칩니다.", "부분÷전체로 비율을 구합니다."], "비율은 ‘누가 전체인가?’를 말하게 하고 식을 쓰게 하세요."));
  }

  function buildMixedCalcQuestion(unitInfo, difficulty, index, lesson) {
    const a = 20 + (index % 30);
    const b = 2 + (index % 7);
    const c = 3 + ((index + 3) % 6);
    const answer = a + b * c;
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${a}+${b}×${c}의 값은 무엇인가요?`, `${answer}`, numericDistractors(answer, "", [-b, b, -c, c, b * c - (a + b)]), conceptScene("steps", {
      title: "계산 순서",
      values: [`먼저 ${b}×${c}`, `그다음 ${a}+...`],
      hint: "곱셈과 나눗셈을 덧셈과 뺄셈보다 먼저 해요.",
      expression: `${a}+${b}×${c}`,
      steps: [`${b}×${c}=${b * c}을 먼저 계산합니다.`, `${a}+${b * c}=${answer}입니다.`]
    }), "혼합 계산은 왼쪽부터만 하는 것이 아니라 약속된 순서가 있습니다.", numberFeedback("곱셈을 먼저 해요.", "혼합 계산에서 왼쪽부터 무조건 계산하는 오개념을 막아야 합니다.", ["괄호가 있으면 괄호부터 봅니다.", "곱셈과 나눗셈을 먼저 합니다.", "마지막에 덧셈과 뺄셈을 합니다."], "계산 순서 문제는 먼저 할 부분에 형광펜 표시를 하게 하세요."));
  }

  function buildFactorMultipleQuestion(unitInfo, difficulty, index, lesson) {
    const a = 6 + (index % 7) * 2;
    const b = 9 + (index % 5) * 3;
    const answer = lcm(a, b);
    return makeOriginalQuestion(unitInfo, difficulty, index, lesson, `${a}와 ${b}의 공배수 중 가장 작은 수는 무엇인가요?`, `${answer}`, numericDistractors(answer, "", [-a, a, -b, b]), conceptScene("steps", {
      title: "공배수는 두 수의 배수에 모두 들어가는 수",
      values: [`${a}의 배수`, `${b}의 배수`],
      hint: "두 배수 목록에 함께 나오는 첫 수를 찾습니다.",
      expression: `LCM(${a}, ${b})`,
      steps: [`${a}의 배수와 ${b}의 배수를 나란히 적습니다.`, `가장 먼저 함께 나오는 수는 ${answer}입니다.`]
    }), "최소공배수는 두 수의 배수 목록에서 처음 만나는 수입니다.", numberFeedback("두 배수 목록이 만나는 첫 수를 찾아요.", "공약수와 공배수의 방향을 헷갈리지 않도록 약수는 아래로, 배수는 위로 커진다고 설명합니다.", ["각 수의 배수를 차례로 적습니다.", "두 목록에 모두 있는 수를 찾습니다.", "그중 가장 작은 수를 고릅니다."], "약수·배수는 표를 두 줄로 써서 겹치는 수를 표시하게 하세요."));
  }

  function makeOriginalQuestion(unitInfo, difficulty, index, lesson, prompt, answerText, distractors, scene, explanation, feedback) {
    const choices = makeChoiceSet(String(answerText), distractors, index + unitInfo.grade * 100 + unitInfo.semester * 10 + diffLevel(difficulty));
    const lessonKey = lesson.value;
    return {
      id: `${unitInfo.key}-${difficulty}-${String(index).padStart(2, "0")}`,
      category: unitInfo.key,
      unitId: unitInfo.key,
      unitLabel: unitInfo.unitLabel,
      categoryName: unitInfo.unitLabel,
      grade: unitInfo.grade,
      semester: unitInfo.semester,
      difficulty,
      difficultyRank: DIFFICULTY_META[difficulty]?.rank || "기본",
      difficultyFocus: DIFFICULTY_META[difficulty]?.focus || DIFFICULTY_META.mid.focus,
      lessonKey,
      variantKey: `${lessonKey}:${unitInfo.domain}:${index % 9}`,
      prompt,
      scene,
      sceneLines: scene.lines || [],
      options: choices.options,
      answer: choices.answer,
      explanation,
      feedback
    };
  }

  function conceptScene(kind, payload) {
    const lines = [
      payload.title,
      ...(payload.values || []).filter(Boolean),
      payload.hint
    ].filter(Boolean);
    return {
      type: "concept",
      kind,
      lines,
      ...payload
    };
  }

  function fractionScene(expression, answer, hint) {
    return conceptScene("fraction", {
      title: "같은 크기로 나눈 칸 보기",
      values: [expression],
      publicValues: ["전체를 같은 크기로 나누기", "색칠한 칸 또는 모은 칸 세기"],
      hideValuesUntilReveal: true,
      hint,
      expression,
      steps: [`그림에서 같은 크기의 칸을 셉니다.`, `답은 ${answer}입니다.`],
      answerSummary: answer
    });
  }

  function makeChoiceSet(answerText, distractors, seed) {
    const seen = new Set();
    const values = [];
    [answerText, ...distractors.map(String)].forEach((item) => {
      const text = String(item).trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      values.push(text);
    });

    while (values.length < 5) {
      const text = `${answerText}${values.length}`;
      if (!seen.has(text)) {
        seen.add(text);
        values.push(text);
      }
    }

    const selected = values.slice(0, 5).map((text) => ({ text, correct: text === answerText }));
    const rotated = seededShuffle(selected, seed);
    return {
      options: rotated.map((item) => item.text),
      answer: rotated.findIndex((item) => item.correct)
    };
  }

  function numericDistractors(answer, suffix = "", deltas = [-2, -1, 1, 2, 10, -10]) {
    return deltas
      .map((delta) => Number(answer) + delta)
      .filter((value) => Number.isFinite(value) && value >= 0)
      .map((value) => `${value}${suffix}`);
  }

  function decimalDistractors(answer) {
    return [-0.2, -0.1, 0.1, 0.2, 1]
      .map((delta) => Number((Number(answer) + delta).toFixed(1)))
      .filter((value) => value >= 0)
      .map(String);
  }

  function seededShuffle(list, seed) {
    const copy = list.slice();
    let value = Math.max(1, seed);
    for (let index = copy.length - 1; index > 0; index -= 1) {
      value = (value * 9301 + 49297) % 233280;
      const swapIndex = value % (index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function diffLevel(difficulty) {
    return { low: 0, mid: 1, high: 2 }[difficulty] || 1;
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
  }

  function numberFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "자리값으로 다시 보기");
  }

  function addSubFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "수를 편하게 바꾸기");
  }

  function multiplyFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "묶음과 낱개 구분");
  }

  function divideFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "똑같이 나누기");
  }

  function fractionFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "전체와 부분 확인");
  }

  function geometryFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "직접 세고 돌려 보기");
  }

  function measureFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "단위 먼저 확인");
  }

  function dataFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "같은 줄 따라 읽기");
  }

  function patternFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "변화량 표시");
  }

  function ratioFeedback(title, diagnosis, steps, nextAction) {
    return makeFeedback(title, diagnosis, steps, nextAction, "부분과 전체 구분");
  }

  function makeFeedback(title, diagnosis, steps, nextAction, visualTitle) {
    return { title, diagnosis, steps, nextAction, visualTitle };
  }

  function exposeAllGradeMetadata() {
    window.GRADE_OPTIONS = GRADE_OPTIONS;
    window.CATEGORY_OPTIONS = categoryOptions;
    window.LESSON_OPTIONS_BY_CATEGORY = lessonOptionsByCategory;
    window.DISPLAY_QUESTION_BANK = displayQuestionBank;
    window.CATEGORY_KEYS = categoryKeys;
    window.CATEGORY_NAMES = categoryNames;

    window.Math2GameBank = {
      ...bank,
      GRADE_OPTIONS,
      CATEGORY_OPTIONS: categoryOptions,
      LESSON_OPTIONS_BY_CATEGORY: lessonOptionsByCategory,
      DISPLAY_QUESTION_BANK: displayQuestionBank,
      CATEGORY_NAMES: categoryNames
    };
  }
})();
