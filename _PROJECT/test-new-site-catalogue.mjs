import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CATEGORY_ORDER, MATERIAL_KINDS, parseCatalogue, readCatalogue, validateCatalogue } from './new-site-catalogue.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'index.html'), 'utf8');
const actual = readCatalogue(root);
const fixture = () => ({
  categories: [{ id: 'rbpo', name: 'Разработка', nameEn: 'Development' }],
  lectures: [{
    category: 'rbpo', url: 'https://example.test/#one', title: 'Лекция', titleEn: 'Lecture',
    description: 'Описание', descriptionEn: 'Description', format: 'Лекция', formatEn: 'Lecture',
  }],
});
const fixtureHtml = value => `<script>\nconst CATEGORIES = ${JSON.stringify(value.categories, null, 2)};\nconst LECTURES = ${JSON.stringify(value.lectures, null, 2)};\nthrow new Error('Page scripts must not run');\n</script>`;

test('all source URLs match the independent registry, including course anchors', () => {
  const registry = JSON.parse(readFileSync(resolve(root, '_PROJECT', 'lectures.json'), 'utf8'));
  assert.equal(actual.lectures.length, registry.summary.cards);
  assert.equal(actual.lectures.length, 34);
  assert.deepEqual(actual.lectures.map(item => item.url).sort(), registry.lectures.map(item => item.url).sort());
  assert.equal(new Set(actual.lectures.map(item => item.url)).size, actual.lectures.length);
  assert.deepEqual(actual.categories.map(category => category.id), CATEGORY_ORDER);
});

test('every original source field is preserved while kind is added', () => {
  // The known source fields are separately extracted as string literals, without
  // using the reader or evaluating any JavaScript. Descriptions may contain quotes.
  const lectureBlock = source.split('const LECTURES = [')[1].split('\n];')[0];
  for (const field of ['category', 'url', 'title', 'titleEn', 'description', 'descriptionEn', 'format', 'formatEn']) {
    const literals = [...lectureBlock.matchAll(new RegExp(`\\b${field}: ("(?:[^"\\\\]|\\\\.)*")`, 'g'))]
      .map(match => JSON.parse(match[1]));
    assert.equal(literals.length, actual.lectures.length, field);
    assert.deepEqual(actual.lectures.map(item => item[field]), literals, field);
  }
  assert.equal(actual.lectures.find(item => item.url === 'https://main-rbpo.pikov.expert/').featured, true);
});

test('real formats distinguish lectures, programmes, workshops and references', () => {
  const kindAt = url => actual.lectures.find(item => item.url === url).kind;
  assert.equal(kindAt('https://main-rbpo.pikov.expert/'), 'lecture');
  assert.equal(kindAt('https://astra-hardening.pikov.expert/'), 'practice');
  assert.equal(kindAt('https://appsec-lections.pikov.expert/practice.html'), 'practice');
  assert.equal(kindAt('https://new-courses.pikov.expert/#fuzzing'), 'course');
  assert.equal(kindAt('https://spdx.pikov.expert/'), 'reference');
  assert.ok(actual.lectures.every(item => MATERIAL_KINDS.includes(item.kind)));
});

test('a missing translation fails before a mixed-language page can be generated', () => {
  for (const field of ['title', 'titleEn', 'description', 'descriptionEn', 'format', 'formatEn']) {
    const value = fixture();
    delete value.lectures[0][field];
    assert.throws(() => validateCatalogue(value), new RegExp(`missing or empty ${field}`));
  }
  const value = fixture();
  value.categories[0].nameEn = ' ';
  assert.throws(() => validateCatalogue(value), /missing or empty nameEn/);
});

test('duplicate URLs fail, but different anchors remain distinct materials', () => {
  const value = fixture();
  value.lectures.push({ ...value.lectures[0] });
  assert.throws(() => validateCatalogue(value), /Duplicate material URL/);
  value.lectures[1].url = 'https://example.test/#two';
  assert.doesNotThrow(() => validateCatalogue(value));
});

test('unsupported categories and formats cannot silently disappear from filters', () => {
  const value = fixture();
  value.lectures[0].category = 'unknown';
  assert.throws(() => validateCatalogue(value), /unsupported category unknown/);
  value.categories.push({ id: 'unknown', name: 'Другое', nameEn: 'Other' });
  assert.throws(() => validateCatalogue(value), /Unsupported category: unknown/);
  const unclassified = fixture();
  unclassified.lectures[0].formatEn = 'Institution name';
  assert.throws(() => parseCatalogue(fixtureHtml(unclassified)), /Unclassified material format/);
});

test('reader evaluates only the two known catalogue literals', () => {
  assert.equal(parseCatalogue(fixtureHtml(fixture())).lectures[0].titleEn, 'Lecture');
  assert.throws(() => parseCatalogue('const LECTURES = [];'), /Expected one CATEGORIES/);
  assert.throws(() => parseCatalogue(fixtureHtml(fixture()) + fixtureHtml(fixture())), /Expected one CATEGORIES/);
});

test('non-HTTPS and credential-bearing links are rejected', () => {
  for (const url of ['javascript:alert(1)', 'http://example.test/', 'https://user:secret@example.test/']) {
    const value = fixture();
    value.lectures[0].url = url;
    assert.throws(() => validateCatalogue(value), /expected a public HTTPS URL/);
  }
});
