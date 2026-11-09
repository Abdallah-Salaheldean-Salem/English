#!/usr/bin/env python3
"""Concatenate src/ into one self-contained page: dist/english-writing-recovery.html.
Plain concatenation in a fixed order, so every section stays traceable to its source file."""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
ORDER = ['content.js', 'models.json', 'logic.js', 'migrate.js', 'store.js', 'app_core.js', 'app_focus.js', 'app_phase0.js', 'app_views.js', 'app_events.js']

def part(name):
    text = (SRC / name).read_text(encoding='utf-8')
    if name == 'models.json':
        text = 'const MODELS = ' + json.dumps(json.loads(text), ensure_ascii=False) + ';'
    return '/* ==== src/%s ==== */\n%s\n' % (name, text)

def main():
    js = ''.join(part(n) for n in ORDER)
    if '</script' in js.lower():
        sys.exit('A source file contains "</script", which would end the inline script early.')
    css = (SRC / 'style.css').read_text(encoding='utf-8')
    page = (SRC / 'index.html').read_text(encoding='utf-8').replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
    out = ROOT / 'dist' / 'english-writing-recovery.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding='utf-8')
    print('wrote %s (%d KB)' % (out.relative_to(ROOT), len(page.encode()) // 1024))

    # Desktop build: a full document (the artifact host normally supplies the skeleton), a strict CSP,
    # the bridge to the local API served by EnglishWritingRecovery.exe, and the shim that maps it onto window.claude.
    shim = ''.join(part(n) for n in ['desktop_bridge.js', 'desktop_shim.js'])
    import base64
    icon = base64.b64encode((ROOT / 'desktop' / 'icon-64.png').read_bytes()).decode()
    head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'unsafe-inline\'; '
            'style-src \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; connect-src \'self\'">'
            '<link rel="icon" href="data:image/png;base64,' + icon + '">'
            '<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
    desk = head + page.replace('<script>\n/* ==== src/content.js', '<script>\n' + shim + '\n/* ==== src/content.js', 1) + '</body></html>'
    dout = ROOT / 'desktop' / 'app.html'
    dout.write_text(desk, encoding='utf-8')
    print('wrote %s (%d KB)' % (dout.relative_to(ROOT), len(desk.encode()) // 1024))

    # Phone app (installable PWA, hosted as static files, e.g. GitHub Pages): data in IndexedDB on the phone,
    # Claude via the person's own API key, offline through the service worker. Relative paths, so any sub-path works.
    import hashlib, shutil
    bridge = ''.join(part(n) for n in ['pwa_bridge.js', 'desktop_shim.js'])
    phead = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">'
             '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; '
             'style-src \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src \'self\' data:; '
             'connect-src \'self\' https://api.anthropic.com https://fonts.googleapis.com https://fonts.gstatic.com">'
             '<link rel="manifest" href="manifest.webmanifest">'
             '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
             '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
             '<meta name="apple-mobile-web-app-title" content="Writing"><meta name="apple-mobile-web-app-status-bar-style" content="default">'
             '<meta name="theme-color" content="#edf0f3" media="(prefers-color-scheme: light)">'
             '<meta name="theme-color" content="#0f141b" media="(prefers-color-scheme: dark)">'
             '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}'
             'html,body{overscroll-behavior-y:none;-webkit-tap-highlight-color:transparent}</style></head><body>')
    phone = phead + page.replace('<script>\n/* ==== src/content.js', '<script>\n' + bridge + '\n/* ==== src/content.js', 1) + '</body></html>'
    pdir = ROOT / 'pwa'
    if pdir.exists(): shutil.rmtree(pdir)
    pdir.mkdir()
    (pdir / 'index.html').write_text(phone, encoding='utf-8')
    version = hashlib.sha256(phone.encode()).hexdigest()[:12]
    for f in (SRC / 'pwa').iterdir():
        if f.name == 'sw.js': (pdir / 'sw.js').write_text(f.read_text(encoding='utf-8').replace('__VERSION__', version), encoding='utf-8')
        else: shutil.copy(f, pdir / f.name)
    (pdir / '.nojekyll').write_text('')
    print('wrote pwa/ (%d KB page, version %s)' % (len(phone.encode()) // 1024, version))

if __name__ == '__main__':
    main()
