#!/usr/bin/env python3
"""Concatenate src/ into one self-contained page: dist/english-writing-recovery.html.
Plain concatenation in a fixed order, so every section stays traceable to its source file."""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
ORDER = ['content.js', 'models.json', 'logic.js', 'migrate.js', 'store.js', 'app_core.js', 'app_focus.js', 'app_views.js', 'app_events.js']

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

if __name__ == '__main__':
    main()
