import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = dirname(fileURLToPath(import.meta.url));
const playwrightPath = resolve(projectDir, ".browser-node", "node_modules", "playwright");
const { chromium } = require(playwrightPath);
const tzUrl = pathToFileURL(resolve(projectDir, "..", "tz", "index.html")).href;

test("TZ deep links and end navigation reach slide 104", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(`${tzUrl}#slide-104`, { waitUntil: "domcontentloaded" });

    const deepLinkState = await page.evaluate(() => ({
      current: document.querySelector(".slide.is-current")?.id,
      slide104Display: getComputedStyle(document.getElementById("slide-104")).display,
      slide100Display: getComputedStyle(document.getElementById("slide-100")).display,
      counter: document.getElementById("nav-counter")?.textContent.trim(),
      progress: document.getElementById("progress-bar")?.style.width,
      nextDisabled: document.getElementById("nav-next")?.disabled,
      lastDisabled: document.getElementById("nav-last")?.disabled,
    }));
    assert.deepEqual(deepLinkState, {
      current: "slide-104",
      slide104Display: "flex",
      slide100Display: "none",
      counter: "104 / 104",
      progress: "100%",
      nextDisabled: true,
      lastDisabled: true,
    });

    await page.click("#nav-first");
    await page.keyboard.press("End");
    assert.equal(await page.locator(".slide.is-current").getAttribute("id"), "slide-104");
    assert.equal(await page.locator("#nav-counter").textContent(), "104 / 104");
  } finally {
    await browser.close();
  }
});
