# -*- coding: utf-8 -*-
"""Раскладка слайдов курса: JSON колоды (+ viz-переопределения) -> сцена -> HTML.
Сцена (scene.json) потом же идёт в build_pptx.js, поэтому HTML и PPTX совпадают по геометрии.

python engine.py <deck.json> <viz.json|-> <папка дня> <out.html> <out.scene.json>
"""
import html, json, math, os, re, sys
from PIL import ImageFont, Image

W, H = 13.333, 7.5
ML = 0.6
CW = W - 2 * ML
CT = 1.62          # верх области содержимого
CB = 6.78          # низ области содержимого
LH = 1.22          # высота строки в долях кегля (Calibri, одинарный интервал)
HERE = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.join(HERE, 'node_modules', 'lucide-static', 'icons')

FONT_FILES = {('body', False): 'calibri.ttf', ('body', True): 'calibrib.ttf',
              ('mono', False): 'consola.ttf', ('mono', True): 'consolab.ttf'}
_fc = {}
WARN = []


def _font(kind, bold):
    k = (kind, bool(bold))
    if k not in _fc:
        _fc[k] = ImageFont.truetype('C:/Windows/Fonts/' + FONT_FILES[k], 200)
    return _fc[k]


def tw(s, pt, kind='body', bold=False):
    return _font(kind, bold).getlength(s) / 200 * pt / 72


# ---------- текст ----------
UNIT_RE = re.compile(r'(\d)\s(%|°C|°|мА|мм²|мм|МБ|мин|ч\b|В\b|А\b|Вт|кг|м\b|раз)')


def runs_of(s, bold=False):
    """'**жирный** и `код`' -> [{'text','b','m'}]; число и единица – через неразрывный пробел"""
    s = UNIT_RE.sub(lambda m: m.group(1) + '\u00a0' + m.group(2), s)
    out = []
    for n, part in enumerate(s.split('**')):
        b = bold or (n % 2 == 1)
        for k, seg in enumerate(part.split('`')):
            if seg:
                out.append({'text': seg, 'b': b, 'm': k % 2 == 1})
    return out or [{'text': '', 'b': bold, 'm': False}]


def plain(s):
    return s.replace('**', '').replace('`', '')


def para_lines(runs, width, pt, kind='body'):
    """Число строк абзаца при жадном переносе по словам."""
    lines, cur = 1, 0.0
    for r in runs:
        k = 'mono' if (r.get('m') or kind == 'mono') else 'body'
        chunks = r['text'].split('\n')
        for ci, chunk in enumerate(chunks):
            if ci > 0:
                lines += 1; cur = 0.0
            for word in re.findall(r'[^ ]+ *', chunk) or ([chunk] if chunk else []):
                ww = tw(word.rstrip(), pt, k, r['b'])
                full = tw(word, pt, k, r['b'])
                if cur > 0 and cur + ww > width:
                    lines += 1; cur = 0.0
                if ww > width:              # длинное слово/строка кода – режем по ширине
                    extra = int(ww // width)
                    lines += extra; cur = ww - extra * width
                else:
                    cur += full
    return lines


def text_h(paras, width, pt, gap_pt=0, kind='body'):
    n = sum(para_lines(p, width, pt, kind) for p in paras)
    return n * pt * LH / 72 + gap_pt / 72 * max(0, len(paras) - 1)


def fit(paras, width, height, hi, lo, gap_ratio=0.0, kind='body', tag=''):
    for pt in range(int(hi), int(lo) - 1, -1):
        if text_h(paras, width, pt, pt * gap_ratio, kind) <= height + 1e-6:
            return pt
    WARN.append(f'не влезает при {lo} pt: {tag}')
    return int(lo)


# ---------- значки ----------
ICON_RULES = [
    (r'запомнить|итог', 'list-checks'),
    (r'домашн|контрольн', 'notebook-pen'),
    (r'персональн|служебн|конфиденц|секрет|тайн', 'lock'),
    (r'скрыт.{0,12}команд|инъекц|атак', 'eye-off'),
    (r'шлюз|защит|безопасн|утечк', 'shield'),
    (r'закон|приказ|ГОСТ|стандарт|соглашени|прав[оа]', 'scale'),
    (r'DFMEA|отказ|рекламац', 'triangle-alert'),
    (r'ошиб|галлюцин|выдум|ловушк|риск|опасн', 'circle-alert'),
    (r'испытан|ПМИ|протокол|измерен', 'gauge'),
    (r'расч[её]т|формул|вычисл|арифмет|калькулятор|сечени', 'calculator'),
    (r'батаре|аккумул|ток покоя|пуск', 'battery-charging'),
    (r'источник|исследован|стать|литератур|ссылк|DOI', 'book-open'),
    (r'запрос|промпт', 'message-square-text'),
    (r'агент', 'workflow'),
    (r'сервис|GigaChat|Алис|DeepSeek|Qwen', 'cloud'),
    (r'данн', 'database'),
    (r'таблиц|матриц', 'table'),
    (r'документ|ТЗ|требовани|текст|редакци', 'file-text'),
    (r'поиск|решени|вариант', 'search'),
    (r'провер|сверк|сверя', 'shield-check'),
    (r'врем|экономи|замер|минут', 'timer'),
    (r'сценари|паспорт', 'route'),
    (r'внутренн|организац|подразделен', 'building-2'),
    (r'модел|ИИ|нейросет', 'bot'),
    (r'инженер|команд|человек', 'user-check'),
    (r'мер[аыу]|действи', 'wrench'),
    (r'шаг|порядок|цикл|логик', 'list-ordered'),
]
KIND_ICON = {'quote': 'quote', 'task': 'clipboard-list', 'steps': 'list-ordered', 'table': 'table',
             'image': 'workflow', 'bullets': 'lightbulb', 'section': 'flask-conical'}


def pick_icon(text, default=None):
    for pat, name in ICON_RULES:
        if re.search(pat, text, re.I):
            return name
    return default


# ---------- сцена ----------
def T(x, y, w, h, paras, pt, color='ink', bold=False, align='left', valign='top', kind='body',
      gap=0.0, italic=False, origin='src'):
    return {'t': 'text', 'x': x, 'y': y, 'w': w, 'h': h, 'paras': paras, 'pt': pt, 'color': color, 'bold': bold,
            'align': align, 'valign': valign, 'font': kind, 'gap': gap, 'italic': italic, 'origin': origin}


def R(x, y, w, h, fill, radius=0.12, line=None, shadow=False):
    return {'t': 'rect', 'x': x, 'y': y, 'w': w, 'h': h, 'fill': fill, 'radius': radius, 'line': line, 'shadow': shadow}


def O(x, y, d, fill):
    return {'t': 'ellipse', 'x': x, 'y': y, 'w': d, 'h': d, 'fill': fill}


def I(x, y, d, name, color):
    return {'t': 'icon', 'x': x, 'y': y, 'w': d, 'h': d, 'name': name, 'color': color}


def icon_badge(els, x, y, d, name, tone='teal'):
    els.append(O(x, y, d, tone + '_t'))
    pad = d * 0.24
    els.append(I(x + pad, y + pad, d - 2 * pad, name, tone))


def num_badge(els, x, y, d, n, tone='teal'):
    els.append(O(x, y, d, tone + '_t'))
    els.append(T(x, y, d, d, [runs_of(str(n), True)], round(d * 72 * 0.42), tone, True, 'center', 'middle', origin='num'))


def title_block(els, s, icon, tone='teal'):
    icon_badge(els, ML, 0.5, 0.66, icon, tone)
    x = ML + 0.66 + 0.24
    w = W - x - ML
    paras = [runs_of(s['title'], True)]
    pt = 30
    if para_lines(paras[0], w, 30) > 2:
        pt = fit(paras, w, 1.1, 28, 22, tag='title ' + s['title'])
    els.append({**T(x, 0.38, w, 1.0, paras, pt, 'ink', True, 'left', 'middle'), 'role': 'title'})


def note_block(els, note, bottom=CB):
    """Плашка-примечание у нижнего края; возвращает её верхнюю границу."""
    paras = [runs_of(note)]
    w = CW - 0.95
    pt = fit(paras, w, 0.9, 16, 12, tag='note')
    h = max(0.62, text_h(paras, w, pt) + 0.32)
    y = bottom - h
    els.append(R(ML, y, CW, h, 'surface', 0.1))
    els.append(I(ML + 0.25, y + (h - 0.34) / 2, 0.34, 'info', 'muted'))
    els.append(T(ML + 0.75, y + 0.16, w, h - 0.32, paras, pt, 'muted', valign='middle'))
    return y - 0.25


# ---- отдельные раскладки ----
def lay_cards(els, items, top, bottom, tone='teal', icons=None, dark=False):
    n = len(items)
    cols = n if n <= 3 else (2 if n == 4 else 3)
    rows = math.ceil(n / cols)
    gap = 0.3
    cw = (CW - gap * (cols - 1)) / cols
    avail = bottom - top
    ch = min((avail - gap * (rows - 1)) / rows, 2.7 if rows > 1 else 3.6)
    pad = 0.3
    d = 0.62
    paras_all = [[runs_of(t)] for t in items]
    inner_w = cw - 2 * pad
    inner_h = ch - 2 * pad - d - 0.2
    pt = min(fit(p, inner_w, inner_h, 26, 15, tag='card') for p in paras_all)
    # реальная высота карточки по самому длинному тексту, чтобы не было пустых «простыней»
    need = max(text_h(p, inner_w, pt) for p in paras_all) + 2 * pad + d + 0.2
    ch = min(ch, max(need, 1.6))
    block = rows * ch + gap * (rows - 1)
    y0 = top + max(0, (avail - block) / 2 - 0.1)
    for i, p in enumerate(paras_all):
        r, c = divmod(i, cols)
        if r == rows - 1 and n % cols:            # неполный последний ряд – по центру
            off = (cols - n % cols) * (cw + gap) / 2
        else:
            off = 0
        x = ML + off + c * (cw + gap)
        y = y0 + r * (ch + gap)
        els.append(R(x, y, cw, ch, 'dsurface' if dark else 'surface', 0.14, shadow=not dark))
        ic = None if icons == 'numbers' else ((icons[i] if icons and i < len(icons) else None) or pick_icon(plain(items[i])))
        if ic:
            icon_badge(els, x + pad, y + pad, d, ic, tone)
        else:
            num_badge(els, x + pad, y + pad, d, i + 1, tone)
        els.append(T(x + pad, y + pad + d + 0.2, inner_w, ch - 2 * pad - d - 0.2, p, pt, 'dink' if dark else 'ink'))


def cards_fit(items, avail):
    n = len(items)
    cols = n if n <= 3 else (2 if n == 4 else 3)
    rows = math.ceil(n / cols)
    cw = (CW - 0.3 * (cols - 1)) / cols
    ch = (avail - 0.3 * (rows - 1)) / rows
    return all(text_h([runs_of(t)], cw - 0.6, 18) <= min(ch, 2.7 if rows > 1 else 3.6) - 0.6 - 0.62 - 0.2 for t in items)


def lay_rows(els, items, x, w, top, bottom, tone='teal', numbered=True, dark=False, check=False, maxpt=24, center=True):
    n = len(items)
    d = 0.5 if n <= 5 else 0.42
    tx = x + d + 0.3
    twd = w - d - 0.3
    paras = [[runs_of(t)] for t in items]
    avail = bottom - top
    best = None
    dmin = d if (numbered or check) else 0.2
    for pt in range(maxpt, 13, -1):
        gap = max(0.14 if n > 5 else 0.16, pt * 0.014)
        hs = [max(dmin, text_h(p, twd, pt)) for p in paras]
        if sum(hs) + gap * (n - 1) <= avail:
            best = (pt, gap, hs); break
    if not best:
        pt, gap = 14, 0.14
        hs = [max(dmin, text_h(p, twd, pt)) for p in paras]
        WARN.append('rows overflow: ' + plain(items[0])[:40])
        best = (pt, gap, hs)
    pt, gap, hs = best
    # распределить свободное место: интервал до 0.45
    free = avail - sum(hs) - gap * (n - 1)
    if n > 1 and free > 0:
        gap = min(0.45, gap + free / (n - 1) * 0.5)
    block = sum(hs) + gap * (n - 1)
    y = top + (max(0, (avail - block) / 2 - 0.05) if center else 0)
    for i, p in enumerate(paras):
        h = hs[i]
        lh = text_h(p, twd, pt)
        cy = y + (pt * LH / 72) / 2       # центр первой строки
        by = cy - d / 2
        if check:
            icon_badge(els, x, by, d, 'check', 'dteal' if dark else tone)
        elif numbered:
            num_badge(els, x, by, d, i + 1, tone)
        else:
            els.append(O(x + d / 2 - 0.08, cy - 0.08, 0.16, tone))
        els.append(T(tx, y, twd, max(h, lh), p, pt, 'dink' if dark else 'ink'))
        y += h + gap


def lay_stats(els, stats, x, y, w, h, dark=False, head=None):
    if head:
        hp = [runs_of(head, True)]
        els.append({**T(x, y, w, 0.5, hp, 20, 'ink', True, valign='middle'), 'origin': 'stat'})
        y += 0.65; h -= 0.65
    n = len(stats)
    gap = 0.25
    bh = (h - gap * (n - 1)) / n
    for i, st in enumerate(stats):
        tone = st.get('tone', 'teal')
        by = y + i * (bh + gap)
        els.append(R(x, by, w, bh, tone + '_t', 0.14))
        vp = [runs_of(st['v'], True)]
        vpt = fit(vp, w - 0.5, min(1.5, bh * 0.6), 54, 26, tag='stat')
        vh = text_h(vp, w - 0.5, vpt)
        lp = [runs_of(st['l'])]
        lpt = fit(lp, w - 0.5, bh - 0.3 - vh, 18, 12, tag='stat-l')
        lh_ = text_h(lp, w - 0.5, lpt)
        tot = vh + lh_ + 0.06
        ty = by + (bh - tot) / 2
        els.append({**T(x + 0.25, ty, w - 0.5, vh + 0.02, vp, vpt, tone, True), 'origin': 'stat'})
        els.append({**T(x + 0.25, ty + vh + 0.06, w - 0.5, lh_ + 0.05, lp, lpt, tone + '_ink'), 'origin': 'stat'})


def chart_el(x, y, w, h, spec):
    """Сгруппированные столбцы/полосы из фигур: одинаково в HTML и PowerPoint, запятая в числах при любой локали."""
    spec = spec['chart']
    cats, series, dec = spec['cats'], spec['series'], spec['dec']
    colors = spec.get('colors', ['teal', 'orange', 'graphite'])
    unit = spec.get('unit', '')
    els = []
    vals = [v for se in series for v in se['values']] + ([spec['limit']['value']] if spec.get('limit') else [])
    vmin, vmax = min(0, min(vals)), max(0, max(vals))
    rng = (vmax - vmin) or 1
    vals = [v for se in series for v in se['values']]
    ns, nc = len(series), len(cats)
    leg = 0.55 if ns > 1 else 0
    lp = 18
    def lab(v, si=None, ci=None):
        if si is not None and series[si].get('labels'):
            return series[si]['labels'][ci]
        d = dec if spec.get('dec_fixed') else (0 if float(v).is_integer() else len(repr(float(v)).split('.')[1]))
        return fmt_num(v, d) + unit
    if spec.get('type') == 'bar':
        lw = min(w * 0.38, max(tw(c, lp) for c in cats) + 0.2)
        vw = max(tw(lab(v, si, ci), lp, 'body', True) for si, se in enumerate(series) for ci, v in enumerate(se['values'])) + 0.15
        px0 = x + lw + 0.15
        pw = w - lw - 0.15 - vw * (2 if vmin < 0 else 1) - 0.1
        if vmin < 0:
            px0 += vw + 0.08
        gh = (h - leg) / nc
        bh = min(0.62, gh * 0.74 / ns)
        zero = px0 + (0 - vmin) / rng * pw
        for ci, c in enumerate(cats):
            gy = y + ci * gh + (gh - bh * ns) / 2
            cp = [runs_of(c)]
            cpt = fit(cp, lw - 0.1, gh, lp, 13, tag='chart-cat')
            els.append({**T(x, gy - 0.2, lw - 0.1, bh * ns + 0.4, cp, cpt, 'ink', align='right', valign='middle'), 'origin': 'chart'})
            for si, se in enumerate(series):
                v = se['values'][ci]
                bw = max(abs(v) / rng * pw, 0.02)
                bx = zero if v >= 0 else zero - bw
                by = gy + si * bh
                els.append(R(bx, by + 0.03, bw, bh - 0.06, (se.get('point_colors') or [colors[si % len(colors)]] * nc)[ci], 0.05))
                tx = bx + bw + 0.08 if v >= 0 else bx - vw - 0.08
                els.append({**T(tx, by, vw, bh, [runs_of(lab(v, si, ci), True)], lp, 'ink', True,
                                'left' if v >= 0 else 'right', 'middle'), 'origin': 'num'})
        els.append({'t': 'line', 'x1': zero, 'y1': y, 'x2': zero, 'y2': y + h - leg, 'color': 'line', 'width': 1.5})
    else:
        labh = 0.85
        top = y + 0.45
        ph = h - leg - labh - 0.5 - (0.4 if vmin < 0 else 0)
        gw = w / nc
        bw = min(1.25, gw * 0.72 / ns)
        zero = top + vmax / rng * ph
        for ci, c in enumerate(cats):
            gx = x + ci * gw + (gw - bw * ns) / 2
            for si, se in enumerate(series):
                v = se['values'][ci]
                bh_ = max(abs(v) / rng * ph, 0.02)
                by = zero - bh_ if v >= 0 else zero
                bx = gx + si * bw
                els.append(R(bx + 0.04, by, bw - 0.08, bh_, (se.get('point_colors') or [colors[si % len(colors)]] * nc)[ci], 0.05))
                ly = by - 0.42 if v >= 0 else by + bh_ + 0.04
                els.append({**T(bx - 0.2, ly, bw + 0.4, 0.38, [runs_of(lab(v, si, ci), True)], lp, 'ink', True, 'center',
                                'bottom' if v >= 0 else 'top'), 'origin': 'num'})
            cp = [runs_of(c)]
            cpt = fit(cp, gw - 0.2, labh, lp, 13, tag='chart-cat')
            ly = y + h - leg - labh + 0.05
            els.append({**T(x + ci * gw + 0.1, ly, gw - 0.2, labh, cp, cpt, 'ink', align='center'), 'origin': 'chart'})
        els.append({'t': 'line', 'x1': x, 'y1': zero, 'x2': x + w, 'y2': zero, 'color': 'line', 'width': 1.5})
        lim = spec.get('limit')
        if lim:
            ly_ = zero - lim['value'] / rng * ph
            els.append({'t': 'line', 'x1': x, 'y1': ly_, 'x2': x + w, 'y2': ly_, 'color': lim.get('tone', 'orange'), 'width': 2.25, 'dash': True})
            lp_ = [runs_of(lim['label'], True)]
            lw_ = tw(plain(lim['label']), 17, 'body', True) + 0.15
            els.append({**T(x + w - lw_, ly_ - 0.4, lw_, 0.36, lp_, 17, lim.get('tone', 'orange'), True, 'right', 'bottom'), 'origin': 'chart'})
    if ns > 1:
        lx = x
        for si, se in enumerate(series):
            els.append(R(lx, y + h - 0.34, 0.26, 0.26, colors[si % len(colors)], 0.04))
            nw = tw(se['name'], 17) + 0.1
            els.append({**T(lx + 0.36, y + h - 0.42, nw, 0.42, [runs_of(se['name'])], 17, 'ink', valign='middle'), 'origin': 'chart'})
            lx += 0.36 + nw + 0.45
    return els


def table_el(s, x, y, w, maxh, pt_hi=24, pt_lo=13):
    head = s['head']; rows = s['rows']
    ncol = len(head)
    lens = [max([len(plain(head[c]))] + [len(plain(r[c])) for r in rows]) for c in range(ncol)]
    wts = [max(8, l) ** 0.75 for l in lens]
    pad_x, pad_y = 0.12, 0.07

    def cols_for(pt):
        cw_ = [w * k / sum(wts) for k in wts]
        mins = [max(tw(wd, pt, 'body', True) for r in [head] + rows for wd in (plain(r[c]).split() or ['x'])) + 2 * pad_x + 0.04
                for c in range(ncol)]
        for _ in range(4):
            short = [c for c in range(ncol) if cw_[c] < mins[c]]
            if not short:
                break
            need = sum(mins[c] - cw_[c] for c in short)
            donors = [c for c in range(ncol) if c not in short]
            dw = sum(cw_[c] for c in donors)
            for c in short:
                cw_[c] = mins[c]
            for c in donors:
                cw_[c] -= need * cw_[c] / dw
        return cw_
    colw = None

    def est(pt):
        nonlocal colw
        colw = cols_for(pt)
        tot = 0
        for ri, r in enumerate([head] + rows):
            m = max(para_lines(runs_of(r[c], ri == 0 or c == 0), colw[c] - 2 * pad_x, pt) for c in range(ncol))
            tot += m * pt * LH / 72 + 2 * pad_y + 0.02
        return tot
    pt = pt_lo
    for p in range(pt_hi, pt_lo - 1, -1):
        if est(p) <= maxh:
            pt = p; break
    else:
        WARN.append('table overflow: ' + s['title'])
    hh = est(pt)
    nrow = len(rows) + 1
    if hh < maxh * 0.8:
        extra = min(0.1, (maxh * 0.8 - hh) / nrow / 2)
        pad_y += extra
        hh += extra * 2 * nrow
    return {'t': 'table', 'x': x, 'y': y, 'w': w, 'colw': colw, 'pt': pt, 'pad': [pad_y, pad_x],
            'head': [runs_of(c, True) for c in head],
            'rows': [[runs_of(c, ci == 0) for ci, c in enumerate(r)] for r in rows],
            'h_est': hh}


def fmt_num(v, dec):
    s = f'{v:.{dec}f}'
    return s.replace('.', ',').replace('-', '−')


# ---------- слайды ----------
def build_slide(s, v, ctx):
    k = s.get('kind', 'bullets')
    els = []
    lay = v.get('layout')
    tone = v.get('tone', 'teal')
    text_all = ' '.join([s.get('title', '')] + s.get('items', []) + [s.get('text', '')])
    icon = v.get('icon') or ('clipboard-list' if k == 'task' else None) or pick_icon(plain(s.get('title', '')), None) or pick_icon(plain(text_all), KIND_ICON.get(k, 'lightbulb'))

    if k == 'title':
        m = re.search(r'(\d+\.\d+)', s.get('kicker', ''))
        num = m.group(1) if m else ''
        els.append(R(ML, 0.9, tw(s['kicker'].upper(), 15, 'body', True) * 1.12 + 0.5, 0.48, 'dsurface', 0.24))
        els.append({**T(ML + 0.25, 0.9, 7, 0.48, [runs_of(s['kicker'].upper(), True)], 15, 'dteal', True, valign='middle')})
        tp = [runs_of(s['title'], True)]
        tpt = fit(tp, 8.2, 2.5, 48, 34, tag='title')
        th = text_h(tp, 8.2, tpt)
        els.append({**T(ML, 1.75, 8.2, th + 0.1, tp, tpt, 'dink', True), 'role': 'title'})
        lp = [runs_of(s.get('lead', ''))]
        els.append(T(ML, 1.75 + th + 0.35, 7.9, 1.6, lp, fit(lp, 7.9, 1.6, 24, 18, tag='lead'), 'dmuted'))
        mp = [runs_of(s.get('meta', ''))]
        els.append(T(ML, 6.35, 8.4, 0.7, mp, fit(mp, 8.4, 0.7, 15, 12, tag='meta'), 'dmuted'))
        cx, cy, d = 9.55, 1.35, 3.1
        els.append(O(cx, cy, d, 'dsurface'))
        els.append(I(cx + d * 0.27, cy + d * 0.27, d * 0.46, v.get('icon', ctx['topic_icon']), 'dteal'))
        if num:
            els.append(T(cx - 0.6, cy + d + 0.25, d + 1.2, 1.2, [runs_of(num, True)], 66, 'dorange', True, 'center', origin='num'))
        return {'bg': 'dark', 'els': els, 'title': plain(s['title'])}

    if k == 'section':
        kk = s.get('kicker', '')
        els.append(R(ML, 1.5, tw(kk.upper(), 15, 'body', True) * 1.12 + 0.5, 0.48, 'dsurface', 0.24))
        els.append(T(ML + 0.25, 1.5, 8, 0.48, [runs_of(kk.upper(), True)], 15, 'dorange', True, valign='middle'))
        tp = [runs_of(s['title'], True)]
        tpt = fit(tp, 8.2, 2.2, 46, 32, tag='section')
        th = text_h(tp, 8.2, tpt)
        els.append({**T(ML, 2.35, 8.2, th + 0.1, tp, tpt, 'dink', True), 'role': 'title'})
        lp = [runs_of(s.get('lead', ''))]
        els.append(T(ML, 2.35 + th + 0.35, 7.9, 1.8, lp, fit(lp, 7.9, 1.8, 26, 18, tag='lead'), 'dmuted'))
        cx, cy, d = 9.7, 2.0, 3.0
        els.append(O(cx, cy, d, 'dsurface'))
        els.append(I(cx + d * 0.27, cy + d * 0.27, d * 0.46, v.get('icon', 'wrench'), 'dorange'))
        return {'bg': 'dark', 'els': els, 'title': plain(s['title'])}

    if k == 'table' and s.get('author'):
        title_block(els, s, 'user-round')
        rows = s['rows']
        icons = {'Регалии': 'award', 'Телефон': 'phone', 'E-mail': 'mail', 'Сайт': 'globe', 'Telegram': 'send'}
        els.append(R(ML, CT + 0.1, 3.6, 4.9, 'graphite', 0.2))
        els.append(I(ML + 0.9, CT + 0.75, 1.8, 'user-round', 'on_graphite'))
        els.append(T(ML + 0.3, CT + 2.75, 3.0, 0.3, [runs_of(rows[0][0])], 13, 'on_graphite_acc', align='center'))
        rp = [runs_of(r[1]) for r in rows[:2]]
        els.append(T(ML + 0.25, CT + 3.1, 3.1, 1.75, rp, fit(rp, 3.1, 1.75, 17, 12, gap_ratio=0.3, tag='regalia'), 'on_graphite', gap=5, align='center'))
        y = CT + 0.35
        for lab, val in rows[2:]:
            icon_badge(els, 5.0, y, 0.62, icons.get(lab, 'info'))
            els.append(T(5.85, y - 0.04, 6.5, 0.3, [runs_of(lab)], 14, 'muted'))
            els.append(T(5.85, y + 0.24, 6.8, 0.45, [runs_of(val, True)], 22, 'ink', True))
            y += 1.12
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    # --- содержательные слайды ---
    dark = (lay == 'checklist') or (lay is None and k == 'bullets' and re.search(r'запомнить', s.get('title', ''), re.I))
    if dark:
        lay = 'checklist'
        els.append({**T(ML, 0.45, CW, 1.0, [runs_of(s['title'], True)], 34, 'dink', True, valign='middle'), 'role': 'title'})
        items = s['items']
        if len(items) >= 5:
            half = math.ceil(len(items) / 2)
            lay_rows(els, items[:half], ML, CW / 2 - 0.2, 1.9, 6.6, dark=True, check=True, maxpt=24, center=False)
            lay_rows(els, items[half:], ML + CW / 2 + 0.2, CW / 2 - 0.2, 1.9, 6.6, dark=True, check=True, maxpt=24, center=False)
        else:
            lay_rows(els, items, ML, CW, 1.8, 6.6, dark=True, check=True, maxpt=28)
        if s.get('note'):
            els.append(T(ML, 6.7, CW, 0.5, [runs_of(s['note'])], 14, 'dmuted'))
        return {'bg': 'dark', 'els': els, 'title': plain(s['title'])}

    title_block(els, s, icon, tone if tone in ('teal', 'orange', 'red') else 'teal')
    bottom = CB
    if s.get('note') and k not in ('image',):
        bottom = note_block(els, s['note'])

    if k == 'image' and v.get('tree'):
        # схема-дерево Archify родными фигурами: корень, группы колонками, разделы карточками
        tree = json.load(open(os.path.join(HERE, v['tree']), encoding='utf-8'))
        nodes = tree['nodes']
        root = [n for n in nodes if not n.get('parent')][0]
        groups = [n for n in nodes if n.get('parent') == root['id']]
        tones = v.get('tree_tones', ['teal', 'red', 'orange', 'teal'])
        capy = CB - 0.05
        rw, rh = 4.2, 0.78
        rx, ry = ML + (CW - rw) / 2, CT - 0.12
        els.append(R(rx, ry, rw, rh, 'graphite', 0.14))
        els.append({**T(rx + 0.2, ry + 0.06, rw - 0.4, 0.4, [runs_of(root['label'], True)], 21, 'on_graphite', True, 'center', 'middle'), 'origin': 'diagram'})
        if root.get('sublabel'):
            els.append({**T(rx + 0.2, ry + 0.44, rw - 0.4, 0.3, [runs_of(root['sublabel'])], 14, 'on_graphite', False, 'center', 'middle'), 'origin': 'diagram'})
        gap = 0.3
        gw = (CW - gap * (len(groups) - 1)) / len(groups)
        gy = ry + rh + 0.36
        busy = ry + rh + 0.18
        cxs = [ML + i * (gw + gap) + gw / 2 for i in range(len(groups))]
        els.append({'t': 'line', 'x1': ML + CW / 2, 'y1': ry + rh, 'x2': ML + CW / 2, 'y2': busy, 'color': 'muted', 'width': 1.5})
        els.append({'t': 'line', 'x1': cxs[0], 'y1': busy, 'x2': cxs[-1], 'y2': busy, 'color': 'muted', 'width': 1.5})
        kids_all = [[n for n in nodes if n.get('parent') == g['id']] for g in groups]
        nmax = max(len(k_) for k_ in kids_all)
        gh_ = 0.54
        ch_top = gy + gh_ + 0.2
        avail = capy - 0.15 - ch_top
        cgap = 0.14
        chh = min(1.15, (avail - cgap * (nmax - 1)) / nmax)
        tpt_all = min(fit([runs_of(n['label'], True)], gw - 0.55, 0.34, 18, 15, tag='tree-n') for k_ in kids_all for n in k_)
        sh_ = chh - 0.24 - tpt_all * LH / 72
        spt_all = min(fit([runs_of(n['sublabel'])], gw - 0.4, sh_, 16, 13, tag='tree-s') for k_ in kids_all for n in k_ if n.get('sublabel'))
        for i, g in enumerate(groups):
            tone = tones[i % len(tones)]
            x = ML + i * (gw + gap)
            els.append({'t': 'line', 'x1': cxs[i], 'y1': busy, 'x2': cxs[i], 'y2': gy, 'color': 'muted', 'width': 1.5})
            els.append(R(x, gy, gw, gh_, tone + '_t', 0.12))
            gp = [runs_of(g['label'], True)]
            els.append({**T(x + 0.15, gy, gw - 0.3, gh_, gp, fit(gp, gw - 0.3, gh_, 20, 15, tag='tree-g'), tone + '_ink', True, 'center', 'middle'), 'origin': 'diagram'})
            kids = kids_all[i]
            for j, n in enumerate(kids):
                y = ch_top + j * (chh + cgap)
                els.append(R(x, y, gw, chh, 'surface', 0.12, shadow=True))
                els.append(O(x + 0.17, y + 0.2, 0.15, tone))
                tp = [runs_of(n['label'], True)]
                tpt = tpt_all
                els.append({**T(x + 0.42, y + 0.1, gw - 0.55, 0.34, tp, tpt, 'ink', True), 'origin': 'diagram'})
                if n.get('sublabel'):
                    sp_ = [runs_of(n['sublabel'])]
                    els.append({**T(x + 0.25, y + 0.1 + tpt * LH / 72 + 0.04, gw - 0.4, sh_, sp_, spt_all, 'muted'), 'origin': 'diagram'})
        if s.get('note'):
            els.append(I(ML, capy + 0.02, 0.3, 'mouse-pointer-click', 'muted'))
            els.append(T(ML + 0.42, capy, CW - 0.42, 0.4, [runs_of(s['note'])], 13, 'muted', valign='middle'))
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if k == 'image':
        src = s['src']
        orig = os.path.normpath(os.path.join(ctx['slides_dir'], src))
        svg = orig[:-4] + '.svg'
        if v.get('img'):                   # вариант схемы, скомпонованный под слайд (тот же текст, другая раскладка)
            orig = os.path.join(HERE, v['img'])
        elif os.path.exists(svg):          # чистая схема без дублирующего заголовка и рамки
            import svg2png
            orig = svg2png.render(svg)
        im = Image.open(orig).convert('RGB')
        from PIL import ImageChops
        bg = Image.new('RGB', im.size, im.getpixel((2, 2)))
        bb = ImageChops.difference(im, bg).convert('L').point(lambda q: 255 if q > 12 else 0).getbbox()
        if bb:
            m = 16
            im = im.crop((max(0, bb[0] - m), max(0, bb[1] - m), min(im.width, bb[2] + m), min(im.height, bb[3] + m)))
        os.makedirs(ctx['img_dir'], exist_ok=True)
        name = os.path.basename(src)
        absp = os.path.join(ctx['img_dir'], name)
        im.save(absp, optimize=True)
        src = 'img/' + name
        iw, ih = im.size
        capy = CB - 0.3
        boxw, boxh = CW, capy - CT - 0.05
        sc = min(boxw / iw, boxh / ih)
        w, h = iw * sc, ih * sc
        x, y = ML + (CW - w) / 2, CT + (boxh - h) / 2
        els.append(R(x - 0.1, y - 0.1, w + 0.2, h + 0.2, 'white', 0.12, line='line'))
        els.append({'t': 'image', 'x': x, 'y': y, 'w': w, 'h': h, 'src': absp, 'rel': src, 'alt': plain(s['title'])})
        if s.get('note'):
            els.append(I(ML, capy + 0.02, 0.3, 'mouse-pointer-click', 'muted'))
            els.append(T(ML + 0.42, capy, CW - 0.42, 0.4, [runs_of(s['note'])], 13, 'muted', valign='middle'))
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if k == 'quote' and lay != 'chart':
        stats = v.get('stats')
        qw = CW - 1.75 - (4.0 if stats else 0)
        qp = [runs_of(s['text'])]
        sp = [runs_of(s.get('src', ''))]
        avail = bottom - CT - 0.2
        qpt = fit(qp, qw, avail - 0.9, 36 if len(plain(s['text'])) < 160 else 30, 18, tag='quote ' + s['title'])
        qh = text_h(qp, qw, qpt)
        spt = fit(sp, qw - 0.45, 0.8, 15, 12, tag='src')
        sh = text_h(sp, qw - 0.45, spt)
        y0 = CT + max(0.15, (avail - qh - sh - 0.4) / 2 - 0.1)
        icon_badge(els, ML, y0, 1.25, 'quote', tone)
        els.append({**T(ML + 1.75, y0, qw, qh + 0.05, qp, qpt, 'ink'), 'italic': False})
        if plain(s.get('src', '')).strip():
            els.append(I(ML + 1.75, y0 + qh + 0.32, 0.3, 'book-open', 'muted'))
            els.append(T(ML + 2.2, y0 + qh + 0.28, qw - 0.45, sh + 0.05, sp, spt, 'muted'))
        if stats:
            lay_stats(els, stats, W - ML - 3.7, CT + 0.1, 3.7, bottom - CT - 0.1, head=v.get('stats_head'))
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if lay == 'chart' or v.get('chart'):
        spec = v['chart']
        if spec == 'auto' or spec.get('auto'):
            base = {} if spec == 'auto' else spec
            head, rows = s['head'], s['rows']
            spec = {'type': base.get('type', 'col'), 'cats': [plain(r[0]) for r in rows],
                    'series': [{'name': plain(head[c]), 'values': [float(plain(r[c]).replace(',', '.').replace('−', '-')) for r in rows]}
                               for c in range(1, len(head))],
                    'colors': base.get('colors', ['teal', 'orange', 'graphite'])}
        side = v.get('side')                  # 'items' | None
        if 'dec' in spec:
            spec['dec_fixed'] = True
        dec = spec.get('dec', max((len(str(x).split('.')[1]) if '.' in str(x) and not float(x).is_integer() else 0)
                                  for se in spec['series'] for x in se['values']))
        spec['dec'] = dec
        if side == 'items' and s.get('items'):
            cw_ = CW * 0.56
            els.extend(chart_el(ML, CT, cw_, bottom - CT, {'chart': spec}))
            lay_rows(els, s['items'], ML + cw_ + 0.4, CW - cw_ - 0.4, CT, bottom, tone, numbered=False, maxpt=22)
        elif side == 'stats':
            cw_ = CW * 0.6
            els.extend(chart_el(ML, CT, cw_, bottom - CT, {'chart': spec}))
            lay_stats(els, v['stats'], ML + cw_ + 0.5, CT, CW - cw_ - 0.5, bottom - CT, head=v.get('stats_head'))
        elif side == 'quote':
            cw_ = CW * 0.5
            els.extend(chart_el(ML + CW - cw_, CT, cw_, bottom - CT, {'chart': spec}))
            qw = CW - cw_ - 0.5
            qp = [runs_of(s['text'])]; sp = [runs_of(s.get('src', ''))]
            spt = fit(sp, qw - 0.42, 0.9, 14, 11, tag='src')
            sh = text_h(sp, qw - 0.42, spt)
            qpt = fit(qp, qw, bottom - CT - 1.0 - sh - 0.35, 26, 15, tag='quote-chart')
            qh = text_h(qp, qw, qpt)
            icon_badge(els, ML, CT, 0.8, 'quote', tone)
            els.append(T(ML, CT + 1.0, qw, qh + 0.05, qp, qpt, 'ink'))
            els.append(I(ML, CT + 1.0 + qh + 0.3, 0.28, 'book-open', 'muted'))
            els.append(T(ML + 0.42, CT + 1.0 + qh + 0.26, qw - 0.42, sh + 0.05, sp, spt, 'muted'))
        else:
            els.extend(chart_el(ML, CT, CW, bottom - CT, {'chart': spec}))
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if k == 'table':
        if lay == 'compare':
            head, rows = s['head'], s['rows']
            tones = v.get('tones', ['teal', 'orange'])
            icons = v.get('icons', ['bot', 'user-check'])
            gap = 0.4
            pw = (CW - gap) / 2
            for c in range(2):
                x = ML + c * (pw + gap)
                els.append(R(x, CT, pw, bottom - CT, tones[c] + '_t', 0.16))
                icon_badge(els, x + 0.3, CT + 0.3, 0.72, icons[c], tones[c])
                hp = [runs_of(head[c], True)]
                els.append(T(x + 1.2, CT + 0.3, pw - 1.5, 0.72, hp, fit(hp, pw - 1.5, 0.72, 24, 17, tag='compare-head'), tones[c] + '_ink', True, valign='middle'))
                items = [r[c] for r in rows if r[c].strip()]
                lay_rows(els, items, x + 0.35, pw - 0.65, CT + 1.25, bottom - 0.25, tones[c], numbered=False, maxpt=22)
            # стрелка между колонками – фигурой
            els.append(O(ML + pw + gap / 2 - 0.3, CT + (bottom - CT) / 2 - 0.3, 0.6, 'white'))
            els.append(I(ML + pw + gap / 2 - 0.2, CT + (bottom - CT) / 2 - 0.2, 0.4, 'arrow-right', 'muted'))
            return {'bg': 'light', 'els': els, 'title': plain(s['title'])}
        te = table_el(s, ML, CT, CW, bottom - CT)
        els.append(te)
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if k == 'task':
        code = s.get('code')
        pw = 2.9 if code else 3.4
        els.append(R(ML, CT, pw, bottom - CT, 'graphite', 0.16))
        els.append(I(ML + pw / 2 - 0.55, CT + 0.55, 1.1, 'timer', 'on_graphite_acc'))
        tp = [runs_of(s.get('time', ''), True)]
        tpt = fit(tp, pw - 0.5, 1.6, 44, 20, tag='time')
        els.append(T(ML + 0.25, CT + 1.95, pw - 0.5, 1.8, tp, tpt, 'on_graphite', True, 'center'))
        x = ML + pw + 0.45
        if code:
            cwid = v.get('code_w') or (min(7.4, W - ML - x - 0.4 - 3.0) if len(s['items']) <= 2 else (5.2 if len(code) > 250 else 4.6))
            sw = W - ML - x - cwid - 0.4
            lay_rows(els, s['items'], x, sw, CT, bottom, tone, maxpt=22)
            cx = W - ML - cwid
            els.append(R(cx, CT, cwid, bottom - CT, 'surface2', 0.16))
            icon_badge(els, cx + 0.25, CT + 0.22, 0.5, 'message-square-text', tone)
            cp = [[{'text': ln, 'b': False, 'm': True}] for ln in code.split('\n')]
            cpt = fit(cp, cwid - 0.5, bottom - CT - 1.05, 20, 10, kind='mono', tag='code ' + s['title'])
            els.append(T(cx + 0.25, CT + 0.9, cwid - 0.5, bottom - CT - 1.05, cp, cpt, 'ink', kind='mono'))
        else:
            lay_rows(els, s['items'], x, W - ML - x, CT, bottom, tone, maxpt=24)
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    if k == 'steps':
        items = s['items']
        n = len(items)
        mx = max(len(plain(t)) for t in items)
        if lay == 'grid' or (lay is None and n in (5, 6) and mx <= 60):
            lay_cards(els, items, CT, bottom, tone, 'numbers')
        elif lay == 'flow' or (lay is None and n <= 4 and mx <= 95):
            gap = 0.55
            cw_ = (CW - gap * (n - 1)) / n
            paras = [[runs_of(t)] for t in items]
            avail = bottom - CT
            inner = cw_ - 0.5
            pt = min(fit(p, inner, avail - 1.4, 24, 15, tag='flow') for p in paras)
            need = max(text_h(p, inner, pt) for p in paras) + 1.45
            ch = min(avail, max(2.4, need))
            y = CT + (avail - ch) / 2
            for i, p in enumerate(paras):
                x = ML + i * (cw_ + gap)
                els.append(R(x, y, cw_, ch, 'surface', 0.16, shadow=True))
                num_badge(els, x + 0.25, y + 0.25, 0.7, i + 1, tone if i < n - 1 else 'orange')
                els.append(T(x + 0.25, y + 1.15, inner, ch - 1.3, p, pt, 'ink'))
                if i < n - 1:
                    els.append(I(x + cw_ + gap / 2 - 0.2, y + ch / 2 - 0.2, 0.4, 'chevron-right', 'muted'))
        else:
            # вертикальная лента с соединительной линией
            d = 0.5
            lay_rows(els, items, ML + 0.2, CW - 0.2, CT, bottom, tone, maxpt=28)
            nums = [e for e in els if e['t'] == 'ellipse' and e['fill'] == tone + '_t' and e['y'] > CT - 0.1]
            if len(nums) >= 2:
                cx = nums[0]['x'] + nums[0]['w'] / 2
                els.insert(els.index(nums[0]), {'t': 'line', 'x1': cx, 'y1': nums[0]['y'] + 0.25, 'x2': cx,
                                                 'y2': nums[-1]['y'] + 0.25, 'color': 'line', 'width': 2.5})
        return {'bg': 'light', 'els': els, 'title': plain(s['title'])}

    # bullets
    items = s['items']
    n = len(items)
    mx = max(len(plain(t)) for t in items)
    stats = v.get('stats')
    if lay == 'cards' or (lay is None and not stats and ((n <= 4 and mx <= 95) or (n <= 6 and mx <= 70)) and cards_fit(items, bottom - CT)):
        lay_cards(els, items, CT, bottom, tone, v.get('icons'))
    else:
        if stats:
            pw = 3.8
            lay_stats(els, stats, ML, CT, pw, bottom - CT, head=v.get('stats_head'))
            lay_rows(els, items, ML + pw + 0.5, CW - pw - 0.5, CT, bottom, tone, numbered=v.get('numbered', False), maxpt=24)
        elif n <= 5 and mx <= 110 and lay != 'list':
            pw = 3.2
            els.append(R(ML, CT, pw, bottom - CT, tone + '_t', 0.18))
            els.append(I(ML + pw / 2 - 0.9, CT + (bottom - CT) / 2 - 0.9, 1.8, icon, tone))
            lay_rows(els, items, ML + pw + 0.5, CW - pw - 0.5, CT, bottom, tone, numbered=v.get('numbered', False), maxpt=28)
        else:
            lay_rows(els, items, ML, CW, CT, bottom, tone, numbered=v.get('numbered', False), maxpt=28)
    return {'bg': 'light', 'els': els, 'title': plain(s['title'])}


# ---------- HTML ----------
LIGHT = dict(bg='#FFFFFF', surface='#F1F4F7', surface2='#E6EBF0', line='#D3DAE2', ink='#1B2430', muted='#586577',
             white='#FFFFFF', teal='#0B7D72', teal_t='#DFF1EE', teal_ink='#0A5D55', orange='#C2611A', orange_t='#FBE9DA',
             orange_ink='#8A4310', red='#B23A2C', red_t='#F8E1DD', red_ink='#83281D', graphite='#24313F',
             on_graphite='#FFFFFF', on_graphite_acc='#F2A25C')
DARKT = dict(bg='#111820', surface='#1B2530', surface2='#24303D', line='#34424F', ink='#E6ECF2', muted='#9FACBB',
             white='#1B2530', teal='#4FC7B5', teal_t='#15342F', teal_ink='#8FE0D3', orange='#F2A25C', orange_t='#3A2817',
             orange_ink='#F7C59A', red='#F08070', red_t='#3B1E1A', red_ink='#F6B3A9', graphite='#2B3A4A',
             on_graphite='#FFFFFF', on_graphite_acc='#F2A25C')
DSL = dict(dbg='#141E28', dsurface='#1F2C39', dink='#F1F4F7', dmuted='#A9B6C4', dteal='#4FC7B5', dorange='#F2A25C',
           dteal_t='#173A36', dteal_ink='#8FE0D3')

PX = 96


def css_vars(d):
    return ';'.join(f'--{k}:{v}' for k, v in d.items())


def h_runs(runs):
    out = []
    for r in runs:
        t = html.escape(r['text']).replace('\n', '<br>')
        if r.get('m'):
            t = f'<code>{t}</code>'
        if r.get('b'):
            t = f'<b>{t}</b>'
        out.append(t)
    return ''.join(out)


def h_icon(name, color, used):
    used.add(name)
    return f'<svg class="ic" style="color:var(--{color})"><use href="#i-{name}"/></svg>'


def bar_svg(spec, w, h):
    """Сгруппированные столбцы/полосы, подписи значений. Размеры в px."""
    cats, series, dec = spec['cats'], spec['series'], spec['dec']
    colors = spec.get('colors', ['teal', 'orange', 'graphite'])
    horiz = spec.get('type') == 'bar'
    vals = [x for s in series for x in s['values']]
    vmin, vmax = min(0, min(vals)), max(0, max(vals))
    if spec.get('max') is not None:
        vmax = max(vmax, spec['max'])
    rng = (vmax - vmin) or 1
    leg_h = 40 if len(series) > 1 else 0
    fs = 19
    out = [f'<svg viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" font-family="Calibri,Carlito,sans-serif">']
    ns, nc = len(series), len(cats)
    if horiz:
        lab_w = min(w * 0.36, max(tw(c, 14) for c in cats) * PX + 20)
        pw, ph = w - lab_w - 70, h - leg_h - 10
        gh = ph / nc
        bh = min(48, gh * 0.72 / ns)
        zero = lab_w + (0 - vmin) / rng * pw
        for ci, c in enumerate(cats):
            gy = 5 + ci * gh + (gh - bh * ns) / 2
            out.append(f'<text x="{lab_w - 12:.0f}" y="{gy + bh * ns / 2 + 6:.0f}" text-anchor="end" font-size="{fs}" fill="var(--ink)">{html.escape(c)}</text>')
            for si, s in enumerate(series):
                v = s['values'][ci]
                x0 = zero if v >= 0 else zero - (-v) / rng * pw
                bw = abs(v) / rng * pw
                y = gy + si * bh
                out.append(f'<rect x="{x0:.1f}" y="{y:.1f}" width="{max(bw, 1):.1f}" height="{bh - 4:.1f}" rx="4" fill="var(--{colors[si % len(colors)]})"/>')
                lx = x0 + bw + 8 if v >= 0 else x0 - 8
                anc = 'start' if v >= 0 else 'end'
                out.append(f'<text x="{lx:.0f}" y="{y + bh / 2 + 4:.0f}" text-anchor="{anc}" font-size="{fs}" font-weight="700" fill="var(--ink)">{fmt_num(v, dec)}{html.escape(spec.get("unit", ""))}</text>')
        out.append(f'<line x1="{zero:.1f}" y1="0" x2="{zero:.1f}" y2="{ph + 5:.0f}" stroke="var(--line)" stroke-width="2"/>')
    else:
        lab_h = 64
        pw, ph = w - 20, h - leg_h - lab_h - 34
        gw = pw / nc
        bw = min(110, gw * 0.7 / ns)
        top = 30
        zero = top + (vmax - 0) / rng * ph
        for ci, c in enumerate(cats):
            gx = 10 + ci * gw + (gw - bw * ns) / 2
            for si, s in enumerate(series):
                v = s['values'][ci]
                bh_ = abs(v) / rng * ph
                y = zero - bh_ if v >= 0 else zero
                x = gx + si * bw
                out.append(f'<rect x="{x + 3:.1f}" y="{y:.1f}" width="{bw - 6:.1f}" height="{max(bh_, 1):.1f}" rx="4" fill="var(--{colors[si % len(colors)]})"/>')
                ly = y - 8 if v >= 0 else y + bh_ + 22
                out.append(f'<text x="{x + bw / 2:.0f}" y="{ly:.0f}" text-anchor="middle" font-size="{fs}" font-weight="700" fill="var(--ink)">{fmt_num(v, dec)}{html.escape(spec.get("unit", ""))}</text>')
            # подпись категории (до двух строк)
            words, lines, cur = c.split(), [], ''
            for wd in words:
                if cur and tw(cur + ' ' + wd, 14) * PX > gw - 10:
                    lines.append(cur); cur = wd
                else:
                    cur = (cur + ' ' + wd).strip()
            lines.append(cur)
            for li, ln in enumerate(lines[:3]):
                out.append(f'<text x="{10 + ci * gw + gw / 2:.0f}" y="{top + ph + 32 + li * 22 + (24 if vmin < 0 else 0):.0f}" text-anchor="middle" font-size="{fs}" fill="var(--ink)">{html.escape(ln)}</text>')
        out.append(f'<line x1="10" y1="{zero:.1f}" x2="{w - 10:.0f}" y2="{zero:.1f}" stroke="var(--line)" stroke-width="2"/>')
    if len(series) > 1:
        x = 10
        for si, s in enumerate(series):
            out.append(f'<rect x="{x}" y="{h - 26:.0f}" width="18" height="18" rx="3" fill="var(--{colors[si % len(colors)]})"/>')
            out.append(f'<text x="{x + 26}" y="{h - 11:.0f}" font-size="{fs}" fill="var(--ink)">{html.escape(s["name"])}</text>')
            x += 26 + tw(s['name'], 14.3) * PX + 40
    out.append('</svg>')
    return ''.join(out)


def h_el(e, used):
    p = lambda v: f'{v * PX:.1f}px'
    box = f'left:{p(e["x"])};top:{p(e["y"])};width:{p(e["w"])};height:{p(e["h"])}' if 'x' in e and 'h' in e else ''
    t = e['t']
    if t == 'rect':
        st = f'background:var(--{e["fill"]});border-radius:{p(e["radius"])}'
        if e.get('line'):
            st += f';border:1px solid var(--{e["line"]})'
        cls = 'r sh' if e.get('shadow') else 'r'
        return f'<div class="{cls}" style="{box};{st}"></div>'
    if t == 'ellipse':
        return f'<div class="r" style="{box};background:var(--{e["fill"]});border-radius:50%"></div>'
    if t == 'icon':
        return f'<div class="r" style="{box}">{h_icon(e["name"], e["color"], used)}</div>'
    if t == 'line':
        x1, y1, x2, y2 = (e[k] * PX for k in ('x1', 'y1', 'x2', 'y2'))
        dash = ' stroke-dasharray="10 7"' if e.get('dash') else ''
        return (f'<svg class="r" style="left:0;top:0;width:1280px;height:720px;overflow:visible"><line x1="{x1:.1f}" y1="{y1:.1f}" '
                f'x2="{x2:.1f}" y2="{y2:.1f}" stroke="var(--{e["color"]})" stroke-width="{e["width"] * 1.33:.1f}"{dash}/></svg>')
    if t == 'text':
        fam = 'mono' if e['font'] == 'mono' else ''
        jc = {'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end'}[e['valign']]
        gap = e['gap'] * PX / 72
        paras = ''.join(f'<p style="margin:0 0 {gap:.1f}px">{h_runs(pr)}</p>' for pr in e['paras'])
        tag = 'h2' if e.get('role') == 'title' else 'div'
        fw = '700' if e['bold'] else '400'
        return (f'<{tag} class="r tx {fam}" style="{box};font-size:{e["pt"] * PX / 72:.1f}px;color:var(--{e["color"]});'
                f'font-weight:{fw};text-align:{e["align"]};justify-content:{jc}">{paras}</{tag}>')
    if t == 'image':
        import base64
        data = base64.b64encode(open(e['src'], 'rb').read()).decode()
        return f'<img class="r" style="{box}" src="data:image/png;base64,{data}" alt="{html.escape(e["alt"])}" loading="lazy">'
    if t == 'chart':
        return f'<div class="r" style="{box}">{bar_svg(e["chart"], e["w"] * PX, e["h"] * PX)}</div>'
    if t == 'table':
        fs = e['pt'] * PX / 72
        pad = f'{e["pad"][0] * PX:.1f}px {e["pad"][1] * PX:.1f}px'
        cols = ''.join(f'<col style="width:{c * PX:.1f}px">' for c in e['colw'])
        head = ''.join(f'<th style="padding:{pad}">{h_runs(c)}</th>' for c in e['head'])
        rows = ''.join('<tr>' + ''.join(f'<td style="padding:{pad}">{h_runs(c)}</td>' for c in r) + '</tr>' for r in e['rows'])
        return (f'<table class="r tb" style="left:{p(e["x"])};top:{p(e["y"])};width:{p(e["w"])};font-size:{fs:.1f}px">'
                f'<colgroup>{cols}</colgroup><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>')
    raise ValueError(t)


CSS = """
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--page);font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif}
:root{%(light)s;%(dsl)s;--page:#E4E8ED}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){%(dark)s;--page:#0B1016}}
:root[data-theme="dark"]{%(dark)s;--page:#0B1016}
.stage{position:fixed;inset:0 0 52px 0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.slide{position:absolute;width:1280px;height:720px;left:50%%;top:50%%;background:var(--bg);color:var(--ink);display:none;transform-origin:center center;box-shadow:0 12px 40px rgba(0,0,0,.18);border-radius:6px;overflow:hidden}
.slide.on{display:block}
.slide.dark{background-color:var(--dbg);background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px}
.r{position:absolute;margin:0}.sh{box-shadow:0 3px 10px rgba(16,24,40,.10)}
.tx{display:flex;flex-direction:column;line-height:1.22;overflow-wrap:break-word;font-weight:400}
.tx.mono{font-family:Consolas,"Cascadia Mono",monospace;white-space:pre-wrap}
h2.tx{font-size:inherit}
.ic{width:100%%;height:100%%;display:block}
code{font-family:Consolas,"Cascadia Mono",monospace;font-size:.92em;background:var(--surface2);border-radius:4px;padding:0 .2em}
.tb{border-collapse:collapse;table-layout:fixed;line-height:1.22;color:var(--ink)}
.tb th{background:var(--graphite);color:var(--on_graphite);text-align:left;vertical-align:top;font-weight:700}
.tb td{border-bottom:1px solid var(--line);vertical-align:top}.tb tbody tr:nth-child(even) td{background:var(--surface)}
.tb td:first-child{font-weight:700}
.foot{position:absolute;left:57.6px;top:681px;font-size:13.3px;color:var(--muted)}
.pg{position:absolute;right:57.6px;top:681px;font-size:13.3px;color:var(--muted)}
.dark .foot,.dark .pg{display:none}
.bar{position:fixed;left:0;right:0;bottom:0;height:52px;display:flex;gap:10px;align-items:center;justify-content:center;background:var(--page);font-size:15px;color:var(--muted)}
.bar button,.theme{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:6px 14px;font-size:16px;cursor:pointer}
.bar button:focus-visible,.theme:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
.theme{position:fixed;top:16px;right:16px;z-index:5}
@media print{@page{size:13.333in 7.5in;margin:0}html,body{height:auto;background:#fff}.bar,.theme{display:none}.stage{position:static;display:block}
.slide{display:block;position:relative;left:0;top:0;transform:none!important;box-shadow:none;border-radius:0;break-after:page;page-break-after:always}}
"""

JS = r"""
(function(){
 var s=[].slice.call(document.querySelectorAll('.slide')),i=0,c=document.getElementById('cnt'),st=document.querySelector('.stage');
 function fitS(){var k=Math.min(st.clientWidth/1280,st.clientHeight/720)*0.97;s.forEach(function(e){e.style.transform='translate(-50%,-50%) scale('+k+')'})}
 window.addEventListener('resize',fitS);fitS();
 function go(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach(function(e,k){e.classList.toggle('on',k===i)});c.textContent=(i+1)+' / '+s.length;try{history.replaceState(null,'','#'+(i+1))}catch(e){}}
 function fromHash(){var h=parseInt((location.hash||'#1').slice(1),10);go(isNaN(h)?0:h-1)}fromHash();window.addEventListener('hashchange',fromHash);
 document.getElementById('prev').onclick=function(){go(i-1)};document.getElementById('next').onclick=function(){go(i+1)};
 document.addEventListener('keydown',function(e){if(['ArrowRight','PageDown',' '].indexOf(e.key)>=0){e.preventDefault();go(i+1)}else if(['ArrowLeft','PageUp'].indexOf(e.key)>=0){e.preventDefault();go(i-1)}else if(e.key==='Home'){go(0)}else if(e.key==='End'){go(s.length-1)}});
 var tx0=null;st.addEventListener('touchstart',function(e){tx0=e.touches[0].clientX},{passive:true});st.addEventListener('touchend',function(e){if(tx0===null)return;var dx=e.changedTouches[0].clientX-tx0;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));tx0=null});
 var tb=document.getElementById('theme');function cur(){return document.documentElement.getAttribute('data-theme')}
 function icon(){tb.textContent=cur()==='dark'?'☀':'☾'}icon();
 tb.onclick=function(){var t=cur()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',t);var d=new Date(),x=new Date(d);var hh=d.getHours();if(hh>=7&&hh<20){x.setHours(20,0,0,0)}else{if(hh>=20){x.setDate(x.getDate()+1)}x.setHours(7,0,0,0)}try{localStorage.setItem('deck-theme',JSON.stringify({t:t,until:x.getTime()}))}catch(e){}icon()};
})();
"""
HEAD_JS = r"""(function(){var t;try{var v=JSON.parse(localStorage.getItem('deck-theme')||'null');if(v&&v.until>Date.now())t=v.t}catch(e){}if(!t){var h=new Date().getHours();t=(h>=20||h<7)?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();"""


def icon_symbol(name):
    svg = open(os.path.join(ICON_DIR, name + '.svg'), encoding='utf-8').read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)
    inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S)
    return (f'<symbol id="i-{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{inner.strip()}</symbol>')


def render_html(spec, scene, out):
    used = set()
    parts = []
    n = len(scene)
    for i, sl in enumerate(scene):
        body = ''.join(h_el(e, used) for e in sl['els'])
        foot = f'<div class="foot">{html.escape(spec.get("footer", ""))}</div><div class="pg">{i + 1}</div>'
        cls = 'slide dark' if sl['bg'] == 'dark' else 'slide'
        parts.append(f'<section class="{cls}" aria-label="Слайд {i + 1} из {n}: {html.escape(sl["title"])}">{body}{foot}</section>')
    syms = ''.join(icon_symbol(nm) for nm in sorted(used))
    css = CSS.replace('%%', '%').replace('%(light)s', css_vars(LIGHT)).replace('%(dark)s', css_vars(DARKT)).replace('%(dsl)s', css_vars(DSL))
    doc = (f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
           f'<title>{html.escape(spec["title"])}</title><script>{HEAD_JS}</script><style>{css}</style></head><body>'
           f'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{syms}</defs></svg>'
           f'<button class="theme" id="theme" aria-label="Переключить тему">☾</button>'
           f'<main class="stage">{"".join(parts)}</main>'
           f'<nav class="bar" aria-label="Навигация по слайдам"><button id="prev" aria-label="Предыдущий слайд">←</button>'
           f'<span id="cnt"></span><button id="next" aria-label="Следующий слайд">→</button></nav>'
           f'<script>{JS}</script></body></html>')
    open(out, 'w', encoding='utf-8', newline='\n').write(doc)


def build(deck_path, viz_path, day_dir, out_html, out_scene):
    spec = json.load(open(deck_path, encoding='utf-8'))
    viz = json.load(open(viz_path, encoding='utf-8')) if viz_path not in ('-', '') and os.path.exists(viz_path) else {}
    ctx = {'slides_dir': os.path.join(day_dir, '02-Слайды'), 'img_dir': os.path.join(os.path.dirname(os.path.abspath(out_html)), 'img'), 'topic_icon': viz.get('_topic_icon', 'cpu')}
    slides = spec['slides']
    order = viz.get('_order') or list(range(1, len(slides) + 1))
    scene = []
    for idx in order:
        s = slides[idx - 1]
        sl = build_slide(s, viz.get(str(idx), {}), ctx)
        sl['src_index'] = idx
        scene.append(sl)
    render_html(spec, scene, out_html)
    json.dump({'title': spec['title'], 'footer': spec.get('footer', ''), 'slides': scene,
               'palette': {**LIGHT, **DSL}}, open(out_scene, 'w', encoding='utf-8'), ensure_ascii=False)
    return scene


if __name__ == '__main__':
    build(*sys.argv[1:6])
    for w in WARN:
        print('WARN', w)
    print('ok', sys.argv[4])
