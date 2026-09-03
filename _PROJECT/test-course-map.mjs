import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(projectDir, '..');
const read = relative => {
  const target = resolve(rootDir, relative);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
};

const registry = JSON.parse(read('_PROJECT/lectures.json'));
const courseStandard = read('_PROJECT/COURSE_DESIGN_STANDARD.md');
const expectedTargets = ['https://pikov.expert/'];
const seenFolders = new Set();
for (const lecture of [...registry.lectures].sort((a, b) => a.position - b.position)) {
  if (seenFolders.has(lecture.folder)) continue;
  seenFolders.add(lecture.folder);
  expectedTargets.push(lecture.url);
}

const page = read('course-map.html');
const rootIndex = read('index.html');
const buildRelease = read('_PROJECT/build-release.ps1');
const updateControls = read('_PROJECT/update-site-control-files.ps1');
const smoke = read('_PROJECT/smoke-check.ps1');
const sitemap = read('sitemap.xml');
const require = createRequire(import.meta.url);

function cardsFrom(html) {
  return [...html.matchAll(/<article\s+class="course-card"\s+data-target="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)]
    .map(match => ({ target: match[1], body: match[2] }));
}

test('course map covers exactly the 31 release targets', () => {
  assert.equal(expectedTargets.length, 31, 'release contract must stay at root + 30 unique folders');
  const cards = cardsFrom(page);
  assert.equal(cards.length, 31);
  assert.deepEqual(cards.map(card => card.target).sort(), [...expectedTargets].sort());
  assert.equal(new Set(cards.map(card => card.target)).size, 31);
});

test('every target has the complete measurable teaching contract', () => {
  const cards = cardsFrom(page);
  assert.equal(cards.length, 31);
  for (const card of cards) {
    for (const label of [
      'Аудитория',
      'Предпосылки',
      'Измеримый результат',
      'Артефакт',
      'Критерий / рубрика',
      'Маршрут и время',
    ]) {
      assert.match(card.body, new RegExp(`<dt>${label.replace('/', '\\/')}</dt>\\s*<dd>[^<]{12,}`, 'u'), `${card.target}: ${label}`);
    }
  }
});

test('map is neutral, semantic, grouped into five directions and standards-backed', () => {
  assert.match(page, /^<!doctype html>/i);
  assert.match(page, /<html\s+lang="ru"/i);
  assert.match(page, /<link\s+rel="icon"\s+href="data:image\/svg\+xml/iu);
  assert.equal((page.match(/<main\b/g) || []).length, 1);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.equal((page.match(/<section\s+class="track"\s+data-track=/g) || []).length, 5);
  assert.doesNotMatch(page, /\u041c\u0410\u0421\u041a\u041e\u041c|Mascom/i);
  assert.doesNotMatch(page, /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+20\d{2}\b/iu);

  assert.match(page, /https:\/\/www\.nist\.gov\/itl\/applied-cybersecurity\/nice\/nice-framework-resource-center\/nice-framework-current-versions/);
  assert.match(page, /Work Roles[^<]+не[^<]+должност/iu);
  assert.match(page, /Task, Knowledge and Skill|Task, Knowledge, and Skill/);
  assert.match(page, /https:\/\/csrc\.nist\.gov\/Projects\/ssdf\/publications/i);
  assert.match(page, /SP 800-218[^<]+Version 1\.1[^<]+Final/iu);
  assert.match(page, /Rev\. 1[^<]+Draft/iu);
  assert.match(page, /https:\/\/owasp\.org\/Top10\/2025\//);
  assert.match(page, /https:\/\/owasp\.org\/www-project-application-security-verification-standard\//);
  assert.match(page, /https:\/\/owasp\.org\/www-project-web-security-testing-guide\//);
  assert.match(page, /локальн[^<]+разреш[её]нн[^<]+стенд/iu);
  assert.match(page, /не направлять[^<]+внешн/iu);
  assert.match(courseStandard, /NIST SP 800-154[^|\n]+Initial Public Draft/iu);
  assert.match(courseStandard, /draft[^\n]+не выдавать за действующий baseline/iu);
});

test('root navigation, release whitelist, smoke gate and sitemap generator publish the map', () => {
  assert.match(rootIndex, /href="\/course-map\.html"/);
  assert.match(buildRelease, /'course-map\.html'/);
  assert.match(updateControls, /Add-UniqueUrl\s+-List\s+\$rootUrls\s+-Url\s+'https:\/\/pikov\.expert\/course-map\.html'/);
  assert.match(smoke, /course-map\.html/);
  assert.match(sitemap, /<loc>https:\/\/pikov\.expert\/course-map\.html<\/loc>/);
});

test('sitemap generator emits the companion URL in an isolated fixture', () => {
  const fixture = mkdtempSync(resolve(tmpdir(), 'pikov-course-map-'));
  try {
    mkdirSync(resolve(fixture, '_PROJECT'));
    mkdirSync(resolve(fixture, 'alpha'));
    cpSync(resolve(projectDir, 'update-site-control-files.ps1'), resolve(fixture, '_PROJECT', 'update-site-control-files.ps1'));
    writeFileSync(resolve(fixture, '_PROJECT', 'lectures.json'), JSON.stringify({
      updated: '2026-01-01',
      lectures: [{ position: 1, folder: 'alpha', domain: 'alpha', url: 'https://alpha.pikov.expert/' }],
    }), 'utf8');
    writeFileSync(resolve(fixture, 'alpha', 'index.html'), '<!doctype html><html lang="ru"><title>Alpha</title>', 'utf8');
    const run = spawnSync('pwsh.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive',
      '-File', resolve(fixture, '_PROJECT', 'update-site-control-files.ps1'),
      '-Root', fixture,
    ], { encoding: 'utf8' });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    const generated = readFileSync(resolve(fixture, 'sitemap.xml'), 'utf8');
    assert.match(generated, /<loc>https:\/\/pikov\.expert\/<\/loc>/);
    assert.match(generated, /<loc>https:\/\/pikov\.expert\/course-map\.html<\/loc>/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('course map reflows cleanly in Chromium at three teaching viewports', async () => {
  const playwrightPath = resolve(projectDir, '.browser-node', 'node_modules', 'playwright');
  assert.ok(existsSync(playwrightPath), 'Playwright is not installed in _PROJECT/.browser-node');
  const { chromium } = require(playwrightPath);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = resolve(rootDir, relative);
    if (!target.startsWith(`${rootDir}\\`) || !existsSync(target)) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(readFileSync(target));
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      await context.route(/^https:\/\/mc\.yandex\./, route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '',
      }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(`pageerror: ${error}`));
      page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
      const response = await page.goto(`http://127.0.0.1:${port}/course-map.html`, { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), 200, `${viewport.width}: response`);
      await page.waitForTimeout(100);
      const metrics = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.course-card')];
        const localAnchors = [...document.querySelectorAll('a[href^="#"]')];
        const hrefs = [...document.querySelectorAll('a[href]')].map(link => link.getAttribute('href'));
        return {
          main: document.querySelectorAll('main').length,
          h1: document.querySelectorAll('h1').length,
          cards: cards.length,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
          cardsInsideViewport: cards.every(card => {
            const box = card.getBoundingClientRect();
            return box.left >= -0.5 && box.right <= innerWidth + 0.5;
          }),
          anchorsResolve: localAnchors.every(link => !!document.querySelector(link.hash)),
          hrefsValid: hrefs.every(href => {
            try { new URL(href, location.href); return !!href && !href.startsWith('javascript:'); }
            catch { return false; }
          }),
          firstDlColumns: getComputedStyle(document.querySelector('.course-card dl')).gridTemplateColumns.split(' ').length,
          bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
        };
      });
      assert.deepEqual(errors, [], `${viewport.width}: console/page errors`);
      assert.equal(metrics.main, 1, `${viewport.width}: main`);
      assert.equal(metrics.h1, 1, `${viewport.width}: h1`);
      assert.equal(metrics.cards, 31, `${viewport.width}: cards`);
      assert.ok(metrics.overflow <= 1, `${viewport.width}: horizontal overflow ${metrics.overflow}px`);
      assert.ok(metrics.cardsInsideViewport, `${viewport.width}: card outside viewport`);
      assert.ok(metrics.anchorsResolve, `${viewport.width}: broken local anchor`);
      assert.ok(metrics.hrefsValid, `${viewport.width}: invalid href`);
      assert.ok(metrics.bodyFont >= 16, `${viewport.width}: body font ${metrics.bodyFont}px`);
      if (viewport.width === 390) assert.equal(metrics.firstDlColumns, 1, '390: definition list must reflow to one column');
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
});
