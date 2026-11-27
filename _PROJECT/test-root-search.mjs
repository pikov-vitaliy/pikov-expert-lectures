// Поиск по каталогу главной: контрольные запросы на обоих языках, быстрые темы,
// поле kind и чистота словаря. Движок вырезается из index.html по маркерам
// search-engine:start/end и выполняется в vm вместе с массивами каталога.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { classifyMaterial } from './new-site-catalogue.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function literal(name) {
  const match = html.match(new RegExp(`^const ${name} = (\\[[\\s\\S]*?^\\]);`, 'm'));
  assert.ok(match, `${name} declaration`);
  return match[1];
}
const engineSource = html.slice(html.indexOf('/* search-engine:start */'), html.indexOf('/* search-engine:end */'));
assert.ok(engineSource.includes('function createCatalogSearch'), 'engine markers');

const context = vm.createContext({});
vm.runInContext(`
  const LECTURES = ${literal('LECTURES')};
  const SEARCH_SYNONYMS = ${literal('SEARCH_SYNONYMS')};
  const QUICK_TOPICS = ${literal('QUICK_TOPICS')};
  ${engineSource}
  globalThis.api = { LECTURES, SEARCH_SYNONYMS, QUICK_TOPICS, engine: createCatalogSearch(LECTURES, SEARCH_SYNONYMS) };
`, context, { timeout: 2000 });
const { LECTURES, SEARCH_SYNONYMS, QUICK_TOPICS, engine } = context.api;

const short = url => url.replace('https://', '').replace('.pikov.expert', '').replace(/\/$/, '');
const found = (query, kind = '') => Array.from(engine.search(query, kind).results, r => short(r.item.url)).sort();

test('every card carries the material kind used by /new/ and only known tags', () => {
  assert.equal(LECTURES.length, 46);
  const tags = new Set(SEARCH_SYNONYMS.filter(g => g.tag).map(g => g.tag));
  for (const item of LECTURES) {
    const { kind, ...rest } = item;
    assert.equal(kind, classifyMaterial(rest), short(item.url));
    for (const tag of item.tags || []) assert.ok(tags.has(tag), `${short(item.url)}: unknown tag ${tag}`);
  }
  assert.deepEqual(Array.from(LECTURES.filter(l => (l.tags || []).includes('ai')), l => short(l.url)).sort(),
    ['kamaz-ai', 'neural-network-digit-recognition', 'rubin']);
});

test('control queries give the same result on both languages', () => {
  const ai = ['kamaz-ai', 'neural-network-digit-recognition', 'rubin'];
  for (const q of ['ИИ', 'ии', 'AI', 'ai', 'нейросеть', 'LLM', 'искусственный интеллект', 'artificial intelligence']) assert.deepEqual(found(q), ai, q);
  assert.deepEqual(found('ии для инженеров'), ['kamaz-ai']);
  for (const q of ['Рубин', 'rubin']) assert.deepEqual(found(q), ['rubin'], q);
  const fstec = found('ФСТЭК');
  assert.equal(fstec.length, 11);
  for (const q of ['FSTEC', 'ФСТЭК России', 'FSTEC of Russia']) assert.deepEqual(found(q), fstec, q);
  const astra = found('astra');
  assert.equal(astra.length, 5);
  for (const q of ['астра', 'Astra Linux']) assert.deepEqual(found(q), astra, q);
  const pentest = found('пентест');
  assert.equal(pentest.length, 3);
  for (const q of ['Pentesting', 'тестирование на проникновение']) assert.deepEqual(found(q), pentest, q);
  assert.deepEqual(found('КИИ'), found('CII'));
  assert.equal(found('КИИ').length, 2);
  assert.deepEqual(found('dast'), ['dast'], 'qa-catalogue-completeness expects exactly one card for dast');
  assert.equal(found('xyzzy').length, 0);
  assert.ok(found('ОС').length < 15, 'short word ОС must not match inside other words');
});

test('typing letter by letter narrows without noise', () => {
  assert.equal(engine.search('Р', '').active, false);
  assert.deepEqual(found('Руб'), ['rubin']);
  assert.deepEqual(found('нейр'), ['kamaz-ai', 'neural-network-digit-recognition', 'rubin']);
});

test('kind filter applies with and without a query', () => {
  assert.equal(found('', 'course').length, LECTURES.filter(l => l.kind === 'course').length);
  assert.deepEqual(found('ИИ', 'course'), ['kamaz-ai']);
});

test('quick topics: Russian and English labels find the same non-empty set', () => {
  for (const topic of QUICK_TOPICS) {
    const ru = found(topic.name), en = found(topic.nameEn);
    assert.ok(ru.length > 0, topic.id);
    assert.deepEqual(en, ru, topic.id);
    assert.doesNotMatch(topic.nameEn, /[а-яё]/i, `${topic.id}: Cyrillic in the English label`);
  }
});

test('dictionary hygiene and markup safety', () => {
  for (const group of SEARCH_SYNONYMS) for (const term of group.terms) {
    assert.equal(term, term.toLowerCase(), term);
    for (const word of term.split(/\s+/)) assert.ok(!(/[а-яё]/.test(word) && /[a-z]/.test(word)), `mixed alphabets: ${term}`);
  }
  const block = html.slice(html.indexOf('const SEARCH_SYNONYMS = ['), html.indexOf('/* search-engine:end */'));
  assert.ok(!block.includes('url: "'), 'smoke-check counts url literals');
  assert.equal(found('<img src=x onerror=alert(1)>').length, 0);
});
