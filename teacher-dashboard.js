const LEARNING_RECORDS_STORAGE_KEY = "bojogae.math2.allUnits.learningRecords.v2";

const teacherDashboardMessage = document.getElementById("teacherDashboardMessage");
const teacherStats = document.getElementById("teacherStats");
const teacherStudentSummary = document.getElementById("teacherStudentSummary");
const teacherRecordTable = document.getElementById("teacherRecordTable");
const teacherClearDataButton = document.getElementById("teacherClearDataButton");
const teacherExportDataButton = document.getElementById("teacherExportDataButton");
const teacherRefreshButton = document.getElementById("teacherRefreshButton");
const teacherGenerateReportButton = document.getElementById("teacherGenerateReportButton");
const recordCommentModal = document.getElementById("recordCommentModal");
const recordStandardList = document.getElementById("recordStandardList");
const recordCommentList = document.getElementById("recordCommentList");
const recordCommentToneControls = document.getElementById("recordCommentToneControls");
const recordCommentToneDescription = document.getElementById("recordCommentToneDescription");
const copyRecordCommentsButton = document.getElementById("copyRecordCommentsButton");
const closeRecordCommentsButton = document.getElementById("closeRecordCommentsButton");
const storageBridgeFrame = document.getElementById("storageBridgeFrame");
const storageBridgeRequests = new Map();
let storageBridgeRequestId = 0;
let latestRecordCommentText = "";
let latestRecordCommentRecords = [];
let selectedRecordCommentTone = "praise";

const RECORD_COMMENT_TONES = {
  praise: {
    label: "칭찬버전",
    description: "학생별 누적 평가 결과를 성취기준과 연결해 장점 중심 서술형 문장으로 정리합니다."
  },
  analytical: {
    label: "냉철",
    description: "성취가 높은 학생은 강점을 인정하고, 오답이 많은 학생은 현재 부족 지점과 발전 방향을 분명하게 정리합니다."
  }
};

const CURRICULUM_STANDARDS = [
  {
    code: "2수01-01",
    shortLabel: "수 이해",
    commentLabel: "세 자리 수와 네 자리 수의 자릿값 이해",
    text: "세 자리 수와 네 자리 수의 자릿값을 이해하고 수의 크기를 비교할 수 있다."
  },
  {
    code: "2수01-06",
    shortLabel: "덧셈·뺄셈",
    commentLabel: "덧셈과 뺄셈의 계산 원리와 문장제 해결",
    text: "덧셈과 뺄셈의 계산 원리를 이해하고 실생활 문제를 해결할 수 있다."
  },
  {
    code: "2수01-10",
    shortLabel: "곱셈",
    commentLabel: "묶어 세기와 곱셈구구 활용",
    text: "몇씩 몇 묶음 상황을 곱셈식으로 나타내고 곱셈구구를 활용할 수 있다."
  },
  {
    code: "2수02-03",
    shortLabel: "도형",
    commentLabel: "평면도형의 특징 찾기",
    text: "여러 가지 평면도형의 모양과 구성 요소를 관찰하고 분류할 수 있다."
  },
  {
    code: "2수03-01",
    shortLabel: "측정",
    commentLabel: "길이, 시각, 시간의 양감과 계산",
    text: "길이, 시각, 시간을 읽고 비교하며 실생활 상황에서 활용할 수 있다."
  },
  {
    code: "2수04-01",
    shortLabel: "자료와 규칙",
    commentLabel: "분류, 표와 그래프, 규칙 찾기",
    text: "자료를 기준에 따라 분류하고 표나 그래프로 나타내며 반복·증감 규칙을 찾을 수 있다."
  }
];

initTeacherDashboard();

function initTeacherDashboard() {
  window.addEventListener("message", handleStorageBridgeResponse);
  teacherClearDataButton.addEventListener("click", clearTeacherLearningRecords);
  teacherExportDataButton.addEventListener("click", exportTeacherLearningRecords);
  teacherRefreshButton.addEventListener("click", () => renderTeacherDashboard("누적 데이터를 다시 불러왔습니다."));
  teacherGenerateReportButton?.addEventListener("click", openRecordCommentModal);
  recordCommentToneControls?.addEventListener("click", changeRecordCommentTone);
  copyRecordCommentsButton?.addEventListener("click", copyAllRecordComments);
  closeRecordCommentsButton?.addEventListener("click", closeRecordCommentModal);
  recordCommentModal?.addEventListener("click", (event) => {
    if (event.target === recordCommentModal) {
      closeRecordCommentModal();
    }
  });
  recordCommentList?.addEventListener("click", copySingleRecordComment);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && recordCommentModal && !recordCommentModal.hidden) {
      closeRecordCommentModal();
    }
  });
  storageBridgeFrame?.addEventListener("load", () => renderTeacherDashboard());
  renderTeacherDashboard();
}

async function renderTeacherDashboard(message = "") {
  const records = await loadLearningRecords();
  teacherDashboardMessage.textContent = message || "학생이 게임 종료 후 반과 번호를 입력하면 이 화면에 누적됩니다.";
  teacherStats.innerHTML = renderTeacherStats(records);
  teacherStudentSummary.innerHTML = renderStudentCumulativeSummary(records);
  teacherRecordTable.innerHTML = renderTeacherRecordTable(records);
}

function renderTeacherStats(records) {
  const studentCount = new Set(records.map((record) => record.studentKey)).size;
  const totalScore = records.reduce((sum, record) => sum + record.score, 0);
  const totalQuestions = records.reduce((sum, record) => sum + record.questionCount, 0);
  const totalCorrect = records.reduce((sum, record) => sum + record.correct, 0);
  const totalWrongSelections = records.reduce((sum, record) => sum + record.wrongSelections, 0);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const avgSeconds = totalQuestions
    ? formatSeconds(records.reduce((sum, record) => sum + (record.avgQuestionTimeMs * record.questionCount), 0) / totalQuestions)
    : "0초";

  return [
    teacherStatCard("저장 기록", `${records.length}건`, `${studentCount}명 누적`),
    teacherStatCard("총점", `${totalScore}점`, `전체 정답 ${totalCorrect}개`),
    teacherStatCard("평균 정확도", `${accuracy}%`, `오답 선택 ${totalWrongSelections}회`),
    teacherStatCard("평균 풀이시간", avgSeconds, `기록 문항 ${totalQuestions}개`)
  ].join("");
}

function teacherStatCard(label, value, detail) {
  return `
    <article class="teacher-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function renderStudentCumulativeSummary(records) {
  if (records.length === 0) {
    return `<div class="teacher-empty">아직 저장된 평가 결과가 없습니다.</div>`;
  }

  const summaries = Array.from(groupRecordsByStudent(records).values())
    .sort((a, b) => Number(a.classNumber) - Number(b.classNumber) || Number(a.studentNumber) - Number(b.studentNumber));

  const rows = summaries.map((summary) => `
    <tr>
      <td>${escapeHtml(summary.studentKey)}</td>
      <td>${summary.sessions}회</td>
      <td>${summary.totalScore}점</td>
      <td>${summary.correct}개</td>
      <td>${summary.accuracyPercent}%</td>
      <td>${formatSeconds(summary.avgQuestionTimeMs)}</td>
      <td>${escapeHtml(summary.weakText)}</td>
      <td>${escapeHtml(formatDateTime(summary.lastSavedAt))}</td>
    </tr>
  `).join("");

  return `
    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>학생</th>
            <th>횟수</th>
            <th>누적 점수</th>
            <th>정답</th>
            <th>정확도</th>
            <th>평균 시간</th>
            <th>더 볼 유형</th>
            <th>최근 저장</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTeacherRecordTable(records) {
  if (records.length === 0) {
    return `<div class="teacher-empty">학생이 반과 번호를 입력해 저장하면 이곳에 기록이 쌓입니다.</div>`;
  }

  const rows = [...records]
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, 100)
    .map((record) => {
      const needText = getRecordNeedText(record);
      return `
        <tr>
          <td>${escapeHtml(formatDateTime(record.savedAt))}</td>
          <td>${escapeHtml(record.studentKey)}</td>
          <td>${escapeHtml(record.categoryName)}</td>
          <td>${escapeHtml(record.difficultyName)}</td>
          <td>${record.score}점</td>
          <td>${record.correct}/${record.questionCount}</td>
          <td>${record.wrongSelections}회</td>
          <td>${formatSeconds(record.avgQuestionTimeMs)}</td>
          <td>${record.feedbackConfirmed}회</td>
          <td class="teacher-need-cell">${escapeHtml(needText)}</td>
        </tr>
      `;
    }).join("");

  return `
    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>저장 시각</th>
            <th>학생</th>
            <th>유형</th>
            <th>난이도</th>
            <th>점수</th>
            <th>정답</th>
            <th>오답 선택</th>
            <th>평균 시간</th>
            <th>설명 확인</th>
            <th>더 볼 유형</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function groupRecordsByStudent(records) {
  return records.reduce((summaryMap, record) => {
    const key = record.studentKey;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        studentKey: key,
        classNumber: record.classNumber,
        studentNumber: record.studentNumber,
        sessions: 0,
        totalScore: 0,
        correct: 0,
        questionCount: 0,
        totalQuestionTimeMs: 0,
        weakCounts: {},
        lastSavedAt: record.savedAt
      });
    }

    const summary = summaryMap.get(key);
    summary.sessions += 1;
    summary.totalScore += record.score;
    summary.correct += record.correct;
    summary.questionCount += record.questionCount;
    summary.totalQuestionTimeMs += record.avgQuestionTimeMs * record.questionCount;
    summary.lastSavedAt = new Date(record.savedAt) > new Date(summary.lastSavedAt)
      ? record.savedAt
      : summary.lastSavedAt;
    (record.weakCategories || []).forEach((category) => {
      summary.weakCounts[category] = (summary.weakCounts[category] || 0) + 1;
    });
    getRecordNeedTags(record).forEach((tag) => {
      summary.weakCounts[tag] = (summary.weakCounts[tag] || 0) + 1;
    });
    summary.accuracyPercent = summary.questionCount ? Math.round((summary.correct / summary.questionCount) * 100) : 0;
    summary.avgQuestionTimeMs = summary.questionCount ? Math.round(summary.totalQuestionTimeMs / summary.questionCount) : 0;
    summary.weakText = Object.entries(summary.weakCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category]) => category)
      .join(", ") || "양호";
    return summaryMap;
  }, new Map());
}

function getRecordNeedText(record) {
  const tags = getRecordNeedTags(record);
  if (tags.length > 0) {
    return tags.join(" · ");
  }

  if ((record.accuracyPercent ?? 100) >= 90 && (record.avgQuestionTimeMs ?? 0) <= 9000) {
    return "현재 유형 안정적, 심화 문제 가능";
  }

  return record.weakCategories?.join(" · ") || "추가 관찰 필요";
}

function getRecordNeedTags(record) {
  const counts = new Map();
  const questions = Array.isArray(record.questionRecords) ? record.questionRecords : [];

  questions.forEach((questionRecord) => {
    const tags = analyzeQuestionRecordNeed(questionRecord);
    const weight = questionRecord.finalCorrect ? 1 : 2;
    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + weight);
    });
  });

  if ((record.avgQuestionTimeMs ?? 0) >= 12000) {
    counts.set("풀이시간: 계산 자동화 연습", (counts.get("풀이시간: 계산 자동화 연습") || 0) + 1);
  }

  if ((record.feedbackConfirmed ?? 0) > 0 || (record.finalWrong ?? 0) > 0) {
    counts.set("피드백 후 같은 유형 재풀이", (counts.get("피드백 후 같은 유형 재풀이") || 0) + 2);
  }

  if (counts.size === 0 && Array.isArray(record.weakCategories)) {
    record.weakCategories.forEach((category) => counts.set(category, 1));
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko-KR"))
    .slice(0, 3)
    .map(([tag]) => tag);
}

function analyzeQuestionRecordNeed(questionRecord) {
  const tags = [];
  const prompt = questionRecord.prompt || "";
  const categoryName = questionRecord.categoryName || "";
  const expression = prompt.replace(/\s+/g, "");

  if (questionRecord.finalCorrect && questionRecord.attemptCount <= 1 && questionRecord.elapsedMs < 10000) {
    return tags;
  }

  if (prompt.includes("□")) {
    tags.push("□ 식: 반대연산으로 모르는 수 찾기");
  }

  if (categoryName.includes("관계") || prompt.includes("같은 뜻")) {
    tags.push("식의 관계: 전체와 부분 연결");
  }

  if (categoryName.includes("세 수") || expression.match(/\d+[+\-]\d+[+\-]\d+/)) {
    tags.push("세 수 계산: 앞 결과 이어 계산");
  }

  const addMatch = expression.match(/(\d+)\+(\d+)/);
  if (addMatch) {
    const left = Number(addMatch[1]);
    const right = Number(addMatch[2]);
    if ((left % 10) + (right % 10) >= 10) {
      tags.push("덧셈: 일의 자리 받아올림");
    }
    if (left + right >= 100) {
      tags.push("덧셈: 100을 넘는 받아올림");
    }
  }

  const subMatch = expression.match(/(\d+)-(\d+)/);
  if (subMatch) {
    const left = Number(subMatch[1]);
    const right = Number(subMatch[2]);
    if ((left % 10) < (right % 10)) {
      tags.push("뺄셈: 십을 빌리는 받아내림");
    }
    if (Math.floor(left / 10) === Math.floor(right / 10)) {
      tags.push("뺄셈: 남는 십의 자리 확인");
    }
  }

  if (prompt.includes("바르게 계산한") || prompt.includes("잘못 계산") || prompt.includes("가장 큰 식")) {
    tags.push("선택지 검토: 보기 전 직접 계산");
  }

  if (isWordProblemPrompt(prompt)) {
    tags.push("문장제: 조건을 식으로 바꾸기");
  }

  if ((questionRecord.attemptCount ?? 0) > 1 && questionRecord.finalCorrect) {
    tags.push("재도전 문항: 첫 선택 전 자리값 확인");
  }

  if ((questionRecord.elapsedMs ?? 0) >= 12000) {
    tags.push("풀이시간: 계산 자동화 연습");
  }

  if (!questionRecord.finalCorrect) {
    tags.push("오답 지속: 설명 확인 후 재풀이");
  }

  return [...new Set(tags)];
}

function isWordProblemPrompt(prompt) {
  return /[가-힣]{2,}/.test(prompt)
    && !prompt.includes("□")
    && !prompt.includes("같은 뜻")
    && !prompt.includes("바르게 계산")
    && !prompt.includes("잘못 계산")
    && prompt.replace(/\s+/g, "").length > 18;
}

async function openRecordCommentModal() {
  latestRecordCommentRecords = await loadLearningRecords();
  recordStandardList.innerHTML = renderCurriculumStandards();
  renderRecordCommentToneControls();
  renderRecordCommentsForTone();
  recordCommentModal.hidden = false;
}

function closeRecordCommentModal() {
  recordCommentModal.hidden = true;
}

function changeRecordCommentTone(event) {
  const button = event.target.closest("[data-comment-tone]");
  if (!button) {
    return;
  }

  selectedRecordCommentTone = button.dataset.commentTone;
  renderRecordCommentToneControls();
  renderRecordCommentsForTone();
}

function renderRecordCommentToneControls() {
  recordCommentToneControls?.querySelectorAll("[data-comment-tone]").forEach((button) => {
    const isActive = button.dataset.commentTone === selectedRecordCommentTone;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (recordCommentToneDescription) {
    recordCommentToneDescription.textContent = RECORD_COMMENT_TONES[selectedRecordCommentTone]?.description
      || RECORD_COMMENT_TONES.praise.description;
  }
}

function renderRecordCommentsForTone() {
  const reports = buildStudentRecordReports(latestRecordCommentRecords, selectedRecordCommentTone);

  latestRecordCommentText = reports
    .map((report) => `${report.studentKey}\n${report.comment}`)
    .join("\n\n");

  recordCommentList.innerHTML = renderRecordCommentList(reports);
  copyRecordCommentsButton.disabled = reports.length === 0;
}

function renderCurriculumStandards() {
  return CURRICULUM_STANDARDS.map((standard) => `
    <article class="record-standard-chip">
      <span>${escapeHtml(standard.code)} · ${escapeHtml(standard.shortLabel)}</span>
      <p>${escapeHtml(standard.text)}</p>
    </article>
  `).join("");
}

function renderRecordCommentList(reports) {
  if (reports.length === 0) {
    return `<div class="teacher-empty">아직 생성할 평가 데이터가 없습니다. 학생이 평가 후 반과 번호를 저장하면 문장을 만들 수 있습니다.</div>`;
  }

  return reports.map((report, index) => `
    <article class="record-comment-card" data-comment-card>
      <div class="record-comment-card-head">
        <div>
          <strong>${escapeHtml(report.studentKey)}</strong>
          <span>${escapeHtml(report.levelLabel)} · ${escapeHtml(report.evidenceText)}</span>
        </div>
        <button class="secondary-button record-copy-button" type="button" data-copy-comment="${index}">이 학생 복사</button>
      </div>
      <textarea class="record-comment-text" readonly>${escapeHtml(report.comment)}</textarea>
      <p class="record-comment-meta">연결 성취기준: ${escapeHtml(report.standardText)}</p>
    </article>
  `).join("");
}

function buildStudentRecordReports(records, tone = selectedRecordCommentTone) {
  return buildStudentReportSummaries(records).map((summary) => {
    const level = resolveStudentRecordLevel(summary);
    const comment = buildStudentRecordComment(summary, level, tone);
    const attemptedStandards = getAttemptedStandardStats(summary);
    const standardText = attemptedStandards.length > 0
      ? attemptedStandards.map((stat) => stat.code).join(", ")
      : CURRICULUM_STANDARDS.map((standard) => standard.code).join(", ");

    return {
      studentKey: summary.studentKey,
      comment,
      standardText,
      levelLabel: getStudentRecordLevelLabel(level),
      evidenceText: getStudentRecordEvidenceText(summary, level)
    };
  });
}

function buildStudentReportSummaries(records) {
  const summaryMap = groupRecordsByStudent(records);

  records.forEach((record) => {
    const summary = summaryMap.get(record.studentKey);
    if (!summary) {
      return;
    }

    if (!summary.records) {
      summary.records = [];
    }
    summary.records.push(record);
  });

  return Array.from(summaryMap.values())
    .map((summary) => {
      const studentRecords = summary.records || [];
      summary.questionRecords = studentRecords.flatMap((record) => (
        Array.isArray(record.questionRecords) ? record.questionRecords : []
      ));
      summary.retrySuccess = studentRecords.reduce((sum, record) => sum + (record.retrySuccess || 0), 0);
      summary.finalWrong = studentRecords.reduce((sum, record) => sum + (record.finalWrong || 0), 0);
      summary.feedbackConfirmed = studentRecords.reduce((sum, record) => sum + (record.feedbackConfirmed || 0), 0);
      summary.focusTags = getSummaryNeedTags(studentRecords);
      summary.standardStats = analyzeStandardPerformance(studentRecords);
      return summary;
    })
    .sort((a, b) => Number(a.classNumber) - Number(b.classNumber) || Number(a.studentNumber) - Number(b.studentNumber));
}

function getSummaryNeedTags(records) {
  const counts = new Map();

  records.forEach((record) => {
    getRecordNeedTags(record).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko-KR"))
    .slice(0, 3)
    .map(([tag]) => tag);
}

function analyzeStandardPerformance(records) {
  const stats = new Map(CURRICULUM_STANDARDS.map((standard) => [
    standard.code,
    {
      ...standard,
      total: 0,
      correct: 0,
      needsSupport: 0
    }
  ]));

  records.forEach((record) => {
    const questionRecords = Array.isArray(record.questionRecords) ? record.questionRecords : [];

    if (questionRecords.length === 0) {
      resolveStandardsForQuestion(record, record).forEach((code) => {
        const stat = stats.get(code);
        if (!stat) {
          return;
        }
        stat.total += record.questionCount || 0;
        stat.correct += record.correct || 0;
        stat.needsSupport += Math.max(0, (record.questionCount || 0) - (record.correct || 0));
      });
      return;
    }

    questionRecords.forEach((questionRecord) => {
      resolveStandardsForQuestion(questionRecord, record).forEach((code) => {
        const stat = stats.get(code);
        if (!stat) {
          return;
        }
        stat.total += 1;
        if (questionRecord.finalCorrect) {
          stat.correct += 1;
        }
        if (!questionRecord.finalCorrect || (questionRecord.attemptCount || 0) > 1) {
          stat.needsSupport += 1;
        }
      });
    });
  });

  return Array.from(stats.values());
}

function resolveStandardsForQuestion(questionRecord, record = {}) {
  const category = questionRecord.category || record.category || "";
  const categoryName = `${questionRecord.categoryName || record.categoryName || ""}`;
  const prompt = questionRecord.prompt || "";
  const codes = new Set();

  if (
    category.includes("number")
    || category === "g2_1_1"
    || category === "g2_2_1"
    || category === "1-1"
    || category === "2-1"
    || categoryName.includes("세 자리 수")
    || categoryName.includes("네 자리 수")
    || prompt.includes("자리")
    || prompt.includes("크")
  ) {
    codes.add("2수01-01");
  }

  if (
    category === "g2_1_3"
    || category === "1-3"
    || categoryName.includes("덧셈")
    || categoryName.includes("뺄셈")
    || prompt.includes("+")
    || prompt.includes("-")
    || isWordProblemPrompt(prompt)
  ) {
    codes.add("2수01-06");
  }

  if (
    category === "g2_1_6"
    || category === "g2_2_2"
    || category === "1-6"
    || category === "2-2"
    || categoryName.includes("곱셈")
    || categoryName.includes("곱셈구구")
    || prompt.includes("묶음")
    || prompt.includes("곱")
  ) {
    codes.add("2수01-10");
  }

  if (
    category === "g2_1_2"
    || category === "1-2"
    || categoryName.includes("도형")
    || prompt.includes("변")
    || prompt.includes("꼭짓점")
    || prompt.includes("도형")
  ) {
    codes.add("2수02-03");
  }

  if (
    category === "g2_1_4"
    || category === "g2_2_3"
    || category === "g2_2_4"
    || category === "1-4"
    || category === "2-3"
    || category === "2-4"
    || categoryName.includes("길이")
    || categoryName.includes("시각")
    || categoryName.includes("시간")
    || prompt.includes("cm")
    || prompt.includes("m")
    || prompt.includes("시")
    || prompt.includes("분")
  ) {
    codes.add("2수03-01");
  }

  if (
    category === "g2_1_5"
    || category === "g2_2_5"
    || category === "g2_2_6"
    || category === "1-5"
    || category === "2-5"
    || category === "2-6"
    || categoryName.includes("분류")
    || categoryName.includes("표")
    || categoryName.includes("그래프")
    || categoryName.includes("규칙")
    || prompt.includes("분류")
    || prompt.includes("표")
    || prompt.includes("규칙")
  ) {
    codes.add("2수04-01");
  }

  if (codes.size === 0) {
    codes.add("2수01-01");
  }

  return Array.from(codes);
}

function getAttemptedStandardStats(summary) {
  return (summary.standardStats || [])
    .filter((stat) => stat.total > 0)
    .sort((a, b) => b.total - a.total || b.correct - a.correct);
}

function resolveStudentRecordLevel(summary) {
  const attemptedStandards = getAttemptedStandardStats(summary);
  const everyStandardNeedsCare = attemptedStandards.length > 0
    && attemptedStandards.every((stat) => getStandardAccuracy(stat) < 40);

  if (summary.questionCount === 0) {
    return "observation";
  }

  if (everyStandardNeedsCare || summary.accuracyPercent < 35) {
    return "support";
  }

  if (summary.accuracyPercent >= 90 && summary.finalWrong === 0 && summary.avgQuestionTimeMs <= 10000) {
    return "advanced";
  }

  if (summary.accuracyPercent >= 80) {
    return "strong";
  }

  if (summary.accuracyPercent >= 60) {
    return "progressing";
  }

  return "emerging";
}

function getStudentRecordLevelLabel(level) {
  return {
    advanced: "성취수준 매우 높음",
    strong: "성취수준 높음",
    progressing: "성취수준 보통",
    emerging: "성장 중",
    support: "기초 개념 다지는 중",
    observation: "추가 관찰 필요"
  }[level] || "추가 관찰 필요";
}

function getStudentRecordEvidenceText(summary, level) {
  const levelText = {
    advanced: "여러 유형 안정적",
    strong: "대체로 안정적",
    progressing: "성장 흐름 확인",
    emerging: "보충 관찰 권장",
    support: "기초 개념 확인 중",
    observation: "자료 추가 필요"
  }[level] || "자료 추가 필요";

  return `${summary.sessions}회 누적 · ${summary.questionCount}문항 관찰 · ${levelText}`;
}

function buildStudentRecordComment(summary, level, tone = "praise") {
  if (tone === "analytical") {
    return buildAnalyticalStudentRecordComment(summary, level);
  }

  return buildPraiseStudentRecordComment(summary, level);
}

function buildPraiseStudentRecordComment(summary, level) {
  const strongText = getStrongStandardText(summary);
  const focusText = getGrowthFocusText(summary);
  const attitudeText = getLearningAttitudeText(summary);

  if (level === "advanced") {
    return [
      `${strongText}에서 자리값을 바탕으로 계산 원리를 안정적으로 적용하며 여러 유형의 문제를 정확하게 해결함.`,
      `받아올림과 받아내림이 포함된 식에서도 십의 자리와 일의 자리를 구분해 빠르게 계산하는 힘이 돋보임.`,
      `${attitudeText}`,
      `${focusText}까지 확장하면 자신의 풀이 과정을 더 풍부하게 설명하는 역량이 한층 커질 것으로 기대됨.`
    ].join(" ");
  }

  if (level === "strong") {
    return [
      `${strongText} 영역을 비교적 안정적으로 이해하고, 주어진 식을 차근차근 계산하여 정답을 찾아가는 모습이 좋음.`,
      `${attitudeText}`,
      `앞으로 ${focusText}을 꾸준히 더해 가면 2학년 수학 전단원 문제 해결력이 더욱 탄탄해질 것으로 기대됨.`
    ].join(" ");
  }

  if (level === "progressing") {
    return [
      `${strongText} 영역을 활용해 문제를 해결하려는 태도가 보이며, 익숙한 계산 상황에서는 정답을 찾아내는 경험을 꾸준히 쌓고 있음.`,
      `${attitudeText}`,
      `${focusText}을 반복해서 확인하면 다양한 유형에서도 계산 원리를 더 안정적으로 적용할 수 있을 것으로 보임.`
    ].join(" ");
  }

  if (level === "support") {
    return [
      `현재는 2학년 수학의 핵심 개념에서 조건 읽기와 풀이 순서를 교사의 안내와 함께 차분히 확인해 가는 과정에 있으며, 그림·표·수직선 등으로 문제 상황을 나누어 보는 활동에서 배움의 실마리를 만들어 가고 있음.`,
      `작은 수의 단순 계산과 기본 개념부터 성공 경험을 쌓고 설명을 따라 다시 풀어 보는 기회를 이어가면 수와 연산, 도형, 측정, 자료와 규칙을 점차 안정적으로 익혀 갈 것으로 기대됨.`
    ].join(" ");
  }

  if (level === "observation") {
    return "아직 저장된 풀이 기록이 충분하지 않아 현재 성취 모습을 단정하기보다 추가 관찰이 필요함. 다음 평가에서 수와 연산, 도형, 측정, 자료와 규칙 문제를 차분히 살펴보면 학생의 강점과 성장 지점을 더 구체적으로 확인할 수 있음.";
  }

  return [
    `2학년 수학의 기초 문제 해결에 참여하며 문제 상황을 식, 그림, 표와 연결해 보려는 모습을 보임.`,
    `앞으로 ${focusText}을 수막대, 그림, 말로 설명하는 활동과 함께 연습하면 계산 과정에 대한 자신감이 조금씩 커질 것으로 기대됨.`
  ].join(" ");
}

function buildAnalyticalStudentRecordComment(summary, level) {
  const strongText = getStrongStandardText(summary);
  const focusText = getGrowthFocusText(summary);
  const attitudeText = getLearningAttitudeText(summary);
  const weaknessText = getWeaknessObservationText(summary);

  if (level === "advanced" || level === "strong") {
    return [
      `${strongText}에서 정확도와 문제 해결 속도가 안정적이며, 현재 학습한 2학년 수학 개념을 대체로 신뢰할 수 있게 적용함.`,
      `${attitudeText}`,
      `앞으로는 풀이 과정을 말이나 식으로 더 명확히 설명하고 ${focusText}까지 확장하면 심화 문제에서도 강점이 유지될 것으로 보임.`
    ].join(" ");
  }

  if (level === "progressing") {
    return [
      `${strongText} 관련 문항에서 기본적인 접근은 가능하나, ${weaknessText}이 일부 나타남.`,
      `정확도를 높이기 위해 ${focusText}을 꾸준히 연습하고, 답을 고르기 전 계산 근거를 한 번 더 확인하는 과정이 필요함.`,
      `${attitudeText}`
    ].join(" ");
  }

  if (level === "observation") {
    return "저장된 풀이 기록이 충분하지 않아 현재 성취 수준을 판단하기 어려움. 다음 평가에서 수 개념, 연산, 도형, 측정, 자료 해석, 규칙 찾기를 중심으로 추가 관찰이 필요함.";
  }

  return [
    `현재 누적 결과에서는 ${weaknessText}이 뚜렷하여 해당 단원의 핵심 개념과 풀이 절차를 다시 점검할 필요가 있음.`,
    `${focusText}을 교사의 안내, 수막대 조작, 짧은 반복 계산과 연결해 연습하는 것이 우선 과제임.`,
    `작은 수와 익숙한 유형에서 성공 경험을 만든 뒤 문장제와 □가 있는 식으로 범위를 넓히면 계산 원리를 점차 안정화할 수 있을 것으로 보임.`
  ].join(" ");
}

function getWeaknessObservationText(summary) {
  const focusTags = summary.focusTags || [];
  const weakStandard = (summary.standardStats || [])
    .filter((stat) => stat.total > 0)
    .sort((a, b) => getStandardAccuracy(a) - getStandardAccuracy(b) || b.total - a.total)[0];
  const weakLabel = weakStandard && getStandardAccuracy(weakStandard) < 70
    ? weakStandard.commentLabel
    : "";

  if (focusTags.length > 0 && weakLabel) {
    return `${weakLabel}에서 ${focusTags[0]} 관련 실수가 반복되는 모습`;
  }

  if (focusTags.length > 0) {
    return `${focusTags[0]} 관련 실수가 반복되는 모습`;
  }

  if (weakLabel) {
    return `${weakLabel}에서 정확도가 흔들리는 모습`;
  }

  if ((summary.avgQuestionTimeMs || 0) >= 12000) {
    return "문제를 해결하는 데 시간이 다소 길어지는 모습";
  }

  return "계산 과정 확인이 더 필요한 모습";
}

function getStrongStandardText(summary) {
  const attempted = getAttemptedStandardStats(summary);
  const strongStandards = attempted
    .filter((stat) => getStandardAccuracy(stat) >= 75)
    .sort((a, b) => getStandardAccuracy(b) - getStandardAccuracy(a) || b.total - a.total)
    .slice(0, 2);
  const selectedStandards = strongStandards.length > 0
    ? strongStandards
    : attempted.sort((a, b) => getStandardAccuracy(b) - getStandardAccuracy(a)).slice(0, 2);

  if (selectedStandards.length === 0) {
    return "2학년 수학 핵심 개념과 문제 해결 과정";
  }

  return selectedStandards.map((standard) => standard.commentLabel).join(" 및 ");
}

function getGrowthFocusText(summary) {
  const focusTags = summary.focusTags || [];

  if (focusTags.some((tag) => tag.includes("□"))) {
    return "□가 사용된 식에서 전체와 부분의 관계를 먼저 찾고 반대연산으로 확인하는 활동";
  }

  if (focusTags.some((tag) => tag.includes("관계"))) {
    return "덧셈식과 뺄셈식을 서로 바꾸어 말하며 전체와 부분의 관계를 설명하는 활동";
  }

  if (focusTags.some((tag) => tag.includes("세 수"))) {
    return "세 수 계산에서 앞 계산 결과를 표시하고 다음 계산으로 이어 가는 활동";
  }

  if (focusTags.some((tag) => tag.includes("받아올림") || tag.includes("100"))) {
    return "일의 자리 10개가 십의 자리 1개로 바뀌는 받아올림 과정을 그림으로 설명하는 활동";
  }

  if (focusTags.some((tag) => tag.includes("받아내림") || tag.includes("빌리는"))) {
    return "십의 자리 1개를 일의 자리 10개로 바꾸어 빼는 받아내림 과정을 수막대로 확인하는 활동";
  }

  if (focusTags.some((tag) => tag.includes("문장제"))) {
    return "문장 속 조건을 밑줄로 찾고 덧셈식 또는 뺄셈식으로 바꾸어 보는 활동";
  }

  if (focusTags.some((tag) => tag.includes("풀이시간"))) {
    return "단순 계산을 빠르고 정확하게 떠올리는 짧은 반복 연습";
  }

  return "문제 조건을 식으로 나타내고 계산 과정을 말로 설명하는 활동";
}

function getLearningAttitudeText(summary) {
  if (summary.retrySuccess > 0 && summary.feedbackConfirmed > 0) {
    return "오답 후에도 설명을 확인하고 다시 시도하여 자신의 풀이를 고쳐 가는 태도가 긍정적임.";
  }

  if (summary.retrySuccess > 0) {
    return "처음 선택을 다시 살펴보고 재도전하여 정답으로 연결하는 끈기가 나타남.";
  }

  if (summary.feedbackConfirmed > 0) {
    return "설명을 읽으며 계산 과정을 확인하려는 태도가 보이며, 피드백을 다음 풀이로 연결할 가능성이 큼.";
  }

  if (summary.avgQuestionTimeMs >= 12000) {
    return "문제를 성급하게 넘기기보다 차분히 읽고 해결하려는 모습이 보임.";
  }

  return "선택지를 고르기 전에 식을 계산하고 결과를 확인하는 학습 태도가 안정적임.";
}

function getStandardAccuracy(stat) {
  return stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
}

async function copyAllRecordComments() {
  if (!latestRecordCommentText) {
    window.alert("복사할 생기부 문장이 없습니다.");
    return;
  }

  await copyTextToClipboard(latestRecordCommentText);
  teacherDashboardMessage.textContent = "생활기록부 입력용 문장을 모두 복사했습니다.";
}

async function copySingleRecordComment(event) {
  const copyButton = event.target.closest("[data-copy-comment]");
  if (!copyButton) {
    return;
  }

  const card = copyButton.closest("[data-comment-card]");
  const text = card?.querySelector(".record-comment-text")?.value || "";
  if (!text) {
    return;
  }

  await copyTextToClipboard(text);
  copyButton.textContent = "복사 완료";
  window.setTimeout(() => {
    copyButton.textContent = "이 학생 복사";
  }, 1200);
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (error) {
    console.warn("클립보드 복사 실패, 임시 입력창 방식으로 다시 시도합니다.", error);
  }

  const tempTextarea = document.createElement("textarea");
  tempTextarea.value = text;
  tempTextarea.setAttribute("readonly", "");
  tempTextarea.style.position = "fixed";
  tempTextarea.style.left = "-9999px";
  document.body.appendChild(tempTextarea);
  tempTextarea.select();
  document.execCommand("copy");
  tempTextarea.remove();
}

async function loadLearningRecords() {
  const bridgeRecords = await requestStorageBridge("learning-records-read");
  if (Array.isArray(bridgeRecords)) {
    return bridgeRecords;
  }

  try {
    const rawRecords = window.localStorage.getItem(LEARNING_RECORDS_STORAGE_KEY);
    const parsedRecords = rawRecords ? JSON.parse(rawRecords) : [];
    return Array.isArray(parsedRecords) ? parsedRecords : [];
  } catch (error) {
    console.warn("학습 데이터 불러오기 실패", error);
    return [];
  }
}

async function saveLearningRecords(records) {
  const bridgeRecords = await requestStorageBridge("learning-records-write", { records });
  if (Array.isArray(bridgeRecords)) {
    return;
  }

  try {
    window.localStorage.setItem(LEARNING_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("학습 데이터 저장 실패", error);
    window.alert("브라우저 저장 공간에 결과를 저장하지 못했어요.");
  }
}

function handleStorageBridgeResponse(event) {
  const message = event.data;
  if (!message || typeof message !== "object" || message.type !== "learning-records-response") {
    return;
  }

  const request = storageBridgeRequests.get(message.storageBridgeRequestId);
  if (!request) {
    return;
  }

  window.clearTimeout(request.timeoutHandle);
  storageBridgeRequests.delete(message.storageBridgeRequestId);
  request.resolve(message.records);
}

function requestStorageBridge(type, payload = {}) {
  const bridgeWindow = storageBridgeFrame?.contentWindow;
  if (!bridgeWindow) {
    return Promise.resolve(null);
  }

  storageBridgeRequestId += 1;
  const requestId = `teacher-${Date.now()}-${storageBridgeRequestId}`;

  return new Promise((resolve) => {
    const timeoutHandle = window.setTimeout(() => {
      storageBridgeRequests.delete(requestId);
      resolve(null);
    }, 1200);

    storageBridgeRequests.set(requestId, { resolve, timeoutHandle });
    bridgeWindow.postMessage({
      ...payload,
      type,
      storageBridgeRequestId: requestId
    }, "*");
  });
}

async function clearTeacherLearningRecords() {
  if (!window.confirm("교사용 누적 데이터를 모두 삭제할까요?")) {
    return;
  }

  await saveLearningRecords([]);
  await renderTeacherDashboard("누적 데이터를 삭제했습니다.");
}

async function exportTeacherLearningRecords() {
  const records = await loadLearningRecords();
  if (records.length === 0) {
    window.alert("내보낼 평가 데이터가 없습니다.");
    return;
  }

  const headers = [
    "저장시각",
    "반",
    "번호",
    "문제유형",
    "난이도",
    "점수",
    "정답수",
    "풀이문항수",
    "오답선택수",
    "평균풀이초",
    "재도전성공",
    "최종오답",
    "설명확인",
    "더볼유형"
  ];
  const rows = records.map((record) => [
    formatDateTime(record.savedAt),
    record.classNumber,
    record.studentNumber,
    record.categoryName,
    record.difficultyName,
    record.score,
    record.correct,
    record.questionCount,
    record.wrongSelections,
    Math.round(record.avgQuestionTimeMs / 1000),
    record.retrySuccess,
    record.finalWrong,
    record.feedbackConfirmed,
    getRecordNeedText(record)
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `2학년_수학_전단원_평가결과_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${seconds}초`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
