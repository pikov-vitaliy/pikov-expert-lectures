import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(projectDir);
const playwrightRoot = path.join(projectDir, ".browser-node", "node_modules", "playwright");
assert.ok(fs.existsSync(playwrightRoot), "Playwright is not installed in _PROJECT/.browser-node");
const { chromium } = require(playwrightRoot);

const catalog = JSON.parse(fs.readFileSync(path.join(projectDir, "lectures.json"), "utf8"));
const lectures = catalog.lectures;
assert.ok(Array.isArray(lectures), "lectures.json must contain a lectures array");
const targets = [
  { domain: "pikov.expert", folder: "" },
  ...[...new Map(lectures.map((lecture) => [lecture.folder, {
    domain: `${lecture.domain}.pikov.expert`,
    folder: lecture.folder,
  }])).values()],
];

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

function createServer() {
  const resolvedRoot = path.resolve(rootDir);
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
      response.writeHead(200, { "content-type": mime.get(path.extname(candidate).toLowerCase()) || "application/octet-stream" });
      fs.createReadStream(candidate).pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function targetUrl(baseUrl, target) {
  return target.folder ? `${baseUrl}/${target.folder}/index.html` : `${baseUrl}/index.html`;
}

const failures = [];
const confirmedContrastText = new Map([
  ["gost56939.pikov.expert", ["РБПО"]],
  ["p19.pikov.expert", ["Граница законного применения."]],
  ["scaner-vs.pikov.expert", ["Авторская схема курса"]],
  ["komrad.pikov.expert", ["Учебная лекция · SIEM · KOMRAD 4.5"]],
  ["is.pikov.expert", ["Российский новый университет"]],
  ["vkr.pikov.expert", ["Кафедра 304 МАИ · В.А. Пиков"]],
]);
function check(condition, message) {
  if (!condition) failures.push(message);
}

const server = await createServer();
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  for (const target of targets) {
    const response = await desktop.goto(targetUrl(server.baseUrl, target), { waitUntil: "domcontentloaded" });
    check(response?.status() === 200, `${target.domain}: HTTP ${response?.status()}`);
    const semantics = await desktop.evaluate(() => {
      const parseColor = (value) => {
        const match = String(value).match(/rgba?\((\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)(?:[ ,/]+(\d*(?:\.\d+)?))?\)/i);
        if (!match) return null;
        return {
          r: Number(match[1]),
          g: Number(match[2]),
          b: Number(match[3]),
          a: match[4] === undefined || match[4] === "" ? 1 : Number(match[4]),
        };
      };
      const luminance = ({ r, g, b }) => {
        const convert = (channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
      };
      const ratio = (first, second) => {
        const firstLuminance = luminance(first);
        const secondLuminance = luminance(second);
        return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
      };
      const backgroundFor = (element) => {
        let current = element;
        while (current) {
          const color = parseColor(getComputedStyle(current).backgroundColor);
          if (color && color.a >= 0.95) return color;
          current = current.parentElement;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };
      const isVisible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && Number.parseFloat(style.opacity) > 0.02
          && rect.width > 0
          && rect.height > 0
          && rect.bottom > 0
          && rect.top < innerHeight
          && rect.right > 0
          && rect.left < innerWidth;
      };
      const contrastFailures = [...document.body.querySelectorAll("*")].flatMap((element) => {
        if (!isVisible(element)) return [];
        const directText = [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (directText.length < 2) return [];
        const style = getComputedStyle(element);
        if (style.backgroundImage && style.backgroundImage !== "none") return [];
        const foreground = parseColor(style.color);
        const background = backgroundFor(element);
        if (!foreground || foreground.a < 0.95 || !background) return [];
        const actual = ratio(foreground, background);
        const fontSize = Number.parseFloat(style.fontSize) || 0;
        const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        const threshold = isLarge ? 3 : 4.5;
        if (actual + 0.02 >= threshold) return [];
        return [{
          text: directText.slice(0, 60),
          ratio: Number(actual.toFixed(2)),
          threshold,
        }];
      }).sort((first, second) => first.ratio - second.ratio);
      return {
        mainCount: document.querySelectorAll("main, [role='main']").length,
        h1Count: document.querySelectorAll("h1").length,
        lang: document.documentElement.lang,
        contrastFailures,
      };
    });
    check(semantics.mainCount === 1, `${target.domain}: expected exactly one main landmark, got ${semantics.mainCount}`);
    check(semantics.h1Count === 1, `${target.domain}: expected exactly one h1, got ${semantics.h1Count}`);
    check(semantics.lang === "ru", `${target.domain}: expected html lang=ru, got ${JSON.stringify(semantics.lang)}`);
    const confirmedPatterns = confirmedContrastText.get(target.domain) || [];
    const confirmedFailures = semantics.contrastFailures.filter((failure) => confirmedPatterns.some((pattern) => failure.text.includes(pattern)));
    check(confirmedFailures.length === 0, `${target.domain}: confirmed WCAG text contrast failures ${JSON.stringify(confirmedFailures)}`);
  }

  const certViewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ];
  for (const viewport of certViewports) {
    await desktop.setViewportSize(viewport);
    await desktop.goto(`${server.baseUrl}/cert/index.html`, { waitUntil: "domcontentloaded" });
    const slideCount = await desktop.locator(".slide").count();
    for (let slideIndex = 0; slideIndex < slideCount; slideIndex += 1) {
      const metrics = await desktop.evaluate(() => {
        const nav = document.querySelector(".nav")?.getBoundingClientRect();
        const activeSlide = document.querySelector(".slide.active");
        const slideBounds = activeSlide?.getBoundingClientRect();
        const overlaps = nav
          ? [
            ...(slideBounds && slideBounds.left < nav.right && slideBounds.right > nav.left
              && slideBounds.top < nav.bottom && slideBounds.bottom > nav.top
              ? ["slide viewport"]
              : []),
            ...[...document.querySelectorAll(".slide.active :is(h1, h2, p, li, td, th, .card, .title-footer, .footer)")]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              const visible = slideBounds
                ? {
                  left: Math.max(rect.left, slideBounds.left),
                  right: Math.min(rect.right, slideBounds.right),
                  top: Math.max(rect.top, slideBounds.top),
                  bottom: Math.min(rect.bottom, slideBounds.bottom),
                }
                : rect;
              return visible.right > visible.left
                && visible.bottom > visible.top
                && visible.left < nav.right
                && visible.right > nav.left
                && visible.top < nav.bottom
                && visible.bottom > nav.top;
            })
            .map((element) => element.className || element.tagName),
          ]
          : ["navigation missing"];
        return {
          viewport: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          overlaps,
        };
      });
      const slideNumber = slideIndex + 1;
      check(
        metrics.pageWidth <= metrics.viewport + 1 && metrics.bodyWidth <= metrics.viewport + 1,
        `cert/${viewport.width}/slide-${slideNumber}: horizontal clipping ${metrics.pageWidth}/${metrics.bodyWidth} > ${metrics.viewport}`,
      );
      check(
        metrics.overlaps.length === 0,
        `cert/${viewport.width}/slide-${slideNumber}: fixed navigation overlaps slide content ${JSON.stringify(metrics.overlaps)}`,
      );
      if (slideNumber < slideCount) await desktop.locator("#btnNext").click();
    }
  }

  await desktop.setViewportSize({ width: 390, height: 844 });
  await desktop.goto(`${server.baseUrl}/29-07-2026/index.html`, { waitUntil: "domcontentloaded" });
  const sqlMobile = await desktop.evaluate(() => ({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  check(sqlMobile.pageWidth <= sqlMobile.viewport + 1, `29-07-2026/mobile: root overflow ${sqlMobile.pageWidth}/${sqlMobile.viewport}`);

  await desktop.goto(`${server.baseUrl}/vkr/index.html#1`, { waitUntil: "domcontentloaded" });
  const vkrMobile = await desktop.evaluate(() => {
    const transcript = document.querySelector(".mobile-transcript");
    return {
      exists: Boolean(transcript),
      visible: Boolean(transcript && transcript.getBoundingClientRect().height > 0),
      fontPx: transcript ? Number.parseFloat(getComputedStyle(transcript).fontSize) : 0,
      textLength: transcript ? transcript.textContent.replace(/\s+/g, " ").trim().length : 0,
    };
  });
  check(
    vkrMobile.exists && vkrMobile.visible && vkrMobile.fontPx >= 16 && vkrMobile.textLength >= 100,
    `vkr/mobile: readable transcript is missing ${JSON.stringify(vkrMobile)}`,
  );

  for (const folder of ["astralinux01", "astralinux02"]) {
    await desktop.goto(`${server.baseUrl}/${folder}/index.html`, { waitUntil: "domcontentloaded" });
    const mobileLayout = await desktop.evaluate(() => {
      const bodyTextSelectors = [
        ".cover-subtitle", ".cover-meta", ".cover-author-role", ".lede", ".footnote",
        ".big-list li", ".check-list li", ".bullets li", ".card-title", ".card-text",
        ".term-sub", ".term-def", ".rule-text", ".caption-title", ".caption-text",
        ".terminal-body", ".rbac-node", ".acl-text", ".rwx-text", ".pyramid-row",
        ".bl-tag", ".logo-cell", ".attack-list li", ".domain-list", ".final-text",
        ".big-quote-en", ".big-quote-author", ".contact-role", ".tg-handle", ".cb-list li",
      ];
      const samples = bodyTextSelectors.flatMap((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [];
        return [{ selector, fontPx: Number.parseFloat(getComputedStyle(element).fontSize) }];
      });
      const clippedSlides = [...document.querySelectorAll(".slide")].flatMap((slide, index) => {
        const style = getComputedStyle(slide);
        const clipsVertically = ["hidden", "clip"].includes(style.overflowY)
          && slide.scrollHeight > slide.clientHeight + 1;
        return clipsVertically ? [{ index, clientHeight: slide.clientHeight, scrollHeight: slide.scrollHeight }] : [];
      });
      return {
        viewport: innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        subtitlePx: Number.parseFloat(getComputedStyle(document.querySelector("h2")).fontSize),
        tooSmall: samples.filter((sample) => sample.fontPx < 16),
        clippedSlides,
      };
    });
    check(mobileLayout.subtitlePx >= 24, `${folder}/mobile: visible h2 is ${mobileLayout.subtitlePx}px, expected >=24px`);
    check(mobileLayout.tooSmall.length === 0, `${folder}/mobile: body text below 16px ${JSON.stringify(mobileLayout.tooSmall)}`);
    check(mobileLayout.clippedSlides.length === 0, `${folder}/mobile: slides clip reflowed content ${JSON.stringify(mobileLayout.clippedSlides.slice(0, 8))}`);
    check(mobileLayout.pageWidth <= mobileLayout.viewport + 1, `${folder}/mobile: root overflow ${mobileLayout.pageWidth}/${mobileLayout.viewport}`);
  }

  await desktop.setViewportSize({ width: 1366, height: 768 });
  await desktop.goto(`${server.baseUrl}/astra-intro/index.html`, { waitUntil: "domcontentloaded" });
  const headerlessTables = await desktop.evaluate(() => [...document.querySelectorAll("table")]
    .map((table, index) => ({ index, headers: table.querySelectorAll("th").length }))
    .filter((table) => table.headers === 0));
  check(headerlessTables.length === 0, `astra-intro: tables without th ${JSON.stringify(headerlessTables)}`);
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  process.stderr.write(`LAYOUT ACCESSIBILITY REGRESSION TEST FAILED (${failures.length})\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("LAYOUT ACCESSIBILITY REGRESSION TEST OK\n");
