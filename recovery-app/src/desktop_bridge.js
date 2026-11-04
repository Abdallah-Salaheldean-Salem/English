/* desktop_bridge.js: desktop build only. When the page is served by EnglishWritingRecovery.exe
   (http://localhost:<port>/<token>/), this defines window.desktop on top of that local API.
   desktop_shim.js then maps window.desktop onto window.claude.use(), so the app code is unchanged. */
'use strict';
(() => {
  if (window.desktop || !/^http:\/\/localhost:\d+$/.test(location.origin)) return;
  const base = location.pathname.replace(/[^/]*$/, '') + 'api/';
  const call = async (path, opt) => {
    const r = await fetch(base + path, opt);
    if (!r.ok) throw new Error((await r.text()) || 'http ' + r.status);
    return r;
  };
  window.desktop = {
    readAll: async () => (await call('all')).json(),
    write: (p, body) => call('write?p=' + encodeURIComponent(p), { method: 'POST', body: JSON.stringify(body) }),
    remove: p => call('remove?p=' + encodeURIComponent(p), { method: 'POST' }),
    hasKey: async () => !!(await (await call('key')).json()).has,
    setKey: async k => { await call('key', { method: 'POST', body: k }); return true; },
    clearKey: async () => { await call('key/clear', { method: 'POST' }); return true; },
    ask: async prompt => {
      let r;
      try { r = await fetch(base + 'ask', { method: 'POST', body: prompt }); } catch (e) { throw new Error('upstream_error'); }
      const t = await r.text();
      if (r.status === 401 || r.status === 403 || r.status === 412) throw new Error('not_granted');
      if (r.status === 429 || r.status === 529) throw new Error('rate_limited');
      if (r.status === 413) throw new Error('prompt_too_large');
      if (!r.ok) throw new Error('upstream_error');
      const j = JSON.parse(t);
      if (j.stop_reason === 'refusal') throw new Error('refused');
      return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    },
    saveFile: async (name, contents) => (await call('save?name=' + encodeURIComponent(name), { method: 'POST', body: contents })).text(),
    openDataFolder: () => call('open-data', { method: 'POST' })
  };
  /* Tells the exe the window is still open; it exits a minute or so after the pings stop. */
  setInterval(() => { fetch(base + 'ping').catch(() => {}); }, 30000);
})();
