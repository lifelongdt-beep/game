const LEARNING_RECORDS_STORAGE_KEY = "bojogae.math2.allUnits.learningRecords.v2";

const teacherDashboardMessage = document.getElementById("teacherDashboardMessage");
const teacherStats = document.getElementById("teacherStats");
const teacherStudentSummary = document.getElementById("teacherStudentSummary");
const teacherStudentDetail = document.getElementById("teacherStudentDetail");
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
let selectedTeacherStudentKey = "";

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
  teacherStudentSummary?.addEventListener("click", selectTeacherStudent);
  teacherStudentDetail?.addEventListener("click", copyTeacherFeedbackSnippet);
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
  const summaries = buildStudentReportSummaries(records);
  const orderedSummaries = sortStudentSummariesForTeacher(summaries);
  if (orderedSummaries.length > 0 && !orderedSummaries.some((summary) => summary.studentKey === selectedTeacherStudentKey)) {
    selectedTeacherStudentKey = orderedSummaries[0].studentKey;
  }
  const selectedSummary = summaries.find((summary) => summary.studentKey === selectedTeacherStudentKey) || summaries[0] || null;
  teacherDashboardMessage.textContent = message || "학생이 게임 종료 후 반과 번호를 입력하면 이 화면에 누적됩니다.";
  teacherStats.innerHTML = renderTeacherStats(records, summaries);
  teacherStudentSummary.innerHTML = renderStudentCumulativeSummary(orderedSummaries, selectedSummary?.studentKey || "");
  teacherStudentDetail.innerHTML = renderTeacherStudentDetail(selectedSummary);
  if (teacherRecordTable) {
    teacherRecordTable.innerHTML = renderTeacherRecordTable(records);
  }
}

function renderTeacherStats(records, summaries = buildStudentReportSummaries(records)) {
  const studentCount = new Set(records.map((record) => record.studentKey)).size;
  const supportCount = summaries.filter((summary) => {
    const level = resolveStudentRecordLevel(summary);
    const priority = getStudentPrioritySignal(summary, level);
    return ["support", "emerging"].includes(level) || ["urgent", "reteach", "speed"].includes(priority.modifier);
  }).length;
  const advancedCount = summaries.filter((summary) => resolveStudentRecordLevel(summary) === "advanced").length;
  const retryRecoveryCount = summaries.filter((summary) => (summary.retrySuccess || 0) > 0).length;
  const commonFocus = getClassCommonFocus(records);
  const averageAccuracy = calculateClassAccuracy(records);
  const supportRate = studentCount ? Math.round((supportCount / studentCount) * 100) : 0;
  const advancedRate = studentCount ? Math.round((advancedCount / studentCount) * 100) : 0;
  const steadyCount = Math.max(0, studentCount - supportCount - advancedCount);
  const steadyRate = studentCount ? Math.max(0, 100 - supportRate - advancedRate) : 0;
  const standardStats = getClassStandardStats(summaries);

  return `
    <section class="class-overview-panel" aria-label="학급 전체 학습 정도">
      <div class="class-overview-main">
        <div class="class-accuracy-ring" style="--value:${averageAccuracy}">
          <strong>${averageAccuracy}%</strong>
          <span>학급 평균</span>
        </div>
        <div class="class-overview-copy">
          <span>전체 학습 정도</span>
          <strong>${studentCount}명 · 지원 우선 ${supportCount}명</strong>
          <p>공통 막힘: ${escapeHtml(commonFocus.title)} · 재도전 회복 ${retryRecoveryCount}명 · 심화 가능 ${advancedCount}명</p>
        </div>
      </div>
      <div class="class-progress-graphic" aria-label="지원 우선 ${supportRate}%, 안정 ${steadyRate}%, 심화 ${advancedRate}%">
        <div class="class-progress-bar">
          <i class="is-support" style="--value:${supportRate}"></i>
          <i class="is-steady" style="--value:${steadyRate}"></i>
          <i class="is-advanced" style="--value:${advancedRate}"></i>
        </div>
        <div class="class-progress-labels">
          <span>지원 ${supportCount}명</span>
          <span>안정 ${steadyCount}명</span>
          <span>심화 ${advancedCount}명</span>
        </div>
      </div>
      <div class="class-standard-strip">
        ${standardStats.map((standard) => `
          <article class="class-standard-pill class-standard-pill--${standard.status}">
            <span>${escapeHtml(standard.shortLabel)}</span>
            <strong>${standard.accuracy}%</strong>
          </article>
        `).join("")}
      </div>
    </section>
  `;
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

function renderStudentCumulativeSummary(summaries, selectedStudentKey = "") {
  if (summaries.length === 0) {
    return `<div class="teacher-empty">아직 저장된 평가 결과가 없습니다.</div>`;
  }

  const cards = summaries.map((summary) => {
    const level = resolveStudentRecordLevel(summary);
    const priority = getStudentPrioritySignal(summary, level);
    const isSelected = summary.studentKey === selectedStudentKey;
    return `
      <button class="student-compact-card student-compact-card--${priority.modifier} ${isSelected ? "is-selected" : ""}" type="button" data-student-key="${escapeHtml(summary.studentKey)}" aria-pressed="${isSelected}" aria-label="${escapeHtml(summary.studentKey)} ${summary.accuracyPercent}% ${escapeHtml(priority.label)}">
        <span>${escapeHtml(summary.classNumber || "-")}반</span>
        <strong>${escapeHtml(summary.studentNumber || "-")}번</strong>
        <b>${summary.accuracyPercent}%</b>
      </button>
    `;
  }).join("");

  return `
    <div class="student-compact-grid">
      ${cards}
    </div>
  `;
}

function selectTeacherStudent(event) {
  const card = event.target.closest("[data-student-key]");
  if (!card) {
    return;
  }

  selectedTeacherStudentKey = card.dataset.studentKey || "";
  renderTeacherDashboard(`${selectedTeacherStudentKey} 학생의 상세 피드백을 열었습니다.`);
}

async function copyTeacherFeedbackSnippet(event) {
  const pdfButton = event.target.closest("[data-student-pdf]");
  if (pdfButton) {
    const originalText = pdfButton.textContent;
    pdfButton.disabled = true;
    pdfButton.textContent = "최신 기록으로 생성 중";
    try {
      await downloadStudentFeedbackPdf(pdfButton.dataset.studentKey || "", pdfButton.dataset.studentPdf || "practice");
      pdfButton.textContent = "PDF 생성 완료";
      window.setTimeout(() => {
        pdfButton.textContent = originalText;
      }, 1200);
    } catch (error) {
      console.error("학생 PDF 생성 실패", error);
      window.alert("PDF를 만드는 중 문제가 생겼어요. 새로고침 후 다시 시도해 주세요.");
      pdfButton.textContent = originalText;
    } finally {
      pdfButton.disabled = false;
    }
    return;
  }

  const button = event.target.closest("[data-copy-feedback]");
  if (!button) {
    return;
  }

  const text = button.dataset.copyFeedback || "";
  if (!text) {
    return;
  }

  await copyTextToClipboard(text);
  button.textContent = "복사 완료";
  window.setTimeout(() => {
    button.textContent = button.dataset.copyLabel || "복사";
  }, 1200);
}

function renderTeacherStudentDetail(summary) {
  if (!summary) {
    return `<div class="teacher-empty">왼쪽 학생 요약에서 학생을 선택하면 누적 결과와 교사용 피드백이 열립니다.</div>`;
  }

  const level = resolveStudentRecordLevel(summary);
  const priority = getStudentPrioritySignal(summary, level);
  const plan = buildStudentFeedbackPlan(summary, level);
  const trend = getStudentTrend(summary);
  const studentTalk = plan.teacherTalk;
  const familyTalk = plan.homeTalk;

  return `
    <div class="student-detail-shell">
      <section class="student-detail-hero student-detail-hero--${priority.modifier}">
        <div>
          <span class="student-priority student-priority--${priority.modifier}">${escapeHtml(priority.label)}</span>
          <h4>${escapeHtml(summary.studentKey)}</h4>
          <p>${escapeHtml(getStudentRecordLevelLabel(level))} · ${summary.sessions}회 누적 · ${summary.questionCount}문항 관찰 · 최근 ${escapeHtml(formatDateTime(summary.lastSavedAt))}</p>
        </div>
        <div class="student-detail-score">
          <strong>${summary.accuracyPercent}%</strong>
          <span>정확도</span>
        </div>
      </section>

      <section class="student-feedback-plan">
        <div class="teacher-section-title">
          <span>오늘의 지도 판단</span>
          <strong>${escapeHtml(plan.title)}</strong>
        </div>
        <p class="student-feedback-diagnosis">${escapeHtml(plan.diagnosis)}</p>
        <div class="student-feedback-actions">
          <article>
            <span>학생에게 바로 말하기</span>
            <p>${escapeHtml(studentTalk)}</p>
            <button class="record-copy-button" type="button" data-copy-label="피드백 복사" data-copy-feedback="${escapeHtml(studentTalk)}">피드백 복사</button>
          </article>
          <article>
            <span>다음 지도 행동</span>
            <p>${escapeHtml(plan.nextAction)}</p>
          </article>
          <article>
            <span>가정 연계 한마디</span>
            <p>${escapeHtml(familyTalk)}</p>
            <button class="record-copy-button" type="button" data-copy-label="가정 문장 복사" data-copy-feedback="${escapeHtml(familyTalk)}">가정 문장 복사</button>
          </article>
        </div>
      </section>

      <section class="student-pdf-tools" aria-label="학생 피드백 PDF 자료">
        <div>
          <span>첨부 자료</span>
          <strong>다시 공부할 문제와 정답·설명 PDF</strong>
          <p>누를 때마다 현재까지 누적된 최신 기록과 게임 속 그림 풀이로 다시 생성됩니다.</p>
        </div>
        <div class="student-pdf-actions">
          <button class="record-copy-button" type="button" data-student-key="${escapeHtml(summary.studentKey)}" data-student-pdf="practice">다시 공부할 문제 PDF</button>
          <button class="record-copy-button" type="button" data-student-key="${escapeHtml(summary.studentKey)}" data-student-pdf="answer">정답·설명 자료 PDF</button>
        </div>
      </section>

      <section class="student-detail-metrics">
        ${teacherStatCard("정확도", `${summary.accuracyPercent}%`, `${summary.correct}/${summary.questionCount}문항 정답`)}
        ${teacherStatCard("평균 풀이", formatSeconds(summary.avgQuestionTimeMs), trend.label)}
        ${teacherStatCard("재도전 회복", `${summary.retrySuccess || 0}회`, `최종 오답 ${summary.finalWrong || 0}회`)}
        ${teacherStatCard("설명 확인", `${summary.feedbackConfirmed || 0}회`, plan.metacognition)}
      </section>

      ${renderStudentGrowthAnalysis(summary)}
      ${renderStudentExpertFeedback(summary, plan, trend)}
      ${renderStudentStandardBars(summary)}
      ${renderStudentSessionTimeline(summary)}
      ${renderStudentQuestionEvidence(summary)}
    </div>
  `;
}

function renderStudentExpertFeedback(summary, plan, trend) {
  const professorInsight = getProfessorInsight(summary);
  return `
    <section class="student-expert-grid" aria-label="세 전문가 공동 피드백">
      <article>
        <span>교육대학교 교수 검토</span>
        <strong>${escapeHtml(professorInsight.title)}</strong>
        <p>${escapeHtml(professorInsight.body)}</p>
      </article>
      <article>
        <span>학교 수석교사 처방</span>
        <strong>${escapeHtml(plan.smallGroup)}</strong>
        <p>${escapeHtml(plan.coachingRoutine)}</p>
      </article>
      <article>
        <span>10년차 교사 수업 지원</span>
        <strong>${escapeHtml(trend.label)}</strong>
        <p>${escapeHtml(plan.quickSupport)}</p>
      </article>
    </section>
  `;
}

function renderStudentGrowthAnalysis(summary) {
  const growth = summary.growthAnalysis || { recovered: [], ongoing: [] };
  const recovered = growth.recovered.slice(0, 3);
  const ongoing = growth.ongoing.slice(0, 3);
  const hasEvidence = recovered.length || ongoing.length;

  if (!hasEvidence) {
    return `
      <section class="student-growth-panel">
        <div class="teacher-section-title">
          <span>학습 성장 추적</span>
          <strong>같은 유형 재도전 기록을 더 모으는 중</strong>
        </div>
        <p>아직 피드백 뒤 같은 유형을 다시 푼 기록이 충분하지 않습니다. 다음 맞춤 재도전 후 성장 여부가 자동으로 비교됩니다.</p>
      </section>
    `;
  }

  return `
    <section class="student-growth-panel">
      <div class="teacher-section-title">
        <span>학습 성장 추적</span>
        <strong>피드백 뒤 같은 유형을 다시 맞혔는지 확인</strong>
      </div>
      <div class="student-growth-grid">
        <article class="student-growth-card student-growth-card--recovered">
          <span>성장 확인</span>
          <strong>${recovered.length}유형</strong>
          <p>${recovered.length ? "이 유형은 다시 공부할 문제에서 제외합니다." : "아직 제외할 만큼 회복된 유형은 없습니다."}</p>
          ${renderGrowthTypeList(recovered)}
        </article>
        <article class="student-growth-card student-growth-card--ongoing">
          <span>계속 관찰</span>
          <strong>${ongoing.length}유형</strong>
          <p>${ongoing.length ? "피드백 뒤에도 흔들려 교사 개입이 필요합니다." : "현재 계속 흔들리는 같은 유형은 없습니다."}</p>
          ${renderGrowthTypeList(ongoing)}
        </article>
      </div>
    </section>
  `;
}

function renderGrowthTypeList(items) {
  if (!items.length) {
    return "";
  }

  return `
    <ul class="student-growth-list">
      ${items.map((item) => `
        <li>
          <b>${escapeHtml(item.label)}</b>
          <span>${item.supportCount}회 보충 · ${item.cleanAfterSupportCount || 0}회 회복</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderStudentStandardBars(summary) {
  const standards = getAttemptedStandardStats(summary);
  if (standards.length === 0) {
    return `<section class="student-detail-section"><div class="teacher-empty">성취기준별로 해석할 문항 기록이 아직 충분하지 않습니다.</div></section>`;
  }

  return `
    <section class="student-detail-section">
      <div class="teacher-section-title">
        <span>성취기준별 프로파일</span>
        <strong>강점과 재지도 근거를 같이 봅니다</strong>
      </div>
      <div class="standard-bar-list">
        ${standards.map((standard) => {
          const accuracy = getStandardAccuracy(standard);
          const status = getStandardStatus(standard);
          return `
            <article class="standard-bar-card standard-bar-card--${status.modifier}">
              <div>
                <strong>${escapeHtml(standard.code)} · ${escapeHtml(standard.shortLabel)}</strong>
                <span>${escapeHtml(standard.commentLabel)} · ${standard.correct}/${standard.total}문항 · 지원 필요 ${standard.needsSupport}문항</span>
              </div>
              <div class="standard-bar" aria-label="${accuracy}%">
                <i style="--value:${accuracy}"></i>
              </div>
              <b>${accuracy}%</b>
              <em>${escapeHtml(status.label)}</em>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderStudentSessionTimeline(summary) {
  const records = [...(summary.records || [])].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  if (records.length === 0) {
    return "";
  }

  return `
    <section class="student-detail-section">
      <div class="teacher-section-title">
        <span>학습 기록 전체</span>
        <strong>평가 회차별 흐름</strong>
      </div>
      <div class="student-session-list">
        ${records.map((record) => `
          <article class="student-session-card">
            <div>
              <strong>${escapeHtml(record.categoryName || "전단원")}</strong>
              <span>${escapeHtml(formatDateTime(record.savedAt))} · ${escapeHtml(record.difficultyName || "난이도")}</span>
            </div>
            <div class="student-session-metrics">
              <span>${record.score}점</span>
              <span>${record.correct}/${record.questionCount}</span>
              <span>${formatSeconds(record.avgQuestionTimeMs)}</span>
            </div>
            <p>${escapeHtml(getRecordNeedText(record))}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderStudentQuestionEvidence(summary) {
  const rows = [...(summary.records || [])]
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .flatMap((record) => (Array.isArray(record.questionRecords) ? record.questionRecords : []).map((questionRecord) => ({
      record,
      questionRecord
    })));

  if (rows.length === 0) {
    return `<section class="student-detail-section"><div class="teacher-empty">문항별 상세 기록이 없는 이전 형식의 평가 기록입니다.</div></section>`;
  }

  return `
    <section class="student-detail-section">
      <div class="teacher-section-title">
        <span>문항별 근거</span>
        <strong>정오답보다 피드백 이유를 봅니다</strong>
      </div>
      <div class="teacher-table-wrap student-question-table-wrap">
        <table class="teacher-table student-question-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>결과</th>
              <th>문제</th>
              <th>첫 선택 → 정답</th>
              <th>시도</th>
              <th>시간</th>
              <th>피드백 근거</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ record, questionRecord }) => {
              const firstAttempt = questionRecord.attempts?.[0];
              const selectedText = firstAttempt?.selectedText || questionRecord.wrongSelections?.[0] || "-";
              const tags = analyzeQuestionRecordNeed(questionRecord);
              const outcome = getQuestionOutcomeLabel(questionRecord);
              return `
                <tr>
                  <td>${escapeHtml(formatDateTime(record.savedAt))}</td>
                  <td><span class="question-outcome question-outcome--${outcome.modifier}">${escapeHtml(outcome.label)}</span></td>
                  <td class="student-question-prompt">${escapeHtml(questionRecord.prompt || "")}</td>
                  <td>${escapeHtml(selectedText)} → ${escapeHtml(questionRecord.correctText || "")}</td>
                  <td>${questionRecord.attemptCount || 0}회</td>
                  <td>${formatSeconds(questionRecord.elapsedMs || 0)}</td>
                  <td class="teacher-need-cell">${escapeHtml(tags.join(" · ") || "안정적으로 해결")}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
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

function getClassCommonFocus(records) {
  const counts = new Map();
  records.forEach((record) => {
    getRecordNeedTags(record).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!top) {
    return { title: "관찰 중", detail: "공통 막힘 수집 전" };
  }

  return {
    title: getShortFocusName(top[0]),
    detail: `${top[1]}회 반복 신호`
  };
}

function calculateClassAccuracy(records) {
  const totalQuestions = records.reduce((sum, record) => sum + (record.questionCount || 0), 0);
  const totalCorrect = records.reduce((sum, record) => sum + (record.correct || 0), 0);
  return totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
}

function getClassStandardStats(summaries) {
  return CURRICULUM_STANDARDS.map((standard) => {
    const aggregate = summaries.reduce((acc, summary) => {
      const stat = (summary.standardStats || []).find((item) => item.code === standard.code);
      if (stat) {
        acc.total += stat.total || 0;
        acc.correct += stat.correct || 0;
      }
      return acc;
    }, { total: 0, correct: 0 });
    const accuracy = aggregate.total ? Math.round((aggregate.correct / aggregate.total) * 100) : 0;
    return {
      ...standard,
      accuracy,
      status: aggregate.total === 0 ? "observe" : accuracy >= 75 ? "strong" : accuracy >= 45 ? "practice" : "support"
    };
  });
}

function sortStudentSummariesForTeacher(summaries) {
  return [...summaries].sort((a, b) => (
    getStudentPriorityRank(a) - getStudentPriorityRank(b)
    || a.accuracyPercent - b.accuracyPercent
    || Number(a.classNumber) - Number(b.classNumber)
    || Number(a.studentNumber) - Number(b.studentNumber)
  ));
}

function getStudentPriorityRank(summary) {
  const priority = getStudentPrioritySignal(summary, resolveStudentRecordLevel(summary));
  return {
    urgent: 0,
    reteach: 1,
    speed: 2,
    observe: 3,
    feedback: 4,
    stable: 5,
    extend: 6
  }[priority.modifier] ?? 5;
}

function renderStudentMiniTrend(summary) {
  const records = [...(summary.records || [])]
    .sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt))
    .slice(-6);

  if (records.length === 0) {
    return "";
  }

  return `
    <div class="student-mini-trend" aria-label="최근 정확도 흐름">
      ${records.map((record) => {
        const accuracy = record.questionCount ? Math.round((record.correct / record.questionCount) * 100) : 0;
        return `<i style="--value:${accuracy}" title="${escapeHtml(formatDateTime(record.savedAt))} ${accuracy}%"></i>`;
      }).join("")}
    </div>
  `;
}

function getStudentPrioritySignal(summary, level = resolveStudentRecordLevel(summary)) {
  if ((summary.questionCount || 0) < 3) {
    return { label: "관찰 부족", modifier: "observe" };
  }

  if (level === "support" || summary.accuracyPercent < 50 || (summary.finalWrong || 0) >= 3) {
    return { label: "즉시 개입", modifier: "urgent" };
  }

  if (level === "emerging" || (summary.finalWrong || 0) > 0) {
    return { label: "재지도", modifier: "reteach" };
  }

  if (summary.accuracyPercent >= 90 && (summary.finalWrong || 0) === 0 && summary.avgQuestionTimeMs <= 10000) {
    return { label: "심화 가능", modifier: "extend" };
  }

  if (summary.avgQuestionTimeMs >= 12000) {
    return { label: "속도 관찰", modifier: "speed" };
  }

  if ((summary.retrySuccess || 0) > 0 || (summary.feedbackConfirmed || 0) > 0) {
    return { label: "피드백 효과", modifier: "feedback" };
  }

  return { label: "안정", modifier: "stable" };
}

function getStudentTrend(summary) {
  const records = [...(summary.records || [])].sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
  if (records.length < 2) {
    return { label: "추세 관찰 중", detail: "누적 기록이 더 필요합니다." };
  }

  const recent = records.slice(-3);
  const previous = records.slice(Math.max(0, records.length - 6), Math.max(1, records.length - 3));
  const previousAccuracy = averageRecordAccuracy(previous);
  const recentAccuracy = averageRecordAccuracy(recent);
  const previousTime = averageRecordTime(previous);
  const recentTime = averageRecordTime(recent);
  const accuracyDelta = recentAccuracy - previousAccuracy;
  const timeDelta = recentTime - previousTime;

  if (Math.abs(accuracyDelta) <= 5 && timeDelta < -1000 && recentAccuracy >= 80) {
    return { label: "자동화 진행", detail: "정확도는 유지되고 풀이 시간이 줄고 있습니다." };
  }

  if (accuracyDelta >= 5 && timeDelta >= -1000) {
    return { label: "숙고형 성장", detail: "정확도가 오르고 있어 생각 과정을 살릴 만합니다." };
  }

  if (accuracyDelta < -5 && timeDelta < -1000) {
    return { label: "성급한 선택 신호", detail: "빠르게 고르지만 정확도가 흔들립니다." };
  }

  if (accuracyDelta < -5 && timeDelta >= 1000) {
    return { label: "개념 혼란 신호", detail: "시간도 길어지고 정확도도 내려갑니다." };
  }

  return { label: "흐름 유지", detail: "최근 결과가 큰 변화 없이 유지됩니다." };
}

function averageRecordAccuracy(records) {
  const totalQuestions = records.reduce((sum, record) => sum + (record.questionCount || 0), 0);
  const totalCorrect = records.reduce((sum, record) => sum + (record.correct || 0), 0);
  return totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
}

function averageRecordTime(records) {
  const totalQuestions = records.reduce((sum, record) => sum + (record.questionCount || 0), 0);
  const totalTime = records.reduce((sum, record) => sum + ((record.avgQuestionTimeMs || 0) * (record.questionCount || 0)), 0);
  return totalQuestions ? Math.round(totalTime / totalQuestions) : 0;
}

function buildStudentFeedbackPlan(summary, level = resolveStudentRecordLevel(summary)) {
  const focus = summary.focusTags?.[0] || summary.weakText || "";
  const focusName = getShortFocusName(focus);
  const action = getActionForFocus(focus);
  const trend = getStudentTrend(summary);
  const weakness = getWeaknessObservationText(summary);
  const strength = getStrongStandardText(summary);
  const metacognition = getMetacognitionLabel(summary);

  if (level === "advanced") {
    return {
      title: "심화 설명으로 확장",
      diagnosis: `${strength}이 안정적입니다. 이제 정답을 맞히는 수준을 넘어 풀이 과정을 말로 설명하게 하면 좋습니다.`,
      teacherTalk: "풀이가 정확하고 빨라. 이제 답만 말하지 말고 왜 그렇게 되는지 한 문장으로 설명해 보자.",
      nextAction: "비슷한 문제를 하나 직접 만들고 친구에게 풀이 이유를 설명하게 합니다.",
      smallGroup: "심화 도전 그룹",
      coachingRoutine: "심화 학생끼리 풀이 비교를 시키고, 서로 다른 풀이 방법을 칠판에 짧게 공유하게 합니다.",
      quickSupport: "오늘의 확장 카드: 같은 개념을 문장제 또는 빈칸식으로 바꾸어 2문항 제시합니다.",
      homeTalk: "현재 정확도와 속도가 안정적입니다. 가정에서는 답보다 풀이 이유를 말로 설명하는 연습을 해 주세요.",
      metacognition
    };
  }

  if (level === "support" || level === "emerging") {
    return {
      title: `${focusName}부터 다시 잡기`,
      diagnosis: `${weakness}이 보여 한 번에 여러 내용을 보충하기보다 핵심 행동 하나를 정해 반복하는 편이 좋습니다.`,
      teacherTalk: `괜찮아. 오늘은 ${focusName}만 먼저 잡자. 그림이나 표시를 하고 같은 유형을 두 문제만 다시 해 보자.`,
      nextAction: action,
      smallGroup: `${focusName} 소그룹`,
      coachingRoutine: "교사와 1문항을 같이 풀고, 같은 구조 2문항을 학생이 말로 설명하며 다시 풉니다.",
      quickSupport: `3분 루틴: 핵심 표시 → 한 문제 같이 풀기 → 같은 유형 2문항 재도전.`,
      homeTalk: `오늘은 ${focusName}에서 보충이 필요했습니다. 집에서는 답만 확인하지 말고 풀이 표시를 하고 3문제만 천천히 다시 풀어 주세요.`,
      metacognition
    };
  }

  return {
    title: `${focusName} 안정화`,
    diagnosis: `${strength}은 활용하고 있으나 ${weakness}이 일부 보여 첫 선택 전 확인 루틴이 필요합니다.`,
    teacherTalk: `좋아. 풀 수 있는 힘은 있어. 다음 문제에서는 ${focusName}을 먼저 표시하고 답을 고르자.`,
    nextAction: action,
    smallGroup: `${focusName} 확인 그룹`,
    coachingRoutine: "오답이 나온 유형을 한 문제만 공개적으로 다시 풀고, 학생은 자기 공책에 확인 루틴을 표시합니다.",
    quickSupport: `${trend.label}: ${trend.detail} 다음 평가 전 같은 유형 2문항으로 확인합니다.`,
    homeTalk: `${focusName}을 한 번 더 확인하면 정확도가 올라갈 수 있습니다. 가정에서는 문제에서 묻는 말과 필요한 수에 표시하고 풀게 해 주세요.`,
    metacognition
  };
}

function getShortFocusName(focus) {
  if (!focus) return "핵심 개념";
  if (focus.includes("받아올림")) return "받아올림";
  if (focus.includes("받아내림") || focus.includes("빌리는")) return "받아내림";
  if (focus.includes("□")) return "빈칸식";
  if (focus.includes("문장제")) return "문장제";
  if (focus.includes("풀이시간")) return "계산 자동화";
  if (focus.includes("세 수")) return "세 수 계산";
  if (focus.includes("표") || focus.includes("그래프")) return "표·그래프 해석";
  if (focus.includes("묶음") || focus.includes("곱셈")) return "묶음 곱셈";
  return focus.split(":")[0].slice(0, 12);
}

function getActionForFocus(focus) {
  if (focus.includes("받아올림")) {
    return "일 10개를 십 1개로 바꾸는 장면을 점으로 묶어 말하게 한 뒤 같은 덧셈 2문항을 다시 풉니다.";
  }
  if (focus.includes("받아내림") || focus.includes("빌리는")) {
    return "십 1개를 일 10개로 바꾸는 수모형을 그린 뒤, 바뀐 수에서 다시 빼게 합니다.";
  }
  if (focus.includes("□")) {
    return "전체에 동그라미, 알고 있는 수에 밑줄을 치고 '전체-아는 부분'으로 빈칸을 찾게 합니다.";
  }
  if (focus.includes("문장제")) {
    return "문장 속 '처음/변화/묻는 말'을 세 색으로 표시한 뒤 식을 한 줄로 바꾸게 합니다.";
  }
  if (focus.includes("풀이시간")) {
    return "작은 수 같은 유형 3문항을 30초 안에 정확히 풀고, 틀리면 속도보다 확인 루틴으로 돌아갑니다.";
  }
  if (focus.includes("세 수")) {
    return "앞의 두 수 계산 결과를 중간에 적고, 그 결과에 남은 수를 이어 더하거나 빼게 합니다.";
  }
  if (focus.includes("표") || focus.includes("그래프")) {
    return "항목 이름에서 숫자까지 손가락으로 가로줄을 따라가며, 찾은 수에 체크하게 합니다.";
  }
  if (focus.includes("묶음") || focus.includes("곱셈")) {
    return "한 묶음의 수와 묶음 수를 따로 표시하고, 뛰어세기 결과와 곱셈식을 나란히 쓰게 합니다.";
  }
  return "틀린 유형 1문항을 교사와 함께 다시 풀고, 같은 구조 2문항을 혼자 설명하며 풉니다.";
}

function getMetacognitionLabel(summary) {
  if ((summary.retrySuccess || 0) > 0 && (summary.feedbackConfirmed || 0) > 0) {
    return "피드백 수용 좋음";
  }
  if ((summary.feedbackConfirmed || 0) > 0 && (summary.finalWrong || 0) > 0) {
    return "설명 방식 재구성 필요";
  }
  if ((summary.retrySuccess || 0) > 0) {
    return "재도전 효과 있음";
  }
  return "오답 검토 습관 관찰";
}

function getProfessorInsight(summary) {
  const attempted = getAttemptedStandardStats(summary);
  const weak = attempted
    .filter((standard) => standard.total >= 3)
    .sort((a, b) => getStandardAccuracy(a) - getStandardAccuracy(b))[0];

  if (!weak) {
    return {
      title: "판단 자료 축적 필요",
      body: "성취기준별 문항 수가 아직 적은 영역은 단정하지 않고, 다음 평가에서 같은 기준 문항을 더 관찰하는 편이 타당합니다."
    };
  }

  return {
    title: `${weak.code} ${weak.shortLabel} 근거 확인`,
    body: `${weak.commentLabel}에서 ${weak.correct}/${weak.total}문항 정답입니다. 지원 필요 문항 ${weak.needsSupport}개를 중심으로 개념 설명과 표상 전환을 확인하세요.`
  };
}

function getStandardStatus(standard) {
  const accuracy = getStandardAccuracy(standard);
  if (standard.total < 3) {
    return { label: "판단 보류", modifier: "observe" };
  }
  if (accuracy >= 75) {
    return { label: "강점", modifier: "strong" };
  }
  if (accuracy >= 40) {
    return { label: "보충", modifier: "practice" };
  }
  return { label: "재지도", modifier: "support" };
}

function getQuestionOutcomeLabel(questionRecord) {
  if (questionRecord.finalCorrect && (questionRecord.attemptCount || 0) <= 1) {
    return { label: "정답", modifier: "correct" };
  }
  if (questionRecord.finalCorrect) {
    return { label: "재도전", modifier: "retry" };
  }
  return { label: "오답", modifier: "wrong" };
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
      summary.growthAnalysis = analyzeStudentGrowthByQuestionType(studentRecords);
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

function analyzeStudentGrowthByQuestionType(records) {
  const states = new Map();
  const events = [...(records || [])]
    .sort((left, right) => new Date(left.savedAt || left.endedAt || 0) - new Date(right.savedAt || right.endedAt || 0))
    .flatMap((record) => (
      (Array.isArray(record.questionRecords) ? record.questionRecords : []).map((questionRecord) => ({
        record,
        questionRecord
      }))
    ));

  events.forEach(({ record, questionRecord }) => {
    const key = getQuestionTypeKey(questionRecord);
    if (!key) {
      return;
    }

    if (!states.has(key)) {
      states.set(key, {
        key,
        label: getQuestionTypeLabel(questionRecord, record),
        supportCount: 0,
        cleanAfterSupportCount: 0,
        supportOpen: false,
        lastSupportPrompt: "",
        lastSeenAt: ""
      });
    }

    const item = states.get(key);
    item.label = item.label || getQuestionTypeLabel(questionRecord, record);
    item.lastSeenAt = record.savedAt || record.endedAt || "";

    if (isQuestionRecordNeedingSupport(questionRecord)) {
      item.supportCount += 1;
      item.supportOpen = true;
      item.lastSupportPrompt = questionRecord.prompt || "";
      return;
    }

    if (item.supportOpen && isQuestionRecordCleanCorrect(questionRecord)) {
      item.cleanAfterSupportCount += 1;
      item.supportOpen = false;
    }
  });

  const supported = Array.from(states.values()).filter((item) => item.supportCount > 0);
  return {
    recovered: supported
      .filter((item) => !item.supportOpen && item.cleanAfterSupportCount > 0)
      .sort((a, b) => b.cleanAfterSupportCount - a.cleanAfterSupportCount || b.supportCount - a.supportCount),
    ongoing: supported
      .filter((item) => item.supportOpen)
      .sort((a, b) => b.supportCount - a.supportCount || a.label.localeCompare(b.label, "ko-KR"))
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

function getQuestionTypeLabel(questionRecord, record = {}) {
  if (!questionRecord) {
    return "";
  }

  const category = questionRecord.categoryName || record.categoryName || resolveQuestionCategoryLabel(questionRecord.category || record.category);
  const lesson = resolveLessonLabel(questionRecord.category || record.category, questionRecord.lessonKey || record.lessonKey);
  return [category, lesson].filter(Boolean).join(" · ") || "맞춤 유형";
}

function resolveQuestionCategoryLabel(category) {
  const bankCategories = window.Math2GameBank?.CATEGORY_NAMES || {};
  return bankCategories[category] || category || "전단원";
}

function resolveLessonLabel(category, lessonKey) {
  if (!category || !lessonKey) {
    return "";
  }

  return (window.Math2GameBank?.LESSON_OPTIONS_BY_CATEGORY?.[category] || [])
    .find((lesson) => lesson.value === lessonKey)?.label || "";
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

async function downloadStudentFeedbackPdf(studentKey, type = "practice") {
  const records = await loadLearningRecords();
  const summary = buildStudentReportSummaries(records).find((item) => item.studentKey === studentKey);
  if (!summary) {
    window.alert("PDF로 만들 학생 기록을 찾지 못했어요.");
    return;
  }

  const pdfBlob = await createStudentFeedbackPdf(summary, type);
  const fileType = type === "answer" ? "정답_설명자료" : "다시공부할문제";
  const latestStamp = getPdfLatestRecordStamp(summary);
  downloadBlob(pdfBlob, `${sanitizeFileName(summary.studentKey)}_${fileType}_${latestStamp}.pdf`);
}

async function createStudentFeedbackPdf(summary, type = "practice") {
  const questions = getStudentPdfQuestions(summary);
  const visualPayloads = await getStudentPdfVisualPayloads(questions, type);
  const blocks = buildStudentPdfBlocks(summary, type, questions, visualPayloads);
  await prepareStudentPdfVisuals(blocks);
  const pages = paginatePdfBlocks(blocks);
  const images = pages.map((pageBlocks, index) => drawStudentPdfCanvas(summary, type, pageBlocks, index + 1, pages.length));
  return buildImagePdf(images);
}

function buildStudentPdfBlocks(summary, type, questions = getStudentPdfQuestions(summary), visualPayloads = []) {
  const questionBlocks = questions.map((questionRecord, index) => {
    const visualPayload = visualPayloads[index] || buildFallbackQuestionVisualPayload(questionRecord, type);
    const explanationSteps = buildQuestionExplanationSteps(questionRecord);
    const selectedText = getQuestionRecordSelectedText(questionRecord);
    const correctText = questionRecord.correctText || visualPayload.correctText || "-";
    if (type === "answer") {
      return {
        kind: "question",
        pdfType: type,
        title: `${index + 1}. ${questionRecord.prompt || "문항"}`,
        prompt: questionRecord.prompt || visualPayload.prompt || "문항",
        category: questionRecord.category || visualPayload.category || "",
        categoryName: questionRecord.categoryName || visualPayload.categoryName || "",
        scene: questionRecord.scene || visualPayload.scene || null,
        correctText,
        selectedText,
        visualHtml: visualPayload.visualHtml || "",
        visualTitle: "게임 속 자세한 그림 설명",
        explanationSteps,
        body: `정답: ${correctText}\n${explanationSteps.join("\n")}`
      };
    }

    return {
      kind: "question",
      pdfType: type,
      title: `${index + 1}. ${questionRecord.prompt || "문항"}`,
      prompt: questionRecord.prompt || visualPayload.prompt || "문항",
      category: questionRecord.category || visualPayload.category || "",
      categoryName: questionRecord.categoryName || visualPayload.categoryName || "",
      scene: questionRecord.scene || visualPayload.scene || null,
      correctText,
      selectedText,
      visualHtml: visualPayload.visualHtml || "",
      visualTitle: "게임에서 보던 문제 그림",
      explanationSteps: [buildPracticeGuide(questionRecord, explanationSteps[0])],
      body: `내 풀이: ________________________________\n답: __________\n확인할 점: ${buildPracticeGuide(questionRecord, explanationSteps[0])}`
    };
  });

  return questionBlocks.length > 0
    ? questionBlocks
    : [{ kind: "note", title: "자료 없음", body: "아직 PDF로 만들 문항 기록이 충분하지 않습니다." }];
}

function getStudentPdfQuestions(summary) {
  const questions = [...(summary.questionRecords || [])];
  const recoveredKeys = new Set((summary.growthAnalysis?.recovered || []).map((item) => item.key));
  const priorityQuestions = questions.filter((questionRecord) => (
    (!questionRecord.finalCorrect || (questionRecord.attemptCount || 0) > 1 || (questionRecord.elapsedMs || 0) >= 12000)
    && !recoveredKeys.has(getQuestionTypeKey(questionRecord))
  ));
  const selected = priorityQuestions.length > 0 ? priorityQuestions : questions;
  return selected.slice(0, 8);
}

function buildQuestionExplanation(questionRecord) {
  return buildQuestionExplanationSteps(questionRecord)[0] || "문제에서 묻는 말과 필요한 수를 확인하면 안정적으로 풀 수 있습니다.";
}

async function getStudentPdfVisualPayloads(questions, type) {
  return Promise.all(questions.map((questionRecord) => requestQuestionVisualPayload(questionRecord, type)));
}

async function requestQuestionVisualPayload(questionRecord, type) {
  const response = await requestStorageBridge("question-visual-render", {
    questionRecord,
    revealAnswer: type === "answer"
  });

  if (response && response.visualHtml) {
    return response;
  }

  return buildFallbackQuestionVisualPayload(questionRecord, type);
}

function buildFallbackQuestionVisualPayload(questionRecord) {
  const correctText = questionRecord.correctText || "";
  return {
    visualHtml: "",
    prompt: questionRecord.prompt || "문항",
    correctText,
    category: questionRecord.category || "",
    categoryName: questionRecord.categoryName || "",
    scene: questionRecord.scene || null
  };
}

async function prepareStudentPdfVisuals(blocks) {
  const visualBlocks = blocks.filter((block) => block.kind === "question" && block.visualHtml);
  await Promise.all(visualBlocks.map(async (block) => {
    block.visualImage = await renderHtmlVisualToImage(block.visualHtml, block.pdfType);
  }));
}

async function renderHtmlVisualToImage(visualHtml, type) {
  const capture = document.createElement("div");
  capture.className = `pdf-visual-capture player-panel teacher-board-canvas ${type === "answer" ? "is-answer" : "is-practice"}`;
  capture.setAttribute("aria-hidden", "true");
  Object.assign(capture.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: type === "answer" ? "900px" : "760px",
    minHeight: "220px",
    padding: "18px",
    background: "#f5fbff",
    boxSizing: "border-box",
    overflow: "visible",
    zIndex: "-1"
  });
  capture.innerHTML = visualHtml;
  document.body.appendChild(capture);

  await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  const width = Math.ceil(capture.scrollWidth || capture.getBoundingClientRect().width || 760);
  const height = Math.ceil(capture.scrollHeight || capture.getBoundingClientRect().height || 260);
  const exportRoot = document.createElement("div");
  exportRoot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  exportRoot.className = `pdf-visual-export player-panel teacher-board-canvas ${type === "answer" ? "is-answer" : "is-practice"}`;
  exportRoot.setAttribute("style", `width:${width}px;min-height:${height}px;background:#f5fbff;box-sizing:border-box;padding:18px;font-family:'Malgun Gothic',Arial,sans-serif;`);
  const style = document.createElement("style");
  style.textContent = getPdfVisualCssText();
  exportRoot.appendChild(style);
  Array.from(capture.childNodes).forEach((node) => exportRoot.appendChild(node.cloneNode(true)));
  const serialized = new XMLSerializer().serializeToString(exportRoot);
  capture.remove();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject></svg>`;
  try {
    return await loadSvgImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width, height);
  } catch (error) {
    console.warn("PDF 그림 캡처 실패, 간단 그림으로 대체합니다.", error);
    return null;
  }
}

let cachedPdfVisualCssText = "";

function getPdfVisualCssText() {
  if (cachedPdfVisualCssText) {
    return cachedPdfVisualCssText;
  }

  const rules = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules || []).forEach((rule) => {
        rules.push(rule.cssText);
      });
    } catch (error) {
      // Same-origin CSS is available in normal use; keep a small fallback if the browser blocks it.
    }
  });
  rules.push(`
    .pdf-visual-export, .pdf-visual-export * { box-sizing: border-box; }
    .pdf-visual-export { color: #12324b; letter-spacing: 0; }
    .pdf-visual-export .feedback-visual-first,
    .pdf-visual-export .feedback-concept-visual { width: 100%; margin: 0; }
    .pdf-visual-export .concept-card,
    .pdf-visual-export .problem-visual-card { max-width: 100%; box-shadow: none !important; }
    .pdf-visual-export .student-think-prompt { font-size: 1.05rem; line-height: 1.32; }
  `);
  cachedPdfVisualCssText = rules.join("\n");
  return cachedPdfVisualCssText;
}

function loadSvgImage(src, width, height) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, width, height });
    image.onerror = reject;
    image.src = src;
  });
}

function buildPracticeGuide(questionRecord, firstStep = "") {
  const prompt = questionRecord.prompt || "";
  if (isPlaceValueQuestionRecord(questionRecord)) {
    if (/더 큰 수|큰 수|비교/.test(prompt)) {
      return "백, 십, 일 중 가장 큰 자리부터 비교하고 처음 다른 자리에 표시하세요.";
    }
    return "큰 자리부터 자리 이름을 붙이고 숫자가 뜻하는 값을 표시하세요.";
  }
  if (prompt.includes("+") || prompt.includes("-")) {
    return "그림에서 같은 자리끼리 나누어 보고, 받아올림·받아내림이 생기는 자리만 다시 표시하세요.";
  }
  if (prompt.includes("묶음") || prompt.includes("×")) {
    return "한 묶음의 수와 묶음 수를 먼저 표시한 뒤 뛰어 세어 보세요.";
  }
  if (prompt.includes("표") || prompt.includes("그래프")) {
    return "항목 이름에서 수까지 같은 줄을 손가락으로 따라가며 표시하세요.";
  }
  if (prompt.includes("시") || prompt.includes("분") || prompt.includes("달력")) {
    return "시각인지 시간인지 먼저 말하고, 시작과 끝 사이를 그림에서 세어 보세요.";
  }
  if (prompt.includes("도형") || prompt.includes("변") || prompt.includes("꼭짓점")) {
    return "이름을 외우기보다 바깥 선을 따라가며 변과 꼭짓점을 직접 세어 보세요.";
  }
  return firstStep || "문제에서 묻는 말과 필요한 수를 표시한 뒤 다시 풀어 보세요.";
}

function buildQuestionExplanationSteps(questionRecord) {
  const prompt = questionRecord.prompt || "";
  if (isPlaceValueQuestionRecord(questionRecord)) {
    return buildPlaceValueExplanationSteps(questionRecord);
  }

  const addSub = parsePdfAddSubModel(questionRecord);
  if (addSub) {
    return buildAddSubExplanationSteps(addSub);
  }

  const multiplication = parsePdfMultiplicationModel(questionRecord);
  if (multiplication) {
    if (multiplication.mode === "divide-groups") {
      return [
        `전체 ${multiplication.total}개를 한 줄로 늘어놓지 말고 ${multiplication.groups}묶음으로 나누어 봅니다.`,
        `${multiplication.each}개씩 들어가면 ${multiplication.each}×${multiplication.groups}=${multiplication.total}이므로 한 묶음은 ${multiplication.each}개입니다.`
      ];
    }
    if (multiplication.mode === "target") {
      return [
        `목표 ${multiplication.product}개가 되도록 같은 크기 묶음을 만듭니다.`,
        `${multiplication.each}개씩 ${multiplication.groups}묶음이면 ${multiplication.each}×${multiplication.groups}=${multiplication.product}입니다.`
      ];
    }
    return [
      `${multiplication.each}개씩 있는 같은 묶음이 ${multiplication.groups}개입니다.`,
      `${multiplication.each}를 ${multiplication.groups}번 뛰어 세면 ${multiplication.product}이므로 답은 ${questionRecord.correctText || multiplication.product}입니다.`
    ];
  }

  if (prompt.includes("표") || prompt.includes("그래프")) {
    return [
      "표와 그래프는 항목 이름을 먼저 찾고, 같은 줄을 가로로 따라가 수를 읽습니다.",
      `문제에서 묻는 항목만 표시하면 답은 ${questionRecord.correctText || "정답"}입니다.`
    ];
  }
  if (prompt.includes("시") || prompt.includes("분") || prompt.includes("달력")) {
    return [
      "시각은 한 순간이고 시간은 두 시각 사이의 양입니다. 시작과 끝을 먼저 나누어 봅니다.",
      `그림에서 이동한 칸이나 분을 세면 답은 ${questionRecord.correctText || "정답"}입니다.`
    ];
  }
  if (prompt.includes("도형") || prompt.includes("변") || prompt.includes("꼭짓점")) {
    return [
      "도형은 이름보다 바깥 선을 따라가며 변, 꼭짓점, 굽은 선을 직접 확인합니다.",
      `조건과 맞는 특징을 끝까지 세면 답은 ${questionRecord.correctText || "정답"}입니다.`
    ];
  }
  if (prompt.includes("자리") || prompt.includes("1000") || prompt.includes("100이")) {
    return [
      "큰 자리부터 자리집에 숫자를 넣고, 각 숫자가 몇을 뜻하는지 읽습니다.",
      `자리 이름과 숫자를 맞추면 답은 ${questionRecord.correctText || "정답"}입니다.`
    ];
  }
  if (prompt.includes("규칙")) {
    return [
      "앞의 두 칸 사이가 어떻게 변하는지 먼저 표시하고, 같은 변화가 반복되는지 확인합니다.",
      `같은 변화를 한 번 더 적용하면 답은 ${questionRecord.correctText || "정답"}입니다.`
    ];
  }

  const tags = analyzeQuestionRecordNeed(questionRecord);
  if (tags.length === 0) {
    return ["문제에서 묻는 말과 필요한 수를 확인하면 안정적으로 풀 수 있습니다."];
  }
  return [getActionForFocus(tags[0])];
}

function isPlaceValueQuestionRecord(questionRecord) {
  const prompt = questionRecord.prompt || "";
  const category = questionRecord.category || "";
  const categoryName = questionRecord.categoryName || "";
  return category === "1-1"
    || category === "2-1"
    || categoryName.includes("세 자리 수")
    || categoryName.includes("네 자리 수")
    || /자리|1000|100이|10이|1이|몇백|더 큰 수|바로 앞|바로 뒤|나타낸 수/.test(prompt);
}

function buildPlaceValueExplanationSteps(questionRecord) {
  const prompt = questionRecord.prompt || "";
  const numbers = extractNumbers(prompt);
  const correctNumber = extractFirstNumber(questionRecord.correctText);

  if (/더 큰 수|중 더 큰 수|비교/.test(prompt) && numbers.length >= 2) {
    const model = buildPlaceComparePdfModel(numbers[0], numbers[1], correctNumber);
    const label = model.labels[model.diffIndex] || "큰 자리";
    const leftDigit = model.leftDigits[model.diffIndex];
    const rightDigit = model.rightDigits[model.diffIndex];
    return [
      `${label}의 자리부터 비교합니다. 일의 자리부터 더하거나 세지 않습니다.`,
      `${model.left}은 ${label} ${leftDigit}, ${model.right}은 ${label} ${rightDigit}입니다.`,
      `${Math.max(leftDigit, rightDigit)}${numberSubjectParticle(Math.max(leftDigit, rightDigit))} 더 크므로 ${model.answer}${numberSubjectParticle(model.answer)} 더 큽니다.`
    ];
  }

  if (/작은 수부터|차례/.test(prompt) && numbers.length >= 2) {
    const sorted = [...numbers].sort((left, right) => left - right);
    return [
      "모든 수의 자리 수를 맞춰 쓰고 가장 큰 자리부터 비교합니다.",
      `작은 수부터 차례로 놓으면 ${sorted.join(" < ")}입니다.`
    ];
  }

  const target = Number.isFinite(correctNumber) ? correctNumber : numbers[0];
  const digits = getPdfPlaceDigits(target);
  return [
    `${target}${numberObjectParticle(target)} 큰 자리부터 자리집에 넣습니다.`,
    `${digits.labels.map((label, index) => `${label} ${digits.digits[index]}`).join(", ")}처럼 자리 이름을 붙여 읽습니다.`
  ];
}

function parsePdfAddSubModel(questionRecord) {
  const prompt = questionRecord.prompt || "";
  const correctNumber = extractFirstNumber(questionRecord.correctText);
  const category = questionRecord.category || "";
  const categoryName = questionRecord.categoryName || "";
  const isAddSubCategory = category === "1-3" || categoryName.includes("덧셈") || categoryName.includes("뺄셈");
  let match = prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (match && Number.isFinite(correctNumber)) {
    return { left: Number(match[1]), operator: match[2], right: Number(match[3]), result: correctNumber };
  }

  if (!isAddSubCategory) {
    return null;
  }

  const numbers = extractNumbers(prompt);
  if (numbers.length >= 2 && Number.isFinite(correctNumber)) {
    const isSub = /썼|남|빼|차이|덜|줄|잃|꺼냈|가져갔/.test(prompt);
    return { left: numbers[0], operator: isSub ? "-" : "+", right: numbers[1], result: correctNumber };
  }

  return null;
}

function buildAddSubExplanationSteps(model) {
  const left = model.left;
  const right = model.right;
  const result = model.result;
  if (model.operator === "+") {
    const onesSum = left % 10 + right % 10;
    if (onesSum >= 10) {
      return [
        `일의 자리 ${left % 10}과 ${right % 10}을 더해 정확히 10개를 먼저 묶습니다.`,
        `10개는 십 1개로 올리고, 남은 일 ${onesSum % 10}개를 적습니다.`,
        `십의 자리까지 더하면 ${result}${numberSubjectParticle(result)} 됩니다.`
      ];
    }
    return [
      `일의 자리끼리 ${left % 10}+${right % 10}을 먼저 더합니다.`,
      `십의 자리끼리 ${Math.floor(left / 10)}십과 ${Math.floor(right / 10)}십을 더해 ${result}${numberDirectionParticle(result)} 읽습니다.`
    ];
  }

  const leftOnes = left % 10;
  const rightOnes = right % 10;
  if (leftOnes < rightOnes) {
    const splitMain = Math.floor(left / 10) * 10 - 10;
    const splitOnes = leftOnes + 10;
    const rightMain = Math.floor(right / 10) * 10;
    const resultMain = splitMain - rightMain;
    const resultOnes = splitOnes - rightOnes;
    return [
      `${left}${numberObjectParticle(left)} ${splitMain}과 ${splitOnes}${numberDirectionParticle(splitOnes)} 바꿔요.`,
      `${splitMain}에서 ${rightMain}${numberObjectParticle(rightMain)} 빼고 ${splitOnes}에서 ${rightOnes}${numberObjectParticle(rightOnes)} 빼요.`,
      `${resultMain}과 ${resultOnes}${numberObjectParticle(resultOnes)} 합치면 ${result}${numberSubjectParticle(result)} 남습니다.`
    ];
  }

  return [
    `일의 자리끼리 ${leftOnes}-${rightOnes}을 먼저 뺍니다.`,
    `십의 자리끼리 ${Math.floor(left / 10)}십에서 ${Math.floor(right / 10)}십을 빼면 ${result}${numberSubjectParticle(result)} 남습니다.`
  ];
}

function parsePdfMultiplicationModel(questionRecord) {
  const prompt = questionRecord.prompt || "";
  const correctNumber = extractFirstNumber(questionRecord.correctText);
  let match = prompt.match(/모두\s*(\d+)개를\s*(\d+)묶음으로/);
  if (match && Number.isFinite(correctNumber)) {
    return { mode: "divide-groups", total: Number(match[1]), groups: Number(match[2]), each: correctNumber, product: Number(match[1]) };
  }

  match = prompt.match(/모두\s*(\d+)개를\s*(\d+)개씩/);
  if (match && Number.isFinite(correctNumber)) {
    return { mode: "group-count", total: Number(match[1]), each: Number(match[2]), groups: correctNumber, product: Number(match[1]) };
  }

  match = prompt.match(/(\d+)개를 만들 수 있는 묶음/);
  if (match) {
    const answerMatch = String(questionRecord.correctText || "").match(/(\d+)개씩\s*(\d+)묶음/);
    if (answerMatch) {
      return { mode: "target", product: Number(match[1]), each: Number(answerMatch[1]), groups: Number(answerMatch[2]) };
    }
  }

  match = prompt.match(/(\d+)\s*×\s*(\d+)/);
  if (match) {
    return { mode: "array", each: Number(match[1]), groups: Number(match[2]), product: Number(match[1]) * Number(match[2]) };
  }

  match = prompt.match(/(\d+)개씩\s*(\d+)묶음|(\d+)개씩\s*(\d+)줄/);
  if (match) {
    const each = Number(match[1] || match[3]);
    const groups = Number(match[2] || match[4]);
    return { mode: "array", each, groups, product: each * groups };
  }

  return null;
}

function paginatePdfBlocks(blocks) {
  const questionBlocks = blocks.filter((block) => block.kind === "question");
  if (!questionBlocks.length) {
    return [[{ kind: "note", title: "자료 없음", body: "아직 PDF로 만들 문항 기록이 충분하지 않습니다." }]];
  }

  const pages = [];
  for (let index = 0; index < questionBlocks.length; index += 4) {
    pages.push(questionBlocks.slice(index, index + 4));
  }
  return pages;
}

function measurePdfBlockHeight(ctx, block, maxWidth) {
  if (block.kind === "question") {
    return measurePdfQuestionBlockHeight(ctx, block, maxWidth);
  }

  ctx.font = "42px Malgun Gothic, sans-serif";
  const titleLines = wrapCanvasText(ctx, block.title, maxWidth);
  ctx.font = "32px Malgun Gothic, sans-serif";
  const bodyLines = block.body.split("\n").flatMap((line) => wrapCanvasText(ctx, line, maxWidth));
  return 38 + titleLines.length * 50 + bodyLines.length * 42 + 34;
}

function measurePdfQuestionBlockHeight(ctx, block, maxWidth) {
  ctx.font = "700 38px Malgun Gothic, sans-serif";
  const titleLines = wrapCanvasText(ctx, block.title, maxWidth - 64);
  const visualHeight = getPdfVisualDisplayHeight(block, maxWidth - 64);
  ctx.font = "30px Malgun Gothic, sans-serif";
  const explanationLines = (block.explanationSteps || [])
    .flatMap((step) => wrapCanvasText(ctx, step, maxWidth - 120));
  const answerLines = wrapCanvasText(ctx, block.pdfType === "answer"
    ? `정답: ${block.correctText || "-"}`
    : "내 풀이: ____________________    답: ________", maxWidth - 120);
  return 52 + titleLines.length * 46 + visualHeight + answerLines.length * 38 + explanationLines.length * 36 + 78;
}

function getPdfVisualDisplayHeight(block, maxWidth) {
  if (!block.visualImage) {
    return block.pdfType === "answer" ? 390 : 280;
  }

  const ratioHeight = Math.round(maxWidth * block.visualImage.height / Math.max(1, block.visualImage.width));
  const maxHeight = block.pdfType === "answer" ? 590 : 390;
  const minHeight = block.pdfType === "answer" ? 340 : 240;
  return Math.max(minHeight, Math.min(maxHeight, ratioHeight));
}

function drawStudentPdfCanvas(summary, type, blocks, pageNumber, totalPages) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  const title = type === "answer" ? "정답 및 설명 자료" : "다시 공부할 문제";
  const level = resolveStudentRecordLevel(summary);
  const plan = buildStudentFeedbackPlan(summary, level);
  const focus = getShortFocusName(summary.focusTags?.[0] || summary.weakText || "핵심 개념");
  const latestText = summary.lastSavedAt ? formatDateTime(summary.lastSavedAt) : "저장 기록 없음";
  const guideText = type === "answer"
    ? "정답은 학생이 다시 푼 뒤 필요한 부분만 짚어 주세요."
    : "답을 바로 보지 말고 문제 그림을 보며 내 풀이를 먼저 씁니다.";

  ctx.fillStyle = "#f5fbff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b4166";
  ctx.fillRect(0, 0, canvas.width, 148);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 50px Malgun Gothic, sans-serif";
  ctx.fillText(title, 64, 72);
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  ctx.fillText(`${summary.studentKey} · 정확도 ${summary.accuracyPercent}% · ${summary.questionCount}문항 누적 · 최근 반영 ${latestText}`, 66, 116);

  ctx.fillStyle = "#e9f7ff";
  roundRect(ctx, 54, 170, 1132, 58, 22);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 24px Malgun Gothic, sans-serif";
  drawLimitedCanvasText(ctx, `핵심: ${focus} · ${guideText} · 교사 판단: ${plan.diagnosis}`, 82, 207, 1076, 28, 1);

  const questionBlocks = blocks.filter((block) => block.kind === "question");
  if (questionBlocks.length) {
    getPdfQuestionGridSlots().forEach((slot, index) => {
      const block = questionBlocks[index];
      if (block) {
        drawPdfQuestionGridCell(ctx, block, slot.x, slot.y, slot.width, slot.height);
      } else {
        drawPdfEmptyQuestionCell(ctx, slot.x, slot.y, slot.width, slot.height);
      }
    });
  } else {
    drawPdfBlock(ctx, blocks[0] || { kind: "note", title: "자료 없음", body: "아직 PDF로 만들 문항 기록이 충분하지 않습니다." }, 86, 330, 1068);
  }

  ctx.fillStyle = "#668299";
  ctx.font = "24px Malgun Gothic, sans-serif";
  ctx.fillText(`보조개샘ai클래스 · ${pageNumber}/${totalPages} · 한 페이지 4문항`, 64, 1706);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function getPdfQuestionGridSlots() {
  const left = 54;
  const top = 250;
  const gap = 22;
  const width = (1240 - left * 2 - gap) / 2;
  const height = (1670 - top - gap) / 2;
  return [
    { x: left, y: top, width, height },
    { x: left + width + gap, y: top, width, height },
    { x: left, y: top + height + gap, width, height },
    { x: left + width + gap, y: top + height + gap, width, height }
  ];
}

function drawPdfQuestionGridCell(ctx, block, x, y, width, height) {
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.strokeStyle = "#b8ddf6";
  ctx.lineWidth = 3;
  ctx.stroke();

  const questionNumber = String(block.title || "").match(/^(\d+)\./)?.[1] || "";
  const titleText = String(block.title || block.prompt || "문항").replace(/^\d+\.\s*/, "");
  ctx.fillStyle = "#2f86c8";
  roundRect(ctx, x + 18, y + 22, 42, 38, 16);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Malgun Gothic, sans-serif";
  ctx.fillText(questionNumber || "?", x + 39 - ctx.measureText(questionNumber || "?").width / 2, y + 48);

  ctx.fillStyle = "#0b4166";
  ctx.font = "700 24px Malgun Gothic, sans-serif";
  drawLimitedCanvasText(ctx, titleText, x + 72, y + 45, width - 96, 30, 2);

  const visualY = y + 96;
  const visualHeight = block.pdfType === "answer" ? 318 : 300;
  ctx.fillStyle = "#f3fbff";
  roundRect(ctx, x + 18, visualY, width - 36, visualHeight, 20);
  ctx.fill();
  ctx.strokeStyle = "#d4ecfb";
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageBox = {
    x: x + 30,
    y: visualY + 12,
    width: width - 60,
    height: visualHeight - 24
  };
  if (canDrawNativePdfGraphic(block)) {
    drawNativePdfQuestionGraphic(ctx, block, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  } else if (block.visualImage) {
    drawFittedImage(ctx, block.visualImage.image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  } else {
    drawFallbackQuestionGraphic(ctx, block, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  }

  const answerY = visualY + visualHeight + 20;
  ctx.fillStyle = block.pdfType === "answer" ? "#e9f8df" : "#fff4c7";
  roundRect(ctx, x + 18, answerY, width - 36, 64, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 22px Malgun Gothic, sans-serif";
  const answerLine = block.pdfType === "answer"
    ? `정답: ${block.correctText || "-"}`
    : "내 풀이: ________________    답: ______";
  drawLimitedCanvasText(ctx, answerLine, x + 36, answerY + 28, width - 72, 26, 2);

  const steps = (block.explanationSteps || []).slice(0, block.pdfType === "answer" ? 2 : 1);
  let stepY = answerY + 96;
  steps.forEach((step, index) => {
    ctx.fillStyle = index === 0 ? "#2f86c8" : "#2fc2a3";
    roundRect(ctx, x + 22, stepY - 24, 34, 30, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 18px Malgun Gothic, sans-serif";
    ctx.fillText(String(index + 1), x + 39 - ctx.measureText(String(index + 1)).width / 2, stepY - 3);
    ctx.fillStyle = "#173451";
    ctx.font = "24px Malgun Gothic, sans-serif";
    stepY = drawLimitedCanvasText(ctx, step, x + 66, stepY, width - 92, 30, 2) + 10;
  });
}

function drawPdfEmptyQuestionCell(ctx, x, y, width, height) {
  ctx.fillStyle = "#f7fcff";
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.strokeStyle = "#d4ecfb";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#8aa8bd";
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  const text = "추가 복습 칸";
  ctx.fillText(text, x + width / 2 - ctx.measureText(text).width / 2, y + height / 2);
}

function drawLimitedCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = getLimitedCanvasTextLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function getLimitedCanvasTextLines(ctx, text, maxWidth, maxLines) {
  const lines = wrapCanvasText(ctx, text, maxWidth);
  if (lines.length <= maxLines) {
    return lines;
  }
  const limited = lines.slice(0, maxLines);
  limited[limited.length - 1] = fitCanvasText(ctx, `${limited[limited.length - 1]}...`, maxWidth);
  return limited;
}

function fitCanvasText(ctx, text, maxWidth) {
  let fitted = String(text || "");
  while (fitted.length > 3 && ctx.measureText(fitted).width > maxWidth) {
    fitted = `${fitted.slice(0, -4)}...`;
  }
  return fitted;
}

function drawPdfBlock(ctx, block, x, y, width) {
  const height = measurePdfBlockHeight(ctx, block, width);
  if (block.kind === "question") {
    return drawPdfQuestionBlock(ctx, block, x, y, width, height);
  }

  ctx.fillStyle = block.kind === "question" ? "#ffffff" : "#fff9d8";
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.strokeStyle = block.kind === "question" ? "#b8ddf6" : "#f0d36a";
  ctx.lineWidth = 3;
  ctx.stroke();

  let textY = y + 56;
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 42px Malgun Gothic, sans-serif";
  wrapCanvasText(ctx, block.title, width - 64).forEach((line) => {
    ctx.fillText(line, x + 32, textY);
    textY += 50;
  });

  ctx.fillStyle = "#173451";
  ctx.font = "32px Malgun Gothic, sans-serif";
  block.body.split("\n").forEach((paragraph) => {
    wrapCanvasText(ctx, paragraph, width - 64).forEach((line) => {
      ctx.fillText(line, x + 32, textY);
      textY += 42;
    });
    textY += 8;
  });

  return y + height + 28;
}

function drawPdfQuestionBlock(ctx, block, x, y, width, height) {
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();
  ctx.strokeStyle = "#b8ddf6";
  ctx.lineWidth = 3;
  ctx.stroke();

  let textY = y + 56;
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 38px Malgun Gothic, sans-serif";
  wrapCanvasText(ctx, block.title, width - 64).forEach((line) => {
    ctx.fillText(line, x + 32, textY);
    textY += 46;
  });

  const visualX = x + 32;
  const visualY = textY + 8;
  const visualWidth = width - 64;
  const visualHeight = getPdfVisualDisplayHeight(block, visualWidth);
  ctx.fillStyle = "#f3fbff";
  roundRect(ctx, visualX, visualY, visualWidth, visualHeight, 22);
  ctx.fill();
  ctx.strokeStyle = "#d4ecfb";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#0b4166";
  ctx.font = "700 24px Malgun Gothic, sans-serif";
  ctx.fillText(block.visualTitle || "그림 풀이", visualX + 24, visualY + 34);

  const imageBox = {
    x: visualX + 20,
    y: visualY + 48,
    width: visualWidth - 40,
    height: visualHeight - 64
  };
  if (canDrawNativePdfGraphic(block)) {
    drawNativePdfQuestionGraphic(ctx, block, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  } else if (block.visualImage) {
    drawFittedImage(ctx, block.visualImage.image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  } else {
    drawFallbackQuestionGraphic(ctx, block, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
  }

  let detailY = visualY + visualHeight + 44;
  ctx.fillStyle = block.pdfType === "answer" ? "#e9f8df" : "#fff4c7";
  roundRect(ctx, x + 32, detailY - 28, width - 64, 46, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 28px Malgun Gothic, sans-serif";
  const answerLine = block.pdfType === "answer"
    ? `정답: ${block.correctText || "-"}`
    : "내 풀이: ____________________    답: ________";
  wrapCanvasText(ctx, answerLine, width - 112).forEach((line) => {
    ctx.fillText(line, x + 56, detailY + 5);
    detailY += 36;
  });

  detailY += 18;
  ctx.font = "28px Malgun Gothic, sans-serif";
  ctx.fillStyle = "#173451";
  (block.explanationSteps || []).forEach((step, index) => {
    const badgeX = x + 48;
    const stepY = detailY;
    ctx.fillStyle = index === 0 ? "#2f86c8" : "#2fc2a3";
    roundRect(ctx, badgeX, stepY - 25, 40, 34, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 20px Malgun Gothic, sans-serif";
    ctx.fillText(String(index + 1), badgeX + 14, stepY - 2);
    ctx.fillStyle = "#173451";
    ctx.font = "28px Malgun Gothic, sans-serif";
    wrapCanvasText(ctx, step, width - 128).forEach((line) => {
      ctx.fillText(line, x + 100, detailY);
      detailY += 36;
    });
    detailY += 8;
  });

  return y + height + 28;
}

function drawFittedImage(ctx, image, x, y, width, height) {
  const scale = Math.min(width / Math.max(1, image.width), height / Math.max(1, image.height));
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function canDrawNativePdfGraphic(block) {
  return Boolean(
    parsePdfPlaceValueModel(block)
    || parsePdfAddSubModel(block)
    || parsePdfMultiplicationModel(block)
    || parsePdfGraphModel(block)
    || parsePdfTimeModel(block)
    || parsePdfShapeModel(block)
    || parsePdfLengthModel(block)
    || parsePdfPatternModel(block)
  );
}

function drawNativePdfQuestionGraphic(ctx, block, x, y, width, height) {
  const place = parsePdfPlaceValueModel(block);
  if (place) {
    drawPdfPlaceValueGraphic(ctx, place, block, x, y, width, height);
    return;
  }

  const addSub = parsePdfAddSubModel(block);
  if (addSub) {
    drawFallbackBaseTenGraphic(ctx, addSub, x, y, width, height, block.pdfType === "answer");
    return;
  }

  const multiplication = parsePdfMultiplicationModel(block);
  if (multiplication) {
    drawFallbackMultiplicationGraphic(ctx, multiplication, x, y, width, height, block.pdfType === "answer");
    return;
  }

  const graph = parsePdfGraphModel(block);
  if (graph) {
    drawPdfGraphGraphic(ctx, graph, block, x, y, width, height);
    return;
  }

  const time = parsePdfTimeModel(block);
  if (time) {
    drawPdfTimeGraphic(ctx, time, block, x, y, width, height);
    return;
  }

  const shape = parsePdfShapeModel(block);
  if (shape) {
    drawPdfShapeGraphic(ctx, shape, block, x, y, width, height);
    return;
  }

  const length = parsePdfLengthModel(block);
  if (length) {
    drawPdfLengthGraphic(ctx, length, block, x, y, width, height);
    return;
  }

  const pattern = parsePdfPatternModel(block);
  if (pattern) {
    drawPdfPatternGraphic(ctx, pattern, block, x, y, width, height);
    return;
  }

  drawFallbackQuestionGraphic(ctx, block, x, y, width, height);
}

function drawFallbackQuestionGraphic(ctx, block, x, y, width, height) {
  const prompt = block.prompt || "";
  const place = parsePdfPlaceValueModel(block);
  if (place) {
    drawPdfPlaceValueGraphic(ctx, place, block, x, y, width, height);
    return;
  }

  const addSub = parsePdfAddSubModel(block);
  if (addSub) {
    drawFallbackBaseTenGraphic(ctx, addSub, x, y, width, height, block.pdfType === "answer");
    return;
  }
  const multiplication = parsePdfMultiplicationModel(block);
  if (multiplication) {
    drawFallbackMultiplicationGraphic(ctx, multiplication, x, y, width, height, block.pdfType === "answer");
    return;
  }

  const numbers = extractNumbers(prompt).slice(0, 6);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x + 12, y + 12, width - 24, height - 24, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("문제 그림", x + 38, y + 62);
  ctx.font = "700 34px Malgun Gothic, sans-serif";
  if (numbers.length) {
    numbers.forEach((number, index) => {
      const chipX = x + 42 + index * 92;
      ctx.fillStyle = index === numbers.length - 1 ? "#fff1a6" : "#dff2ff";
      roundRect(ctx, chipX, y + 104, 70, 58, 20);
      ctx.fill();
      ctx.fillStyle = "#0b4166";
      ctx.fillText(String(number), chipX + 18, y + 144);
    });
  } else {
    wrapCanvasText(ctx, prompt, width - 90).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, x + 42, y + 118 + index * 44);
    });
  }
}

function getPdfPlaceDigits(number) {
  const normalized = Math.max(0, Number(number) || 0);
  const width = normalized >= 1000 ? 4 : 3;
  return {
    number: normalized,
    labels: width === 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"],
    digits: String(normalized).padStart(width, "0").slice(-width).split("").map(Number)
  };
}

function buildPlaceComparePdfModel(left, right, answer) {
  const width = Math.max(String(left).length, String(right).length, 3);
  const labels = width >= 4 ? ["천", "백", "십", "일"] : ["백", "십", "일"].slice(-width);
  const leftDigits = String(left).padStart(width, "0").split("").map(Number);
  const rightDigits = String(right).padStart(width, "0").split("").map(Number);
  const diffIndex = Math.max(0, leftDigits.findIndex((digit, index) => digit !== rightDigits[index]));
  const larger = Number.isFinite(answer) ? answer : Math.max(left, right);
  return {
    mode: "compare",
    left,
    right,
    answer: larger,
    labels,
    leftDigits,
    rightDigits,
    diffIndex
  };
}

function parsePdfPlaceValueModel(block) {
  if (!isPlaceValueQuestionRecord(block)) {
    return null;
  }

  const prompt = block.prompt || "";
  const numbers = extractNumbers(prompt);
  const correctNumber = extractFirstNumber(block.correctText);

  if (/더 큰 수|중 더 큰 수|비교/.test(prompt) && numbers.length >= 2) {
    return buildPlaceComparePdfModel(numbers[0], numbers[1], correctNumber);
  }

  if (/작은 수부터|차례/.test(prompt) && numbers.length >= 2) {
    return {
      mode: "order",
      numbers: numbers.slice(0, 4),
      sorted: [...numbers].sort((left, right) => left - right).slice(0, 4)
    };
  }

  if (/바로 앞|바로 뒤/.test(prompt) && numbers.length >= 1) {
    const answerNumbers = extractNumbers(block.correctText);
    const number = numbers[0];
    return {
      mode: "neighbor",
      number,
      before: answerNumbers[0] || number - 1,
      after: answerNumbers[1] || number + 1
    };
  }

  const target = Number.isFinite(correctNumber) ? correctNumber : numbers[0];
  if (!Number.isFinite(target)) {
    return null;
  }

  return {
    mode: "decompose",
    ...getPdfPlaceDigits(target)
  };
}

function drawPdfPlaceValueGraphic(ctx, model, block, x, y, width, height) {
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x + 12, y + 12, width - 24, height - 24, 18);
  ctx.fill();
  ctx.strokeStyle = "#cce6f8";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (model.mode === "compare") {
    drawPdfPlaceCompareGraphic(ctx, model, block, x, y, width, height);
    return;
  }

  if (model.mode === "order") {
    drawPdfPlaceOrderGraphic(ctx, model, block, x, y, width, height);
    return;
  }

  if (model.mode === "neighbor") {
    drawPdfPlaceNeighborGraphic(ctx, model, block, x, y, width, height);
    return;
  }

  drawPdfPlaceDecomposeGraphic(ctx, model, block, x, y, width, height);
}

function drawPdfPlaceCompareGraphic(ctx, model, block, x, y, width, height) {
  const cardGap = 28;
  const cardWidth = (width - 72 - cardGap) / 2;
  const top = y + 62;
  const cardHeight = Math.min(height - 124, 170);
  const shouldRevealAnswer = block.pdfType === "answer";
  drawPdfPlaceNumberCard(ctx, model.left, model.labels, model.leftDigits, x + 36, top, cardWidth, cardHeight, model.diffIndex, shouldRevealAnswer && model.answer === model.left);
  drawPdfPlaceNumberCard(ctx, model.right, model.labels, model.rightDigits, x + 36 + cardWidth + cardGap, top, cardWidth, cardHeight, model.diffIndex, shouldRevealAnswer && model.answer === model.right);

  const label = model.labels[model.diffIndex] || "큰 자리";
  const leftDigit = model.leftDigits[model.diffIndex];
  const rightDigit = model.rightDigits[model.diffIndex];
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("큰 자리부터 비교", x + 40, y + 42);
  ctx.fillStyle = "#fff0b8";
  roundRect(ctx, x + width / 2 - 190, y + height - 62, 380, 46, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  const compareText = shouldRevealAnswer
    ? `${label}: ${leftDigit} ${leftDigit > rightDigit ? ">" : "<"} ${rightDigit} → ${model.answer}`
    : `${label}의 자리부터 표시하기`;
  ctx.fillText(compareText, x + width / 2 - ctx.measureText(compareText).width / 2, y + height - 31);
}

function drawPdfPlaceNumberCard(ctx, number, labels, digits, x, y, width, height, diffIndex, isAnswer) {
  ctx.fillStyle = isAnswer ? "#e8fbdf" : "#f5fbff";
  roundRect(ctx, x, y, width, height, 20);
  ctx.fill();
  ctx.strokeStyle = isAnswer ? "#68d789" : "#b7ddf6";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#0b4166";
  ctx.font = "800 38px Malgun Gothic, sans-serif";
  ctx.fillText(String(number), x + 22, y + 42);

  const cellWidth = (width - 34) / labels.length;
  labels.forEach((label, index) => {
    const cellX = x + 17 + index * cellWidth;
    ctx.fillStyle = index === diffIndex ? "#fff2ab" : "#ffffff";
    roundRect(ctx, cellX, y + 62, cellWidth - 8, height - 82, 15);
    ctx.fill();
    ctx.strokeStyle = index === diffIndex ? "#e7a91a" : "#d6eafa";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#31536d";
    ctx.font = "700 20px Malgun Gothic, sans-serif";
    ctx.fillText(label, cellX + (cellWidth - 8) / 2 - ctx.measureText(label).width / 2, y + 92);
    ctx.fillStyle = "#0b4166";
    ctx.font = "800 42px Malgun Gothic, sans-serif";
    const digit = String(digits[index]);
    ctx.fillText(digit, cellX + (cellWidth - 8) / 2 - ctx.measureText(digit).width / 2, y + 138);
  });
}

function drawPdfPlaceOrderGraphic(ctx, model, block, x, y, width, height) {
  const shouldRevealAnswer = block.pdfType === "answer";
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("큰 자리부터 줄 세우기", x + 40, y + 48);
  const max = Math.max(...model.numbers, 1);
  model.numbers.forEach((number, index) => {
    const rowY = y + 76 + index * 48;
    ctx.fillStyle = "#e9f7ff";
    roundRect(ctx, x + 42, rowY, width - 84, 34, 15);
    ctx.fill();
    ctx.fillStyle = "#2f86c8";
    roundRect(ctx, x + 42, rowY, Math.max(70, (width - 84) * number / max), 34, 15);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 24px Malgun Gothic, sans-serif";
    ctx.fillText(String(number), x + 54, rowY + 25);
  });
  ctx.fillStyle = "#fff0b8";
  roundRect(ctx, x + 42, y + height - 62, width - 84, 44, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  const text = shouldRevealAnswer ? model.sorted.join(" < ") : "작은 수부터 빈칸에 쓰기";
  ctx.fillText(text, x + width / 2 - ctx.measureText(text).width / 2, y + height - 33);
}

function drawPdfPlaceNeighborGraphic(ctx, model, block, x, y, width, height) {
  const shouldRevealAnswer = block.pdfType === "answer";
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("바로 앞뒤는 한 칸만 움직이기", x + 40, y + 48);

  const slotWidth = Math.min(142, (width - 156) / 3);
  const centerY = y + 98;
  const startX = x + width / 2 - (slotWidth * 3 + 96) / 2;
  const slots = [
    { label: "바로 앞", value: shouldRevealAnswer ? model.before : "?", fill: "#f8fbff", stroke: "#9bd0ff" },
    { label: "기준 수", value: model.number, fill: "#fff5c9", stroke: "#f3c94f" },
    { label: "바로 뒤", value: shouldRevealAnswer ? model.after : "?", fill: "#f8fbff", stroke: "#9bd0ff" }
  ];

  slots.forEach((slot, index) => {
    const slotX = startX + index * (slotWidth + 48);
    ctx.fillStyle = slot.fill;
    roundRect(ctx, slotX, centerY, slotWidth, 112, 20);
    ctx.fill();
    ctx.strokeStyle = slot.stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#31536d";
    ctx.font = "700 20px Malgun Gothic, sans-serif";
    ctx.fillText(slot.label, slotX + slotWidth / 2 - ctx.measureText(slot.label).width / 2, centerY + 34);
    ctx.fillStyle = "#0b4166";
    ctx.font = "800 42px Malgun Gothic, sans-serif";
    const value = String(slot.value);
    ctx.fillText(value, slotX + slotWidth / 2 - ctx.measureText(value).width / 2, centerY + 82);
  });

  ctx.fillStyle = "#16557f";
  ctx.font = "800 24px Malgun Gothic, sans-serif";
  ["-1", "+1"].forEach((step, index) => {
    const bubbleX = startX + slotWidth + 14 + index * (slotWidth + 48);
    ctx.beginPath();
    ctx.arc(bubbleX, centerY + 56, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(step, bubbleX - ctx.measureText(step).width / 2, centerY + 64);
    ctx.fillStyle = "#16557f";
  });

  ctx.fillStyle = "#fff0b8";
  roundRect(ctx, x + 42, y + height - 62, width - 84, 44, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 24px Malgun Gothic, sans-serif";
  const text = shouldRevealAnswer ? `${model.before}, ${model.after}` : "정답 숫자는 직접 계산해서 쓰기";
  ctx.fillText(text, x + width / 2 - ctx.measureText(text).width / 2, y + height - 33);
}

function drawPdfPlaceDecomposeGraphic(ctx, model, block, x, y, width, height) {
  const shouldRevealAnswer = block.pdfType === "answer";
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("자리집에 넣어 보기", x + 40, y + 48);
  const cellWidth = Math.min(150, (width - 96) / model.labels.length);
  const startX = x + width / 2 - (cellWidth * model.labels.length) / 2;
  model.labels.forEach((label, index) => {
    const cellX = startX + index * cellWidth;
    ctx.fillStyle = "#f5fbff";
    roundRect(ctx, cellX + 6, y + 82, cellWidth - 12, 132, 18);
    ctx.fill();
    ctx.strokeStyle = "#b7ddf6";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#31536d";
    ctx.font = "700 24px Malgun Gothic, sans-serif";
    ctx.fillText(label, cellX + cellWidth / 2 - ctx.measureText(label).width / 2, y + 122);
    ctx.fillStyle = "#0b4166";
    ctx.font = "800 50px Malgun Gothic, sans-serif";
    const digit = String(model.digits[index]);
    ctx.fillText(digit, cellX + cellWidth / 2 - ctx.measureText(digit).width / 2, y + 180);
  });
  ctx.fillStyle = "#fff0b8";
  roundRect(ctx, x + 42, y + height - 62, width - 84, 44, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  const text = shouldRevealAnswer
    ? `${model.labels.map((label, index) => `${label} ${model.digits[index]}`).join(" · ")} = ${model.number}`
    : `${model.labels.map((label, index) => `${label} ${model.digits[index]}`).join(" · ")} → 수로 쓰기`;
  ctx.fillText(text, x + width / 2 - ctx.measureText(text).width / 2, y + height - 33);
}

function parsePdfGraphModel(block) {
  const prompt = block.prompt || "";
  if (!/표|그래프|조사|명|개/.test(prompt) || /개씩|묶음/.test(prompt)) {
    return null;
  }
  const sceneValues = Array.isArray(block.scene?.values) ? block.scene.values : [];
  if (sceneValues.length) {
    return { values: sceneValues.slice(0, 5), target: block.scene.target || "" };
  }
  return null;
}

function drawPdfGraphGraphic(ctx, model, block, x, y, width, height) {
  const values = model.values;
  const max = Math.max(...values.map((item) => Number(item.value) || 0), 1);
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("이름에서 수까지 가로로 따라가기", x + 40, y + 48);
  values.forEach((item, index) => {
    const rowY = y + 76 + index * 42;
    ctx.fillStyle = item.label === model.target ? "#fff0b8" : "#e9f7ff";
    roundRect(ctx, x + 42, rowY, width - 84, 32, 15);
    ctx.fill();
    ctx.fillStyle = "#2fc2a3";
    roundRect(ctx, x + 170, rowY + 7, Math.max(32, (width - 280) * Number(item.value || 0) / max), 18, 9);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 22px Malgun Gothic, sans-serif";
    ctx.fillText(String(item.label), x + 56, rowY + 24);
    ctx.fillText(`${item.value}${item.unit || ""}`, x + width - 112, rowY + 24);
  });
}

function parsePdfTimeModel(block) {
  const prompt = block.prompt || "";
  if (!/시|분|달력|요일|날짜/.test(prompt)) {
    return null;
  }
  const times = [...prompt.matchAll(/(\d{1,2})시\s*(\d{1,2})?분?/g)]
    .map((match) => ({ hour: Number(match[1]), minute: Number(match[2] || 0) }));
  const minutes = extractFirstNumber(String(prompt.match(/(\d+)분\s*(뒤|후|걸린|동안|까지)/)?.[0] || ""));
  return { times: times.slice(0, 2), minutes: Number.isFinite(minutes) ? minutes : extractFirstNumber(block.correctText) };
}

function drawPdfTimeGraphic(ctx, model, block, x, y, width, height) {
  const shouldRevealAnswer = block.pdfType === "answer";
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("시작과 끝 사이를 세기", x + 40, y + 48);
  const first = model.times[0] || { hour: 9, minute: 0 };
  const second = model.times[1] || null;
  drawPdfMiniClock(ctx, first.hour, first.minute, x + 120, y + 142, 64, "시작");
  if (second) {
    drawPdfMiniClock(ctx, second.hour, second.minute, x + width - 160, y + 142, 64, "끝");
  } else {
    ctx.fillStyle = "#e9f7ff";
    roundRect(ctx, x + width - 228, y + 80, 136, 136, 28);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "800 42px Malgun Gothic, sans-serif";
    ctx.fillText("?", x + width - 166, y + 158);
  }
  ctx.strokeStyle = "#2f86c8";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + 245, y + 145);
  ctx.lineTo(x + width - 265, y + 145);
  ctx.stroke();
  ctx.fillStyle = "#fff0b8";
  roundRect(ctx, x + width / 2 - 90, y + 114, 180, 54, 18);
  ctx.fill();
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 26px Malgun Gothic, sans-serif";
  const text = shouldRevealAnswer && Number.isFinite(model.minutes) ? `${model.minutes}분` : "몇 분";
  ctx.fillText(text, x + width / 2 - ctx.measureText(text).width / 2, y + 149);
}

function drawPdfMiniClock(ctx, hour, minute, cx, cy, radius, label) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#164f76";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = "#164f76";
  ctx.font = "700 16px Malgun Gothic, sans-serif";
  ctx.fillText("12", cx - 10, cy - radius + 22);
  ctx.fillText("6", cx - 5, cy + radius - 12);
  ctx.fillText("3", cx + radius - 24, cy + 6);
  ctx.fillText("9", cx - radius + 13, cy + 6);
  const minuteDeg = minute * 6 - 90;
  const hourDeg = ((hour % 12) * 30 + minute * 0.5) - 90;
  drawClockHand(ctx, cx, cy, radius * 0.72, minuteDeg, "#ef6f5e", 5);
  drawClockHand(ctx, cx, cy, radius * 0.48, hourDeg, "#164f76", 8);
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 22px Malgun Gothic, sans-serif";
  ctx.fillText(label, cx - ctx.measureText(label).width / 2, cy + radius + 34);
}

function drawClockHand(ctx, cx, cy, length, degrees, color, lineWidth) {
  const angle = degrees * Math.PI / 180;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  ctx.stroke();
}

function parsePdfShapeModel(block) {
  const prompt = block.prompt || "";
  if (!/도형|변|꼭짓점|삼각형|사각형|원|칠교/.test(prompt)) {
    return null;
  }
  return { target: block.correctText || "도형" };
}

function drawPdfShapeGraphic(ctx, model, block, x, y, width, height) {
  const shouldRevealAnswer = block.pdfType === "answer";
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("변과 꼭짓점을 직접 세기", x + 40, y + 48);
  const kinds = ["circle", "triangle", "square", "pentagon"];
  kinds.forEach((kind, index) => {
    const cx = x + 120 + index * Math.min(160, (width - 220) / 3);
    const cy = y + 145;
    drawPdfShape(ctx, kind, cx, cy, 48, shouldRevealAnswer && model.target.includes(getKoreanShapeName(kind)));
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 22px Malgun Gothic, sans-serif";
    const name = getKoreanShapeName(kind);
    ctx.fillText(name, cx - ctx.measureText(name).width / 2, cy + 84);
  });
}

function drawPdfShape(ctx, kind, cx, cy, size, highlight = false) {
  ctx.fillStyle = highlight ? "#fff0b8" : "#dff2ff";
  ctx.strokeStyle = highlight ? "#e79a18" : "#2f86c8";
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (kind === "circle") {
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
  } else {
    const sides = { triangle: 3, square: 4, pentagon: 5 }[kind] || 4;
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
      const px = cx + Math.cos(angle) * size;
      const py = cy + Math.sin(angle) * size;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}

function getKoreanShapeName(kind) {
  return { circle: "원", triangle: "삼각형", square: "사각형", pentagon: "오각형" }[kind] || "도형";
}

function parsePdfLengthModel(block) {
  const prompt = block.prompt || "";
  if (!/cm|m|길이|단위/.test(prompt)) {
    return null;
  }
  const values = [...prompt.matchAll(/(\d+)\s*(m|cm)/g)]
    .map((match) => ({ value: Number(match[1]), unit: match[2], cm: match[2] === "m" ? Number(match[1]) * 100 : Number(match[1]) }))
    .slice(0, 4);
  return values.length ? { values } : null;
}

function drawPdfLengthGraphic(ctx, model, block, x, y, width, height) {
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("같은 단위로 맞춰 길이 비교", x + 40, y + 48);
  const max = Math.max(...model.values.map((item) => item.cm), 1);
  model.values.forEach((item, index) => {
    const rowY = y + 88 + index * 52;
    ctx.fillStyle = "#e9f7ff";
    roundRect(ctx, x + 50, rowY, width - 100, 34, 16);
    ctx.fill();
    ctx.fillStyle = "#2fc2a3";
    roundRect(ctx, x + 50, rowY, Math.max(60, (width - 100) * item.cm / max), 34, 16);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 24px Malgun Gothic, sans-serif";
    ctx.fillText(`${item.value}${item.unit}`, x + 64, rowY + 25);
    ctx.fillText(`${item.cm}cm`, x + width - 134, rowY + 25);
  });
}

function parsePdfPatternModel(block) {
  const prompt = block.prompt || "";
  if (!/규칙|다음|□/.test(prompt)) {
    return null;
  }
  const tokens = prompt.match(/\d+|□|\?|빨강|파랑|노랑|초록|삼각형|사각형|원/g) || [];
  return tokens.length >= 3 ? { tokens: tokens.slice(0, 7) } : null;
}

function drawPdfPatternGraphic(ctx, model, block, x, y, width, height) {
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText("반복되는 가장 짧은 묶음 찾기", x + 40, y + 48);
  const gap = Math.min(112, (width - 100) / model.tokens.length);
  model.tokens.forEach((token, index) => {
    const chipX = x + 54 + index * gap;
    ctx.fillStyle = token === "□" || token === "?" ? "#fff0b8" : "#e9f7ff";
    roundRect(ctx, chipX, y + 112, gap - 12, 58, 18);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 24px Malgun Gothic, sans-serif";
    ctx.fillText(token, chipX + (gap - 12) / 2 - ctx.measureText(token).width / 2, y + 150);
  });
}

function drawFallbackBaseTenGraphic(ctx, model, x, y, width, height, revealAnswer = true) {
  const columns = model.operator === "-" ? ["처음", "바꾼 뒤", "남은 수"] : ["첫 수", "더할 수", "합친 수"];
  const cardWidth = (width - 48) / 3;
  columns.forEach((label, index) => {
    const cardX = x + 12 + index * (cardWidth + 12);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cardX, y + 18, cardWidth, height - 36, 18);
    ctx.fill();
    ctx.strokeStyle = "#b8ddf6";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 24px Malgun Gothic, sans-serif";
    ctx.fillText(label, cardX + 20, y + 58);
  });

  const values = model.operator === "-"
    ? [model.left, Math.max(0, model.left - (model.left % 10 < model.right % 10 ? 10 : 0)), revealAnswer ? model.result : null]
    : [model.left, model.right, revealAnswer ? model.result : null];
  values.forEach((value, index) => {
    const cardX = x + 12 + index * (cardWidth + 12);
    drawBaseTenValue(ctx, value, cardX + 22, y + 88, cardWidth - 44);
  });

  ctx.fillStyle = "#0b4166";
  ctx.font = "700 28px Malgun Gothic, sans-serif";
  ctx.fillText(`${model.left} ${model.operator} ${model.right} = ${revealAnswer ? model.result : "?"}`, x + 30, y + height - 24);
}

function drawBaseTenValue(ctx, value, x, y, width) {
  if (!Number.isFinite(Number(value))) {
    ctx.fillStyle = "#fff0b8";
    roundRect(ctx, x + Math.max(0, width / 2 - 34), y + 36, 68, 58, 20);
    ctx.fill();
    ctx.fillStyle = "#0b4166";
    ctx.font = "800 42px Malgun Gothic, sans-serif";
    ctx.fillText("?", x + Math.max(0, width / 2 - 8), y + 78);
    return;
  }

  const hundreds = Math.min(9, Math.floor(Math.abs(value) / 100));
  const tens = Math.min(9, Math.floor((Math.abs(value) % 100) / 10));
  const ones = Math.min(16, Math.abs(value) % 10);

  if (width < 140) {
    let cursorY = y;
    for (let index = 0; index < hundreds; index += 1) {
      const squareX = x + 8 + (index % 3) * 20;
      const squareY = cursorY + Math.floor(index / 3) * 20;
      ctx.fillStyle = "#9fe3d0";
      roundRect(ctx, squareX, squareY, 16, 16, 5);
      ctx.fill();
      ctx.strokeStyle = "#1d927d";
      ctx.stroke();
    }
    if (hundreds > 0) {
      cursorY += Math.ceil(hundreds / 3) * 20 + 8;
    }

    for (let index = 0; index < tens; index += 1) {
      const rodX = x + 8 + (index % 2) * 26;
      const rodY = cursorY + Math.floor(index / 2) * 15;
      ctx.fillStyle = "#2f86c8";
      roundRect(ctx, rodX, rodY, 22, 10, 5);
      ctx.fill();
      ctx.strokeStyle = "#0f5f93";
      ctx.stroke();
    }
    if (tens > 0) {
      cursorY += Math.ceil(tens / 2) * 15 + 10;
    }

    for (let index = 0; index < ones; index += 1) {
      const dotX = x + 8 + (index % 5) * 16;
      const dotY = cursorY + Math.floor(index / 5) * 16;
      ctx.fillStyle = "#ffd66e";
      ctx.beginPath();
      ctx.arc(dotX, dotY + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c58c21";
      ctx.stroke();
    }
    return;
  }

  const hundredStartX = x;
  const tenStartX = x + Math.max(72, width * 0.32);
  const oneStartX = x + Math.max(150, width * 0.68);

  for (let index = 0; index < hundreds; index += 1) {
    const squareX = hundredStartX + (index % 2) * 30;
    const squareY = y + Math.floor(index / 2) * 30;
    ctx.fillStyle = "#9fe3d0";
    roundRect(ctx, squareX, squareY, 24, 24, 6);
    ctx.fill();
    ctx.strokeStyle = "#1d927d";
    ctx.stroke();
  }

  for (let index = 0; index < tens; index += 1) {
    const rodX = tenStartX + (index % 2) * 34;
    const rodY = y + Math.floor(index / 2) * 18;
    ctx.fillStyle = "#2f86c8";
    roundRect(ctx, rodX, rodY, 28, 12, 6);
    ctx.fill();
    ctx.strokeStyle = "#0f5f93";
    ctx.stroke();
  }
  for (let index = 0; index < ones; index += 1) {
    const dotX = oneStartX + (index % 4) * 20;
    const dotY = y + Math.floor(index / 4) * 20;
    ctx.fillStyle = "#ffd66e";
    ctx.beginPath();
    ctx.arc(dotX, dotY + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c58c21";
    ctx.stroke();
  }
}

function drawFallbackMultiplicationGraphic(ctx, model, x, y, width, height, revealAnswer = true) {
  const groups = Math.max(1, Math.min(model.groups || 4, 8));
  const each = Math.max(1, Math.min(model.each || 4, 9));
  const groupWidth = Math.min(118, (width - 36) / groups);
  for (let group = 0; group < groups; group += 1) {
    const groupX = x + 18 + group * groupWidth;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, groupX, y + 28, groupWidth - 10, height - 88, 18);
    ctx.fill();
    ctx.strokeStyle = "#cce6f8";
    ctx.stroke();
    for (let dot = 0; dot < each; dot += 1) {
      const dotX = groupX + 20 + (dot % 3) * 22;
      const dotY = y + 58 + Math.floor(dot / 3) * 22;
      ctx.fillStyle = "#27b8aa";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#0b4166";
    ctx.font = "700 20px Malgun Gothic, sans-serif";
    ctx.fillText(`${group + 1}묶음`, groupX + 16, y + height - 38);
  }
  ctx.fillStyle = "#0b4166";
  ctx.font = "700 30px Malgun Gothic, sans-serif";
  ctx.fillText(`${model.each}×${model.groups}=${revealAnswer ? model.product : "?"}`, x + 30, y + height - 8);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const source = String(text || "");
  const words = source.includes(" ") ? source.split(" ") : Array.from(source);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const joiner = source.includes(" ") && line ? " " : "";
    const next = `${line}${joiner}${word}`;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function buildImagePdf(imageDataUrls) {
  const pageWidth = 595;
  const pageHeight = 842;
  const objects = [];
  const pageObjects = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");

  imageDataUrls.forEach((dataUrl, index) => {
    const imageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    const pageObjectNumber = objects.length + 3;
    const imageBinary = atob(dataUrl.split(",")[1] || "");
    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im${index + 1} Do Q`;

    objects.push(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBinary.length} >>\nstream\n${imageBinary}\nendstream`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    pageObjects.push(pageObjectNumber);
  });

  objects[1] = `<< /Type /Pages /Count ${pageObjects.length} /Kids [${pageObjects.map((number) => `${number} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }

  return new Blob([bytes], { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function sanitizeFileName(value) {
  return String(value || "학생").replace(/[\\/:*?"<>|]/g, "_");
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
  if (!message || typeof message !== "object" || !message.storageBridgeRequestId || !String(message.type || "").endsWith("-response")) {
    return;
  }

  const request = storageBridgeRequests.get(message.storageBridgeRequestId);
  if (!request) {
    return;
  }

  window.clearTimeout(request.timeoutHandle);
  storageBridgeRequests.delete(message.storageBridgeRequestId);
  if (Object.prototype.hasOwnProperty.call(message, "records")) {
    request.resolve(message.records);
    return;
  }
  request.resolve(message);
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
    }, type === "question-visual-render" ? 3500 : 1200);

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

function extractFirstNumber(text) {
  const match = String(text || "").replace(/,/g, "").match(/-?\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

function extractNumbers(text) {
  return (String(text || "").replace(/,/g, "").match(/-?\d+/g) || []).map(Number);
}

function numberLastDigit(value) {
  const number = Math.abs(Number(value));
  return Number.isFinite(number) ? number % 10 : 0;
}

function numberHasFinalConsonant(value) {
  return [0, 1, 3, 6, 7, 8].includes(numberLastDigit(value));
}

function numberSubjectParticle(value) {
  return numberHasFinalConsonant(value) ? "이" : "가";
}

function numberObjectParticle(value) {
  return numberHasFinalConsonant(value) ? "을" : "를";
}

function numberDirectionParticle(value) {
  const lastDigit = numberLastDigit(value);
  const endsWithRieul = [1, 7, 8].includes(lastDigit);
  return numberHasFinalConsonant(value) && !endsWithRieul ? "으로" : "로";
}

function getQuestionRecordSelectedText(questionRecord) {
  const attempts = Array.isArray(questionRecord.attempts) ? questionRecord.attempts : [];
  const wrongAttempt = attempts.find((attempt) => !attempt.correct);
  return wrongAttempt?.selectedText || questionRecord.wrongSelections?.[0] || "";
}

function getPdfLatestRecordStamp(summary) {
  const latest = summary?.lastSavedAt ? new Date(summary.lastSavedAt) : new Date();
  if (Number.isNaN(latest.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const y = latest.getFullYear();
  const m = String(latest.getMonth() + 1).padStart(2, "0");
  const d = String(latest.getDate()).padStart(2, "0");
  const hh = String(latest.getHours()).padStart(2, "0");
  const mm = String(latest.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}${mm}`;
}
