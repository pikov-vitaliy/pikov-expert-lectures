import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(projectDir, "..");
const englishPath = resolve(rootDir, "index.html");
const russianPath = resolve(rootDir, "ru", "index.html");
const english = readFileSync(englishPath, "utf8");

function jsonLdById(html, id) {
  const source = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))?.[1];
  assert.ok(source, `${id} JSON-LD block is missing`);
  return JSON.parse(source);
}

test("English and Russian routes have static self-canonical metadata", () => {
  assert.ok(existsSync(russianPath), "ru/index.html must be a real static Russian document");
  const russian = readFileSync(russianPath, "utf8");

  assert.match(english, /<html lang="en" data-lang="en">/);
  assert.match(english, /<link rel="canonical" href="https:\/\/pikov\.expert\/">/);
  assert.match(english, /hreflang="ru" href="https:\/\/pikov\.expert\/ru\/">/);
  assert.match(english, /property="og:url" content="https:\/\/pikov\.expert\/">/);
  assert.match(english, /property="og:locale" content="en_US"/);

  assert.match(russian, /<html lang="ru" data-lang="ru">/);
  assert.match(russian, /<link rel="canonical" href="https:\/\/pikov\.expert\/ru\/">/);
  assert.match(russian, /hreflang="ru" href="https:\/\/pikov\.expert\/ru\/">/);
  assert.match(russian, /property="og:url" content="https:\/\/pikov\.expert\/ru\/">/);
  assert.match(russian, /property="og:locale" content="ru_RU"/);
});

test("the current homepage offers a localized parallel version above its unchanged header", () => {
  for (const html of [english, readFileSync(russianPath, "utf8")]) {
    const notice = html.match(/<div class="new-site-notice">([\s\S]*?)<header class="site-header">/)?.[1];
    assert.ok(notice, "the parallel-version notice must appear above the existing header");
    assert.match(notice, /<span data-l="en"><a href="\/new\/">Explore the new website/);
    assert.match(notice, /<span data-l="ru"><a href="\/new\/ru\/">Новая версия сайта/);
    assert.doesNotMatch(html, /http-equiv="refresh"/i, "the current homepage must not automatically redirect");
  }
  const htaccess = readFileSync(resolve(rootDir, ".htaccess"), "utf8");
  assert.doesNotMatch(htaccess, /RewriteRule[^\r\n]*\/new\//, "the current homepage remains the default");
});

test("static profile JSON-LD follows each document language", () => {
  assert.ok(existsSync(russianPath), "ru/index.html must exist before JSON-LD can be checked");
  const russian = readFileSync(russianPath, "utf8");
  const enProfile = jsonLdById(english, "ld-profile");
  const ruProfile = jsonLdById(russian, "ld-profile");
  const enPerson = enProfile["@graph"].find(node => node["@type"] === "Person");
  const ruPerson = ruProfile["@graph"].find(node => node["@type"] === "Person");
  const enSite = enProfile["@graph"].find(node => node["@type"] === "WebSite");
  const ruSite = ruProfile["@graph"].find(node => node["@type"] === "WebSite");

  assert.equal(enPerson.name, "Vitaliy Pikov");
  assert.doesNotMatch(enPerson.jobTitle, /[Ѐ-ӿ]/);
  assert.ok(enPerson.knowsAbout.every(value => !/[Ѐ-ӿ]/.test(value)));
  assert.doesNotMatch(enSite.description, /[Ѐ-ӿ]/);

  assert.equal(ruPerson.name, "Пиков Виталий Александрович");
  assert.match(ruPerson.jobTitle, /[Ѐ-ӿ]/);
  assert.ok(ruPerson.knowsAbout.some(value => /[Ѐ-ӿ]/.test(value)));
  assert.match(ruSite.description, /[Ѐ-ӿ]/);
});

test("language-dependent ARIA surfaces are explicitly translated", () => {
  const keys = [
    "pathBeginnerLabel",
    "pathAdminLabel",
    "pathDeveloperLabel",
    "profileAreasLabel",
    "standardsLabel",
    "independentLabel",
  ];
  for (const key of keys) {
    assert.match(english, new RegExp(`data-i18n-aria="${key}"`), `missing data-i18n-aria=${key}`);
  }
  assert.match(english, /querySelectorAll\('\[data-i18n-aria\]'\)/);
  assert.match(english, /langButton:\s*"Switch the site to Russian"/);
  assert.match(english, /langButton:\s*"Переключить сайт на английский язык"/);
});

test("language switching normalizes a durable path without losing query or hash", () => {
  assert.match(english, /function syncLanguageUrl\s*\(/);
  assert.match(english, /history\.replaceState/);
  assert.match(english, /searchParams\.delete\("lang"\)/);
  assert.match(english, /"\/ru\/"/);
  assert.match(english, /location\.hash/);
  assert.doesNotMatch(
    english,
    /pathLang\s*===\s*"en"[^\n]+stored/,
    "stored language must not override an explicitly requested route",
  );
});

test("legacy query and sitemap generation point to the Russian route", () => {
  const control = readFileSync(resolve(projectDir, "update-site-control-files.ps1"), "utf8");
  const htaccess = readFileSync(resolve(rootDir, ".htaccess"), "utf8");
  const sitemap = readFileSync(resolve(rootDir, "sitemap.xml"), "utf8");
  assert.match(control, /https:\/\/pikov\.expert\/ru\//);
  assert.match(control, /QUERY_STRING/);
  assert.match(
    control,
    /RewriteRule \^\$ https:\/\/pikov\.expert\/ru\/\? \[R=302,L\]/,
    "the control-file generator must preserve the explicit HTTPS legacy redirect",
  );
  assert.match(htaccess, /QUERY_STRING/);
  assert.match(htaccess, /\/ru\//);
  assert.match(
    htaccess,
    /RewriteRule \^\$ https:\/\/pikov\.expert\/ru\/\? \[R=302,L\]/,
    "the server-side legacy redirect must preserve HTTPS, 302 status, and query removal",
  );
  assert.match(sitemap, /<loc>https:\/\/pikov\.expert\/ru\/<\/loc>/);
});

test("the Russian document is generated deterministically from the English source", () => {
  const generatorPath = resolve(projectDir, "build-root-locales.mjs");
  assert.ok(existsSync(generatorPath), "missing _PROJECT/build-root-locales.mjs");
  const generator = readFileSync(generatorPath, "utf8");
  assert.match(generator, /--check/);
  assert.match(generator, /--write/);
  assert.match(generator, /path\.join\(rootDir, "ru", "index\.html"\)/);
});

test("the smoke boundary permits only the generated Russian locale entry point", () => {
  const smoke = readFileSync(resolve(projectDir, "smoke-check.ps1"), "utf8");
  assert.match(smoke, /\$rootLocaleDirs\s*=\s*@\(['"]ru['"]\)/);
  assert.match(smoke, /Unexpected root locale files/);
  assert.match(smoke, /ru[\\/]index\.html/);
});
