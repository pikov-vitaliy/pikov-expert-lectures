import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const documentRoot = path.join(rootDir, "appsec-lections");
const playwrightRoot = path.join(projectDir, ".browser-node", "node_modules", "playwright");

if (!fs.existsSync(playwrightRoot)) {
  throw new Error("Playwright module is not available in _PROJECT/.browser-node.");
}

const { chromium } = require(playwrightRoot);
const failures = [];
const expectedPagePaths = [
  "index.html",
  "day-01.html",
  "day-02.html",
  "slides-day-01.html",
  "slides-day-02.html",
  "practice.html",
  "glossary.html",
  "for-teachers.html",
  "quiz.html",
  "rights.html",
];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  })[ext] || "application/octet-stream";
}

function createServer() {
  const resolvedRoot = path.resolve(documentRoot);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const candidate = path.resolve(resolvedRoot, `.${pathname}`);
    if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(candidate, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(candidate) });
      fs.createReadStream(candidate).pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}/`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("#site-nav");
    const navLinks = nav
      ? [...nav.querySelectorAll("a")].filter((link) => getComputedStyle(link).display !== "none")
      : [];
    const oversizedChecklistItems = [...document.querySelectorAll(".checklist li")]
      .filter((item) => item.getBoundingClientRect().height > 140)
      .map((item) => ({
        text: item.textContent.trim().replace(/\s+/g, " ").slice(0, 100),
        width: item.getBoundingClientRect().width,
        height: item.getBoundingClientRect().height,
      }));
    const gridChecklistItems = [...document.querySelectorAll(".checklist li")]
      .filter((item) => getComputedStyle(item).display === "grid")
      .map((item) => item.textContent.trim().replace(/\s+/g, " ").slice(0, 100));
    const malformedTags = [...document.querySelectorAll(".tag")]
      .filter((tag) => tag.querySelector("h1, h2, h3, h4, p, article, section, div"))
      .map((tag) => tag.textContent.trim().replace(/\s+/g, " ").slice(0, 100));
    const clippedSvgText = [...document.querySelectorAll("svg[viewBox]")].flatMap((svg, svgIndex) => {
      const svgRect = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("text")]
        .map((text, textIndex) => {
          const rect = text.getBoundingClientRect();
          return {
            svgIndex,
            textIndex,
            text: text.textContent.trim().replace(/\s+/g, " ").slice(0, 120),
            left: rect.left,
            right: rect.right,
            svgLeft: svgRect.left,
            svgRight: svgRect.right,
          };
        })
        .filter((item) => item.left < item.svgLeft - 2 || item.right > item.svgRight + 2);
    });

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      navDisplay: nav ? getComputedStyle(nav).display : "missing",
      navWrapped: navLinks
        .filter((link) => link.getBoundingClientRect().height > 45)
        .map((link) => link.textContent.trim().replace(/\s+/g, " ")),
      oversizedChecklistItems,
      gridChecklistItems,
      clippedSvgText,
      malformedTags,
    };
  });
}

const server = await createServer();
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(`${server.baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  const pagePaths = await desktopPage.$$eval("#site-nav a", (links) => [...new Set(links.map((link) => new URL(link.href).pathname.slice(1)))]);
  check(JSON.stringify(pagePaths) === JSON.stringify(expectedPagePaths), `navigation routes changed: ${JSON.stringify(pagePaths)}`);

  for (const pagePath of pagePaths) {
    await desktopPage.goto(`${server.baseUrl}${pagePath}`, { waitUntil: "domcontentloaded" });
    const metrics = await inspectPage(desktopPage);
    check(metrics.title.length > 0, `${pagePath}: missing title`);
    check(metrics.bodyTextLength > 100, `${pagePath}: page is effectively blank`);
    check(metrics.documentWidth <= metrics.viewportWidth, `${pagePath}: horizontal overflow ${metrics.documentWidth}/${metrics.viewportWidth}`);
    check(metrics.navWrapped.length === 0, `${pagePath}: wrapped nav items: ${metrics.navWrapped.join(", ")}`);
    check(metrics.oversizedChecklistItems.length === 0, `${pagePath}: squeezed checklist text: ${JSON.stringify(metrics.oversizedChecklistItems)}`);
    check(metrics.gridChecklistItems.length === 0, `${pagePath}: checklist grid regression: ${JSON.stringify(metrics.gridChecklistItems)}`);
    check(metrics.clippedSvgText.length === 0, `${pagePath}: clipped SVG text: ${JSON.stringify(metrics.clippedSvgText)}`);
    check(metrics.malformedTags.length === 0, `${pagePath}: malformed tag structure: ${JSON.stringify(metrics.malformedTags)}`);
  }

  await desktop.close();

  const laptop = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const laptopPage = await laptop.newPage();
  await laptopPage.goto(`${server.baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  const laptopMetrics = await inspectPage(laptopPage);
  check(laptopMetrics.navDisplay === "flex", `1366px: desktop navigation is not visible (${laptopMetrics.navDisplay})`);
  check(laptopMetrics.navWrapped.length === 0, `1366px: wrapped nav items: ${laptopMetrics.navWrapped.join(", ")}`);
  check(laptopMetrics.documentWidth <= laptopMetrics.viewportWidth, `1366px: horizontal overflow ${laptopMetrics.documentWidth}/${laptopMetrics.viewportWidth}`);
  await laptop.close();

  const boundary = await browser.newContext({ viewport: { width: 1321, height: 850 } });
  const boundaryPage = await boundary.newPage();
  await boundaryPage.goto(`${server.baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  for (const theme of ["initial", "toggled"]) {
    const boundaryMetrics = await inspectPage(boundaryPage);
    check(boundaryMetrics.navDisplay === "flex", `1321px/${theme}: desktop navigation is not visible (${boundaryMetrics.navDisplay})`);
    check(boundaryMetrics.navWrapped.length === 0, `1321px/${theme}: wrapped nav items: ${boundaryMetrics.navWrapped.join(", ")}`);
    check(boundaryMetrics.documentWidth <= boundaryMetrics.viewportWidth, `1321px/${theme}: horizontal overflow ${boundaryMetrics.documentWidth}/${boundaryMetrics.viewportWidth}`);
    if (theme === "initial") {
      await boundaryPage.getByRole("button", { name: /тему/i }).click();
    }
  }
  await boundary.close();

  const compact = await browser.newContext({ viewport: { width: 1320, height: 800 } });
  const compactPage = await compact.newPage();
  await compactPage.goto(`${server.baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  const compactToggle = compactPage.getByRole("button", { name: "Открыть навигацию" });
  check(await compactToggle.isVisible(), "1320px: navigation should collapse before it can wrap");
  if (await compactToggle.isVisible()) {
    await compactToggle.click();
    check(await compactPage.locator("#site-nav").evaluate((nav) => nav.classList.contains("is-open")), "1320px: collapsed navigation does not open");
  }
  check(await compactPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "1320px: horizontal overflow");
  await compact.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  for (const pagePath of pagePaths) {
    await mobilePage.goto(`${server.baseUrl}${pagePath}`, { waitUntil: "domcontentloaded" });
    const metrics = await inspectPage(mobilePage);
    check(metrics.documentWidth <= metrics.viewportWidth, `${pagePath}/390px: horizontal overflow ${metrics.documentWidth}/${metrics.viewportWidth}`);
    const anomalousChecklistItems = metrics.oversizedChecklistItems.filter((item) => item.height > 220);
    check(anomalousChecklistItems.length === 0, `${pagePath}/390px: squeezed checklist text: ${JSON.stringify(anomalousChecklistItems)}`);
    check(metrics.gridChecklistItems.length === 0, `${pagePath}/390px: checklist grid regression: ${JSON.stringify(metrics.gridChecklistItems)}`);
    check(metrics.malformedTags.length === 0, `${pagePath}/390px: malformed tag structure: ${JSON.stringify(metrics.malformedTags)}`);
  }
  await mobilePage.goto(`${server.baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  const mobileToggle = mobilePage.locator(".nav-toggle");
  check(await mobileToggle.isVisible(), "390px: navigation toggle is hidden");
  check(await mobileToggle.getAttribute("aria-label") === "Открыть навигацию", "closed navigation toggle has the wrong initial accessible name");
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    check(await mobilePage.locator("#site-nav").evaluate((nav) => nav.classList.contains("is-open")), "390px: navigation does not open");
    check(await mobileToggle.getAttribute("aria-label") === "Закрыть навигацию", "open navigation toggle has the wrong accessible name");
    await mobileToggle.click();
    check(await mobileToggle.getAttribute("aria-expanded") === "false", "390px: navigation does not close");
    check(await mobileToggle.getAttribute("aria-label") === "Открыть навигацию", "closed navigation toggle has the wrong accessible name");
  }
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "390px: horizontal overflow");

  const themeButton = mobilePage.getByRole("button", { name: /тему/i });
  check(await themeButton.getAttribute("aria-pressed") === null, "theme action button must not expose contradictory pressed state");
  const themeBefore = await mobilePage.evaluate(() => document.documentElement.dataset.theme || "dark");
  await themeButton.click();
  const themeAfter = await mobilePage.evaluate(() => document.documentElement.dataset.theme || "dark");
  check(themeBefore !== themeAfter, "theme toggle does not change the rendered theme");
  await mobile.close();
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  process.stderr.write(`APPSEC LAYOUT QA FAILED (${failures.length})\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("APPSEC LAYOUT QA OK\n");
