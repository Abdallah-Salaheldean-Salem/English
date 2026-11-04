#!/usr/bin/env python3
"""Draws the app icon (blue exercise-book page with a pen nib) at every size the builds need. Needs Pillow."""
import pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLUE, PAPER, MARGIN = (34, 70, 140, 255), (251, 252, 253, 255), (226, 165, 155, 200)

def draw(full_bleed=False, inset=1.0):
    S = 1024
    im = Image.new('RGBA', (S, S), BLUE if full_bleed else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not full_bleed:
        d.rounded_rectangle([40, 40, S - 40, S - 40], radius=200, fill=BLUE)
    art = Image.new('RGBA', (S, S), (0, 0, 0, 0)); a = ImageDraw.Draw(art)
    for y in range(330, 860, 110): a.line([(170, y), (854, y)], fill=(255, 255, 255, 60), width=10)
    a.line([(250, 200), (250, 860)], fill=MARGIN, width=12)
    nib = Image.new('RGBA', (S, S), (0, 0, 0, 0)); n = ImageDraw.Draw(nib)
    n.ellipse([382, 262, 642, 522], fill=PAPER); n.polygon([(382, 392), (642, 392), (512, 760)], fill=PAPER)
    n.ellipse([492, 372, 532, 412], fill=BLUE); n.line([(512, 410), (512, 700)], fill=BLUE, width=14)
    art.alpha_composite(nib.rotate(-35, resample=Image.BICUBIC, center=(512, 512)), (40, -10))
    if inset != 1.0:   # keep the drawing inside the maskable safe zone
        k = int(S * inset); art = art.resize((k, k), Image.LANCZOS); pad = (S - k) // 2
        layer = Image.new('RGBA', (S, S), (0, 0, 0, 0)); layer.alpha_composite(art, (pad, pad)); art = layer
    im.alpha_composite(art)
    return im

def main():
    icon, bleed, mask = draw(), draw(full_bleed=True), draw(full_bleed=True, inset=0.8)
    pwa = ROOT / 'src' / 'pwa'; desk = ROOT / 'desktop'
    pwa.mkdir(parents=True, exist_ok=True)
    icon.resize((192, 192), Image.LANCZOS).save(pwa / 'icon-192.png')
    icon.resize((512, 512), Image.LANCZOS).save(pwa / 'icon-512.png')
    mask.resize((512, 512), Image.LANCZOS).save(pwa / 'icon-maskable-512.png')
    bleed.convert('RGB').resize((180, 180), Image.LANCZOS).save(pwa / 'apple-touch-icon.png')
    icon.resize((64, 64), Image.LANCZOS).save(desk / 'icon-64.png')
    icon.resize((256, 256), Image.LANCZOS).save(desk / 'icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print('icons written')

if __name__ == '__main__':
    main()
