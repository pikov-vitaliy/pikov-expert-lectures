# -*- coding: utf-8 -*-
"""Расширенная колода лекции: части src/<id>/*.html -> один HTML, PNG 1920×1080 каждого кадра, карта «кадр – строка сценария».

  python build.py 11                 # вся колода: _work/d11/<имя>.html, png/sNN.png, map.json, sheet-*.png, report.txt
  python build.py 11 --part 02-b     # одна часть (для проверки вёрстки): _work/d11/parts/02-b/
  python build.py 11 --no-png        # только HTML, карта и проверки

Слайд – <section class="slide" data-at="N">, N – номер строки сценария (src/<id>/timed.tsv), с которой он на экране.
Пошаговое раскрытие: data-steps="N1,N2,…" и элементы с классом st; на шаге k элементы до k-го получают done,
k-й – on, остальные – todo. data-at раньше N1 даёт начальный кадр «все ещё впереди», data-end – итоговый кадр.
Проверки: строки сценария существуют и идут по возрастанию, значки есть в Lucide, текст не вылезает за слайд,
нет запрещённых знаков и слов, время на экране (долгие и мелькающие кадры).
"""
import base64, html, json, os, re, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.join(HERE, '..', 'slides', 'node_modules', 'lucide-static', 'icons')
COURSE = os.environ.get('COURSE_ROOT', os.path.join(HERE, '..', '..', '_src'))
WORK = os.environ.get('LECDECK_WORK', os.path.join(HERE, '_work'))
DECKS = json.load(open(os.path.join(HERE, 'decks.json'), encoding='utf-8'))
HEAD_JS = ("(function(){var t;try{var v=JSON.parse(localStorage.getItem('deck-theme')||'null');if(v&&v.until>Date.now())t=v.t}catch(e){}"
           "if(!t){var h=new Date().getHours();t=(h>=20||h<7)?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();")
NAV_JS = open(os.path.join(HERE, 'nav.js'), encoding='utf-8').read()
BAN = [('—', 'длинное тире'), ('→', 'стрелка')]
# слова, которых не должно быть на слайдах (название заказчика и подобное), – по строке в _work/ban-extra.txt (вне git)
_bx = os.path.join(WORK, 'ban-extra.txt')
if os.path.exists(_bx):
    BAN += [(w.strip(), 'запрещённое слово') for w in open(_bx, encoding='utf-8') if w.strip()]
BAN_RE = [(r'ФСТЭК(?!\s+России)', '«ФСТЭК» без «России»'),
          (r'(?i)диктофон|расшифровк|транскрип|\bвольт|Claude(?! (?:Fable|Opus|Sonnet|Haiku|Code))|Codex(?! CLI)|Consensus|нейросеть сгенерировала', 'след подготовки')]  # 23.11.2026: названия моделей и харнесов (Claude Fable 5.2, Claude Code) в лекциях дня 5 – не след подготовки

EXPAND_JS = r"""
([times, total, minHold]) => {
  const errs = [];
  const out = [];
  const all = [...document.querySelectorAll('section.slide')];
  const firstLine = sec => { const st = (sec.dataset.steps || '').split(',')[0].trim(); const a = sec.dataset.at ? Number(sec.dataset.at) : Infinity; return Math.min(a, st ? Number(st) : Infinity); };
  const T = ln => (ln in times ? times[ln] : null);
  for (const [si, sec] of all.entries()) {
    const steps = (sec.dataset.steps || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
    const src = sec.dataset.src || '';
    if (!steps.length) { out.push(sec); continue; }
    const sts = [...sec.querySelectorAll('.st')];
    const explicit = sts.filter(e => e.dataset.s).length;
    if (explicit && explicit !== sts.length) errs.push(src + ': data-s задан не у всех .st (data-at ' + sec.dataset.at + ')');
    const idx = sts.map((e, i) => explicit ? Number(e.dataset.s) : i + 1);
    const n = Math.max(0, ...idx);
    if (n !== steps.length) errs.push(src + ': шагов в data-steps ' + steps.length + ', а элементов .st ' + n + ' (data-steps ' + sec.dataset.steps + ')');
    const frames = [];
    const at0 = sec.dataset.at ? Number(sec.dataset.at) : steps[0];
    if (at0 < steps[0]) frames.push([0, at0]);
    steps.forEach((ln, k) => frames.push([k + 1, ln]));
    if (sec.dataset.end) frames.push([n + 1, Number(sec.dataset.end)]);
    // minHold: шаги короче заданного времени склеиваются – пункты появляются по нескольку, но не позже своей фразы
    let groups = frames.map(([k, ln]) => ({lo: k, hi: k, ln}));
    if (minHold > 0) {
      const nextSec = all[si + 1];
      const tEnd = nextSec && T(firstLine(nextSec)) !== null ? T(firstLine(nextSec)) : total;
      const dur = g => { const i = groups.indexOf(g); const t1 = i + 1 < groups.length ? T(groups[i + 1].ln) : tEnd; return t1 - T(g.ln); };
      if (groups.every(g => T(g.ln) !== null)) {
        const merged = [];
        for (const g of groups) {
          const prev = merged[merged.length - 1];
          if (prev && prev.d < minHold) { prev.hi = g.hi; prev.d += dur(g); if (prev.lo === 0) prev.lo = 1; }
          else merged.push({lo: g.lo, hi: g.hi, ln: g.ln, d: dur(g)});
        }
        if (merged.length > 1 && merged[merged.length - 1].d < minHold) {
          const last = merged.pop(); merged[merged.length - 1].hi = last.hi;
        }
        groups = merged;
      }
    }
    const made = [];
    for (const g of groups) {
      const c = sec.cloneNode(true);
      c.removeAttribute('data-steps'); c.removeAttribute('data-end');
      c.dataset.at = g.ln; c.dataset.step = g.hi;
      [...c.querySelectorAll('.st')].forEach((e, i) => {
        e.classList.add(idx[i] < g.lo ? 'done' : idx[i] <= g.hi ? 'on' : 'todo');
      });
      made.push(c);
    }
    sec.replaceWith(...made);
    out.push(...made);
  }
  return errs;
}
"""

FINISH_JS = r"""
([footer]) => {
  const secs = [...document.querySelectorAll('section.slide')];
  const res = [];
  secs.forEach((sec, i) => {
    let h = sec.querySelector('h1, h2');
    let title = h ? h.textContent.replace(/\s+/g, ' ').trim() : (sec.dataset.title || '');
    if (!h) {
      h = document.createElement('h2'); h.className = 'vh'; h.textContent = title;
      sec.insertBefore(h, sec.firstChild);
    }
    if (sec.dataset.title) title = sec.dataset.title;
    sec.setAttribute('aria-label', 'Слайд ' + (i + 1) + ' из ' + secs.length + ': ' + title);
    const f = document.createElement('div'); f.className = 'foot'; f.textContent = footer; sec.appendChild(f);
    const p = document.createElement('div'); p.className = 'pg'; p.textContent = i + 1; sec.appendChild(p);
    const g = document.createElement('div'); g.className = 'prog'; g.style.width = ((i + 1) / secs.length * 100).toFixed(2) + '%'; sec.appendChild(g);
    // проверка вёрстки
    const prob = [];
    const R = sec.getBoundingClientRect();
    if (sec.scrollHeight > sec.clientHeight + 1) prob.push('содержимое выше слайда на ' + (sec.scrollHeight - sec.clientHeight) + ' px');
    if (sec.scrollWidth > sec.clientWidth + 1) prob.push('содержимое шире слайда на ' + (sec.scrollWidth - sec.clientWidth) + ' px');
    const body = sec.querySelector('.body');
    if (body && body.scrollHeight > body.clientHeight + 1) prob.push('блок .body переполнен на ' + (body.scrollHeight - body.clientHeight) + ' px');
    for (const e of sec.querySelectorAll('*')) {
      if (e.closest('.foot, .pg, .prog') || e.classList.contains('vh') || e.closest('svg')) continue;
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom > R.bottom - 34 && !e.classList.contains('no')) { prob.push('элемент <' + e.tagName.toLowerCase() + ' class="' + e.className + '"> заходит на подвал (низ ' + Math.round(r.bottom - R.top) + ' px из 720)'); break; }
      if (r.right > R.right - 20 || r.left < R.left + 20) { prob.push('элемент <' + e.tagName.toLowerCase() + ' class="' + e.className + '"> у края слайда'); break; }
      if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') { prob.push('текст обрезан в <' + e.tagName.toLowerCase() + ' class="' + e.className + '">'); break; }
    }
    const small = [...sec.querySelectorAll('p, li, td, th, dd, dt, span, h3, blockquote, figcaption')]
      .filter(e => !e.closest('.foot, .pg, .src, svg') && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 16.5);
    if (small.length) prob.push('мелкий текст (< 16,5 px): «' + small[0].textContent.trim().slice(0, 40) + '»');
    res.push({n: i + 1, at: Number(sec.dataset.at), step: sec.dataset.step || '', title, src: sec.dataset.src || '',
              text: sec.innerText.replace(/\s+/g, ' ').trim(), prob, cls: sec.className});
    sec.removeAttribute('data-src');
  });
  return res;
}
"""


def icon_symbol(name):
    svg = open(os.path.join(ICON_DIR, name + '.svg'), encoding='utf-8').read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)
    inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S)
    return (f'<symbol id="i-{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{inner.strip()}</symbol>')


def load_parts(did, only=None):
    d = os.path.join(HERE, 'src', did)
    names = sorted(f for f in os.listdir(d) if f.endswith('.html'))
    if only:
        names = [f for f in names if f[:-5] == only]
        if not names:
            sys.exit(f'нет части {only} в {d}')
    parts = []
    for f in names:
        s = open(os.path.join(d, f), encoding='utf-8').read()
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        s = re.sub(r'<section\b', f'<section data-src="{f[:-5]}"', s)
        parts.append(s)
    return '\n'.join(parts)


def inline_images(body, day):
    def rep(m):
        p = os.path.join(COURSE, day, m.group(1).replace('/', os.sep))
        if not os.path.exists(p):
            sys.exit(f'нет рисунка {p}')
        ext = os.path.splitext(p)[1].lower().lstrip('.')
        mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'svg': 'image/svg+xml'}[ext]
        return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(open(p, 'rb').read()).decode())
    return re.sub(r'src="@day/([^"]+)"', rep, body)


def page(title, body, syms, css, shot=False):
    return (f'<!doctype html><html lang="ru"{" class=shot" if shot else ""}><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title>'
            + ('<script>document.documentElement.setAttribute("data-theme","light")</script>' if shot else f'<script>{HEAD_JS}</script>')
            + f'<style>{css}</style></head><body><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{syms}</defs></svg>'
            + ('' if shot else '<button class="theme" id="theme" aria-label="Переключить тему">☾</button>')
            + f'<main class="stage">{body}</main>'
            + ('' if shot else '<nav class="navb" aria-label="Навигация по слайдам"><a class="back" id="back" href="#" hidden aria-label="Вернуться к странице дня курса">'
               '<span aria-hidden="true">←</span><span class="bk-t"> К дню курса</span></a><button id="prev" aria-label="Предыдущий слайд">←</button>'
               f'<span id="cnt"></span><button id="next" aria-label="Следующий слайд">→</button></nav><script>{NAV_JS}</script>')
            + '</body></html>')


def timed(did):
    rows, total = {}, 0.0
    for ln in open(os.path.join(HERE, 'src', did, 'timed.tsv'), encoding='utf-8'):
        n, t, _, text = ln.rstrip('\n').split('\t', 3)
        if t:
            rows[int(n)] = (float(t), text)
    meta = json.load(open(os.path.join(HERE, 'src', did, 'timed.json'), encoding='utf-8'))
    return rows, meta['total']


def sheet(pngs, labels, out, cols=4, rows=4, tw=480):
    from PIL import Image, ImageDraw, ImageFont
    th = tw * 9 // 16
    font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 17)
    res = []
    for k in range(0, len(pngs), cols * rows):
        chunk = pngs[k:k + cols * rows]
        nr = (len(chunk) + cols - 1) // cols
        S = Image.new('RGB', (cols * (tw + 8) + 8, nr * (th + 34) + 8), '#30363d')
        d = ImageDraw.Draw(S)
        for i, f in enumerate(chunk):
            x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 34)
            S.paste(Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y + 26))
            d.text((x + 2, y + 2), labels[k + i], fill='#ffd866', font=font)
        p = f'{out}-{k // (cols * rows) + 1:02d}.png'
        S.save(p); res.append(p)
    return res


def main():
    args = sys.argv[1:]
    did = args[0]
    only = args[args.index('--part') + 1] if '--part' in args else None
    no_png = '--no-png' in args
    spec = DECKS[did]
    # минимальное время кадра раскрытия, с: --min-hold S или поле min_hold колоды в decks.json (0 – как размечено)
    min_hold = float(args[args.index('--min-hold') + 1]) if '--min-hold' in args else float(spec.get('min_hold', 0))
    od = os.path.join(WORK, 'd' + did) if not only else os.path.join(WORK, 'd' + did, 'parts', only)
    os.makedirs(os.path.join(od, 'png'), exist_ok=True)
    body = inline_images(load_parts(did, only), spec['day'])
    used = sorted(set(re.findall(r'href="#i-([a-z0-9-]+)"', body)))
    miss = [u for u in used if not os.path.exists(os.path.join(ICON_DIR, u + '.svg'))]
    if miss:
        sys.exit('нет значков Lucide: ' + ', '.join(miss) + ' – имена смотреть в slides/node_modules/lucide-static/icons')
    syms = ''.join(icon_symbol(u) for u in used)
    css = open(os.path.join(HERE, 'lecdeck.css'), encoding='utf-8').read()
    tmp = os.path.join(od, '_shot.html')
    open(tmp, 'w', encoding='utf-8').write(page(spec['title'], body, syms, css, shot=True))
    rows, total = timed(did)
    errors, warns = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        pg = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
        pg.goto('file:///' + tmp.replace('\\', '/'))
        pg.wait_for_timeout(400)
        errors += pg.evaluate(EXPAND_JS, [{str(k): v[0] for k, v in rows.items()}, total, min_hold])
        info = pg.evaluate(FINISH_JS, [spec['footer']])
        final_body = pg.evaluate("() => document.querySelector('main.stage').innerHTML")
        prev = 0
        for s in info:
            tag = f"кадр {s['n']} ({s['src']}, строка {s['at']})"
            if s['at'] != s['at'] or s['at'] not in rows:
                errors.append(f"{tag}: data-at должен быть номером строки с текстом из timed.tsv")
            elif s['at'] <= prev:
                errors.append(f"{tag}: строки идут не по возрастанию (предыдущий кадр – строка {prev})")
            prev = s['at'] if s['at'] == s['at'] else prev
            for x in s['prob']:
                warns.append(f'{tag}: {x}')
            for a, why in BAN:
                if a in s['text']:
                    errors.append(f'{tag}: {why} «{a}»')
            for a, why in BAN_RE:
                m = re.search(a, s['text'])
                if m:
                    errors.append(f'{tag}: {why} «{m.group(0)}»')
        if not only and info and info[0]['at'] != min(rows):
            errors.append(f"первый кадр должен начинаться со строки {min(rows)}, а не {info[0]['at']}")
        # время на экране
        ok = [s for s in info if s['at'] in rows]
        for i, s in enumerate(ok):
            t0 = rows[s['at']][0]
            t1 = rows[ok[i + 1]['at']][0] if i + 1 < len(ok) else (total if not only else t0 + 30)
            s['t'], s['dur'] = round(t0, 1), round(t1 - t0, 1)
            if s['dur'] > 60:
                warns.append(f"кадр {s['n']} (строка {s['at']}): на экране {s['dur']:.0f} с – дольше 60 с, разбить или добавить шаг")
            if s['dur'] < (2.5 if s['step'] != '' else 5):
                warns.append(f"кадр {s['n']} (строка {s['at']}): на экране {s['dur']:.1f} с – мелькает")
        pngs = []
        if not no_png:
            for f in os.listdir(os.path.join(od, 'png')):
                os.remove(os.path.join(od, 'png', f))
            loc = pg.locator('section.slide')
            for i in range(len(info)):
                f = os.path.join(od, 'png', f's{i + 1:02d}.png')
                loc.nth(i).screenshot(path=f)
                pngs.append(f)
        b.close()
    os.remove(tmp)
    out_html = os.path.join(od, spec['file'] + '.html')
    open(out_html, 'w', encoding='utf-8', newline='\n').write(page(spec['title'], final_body, syms, css))
    json.dump({'deck': spec['file'] + '.html', 'total': total,
               'slides': [{'n': s['n'], 'at': s['at'], 't': s.get('t'), 'dur': s.get('dur'), 'title': s['title'], 'src': s['src']} for s in info]},
              open(os.path.join(od, 'map.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # текст кадров с временем – для вычитки и рецензий без картинок
    with open(os.path.join(od, 'frames.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        for s in info:
            t = int(s.get('t', 0))
            fh.write(f"[{s['n']}] {t // 60:02d}:{t % 60:02d}, на экране {s.get('dur', 0):.0f} с, строка {s['at']}"
                     f"{', шаг ' + s['step'] if s['step'] != '' else ''}{', тёмный' if ' dark' in s['cls'] else ''}: {s['text']}\n")
    if pngs:
        for f in os.listdir(od):
            if f.startswith('sheet-'):
                os.remove(os.path.join(od, f))
        labels = [f"{s['n']} · стр. {s['at']} · {int(s.get('t', 0)) // 60:02d}:{int(s.get('t', 0)) % 60:02d} · {s.get('dur', 0):.0f} с" for s in info]
        sheets = sheet(pngs, labels, os.path.join(od, 'sheet'))
    durs = [s['dur'] for s in info if 'dur' in s]
    rep = [f'кадров {len(info)}; среднее время на экране {sum(durs) / max(1, len(durs)):.0f} с, самое долгое {max(durs or [0]):.0f} с',
           f'ОШИБОК {len(errors)}'] + ['  ' + e for e in errors] + [f'ЗАМЕЧАНИЙ {len(warns)}'] + ['  ' + w for w in warns]
    open(os.path.join(od, 'report.txt'), 'w', encoding='utf-8').write('\n'.join(rep) + '\n')
    sheets = sheets if pngs else []
    sys.stdout.reconfigure(encoding='utf-8')
    print('\n'.join(rep))
    print(out_html)
    if pngs:
        print('листы:', ' '.join(sheets))
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
