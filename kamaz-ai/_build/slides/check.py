# -*- coding: utf-8 -*-
"""Целостность текста: каждая строка исходной колоды есть на своём слайде, нового текста нет.
python check.py 32 41 ...   (без аргументов – все). Код выхода 1 при ошибках.
"""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
DECKS = os.path.join(HERE, 'decks')
WORK = os.environ.get('SLIDES_WORK', os.path.join(HERE, '_work')).replace('\\', '/').rstrip('/') + '/'


def norm(s):
    s = s.replace('**', '').replace('`', '').replace('\u00a0', ' ')
    return re.sub(r'\s+', ' ', s).strip().lower()


def req_strings(s):
    out = []
    for k in ('title', 'kicker', 'lead', 'meta', 'text', 'src', 'note', 'time', 'code'):
        if k == 'src' and s.get('kind') == 'image':
            continue
        if s.get(k):
            out.append(s[k])
    out += s.get('items', [])
    if s.get('kind') == 'table':
        out += [c for c in s['head'] if c.strip()]
        out += [c for r in s['rows'] for c in r if c.strip()]
    return [norm(x) for x in out]


bad = 0
ids = sys.argv[1:] or ['11', '12', '21', '22', '31', '32', '41', '42', '51', '52']
for i in ids:
    spec = json.load(open(os.path.join(DECKS, f'deck_{i}.json'), encoding='utf-8'))
    vizp = os.path.join(HERE, 'viz', f'deck_{i}.json')
    viz = json.load(open(vizp, encoding='utf-8')) if os.path.exists(vizp) else {}
    sc = json.load(open(glob.glob(os.path.join(WORK, 'd' + i, '*.scene.json'))[0], encoding='utf-8'))
    idx = [sl['src_index'] for sl in sc['slides']]
    if sorted(idx) != list(range(1, len(spec['slides']) + 1)):
        print(i, 'ПОРЯДОК: потеряны или повторены слайды', idx); bad += 1
    for sl in sc['slides']:
        s = spec['slides'][sl['src_index'] - 1]
        drop = set(norm(x) for x in viz.get(str(sl['src_index']), {}).get('drop', []))
        texts = []
        for e in sl['els']:
            if e['t'] == 'text':
                texts.append((e.get('origin', 'src'), norm(' '.join(''.join(r['text'] for r in p) for p in e['paras']) if e.get('font') != 'mono'
                                                       else '\n'.join(''.join(r['text'] for r in p) for p in e['paras']))))
            elif e['t'] == 'table':
                for c in e['head'] + [c for r in e['rows'] for c in r]:
                    texts.append(('src', norm(''.join(r['text'] for r in c))))
        joined = ' ¦ '.join(t for _, t in texts)
        allsrc = norm(' '.join(req_strings(s)))
        vz = viz.get(str(sl['src_index']), {})
        if vz.get('tree'):
            tr = json.load(open(os.path.join(HERE, vz['tree']), encoding='utf-8'))
            tree_txt = [norm(n.get(f, '')) for n in tr['nodes'] for f in ('label', 'sublabel') if n.get(f)]
            for t_ in tree_txt:
                if t_ not in joined:
                    print(i, sl['src_index'], 'ПОТЕРЯН УЗЕЛ СХЕМЫ:', t_); bad += 1
            allsrc += ' ' + ' '.join(tree_txt)
        for r in req_strings(s):
            if r in drop:
                continue
            if s.get('kind') == 'task' and r == norm(s.get('code', '')):
                code_scene = ''.join(t for o, t in texts)
                if norm(r) not in norm(code_scene):
                    print(i, sl['src_index'], 'НЕТ КОДА'); bad += 1
                continue
            if r not in joined:
                # число из таблицы, превращённой в диаграмму, может стоять в другом формате
                if re.fullmatch(r'[\d,.\s−-]+%?', r) and any(r.replace(' ', '') == t.replace(' ', '') for _, t in texts):
                    continue
                print(i, sl['src_index'], 'ПОТЕРЯНО:', r[:90]); bad += 1
        for o, t in texts:
            if not t:
                continue
            if o == 'num':
                if not re.fullmatch(r'[−\-\d,.\s%+×=a-zA-Zа-яА-Я°]{1,16}', t):
                    print(i, sl['src_index'], 'СТРАННОЕ ЧИСЛО:', t); bad += 1
                elif re.search(r'\d', t):
                    core = t.replace('−', '-').rstrip('%').strip()
                    if not (re.fullmatch(r'\d{1,2}', core) or core.lstrip('-') in allsrc.replace('−', '-') or core in allsrc):
                        print(i, sl['src_index'], 'ЧИСЛА НЕТ В ТЕКСТЕ СЛАЙДА:', t); bad += 1
            elif t not in allsrc and norm(t) not in allsrc:
                print(i, sl['src_index'], f'НОВЫЙ ТЕКСТ ({o}):', t[:90]); bad += 1
    print(i, 'проверено', len(sc['slides']), 'слайдов')
print('ОШИБОК', bad)
sys.exit(1 if bad else 0)
