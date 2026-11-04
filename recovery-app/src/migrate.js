/* migrate.js: pure import of the two retired AI Studio apps' data.
   Accepts either studio's "Export" JSON, or a raw localStorage dump of their keys.
   readBundle() normalises, mergePlan() returns the writes to apply. Tested by test/test_logic.js. */
'use strict';

const M = (() => {
  const L_ = (typeof L !== 'undefined') ? L : require('./logic.js');
  const C_ = (typeof ERROR_TYPES !== 'undefined') ? { ERROR_TYPES, BOOKS } : require('./content.js');
  const safeId = s => String(s || '').replace(/[^A-Za-z0-9_\-.~:@+]/g, '-').slice(0, 120) || 'x';
  const day = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) ? s.slice(0, 10) : null;
  const parseMaybe = v => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return v; } };

  function mapType(t) {
    const s = (t || '').toLowerCase();
    if (C_.ERROR_TYPES.includes(t)) return t;
    const rules = [
      [/article.*plural|plural.*article/, 'Article with a plural'], [/missing.*article|article/, 'Missing article'],
      [/agreement/, 'Subject-verb agreement'], [/tense/, 'Verb tense'], [/infinitive|"to"|\bto\b/, 'Missing "to" before a verb'],
      [/adjective/, 'Noun used as an adjective'], [/spell/, 'Spelling'], [/preposition/, 'Preposition'],
      [/run-?on|splice/, 'Run-on or comma splice'], [/fragment/, 'Sentence fragment'], [/punctuat|comma/, 'Punctuation'],
      [/capital/, 'Capitalization'], [/word order|order/, 'Word order'], [/plural|singular/, 'Singular or plural noun'],
      [/word choice|diction|vocab|idiom|collocation/, 'Word choice'], [/verb form|participle|gerund/, 'Verb form']
    ];
    for (const [re, v] of rules) if (re.test(s)) return v;
    return 'Other';
  }
  const markBy = b => (b === 'self' || b === 'manual') ? 'self' : 'ai';
  const mapMark = m => ({ quote: m.quote || '', at: typeof m.at === 'number' ? m.at : -1, type: mapType(m.type), hint: m.hint || '', by: markBy(m.by),
    fixed: !!m.fixed, fix: m.fix || '', tries: m.tries || 0, note: m.note || '', errId: '' });

  /* ---------- Recovery Studio ---------- */
  function fromRecovery(d) {
    const out = blank();
    const a = d.appState || {};
    out.app = {
      startDate: day(a.startDate), phase: a.phase, phaseStarted: a.phaseStarted, weekStart: a.weekStart, restDays: a.restDays,
      anchorRoutine: a.anchorRoutine, anchorPlace: a.anchorPlace, noDelete: a.noDelete, pauseLimit: a.pauseLimit,
      reviewsPerWeek: a.reviewsPerWeek, sound: a.sound, publishPlace: a.publishPlace,
      form: a.form ? (/story/i.test(a.form) ? 'story' : 'essay') : undefined
    };
    for (const s of d.sessions || []) {
      const data = Object.assign({}, s.data || {});
      if (data.draftText && !data.text) data.text = data.draftText;
      delete data.draftText;
      out.sessions.push({ id: 'r-' + safeId(s.id), kind: s.kind, phase: s.phase || 1, date: day(s.date) || day(s.startedAt), status: s.status === 'done' ? 'done' : 'done',
        startedAt: s.startedAt || '', finishedAt: s.finishedAt || s.startedAt || '', step: 0, stepElapsed: 0, seconds: s.seconds || 0,
        words: s.words || L_.countWords(data.text), data, marks: (s.marks || []).map(mapMark), reviewed: !!s.reviewed, reviewedAt: '', imported: 'recovery' });
    }
    for (const p of d.pieces || []) {
      out.pieces.push({ id: 'r-' + safeId(p.id), phase: p.phase || 2, form: /story/i.test(p.form || '') ? 'story' : 'essay', title: p.title || '',
        status: L_.stagesFor(p.phase || 2).includes(p.status) ? p.status : 'draft', createdAt: p.createdAt || '', finishedAt: p.finishedAt || '',
        plan: Object.assign({ point: '', reader: '', notes: '' }, p.plan || {}), text: p.text || '', versions: p.versions || [], checks: p.checks || {},
        feedback: p.feedback || [], postedUrl: p.postedUrl || '', publishedUrl: p.publishedUrl || '', words: p.words || L_.countWords(p.text),
        marks: (p.marks || []).map(mapMark), reviewed: !!p.reviewed, reviewedAt: '', imported: 'recovery' });
    }
    for (const e of d.errors || []) {
      const date = day(e.date) || day((e.dates || [])[0]);
      if (!e.wrote || !date) continue;
      out.errors.push({ key: 'r:' + e.id, type: mapType(e.type), origType: e.type, wrote: e.wrote, correct: e.correct || '',
        by: e.by === 'plan' ? 'plan' : markBy(e.by), dates: (e.dates && e.dates.length ? e.dates.map(day).filter(Boolean) : [date]) });
    }
    for (const m of d.customModels || []) {
      if (!m.text) continue;
      out.models.push({ id: 'r-' + safeId(m.id), author: m.author || '', title: m.title || '', year: m.year || '', form: 'essay', source: m.source || '', text: m.text, words: L_.countWords(m.text) });
    }
    return out;
  }

  /* ---------- Unaided Studio ---------- */
  const U_KIND = { phase1_daily: 'phase1', franklin_notes: 'franklin1', franklin_rebuild: 'franklin2', sentence_combining: 'combining',
    summary_100w: 'summary', six_step_paragraph: 'paragraph', weekend_deep: 'piece', phase3_essay: 'piece', free_write: 'short' };
  const U_STATUS = { draft: 'draft', under_critique: 'feedback', revised: 'revise2', published: 'done' };
  function fromUnaided(d) {
    const out = blank();
    const h = d.habitAnchor || {};
    out.app = { phase: Number(d.currentPhase) || undefined };
    if (h.anchorSet) { out.app.anchorRoutine = h.routine; out.app.anchorPlace = h.place; }
    for (const s of d.sessions || []) {
      const date = day(s.date); if (!date) continue;
      const kind = U_KIND[s.drillType] || 'short';
      const text = s.content || '';
      const marks = [];
      for (const q of s.underlinedSnippets || []) if (q && text.includes(q)) marks.push({ quote: q, at: text.indexOf(q), type: 'Other', hint: '', by: 'self', fixed: false, fix: '', tries: 0, note: '', errId: '' });
      for (const e of s.aiErrorsFound || []) if (e.snippet && text.includes(e.snippet)) marks.push({ quote: e.snippet, at: text.indexOf(e.snippet), type: mapType(e.type), hint: e.hintQuestion || '', by: 'ai', fixed: false, fix: '', tries: 0, note: e.ruleExplanation || '', errId: '' });
      const data = kind === 'combining' ? { ways: [text] } : kind === 'paragraph' ? { draft: text } : { text };
      data.title = s.title || '';
      out.sessions.push({ id: 'u-' + safeId(s.id), kind, phase: Number(s.phase) || 1, date, status: 'done', startedAt: s.date, finishedAt: s.date, step: 0, stepElapsed: 0,
        seconds: Math.round((s.durationMinutes || 0) * 60), words: s.wordCount || L_.countWords(text), data, marks, reviewed: marks.some(m => m.by === 'ai'), reviewedAt: '', imported: 'unaided' });
    }
    for (const f of d.franklinSessions || []) {
      const date = day(f.date); if (!date || !f.originalText) continue;
      const mid = 'u-model-' + safeId(f.id);
      out.models.push({ id: mid, author: f.sourceAuthor || '', title: f.modelTitle || 'Imported model', year: '', form: 'essay', source: '', text: f.originalText, words: L_.countWords(f.originalText) });
      const n1 = 'u-f1-' + safeId(f.id);
      out.sessions.push({ id: n1, kind: 'franklin1', phase: 2, date, status: 'done', startedAt: f.date, finishedAt: f.date, step: 0, stepElapsed: 0, seconds: 0, words: 0,
        data: { modelId: mid, notes: f.sentenceNotes || [], shuffled: !!f.shuffled }, marks: [], reviewed: false, reviewedAt: '', imported: 'unaided' });
      if (f.rebuiltText) out.sessions.push({ id: 'u-f2-' + safeId(f.id), kind: 'franklin2', phase: 2, date, status: f.completed ? 'done' : 'done', startedAt: f.date, finishedAt: f.date,
        step: 0, stepElapsed: 0, seconds: 0, words: L_.countWords(f.rebuiltText),
        data: { notesId: n1, modelId: mid, text: f.rebuiltText, diffs: f.differencesNoted || ['', ''], keptAll: false, shuffled: !!f.shuffled }, marks: [], reviewed: false, reviewedAt: '', imported: 'unaided' });
    }
    for (const e of d.errorLog || []) {
      const date = day(e.dateAdded); if (!e.whatIWrote || !date) continue;
      out.errors.push({ key: 'u:' + e.id, type: mapType(e.errorType), origType: e.errorType, wrote: e.whatIWrote, correct: e.correctForm || '', by: 'self',
        dates: Array(Math.max(1, Number(e.frequency) || 1)).fill(date) });
    }
    for (const p of d.finishedPieces || []) {
      const phase = Number(p.phase) || 3;
      out.pieces.push({ id: 'u-' + safeId(p.id), phase, form: p.form === 'short_story' ? 'story' : 'essay', title: p.title || '', status: U_STATUS[p.draftStatus] || 'draft',
        createdAt: p.dateCreated || '', finishedAt: p.datePublished || '', plan: { point: '', reader: '', notes: '' }, text: p.content || '', versions: [], checks: {},
        feedback: (p.critiques || []).map(c => ({ by: c.reviewerName || 'Reader', notes: [c.keyFeedback, c.revisionMade ? 'Revision: ' + c.revisionMade : ''].filter(Boolean).join(' '), date: day(c.date) || '' })),
        postedUrl: '', publishedUrl: p.publishedUrl || '', words: p.wordCount || L_.countWords(p.content), marks: [], reviewed: false, reviewedAt: '', imported: 'unaided' });
    }
    for (const r of d.readingItems || []) {
      const b = C_.BOOKS.find(x => r.bookTitle && x.title.toLowerCase().includes(String(r.bookTitle).toLowerCase().slice(0, 12)));
      if (b && (r.completed || r.notes)) out.books[b.id] = { read: !!r.completed, notes: r.notes || '' };
    }
    return out;
  }

  function blank() { return { app: {}, sessions: [], pieces: [], errors: [], models: [], books: {}, sources: [] }; }
  function combine(a, b) {
    const o = blank();
    for (const k of ['sessions', 'pieces', 'errors', 'models', 'sources']) o[k] = a[k].concat(b[k]);
    o.books = Object.assign({}, a.books, b.books);
    o.app = Object.assign({}, b.app, a.app);   // Recovery settings win; phase handled in mergePlan
    o.app.phase = Math.max(a.app.phase || 0, b.app.phase || 0) || undefined;
    return o;
  }

  /* Normalise anything the user pastes or uploads. Returns a bundle or throws a readable Error. */
  function readBundle(input) {
    let d = parseMaybe(input);
    if (!d || typeof d !== 'object') throw new Error('That is not JSON from either studio.');
    let out = blank();
    const rawRec = d.english_writing_recovery_data_v2;
    const hasUnaidedKeys = Object.keys(d).some(k => k.startsWith('unaided_'));
    if (rawRec || hasUnaidedKeys) {
      if (rawRec) { out = combine(out, fromRecovery(parseMaybe(rawRec))); out.sources.push('Recovery Studio (browser data)'); }
      if (hasUnaidedKeys) {
        const u = { habitAnchor: parseMaybe(d.unaided_habit_anchor_v1), currentPhase: parseMaybe(d.unaided_current_phase_v1), sessions: parseMaybe(d.unaided_sessions_v1),
          errorLog: parseMaybe(d.unaided_error_log_v1), franklinSessions: parseMaybe(d.unaided_franklin_v1), finishedPieces: parseMaybe(d.unaided_finished_pieces_v1),
          readingItems: parseMaybe(d.unaided_reading_items_v1) };
        out = combine(out, fromUnaided(u)); out.sources.push('Unaided Studio (browser data)');
      }
    } else if (d.appState && Array.isArray(d.sessions)) { out = fromRecovery(d); out.sources.push('Recovery Studio export'); }
    else if ('errorLog' in d || 'habitAnchor' in d || 'finishedPieces' in d) { out = fromUnaided(d); out.sources.push('Unaided Studio export'); }
    else throw new Error('No Recovery Studio or Unaided Studio data found in that file.');
    return out;
  }

  /* Given the current store and a bundle, list the writes. Re-importing the same file adds nothing twice. */
  function mergePlan(cur, bundle, today) {
    const writes = [];
    const app = Object.assign({}, cur.app);
    const ba = bundle.app || {};
    if (ba.phase && ba.phase > (app.phase || 1)) { app.phase = ba.phase; app.phaseStarted = Object.assign({}, app.phaseStarted, { [ba.phase]: today }); }
    if (ba.startDate && (!app.startDate || ba.startDate < app.startDate)) app.startDate = ba.startDate;
    for (const k of ['anchorRoutine', 'anchorPlace', 'publishPlace']) if (ba[k] && !(app[k] || '').trim()) app[k] = ba[k];
    app.books = Object.assign({}, bundle.books, app.books);
    writes.push({ coll: 'state', id: 'app', doc: app });
    let s = 0, p = 0, m = 0, e = 0;
    for (const x of bundle.sessions) if (!cur.sessions[x.id] && x.date) { writes.push({ coll: 'sessions', id: x.id, doc: x }); s++; }
    for (const x of bundle.pieces) if (!cur.pieces[x.id]) { writes.push({ coll: 'pieces', id: x.id, doc: x }); p++; }
    for (const x of bundle.models) if (!cur.models[x.id]) { writes.push({ coll: 'models', id: x.id, doc: x }); m++; }
    const rows = Object.assign({}, cur.errors);
    for (const x of bundle.errors) {
      const id = L_.errorId(x.type, x.wrote);
      const row = rows[id] ? JSON.parse(JSON.stringify(rows[id])) : { id, type: x.type, wrote: x.wrote.trim(), correct: '', by: x.by, date: x.dates[0], dates: [], sources: [] };
      row.sources = row.sources || [];
      if (row.sources.includes(x.key)) continue;
      row.sources.push(x.key); row.dates = row.dates.concat(x.dates).sort();
      if (!row.correct && x.correct) row.correct = x.correct;
      if (x.origType && x.origType !== x.type) row.origType = x.origType;
      rows[id] = row; e++;
    }
    for (const id of Object.keys(rows)) if (rows[id] !== cur.errors[id]) writes.push({ coll: 'errors', id, doc: rows[id] });
    return { writes, report: { sources: bundle.sources, sessions: s, pieces: p, models: m, errors: e } };
  }

  return { readBundle, mergePlan, mapType };
})();

if (typeof module !== 'undefined') module.exports = M;
