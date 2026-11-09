/* logic.js: pure plan rules. No DOM, no storage. Tested headlessly by test/test_logic.js. */
'use strict';

const L = (() => {
  /* ---------- dates (local calendar days as 'YYYY-MM-DD') ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const dow = s => toDate(s).getDay();
  const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
  const weekStartOf = (s, ws) => addDays(s, -((dow(s) - (ws || 0) + 7) % 7));
  const weekIndex = (start, s, ws) => Math.floor(daysBetween(weekStartOf(start, ws), weekStartOf(s, ws)) / 7) + 1;
  const isWeekend = (s, app) => (app.restDays || []).includes(dow(s));
  const inWeek = (s, today, ws) => !!s && weekStartOf(s, ws) === weekStartOf(today, ws);

  /* ---------- text ---------- */
  const countWords = t => { const m = (t || '').trim().match(/\S+/g); return m ? m.length : 0; };
  const ABBR = /(?:^|\s)(?:Mr|Mrs|Ms|Dr|St|Prof|vs|etc|e\.g|i\.e|No|Fig|approx)\.$/i;
  function splitSentences(text) {
    const parts = (text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?]["'”’)\]]*)\s+/);
    const out = [];
    for (const p of parts) {
      if (!p) continue;
      const prev = out[out.length - 1];
      if (prev && (ABBR.test(prev) || /^[a-z]/.test(p))) out[out.length - 1] = prev + ' ' + p;
      else out.push(p);
    }
    return out;
  }
  /* Phase 1: 10-20 words per sentence. From Phase 2: nothing past 25. */
  function sentenceReport(text, phase) {
    const max = phase <= 1 ? 20 : 25, min = phase <= 1 ? 10 : 0;
    return splitSentences(text).map(t => { const w = countWords(t); return { text: t, words: w, long: w > max, short: min > 0 && w < min }; });
  }
  /* The sentence that contains character position `at`. */
  function sentenceAround(text, at) {
    const t = text || ''; if (at < 0 || at > t.length) return '';
    let a = at; while (a > 0 && !/[.!?\n]/.test(t[a - 1])) a--;
    let b = at; while (b < t.length && !/[.!?\n]/.test(t[b])) b++;
    return t.slice(a, Math.min(t.length, b + 1)).trim();
  }

  /* ---------- session step flows (minutes) ---------- */
  const FLOWS = {
    phase1: [['copy', 5], ['write', 15, 1], ['check', 5]],
    short: [['write', 10, 1], ['check', 3]],
    franklin1: [['read', 5], ['notes', 20]],
    franklin2: [['order', 3], ['rebuild', 17], ['compare', 5]],
    franklin3: [['notes', 8], ['rebuild', 12], ['compare', 5]],
    combining: [['combine', 25]],
    summary: [['source', 3], ['write', 17], ['check', 5]],
    paragraph: [['point', 3], ['notes', 5], ['order', 2], ['draft', 10], ['link', 3], ['close', 2]],
    piece: [['work', 25]],
    drill: [['study', 5], ['practice', 15], ['check', 5]],
    placement: [['test', 10]],
    gatetest: [['gtest', 15]],
    grammar: [['unit', 15], ['use', 10]],
    imitation: [['article', 3], ['patterns', 5], ['imitate', 17]]
  };
  /* On imitation days the drill takes the place of one step (roadmap section 5). */
  const IMITATE_VARIANT = {
    grammar: [['unit', 15], ['article', 2], ['patterns', 3], ['imitate', 10]],
    phase1: [['copy', 5], ['article', 2], ['patterns', 3], ['imitate', 10], ['check', 5]]
  };
  function flowFor(kind, data) {
    data = data || {};
    const src = data.imitate && IMITATE_VARIANT[kind] ? IMITATE_VARIANT[kind] : (FLOWS[kind] || []);
    let f = src.map(([id, min, sprint]) => ({ id, min, sprint: !!sprint }));
    if (kind === 'franklin2' && !data.shuffled) f = f.filter(s => s.id !== 'order');
    if (kind === 'piece' && data.minutes) f = [{ id: 'work', min: data.minutes, sprint: false }];
    return f;
  }
  /* The text a session produced, for word counts and review. */
  const imitationSentences = s => ((s.data && s.data.imitations) || []).flat().map(x => (x || '').trim()).filter(Boolean);
  const hasImitation = s => s.kind === 'imitation' || !!(s.data && s.data.imitate);
  function mainText(s) {
    const d = s.data || {};
    if (hasImitation(s)) return imitationSentences(s).join('\n');
    if (s.kind === 'placement') return d.partB || '';
    if (s.kind === 'gatetest') return '';
    if (s.kind === 'combining') return (d.ways || []).join('\n\n');
    if (s.kind === 'paragraph') return [d.draft || '', d.close || ''].filter(Boolean).join(' ');
    if (s.kind === 'franklin1') return '';
    return d.text || '';
  }

  /* ---------- sprint: "without stopping" ---------- */
  function sprintClean(sp, pauseLimit) {
    return !!sp && !sp.interrupted && (sp.paused || 0) === 0 && (sp.maxPause || 0) <= (pauseLimit || 60);
  }
  function sprintPasses(sp, pauseLimit) {
    return sprintClean(sp, pauseLimit) && sp.words >= 150 && sp.seconds <= 15 * 60 + 5;
  }

  /* ---------- models ---------- */
  function nextModel(models, form, sessions) {
    const pool = models.filter(m => (m.form || 'essay') === form);
    const list = pool.length ? pool : models;
    const used = {};
    for (const s of sessions) if (s.data && s.data.modelId && (s.kind === 'franklin1' || s.kind === 'franklin3')) used[s.data.modelId] = (used[s.data.modelId] || 0) + 1;
    let best = null;
    for (const m of list) if (!best || (used[m.id] || 0) < (used[best.id] || 0)) best = m;
    return best;
  }
  /* Deterministic shuffle so a reload shows the same scrambled order. */
  function shuffleOrder(n, seed) {
    let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift());
    return a;
  }

  /* ---------- queue: what to do today ---------- */
  const byTime = (a, b) => (a.finishedAt || a.startedAt || '').localeCompare(b.finishedAt || b.startedAt || '');
  function pendingNotes(sessions) {
    const rebuilt = new Set(sessions.filter(s => s.kind === 'franklin2' && s.status === 'done').map(s => s.data && s.data.notesId));
    return sessions.filter(s => s.kind === 'franklin1' && s.status === 'done' && !rebuilt.has(s.id)).sort(byTime)[0] || null;
  }
  function openPiece(pieces, phaseMin, phaseMax) {
    return pieces.filter(p => p.phase >= phaseMin && p.phase <= phaseMax && p.status !== 'done').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0] || null;
  }
  const P2_CYCLE = ['franklin1', 'combining', 'summary', 'paragraph'];
  const P3_SLOTS = ['piece', 'franklin3', 'piece', 'combining', 'piece'];

  function nextAction(app, sessions, pieces, models, today) {
    const phase = typeof app.phase === "number" ? app.phase : 1;
    const all = sessions.slice().sort(byTime);
    const active = all.filter(s => s.status === 'active').pop();
    if (active) return { kind: active.kind, resume: active.id, title: 'Finish your ' + active.kind + ' session', why: 'You started this and did not finish it.', minutes: 0 };
    const done = all.filter(s => s.status === 'done');
    const weekend = isWeekend(today, app);
    const ws = app.weekStart || 0;
    const doneToday = done.filter(s => s.date === today && s.kind !== 'short' && s.kind !== 'drill');
    const form = app.form || 'essay';
    const franklinData = (kind, extra) => {
      const m = nextModel(models, phase >= 3 ? form : 'essay', all);
      return Object.assign({ modelId: m && m.id }, extra || {});
    };
    /* Weekday sessions already done this week (before today), and imitation days among them. */
    const weekDoneBefore = done.filter(s => s.phase === phase && inWeek(s.date, today, ws) && !isWeekend(s.date, app) && s.kind !== 'short' && s.kind !== 'drill' && s.date !== today);
    const imitationsThisWeek = done.filter(s => s.phase === phase && inWeek(s.date, today, ws) && hasImitation(s)).length;
    const twiceWeekly = () => (weekDoneBefore.length === 1 || weekDoneBefore.length >= 3) && imitationsThisWeek < 2;
    let a;
    if (phase === 0) {
      const placed = done.some(s => s.kind === 'placement' && s.data && s.data.result);
      const taken = done.find(s => s.kind === 'placement');
      if (!placed && !taken) a = { kind: 'placement', title: 'Placement test', why: '10 sentences to correct and 5 to write. No AI, no checker, no dictionary. Guess and mark unsure answers with "?".', minutes: 10 };
      else if (!placed) a = { kind: null, title: 'Get your placement test marked', why: 'Open it in Writing and ask Claude to mark it. The result decides which grammar areas you study.', minutes: 0, openId: taken.id };
      else if (weekend) a = { kind: null, title: 'Weekend', why: 'Phase 0 runs on 5 weekdays. Read for 15 minutes today.', minutes: 0 };
      else if (twiceWeekly()) a = { kind: 'grammar', data: { imitate: true }, title: 'Grammar unit, then sentence imitation', why: 'One Murphy unit (15 minutes), then imitate 3 sentence patterns from an article.', minutes: 30 };
      else a = { kind: 'grammar', title: 'Grammar unit, then use it', why: 'One Murphy unit (15 minutes), then 5 sentences of your own that use it (10 minutes).', minutes: 25 };
    } else if (phase === 1) {
      a = weekend ? { kind: null, title: 'Weekend', why: 'Phase 1 runs on 5 weekdays. Read for 15 minutes today.', minutes: 0 }
        : twiceWeekly() ? { kind: 'phase1', data: { imitate: true }, title: 'Copy, imitate, check', why: 'Copy 5 minutes, an article session instead of the timed writing, then check.', minutes: 25 }
        : { kind: 'phase1', title: 'Copy, write, check', why: 'Copy 5 minutes, write 15 without stopping, check 5.', minutes: 25 };
    } else if (phase === 2 && weekend) {
      const p = openPiece(pieces, 2, 2);
      const st = p ? p.status : 'plan';
      a = { kind: 'piece', pieceId: p ? p.id : null, newPiece: !p, title: (st === 'revise' ? 'Revise' : 'Plan and draft') + ' the weekend piece',
            why: st === 'revise' ? 'Run the revision checklist on this week’s piece.' : 'One 400-600 word piece: plan and draft today, revise tomorrow.', minutes: 60 };
    } else if (phase === 2) {
      const p2 = done.filter(s => s.phase === 2 && (P2_CYCLE.includes(s.kind) || s.kind === 'franklin2'));
      const pend = pendingNotes(done);
      const last = p2[p2.length - 1];
      if (weekDoneBefore.length === 3 && imitationsThisWeek === 0) {
        a = { kind: 'imitation', title: 'Article session', why: 'Once a week, sentence imitation replaces one drill: 3 patterns from an article, 3 imitations of each.', minutes: 25 };
      } else if (pend && pend.date < today && last && last.kind !== 'franklin1') {
        a = { kind: 'franklin2', title: 'Rebuild from your notes', why: 'Rebuild the paragraph from the notes you took on ' + pend.date + ', then compare.', minutes: 25,
              data: { notesId: pend.id, modelId: pend.data.modelId, shuffled: !!pend.data.shuffled } };
      } else {
        const count = p2.filter(s => s.kind !== 'franklin2').length;
        let pick = P2_CYCLE[count % 4];
        if (pick === 'franklin1' && pend) pick = 'combining';
        const f1count = done.filter(s => s.kind === 'franklin1' && s.phase === 2).length;
        const map = {
          franklin1: { title: 'Take notes on a model paragraph', why: 'Write a 3-5 word note for each sentence, then put the original away.', data: franklinData('franklin1', { shuffled: f1count % 2 === 1 }) },
          combining: { title: 'Sentence combining', why: 'Join 6 short sentences into 2-3 longer ones, three different ways.' },
          summary: { title: '100-word summary', why: 'Summarize an article you read this week in 100 words.' },
          paragraph: { title: 'One paragraph in six steps', why: 'Point, notes, order, draft, link, close.' }
        };
        a = Object.assign({ kind: pick, minutes: 25 }, map[pick]);
      }
    } else {
      if (weekend) {
        a = { kind: null, title: 'Weekend', why: 'Read for 15 minutes. Pieces and drills run on weekdays.', minutes: 0 };
      } else {
        const weekDone = weekDoneBefore;
        const slot = weekDone.length;
        let pick = phase === 3 ? (P3_SLOTS[slot] || 'piece')
                               : (slot >= 1 && !weekDone.some(s => s.kind === 'franklin3') ? 'franklin3' : 'piece');
        if (pick === 'piece') {
          const p = openPiece(pieces, 3, 4);
          a = { kind: 'piece', pieceId: p ? p.id : null, newPiece: !p, minutes: 25,
                title: p ? 'Work on "' + (p.title || 'Untitled') + '"' : 'Start this cycle’s piece',
                why: phase === 3 ? 'Week A: plan and draft. Week B: revise, get critique, revise again.' : 'Weeks 1-2 draft, week 3 critique and revise, week 4 publish.' };
        } else if (pick === 'franklin3') {
          a = { kind: 'franklin3', minutes: 25, title: 'Franklin rebuild in one sitting', why: '8 minutes of notes, 12 to rebuild, 5 to compare.', data: franklinData('franklin3') };
        } else {
          a = { kind: 'combining', minutes: 25, title: 'Sentence combining', why: 'Join 6 short sentences into 2-3 longer ones, three different ways.' };
        }
      }
    }
    a.doneToday = doneToday.length > 0;
    return a;
  }

  /* ---------- pieces ---------- */
  function stagesFor(phase) {
    if (phase <= 2) return ['plan', 'draft', 'revise', 'done'];
    if (phase === 3) return ['plan', 'draft', 'revise', 'feedback', 'revise2', 'done'];
    return ['plan', 'draft', 'revise', 'feedback', 'revise2', 'publish', 'done'];
  }
  function pieceTarget(piece, forms) {
    if (piece.phase <= 2) return [400, 600];
    const f = forms[piece.form] || forms.essay; return [f.min, f.max];
  }
  const readers = p => new Set((p.feedback || []).map(f => (f.by || '').trim().toLowerCase()).filter(Boolean)).size;
  /* Reasons the piece cannot leave its current stage. Empty = may advance. */
  function stageBlockers(piece, checkIds) {
    const b = [];
    switch (piece.status) {
      case 'plan':
        if (!(piece.plan && piece.plan.point && piece.plan.point.trim())) b.push('Write the one point the piece makes.');
        if (!(piece.plan && piece.plan.reader && piece.plan.reader.trim())) b.push('Name the reader.');
        break;
      case 'draft': if (countWords(piece.text) < 50) b.push('Draft the piece first.'); break;
      case 'revise': for (const id of checkIds) if (!(piece.checks || {})[id]) { b.push('Tick every item on the revision checklist.'); break; } break;
      case 'feedback':
        if (readers(piece) < 2) b.push('Record feedback from at least 2 readers.'); break;
      case 'revise2': {
        const v = (piece.versions || []).filter(x => x.label === 'feedback').pop();
        if (v && v.text === piece.text) b.push('Revise the text using the feedback.');
        break;
      }
      case 'publish': if (!(piece.publishedUrl || '').trim()) b.push('Add the link where it was published.'); break;
    }
    return b;
  }
  function advancePiece(piece, checkIds, nowIso) {
    if (stageBlockers(piece, checkIds).length) return piece;
    const st = stagesFor(piece.phase); const i = st.indexOf(piece.status);
    if (i < 0 || i >= st.length - 1) return piece;
    const next = st[i + 1];
    const p = JSON.parse(JSON.stringify(piece));
    p.versions = p.versions || [];
    if (piece.status !== 'plan') p.versions.push({ label: piece.status === 'revise' && next === 'feedback' ? 'feedback' : piece.status, date: nowIso, text: p.text });
    p.status = next; p.words = countWords(p.text);
    if (next === 'done') p.finishedAt = nowIso;
    return p;
  }

  /* ---------- error log ---------- */
  const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  function errorId(type, wrote) {
    let h = 5381; for (const c of norm(type) + '|' + norm(wrote)) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
    return 'e' + h.toString(36);
  }
  /* One row per distinct wrong form; each occurrence adds a date. Returns the new row. */
  function logError(existing, e) {
    const id = errorId(e.type, e.wrote);
    const row = existing ? JSON.parse(JSON.stringify(existing)) : { id, type: e.type, wrote: e.wrote.trim(), correct: '', by: e.by, date: e.date, dates: [] };
    row.dates.push(e.date);
    if (e.correct && e.correct.trim()) row.correct = e.correct.trim();
    return row;
  }
  function errorTypeCounts(errors) {
    const m = {};
    for (const e of errors) { const t = m[e.type] || (m[e.type] = { type: e.type, count: 0, rows: 0 }); t.count += (e.dates || []).length; t.rows++; }
    return Object.values(m).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }
  const computeTop3 = errors => errorTypeCounts(errors).filter(t => t.type !== 'Other').slice(0, 3).map(t => t.type);
  function drillTargets(errors, sessions) {
    return errorTypeCounts(errors).filter(t => t.count >= 3).map(t => ({
      type: t.type, count: t.count,
      drills: sessions.filter(s => s.kind === 'drill' && s.status === 'done' && s.data && s.data.type === t.type).length
    }));
  }

  /* ---------- gates ---------- */
  function top3Rate(top3, sessions, pieces) {
    const items = sessions.filter(s => s.phase === 2 && s.reviewedAt && s.status === 'done')
      .concat(pieces.filter(p => p.phase === 2 && p.reviewedAt))
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
    let words = 0; const counts = {}; for (const t of top3) counts[t] = 0;
    for (const it of items) {
      if (words >= 900) break;
      words += it.reviewedWords || it.words || 0;
      for (const m of it.marks || []) if (m.by === 'claude' && m.type in counts) counts[m.type]++;
    }
    const perType = top3.map(t => ({ type: t, count: counts[t], per300: words ? counts[t] / words * 300 : 0 }));
    return { words, perType, met: words >= 900 && top3.length > 0 && perType.every(x => x.per300 <= 1) };
  }
  /* Areas to study: every area with a wrong Part A item. */
  function flaggedAreas(items, areas) {
    const wrong = new Set((items || []).filter(i => !i.ok).map(i => i.n));
    return areas.filter(a => a.items.some(n => wrong.has(n))).map(a => a.id);
  }
  function evaluateGates(app, sessions, pieces, errors, critiques) {
    const done = sessions.filter(s => s.status === 'done');
    const p0 = app.p0 || {};
    const flagged = p0.flagged;
    const areasDone = flagged ? flagged.filter(id => p0.areas && p0.areas[id] && p0.areas[id].done).length : 0;
    const bestTest = done.filter(s => s.kind === 'gatetest' && s.data && typeof s.data.score === 'number').reduce((m, s) => Math.max(m, s.data.score), 0);
    const marked = done.filter(s => hasImitation(s) && s.reviewedAt).reduce((t, s) => t + imitationSentences(s).length, 0);
    const g0 = [
      flagged ? { label: 'Every area the placement test flagged is done', have: areasDone, need: flagged.length, met: areasDone === flagged.length }
              : { label: 'Placement test taken and marked', have: 0, need: 1 },
      { label: '9 or more right on a new 10-sentence test', have: bestTest, need: 9 },
      { label: '20 sentence imitations written and marked', have: marked, need: 20 }
    ];
    const n1 = done.filter(s => s.kind === 'phase1').length;
    let best = 0;
    for (const s of done) { const sp = s.data && s.data.sprint; if (sprintClean(sp, app.pauseLimit) && sp.seconds <= 905) best = Math.max(best, sp.words || 0); }
    const recurring = errorTypeCounts(errors).filter(t => t.count >= 2).length;
    const g1 = [
      { label: '15 sessions done', have: n1, need: 15 },
      { label: '150 words in 15 minutes without stopping', have: best, need: 150 },
      { label: '4 error types seen at least twice', have: recurring, need: 4 }
    ];
    const rebuilds = done.filter(s => s.kind === 'franklin2' && s.phase >= 2 && s.data && s.data.keptAll).length;
    const weekendPieces = pieces.filter(p => p.phase === 2 && p.status === 'done').length;
    const rate = top3Rate(app.top3 || [], sessions, pieces);
    const g2 = [
      { label: '6 Franklin rebuilds that keep every idea', have: rebuilds, need: 6 },
      { label: '8 weekend pieces finished and revised', have: weekendPieces, need: 8 },
      { label: 'Top 3 errors at most once per 300 words', have: rate.words, need: 900, met: rate.met, rate }
    ];
    const finished = pieces.filter(p => p.phase >= 3 && p.status === 'done' && (p.words || countWords(p.text)) >= 800);
    const g3 = [
      { label: '3 finished pieces of 800+ words', have: finished.length, need: 3 },
      { label: 'Each revised after feedback from 2+ readers', have: finished.filter(p => readers(p) >= 2).length, need: 3 },
      { label: '5 critiques written for other writers', have: critiques.length, need: 5 }
    ];
    const fin = items => { for (const i of items) if (i.met === undefined) i.met = i.have >= i.need; return { items, met: items.every(i => i.met) }; };
    return { 0: fin(g0), 1: fin(g1), 2: fin(g2), 3: fin(g3) };
  }

  /* ---------- reviews ---------- */
  function reviewsThisWeek(app, sessions, pieces, today) {
    return sessions.concat(pieces).filter(x => x.reviewedAt && x.reviewMode !== 'drill' && inWeek(x.reviewedAt.slice(0, 10), today, app.weekStart || 0)).length;
  }
  function reviewPrompt(text, top3, types) {
    return 'You are marking a draft written by an adult who is rebuilding their English writing without AI help.\n' +
      'Rules you must follow:\n' +
      '- Point at problems only. Never rewrite or correct anything, never suggest replacement words, and never write the corrected form anywhere in your reply.\n' +
      '- "quote" is copied exactly, character for character, from the draft: the shortest span that contains the problem, at most 12 words.\n' +
      '- "type" is exactly one of: ' + types.join('; ') + '.\n' +
      '- "hint" is one short question that helps the writer find the fix themselves without giving it.\n' +
      '- "note" states the general grammar rule in one sentence, using a different example from the draft.\n' +
      '- Grammar, spelling, punctuation and usage only; ignore style. At most 12 marks, most important first.\n' +
      (top3 && top3.length ? '- The writer is working on: ' + top3.join(', ') + '. Mark every instance of these.\n' : '') +
      'Reply with only a JSON array such as [{"quote":"a examples","type":"Article with a plural","hint":"Can a or an go before a plural noun?","note":"A and an go only before singular countable nouns, as in a cat but cats."}]. Reply [] if there are no problems.\n\n' +
      'Draft:\n"""\n' + text + '\n"""';
  }
  const clip = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');
  function validateMarks(raw, text, types) {
    if (!Array.isArray(raw)) return [];
    const used = new Set(), out = [];
    for (const m of raw.slice(0, 20)) {
      if (!m || typeof m.quote !== 'string' || !m.quote.trim() || m.quote.length > 240) continue;
      let at = text.indexOf(m.quote);
      while (at >= 0 && used.has(at)) at = text.indexOf(m.quote, at + 1);
      if (at < 0) continue;
      used.add(at);
      out.push({ quote: m.quote, at, type: types.includes(m.type) ? m.type : 'Other', hint: clip(m.hint, 300), by: 'claude', fixed: false, fix: '', tries: 0, note: clip(m.note, 300), errId: '' });
    }
    return out.sort((a, b) => a.at - b.at);
  }
  function repairPrompt(sentence, quote, type, fix) {
    return 'A learner wrote this sentence: "' + sentence + '"\n' +
      'The part "' + quote + '" was marked as: ' + type + '.\n' +
      'They propose replacing "' + quote + '" with: "' + fix + '"\n' +
      'Decide whether the sentence is correct, natural English with that replacement. Never give the correct answer or any replacement words. ' +
      'If it is wrong, give one short question that points toward the problem without revealing the answer.\n' +
      'Reply with only JSON: {"ok": true, "hint": ""} or {"ok": false, "hint": "..."}';
  }
  function validateRepair(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return { ok: raw.ok === true, hint: clip(raw.hint, 300) };
  }
  /* Outside the Claude viewer: the same prompt is copied to a Claude chat and the reply pasted back. */
  function parsePastedMarks(pasted, text, types) {
    const s = pasted || '', a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a < 0 || b <= a) return null;
    try { return validateMarks(JSON.parse(s.slice(a, b + 1)), text, types); } catch (e) { return null; }
  }

  /* ---------- Phase 0 tests and the imitation drill: prompts and reply checks ---------- */
  const NO_FIX = 'Never write the corrected sentence or any replacement words anywhere in your reply.';
  function testMarkPrompt(sentences, answers, types) {
    return 'You are marking a grammar test for an adult rebuilding their English. Each original sentence below has one or more errors; the learner rewrote it to correct it.\n' +
      'For each item decide whether the learner\'s version is fully correct, natural English that keeps the meaning. A "?" in the answer means the learner was unsure; ignore the "?" itself.\n' +
      NO_FIX + ' If an item is wrong, name the error type (one of: ' + types.join('; ') + ') and give one short hint question that points at the problem without giving the fix.\n' +
      'Reply with only a JSON array of ' + sentences.length + ' objects in order: [{"n":1,"ok":true,"type":"","hint":""}, ...].\n\n' +
      sentences.map((t, i) => (i + 1) + '. Original: ' + t + '\n   Learner: ' + (answers[i] || '(blank)')).join('\n');
  }
  function validateTestMarks(raw, count, types) {
    if (!Array.isArray(raw)) return null;
    const out = [];
    for (let i = 0; i < count; i++) {
      const r = raw.find(x => x && Number(x.n) === i + 1) || raw[i];
      if (!r || typeof r.ok !== 'boolean') return null;
      out.push({ n: i + 1, ok: r.ok, type: r.ok ? '' : (types.includes(r.type) ? r.type : 'Other'), hint: r.ok ? '' : clip(r.hint, 300) });
    }
    return out;
  }
  function newTestPrompt(areaNames) {
    return 'Write a new 10-sentence grammar test for an adult engineer rebuilding their English. Each sentence must contain one or two errors for the learner to correct, ' +
      'like "She work in a lab every day." or "We need more informations about the project." Use everyday topics from work, a university lab, electronics and daily life. ' +
      'Cover these areas, at least once each and more often for the first ones: ' + areaNames.join('; ') + '.\n' +
      'Do not include the corrected versions. Reply with only a JSON array of 10 objects: [{"sentence":"...","area":"<one of the area names>"}].';
  }
  function validateNewTest(raw, areaNames) {
    if (!Array.isArray(raw)) return null;
    const out = raw.filter(x => x && typeof x.sentence === 'string' && x.sentence.trim().length > 8).slice(0, 10)
      .map(x => ({ sentence: x.sentence.trim().slice(0, 200), area: areaNames.includes(x.area) ? x.area : '' }));
    return out.length === 10 ? out : null;
  }
  function breakdownPrompt(article) {
    return 'Below are 2-3 paragraphs from an article a learner wants to learn to write like. Break down ONE paragraph for a sentence imitation drill.\n' +
      'Give: "structure", one or two sentences on how the paragraph is built; then exactly 3 "patterns". For each pattern: "model", one sentence copied exactly, character for character, from the text; ' +
      '"pattern", its structure as a fill-in formula like "[Group] + [verb] + the way they + [verb]: [how], by + [-ing verb] + until + [clause]"; "grammar", the grammar inside it in one line.\n' +
      'Reply with only JSON: {"structure":"...","patterns":[{"model":"...","pattern":"...","grammar":"..."}, ...]}.\n\nText:\n"""\n' + article + '\n"""';
  }
  function validateBreakdown(raw, article) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.patterns)) return null;
    const flat = article.replace(/\s+/g, ' ');
    const pats = raw.patterns.filter(x => x && typeof x.pattern === 'string' && x.pattern.trim() && typeof x.model === 'string' && flat.includes(x.model.replace(/\s+/g, ' ').trim()))
      .slice(0, 3).map(x => ({ model: x.model.replace(/\s+/g, ' ').trim(), pattern: clip(x.pattern, 300), grammar: clip(x.grammar, 300) }));
    return pats.length === 3 ? { structure: clip(raw.structure, 400), patterns: pats } : null;
  }
  function patternCheckPrompt(patterns) {
    return 'A learner found sentence patterns in an article for an imitation drill. For each, check that the formula describes the model sentence\'s structure and that the grammar note is right. ' +
      'Do not rewrite their formula; if something is off, say what to look at again in one short sentence.\n' +
      'Reply with only a JSON array of ' + patterns.length + ' objects: [{"ok":true,"note":""}, ...].\n\n' +
      patterns.map((x, i) => (i + 1) + '. Model: ' + x.model + '\n   Formula: ' + x.pattern + '\n   Grammar: ' + x.grammar).join('\n');
  }
  function validatePatternCheck(raw, n) {
    if (!Array.isArray(raw) || raw.length < n) return null;
    return raw.slice(0, n).map(x => ({ ok: !!(x && x.ok === true), note: clip(x && x.note, 300) }));
  }
  /* Pull the JSON value out of a pasted reply. */
  function parsePastedJson(t) {
    t = t || '';
    const tries = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
    const a = t.search(/[[{]/), b = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
    if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
    for (const x of tries) { if (!x) continue; try { return JSON.parse(x); } catch (e) { /* next */ } }
    return undefined;
  }

  /* ---------- weekly tracker ---------- */
  function weekRows(app, sessions, errors, today) {
    const ws = app.weekStart || 0, start = app.startDate || today;
    const n = Math.max(1, weekIndex(start, today, ws)), base = weekStartOf(start, ws), rows = [];
    const done = sessions.filter(s => s.status === 'done');
    for (let w = 1; w <= n; w++) {
      const from = addDays(base, (w - 1) * 7), to = addDays(from, 6);
      const ss = done.filter(s => s.date >= from && s.date <= to);
      const days = new Set(ss.filter(s => s.kind !== 'drill').map(s => s.date)).size;
      const types = {};
      for (const e of errors) for (const d of e.dates || []) if (d >= from && d <= to) types[e.type] = (types[e.type] || 0) + 1;
      const common = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
      rows.push({ week: w, from, to, sessions: days, words: ss.reduce((t, s) => t + (s.words || 0), 0), common: common ? common[0] + ' (' + common[1] + ')' : '' });
    }
    return rows;
  }
  function daysSinceLast(sessions, today) {
    const d = sessions.filter(s => s.status === 'done').map(s => s.date).sort().pop();
    return d ? daysBetween(d, today) : null;
  }

  return { iso, addDays, dow, daysBetween, weekStartOf, weekIndex, isWeekend, inWeek, countWords, splitSentences, sentenceReport, sentenceAround,
    FLOWS, flowFor, mainText, sprintClean, sprintPasses, nextModel, shuffleOrder, pendingNotes, nextAction, stagesFor, pieceTarget, readers,
    stageBlockers, advancePiece, norm, errorId, logError, errorTypeCounts, computeTop3, drillTargets, top3Rate, evaluateGates,
    reviewsThisWeek, reviewPrompt, validateMarks, repairPrompt, validateRepair, parsePastedMarks, weekRows, daysSinceLast,
    imitationSentences, hasImitation, flaggedAreas, testMarkPrompt, validateTestMarks, newTestPrompt, validateNewTest, breakdownPrompt, validateBreakdown,
    patternCheckPrompt, validatePatternCheck, parsePastedJson };
})();

if (typeof module !== 'undefined') module.exports = L;
