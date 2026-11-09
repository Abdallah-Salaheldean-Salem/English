/* app_phase0.js: Phase 0 (placement test, grammar sessions, gate test) and the sentence imitation drill (article session).
   Adds its steps to STEPS and provides the panels the views use. */
'use strict';

/* Re-draw whatever is on screen: the session step if a session is open, otherwise the page. */
function refresh() {
  const f = document.getElementById('focus');
  if (f && !f.hidden && (Engine.s || Engine.done)) showFocus(); else render();
}

/* One request to Claude that returns JSON. Inside the Claude viewer (or with an API key) it is a button;
   elsewhere it is copy-the-request, paste-the-reply. apply(raw) returns an error message or null. */
function claudeTask(o) {
  const box = h('div', { class: 'review' });
  if (o.intro) box.append(h('p', null, o.intro));
  if (App.busy[o.key]) { box.classList.add('busy'); box.append(h('p', null, App.busy[o.key])); return box; }
  const out = h('p', { class: 'muted small' });
  if (App.sample) {
    box.append(h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: async () => {
      App.busy[o.key] = o.busyText || 'Claude is working…'; refresh();
      let err = null;
      try { err = o.apply(await App.sample.json(o.prompt(), { cache: false })); }
      catch (e) { err = sampleError(e); if (e && e.code === 'not_granted') App.sample = null; }
      delete App.busy[o.key];
      if (err) App.notice = err;
      refresh();
    } }, o.label), out));
    return box;
  }
  const ta = h('textarea', { class: 'sheet small', rows: 4, placeholder: 'Paste Claude’s whole reply here', 'aria-label': 'Claude reply' });
  box.append(h('p', { class: 'small' }, 'Copy the request into a Claude chat, then paste the whole reply back here.'),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(o.prompt(), out) }, 'Copy request'), out), ta,
    h('button', { class: 'btn', onclick: () => {
      const raw = L.parsePastedJson(ta.value);
      if (raw === undefined) { out.textContent = 'No JSON found in that reply. Paste all of it.'; return; }
      const err = o.apply(raw);
      if (err) out.textContent = err; else refresh();
    } }, 'Use the reply'));
  return box;
}

const areaById = id => AREAS.find(a => a.id === id);
const studyAreas = () => { const f = (app().p0 || {}).flagged; return f && f.length ? f : AREAS.map(a => a.id); };
function saveP0(patch) { saveApp({ p0: Object.assign({}, app().p0 || {}, patch) }); }
function blankImitations() { return [['', '', ''], ['', '', ''], ['', '', '']]; }

/* ---------- marking: tests and drills ---------- */
function testSentences(s) { return s.kind === 'placement' ? PLACEMENT : (s.data.sentences || []).map(x => x.sentence); }
function testMarkTask(sid) {
  const s = Store.get('sessions', sid);
  return claudeTask({
    key: 'mark-' + sid, label: 'Ask Claude to mark it', busyText: 'Claude is marking your test…',
    intro: 'Claude marks each sentence right or wrong and names the error. It does not give the corrected sentence.',
    prompt: () => L.testMarkPrompt(testSentences(s), s.data.answers || [], ERROR_TYPES),
    apply: raw => {
      const cur = Store.get('sessions', sid), sents = testSentences(cur);
      const items = L.validateTestMarks(raw, sents.length, ERROR_TYPES);
      if (!items) return 'Claude’s reply did not mark all ' + sents.length + ' sentences. Try again.';
      const d = clone(cur);
      d.data.result = items; d.data.score = items.filter(i => i.ok).length;
      for (const i of items) if (!i.ok && (d.data.answers[i.n - 1] || '').trim()) {
        const wrote = d.data.answers[i.n - 1].replace(/\?\s*$/, '').trim();
        const row = L.logError(Store.get('errors', L.errorId(i.type, wrote)), { type: i.type, wrote, correct: '', by: 'claude', date: L.iso() });
        Store.put('errors', row.id, row, true);
      }
      Store.put('sessions', sid, d, true);
      if (cur.kind === 'placement') saveP0({ flagged: L.flaggedAreas(items, AREAS), placementId: sid, areas: (app().p0 || {}).areas || {} });
      else saveP0({ test: null });
      return null;
    }
  });
}
function testResult(s) {
  const r = s.data.result; if (!r) return '';
  const sents = testSentences(s);
  const kids = [h('p', { class: s.data.score >= 9 ? 'good' : 'lead' }, s.data.score + ' of ' + sents.length + ' right.' + (s.kind === 'gatetest' ? (s.data.score >= 9 ? ' This passes the Phase 0 test.' : ' The gate needs 9.') : ''))];
  kids.push(h('ol', { class: 'testres' }, r.map(i => h('li', { class: i.ok ? 'ok' : 'no' },
    h('span', { class: 'mark', 'aria-label': i.ok ? 'right' : 'wrong' }, i.ok ? '✓' : '✗'),
    h('span', null, h('span', { class: 'muted small' }, sents[i.n - 1]), h('br'), (s.data.answers || [])[i.n - 1] || '(blank)',
      i.ok ? '' : [h('br'), h('span', { class: 'tag' }, i.type), ' ', h('span', { class: 'hint' }, i.hint)])))));
  if (s.kind === 'placement') {
    const f = L.flaggedAreas(r, AREAS);
    kids.push(h('p', null, h('strong', null, 'Areas to study: '), f.length ? f.map(id => areaById(id).name).join(', ') : 'none. Every area was right.'));
  }
  return h('div', { class: 'stack' }, kids);
}
/* Marks on imitation sentences or Part B, without using the weekly piece review. */
function drillMarkTask(sid) {
  const s = Store.get('sessions', sid);
  const text = s.kind === 'placement' ? (s.data.partB || '') : L.mainText(s);
  if (!text.trim()) return '';
  if (s.reviewedAt) return h('div', { class: 'review done' }, h('strong', null, 'Marked by Claude'), ': ' + plural((s.marks || []).filter(m => m.by === 'claude').length, 'problem') + '. Fix each one yourself in Writing.');
  return claudeTask({
    key: 'drill-' + sid, label: s.kind === 'placement' ? 'Ask Claude to mark Part B' : 'Ask Claude to mark your imitations', busyText: 'Claude is reading your sentences…',
    intro: s.kind === 'placement' ? 'Part B: Claude points at the errors in your 5 sentences. Each one goes into your error log.' : 'Claude marks your imitation sentences. Every error goes into your error log. This does not use your weekly review.',
    prompt: () => L.reviewPrompt(text, currentTop3(), ERROR_TYPES),
    apply: raw => { if (!Array.isArray(raw)) return 'Claude’s reply could not be read. Try again.'; applyReview('sessions', sid, L.validateMarks(raw, text, ERROR_TYPES), 'drill'); return null; }
  });
}

/* ---------- session steps ---------- */
function testRows(d, sents, flash) {
  return h('ol', { class: 'testlist' }, sents.map((t, i) => h('li', null, h('p', { class: 'src' }, t),
    h('input', { type: 'text', value: d.answers[i], 'aria-label': 'Your corrected sentence ' + (i + 1), autocomplete: 'off', spellcheck: false,
      onpaste: e => { e.preventDefault(); flash('Paste is off.'); }, oninput: e => { d.answers[i] = e.target.value; } }))));
}
Object.assign(STEPS, {
  test(s, flash) {
    const d = s.data; d.answers = d.answers && d.answers.length === 10 ? d.answers : PLACEMENT.slice(); d.partB = d.partB || '';
    const c = counter('pb', L.splitSentences(d.partB).length + ' of 5 sentences');
    return { el: h('div', { class: 'stack' },
      p('No AI, no grammar checker, no dictionary. If you are unsure, guess and add "?" to the end.', 'lead'),
      h('h3', null, 'Part A: correct each sentence'), p('Some have more than one error. Edit the sentence in its box.', 'muted small'),
      testRows(d, PLACEMENT, flash),
      h('h3', null, 'Part B: write 5 sentences about what you did yesterday'),
      writeArea({ id: 'partb', value: d.partB, rows: 6, flash, label: 'Part B', oninput: v => { d.partB = v; c.textContent = L.splitSentences(v).length + ' of 5 sentences'; } }),
      h('div', { class: 'meta' }, c)),
      ready: () => L.splitSentences(d.partB).length >= 5 ? null : 'Write 5 sentences in Part B.' };
  },
  gtest(s, flash) {
    const d = s.data, sents = (d.sentences || []).map(x => x.sentence);
    d.answers = d.answers && d.answers.length === sents.length ? d.answers : sents.slice();
    return { el: h('div', { class: 'stack' }, p('A new test from Claude. Correct each sentence; some have more than one error. 9 right passes Phase 0.', 'lead'), testRows(d, sents, flash)), ready: () => null };
  },
  unit(s, flash) {
    const d = s.data, p0 = app().p0 || {};
    const ids = studyAreas();
    d.area = d.area || ids.find(id => !(p0.areas && p0.areas[id] && p0.areas[id].done)) || ids[0];
    d.checks = d.checks || {};
    const info = h('p', { class: 'muted small' }, areaById(d.area).covers);
    return { el: h('div', { class: 'stack' },
      p('One unit from Murphy, English Grammar in Use: read the rule on the left page, do the exercises on the right, then check them with the answer key at the back.', 'lead'),
      h('label', { class: 'field' }, 'Area', h('select', { onchange: e => { d.area = e.target.value; info.textContent = areaById(d.area).covers; } },
        ids.map(id => h('option', { value: id, selected: id === d.area }, areaById(id).name + (p0.areas && p0.areas[id] && p0.areas[id].done ? ' (done)' : ''))))), info,
      h('label', { class: 'field' }, 'Unit', h('input', { type: 'text', value: d.unit || '', placeholder: 'e.g. Unit 7, present perfect and past simple', oninput: e => { d.unit = e.target.value; } })),
      [['rule', 'Read the rule'], ['ex', 'Did the exercises'], ['key', 'Checked them with the answer key']].map(([k, l]) =>
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!d.checks[k], onchange: e => { d.checks[k] = e.target.checked; } }), ' ' + l))),
      ready: () => !(d.unit || '').trim() ? 'Write which unit you did.' : !(d.checks.rule && d.checks.ex && d.checks.key) ? 'Tick all three once you have done them.' : null,
      commit: () => {
        const areas = clone((app().p0 || {}).areas || {}); const a = areas[d.area] || (areas[d.area] = { done: false, units: [] });
        a.units = (a.units || []).filter(u => u !== d.unit.trim()).concat([d.unit.trim()]);
        saveP0({ areas });
      } };
  },
  use(s, flash) {
    const d = s.data, c = counter('us', L.splitSentences(d.text).length + ' of 5 sentences');
    return { el: h('div', { class: 'stack' }, p('Write 5 sentences of your own that use this unit’s grammar, about your work or your day.', 'lead'),
      p(d.unit || '', 'topic'),
      writeArea({ id: 'use', value: d.text, rows: 7, flash, oninput: v => { d.text = v; c.textContent = L.splitSentences(v).length + ' of 5 sentences'; } }), h('div', { class: 'meta' }, c)),
      ready: () => L.splitSentences(d.text).length >= 5 ? null : 'Write 5 sentences.' };
  },
  article(s) {
    const d = s.data;
    const c = counter('aw', L.countWords(d.source) + ' words');
    return { el: h('div', { class: 'stack' },
      p('Choose an article you would like to be able to write, in your field or the kind of writing you want to do. Paste 2-3 paragraphs.', 'lead'),
      h('details', null, h('summary', null, 'How the drill works (example)'),
        h('p', { class: 'small' }, h('strong', null, 'Model: '), IMITATION_EXAMPLE.model), h('p', { class: 'small' }, h('strong', null, 'Pattern: '), IMITATION_EXAMPLE.pattern),
        h('p', { class: 'small' }, h('strong', null, 'Grammar inside it: '), IMITATION_EXAMPLE.grammar), h('p', { class: 'small' }, h('strong', null, 'Your imitation: '), IMITATION_EXAMPLE.imitation)),
      h('label', { class: 'field' }, 'Article title', h('input', { type: 'text', value: d.article || '', oninput: e => { d.article = e.target.value; } })),
      h('label', { class: 'field' }, 'Link (optional)', h('input', { type: 'url', value: d.link || '', oninput: e => { d.link = e.target.value; } })),
      h('label', { class: 'field' }, '2-3 paragraphs (pasting is fine here: this is the model, not your writing)',
        h('textarea', { class: 'sheet small', rows: 8, value: d.source || '', 'aria-label': 'Article paragraphs', oninput: e => { d.source = e.target.value; c.textContent = L.countWords(e.target.value) + ' words'; } })),
      h('div', { class: 'meta' }, c)),
      ready: () => L.countWords(d.source) >= 40 ? null : 'Paste 2-3 paragraphs (40 words or more).' };
  },
  patterns(s, flash) {
    const d = s.data;
    if (d.selfFind === undefined) d.selfFind = sessions().filter(x => x.status === 'done' && L.hasImitation(x)).length >= 4;
    const box = h('div', { class: 'stack' });
    if (!d.selfFind) {
      box.append(p('Claude breaks down one paragraph: how it is built, then 3 sentence patterns and the grammar inside each.', 'lead'));
      if (d.breakdown) {
        box.append(h('p', null, h('strong', null, 'Structure: '), d.breakdown.structure),
          h('ol', { class: 'pats' }, d.breakdown.patterns.map(x => h('li', null, h('p', { class: 'src' }, x.model), h('p', null, h('strong', null, 'Pattern: '), x.pattern), h('p', { class: 'muted small' }, x.grammar)))));
      } else {
        box.append(claudeTask({ key: 'bd-' + s.id, label: 'Ask Claude for the breakdown', busyText: 'Claude is breaking the paragraph down…',
          prompt: () => L.breakdownPrompt(d.source),
          apply: raw => { const b = L.validateBreakdown(raw, d.source); if (!b) return 'The breakdown did not quote 3 sentences exactly from your article. Try again.'; d.breakdown = b; d.patterns = b.patterns; Engine.save(); return null; } }));
      }
      box.append(h('button', { class: 'btn quiet small', onclick: () => { d.selfFind = true; showFocus(); } }, 'Find the patterns myself instead'));
    } else {
      const sents = L.splitSentences(d.source);
      d.patterns = d.patterns && d.patterns.length === 3 ? d.patterns : [0, 1, 2].map(i => ({ model: sents[i] || '', pattern: '', grammar: '' }));
      box.append(p('Find 3 sentence patterns yourself: pick a sentence, write its structure as a formula, and name the grammar inside it. Claude only checks them.', 'lead'),
        h('ol', { class: 'pats' }, d.patterns.map((x, i) => h('li', null,
          h('label', { class: 'field' }, 'Model sentence', h('select', { onchange: e => { x.model = e.target.value; } }, sents.map(t => h('option', { value: t, selected: t === x.model }, t.length > 90 ? t.slice(0, 88) + '…' : t)))),
          h('label', { class: 'field' }, 'Pattern', h('input', { type: 'text', value: x.pattern, placeholder: '[Group] + [verb] + the way they + [verb]: …', oninput: e => { x.pattern = e.target.value; } })),
          h('label', { class: 'field' }, 'Grammar inside it', h('input', { type: 'text', value: x.grammar, oninput: e => { x.grammar = e.target.value; } })),
          d.patternCheck && d.patternCheck[i] ? h('p', { class: d.patternCheck[i].ok ? 'good small' : 'note small' }, d.patternCheck[i].ok ? 'Checked: right.' : d.patternCheck[i].note) : ''))),
        claudeTask({ key: 'pc-' + s.id, label: 'Ask Claude to check my patterns', busyText: 'Claude is checking your patterns…',
          prompt: () => L.patternCheckPrompt(d.patterns), apply: raw => { const r = L.validatePatternCheck(raw, 3); if (!r) return 'Claude’s reply could not be read. Try again.'; d.patternCheck = r; Engine.save(); return null; } }));
    }
    return { el: box, ready: () => d.patterns && d.patterns.length === 3 && d.patterns.every(x => x.model && (x.pattern || '').trim()) ? null : d.selfFind ? 'Write a pattern for each of the 3 sentences.' : 'Get the breakdown first, or find the patterns yourself.' };
  },
  imitate(s, flash) {
    const d = s.data; d.imitations = d.imitations && d.imitations.length === 3 ? d.imitations : blankImitations();
    return { el: h('div', { class: 'stack' },
      p('Write 3 imitations of each pattern on your own topics. The model sentences are hidden; use the formula and the grammar note.', 'lead'),
      d.patterns.map((x, i) => h('section', { class: 'imit' }, h('span', { class: 'eyebrow' }, 'Pattern ' + (i + 1)), h('p', null, x.pattern), x.grammar ? h('p', { class: 'muted small' }, x.grammar) : '',
        [0, 1, 2].map(j => h('input', { type: 'text', value: d.imitations[i][j], 'aria-label': 'Pattern ' + (i + 1) + ', imitation ' + (j + 1), autocomplete: 'off', spellcheck: false,
          onpaste: e => { e.preventDefault(); flash('Paste is off. Write every word yourself.'); }, oninput: e => { d.imitations[i][j] = e.target.value; } }))))),
      ready: () => d.imitations.every(r => r.every(x => (x || '').trim())) ? null : 'Write 3 imitations of each pattern.' };
  }
});

/* ---------- the Foundations panel (Today and Plan) ---------- */
function foundationsPanel() {
  const a = app(), p0 = a.p0 || {};
  if (!p0.flagged) {
    const taken = sessions().find(s => s.kind === 'placement' && s.status === 'done');
    return h('div', { class: 'stack' }, p(taken ? 'Your placement test is waiting to be marked. The result decides which grammar areas you study.' : 'Start with the placement test. Its result decides which grammar areas you study.', 'small'),
      taken ? h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { App.sel = { coll: 'sessions', id: taken.id }; go('writing'); } }, 'Open the test')) : '');
  }
  const areas = p0.areas || {};
  const list = p0.flagged.length ? h('ul', { class: 'areas' }, p0.flagged.map(id => {
    const ar = areaById(id), st = areas[id] || {};
    return h('li', null, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!st.done, onchange: e => { const n = clone(areas); n[id] = Object.assign({ units: [] }, n[id], { done: e.target.checked }); saveP0({ areas: n }); } }),
      h('span', null, h('strong', null, ar.name), h('small', null, ar.covers + ((st.units || []).length ? ' · Units: ' + st.units.join('; ') : '')))));
  })) : p('Your placement test flagged no areas.', 'good small');
  const allDone = p0.flagged.every(id => areas[id] && areas[id].done);
  const best = sessions().filter(s => s.kind === 'gatetest' && s.data && typeof s.data.score === 'number').reduce((m, s) => Math.max(m, s.data.score), -1);
  let gate;
  if (!allDone) gate = p('When every area is done, Claude writes a new 10-sentence test. 9 right passes.', 'muted small');
  else if (p0.test) gate = h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => Engine.start('gatetest', { data: { sentences: p0.test } }) }, 'Take the new test · 15 min'));
  else gate = claudeTask({ key: 'newtest', label: 'Ask Claude for a new test', busyText: 'Claude is writing your test…',
    intro: 'Every flagged area is done. Claude writes 10 new sentences with errors in your areas.',
    prompt: () => L.newTestPrompt(studyAreas().map(id => areaById(id).name)),
    apply: raw => { const t = L.validateNewTest(raw, AREAS.map(x => x.name)); if (!t) return 'Claude’s reply did not contain 10 sentences. Try again.'; saveP0({ test: t }); return null; } });
  return h('div', { class: 'stack' }, list, gate, best >= 0 ? p('Best gate test score: ' + best + ' of 10.', best >= 9 ? 'good small' : 'muted small') : '');
}
