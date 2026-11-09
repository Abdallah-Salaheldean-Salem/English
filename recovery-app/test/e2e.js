/* Headless walkthrough of every flow.  Run: node test/e2e.js  (after python3 build.py)
   Pass 1: browser-only mode (no Claude viewer): local storage, copy-and-paste review.
   Pass 2: a mocked Claude viewer: the db capability and Claude calls. */
'use strict';
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), assert = require('assert');

const ROOT = path.join(__dirname, '..');
const BODY = fs.readFileSync(path.join(ROOT, 'dist/english-writing-recovery.html'), 'utf8');
const PAGE = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + BODY + '</body></html>';
const Launcher = require('./launcher_mock.js');
const { phase0Answer } = require('./phase0_answers.js');
const P0_SRC = fs.readFileSync(path.join(__dirname, 'phase0_answers.js'), 'utf8');
const ARTICLE = 'Most engineers write the way they debug. They repeat the same mistake until it hurts. Good writers read a lot every week.\nThey copy sentences they admire. Then they rewrite them in their own words. Practice makes the pattern stick.';   // stands in for desktop/EnglishWritingRecovery.exe
const SHOTS = path.join(ROOT, 'test/shots'); fs.mkdirSync(SHOTS, { recursive: true });
const WORDS = 'The board did not boot so I checked the power rail and then the crystal and then the solder joints one by one until I found the crack'.split(' ');

const MOCK = `(() => {
  const K = 'mockdb', load = () => JSON.parse(localStorage.getItem(K) || '{}'), save = d => localStorage.setItem(K, JSON.stringify(d));
  const snap = (id, v) => ({ id, exists: v !== undefined, data: () => v, metadata: { fromCache: false, hasPendingWrites: false } });
  const doc = p => ({ id: p.split('/').pop(), path: p,
    get: async () => snap(p.split('/').pop(), load()[p]),
    set: async v => { const d = load(); d[p] = JSON.parse(JSON.stringify(v)); save(d); window.__writes = (window.__writes || 0) + 1; },
    delete: async () => { const d = load(); delete d[p]; save(d); } });
  const db = { doc, collection: c => ({ path: c, doc: id => doc(c + '/' + id), get: async () => { const d = load(); const docs = Object.keys(d).filter(k => k.startsWith(c + '/') && k.split('/').length === 2).map(k => snap(k.split('/')[1], d[k])); return { docs, size: docs.length, empty: !docs.length }; } }) };
  const sample = async () => ({ text: '' });
  sample.json = async (prompt) => {
    window.__prompts = (window.__prompts || []).concat([prompt]);
    const p0 = window.phase0Answer(prompt); if (p0) return p0;
    if (prompt.startsWith('A learner wrote')) return prompt.includes('with: "I go"') ? { ok: true, hint: '' } : { ok: false, hint: 'Who is doing the action?' };
    const m = prompt.match(/"""\\n([\\s\\S]*)\\n"""/); const text = m ? m[1] : '';
    const q = text.includes('I goes') ? 'I goes' : text.split(' ').slice(0, 2).join(' ');
    return [{ quote: q, type: 'Subject-verb agreement', hint: 'Who is the subject?', note: 'The verb agrees with its subject.' }, { quote: 'not in the text', type: 'Spelling' }];
  };
  window.claude = { use: async n => n === 'db' ? db : n === 'sample' ? sample : n === 'downloads' ? { save: async () => 'saved' } : null };
})();`;

async function run(mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(mode === 'pwa' ? Object.assign({}, devices['iPhone 13'], { serviceWorkers: 'block' }) : { viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const mock = mode === 'launcher' ? await Launcher.start(47811, '0123456789abcdef0123456789abcdef') : null;
  const site = mode === 'pwa' ? await Launcher.startStatic(47901, path.join(ROOT, 'pwa')) : null;
  const served = mock || site;
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('http://app.test')) return r.fulfill({ contentType: 'text/html', body: PAGE });
    if (served && u.startsWith(served.url)) return r.continue();
    if (site && u === 'https://api.anthropic.com/v1/messages') { const h = r.request().headers(); if (!h['x-api-key'] || h['anthropic-dangerous-direct-browser-access'] !== 'true') return r.fulfill({ status: 401, body: '{}' });
      const text = Launcher.fakeClaude(JSON.parse(r.request().postData()).messages[0].content); return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }) }); }
    return r.abort(); });
  if (mode === 'viewer') { await page.addInitScript(P0_SRC.replace("if (typeof module !== 'undefined') module.exports = { phase0Answer };", 'window.phase0Answer = phase0Answer;')); await page.addInitScript(MOCK); }
  await page.clock.install({ time: new Date('2026-11-04T09:00:00') });   // a Wednesday
  const tick = async (ms = 400) => { await page.clock.runFor(ms); if (served) { await new Promise(r => setTimeout(r, 120)); await page.clock.runFor(60); } };
  const open = async () => { await page.goto((served ? served.url : 'http://app.test/') + '#today'); await tick(600); };
  const click = async (sel, opt) => { await page.locator(sel, opt).first().click(); await tick(); };
  const btn = async name => { const f = page.locator('#focus:not([hidden])'); const scope = (await f.count()) ? f : page; await scope.getByRole('button', { name, exact: false }).first().click(); await tick(); };
  const text = () => page.locator('body').innerText();
  const startMain = async () => { await page.locator('.card.next .btn.primary').click(); await tick(); };
  const next = async () => { await page.locator('#next').click(); await tick(); };
  const has = async s => (await text()).toLowerCase().includes(s.toLowerCase());
  const shot = async name => page.screenshot({ path: path.join(SHOTS, mode + '-' + name + '.png'), fullPage: false });
  const step = async label => { const t = await page.locator('.steps li.now').innerText(); assert.ok(t.startsWith(label), 'expected step ' + label + ', got ' + t); };

  await open();
  /* onboarding */
  assert.ok(await has('Your writing is out of practice, not gone.'), 'onboarding');
  await page.getByLabel('Existing daily routine').fill('finish my morning coffee');
  await page.getByLabel('Place').fill('my desk at the Hub');
  await btn('Start the plan');
  if (served) {
    await click('#nav a[href="#setup"]');
    assert.ok(await has('No key saved'), 'no key at first');
    await page.locator('#apikey').fill('not-a-key'); await btn('Save key');
    assert.ok(await has('does not look like an Anthropic key'), 'key shape checked');
    await page.locator('#apikey').fill('sk-ant-test0123456789abcdefghij'); await btn('Save key'); await tick(600);
    assert.ok(await has('A key is saved'), 'key saved');
    await click('#nav a[href="#today"]');
  }
  /* ---------- Phase 0 (in the two modes that differ in how Claude is reached) ---------- */
  /* Answer a Claude task: the button inside the viewer, a pasted reply elsewhere. */
  const answer = async (label, promptStart) => {
    const f = page.locator('#focus:not([hidden])'); const scope = (await f.count()) ? f : page;
    if (mode === 'local') {
      const prompts = { mark: 'You are marking a grammar test', bd: 'Below are 2-3 paragraphs', test: 'Write a new 10-sentence grammar test' };
      let reply;
      if (promptStart === 'review') {
        const t = await page.evaluate(() => { const s = Store.list('sessions').filter(x => x.status === 'done').pop(); return L.mainText(s); });
        reply = JSON.stringify([{ quote: t.split(' ').slice(0, 2).join(' '), type: 'Verb tense', hint: 'When?', note: 'n' }]);
      } else if (promptStart === 'bd') reply = 'Here:\n' + JSON.stringify(phase0Answer(prompts.bd + ' x\n\nText:\n"""\n' + ARTICLE + '\n"""'));
      else reply = JSON.stringify(phase0Answer(prompts[promptStart] + (promptStart === 'mark' && label === 'placement' ? ' She work in a lab every day.' : '')));
      await scope.getByLabel('Claude reply').first().fill(reply); await scope.getByRole('button', { name: 'Use the reply' }).first().click(); await tick();
    } else { await scope.getByRole('button', { name: label }).first().click(); await tick(800); }
  };
  if (mode === 'local' || mode === 'viewer') {
    assert.ok(await has('Placement test'), 'phase 0 starts with the placement test');
    await startMain();
    const a1 = page.getByLabel('Your corrected sentence 1', { exact: true }); await a1.fill('She works in a lab every day.');
    await page.locator('#partb').click(); await page.keyboard.type('I went to the Hub. I fixed a printer. I met two students. We tested a board. I went home late.');
    await shot('placement');
    await next(); assert.ok(await has('Ask Claude to mark it') || await has('Copy request'), 'marking offered');
    await answer(mode === 'local' ? 'placement' : 'Ask Claude to mark it', 'mark');
    assert.ok(await has('8 of 10 right') && await has('Areas to study') && await has('Articles and nouns') && await has('Punctuation'), 'placement marked: ' + (await text()).slice(0, 600));
    if (mode === 'viewer') { await btn('Ask Claude to mark Part B'); await tick(600); assert.ok(await has('Marked by Claude'), 'part B marked'); }
    await btn('Back to Today');
    assert.ok(await has('Foundations: grammar areas') && await has('Grammar unit'), 'grammar session next');
    await startMain();
    await page.locator('label.field', { hasText: 'Unit' }).locator('input').fill('Unit 69, a and an');
    await next(); assert.ok(await has('Tick all three'), 'unit checklist');
    for (const l of ['Read the rule', 'Did the exercises', 'Checked them with the answer key']) await page.getByLabel(l).check();
    await next();
    await page.locator('#use').click(); await page.keyboard.type('I need an adapter. The board has a fuse. A student asked a question. I gave an answer. The lab has an oscilloscope.');
    await next(); assert.ok(await has('Session done') && await has('Logged: Unit 69'), 'grammar done');
    await btn('Back to Today');
    /* article session */
    await page.locator('.opt', { hasText: 'A different drill' }).locator('select').selectOption('imitation');
    await page.locator('.opt', { hasText: 'A different drill' }).getByRole('button').click(); await tick();
    await page.locator('label.field', { hasText: 'Article title' }).locator('input').fill('How engineers learn to write');
    await page.getByLabel('Article paragraphs').fill(ARTICLE);
    await next();
    await answer('Ask Claude for the breakdown', 'bd');
    assert.ok(await has('Structure:') && await has('Pattern:'), 'breakdown shown');
    await shot('patterns');
    await next();
    for (let i = 1; i <= 3; i++) for (let j = 1; j <= 3; j++) await page.getByLabel('Pattern ' + i + ', imitation ' + j).fill('The pump ' + i + ' moves water ' + j + '.');
    await next(); assert.ok(await has('9 imitations written'), 'imitations done');
    await answer('Ask Claude to mark your imitations', 'review');
    assert.ok(await has('Marked by Claude'), 'imitations marked');
    await btn('Back to Today');
    /* areas done, then the gate test */
    for (const n of ['Articles and nouns', 'Punctuation']) { await page.locator('.areas li', { hasText: n }).locator('input').check(); await tick(); }
    await answer('Ask Claude for a new test', 'test');
    await btn('Take the new test'); await next();
    await answer('Ask Claude to mark it', 'mark');
    assert.ok(await has('10 of 10 right') && await has('This passes the Phase 0 test.'), 'gate test passes');
    await btn('Back to Today');
    await click('#nav a[href="#plan"]');
    const g0 = await page.locator('.card.phase.current .gate li').allInnerTexts();
    assert.ok(/2 \/ 2/.test(g0[0]) && /10 \/ 9/.test(g0[1]) && /9 \/ 20/.test(g0[2]), 'phase 0 gate: ' + g0.join(' | '));
    assert.ok(await has('When things go wrong') && await has('How confident is this plan?') && await has('The sentence imitation drill'), 'plan reference cards');
    await click('#nav a[href="#errors"]');
    assert.ok(await has('well written articles') && await has('have that ?') && await has('Missing article'), '11 plan rows and test errors logged');
  } else {
    assert.ok(await has('Placement test'), 'phase 0 first (' + mode + ')');
  }
  /* ---------- the rest runs in Phase 1 ---------- */
  await click('#nav a[href="#setup"]');
  await page.locator('label.field', { hasText: 'Current phase' }).locator('select').selectOption('1'); await tick();
  await click('#nav a[href="#today"]');
  assert.ok(await has('Copy, write, check'), 'phase 1 action');
  await shot('today');

  /* phase 1 session with a real 15-minute sprint */
  await startMain();
  await step('Copy');
  await next(); assert.ok(await has('Tick the box'), 'copy gate');
  await page.getByLabel('I copied it by hand').check(); await next();
  await step('Write');
  const ta = page.locator('#sprint');
  await ta.click();
  await page.keyboard.type('The board ');
  await page.keyboard.press('Backspace'); await tick();
  assert.strictEqual(await ta.inputValue(), 'The board ', 'backspace blocked');
  await ta.evaluate(el => { const dt = new DataTransfer(); dt.setData('text/plain', 'PASTED'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  assert.ok(!(await ta.inputValue()).includes('PASTED'), 'paste blocked');
  let written = 2;
  for (let i = 0; i < 29; i++) { await page.keyboard.type(WORDS.slice(i % 20, i % 20 + 6).join(' ') + ' '); written += 6; await tick(30000); }
  await shot('sprint');
  await tick(31000);
  assert.ok(await page.locator('#clock').evaluate(e => e.classList.contains('over')), 'clock over');
  await page.keyboard.type('after the bell ');
  await next();
  await step('Check');
  for (const [q, t] of [['board', 'Word choice'], ['crystal', 'Spelling'], ['solder', 'Preposition']]) {
    await page.locator('.marker textarea').evaluate((el, q) => { const a = el.value.indexOf(q); el.focus(); el.setSelectionRange(a, a + q.length); }, q);
    await page.getByLabel('Error type').selectOption(t);
    await btn('Mark selection');
  }
  await page.locator('#next').click(); await tick();
  assert.ok(await has('Session done'), 'done screen');
  assert.ok(await has('This meets the 150-words gate.'), 'sprint gate met: ' + (await text()).slice(0, 400));

  /* review */
  if (mode === 'local') {
    assert.ok(await has('Copy review request'), 'paste flow offered');
    const body = await page.evaluate(() => Store.list('sessions').find(s => s.kind === 'phase1').data.text);
    const q = body.split(' ').slice(1, 3).join(' ');
    await page.getByLabel('Claude reply').fill('Sure:\n[{"quote":"' + q + '","type":"Verb tense","hint":"When did it happen?","note":"Keep one tense."}]');
    await btn('Add the marks');
    assert.ok(await has('Marked by Claude'), 'pasted review applied');
  } else {
    await btn('Ask Claude to mark it'); await tick(800);
    assert.ok(await has('Marked by Claude'), 'claude review applied');
    const prompts = await page.evaluate(() => window.__prompts);
    if (!served) assert.ok(/Never rewrite/.test(prompts[prompts.length - 1]));
  }
  await btn('Open in Writing');
  assert.ok(await has('Marks'), 'marks panel');
  await shot('writing');
  /* repair one mark */
  const fixBox = page.getByLabel('Your fix for mark 4');
  if (mode !== 'local') {
    await fixBox.fill('it go'); await btn('Check my fix'); await tick(600);
    assert.ok(await has('Not yet'), 'wrong fix gets a hint');
    await page.getByLabel('Your fix for mark 4').fill('I go'); await btn('Check my fix'); await tick(600);
    // mock accepts fixes containing "go" in quotes
  } else { await fixBox.fill('fixed words'); await fixBox.locator('xpath=..').getByRole('button').click(); await tick(); }
  assert.ok(await has('Fixed:'), 'mark fixed');

  /* error log */
  await click('#nav a[href="#errors"]');
  assert.ok(await has('project mangment') && await has('Word choice'), 'plan rows and self marks logged');
  const rowCount = await page.locator('table.errors tbody tr').count();
  assert.ok(rowCount >= 9, 'rows: ' + rowCount);

  /* progress */
  await click('#nav a[href="#progress"]');
  assert.ok(await has('Words per week'), 'progress');
  await click('#nav a[href="#plan"]');
  assert.ok(await has('150 words in 15 minutes without stopping'), 'plan gates');

  /* reload mid-sprint marks the sprint interrupted */
  await click('#nav a[href="#today"]');
  await page.locator('.opt', { hasText: 'Short session' }).getByRole('button').click(); await tick();
  await step('Write');
  await page.locator('#sprint').click(); await page.keyboard.type('One two three. '); await tick(6000);
  await page.reload(); await tick(800);
  assert.ok(await has('Unfinished'), 'resume offered');
  await btn('Resume');
  assert.ok(await page.evaluate(() => Engine.s.data.sprint.interrupted), 'interrupted flag');
  await btn('Stop'); await btn('Discard');

  /* phase 2 queue */
  await click('#nav a[href="#setup"]');
  await page.locator('label.field', { hasText: 'Current phase' }).locator('select').selectOption('2'); await tick();
  await click('#nav a[href="#today"]');
  assert.ok(await has('Take notes on a model paragraph'), 'phase 2 starts with Franklin notes');
  await startMain();
  await step('Read'); await next();
  const notes = page.locator('.noterow input');
  const n = await notes.count();
  for (let i = 0; i < n; i++) await notes.nth(i).fill('idea number ' + (i + 1));
  await next();
  assert.ok(await has('Notes saved'), 'franklin1 done');
  await btn('Back to Today');
  assert.ok(await has('Sentence combining'), 'combining next');
  await startMain();
  const ways = page.locator('.way textarea');
  for (let i = 0; i < 3; i++) { await ways.nth(i).click(); await page.keyboard.type('Way ' + (i + 1) + ' first sentence here. And a second one ' + i + '.'); }
  await next(); assert.ok(await has('Session done'), 'combining done');
  await btn('Back to Today');
  await page.clock.fastForward(24 * 3600 * 1000); await tick(1000);
  await page.reload(); await tick(800);
  assert.ok(await has('Rebuild from your notes'), 'rebuild ready next day');
  await startMain();
  await page.locator('#rebuild').click(); await page.keyboard.type(WORDS.join(' ') + '. ' + WORDS.slice(0, 10).join(' ') + '.');
  await next();
  for (const c of await page.locator('.kept input').all()) await c.check();
  await page.getByLabel('Difference 1').fill('Shorter sentences.'); await page.getByLabel('Difference 2').fill('Fewer commas.');
  await shot('compare');
  await next(); assert.ok(await has('kept every idea'), 'kept all');
  await btn('Back to Today');

  /* weekend piece (Friday) */
  await page.clock.fastForward(24 * 3600 * 1000); await page.reload(); await tick(800);
  assert.ok(await has('weekend piece'), 'weekend piece offered');
  await startMain();
  await page.locator('label.field', { hasText: 'The one point it makes' }).locator('input').fill('Debugging is mostly reading.');
  await page.locator('label.field', { hasText: 'Who it is for' }).locator('input').fill('New Hub students');
  await btn('Move to draft');
  await page.getByLabel('Piece text').click(); await page.keyboard.type((WORDS.join(' ') + '. ').repeat(16));
  await btn('Move to revise');
  await btn('Move to done'); assert.ok(await has('Tick every item'), 'checklist blocks');
  for (let i = 0; i < 5; i++) { await page.locator('.checklist input').nth(i).check(); await tick(); }
  await btn('Move to done');
  await next(); assert.ok(await has('Session done'), 'piece session done');
  const pc = await page.evaluate(() => Store.list('pieces')[0]);
  assert.strictEqual(pc.status, 'done'); assert.ok(pc.words > 400);
  await btn('Back to Today');

  /* error drill */
  await page.evaluate(() => { for (let i = 0; i < 3; i++) { const r = L.logError(Store.get('errors', L.errorId('Preposition', 'on Monday morning')), { type: 'Preposition', wrote: 'on Monday morning', correct: '', by: 'self', date: L.iso() }); Store.put('errors', r.id, r); } });
  await tick();
  await click('#nav a[href="#errors"]');
  await btn('Start drill');
  await step('Study'); await next();
  await page.locator('#practice').click(); await page.keyboard.type('One here. Two here. Three here. Four here. Five here. Six here.');
  await next(); await page.getByLabel('I found fewer than 3').check(); await next();
  assert.ok(await has('Session done'), 'drill done');
  await btn('Back to Today');

  /* import old studio data */
  await click('#nav a[href="#setup"]');
  const rec = { appState: { startDate: '2026-10-20', phase: 1, anchorRoutine: 'x', anchorPlace: 'y' }, sessions: [{ id: 'a1', kind: 'phase1', phase: 1, date: '2026-10-21', status: 'done', data: { draftText: 'I goes home.' }, marks: [], words: 3 }], pieces: [], errors: [{ id: 'x', type: 'Tense Shift', wrote: 'I go yesterday', correct: 'I went yesterday', by: 'gemini', date: '2026-10-21', dates: ['2026-10-21'] }], customModels: [] };
  await page.getByLabel('Pasted JSON').fill(JSON.stringify(rec));
  await btn('Check it');
  assert.ok(await has('Recovery Studio export') && await has('1 session'), 'import preview');
  await btn('Import it');
  assert.ok(await page.evaluate(() => !!Store.get('sessions', 'r-a1')), 'imported session');
  await page.getByLabel('Pasted JSON').fill(JSON.stringify(rec));
  await btn('Check it');
  assert.ok(await has('0 sessions'), 'idempotent import');
  if (mode === 'pwa') assert.ok(await has('Claude reviews on this phone') && await has('Saved on this phone') && !(await has('Open the data folder')), 'phone setup');
  if (mode === 'launcher') assert.ok(await has('Claude reviews on this computer') && await has('Open the data folder') && await has('Saved on this computer'), 'desktop setup');
  await shot('setup');

  /* phase 3: two drills and three piece days */
  await page.locator('label.field', { hasText: 'Current phase' }).locator('select').selectOption('3'); await tick();
  await click('#nav a[href="#today"]');
  assert.ok(await has('Weekend') || await has('piece'), 'phase 3 today');

  /* phone layout, both themes */
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const r of ['today', 'plan', 'writing', 'errors', 'progress', 'setup']) {
      await click('#nav a[href="#' + r + '"]');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(over <= 0, r + ' overflows by ' + over + 'px at 390 wide (' + scheme + ')');
      if (r === 'today' || r === 'writing') await shot('phone-' + scheme + '-' + r);
    }
    await click('#nav a[href="#today"]');
  }
  await page.clock.fastForward(2 * 24 * 3600 * 1000); await page.reload(); await tick(800);
  await page.locator('.card.next .btn.primary').click(); await tick();
  await shot('phone-dark-focus');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, 'focus overflows');
  await btn('Stop'); await btn('Discard');

  if (mode !== 'local') {
    const docs = mock ? Object.keys(mock.docs) : site ? Object.keys(await page.evaluate(() => window.desktop.readAll())) : await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockdb') || '{}')));
    assert.ok(docs.includes('state/app') && docs.filter(d => d.startsWith('sessions/')).length >= 6 && docs.filter(d => d.startsWith('errors/')).length >= 8, 'db docs: ' + docs.length);
    assert.ok(!(await page.evaluate(() => localStorage.getItem('ewr.v3'))), 'nothing kept in browser storage when the db is served');
    await page.reload(); await tick(800);
    assert.ok(await page.evaluate(() => Store.mode === 'db' && Store.list('sessions').length >= 6), 'data reloads from db');
  }
  assert.deepStrictEqual(errors, [], 'page errors');
  if (mock) {
    await click('#nav a[href="#setup"]'); await btn('Export a backup'); await tick(600);
    assert.ok(mock.saved.length === 1 && JSON.parse(mock.saved[0][1]).format === 'english-writing-recovery/v3' && await has('Backup saved to'), 'export to Documents');
    mock.server.close();
  }
  if (site) {
    await click('#nav a[href="#setup"]');
    const dl = page.waitForEvent('download');
    await btn('Export a backup');
    const file = await dl; const body = fs.readFileSync(await file.path(), 'utf8');
    await tick(600);
    assert.ok(JSON.parse(body).format === 'english-writing-recovery/v3' && await has('Backup saved to Downloads'), 'phone export');
    site.server.close();
  }
  await browser.close();
  console.log(mode + ': all flows passed');
}

/* The phone app installs and opens offline. */
async function pwaOffline() {
  const site = await Launcher.startStatic(47902, path.join(ROOT, 'pwa'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext(devices['Pixel 7']);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(site.url);
  const m = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); return r.json(); });
  assert.ok(m.display === 'standalone' && m.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512'), 'manifest');
  for (const i of m.icons.concat([{ src: 'apple-touch-icon.png' }, { src: 'sw.js' }])) assert.strictEqual((await page.request.get(site.url + i.src)).status(), 200, i.src);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await ctx.setOffline(true); site.server.close();
  await page.reload(); await page.waitForTimeout(800);
  assert.ok((await page.locator('body').innerText()).includes('out of practice, not gone'), 'opens offline');
  assert.ok(await page.evaluate(() => window.desktop && window.desktop.kind === 'phone'), 'phone bridge active');
  assert.deepStrictEqual(errors, [], 'offline page errors');
  await page.screenshot({ path: path.join(SHOTS, 'pwa-offline.png') });
  await browser.close();
  console.log('pwa: installable and opens offline');
}

(async () => { try { if (!process.env.ONLY) { await run('local'); await run('viewer'); await run('launcher'); } await run('pwa'); await pwaOffline(); } catch (e) { console.error(e); process.exit(1); } })();
