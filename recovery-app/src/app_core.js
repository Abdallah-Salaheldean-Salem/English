/* app_core.js: DOM helper, app state, timer, session engine, autosave, error logging, Claude calls. */
'use strict';

/* ---------- tiny DOM helper ---------- */
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'readOnly', 'spellcheck', 'hidden']);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false && !PROPS.has(k)) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const clone = o => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const mmss = sec => { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const fmtDate = d => { if (!d) return ''; const x = L.addDays(d.slice(0, 10), 0); const dt = new Date(x + 'T12:00:00'); return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };

/* ---------- app state ---------- */
const App = { today: L.iso(), route: 'today', sel: null, sample: null, downloads: null, notice: '', importPreview: null, busy: {} };
const app = () => Store.S.app;
const sessions = () => Store.list('sessions');
const pieces = () => Store.list('pieces');
const errorsList = () => Store.list('errors');
const allModels = () => MODELS.concat(Store.list('models'));
const modelById = id => allModels().find(m => m.id === id) || MODELS[0];
const setById = id => COMBINING.find(c => c.id === id) || COMBINING[0];
const checkIds = REVISION_CHECKS.map(c => c[0]);

function defaultApp(today) {
  return { startDate: today, phase: 0, phaseStarted: { 0: today }, p0Offered: true, planRows2: true, weekStart: 0, restDays: [5, 6], anchorRoutine: '', anchorPlace: '',
    noDelete: true, pauseLimit: 60, reviewsPerWeek: 1, sound: true, form: 'essay', publishPlace: '', top3: [], books: {} };
}
function saveApp(patch) { Store.put('state', 'app', Object.assign(clone(app()), patch)); }
function currentTop3() { const a = app(); return a.phase >= 2 && a.top3 && a.top3.length ? a.top3 : L.computeTop3(errorsList()); }

/* ---------- sound and wake lock ---------- */
let audioCtx = null;
function chime() {
  if (!app() || !app().sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [660, 880].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.18); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.5);
      o.connect(g).connect(audioCtx.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.55);
    });
  } catch (e) { /* no audio here */ }
}
let wakeLock = null;
async function holdWake(on) {
  try { if (on && navigator.wakeLock && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) { wakeLock = null; }
}

/* ---------- session engine ---------- */
function targetText(coll, doc) { return coll === 'pieces' ? doc.text || '' : L.mainText(doc); }

const Engine = {
  s: null, _iv: 0, _last: 0, _saved: 0, _chimed: false, done: null,

  start(kind, opts) {
    opts = opts || {};
    const a = app(), today = L.iso(), data = Object.assign({}, opts.data || {});
    if (kind === 'phase1' || kind === 'short') data.topic = data.topic || TOPICS[(sessions().length * 7) % TOPICS.length];
    if (kind === 'phase1' && !data.modelId) data.modelId = L.nextModel(allModels(), 'essay', sessions()).id;
    if ((kind === 'franklin1' || kind === 'franklin3') && !data.modelId) data.modelId = L.nextModel(allModels(), a.phase >= 3 ? a.form : 'essay', sessions()).id;
    if (L.hasImitation({ kind, data })) data.imitations = data.imitations || blankImitations();
    if (kind === 'placement') { data.answers = PLACEMENT.slice(); data.partB = ''; }
    if (kind === 'combining' && !data.setId) {
      const used = new Set(sessions().filter(s => s.kind === 'combining').map(s => s.data && s.data.setId));
      data.setId = (COMBINING.find(c => !used.has(c.id)) || COMBINING[sessions().length % COMBINING.length]).id;
      data.ways = ['', '', ''];
    }
    if (kind === 'franklin2') {
      const notes = Store.get('sessions', data.notesId);
      data.notes = notes ? notes.data.notes.slice() : [];
      if (data.shuffled) data.order = L.shuffleOrder(data.notes.length, data.notesId);
    }
    if (kind === 'piece') {
      let p = data.pieceId && Store.get('pieces', data.pieceId);
      if (!p) {
        p = { id: newId('p'), phase: a.phase, form: a.phase >= 3 ? a.form : 'essay', title: '', status: 'plan', createdAt: nowIso(), finishedAt: '',
          plan: { point: '', reader: '', notes: '' }, text: '', versions: [], checks: {}, feedback: [], postedUrl: '', publishedUrl: '', words: 0, marks: [], reviewed: false, reviewedAt: '' };
        Store.put('pieces', p.id, p, true);
      }
      data.pieceId = p.id; data.minutes = opts.minutes || data.minutes || 25; data.wordsBefore = L.countWords(p.text);
    }
    const s = { id: newId('s'), kind, phase: a.phase, date: today, status: 'active', startedAt: nowIso(), finishedAt: '', step: 0, stepElapsed: 0, seconds: 0, words: 0,
      data, marks: [], reviewed: false, reviewedAt: '' };
    Store.put('sessions', s.id, s, true);
    this.open(s, false);
  },

  open(s, resumed) {
    this.s = clone(s); this.done = null;
    if (resumed && this.step() && this.step().sprint) { this.sprint().interrupted = true; this.save(); }
    this._last = Date.now(); this._chimed = this.remaining() <= 0;
    clearInterval(this._iv); this._iv = setInterval(() => this.tick(), 1000);
    holdWake(true); showFocus();
  },
  flow() { return L.flowFor(this.s.kind, this.s.data); },
  step() { return this.flow()[this.s.step]; },
  remaining() { const st = this.step(); return st ? st.min * 60 - this.s.stepElapsed : 0; },
  sprint() { return this.s.data.sprint || (this.s.data.sprint = { words: 0, maxPause: 0, paused: 0, interrupted: false, seconds: 0, lastInput: 0 }); },

  tick() {
    if (!this.s || this.done) return;
    const now = Date.now(), dt = Math.min(5, (now - this._last) / 1000); this._last = now;
    this.s.stepElapsed += dt; this.s.seconds += dt;
    const st = this.step();
    if (st && st.sprint) {
      const sp = this.sprint();
      if (this.remaining() > 0) {   // only the timed window counts toward "without stopping"
        const idle = this.s.stepElapsed - (sp.lastInput || 0);
        if (idle > sp.maxPause) sp.maxPause = idle;
        sp.words = L.countWords(this.s.data.text);
      }
    }
    if (!this._chimed && this.remaining() <= 0) { this._chimed = true; chime(); }
    Focus.updateClock();
    if (now - this._saved > 5000) this.save();
  },
  /* Called by guarded sprint textareas on every input. */
  onSprintInput() {
    const sp = this.sprint(), t = this.s.stepElapsed;
    if (this.remaining() <= 0) { sp.lastInput = t; return; }
    const gap = t - (sp.lastInput || 0);
    if (gap > (app().pauseLimit || 60)) sp.paused++;
    if (gap > sp.maxPause) sp.maxPause = gap;
    sp.lastInput = t;
    if (this.remaining() > 0) sp.words = L.countWords(this.s.data.text);
  },
  save() {
    if (!this.s) return;
    this._saved = Date.now();
    const s = this.s;
    s.words = s.kind === 'piece' ? Math.max(0, L.countWords((Store.get('pieces', s.data.pieceId) || {}).text) - (s.data.wordsBefore || 0)) : L.countWords(L.mainText(s));
    Store.put('sessions', s.id, clone(s), true);
  },
  next() {
    const st = this.step();
    if (st && st.sprint) {
      const sp = this.sprint();
      const idle = Math.min(this.s.stepElapsed, st.min * 60) - (sp.lastInput || 0);
      if (idle > (app().pauseLimit || 60)) sp.paused++;
      sp.seconds = Math.min(this.s.stepElapsed, st.min * 60);
      if (this.remaining() > 0) sp.words = L.countWords(this.s.data.text);
    }
    if (this.s.step < this.flow().length - 1) {
      this.s.step++; this.s.stepElapsed = 0; this._chimed = false; this.save(); showFocus();
    } else this.finish();
  },
  finish() {
    const s = this.s;
    s.status = 'done'; s.finishedAt = nowIso();
    if (s.data.sprint) delete s.data.sprint.lastInput;
    logSelfMarks('sessions', s);
    this.save();
    if (s.kind === 'piece') { const p = Store.get('pieces', s.data.pieceId); if (p) Store.put('pieces', p.id, Object.assign(clone(p), { words: L.countWords(p.text) }), true); }
    clearInterval(this._iv); holdWake(false);
    this.done = s.id; showFocus();
  },
  quit(keep) {
    clearInterval(this._iv); holdWake(false);
    if (!keep && this.s) Store.remove('sessions', this.s.id); else if (this.s) this.save();
    this.s = null; this.done = null; hideFocus();
  },
  close() { this.s = null; this.done = null; hideFocus(); }
};

/* ---------- marks and the error log ---------- */
/* Self marks are logged once, when the session ends (or immediately outside a session). */
function logMark(m) {
  if (m.errId || !m.type) return m;
  const id = L.errorId(m.type, m.quote);
  const row = L.logError(Store.get('errors', id), { type: m.type, wrote: m.quote, correct: m.fix, by: m.by === 'self' ? 'self' : 'claude', date: L.iso() });
  Store.put('errors', row.id, row, true);
  m.errId = row.id;
  return m;
}
function logSelfMarks(coll, doc) { for (const m of doc.marks || []) if (m.by === 'self') logMark(m); }
function addMark(coll, id, mark) {
  const doc = clone(Store.get(coll, id));
  doc.marks = (doc.marks || []).concat([coll === 'sessions' && doc.status === 'active' ? mark : logMark(mark)]);
  Store.put(coll, id, doc);
}
function removeMark(coll, id, idx) {
  const doc = clone(Store.get(coll, id)); const m = doc.marks[idx];
  if (m && m.errId) {
    const row = Store.get('errors', m.errId);
    if (row) { const r = clone(row); const i = r.dates.lastIndexOf(L.iso()); r.dates.splice(i >= 0 ? i : r.dates.length - 1, 1); if (r.dates.length) Store.put('errors', r.id, r, true); else Store.remove('errors', r.id); }
  }
  doc.marks.splice(idx, 1); Store.put(coll, id, doc);
}
function setFixed(coll, id, idx, fix) {
  const doc = clone(Store.get(coll, id)); const m = doc.marks[idx];
  m.fixed = true; m.fix = fix; m.lastHint = '';
  if (m.errId && Store.get('errors', m.errId)) { const r = clone(Store.get('errors', m.errId)); r.correct = fix; Store.put('errors', r.id, r, true); }
  Store.put(coll, id, doc);
}

/* ---------- Claude ---------- */
const SAMPLE_MSG = {
  not_granted: 'Claude is not allowed for this page. You can allow it from the page’s permissions, or use the copy-and-paste review below.',
  sampling_disabled: 'Claude is not available on this account.', rate_limited: 'Claude is busy or your usage limit is reached. Try again later.',
  session_expired: 'Sign in again to use Claude.', refused: 'Claude declined this text.', invalid_json: 'Claude’s reply could not be read. Try again.',
  prompt_too_large: 'This text is too long to review in one go.'
};
const sampleError = e => SAMPLE_MSG[e && e.code] || 'Claude could not be reached. Try again in a moment.';
function reviewsLeft() { const a = app(); return Math.max(0, (a.reviewsPerWeek || 1) - L.reviewsThisWeek(a, sessions(), pieces(), L.iso())); }

async function claudeReview(coll, id) {
  const doc = Store.get(coll, id); const text = targetText(coll, doc);
  if (!App.sample || !text.trim() || doc.reviewedAt) return;
  App.busy[id] = 'Claude is reading your draft…'; render();
  try {
    const raw = await App.sample.json(L.reviewPrompt(text, currentTop3(), ERROR_TYPES), { cache: false });
    applyReview(coll, id, L.validateMarks(raw, text, ERROR_TYPES), 'claude');
    App.notice = '';
  } catch (e) { App.notice = sampleError(e); if (e && e.code === 'not_granted') App.sample = null; }
  delete App.busy[id]; render();
}
function applyReview(coll, id, marks, mode) {
  const d = clone(Store.get(coll, id));
  d.marks = (d.marks || []).filter(m => m.by !== 'claude').concat(marks.map(m => logMark(m)));
  d.reviewed = true; d.reviewedAt = nowIso(); d.reviewMode = mode; d.reviewedWords = L.countWords(targetText(coll, d));
  Store.put(coll, id, d);
}
async function claudeRepair(coll, id, idx, fix) {
  const doc = Store.get(coll, id), m = doc.marks[idx];
  const sentence = L.sentenceAround(targetText(coll, doc), m.at);
  const key = id + ':' + idx;
  App.busy[key] = 'Checking…'; render();
  try {
    const r = L.validateRepair(await App.sample.json(L.repairPrompt(sentence, m.quote, m.type, fix), { cache: false }));
    if (!r) throw { code: 'invalid_json' };
    if (r.ok) setFixed(coll, id, idx, fix);
    else { const d = clone(Store.get(coll, id)); d.marks[idx].tries = (d.marks[idx].tries || 0) + 1; d.marks[idx].lastHint = r.hint || 'Not yet. Look at the marked words again.'; Store.put(coll, id, d); }
  } catch (e) { App.notice = sampleError(e); }
  delete App.busy[key]; render();
}
