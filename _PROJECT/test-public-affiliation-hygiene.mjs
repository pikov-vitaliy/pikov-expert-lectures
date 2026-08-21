import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Сайт — личный проект автора. Бывший работодатель допустим как нейтральный
// учебный пример, но не как автор, правообладатель, владелец ресурса, контакт
// или личная профессиональная аффилиация. Минобороны допустимо ТОЛЬКО как один
// из регуляторов в учебном материале — никогда как место работы, награда или
// альма-матер автора.
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
const ROOT_PUBLIC_FILES = new Set([
  ".htaccess",
  "course-map.html",
  "index.html",
  "photo.jpg",
  "robots.txt",
  "sitemap.xml",
  "yandex_bf73d77ba788688e.html",
]);
const TEXT_EXTENSIONS = new Set([
  ".bat", ".c", ".cmd", ".conf", ".cpp", ".css", ".csv", ".h", ".hpp",
  ".htm", ".html", ".ini", ".js", ".json", ".jsonld", ".mjs", ".md",
  ".markdown", ".ps1", ".py", ".sh", ".sql", ".svg", ".toml", ".txt",
  ".xml", ".yaml", ".yml",
]);
const EXCLUDED_PUBLIC_DIRECTORIES = new Set([
  "release", "source", "tools", "output", "notes", "tests", "test-results",
  "node_modules", ".git", ".codegraph", ".codex", ".claude", ".agents",
  ".gigacode", ".qwen", ".vscode", ".idea", "materials_from_4days",
  "__pycache__", ".pytest_cache", ".ruff_cache", ".mypy_cache", ".venv",
  "venv", "export",
]);
const EXCLUDED_DISTRIBUTABLE_EXTENSIONS = new Set([".pdf", ".pptx", ".docx", ".xlsx", ".eps", ".zip"]);
const FORBIDDEN_HASHES = new Set([
  // Former-employer logos and branded backgrounds already covered by releases.
  "9969676d6bf86f114b1d9b4a06b11d0bf5a7ca319df603d2a3fd494d2ebf1fa2",
  "49137f9ce8b6ddd2806daa1576884e8fd0539bda724eccdf9dc5ac2b979f7d17",
  "3e2297ac5b5d9858e23782b7fe5c7a616d770128df999f3765c8ca67e01c4311",
  "1206d0daa1de064ee881a7f63c05ba824d047e057c423c7e513e863dd64d393c",
  // Retired branded VKR slides 02/50/61 and their thumbnails.
  "284482990cba7f331572ebea2f8a98dde900aa5432c32ab0a7428e83fd33b6d8",
  "053dcabf7cdf2b90c1a17bb8e784622bdfcd9b644a318f9136704d6032b06e14",
  "29903ed8a2fb5d4d2bc2f04cce7e7a0a518efd1aacbbbe8bdafedaf4d1169d63",
  "fd487f72c6b891514fc3a9c371d4b98d170049be57fac7d419befb157fdef68e",
  "ea0e1d060d2fe0e941800a581c6a9a579c7c268eef9dc975edd26690a4bf1ca7",
  "77239f856e1cfe3f8d1d961195655517abe156888ef718858bfb1efe0363252e",
]);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0")
  .filter(Boolean);

function isPublicTracked(file) {
  if (!file.includes("/")) return ROOT_PUBLIC_FILES.has(file);
  const segments = file.split("/");
  const [head] = segments;
  if (head === "ru") return segments.length === 2 && segments[1] === "index.html";
  if (!LECTURE_FOLDERS.has(head)) return false;

  const directorySegments = segments.slice(1, -1);
  if (directorySegments.some(segment => segment.startsWith("_") || EXCLUDED_PUBLIC_DIRECTORIES.has(segment.toLowerCase()))) return false;

  const name = basename(file);
  const lowerName = name.toLowerCase();
  if (name.startsWith("_") || EXCLUDED_DISTRIBUTABLE_EXTENSIONS.has(extname(lowerName))) return false;
  if (lowerName === "readme.md" || lowerName === "source.md" || lowerName.endsWith(".tmp") || lowerName.endsWith(".bak")) return false;
  if (/^00_.*\.md$/i.test(name) || /^img_.*\.jpe?g$/i.test(name)) return false;
  if (segments.length === 2 && lowerName.endsWith(".md") && lowerName !== "materials.md") return false;
  return true;
}

// Все отслеживаемые файлы, которые могут попасть на основной сайт или один из
// канонических поддоменов. _PROJECT, docs, release и локальные черновики сюда
// не входят, поэтому тест не сканирует собственные запрещающие сигнатуры.
const publicTracked = tracked
  .filter(isPublicTracked)
  .map(file => ({ label: file, file: join(rootDir, file) }))
  .filter(entry => existsSync(entry.file));

function hasPublicHtmlPrefix(file) {
  const handle = openSync(file, "r");
  try {
    const probe = Buffer.alloc(4096);
    const bytesRead = readSync(handle, probe, 0, probe.length, 0);
    return /(?:<\?xml\b[^>]*>\s*)?(?:<!doctype\b[^>]*>\s*)?<html\b/iu.test(probe.subarray(0, bytesRead).toString("utf8"));
  } finally {
    closeSync(handle);
  }
}

const publicText = publicTracked
  .map(entry => {
    const extension = extname(entry.label).toLowerCase();
    const isHtml = /\.html?$/i.test(entry.label) || hasPublicHtmlPrefix(entry.file);
    const isKnownText = entry.label === ".htaccess" || TEXT_EXTENSIONS.has(extension);
    if (!isKnownText && !isHtml) return null;
    return { ...entry, isHtml, content: readFileSync(entry.file, "utf8") };
  })
  .filter(Boolean);

// Не только index.html: у лекций есть handout.html, practice.html, day-01.html,
// pentest-02.html, extensionless SPDX XHTML и раздаваемые материалы в Markdown.
const pages = publicText.filter(entry => entry.isHtml || /\.md$/i.test(entry.label));

const FORMER_EMPLOYER_NAME = String.raw`(?:МАСКОМ|MASCOM|МAСCOM|УЦ\s+МАСКОМ)`;
const ROLE_OR_AFFILIATION = String.raw`(?:преподавател\w*|сотрудник\w*|эксперт\w*|лектор\w*|инструктор\w*|работа(?:ю|л|ла|ли)|служи(?:л|ла|ли)|работодатель\w*|место\s+работы|employee|instructor|lecturer|expert|worked|employed|employer|affiliat\w*)`;
const AUTHORSHIP_OR_OWNERSHIP = String.raw`(?:автор\w*|правообладател\w*|владелец\w*|подготовлен\w*|разработан\w*|создан\w*|©|copyright|authored|prepared|developed|created|owned)`;
const PUBLIC_RESOURCE = String.raw`(?:курс\p{L}*|лекци\p{L}*|материал\p{L}*|сайт\p{L}*|course|lecture|training\s+materials?|website)`;
const RESOURCE_CONNECTOR = String.raw`(?:компани(?:и|я)|by|of)`;
const OWNERSHIP_RELATION = String.raw`(?:принадлежит|относится\s+к|belongs\s+to|owned\s+by)`;
const CLAUSE_GAP = String.raw`[^.!?;]{0,100}`;
const FORBIDDEN_FORMER_EMPLOYER_CLAIMS = [
  { pattern: new RegExp(`${ROLE_OR_AFFILIATION}${CLAUSE_GAP}${FORMER_EMPLOYER_NAME}`, "iu"), why: "personal role or affiliation" },
  { pattern: new RegExp(`${AUTHORSHIP_OR_OWNERSHIP}${CLAUSE_GAP}(?:by\\s+)?${FORMER_EMPLOYER_NAME}`, "iu"), why: "authorship or ownership" },
  { pattern: new RegExp(`${FORMER_EMPLOYER_NAME}[^.!?;]{0,60}(?:работодатель\\w*|место\\s+работы|автор\\w*|правообладател\\w*|владелец\\w*|employer|author|owner|copyright\\s+holder)`, "iu"), why: "reverse attribution claim" },
  { pattern: new RegExp(`(?:логотип\\w*|фирменн\\w*\\s+стил\\w*|брендирован\\w*|official\\s+(?:course|lecture|material)|logo|branding)${CLAUSE_GAP}${FORMER_EMPLOYER_NAME}`, "iu"), why: "branding claim" },
  { pattern: new RegExp(`${PUBLIC_RESOURCE}(?:\\s+${RESOURCE_CONNECTOR})?\\s+${FORMER_EMPLOYER_NAME}`, "iu"), why: "resource attributed to former employer" },
  { pattern: new RegExp(`${FORMER_EMPLOYER_NAME}(?:'s)?\\s+${PUBLIC_RESOURCE}`, "iu"), why: "former-employer resource label" },
  { pattern: new RegExp(`${PUBLIC_RESOURCE}[^.!?;]{0,50}${OWNERSHIP_RELATION}[^.!?;]{0,20}${FORMER_EMPLOYER_NAME}`, "iu"), why: "resource ownership claim" },
  { pattern: /(?:УЦБИ|НОУ\s+ДПО|Старокалужское\s+шоссе|280-01-06)/iu, why: "retired contact or legal identity" },
];

function findForbiddenFormerEmployerClaim(content) {
  const normalized = content.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ");
  for (const rule of FORBIDDEN_FORMER_EMPLOYER_CLAIMS) {
    const match = normalized.match(rule.pattern);
    if (match) return { ...rule, match: match[0] };
  }
  return null;
}

test("affiliation policy allows a neutral teaching example but rejects attribution claims", () => {
  for (const neutralExample of [
    "Учебный пример: компания МАСКОМ выступает заказчиком при разборе модели угроз.",
    "Автор курса — Виталий Пиков. Учебный пример: компания МАСКОМ выступает заказчиком.",
  ]) {
    assert.equal(findForbiddenFormerEmployerClaim(neutralExample), null, neutralExample);
  }
  for (const forbiddenClaim of [
    "Автор лекции: МАСКОМ.",
    "Виталий Пиков — преподаватель УЦ МАСКОМ.",
    "This course was developed by MASCOM.",
    "Copyright © MASCOM. All rights reserved.",
    "Лекция компании МАСКОМ.",
    "MASCOM course materials.",
  ]) {
    assert.ok(findForbiddenFormerEmployerClaim(forbiddenClaim), `policy accepted: ${forbiddenClaim}`);
  }
});

// Формулировки, в которых Минобороны или военная служба поданы как личные
// регалии автора, а не как предмет лекции.
const PERSONAL_AFFILIATION = [
  { pattern: /(?:награды|звания)[^<]{0,40}Минобороны/i, why: "Минобороны как личная награда автора" },
  { pattern: /Тамбовск\w*\s+военн\w+/i, why: "военный вуз как альма-матер автора" },
  { pattern: /ЦНИИ\s+ВВС/i, why: "прежнее место службы названо прямо" },
  { pattern: /\u044d\u043a\u0441\u043f\u0435\u0440\u0442\s+\u0413\u041a\s+\u00ab?\u041c\u0410\u0421\u041a\u041e\u041c/i, why: "бывший работодатель как текущая должность" },
  { pattern: /(?:\u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c|\u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a|\u044d\u043a\u0441\u043f\u0435\u0440\u0442)\s+\u0423\u0426\s+\u041c\u0410\u0421\u041a\u041e\u041c/i, why: "бывший работодатель как текущая должность" },
];

test("published pages carry no incorrect former-employer attribution or branding", () => {
  assert.ok(publicText.length >= 25, `expected the full public text set, got ${publicText.length} files`);
  assert.ok(publicText.some(entry => entry.label === "spdx/Apache-2.0"), "extensionless public XHTML is not covered");
  const offenders = publicText
    .map(entry => ({ page: entry.label, finding: findForbiddenFormerEmployerClaim(entry.content) }))
    .filter(entry => entry.finding)
    .map(entry => `${entry.page}: ${entry.finding.why} — ${entry.finding.match}`);
  assert.deepEqual(offenders, [], `incorrect former-employer claims still published:\n- ${offenders.join("\n- ")}`);
});

test("tracked public files carry no retired branded visual bytes", () => {
  const offenders = publicTracked
    .map(entry => ({
      page: entry.label,
      hash: createHash("sha256").update(readFileSync(entry.file)).digest("hex"),
    }))
    .filter(entry => FORBIDDEN_HASHES.has(entry.hash))
    .map(entry => `${entry.page}: ${entry.hash}`);
  assert.deepEqual(offenders, [], `retired branded visual assets still tracked publicly:\n- ${offenders.join("\n- ")}`);
});

test("Minobороny is never presented as the author's own credential", () => {
  const offenders = [];
  for (const page of pages) {
    const html = page.content;
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
