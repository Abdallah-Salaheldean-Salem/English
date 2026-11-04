/* app_focus.js: the full-screen session steps. Each step returns {el, ready} where ready() gives a blocking reason or null. */
'use strict';

const STEP_NAME = { copy: 'Copy', write: 'Write', check: 'Check', read: 'Read', notes: 'Notes', order: 'Order', rebuild: 'Rebuild', compare: 'Compare',
  combine: 'Combine', source: 'Article', point: 'Point', draft: 'Draft', link: 'Link', close: 'Close', study: 'Study', practice: 'Practice', work: 'Work' };

/* A writing surface. Paste is always off. In a sprint step with "no deleting" on, deletion is off too. */
function writeArea(o) {
  const ta = h('textarea', { id: o.id, class: 'sheet' + (o.small ? ' small' : ''), rows: o.rows || 10, placeholder: o.placeholder || '', value: o.value || '',
    spellcheck: false, autocomplete: 'off', autocorrect: 'off', autocapitalize: 'sentences', 'data-gramm': 'false', 'data-gramm_editor': 'false', 'data-enable-grammarly': 'false',
    'aria-label': o.label || 'Your writing' });
  const say = msg => { if (o.flash) o.flash(msg); };
  const noPaste = e => { e.preventDefault(); say('Paste is off. Write every word yourself.'); };
  ta.addEventListener('paste', noPaste); ta.addEventListener('drop', noPaste);
  if (o.noDelete) {
    ta.addEventListener('keydown', e => {
      if (e.key === 'Backspace' || e.key === 'Delete' || ((e.ctrlKey || e.metaKey) && /^[zxy]$/i.test(e.key))) { e.preventDefault(); say('No deleting in this step. Keep going and fix it in the check.'); }
    });
    ta.addEventListener('beforeinput', e => { if (/^delete|^history/.test(e.inputType)) { e.preventDefault(); say('No deleting in this step. Keep going.'); } });
    ta.addEventListener('cut', e => e.preventDefault());
  }
  ta.addEventListener('input', () => o.oninput(ta.value));
  return ta;
}

function showFocus() {
  const root = document.getElementById('focus');
  root.hidden = false; document.body.classList.add('in-focus');
  root.replaceChildren(Engine.done ? doneScreen() : stepScreen());
  Focus.updateClock();
  const first = root.querySelector('textarea:not([readonly]), input[type=text]');
  if (first && !Engine.done) setTimeout(() => first.focus({ preventScroll: true }), 30);
  root.scrollTop = 0;
}
function hideFocus() { document.getElementById('focus').hidden = true; document.body.classList.remove('in-focus'); render(); }

const Focus = {
  updateClock() {
    const el = document.getElementById('clock'); if (!el || !Engine.s) return;
    const r = Engine.remaining();
    el.textContent = r > 0 ? mmss(r) : '+' + mmss(-r);
    el.classList.toggle('over', r <= 0);
    const pm = document.getElementById('pausem');
    if (pm && Engine.s.data.sprint) {
      const sp = Engine.s.data.sprint, lim = app().pauseLimit || 60;
      const idle = Engine.remaining() > 0 ? Engine.s.stepElapsed - (sp.lastInput || 0) : 0;
      pm.textContent = 'Pause ' + mmss(idle) + ' of ' + mmss(lim) + (sp.paused ? ' · stopped ' + plural(sp.paused, 'time') : '');
      pm.classList.toggle('warn', idle > lim * 0.6 || sp.paused > 0);
    }
    const wc = document.getElementById('sprintwords');
    if (wc && Engine.s.data.sprint) wc.textContent = Engine.s.data.sprint.words + ' words' + (Engine.remaining() <= 0 ? ' in time' : '');
  }
};

function stepScreen() {
  const s = Engine.s, flow = Engine.flow(), st = Engine.step();
  const builder = STEPS[s.kind + ':' + st.id] || STEPS[st.id];
  const msg = h('p', { class: 'stepmsg', role: 'status' });
  const flash = t => { msg.textContent = t; msg.classList.add('on'); clearTimeout(msg._t); msg._t = setTimeout(() => msg.classList.remove('on'), 3500); };
  const step = builder(s, flash);
  const isLast = s.step === flow.length - 1;
  const nextBtn = h('button', { class: 'btn primary', id: 'next', onclick: () => {
    const why = step.ready ? step.ready() : null;
    if (why) { flash(why); return; }
    if (step.commit) step.commit();
    Engine.next();
  } }, isLast ? 'Finish' : 'Next: ' + STEP_NAME[flow[s.step + 1].id]);
  const stopWrap = h('div', { class: 'stop' });
  const stopBtn = h('button', { class: 'btn quiet', onclick: () => {
    stopWrap.replaceChildren(h('span', { class: 'muted' }, 'Stop this session?'),
      h('button', { class: 'btn quiet', onclick: () => Engine.quit(true) }, 'Keep it for later'),
      h('button', { class: 'btn quiet danger', onclick: () => Engine.quit(false) }, 'Discard'),
      h('button', { class: 'btn quiet', onclick: () => showFocus() }, 'Cancel'));
  } }, 'Stop');
  stopWrap.append(stopBtn);
  return h('div', { class: 'focus-inner' },
    h('header', { class: 'focus-head' },
      h('div', { class: 'fh-left' }, h('span', { class: 'eyebrow' }, KIND_LABEL[s.kind] + ' · Phase ' + s.phase),
        h('ol', { class: 'steps' }, flow.map((f, i) => h('li', { class: i < s.step ? 'past' : i === s.step ? 'now' : '' }, STEP_NAME[f.id], h('small', null, f.min + "'"))))),
      h('div', { class: 'clock', id: 'clock', 'aria-live': 'off' }, mmss(st.min * 60))),
    h('main', { class: 'focus-body' }, step.el),
    h('footer', { class: 'focus-foot' }, stopWrap, msg, nextBtn));
}

/* ---------- shared bits ---------- */
const p = (t, cls) => h('p', { class: cls || '' }, t);
function modelBlock(m) {
  return h('figure', { class: 'model' }, h('blockquote', null, m.text),
    h('figcaption', null, m.author + ', ', h('cite', null, m.title), m.year ? ' (' + m.year + ')' : '', m.source ? [' · ', h('a', { href: m.source, target: '_blank', rel: 'noopener' }, 'source')] : ''));
}
function counter(id, text) { return h('span', { class: 'count', id }, text); }
function moveList(items, order, onchange) {
  const ol = h('ol', { class: 'movelist' });
  const draw = () => ol.replaceChildren(...order.map((idx, pos) => h('li', null, h('span', { class: 'mv-text' }, items[idx]),
    h('span', { class: 'mv-btns' },
      h('button', { class: 'icon', 'aria-label': 'Move up', disabled: pos === 0, onclick: () => { [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]]; onchange(order); draw(); } }, '↑'),
      h('button', { class: 'icon', 'aria-label': 'Move down', disabled: pos === order.length - 1, onclick: () => { [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]]; onchange(order); draw(); } }, '↓')))));
  draw(); return ol;
}
/* Select text in your own draft and mark it. */
function selfMarker(getText, marks, onAdd, onRemove) {
  const ta = h('textarea', { class: 'sheet readonly', readOnly: true, rows: 8, value: getText(), 'aria-label': 'Your draft. Select a problem to mark it.' });
  const type = h('select', { 'aria-label': 'Error type' }, ERROR_TYPES.map(t => h('option', { value: t }, t)));
  const fix = h('input', { type: 'text', placeholder: 'Correct form, if you know it', 'aria-label': 'Correct form' });
  const out = h('p', { class: 'muted small' }, matchMedia('(pointer: coarse)').matches ? 'Press and hold to select the wrong words in your draft, then mark them.' : 'Select the wrong words in your draft, then mark them.');
  const list = h('ul', { class: 'marklist' });
  const draw = () => list.replaceChildren(...marks().map((m, i) => [m, i]).filter(([m]) => m.by === 'self').map(([m, i]) => m.by === 'self' ? h('li', null, h('span', { class: 'tag' }, m.type), ' “', h('span', { class: 'q' }, m.quote), '”',
    m.fix ? [' → ', h('em', null, m.fix)] : '', h('button', { class: 'icon', 'aria-label': 'Remove mark', onclick: () => { onRemove(i); draw(); } }, '×')) : null));
  const btn = h('button', { class: 'btn', onclick: () => {
    const a = ta.selectionStart, b = ta.selectionEnd, q = ta.value.slice(a, b);
    if (!q.trim()) { out.textContent = 'Select some words in the draft first.'; return; }
    onAdd({ quote: q, at: a, type: type.value, hint: '', by: 'self', fixed: !!fix.value.trim(), fix: fix.value.trim(), tries: 0, note: '', errId: '' });
    fix.value = ''; out.textContent = 'Marked. Find the next one.'; draw();
  } }, 'Mark selection');
  draw();
  return h('div', { class: 'marker' }, ta, h('div', { class: 'markrow' }, type, fix, btn), out, list);
}

/* ---------- steps ---------- */
const STEPS = {
  copy(s, flash) {
    const m = modelById(s.data.modelId);
    return { el: h('div', { class: 'stack' },
      p('Copy this paragraph by hand, on paper. Copying puts native sentence patterns back in your hand without the pressure of inventing content.', 'lead'),
      modelBlock(m),
      p(['Or copy a paragraph from a ', h('a', { href: SITES[0][1], target: '_blank', rel: 'noopener' }, 'Paul Graham essay'), ' instead.'], 'muted small'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!s.data.copied, onchange: e => { s.data.copied = e.target.checked; } }), ' I copied it by hand')),
      ready: () => s.data.copied ? null : 'Tick the box once you have copied it.' };
  },

  write(s, flash) {   // the sprint
    const d = s.data, a = app();
    const topic = h('p', { class: 'topic' }, d.topic);
    const other = h('button', { class: 'btn quiet small', hidden: !!(d.text || '').trim(), onclick: () => { const i = (TOPICS.indexOf(d.topic) + 1) % TOPICS.length; d.topic = TOPICS[i]; topic.textContent = d.topic; } }, 'Another topic');
    const ta = writeArea({ id: 'sprint', value: d.text, rows: 14, noDelete: a.noDelete, flash, placeholder: 'Start with the simplest true sentence.',
      oninput: v => { d.text = v; other.hidden = true; Engine.onSprintInput(); Focus.updateClock(); } });
    const rules = (s.phase || 1) === 1 ? PHASES[1].rules : [];
    return { el: h('div', { class: 'stack' },
      h('div', { class: 'topicrow' }, h('span', { class: 'eyebrow' }, 'Write about'), topic, other),
      rules.length ? h('ul', { class: 'rules' }, rules.map(r => h('li', null, r))) : '',
      ta,
      h('div', { class: 'meta' }, counter('sprintwords', (d.sprint ? d.sprint.words : 0) + ' words'), h('span', { class: 'pause', id: 'pausem' }, ''),
        h('span', { class: 'muted' }, a.noDelete ? 'No deleting, no checker. ' : '', 'Pause over ' + mmss(a.pauseLimit || 60) + ' breaks "without stopping".'))),
      ready: () => (d.text || '').trim() ? null : 'Write something first.' };
  },

  check(s, flash) {
    const text = L.mainText(s);
    const rep = L.sentenceReport(text, s.phase);
    const off = rep.filter(r => r.long || r.short).length;
    return { el: h('div', { class: 'stack' },
      p('Read it aloud. Underline 3 problems yourself: select the words, choose the kind of error, and mark them. They go into your error log.', 'lead'),
      selfMarker(() => text, () => s.marks, m => { s.marks.push(m); Engine.save(); }, i => { s.marks.splice(i, 1); Engine.save(); }),
      s.phase === 1 && rep.length ? p(plural(rep.length, 'sentence') + ', ' + off + ' outside 10-20 words. ' + (rep.filter(r => r.long).length ? 'Longest: ' + Math.max(...rep.map(r => r.words)) + ' words.' : ''), 'muted small') : '',
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!s.data.fewer, onchange: e => { s.data.fewer = e.target.checked; } }), ' I found fewer than 3')),
      ready: () => s.marks.filter(m => m.by === 'self').length >= 3 || s.data.fewer ? null : 'Mark 3 problems, or tick “I found fewer than 3”.' };
  },

  read(s) {
    const m = modelById(s.data.modelId);
    return { el: h('div', { class: 'stack' }, p('Read the paragraph twice. Notice how each sentence opens and what it hands to the next one.', 'lead'), modelBlock(m),
      s.data.shuffled ? p('This is a shuffle week: your notes will come back in scrambled order and you will put them in order before rebuilding.', 'note') : ''), ready: () => null };
  },

  notes(s, flash) {   // franklin1 and franklin3
    const m = modelById(s.data.modelId), sents = L.splitSentences(m.text);
    const d = s.data; d.notes = d.notes && d.notes.length === sents.length ? d.notes : sents.map(() => '');
    const rows = sents.map((t, i) => {
      const c = counter(null, L.countWords(d.notes[i]) + ' w');
      return h('li', { class: 'noterow' }, h('p', { class: 'src' }, t),
        h('div', { class: 'noteinput' }, h('input', { type: 'text', value: d.notes[i], 'aria-label': 'Note for sentence ' + (i + 1), placeholder: '3-5 words',
          onpaste: e => { e.preventDefault(); flash('Paste is off.'); },
          oninput: e => { d.notes[i] = e.target.value; const w = L.countWords(e.target.value); c.textContent = w + ' w'; c.classList.toggle('warn', w > 5); } }), c));
    });
    return { el: h('div', { class: 'stack' }, p('Write a 3-5 word note for each sentence: the idea, not the wording. Then the original goes away.', 'lead'),
      h('ol', { class: 'notes' }, rows), h('p', { class: 'muted small' }, m.author + ', ' + m.title)),
      ready: () => d.notes.some(n => !n.trim()) ? 'Write a note for every sentence.' : null };
  },

  'franklin2:order'(s) {
    const d = s.data;
    return { el: h('div', { class: 'stack' }, p('Shuffle week. Your notes are scrambled. Put them back in the order the ideas should go, then rebuild.', 'lead'),
      moveList(d.notes, d.order, o => { d.order = o; })), ready: () => null };
  },

  rebuild(s, flash) {
    const d = s.data, order = d.order || d.notes.map((_, i) => i);
    const c = counter('rw', L.countWords(d.text) + ' words');
    return { el: h('div', { class: 'stack' },
      p('Rebuild the paragraph from your notes only, in any suitable words. Express each idea as fully as the original did.', 'lead'),
      h('ol', { class: 'notelist' }, order.map(i => h('li', null, d.notes[i] || '—'))),
      writeArea({ id: 'rebuild', value: d.text, rows: 10, flash, oninput: v => { d.text = v; c.textContent = L.countWords(v) + ' words'; } }),
      h('div', { class: 'meta' }, c)),
      ready: () => L.countWords(d.text) >= 20 ? null : 'Rebuild the whole paragraph first.' };
  },

  compare(s) {
    const d = s.data, m = modelById(d.modelId), sents = L.splitSentences(m.text);
    d.kept = d.kept && d.kept.length === sents.length ? d.kept : sents.map(() => false);
    d.diffs = d.diffs || ['', ''];
    let orderNote = '';
    if (d.order) { const right = d.order.filter((v, i) => v === i).length; d.orderRight = right; orderNote = 'You put ' + right + ' of ' + d.order.length + ' notes back in the original order.'; }
    return { el: h('div', { class: 'stack' },
      p('Compare your version with the original. Tick each idea you kept, then note 2 differences in wording or structure.', 'lead'),
      orderNote ? p(orderNote, 'note') : '',
      h('div', { class: 'compare' },
        h('section', null, h('h3', null, 'Original'), h('ol', { class: 'kept' }, sents.map((t, i) => h('li', null,
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: d.kept[i], onchange: e => { d.kept[i] = e.target.checked; } }), h('span', null, t)))))),
        h('section', null, h('h3', null, 'Yours'), h('div', { class: 'yours' }, d.text || ''))),
      h('label', { class: 'field' }, 'Difference 1', h('input', { type: 'text', value: d.diffs[0], oninput: e => { d.diffs[0] = e.target.value; } })),
      h('label', { class: 'field' }, 'Difference 2', h('input', { type: 'text', value: d.diffs[1], oninput: e => { d.diffs[1] = e.target.value; } }))),
      ready: () => d.diffs.every(x => x.trim()) ? null : 'Note 2 differences.',
      commit: () => { d.keptAll = d.kept.every(Boolean); } };
  },

  combine(s, flash) {
    const d = s.data; d.ways = d.ways || ['', '', ''];
    const set = setById(d.setId);
    const body = h('div', { class: 'stack' });
    const draw = () => {
      const set = setById(d.setId);
      body.replaceChildren(...[
        p('Join these 6 short sentences into 2-3 longer ones. Do it three different ways.', 'lead'),
        h('ol', { class: 'source6' }, set.s.map(t => h('li', null, t))),
        d.ways.every(w => !w.trim()) ? h('button', { class: 'btn quiet small', onclick: () => { const i = (COMBINING.indexOf(set) + 1) % COMBINING.length; d.setId = COMBINING[i].id; draw(); } }, 'Another set') : '',
        d.ways.map((w, i) => {
          const c = counter(null, L.splitSentences(w).length + ' sentences');
          return h('div', { class: 'way' }, h('span', { class: 'eyebrow' }, 'Way ' + (i + 1)),
            writeArea({ value: w, rows: 3, small: true, flash, label: 'Way ' + (i + 1), oninput: v => { d.ways[i] = v; c.textContent = L.splitSentences(v).length + ' sentences'; } }), c);
        })].flat().filter(x => x !== ''));
    };
    draw();
    return { el: body, ready: () => {
      for (let i = 0; i < 3; i++) { const n = L.splitSentences(d.ways[i]).length; if (n < 2 || n > 3) return 'Way ' + (i + 1) + ' needs 2 or 3 sentences.'; }
      if (new Set(d.ways.map(L.norm)).size < 3) return 'Make the three ways different.';
      return null;
    } };
  },

  source(s) {
    const d = s.data;
    return { el: h('div', { class: 'stack' }, p('Pick an article you read this week. You will summarize its main point in 100 words.', 'lead'),
      h('label', { class: 'field' }, 'Article title', h('input', { type: 'text', value: d.article || '', oninput: e => { d.article = e.target.value; } })),
      h('label', { class: 'field' }, 'Link (optional)', h('input', { type: 'url', value: d.link || '', oninput: e => { d.link = e.target.value; } })),
      p('Close the article before you write.', 'muted small')),
      ready: () => (d.article || '').trim() ? null : 'Name the article first.' };
  },

  'summary:write'(s, flash) {
    const d = s.data, c = counter('sw', L.countWords(d.text) + ' / 100 words');
    return { el: h('div', { class: 'stack' }, p('State the main point first, then what supports it. 100 words.', 'lead'), p(d.article || '', 'topic'),
      writeArea({ id: 'summary', value: d.text, rows: 8, flash, oninput: v => { d.text = v; const w = L.countWords(v); c.textContent = w + ' / 100 words'; c.classList.toggle('ok', w >= 90 && w <= 110); } }),
      h('div', { class: 'meta' }, c)),
      ready: () => { const w = L.countWords(d.text); return w >= 90 && w <= 110 ? null : 'Aim for 100 words (90-110). You have ' + w + '.'; } };
  },

  point(s) {
    const d = s.data;
    return { el: h('div', { class: 'stack' }, p('Step 1 of 6: the point. Write the one sentence this paragraph must prove.', 'lead'),
      h('input', { type: 'text', class: 'big', value: d.point || '', 'aria-label': 'The point', oninput: e => { d.point = e.target.value; } })),
      ready: () => (d.point || '').trim() ? null : 'Write the point.' };
  },
  'paragraph:notes'(s) {
    const d = s.data;
    return { el: h('div', { class: 'stack' }, p('Step 2: notes. 3-6 short notes that support the point, one per line.', 'lead'), p(d.point, 'topic'),
      h('textarea', { class: 'sheet small', rows: 6, value: (d.notes || []).join('\n'), oninput: e => { d.notes = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); } })),
      ready: () => { const n = (d.notes || []).length; return n >= 3 && n <= 6 ? null : 'Write 3-6 notes, one per line.'; } };
  },
  'paragraph:order'(s) {
    const d = s.data, order = d.notes.map((_, i) => i);
    return { el: h('div', { class: 'stack' }, p('Step 3: order. Arrange the notes so each one leads into the next.', 'lead'),
      moveList(d.notes, order, o => { d.order = o.slice(); })),
      ready: () => null, commit: () => { if (d.order) d.notes = d.order.map(i => d.notes[i]); delete d.order; } };
  },
  draft(s, flash) {
    const d = s.data, c = counter('dw', L.countWords(d.draft) + ' words');
    return { el: h('div', { class: 'stack' }, p('Step 4: draft. Open with the point, then follow your notes in order.', 'lead'),
      h('div', { class: 'plan' }, h('p', { class: 'topic' }, d.point), h('ol', { class: 'notelist' }, d.notes.map(n => h('li', null, n)))),
      writeArea({ id: 'draft', value: d.draft || '', rows: 8, flash, oninput: v => { d.draft = v; c.textContent = L.countWords(v) + ' words'; } }), h('div', { class: 'meta' }, c)),
      ready: () => L.countWords(d.draft) >= 40 ? null : 'Draft the paragraph first (40+ words).' };
  },
  link(s, flash) {
    const d = s.data;
    const box = h('div', { class: 'stack' });
    const draw = () => {
      const sents = L.splitSentences(d.draft); d.links = sents.map((_, i) => (d.links || [])[i] || false);
      box.replaceChildren(p('Step 5: link. Each sentence should pick up something from the one before it. Tick each pair that links; fix the ones that do not.', 'lead'),
        h('ol', { class: 'pairs' }, sents.slice(1).map((t, i) => h('li', null, h('p', { class: 'prev' }, sents[i]), h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: d.links[i + 1], onchange: e => { d.links[i + 1] = e.target.checked; } }), h('span', null, t))))),
        h('details', null, h('summary', null, 'Edit the draft'), writeArea({ value: d.draft, rows: 6, flash, oninput: v => { d.draft = v; } }),
          h('button', { class: 'btn quiet small', onclick: draw }, 'Update the pairs')));
    };
    draw();
    return { el: box, ready: () => d.links.slice(1).every(Boolean) ? null : 'Tick every pair once it links.' };
  },
  close(s) {
    const d = s.data;
    const prev = h('p', { class: 'yours' }, d.draft + ' ' + (d.close || ''));
    return { el: h('div', { class: 'stack' }, p('Step 6: close. One sentence that returns to the point with what the paragraph has shown.', 'lead'), p(d.point, 'topic'),
      h('input', { type: 'text', class: 'big', value: d.close || '', 'aria-label': 'Closing sentence', onpaste: e => e.preventDefault(), oninput: e => { d.close = e.target.value; prev.textContent = d.draft + ' ' + d.close; } }), prev),
      ready: () => (d.close || '').trim() ? null : 'Write the closing sentence.' };
  },

  study(s) {
    const type = s.data.type, rows = errorsList().filter(e => e.type === type);
    const notes = [...new Set(sessions().concat(pieces()).flatMap(x => (x.marks || []).filter(m => m.type === type && m.note).map(m => m.note)))].slice(0, 3);
    return { el: h('div', { class: 'stack' }, p('This error type has come up ' + plural(rows.reduce((t, r) => t + r.dates.length, 0), 'time') + '. Study your own examples.', 'lead'),
      h('h3', null, type), h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'What you wrote'), h('th', null, 'Correct form'))),
        h('tbody', null, rows.map(r => h('tr', null, h('td', null, r.wrote), h('td', null, r.correct || '—'))))),
      notes.length ? h('ul', { class: 'rules' }, notes.map(n => h('li', null, n))) : ''), ready: () => null };
  },
  practice(s, flash) {
    const d = s.data, c = counter('pw', L.splitSentences(d.text).length + ' sentences');
    return { el: h('div', { class: 'stack' }, p('Write 6 sentences of your own about your work or your day, each using the correct form for: ' + d.type + '.', 'lead'),
      writeArea({ id: 'practice', value: d.text, rows: 9, flash, oninput: v => { d.text = v; c.textContent = L.splitSentences(v).length + ' sentences'; } }), h('div', { class: 'meta' }, c)),
      ready: () => L.splitSentences(d.text).length >= 6 ? null : 'Write 6 sentences.' };
  },

  work(s, flash) {
    return { el: pieceEditor(s.data.pieceId, { flash, inFocus: true }), ready: () => null };
  }
};

/* ---------- after the last step ---------- */
function doneScreen() {
  const s = Store.get('sessions', Engine.done) || Engine.s;
  const mins = Math.round(s.seconds / 60);
  const lines = [h('p', { class: 'lead' }, plural(mins, 'minute') + (s.words ? ', ' + plural(s.words, 'word') : '') + '.')];
  const sp = s.data.sprint;
  if (sp) {
    const lim = app().pauseLimit || 60, clean = L.sprintClean(sp, lim);
    lines.push(h('p', { class: clean ? 'good' : 'note' }, plural(sp.words, 'word') + ' in ' + mmss(sp.seconds) + '. ' +
      (sp.interrupted ? 'The page was reloaded mid-write, so this one does not count as "without stopping".' : clean ? 'No pause over ' + mmss(lim) + '.' : 'Longest pause ' + mmss(sp.maxPause) + ', over the ' + mmss(lim) + ' limit.') +
      (L.sprintPasses(sp, lim) ? ' This meets the 150-words gate.' : '')));
  }
  if (s.kind === 'franklin1') lines.push(p('Notes saved and the original put away. The rebuild comes up after at least one more day and one other drill.', 'note'));
  if (s.kind === 'franklin2' || s.kind === 'franklin3') lines.push(p(s.data.keptAll ? 'Your version kept every idea of the original.' : 'Some ideas were lost. That rebuild does not count toward the gate, but the comparison is the learning.', s.data.keptAll ? 'good' : 'note'));
  const reviewable = s.kind !== 'franklin1' && s.kind !== 'piece' && L.mainText(s).trim();
  return h('div', { class: 'focus-inner done' },
    h('header', { class: 'focus-head' }, h('div', { class: 'fh-left' }, h('span', { class: 'eyebrow' }, KIND_LABEL[s.kind]), h('h2', null, 'Session done'))),
    h('main', { class: 'focus-body' }, h('div', { class: 'stack' }, lines, reviewable ? reviewBox('sessions', s.id) : '')),
    h('footer', { class: 'focus-foot' },
      reviewable || s.kind === 'piece' ? h('button', { class: 'btn', onclick: () => { App.sel = s.kind === 'piece' ? { coll: 'pieces', id: s.data.pieceId } : { coll: 'sessions', id: s.id }; Engine.close(); go('writing'); } }, 'Open in Writing') : '',
      h('button', { class: 'btn primary', onclick: () => { Engine.close(); go('today'); } }, 'Back to Today')));
}
