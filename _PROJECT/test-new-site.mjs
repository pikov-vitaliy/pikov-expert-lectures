import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readCatalogue } from './new-site-catalogue.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const original = readFileSync(join(root, 'index.html'), 'utf8');
const catalogue = readCatalogue(root);
const script = readFileSync(join(root, 'new/assets/site.js'), 'utf8');
const pages = [
  { lang: 'en', route: '/new/', other: '/new/ru/', about: false },
  { lang: 'ru', route: '/new/ru/', other: '/new/', about: false },
  { lang: 'en', route: '/new/about/', other: '/new/ru/about/', about: true },
  { lang: 'ru', route: '/new/ru/about/', other: '/new/about/', about: true },
].map(page => ({ ...page, file: join(root, page.route.slice(1), 'index.html') }))
  .map(page => ({ ...page, html: readFileSync(page.file, 'utf8') }));
const decode = text => text.replace(/&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[\da-f]+);/gi, entity => {
  const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" };
  if (named[entity]) return named[entity];
  return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === 'x' ? 3 : 2, -1), entity[2].toLowerCase() === 'x' ? 16 : 10));
});
const withoutScripts = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const text = html => decode(withoutScripts(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attribute = (tag, key) => decode(tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1] ?? '');
const articleBlocks = html => [...html.matchAll(/<article\b(?=[^>]*\bdata-material(?:\s|>))[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
const schema = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

function assertCatalogueIntegrity(html, lang) {
  const cards = articleBlocks(html);
  assert.equal(cards.length, catalogue.lectures.length, 'every material must be present in the initial HTML');
  const urls = cards.map(card => attribute(card.match(/<h3><a\b[^>]*>/)?.[0] ?? '', 'href'));
  assert.deepEqual([...urls].sort(), catalogue.lectures.map(item => item.url).sort(), 'rendered catalogue URL parity');
  assert.equal(new Set(urls).size, urls.length, 'one catalogue card per URL, retaining fragments');
  for (const item of catalogue.lectures) {
    const card = cards[urls.indexOf(item.url)];
    const suffix = lang === 'en' ? 'En' : '';
    assert.ok(text(card).includes(item[`title${suffix}`]), `missing title for ${item.url}`);
    assert.ok(text(card).includes(item[`description${suffix}`]), `missing complete description for ${item.url}`);
    assert.doesNotMatch(card.match(/^<article[^>]*>/)[0], /\shidden(?:\s|>)/, `${item.url} must work without JavaScript`);
  }
}

function assertLocaleLinks(html, page) {
  assert.match(html, new RegExp(`<html lang="${page.lang}"`));
  const langLink = html.match(/<a\b[^>]*data-locale-switch[^>]*>/)?.[0];
  assert.ok(langLink, 'visible native language link');
  assert.equal(attribute(langLink, 'href'), page.other, 'language switch preserves home/about page type');
  const base = page.about ? '/new/about/' : '/new/';
  const russian = page.about ? '/new/ru/about/' : '/new/ru/';
  for (const [locale, target] of [['en', base], ['ru', russian], ['x-default', base]]) {
    const alternate = [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0])
      .find(tag => attribute(tag, 'rel') === 'alternate' && attribute(tag, 'hreflang') === locale);
    assert.equal(attribute(alternate ?? '', 'href'), `https://pikov.expert${target}`, `${locale} alternate`);
  }
  const expectedHome = page.lang === 'en' ? '/new/' : '/new/ru/';
  const brand = html.match(/<a class="brand"[^>]*>/)?.[0];
  assert.equal(attribute(brand ?? '', 'href'), expectedHome, 'brand returns to same-language home');
}

function assertBiographyComplete(html, lang) {
  const profile = original.match(/<section class="about" id="about">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(profile, 'source profile exists');
  const visible = text(html);
  for (const match of profile.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const localized = match[2].replace(/<span data-l="(ru|en)">([\s\S]*?)<\/span>/g, (_, locale, value) => locale === lang ? value : '');
    const expected = text(localized);
    if (expected) assert.ok(visible.includes(expected), `original ${lang} profile content was lost: ${expected}`);
  }
  assert.doesNotMatch(html, /\bdata-l=|\bdata-i18n-aria=/, 'profile localization must be complete at build time');
}

test('English is the durable default; scripts cannot select a stored or browser locale', () => {
  assert.match(pages[0].html, /<html lang="en">/);
  const startup = [...pages[0].html.matchAll(/<script(?![^>]*src=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).join('\n');
  assert.doesNotMatch(`${startup}\n${script}`, /navigator\.(?:language|languages)|(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(['"](?:lang|locale|[^'"]*-(?:lang|locale))['"]/i);
  assert.doesNotMatch(`${startup}\n${script}`, /(?:root|document\.documentElement)\.lang\s*=(?!=)/, 'the route-defined HTML language must not be overwritten');
});

test('all four routes have matching native locale, brand and alternate links', () => {
  for (const page of pages) assertLocaleLinks(page.html, page);
});

test('both catalogues contain all 34 original materials and descriptions without JavaScript', () => {
  assert.equal(catalogue.lectures.length, 34);
  for (const page of pages.filter(page => !page.about)) assertCatalogueIntegrity(page.html, page.lang);
});

test('search and filters use named native controls with visible localized labels', () => {
  for (const page of pages.filter(page => !page.about)) {
    const labels = [...page.html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map(match => match[1]);
    for (const name of ['q', 'topic', 'kind']) {
      const label = labels.find(value => new RegExp(`<(?:input|select)\\b[^>]*name="${name}"`).test(value));
      assert.ok(label, `${page.route}: ${name} needs a native implicit label`);
      assert.ok(text(label.split(/<(?:span|input|select)\b/)[0]).length > 1, `${name}: label cannot be just a placeholder or options`);
    }
    assert.match(page.html, /<input\b[^>]*name="q"[^>]*type="search"/);
    assert.match(page.html, /role="status"[^>]*aria-live="polite"/);
    assert.match(page.html, /<button\b[^>]*type="button"[^>]*data-clear/);
  }
});

test('all published links and assets are usable, without temporary or internal references', () => {
  for (const page of pages) {
    const rendered = withoutScripts(page.html);
    assert.doesNotMatch(text(rendered), /\b(?:TODO|TBD|Lorem ipsum|coming soon|insert text|placeholder)\b|здесь будет|скоро появится/i);
    const ids = new Set([...rendered.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of rendered.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
      const target = decode(match[1]);
      assert.ok(target && target !== '#', `${page.route}: empty destination`);
      assert.doesNotMatch(target, /(?:file:|localhost|127\.0\.0\.1|(?:^|[\\/])[A-Z]:[\\/]|\.codex|\.git(?:\/|$)|_PROJECT)/i);
      if (target.startsWith('#')) assert.ok(ids.has(target.slice(1)), `${page.route}: missing fragment ${target}`);
      if (!target.startsWith('/') || target.startsWith('//')) continue;
      const pathname = new URL(target, 'https://pikov.expert').pathname;
      let candidate = join(root, pathname.slice(1));
      if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, 'index.html');
      assert.ok(existsSync(candidate), `${page.route}: missing local destination ${pathname}`);
    }
  }
});

test('preview is noindex and structured data does not call every resource a course', () => {
  for (const page of pages) {
    assert.match(page.html, /<meta name="robots" content="noindex,follow">/);
    const data = schema(page.html);
    if (page.about) {
      assert.equal(data['@type'], 'ProfilePage');
      assert.equal(data.mainEntity['@type'], 'Person');
      continue;
    }
    assert.equal(data['@type'], 'CollectionPage');
    assert.equal(data.mainEntity.numberOfItems, catalogue.lectures.length);
    const entries = data.mainEntity.itemListElement.map(entry => entry.item);
    assert.deepEqual(entries.map(item => item.url).sort(), catalogue.lectures.map(item => item.url).sort());
    assert.ok(entries.every(item => item.inLanguage === 'ru'));
    assert.ok(entries.some(item => item['@type'] === 'Course'));
    assert.ok(entries.some(item => item['@type'] === 'LearningResource'));
    assert.equal(entries.find(item => item.url === 'https://spdx.pikov.expert/')['@type'], 'CreativeWork');
    assert.equal(entries.find(item => item.url === 'https://main-rbpo.pikov.expert/')['@type'], 'LearningResource');
  }
});

test('both biographies retain every original paragraph and list item in their language', () => {
  for (const page of pages.filter(page => page.about)) assertBiographyComplete(page.html, page.lang);
});

test('canaries: lost material, wrong locale destination and removed bio paragraph are caught', () => {
  assert.throws(() => assertCatalogueIntegrity(pages[0].html.replace(' data-material ', ' data-omitted '), 'en'));
  assert.throws(() => assertLocaleLinks(pages[0].html.replace('data-locale-switch href="/new/ru/"', 'data-locale-switch href="/new/ru/about/"'), pages[0]));
  const bio = pages.find(page => page.about && page.lang === 'en');
  assert.throws(() => assertBiographyComplete(bio.html.replace(/<p class="about-lead">[\s\S]*?<\/p>/, ''), 'en'));
});

test('generated page check is repeatable and leaves all four artifacts unchanged', () => {
  const digest = () => pages.map(page => createHash('sha256').update(readFileSync(page.file)).digest('hex'));
  const before = digest();
  for (let i = 0; i < 2; i++) {
    const result = spawnSync(process.execPath, [join(root, '_PROJECT/build-new-site.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  assert.deepEqual(digest(), before);
});
