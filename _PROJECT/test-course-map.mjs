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
const ruPage = read('ru/course-map.html');
const localeBuilder = read('_PROJECT/build-root-locales.mjs');
const rootIndex = read('index.html');
const buildRelease = read('_PROJECT/build-release.ps1');
const updateControls = read('_PROJECT/update-site-control-files.ps1');
const smoke = read('_PROJECT/smoke-check.ps1');
const sitemap = read('sitemap.xml');
const require = createRequire(import.meta.url);

const escapeRe = value => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const CONTRACT_LABELS = [
  ['Аудитория', 'Audience'],
  ['Предпосылки', 'Prerequisites'],
  ['Измеримый результат', 'Measurable outcome'],
  ['Артефакт', 'Artefact'],
  ['Критерий / рубрика', 'Assessment criteria'],
  ['Маршрут и время', 'Route and time'],
];

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
    for (const [ru, en] of CONTRACT_LABELS) {
      // Обе языковые версии едут в разметке, поэтому проверяется вся пара:
      // и подпись поля, и непустое значение на каждом языке.
      const dt = `<dt><span data-l="ru">${escapeRe(ru)}</span><span data-l="en">${escapeRe(en)}</span></dt>`;
      const dd = '<dd><span data-l="ru">[^<]{12,}</span><span data-l="en">[^<]{12,}</span></dd>';
      assert.match(card.body, new RegExp(dt + dd, 'u'), `${card.target}: ${ru} / ${en}`);
    }
  }
});

test('map is neutral, semantic, grouped into five directions and standards-backed', () => {
  assert.match(page, /^<!doctype html>/i);
  assert.match(page, /<html\s+lang="en"\s+data-lang="en">/i);
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

    // Языки и тема в живом браузере. Один контекст на все проверки: на
    // Windows-раннере сокеты заканчиваются примерно после десятка вкладок.
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      colorScheme: 'dark',
    });
    await context.route(/^https:\/\/mc\.yandex\./, route => route.fulfill({
      status: 200, contentType: 'application/javascript', body: '',
    }));
    const bilingual = await context.newPage();
    const visibleText = () => bilingual.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          for (let el = node.parentElement; el; el = el.parentElement) {
            if (el.id === 'langToggle') return NodeFilter.FILTER_REJECT;
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const out = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node.nodeValue.trim());
      return out.join(' ');
    });

    await bilingual.goto(`http://127.0.0.1:${port}/course-map.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await bilingual.evaluate(() => document.documentElement.lang), 'en');
    const englishView = await visibleText();
    assert.doesNotMatch(englishView, /[Ѐ-ӿ]/u, 'Cyrillic visible on the English route');
    assert.match(englishView, /Measurable outcome/);
    assert.equal(
      await bilingual.evaluate(() => document.getElementById('langToggle').getAttribute('href')),
      '/ru/course-map.html',
    );
    // Тема: явный светлый выбор обязан пережить системную тёмную настройку.
    assert.equal(
      await bilingual.evaluate(() => getComputedStyle(document.body).backgroundColor),
      'rgb(14, 23, 18)',
      'dark system preference must paint the dark background',
    );
    await bilingual.evaluate(() => localStorage.setItem('theme', 'light'));
    await bilingual.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(
      await bilingual.evaluate(() => getComputedStyle(document.body).backgroundColor),
      'rgb(244, 247, 245)',
      'an explicit light choice must survive a dark system preference',
    );

    await bilingual.goto(`http://127.0.0.1:${port}/ru/course-map.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await bilingual.evaluate(() => document.documentElement.lang), 'ru');
    const russianView = await visibleText();
    assert.match(russianView, /Измеримый результат/u);
    assert.doesNotMatch(russianView, /Measurable outcome/);
    assert.equal(
      await bilingual.evaluate(() => document.getElementById('langToggle').getAttribute('href')),
      '/course-map.html',
    );
    assert.equal(
      await bilingual.evaluate(() => getComputedStyle(document.body).backgroundColor),
      'rgb(244, 247, 245)',
      'the theme choice must carry across the language routes',
    );
    await context.close();
  } finally {
    await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
});

test('the map ships both languages and defaults to English', () => {
  assert.ok(ruPage, 'ru/course-map.html is missing');
  assert.match(ruPage, /<html\s+lang="ru"\s+data-lang="ru">/i);
  assert.match(ruPage, /<link rel="canonical" href="https:\/\/pikov\.expert\/ru\/course-map\.html">/);
  assert.match(page, /<link rel="canonical" href="https:\/\/pikov\.expert\/course-map\.html">/);
  for (const document_ of [page, ruPage]) {
    assert.match(document_, /<link rel="alternate" hreflang="en" href="https:\/\/pikov\.expert\/course-map\.html">/);
    assert.match(document_, /<link rel="alternate" hreflang="ru" href="https:\/\/pikov\.expert\/ru\/course-map\.html">/);
    assert.match(document_, /<link rel="alternate" hreflang="x-default" href="https:\/\/pikov\.expert\/course-map\.html">/);
    assert.match(document_, /property="og:locale:alternate"/);
    assert.match(document_, /data-l="ru"/);
    assert.match(document_, /data-l="en"/);
    // Вложенный <span> внутри языковой пары сломал бы нежадные регулярки везде,
    // где пара разбирается регулярным выражением.
    assert.doesNotMatch(document_, /<span data-l="(?:ru|en)">(?:(?!<\/span>)[\s\S])*<span\b/);
  }
  assert.match(page, /property="og:locale" content="en_US"/);
  assert.match(ruPage, /property="og:locale" content="ru_RU"/);
});

test('the Russian map is generated from the English source, never hand-written', () => {
  assert.match(localeBuilder, /course-map\.html/);
  const run = spawnSync(process.execPath, [resolve(projectDir, 'build-root-locales.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
});

test('the language switch is defined in every theme state', () => {
  const style = page.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  for (const token of ['--lang-bg', '--lang-bg-hover', '--lang-ink', '--lang-ring']) {
    // :root, :root[data-theme="dark"] и @media (prefers-color-scheme: dark).
    // Пропуск любого из трёх делает кнопку невидимой в одном из состояний —
    // этот дефект на сайте уже ловили четыре раза.
    const defined = style.match(new RegExp(`${token}\\s*:`, 'g')) || [];
    assert.equal(defined.length, 3, `${token} defined ${defined.length} times`);
  }
  assert.match(style, /:root\[data-lang="en"\] \[data-l="ru"\] \{ display: none !important; \}/);
  assert.match(style, /:root\[data-lang="ru"\] \[data-l="en"\] \{ display: none !important; \}/);
  assert.match(style, /:root:not\(\[data-theme="light"\]\)/);
});

test('every course card is deep-linkable with a CSS-safe id', () => {
  const ids = [...page.matchAll(/<article class="course-card" data-target="[^"]+" id="([^"]+)">/g)].map(m => m[1]);
  assert.equal(ids.length, 31, 'every card must carry an id');
  assert.equal(new Set(ids).size, 31, 'card ids must be unique');
  for (const id of ids) {
    // Идентификатор, начинающийся с цифры, — валидный HTML, но невалидный
    // CSS-селектор: querySelector('#27-07-2026') выбрасывает SyntaxError.
    assert.match(id, /^[A-Za-z][A-Za-z0-9-]*$/, `id ${id} is not a valid CSS identifier`);
  }
  assert.equal((page.match(/ id="course-/g) || []).length, 31);
});

test('the English reader is told the courses themselves are in Russian', () => {
  const notice = page.match(/<p class="lang-notice" data-l="en">([\s\S]*?)<\/p>/)?.[1] ?? '';
  assert.match(notice, /Russian/i);
  assert.match(notice, /vitaly@pikov\.expert/);
  assert.doesNotMatch(notice, /[\u0400-\u04FF]/u);
});

test('English copy carries no untranslated Cyrillic', () => {
  for (const [label, document_] of [['course-map.html', page], ['ru/course-map.html', ruPage]]) {
    // Кнопка языка — единственное законное исключение: в английском виде она
    // подписана «Русский», потому что называет язык, на который переключит.
    const scanned = document_.replace(/<a class="lang-btn" id="langToggle"[\s\S]*?<\/a>/, '');
    const english = [...scanned.matchAll(/<span data-l="en">([\s\S]*?)<\/span>/g)].map(m => m[1]);
    assert.ok(english.length > 200, `${label}: expected the whole page translated, got ${english.length} spans`);
    for (const value of english) {
      assert.doesNotMatch(value, /[\u0400-\u04FF]/u, `${label}: Cyrillic left in an English span: ${value.slice(0, 90)}`);
    }
  }
});

test('the printed map keeps the destination of every course link', () => {
  const style = page.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  assert.match(style, /@media print/);
  assert.match(style, /\.course-link::after[\s\S]{0,160}attr\(href\)/);
  // Цвета форсируются на :root — .lead, .course-card dt и footer задают color
  // сами, и объявление на body до них не доходит.
  assert.match(style, /@media print \{[\s\S]{0,200}:root \{/);
});
