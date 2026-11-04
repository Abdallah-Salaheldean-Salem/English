/* store.js: one in-memory state; the artifact database when the viewer serves it, browser storage otherwise.
   One write in flight per document; a newer write waits for it and then sends the latest copy. */
'use strict';

const COLLS = ['sessions', 'pieces', 'errors', 'reading', 'critiques', 'models'];
const LOCAL_KEY = 'ewr.v3';

const Store = {
  mode: 'loading',          // 'loading' | 'db' | 'local'
  S: { app: null, sessions: {}, pieces: {}, errors: {}, reading: {}, critiques: {}, models: {} },
  db: null,
  status: '',               // shown in the footer
  readOnly: false,
  onChange: () => {},
  _inflight: {}, _again: {}, _localTimer: 0,

  async init() {
    let db = null;
    try { if (window.claude && window.claude.use) db = await window.claude.use('db'); } catch (e) { db = null; }
    if (db) {
      this.db = db;
      const ok = await this._loadDb();
      if (ok) { this.mode = 'db'; return; }
      this.db = null;
    }
    this.mode = 'local';
    try { const raw = localStorage.getItem(LOCAL_KEY); if (raw) Object.assign(this.S, JSON.parse(raw)); } catch (e) { this.status = 'Browser storage is unavailable here, so nothing will be kept after you close this page.'; }
  },

  async _loadDb() {
    const timer = new Promise(r => setTimeout(() => r('timeout'), 10000));
    const load = (async () => {
      const st = await this.db.doc('state/app').get();
      if (st.exists) this.S.app = JSON.parse(JSON.stringify(st.data()));
      await Promise.all(COLLS.map(async c => {
        const snap = await this.db.collection(c).get();
        for (const d of snap.docs) this.S[c][d.id] = JSON.parse(JSON.stringify(d.data()));
      }));
      return 'ok';
    })().catch(e => (e && e.code) || 'error');
    const r = await Promise.race([load, timer]);
    if (r === 'ok') return true;
    this.status = r === 'timeout' ? 'Your saved data could not be reached. Working from this browser until you reload.' : 'Your saved data could not be loaded (' + r + '). Working from this browser.';
    return false;
  },

  list(coll) { return Object.values(this.S[coll]); },
  get(coll, id) { return coll === 'state' ? this.S.app : this.S[coll][id]; },

  /* quiet: save without re-rendering (used while the person is typing). */
  put(coll, id, doc, quiet) {
    if (coll === 'state') this.S.app = doc; else this.S[coll][id] = doc;
    this._persist(coll, id);
    if (!quiet) this.onChange();
  },
  remove(coll, id) {
    delete this.S[coll][id];
    if (this.mode === 'db') this.db.doc(coll + '/' + id).delete().catch(e => this._fail(e));
    else this._saveLocal();
    this.onChange();
  },

  _persist(coll, id) {
    if (this.mode !== 'db') return this._saveLocal();
    const path = coll === 'state' ? 'state/app' : coll + '/' + id;
    if (this._inflight[path]) { this._again[path] = true; return; }
    this._inflight[path] = true;
    const body = JSON.parse(JSON.stringify(coll === 'state' ? this.S.app : this.S[coll][id]));
    this.db.doc(path).set(body)
      .then(() => { if (this.status.startsWith('Not saved')) { this.status = ''; this.onChange(); } })
      .catch(e => this._fail(e))
      .finally(() => {
        this._inflight[path] = false;
        if (this._again[path]) { this._again[path] = false; this._persist(coll, id); }
      });
  },
  _fail(e) {
    const code = e && e.code;
    if (code === 'invalid_argument' && !this.S.app) this.readOnly = true;
    this.status = code === 'quota_exceeded' ? 'Not saved: the storage for this app is full. Export your data, then delete old sessions.'
      : code === 'invalid_argument' ? 'Not saved: only the owner of this app can save to it.'
      : 'Not saved: the connection dropped. Your next change will try again.';
    this.onChange();
  },
  _saveLocal() {
    clearTimeout(this._localTimer);
    this._localTimer = setTimeout(() => {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.S)); }
      catch (e) { this.status = 'Not saved: browser storage refused the write.'; this.onChange(); }
    }, 250);
  },
  /* Write browser storage now (page is closing). */
  flush() {
    if (this.mode !== 'local' || !this._localTimer) return;
    clearTimeout(this._localTimer); this._localTimer = 0;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.S)); } catch (e) { /* nothing more to do while closing */ }
  },
  /* Everything, for export. */
  dump() { return JSON.parse(JSON.stringify({ format: 'english-writing-recovery/v3', exportedAt: new Date().toISOString(), ...this.S })); }
};
