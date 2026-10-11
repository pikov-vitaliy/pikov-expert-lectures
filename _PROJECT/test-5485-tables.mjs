import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const project = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(project, '.browser-node/node_modules/playwright'));
const url = process.env.LECTURE_5485_URL || pathToFileURL(resolve(project, '../5485-1/index.html')).href;

test('wide lecture tables retain reading context and accessible navigation', { timeout: 120000 }, async t => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      for (const colorScheme of ['light', 'dark']) {
        await t.test(`${width}px ${colorScheme}`, async () => {
          const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.route('**/metrika/**', route => route.abort());
          await page.goto(url, { waitUntil: 'networkidle' });
          assert.equal(await page.locator('.reading table').count(), 17);
          assert.equal(await page.locator('.table-panel').count(), 6);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          const panel = page.locator('.table-panel').first();
          const wrap = panel.locator('.table-wrap');
          const bar = panel.getByRole('slider', { name: 'Горизонтальная прокрутка таблицы' });
          const originalText = await wrap.innerText();
          await panel.scrollIntoViewIfNeeded();
          await panel.getByRole('button', { name: 'Прокрутить таблицу вправо' }).click();
          await page.waitForFunction(() => document.querySelector('.table-panel .table-wrap').scrollLeft > 0);
          await page.waitForFunction(() => { const p = document.querySelector('.table-panel'); return Math.abs(p.querySelector('.table-wrap').scrollLeft - Number(p.querySelector('.table-top-scroll input').value)) < 2; });
          await bar.focus();
          await page.keyboard.press('End');
          await page.waitForFunction(() => { const w = document.querySelector('.table-panel .table-wrap'); return Math.abs(w.scrollWidth - w.clientWidth - w.scrollLeft) < 2; });
          await page.keyboard.press('Home');
          await page.waitForFunction(() => document.querySelector('.table-panel .table-wrap').scrollLeft === 0);
          const opener = panel.locator('.table-expand');
          await opener.click();
          const dialog = page.getByRole('dialog');
          assert.equal(await dialog.isVisible(), true);
          assert.equal(await dialog.locator('table').innerText(), originalText);
          assert.ok(await dialog.evaluate(d => d.getBoundingClientRect().width <= innerWidth && d.getBoundingClientRect().height <= innerHeight));
          await dialog.locator('.table-wrap').evaluate(w => { w.scrollLeft = 400; w.scrollTop = 350; });
          await page.waitForFunction(() => document.querySelector('.table-dialog .table-wrap').scrollTop > 0);
          assert.ok(await dialog.evaluate(d => {
            const viewport = d.querySelector('.table-wrap').getBoundingClientRect();
            const head = d.querySelector('thead th').getBoundingClientRect();
            const first = d.querySelector('tbody tr > :first-child').getBoundingClientRect();
            return Math.abs(head.top - viewport.top) < 3 && Math.abs(first.left - viewport.left) < 3;
          }), 'sticky headers and row names stay at the viewport edges');
          await page.keyboard.press('Escape');
          assert.equal(await dialog.isVisible(), false);
          assert.ok(await opener.evaluate(e => document.activeElement === e));
          assert.equal(await wrap.innerText(), originalText);
          await opener.click();
          await dialog.getByRole('button', { name: 'Закрыть таблицу' }).click();
          assert.equal(await dialog.isVisible(), false);
          assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
          await page.emulateMedia({ media: 'print' });
          assert.equal(await panel.locator('.table-tools').isVisible(), false);
          assert.equal(await wrap.evaluate(w => getComputedStyle(w).maxHeight), 'none');
          assert.equal(await wrap.locator('table').evaluate(e => getComputedStyle(e).minWidth), '0px');
          assert.deepEqual(errors, []);
          await context.close();
        });
      }
    }
    await t.test('source tables remain readable without JavaScript', async () => {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(url);
      assert.equal(await page.locator('.reading table').count(), 17);
      assert.equal(await page.locator('.table-expand').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.match(await page.locator('.reading').innerText(), /Персональные данные/);
      await context.close();
    });
  } finally {
    await browser.close();
  }
});
