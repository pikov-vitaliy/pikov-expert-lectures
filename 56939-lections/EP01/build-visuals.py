"""Render local, accessible SVG figures from the Markdown visual catalogue."""
from pathlib import Path
import argparse
import json
import math
import re
import textwrap
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
CATALOGUE = ROOT / 'EP01-visuals.md'
OUT = ROOT / 'assets' / 'visuals'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
COLORS = {'navy': '#15334f', 'blue': '#245dba', 'teal': '#147b70', 'amber': '#996315', 'ink': '#17212b', 'muted': '#43566c', 'line': '#b8c9db', 'soft': '#edf3fa', 'white': '#ffffff'}

def catalogue():
    entries = [json.loads(block) for block in re.findall(r'```json\s*\n(.*?)\n```', CATALOGUE.read_text(encoding='utf-8'), re.S)]
    assert entries, 'Visual catalogue is empty'
    assert len({v['id'] for v in entries}) == len(entries), 'Duplicate visual IDs'
    for v in entries:
        assert re.fullmatch(r'[a-z0-9-]+', v['id']), 'Unsafe visual ID'
        assert v['alt'] and v['caption'] and v['sourceIds'], f'Missing description/source: {v["id"]}'
    return entries

class Drawing:
    def __init__(self, spec, height=520):
        self.spec = spec
        self.height = height
        self.root = ET.Element(f'{{{NS}}}svg', {'viewBox': f'0 0 1600 {height}', 'width': '1600', 'height': str(height), 'role': 'img', 'aria-labelledby': 'title description', 'lang': spec.get('lang', 'en')})
        self.add('title', text=spec['alt'], id='title')
        self.add('desc', text=spec['caption'], id='description')
        defs = self.add('defs')
        for color in ['blue', 'teal', 'amber', 'muted']:
            marker = ET.SubElement(defs, f'{{{NS}}}marker', {'id': f'arrow-{color}', 'markerWidth': '12', 'markerHeight': '12', 'refX': '10', 'refY': '6', 'orient': 'auto', 'markerUnits': 'userSpaceOnUse'})
            ET.SubElement(marker, f'{{{NS}}}path', {'d': 'M1 1 L11 6 L1 11 Z', 'fill': COLORS[color]})
        self.rect(0, 0, 1600, height, 'white')

    def add(self, tag, text=None, **attrs):
        element = ET.SubElement(self.root, f'{{{NS}}}{tag}', {k.replace('_', '-'): str(v) for k, v in attrs.items()})
        if text is not None:
            element.text = str(text)
        return element

    def rect(self, x, y, width, height, fill='soft', stroke=None, radius=16, dash=None):
        attrs = dict(x=x, y=y, width=width, height=height, rx=radius, fill=COLORS.get(fill, fill))
        if stroke:
            attrs.update(stroke=COLORS.get(stroke, stroke), stroke_width=3)
        if dash:
            attrs['stroke_dasharray'] = dash
        return self.add('rect', **attrs)

    def text(self, x, y, value, size=36, color='ink', weight=650, anchor='start', width=None, max_lines=None, line_height=1.18):
        lines = str(value).split('\n')
        if width:
            lines = [line for part in lines for line in (textwrap.wrap(part, max(5, int(width / (size * .54))), break_long_words=False, break_on_hyphens=False) or [''])]
        if max_lines and len(lines) > max_lines:
            raise ValueError(f'{self.spec["id"]}: text needs {len(lines)} lines (max {max_lines}): {value}')
        node = self.add('text', x=x, y=y, font_family='Segoe UI, Arial, sans-serif', font_size=size, font_weight=weight, fill=COLORS.get(color, color), text_anchor=anchor)
        for index, line in enumerate(lines):
            span = ET.SubElement(node, f'{{{NS}}}tspan', {'x': str(x), 'dy': '0' if index == 0 else str(round(size * line_height, 2))})
            span.text = line
        return y + max(0, len(lines) - 1) * size * line_height

    def line(self, x1, y1, x2, y2, color='blue', arrow=False, dash=None, width=4):
        attrs = dict(x1=x1, y1=y1, x2=x2, y2=y2, stroke=COLORS[color], stroke_width=width, fill='none')
        if arrow:
            attrs['marker_end'] = f'url(#arrow-{color})'
        if dash:
            attrs['stroke_dasharray'] = dash
        return self.add('line', **attrs)

    def path(self, d, color='blue', arrow=False, dash=None):
        attrs = dict(d=d, stroke=COLORS[color], stroke_width=4, fill='none', stroke_linejoin='round')
        if arrow:
            attrs['marker_end'] = f'url(#arrow-{color})'
        if dash:
            attrs['stroke_dasharray'] = dash
        return self.add('path', **attrs)

    def box(self, x, y, w, h, node, tone='blue', compact=False):
        self.rect(x, y, w, h, 'soft', None)
        self.rect(x, y, 7, h, tone, radius=3)
        label, title, detail = node.get('label', ''), node.get('title', ''), node.get('detail', '')
        cursor = y + 38
        if title:
            if label:
                cursor = self.text(x + 24, cursor, label, 28, tone, 700, width=w - 48, max_lines=2) + 44
            cursor = self.text(x + 24, cursor, title, 36 if not compact else 34, 'navy', 700, width=w - 48, max_lines=3) + 42
        else:
            cursor = self.text(x + 24, cursor + 8, label, 38 if not compact else 34, 'navy', 700, width=w - 48, max_lines=3) + 45
        if detail:
            cursor = self.text(x + 24, cursor, detail, 30 if not compact else 28, 'muted', 600, width=w - 48, max_lines=3)
        if cursor > y + h - 8:
            raise ValueError(f'{self.spec["id"]}: text exceeds node box: {node}')

    def note(self, text, y=None):
        if text:
            lines = textwrap.wrap(text, int(1450 / (28 * .54)), break_long_words=False, break_on_hyphens=False)
            baseline = min(y or self.height, self.height - 18 - max(0, len(lines) - 1) * 28 * 1.18)
            self.text(800, baseline, text, 28, 'muted', 600, 'middle', width=1450, max_lines=2)

    def serialize(self):
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(self.root, encoding='unicode') + '\n'

def timeline(v):
    d = Drawing(v, 520)
    nodes = v['nodes']
    years = [float(n['year']) for n in nodes]
    start, end = v.get('axis', [min(years), max(years)])
    assert end > start and years == sorted(years)
    d.line(90, 257, 1520, 257, 'muted', width=5)
    for year in range(math.ceil(start), math.floor(end) + 1):
        x = 120 + (year - start) / (end - start) * 1360
        d.line(x, 249, x, 265, 'muted', width=2)
    card_width = 290 if len(nodes) >= 5 else 330
    for i, n in enumerate(nodes):
        x = 120 + (float(n['year']) - start) / (end - start) * 1360
        center = min(max(x, card_width / 2 + 22), 1578 - card_width / 2)
        top = i % 2 == 0
        y = 18 if top else 302
        tone = 'teal' if n.get('tone') in ('government', 'official', 'formal', 'Government') else 'blue'
        d.path(f'M{x} 257 V{220 if top else 282} H{center} V{202 if top else 302}', tone)
        d.add('circle', cx=x, cy=257, r=10, fill=COLORS[tone], stroke=COLORS['white'], stroke_width=4)
        d.text(center, y + 42, n['label'], 44, tone, 750, 'middle')
        cursor = d.text(center, y + 88, n.get('title', ''), 34, 'navy', 700, 'middle', width=card_width, max_lines=2) + 38
        if n.get('detail'):
            d.text(center, cursor, n['detail'], 28, 'muted', 600, 'middle', width=card_width, max_lines=2)
    return d

def flow(v):
    d = Drawing(v, 490)
    nodes = v['nodes']; count = len(nodes)
    assert 2 <= count <= 5
    gap = 54; width = (1480 - gap * (count - 1)) / count
    for i, n in enumerate(nodes):
        x = 60 + i * (width + gap)
        if i < count - 1:
            d.line(x + width + 6, 238, x + width + gap - 10, 238, arrow=True)
        d.box(x, 105, width, 282, n, compact=count >= 4)
    d.note(v.get('note'))
    return d

def loop(v):
    d = Drawing(v, 520)
    assert len(v['nodes']) == 4
    positions = [(55, 18), (945, 18), (945, 330), (55, 330)]
    d.line(665, 100, 935, 100, arrow=True)
    d.line(1250, 188, 1250, 320, arrow=True)
    d.line(935, 412, 675, 412, arrow=True)
    d.line(360, 320, 360, 198, arrow=True)
    for (x, y), n in zip(positions, v['nodes']):
        d.box(x, y, 600, 170, n, compact=True)
    d.text(800, 263, v.get('center', ''), 38, 'navy', 700, 'middle', width=950, max_lines=2)
    return d

def planning(v):
    d = Drawing(v, 570)
    assert len(v['nodes']) == 5
    state, resources, improvement, implementation, scope = v['nodes']
    d.rect(20, 8, 1560, 548, 'white', 'blue', 22, '12 8')
    label = ' · '.join(filter(None, [scope.get('label'), scope.get('title')]))
    d.text(60, 53, label, 36, 'blue', 700, width=1450, max_lines=1)
    # A common bus expresses dependencies, not a mandatory activity sequence.
    d.path('M425 239 V287 H1175 V239')
    d.line(800, 287, 800, 330)
    d.path('M425 360 V330 H1175 V360')
    d.line(425, 330, 425, 355, arrow=True)
    d.line(1175, 330, 1175, 355, arrow=True)
    for x, y, n in [(70, 88, state), (820, 88, resources), (70, 365, improvement), (820, 365, implementation)]:
        d.box(x, y, 710, 150 if not n.get('detail') else 178, n, compact=True)
    return d

def boundary(v):
    d = Drawing(v, 540)
    ru = v.get('lang') == 'ru'
    d.rect(35, 25, 970, 365, 'white', 'blue', 22, '13 7')
    d.text(70, 82, v.get('title', 'Importer 2.0'), 43, 'blue', 700)
    components = v['components']
    width = 860 / len(components)
    for i, label in enumerate(components):
        x = 80 + width * i
        d.rect(x, 155, width - 22, 150, 'soft')
        d.text(x + (width - 22) / 2, 214, label, 35, 'navy', 700, 'middle', width=width - 55, max_lines=3)
    for i, label in enumerate(v['context']):
        y = 50 + i * 115
        d.rect(1120, y, 440, 88, 'soft')
        d.text(1340, y + 54, label, 34, 'navy', 650, 'middle', width=410, max_lines=1)
        d.line(1110, y + 44, 1015, y + 44, arrow=True)
    d.rect(35, 421, 1530, 95, 'white', 'amber', 14, '8 7')
    d.text(67, 460, v['exclusion'], 30, 'amber', 650, width=1470, max_lines=2)
    return d

def bars(v):
    d = Drawing(v, 520)
    values = [n['value'] for n in v['nodes']]
    assert len(values) == 3 and all(isinstance(n, (int, float)) and n >= 0 for n in values)
    assert sum(values) == v['total'], 'Resource totals do not add up'
    max_value = max(values); origin = 435; span = 930
    ru = v.get('lang') == 'ru'
    d.text(1540, 48, f'{v["total"]} ' + ('чел.-ч всего' if ru else 'person-hours total'), 40, 'navy', 750, 'end')
    for tick in [0, 12, 24, 36, 48, 60]:
        x = origin + span * tick / max_value
        d.line(x, 78, x, 437, 'muted' if tick == 0 else 'blue', width=1)
        d.text(x, 481, tick, 27, 'muted', 600, 'middle')
    for i, n in enumerate(v['nodes']):
        y = 97 + i * 119
        d.text(32, y + 40, n['label'], 36, 'navy', 700, width=375, max_lines=2)
        width = span * n['value'] / max_value
        bar = d.rect(origin, y, width, 68, ['blue', 'teal', 'navy'][i], radius=8)
        bar.set('data-value', str(n['value']))
        d.text(origin + width + 24, y + 46, f'{n["value"]} h' if not ru else str(n['value']), 40, 'navy', 750)
    return d

def roadmap(v):
    d = Drawing(v, 500)
    assert len(v['nodes']) == 3
    for i, n in enumerate(v['nodes']):
        x = 45 + i * 510
        d.line(x, 88, x + 495, 88, 'teal' if i == 2 else 'blue', arrow=i < 2, width=6)
        d.add('circle', cx=x + 10, cy=88, r=13, fill=COLORS['teal' if i == 2 else 'blue'])
        d.box(x, 143, 470, 280, n, 'teal' if i == 2 else 'blue')
    d.note(v.get('note'))
    return d

def crosswalk(v):
    d = Drawing(v, 510)
    for i, row in enumerate(v['rows']):
        y = 34 + i * 217
        d.box(40, y, 420, 162, {'label': row['left']}, compact=True)
        d.box(1140, y, 420, 162, {'label': row['right']}, 'teal', compact=True)
        d.line(470, y + 80, 1130, y + 80, 'muted', dash='10 9', width=3)
        d.rect(540, y + 8, 520, 138, 'white', 'line')
        d.text(800, y + 51, row['bridge'], 34, 'navy', 700, 'middle', width=480, max_lines=2)
        d.text(800, y + 125, 'Частичное пересечение' if v.get('lang') == 'ru' else 'Partial overlap', 27, 'teal', 700, 'middle')
    d.note(v.get('note'), 492)
    return d

def editions(v):
    d = Drawing(v, 515)
    assert len(v['nodes']) == 2
    for i, n in enumerate(v['nodes']):
        x = 45 if i == 0 else 870
        d.rect(x, 28, 685, 444, 'white', 'blue' if i == 0 else 'teal', 14)
        d.path(f'M{x+600} 28 V110 H{x+685}', 'blue' if i == 0 else 'teal')
        d.text(x + 38, 116, n['label'], 68, 'blue' if i == 0 else 'teal', 750)
        d.text(x + 38, 208, n.get('title', ''), 42, 'navy', 700, width=600, max_lines=2)
        d.rect(x + 25, 325, 635, 118, 'soft')
        d.text(x + 48, 370, n.get('detail', ''), 33, 'navy', 650, width=580, max_lines=2)
    d.text(800, 233, '≠', 64, 'muted', 650, 'middle')
    d.note(v.get('note'), 510)
    return d

def release(v):
    d = Drawing(v, 475)
    assert len(v['nodes']) == 5
    for i, n in enumerate(v['nodes']):
        x = 35 + 312 * i
        if i < 4:
            interrupted = v.get('gap') and i == 2
            d.line(x + 268, 244, x + 300, 244, 'amber' if interrupted else 'blue', arrow=True, dash='5 5' if interrupted else None)
        d.box(x, 130, 267, 225, n, 'amber' if v.get('gap') and i >= 3 else 'blue', compact=True)
    if v.get('gap'):
        d.text(1160, 76, 'Owner? Capacity? Evidence?', 37, 'amber', 700, 'middle')
        d.path('M989 94 H1485 V115', 'amber', dash='10 7')
    d.note(v.get('note'), 431)
    return d

RENDERERS = {f.__name__: f for f in [timeline, flow, loop, planning, boundary, bars, roadmap, crosswalk, editions, release]}

def render(v):
    assert v['kind'] in RENDERERS, f'Unknown visual kind: {v["kind"]}'
    result = RENDERERS[v['kind']](v).serialize()
    tree = ET.fromstring(result)
    assert not any(n.tag.rsplit('}', 1)[-1] in {'script', 'image', 'foreignObject', 'a'} for n in tree.iter())
    assert not any(k.lower().startswith('on') for n in tree.iter() for k in n.attrib)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify all generated SVG files without modifying them')
    args = parser.parse_args()
    entries = catalogue()
    if not args.check:
        OUT.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        target = OUT / (entry['id'] + '.svg')
        output = render(entry)
        if args.check:
            assert target.read_text(encoding='utf-8') == output, f'Stale visual: {target.name}'
        else:
            target.write_text(output, encoding='utf-8', newline='\n')
    print(json.dumps({'figures': len(entries), 'languages': sorted({v.get('lang', 'en') for v in entries}), 'checked_only': args.check}))

if __name__ == '__main__':
    main()
