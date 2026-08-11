/*
 * Генерирует текстовую версию колоды первого дня из самой колоды.
 *
 * Раньше этот Markdown вели руками, и он разъезжался с декой при каждом
 * изменении состава слайдов. Теперь единственный источник правды —
 * assets/day-01-reconstructed-slides.js: файл собирается из него целиком,
 * включая заметки слушателю и преподавателю.
 *
 * Запуск:  node _build/build-slides-markdown.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deckPath = resolve(siteRoot, 'assets/day-01-reconstructed-slides.js');
const outPath = resolve(siteRoot, 'materials/день-1-слайды-AppSec-OWASP-и-ИИ.md');

const src = readFileSync(deckPath, 'utf8');

// Колода — самодостаточный IIFE, который публикует себя в window. Исполняем его
// в минимальном поддельном DOM: сборка не должна тянуть браузер ради данных.
const win = { addEventListener() {} };
const doc = {
  addEventListener() {},
  getElementById: () => null,
  head: { append() {} },
  createElement: () => ({ setAttribute() {}, append() {}, style: { setProperty() {} } }),
};
new Function('window', 'document', src)(win, doc);
const { deck, slideCount } = win.AppSecDay01ReconstructedSlides;

// slideNotes намеренно не экспортируется наружу — забираем литерал из исходника.
const notesStart = src.indexOf('const slideNotes = {');
const notesEnd = src.indexOf('\n  };', notesStart);
const notes = new Function(`${src.slice(notesStart, notesEnd + 5)}\nreturn slideNotes;`)();

const lines = [
  '# Слайды первого дня: AppSec, OWASP и безопасность ИИ',
  '',
  '> Текстовая версия учебной колоды по результатам первого дня программы',
  '> АО «Лаборатория Касперского» «Образовательная лаборатория Kaspersky Academy |',
  '> Безопасность приложений», 11 августа 2026 года. Основной блок дня вёл',
  '> Дмитрий Павлухин, архитектор по информационной безопасности.',
  '>',
  `> Всего ${slideCount} слайда в ${deck.blocks.length} тематических блоках. У каждого слайда`,
  '> приведены пояснение слушателю и заметка преподавателю — те же, что показаны',
  '> под слайдом на сайте.',
  '>',
  '> Файл собирается автоматически из `assets/day-01-reconstructed-slides.js`',
  '> командой `node _build/build-slides-markdown.mjs`. Править его руками не нужно:',
  '> изменения вносятся в колоду.',
  '>',
  '> Лицензия: CC BY 4.0. Источник:',
  '> <https://appsec-lections.pikov.expert/slides-day-01.html>',
  '',
];

let n = 0;
for (const block of deck.blocks) {
  lines.push('---', '', `## ${block.label} — ${block.title}`, '');
  if (block.source) lines.push(`Основание: вычищенная стенограмма, ${block.source}.`, '');

  for (const slide of block.slides) {
    n += 1;
    lines.push(`### ${String(n).padStart(2, '0')}. ${slide.title}`, '', slide.lead, '');

    if (slide.cards) {
      for (const [title, body] of slide.cards) lines.push(`- **${title}.** ${body}`);
      lines.push('');
    }
    if (slide.steps) {
      for (const [indexLabel, title, maybeBody] of slide.steps) {
        const body = maybeBody === undefined ? title : maybeBody;
        const heading = maybeBody === undefined ? `Шаг ${indexLabel}` : title;
        lines.push(`${indexLabel}. **${heading}.** ${body}`);
      }
      lines.push('');
    }

    lines.push(`**Главная мысль.** ${slide.takeaway}`, '');

    const note = notes[slide.id];
    if (note?.student) lines.push(`> **Слушателю.** ${note.student}`, '>');
    if (note?.teacher) lines.push(`> **Преподавателю.** ${note.teacher}`);
    if (note?.student || note?.teacher) lines.push('');

    lines.push(`<sub>Основание: вычищенная стенограмма, ${slide.source}.</sub>`, '');
  }
}

writeFileSync(outPath, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`, 'utf8');
console.log(`BUILT ${outPath} — ${n} слайдов, ${deck.blocks.length} блоков`);
