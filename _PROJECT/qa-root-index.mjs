import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const siteRoot = process.env.ROOT_SITE_ROOT
  ? path.resolve(process.env.ROOT_SITE_ROOT)
  : rootDir;
const lecturesPath = path.join(projectDir, "lectures.json");
const playwrightPath = path.join(projectDir, ".browser-node", "node_modules", "playwright");
assert.ok(fs.existsSync(playwrightPath), "Playwright is not installed in _PROJECT/.browser-node");
const { chromium } = require(playwrightPath);

const lectures = JSON.parse(fs.readFileSync(lecturesPath, "utf8")).lectures;

const mime = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"], [".js", "text/javascript; charset=utf-8"], [".jpg", "image/jpeg"],
]);
const server = http.createServer((request, response) => {
  const rawPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const requested = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const resolved = path.resolve(siteRoot, requested);
  if (!resolved.startsWith(`${siteRoot}${path.sep}`) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
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
const failures = [];

function check(name, condition, details = "") {
  if (condition) process.stdout.write(`PASS ${name}\n`);
  else {
    failures.push(`${name}${details ? `: ${details}` : ""}`);
    process.stdout.write(`FAIL ${name}${details ? `: ${details}` : ""}\n`);
  }
}

try {
  const consoleErrors = [];
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  desktop.on("pageerror", err => consoleErrors.push(String(err)));
  desktop.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  const response = await desktop.goto(`${base}/`, { waitUntil: "networkidle" });
  check("root index returns 200", response?.status() === 200, String(response?.status()));
  check("no console errors on load", consoleErrors.length === 0, consoleErrors.join(" | "));

  const cardHrefs = await desktop.$$eval(".card", els => els.map(el => el.getAttribute("href")));
  check("card count matches lectures.json", cardHrefs.length === lectures.length, `${cardHrefs.length} != ${lectures.length}`);
  const normalize = u => u.replace(/\/$/, "");
  const missing = lectures.filter(l => !cardHrefs.some(h => normalize(h) === normalize(l.url)));
  check("every lectures.json URL has a rendered card", missing.length === 0, missing.map(l => l.url).join(", "));

  const tileHrefs = await desktop.$$eval(".tile", els => els.map(el => el.getAttribute("href")));
  check("at least one section tile above the fold", tileHrefs.length >= 1, String(tileHrefs.length));
  const tileTargetsExist = await desktop.evaluate(hrefs =>
    hrefs.every(h => !!document.querySelector(h)), tileHrefs);
  check("every section tile points at an existing anchor", tileTargetsExist);
  const tilesAboveFold = await desktop.evaluate(() => {
    const el = document.querySelector(".tiles");
    return !!el && el.getBoundingClientRect().top < 900;
  });
  check("section tiles visible without scrolling past the catalog", tilesAboveFold);

  const ld = await desktop.evaluate(() => {
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } });
    return blocks;
  });
  check("both JSON-LD blocks parse as valid JSON", ld.every(b => b !== null), JSON.stringify(ld.map(b => b === null)));
  const hasPerson = ld.some(b => (b?.["@graph"] || []).some(n => n["@type"] === "Person"));
  check("JSON-LD includes Person", hasPerson);
  const itemList = ld.find(b => b?.["@type"] === "ItemList");
  check("JSON-LD includes a rendered ItemList", !!itemList);
  if (itemList) {
    check("ItemList numberOfItems matches lectures.json", itemList.numberOfItems === lectures.length, `${itemList.numberOfItems} != ${lectures.length}`);
    check("ItemList itemListElement count matches lectures.json", (itemList.itemListElement || []).length === lectures.length);
    const positions = (itemList.itemListElement || []).map(i => i.position).sort((a, b) => a - b);
    check("ItemList positions are a 1..N sequence", positions.every((p, i) => p === i + 1));
    check("ItemList includes spdx.pikov.expert", (itemList.itemListElement || []).some(i => normalize(i.item.url) === "https://spdx.pikov.expert"));
    const providers = new Set((itemList.itemListElement || []).map(i => i.item.provider?.["@type"]));
    check("ItemList provider is Person (not an organization)", providers.size === 1 && providers.has("Person"), [...providers].join(","));
  }

  const maskomCount = await desktop.evaluate(() => document.body.innerText.split("МАСКОМ").length - 1);
  check("MASKOM is absent from the rendered page", maskomCount === 0, String(maskomCount));

  await desktop.click("#themeToggle");
  const themeAfterClick = await desktop.evaluate(() => document.documentElement.dataset.theme);
  await desktop.reload({ waitUntil: "networkidle" });
  const themeAfterReload = await desktop.evaluate(() => document.documentElement.dataset.theme);
  check("theme choice persists across reload", themeAfterClick === themeAfterReload && !!themeAfterClick, `${themeAfterClick} -> ${themeAfterReload}`);

  await desktop.fill("#q", "astra");
  await desktop.waitForTimeout(50);
  const visibleAfterSearch = await desktop.$$eval(".card", els => els.filter(el => el.offsetParent !== null).length);
  check("search narrows the visible card list", visibleAfterSearch > 0 && visibleAfterSearch < lectures.length, String(visibleAfterSearch));
  await desktop.click("#resetFilters");
  await desktop.waitForTimeout(50);
  const visibleAfterReset = await desktop.$$eval(".card", els => els.filter(el => el.offsetParent !== null).length);
  check("reset restores the full card list", visibleAfterReset === lectures.length, String(visibleAfterReset));

  const decorativeSvgsOk = await desktop.evaluate(() => {
    const svgs = [...document.querySelectorAll("svg")];
    return svgs.every(s => s.hasAttribute("aria-hidden") || s.hasAttribute("role"));
  });
  check("decorative SVGs are marked aria-hidden", decorativeSvgsOk);

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto(`${base}/`, { waitUntil: "networkidle" });
  const mobileMetrics = await mobile.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    cardColumns: (() => {
      const cards = [...document.querySelectorAll(".cat-section:first-of-type .card")];
      if (cards.length < 2) return 1;
      const lefts = new Set(cards.map(c => Math.round(c.getBoundingClientRect().left)));
      return lefts.size;
    })(),
  }));
  check("no horizontal overflow at 375px", mobileMetrics.pageWidth <= mobileMetrics.viewport + 1, `${mobileMetrics.pageWidth} > ${mobileMetrics.viewport}`);
  check("lecture cards are a single column at 375px", mobileMetrics.cardColumns === 1, `${mobileMetrics.cardColumns} columns`);

  // The header nav was previously display:none below 880px with nothing in its
  // place, so a phone visitor had no way to reach "Обо мне" or "Связь".
  const mobileNav = await mobile.evaluate(() => {
    const nav = document.querySelector(".site-nav");
    if (!nav) return { present: false, reachable: 0, total: 0 };
    const links = [...nav.querySelectorAll("a")];
    return {
      present: nav.offsetParent !== null && getComputedStyle(nav).display !== "none",
      reachable: links.filter(a => a.getBoundingClientRect().width > 0).length,
      total: links.length,
    };
  });
  check(
    "header navigation stays reachable at 375px",
    mobileNav.present && mobileNav.total > 0 && mobileNav.reachable === mobileNav.total,
    `present=${mobileNav.present} reachable=${mobileNav.reachable}/${mobileNav.total}`,
  );
  await mobile.close();

  console.log(failures.length === 0 ? "ROOT INDEX QA OK" : `ROOT INDEX QA FAILED (${failures.length})`);
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  process.stderr.write(`\nRoot index QA failures (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
}
