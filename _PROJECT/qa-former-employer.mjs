// Браузерная проверка: прежний работодатель не назван на страницах кейса SCA/SBOM,
// абзац о сервисе в «Обо мне» виден и с согласованными цифрами, презентации кейса
// используют одно условное название «АО «Альфа»». Слово владельца 27.11.2026.
//
// Почему браузер, а не регулярные выражения: 27.11 агенты нашли 72 подтверждённых
// обхода регулярной проверки (сущности без «;», необычные комментарии, теги, текст,
// похожий на тег, Shadow DOM, CSS content, скрытие стилями, гомоглифы, bidi). Здесь
// страницу разбирает Chromium, а проверка читает то же, что получит читатель.
//
// Модель угроз. Ловится: название в любом слое DOM (текст, скрипты, стили, атрибуты,
// разобранные адреса, Shadow DOM, CSS ::before/::after, значения полей, заголовок),
// в том числе через сущности, невидимые символы, NFKC-варианты, гомоглифы
// кириллица/греческий/латиница, перевёрнутый текст. Для абзаца о сервисе: скрытие,
// дубли, лишние или иные цифры в видимом тексте раздела. Не ловится: перестановка
// частей слова средствами вёрстки (CSS order, row-reverse, абсолютное позиционирование,
// наложение) – такое видно только на картинке и закрывается ревью изменений.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const project = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(project);
const require = createRequire(import.meta.url), {chromium} = require(path.join(project, '.browser-node/node_modules/playwright'));

const PAGES = ['/', '/ru/', '/new/', '/new/ru/', '/new/about/', '/new/ru/about/', '/rbpo-audit/', '/rbpo-audit-start-result/', '/sbom-license-audit/'];
const DECKS = new Set(['/rbpo-audit/', '/rbpo-audit-start-result/', '/sbom-license-audit/']);
const SERVICE_PAGES = ['/', '/ru/'];

// ── Нормализация для сравнения ─────────────────────────────────────────────────
const TO_LATIN = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y', І: 'I', Ј: 'J', Ѕ: 'S',
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
  ο: 'o', ι: 'i', ν: 'v', ρ: 'p', τ: 't', υ: 'u', κ: 'k', ı: 'i', İ: 'I',
};
const TO_CYRILLIC = {A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'У', a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х'};
const INVISIBLE = /[\p{Cf}\p{Mn}\u00AD\u034F\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\u2800]/gu;
const base = s => s.normalize('NFKC').replace(INVISIBLE, '');
const latin = s => base(s).replace(/./gu, ch => TO_LATIN[ch] ?? ch);
const cyrillic = s => base(s).replace(/./gu, ch => TO_CYRILLIC[ch] ?? ch);
const reversed = s => [...s].reverse().join('');

// После свёртки к латинице: МНТЦ → MHTЦ, МИЭТ → MИЭT; латинские MNTC, MIET, ISTC как есть.
const EMPLOYER = /(?<![\p{L}\p{N}])(?:MHTЦ|MИЭT|MNTC|MIET|ISTC)(?![\p{L}\p{N}])/iu;
const EMPLOYER_URL = /istc[\W_]*miet|mntc[\W_]*logo/i;
function employerHits(label, text) {
  const hits = [];
  for (const [how, s] of [['', latin(text)], [' (reversed)', reversed(latin(text))]]) {
    const m = s.match(EMPLOYER) || s.match(EMPLOYER_URL);
    if (m) hits.push(`${label}${how}: …${s.slice(Math.max(0, m.index - 30), m.index + 30)}…`);
  }
  return hits;
}

// Обозначения юрлиц: «АО «X»», «ООО X», «Акционерное общество "X"» – возвращает X.
const LEGAL_FORM = /(?<![\p{L}])(АО|ООО|ОАО|ПАО|ЗАО|НАО|АКЦИОНЕРНОЕ ОБЩЕСТВО|ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ)(?![\p{L}])\s*[«"„“”'‘’‹›＂]*\s*([\p{L}\p{N}][\p{L}\p{N}-]*)/giu;
function legalNames(text) {
  const t = cyrillic(text);
  return [...new Set([t, reversed(t)].flatMap(s => [...s.matchAll(LEGAL_FORM)].map(m => m[2].toLowerCase())))].filter(n => n.length >= 2);
}
// «Альфа» – условное название кейса; «Ромашка» – учебный пример владельца в исторической
// презентации sbom-license-audit («У ООО «Ромашка» может быть много адресов»).
const ALLOWED_NAMES = new Set(['альфа', 'ромашка']);

// ── Сбор слоёв в браузере ──────────────────────────────────────────────────────
// Выполняется в странице. Возвращает: textContent всего документа (включая скрипты и
// стили), видимый текст (обход DOM с учётом скрытия, Shadow DOM, CSS content, значений
// полей), значения всех атрибутов, разобранные браузером адреса, заголовок.
function collectLayers(scopeSelector) {
  const cssStrings = value => {
    if (!value || value === 'none' || value === 'normal') return '';
    return [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1')).join('');
  };
  const shown = el => {
    if (!el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return false;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 4) return false;
    if (/rgba\([^)]*,\s*0\)$|transparent/.test(cs.color)) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && el.getClientRects().length === 0) return false;
    if (r.right < -5 || r.bottom < -5 || r.left > document.documentElement.scrollWidth + 5) return false;
    return true;
  };
  let visible = '';
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement && shown(node.parentElement)) visible += node.data;
      return;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) { for (const c of node.childNodes) walk(c); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node, tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'title') return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const inline = /^(inline|contents|ruby)/.test(cs.display);
    if (!inline) visible += ' ';
    if (shown(el)) visible += cssStrings(getComputedStyle(el, '::before').content);
    if (tag === 'slot') {
      const assigned = el.assignedNodes({flatten: true});
      for (const c of (assigned.length ? assigned : el.childNodes)) walk(c);
    } else {
      for (const c of (el.shadowRoot ? el.shadowRoot.childNodes : el.childNodes)) walk(c);
    }
    if (shown(el)) {
      visible += cssStrings(getComputedStyle(el, '::after').content);
      if ((tag === 'input' && !/^(hidden|password|checkbox|radio|file)$/i.test(el.type)) || tag === 'textarea') visible += ' ' + el.value + ' ';
      if (tag === 'select' && el.selectedOptions[0]) visible += ' ' + el.selectedOptions[0].text + ' ';
    }
    if (!inline) visible += ' ';
  };
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document.documentElement;
  if (!scope) return null;
  walk(scope);
  // Все элементы, включая Shadow DOM: атрибуты, адреса и тексты теневых деревьев.
  const all = [];
  const gather = rootNode => { for (const el of rootNode.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) gather(el.shadowRoot); } };
  gather(document);
  const attributes = [], urls = [], shadowTexts = [], svgTexts = [], generated = [], comments = [];
  const commentRoots = [document];
  for (const el of all) {
    for (const a of el.attributes) attributes.push(a.value);
    for (const prop of ['href', 'src', 'action', 'formAction', 'data', 'poster', 'cite']) {
      const v = el[prop];
      if (typeof v === 'string' && v) urls.push(v);
      else if (v && typeof v.baseVal === 'string') urls.push(v.baseVal);
    }
    if (el.shadowRoot) shadowTexts.push(el.shadowRoot.textContent);
    if (el instanceof SVGElement && el.textContent) svgTexts.push(el.textContent);
    if (el.localName === 'template' && el.content) shadowTexts.push(el.content.textContent);
    for (const pseudo of ['::before', '::after', '::marker']) { const g = cssStrings(getComputedStyle(el, pseudo).content); if (g) generated.push(g); }
    if (el.shadowRoot) commentRoots.push(el.shadowRoot);
  }
  for (const r of commentRoots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_COMMENT); while (w.nextNode()) comments.push(w.currentNode.data); }
  return {
    full: document.documentElement.textContent + ' ' + shadowTexts.join(' ') + ' ' + svgTexts.join(' '),
    visible: visible.replace(/\s+/g, ' '),
    attributes: attributes.join(' \n '),
    urls: urls.join(' \n '),
    generated: generated.join(' \n '),
    comments: comments.join(' \n '),
    title: document.title,
  };
}

// Абзац о сервисе: единственный, виден, и в видимом тексте раздела ровно одна сумма и
// один объём кода, совпадающие с согласованными. Возвращает список проблем.
async function serviceProblems(page, label) {
  const problems = [];
  const structure = await page.evaluate(() => {
    const sections = document.querySelectorAll('[id="about"]');
    const paragraphs = [...document.querySelectorAll('p')].filter(p => p.textContent.includes('Единолично создал'));
    return {sections: sections.length, paragraphs: paragraphs.length};
  });
  if (structure.sections !== 1) problems.push(`${label}: sections id=about = ${structure.sections}`);
  if (structure.paragraphs !== 1) problems.push(`${label}: paragraphs with the service claim = ${structure.paragraphs}`);
  for (const lang of ['ru', 'en']) {
    await page.evaluate(l => { document.documentElement.dataset.lang = l; document.documentElement.lang = l; }, lang);
    const state = await page.evaluate(() => {
      const p = [...document.querySelectorAll('p')].find(x => x.textContent.includes('Единолично создал'));
      if (!p) return null;
      p.scrollIntoView({block: 'center'});
      const ok = p.checkVisibility({checkOpacity: true, checkVisibilityCSS: true});
      const r = p.getBoundingClientRect();
      return {ok: ok && r.width > 50 && r.height > 10 && r.right > 0 && r.left < document.documentElement.clientWidth, fontSize: parseFloat(getComputedStyle(p).fontSize)};
    });
    if (!state || !state.ok || state.fontSize < 10) problems.push(`${label} [${lang}]: service paragraph is not visible (${JSON.stringify(state)})`);
    const layers = await page.evaluate(collectLayers, '#about');
    if (!layers) { problems.push(`${label} [${lang}]: #about not found`); continue; }
    const text = base(layers.visible);
    if (lang === 'ru') {
      const claim = /Единолично создал и ввёл в эксплуатацию сервис SCA\/SBOM/.test(text);
      const money = [...text.matchAll(/\d[\d\s.,]*\s*(?:млн|миллион\p{L}*|млрд|миллиард\p{L}*)/giu)].map(m => m[0].replace(/\s+/g, ' ').trim());
      const code = [...text.matchAll(/\d[\d\s.,]*\s*(?:тыс\.?|тысяч\p{L}*)?\s*строк/giu)].map(m => m[0].replace(/\s+/g, ' ').trim());
      if (!claim) problems.push(`${label} [ru]: achievement sentence is missing`);
      if (money.length !== 1 || money[0] !== '18 млн') problems.push(`${label} [ru]: amounts ${JSON.stringify(money)} instead of ["18 млн"]`);
      if (code.length !== 1 || code[0] !== '130 тыс. строк') problems.push(`${label} [ru]: code size ${JSON.stringify(code)} instead of ["130 тыс. строк"]`);
      if (!/оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год/.test(text)) problems.push(`${label} [ru]: amount is not framed as the vendor's estimate`);
    } else {
      const claim = /I independently built and deployed an SCA\/SBOM service/.test(text);
      const money = [...text.matchAll(/(?:RUB|₽|rubles?)?\s*\d[\d\s.,]*\s*(?:million|billion|mln|bn)/giu)].map(m => m[0].replace(/\s+/g, ' ').trim());
      const code = [...text.matchAll(/\d[\d\s.,]*\s*(?:thousand\s*)?lines\s+of\s+code/giu)].map(m => m[0].replace(/\s+/g, ' ').trim());
      if (!claim) problems.push(`${label} [en]: achievement sentence is missing`);
      if (money.length !== 1 || money[0] !== 'RUB 18 million') problems.push(`${label} [en]: amounts ${JSON.stringify(money)} instead of ["RUB 18 million"]`);
      if (code.length !== 1 || code[0] !== '130,000 lines of code') problems.push(`${label} [en]: code size ${JSON.stringify(code)} instead of ["130,000 lines of code"]`);
      if (!/about RUB 18 million a year, vendor's estimate/.test(text)) problems.push(`${label} [en]: amount is not framed as the vendor's estimate`);
    }
  }
  return problems;
}

async function pageProblems(page, label, {deck = false} = {}) {
  const problems = [];
  const layers = await page.evaluate(collectLayers, null);
  for (const [name, text] of Object.entries(layers)) problems.push(...employerHits(`${label} ${name}`, text));
  if (deck) {
    const names = legalNames([layers.full, layers.visible, layers.attributes, layers.generated, layers.title].join(' \n '));
    if (!names.includes('альфа')) problems.push(`${label}: pseudonym «АО «Альфа»» is not shown`);
    const others = names.filter(n => !ALLOWED_NAMES.has(n));
    if (others.length) problems.push(`${label}: other legal names ${JSON.stringify(others)}`);
  }
  return problems;
}

// ── Самопроверка: уловки 27.11 должны ловиться, похожие безобидные строки – нет ──
const MUST_CATCH = {
  plain: '<p>Проект MIET</p>', cyrillic: '<p>АО МНТЦ МИЭТ</p>',
  entityNoSemicolon: '<b>MI&#69T</b>', hexNoSemicolon: '<b>MI&#x45T</b>', allNumeric: '<b>&#77&#73&#69&#84</b>',
  html5Named: '<b>&Mcy;&Icy;&Ecy;&Tcy;</b>', zeroWidthNamed: '<b>MI&ZeroWidthSpace;ET</b>', noBreak: '<b>MI&NoBreak;ET</b>',
  softHyphen: '<b>MI&#173;ET</b>', zwsp: '<b>MI\u200BET</b>', wordJoiner: '<b>MI\u2060ET</b>', bom: '<b>MI\uFEFFET</b>',
  allCyrillicLookalike: '<b>МІЕТ</b>', mixedScript: '<b>MIЕT</b>', greek: '<b>ΜΙΕΤ</b>', mixedMHTC: '<b>MHTЦ</b>', fullWidth: '<b>ＭＩＥＴ</b>', dotlessI: '<b style="text-transform:uppercase">mıet</b>',
  splitComment: '<b>MI<!---->ET</b>', splitBig: '<b>MI<big>ET</big></b>', splitCustom: '<b>MI<x-a>ET</x-a></b>', splitScript: '<b>MI<script></script>ET</b>',
  splitTemplate: '<b>MI<template></template>ET</b>', splitImg: '<b>MI<img alt="">ET</b>', splitInlineDiv: '<span>MI<div style="display:inline">ET</div></span>',
  tagLike: '<b>&lt;МИЭТ&gt;</b>', tagLikeSpaced: '<b>1 &lt; MIET &gt; 0</b>',
  abruptComment: '<b><!-->МИЭТ<!----></b>', bangComment: '<b><!-- x --!>МНТЦ<!-- y --></b>',
  customElementNames: '<b><script-x>МИЭТ</script-x><script></script></b>',
  bdo: '<b><bdo dir="rtl">TEIM</bdo></b>', rlo: '<b>\u202ETEIM\u202C</b>', bidiCss: '<b style="unicode-bidi:bidi-override;direction:rtl">TEIM</b>',
  dataNotAttribute: '<p>data:МИЭТ</p>', titleAttr: '<abbr title="MI&#69T">x</abbr>', altAttr: '<img src="x.png" alt="Логотип МИ&#1069Т">',
  hrefEncoded: '<a href="https://&#105stc-mi&#101t.ru/">сайт</a>', hrefPercent: '<a href="https://istc-%6Diet.ru/">сайт</a>',
  inputValue: '<input value="MIET">', svgTspan: '<svg><text>М<tspan>ИЭТ</tspan></text></svg>',
  cssBefore: '<style>.x::before{content:"MIET"}</style><p class="x">a</p>', cssEscape: "<style>.x::after{content:'MI\\45 T'}</style><p class=\"x\">a</p>",
  cssAttr: '<style>.x::after{content:attr(data-n)}</style><p class="x" data-n="MIET">a</p>',
  shadow: '<x-h><template shadowrootmode="open"><p>MIET</p></template></x-h>', titleTag: '<title>&laquoМИЭТ&raquo</title><p>x</p>',
  noscriptText: '<noscript><p>MIET</p></noscript>', hiddenDiv: '<div hidden>MIET</div>', commentOnly: '<p>текст</p><!-- MIET -->',
};
const MUST_PASS = {
  germanWord: '<p>Vermietung</p>', identifier: '<p>listCache</p>', literalEntity: '<p>MI&amp;#69;T</p>',
  scriptIdentifier: '<script>const mietCount = 1;</script><p>текст</p>', dataUri: '<img alt="" src="data:image/png;base64,QUJDTUlFVERFRg==">',
  styleSelector: '<style>.mntcLike{}</style><p>текст</p>',
};
const PSEUDONYM_CATCH = {
  otherName: '<p>АО «Альфа»</p><p>АО «Бета»</p>', otherNameEntities: '<p>АО «Альфа»</p><p>АО &laquoБета&raquo</p>',
  latinAO: '<p>АО «Альфа»</p><p>AO «Бета»</p>', ooo: '<p>АО «Альфа»</p><p>ООО «Бета»</p>', fullForm: '<p>АО «Альфа»</p><p>Акционерное общество «Бета»</p>',
  noQuotes: '<p>АО «Альфа»</p><p>АО Бета</p>', qElement: '<p>АО «Альфа»</p><p>АО <q>Бета</q></p>', fullWidthQuote: '<p>АО «Альфа»</p><p>АО ＂Бета＂</p>',
  splitTag: '<p>АО «Альфа»</p><p>А<x-a>О</x-a> «Бета»</p>', scriptFooter: "<p>АО «Альфа»</p><script>document.write('АО «Бета»')</script>",
  hiddenAlphaVisibleBeta: '<p hidden>АО «Альфа»</p><p>АО «Бета»</p>', inAttribute: '<p>АО «Альфа»</p><input value="АО «Бета»">',
  bdoReversed: '<p>АО «Альфа»</p><p><bdo dir="rtl">»атеБ« ОА</bdo></p>', zwsp: '<p>АО «Альфа»</p><p>АО \u200B«Бета»</p>',
};

const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json'};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(root, '.' + p);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream'}).end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true});
const failures = [];
let cases = 0;
try {
  // 1. Самопроверка на фрагментах.
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
  const page = await ctx.newPage();
  await page.route('**/*', route => route.request().url().startsWith('http://fixture.test/') ? route.continue() : route.abort());
  const fixture = async html => {
    await page.route('http://fixture.test/', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${html}</body></html>`}));
    await page.goto('http://fixture.test/', {waitUntil: 'load'});
    await page.unroute('http://fixture.test/');
  };
  for (const [name, html] of Object.entries(MUST_CATCH)) {
    await fixture(html);
    const found = await pageProblems(page, `fixture ${name}`);
    if (!found.length) failures.push(`self-test: «${name}» is not caught`);
    cases++;
  }
  for (const [name, html] of Object.entries(MUST_PASS)) {
    await fixture(html);
    const found = await pageProblems(page, `fixture ${name}`);
    if (found.length) failures.push(`self-test: «${name}» is a false positive: ${found[0]}`);
    cases++;
  }
  for (const [name, html] of Object.entries(PSEUDONYM_CATCH)) {
    await fixture(html);
    const found = await pageProblems(page, `fixture ${name}`, {deck: true});
    if (!found.some(f => /other legal names|not shown/.test(f))) failures.push(`self-test: pseudonym «${name}» is not caught`);
    cases++;
  }
  await ctx.close();

  // 2. Реальные страницы: с JavaScript и без (noscript).
  for (const route of PAGES) {
    for (const js of [true, false]) {
      const context = await browser.newContext({javaScriptEnabled: js, viewport: {width: 1440, height: 900}});
      const p = await context.newPage();
      await p.goto(origin + route, {waitUntil: 'networkidle'});
      const label = `${route}${js ? '' : ' [no JS]'}`;
      failures.push(...await pageProblems(p, label, {deck: DECKS.has(route)}));
      if (js && SERVICE_PAGES.includes(route)) failures.push(...await serviceProblems(p, label));
      await context.close();
      cases++;
    }
  }
} finally {
  await browser.close();
  server.close();
}
assert.deepEqual(failures, [], `former-employer QA:\n- ${failures.join('\n- ')}`);
console.log(`FORMER EMPLOYER QA OK: ${cases} cases, ${PAGES.length} pages, ${Object.keys(MUST_CATCH).length + Object.keys(PSEUDONYM_CATCH).length} disguises caught`);
