/* Headless tests for logic.js and migrate.js.  Run: node test/test_logic.js */
'use strict';
const assert = require('assert');
const L = require('../src/logic.js');
const M = require('../src/migrate.js');
const C = require('../src/content.js');
const MODELS = require('../src/models.json');

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL ' + name + '\n', e); process.exitCode = 1; } };

const APP = { startDate: '2026-11-01', phase: 1, phaseStarted: { 1: '2026-11-01' }, weekStart: 0, restDays: [5, 6], pauseLimit: 60, reviewsPerWeek: 1, form: 'essay', top3: [] };
let seq = 0;
const S = (kind, date, extra) => Object.assign({ id: 's' + (++seq), kind, phase: 1, date, status: 'done', startedAt: date + 'T08:00:00Z', finishedAt: date + 'T08:' + String(10 + (seq % 50)).padStart(2, '0') + ':00Z', data: {}, marks: [], words: 0 }, extra || {});

/* dates: 2026-11-01 is a Sunday; Friday 6th and Saturday 7th are the Egypt weekend */
t('dates', () => {
  assert.strictEqual(L.dow('2026-11-01'), 0);
  assert.strictEqual(L.weekStartOf('2026-11-05', 0), '2026-11-01');
  assert.strictEqual(L.weekStartOf('2026-11-05', 6), '2026-10-31');
  assert.strictEqual(L.weekIndex('2026-11-01', '2026-11-08', 0), 2);
  assert.ok(L.isWeekend('2026-11-06', APP) && L.isWeekend('2026-11-07', APP) && !L.isWeekend('2026-11-08', APP));
  assert.strictEqual(L.addDays('2026-12-31', 1), '2027-01-01');
});

t('sentences', () => {
  assert.deepStrictEqual(L.splitSentences('The board did not boot. Dr. Ali checked it. it was fine! Was it?'), ['The board did not boot.', 'Dr. Ali checked it. it was fine!', 'Was it?']);
  assert.strictEqual(L.countWords('  one two\nthree '), 3);
  const r = L.sentenceReport('Short one. Word ' + 'word '.repeat(21).trim() + '.', 1);
  assert.ok(r[0].short && r[1].long);
  assert.strictEqual(L.sentenceAround('First one. The second has a examples here. Third.', 25), 'The second has a examples here.');
});

t('flows', () => {
  assert.deepStrictEqual(L.flowFor('phase1').map(s => s.min), [5, 15, 5]);
  assert.ok(L.flowFor('phase1')[1].sprint);
  assert.strictEqual(L.flowFor('franklin2', { shuffled: false }).length, 2);
  assert.strictEqual(L.flowFor('franklin2', { shuffled: true })[0].id, 'order');
  assert.deepStrictEqual(L.flowFor('franklin3').map(s => s.min), [8, 12, 5]);
  assert.strictEqual(L.flowFor('piece', { minutes: 60 })[0].min, 60);
  for (const k of Object.keys(L.FLOWS)) assert.ok(L.flowFor(k, { shuffled: true }).length > 0, k);
});

t('sprint rule', () => {
  assert.ok(L.sprintPasses({ words: 150, seconds: 900, paused: 0, maxPause: 40, interrupted: false }, 60));
  assert.ok(!L.sprintPasses({ words: 150, seconds: 900, paused: 1, maxPause: 61, interrupted: false }, 60));
  assert.ok(!L.sprintPasses({ words: 150, seconds: 900, paused: 0, maxPause: 10, interrupted: true }, 60));
  assert.ok(!L.sprintPasses({ words: 149, seconds: 900, paused: 0, maxPause: 10 }, 60));
});

t('phase 1 queue', () => {
  assert.strictEqual(L.nextAction(APP, [], [], MODELS, '2026-11-02').kind, 'phase1');
  assert.strictEqual(L.nextAction(APP, [], [], MODELS, '2026-11-06').kind, null);
  const act = L.nextAction(APP, [S('phase1', '2026-11-02', { status: 'active' })], [], MODELS, '2026-11-02');
  assert.ok(act.resume);
  assert.ok(L.nextAction(APP, [S('phase1', '2026-11-02')], [], MODELS, '2026-11-02').doneToday);
});

t('phase 2 drill queue follows Mon-Fri order and survives missed days', () => {
  const app = Object.assign({}, APP, { phase: 2 });
  const ss = [];
  const run = (date) => {
    const a = L.nextAction(app, ss, [], MODELS, date);
    ss.push(S(a.kind, date, { phase: 2, data: Object.assign({}, a.data) }));
    if (a.kind === 'franklin2') ss[ss.length - 1].data.notesId = a.data.notesId;
    return a.kind;
  };
  // Sun..Thu (the 4th weekday is the weekly article session), then a missed Sunday, resume Monday
  const seqKinds = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(run);
  assert.deepStrictEqual(seqKinds, ['franklin1', 'combining', 'franklin2', 'imitation', 'summary', 'paragraph', 'franklin1', 'combining', 'imitation']);
  assert.strictEqual(ss.filter(s => s.kind === 'imitation' && L.inWeek(s.date, '2026-11-12', 0)).length, 1, 'once a week');
  // the second notes session is the shuffled one
  const f1 = ss.filter(s => s.kind === 'franklin1');
  assert.strictEqual(!!f1[0].data.shuffled, false); assert.strictEqual(f1[1].data.shuffled, true);
  // weekend => piece
  const w = L.nextAction(app, ss, [], MODELS, '2026-11-13');
  assert.strictEqual(w.kind, 'piece'); assert.strictEqual(w.minutes, 60); assert.ok(w.newPiece);
});

t('phase 0: placement first, then grammar, imitation twice a week', () => {
  const app = Object.assign({}, APP, { phase: 0 });
  assert.strictEqual(L.nextAction(app, [], [], MODELS, '2026-11-08').kind, 'placement');
  const taken = S('placement', '2026-11-08', { phase: 0, data: { answers: [] } });
  const unmarked = L.nextAction(app, [taken], [], MODELS, '2026-11-09');
  assert.strictEqual(unmarked.kind, null); assert.strictEqual(unmarked.openId, taken.id);
  taken.data.result = [{ n: 1, ok: false }];
  const ss = [taken];
  const kinds = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-15', '2026-11-16'].map(d => {
    const a = L.nextAction(app, ss, [], MODELS, d); ss.push(S(a.kind, d, { phase: 0, data: Object.assign({}, a.data) })); return a.kind + (a.data && a.data.imitate ? '+imitate' : '');
  });
  // week 1: Mon(slot 1 because Sunday's placement counts) imitate, Tue, Wed(slot 3) imitate, Thu; week 2: Sun, Mon(slot 1) imitate
  assert.deepStrictEqual(kinds, ['grammar+imitate', 'grammar', 'grammar+imitate', 'grammar', 'grammar', 'grammar+imitate']);
  assert.strictEqual(L.nextAction(app, ss, [], MODELS, '2026-11-13').kind, null, 'weekend');
  assert.deepStrictEqual(L.flowFor('grammar', { imitate: true }).map(x => x.id), ['unit', 'article', 'patterns', 'imitate']);
});

t('phase 1: article session replaces the timed writing twice a week', () => {
  const ss = [];
  const kinds = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map(d => {
    const a = L.nextAction(APP, ss, [], MODELS, d); ss.push(S(a.kind, d, { data: Object.assign({}, a.data) })); return a.data && a.data.imitate ? 'imitate' : a.kind;
  });
  assert.deepStrictEqual(kinds, ['phase1', 'imitate', 'phase1', 'imitate', 'phase1']);
  assert.deepStrictEqual(L.flowFor('phase1', { imitate: true }).map(x => x.id), ['copy', 'article', 'patterns', 'imitate', 'check']);
  assert.ok(!L.flowFor('phase1', { imitate: true }).some(x => x.sprint), 'no sprint on imitation days');
});

t('phase 0 gate and placement areas', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ n, ok: ![4, 7].includes(n) }));
  assert.deepStrictEqual(L.flaggedAreas(items, C.AREAS), ['articles', 'punct']);
  assert.deepStrictEqual(L.flaggedAreas(items.map(i => Object.assign({}, i, { ok: true })), C.AREAS), []);
  const app = Object.assign({}, APP, { phase: 0 });
  let g = L.evaluateGates(app, [], [], [], [])[0];
  assert.strictEqual(g.items[0].label, 'Placement test taken and marked'); assert.ok(!g.met);
  app.p0 = { flagged: ['articles', 'punct'], areas: { articles: { done: true } } };
  const imit = (d, n, marked) => S('imitation', d, { phase: 0, reviewedAt: marked ? d + 'T10:00:00Z' : '', data: { imitations: [Array(3).fill('x'), Array(3).fill('y'), Array(3).fill('z')].map(a => a.slice(0, n)) } });
  const ss = [imit('2026-11-09', 3, true), imit('2026-11-10', 3, true), imit('2026-11-11', 3, false), S('gatetest', '2026-11-12', { phase: 0, data: { score: 8 } })];
  g = L.evaluateGates(app, ss, [], [], [])[0];
  assert.deepStrictEqual(g.items.map(i => [i.have, i.met]), [[1, false], [8, false], [18, false]]);
  app.p0.areas.punct = { done: true };
  ss.push(imit('2026-11-12', 1, true), S('gatetest', '2026-11-13', { phase: 0, data: { score: 9 } }));
  g = L.evaluateGates(app, ss, [], [], [])[0];
  assert.ok(g.met, JSON.stringify(g.items));
  app.p0 = { flagged: [], areas: {} };
  assert.ok(L.evaluateGates(app, ss, [], [], [])[0].items[0].met, 'nothing flagged means the first item is met');
});

t('Phase 0 and imitation prompts and reply checks', () => {
  const raw = C.PLACEMENT.map((_, i) => ({ n: i + 1, ok: i % 2 === 0, type: i === 1 ? 'Verb tense' : 'Nonsense', hint: 'h' }));
  const m = L.validateTestMarks(raw, 10, C.ERROR_TYPES);
  assert.strictEqual(m.length, 10); assert.strictEqual(m[1].type, 'Verb tense'); assert.strictEqual(m[3].type, 'Other'); assert.strictEqual(m[0].hint, '');
  assert.strictEqual(L.validateTestMarks(raw.slice(0, 9), 10, C.ERROR_TYPES), null);
  assert.ok(/Never write the corrected/.test(L.testMarkPrompt(C.PLACEMENT, [], C.ERROR_TYPES)));
  const names = C.AREAS.map(a => a.name);
  assert.strictEqual(L.validateNewTest(Array(10).fill({ sentence: 'He go to work.', area: 'Verb forms' }), names).length, 10);
  assert.strictEqual(L.validateNewTest(Array(9).fill({ sentence: 'He go to work.' }), names), null);
  const article = 'Most engineers learn to write the way they learn to debug. They repeat mistakes.\nGood writers read a lot. They also rewrite.';
  const good = { structure: 's', patterns: [{ model: 'They repeat mistakes.', pattern: 'p', grammar: 'g' }, { model: 'Good writers read a lot.', pattern: 'p', grammar: 'g' }, { model: 'They also rewrite.', pattern: 'p', grammar: 'g' }] };
  assert.strictEqual(L.validateBreakdown(good, article).patterns.length, 3);
  const bad = JSON.parse(JSON.stringify(good)); bad.patterns[0].model = 'An invented sentence.';
  assert.strictEqual(L.validateBreakdown(bad, article), null, 'models must be quoted from the article');
  assert.deepStrictEqual(L.parsePastedJson('Sure!\n```json\n{"a":1}\n```'), { a: 1 });
  assert.deepStrictEqual(L.parsePastedJson('x [1,2] y'), [1, 2]);
  assert.strictEqual(L.parsePastedJson('nothing'), undefined);
  const s = S('grammar', '2026-11-09', { data: { imitate: true, imitations: [['a', ''], ['b']], text: 'ignored' } });
  assert.strictEqual(L.mainText(s), 'a\nb');
  assert.strictEqual(L.reviewsThisWeek(APP, [Object.assign({}, s, { reviewedAt: '2026-11-09T10:00:00Z', reviewMode: 'drill' })], [], '2026-11-09'), 0, 'drill marking does not use the weekly review');
});

t('phase 2 rebuild waits a calendar day', () => {
  const app = Object.assign({}, APP, { phase: 2 });
  const ss = [S('franklin1', '2026-11-08', { phase: 2, data: { modelId: 'thoreau-woods' } }), S('combining', '2026-11-08', { phase: 2 })];
  assert.notStrictEqual(L.nextAction(app, ss, [], MODELS, '2026-11-08').kind, 'franklin2');
  assert.strictEqual(L.nextAction(app, ss, [], MODELS, '2026-11-09').kind, 'franklin2');
});

t('phase 3 week holds 2 drills and 3 piece days', () => {
  const app = Object.assign({}, APP, { phase: 3 });
  const ss = []; const days = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
  const kinds = days.map(d => { const a = L.nextAction(app, ss, [], MODELS, d); ss.push(S(a.kind, d, { phase: 3 })); return a.kind; });
  assert.deepStrictEqual(kinds, ['piece', 'franklin3', 'piece', 'combining', 'piece']);
  const story = Object.assign({}, app, { form: 'story' });
  const m = L.nextModel(MODELS, 'story', []);
  assert.strictEqual(m.form, 'story');
  assert.strictEqual(L.nextAction(story, [S('piece', '2026-11-08', { phase: 3 })], [], MODELS, '2026-11-09').data.modelId, m.id);
});

t('phase 4 weekly rebuild', () => {
  const app = Object.assign({}, APP, { phase: 4 });
  assert.strictEqual(L.nextAction(app, [], [], MODELS, '2026-11-08').kind, 'piece');
  assert.strictEqual(L.nextAction(app, [S('piece', '2026-11-08', { phase: 4 })], [], MODELS, '2026-11-09').kind, 'franklin3');
  assert.strictEqual(L.nextAction(app, [S('piece', '2026-11-08', { phase: 4 }), S('franklin3', '2026-11-09', { phase: 4 })], [], MODELS, '2026-11-10').kind, 'piece');
});

t('models rotate', () => {
  const a = L.nextModel(MODELS, 'essay', []);
  const b = L.nextModel(MODELS, 'essay', [S('franklin1', '2026-11-02', { data: { modelId: a.id } })]);
  assert.notStrictEqual(a.id, b.id);
  const o = L.shuffleOrder(6, 'abc');
  assert.deepStrictEqual(o.slice().sort(), [0, 1, 2, 3, 4, 5]);
  assert.notDeepStrictEqual(o, [0, 1, 2, 3, 4, 5]);
  assert.deepStrictEqual(o, L.shuffleOrder(6, 'abc'));
});

t('every model is public domain length and has a source', () => {
  for (const m of MODELS) { assert.ok(+m.year < 1929, m.id); assert.ok(/^https:\/\/www\.gutenberg\.org\//.test(m.source), m.id); assert.ok(m.words >= 100 && m.words <= 160, m.id); }
});

t('pieces: stages and blockers', () => {
  assert.deepStrictEqual(L.stagesFor(2), ['plan', 'draft', 'revise', 'done']);
  assert.deepStrictEqual(L.stagesFor(4).slice(-2), ['publish', 'done']);
  const ids = C.REVISION_CHECKS.map(c => c[0]);
  let p = { id: 'p1', phase: 3, form: 'essay', status: 'plan', plan: { point: '', reader: '' }, text: '', checks: {}, feedback: [], versions: [] };
  assert.strictEqual(L.stageBlockers(p, ids).length, 2);
  p.plan = { point: 'Debugging is reading', reader: 'New Hub students' };
  p = L.advancePiece(p, ids, '2026-11-08T10:00:00Z'); assert.strictEqual(p.status, 'draft');
  p.text = 'word '.repeat(820);
  p = L.advancePiece(p, ids, 'x'); assert.strictEqual(p.status, 'revise');
  assert.strictEqual(L.advancePiece(p, ids, 'x').status, 'revise');
  ids.forEach(i => { p.checks[i] = true; });
  p = L.advancePiece(p, ids, 'x'); assert.strictEqual(p.status, 'feedback');
  p.feedback = [{ by: 'Mona', notes: 'ok' }, { by: 'mona ', notes: 'dup' }];
  assert.strictEqual(L.advancePiece(p, ids, 'x').status, 'feedback');
  p.feedback.push({ by: 'Omar', notes: 'cut the intro' });
  p = L.advancePiece(p, ids, 'x'); assert.strictEqual(p.status, 'revise2');
  assert.strictEqual(L.advancePiece(p, ids, 'x').status, 'revise2', 'unchanged text blocks');
  p.text += ' more';
  p = L.advancePiece(p, ids, '2026-11-20T10:00:00Z'); assert.strictEqual(p.status, 'done'); assert.ok(p.finishedAt);
  assert.deepStrictEqual(L.pieceTarget({ phase: 3, form: 'story' }, C.FORMS), [1500, 3000]);
});

t('error log: one row per wrong form', () => {
  const r1 = L.logError(null, { type: 'Spelling', wrote: 'mangment ', correct: '', by: 'self', date: '2026-11-02' });
  const r2 = L.logError(r1, { type: 'Spelling', wrote: 'Mangment', correct: 'management', by: 'claude', date: '2026-11-03' });
  assert.strictEqual(r1.id, r2.id); assert.strictEqual(r2.dates.length, 2); assert.strictEqual(r2.correct, 'management'); assert.strictEqual(r2.by, 'self');
  assert.strictEqual(r1.dates.length, 1, 'input not mutated');
});

t('gate 1', () => {
  const errs = ['Spelling', 'Verb tense', 'Preposition', 'Missing article'].map((type, i) => ({ id: 'e' + i, type, wrote: 'x' + i, dates: ['2026-11-02', '2026-11-03'] }));
  const ss = [];
  for (let i = 0; i < 15; i++) ss.push(S('phase1', L.addDays('2026-11-01', i), { data: { sprint: { words: 120, seconds: 900, paused: 0, maxPause: 20 } } }));
  let g = L.evaluateGates(APP, ss, [], errs, []);
  assert.ok(g[1].items[0].met && !g[1].items[1].met && g[1].items[2].met && !g[1].met);
  ss.push(S('phase1', '2026-11-20', { data: { sprint: { words: 160, seconds: 900, paused: 1, maxPause: 70 } } }));
  assert.ok(!L.evaluateGates(APP, ss, [], errs, [])[1].met, 'paused sprint does not count');
  ss.push(S('short', '2026-11-21', { data: { sprint: { words: 155, seconds: 600, paused: 0, maxPause: 30 } } }));
  g = L.evaluateGates(APP, ss, [], errs, []);
  assert.ok(g[1].met); assert.strictEqual(g[1].items[1].have, 155);
});

t('gate 2 error rate uses latest 900+ Claude-marked words', () => {
  const app = Object.assign({}, APP, { phase: 2, top3: ['Spelling', 'Verb tense', 'Preposition'] });
  const mk = (type, by) => ({ quote: 'q', type, by: by || 'claude' });
  const pieces = [
    { id: 'a', phase: 2, status: 'done', reviewedAt: '2026-12-01T00:00:00Z', words: 500, marks: [mk('Spelling'), mk('Spelling'), mk('Spelling')] },
    { id: 'b', phase: 2, status: 'done', reviewedAt: '2026-12-08T00:00:00Z', words: 500, marks: [mk('Spelling'), mk('Verb tense', 'self')] }
  ];
  let r = L.top3Rate(app.top3, [], pieces);
  assert.strictEqual(r.words, 1000); assert.strictEqual(r.perType[0].count, 4); assert.ok(Math.abs(r.perType[0].per300 - 1.2) < 1e-9); assert.ok(!r.met);
  pieces.push({ id: 'c', phase: 2, status: 'done', reviewedAt: '2026-12-15T00:00:00Z', words: 450, marks: [] });
  r = L.top3Rate(app.top3, [], pieces);
  assert.strictEqual(r.words, 950); assert.ok(r.met, 'oldest piece drops out of the window');
  const ss = []; for (let i = 0; i < 6; i++) ss.push(S('franklin2', '2026-11-1' + i, { phase: 2, data: { keptAll: true } }));
  for (let i = 0; i < 6; i++) pieces.push({ id: 'w' + i, phase: 2, status: 'done', words: 400, marks: [] });
  const g = L.evaluateGates(app, ss, pieces, [], []);
  assert.ok(g[2].items[0].met && g[2].items[1].met && g[2].items[2].met && g[2].met);
});

t('gate 3', () => {
  const p = i => ({ id: 'p' + i, phase: 3, status: 'done', words: 900, feedback: [{ by: 'A' }, { by: 'B' }] });
  const crit = [1, 2, 3, 4].map(i => ({ id: 'c' + i }));
  let g = L.evaluateGates(APP, [], [p(1), p(2), p(3)], [], crit);
  assert.ok(g[3].items[0].met && g[3].items[1].met && !g[3].items[2].met);
  g = L.evaluateGates(APP, [], [p(1), p(2), p(3)], [], crit.concat([{ id: 'c5' }]));
  assert.ok(g[3].met);
});

t('top 3 and drill targets', () => {
  const errs = [{ type: 'Spelling', dates: [1, 2, 3] }, { type: 'Spelling', dates: [1] }, { type: 'Other', dates: [1, 2, 3, 4, 5] }, { type: 'Verb tense', dates: [1, 2] }, { type: 'Preposition', dates: [1] }];
  assert.deepStrictEqual(L.computeTop3(errs), ['Spelling', 'Verb tense', 'Preposition']);
  assert.deepStrictEqual(L.drillTargets(errs, []).map(d => d.type), ['Other', 'Spelling']);
});

t('Claude marks must quote the draft exactly and carry no correction', () => {
  const text = 'I give me a examples. The board are fine. The board are fine.';
  const raw = [{ quote: 'a examples', type: 'Article with a plural', hint: 'Plural?', note: 'rule', fix: 'examples', correct: 'examples' },
    { quote: 'board are', type: 'Subject-verb agreement' }, { quote: 'board are', type: 'Subject-verb agreement' }, { quote: 'board are', type: 'X' },
    { quote: 'not in draft', type: 'Spelling' }, { quote: '', type: 'Spelling' }, 'junk'];
  const ms = L.validateMarks(raw, text, C.ERROR_TYPES);
  assert.strictEqual(ms.length, 3);
  assert.ok(ms.every(m => !('correct' in m) && m.fix === '' && m.by === 'claude'));
  assert.strictEqual(text.slice(ms[1].at, ms[1].at + 9), 'board are'); assert.ok(ms[2].at > ms[1].at);
  assert.deepStrictEqual(L.validateMarks({}, text, C.ERROR_TYPES), []);
  assert.strictEqual(L.parsePastedMarks('Here you go:\n[{"quote":"a examples","type":"Article with a plural","hint":"h","note":"n"}]', text, C.ERROR_TYPES).length, 1);
  assert.strictEqual(L.parsePastedMarks('no json', text, C.ERROR_TYPES), null);
  assert.ok(/Never rewrite/.test(L.reviewPrompt(text, ['Spelling'], C.ERROR_TYPES)));
  assert.deepStrictEqual(L.validateRepair({ ok: 'yes', hint: 'x' }), { ok: false, hint: 'x' });
});

t('weekly tracker and reviews quota', () => {
  const app = Object.assign({}, APP);
  const ss = [S('phase1', '2026-11-02', { words: 160 }), S('phase1', '2026-11-03', { words: 140, reviewedAt: '2026-11-03T10:00:00Z' }), S('phase1', '2026-11-09', { words: 100 })];
  const rows = L.weekRows(app, ss, [{ type: 'Spelling', dates: ['2026-11-02', '2026-11-03'] }], '2026-11-10');
  assert.strictEqual(rows.length, 2); assert.strictEqual(rows[0].sessions, 2); assert.strictEqual(rows[0].words, 300); assert.strictEqual(rows[0].common, 'Spelling (2)');
  assert.strictEqual(L.reviewsThisWeek(app, ss, [], '2026-11-05'), 1);
  assert.strictEqual(L.reviewsThisWeek(app, ss, [], '2026-11-09'), 0);
  assert.strictEqual(L.daysSinceLast(ss, '2026-11-23'), 14);
});

/* ---------- migrate ---------- */
const RECOVERY = { appState: { startDate: '2026-10-20', phase: 2, weekStart: 0, restDays: [5, 6], anchorRoutine: 'After coffee', anchorPlace: 'Desk', form: 'Reflective Essay', top3: ['Tense Shift'] },
  sessions: [{ id: 'a1', kind: 'phase1', phase: 1, date: '2026-10-21', status: 'done', startedAt: '2026-10-21T08:00:00Z', data: { draftText: 'I goes home.' }, marks: [{ quote: 'goes', type: 'Subject-Verb Agreement', by: 'gemini' }], words: 3 }],
  pieces: [{ id: 'pz', phase: 2, title: 'T', status: 'revise', text: 'abc', plan: { point: 'p' } }],
  errors: [{ id: 'x', type: 'Subject-Verb Agreement', wrote: 'I goes', correct: 'I go', by: 'gemini', date: '2026-10-21', dates: ['2026-10-21', '2026-10-22'] }],
  customModels: [] };
const UNAIDED = { habitAnchor: { routine: 'When I wake', place: 'kitchen', anchorSet: true }, currentPhase: 1,
  sessions: [{ id: 'u1', date: '2026-10-25T09:00:00Z', phase: 1, drillType: 'phase1_daily', title: 'Day', content: 'The board did not boot. I has a examples.', wordCount: 9, durationMinutes: 15,
    selfFoundErrorsCount: 1, underlinedSnippets: ['I has'], aiErrorsFound: [{ type: 'Article', snippet: 'a examples', sentence: '', ruleExplanation: 'r', hintQuestion: 'h' }], completed: true }],
  errorLog: [{ id: 'k', errorType: 'Subject-Verb Agreement', whatIWrote: 'I goes', correctForm: 'I go', dateAdded: '2026-10-25T00:00:00Z', frequency: 3 }],
  finishedPieces: [{ id: 'f', title: 'Essay', phase: 3, form: 'essay', wordCount: 3, content: 'a b c', draftStatus: 'under_critique', critiques: [{ reviewerName: 'Sara', keyFeedback: 'Cut it', revisionMade: '', date: '2026-10-26' }], dateCreated: '2026-10-24' }],
  readingItems: [{ phase: 1, bookTitle: 'Several Short Sentences About Writing', notes: 'good', completed: true }] };

t('import Recovery export', () => {
  const b = M.readBundle(JSON.stringify(RECOVERY));
  assert.deepStrictEqual(b.sources, ['Recovery Studio export']);
  assert.strictEqual(b.sessions[0].data.text, 'I goes home.'); assert.strictEqual(b.sessions[0].marks[0].by, 'ai'); assert.strictEqual(b.sessions[0].marks[0].type, 'Subject-verb agreement');
  assert.strictEqual(b.app.form, 'essay');
});

t('import Unaided export and raw localStorage dump; merge is idempotent', () => {
  const u = M.readBundle(UNAIDED);
  assert.strictEqual(u.sessions[0].kind, 'phase1'); assert.strictEqual(u.sessions[0].date, '2026-10-25'); assert.strictEqual(u.sessions[0].marks.length, 2);
  assert.strictEqual(u.pieces[0].status, 'feedback'); assert.strictEqual(u.pieces[0].feedback[0].by, 'Sara');
  assert.strictEqual(u.books.klinkenborg.read, true);
  const dump = { english_writing_recovery_data_v2: JSON.stringify(RECOVERY), unaided_sessions_v1: JSON.stringify(UNAIDED.sessions), unaided_error_log_v1: JSON.stringify(UNAIDED.errorLog),
    unaided_current_phase_v1: '1', unaided_franklin_v1: JSON.stringify([{ id: 'fr', date: '2026-10-27', modelTitle: 'M', originalText: 'One. Two.', sourceAuthor: 'A', sentenceNotes: ['one', 'two'], shuffled: false, rebuiltText: 'One. Two.', differencesNoted: ['a', 'b'], step: 'compare', completed: true }]) };
  const b = M.readBundle(dump);
  assert.strictEqual(b.sources.length, 2); assert.strictEqual(b.app.phase, 2);
  assert.ok(b.sessions.some(s => s.kind === 'franklin2' && s.data.notesId === 'u-f1-fr'));
  const cur = { app: { phase: 1, startDate: '2026-11-01', anchorRoutine: '' }, sessions: {}, pieces: {}, errors: {}, models: {} };
  const plan = M.mergePlan(cur, b, '2026-11-04');
  const app = plan.writes.find(w => w.coll === 'state').doc;
  assert.strictEqual(app.phase, 2); assert.strictEqual(app.startDate, '2026-10-20'); assert.strictEqual(app.anchorRoutine, 'After coffee');
  const row = plan.writes.find(w => w.coll === 'errors').doc;
  assert.strictEqual(row.type, 'Subject-verb agreement'); assert.strictEqual(row.dates.length, 5, '2 from Recovery + 3 from Unaided');
  // apply, then re-import: nothing new
  for (const w of plan.writes) if (w.coll !== 'state') cur[w.coll][w.id] = w.doc;
  const again = M.mergePlan(cur, b, '2026-11-04');
  assert.strictEqual(again.report.sessions + again.report.errors + again.report.pieces, 0);
  assert.throws(() => M.readBundle('{"foo":1}'), /No Recovery Studio/);
  assert.throws(() => M.readBundle('nope'), /not JSON/);
});

console.log(n + ' test groups passed' + (process.exitCode ? ' (with failures above)' : ''));
