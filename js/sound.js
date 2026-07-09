/**
 * sound.js
 * SoundFX: tiny WebAudio-based sound effects — no audio assets needed.
 * All sounds are short synthesized tones; a persisted mute flag lives in
 * localStorage under "psikotarama_muted".
 */

const SoundFX = (() => {
  const MUTE_STORAGE_KEY = "psikotarama_muted";
  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch (err) {
    /* storage unavailable — default to sound on */
  }

  function ensureContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /**
   * Plays a single decaying tone.
   * @param {number} freq  - frequency in Hz
   * @param {number} dur   - duration in seconds
   * @param {string} type  - oscillator waveform
   * @param {number} vol   - peak gain (kept low; these are UI accents)
   * @param {number} delay - seconds after "now" to start
   */
  function tone(freq, dur, type = "sine", vol = 0.05, delay = 0) {
    if (muted) return;
    try {
      const c = ensureContext();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t = c.currentTime + delay;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (err) {
      /* audio failure must never break gameplay */
    }
  }

  return {
    isMuted: () => muted,

    toggleMuted() {
      muted = !muted;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
      } catch (err) {
        /* non-fatal */
      }
      return muted;
    },

    /** Soft click — a question was asked. */
    click() {
      tone(660, 0.07, "triangle", 0.04);
    },

    /** Two-note chime — a psychometric test finished. */
    test() {
      tone(520, 0.09, "sine", 0.05);
      tone(780, 0.12, "sine", 0.05, 0.09);
    },

    /** Ascending arpeggio — correct diagnosis. */
    success() {
      tone(523, 0.12, "sine", 0.05);
      tone(659, 0.12, "sine", 0.05, 0.11);
      tone(784, 0.22, "sine", 0.05, 0.22);
    },

    /** Descending minor — incorrect diagnosis. */
    failure() {
      tone(330, 0.16, "sawtooth", 0.03);
      tone(247, 0.28, "sawtooth", 0.03, 0.15);
    },

    /** Double beep — time ran out. */
    warning() {
      tone(880, 0.1, "square", 0.025);
      tone(880, 0.1, "square", 0.025, 0.18);
    }
  };
})();
