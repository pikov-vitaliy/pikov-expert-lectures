import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const playwrightPath = path.join(projectDir, ".browser-node", "node_modules", "playwright");
assert.ok(fs.existsSync(playwrightPath), "Playwright is not installed in _PROJECT/.browser-node");
const { chromium } = require(playwrightPath);

const mime = new Map([[".html", "text/html; charset=utf-8"], [".jpg", "image/jpeg"]]);
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  let requested = pathname.replace(/^\/+/, "");
  if (!requested || pathname.endsWith("/")) requested = path.join(requested, "index.html");
  const resolved = path.resolve(rootDir, requested);
  if (!resolved.startsWith(`${rootDir}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": mime.get(path.extname(resolved)) || "application/octet-stream" });
  fs.createReadStream(resolved).pipe(response);
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: "domcontentloaded" });

  let state = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => { try { return JSON.parse(node.textContent); } catch { return null; } });
    const graph = blocks.find(block => Array.isArray(block?.["@graph"]))?.["@graph"] || [];
    return {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      lang: document.documentElement.lang,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      jobTitle: graph.find(node => node["@type"] === "Person")?.jobTitle,
      aria: [...document.querySelectorAll("[data-i18n-aria]")].map(node => node.getAttribute("aria-label")),
    };
  });
  assert.equal(state.path, "/");
  assert.equal(state.lang, "en");
  assert.equal(state.canonical, "https://pikov.expert/");
  assert.equal(state.ogUrl, "https://pikov.expert/");
  assert.doesNotMatch(state.jobTitle, /[Ѐ-ӿ]/);
  assert.ok(state.aria.every(value => value && !/[Ѐ-ӿ]/.test(value)), JSON.stringify(state.aria));

  await page.click("#langToggle");
  state = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => { try { return JSON.parse(node.textContent); } catch { return null; } });
    const graph = blocks.find(block => Array.isArray(block?.["@graph"]))?.["@graph"] || [];
    return {
      path: location.pathname,
      search: location.search,
      lang: document.documentElement.lang,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      jobTitle: graph.find(node => node["@type"] === "Person")?.jobTitle,
      aria: [...document.querySelectorAll("[data-i18n-aria]")].map(node => node.getAttribute("aria-label")),
    };
  });
  assert.equal(state.path, "/ru/");
  assert.equal(state.search, "");
  assert.equal(state.lang, "ru");
  assert.equal(state.canonical, "https://pikov.expert/ru/");
  assert.equal(state.ogUrl, "https://pikov.expert/ru/");
  assert.match(state.jobTitle, /[Ѐ-ӿ]/);
  assert.ok(state.aria.every(value => value && /[Ѐ-ӿ]/.test(value)), JSON.stringify(state.aria));

  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.evaluate(() => document.documentElement.lang), "ru");
  assert.equal(new URL(page.url()).pathname, "/ru/");

  await page.click("#langToggle");
  assert.equal(new URL(page.url()).pathname, "/");
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");

  await page.evaluate(() => localStorage.setItem("lang", "ru"));
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");

  await page.evaluate(() => localStorage.setItem("lang", "en"));
  await page.goto(`${base}/ru/`, { waitUntil: "domcontentloaded" });
  assert.equal(new URL(page.url()).pathname, "/ru/");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "ru");

  await page.goto(`${base}/?lang=ru&source=audit#about`, { waitUntil: "domcontentloaded" });
  state = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    lang: document.documentElement.lang,
  }));
  assert.equal(state.path, "/ru/");
  assert.equal(state.search, "?source=audit");
  assert.equal(state.hash, "#about");
  assert.equal(state.lang, "ru");

  await page.goto(`${base}/ru/?lang=en&source=audit#about`, { waitUntil: "domcontentloaded" });
  state = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    lang: document.documentElement.lang,
  }));
  assert.equal(state.path, "/");
  assert.equal(state.search, "?source=audit");
  assert.equal(state.hash, "#about");
  assert.equal(state.lang, "en");

  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  try {
    for (const expected of [
      { route: "/", language: "en", hero: "Vitaly Pikov", switchHref: "/ru/" },
      { route: "/ru/", language: "ru", hero: "Пиков Виталий Александрович", switchHref: "/" },
    ]) {
      const noJsPage = await noJsContext.newPage();
      await noJsPage.goto(`${base}${expected.route}`, { waitUntil: "domcontentloaded" });
      const noJsState = await noJsPage.evaluate(() => {
        const visible = language => [...document.querySelectorAll(`[data-l="${language}"]`)]
          .filter(node => getComputedStyle(node).display !== "none")
          .length;
        return {
          lang: document.documentElement.lang,
          dataLang: document.documentElement.dataset.lang,
          hero: document.querySelector("h1")?.innerText.replace(/\s+/g, " ").trim(),
          visibleEnglish: visible("en"),
          visibleRussian: visible("ru"),
          switchHref: document.getElementById("langToggle")?.getAttribute("href"),
        };
      });
      assert.equal(noJsState.lang, expected.language);
      assert.equal(noJsState.dataLang, expected.language);
      assert.equal(noJsState.hero, expected.hero);
      assert.equal(noJsState.switchHref, expected.switchHref);
      assert.ok(noJsState[expected.language === "en" ? "visibleEnglish" : "visibleRussian"] > 0);
      assert.equal(noJsState[expected.language === "en" ? "visibleRussian" : "visibleEnglish"], 0);
      await noJsPage.close();
    }
  } finally {
    await noJsContext.close();
  }

  console.log("ROOT LOCALE ROUTES QA OK");
} finally {
  await browser.close();
  server.close();
}
