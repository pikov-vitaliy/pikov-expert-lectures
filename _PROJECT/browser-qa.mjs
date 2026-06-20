import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const projectDir = path.dirname(scriptPath);
const rootDir = path.dirname(projectDir);
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

const lectures = readJson(path.join(projectDir, "lectures.json"));
const releaseDate = process.env.RELEASE_DATE || lectures.updated;
const indexJsonPath = path.join(projectDir, `RELEASE_INDEX_${releaseDate}.json`);
const indexMdPath = path.join(projectDir, `RELEASE_INDEX_${releaseDate}.md`);
const reportPath = path.join(projectDir, `BROWSER_TESTS_${releaseDate}.md`);
const contentActualityPath = path.join(projectDir, `CONTENT_ACTUALITY_${releaseDate}.md`);
const qaRoot = path.join(projectDir, `.browser-qa-${releaseDate}`);
const unpackedRoot = path.join(qaRoot, "unpacked");
const screenshotRoot = path.join(qaRoot, "screenshots");

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".pdf", "application/pdf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
]);

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function rel(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

function shell(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

function expandArchive(archivePath, destinationPath) {
  fs.rmSync(destinationPath, { recursive: true, force: true });
  fs.mkdirSync(destinationPath, { recursive: true });
  const command = [
    "$ErrorActionPreference='Stop'",
    `Expand-Archive -LiteralPath ${psQuote(archivePath)} -DestinationPath ${psQuote(destinationPath)} -Force`,
  ].join("; ");
  const result = shell("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]);
  if (result.status !== 0) {
    throw new Error(`Expand-Archive failed for ${archivePath}\n${result.stderr || result.stdout}`);
  }
}

function runSmoke() {
  const smokePath = path.join(projectDir, "smoke-check.ps1");
  const result = shell("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    smokePath,
  ]);
  return {
    command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${smokePath}"`,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function createStaticServer(documentRoot) {
  const rootResolved = path.resolve(documentRoot);
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(reqUrl.pathname);
    if (pathname === "/") pathname = "/index.html";
    const candidate = path.resolve(rootResolved, `.${pathname}`);
    if (candidate !== rootResolved && !candidate.startsWith(rootResolved + path.sep)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    fs.stat(candidate, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      const contentType = mime.get(path.extname(candidate).toLowerCase()) || "application/octet-stream";
      res.writeHead(200, { "content-type": contentType });
      fs.createReadStream(candidate).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function tableRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function summarizeViewport(result) {
  if (result.issues.length === 0) return "ok";
  return `issues-${result.issues.length}`;
}

function summarizeTarget(targetResult) {
  const count = targetResult.viewports.reduce((sum, item) => sum + item.issues.length, 0);
  return count === 0 ? "ok" : `issues-${count}`;
}

async function checkViewport(browser, target, documentRoot, viewport) {
  const server = await createStaticServer(documentRoot);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);

  const localHttpErrors = [];
  const localRequestFailures = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith(server.url) && response.status() >= 400) {
      localHttpErrors.push(`${response.status()} ${url.slice(server.url.length)}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith(server.url)) {
      localRequestFailures.push(`${url.slice(server.url.length)}: ${request.failure()?.errorText || "failed"}`);
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
    await page.goto(server.url, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForTimeout(700);
    metrics = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
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
      const missingHashLinks = Array.from(document.querySelectorAll("a[href^='#']"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter((href) => href && href !== "#" && href !== "#0" && !document.getElementById(decodeURIComponent(href.slice(1))));
      const largeVisualArea = Array.from(document.querySelectorAll("img, picture, canvas, video, svg"))
        .map((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return 0;
          if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return 0;
          const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
          const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
          return visibleWidth * visibleHeight;
        })
        .reduce((sum, area) => sum + area, 0);
      const rootStyle = window.getComputedStyle(root);
      const bodyStyle = window.getComputedStyle(body);
      return {
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        h1Text: document.querySelector("h1")?.innerText?.trim() || "",
        textLength: text.length,
        firstViewportTextLength: firstViewportText.length,
        visibleElementCount: visibleElements.length,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        largeVisualArea,
        viewportArea: window.innerWidth * window.innerHeight,
        rootOverflowX: rootStyle.overflowX,
        bodyOverflowX: bodyStyle.overflowX,
        bodyHeight: body?.scrollHeight || 0,
        missingHashLinks: Array.from(new Set(missingHashLinks)).slice(0, 10),
      };
    });

    const hasLargeVisual = metrics.largeVisualArea > metrics.viewportArea * 0.08;
    if (metrics.textLength < 120 && !hasLargeVisual) issues.push(`page text is too short: ${metrics.textLength} chars`);
    if (metrics.firstViewportTextLength < 40) issues.push(`first viewport has little visible text: ${metrics.firstViewportTextLength} chars`);
    if (metrics.visibleElementCount < 4) issues.push(`too few visible elements: ${metrics.visibleElementCount}`);
    if (metrics.missingHashLinks.length > 0) issues.push(`missing hash targets: ${metrics.missingHashLinks.join(", ")}`);
    const overflowHidden = [metrics.rootOverflowX, metrics.bodyOverflowX].some((value) => value === "hidden" || value === "clip");
    if (!overflowHidden && metrics.clientWidth > 0 && metrics.scrollWidth > metrics.clientWidth + 24) {
      issues.push(`horizontal overflow: scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`);
    }
  } catch (error) {
    issues.push(`navigation/evaluation failed: ${error.message}`);
  }

  if (localHttpErrors.length > 0) issues.push(`local HTTP errors: ${localHttpErrors.join("; ")}`);
  if (localRequestFailures.length > 0) issues.push(`local request failures: ${localRequestFailures.join("; ")}`);
  if (pageErrors.length > 0) issues.push(`page errors: ${pageErrors.join("; ")}`);
  if (consoleErrors.length > 0) issues.push(`console errors: ${consoleErrors.slice(0, 5).join("; ")}`);

  let screenshot = "";
  if (issues.length > 0) {
    fs.mkdirSync(screenshotRoot, { recursive: true });
    screenshot = path.join(
      screenshotRoot,
      `${safeName(target.domain)}-${viewport.name}.png`,
    );
    try {
      await page.screenshot({ path: screenshot, fullPage: false });
    } catch {
      screenshot = "";
    }
  }

  await context.close();
  await server.close();

  return {
    viewport: viewport.name,
    size: `${viewport.width}x${viewport.height}`,
    status: issues.length === 0 ? "ok" : `issues-${issues.length}`,
    issues,
    metrics,
    localHttpErrors,
    localRequestFailures,
    pageErrors,
    consoleErrors,
    screenshot: screenshot ? rel(screenshot) : "",
  };
}

function writeReport(results, smoke) {
  const totalTargets = results.length;
  const totalViewportChecks = results.reduce((sum, item) => sum + item.viewports.length, 0);
  const targetsOk = results.filter((item) => summarizeTarget(item) === "ok").length;
  const viewportIssues = results.reduce((sum, item) => (
    sum + item.viewports.filter((view) => view.issues.length > 0).length
  ), 0);

  const lines = [];
  lines.push(`# Browser QA ${releaseDate}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Targets: ${targetsOk}/${totalTargets} ok`);
  lines.push(`Viewport checks: ${totalViewportChecks - viewportIssues}/${totalViewportChecks} ok`);
  lines.push(`Viewports: ${viewports.map((item) => `${item.name} ${item.width}x${item.height}`).join(", ")}`);
  lines.push("");
  lines.push("## Smoke");
  lines.push("");
  lines.push("```powershell");
  lines.push(smoke.command);
  lines.push("```");
  lines.push("");
  lines.push("```text");
  lines.push(smoke.stdout || "(no stdout)");
  if (smoke.stderr) lines.push(smoke.stderr);
  lines.push("```");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(tableRow(["Target", "Desktop", "Tablet", "Mobile", "Notes"]));
  lines.push(tableRow(["---", "---", "---", "---", "---"]));
  for (const item of results) {
    const byViewport = Object.fromEntries(item.viewports.map((view) => [view.viewport, summarizeViewport(view)]));
    const notes = summarizeTarget(item) === "ok" ? "ok" : `${item.viewports.flatMap((view) => view.issues).length} issue(s)`;
    lines.push(tableRow([
      item.target.domain,
      byViewport.desktop || "n/a",
      byViewport.tablet || "n/a",
      byViewport.mobile || "n/a",
      notes,
    ]));
  }

  const issueResults = results.filter((item) => summarizeTarget(item) !== "ok");
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (issueResults.length === 0) {
    lines.push("- No browser QA blockers were found in automated desktop/tablet/mobile checks.");
  } else {
    for (const item of issueResults) {
      lines.push(`### ${item.target.domain}`);
      lines.push("");
      for (const view of item.viewports.filter((entry) => entry.issues.length > 0)) {
        lines.push(`- ${view.viewport} ${view.size}: ${view.issues.join("; ")}`);
        if (view.screenshot) lines.push(`  Screenshot: ${view.screenshot}`);
      }
      lines.push("");
    }
  }

  lines.push("## Method");
  lines.push("");
  lines.push("- Each release ZIP was unpacked into `_PROJECT/.browser-qa-YYYY-MM-DD/unpacked`.");
  lines.push("- Each unpacked archive was served as its own document root over `127.0.0.1`.");
  lines.push("- Local HTTP 4xx/5xx, local request failures, page errors, console errors, empty pages, missing hash targets, and horizontal overflow were treated as QA issues.");
  lines.push("- External network resources were not counted as blockers unless they caused page-level JavaScript errors.");
  lines.push("");
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
}

function rewriteReleaseIndex(indexEntries, results, smoke) {
  const byDomain = new Map(results.map((item) => [item.target.domain, summarizeTarget(item)]));
  const updated = indexEntries.map((entry) => ({
    ...entry,
    browserQA: byDomain.get(entry.domain) || "not-run",
    browserQAReport: reportPath,
  }));
  fs.writeFileSync(indexJsonPath, JSON.stringify(updated, null, 2), "utf8");

  const totalIssues = updated.reduce((sum, entry) => sum + Number(entry.staticIssueCount || 0), 0);
  const browserIssues = updated.filter((entry) => entry.browserQA !== "ok").length;
  const lines = [];
  lines.push("# Release index pikov.expert");
  lines.push("");
  lines.push(`Build date: ${releaseDate}`);
  lines.push(`Archives: ${updated.length} (23 subdomains + root)`);
  lines.push(`Static issues: ${totalIssues}`);
  lines.push(`Browser QA: ${browserIssues === 0 ? "ok" : `issues-${browserIssues}`}`);
  lines.push(`Browser QA report: ${reportPath}`);
  if (fs.existsSync(contentActualityPath)) {
    lines.push(`Content actuality notes: ${contentActualityPath}`);
  }
  lines.push("");
  lines.push("## Smoke");
  lines.push("");
  lines.push("```powershell");
  lines.push(smoke.command);
  lines.push("```");
  lines.push("");
  lines.push("```text");
  lines.push(smoke.stdout || "(no stdout)");
  if (smoke.stderr) lines.push(smoke.stderr);
  lines.push("```");
  lines.push("");
  lines.push("## Archives");
  lines.push("");
  lines.push("| Target | URL | Archive | Size | SHA256 | Static QA | Browser QA |");
  lines.push("|---|---|---|---:|---|---|---|");
  for (const entry of updated) {
    const sizeMb = Math.round((Number(entry.archiveBytes || 0) / 1024 / 1024) * 100) / 100;
    lines.push(tableRow([
      entry.domain,
      entry.url,
      String(entry.archivePath).replaceAll("\\", "\\\\"),
      `${sizeMb} MB`,
      entry.archiveSha256,
      entry.staticStatus,
      entry.browserQA,
    ]));
  }
  lines.push("");
  lines.push("## Publishing instruction");
  lines.push("");
  lines.push("- Unpack `pikov.expert-root-release-*.zip` into the document root for `pikov.expert`.");
  lines.push("- Unpack `<subdomain>.pikov.expert-release-*.zip` into the matching subdomain document root.");
  lines.push("- Archives have no extra top-level wrapper directory: `index.html` must land directly in the site root.");
  lines.push("");
  lines.push("## Residual risks");
  lines.push("");
  if (totalIssues === 0 && browserIssues === 0) {
    lines.push("- No static local-link or automated browser QA blockers were found.");
  } else {
    if (totalIssues > 0) lines.push(`- Static issues found: ${totalIssues}.`);
    if (browserIssues > 0) lines.push(`- Browser QA issues found on ${browserIssues} target(s). See ${reportPath}.`);
  }
  if (fs.existsSync(contentActualityPath)) {
    lines.push("- Content actuality sweep and final normative correction are recorded in `CONTENT_ACTUALITY_2026-06-20.md`.");
  }
  fs.writeFileSync(indexMdPath, `${lines.join("\n")}\n`, "utf8");

  for (const entry of updated) {
    const manifestPath = path.join(entry.releaseDir, "MANIFEST.json");
    const notesPath = path.join(entry.releaseDir, "RELEASE_NOTES.md");
    if (fs.existsSync(manifestPath)) {
      const manifest = readJson(manifestPath);
      manifest.browserQA = entry.browserQA;
      manifest.browserQAReport = reportPath;
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
    if (fs.existsSync(notesPath)) {
      const notes = fs.readFileSync(notesPath, "utf8")
        .replace(/^Browser QA: .+$/m, `Browser QA: ${entry.browserQA}`)
        .replace(/^## Residual risks$/m, `## Residual risks\n\nBrowser QA report: ${reportPath}`);
      fs.writeFileSync(notesPath, notes, "utf8");
    }
  }
}

async function main() {
  if (!fs.existsSync(indexJsonPath)) {
    throw new Error(`Missing release index JSON: ${indexJsonPath}`);
  }

  const indexEntries = readJson(indexJsonPath);
  fs.rmSync(qaRoot, { recursive: true, force: true });
  fs.mkdirSync(unpackedRoot, { recursive: true });

  const unpacked = [];
  for (const entry of indexEntries) {
    const destination = path.join(unpackedRoot, safeName(entry.domain));
    expandArchive(entry.archivePath, destination);
    unpacked.push({ entry, destination });
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const item of unpacked) {
      const targetResult = { target: item.entry, viewports: [] };
      for (const viewport of viewports) {
        targetResult.viewports.push(await checkViewport(browser, item.entry, item.destination, viewport));
      }
      results.push(targetResult);
      const status = summarizeTarget(targetResult);
      console.log(`${item.entry.domain}: ${status}`);
    }
  } finally {
    await browser.close();
  }

  const smoke = runSmoke();
  writeReport(results, smoke);
  rewriteReleaseIndex(indexEntries, results, smoke);

  const failedTargets = results.filter((item) => summarizeTarget(item) !== "ok").length;
  console.log(`BROWSER QA ${failedTargets === 0 ? "OK" : "ISSUES"}`);
  console.log(`targets=${results.length}`);
  console.log(`issues=${failedTargets}`);
  console.log(`report=${reportPath}`);
  if (smoke.status !== 0) process.exitCode = 2;
  if (failedTargets > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
