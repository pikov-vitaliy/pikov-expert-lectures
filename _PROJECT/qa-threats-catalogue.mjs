import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(projectDir, '..', 'threats');
// The same browser checks run against an unpacked release in CI. Keep the
// canonical workbook/CSV bytes as independent expected values for that fixture.
const siteDir = process.env.THREATS_SITE_DIR ? resolve(process.env.THREATS_SITE_DIR) : sourceDir;
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(projectDir, '.browser-node', 'node_modules', 'playwright'));
const screenshotDir = resolve(projectDir, '..', '.codex', 'threats-qa', new Date().toISOString().replace(/[:.]/g, '-'));
const remoteBase = process.env.THREATS_BASE_URL || process.env.BASE_URL;
const expectedXlsx = readFileSync(resolve(sourceDir, 'thrlist.xlsx'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const analyticsPattern = /^https?:\/\/(?:[^/]+\.)?(?:yandex\.(?:ru|com)|google-analytics\.com|googletagmanager\.com)\//i;

// Parse the actual downloaded bytes independently of the page's CSV generator.
// Source descriptions may contain embedded newlines inside quoted fields.
function parseCsv(bytes) {
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'CSV must start with a UTF-8 BOM');
  const source = bytes.toString('utf8').slice(1);
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && character === ';') {
      row.push(field); field = '';
    } else if (!quoted && character === '\r') {
      assert.equal(source[++i], '\n', 'CSV records must use CRLF');
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      assert.ok(quoted || character !== '\n', 'CSV records must not use a bare LF');
      field += character;
    }
  }
  assert.equal(quoted, false, 'CSV must not end inside a quoted field');
  if (field || row.length) { row.push(field); rows.push(row); }
  assert.equal(rows[0][0], 'Идентификатор');
  assert.equal(rows[0].length, 20, 'all source and analysis columns are exported');
  assert.ok(rows.every(record => record.length === rows[0].length), 'CSV rows retain their complete columns');
  return rows;
}

function localServer() {
  return createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }
    const target = resolve(siteDir, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    if (!target.startsWith(`${siteDir}${sep}`) || !existsSync(target) || !statSync(target).isFile()) {
      response.writeHead(404).end('Not found'); return;
    }
    const contentType = {
      '.html': 'text/html; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
      '.svg': 'image/svg+xml', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
    }[extname(target)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': contentType });
    response.end(readFileSync(target));
  });
}

async function downloadedBytes(page, selector) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await pending;
  assert.equal(await download.failure(), null, `${download.suggestedFilename()}: download failed`);
  const bytes = readFileSync(await download.path());
  return { bytes, name: download.suggestedFilename() };
}

async function assertCount(page, count) {
  await page.locator('#result-count').waitFor({ state: 'attached' });
  // A click may replace the document between polls. Wait for the exact expected
  // count in the destination instead of dereferencing a disappearing element.
  await page.waitForFunction(expected => document.getElementById('result-count')?.textContent === `Найдено угроз: ${expected}`, count);
}

async function assertReflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    escaped: [...document.querySelectorAll('.record, .detail, .catalog-switcher')]
      .filter(element => element.getClientRects().length)
      .filter(element => {
        const rectangle = element.getBoundingClientRect();
        return rectangle.left < -1 || rectangle.right > innerWidth + 1;
      }).map(element => element.id || element.className),
  }));
  assert.ok(metrics.overflow <= 1, `${label}: ${metrics.overflow}px horizontal overflow at ${metrics.viewport}px`);
  assert.deepEqual(metrics.escaped, [], `${label}: content outside viewport`);
}

test('threat catalogue works in the browser and retains its offline behaviour', { timeout: 120_000 }, async t => {
  mkdirSync(screenshotDir, { recursive: true });
  const server = localServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const localBase = `http://127.0.0.1:${server.address().port}/`;
  const base = remoteBase ? new URL(remoteBase.endsWith('/') ? remoteBase : `${remoteBase}/`).href : localBase;
  assert.ok(/^https?:\/\//.test(base), 'THREATS_BASE_URL/BASE_URL must be an HTTP(S) site root');
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    // Live smoke checks must not send test interactions to analytics.
    await context.route(analyticsPattern, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    const goto = async suffix => {
      // Begin with a fresh document so a fragment-only navigation cannot reuse
      // earlier filter state or return Playwright's null same-document response.
      await page.goto('about:blank');
      const response = await page.goto(new URL(suffix, base).href, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200, `${suffix}: HTTP status`);
      await page.locator('html.js-ready').waitFor();
    };
    const navigate = async (selector, destination) => {
      await Promise.all([
        page.waitForURL(new URL(destination, base).href, { waitUntil: 'domcontentloaded' }),
        page.locator(selector).click(),
      ]);
      await page.locator('html.js-ready').waitFor();
    };

    await t.test('Russian content, paging, show-all and the opened detail fit the desktop', async () => {
      await goto('index.html');
      assert.equal(await page.locator('html').getAttribute('lang'), 'ru');
      assert.match(await page.locator('h1').innerText(), /Угрозы безопасности\s+программного обеспечения/);
      assert.equal(await page.locator('#source-total').innerText(), '227');
      await assertCount(page, 177);
      assert.equal(await page.locator('#records .record').count(), 20);
      assert.equal(await page.locator('#page-number').innerText(), '1 / 9');
      assert.equal(await page.locator('#prev').isDisabled(), true);
      const firstIds = await page.locator('#records .record').evaluateAll(elements => elements.map(element => element.id));
      await page.locator('#next').click();
      assert.equal(await page.locator('#page-number').innerText(), '2 / 9');
      assert.equal(await page.locator('#records .record').count(), 20);
      const nextIds = await page.locator('#records .record').evaluateAll(elements => elements.map(element => element.id));
      assert.ok(nextIds.every(id => !firstIds.includes(id)), 'adjacent pages must not repeat records');
      await page.locator('#prev').click();
      assert.deepEqual(await page.locator('#records .record').evaluateAll(elements => elements.map(element => element.id)), firstIds);
      await page.locator('#page-size').selectOption('all');
      assert.equal(await page.locator('#records .record').count(), 177);
      assert.equal(await page.locator('#next').isDisabled(), true);
      assert.equal(await page.locator('#page-number').innerText(), '1 / 1');
      await goto('index.html#ubi-3');
      assert.equal(await page.locator('#ubi-3').getAttribute('open'), '');
      assert.match(await page.locator('#ubi-3 .detail').innerText(), /Почему включена[\s\S]+Программный объект[\s\S]+Условие применимости[\s\S]+Описание из источника/);
      await assertReflow(page, 'desktop detail');
      await page.screenshot({ path: resolve(screenshotDir, 'software-desktop-detail.png') });
    });

    await t.test('search and combined applicability/category filters support empty and reset states', async () => {
      await goto('index.html');
      await page.locator('#search').fill('УБИ.003');
      await assertCount(page, 1);
      assert.match(page.url(), /\?q=/);
      await page.locator('input[name="scope"][value="include"]').check();
      await page.locator('input[name="category"][value="Код и выполнение"]').check();
      await assertCount(page, 1);
      assert.equal(await page.locator('#records .record').getAttribute('id'), 'ubi-3');
      await page.locator('input[name="scope"][value="conditional"]').check();
      await assertCount(page, 0);
      assert.equal(await page.locator('#empty').isVisible(), true);
      assert.equal(await page.locator('#export-top').isDisabled(), true);
      await page.locator('#empty-reset').click();
      await assertCount(page, 177);
      assert.equal(await page.locator('#search').inputValue(), '');
      assert.equal(new URL(page.url()).search, '');
      await page.locator('#search').fill('криптографических алгоритмов');
      assert.ok(Number((await page.locator('#result-count').innerText()).match(/\d+/)[0]) > 0);
      await page.locator('#clear-search').click();
      await assertCount(page, 177);
      assert.equal(await page.locator('#search').evaluate(element => element === document.activeElement), true);
    });

    await t.test('CSV exports all filtered records, with BOM/CRLF, while XLSX keeps the source bytes', async () => {
      await goto('index.html');
      await page.locator('input[name="scope"][value="include"]').check();
      await assertCount(page, 68);
      assert.equal(await page.locator('#records .record').count(), 20, 'export starts from a paged subset');
      const csv = await downloadedBytes(page, '#export-top');
      assert.equal(csv.name, 'software-threats.csv');
      const rows = parseCsv(csv.bytes);
      assert.equal(rows.length, 69, 'header plus every filtered record, not just the 20 visible ones');
      assert.ok(rows.slice(1).every(row => row[3] === 'Прямая'), 'the applicability filter must apply to CSV');
      await page.locator('#page-size').selectOption('all');
      const shownIds = await page.locator('#records .record-id').allTextContents();
      assert.deepEqual(rows.slice(1).map(row => row[0]), shownIds);
      assert.match(await page.locator('#notification').innerText(), /Выгружено записей: 68/);
      const xlsx = await downloadedBytes(page, 'a[href="thrlist.xlsx"]');
      assert.equal(xlsx.name, 'thrlist.xlsx');
      assert.equal(sha256(xlsx.bytes), sha256(expectedXlsx), 'downloaded workbook must match the imported source');
    });

    await t.test('archive status, cross-subset deep links and related search results remain explicit', async () => {
      await goto('index.html#ubi-218');
      await assertCount(page, 1);
      assert.equal(await page.locator('#ubi-218').getAttribute('open'), '');
      assert.match(await page.locator('#ubi-218 .source-line').innerText(), /Статус: Архивная/);
      assert.match(await page.locator('#ubi-218 .detail').innerText(), /утратили свою актуальность[\s\S]+https:\/\/bdu\.fstec\.ru\/threat\/ai/);
      await goto('index.html#ubi-1');
      await page.waitForURL(new URL('excluded.html#ubi-1', base).href, { waitUntil: 'domcontentloaded' });
      await assertCount(page, 1);
      assert.equal(await page.locator('#ubi-1').getAttribute('open'), '');
      assert.match(await page.locator('.list-head').innerText(), /Почему не подходит для ПО/);
      assert.match(await page.locator('#ubi-1 .exclusion-reason').innerText(), /не самостоятельным механизмом программного продукта/);
      await navigate('.catalog-switcher a[href="index.html"]', 'index.html');
      await assertCount(page, 177);
      await page.locator('#search').fill('1');
      await assertCount(page, 0);
      assert.equal(await page.locator('#other-results').isVisible(), true);
      await navigate('#other-results-link', 'excluded.html?q=1');
      await assertCount(page, 1);
      assert.equal(await page.locator('#records .record').getAttribute('id'), 'ubi-1');
      await navigate('.catalog-switcher a[href="index.html"]', 'index.html');
      await navigate('.catalog-switcher a[href="excluded.html"]', 'excluded.html');
      await assertCount(page, 50);
      assert.equal(await page.locator('#scope-filters').isVisible(), false);
      const excludedCsv = parseCsv((await downloadedBytes(page, '#export-top')).bytes);
      assert.equal(excludedCsv.length, 51);
      assert.ok(excludedCsv.slice(1).every(row => row[3] === 'Вне области анализа ПО' && row[8].length > 0));
    });

    await t.test('both subsets and opened details reflow at 390 and 320 CSS pixels', async () => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const [file, id] of [['index.html', 218], ['excluded.html', 1]]) {
          await goto(`${file}#ubi-${id}`);
          await assertCount(page, 1);
          await assertReflow(page, `${file} mobile ${width}`);
          assert.equal(await page.locator('#filter-toggle').isVisible(), true);
          await page.locator('#filter-toggle').click();
          assert.equal(await page.locator('#filter-toggle').getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('#filters').isVisible(), true);
          await assertReflow(page, `${file} mobile filters ${width}`);
          await page.locator('#filter-toggle').click();
          if (width === 390) await page.screenshot({ path: resolve(screenshotDir, `${file.split('.')[0]}-mobile-detail.png`) });
        }
      }
    });

    await t.test('no-JavaScript pages retain all 227 disjoint records and static downloads', async () => {
      const offline = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const noJs = await offline.newPage();
      const allIds = [];
      try {
        for (const [file, count, csvFile] of [['index.html', 177, 'software-threats.csv'], ['excluded.html', 50, 'excluded-threats.csv']]) {
          await noJs.goto(new URL(file, base).href, { waitUntil: 'networkidle' });
          assert.equal(await noJs.locator('#records .record').count(), count);
          allIds.push(...await noJs.locator('#records .record').evaluateAll(elements => elements.map(element => element.id)));
          assert.equal(await noJs.locator('#search').isVisible(), false);
          assert.equal(await noJs.locator('noscript .static-note').isVisible(), true);
          const first = noJs.locator('#records .record').first();
          await first.locator('summary').click();
          assert.equal(await first.getAttribute('open'), '');
          await assertReflow(noJs, `${file} no JavaScript`);
          const downloaded = await downloadedBytes(noJs, `noscript a[href="${csvFile}"]`);
          const csv = parseCsv(downloaded.bytes);
          assert.equal(csv.length, count + 1);
          assert.equal(sha256(downloaded.bytes), sha256(readFileSync(resolve(sourceDir, csvFile))), `${csvFile}: published/static release bytes must match the canonical source`);
        }
        assert.equal(allIds.length, 227);
        assert.equal(new Set(allIds).size, 227, 'no omissions or duplicates between prerendered subsets');
      } finally { await offline.close(); }
    });

    await t.test('local HTTP pages never request analytics', async () => {
      const offline = await browser.newContext();
      const attempts = [];
      await offline.route(analyticsPattern, route => {
        attempts.push(route.request().url());
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      });
      const local = await offline.newPage();
      local.on('pageerror', error => errors.push(`offline: ${error}`));
      try {
        // File-origin analytics is checked by the source package's VM tests;
        // this browser regression stays on its dedicated loopback HTTP server.
        for (const file of ['index.html', 'excluded.html']) {
          await local.goto(new URL(file, localBase).href, { waitUntil: 'networkidle' });
          await local.locator('html.js-ready').waitFor();
          await local.locator('#search').fill('218');
          assert.equal(await local.locator('#search').inputValue(), '218');
        }
        assert.deepEqual(attempts, [], 'offline browsing must not disclose local file paths or queries to analytics');
      } finally { await offline.close(); }
    });
    assert.deepEqual(errors, [], 'browser JavaScript errors');
    await context.close();
    process.stdout.write(`Threat catalogue browser evidence: ${base}\nSite fixture: ${siteDir}\nScreenshots: ${screenshotDir}\n`);
  } finally {
    await browser.close();
    await new Promise(done => server.close(done));
  }
});
