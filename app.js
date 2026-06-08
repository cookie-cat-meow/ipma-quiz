let allQuestions = [];
let activeQuestions = [];
let currentIndex = 0;
let selectedAnswer = null;
let correctCount = 0;
let answered = false;
let currentMode = "all";

let quizAnswers = [];

const QUIZ_SIZE = 50;
const WRONG_STORAGE_KEY = "ipma_wrong_questions";

const progress = document.getElementById("progress");
const correctCountEl = document.getElementById("correctCount");
const questionText = document.getElementById("questionText");
const optionsBox = document.getElementById("optionsBox");
const submitBtn = document.getElementById("submitBtn");
const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");
const yourAnswer = document.getElementById("yourAnswer");
const correctAnswer = document.getElementById("correctAnswer");
const explanationText = document.getElementById("explanationText");
const explanationSource = document.getElementById("explanationSource");
const referenceSource = document.getElementById("referenceSource");
const reviewStatus = document.getElementById("reviewStatus");
const nextBtn = document.getElementById("nextBtn");

const allModeBtn = document.getElementById("allModeBtn");
const randomModeBtn = document.getElementById("randomModeBtn");
const wrongModeBtn = document.getElementById("wrongModeBtn");
const quizModeBtn = document.getElementById("quizModeBtn");
const clearWrongBtn = document.getElementById("clearWrongBtn");
const jumpInput = document.getElementById("jumpInput");
const jumpBtn = document.getElementById("jumpBtn");

function getWrongQuestionIds() {
  try {
    const raw = localStorage.getItem(WRONG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.map(Number).filter((id) => Number.isFinite(id)))];
  } catch (error) {
    return [];
  }
}

function saveWrongQuestionIds(ids) {
  const uniqueIds = [...new Set(ids)];
  localStorage.setItem(WRONG_STORAGE_KEY, JSON.stringify(uniqueIds));
}

function addWrongQuestion(id) {
  const ids = getWrongQuestionIds();

  if (!ids.includes(id)) {
    ids.push(id);
    saveWrongQuestionIds(ids);
  }
}

function removeWrongQuestion(id) {
  const ids = getWrongQuestionIds().filter((item) => item !== id);
  saveWrongQuestionIds(ids);
}

function clearWrongQuestions() {
  const wrongCount = getWrongQuestionIds().length;

  if (wrongCount === 0) {
    alert("目前沒有錯題紀錄可清除。");
    return;
  }

  const confirmed = confirm("確定要清除所有錯題紀錄嗎？");
  if (!confirmed) return;

  saveWrongQuestionIds([]);
  updateModeButtons();

  if (currentMode === "wrong") {
    currentIndex = 0;
    buildActiveQuestions();
    renderQuestion();
  } else {
    alert("錯題紀錄已清除。");
  }
}

function shuffleQuestions(questions) {
  const shuffled = [...questions];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

function buildActiveQuestions() {
  const wrongIds = new Set(getWrongQuestionIds());

  if (currentMode === "wrong") {
    activeQuestions = allQuestions.filter((question) => wrongIds.has(question.id));
  } else if (currentMode === "random") {
    activeQuestions = shuffleQuestions(allQuestions);
  } else if (currentMode === "quiz") {
    activeQuestions = shuffleQuestions(allQuestions).slice(0, QUIZ_SIZE);
  } else {
    activeQuestions = [...allQuestions];
  }

  if (currentIndex >= activeQuestions.length) {
    currentIndex = 0;
  }
}

function updateModeButtons() {
  const wrongCount = getWrongQuestionIds().length;

  allModeBtn.classList.toggle("active", currentMode === "all");
  randomModeBtn.classList.toggle("active", currentMode === "random");
  wrongModeBtn.classList.toggle("active", currentMode === "wrong");
  quizModeBtn.classList.toggle("active", currentMode === "quiz");

  wrongModeBtn.textContent = `錯題本（${wrongCount}）`;
}

function setMode(mode) {
  currentMode = mode;
  currentIndex = 0;
  selectedAnswer = null;
  answered = false;
  correctCount = 0;

  if (mode === "quiz") {
    quizAnswers = [];
  }

  buildActiveQuestions();
  updateModeButtons();
  renderQuestion();
}

function jumpToQuestion() {
  const targetId = Number(jumpInput.value);

  if (!Number.isInteger(targetId)) {
    alert("請輸入有效的題號。");
    return;
  }

  if (targetId < 1 || targetId > allQuestions.length) {
    alert(`題號範圍為 1 到 ${allQuestions.length}。`);
    return;
  }

  if (currentMode === "quiz") {
    alert("測驗模式中不支援跳題，請先切回全部題目、隨機出題或錯題本模式。");
    return;
  }

  const targetIndex = allQuestions.findIndex((question) => question.id === targetId);

  if (targetIndex === -1) {
    alert("找不到這個題號。");
    return;
  }

  currentMode = "all";
  activeQuestions = [...allQuestions];
  currentIndex = targetIndex;
  selectedAnswer = null;
  answered = false;

  resultBox.classList.add("hidden");
  submitBtn.style.display = "block";

  updateModeButtons();
  renderQuestion();

  jumpInput.value = "";
}

async function loadQuestions() {
  try {
    const response = await fetch("questions.json");

    if (!response.ok) {
      throw new Error("無法讀取 questions.json");
    }

    allQuestions = await response.json();
    buildActiveQuestions();
    updateModeButtons();
    renderQuestion();
  } catch (error) {
    questionText.textContent = "題庫載入失敗，請確認 questions.json 是否放在同一個資料夾。";
    progress.textContent = error.message;
    optionsBox.innerHTML = "";
    submitBtn.style.display = "none";
  }
}

function renderEmptyWrongMode() {
  progress.textContent = "錯題本模式｜共 0 題";
  correctCountEl.textContent = correctCount;

  questionText.innerHTML = `
    <div class="empty-message">
      目前錯題本是空的。<br>
      你可以先切回「全部題目」或「隨機出題」模式作答，答錯的題目會自動加入錯題本。
    </div>
  `;

  optionsBox.innerHTML = "";
  submitBtn.style.display = "none";
  resultBox.classList.add("hidden");
}

function renderQuestion() {
  updateModeButtons();

  if (currentMode === "wrong" && activeQuestions.length === 0) {
    renderEmptyWrongMode();
    return;
  }

  const question = activeQuestions[currentIndex];

  if (!question) {
    questionText.textContent = "目前沒有題目可顯示。";
    progress.textContent = "請稍後再試";
    optionsBox.innerHTML = "";
    submitBtn.style.display = "none";
    resultBox.classList.add("hidden");
    return;
  }

  selectedAnswer = null;
  answered = false;

  if (currentMode === "wrong") {
    progress.textContent = `錯題本模式｜第 ${currentIndex + 1} 題 / 共 ${activeQuestions.length} 題`;
  } else if (currentMode === "random") {
    progress.textContent = `隨機出題模式｜第 ${currentIndex + 1} 題 / 共 ${activeQuestions.length} 題`;
  } else if (currentMode === "quiz") {
    progress.textContent = `測驗模式｜第 ${currentIndex + 1} 題 / 共 ${activeQuestions.length} 題`;
  } else {
    progress.textContent = `第 ${currentIndex + 1} 題 / 共 ${activeQuestions.length} 題`;
  }

  correctCountEl.textContent = correctCount;
  questionText.textContent = `${question.id}. ${question.question}`;

  optionsBox.innerHTML = "";
  resultBox.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.style.display = "block";
  submitBtn.textContent = currentMode === "quiz" ? "送出並下一題" : "送出答案";

  const optionKeys = ["A", "B", "C", "D"];

  optionKeys.forEach((key) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.type = "button";
    button.textContent = `${key}. ${question.options[key]}`;

    button.addEventListener("click", () => {
      if (answered) return;

      selectedAnswer = key;
      submitBtn.disabled = false;

      document.querySelectorAll(".option-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });

      button.classList.add("selected");
    });

    optionsBox.appendChild(button);
  });
}

function submitAnswer() {
  if (!selectedAnswer || answered) return;

  if (currentMode === "quiz") {
    submitQuizAnswer();
    return;
  }

  answered = true;

  const question = activeQuestions[currentIndex];
  const isCorrect = selectedAnswer === question.correctAnswer;

  if (isCorrect) {
    correctCount++;
    removeWrongQuestion(question.id);
  } else {
    addWrongQuestion(question.id);
  }

  correctCountEl.textContent = correctCount;
  updateModeButtons();

  document.querySelectorAll(".option-btn").forEach((btn) => {
    const optionKey = btn.textContent.trim().charAt(0);

    if (optionKey === question.correctAnswer) {
      btn.classList.add("correct");
    }

    if (optionKey === selectedAnswer && selectedAnswer !== question.correctAnswer) {
      btn.classList.add("wrong");
    }
  });

  resultBox.classList.remove("hidden");
  submitBtn.style.display = "none";

  resultText.textContent = isCorrect ? "答對了" : "答錯了";
  resultText.className = isCorrect ? "result-correct" : "result-wrong";

  yourAnswer.textContent = `你的答案：${selectedAnswer}`;
  correctAnswer.textContent = `正確答案：${question.correctAnswer}`;

  explanationText.textContent =
    question.aiExplanation && question.aiExplanation.trim() !== ""
      ? question.aiExplanation
      : "目前尚未建立 AI 詳解。";

  const generatorInfo = question.explanationGenerator && question.explanationModel
    ? `${question.explanationSource || "無"}｜${question.explanationGenerator}｜${question.explanationModel}`
    : `${question.explanationSource || "無"}`;

  explanationSource.textContent = `詳解來源：${generatorInfo}`;
  referenceSource.textContent = `參考來源：${question.referenceSource || "無"}`;
  reviewStatus.textContent = `審核狀態：${question.reviewStatus || "無詳解"}`;
}

function submitQuizAnswer() {
  const question = activeQuestions[currentIndex];
  const isCorrect = selectedAnswer === question.correctAnswer;

  quizAnswers.push({
    questionId: question.id,
    questionText: question.question,
    options: question.options,
    selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    aiExplanation: question.aiExplanation || "目前尚未建立詳解。",
    explanationSource: question.explanationSource || "無",
    explanationGenerator: question.explanationGenerator || "無",
    explanationModel: question.explanationModel || "無",
    referenceSource: question.referenceSource || "無",
    reviewStatus: question.reviewStatus || "未審核"
  });

  if (isCorrect) {
    correctCount++;
    removeWrongQuestion(question.id);
  } else {
    addWrongQuestion(question.id);
  }

  correctCountEl.textContent = correctCount;
  updateModeButtons();

  if (currentIndex < activeQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    renderQuizSummary();
  }
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderQuizSummary() {
  const total = quizAnswers.length;
  const correct = quizAnswers.filter((item) => item.isCorrect).length;
  const wrong = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  progress.textContent = "測驗完成";
  correctCountEl.textContent = correct;

  questionText.textContent = "50 題測驗結果";
  submitBtn.style.display = "none";
  resultBox.classList.add("hidden");

  const reviewItems = quizAnswers.map((item, index) => {
    const statusClass = item.isCorrect ? "correct-review" : "wrong-review";
    const statusText = item.isCorrect ? "答對" : "答錯";

    return `
      <div class="review-item ${statusClass}">
        <p><strong>${index + 1}. 原題號 ${item.questionId}</strong>｜${statusText}</p>
        <p>${escapeHtml(item.questionText)}</p>
        <p>你的答案：${item.selectedAnswer}. ${escapeHtml(item.options[item.selectedAnswer])}</p>
        <p>正確答案：${item.correctAnswer}. ${escapeHtml(item.options[item.correctAnswer])}</p>

        <div class="review-explanation">
          <strong>詳解</strong>
          <p>${escapeHtml(item.aiExplanation)}</p>
          <div class="review-meta">
            <p>詳解來源：${escapeHtml(item.explanationSource)}｜${escapeHtml(item.explanationGenerator)}｜${escapeHtml(item.explanationModel)}</p>
            <p>參考來源：${escapeHtml(item.referenceSource)}</p>
            <p>審核狀態：${escapeHtml(item.reviewStatus)}</p>
          </div>
        </div>
      </div>
    `;
  }).join("");

  optionsBox.innerHTML = `
    <section class="quiz-summary">
      <h3>測驗完成</h3>

      <div class="quiz-stats">
        <div class="quiz-stat-card">
          總題數
          <strong>${total}</strong>
        </div>
        <div class="quiz-stat-card">
          答對
          <strong>${correct}</strong>
        </div>
        <div class="quiz-stat-card">
          答錯
          <strong>${wrong}</strong>
        </div>
        <div class="quiz-stat-card">
          正確率
          <strong>${accuracy}%</strong>
        </div>
      </div>

      <button class="restart-quiz-btn" type="button" onclick="restartQuizMode()">
        重新開始 50 題測驗
      </button>

      <div class="review-list">
        <h3>作答結果</h3>
        ${reviewItems}
      </div>
    </section>
  `;
}

function restartQuizMode() {
  currentMode = "quiz";
  currentIndex = 0;
  selectedAnswer = null;
  answered = false;
  correctCount = 0;
  quizAnswers = [];

  buildActiveQuestions();
  updateModeButtons();
  renderQuestion();
}

function nextQuestion() {
  if (activeQuestions.length === 0) return;

  if (currentMode === "wrong") {
    const currentQuestionId = activeQuestions[currentIndex]?.id;
    const stillWrong = getWrongQuestionIds().includes(currentQuestionId);

    buildActiveQuestions();

    if (activeQuestions.length === 0) {
      currentIndex = 0;
      renderQuestion();
      return;
    }

    if (stillWrong) {
      const currentPos = activeQuestions.findIndex((q) => q.id === currentQuestionId);
      currentIndex = currentPos + 1;
    }

    if (currentIndex >= activeQuestions.length) {
      currentIndex = 0;
    }

    renderQuestion();
    return;
  }

  if (currentIndex < activeQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    if (currentMode === "random") {
      alert(`本輪隨機題目已完成！共答對 ${correctCount} 題 / ${activeQuestions.length} 題。系統將重新洗牌。`);
      currentIndex = 0;
      correctCount = 0;
      buildActiveQuestions();
      renderQuestion();
      return;
    }

    alert(`已完成全部題目！共答對 ${correctCount} 題 / ${activeQuestions.length} 題`);
    currentIndex = 0;
    correctCount = 0;
    buildActiveQuestions();
    renderQuestion();
  }
}

submitBtn.addEventListener("click", submitAnswer);
nextBtn.addEventListener("click", nextQuestion);

allModeBtn.addEventListener("click", () => setMode("all"));
randomModeBtn.addEventListener("click", () => setMode("random"));
wrongModeBtn.addEventListener("click", () => setMode("wrong"));
quizModeBtn.addEventListener("click", () => setMode("quiz"));
clearWrongBtn.addEventListener("click", clearWrongQuestions);

jumpBtn.addEventListener("click", jumpToQuestion);

jumpInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    jumpToQuestion();
  }
});

loadQuestions();