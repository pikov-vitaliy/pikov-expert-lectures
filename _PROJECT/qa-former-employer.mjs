// Браузерная проверка: прежний работодатель не назван на страницах кейса SCA/SBOM,
// абзац о сервисе в «Обо мне» виден и с согласованными цифрами, презентации кейса
// используют одно условное название «АО «Альфа»». Слово владельца 27.11.2026.
//
// Почему браузер, а не регулярные выражения: 27.11 агенты нашли 72 подтверждённых
// обхода регулярной проверки. Здесь страницу разбирает Chromium, а проверка читает то,
// что получит читатель, в нескольких слоях сразу.
//
// Модель угроз. Ловится: название в любом слое (текст и отдельные текстовые узлы,
// скрипты, стили, комментарии, атрибуты и их имена, разобранные и декодированные
// адреса, открытый и закрытый Shadow DOM, iframe, содержимое template, CSS
// ::before/::after/::marker и счётчики – через дерево доступности, значения полей,
// заголовок) во всех состояниях темы и языка, с нормализацией: NFKC, регистр, невидимые
// символы, гомоглифы кириллица/греческий/латиница, точки между буквами, падежные
// окончания кириллических аббревиатур, bidi-override (bdo, CSS, управляющие символы).
// Для абзаца о сервисе: единственность, фактическая отрисовка (попадание точкой по
// строкам текста), утверждение и цифры внутри самого абзаца, отсутствие других сумм и
// объёмов кода в разделе. Не ловится: перестановка частей слова средствами вёрстки
// (CSS order, row-reverse, абсолютное позиционирование, наложение) – это видно только на
// картинке и закрывается ревью изменений.
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

// ── Нормализация ───────────────────────────────────────────────────────────────
const UPPER_TO_LATIN = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y', І: 'I', Ј: 'J', Ѕ: 'S', Ԛ: 'Q', Ԝ: 'W',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ϲ: 'C', Ϻ: 'M', Ϳ: 'J',
};
const LATIN_TO_CYRILLIC = {A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'У'};
const INVISIBLE = /[\p{Cf}\p{Mn}\u00AD\u034F\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\u2800]/gu;
const base = s => s.normalize('NFKC').replace(INVISIBLE, '');
// Для поиска работодателя: верхний регистр, похожие буквы – к латинице.
const mapLatin = s => s.toUpperCase().replace(/./gu, ch => UPPER_TO_LATIN[ch] ?? ch);
const foldLatin = s => mapLatin(base(mapLatin(s)));
// Для юрлиц: верхний регистр, похожие латинские – к кириллице.
const foldCyrillic = s => base(s).toUpperCase().replace(/./gu, ch => LATIN_TO_CYRILLIC[ch] ?? ch);

// После свёртки: МНТЦ → MHTЦ, МИЭТ → MИЭT. Кириллические аббревиатуры – с падежными
// окончаниями («МИЭТа»), латинские – целым словом (не «Vermietung»). Точки между буквами
// («М.Н.Т.Ц.») допускаются.
const D = '\\.?\\s?';
const EMPLOYER_PATTERNS = [
  new RegExp(`(?<![\\p{L}\\p{N}])M${D}H${D}T${D}Ц`, 'u'),
  new RegExp(`(?<![\\p{L}\\p{N}])M${D}И${D}Э${D}T`, 'u'),
  new RegExp(`(?<![\\p{L}\\p{N}])M${D}N${D}T${D}C\\.?(?![\\p{L}\\p{N}])`, 'u'),
  new RegExp(`(?<![\\p{L}\\p{N}])M${D}I${D}E${D}T\\.?(?![\\p{L}\\p{N}])`, 'u'),
  new RegExp(`(?<![\\p{L}\\p{N}])I${D}S${D}T${D}C\\.?(?![\\p{L}\\p{N}])`, 'u'),
  /ISTC[\W_]*MIET|MNTC[\W_]*LOGO/u,
];
function employerHits(label, text) {
  const s = foldLatin(text);
  for (const re of EMPLOYER_PATTERNS) {
    const m = s.match(re);
    if (m) return [`${label}: …${s.slice(Math.max(0, m.index - 30), m.index + 30)}…`];
  }
  return [];
}

// Обозначения юрлиц: форма и полное имя (в кавычках – целиком, без кавычек – слово).
const QUOTES_OPEN = '«"„“”\'‘’‹›＂', QUOTES_CLOSE = '»"“”\'’›＂';
const LEGAL_FORM = new RegExp(`(?<![\\p{L}])(АО|ООО|ОАО|ПАО|ЗАО|НАО|АКЦИОНЕРНОЕ ОБЩЕСТВО|ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ)(?![\\p{L}])\\s*(?:[${QUOTES_OPEN}]+\\s*([^${QUOTES_OPEN}${QUOTES_CLOSE}]{1,60}?)\\s*[${QUOTES_CLOSE}]|([\\p{L}\\p{N}-]{2,}))`, 'gu');
// Учебный пример владельца в исторической презентации sbom-license-audit – только в этой фразе.
const ALLOWED_PHRASES = {'/sbom-license-audit/': ['У ООО «РОМАШКА» МОЖЕТ БЫТЬ МНОГО']};
function legalNames(text, route) {
  let t = foldCyrillic(text).replace(/[\u00A0\u2007\u202F]/g, ' ');
  for (const phrase of ALLOWED_PHRASES[route] ?? []) t = t.split(phrase).join(' ');
  return [...t.matchAll(LEGAL_FORM)].map(m => `${m[1]} ${(m[2] ?? m[3]).replace(/\s+/g, ' ').trim()}`);
}

// ── Сбор слоёв в странице (выполняется в каждом фрейме) ─────────────────────────
function collectLayers(scopeSelector) {
  const cssStrings = value => {
    if (!value || value === 'none' || value === 'normal') return '';
    return [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1')).join('');
  };
  // Отрисован ли элемент: видимость, прозрачность, размер шрифта, цвет, вырезание.
  const shown = el => {
    if (!el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement || e.getRootNode().host) {
      const cs = getComputedStyle(e);
      if (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*50%|circle\(\s*0|polygon\(\s*0[^,]*,\s*0[^,]*,\s*0/.test(cs.clipPath)) return false;
      if (cs.clip && cs.clip !== 'auto' && /rect\(0(px)?,?\s*0(px)?/.test(cs.clip)) return false;
    }
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 4) return false;
    if (/rgba\([^)]*,\s*0\)$|transparent/.test(cs.color)) return false;
    return true;
  };
  // Переворот для bidi-override: для участков внутри bdo dir=rtl / unicode-bidi:bidi-override
  // с direction:rtl и между управляющими RLO…PDF.
  const unOverride = s => s.replace(/\u202E([^\u202C\u202D]*)(\u202C|$)/g, (_, x) => [...x].reverse().join(''));
  const isOverrideRtl = el => (el.localName === 'bdo' && (el.getAttribute('dir') || '').toLowerCase() === 'rtl') ||
    (() => { const cs = getComputedStyle(el); return /bidi-override/.test(cs.unicodeBidi) && cs.direction === 'rtl'; })();
  const nodes = [];
  const walk = (node, out) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const visible = !!node.parentElement && shown(node.parentElement);
      nodes.push(node.data);
      if (visible) out.s += unOverride(node.data);
      return;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) { for (const c of node.childNodes) walk(c, out); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node, tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'title') return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const inline = /^(inline|contents|ruby)/.test(cs.display);
    const buf = {s: ''};
    if (shown(el)) buf.s += cssStrings(getComputedStyle(el, '::before').content);
    if (tag === 'slot') {
      const assigned = el.assignedNodes({flatten: true});
      for (const c of (assigned.length ? assigned : el.childNodes)) walk(c, buf);
    } else {
      for (const c of (el.shadowRoot ? el.shadowRoot.childNodes : el.childNodes)) walk(c, buf);
    }
    if (shown(el)) {
      buf.s += cssStrings(getComputedStyle(el, '::after').content);
      if ((tag === 'input' && !/^(hidden|password|checkbox|radio|file)$/i.test(el.type)) || tag === 'textarea') buf.s += ' ' + el.value + ' ';
      if (tag === 'select' && el.selectedOptions[0]) buf.s += ' ' + el.selectedOptions[0].text + ' ';
    }
    const piece = isOverrideRtl(el) ? [...buf.s].reverse().join('') : buf.s;
    out.s += inline ? piece : ' ' + piece + ' ';
  };
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document.documentElement;
  if (!scope) return null;
  const vis = {s: ''};
  walk(scope, vis);
  if (scopeSelector) return {visible: vis.s.replace(/\s+/g, ' ')};
  const textRoots = [document];
  // Все элементы: документ, открытые теневые деревья, содержимое template.
  const all = [], commentRoots = [document], extraText = [];
  const gather = rootNode => {
    for (const el of rootNode.querySelectorAll('*')) {
      all.push(el);
      if (el.shadowRoot) { commentRoots.push(el.shadowRoot); textRoots.push(el.shadowRoot); extraText.push(el.shadowRoot.textContent); gather(el.shadowRoot); }
      if (el.localName === 'template' && el.content) { commentRoots.push(el.content); textRoots.push(el.content); extraText.push(el.content.textContent); gather(el.content); }
    }
  };
  gather(document);
  const attributes = [], urls = [], generated = [], comments = [], svg = [];
  const decode = v => { const out = [v]; let cur = v; for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(cur.replace(/\+/g, ' ')); if (d === cur) break; out.push(d); cur = d; } catch { break; } } return out; };
  for (const el of all) {
    for (const a of el.attributes) { attributes.push(a.name, a.value); if (/(?:href|src|action|data|poster|cite|srcset)$/i.test(a.name)) urls.push(...decode(a.value)); }
    for (const prop of ['href', 'src', 'action', 'formAction', 'data', 'poster', 'cite']) {
      const v = el[prop];
      if (typeof v === 'string' && v) urls.push(...decode(v));
      else if (v && typeof v.baseVal === 'string') urls.push(...decode(v.baseVal));
    }
    if (el instanceof SVGElement && el.textContent) svg.push(el.textContent);
    for (const pseudo of ['::before', '::after', '::marker']) { const g = cssStrings(getComputedStyle(el, pseudo).content); if (g) generated.push(g); }
  }
  for (const r of commentRoots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_COMMENT); while (w.nextNode()) comments.push(w.currentNode.data); }
  const textNodes = [];
  for (const r of textRoots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); while (w.nextNode()) textNodes.push(w.currentNode.data); }
  return {
    full: unOverride(document.documentElement.textContent + ' ' + extraText.join(' ')),
    nodes: nodes.join(' \n ') + ' \n ' + textNodes.join(' \n '),
    visible: vis.s.replace(/\s+/g, ' '),
    attributes: attributes.join(' \n '),
    urls: urls.join(' \n '),
    generated: generated.join(' \n '),
    comments: comments.join(' \n '),
    svg: svg.join(' \n '),
    title: document.title,
  };
}

// Дерево доступности Chromium: видит закрытый Shadow DOM, CSS-счётчики и сгенерированный текст.
async function accessibilityText(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const {nodes} = await cdp.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map(n => [n.nodeId, n]));
    const parts = nodes.flatMap(n => [n.name?.value, n.value?.value, n.description?.value]).filter(v => typeof v === 'string' && v);
    // Текст потомков без разделителей (CSS-счётчик «MI» в обёртке + «ET» рядом): для
    // абзацев, заголовков, пунктов, ячеек, ссылок и кнопок. Запоминание – O(n).
    const memo = new Map();
    const textOf = n => {
      if (memo.has(n.nodeId)) return memo.get(n.nodeId);
      memo.set(n.nodeId, '');
      const t = n.role?.value === 'StaticText' ? (n.name?.value ?? '') : (n.childIds ?? []).map(id => byId.get(id)).filter(Boolean).map(textOf).join('');
      memo.set(n.nodeId, t);
      return t;
    };
    const BLOCK_ROLES = new Set(['paragraph', 'heading', 'listitem', 'cell', 'gridcell', 'columnheader', 'rowheader', 'link', 'button', 'label', 'caption', 'figcaption', 'blockquote', 'term', 'definition']);
    for (const n of nodes) if (BLOCK_ROLES.has(n.role?.value)) { const t = textOf(n); if (t) parts.push(t); }
    return parts.join(' \n ');
  } finally { await cdp.detach(); }
}

async function setState(page, theme, lang) {
  for (const frame of page.frames()) {
    await frame.evaluate(([t, l]) => {
      const html = document.documentElement;
      html.dataset.theme = t;
      if (l) { html.dataset.lang = l; html.lang = l; }
    }, [theme, lang]).catch(() => {});
  }
}

async function pageProblems(page, label, {deck = false, route = ''} = {}) {
  const problems = [];
  const hasLang = await page.evaluate(() => !!document.querySelector('[data-l]')).catch(() => false);
  const original = await page.evaluate(() => ({theme: document.documentElement.dataset.theme ?? null, lang: document.documentElement.dataset.lang ?? null})).catch(() => ({}));
  const states = [];
  for (const theme of ['light', 'dark']) for (const lang of (hasLang ? ['ru', 'en'] : [null])) states.push([theme, lang]);
  let deckVisible = '', deckAll = '';
  for (const [theme, lang] of states) {
    await setState(page, theme, lang);
    const where = `${label} [${theme}${lang ? ', ' + lang : ''}]`;
    for (const frame of page.frames()) {
      const layers = await frame.evaluate(collectLayers, null).catch(() => null);
      if (!layers) continue;
      for (const [name, text] of Object.entries(layers)) {
        const hit = employerHits(`${where} ${name}`, text);
        if (hit.length) { problems.push(...hit); break; }
      }
      if (deck && frame === page.mainFrame()) { deckVisible += ' \n ' + layers.visible; deckAll += [' \n ', layers.full, layers.visible, layers.attributes, layers.generated, layers.title].join(' \n '); }
    }
    const ax = await accessibilityText(page);
    problems.push(...employerHits(`${where} accessibility`, ax));
    if (deck) deckAll += ' \n ' + ax;
  }
  await setState(page, original.theme ?? 'light', original.lang);
  if (deck) {
    const shownNames = legalNames(deckVisible, route);
    if (!shownNames.includes('АО АЛЬФА')) problems.push(`${label}: pseudonym «АО «Альфа»» is not shown`);
    const others = [...new Set(legalNames(deckAll, route))].filter(n => n !== 'АО АЛЬФА');
    if (others.length) problems.push(`${label}: other legal names ${JSON.stringify(others)}`);
  }
  return [...new Set(problems)];
}

// Абзац о сервисе: единственный, отрисован, утверждение и цифры – в нём самом; в разделе
// нет других сумм и объёмов кода.
const MONEY = /(?:(?:RUB|USD|EUR|₽|\$|€)\s*)?\d[\d\s.,]*\s*(?:млн|миллион\p{L}*|млрд|миллиард\p{L}*|million|billion|mln|bn)|(?:RUB|USD|EUR|₽|\$|€)\s*\d[\d\s.,]*\d|\d[\d\s.,]*\s*(?:₽|руб\p{L}*|rubles?)/giu;
const CODE = /\d[\d\s.,]*\s*(?:тыс\.?|тысяч\p{L}*)?\s*строк|\d[\d\s.,]*\s*(?:k|K|thousand)?\s*(?:lines?\s+of\s+code|LOC|KLOC|SLOC)\b/gu;
const clean = s => s.replace(/\s+/g, ' ').trim();
async function serviceProblems(page, label) {
  const problems = [];
  const structure = await page.evaluate(() => ({
    sections: document.querySelectorAll('[id="about"]').length,
    paragraphs: [...document.querySelectorAll('#about p')].filter(p => /Единолично создал|independently built and deployed/.test(p.textContent)).length,
  }));
  if (structure.sections !== 1) problems.push(`${label}: sections id=about = ${structure.sections}`);
  if (structure.paragraphs !== 1) problems.push(`${label}: paragraphs with the service claim = ${structure.paragraphs}`);
  for (const lang of ['ru', 'en']) {
    await setState(page, 'light', lang);
    const state = await page.evaluate(() => {
      const p = [...document.querySelectorAll('#about p')].find(x => /Единолично создал|independently built and deployed/.test(x.textContent));
      if (!p) return null;
      document.documentElement.style.scrollBehavior = 'auto';
      p.scrollIntoView({block: 'center', behavior: 'instant'});
      const range = document.createRange();
      range.selectNodeContents(p);
      const rects = [...range.getClientRects()].filter(r => r.width > 2 && r.height > 2).slice(0, 12);
      let hits = 0;
      for (const r of rects) {
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (t && (t === p || p.contains(t))) hits++;
      }
      return {rects: rects.length, hits};
    });
    if (!state || state.rects === 0 || state.hits < Math.ceil(state.rects * 0.6)) problems.push(`${label} [${lang}]: service paragraph is not actually rendered (${JSON.stringify(state)})`);
    const p = await page.evaluate(collectLayers, '#about p:has(> [data-l])').catch(() => null);
    const own = await page.evaluate(() => {
      const el = [...document.querySelectorAll('#about p')].find(x => /Единолично создал|independently built and deployed/.test(x.textContent));
      if (!el) return null;
      el.setAttribute('data-qa-service', '1');
      return true;
    });
    const para = own ? await page.evaluate(collectLayers, '[data-qa-service="1"]') : p;
    await page.evaluate(() => document.querySelector('[data-qa-service]')?.removeAttribute('data-qa-service'));
    const section = await page.evaluate(collectLayers, '#about');
    const ptext = base(para?.visible ?? ''), stext = base(section?.visible ?? '');
    const digits = [...ptext.matchAll(/\d[\d\s.,]*\d|\d/g)].map(m => m[0].replace(/\s+/g, ''));
    if (lang === 'ru') {
      if (!/Единолично создал и ввёл в эксплуатацию сервис SCA\/SBOM/.test(ptext)) problems.push(`${label} [ru]: achievement sentence is not in the visible paragraph`);
      if (!/оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год/.test(ptext)) problems.push(`${label} [ru]: vendor's estimate is not in the visible paragraph`);
      if (JSON.stringify(digits.sort()) !== JSON.stringify(['130', '18'])) problems.push(`${label} [ru]: numbers in the paragraph ${JSON.stringify(digits)}`);
      const money = [...stext.matchAll(MONEY)].map(m => clean(m[0])), code = [...stext.matchAll(CODE)].map(m => clean(m[0]));
      if (JSON.stringify(money) !== JSON.stringify(['18 млн'])) problems.push(`${label} [ru]: amounts in the section ${JSON.stringify(money)}`);
      if (JSON.stringify(code) !== JSON.stringify(['130 тыс. строк'])) problems.push(`${label} [ru]: code sizes in the section ${JSON.stringify(code)}`);
    } else {
      if (!/I independently built and deployed an SCA\/SBOM service/.test(ptext)) problems.push(`${label} [en]: achievement sentence is not in the visible paragraph`);
      if (!/about RUB 18 million a year, vendor's estimate/.test(ptext)) problems.push(`${label} [en]: vendor's estimate is not in the visible paragraph`);
      if (JSON.stringify(digits.sort()) !== JSON.stringify(['130,000', '18'])) problems.push(`${label} [en]: numbers in the paragraph ${JSON.stringify(digits)}`);
      const money = [...stext.matchAll(MONEY)].map(m => clean(m[0])), code = [...stext.matchAll(CODE)].map(m => clean(m[0]));
      if (JSON.stringify(money) !== JSON.stringify(['RUB 18 million'])) problems.push(`${label} [en]: amounts in the section ${JSON.stringify(money)}`);
      if (JSON.stringify(code) !== JSON.stringify(['130,000 lines of code'])) problems.push(`${label} [en]: code sizes in the section ${JSON.stringify(code)}`);
    }
  }
  return problems;
}

// ── Самопроверка: уловки 27.11 должны ловиться, похожие безобидные строки – нет ──
const MUST_CATCH = {
  plain: '<p>Проект MIET</p>', cyrillic: '<p>АО МНТЦ МИЭТ</p>', lowercase: '<p>мнтц и миэт</p>', greekLunate: '<p>MNTϹ</p>',
  caseEnding: '<p>Публикация МИЭТа</p>', dotted: '<p>М.Н.Т.Ц.</p>',
  entityNoSemicolon: '<b>MI&#69T</b>', hexNoSemicolon: '<b>MI&#x45T</b>', allNumeric: '<b>&#77&#73&#69&#84</b>',
  html5Named: '<b>&Mcy;&Icy;&Ecy;&Tcy;</b>', zeroWidthNamed: '<b>MI&ZeroWidthSpace;ET</b>', noBreak: '<b>MI&NoBreak;ET</b>',
  softHyphen: '<b>MI&#173;ET</b>', zwsp: '<b>MI\u200BET</b>', wordJoiner: '<b>MI\u2060ET</b>', bom: '<b>MI\uFEFFET</b>',
  allCyrillicLookalike: '<b>МІЕТ</b>', mixedScript: '<b>MIЕT</b>', greek: '<b>ΜΙΕΤ</b>', mixedMHTC: '<b>MHTЦ</b>', fullWidth: '<b>ＭＩＥＴ</b>', dotlessI: '<b style="text-transform:uppercase">mıet</b>',
  splitComment: '<b>MI<!---->ET</b>', splitBig: '<b>MI<big>ET</big></b>', splitCustom: '<b>MI<x-a>ET</x-a></b>', splitScript: '<b>MI<script></script>ET</b>',
  splitTemplate: '<b>MI<template></template>ET</b>', splitImg: '<b>MI<img alt="">ET</b>', splitInlineDiv: '<span>MI<div style="display:inline">ET</div></span>',
  tagLike: '<b>&lt;МИЭТ&gt;</b>', tagLikeSpaced: '<b>1 &lt; MIET &gt; 0</b>',
  abruptComment: '<b><!-->МИЭТ<!----></b>', bangComment: '<b><!-- x --!>МНТЦ<!-- y --></b>',
  customElementNames: '<b><script-x>МИЭТ</script-x><script></script></b>',
  bdo: '<b><bdo dir="rtl">TEIM</bdo></b>', partialBdo: '<b>MI<bdo dir="rtl">TE</bdo></b>', rlo: '<b>\u202ETEIM\u202C</b>', bidiCss: '<b style="unicode-bidi:bidi-override;direction:rtl">TEIM</b>',
  hiddenBetweenWords: '<p><span>предприятие</span><span hidden>MIET</span><span>город</span></p>',
  dataNotAttribute: '<p>data:МИЭТ</p>', titleAttr: '<abbr title="MI&#69T">x</abbr>', altAttr: '<img src="x.png" alt="Логотип МИ&#1069Т">',
  attrName: '<div data-miet="1">x</div>', hrefEncoded: '<a href="https://&#105stc-mi&#101t.ru/">сайт</a>', hrefPercent: '<a href="https://istc-%6Diet.ru/">сайт</a>',
  pathPercent: '<a href="/clients/%4D%49%45%54/profile">x</a>',
  inputValue: '<input value="MIET">', svgTspan: '<svg><text>М<tspan>ИЭТ</tspan></text></svg>',
  cssBefore: '<style>.x::before{content:"MIET"}</style><p class="x">a</p>', cssEscape: "<style>.x::after{content:'MI\\45 T'}</style><p class=\"x\">a</p>",
  cssAttr: '<style>.x::after{content:attr(data-n)}</style><p class="x" data-n="MIET">a</p>',
  cssCounter: '<style>@counter-style e{system:cyclic;symbols:"MI";suffix:""}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><p class="c">ET</p>',
  shadowOpen: '<x-h><template shadowrootmode="open"><p>MIET</p></template></x-h>',
  shadowClosed: '<x-c></x-c><script>const r=document.querySelector("x-c").attachShadow({mode:"closed"});r.innerHTML="<p>MI</p><p>ET</p><p>MIET</p>";</script>',
  templateAttr: '<template><p title="MIET">x</p><!-- МНТЦ --></template><p>текст</p>', iframeSrcdoc: '<iframe srcdoc="<p>MIET</p>"></iframe>',
  titleTag: '<title>&laquoМИЭТ&raquo</title><p>x</p>', noscriptText: '<noscript><p>MIET</p></noscript>', hiddenDiv: '<div hidden>MIET</div>', commentOnly: '<p>текст</p><!-- MIET -->',
  darkThemeOnly: '<style>:root[data-theme="dark"] .t::after{content:"MIET"}</style><p class="t">x</p>',
};
const MUST_PASS = {
  germanWord: '<p>Vermietung</p>', identifier: '<p>listCache</p>', literalEntity: '<p>MI&amp;#69;T</p>', plainReversedWord: '<p>TEIM</p>',
  scriptIdentifier: '<script>const mietCount = 1;</script><p>текст</p>', dataUri: '<img alt="" src="data:image/png;base64,QUJDTUlFVERFRg==">',
  styleSelector: '<style>.mntcLike{}</style><p>текст</p>', mitWord: '<p>MIT License, Mietvertrag, ISTCX</p>',
};
const PSEUDONYM_CATCH = {
  otherName: '<p>АО «Альфа»</p><p>АО «Бета»</p>', otherNameEntities: '<p>АО «Альфа»</p><p>АО &laquoБета&raquo</p>',
  latinAO: '<p>АО «Альфа»</p><p>AO «Бета»</p>', ooo: '<p>АО «Альфа»</p><p>ООО «Бета»</p>', fullForm: '<p>АО «Альфа»</p><p>Акционерное общество «Бета»</p>',
  noQuotes: '<p>АО «Альфа»</p><p>АО Бета</p>', qElement: '<p>АО «Альфа»</p><p>АО <q>Бета</q></p>', fullWidthQuote: '<p>АО «Альфа»</p><p>АО ＂Бета＂</p>',
  splitTag: '<p>АО «Альфа»</p><p>А<x-a>О</x-a> «Бета»</p>', scriptFooter: "<p>АО «Альфа»</p><script>document.body.append('АО «Бета»')</script>",
  hiddenAlphaVisibleBeta: '<p hidden>АО «Альфа»</p><p>АО «Бета»</p>', inAttribute: '<p>АО «Альфа»</p><input value="АО «Бета»">',
  bdoReversed: '<p>АО «Альфа»</p><p><bdo dir="rtl">»атеБ« ОА</bdo></p>', zwsp: '<p>АО «Альфа»</p><p>АО \u200B«Бета»</p>',
  otherForm: '<p>АО «Альфа»</p><p>ООО «Альфа»</p>', longerName: '<p>АО «Альфа»</p><p>ПАО «Альфа Север»</p>',
  romashkaOutsidePhrase: '<p>АО «Альфа»</p><p>Заказчик проекта: ООО «Ромашка»</p>', hiddenPseudonymOnly: '<p hidden>АО «Альфа»</p><p>Заказчик проекта</p>',
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
// Внешние запросы (шрифты, счётчики) отключены: проверка не зависит от сети.
const localOnly = (context, allowed) => context.route('**/*', route => (allowed.some(a => route.request().url().startsWith(a)) ? route.continue() : route.abort()));
try {
  // 1. Самопроверка на фрагментах.
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
  await localOnly(ctx, ['http://fixture.test/']);
  const page = await ctx.newPage();
  let fixtureHtml = '';
  await page.route('http://fixture.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: fixtureHtml}));
  const fixture = async (html, raw = false) => {
    fixtureHtml = raw ? html : `<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    await page.goto('http://fixture.test/', {waitUntil: 'load'});
  };
  for (const [name, html] of Object.entries(MUST_CATCH)) {
    await fixture(html);
    if (!(await pageProblems(page, `fixture ${name}`)).length) failures.push(`self-test: «${name}» is not caught`);
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
  // Абзац о сервисе: подмены в копии index.html должны отклоняться.
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const anchorRu = '<p><span data-l="ru">Выстраиваю РБПО';
  assert.ok(index.includes(anchorRu), 'service paragraph anchor in index.html');
  const serviceMutations = {
    clipPath: index.replace(anchorRu, '<p style="clip-path: inset(50%)"><span data-l="ru">Выстраиваю РБПО'),
    hiddenWrapper: index.replace(anchorRu, '<div hidden>' + anchorRu).replace('около 130 тыс. строк кода', 'около 130 тыс. строк кода</span></p></div><p><span data-l="ru">'),
    extraAmountEn: index.replace("about RUB 18 million a year, vendor's estimate).", "about RUB 18 million a year, vendor's estimate). Annual cost: RUB 28,000,000. Code size: 250k LOC."),
    wrongCodeRu: index.replace('около 130 тыс. строк кода', 'около 230 тыс. строк кода'),
    duplicate: index.replace(anchorRu, '<p><span data-l="ru">Единолично создал и ввёл в эксплуатацию сервис SCA/SBOM (дубль)</span></p>' + anchorRu),
  };
  for (const [name, html] of Object.entries(serviceMutations)) {
    assert.notEqual(html, index, `service mutation ${name} applied`);
    await fixture(html, true);
    if (!(await serviceProblems(page, `service ${name}`)).length) failures.push(`self-test: service mutation «${name}» is not rejected`);
    cases++;
  }
  await ctx.close();

  // 2. Реальные страницы: с JavaScript и без (noscript), все состояния темы и языка.
  for (const route of PAGES) {
    for (const js of [true, false]) {
      const context = await browser.newContext({javaScriptEnabled: js, viewport: {width: 1440, height: 900}});
      await localOnly(context, [origin]);
      const p = await context.newPage();
      await p.goto(origin + route, {waitUntil: 'load'});
      const label = `${route}${js ? '' : ' [no JS]'}`;
      failures.push(...await pageProblems(p, label, {deck: DECKS.has(route), route}));
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
console.log(`FORMER EMPLOYER QA OK: ${cases} cases, ${PAGES.length} pages, ${Object.keys(MUST_CATCH).length + Object.keys(PSEUDONYM_CATCH).length} disguises and 5 service mutations rejected`);
