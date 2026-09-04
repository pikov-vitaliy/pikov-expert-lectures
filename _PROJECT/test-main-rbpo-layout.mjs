import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(projectDir);
const lectureDir = resolve(rootDir, 'main-rbpo');
const playwrightPath = resolve(projectDir, '.browser-node', 'node_modules', 'playwright');
const require = createRequire(import.meta.url);

const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
]);

function startServer() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = resolve(lectureDir, relative);
    if (!target.startsWith(`${lectureDir}${sep}`) || !existsSync(target) || !statSync(target).isFile()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': mime.get(extname(target)) || 'application/octet-stream' });
    response.end(readFileSync(target));
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

test('the hero quotation stays inside its card on desktop viewports', async () => {
  assert.ok(existsSync(playwrightPath), 'Playwright is not installed in _PROJECT/.browser-node');
  const { chromium } = require(playwrightPath);
  const server = await startServer();
  const { port } = server.address();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('main-rbpo-theme', 'dark'));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);

    for (const width of [1081, 1280, 1366, 1384, 1440, 1469, 1536, 1600, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const metrics = await page.evaluate(() => {
        const card = document.querySelector('.manifesto-card');
        const quote = card?.querySelector('p');
        const footer = card?.querySelector('footer');
        const cardRect = card?.getBoundingClientRect();
        return {
          quoteOverflow: quote ? quote.scrollWidth - quote.clientWidth : Number.POSITIVE_INFINITY,
          footerOverflow: footer ? footer.scrollWidth - footer.clientWidth : Number.POSITIVE_INFINITY,
          cardLeft: cardRect?.left ?? Number.NEGATIVE_INFINITY,
          cardRight: cardRect?.right ?? Number.POSITIVE_INFINITY,
          viewport: innerWidth,
        };
      });

      assert.ok(
        metrics.quoteOverflow <= 1,
        `${width}px: quotation intrudes into the card padding by ${metrics.quoteOverflow}px`,
      );
      assert.ok(
        metrics.footerOverflow <= 1,
        `${width}px: attribution intrudes into the card padding by ${metrics.footerOverflow}px`,
      );
      assert.ok(
        metrics.cardLeft >= -1 && metrics.cardRight <= metrics.viewport + 1,
        `${width}px: rotated quotation card leaves the viewport (${metrics.cardLeft}..${metrics.cardRight})`,
      );
    }

    for (const fontFamily of ['"Segoe UI", sans-serif', 'Arial, sans-serif']) {
      await page.locator('.manifesto-card p').evaluate((quote, family) => {
        quote.style.fontFamily = family;
      }, fontFamily);
      await page.evaluate(() => document.fonts.ready);

      for (const width of [1280, 1440, 1600, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        const overflow = await page.locator('.manifesto-card p').evaluate(
          quote => quote.scrollWidth - quote.clientWidth,
        );
        assert.ok(
          overflow <= 1,
          `${width}px with ${fontFamily}: quotation intrudes into the card padding by ${overflow}px`,
        );
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  }
});
