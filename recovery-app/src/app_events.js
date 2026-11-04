/* app_events.js: routing, import and export, boot. Input guards live with the writing surface (writeArea). */
'use strict';

function readImport(txt) {
  let obj;
  try { obj = JSON.parse(txt); } catch (e) { throw new Error('That is not valid JSON. Use the file from the old app’s Export button.'); }
  if (obj && obj.format === 'english-writing-recovery/v3') {
    const writes = []; const rep = { sources: ['Backup from this app'], sessions: 0, pieces: 0, errors: 0, models: 0 };
    if (!app() && obj.app) writes.push({ coll: 'state', id: 'app', doc: obj.app });
    for (const c of COLLS) for (const [id, doc] of Object.entries(obj[c] || {})) if (!Store.get(c, id)) { writes.push({ coll: c, id, doc }); if (c in rep) rep[c]++; }
    return { writes, report: rep };
  }
  const bundle = M.readBundle(obj);
  return M.mergePlan(Store.S, bundle, L.iso());
}

function exportData() {
  if (!App.downloads) return;
  App.downloads.save({ filename: 'english-writing-recovery-' + L.iso() + '.json', data: JSON.stringify(Store.dump(), null, 1) })
    .then(r => { App.notice = typeof r === 'string' && r !== 'saved' ? 'Backup saved to ' + r : ''; render(); })
    .catch(e => { App.notice = e && e.code === 'unavailable' ? 'Saving files is not available here.' : 'The backup was not saved.'; if (e && e.code === 'unavailable') App.downloads = null; render(); });
}

let renderQueued = false;
function queueRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }

async function boot() {
  const routeFromHash = () => { const r = (location.hash || '').slice(1); return VIEWS.some(v => v[0] === r) ? r : null; };
  App.route = routeFromHash() || 'today';
  window.addEventListener('hashchange', () => { const r = routeFromHash(); if (r && r !== App.route) { App.route = r; render(); } });
  Store.onChange = queueRender;
  /* Phones: size the session screen to the visible area so its footer stays above the keyboard,
     and hide the tab bar while typing on a page. */
  if (window.visualViewport) {
    const vv = () => document.documentElement.style.setProperty('--vvh', Math.round(window.visualViewport.height) + 'px');
    window.visualViewport.addEventListener('resize', vv); vv();
  }
  const typing = e => e.target.matches && e.target.matches('#view input:not([type=checkbox]), #view textarea, #view select');
  document.addEventListener('focusin', e => { if (typing(e)) document.body.classList.add('kb'); });
  /* Bring the tab bar back only after the tap that moved focus has landed, so the layout does not shift under it. */
  document.addEventListener('focusout', e => {
    if (!typing(e)) return;
    setTimeout(() => { const a = document.activeElement; if (!(a && a.matches && a.matches('#view input:not([type=checkbox]), #view textarea, #view select'))) document.body.classList.remove('kb'); }, 350);
  });
  render();
  await Store.init();
  render();
  if (window.claude && window.claude.use) {
    window.claude.use('sample').then(s => { App.sample = s; queueRender(); }).catch(() => {});
    window.claude.use('downloads').then(d => { App.downloads = d; queueRender(); }).catch(() => {});
  }
  setInterval(() => { if (L.iso() !== App.today && document.getElementById('focus').hidden) render(); }, 60000);
  const flush = () => { if (Engine.s && !Engine.done) Engine.save(); Store.flush(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

boot();
