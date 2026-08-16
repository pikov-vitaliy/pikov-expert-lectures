import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

// Проверяются файлы, ОТСЛЕЖИВАЕМЫЕ git, а не всё, что лежит в рабочем дереве.
// Так закрыты обе реальные поверхности утечки, и ровно по разу:
//  * этот тест — публичный репозиторий на GitHub;
//  * test-public-release-independence.ps1 — содержимое релизных архивов, то
//    есть то, что реально отдаётся с хостинга.
// Локальные черновики («Промпт для Claude Designer.md», «00_ОПИСАНИЕ_*.md»)
// не входят ни в одну из них, поэтому и не флагуются.
const LECTURE_FOLDERS = new Set(catalog.lectures.map(lecture => lecture.folder));
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0")
  .filter(Boolean);

// Не только index.html: у лекций есть handout.html, practice.html, day-01.html,
// pentest-02.html и раздаваемые материалы в markdown — они тоже публикуются.
const pages = tracked
  .filter(file => /\.(html|md)$/i.test(file))
  .filter(file => {
    const [head] = file.split("/");
    if (file === "index.html" || file === "course-map.html") return true;
    return LECTURE_FOLDERS.has(head);
  })
  .map(file => ({ label: file, file: join(rootDir, file) }))
  .filter(page => existsSync(page.file));

const FORMER_EMPLOYER = /\u041c\u0410\u0421\u041a\u041e\u041c|MASCOM|\u0423\u0426\u0411\u0418|\u041d\u041e\u0423\s+\u0414\u041f\u041e/i;

// Формулировки, в которых Минобороны или военная служба поданы как личные
// регалии автора, а не как предмет лекции.
const PERSONAL_AFFILIATION = [
  { pattern: /(?:награды|звания)[^<]{0,40}Минобороны/i, why: "Минобороны как личная награда автора" },
  { pattern: /Тамбовск\w*\s+военн\w+/i, why: "военный вуз как альма-матер автора" },
  { pattern: /ЦНИИ\s+ВВС/i, why: "прежнее место службы названо прямо" },
  { pattern: /\u044d\u043a\u0441\u043f\u0435\u0440\u0442\s+\u0413\u041a\s+\u00ab?\u041c\u0410\u0421\u041a\u041e\u041c/i, why: "бывший работодатель как текущая должность" },
  { pattern: /(?:\u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c|\u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a|\u044d\u043a\u0441\u043f\u0435\u0440\u0442)\s+\u0423\u0426\s+\u041c\u0410\u0421\u041a\u041e\u041c/i, why: "бывший работодатель как текущая должность" },
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
