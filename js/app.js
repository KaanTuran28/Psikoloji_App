/**
 * app.js
 * Wires the ClinicalEngine to the DOM. Pure vanilla JS, no build step.
 */

let engine = null;
let gameData = null;

const els = {};

// Turkish labels for question categories (data/patients.json -> questions[].category)
const QUESTION_CATEGORIES = {
  mood: { label: "Duygudurum", icon: "🧠" },
  somatic: { label: "Bedensel Belirtiler", icon: "🫀" },
  cognitive: { label: "Bilişsel", icon: "💭" },
  behavior: { label: "Davranış", icon: "🎭" },
  risk: { label: "Risk Değerlendirmesi", icon: "⚠️" },
  psychosocial: { label: "Psikososyal", icon: "🏠" }
};

// Question groups the player collapsed — preserved across re-renders.
const collapsedCategories = new Set();

const DIFFICULTY_STORAGE_KEY = "psikotarama_difficulty";
let selectedDifficulty = loadDifficulty();

// Incremental dialogue rendering: how many engine.dialogueLog entries are
// already in the DOM (avoids rebuilding the whole log on every action).
let renderedDialogueCount = 0;

// Time-up warning sound should fire once per case.
let timeUpSoundPlayed = false;

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindStaticEvents();
  renderDifficultyControls();
  syncMuteButton();
  loadData();
  renderHistory();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker kaydı başarısız:", err);
      });
    });
  }
}

function cacheElements() {
  els.btnNewCase = document.getElementById("btn-new-case");
  els.startOverlay = document.getElementById("start-overlay");
  els.startLoading = document.getElementById("start-loading");
  els.startWelcome = document.getElementById("start-welcome");
  els.btnStartFirstCase = document.getElementById("btn-start-first-case");

  els.difficultySelect = document.getElementById("difficulty-select");
  els.difficultyCards = document.getElementById("difficulty-cards");
  els.mobileTabs = document.getElementById("mobile-tabs");
  els.btnMute = document.getElementById("btn-mute");

  els.patientAvatar = document.getElementById("patient-avatar");
  els.patientName = document.getElementById("patient-name");
  els.patientMeta = document.getElementById("patient-meta");
  els.caseBrief = document.getElementById("case-brief");

  els.timeValue = document.getElementById("time-value");
  els.rapportFill = document.getElementById("rapport-fill");
  els.rapportValue = document.getElementById("rapport-value");

  els.testButtons = document.getElementById("test-buttons");
  els.testResults = document.getElementById("test-results");
  els.caseHistory = document.getElementById("case-history");
  els.btnClearHistory = document.getElementById("btn-clear-history");

  els.dialogueLog = document.getElementById("dialogue-log");
  els.questionButtons = document.getElementById("question-buttons");
  els.timeUpBanner = document.getElementById("time-up-banner");

  els.criteriaList = document.getElementById("criteria-list");
  els.diagnosisOptions = document.getElementById("diagnosis-options");
  els.btnSubmitDiagnosis = document.getElementById("btn-submit-diagnosis");

  els.resultOverlay = document.getElementById("result-overlay");
  els.resultBody = document.getElementById("result-body");
  els.btnRestart = document.getElementById("btn-restart");
}

function bindStaticEvents() {
  els.btnNewCase.addEventListener("click", startNewCase);
  els.btnStartFirstCase.addEventListener("click", startNewCase);
  els.btnRestart.addEventListener("click", () => {
    hide(els.resultOverlay);
    startNewCase();
  });
  els.btnSubmitDiagnosis.addEventListener("click", handleSubmitDiagnosis);
  els.btnClearHistory.addEventListener("click", clearHistory);

  els.difficultySelect.addEventListener("change", () => {
    setDifficulty(els.difficultySelect.value);
  });

  els.mobileTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".mobile-tab");
    if (tab) setActivePanel(tab.dataset.panel);
  });

  els.btnMute.addEventListener("click", () => {
    SoundFX.toggleMuted();
    syncMuteButton();
  });

  document.addEventListener("keydown", handleShortcut);
}

// ---------------------------------------------------------------------
// Keyboard shortcuts & sound toggle
// ---------------------------------------------------------------------

function handleShortcut(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const target = e.target;
  if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;

  switch (e.key.toLowerCase()) {
    case "h":
      setActivePanel("sidebar");
      break;
    case "g":
      setActivePanel("interview");
      break;
    case "t":
      setActivePanel("notepad");
      break;
    case "y":
      if (!els.btnNewCase.disabled) startNewCase();
      break;
    case "m":
      SoundFX.toggleMuted();
      syncMuteButton();
      break;
  }
}

function syncMuteButton() {
  const muted = SoundFX.isMuted();
  els.btnMute.textContent = muted ? "🔇" : "🔊";
  els.btnMute.setAttribute("aria-pressed", String(muted));
}

async function loadData() {
  try {
    const res = await fetch("data/patients.json");
    gameData = await res.json();
    engine = new ClinicalEngine(gameData);
    els.btnNewCase.disabled = false;
    hide(els.startLoading);
    show(els.startWelcome);
    els.btnStartFirstCase.focus();
  } catch (err) {
    els.startOverlay.querySelector("p").textContent =
      "Veri dosyası yüklenemedi. Lütfen sayfayı bir yerel sunucu üzerinden açtığınızdan emin olun.";
    console.error("patients.json yüklenemedi:", err);
  }
}

// ---------------------------------------------------------------------
// Difficulty selection
// ---------------------------------------------------------------------

function loadDifficulty() {
  const stored = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return DIFFICULTIES[stored] ? stored : "normal";
}

function setDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  selectedDifficulty = id;
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, id);
  } catch (err) {
    /* storage unavailable — selection still works for this session */
  }
  syncDifficultyUI();
}

function renderDifficultyControls() {
  // Topbar <select>
  els.difficultySelect.innerHTML = "";
  Object.values(DIFFICULTIES).forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.icon} ${d.label}`;
    els.difficultySelect.appendChild(opt);
  });

  // Welcome overlay cards
  els.difficultyCards.innerHTML = "";
  Object.values(DIFFICULTIES).forEach((d) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "difficulty-card";
    card.dataset.difficulty = d.id;

    const stats = [
      `⏱ ${d.startTime} dk`,
      `🤝 ${d.startRapport} güven`,
      d.testTimeMultiplier > 1 ? `🧪 +%${Math.round((d.testTimeMultiplier - 1) * 100)} test süresi` : null,
      d.distractorCount > 1 ? `🌀 ${d.distractorCount} dikkat dağıtıcı` : null,
      d.vagueTestResults ? "📉 kaba test sonucu" : null
    ].filter(Boolean).join(" · ");

    card.innerHTML = `
      <span class="difficulty-card-icon">${d.icon}</span>
      <span class="difficulty-card-name">${d.label}</span>
      <span class="difficulty-card-desc">${d.description}</span>
      <span class="difficulty-card-stats">${stats}</span>
    `;
    card.addEventListener("click", () => setDifficulty(d.id));
    els.difficultyCards.appendChild(card);
  });

  syncDifficultyUI();
}

function syncDifficultyUI() {
  els.difficultySelect.value = selectedDifficulty;
  els.difficultyCards.querySelectorAll(".difficulty-card").forEach((card) => {
    card.classList.toggle(
      "difficulty-card--selected",
      card.dataset.difficulty === selectedDifficulty
    );
  });
}

// ---------------------------------------------------------------------
// Mobile tab navigation (narrow screens show one panel at a time)
// ---------------------------------------------------------------------

function setActivePanel(name) {
  els.mobileTabs.querySelectorAll(".mobile-tab").forEach((tab) => {
    const active = tab.dataset.panel === name;
    tab.classList.toggle("mobile-tab--active", active);
    if (active) tab.setAttribute("aria-current", "true");
    else tab.removeAttribute("aria-current");
  });
  document.querySelectorAll(".layout > .panel").forEach((panel) => {
    panel.classList.toggle("panel--active", panel.classList.contains(name));
  });
}

// ---------------------------------------------------------------------
// Case lifecycle
// ---------------------------------------------------------------------

function startNewCase() {
  if (
    engine.patient &&
    !engine.diagnosisSubmitted &&
    (engine.dialogueLog.length > 0 || engine.notepad.size > 0)
  ) {
    if (!confirm("Mevcut vaka henüz tamamlanmadı. Yine de yeni bir vaka başlatılsın mı?")) return;
  }

  engine.generateCase(selectedDifficulty);
  collapsedCategories.clear();
  renderedDialogueCount = 0;
  timeUpSoundPlayed = false;
  hide(els.startOverlay);
  hide(els.resultOverlay);

  renderPatientInfo();
  renderVitals();
  renderTests();
  renderTestResults();
  renderDialogueLog();
  renderQuestions();
  renderCriteria();
  renderDiagnosisOptions();
  setActivePanel("interview");
}

function renderPatientInfo() {
  const p = engine.patient;
  const d = engine.difficulty;
  els.patientAvatar.textContent = getInitials(p.name);
  els.patientName.textContent = p.name;
  els.patientMeta.textContent =
    `${p.age} yaşında · ${p.occupation} · ${d.icon} ${d.label}`;
  els.caseBrief.textContent = p.caseBrief;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function renderVitals() {
  els.timeValue.textContent = `${engine.timeRemaining} dk`;
  const pct = engine.rapport;
  els.rapportFill.style.width = `${pct}%`;
  els.rapportValue.textContent = `${pct}/100`;

  // Rapport bar color: red when the patient may lie, amber when shaky.
  const lieThreshold = engine.difficulty.lieThreshold;
  els.rapportFill.classList.toggle("rapport-fill--low", pct < lieThreshold);
  els.rapportFill.classList.toggle("rapport-fill--mid", pct >= lieThreshold && pct < 70);

  const timedOut = engine.gameOver && !engine.diagnosisSubmitted;
  els.timeValue.classList.toggle("vital-critical", timedOut);
  els.timeValue.classList.toggle(
    "vital-warning",
    !timedOut && !engine.diagnosisSubmitted && engine.timeRemaining <= 10
  );

  renderTimeUpBanner();
}

function renderTimeUpBanner() {
  if (engine.gameOver && !engine.diagnosisSubmitted) {
    show(els.timeUpBanner);
    if (!timeUpSoundPlayed) {
      timeUpSoundPlayed = true;
      SoundFX.warning();
    }
  } else {
    hide(els.timeUpBanner);
  }
}

// ---------------------------------------------------------------------
// Tests panel
// ---------------------------------------------------------------------

function renderTests() {
  els.testButtons.innerHTML = "";
  gameData.tests.forEach((test) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-test";

    const label = document.createElement("span");
    label.className = "btn-question-text";
    label.textContent = test.label;

    const cost = document.createElement("span");
    cost.className = "btn-cost";
    cost.textContent = `−${engine.getTestTimeCost(test)} dk`;

    btn.appendChild(label);
    btn.appendChild(cost);

    btn.disabled = engine.completedTestIds.has(test.id) || engine.gameOver;
    btn.addEventListener("click", () => {
      engine.runTest(test.id);
      SoundFX.test();
      renderVitals();
      renderTests();
      renderTestResults();
      renderDialogueLog();
      renderQuestions();
    });
    els.testButtons.appendChild(btn);
  });
}

function renderTestResults() {
  els.testResults.innerHTML = "";
  const entries = Object.values(engine.testResults);
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted-note";
    empty.textContent = "Henüz test uygulanmadı.";
    els.testResults.appendChild(empty);
    return;
  }
  entries.forEach((r) => {
    const row = document.createElement("div");
    row.className = `test-result test-result--${r.verdict === "Yüksek" ? "high" : r.verdict === "Orta" ? "mid" : "low"}`;
    const scoreText = r.vague ? r.verdict : `%${r.score} · ${r.verdict}`;
    row.innerHTML = `<span class="test-result-label">${r.label}</span><span class="test-result-score">${scoreText}</span>`;
    els.testResults.appendChild(row);
  });
}

// ---------------------------------------------------------------------
// Dialogue / interview panel
// ---------------------------------------------------------------------

function renderQuestions() {
  els.questionButtons.innerHTML = "";

  // Group questions by category, preserving data order.
  const groups = new Map();
  gameData.questions.forEach((q) => {
    const cat = q.category || "other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(q);
  });

  groups.forEach((questions, cat) => {
    const meta = QUESTION_CATEGORIES[cat] || { label: cat, icon: "🗂" };
    const askedCount = questions.filter((q) => engine.askedQuestionIds.has(q.id)).length;

    const group = document.createElement("details");
    group.className = "question-group";
    group.open = !collapsedCategories.has(cat);
    group.addEventListener("toggle", () => {
      if (group.open) collapsedCategories.delete(cat);
      else collapsedCategories.add(cat);
    });

    const summary = document.createElement("summary");
    summary.innerHTML =
      `<span class="question-group-title">${meta.icon} ${meta.label}</span>` +
      `<span class="question-group-count">${askedCount}/${questions.length}</span>`;
    group.appendChild(summary);

    const grid = document.createElement("div");
    grid.className = "question-grid";

    questions.forEach((q) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-question";

      const text = document.createElement("span");
      text.className = "btn-question-text";
      text.textContent = q.text;

      const cost = document.createElement("span");
      cost.className = "btn-cost";
      cost.textContent = `−${q.timeCost || 5} dk`;

      btn.appendChild(text);
      btn.appendChild(cost);

      btn.disabled = engine.askedQuestionIds.has(q.id) || engine.gameOver;
      btn.addEventListener("click", () => {
        engine.askQuestion(q.id);
        SoundFX.click();
        renderVitals();
        renderDialogueLog();
        renderQuestions();
        renderTests();
      });
      grid.appendChild(btn);
    });

    group.appendChild(grid);
    els.questionButtons.appendChild(group);
  });
}

/**
 * Renders the dialogue log incrementally: only entries added since the last
 * call are appended to the DOM (a full rebuild on every click made the log
 * flicker and re-layout as cases grow long).
 */
function renderDialogueLog() {
  const log = engine.dialogueLog;

  if (renderedDialogueCount === 0) {
    els.dialogueLog.innerHTML = "";
    if (log.length === 0) {
      const intro = document.createElement("div");
      intro.className = "dialogue-entry dialogue-entry--system dialogue-entry--intro";
      intro.textContent = `${engine.patient.name} (${engine.patient.occupation}) görüşme odasına alındı. Görüşmeye başlamak için bir soru seçin.`;
      els.dialogueLog.appendChild(intro);
      return;
    }
  }

  if (log.length > 0) {
    const intro = els.dialogueLog.querySelector(".dialogue-entry--intro");
    if (intro) intro.remove();
  }

  for (let i = renderedDialogueCount; i < log.length; i++) {
    const entry = log[i];
    if (entry.speaker === "system") {
      const sysEl = document.createElement("div");
      sysEl.className = "dialogue-entry dialogue-entry--system";
      sysEl.textContent = entry.text;
      els.dialogueLog.appendChild(sysEl);
      continue;
    }

    const qEl = document.createElement("div");
    qEl.className = "dialogue-entry dialogue-entry--question";
    qEl.textContent = entry.questionText;
    els.dialogueLog.appendChild(qEl);

    const aEl = document.createElement("div");
    aEl.className = "dialogue-entry dialogue-entry--answer";
    aEl.textContent = entry.text;
    els.dialogueLog.appendChild(aEl);
  }
  renderedDialogueCount = log.length;

  els.dialogueLog.scrollTop = els.dialogueLog.scrollHeight;
}

// ---------------------------------------------------------------------
// Diagnostic notepad panel
// ---------------------------------------------------------------------

function renderCriteria() {
  els.criteriaList.innerHTML = "";
  const criteria = engine.getAllCriteria();

  const grouped = criteria.reduce((acc, c) => {
    (acc[c.diagnosisLabel] = acc[c.diagnosisLabel] || []).push(c);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([diagnosisLabel, items]) => {
    const group = document.createElement("div");
    group.className = "criteria-group";

    const heading = document.createElement("h4");
    heading.textContent = diagnosisLabel;
    group.appendChild(heading);

    items.forEach((c) => {
      const label = document.createElement("label");
      label.className = "criteria-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = engine.notepad.has(c.id);
      checkbox.addEventListener("change", () => {
        engine.toggleNotepad(c.id);
      });

      const span = document.createElement("span");
      span.textContent = c.text;

      label.appendChild(checkbox);
      label.appendChild(span);
      group.appendChild(label);
    });

    els.criteriaList.appendChild(group);
  });
}

function renderDiagnosisOptions() {
  els.diagnosisOptions.innerHTML = "";
  els.btnSubmitDiagnosis.disabled = true;
  gameData.rootDiagnosis.forEach((d) => {
    const label = document.createElement("label");
    label.className = "diagnosis-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "diagnosis-choice";
    radio.value = d.id;
    radio.addEventListener("change", () => {
      els.btnSubmitDiagnosis.disabled = false;
    });

    const span = document.createElement("span");
    span.textContent = `${d.label} (${d.code})`;

    label.appendChild(radio);
    label.appendChild(span);
    els.diagnosisOptions.appendChild(label);
  });
}

function handleSubmitDiagnosis() {
  const selected = els.diagnosisOptions.querySelector('input[name="diagnosis-choice"]:checked');
  if (!selected) {
    alert("Lütfen tanı koymadan önce bir tanı seçin.");
    return;
  }
  const result = engine.submitDiagnosis(selected.value);
  if (result.diagnosisCorrect) SoundFX.success();
  else SoundFX.failure();
  renderVitals();
  renderResult(result);
  saveHistoryEntry(result);
  renderHistory();
}

// ---------------------------------------------------------------------
// Case history (localStorage)
// ---------------------------------------------------------------------

const HISTORY_STORAGE_KEY = "psikotarama_case_history";
const HISTORY_MAX_ENTRIES = 10;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const history = JSON.parse(raw);
    let migrated = false;
    history.forEach((entry) => {
      if (!entry.id) {
        entry.id = generateHistoryId();
        migrated = true;
      }
    });
    if (migrated) persistHistory(history);
    return history;
  } catch (err) {
    console.error("Vaka geçmişi okunamadı:", err);
    return [];
  }
}

function persistHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("Vaka geçmişi kaydedilemedi:", err);
  }
}

function generateHistoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveHistoryEntry(result) {
  const history = loadHistory();
  history.unshift({
    id: generateHistoryId(),
    date: new Date().toISOString(),
    diagnosisCorrect: result.diagnosisCorrect,
    score: result.score,
    correctDiagnosisLabel: result.correctDiagnosisLabel,
    chosenDiagnosisLabel: result.chosenDiagnosisLabel,
    difficultyLabel: result.difficultyLabel
  });
  history.length = Math.min(history.length, HISTORY_MAX_ENTRIES);
  persistHistory(history);
}

function deleteHistoryEntry(id) {
  const history = loadHistory().filter((entry) => entry.id !== id);
  persistHistory(history);
  renderHistory();
}

function clearHistory() {
  if (!confirm("Tüm vaka geçmişini silmek istediğinizden emin misiniz?")) return;
  persistHistory([]);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  els.caseHistory.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted-note";
    empty.textContent = "Henüz tamamlanmış vaka yok.";
    els.caseHistory.appendChild(empty);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `history-entry ${entry.diagnosisCorrect ? "history-entry--correct" : "history-entry--incorrect"}`;

    const info = document.createElement("div");
    info.className = "history-entry-info";

    const diagnosis = document.createElement("span");
    diagnosis.className = "history-entry-diagnosis";
    diagnosis.textContent = entry.diagnosisCorrect
      ? entry.correctDiagnosisLabel
      : `${entry.chosenDiagnosisLabel} ≠ ${entry.correctDiagnosisLabel}`;

    const date = document.createElement("span");
    date.className = "history-entry-date";
    date.textContent = formatHistoryDate(entry.date) +
      (entry.difficultyLabel ? ` · ${entry.difficultyLabel}` : "");

    info.appendChild(diagnosis);
    info.appendChild(date);

    const actions = document.createElement("div");
    actions.className = "history-entry-actions";

    const score = document.createElement("span");
    score.className = "history-entry-score";
    score.textContent = `${entry.score}/100`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Bu vakayı sil";
    deleteBtn.addEventListener("click", () => deleteHistoryEntry(entry.id));

    actions.appendChild(score);
    actions.appendChild(deleteBtn);

    row.appendChild(info);
    row.appendChild(actions);
    els.caseHistory.appendChild(row);
  });
}

function formatHistoryDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function renderResult(result) {
  const verdictClass = result.diagnosisCorrect ? "result-verdict--correct" : "result-verdict--incorrect";
  els.resultBody.innerHTML = `
    <p class="result-verdict ${verdictClass}">
      ${result.diagnosisCorrect ? "✅ Doğru Tanı" : "❌ Yanlış Tanı"}
    </p>
    <ul class="result-list">
      <li><strong>Zorluk:</strong> ${result.difficultyLabel}</li>
      <li><strong>Seçilen Tanı:</strong> ${result.chosenDiagnosisLabel}</li>
      <li><strong>Gerçek Tanı:</strong> ${result.correctDiagnosisLabel}</li>
      <li><strong>Dikkat Dağıtıcı Unsur:</strong> ${result.distractorLabel}</li>
      <li><strong>Doğru İşaretlenen Kriter:</strong> ${result.truePositives}</li>
      <li><strong>Yanlış İşaretlenen Kriter:</strong> ${result.falsePositives}</li>
      <li><strong>Kaçırılan Kriter:</strong> ${result.missed}</li>
      <li><strong>Hassasiyet (Precision):</strong> %${result.precision}</li>
      <li><strong>Duyarlılık (Recall):</strong> %${result.recall}</li>
      <li><strong>Kalan Süre:</strong> ${result.timeRemaining} dk</li>
      <li><strong>Son Güven Düzeyi:</strong> ${result.rapport}/100</li>
    </ul>
    <p class="result-score">Toplam Puan: ${result.score} / 100</p>
    ${renderFeedback(result.feedback)}
  `;
  show(els.resultOverlay);
  els.btnRestart.focus();
}

function renderFeedback(feedback) {
  if (!feedback) return "";

  if (feedback.type === "success") {
    const growthBlock = feedback.growthTips.length
      ? `<h4>Gelişim Önerileri</h4><ul class="feedback-list">${feedback.growthTips
          .map((t) => `<li>${t}</li>`)
          .join("")}</ul>`
      : `<p class="feedback-note">Tüm kriterleri eksiksiz işaretlediniz — mükemmel bir görüşmeydi.</p>`;

    return `
      <div class="result-feedback result-feedback--success">
        <h3>Sonraki Adımlar</h3>
        <p>${feedback.nextSteps}</p>
        ${feedback.rapportNote ? `<p class="feedback-note">${feedback.rapportNote}</p>` : ""}
        ${growthBlock}
      </div>
    `;
  }

  const neverAskedBlock = feedback.neverAsked.length
    ? `<h4>Odaklanmanız Gereken Noktalar (Hiç Sormadığınız Kriterler)</h4>
       <ul class="feedback-list">${feedback.neverAsked.map((c) => `<li>${c.text}</li>`).join("")}</ul>`
    : "";

  const askedNotMarkedBlock = feedback.askedNotMarked.length
    ? `<h4>Sordunuz Ama İşaretlemediniz</h4>
       <ul class="feedback-list">${feedback.askedNotMarked.map((c) => `<li>${c.text}</li>`).join("")}</ul>`
    : "";

  const falsePositiveBlock = feedback.falsePositiveCriteria.length
    ? `<h4>Yanlış İşaretlediğiniz Kriterler</h4>
       <ul class="feedback-list">${feedback.falsePositiveCriteria
         .map((c) => `<li>${c.text} <span class="feedback-tag">(${c.diagnosisLabel})</span></li>`)
         .join("")}</ul>`
    : "";

  return `
    <div class="result-feedback result-feedback--mistake">
      <h3>Hata Analizi</h3>
      ${
        feedback.confusedWithLabel
          ? `<p>Büyük olasılıkla <strong>${feedback.confusedWithLabel}</strong> ile karıştırdınız.</p>`
          : ""
      }
      <p>Bu vakadaki dikkat dağıtıcı unsur <strong>${feedback.distractorLabel}</strong> idi — yüzeysel şikayetler bazen asıl tanıdan uzaklaştırabilir.</p>
      ${neverAskedBlock}
      ${askedNotMarkedBlock}
      ${falsePositiveBlock}
      ${feedback.rapportNote ? `<p class="feedback-note">${feedback.rapportNote}</p>` : ""}
    </div>
  `;
}

// ---------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}
