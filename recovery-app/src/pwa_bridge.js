/* pwa_bridge.js: phone app build only (pwa/). Defines window.desktop on the phone itself:
   documents in IndexedDB (persistent storage requested), Claude through the person's own Anthropic API key
   called directly from the phone, and backups through the share sheet or a download.
   desktop_shim.js then maps window.desktop onto window.claude.use(), so the app code is unchanged. */
'use strict';
(() => {
  if (window.desktop || !window.indexedDB) return;
  const MODEL = 'claude-sonnet-5-5';
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('ewr', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('docs'); r.result.createObjectStore('secrets'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  /* Run fn(store) in one transaction; resolve when it commits. */
  const tx = async (name, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(name, mode), out = { value: undefined };
      fn(t.objectStore(name), out);
      t.oncomplete = () => res(out.value);
      t.onerror = t.onabort = () => rej(new Error(t.error ? t.error.name : 'storage_error'));
    });
  };
  const getKey = () => tx('secrets', 'readonly', (s, out) => { const r = s.get('anthropic'); r.onsuccess = () => { out.value = r.result || null; }; });

  window.desktop = {
    kind: 'phone',
    readAll: () => tx('docs', 'readonly', (s, out) => {
      out.value = {};
      const c = s.openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out.value[cur.key] = cur.value; cur.continue(); } };
    }),
    write: (p, body) => tx('docs', 'readwrite', s => { s.put(body, p); }),
    remove: p => tx('docs', 'readwrite', s => { s.delete(p); }),
    hasKey: async () => !!(await getKey()),
    setKey: async k => { if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(k)) throw new Error('That is not an Anthropic API key.'); await tx('secrets', 'readwrite', s => { s.put(k, 'anthropic'); }); return true; },
    clearKey: async () => { await tx('secrets', 'readwrite', s => { s.delete('anthropic'); }); return true; },
    ask: async prompt => {
      const key = await getKey();
      if (!key) throw new Error('not_granted');
      let r;
      try {
        r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
        });
      } catch (e) { throw new Error('upstream_error'); }
      if (r.status === 401 || r.status === 403) throw new Error('not_granted');
      if (r.status === 429 || r.status === 529) throw new Error('rate_limited');
      if (r.status === 413) throw new Error('prompt_too_large');
      if (!r.ok) throw new Error('upstream_error');
      const j = await r.json();
      if (j.stop_reason === 'refusal') throw new Error('refused');
      return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    },
    /* Share sheet where the phone offers one (save to Files or Drive, send to yourself); a download otherwise. */
    saveFile: async (name, contents) => {
      const file = new File([contents], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return 'the place you picked'; }
        catch (e) { if (e && e.name === 'AbortError') return false; }
      }
      const url = URL.createObjectURL(file), a = document.createElement('a');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return 'Downloads as ' + name;
    },
    openDataFolder: async () => {}
  };

  /* Ask the browser not to clear this app's storage under pressure (installed apps usually get it). */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* best effort */ }
  /* Offline use and installability. */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
