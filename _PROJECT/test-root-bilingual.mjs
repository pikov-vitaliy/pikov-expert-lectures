import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectDir = dirname(fileURLToPath(import.meta.url));
const root = readFileSync(resolve(projectDir, "..", "index.html"), "utf8");

// Последний <script> корневой страницы — данные каталога и вся его логика.
const scripts = [...root.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]);
const catalogScript = scripts.find(source => source.includes("const LECTURES = ["));
assert.ok(catalogScript, "root index no longer contains the LECTURES catalogue script");

function evaluateLiteral(name) {
  const start = catalogScript.indexOf(`const ${name} = [`);
  assert.ok(start >= 0, `${name} array is missing`);
  const open = catalogScript.indexOf("[", start);
  const end = catalogScript.indexOf("\n];", open);
  assert.ok(end > open, `${name} array is not terminated by a line-leading "];"`);
  return vm.runInNewContext(catalogScript.slice(open, end + 2));
}

const CATEGORIES = evaluateLiteral("CATEGORIES");
const LECTURES = evaluateLiteral("LECTURES");

test("the catalogue script parses as valid JavaScript", () => {
  assert.doesNotThrow(() => new vm.Script(catalogScript));
});

test("the requested route is the durable language source of truth", () => {
  const boot = scripts.find(source => source.includes("document.documentElement.dataset.lang"));
  assert.ok(boot, "missing the early language bootstrap script");
  assert.match(boot, /pathLang[^\n]+\? "ru" : "en"/, "the root path must default to English and /ru/ to Russian");
  assert.doesNotMatch(root, /localStorage\.(?:getItem|setItem)\("lang"\)/, "language storage must not override a durable route");
  assert.match(boot, /lang=\(ru\|en\)/, "?lang= must be able to force a language");
  // Бутстрап обязан стоять в <head>: иначе русский текст успеет отрисоваться.
  assert.ok(root.indexOf(boot) < root.indexOf("</head>"), "language bootstrap must run before <body>");
});

test("every catalogue section carries an English name", () => {
  for (const category of CATEGORIES) {
    assert.ok(category.nameEn, `category ${category.id} has no nameEn`);
    assert.notEqual(category.nameEn, category.name, `category ${category.id} nameEn is untranslated`);
  }
});

test("every lecture carries an English title, label and description", () => {
  assert.ok(LECTURES.length >= 33, `expected the full catalogue, got ${LECTURES.length}`);
  for (const lecture of LECTURES) {
    assert.ok(lecture.titleEn, `no titleEn for ${lecture.url}`);
    assert.ok(lecture.formatEn, `no formatEn for ${lecture.url}`);
    assert.ok(lecture.descriptionEn, `no descriptionEn for ${lecture.url}`);
    assert.ok(
      CATEGORIES.some(category => category.id === lecture.category),
      `lecture ${lecture.url} points at unknown category ${lecture.category}`,
    );
  }
});

test("English catalogue copy carries no untranslated Cyrillic", () => {
  const cyrillic = /[Ѐ-ӿ]/;
  for (const category of CATEGORIES) {
    assert.doesNotMatch(category.nameEn, cyrillic, `category ${category.id} nameEn still has Cyrillic`);
  }
  for (const lecture of LECTURES) {
    for (const field of ["titleEn", "formatEn", "descriptionEn"]) {
      assert.doesNotMatch(lecture[field], cyrillic, `${lecture.url} ${field} still has Cyrillic: ${lecture[field]}`);
    }
  }
});

test("English copy uses the agreed rendering of Russian regulatory terms", () => {
  const english = LECTURES.map(lecture => `${lecture.titleEn} ${lecture.descriptionEn}`).join(" ");
  // Номера стандартов не переводятся, но пишутся латиницей.
  assert.match(english, /GOST R 56939-2024/);
  assert.match(english, /FSTEC/);
  assert.doesNotMatch(english, /\bГОСТ\b|\bФСТЭК\b/);
  // Аббревиатуры, непонятные без расшифровки, должны быть раскрыты хотя бы раз.
  assert.match(english, /critical information infrastructure \(CII\)/);
  assert.match(english, /federal technical and export control service/i);
});

test("both UI dictionaries expose the same keys", () => {
  const uiStart = catalogScript.indexOf("const UI = {");
  const uiSource = catalogScript.slice(uiStart, catalogScript.indexOf("\n};", uiStart) + 3);
  const pluralStart = catalogScript.indexOf("function plural(");
  const pluralSource = catalogScript.slice(pluralStart, catalogScript.indexOf("\n}", pluralStart) + 2);
  assert.ok(pluralStart > 0, "the shared plural() helper is missing");
  const ui = vm.runInNewContext(`${pluralSource}\n${uiSource}\nUI;`);
  const ruKeys = Object.keys(ui.ru).sort();
  const enKeys = Object.keys(ui.en).sort();
  assert.deepEqual(enKeys, ruKeys, "UI.ru and UI.en must define the same strings");
  for (const key of ruKeys) {
    assert.equal(typeof ui.en[key], typeof ui.ru[key], `UI.${key} differs in type between languages`);
  }
  assert.equal(ui.en.materials(1), "material");
  assert.equal(ui.en.materials(5), "materials");
  assert.equal(ui.ru.materials(1), "материал");
  assert.equal(ui.ru.materials(3), "материала");
  assert.equal(ui.ru.materials(12), "материалов");
});

test("head declares both languages for search engines", () => {
  assert.match(root, /<html lang="en" data-lang="en">/);
  assert.match(root, /<link rel="alternate" hreflang="en" href="https:\/\/pikov\.expert\/">/);
  assert.match(root, /<link rel="alternate" hreflang="ru" href="https:\/\/pikov\.expert\/ru\/">/);
  assert.match(root, /<link rel="alternate" hreflang="x-default" href="https:\/\/pikov\.expert\/">/);
  assert.match(root, /<link rel="canonical" href="https:\/\/pikov\.expert\/">/);
  assert.match(root, /property="og:locale" content="en_US"/);
  assert.match(root, /property="og:locale:alternate" content="ru_RU"/);
  // Статический canonical описывает английскую версию. Русская имеет
  // отдельный crawlable document /ru/, а legacy ?lang= нормализуется скриптом.
  const catalogue = scripts.find(source => source.includes("applyChromeLanguage"));
  assert.ok(catalogue, "missing the chrome-language routine");
  assert.match(catalogue, /link\[rel="canonical"\]/);
  assert.match(catalogue, /meta\[property="og:url"\]/);
  assert.match(catalogue, /function syncLanguageUrl/);
  assert.match(catalogue, /lang\(\) === "ru" \? "\/ru\/" : "\/"/);
  assert.match(catalogue, /searchParams\.delete\("lang"\)/);
});

test("the English page warns that the courses themselves are in Russian", () => {
  const notice = root.match(/<p class="lang-notice"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  assert.match(notice, /taught and published in Russian/i);
  assert.match(notice, /vitaly@pikov\.expert/);
});

test("the language switch is defined in every theme state", () => {
  const style = root.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  for (const token of ["--lang-bg", "--lang-bg-hover", "--lang-ink", "--lang-ring"]) {
    // :root, :root[data-theme="dark"] и @media (prefers-color-scheme: dark) —
    // пропуск любого из трёх делал бы кнопку невидимой в одном из состояний.
    const definitions = style.match(new RegExp(`${token}\\s*:`, "g")) || [];
    assert.equal(definitions.length, 3, `${token} must be defined in all three theme blocks, found ${definitions.length}`);
  }
  assert.match(style, /:root\[data-lang="en"\] \[data-l="ru"\]\{ display: none !important; \}/);
  assert.match(style, /:root\[data-lang="ru"\] \[data-l="en"\]\{ display: none !important; \}/);
});
