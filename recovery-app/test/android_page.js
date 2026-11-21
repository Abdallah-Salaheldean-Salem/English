/* The phone page as the Android app runs it: window.AndroidBridge present (saves into Downloads), no service worker. */
'use strict';
const assert = require('assert');
const { chromium, devices } = require('playwright');
const { startStatic } = require('./launcher_mock');
(async () => {
  const srv = await startStatic(47960, require('path').join(__dirname, '..', 'pwa'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => {
    window.__saved = [];
    window.AndroidBridge = { saveFile: (name, text) => { window.__saved.push([name, text.length]); return 'Downloads as ' + name; } };
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(srv.url + 'index.html');
  await page.waitForFunction(() => window.desktop && document.querySelector('main, .page, #app'));
  await page.waitForTimeout(1500);
  assert.strictEqual(await page.evaluate(() => window.desktop.kind), 'phone');
  assert.strictEqual(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length)), 0, 'no service worker in the Android app');
  assert.strictEqual(await page.evaluate(() => window.desktop.saveFile('x.json', '{"a":1}')), 'Downloads as x.json');
  await page.evaluate(() => { window.__saved = []; exportData(); });
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => window.__saved);
  assert.ok(saved.length === 1 && /^english-writing-recovery-.*\.json$/.test(saved[0][0]) && saved[0][1] > 10, 'export goes through the bridge: ' + JSON.stringify(saved));
  await page.evaluate(() => { window.AndroidBridge.saveFile = () => ''; });
  await page.evaluate(() => exportData()); await page.waitForTimeout(500);
  assert.ok(/not saved|not available/.test(await page.evaluate(() => App.notice || '')), 'a failed save is reported');
  await page.screenshot({ path: __dirname + '/shots/android-today.png' });
  assert.deepStrictEqual(errors, []);
  console.log('android page: ok');
  await browser.close(); srv.server.close();
})().catch(e => { console.error(e); process.exit(1); });
