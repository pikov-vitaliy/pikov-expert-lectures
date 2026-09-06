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
  let requested = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  let resolved = path.resolve(siteRoot, requested);
  if (resolved.startsWith(`${siteRoot}${path.sep}`) && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    requested = path.join(requested, "index.html");
    resolved = path.resolve(siteRoot, requested);
  }
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

  // Репозиторий публичный, поэтому название бывшего работодателя пишется
  // \u-последовательностями — так же, как в test-public-release-independence.ps1.
  const maskomCount = await desktop.evaluate(() => document.body.innerText.split("\u041c\u0410\u0421\u041a\u041e\u041c").length - 1);
  check("the former employer is absent from the rendered page", maskomCount === 0, String(maskomCount));

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

  // ---- Двуязычность: английский по умолчанию, заметная кнопка, идемпотентность ----
  // Читаем цвета через canvas: getComputedStyle отдаёт oklch(), а не rgb().
  const CONTRAST_HELPER = `
    globalThis.toRgb = value => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };
    globalThis.luminance = rgb => {
      const [r, g, b] = rgb.map(channel => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    globalThis.contrast = (fg, bg) => {
      const a = luminance(toRgb(fg)), b = luminance(toRgb(bg));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
  `;

  // Страницы переиспользуются, а не создаются под каждую проверку: на
  // Windows-раннере десяток контекстов подряд исчерпывает сокеты и навигация
  // падает с ERR_NO_BUFFER_SPACE. По той же причине здесь domcontentloaded —
  // каталог строится синхронным инлайновым скриптом, ждать сети незачем.
  const fresh = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fresh.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const defaultLang = await fresh.evaluate(() => ({
    dataset: document.documentElement.dataset.lang,
    attr: document.documentElement.lang,
    heroRole: document.querySelector(".hero .role")?.innerText.trim(),
    title: document.title,
  }));
  check("first visit opens in English", defaultLang.dataset === "en" && defaultLang.attr === "en", JSON.stringify(defaultLang));
  check("hero role renders in English by default", /Expert in secure software development/.test(defaultLang.heroRole || ""), defaultLang.heroRole);
  check("document title is English by default", /Vitaliy Pikov/.test(defaultLang.title), defaultLang.title);

  // Ни одного русского слова не должно просочиться в английскую версию.
  // Исключение — сама кнопка языка: она по общепринятому правилу называет
  // язык на этом же языке («Русский»), иначе её не узнает носитель.
  const cyrillicLeak = await fresh.evaluate(() => {
    const langBtn = document.getElementById("langToggle");
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || langBtn?.contains(parent)) continue;
      if (!parent.offsetParent && parent !== document.body) continue;
      const text = node.textContent.trim();
      if (text && /[Ѐ-ӿ]/.test(text)) hits.push(text.slice(0, 70));
    }
    return hits.slice(0, 10);
  });
  check("English view contains no untranslated Russian text", cyrillicLeak.length === 0, cyrillicLeak.join(" | "));

  const langBtnGeometry = await fresh.evaluate(() => {
    const btn = document.getElementById("langToggle");
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const header = document.querySelector(".site-header").getBoundingClientRect();
    return {
      width: rect.width, height: rect.height,
      insideHeader: rect.top >= header.top - 1 && rect.bottom <= header.bottom + 1,
      // textContent, а не innerText: у кнопки text-transform: uppercase.
      label: [...btn.querySelectorAll("span")].filter(s => s.offsetParent).map(s => s.textContent).join(""),
      ariaLabel: btn.getAttribute("aria-label"),
    };
  });
  check("language switch is present in the header", !!langBtnGeometry && langBtnGeometry.insideHeader && langBtnGeometry.width > 40, JSON.stringify(langBtnGeometry));
  check("language switch offers the other language", langBtnGeometry?.label === "Русский", langBtnGeometry?.label);
  check("language switch has an accessible name", !!langBtnGeometry?.ariaLabel, langBtnGeometry?.ariaLabel);

  // Одна страница на все три состояния темы: явный выбор ставится через
  // localStorage, «системное» состояние — эмуляцией prefers-color-scheme.
  const themePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const theme of ["light", "dark", "system"]) {
    await themePage.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
    await themePage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await themePage.evaluate(t => {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    }, theme);
    await themePage.reload({ waitUntil: "domcontentloaded" });
    const metrics = await themePage.evaluate(helper => {
      eval(helper);
      const btn = document.getElementById("langToggle");
      const style = getComputedStyle(btn);
      const header = getComputedStyle(document.querySelector(".site-header"));
      const view = getComputedStyle(document.getElementById("viewToggle"));
      return {
        text: contrast(style.color, style.backgroundColor),
        // Кнопка должна отличаться от соседних, иначе она не «бросается в глаза».
        standsOut: style.backgroundColor !== view.backgroundColor && style.backgroundColor !== header.backgroundColor,
      };
    }, CONTRAST_HELPER);
    check(`language switch text meets WCAG AA in the ${theme} theme`, metrics.text >= 4.5, metrics.text.toFixed(2));
    check(`language switch stands out from the other header controls in the ${theme} theme`, metrics.standsOut);
  }
  await themePage.close();

  await fresh.click("#langToggle");
  await fresh.waitForTimeout(60);
  const afterToggle = await fresh.evaluate(() => ({
    lang: document.documentElement.dataset.lang,
    attr: document.documentElement.lang,
    heroRole: document.querySelector(".hero .role")?.innerText.trim(),
    cards: document.querySelectorAll(".card").length,
    tiles: document.querySelectorAll(".tile").length,
    itemLists: [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
      .filter(b => b?.["@type"] === "ItemList").length,
    ldTags: document.querySelectorAll('script[type="application/ld+json"]').length,
    title: document.title,
  }));
  check("language switch flips the page to Russian", afterToggle.lang === "ru" && afterToggle.attr === "ru", JSON.stringify({ l: afterToggle.lang, a: afterToggle.attr }));
  check("Russian view renders the Russian hero role", /Эксперт по безопасной разработке/.test(afterToggle.heroRole || ""), afterToggle.heroRole);
  check("switching language keeps the card count", afterToggle.cards === lectures.length, `${afterToggle.cards} != ${lectures.length}`);
  check("switching language keeps the tile count", afterToggle.tiles === 5, String(afterToggle.tiles));
  check("switching language does not duplicate the ItemList", afterToggle.itemLists === 1, String(afterToggle.itemLists));
  check("switching language does not duplicate JSON-LD blocks", afterToggle.ldTags === 2, String(afterToggle.ldTags));
  check("document title follows the language", /Виталий Пиков/.test(afterToggle.title), afterToggle.title);

  await fresh.reload({ waitUntil: "domcontentloaded" });
  const langAfterReload = await fresh.evaluate(() => document.documentElement.dataset.lang);
  check("language choice persists across reload", langAfterReload === "ru", langAfterReload);

  // Двойное переключение не должно накапливать узлы.
  await fresh.click("#langToggle");
  await fresh.click("#langToggle");
  await fresh.waitForTimeout(60);
  const afterDoubleToggle = await fresh.evaluate(() => ({
    cards: document.querySelectorAll(".card").length,
    itemLists: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
  }));
  check("repeated switching keeps the DOM stable", afterDoubleToggle.cards === lectures.length && afterDoubleToggle.itemLists === 2, JSON.stringify(afterDoubleToggle));

  // Та же вкладка: сохранённый выбор принудительно ставится в английский,
  // чтобы ?lang= проверялся против записанного значения, а не на чистом профиле.
  await fresh.evaluate(() => localStorage.setItem("lang", "en"));
  await fresh.goto(`${base}/?lang=ru`, { waitUntil: "domcontentloaded" });
  const forced = await fresh.evaluate(() => ({
    lang: document.documentElement.dataset.lang,
    path: location.pathname,
    search: location.search,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    ogLocale: document.querySelector('meta[property="og:locale"]')?.content,
  }));
  check("?lang=ru overrides a stored English choice", forced.lang === "ru", forced.lang);
  check("legacy ?lang=ru normalizes to the Russian route", forced.path === "/ru/" && forced.search === "", `${forced.path}${forced.search}`);
  check("the Russian URL is self-canonical", forced.canonical === "https://pikov.expert/ru/", forced.canonical);
  check("og:url follows the Russian URL", forced.ogUrl === "https://pikov.expert/ru/", forced.ogUrl);
  check("og:locale follows the language", forced.ogLocale === "ru_RU", forced.ogLocale);
  await fresh.close();

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
  // Ссылка языка — третий элемент в шапке; на узком экране она не должна
  // выдавливать навигацию или сама уезжать за край. Вкладка переиспользуется.
  for (const width of [375, 320]) {
    await mobile.setViewportSize({ width, height: 780 });
    await mobile.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const header = await mobile.evaluate(() => {
      const btn = document.getElementById("langToggle");
      const rect = btn.getBoundingClientRect();
      const controls = [...document.querySelectorAll(".hdr-actions > :is(a, button)")];
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        langVisible: rect.width > 0 && rect.height > 0,
        langInsideViewport: rect.left >= -1 && rect.right <= window.innerWidth + 1,
        langLabel: [...btn.querySelectorAll("span")].filter(s => s.offsetParent).map(s => s.textContent).join(""),
        controlsVisible: controls.filter(c => c.getBoundingClientRect().width > 0).length,
        controlsTotal: controls.length,
        navReachable: [...document.querySelectorAll(".site-nav a")].filter(a => a.getBoundingClientRect().width > 0).length,
      };
    });
    check(`no horizontal overflow at ${width}px`, header.pageWidth <= header.viewport + 1, `${header.pageWidth} > ${header.viewport}`);
    check(`language switch is visible and inside the viewport at ${width}px`, header.langVisible && header.langInsideViewport, JSON.stringify(header));
    check(`language switch falls back to a short label at ${width}px`, header.langLabel === "RU", header.langLabel);
    check(`all header controls stay usable at ${width}px`, header.controlsVisible === header.controlsTotal && header.controlsTotal === 3, `${header.controlsVisible}/${header.controlsTotal}`);
    check(`header navigation stays reachable at ${width}px`, header.navReachable === 5, String(header.navReachable));
  }
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
