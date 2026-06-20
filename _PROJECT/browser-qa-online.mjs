import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const projectDir = path.dirname(scriptPath);
const localModules = path.join(projectDir, ".browser-node", "node_modules");
const envModules = process.env.PLAYWRIGHT_NODE_MODULES || "";
const playwrightPath = [localModules, envModules]
  .filter(Boolean)
  .map((moduleRoot) => path.join(moduleRoot, "playwright"))
  .find((candidate) => fs.existsSync(candidate));

if (!playwrightPath) {
  throw new Error("Playwright module is not available. Run: npm install --prefix _PROJECT/.browser-node playwright");
}

const { chromium } = require(playwrightPath);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function normalizeUrl(value) {
  const url = new URL(value);
  return url.toString();
}

function reportUrl(value) {
  const url = new URL(value);
  return url.hash ? `${url.origin}${url.pathname}${url.hash}` : `${url.origin}${url.pathname}`;
}

function tableRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function cleanCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

const releaseDate = process.env.RELEASE_DATE || readJson(path.join(projectDir, "lectures.json")).updated;
const indexJsonPath = path.join(projectDir, `RELEASE_INDEX_${releaseDate}.json`);
const reportPath = path.join(projectDir, `BROWSER_ONLINE_TESTS_${releaseDate}.md`);
const targets = readJson(indexJsonPath).map((target) => ({
  domain: target.domain,
  url: normalizeUrl(target.url),
  displayUrl: reportUrl(target.url),
}));

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 850 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);

    const httpErrors = [];
    const requestFailures = [];
    const consoleErrors = [];
    const pageErrors = [];

    page.on("response", (response) => {
      const url = new URL(response.url());
      if (response.status() >= 400 && !url.pathname.endsWith("/favicon.ico")) {
        httpErrors.push(`${response.status()} ${url.href}`);
      }
    });

    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText || "failed";
      if (!request.url().includes("/favicon.ico")) {
        requestFailures.push(`${request.url()}: ${failure}`);
      }
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text();
        if (!text.includes("favicon.ico") && !text.includes("Failed to load resource")) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const issues = [];
    let metrics = null;

    try {
      const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1200);

      if (!response || response.status() !== 200) {
        issues.push(`navigation status ${response ? response.status() : "none"}`);
      }

      metrics = await page.evaluate(() => {
        const body = document.body;
        const text = (body?.innerText || "").trim().replace(/\s+/g, " ");
        const visibleElements = Array.from(document.querySelectorAll("body *")).filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 1 && rect.height > 1;
        });
        const firstViewportText = visibleElements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
          })
          .map((element) => element.innerText || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        return {
          title: document.title,
          h1: document.querySelector("h1")?.innerText?.trim() || "",
          textLength: text.length,
          visibleCount: visibleElements.length,
          firstViewportChars: firstViewportText.length,
          scrollHeight: document.documentElement.scrollHeight,
        };
      });

      if (!metrics.title) issues.push("missing title");
      if (metrics.textLength < 100) issues.push(`low text length ${metrics.textLength}`);
      if (metrics.visibleCount < 5) issues.push(`low visible element count ${metrics.visibleCount}`);
      if (metrics.firstViewportChars < 40) issues.push(`low first viewport text ${metrics.firstViewportChars}`);
    } catch (error) {
      issues.push(error.message);
    }

    if (httpErrors.length > 0) issues.push(`http errors: ${httpErrors.slice(0, 5).join("; ")}`);
    if (requestFailures.length > 0) issues.push(`request failures: ${requestFailures.slice(0, 5).join("; ")}`);
    if (consoleErrors.length > 0) issues.push(`console errors: ${consoleErrors.slice(0, 5).join("; ")}`);
    if (pageErrors.length > 0) issues.push(`page errors: ${pageErrors.slice(0, 5).join("; ")}`);

    results.push({
      domain: target.domain,
      url: target.displayUrl,
      status: issues.length === 0 ? "ok" : "issues",
      issues,
      metrics,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

const issueCount = results.reduce((sum, item) => sum + item.issues.length, 0);
const lines = [
  `# Online browser QA ${releaseDate}`,
  "",
  `Targets: ${results.length}`,
  `Issues: ${issueCount}`,
  "",
  tableRow(["Domain", "URL", "Status", "Title", "H1", "Metrics", "Issues"]),
  tableRow(["---", "---", "---:", "---", "---", "---", "---"]),
];

for (const result of results) {
  const metrics = result.metrics
    ? `text=${result.metrics.textLength}; visible=${result.metrics.visibleCount}; firstViewport=${result.metrics.firstViewportChars}; scroll=${result.metrics.scrollHeight}`
    : "n/a";
  lines.push(tableRow([
    result.domain,
    result.url,
    result.status,
    cleanCell(result.metrics?.title || ""),
    cleanCell(result.metrics?.h1 || ""),
    cleanCell(metrics),
    cleanCell(result.issues.join("; ") || "none"),
  ]));
}

fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");

console.log(`BROWSER ONLINE QA ${issueCount === 0 ? "OK" : "ISSUES"} targets=${results.length} issues=${issueCount}`);
console.log(`report=${reportPath}`);

if (issueCount > 0) {
  process.exitCode = 1;
}
