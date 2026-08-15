import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const deckFile = path.join(root, 'assets', 'day-02-reconstructed-slides.js');
const outputFile = path.join(root, 'materials', 'день-2-веб-слайды-AppSec-SSDLC-и-ИИ.md');

const window = { addEventListener() {} };
const document = { addEventListener() {}, getElementById() { return null; } };
vm.runInNewContext(fs.readFileSync(deckFile, 'utf8'), { window, document, Object, String, Array, Math, Set }, { filename: deckFile });
const { deck, slideNotes, slideCount } = window.AppSecDay02ReconstructedSlides ?? {};
const slides = deck?.blocks?.flatMap((block) => block.slides.map((slide) => ({ ...slide, block })));

// Инвариант качества: колода публикуется только целостной. Проверяем здесь, в
// трекаемом генераторе (а не только в gitignored-тестах), чтобы регресс —
// дубли контента, пропуск заметок, рассинхрон счётчика — валил сборку.
if (!Array.isArray(slides) || slides.length !== slideCount) {
  throw new Error('Число слайдов деки не совпадает со slideCount.');
}
const leads = slides.map((s) => s.lead);
if (new Set(leads).size !== slides.length) {
  throw new Error('Тексты слайдов (lead) должны быть уникальны.');
}
const titles = slides.map((s) => s.title);
if (new Set(titles).size !== slides.length) {
  throw new Error('Заголовки слайдов должны быть уникальны.');
}
for (const slide of slides) {
  const note = slideNotes?.[slide.id];
  if (!note || !note.student || !note.teacher) {
    throw new Error('У слайда ' + slide.id + ' нет индивидуальных заметок слушателю и преподавателю.');
  }
}

const lines = [
  '# День 2 — веб-слайды: AppSec, SSDLC и ИИ',
  '',
  '**Всего:** ' + slideCount + ' HTML-слайдов.',
  '**Статус:** самостоятельная редакторская веб-версия для чтения, показа, поиска и копирования; исходные изображения слайдов и личный сертификат участника в неё не входят.',
  '',
  '> Важно: SSRF — A10:2021 (Server-Side Request Forgery). В OWASP Top 10:2025 A10 посвящена некорректной обработке исключительных ситуаций. Историческая лабораторная тема и актуальная таксономия в этой колоде явно разделены.',
  ''
];

for (const block of deck.blocks) {
  lines.push('## ' + block.label + ' — ' + block.title, '');
  for (const slide of block.slides) {
    lines.push('### ' + String(slide.number).padStart(3, '0') + '. ' + slide.title, '');
    lines.push(slide.lead, '');
    for (const [title, body] of slide.cards) {
      lines.push('- **' + title + '.** ' + body);
    }
    const note = slideNotes[slide.id];
    lines.push(
      '',
      '**Главная мысль.** ' + slide.takeaway,
      '',
      '**Слушателю.** ' + note.student,
      '',
      '**Преподавателю.** ' + note.teacher,
      '',
      '**Основание.** ' + slide.source,
      ''
    );
  }
}

lines.push(
  '## Границы публикации',
  '',
  'Публикуется только авторская текстовая веб-редакция. Рабочие транскрипты, документы подгрупп, изображения слайдов, личный сертификат участника и файловые метаданные не входят в этот Markdown-файл и в публичные ZIP-пакеты.'
);

fs.writeFileSync(outputFile, lines.join('\n') + '\n', 'utf8');
console.log('Сформирован ' + path.relative(root, outputFile) + ': ' + slideCount + ' HTML-слайдов, заметки перенесены.');
