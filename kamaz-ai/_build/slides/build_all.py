# -*- coding: utf-8 -*-
"""Сборка колод в рабочую папку: HTML + PPTX + PDF (PowerPoint) + PNG и обзорные листы.
python build_all.py 32 41 ...   (без аргументов – все десять)
"""
import glob, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
DECKS = os.path.join(HERE, 'decks')
R = os.environ.get('COURSE_ROOT', os.path.join(HERE, '..', '..', '_src')).replace('\\', '/').rstrip('/') + '/'
WORK = os.environ.get('SLIDES_WORK', os.path.join(HERE, '_work')).replace('\\', '/').rstrip('/') + '/'
DAYS = {'1': 'День-01-2026-11-16', '2': 'День-02-2026-11-18', '3': 'День-03-2026-11-20', '4': 'День-04-2026-11-23', '5': 'День-05-2026-11-25'}
env = dict(os.environ, PYTHONIOENCODING='utf-8')


def strip_dir_entries(path):
    import zipfile, shutil
    tmp = path + '.tmp'
    with zipfile.ZipFile(path) as zi, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            if it.filename.endswith('/'):
                continue
            zo.writestr(it, zi.read(it.filename))
    shutil.move(tmp, path)


ids = sys.argv[1:] or ['11', '12', '21', '22', '31', '32', '41', '42', '51', '52']
pptxs = []
for i in ids:
    deck = os.path.join(DECKS, f'deck_{i}.json')
    spec = json.load(open(deck, encoding='utf-8'))
    od = os.path.join(WORK, 'd' + i)
    os.makedirs(od, exist_ok=True)
    base = os.path.join(od, spec['file'])
    viz = os.path.join(HERE, 'viz', f'deck_{i}.json')
    r = subprocess.run([sys.executable, os.path.join(HERE, 'engine.py'), deck, viz, R + DAYS[i[0]], base + '.html', base + '.scene.json'],
                       env=env, capture_output=True, text=True, encoding='utf-8')
    print(i, r.stdout.strip().replace('\n', ' | '), r.stderr[-800:])
    if r.returncode:
        continue
    subprocess.run(['node', os.path.join(HERE, 'build_pptx.js'), base + '.scene.json', base + '.pptx'], check=True, capture_output=True)
    strip_dir_entries(base + '.pptx')
    pptxs.append(base + '.pptx')
if pptxs:
    subprocess.run(['pwsh', '-NoProfile', '-File', os.path.join(HERE, 'export_pdf.ps1')] + pptxs, check=True)
for p in pptxs:
    od = os.path.dirname(p)
    for f in glob.glob(os.path.join(od, 'pg-*.png')) + glob.glob(os.path.join(od, 'sheet-*.png')):
        os.remove(f)
    subprocess.run(['pdftoppm', '-png', '-r', '50', p[:-5] + '.pdf', os.path.join(od, 'pg')], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, 'sheet.py'), os.path.join(od, 'pg-*.png'), os.path.join(od, 'sheet'), '12'], env=env, check=True)
