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

  const profileViewports = [
    { label: "1920px", width: 1920, height: 1080, expectedColumns: 2 },
    { label: "1366px", width: 1366, height: 768, expectedColumns: 2 },
    { label: "390px", width: 390, height: 844, expectedColumns: 1 },
  ];
  const profileThemeColors = new Map();
  for (const viewport of profileViewports) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const profileConsoleErrors = [];
      page.on("pageerror", err => profileConsoleErrors.push(String(err)));
      page.on("console", msg => { if (msg.type() === "error") profileConsoleErrors.push(msg.text()); });
      await page.addInitScript(selectedTheme => localStorage.setItem("theme", selectedTheme), theme);
      await page.goto(`${base}/#about`, { waitUntil: "networkidle" });

      const metrics = await page.evaluate(() => {
        const about = document.querySelector("#about");
        const cards = [...document.querySelectorAll("#about .about-grid > .about-block")];
        const halfCards = cards.filter(card => !card.classList.contains("about-block--wide"));
        const groups = [...document.querySelectorAll("#about .education-group")];
        const chips = [...document.querySelectorAll("#about .profile-chips > li, #about .standards-list > li")];
        const uniqueColumns = elements => new Set(elements.map(el => Math.round(el.getBoundingClientRect().left))).size;
        const visiblySized = elements => elements.every(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const containedByParent = elements => elements.every(el => {
          const rect = el.getBoundingClientRect();
          const parentRect = el.parentElement.getBoundingClientRect();
          return rect.left >= parentRect.left - 1 && rect.right <= parentRect.right + 1;
        });
        return {
          activeTheme: document.documentElement.dataset.theme,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          viewportWidth: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          aboutPresent: !!about,
          aboutTextLength: about?.innerText.trim().length || 0,
          cardCount: cards.length,
          cardsVisible: visiblySized(cards),
          cardsOverflowing: cards.filter(card => card.scrollWidth > card.clientWidth + 1).length,
          cardColumns: uniqueColumns(halfCards),
          educationGroupCount: groups.length,
          educationGroupsVisible: visiblySized(groups),
          educationColumns: uniqueColumns(groups),
          chipsContained: containedByParent(chips),
          chipCount: chips.length,
          educationLabelsResolve: groups.every(group => {
            const id = group.getAttribute("aria-labelledby");
            return group.getAttribute("role") === "group" && !!id && !!document.getElementById(id);
          }),
          cardsHaveHeadings: cards.every(card => !!card.querySelector("h3")),
        };
      });

      const state = `${viewport.label} ${theme}`;
      check(`professional profile applies ${theme} theme at ${viewport.label}`, metrics.activeTheme === theme, metrics.activeTheme);
      check(`professional profile has no console errors at ${state}`, profileConsoleErrors.length === 0, profileConsoleErrors.join(" | "));
      check(`professional profile has no horizontal overflow at ${state}`, metrics.pageWidth <= metrics.viewportWidth + 1, `${metrics.pageWidth} > ${metrics.viewportWidth}`);
      check(`professional profile renders substantive content at ${state}`, metrics.aboutPresent && metrics.aboutTextLength > 2500, String(metrics.aboutTextLength));
      check(`professional profile cards render at ${state}`, metrics.cardCount >= 6 && metrics.cardsVisible && metrics.cardsOverflowing === 0, `cards=${metrics.cardCount} overflowing=${metrics.cardsOverflowing}`);
      check(`professional profile uses ${viewport.expectedColumns} card column(s) at ${state}`, metrics.cardColumns === viewport.expectedColumns, String(metrics.cardColumns));
      check(`education groups render at ${state}`, metrics.educationGroupCount === 4 && metrics.educationGroupsVisible, String(metrics.educationGroupCount));
      check(`education uses ${viewport.expectedColumns} column(s) at ${state}`, metrics.educationColumns === viewport.expectedColumns, String(metrics.educationColumns));
      check(`profile chips stay inside their lists at ${state}`, metrics.chipCount >= 15 && metrics.chipsContained, String(metrics.chipCount));
      check(`profile card headings and education labels are accessible at ${state}`, metrics.cardsHaveHeadings && metrics.educationLabelsResolve);
      profileThemeColors.set(`${viewport.label}:${theme}`, metrics.backgroundColor);
      await page.close();
    }
    check(
      `light and dark palettes differ at ${viewport.label}`,
      profileThemeColors.get(`${viewport.label}:light`) !== profileThemeColors.get(`${viewport.label}:dark`),
      `${profileThemeColors.get(`${viewport.label}:light`)} == ${profileThemeColors.get(`${viewport.label}:dark`)}`,
    );
  }

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

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
  check("no horizontal overflow at 390px", mobileMetrics.pageWidth <= mobileMetrics.viewport + 1, `${mobileMetrics.pageWidth} > ${mobileMetrics.viewport}`);
  check("lecture cards are a single column at 390px", mobileMetrics.cardColumns === 1, `${mobileMetrics.cardColumns} columns`);

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
    "header navigation stays reachable at 390px",
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
