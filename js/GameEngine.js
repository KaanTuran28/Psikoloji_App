/**
 * GameEngine.js
 * ClinicalEngine: procedural patient generation + session state management
 * for the PsikoTarama-Simulasyon diagnostic game.
 *
 * No frameworks, no build step — pure ES6, runs directly in the browser.
 */

const START_TIME_MINUTES = 45;
const START_RAPPORT = 50;
const MAX_RAPPORT = 100;
const MIN_RAPPORT = 0;
const LOW_RAPPORT_LIE_THRESHOLD = 40; // below this, sensitive questions risk a deceptive answer

class ClinicalEngine {
  /**
   * @param {object} data - parsed contents of data/patients.json
   */
  constructor(data) {
    this.data = data;
    this.patient = null;
    this.timeRemaining = START_TIME_MINUTES;
    this.rapport = START_RAPPORT;
    this.dialogueLog = [];
    this.askedQuestionIds = new Set();
    this.completedTestIds = new Set();
    this.testResults = {}; // testId -> { score, verdict, label }
    this.notepad = new Set(); // selected DSM-5 criteria ids
    this.gameOver = false;
    this.diagnosisSubmitted = false;
    this.finalResult = null;
  }

  // ---------------------------------------------------------------------
  // Procedural generation
  // ---------------------------------------------------------------------

  /**
   * Combines one random RootDiagnosis with one random Distractor to build
   * the current session's patient, and resets all session state.
   */
  generateCase() {
    const { rootDiagnosis, distractors, patientNames, occupations } = this.data;

    const root = pickRandom(rootDiagnosis);
    const distractor = pickRandom(distractors);
    const name = pickRandom(patientNames);
    const occupation = pickRandom(occupations);
    const age = 18 + Math.floor(Math.random() * 45);

    // The set of symptom ids the patient genuinely "has" this session.
    // Root symptoms are the true diagnostic signal; distractor symptoms are
    // real complaints too, but irrelevant noise for the diagnosis itself.
    const activeSymptoms = new Set([
      ...root.symptomPool.map((s) => s.id),
      ...distractor.symptomPool.map((s) => s.id)
    ]);

    // Only the distractor's surface story is used here, never the root
    // diagnosis — the case brief must not leak which diagnosis is correct.
    const caseBrief = `${name}, ${age} yaşında bir ${occupation}. ${distractor.referralReason}`;

    this.patient = {
      name,
      age,
      occupation,
      rootDiagnosisId: root.id,
      rootDiagnosisLabel: root.label,
      distractorId: distractor.id,
      distractorLabel: distractor.label,
      caseBrief,
      activeSymptoms
    };

    this.timeRemaining = START_TIME_MINUTES;
    this.rapport = START_RAPPORT;
    this.dialogueLog = [];
    this.askedQuestionIds = new Set();
    this.completedTestIds = new Set();
    this.testResults = {};
    this.notepad = new Set();
    this.gameOver = false;
    this.diagnosisSubmitted = false;
    this.finalResult = null;

    return this.patient;
  }

  // ---------------------------------------------------------------------
  // Interview / questioning
  // ---------------------------------------------------------------------

  /**
   * Ask the patient a dialogue question. Deducts time, adjusts rapport,
   * and resolves whether the patient answers truthfully or deceptively.
   * @param {string} questionId
   * @returns {{speaker:string, text:string, truthful:boolean}|null}
   */
  askQuestion(questionId) {
    if (this.gameOver) return null;

    const question = this.data.questions.find((q) => q.id === questionId);
    if (!question) return null;

    const timeCost = question.timeCost || 5;
    this._spendTime(timeCost);

    this.askedQuestionIds.add(questionId);
    this._adjustRapport(question.rapportEffect || 0);

    const response = this._resolveResponse(question);
    const entry = {
      speaker: "patient",
      questionText: question.text,
      text: response.text,
      truthful: response.truthful
    };
    this.dialogueLog.push(entry);

    this._checkTimeUp();
    return entry;
  }

  /**
   * Determine the patient's reply to a question: present-and-truthful,
   * present-but-deceptive (low rapport on a sensitive topic), or absent.
   * @private
   */
  _resolveResponse(question) {
    const symptomPresent = this.patient.activeSymptoms.has(question.targetSymptom);

    if (!symptomPresent) {
      return { text: question.absentResponse, truthful: true };
    }

    const lieRoll = Math.random() * 100;
    const lieChance = question.sensitive && this.rapport < LOW_RAPPORT_LIE_THRESHOLD
      ? (LOW_RAPPORT_LIE_THRESHOLD - this.rapport) * 1.5
      : 0;

    if (lieRoll < lieChance) {
      return { text: question.deceptiveResponse, truthful: false };
    }
    return { text: question.truthfulResponse, truthful: true };
  }

  // ---------------------------------------------------------------------
  // Psychometric tests (bypass deception, cost more time)
  // ---------------------------------------------------------------------

  /**
   * Administers a standardized psychometric test. Tests always reveal the
   * true symptom picture for their target diagnosis (rapport/lying has no
   * effect), at the cost of more time.
   * @param {string} testId
   * @returns {{label:string, score:number, verdict:string}|null}
   */
  runTest(testId) {
    if (this.gameOver) return null;

    const test = this.data.tests.find((t) => t.id === testId);
    if (!test || this.completedTestIds.has(testId)) return null;

    this._spendTime(test.timeCost || 10);
    this.completedTestIds.add(testId);

    const targetRoot = this.data.rootDiagnosis.find((r) => r.id === test.targetDiagnosis);
    const totalSymptoms = targetRoot.symptomPool.length;
    const presentSymptoms = targetRoot.symptomPool.filter((s) =>
      this.patient.activeSymptoms.has(s.id)
    ).length;

    const score = Math.round((presentSymptoms / totalSymptoms) * 100);
    const verdict = score >= 65 ? "Yüksek" : score >= 30 ? "Orta" : "Düşük";

    const result = { label: test.label, score, verdict };
    this.testResults[testId] = result;

    this.dialogueLog.push({
      speaker: "system",
      text: `${test.label} uygulandı. Sonuç: %${score} (${verdict} risk düzeyi).`
    });

    this._checkTimeUp();
    return result;
  }

  // ---------------------------------------------------------------------
  // Diagnostic notepad
  // ---------------------------------------------------------------------

  /** Returns the full DSM-5-style criteria catalog across all diagnoses. */
  getAllCriteria() {
    return this.data.rootDiagnosis.flatMap((diag) =>
      diag.symptomPool.map((s) => ({
        id: s.id,
        text: s.text,
        diagnosisId: diag.id,
        diagnosisLabel: diag.label
      }))
    );
  }

  toggleNotepad(criteriaId) {
    if (this.notepad.has(criteriaId)) {
      this.notepad.delete(criteriaId);
    } else {
      this.notepad.add(criteriaId);
    }
    return this.notepad.has(criteriaId);
  }

  // ---------------------------------------------------------------------
  // Diagnosis submission / scoring
  // ---------------------------------------------------------------------

  /**
   * Finalizes the session: compares the player's chosen diagnosis and
   * selected criteria against the true root diagnosis.
   * @param {string} diagnosisId
   */
  submitDiagnosis(diagnosisId) {
    if (this.diagnosisSubmitted) return this.finalResult;

    const root = this.data.rootDiagnosis.find((r) => r.id === this.patient.rootDiagnosisId);
    const correctCriteriaIds = new Set(root.symptomPool.map((s) => s.id));

    const selected = Array.from(this.notepad);
    const truePositives = selected.filter((id) => correctCriteriaIds.has(id)).length;
    const falsePositives = selected.length - truePositives;

    const precision = selected.length > 0 ? truePositives / selected.length : 0;
    const recall = correctCriteriaIds.size > 0 ? truePositives / correctCriteriaIds.size : 0;

    const diagnosisCorrect = diagnosisId === this.patient.rootDiagnosisId;

    // Weighted score: correct diagnosis is the dominant factor (60%),
    // criteria precision/recall make up the rest (40%).
    const diagnosisScore = diagnosisCorrect ? 60 : 0;
    const criteriaScore = Math.round(((precision + recall) / 2) * 40);
    const totalScore = diagnosisScore + criteriaScore;

    const distractor = this.data.distractors.find((d) => d.id === this.patient.distractorId);

    this.finalResult = {
      diagnosisCorrect,
      chosenDiagnosisLabel: this._labelForDiagnosis(diagnosisId),
      correctDiagnosisLabel: root.label,
      distractorLabel: distractor.label,
      truePositives,
      falsePositives,
      missed: correctCriteriaIds.size - truePositives,
      precision: Math.round(precision * 100),
      recall: Math.round(recall * 100),
      score: totalScore,
      timeRemaining: this.timeRemaining,
      rapport: this.rapport,
      feedback: this._buildFeedback(diagnosisCorrect, root, selected, correctCriteriaIds, distractor)
    };

    this.diagnosisSubmitted = true;
    this.gameOver = true;
    return this.finalResult;
  }

  _labelForDiagnosis(diagnosisId) {
    const d = this.data.rootDiagnosis.find((r) => r.id === diagnosisId);
    return d ? d.label : "Bilinmiyor";
  }

  /**
   * Builds performance feedback for the result screen: on a correct
   * diagnosis, clinical "next steps" plus growth tips; on an incorrect
   * one, a concrete mistake breakdown (missed / mismarked criteria,
   * which other diagnosis the player likely confused it with).
   * @private
   */
  _buildFeedback(diagnosisCorrect, root, selected, correctCriteriaIds, distractor) {
    const allCriteria = this.getAllCriteria();
    const criteriaById = new Map(allCriteria.map((c) => [c.id, c]));

    const missedCriteria = root.symptomPool
      .filter((s) => !this.notepad.has(s.id))
      .map((s) => ({
        id: s.id,
        text: s.text,
        neverAsked: !this._wasSymptomAsked(s.id)
      }));

    const falsePositiveCriteria = selected
      .filter((id) => !correctCriteriaIds.has(id))
      .map((id) => criteriaById.get(id))
      .filter(Boolean);

    const deceptiveAnswers = this.dialogueLog.filter(
      (e) => e.speaker === "patient" && e.truthful === false
    ).length;
    const rapportNote =
      deceptiveAnswers > 0
        ? `Görüşme sırasında düşük güven (rapport) nedeniyle hasta en az ${deceptiveAnswers} soruda gerçeği saklamış olabilir. Hassas sorulara geçmeden önce rapport'u yükseltmeyi deneyin.`
        : null;

    if (diagnosisCorrect) {
      const neverAsked = missedCriteria.filter((c) => c.neverAsked);
      const askedNotMarked = missedCriteria.filter((c) => !c.neverAsked);
      const growthTips = [];
      if (neverAsked.length > 0) {
        growthTips.push(
          `Şu kriterleri hiç sormadınız: ${neverAsked.map((c) => c.text).join("; ")}.`
        );
      }
      if (askedNotMarked.length > 0) {
        growthTips.push(
          `Şu kriterleri sordunuz ama not defterine işaretlemediniz: ${askedNotMarked
            .map((c) => c.text)
            .join("; ")}.`
        );
      }
      if (falsePositiveCriteria.length > 0) {
        growthTips.push(
          `${falsePositiveCriteria.length} kriteri yanlışlıkla işaretlediniz; hassasiyeti (precision) artırmak için sadece emin olduğunuz kriterleri işaretleyin.`
        );
      }
      return {
        type: "success",
        nextSteps: root.nextSteps,
        rapportNote,
        growthTips
      };
    }

    const confusionCounts = {};
    falsePositiveCriteria.forEach((c) => {
      confusionCounts[c.diagnosisLabel] = (confusionCounts[c.diagnosisLabel] || 0) + 1;
    });
    const confusedWith = Object.entries(confusionCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      type: "mistake",
      neverAsked: missedCriteria.filter((c) => c.neverAsked),
      askedNotMarked: missedCriteria.filter((c) => !c.neverAsked),
      falsePositiveCriteria,
      confusedWithLabel: confusedWith ? confusedWith[0] : null,
      distractorLabel: distractor.label,
      rapportNote
    };
  }

  /** Whether any question targeting this symptom id has already been asked. */
  _wasSymptomAsked(symptomId) {
    return this.data.questions.some(
      (q) => q.targetSymptom === symptomId && this.askedQuestionIds.has(q.id)
    );
  }

  // ---------------------------------------------------------------------
  // Internal state helpers
  // ---------------------------------------------------------------------

  _spendTime(minutes) {
    this.timeRemaining = Math.max(0, this.timeRemaining - minutes);
  }

  _adjustRapport(delta) {
    this.rapport = clamp(this.rapport + delta, MIN_RAPPORT, MAX_RAPPORT);
  }

  _checkTimeUp() {
    if (this.timeRemaining <= 0) {
      this.gameOver = true;
    }
  }

  /** Snapshot of current state, convenient for rendering. */
  getState() {
    return {
      patient: this.patient,
      timeRemaining: this.timeRemaining,
      rapport: this.rapport,
      dialogueLog: this.dialogueLog,
      askedQuestionIds: this.askedQuestionIds,
      completedTestIds: this.completedTestIds,
      testResults: this.testResults,
      notepad: this.notepad,
      gameOver: this.gameOver,
      diagnosisSubmitted: this.diagnosisSubmitted,
      finalResult: this.finalResult
    };
  }
}

// ---------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
