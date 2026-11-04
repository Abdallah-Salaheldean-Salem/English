/* app_views.js: Today, Plan, Writing, Errors, Progress, Setup, shared panels and charts. */
'use strict';

const VIEWS = [['today', 'Today'], ['plan', 'Plan'], ['writing', 'Writing'], ['errors', 'Errors'], ['progress', 'Progress'], ['setup', 'Setup']];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const card = (cls, ...kids) => h('section', { class: 'card ' + (cls || '') }, ...kids);
const meter = (have, need) => h('span', { class: 'bar', role: 'img', 'aria-label': have + ' of ' + need }, h('span', { style: 'width:' + Math.min(100, need ? have / need * 100 : 0) + '%' }));

function render() {
  const view = document.getElementById('view');
  App.today = L.iso();
  if (!document.getElementById('focus').hidden) { if (Engine.done) showFocus(); drawStatus(); return; }
  drawNav();
  if (Store.mode === 'loading') { view.replaceChildren(h('p', { class: 'muted pad' }, 'Opening your notebook…')); return; }
  if (!app()) { view.replaceChildren(onboarding()); drawStatus(); return; }
  const fn = { today: viewToday, plan: viewPlan, writing: viewWriting, errors: viewErrors, progress: viewProgress, setup: viewSetup }[App.route] || viewToday;
  const y = window.scrollY;
  view.replaceChildren(fn());
  window.scrollTo(0, y);
  drawStatus();
}
function go(route) { App.route = route; try { if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route); } catch (e) { location.hash = route; } window.scrollTo(0, 0); render(); }

function drawNav() {
  const nav = document.getElementById('nav'), a = app();
  nav.replaceChildren(...VIEWS.map(([id, label]) => h('a', { href: '#' + id, class: App.route === id ? 'on' : '', 'aria-current': App.route === id ? 'page' : null,
    onclick: e => { e.preventDefault(); go(id); } }, label)));
  const ph = document.getElementById('phase');
  ph.replaceChildren(a ? h('div', null, h('span', { class: 'eyebrow' }, 'Phase ' + a.phase + ' of 4'), h('strong', null, PHASES[a.phase].name),
    h('span', { class: 'phasedots' }, [1, 2, 3, 4].map(n => h('i', { class: n < a.phase ? 'past' : n === a.phase ? 'now' : '' })))) : '');
}
function drawStatus() {
  const el = document.getElementById('status');
  const where = Store.mode === 'db' ? (window.desktop ? 'Saved on this computer' : 'Saved to your private app data') : Store.mode === 'local' ? 'Saved in this browser only' : '';
  el.replaceChildren(h('span', null, where), Store.status ? h('span', { class: 'warn' }, Store.status) : '', App.notice ? h('span', { class: 'warn' }, App.notice) : '');
  if (App.notice && !App._noticeT) App._noticeT = setTimeout(() => { App.notice = ''; App._noticeT = 0; drawStatus(); }, 6000);
}

/* ---------- shared panels ---------- */
function textWithMarks(text, marks) {
  const ms = (marks || []).map((m, i) => Object.assign({ n: i + 1 }, m)).filter(m => m.at >= 0 && text.slice(m.at, m.at + m.quote.length) === m.quote).sort((a, b) => a.at - b.at);
  const out = []; let pos = 0;
  for (const m of ms) {
    if (m.at < pos) continue;
    out.push(text.slice(pos, m.at), h('mark', { class: 'mk ' + (m.fixed ? 'fixed' : m.by), title: m.type }, m.quote, h('sup', null, m.n)));
    pos = m.at + m.quote.length;
  }
  out.push(text.slice(pos));
  return h('div', { class: 'prose' }, out);
}

function reviewBox(coll, id) {
  const doc = Store.get(coll, id); if (!doc) return '';
  const text = targetText(coll, doc);
  if (doc.reviewedAt) {
    const n = (doc.marks || []).filter(m => m.by === 'claude').length;
    return h('div', { class: 'review done' }, h('strong', null, 'Marked by Claude'), ' on ' + fmtDate(doc.reviewedAt) + ': ' + (n ? plural(n, 'problem') + '. Fix each one yourself below.' : 'no problems found.'));
  }
  if (App.busy[id]) return h('div', { class: 'review busy' }, App.busy[id]);
  const left = reviewsLeft(), a = app();
  const intro = h('p', null, 'Claude points at problems after the draft is done. It never rewrites anything, and you do the repair. ',
    h('span', { class: 'muted' }, plural(a.reviewsPerWeek || 1, 'review') + ' a week; ' + left + ' left this week.'));
  if (!text.trim()) return '';
  if (left <= 0) return h('div', { class: 'review' }, intro, h('p', { class: 'muted small' }, 'This week’s review is used. Self-check this one, or change the number in Setup.'));
  if (App.sample) return h('div', { class: 'review' }, intro, h('button', { class: 'btn primary', onclick: () => claudeReview(coll, id) }, 'Ask Claude to mark it'));
  /* Outside the Claude viewer: copy a request, paste the reply. */
  const out = h('p', { class: 'muted small' });
  const ta = h('textarea', { class: 'sheet small', rows: 4, placeholder: 'Paste Claude’s reply here', 'aria-label': 'Claude reply' });
  const prompt = L.reviewPrompt(text, currentTop3(), ERROR_TYPES);
  return h('div', { class: 'review' }, intro,
    h('p', { class: 'small' }, window.desktop ? 'To get reviews here, add your Anthropic API key in Setup. Or copy the request into a Claude chat and paste the reply back.' : 'Claude is not reachable from this page here. Copy the request into a Claude chat, then paste the reply back.'),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(prompt, out) }, 'Copy review request'), out), ta,
    h('button', { class: 'btn', onclick: () => {
      const marks = L.parsePastedMarks(ta.value, text, ERROR_TYPES);
      if (!marks) { out.textContent = 'No list of marks found in that reply. Paste the whole reply, including the [ ] brackets.'; return; }
      applyReview(coll, id, marks, 'paste');
    } }, 'Add the marks'));
}
function copyText(t, out) {
  const done = () => { if (out) out.textContent = 'Copied.'; };
  try { navigator.clipboard.writeText(t).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { const ta = h('textarea', { value: t, class: 'sheet small', rows: 4, readOnly: true }); out.replaceWith(ta); ta.select(); }
}

function marksPanel(coll, id) {
  const doc = Store.get(coll, id); const marks = (doc && doc.marks) || [];
  if (!marks.length) return '';
  const text = targetText(coll, doc);
  const fixed = marks.filter(m => m.fixed).length;
  return h('div', { class: 'marks' }, h('h3', null, 'Marks ', h('span', { class: 'muted' }, fixed + ' of ' + marks.length + ' fixed')),
    h('ol', null, marks.map((m, i) => {
      const sent = L.sentenceAround(text, m.at), k = sent.indexOf(m.quote);
      const before = k >= 0 ? sent.slice(0, k) : '', after = k >= 0 ? sent.slice(k + m.quote.length) : '';
      const cut = (s, end) => s.length <= 100 ? s : end ? s.slice(0, 100).replace(/\s\S*$/, '') + ' …' : '… ' + s.slice(-100).replace(/^\S*\s/, '');
      const ctx = k >= 0 ? [cut(before, false), h('mark', { class: 'mk ' + m.by }, m.quote), cut(after, true)] : ['“', m.quote, '”'];
      const key = id + ':' + i;
      const input = h('input', { type: 'text', 'aria-label': 'Your fix for mark ' + (i + 1), placeholder: 'Rewrite the marked words yourself', value: m.fix || '' });
      const canClaude = m.by === 'claude' && App.sample;
      return h('li', { class: m.fixed ? 'fixed' : '' },
        h('div', { class: 'mhead' }, h('span', { class: 'tag' }, m.type), h('span', { class: 'by' }, m.by === 'claude' ? 'Claude' : m.by === 'ai' ? 'old app' : 'you'),
          h('button', { class: 'icon', 'aria-label': 'Delete mark', onclick: () => removeMark(coll, id, i) }, '×')),
        h('p', { class: 'ctx' }, ctx),
        m.hint ? h('p', { class: 'hint' }, m.hint) : '', m.note ? h('p', { class: 'muted small' }, m.note) : '',
        m.fixed ? h('p', { class: 'good small' }, 'Fixed: ', h('strong', null, m.fix)) :
          App.busy[key] ? h('p', { class: 'muted small' }, App.busy[key]) :
          h('div', { class: 'repair' }, input, h('button', { class: 'btn small', onclick: () => {
            const v = input.value.trim(); if (!v) return;
            if (canClaude) claudeRepair(coll, id, i, v); else setFixed(coll, id, i, v);
          } }, canClaude ? 'Check my fix' : 'Save my fix')),
        m.lastHint ? h('p', { class: 'hint warn' }, 'Not yet (' + plural(m.tries, 'try') + '): ' + m.lastHint) : '');
    })));
}

/* The piece workspace, used in Writing and in a timed piece session. Draws itself so typing never re-renders the page. */
function pieceEditor(pid, o) {
  o = o || {};
  const box = h('div', { class: 'piece' });
  const get = () => Store.get('pieces', pid);
  let t = 0;
  const save = (patch, redraw) => {
    const pc = Object.assign(clone(get()), patch); pc.words = L.countWords(pc.text);
    Store.put('pieces', pid, pc, !redraw && !o.loud);
    if (o.inFocus && Engine.s) { clearTimeout(t); t = setTimeout(() => Engine.save(), 800); }
    if (redraw) draw();
  };
  const draw = () => {
    const pc = get(); if (!pc) { box.replaceChildren(p('This piece was deleted.', 'muted')); return; }
    const stages = L.stagesFor(pc.phase), at = stages.indexOf(pc.status);
    const [lo, hi] = L.pieceTarget(pc, FORMS);
    const blockers = L.stageBlockers(pc, checkIds);
    const editable = !['plan', 'done'].includes(pc.status);
    const wc = h('span', { class: 'count' });
    const longs = h('span', { class: 'muted small' });
    const meterUpd = text => {
      const w = L.countWords(text); wc.textContent = w + ' words · target ' + lo + '-' + hi; wc.classList.toggle('ok', w >= lo && w <= hi);
      const n = L.sentenceReport(text, Math.max(2, pc.phase)).filter(r => r.long).length; longs.textContent = n ? plural(n, 'sentence') + ' over 25 words' : '';
    };
    meterUpd(pc.text || '');
    const kids = [
      h('ol', { class: 'stages' }, stages.map((s, i) => h('li', { class: i < at ? 'past' : i === at ? 'now' : '' }, s === 'revise2' ? 'revise again' : s))),
      h('label', { class: 'field' }, 'Title', h('input', { type: 'text', value: pc.title, placeholder: 'Working title', oninput: e => save({ title: e.target.value }) }))
    ];
    const planF = [
      h('label', { class: 'field' }, 'The one point it makes', h('input', { type: 'text', value: pc.plan.point, oninput: e => save({ plan: Object.assign({}, get().plan, { point: e.target.value }) }) })),
      h('label', { class: 'field' }, 'Who it is for', h('input', { type: 'text', value: pc.plan.reader, oninput: e => save({ plan: Object.assign({}, get().plan, { reader: e.target.value }) }) })),
      h('label', { class: 'field' }, 'Notes and order', h('textarea', { class: 'sheet small', rows: 5, value: pc.plan.notes, oninput: e => save({ plan: Object.assign({}, get().plan, { notes: e.target.value }) }) }))
    ];
    if (pc.status === 'plan') kids.push(p('Plan first: the point, the reader, and the notes in order.', 'lead'), ...planF);
    else kids.push(h('details', null, h('summary', null, 'Plan: ' + (pc.plan.point || 'no point written')), ...planF));
    if (editable) kids.push(writeArea({ value: pc.text, rows: o.inFocus ? 16 : 12, flash: o.flash, label: 'Piece text', oninput: v => { meterUpd(v); save({ text: v }); } }), h('div', { class: 'meta' }, wc, longs));
    else if (pc.status === 'done') kids.push(textWithMarks(pc.text, pc.marks), h('div', { class: 'meta' }, wc));
    if (pc.status === 'revise') kids.push(h('fieldset', { class: 'checklist' }, h('legend', null, 'Revision checklist'),
      REVISION_CHECKS.map(([cid, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!pc.checks[cid], onchange: e => save({ checks: Object.assign({}, get().checks, { [cid]: e.target.checked }) }, true) }), h('span', null, label)))));
    if (['feedback', 'revise2', 'publish', 'done'].includes(pc.status) && pc.phase >= 3) {
      const who = h('input', { type: 'text', placeholder: 'Reader', 'aria-label': 'Reader name' }), what = h('input', { type: 'text', placeholder: 'What they said', 'aria-label': 'Their feedback' });
      kids.push(h('div', { class: 'feedback' }, h('h3', null, 'Feedback ', h('span', { class: 'muted' }, L.readers(pc) + ' of 2 readers')),
        h('ul', null, pc.feedback.map((f, i) => h('li', null, h('strong', null, f.by), ': ' + f.notes, h('button', { class: 'icon', 'aria-label': 'Remove', onclick: () => { const fb = get().feedback.slice(); fb.splice(i, 1); save({ feedback: fb }, true); } }, '×')))),
        pc.status === 'feedback' ? [h('div', { class: 'markrow' }, who, what, h('button', { class: 'btn small', onclick: () => { if (!who.value.trim() || !what.value.trim()) return; save({ feedback: get().feedback.concat([{ by: who.value.trim(), notes: what.value.trim(), date: L.iso() }]) }, true); } }, 'Add')),
          h('label', { class: 'field' }, 'Where you posted it (optional)', h('input', { type: 'url', value: pc.postedUrl, oninput: e => save({ postedUrl: e.target.value }) })),
          p(['Post it for critique, for example on ', h('a', { href: SITES[1][1], target: '_blank', rel: 'noopener' }, 'Scribophile'), '.'], 'muted small')] : ''));
    }
    if (pc.status === 'publish') kids.push(h('label', { class: 'field' }, 'Published link' + (app().publishPlace ? ' (' + app().publishPlace + ')' : ''), h('input', { type: 'url', value: pc.publishedUrl, oninput: e => save({ publishedUrl: e.target.value }) })));
    if (pc.status === 'done' && pc.publishedUrl) kids.push(p(['Published: ', h('a', { href: pc.publishedUrl, target: '_blank', rel: 'noopener' }, pc.publishedUrl)], 'small'));
    if (at < stages.length - 1) {
      const nextName = stages[at + 1] === 'revise2' ? 'revise again' : stages[at + 1];
      kids.push(h('div', { class: 'advance' }, h('button', { class: 'btn' + (blockers.length ? '' : ' primary'), onclick: () => {
        const cur = get(), b = L.stageBlockers(cur, checkIds);
        if (b.length) { if (o.flash) o.flash(b[0]); draw(); return; }
        Store.put('pieces', pid, L.advancePiece(cur, checkIds, nowIso()), !o.loud); draw();
      } }, 'Move to ' + nextName), blockers.length ? h('span', { class: 'muted small' }, blockers.join(' ')) : ''));
    }
    if (!o.inFocus && !['plan', 'draft'].includes(pc.status)) kids.push(reviewBox('pieces', pid), marksPanel('pieces', pid));
    box.replaceChildren(...kids);
  };
  draw();
  return box;
}

/* ---------- Today ---------- */
function startAction(a) {
  if (a.resume) return Engine.open(Store.get('sessions', a.resume), true);
  Engine.start(a.kind, { data: Object.assign({}, a.data || {}, a.pieceId ? { pieceId: a.pieceId } : {}), minutes: a.minutes });
}
function viewToday() {
  const a = app(), today = App.today;
  const act = L.nextAction(a, sessions(), pieces(), allModels(), today);
  const wk = L.weekIndex(a.phaseStarted[a.phase] || a.startDate, today, a.weekStart);
  const anchor = a.anchorRoutine && a.anchorPlace
    ? h('p', { class: 'anchor' }, 'When I ', h('em', null, a.anchorRoutine), ', I will write for 25 minutes at ', h('em', null, a.anchorPlace), '.')
    : h('p', { class: 'anchor empty' }, 'Write your anchor line in ', h('a', { href: '#setup', onclick: e => { e.preventDefault(); go('setup'); } }, 'Setup'), ': a fixed cue beats waiting for free time.');
  const nextCard = card('next',
    h('span', { class: 'eyebrow' }, act.resume ? 'Unfinished' : act.doneToday && act.kind ? 'Today is done · next time' : 'Today'),
    h('h2', null, act.kind ? act.title : act.title),
    h('p', null, act.why),
    act.kind ? h('div', { class: 'row' }, h('button', { class: 'btn primary big', onclick: () => startAction(act) }, act.resume ? 'Resume' : act.doneToday ? 'Do it now anyway' : 'Start' + (act.minutes ? ' · ' + act.minutes + ' min' : '')),
      act.resume ? h('button', { class: 'btn quiet', onclick: () => { Store.remove('sessions', act.resume); } }, 'Discard it') : '') : '');
  /* other options */
  const kinds = a.phase === 1 ? [] : a.phase === 2 ? ['franklin1', 'combining', 'summary', 'paragraph'] : ['franklin3', 'combining'];
  const pick = h('select', { 'aria-label': 'Another drill' }, kinds.map(k => h('option', { value: k }, KIND_LABEL[k])));
  const targets = L.drillTargets(errorsList(), sessions());
  const others = card('others', h('h3', null, 'Other options'),
    h('div', { class: 'opt' }, h('div', null, h('strong', null, 'Short session'), h('p', { class: 'muted small' }, '10 minutes of writing when the day is full. Keeps the habit; does not count toward the 15 sessions.')),
      h('button', { class: 'btn', onclick: () => Engine.start('short') }, 'Start')),
    kinds.length ? h('div', { class: 'opt' }, h('div', null, h('strong', null, 'A different drill'), h('p', { class: 'muted small' }, 'The queue keeps its order; this is extra.')), h('div', { class: 'row' }, pick, h('button', { class: 'btn', onclick: () => Engine.start(pick.value) }, 'Start'))) : '',
    targets.filter(t => t.drills === 0).slice(0, 2).map(t => h('div', { class: 'opt' }, h('div', null, h('strong', null, 'Drill: ' + t.type), h('p', { class: 'muted small' }, 'Seen ' + plural(t.count, 'time') + '. Three times makes it a drill.')),
      h('button', { class: 'btn', onclick: () => Engine.start('drill', { data: { type: t.type } }) }, 'Start'))));
  /* week strip */
  const ws = L.weekStartOf(today, a.weekStart || 0), done = sessions().filter(s => s.status === 'done');
  const strip = h('ol', { class: 'week' }, [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = L.addDays(ws, i), n = done.filter(s => s.date === d).length, wkend = L.isWeekend(d, a);
    return h('li', { class: (d === today ? 'today ' : '') + (wkend ? 'wkend ' : '') + (n ? 'did' : '') }, h('span', null, DAY[L.dow(d)]), h('i', { 'aria-label': n ? plural(n, 'session') : 'none' }), h('small', null, d.slice(8)));
  }));
  const gap = L.daysSinceLast(sessions(), today);
  /* reading */
  const r = Store.get('reading', today) || { date: today, minutes: 0, book: '', note: '' };
  const weekRead = Store.list('reading').filter(x => L.inWeek(x.date, today, a.weekStart || 0)).reduce((t, x) => t + (x.minutes || 0), 0);
  const books = BOOKS.filter(b => b.phase === a.phase && (!b.form || b.form === a.form));
  const mins = h('input', { type: 'number', min: 0, max: 240, step: 5, value: r.minutes || '', 'aria-label': 'Minutes read today', class: 'num' });
  const what = h('input', { type: 'text', value: r.book || (books[0] ? books[0].title : ''), 'aria-label': 'What you read', placeholder: 'What you read' });
  const readCard = card('reading', h('h3', null, 'Reading ', h('span', { class: 'muted' }, weekRead + ' min this week')),
    h('p', { class: 'muted small' }, '15 minutes in English every day, in place of phone scrolling if you can.' + (books[0] ? ' This phase: ' + books[0].title + '.' : '')),
    h('div', { class: 'row' }, mins, h('span', null, 'min'), what, h('button', { class: 'btn', onclick: () => Store.put('reading', today, { date: today, minutes: Number(mins.value) || 0, book: what.value.trim(), note: r.note || '' }) }, 'Save')));
  return h('div', { class: 'page' },
    h('header', { class: 'pagehead' }, h('p', { class: 'eyebrow' }, fmtDate(today) + ' · Phase ' + a.phase + ', week ' + wk), h('h1', null, PHASES[a.phase].name), anchor),
    gap != null && gap >= 7 ? h('p', { class: 'alert' }, 'It has been ' + gap + ' days since your last session. The plan still works at 4 sessions a week; it fails at zero for two weeks.') : '',
    nextCard, h('div', { class: 'grid2' }, card('weekcard', h('h3', null, 'This week'), strip, h('p', { class: 'muted small' }, 'Claude reviews left this week: ' + reviewsLeft())), readCard), others);
}

/* ---------- Plan ---------- */
function advancePhase(form) {
  const a = clone(app()), n = a.phase + 1;
  a.phase = n; a.phaseStarted = Object.assign({}, a.phaseStarted, { [n]: L.iso() });
  if (n === 2) a.top3 = L.computeTop3(errorsList());
  if (n === 3 && form) a.form = form;
  Store.put('state', 'app', a);
}
function viewPlan() {
  const a = app(), g = L.evaluateGates(a, sessions(), pieces(), errorsList(), Store.list('critiques'));
  const phaseCard = n => {
    const ph = PHASES[n], cur = n === a.phase, gate = g[n];
    const items = gate ? gate.items : [];
    const form = h('select', { 'aria-label': 'Form for Phase 3' }, Object.entries(FORMS).map(([k, f]) => h('option', { value: k, selected: a.form === k }, f.label + ' (' + f.min + '-' + f.max + ' words)')));
    return card('phase' + (cur ? ' current' : n < a.phase ? ' past' : ''),
      h('div', { class: 'phead' }, h('span', { class: 'eyebrow' }, 'Phase ' + n + ' · ' + ph.span), h('h2', null, ph.name), n < a.phase ? h('span', { class: 'pill good' }, 'Done') : cur ? h('span', { class: 'pill' }, 'Now') : ''),
      h('p', null, ph.goal), cur ? h('ul', { class: 'rules' }, ph.rules.map(r => h('li', null, r))) : '',
      gate ? h('div', { class: 'gate' }, h('h3', null, 'Gate to move on'), h('ul', null, items.map(i => h('li', { class: i.met ? 'met' : '' },
        h('span', { class: 'tick', 'aria-hidden': 'true' }, i.met ? '✓' : ''), h('span', { class: 'gl' }, i.label),
        n <= a.phase ? [meter(i.rate ? Math.min(i.have, i.need) : i.have, i.need), h('span', { class: 'gv' }, i.rate ? rateText(i.rate) : i.have + ' / ' + i.need)] : '')))) : '',
      cur && gate && gate.met ? h('div', { class: 'row' }, n === 2 ? h('label', { class: 'field inline' }, 'Form for the next three months', form) : '',
        h('button', { class: 'btn primary', onclick: () => advancePhase(form.value) }, 'Move to Phase ' + (n + 1))) : '',
      cur && n === 1 ? p('Top errors so far: ' + (L.computeTop3(errorsList()).join(', ') || 'none yet') + '. These freeze as your top 3 when Phase 2 starts.', 'muted small') : '');
  };
  const p2table = h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Day', 'Drill (25 min)', 'What it trains'].map(x => h('th', null, x)))),
    h('tbody', null, [['1', 'Franklin rebuild, part 1: notes on a model paragraph', 'Separating ideas from wording'], ['2', 'Sentence combining, three ways', 'Sentence variety and control'],
      ['3', 'Franklin rebuild, part 2: rebuild from notes, compare', 'Word choice and structure'], ['4', '100-word summary of an article', 'Finding and stating the main point'],
      ['5', 'One paragraph in 6 steps', 'Planning and structure'], ['Weekend (60 min)', 'One 400-600 word piece: plan and draft, then revise', 'Whole-piece planning and revision']]
      .map(r => h('tr', null, r.map(c => h('td', null, c))))));
  return h('div', { class: 'page' },
    h('header', { class: 'pagehead' }, h('p', { class: 'eyebrow' }, 'Six months, about 30 minutes a day'), h('h1', null, 'The plan'),
      p('You move to the next phase when its gate is met, not when the calendar says so. If a phase runs long, the plan is still working.')),
    [1, 2, 3, 4].map(phaseCard),
    card('', h('h3', null, 'Phase 2 week'), p('Drills run as a queue in this order, so a missed day never breaks a rebuild. The rebuild waits at least a day after the notes. Every second rebuild, the notes come back shuffled.', 'muted small'), h('div', { class: 'scroll' }, p2table)),
    card('', h('h3', null, 'The rules'), p('You write every word yourself; AI only points at problems after the draft is done.'),
      h('div', { class: 'scroll' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Use', 'Allowed', 'Why'].map(x => h('th', null, x)))), h('tbody', null, RULES_TABLE.map(r => h('tr', null, r.map((c, i) => h('td', { class: i === 1 ? 'b' : '' }, c)))))))),
    card('', h('h3', null, 'Reading list'), p('One book per phase is enough. Read it in the 15-minute daily slot.', 'muted small'),
      h('ul', { class: 'books' }, BOOKS.map(b => { const st = (a.books || {})[b.id] || {}; return h('li', null,
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!st.read, onchange: e => saveApp({ books: Object.assign({}, a.books, { [b.id]: Object.assign({}, st, { read: e.target.checked }) }) }) }),
          h('span', null, h('strong', null, b.title), ' · ' + b.author, h('small', null, 'Phase ' + b.phase + (b.form ? ' (' + b.form + 's)' : '') + '. ' + b.why)))); }))),
    card('', h('h3', null, 'Links'), h('ul', { class: 'links' }, SITES.map(([t, u]) => h('li', null, h('a', { href: u, target: '_blank', rel: 'noopener' }, t))))));
}
function rateText(r) { return r.words < 900 ? r.words + ' of 900 marked words' : r.perType.map(x => x.type + ' ' + x.per300.toFixed(1)).join(' · ') + ' per 300'; }

/* ---------- Writing ---------- */
function viewWriting() {
  const a = app();
  const items = pieces().map(x => ({ coll: 'pieces', doc: x, t: x.createdAt }))
    .concat(sessions().filter(s => s.status === 'done' && (L.mainText(s).trim() || s.kind === 'franklin1')).map(x => ({ coll: 'sessions', doc: x, t: x.finishedAt || x.startedAt })))
    .sort((x, y) => (y.t || '').localeCompare(x.t || ''));
  if (!App.sel && items[0]) App.sel = { coll: items[0].coll, id: items[0].doc.id };
  const sel = App.sel && Store.get(App.sel.coll, App.sel.id) ? App.sel : null;
  const list = h('ul', { class: 'items' }, items.map(it => {
    const d = it.doc, ms = d.marks || [];
    const label = it.coll === 'pieces' ? (d.title || 'Untitled piece') : KIND_LABEL[d.kind];
    return h('li', null, h('button', { class: 'item' + (sel && sel.id === d.id ? ' on' : ''), onclick: () => { App.sel = { coll: it.coll, id: d.id }; render(); } },
      h('span', { class: 'it-t' }, label), h('span', { class: 'it-m' }, fmtDate(it.t) + ' · ' + plural(d.words || 0, 'word')),
      h('span', { class: 'it-s' }, it.coll === 'pieces' ? h('span', { class: 'pill' }, d.status) : '', ms.length ? h('span', { class: 'pill ' + (ms.every(m => m.fixed) ? 'good' : 'red') }, ms.filter(m => m.fixed).length + '/' + ms.length + ' fixed') : '',
        d.reviewedAt ? h('span', { class: 'pill' }, 'marked') : '')));
  }));
  const newPiece = h('button', { class: 'btn', onclick: () => {
    const id = newId('p');
    Store.put('pieces', id, { id, phase: a.phase, form: a.phase >= 3 ? a.form : 'essay', title: '', status: 'plan', createdAt: nowIso(), finishedAt: '', plan: { point: '', reader: '', notes: '' },
      text: '', versions: [], checks: {}, feedback: [], postedUrl: '', publishedUrl: '', words: 0, marks: [], reviewed: false, reviewedAt: '' });
    App.sel = { coll: 'pieces', id }; render();
  } }, 'New piece');
  let detail = h('p', { class: 'muted' }, 'Your sessions and pieces appear here once you finish one.');
  if (sel) detail = sel.coll === 'pieces' ? pieceDetail(sel.id) : sessionDetail(sel.id);
  return h('div', { class: 'page wide' },
    h('header', { class: 'pagehead' }, h('h1', null, 'Writing'), a.phase >= 2 ? h('div', { class: 'row' }, newPiece) : ''),
    h('div', { class: 'split' }, h('nav', { class: 'itemsnav', 'aria-label': 'Sessions and pieces' }, items.length ? list : p('Nothing yet.', 'muted')), h('article', { class: 'detail' }, detail)),
    a.phase >= 3 ? critiquesCard() : '');
}
function sessionDetail(id) {
  const s = Store.get('sessions', id), d = s.data || {};
  const bits = [h('p', { class: 'eyebrow' }, KIND_LABEL[s.kind] + ' · ' + fmtDate(s.date) + ' · Phase ' + s.phase), h('h2', null, d.topic || d.article || d.point || (d.modelId ? modelById(d.modelId).title : KIND_LABEL[s.kind]))];
  if (d.sprint) bits.push(p(plural(d.sprint.words, 'word') + ' in ' + mmss(d.sprint.seconds) + ', longest pause ' + mmss(d.sprint.maxPause) + (d.sprint.interrupted ? ', interrupted' : '') + '.', 'muted small'));
  if (s.kind === 'franklin1') bits.push(h('ol', { class: 'notelist' }, (d.notes || []).map(n => h('li', null, n))), p(L.pendingNotes([s].concat(sessions())) && L.pendingNotes([s].concat(sessions())).id === s.id ? 'Waiting to be rebuilt.' : 'Rebuilt.', 'muted small'));
  if (s.kind === 'combining') { const set = setById(d.setId); bits.push(h('ol', { class: 'source6' }, set.s.map(t => h('li', null, t)))); (d.ways || []).forEach((w, i) => bits.push(h('h3', null, 'Way ' + (i + 1)), textWithMarks(w, []))); }
  else if (L.mainText(s)) bits.push(textWithMarks(L.mainText(s), s.marks));
  if ((s.kind === 'franklin2' || s.kind === 'franklin3') && d.diffs) bits.push(h('details', null, h('summary', null, 'Original and differences'), modelBlock(modelById(d.modelId)), h('ul', { class: 'rules' }, d.diffs.map(x => h('li', null, x)))), p(d.keptAll ? 'Kept every idea.' : 'Some ideas were lost.', d.keptAll ? 'good small' : 'note small'));
  if (s.kind !== 'franklin1' && s.kind !== 'combining') bits.push(reviewBox('sessions', id));
  bits.push(marksPanel('sessions', id));
  bits.push(h('div', { class: 'row end' }, h('button', { class: 'btn quiet danger small', onclick: e => {
    const b = e.currentTarget; if (b.dataset.sure) { Store.remove('sessions', id); App.sel = null; } else { b.dataset.sure = 1; b.textContent = 'Delete it for good'; }
  } }, 'Delete session')));
  return h('div', { class: 'stack' }, bits);
}
function pieceDetail(id) {
  const pc = Store.get('pieces', id);
  return h('div', { class: 'stack' }, h('p', { class: 'eyebrow' }, 'Piece · Phase ' + pc.phase + ' · ' + (pc.phase >= 3 ? FORMS[pc.form].label : 'Weekend piece')),
    pc.status !== 'done' ? h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => Engine.start('piece', { data: { pieceId: id }, minutes: pc.phase === 2 ? 60 : 25 }) }, 'Timed session on this piece · ' + (pc.phase === 2 ? 60 : 25) + ' min')) : '',
    pieceEditor(id, { loud: false }),
    h('div', { class: 'row end' }, h('button', { class: 'btn quiet danger small', onclick: e => {
      const b = e.currentTarget; if (b.dataset.sure) { Store.remove('pieces', id); App.sel = null; } else { b.dataset.sure = 1; b.textContent = 'Delete it for good'; }
    } }, 'Delete piece')));
}
function critiquesCard() {
  const list = Store.list('critiques').sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const t = h('input', { type: 'text', placeholder: 'Piece you critiqued', 'aria-label': 'Piece you critiqued' }), w = h('input', { type: 'text', placeholder: 'Where (e.g. Scribophile)', 'aria-label': 'Where' }), u = h('input', { type: 'url', placeholder: 'Link (optional)', 'aria-label': 'Link' });
  return card('', h('h3', null, 'Critiques you wrote ', h('span', { class: 'muted' }, list.length + ' of 5 for the gate')),
    p('Writing critiques is training too: spotting problems in other drafts sharpens your own revision.', 'muted small'),
    h('ul', { class: 'crits' }, list.map(c => h('li', null, fmtDate(c.date) + ' · ', h('strong', null, c.title), c.where ? ' on ' + c.where : '', c.link ? [' · ', h('a', { href: c.link, target: '_blank', rel: 'noopener' }, 'link')] : '',
      h('button', { class: 'icon', 'aria-label': 'Remove', onclick: () => Store.remove('critiques', c.id) }, '×')))),
    h('div', { class: 'markrow' }, t, w, u, h('button', { class: 'btn small', onclick: () => { if (!t.value.trim()) return; const id = newId('c'); Store.put('critiques', id, { id, date: L.iso(), title: t.value.trim(), where: w.value.trim(), link: u.value.trim() }); } }, 'Add')));
}

/* ---------- Errors ---------- */
function viewErrors() {
  const a = app(), rows = errorsList().sort((x, y) => (y.dates[y.dates.length - 1] || '').localeCompare(x.dates[x.dates.length - 1] || ''));
  const counts = L.errorTypeCounts(rows), max = counts[0] ? counts[0].count : 1, top3 = currentTop3();
  const targets = L.drillTargets(rows, sessions());
  const type = h('select', { 'aria-label': 'Error type' }, ERROR_TYPES.map(t => h('option', { value: t }, t)));
  const wrote = h('input', { type: 'text', placeholder: 'What you wrote', 'aria-label': 'What you wrote' }), corr = h('input', { type: 'text', placeholder: 'Correct form', 'aria-label': 'Correct form' });
  return h('div', { class: 'page' },
    h('header', { class: 'pagehead' }, h('h1', null, 'Error log'), p('Every error you or Claude find goes here once. When the same type appears three times, it becomes a drill.')),
    card('', h('h3', null, a.phase >= 2 ? 'Your top 3, frozen when Phase 2 started' : 'Your top 3 so far'), h('p', { class: 'top3' }, top3.length ? top3.map(t => h('span', { class: 'pill red' }, t)) : h('span', { class: 'muted' }, 'None yet.')),
      h('ul', { class: 'typebars' }, counts.map(c => h('li', null, h('span', { class: 'tl' }, c.type), h('span', { class: 'bar' }, h('span', { style: 'width:' + (c.count / max * 100) + '%' })), h('span', { class: 'gv' }, c.count))))),
    targets.length ? card('', h('h3', null, 'Drills'), h('ul', { class: 'drills' }, targets.map(t => h('li', null, h('span', null, h('strong', null, t.type), ' · seen ' + t.count + ' times' + (t.drills ? ', drilled ' + plural(t.drills, 'time') : '')),
      h('button', { class: 'btn small', onclick: () => Engine.start('drill', { data: { type: t.type } }) }, 'Start drill'))))) : '',
    card('', h('h3', null, 'Add an error'), h('div', { class: 'markrow' }, type, wrote, corr, h('button', { class: 'btn', onclick: () => {
      if (!wrote.value.trim()) return;
      const row = L.logError(Store.get('errors', L.errorId(type.value, wrote.value)), { type: type.value, wrote: wrote.value, correct: corr.value, by: 'self', date: L.iso() });
      Store.put('errors', row.id, row);
    } }, 'Add'))),
    h('div', { class: 'scroll' }, h('table', { class: 'tbl errors' }, h('thead', null, h('tr', null, ['Error type', 'What I wrote', 'Correct form', 'Times', 'Last', 'Found by', ''].map(x => h('th', null, x)))),
      h('tbody', null, rows.map(r => h('tr', null, h('td', null, r.type), h('td', { class: 'wrote' }, r.wrote),
        h('td', null, h('input', { type: 'text', value: r.correct, 'aria-label': 'Correct form for ' + r.wrote, onchange: e => Store.put('errors', r.id, Object.assign(clone(r), { correct: e.target.value.trim() })) })),
        h('td', { class: 'n' }, r.dates.length), h('td', null, fmtDate(r.dates[r.dates.length - 1])), h('td', null, r.by === 'plan' ? 'plan' : r.by === 'claude' ? 'Claude' : r.by === 'ai' ? 'old app' : 'you'),
        h('td', null, h('button', { class: 'icon', 'aria-label': 'Delete row', onclick: () => Store.remove('errors', r.id) }, '×'))))))));
}

/* ---------- Progress ---------- */
function barChart(rows) {
  const W = 640, H = 180, pad = 28, n = rows.length, max = Math.max(150, ...rows.map(r => r.words));
  const bw = Math.min(46, (W - pad * 2) / n * 0.7), step = (W - pad * 2) / n;
  const nice = max <= 500 ? 100 : max <= 2000 ? 500 : 1000, top = Math.ceil(max / nice) * nice, y = v => H - 22 - v / top * (H - 40);
  const ns = 'http://www.w3.org/2000/svg', s = (t, at, txt) => { const e = document.createElementNS(ns, t); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; };
  const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': 'Words written per week' });
  for (let v = 0; v <= top; v += nice) { svg.append(s('line', { x1: pad, x2: W - 6, y1: y(v), y2: y(v), class: 'grid' }), s('text', { x: pad - 4, y: y(v) + 3, class: 'ax', 'text-anchor': 'end' }, v)); }
  rows.forEach((r, i) => {
    const x = pad + i * step + (step - bw) / 2;
    svg.append(s('rect', { x, y: y(r.words), width: bw, height: Math.max(0, H - 22 - y(r.words)), rx: 2, class: 'b' + (i === n - 1 ? ' last' : '') }));
    svg.append(s('text', { x: x + bw / 2, y: H - 8, class: 'ax', 'text-anchor': 'middle' }, 'W' + r.week));
    for (let k = 0; k < Math.min(7, r.sessions); k++) svg.append(s('circle', { cx: x + bw / 2, cy: y(r.words) - 8 - k * 7, r: 2.4, class: 'dot' }));
  });
  return svg;
}
function viewProgress() {
  const a = app(), today = App.today, rows = L.weekRows(a, sessions(), errorsList(), today);
  const g = L.evaluateGates(a, sessions(), pieces(), errorsList(), Store.list('critiques'));
  const gate = g[a.phase];
  const done = sessions().filter(s => s.status === 'done');
  const totalW = done.reduce((t, s) => t + (s.words || 0), 0), totalMin = Math.round(done.reduce((t, s) => t + (s.seconds || 0), 0) / 60);
  const readMin = Store.list('reading').reduce((t, r) => t + (r.minutes || 0), 0);
  const stat = (n, l) => h('div', { class: 'stat' }, h('strong', null, n), h('span', null, l));
  return h('div', { class: 'page' },
    h('header', { class: 'pagehead' }, h('h1', null, 'Progress'), p('Assume you will miss about a third of sessions. Four a week still works.')),
    h('div', { class: 'stats' }, stat(done.length, 'sessions'), stat(totalW.toLocaleString(), 'words written'), stat(totalMin, 'minutes writing'), stat(readMin, 'minutes reading')),
    card('', h('h3', null, 'Words per week ', h('span', { class: 'muted' }, 'dots are days with a session')), h('div', { class: 'scroll' }, barChart(rows.slice(-12)))),
    card('', h('h3', null, 'Tracker'), h('div', { class: 'scroll' }, trackerTable(rows, gate, a.phase))));
}
function trackerTable(rows, gate, phase) {
  const head = h('thead', null, h('tr', null, ['Week', 'Sessions (of 5)', 'Words written', 'Most common error', 'Gate progress'].map(x => h('th', null, x))));
  const body = h('tbody', null, rows.slice().reverse().map((r, i) => h('tr', null,
    h('td', null, r.week, h('small', null, ' ' + fmtDate(r.from))), h('td', { class: 'n' }, r.sessions), h('td', { class: 'n' }, r.words), h('td', null, r.common || '—'),
    h('td', null, i === 0 && gate ? gate.items.filter(x => x.met).length + ' of ' + gate.items.length + ' (Phase ' + phase + ')' : ''))));
  return h('table', { class: 'tbl' }, head, body);
}

/* ---------- Setup ---------- */
function field(label, input, help) { return h('label', { class: 'field' }, label, input, help ? h('small', { class: 'muted' }, help) : ''); }
function viewSetup() {
  const a = app();
  const txt = (k, ph) => h('input', { type: 'text', value: a[k] || '', placeholder: ph || '', onchange: e => saveApp({ [k]: e.target.value.trim() }) });
  const sel = (k, opts, num) => h('select', { onchange: e => saveApp({ [k]: num ? Number(e.target.value) : e.target.value }) }, opts.map(([v, l]) => h('option', { value: v, selected: String(a[k]) === String(v) }, l)));
  const tog = (k, l) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!a[k], onchange: e => saveApp({ [k]: e.target.checked }) }), ' ' + l);
  const wkend = h('div', { class: 'days' }, DAY.map((d, i) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: (a.restDays || []).includes(i),
    onchange: e => saveApp({ restDays: e.target.checked ? (a.restDays || []).concat([i]).sort() : (a.restDays || []).filter(x => x !== i) }) }), ' ' + d)));
  return h('div', { class: 'page' },
    h('header', { class: 'pagehead' }, h('h1', null, 'Setup')),
    card('', h('h3', null, 'Anchor'), p('Write one line before you start: "When I [existing daily routine], I will write for 25 minutes at [place]."', 'muted small'),
      field('When I…', txt('anchorRoutine', 'finish my morning coffee')), field('I will write for 25 minutes at…', txt('anchorPlace', 'my desk at the Hub'))),
    card('', h('h3', null, 'Week'),
      field('Plan start date', h('input', { type: 'date', value: a.startDate, onchange: e => e.target.value && saveApp({ startDate: e.target.value }) })),
      field('Week starts on', sel('weekStart', [[0, 'Sunday'], [6, 'Saturday'], [1, 'Monday']], true)),
      field('Weekend days', wkend, 'Phase 1 rests on these days. From Phase 2 the 60-minute piece happens on them.')),
    card('', h('h3', null, 'Writing sessions'),
      tog('noDelete', 'No deleting during the timed write'),
      field('Longest pause that still counts as "without stopping"', sel('pauseLimit', [[30, '30 seconds'], [60, '1 minute'], [90, '90 seconds'], [120, '2 minutes']], true)),
      field('Claude reviews per week', sel('reviewsPerWeek', [[1, '1 (the plan)'], [2, '2'], [3, '3']], true), 'Self-check comes first every time.'),
      tog('sound', 'Chime when a step’s time is up')),
    card('', h('h3', null, 'Phases 3 and 4'),
      field('Form', sel('form', Object.entries(FORMS).map(([k, f]) => [k, f.label + ' (' + f.min + '-' + f.max + ' words)'])), 'Pick one form for three months. If you can’t decide, start with essays.'),
      field('Where you will publish', txt('publishPlace', 'Substack, Medium, LinkedIn or a blog for the Hub')),
      field('Current phase', sel('phase', [[1, 'Phase 1'], [2, 'Phase 2'], [3, 'Phase 3'], [4, 'Phase 4']], true), 'Normally the gate moves you on. Change this only to correct a mistake.')),
    window.desktop ? desktopClaudeCard() : '', modelsCard(), dataCard());
}
function modelsCard() {
  const own = Store.list('models');
  const au = h('input', { type: 'text', placeholder: 'Author', 'aria-label': 'Author' }), ti = h('input', { type: 'text', placeholder: 'Title', 'aria-label': 'Title' });
  const fo = h('select', { 'aria-label': 'Form' }, h('option', { value: 'essay' }, 'Essay'), h('option', { value: 'story' }, 'Story'));
  const tx = h('textarea', { class: 'sheet small', rows: 5, placeholder: 'Paste a paragraph of about 150 words', 'aria-label': 'Paragraph' });
  const out = h('p', { class: 'muted small' }, 'Add only text you may copy: public domain, or your own copy of a passage for private practice.');
  return card('', h('h3', null, 'Model paragraphs'),
    h('ul', { class: 'models' }, allModels().map(m => h('li', null, h('strong', null, m.author), ' · ' + m.title + ' · ' + (m.form || 'essay') + ' · ' + plural(m.words || L.countWords(m.text), 'word'),
      m.source ? [' · ', h('a', { href: m.source, target: '_blank', rel: 'noopener' }, 'check the source')] : '',
      own.includes(m) ? h('button', { class: 'icon', 'aria-label': 'Remove', onclick: () => Store.remove('models', m.id) }, '×') : ''))),
    h('div', { class: 'markrow' }, au, ti, fo), tx, out,
    h('button', { class: 'btn', onclick: () => {
      const w = L.countWords(tx.value); if (!au.value.trim() || w < 60) { out.textContent = 'Add the author and a paragraph of at least 60 words.'; return; }
      const id = newId('m'); Store.put('models', id, { id, author: au.value.trim(), title: ti.value.trim() || 'Untitled', year: '', form: fo.value, source: '', text: tx.value.trim().replace(/\s+/g, ' '), words: w });
    } }, 'Add paragraph'));
}
/* Desktop build only: Claude reviews through the person's own Anthropic API key, kept encrypted by Windows on this computer. */
function desktopClaudeCard() {
  const key = h('input', { type: 'password', autocomplete: 'off', placeholder: 'sk-ant-\u2026', 'aria-label': 'Anthropic API key', id: 'apikey' });
  const out = h('p', { class: 'muted small' }, App.sample ? 'A key is saved. Reviews and repair checks go to Claude with it.' : 'No key saved. Reviews fall back to copy and paste.');
  const refresh = async () => { App.sample = await window.claude.use('sample'); render(); };
  return card('', h('h3', null, 'Claude reviews on this computer'),
    p(['Reviews use your own Anthropic API key, from ', h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank', rel: 'noopener' }, 'console.anthropic.com'),
      '. The key is encrypted with Windows\u2019 own protection and stays on this computer. Each review costs a few cents of API usage.'], 'small'),
    h('div', { class: 'markrow' }, key, h('button', { class: 'btn', onclick: async () => {
      const v = key.value.trim(); if (!/^sk-ant-/.test(v)) { out.textContent = 'That does not look like an Anthropic key (it starts with sk-ant-).'; return; }
      try { await window.desktop.setKey(v); key.value = ''; await refresh(); } catch (e) { out.textContent = 'The key could not be saved: ' + ((e && e.message) || e); }
    } }, 'Save key'), App.sample ? h('button', { class: 'btn quiet danger', onclick: async () => { await window.desktop.clearKey(); await refresh(); } }, 'Remove key') : ''), out);
}
function dataCard() {
  const where = window.desktop ? 'Your data is saved on this computer, in your AppData folder. A dated copy is kept each day for the last 14 days. Backups you export go to your Documents folder.' : Store.mode === 'db' ? 'Your data is saved to this app’s private storage, readable only by you. It follows you to any device where you open this app in Claude.'
    : 'This page is running outside the Claude viewer, so your data is kept in this browser only. Export it regularly.';
  const file = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Backup file' });
  const paste = h('textarea', { class: 'sheet small', rows: 3, placeholder: 'Or paste the JSON here', 'aria-label': 'Pasted JSON' });
  const out = h('div', { class: 'small' });
  const preview = txt => {
    try { App.importPreview = readImport(txt); out.replaceChildren(importReport(App.importPreview)); }
    catch (e) { App.importPreview = null; out.replaceChildren(p(e.message, 'warn')); }
  };
  file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => preview(String(r.result)); r.readAsText(f); });
  return card('', h('h3', null, 'Your data'), p(where, 'small'),
    window.desktop ? h('div', { class: 'row' }, h('button', { class: 'btn quiet small', onclick: () => window.desktop.openDataFolder() }, 'Open the data folder')) : '',
    h('div', { class: 'row' }, App.downloads ? h('button', { class: 'btn', onclick: exportData }, 'Export a backup') : h('button', { class: 'btn', onclick: e => copyText(JSON.stringify(Store.dump()), e.currentTarget.nextSibling || e.currentTarget) }, 'Copy a backup'), h('span', { class: 'muted small' })),
    h('h3', null, 'Import'), p('Bring in an Export file from Recovery Studio or Unaided Studio, or a backup from this app. Anything already here is kept; nothing is added twice.', 'muted small'),
    file, paste, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => preview(paste.value) }, 'Check it')), out);
}
function importReport(plan) {
  const r = plan.report;
  return h('div', { class: 'review' }, h('p', null, h('strong', null, 'Found: '), r.sources.join(', ') + '.'),
    h('p', null, [plural(r.sessions, 'session'), plural(r.pieces, 'piece'), plural(r.errors, 'error row'), plural(r.models, 'model')].join(', ') + ' to add.'),
    h('button', { class: 'btn primary', onclick: () => { for (const w of plan.writes) Store.put(w.coll, w.id, w.doc, true); App.importPreview = null; App.notice = 'Imported ' + plural(plan.writes.length - 1, 'item') + '.'; render(); } }, 'Import it'));
}

/* ---------- first run ---------- */
function onboarding() {
  const st = { routine: '', place: '', start: L.iso(), wk: [5, 6] };
  const days = h('div', { class: 'days' }, DAY.map((d, i) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.wk.includes(i), onchange: e => { st.wk = e.target.checked ? st.wk.concat([i]) : st.wk.filter(x => x !== i); } }), ' ' + d)));
  return h('div', { class: 'page onboard' },
    h('header', { class: 'pagehead' }, h('p', { class: 'eyebrow' }, 'English Writing Recovery'), h('h1', null, 'Your writing is out of practice, not gone.'),
      p('Six months at about 30 minutes a day, in four phases. Only unaided writing brings it back: you write every word yourself, and Claude only points at problems after the draft is done.')),
    card('', h('h3', null, 'Anchor it'), p('A fixed cue beats waiting for free time.', 'muted small'),
      h('p', { class: 'anchor form' }, 'When I ', h('input', { type: 'text', placeholder: 'finish my morning coffee', 'aria-label': 'Existing daily routine', oninput: e => { st.routine = e.target.value; } }),
        ', I will write for 25 minutes at ', h('input', { type: 'text', placeholder: 'my desk at the Hub', 'aria-label': 'Place', oninput: e => { st.place = e.target.value; } }), '.'),
      field('Weekend days', days, 'Friday and Saturday by default.'),
      field('Start date', h('input', { type: 'date', value: st.start, onchange: e => { st.start = e.target.value || L.iso(); } })),
      h('button', { class: 'btn primary big', onclick: () => {
        const a = Object.assign(defaultApp(st.start), { anchorRoutine: st.routine.trim(), anchorPlace: st.place.trim(), restDays: st.wk.sort() });
        a.phaseStarted = { 1: st.start };
        Store.put('state', 'app', a, true);
        for (const e of PLAN_ERRORS) { const row = L.logError(null, Object.assign({ by: 'plan', date: st.start }, e)); Store.put('errors', row.id, row, true); }
        go('today');
      } }, 'Start the plan')),
    card('', h('h3', null, 'Coming from the old studios?'), p('Start the plan first, then use Import in Setup with an Export file from Recovery Studio or Unaided Studio.', 'muted small')));
}
