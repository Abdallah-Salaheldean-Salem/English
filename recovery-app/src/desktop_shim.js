/* desktop_shim.js: desktop build only. Gives the app the same window.claude.use() surface it gets inside Claude,
   backed by window.desktop (desktop_bridge.js): data files on this computer, Claude through the person's own
   Anthropic API key, and backups saved to Documents. The app code does not know which one it is running on. */
'use strict';
(() => {
  const D = window.desktop;
  if (!D) return;
  let cache = null;
  const all = async () => cache || (cache = await D.readAll());
  const snap = (id, v) => ({ id, exists: v !== undefined, data: () => v, metadata: { fromCache: false, hasPendingWrites: false } });
  const doc = p => ({
    id: p.split('/').pop(), path: p,
    get: async () => snap(p.split('/').pop(), (await all())[p]),
    set: async v => { const c = await all(); c[p] = JSON.parse(JSON.stringify(v)); await D.write(p, c[p]); },
    delete: async () => { const c = await all(); delete c[p]; await D.remove(p); }
  });
  const db = {
    doc,
    collection: c => ({
      path: c, doc: id => doc(c + '/' + id),
      get: async () => {
        const a = await all();
        const docs = Object.keys(a).filter(k => k.startsWith(c + '/') && k.split('/').length === 2).map(k => snap(k.split('/')[1], a[k]));
        return { docs, size: docs.length, empty: !docs.length };
      }
    })
  };
  const CODES = ['not_granted', 'rate_limited', 'prompt_too_large', 'refused', 'session_expired', 'upstream_error'];
  const toErr = e => { const m = String((e && e.message) || e); return { code: CODES.find(c => m.includes(c)) || 'upstream_error', message: m }; };
  /* Same tolerant reading as the viewer: whole reply, a fenced block, or first bracket to last bracket. */
  function parseJson(t) {
    const tries = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
    const a = t.search(/[[{]/), b = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
    if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
    for (const x of tries) { if (!x) continue; try { return JSON.parse(x); } catch (e) { /* next */ } }
    return undefined;
  }
  const text = input => typeof input === 'string' ? input : input.map(m => m.content).join('\n\n');
  function makeSample() {
    const s = async input => { try { return { text: await D.ask(text(input)), truncated: false }; } catch (e) { throw toErr(e); } };
    s.json = async input => {
      let t;
      try { t = await D.ask(text(input) + '\n\nYour reply will be machine-parsed: reply with only the JSON value, no other text.'); } catch (e) { throw toErr(e); }
      const v = parseJson(t);
      if (v === undefined) throw { code: 'invalid_json', message: 'Reply was not JSON', text: t };
      return v;
    };
    return s;
  }
  window.claude = {
    use: async name => {
      if (name === 'db') return db;
      if (name === 'sample') return (await D.hasKey()) ? makeSample() : null;
      if (name === 'downloads') return { save: async ({ filename, data }) => { let r; try { r = await D.saveFile(filename, String(data)); } catch (e) { throw { code: 'unavailable', message: String(e && e.message || e) }; } if (!r) throw { code: 'cancelled', message: 'Save cancelled' }; return typeof r === 'string' ? r : 'saved'; } };
      return null;
    }
  };
})();
