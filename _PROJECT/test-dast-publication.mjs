import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readCatalogue } from './new-site-catalogue.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(resolve(root, file), 'utf8');
const url = 'https://dast.pikov.expert/';

test('DAST is present in the registry, both catalogue designs and both languages', () => {
  const registry = JSON.parse(read('_PROJECT/lectures.json'));
  const entries = registry.lectures.filter(entry => entry.url === url);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].folder, 'dast');
  assert.equal(registry.summary.cards, registry.lectures.length);
  assert.equal(registry.summary.thirdLevelDomains, new Set(registry.lectures.map(x => x.folder)).size);
  const card = readCatalogue(root).lectures.find(item => item.url === url);
  assert.match(card.titleEn, /Dynamic software analysis/);
  for (const page of ['index.html', 'ru/index.html', 'new/index.html', 'new/ru/index.html', 'course-map.html', 'ru/course-map.html', 'sitemap.xml']) {
    assert.ok(read(page).includes(url), page);
  }
});

test('the full lecture retains its content and directly exposes student materials and draft PDF', () => {
  const page = read('dast/index.html');
  for (const id of ['glossary', 'about', 'why', 'standards', 'structure', 'levels', 'tech', 'fuzz', 'aux', 'deploy', 'regular', 'matrix', 'tools', 'people', 'practice', 'remarks', 'sources']) {
    assert.ok(page.includes(`id="${id}"`), id);
  }
  assert.match(page, /Не подлежит применению до утверждения/);
  assert.match(page, /Пиков Виталий Александрович/);
  assert.match(page, /href="downloads\/dynamic-analysis-national-standard-draft\.pdf" download/);
  assert.match(page, /href="downloads\/my-first-python-project-v02\.zip" download/);
  for (const name of ['aflpp_fuzzing_windows10_student', 'libfuzzer_main_cpp_student', 'fuzzing_bug_fix_demo']) {
    assert.ok(page.includes(`href="practice/${name}.html"`));
    for (const ext of ['pdf', 'md']) assert.ok(existsSync(resolve(root, `dast/downloads/${name}.${ext}`)));
  }
  const controls = read('dast/.htaccess');
  assert.match(controls, /frame-ancestors 'self'/);
  assert.match(controls, /X-Frame-Options "SAMEORIGIN"/);
  assert.doesNotMatch(controls, /unsafe-eval/);
});

test('the downloadable standard is the reviewed source PDF, not the lecture printout', () => {
  const pdf = readFileSync(resolve(root, 'dast/downloads/dynamic-analysis-national-standard-draft.pdf'));
  const manifest = JSON.parse(read('dast/_build/publication-sources.json'));
  assert.equal(createHash('sha256').update(pdf).digest('hex'), manifest.standardPdfSha256);
  assert.ok(pdf.subarray(0, 5).equals(Buffer.from('%PDF-')));
  assert.notEqual(createHash('sha256').update(readFileSync(resolve(root, 'dast/downloads/pns-dynamic-analysis.pdf'))).digest('hex'), manifest.standardPdfSha256);
});

test('the student ZIP is reproducible and excludes repository history and executable binaries', () => {
  const script = String.raw`
from pathlib import Path
import hashlib, subprocess, zipfile
p=Path('dast/downloads/my-first-python-project-v02.zip')
subprocess.run(['python','-X','utf8','dast/_build/build-package.py'],check=True)
before=p.read_bytes()
subprocess.run(['python','-X','utf8','dast/_build/build-package.py'],check=True)
assert p.read_bytes()==before
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 names=z.namelist()
 assert len(names)==len(set(names))
 assert all(not n.startswith('/') and '..' not in n.split('/') and not any(x.startswith('.') for x in n.split('/')) for n in names)
 assert all(not z.read(n).startswith((b'\x7fELF',b'MZ')) for n in names)
 for n in ['src/main.cpp','src/main_libfuzzer.cpp','in/seed1','README.md','aflpp_fuzzing_windows10_student.html','libfuzzer_main_cpp_student.pdf']:
  assert 'my-first-python-project/'+n in names
 assert all('mc.yandex' not in z.read(n).decode('utf-8') for n in names if n.endswith('.html'))
`;
  const result = spawnSync('python', ['-X', 'utf8', '-c', script], {cwd:root, encoding:'utf8', windowsHide:true});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
