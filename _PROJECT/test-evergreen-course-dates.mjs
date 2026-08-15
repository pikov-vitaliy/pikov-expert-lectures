import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(projectDir, '..');

const lectureFacingFiles = [
  'pentest/index.html',
  'pentest/handout.html',
  'risk/index.html',
  'risk/materials.md',
  'threats-kii/index.html',
  'threats-kii/materials.md',
  '27-07-2026/index.html',
  '27-07-2026/materials/ЧИТАТЬ-ПЕРВЫМ.md',
  '27-07-2026/materials/konspekt.md',
  '27-07-2026/materials/praktikum.md',
  '29-07-2026/index.html',
  '29-07-2026/materials/ЧИТАТЬ-ПЕРВЫМ.md',
  '29-07-2026/materials/ЧИТАТЬ-ПЕРВЫМ-Mac.md',
  '29-07-2026/materials/konspekt.md',
  '29-07-2026/materials/praktikum.md',
  '29-07-2026/code/spravka.md',
  '29-07-2026/code/test_student.py',
  'appsec-lections/index.html',
  'appsec-lections/day-01.html',
  'appsec-lections/day-02.html',
  'appsec-lections/practice.html',
  'appsec-lections/slides-day-01.html',
  'appsec-lections/for-teachers.html',
  'appsec-lections/glossary.html',
  'appsec-lections/materials/день-1-методический-конспект.md',
  'appsec-lections/materials/день-1-слайды-AppSec-OWASP-и-ИИ.md',
  'appsec-lections/materials/каталог-материалов-дня-1.md',
  'appsec-lections/materials/методика-преподавателя-день-1.md',
  'appsec-lections/materials/практикум-безопасность-приложений-методичка.md',
  'appsec-lections/materials/день-2-методический-конспект.md',
  'appsec-lections/materials/день-2-веб-слайды-AppSec-SSDLC-и-ИИ.md',
  'appsec-lections/materials/практикум-день-2-набор-заданий.md',
  'appsec-lections/materials/источники-и-версии-день-2.md',
  'appsec-lections/_build/build-day-02-slides-markdown.mjs',
  'komrad/index.html',
  'komrad/docs/06-sources.md',
];

const sessionDatePatterns = [
  /19\s+мая\s+2026/iu,
  /14\s+августа\s+2026/iu,
  /11\s*[–—-]\s*12\s+августа\s+2026/iu,
  /11\s+августа\s+2026/iu,
  /11\.08\.2026/u,
  /2026-08-11/u,
  /12\s+августа\s+2026/iu,
  /12\.08\.2026/u,
  /2026-08-12/u,
  /13\s+августа\s+2026/iu,
  /13\.08\.2026/u,
  /2026-08-13/u,
  /27\s+июля\s+2026/iu,
  /27\.07\.2026/u,
  /29\s+июля\s+2026/iu,
  /29\.07\.2026/u,
  /2026-07-29/u,
  /дата\s+(?:занятия|проведения|по\s+расписанию)/iu,
  /(?:понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s+\d{1,2}\.\d{1,2}/iu,
  /актуальн\w*\s+на\s+май\s+2026/iu,
  /по\s+состоянию\s+на\s+май\s+2026/iu,
];

function visibleText(relativePath) {
  const source = readFileSync(resolve(repoDir, relativePath), 'utf8');
  if (!relativePath.endsWith('.html')) return source;
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/\s+/gu, ' ');
}

for (const relativePath of lectureFacingFiles) {
  test(`${relativePath} has no session date in lecture-facing content`, () => {
    const text = visibleText(relativePath);
    for (const pattern of sessionDatePatterns) {
      assert.doesNotMatch(text, pattern, `${relativePath} still exposes ${pattern}`);
    }
  });
}

test('Day 1 public handout uses a date-neutral filename in links and package builder', () => {
  const neutralRelative = 'appsec-lections/materials/день-1-методический-конспект.md';
  const datedRelative = 'appsec-lections/materials/2026-08-11-день-1-методический-конспект.md';
  assert.equal(existsSync(resolve(repoDir, neutralRelative)), true, `${neutralRelative} is missing`);
  assert.equal(existsSync(resolve(repoDir, datedRelative)), false, `${datedRelative} must be retired`);

  for (const relativePath of [
    'appsec-lections/day-01.html',
    'appsec-lections/materials/каталог-материалов-дня-1.md',
    'appsec-lections/_build/build-materials-zip.ps1',
  ]) {
    const text = readFileSync(resolve(repoDir, relativePath), 'utf8');
    const searchable = text.replace(/\\u([0-9a-f]{4})/giu, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)));
    assert.doesNotMatch(searchable, /2026-08-11-день-1-методический-конспект\.md/u);
    assert.match(searchable, /день-1-методический-конспект\.md/u);
  }
});

test('archive/provenance retains the AppSec source event date', () => {
  const rights = readFileSync(resolve(repoDir, 'appsec-lections/rights.html'), 'utf8');
  assert.match(rights, /11\s*[–—-]\s*12\s+августа\s+2026/iu);
});

test('Day 2 public provenance registry is date-neutral and repository-relative', () => {
  const text = readFileSync(
    resolve(repoDir, 'appsec-lections/materials/источники-и-версии-день-2.md'),
    'utf8',
  );
  assert.match(text, /\*\*Редакция:\*\*\s*универсальн/iu);
  assert.match(text, /Публичная редакция:\s*универсальн/iu);
  assert.match(text, /Проверяемый корень репозитория:\s*`appsec-lections\/`/iu);
  assert.doesNotMatch(text, /[A-Za-z]:\\/u);
});

test('Astra update lab distinguishes its frozen profile from current vendor state', () => {
  const text = readFileSync(resolve(repoDir, 'astra-intro/materials.md'), 'utf8');
  for (const staleClaim of [
    /На дату курса/iu,
    /На сегодняшнем стенде/iu,
    /показывает актуальную версию/iu,
    /актуальное кумулятивное состояние на дату курса/iu,
  ]) {
    assert.doesNotMatch(text, staleClaim);
  }
  assert.match(text, /зафиксированн[а-яё]* профиль воспроизводимости/iu);
  assert.match(text, /перед каждым проведением/iu);
  assert.match(text, /официальн[а-яё]* источник/iu);
  assert.match(text, /1\.7\.10\.72/u);
});
