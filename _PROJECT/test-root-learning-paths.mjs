import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const root = readFileSync(resolve(projectDir, '..', 'index.html'), 'utf8');

test('catalog offers three role-based learning paths', () => {
  assert.match(root, /id="learning-paths"/);
  assert.equal((root.match(/class="path-card"/g) || []).length, 3);
  assert.match(root, /Начинающий/);
  assert.match(root, /Администратор[^<]*и специалист по ИБ/);
  assert.match(root, /Разработчик[^<]*DevSecOps/);
});

test('every path states prerequisites, duration, outcome and artifact', () => {
  const cards = [...root.matchAll(/<article class="path-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.match(card, /Предпосылки/);
    assert.match(card, /Длительность/);
    assert.match(card, /Результат/);
    assert.match(card, /Артефакт/);
    assert.match(card, /href="https:\/\//);
  }
});

test('paths use existing course URLs without adding catalog cards', () => {
  assert.match(root, /https:\/\/risk\.pikov\.expert\//);
  assert.match(root, /https:\/\/astra-hardening\.pikov\.expert\//);
  assert.match(root, /https:\/\/appsec-lections\.pikov\.expert\//);
  assert.match(root, /https:\/\/main-rbpo\.pikov\.expert\//);
  assert.match(root, /https:\/\/pentest\.pikov\.expert\//);
  assert.match(root, /const LECTURES = \[/);
});
