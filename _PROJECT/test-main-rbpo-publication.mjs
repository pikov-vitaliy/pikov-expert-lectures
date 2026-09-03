import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(projectDir);
const lectureDir = join(rootDir, 'main-rbpo');
const publicUrl = 'https://main-rbpo.pikov.expert/';
const pdfName = 'mantra-brpo-rbpo-v03.pdf';
const markdownName = 'konspekt-rbpo-ot-processa-k-dokumentam.md';

const expectedDownloads = new Map([
  [pdfName, {
    bytes: 4_312_476,
    sha256: '5637fc29cb8f3c61ed22bd429e6cdbd7ac7f99cb31876f14b3edf2c6b394dde7',
  }],
  [markdownName, {
    bytes: 29_114,
    sha256: '67064b431f1457975e45352d04d2de5c641db334c9484966f6728d5fd13e78d7',
  }],
]);

function read(path) {
  return readFileSync(path, 'utf8');
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('the main RBPO lecture is registered as an evergreen author resource', () => {
  const catalog = JSON.parse(read(join(projectDir, 'lectures.json')));
  const lecture = catalog.lectures.find((item) => item.url === publicUrl);

  assert.ok(lecture, 'main-rbpo lecture is missing from lectures.json');
  assert.equal(lecture.domain, 'main-rbpo');
  assert.equal(lecture.folder, 'main-rbpo');
  assert.equal(lecture.section, 'РБПО');
  assert.equal(lecture.provider, 'Пиков Виталий Александрович');
  assert.equal(lecture.status, 'ready-local');
  assert.match(lecture.title, /не ищите шаблон.+безопасн/iu);
  assert.equal(catalog.summary.cards, catalog.lectures.length);
  assert.equal(
    catalog.summary.thirdLevelDomains,
    new Set(catalog.lectures.map((item) => item.domain)).size,
  );
  assert.equal(
    catalog.summary.readyLocal,
    catalog.lectures.filter((item) => item.status === 'ready-local').length,
  );
  assert.equal(
    catalog.summary.publishedSnapshot,
    catalog.lectures.filter((item) => item.status === 'published-snapshot').length,
  );

  const rootIndex = read(join(rootDir, 'index.html'));
  assert.match(rootIndex, /https:\/\/main-rbpo\.pikov\.expert\//);
  assert.match(rootIndex, /Не ищите шаблон: постройте безопасную разработку/);
  assert.match(rootIndex, /Stop looking for a template: build secure development/);

  const sitemap = read(join(rootDir, 'sitemap.xml'));
  assert.match(sitemap, /https:\/\/main-rbpo\.pikov\.expert\//);

  const courseMap = read(join(rootDir, 'course-map.html'));
  assert.match(courseMap, /https:\/\/main-rbpo\.pikov\.expert\//);
});

test('the root catalogue gives the main RBPO lecture a text-only flagship accent', () => {
  for (const relativePath of ['index.html', join('ru', 'index.html')]) {
    const html = read(join(rootDir, relativePath));
    const flagshipMarkers = html.match(/featured:\s*true/g) || [];
    const titleRule = html.match(/\.card--flagship h4\s*\{([^}]*)\}/);

    assert.equal(flagshipMarkers.length, 1, `${relativePath} must identify exactly one flagship lecture`);
    assert.match(
      html,
      /url:\s*"https:\/\/main-rbpo\.pikov\.expert\/",\s*featured:\s*true/,
      `${relativePath} must mark main-rbpo as the flagship`,
    );
    assert.ok(
      html.includes("(l.featured ? ' card--flagship' : '')"),
      `${relativePath} must render the flagship class from catalogue data`,
    );
    assert.ok(titleRule, `${relativePath} must define the flagship title rule`);
    assert.match(titleRule[1], /color:\s*var\(--lang-bg\)/);
    assert.doesNotMatch(titleRule[1], /\b(?:background|border|box-shadow|outline)\s*:/);
  }
});

test('the public lecture is self-contained, accessible and clearly authored', () => {
  const requiredPaths = [
    'index.html',
    '.htaccess',
    'robots.txt',
    'sitemap.xml',
    'og-image.png',
    join('assets', 'site.css'),
    join('assets', 'site.js'),
    join('assets', 'metrics.js'),
  ];
  for (const relativePath of requiredPaths) {
    assert.ok(existsSync(join(lectureDir, relativePath)), `missing main-rbpo/${relativePath}`);
  }

  const html = read(join(lectureDir, 'index.html'));
  assert.match(html, /<html\s+lang="ru"/i);
  assert.match(html, /<meta\s+name="viewport"/i);
  assert.match(html, /<meta\s+name="author"\s+content="Пиков Виталий Александрович"/i);
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/main-rbpo\.pikov\.expert\/"/i);
  assert.match(html, /property="og:url"\s+content="https:\/\/main-rbpo\.pikov\.expert\/"/i);
  assert.match(html, /property="og:image"\s+content="https:\/\/main-rbpo\.pikov\.expert\/og-image\.png"/i);
  assert.equal((html.match(/<main\b/gi) || []).length, 1, 'the document must have one main landmark');
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'the document must have one h1');
  assert.match(html, /class="skip-link"[^>]+href="#main-content"/i);
  assert.match(html, /id="main-content"/i);
  assert.match(html, /class="[^"]*brand-back[^"]*"[^>]+href="https:\/\/pikov\.expert\/"/i);
  assert.match(html, /Пиков Виталий Александрович/);
  assert.match(html, /vitaly@pikov\.expert/i);
  assert.match(html, /https:\/\/t\.me\/UnderLineSecurity/i);

  for (const concept of [
    /чуж(?:ой|ие)\s+(?:регламент|шаблон|документ).{0,80}чужие\s+очки/isu,
    /люди/iu,
    /инструменты/iu,
    /процессы/iu,
    /если\s+процесс\s+есть.{0,80}(?:след|доказательств)/isu,
    /SAST/i,
    /DAST/i,
    /SCA/i,
    /SBOM/i,
    /C\+\+/i,
    /-fstack-protector-strong/,
    /-D_FORTIFY_SOURCE=3/,
    /искусственн(?:ый|ого)\s+интеллект/iu,
  ]) {
    assert.match(html, concept);
  }

  for (const officialSource of [
    'https://protect.gost.ru/gost/details/f3818925-a96f-4f55-96e9-46b44720ee64',
    'https://csrc.nist.gov/pubs/sp/800/218/final',
    'https://owaspsamm.org/model/',
    'https://learn.microsoft.com/en-us/compliance/assurance/assurance-microsoft-security-development-lifecycle',
    'https://www.iso.org/standard/44378.html',
  ]) {
    assert.ok(html.includes(officialSource), `missing official source ${officialSource}`);
  }

  assert.doesNotMatch(
    html,
    /(?:1\s+сентября|01[./-]09|2026-09-01|сентябр|курс(?:а|е|у|ом|ы)?|слушател|МАСКОМ|Павел)/iu,
    'the public lecture must remain timeless and audience-neutral',
  );

  const targetBlankAnchors = html.match(/<a\b[^>]*target="_blank"[^>]*>/gi) || [];
  for (const anchor of targetBlankAnchors) {
    assert.match(anchor, /rel="[^"]*noopener[^"]*"/i);
    assert.match(anchor, /rel="[^"]*noreferrer[^"]*"/i);
  }
});

test('downloadable author materials preserve the supplied bytes and exact attribution', () => {
  const html = read(join(lectureDir, 'index.html'));
  const checksumPath = join(lectureDir, 'downloads', 'SHA256SUMS.txt');
  assert.ok(existsSync(checksumPath), 'missing downloadable SHA256SUMS.txt');
  for (const [name, expected] of expectedDownloads) {
    const path = join(lectureDir, 'downloads', name);
    assert.ok(existsSync(path), `missing download ${name}`);
    assert.equal(statSync(path).size, expected.bytes, `${name} byte size changed`);
    assert.equal(sha256(path), expected.sha256, `${name} is not an exact copy of the supplied file`);
    assert.match(html, new RegExp(`href="downloads/${name.replaceAll('.', '\\.')}"[^>]*download`, 'i'));
    assert.match(read(checksumPath), new RegExp(`${expected.sha256}  ${name.replaceAll('.', '\\.')}`));
  }

  const pdfMagic = readFileSync(join(lectureDir, 'downloads', pdfName)).subarray(0, 5).toString('ascii');
  assert.equal(pdfMagic, '%PDF-');
  assert.match(html, /автор\s+материала.{0,80}Пиков Виталий Александрович/isu);
  assert.match(html, /составлен.{0,80}на\s+основе\s+сообщений\s+Дмитрия\s+Владимировича\s+Пономар[ёе]ва/isu);
  assert.match(html, /текст.{0,40}согласован.{0,40}Дмитри/isu);
  assert.match(html, /Дмитрий\s+Пономар[ёе]в.{0,120}автор\s+исходных\s+сообщений/isu);
  assert.match(html, /(?:не\s+участвовал|участия\s+в\s+(?:подготовке|создании).{0,40}не\s+принимал)/isu);
  assert.doesNotMatch(html, /downloads\/[^"\s]*ponomarev/iu);
});

test('the lecture assets enforce baseline accessibility and browser security', () => {
  const css = read(join(lectureDir, 'assets', 'site.css'));
  const js = read(join(lectureDir, 'assets', 'site.js'));
  const metrics = read(join(lectureDir, 'assets', 'metrics.js'));
  const htaccess = read(join(lectureDir, '.htaccess'));
  const workflow = read(resolve(rootDir, '.github', 'workflows', 'site-checks.yml'));

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\([^)]*max-width/i);
  assert.doesNotMatch(js, /\beval\s*\(/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(js, /document\.write\s*\(/);
  assert.match(metrics, /ym\(109116119,\s*['"]init['"]/);
  assert.match(metrics, /webvisor:\s*false/);
  assert.doesNotMatch(metrics, /\beval\s*\(|\.innerHTML\s*=|document\.write\s*\(/);
  assert.match(htaccess, /Content-Security-Policy/i);
  assert.match(htaccess, /default-src\s+'self'/i);
  assert.match(htaccess, /script-src\s+'self'/i);
  assert.doesNotMatch(htaccess, /unsafe-eval|unsafe-inline/i);
  assert.match(htaccess, /Strict-Transport-Security/i);
  assert.match(htaccess, /X-Content-Type-Options/i);
  assert.match(workflow, /test-main-rbpo-publication\.mjs/);
});
