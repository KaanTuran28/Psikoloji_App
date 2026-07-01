/**
 * app.js
 * Wires the ClinicalEngine to the DOM. Pure vanilla JS, no build step.
 */

let engine = null;
let gameData = null;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindStaticEvents();
  loadData();
  renderHistory();
});

function cacheElements() {
  els.btnNewCase = document.getElementById("btn-new-case");
  els.startOverlay = document.getElementById("start-overlay");
  els.startLoading = document.getElementById("start-loading");
  els.startWelcome = document.getElementById("start-welcome");
  els.btnStartFirstCase = document.getElementById("btn-start-first-case");

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
}

async function loadData() {
  try {
    const res = await fetch("data/patients.json");
    gameData = await res.json();
    engine = new ClinicalEngine(gameData);
    els.btnNewCase.disabled = false;
    hide(els.startLoading);
    show(els.startWelcome);
  } catch (err) {
    els.startOverlay.querySelector("p").textContent =
      "Veri dosyası yüklenemedi. Lütfen sayfayı bir yerel sunucu üzerinden açtığınızdan emin olun.";
    console.error("patients.json yüklenemedi:", err);
  }
}

// ---------------------------------------------------------------------
// Case lifecycle
// ---------------------------------------------------------------------

function startNewCase() {
  engine.generateCase();
  hide(els.startOverlay);
  hide(els.resultOverlay);

  renderPatientInfo();
  renderVitals();
  renderTests();
  renderDialogueLog();
  renderQuestions();
  renderCriteria();
  renderDiagnosisOptions();
}

function renderPatientInfo() {
  const p = engine.patient;
  els.patientAvatar.textContent = getInitials(p.name);
  els.patientName.textContent = p.name;
  els.patientMeta.textContent = `${p.age} yaşında · ${p.occupation} · Vaka #${Math.floor(Math.random() * 9000) + 1000}`;
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

  if (engine.gameOver && !engine.diagnosisSubmitted) {
    els.timeValue.classList.add("vital-critical");
  } else {
    els.timeValue.classList.remove("vital-critical");
  }

  renderTimeUpBanner();
}

function renderTimeUpBanner() {
  if (engine.gameOver && !engine.diagnosisSubmitted) {
    show(els.timeUpBanner);
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
    btn.textContent = `${test.label} (-${test.timeCost} dk)`;
    btn.disabled = engine.completedTestIds.has(test.id) || engine.gameOver;
    btn.addEventListener("click", () => {
      engine.runTest(test.id);
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
    row.innerHTML = `<span class="test-result-label">${r.label}</span><span class="test-result-score">%${r.score} · ${r.verdict}</span>`;
    els.testResults.appendChild(row);
  });
}

// ---------------------------------------------------------------------
// Dialogue / interview panel
// ---------------------------------------------------------------------

function renderQuestions() {
  els.questionButtons.innerHTML = "";
  gameData.questions.forEach((q) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-question";
    btn.textContent = q.text;
    btn.disabled = engine.askedQuestionIds.has(q.id) || engine.gameOver;
    btn.addEventListener("click", () => {
      engine.askQuestion(q.id);
      renderVitals();
      renderDialogueLog();
      renderQuestions();
      renderTests();
    });
    els.questionButtons.appendChild(btn);
  });
}

function renderDialogueLog() {
  els.dialogueLog.innerHTML = "";

  if (engine.dialogueLog.length === 0) {
    const intro = document.createElement("div");
    intro.className = "dialogue-entry dialogue-entry--system";
    intro.textContent = `${engine.patient.name} (${engine.patient.occupation}) görüşme odasına alındı. Görüşmeye başlamak için bir soru seçin.`;
    els.dialogueLog.appendChild(intro);
  }

  engine.dialogueLog.forEach((entry) => {
    if (entry.speaker === "system") {
      const sysEl = document.createElement("div");
      sysEl.className = "dialogue-entry dialogue-entry--system";
      sysEl.textContent = entry.text;
      els.dialogueLog.appendChild(sysEl);
      return;
    }

    const qEl = document.createElement("div");
    qEl.className = "dialogue-entry dialogue-entry--question";
    qEl.textContent = entry.questionText;
    els.dialogueLog.appendChild(qEl);

    const aEl = document.createElement("div");
    aEl.className = "dialogue-entry dialogue-entry--answer";
    aEl.textContent = entry.text;
    els.dialogueLog.appendChild(aEl);
  });

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
  gameData.rootDiagnosis.forEach((d) => {
    const label = document.createElement("label");
    label.className = "diagnosis-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "diagnosis-choice";
    radio.value = d.id;

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
    chosenDiagnosisLabel: result.chosenDiagnosisLabel
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
    date.textContent = formatHistoryDate(entry.date);

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
