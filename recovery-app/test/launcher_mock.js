/* Stands in for EnglishWritingRecovery.exe in test/e2e.js: the same local API, in memory.
   Claude replies come back in the Anthropic Messages response shape, so desktop_bridge.js is tested as shipped. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

function start(port, token) {
  const page = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'app.html'));
  const docs = {}; let key = null; const saved = [];
  const body = req => new Promise(r => { let b = ''; req.setEncoding('utf8'); req.on('data', d => { b += d; }); req.on('end', () => r(b)); });
  const reply = (res, status, type, text) => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(text); };
  const FENCE = '`'.repeat(3);
  const claude = prompt => {
    if (prompt.startsWith('A learner wrote')) return prompt.includes('with: "I go"') ? '{"ok": true, "hint": ""}' : 'Here: {"ok": false, "hint": "Who is doing the action?"}';
    const a = prompt.indexOf('Draft:\n"""\n') + 11, b = prompt.indexOf('\n"""', a);
    const q = prompt.slice(a, b).split(' ').slice(0, 2).join(' ');
    return 'Marks:\n' + FENCE + 'json\n' + JSON.stringify([{ quote: q, type: 'Subject-verb agreement', hint: 'Who is the subject?', note: 'The verb agrees with its subject.' }]) + '\n' + FENCE;
  };
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost'), pre = '/' + token + '/';
    if (!u.pathname.startsWith(pre)) return reply(res, 404, 'text/plain', 'Not found');
    const rest = u.pathname.slice(pre.length), post = req.method === 'POST', p = u.searchParams.get('p');
    if (rest === '' || rest === 'index.html') return reply(res, 200, 'text/html; charset=utf-8', page);
    if (rest === 'api/ping') return reply(res, 200, 'text/plain', 'ok');
    if (rest === 'api/all') return reply(res, 200, 'application/json', JSON.stringify(docs));
    if (rest === 'api/write' && post) { docs[p] = JSON.parse(await body(req)); return reply(res, 200, 'text/plain', 'ok'); }
    if (rest === 'api/remove' && post) { delete docs[p]; return reply(res, 200, 'text/plain', 'ok'); }
    if (rest === 'api/key' && !post) return reply(res, 200, 'application/json', JSON.stringify({ has: !!key }));
    if (rest === 'api/key' && post) { const k = (await body(req)).trim(); if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(k)) return reply(res, 400, 'text/plain', 'That is not an Anthropic API key.'); key = k; return reply(res, 200, 'text/plain', 'ok'); }
    if (rest === 'api/key/clear' && post) { key = null; return reply(res, 200, 'text/plain', 'ok'); }
    if (rest === 'api/ask' && post) {
      if (!key) return reply(res, 412, 'text/plain', 'not_granted');
      const prompt = await body(req);
      return reply(res, 200, 'application/json', JSON.stringify({ type: 'message', role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: claude(prompt) }] }));
    }
    if (rest === 'api/save' && post) { saved.push([u.searchParams.get('name'), await body(req)]); return reply(res, 200, 'text/plain', 'C:\\Users\\you\\Documents\\' + u.searchParams.get('name')); }
    if (rest === 'api/open-data' && post) return reply(res, 200, 'text/plain', 'ok');
    reply(res, 404, 'text/plain', 'Not found');
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r({ server, docs, saved, url: 'http://localhost:' + port + '/' + token + '/' })));
}
module.exports = { start };
