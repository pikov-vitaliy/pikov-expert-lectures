import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Сайт — личный проект автора. Бывший работодатель не должен упоминаться нигде,
// а Минобороны допустимо ТОЛЬКО как один из регуляторов в учебном материале —
// никогда как место работы, награда или альма-матер автора.
//
// Проверка намеренно различает эти два случая. Тупой запрет слова «Минобороны»
// на весь файл уже приводил к обратной ошибке: регулятора вырезали из описания
// лекции по сертификации, вокруг которого эта лекция и построена.

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(projectDir);
const catalog = JSON.parse(readFileSync(join(projectDir, "lectures.json"), "utf8"));

const pages = [
  { label: "index.html", file: join(rootDir, "index.html") },
  { label: "course-map.html", file: join(rootDir, "course-map.html") },
  ...[...new Set(catalog.lectures.map(lecture => lecture.folder))]
    .map(folder => ({ label: `${folder}/index.html`, file: join(rootDir, folder, "index.html") })),
].filter(page => existsSync(page.file));

const FORMER_EMPLOYER = /МАСКОМ|MASCOM|УЦБИ|НОУ\s+ДПО/i;

// Формулировки, в которых Минобороны или военная служба поданы как личные
// регалии автора, а не как предмет лекции.
const PERSONAL_AFFILIATION = [
  { pattern: /(?:награды|звания)[^<]{0,40}Минобороны/i, why: "Минобороны как личная награда автора" },
  { pattern: /Тамбовск\w*\s+военн\w+/i, why: "военный вуз как альма-матер автора" },
  { pattern: /ЦНИИ\s+ВВС/i, why: "прежнее место службы названо прямо" },
  { pattern: /эксперт\s+ГК\s+«?МАСКОМ/i, why: "бывший работодатель как текущая должность" },
  { pattern: /(?:преподаватель|сотрудник|эксперт)\s+УЦ\s+МАСКОМ/i, why: "бывший работодатель как текущая должность" },
];

test("published pages carry no former-employer branding", () => {
  assert.ok(pages.length >= 25, `expected the full site, got ${pages.length} pages`);
  const offenders = pages
    .map(page => ({ page: page.label, match: readFileSync(page.file, "utf8").match(FORMER_EMPLOYER) }))
    .filter(entry => entry.match)
    .map(entry => `${entry.page}: ${entry.match[0]}`);
  assert.deepEqual(offenders, [], `former-employer branding still published:\n- ${offenders.join("\n- ")}`);
});

test("Minobороny is never presented as the author's own credential", () => {
  const offenders = [];
  for (const page of pages) {
    const html = readFileSync(page.file, "utf8");
    for (const { pattern, why } of PERSONAL_AFFILIATION) {
      const match = html.match(pattern);
      if (match) offenders.push(`${page.label}: ${why} — "${match[0]}"`);
    }
  }
  assert.deepEqual(offenders, [], `personal affiliation claims still published:\n- ${offenders.join("\n- ")}`);
});

test("Minobороny survives where it is genuine lecture subject matter", () => {
  // Обратная страховка: если следующая чистка снова пройдётся по всему сайту
  // регуляркой, эти лекции о государственных системах сертификации станут
  // фактически неполными — и тест это заметит.
  const regulatorDecks = ["cert", "lic-tzi", "tzi-dept"];
  for (const folder of regulatorDecks) {
    const file = join(rootDir, folder, "index.html");
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf8");
    assert.match(html, /Минобороны/, `${folder}/index.html must still cover the Ministry of Defence certification system`);
    assert.match(html, /ФСТЭК/, `${folder}/index.html must still cover FSTEC`);
  }
});

test("the root catalogue card matches the deck it links to", () => {
  const root = readFileSync(resolve(rootDir, "index.html"), "utf8");
  const card = root.match(/\{[^{}]*url: "https:\/\/cert\.pikov\.expert\/"[\s\S]*?\},/)?.[0] ?? "";
  assert.ok(card, "cert card not found in the LECTURES array");
  assert.match(card, /Минобороны/, "cert card must name the same regulators as cert/index.html");
  assert.match(card, /Ministry of Defence/, "the English cert card must name the same regulators too");
});
