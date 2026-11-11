# -*- coding: utf-8 -*-
"""SVG схемы Archify -> PNG (Chrome, масштаб 3, белый фон), с кэшем по SHA-256 содержимого SVG."""
import hashlib, os, pathlib
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'svgcache')


def render(svg_path):
    data = open(svg_path, 'rb').read()
    key = hashlib.sha256(data).hexdigest()[:16]
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, key + '.png')
    if os.path.exists(out):
        return out
    import re
    m = re.search(rb'viewBox="0 0 ([\d.]+) ([\d.]+)"', data)
    w, h = float(m.group(1)), float(m.group(2))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        pg = b.new_page(viewport={'width': int(w), 'height': int(h)}, device_scale_factor=3)
        pg.goto(pathlib.Path(svg_path).resolve().as_uri())
        pg.wait_for_timeout(1500)       # дождаться шрифтов и отключить анимацию на кадре покоя
        pg.evaluate("() => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'style'); s.textContent = '*{animation:none!important;transition:none!important}'; document.documentElement.appendChild(s); }")
        pg.wait_for_timeout(300)
        pg.screenshot(path=out, omit_background=False, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
        b.close()
    return out
