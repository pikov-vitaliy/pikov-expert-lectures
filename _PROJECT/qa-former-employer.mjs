// Браузерная проверка: прежний работодатель не назван на страницах кейса SCA/SBOM,
// абзац о сервисе в «Обо мне» виден и с согласованными цифрами, презентации кейса
// используют одно условное название «АО «Альфа»». Слово владельца 27.11.2026.
//
// Почему браузер, а не регулярные выражения: 27.11 агенты нашли 72 подтверждённых
// обхода регулярной проверки. Здесь страницу разбирает Chromium, а проверка читает то,
// что получит читатель, в нескольких слоях сразу.
//
// Модель угроз. Ловится: название в любом слое – DOM целиком через CDP (включая закрытый
// Shadow DOM, iframe, template: текст, атрибуты и их имена, комментарии), текст скрытых
// элементов отдельно от соседей, видимый текст с CSS ::before/::after и bidi-override,
// дерево доступности (CSS-счётчики, закрытые корни), значения полей, декодированные
// компоненты адресов, заголовок – во всех состояниях: системная светлая/тёмная тема,
// data-theme (нет, light, dark), язык ru/en (data-lang и :lang). Нормализация: NFKC,
// регистр, невидимые символы, гомоглифы кириллица/греческий/латиница, точки между
// буквами, падежные окончания кириллических аббревиатур. Псевдоним презентаций и абзац о
// сервисе должны быть видны (попадание точкой, ненулевой цвет и заливка букв) в каждом
// состоянии. Не ловится: перестановка частей слова средствами вёрстки (CSS order,
// row-reverse, абсолютное позиционирование, наложение) – это видно только на картинке и
// закрывается ревью изменений.
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
// Состояния: системная тема × data-theme × язык.
const STATES = [];
for (const [scheme, theme] of [['light', null], ['dark', null], ['light', 'dark'], ['dark', 'light']]) for (const lang of ['ru', 'en']) STATES.push({scheme, theme, lang});

// ── Нормализация ───────────────────────────────────────────────────────────────
const UPPER_TO_LATIN = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y', І: 'I', Ј: 'J', Ѕ: 'S', Ԛ: 'Q', Ԝ: 'W',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X', Ϲ: 'C', Ϻ: 'M', Ϳ: 'J',
};
const LATIN_TO_CYRILLIC = {A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х', Y: 'У', a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х'};
const INVISIBLE = /[\p{Cf}\p{Mn}\u00AD\u034F\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\u2800]/gu;
const base = s => s.normalize('NFKC').replace(INVISIBLE, '');
const mapLatin = s => s.toUpperCase().replace(/./gu, ch => UPPER_TO_LATIN[ch] ?? ch);
const foldLatin = s => mapLatin(base(mapLatin(s)));
const toCyrillic = s => base(s).replace(/[A-Za-z]/g, ch => LATIN_TO_CYRILLIC[ch] ?? ch).replace(/[\u00A0\u2007\u202F]/g, ' ');

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

// Обозначения юрлиц: аббревиатура формы (АО, ООО…) или полная форма в любом падеже;
// имя – в кавычках целиком, без кавычек – подряд идущие слова с заглавной буквы.
const QO = '«"„“”\'‘’‹›＂', QC = '»"“”\'’›＂';
const LEGAL_FORM = new RegExp(
  `(?<![\\p{L}])(?:(АО|ООО|ОАО|ПАО|ЗАО|НАО)|((?:[Аа]кционерн\\p{L}*\\s+[Оо]бществ\\p{L}*)|(?:[Оо]бществ\\p{L}*\\s+с\\s+ограниченной\\s+ответственностью)))(?![\\p{L}])` +
  `\\s*(?:[${QO}]+\\s*([^${QO}${QC}]{1,60}?)\\s*[${QC}]|((?:\\p{Lu}[\\p{L}\\p{N}-]*)(?:\\s+\\p{Lu}[\\p{L}\\p{N}-]*){0,2}))`, 'gu');
// Учебный пример владельца в исторической презентации sbom-license-audit – только эта фраза целиком.
const ALLOWED_PHRASES = {'/sbom-license-audit/': ['У ООО «Ромашка» может быть много адресов, печатей и сокращений, но ИНН один.']};
function legalNames(text, route) {
  const flat = x => toCyrillic(x).replace(/\s+/g, ' ');
  let t = flat(text);
  for (const phrase of ALLOWED_PHRASES[route] ?? []) t = t.split(flat(phrase)).join(' ');
  return [...t.matchAll(LEGAL_FORM)].map(m => {
    const form = m[1] ?? (/ограничен/i.test(m[2]) ? 'ООО' : 'АО');
    return `${form} ${(m[3] ?? m[4]).replace(/\s+/g, ' ').trim().toUpperCase()}`;
  });
}

// ── Слои страницы (выполняется во фрейме) ──────────────────────────────────────
function collectLayers(scopeSelector) {
  // Методы прототипа – страница не может их подменить (поле формы name="attributes").
  const P = {
    attrNames: Element.prototype.getAttributeNames, attr: Element.prototype.getAttribute,
    qsa: Element.prototype.querySelectorAll, dqsa: Document.prototype.querySelectorAll, fqsa: DocumentFragment.prototype.querySelectorAll,
    text: Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get, local: Object.getOwnPropertyDescriptor(Element.prototype, 'localName').get,
    shadow: Object.getOwnPropertyDescriptor(Element.prototype, 'shadowRoot').get,
    content: Object.getOwnPropertyDescriptor(HTMLTemplateElement.prototype, 'content').get,
  };
  const qsa = (rootNode, sel) => rootNode instanceof Document ? P.dqsa.call(rootNode, sel) : rootNode instanceof DocumentFragment ? P.fqsa.call(rootNode, sel) : P.qsa.call(rootNode, sel);
  const cssStrings = value => {
    if (!value || value === 'none' || value === 'normal') return '';
    return [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1')).join('');
  };
  const transparent = c => !c || /rgba\([^)]*,\s*0\)$|\/\s*0\)$|transparent/.test(c);
  const shown = el => {
    if (!el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement || e.getRootNode().host) {
      const cs = getComputedStyle(e);
      if (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*50%|circle\(\s*0|polygon\(\s*0[^,]*,\s*0[^,]*,\s*0/.test(cs.clipPath)) return false;
      if (cs.overflow !== 'visible' && e !== el) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; }
    }
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 4) return false;
    if (transparent(cs.color) || transparent(cs.webkitTextFillColor || cs.color)) return false;
    return true;
  };
  const unOverride = s => s.replace(/\u202E([^\u202C\u202D]*)(\u202C|$)/g, (_, x) => [...x].reverse().join(''));
  const isOverrideRtl = el => (P.local.call(el) === 'bdo' && (P.attr.call(el, 'dir') || '').toLowerCase() === 'rtl') ||
    (() => { const cs = getComputedStyle(el); return /bidi-override|isolate-override/.test(cs.unicodeBidi) && cs.direction === 'rtl'; })();
  const hiddenTexts = [];
  const walk = (node, out, parentShown) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement && shown(node.parentElement)) out.s += unOverride(node.data);
      return;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) { for (const c of node.childNodes) walk(c, out, parentShown); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node, tag = P.local.call(el);
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'title') return;
    const cs = getComputedStyle(el);
    const isShown = cs.display !== 'none' && el.checkVisibility({checkVisibilityCSS: true});
    // Скрытый элемент внутри показанного родителя: его текст проверяется отдельно, без склейки с соседями.
    if (!isShown && parentShown) hiddenTexts.push(unOverride(P.text.call(el)));
    if (cs.display === 'none') return;
    const inline = /^(inline|contents|ruby)/.test(cs.display);
    const buf = {s: ''};
    if (shown(el)) buf.s += cssStrings(getComputedStyle(el, '::before').content);
    const sr = P.shadow.call(el);
    if (tag === 'slot') {
      const assigned = el.assignedNodes({flatten: true});
      for (const c of (assigned.length ? assigned : el.childNodes)) walk(c, buf, isShown);
    } else {
      for (const c of (sr ? sr.childNodes : el.childNodes)) walk(c, buf, isShown);
    }
    if (shown(el)) {
      buf.s += cssStrings(getComputedStyle(el, '::after').content);
      if ((tag === 'input' && !/^(hidden|password|checkbox|radio|file)$/i.test(el.type)) || tag === 'textarea') buf.s += ' ' + el.value + ' ';
      if (tag === 'select' && el.selectedOptions[0]) buf.s += ' ' + el.selectedOptions[0].text + ' ';
    }
    const piece = isOverrideRtl(el) ? [...buf.s].reverse().join('') : buf.s;
    out.s += inline ? piece : ' ' + piece + ' ';
  };
  const scope = scopeSelector ? qsa(document, scopeSelector)[0] : document.documentElement;
  if (!scope) return null;
  const vis = {s: ''};
  walk(scope, vis, true);
  if (scopeSelector) return {visible: vis.s.replace(/\s+/g, ' ')};
  const all = [], extraText = [], commentRoots = [document];
  const gather = rootNode => {
    for (const el of qsa(rootNode, '*')) {
      all.push(el);
      const sr = P.shadow.call(el);
      if (sr) { extraText.push(P.text.call(sr)); commentRoots.push(sr); gather(sr); }
      const content = P.local.call(el) === 'template' ? P.content.call(el) : null;
      if (content) { extraText.push(P.text.call(content)); commentRoots.push(content); gather(content); }
    }
  };
  gather(document);
  const urls = [], generated = [], attributes = [], comments = [];
  const decodeParts = v => {
    const out = [v];
    for (const part of String(v).split(/[/?#&=;,]/)) {
      let cur = part;
      for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(cur.replace(/\+/g, ' ')); if (d === cur) break; out.push(d); cur = d; } catch { break; } }
    }
    return out;
  };
  for (const el of all) {
    for (const n of P.attrNames.call(el)) attributes.push(n, P.attr.call(el, n));
    for (const n of P.attrNames.call(el)) if (/(?:href|src|action|data|poster|cite|srcset|url)$/i.test(n)) urls.push(...decodeParts(P.attr.call(el, n)));
    for (const prop of ['href', 'src', 'action', 'formAction', 'data', 'poster', 'cite']) {
      const v = el[prop];
      if (typeof v === 'string' && v) urls.push(...decodeParts(v));
      else if (v && typeof v.baseVal === 'string') urls.push(...decodeParts(v.baseVal));
    }
    for (const pseudo of ['::before', '::after', '::marker']) { const g = cssStrings(getComputedStyle(el, pseudo).content); if (g) generated.push(g); }
  }
  for (const r of commentRoots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_COMMENT); while (w.nextNode()) comments.push(w.currentNode.data); }
  return {
    attributes: attributes.join(' \n '),
    comments: comments.join(' \n '),
    full: unOverride(P.text.call(document.documentElement) + ' ' + extraText.join(' ')),
    hidden: hiddenTexts.join(' \n '),
    visible: vis.s.replace(/\s+/g, ' '),
    urls: urls.join(' \n '),
    generated: generated.join(' \n '),
    title: document.title,
  };
}

// Весь DOM через CDP (pierce): документ, закрытые теневые корни, iframe, template. Текст
// склеивается внутри каждого корня (как textContent: «Ver<em>miet</em>ung» – одно слово),
// атрибуты с именами и комментарии – отдельно.
async function cdpDomText(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const {root: dom} = await cdp.send('DOM.getDocument', {depth: -1, pierce: true});
    const roots = [], attrs = [], comments = [];
    const visit = (n, acc) => {
      if (n.nodeType === 3) acc.push(n.nodeValue);
      else if (n.nodeType === 8) comments.push(n.nodeValue);
      if (n.attributes) for (let i = 0; i < n.attributes.length; i += 2) attrs.push(n.attributes[i], n.attributes[i + 1]);
      for (const k of n.children ?? []) visit(k, acc);
      for (const r of [...(n.shadowRoots ?? []), ...(n.contentDocument ? [n.contentDocument] : []), ...(n.templateContent ? [n.templateContent] : [])]) {
        const a = [];
        roots.push(a);
        visit(r, a);
      }
    };
    const top = [];
    roots.push(top);
    visit(dom, top);
    return [...roots.map(a => a.join('')), attrs.join(' \n '), comments.join(' \n ')].join(' \n ');
  } finally { await cdp.detach(); }
}

// Дерево доступности: текст каждого блочного узла без разделителей между потомками
// (CSS-счётчик «MI» в обёртке + «ET» рядом, закрытый Shadow DOM).
async function accessibilityText(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    // display каждого узла: текст строчных элементов уже входит в текст их блока.
    const snap = await cdp.send('DOMSnapshot.captureSnapshot', {computedStyles: ['display']});
    const display = new Map();
    for (const d of snap.documents) {
      const ids = d.nodes.backendNodeId;
      d.layout.nodeIndex.forEach((ni, i) => { const si = d.layout.styles[i]?.[0]; display.set(ids[ni], si >= 0 ? snap.strings[si] : ''); });
    }
    const {nodes} = await cdp.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map(n => [n.nodeId, n]));
    const memo = new Map();
    const textOf = n => {
      if (memo.has(n.nodeId)) return memo.get(n.nodeId);
      memo.set(n.nodeId, '');
      const t = n.role?.value === 'StaticText' ? (n.name?.value ?? '') : (n.childIds ?? []).map(id => byId.get(id)).filter(Boolean).map(textOf).join('');
      memo.set(n.nodeId, t);
      return t;
    };
    const parts = [];
    for (const n of nodes) {
      const role = n.role?.value;
      for (const v of [n.value?.value, n.description?.value]) if (typeof v === 'string' && v) parts.push(v);
      if (role === 'StaticText' || role === 'InlineTextBox' || role === 'RootWebArea') continue;
      const disp = display.get(n.backendDOMNodeId);
      if (disp === undefined || /^(inline|contents|ruby)/.test(disp)) continue;
      const t = textOf(n);
      if (t && t.length < 20000) parts.push(t);
    }
    return parts.join(' \n ');
  } finally { await cdp.detach(); }
}

async function setState(page, {scheme, theme, lang}) {
  await page.emulateMedia({colorScheme: scheme});
  for (const frame of page.frames()) {
    await frame.evaluate(([t, l]) => {
      const html = document.documentElement;
      if (t) html.setAttribute('data-theme', t); else html.removeAttribute('data-theme');
      html.setAttribute('data-lang', l);
      html.setAttribute('lang', l);
    }, [theme, lang]);
  }
}

// Текст отрисован: попадание точкой по строкам, видимые цвет и заливка букв. Кандидаты –
// абзац о сервисе или самый вложенный элемент с псевдонимом; достаточно одного.
async function textRendered(page, mode) {
  return page.evaluate(m => {
    const transparent = c => !c || /rgba\([^)]*,\s*0\)$|\/\s*0\)$|transparent/.test(c);
    const PSEUDO = /АО\s*«Альфа»/;
    const candidates = m === 'service'
      ? [...document.querySelectorAll('#about p')].filter(x => /Единолично создал|independently built and deployed/.test(x.textContent))
      : [...document.querySelectorAll('body *')].filter(e => PSEUDO.test(e.textContent) && ![...e.children].some(c => PSEUDO.test(c.textContent)));
    document.documentElement.style.scrollBehavior = 'auto';
    let last = {ok: false, why: 'not found'};
    for (const el of candidates) {
      if (!el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) { last = {ok: false, why: 'invisible'}; continue; }
      el.scrollIntoView({block: 'center', behavior: 'instant'});
      const cs = getComputedStyle(el);
      if (transparent(cs.color) || transparent(cs.webkitTextFillColor || cs.color) || parseFloat(cs.fontSize) < 6) { last = {ok: false, why: 'color/size'}; continue; }
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(r => r.width > 2 && r.height > 2).slice(0, 12);
      let hits = 0;
      for (const r of rects) { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (t && (t === el || el.contains(t))) hits++; }
      last = {ok: rects.length > 0 && hits >= Math.ceil(rects.length * 0.6), rects: rects.length, hits};
      if (last.ok) return last;
    }
    return last;
  }, mode);
}

async function pageProblems(page, label, {deck = false, route = ''} = {}) {
  const problems = [];
  let deckAll = '';
  for (const state of STATES) {
    await setState(page, state);
    const where = `${label} [${state.scheme}/${state.theme ?? '-'}/${state.lang}]`;
    for (const frame of page.frames()) {
      let layers;
      try { layers = await frame.evaluate(collectLayers, null); } catch (e) { problems.push(`${where}: collector failed in frame ${frame.url()}: ${e.message}`); continue; }
      for (const [name, text] of Object.entries(layers)) {
        const hit = employerHits(`${where} ${name}`, text);
        if (hit.length) { problems.push(...hit); break; }
      }
      if (deck) deckAll += [' \n ', layers.full, layers.hidden, layers.visible, layers.generated, layers.title].join(' \n ');
      if (deck && frame === page.mainFrame()) {
        const names = legalNames(layers.visible, route);
        if (!names.includes('АО АЛЬФА')) problems.push(`${where}: pseudonym «АО «Альфа»» is not shown`);
        else {
          const r = await textRendered(page, 'pseudonym');
          if (!r.ok) problems.push(`${where}: pseudonym «АО «Альфа»» is not rendered (${JSON.stringify(r)})`);
        }
      }
    }
    const dom = await cdpDomText(page), ax = await accessibilityText(page);
    problems.push(...employerHits(`${where} dom`, dom), ...employerHits(`${where} accessibility`, ax));
    if (deck) deckAll += ' \n ' + dom + ' \n ' + ax;
  }
  if (deck) {
    const others = [...new Set(legalNames(deckAll, route))].filter(n => n !== 'АО АЛЬФА');
    if (others.length) problems.push(`${label}: other legal names ${JSON.stringify(others)}`);
  }
  return [...new Set(problems)];
}

// Абзац о сервисе: единственный, отрисован в каждом состоянии, утверждение и цифры с
// единицами – в нём самом; в разделе нет других денежных сумм и объёмов кода.
const CUR = '(?:RUB|USD|EUR|руб\\.?|₽|\\$|€)';
const MULT = '(?:млн|миллион\\p{L}*|млрд|миллиард\\p{L}*|million|billion|mln|bn)';
const MONEY = new RegExp(`${CUR}\\s*\\d[\\d\\s.,]*\\d?(?:\\s*${MULT})?|\\d[\\d\\s.,]*(?:\\s*${MULT})?\\s*${CUR}`, 'giu');
const CODE = /\d[\d\s.,]*\s*(?:тыс\.?|тысяч\p{L}*|к)?\s*строк|\d[\d\s.,]*\s*(?:k|K|thousand)?\s*(?:lines?\s+of\s+code|LOC|KLOC|SLOC)\b/gu;
const clean = s => s.replace(/\s+/g, ' ').trim();
async function serviceProblems(page, label) {
  const problems = [];
  const structure = await page.evaluate(() => ({
    sections: document.querySelectorAll('[id="about"]').length,
    paragraphs: [...document.querySelectorAll('#about p')].filter(p => /Единолично создал|independently built and deployed/.test(p.textContent)).length,
  }));
  if (structure.sections !== 1) problems.push(`${label}: sections id=about = ${structure.sections}`);
  if (structure.paragraphs !== 1) problems.push(`${label}: paragraphs with the service claim = ${structure.paragraphs}`);
  for (const state of STATES) {
    await setState(page, state);
    const where = `${label} [${state.scheme}/${state.theme ?? '-'}/${state.lang}]`;
    const r = await textRendered(page, 'service');
    if (!r.ok) problems.push(`${where}: service paragraph is not rendered (${JSON.stringify(r)})`);
    await page.evaluate(() => [...document.querySelectorAll('#about p')].find(x => /Единолично создал|independently built and deployed/.test(x.textContent))?.setAttribute('data-qa-service', '1'));
    const para = await page.evaluate(collectLayers, '[data-qa-service="1"]');
    await page.evaluate(() => document.querySelector('[data-qa-service]')?.removeAttribute('data-qa-service'));
    const section = await page.evaluate(collectLayers, '#about');
    const ptext = base(para?.visible ?? ''), stext = base(section?.visible ?? '');
    const digits = [...ptext.matchAll(/\d[\d\s.,]*\d|\d/g)].map(m => m[0].replace(/\s+/g, '')).sort();
    const money = [...stext.matchAll(MONEY)].map(m => clean(m[0])), code = [...stext.matchAll(CODE)].map(m => clean(m[0]));
    if (state.lang === 'ru') {
      if (!/Единолично создал и ввёл в эксплуатацию сервис SCA\/SBOM/.test(ptext)) problems.push(`${where}: achievement sentence is not in the visible paragraph`);
      if (!/около 130 тыс\. строк кода/.test(ptext)) problems.push(`${where}: code size is not in the visible paragraph`);
      if (!/\(оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год\)/.test(ptext)) problems.push(`${where}: vendor's estimate is not in the visible paragraph`);
      if (JSON.stringify(digits) !== JSON.stringify(['130', '18'])) problems.push(`${where}: numbers in the paragraph ${JSON.stringify(digits)}`);
      if (JSON.stringify(money) !== JSON.stringify(['18 млн ₽'])) problems.push(`${where}: amounts in the section ${JSON.stringify(money)}`);
      if (JSON.stringify(code) !== JSON.stringify(['130 тыс. строк'])) problems.push(`${where}: code sizes in the section ${JSON.stringify(code)}`);
    } else {
      if (!/I independently built and deployed an SCA\/SBOM service/.test(ptext)) problems.push(`${where}: achievement sentence is not in the visible paragraph`);
      if (!/about 130,000 lines of code/.test(ptext)) problems.push(`${where}: code size is not in the visible paragraph`);
      if (!/\(about RUB 18 million a year, vendor's estimate\)/.test(ptext)) problems.push(`${where}: vendor's estimate is not in the visible paragraph`);
      if (JSON.stringify(digits) !== JSON.stringify(['130,000', '18'])) problems.push(`${where}: numbers in the paragraph ${JSON.stringify(digits)}`);
      if (JSON.stringify(money) !== JSON.stringify(['RUB 18 million'])) problems.push(`${where}: amounts in the section ${JSON.stringify(money)}`);
      if (JSON.stringify(code) !== JSON.stringify(['130,000 lines of code'])) problems.push(`${where}: code sizes in the section ${JSON.stringify(code)}`);
    }
  }
  return [...new Set(problems)];
}

// ── Самопроверка ───────────────────────────────────────────────────────────────
// Приманки строят запрещённое имя так, чтобы его не было в исходном тексте скриптов и
// стилей: срабатывать должен именно проверяемый механизм.
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
  bdo: '<b><bdo dir="rtl">TEIM</bdo></b>', partialBdo: '<b>MI<bdo dir="rtl">TE</bdo></b>', rlo: '<b>\u202ETEIM\u202C</b>',
  bidiCss: '<b style="unicode-bidi:bidi-override;direction:rtl">TEIM</b>', isolateOverride: '<b style="unicode-bidi:isolate-override;direction:rtl">TEIM</b>',
  hiddenBetweenWords: '<p><span>предприятие</span><span hidden>MIET</span><span>город</span></p>',
  hiddenSplitBetweenWords: '<p><span>предприятие</span><span hidden>MI<strong>ET</strong></span><span>город</span></p>',
  dataNotAttribute: '<p>data:МИЭТ</p>', titleAttr: '<abbr title="MI&#69T">x</abbr>', altAttr: '<img src="x.png" alt="Логотип МИ&#1069Т">',
  attrName: '<div data-miet="1">x</div>', hrefEncoded: '<a href="https://&#105stc-mi&#101t.ru/">сайт</a>', hrefPercent: '<a href="https://istc-%6Diet.ru/">сайт</a>',
  pathPercent: '<a href="/clients/%4D%49%45%54/profile">x</a>', pathPercentWithQuery: '<a href="/clients/%4D%49%45%54/profile?progress=100%">x</a>',
  clobberedAttributes: '<form><input name="attributes"><template><p title="MI&#69;T">x</p></template></form>',
  inputValue: '<input value="MIET">', svgTspan: '<svg><text>М<tspan>ИЭТ</tspan></text></svg>',
  cssBefore: '<style>.x::before{content:"MI\\45 T"}</style><p class="x">a</p>', cssEscape: "<style>.x::after{content:'MI\\45 T'}</style><p class=\"x\">a</p>",
  cssAttr: '<style>.x::after{content:attr(data-n)}</style><p class="x" data-n="MI&#69;T">a</p>',
  cssCounterP: '<style>@counter-style e{system:cyclic;symbols:"MI";suffix:""}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><p class="c">ET</p>',
  cssCounterDiv: '<style>@counter-style e{system:cyclic;symbols:"MI";suffix:""}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><div class="c">ET</div>',
  shadowOpen: '<x-h><template shadowrootmode="open"><p>MIET</p></template></x-h>',
  shadowClosedText: '<x-c></x-c><script>const n="M"+"IET";const r=document.querySelector("x-c").attachShadow({mode:"closed"});const p=document.createElement("p");p.textContent=n;r.append(p);</script>',
  shadowClosedAttr: '<x-d></x-d><script>const r=document.querySelector("x-d").attachShadow({mode:"closed"});const p=document.createElement("p");p.setAttribute("data-customer","M"+"IET");p.textContent="x";r.append(p);</script>',
  templateAttr: '<template><p title="MIET">x</p><!-- МНТЦ --></template><p>текст</p>', iframeSrcdoc: '<iframe srcdoc="<p>MI&amp;#69;T</p>"></iframe>',
  titleTag: '<title>&laquoМИЭТ&raquo</title><p>x</p>', noscriptText: '<noscript><p>MIET</p></noscript>', hiddenDiv: '<div hidden>MIET</div>', commentOnly: '<p>текст</p><!-- MIET -->',
  darkThemeOnly: '<style>:root[data-theme="dark"] .t::after{content:"MI\\45 T"}</style><p class="t">x</p>',
  systemDarkOnly: '<style>@media (prefers-color-scheme: dark){.t::after{content:"MI\\45 T"}}</style><p class="t">x</p>',
  langEnOnly: '<style>:root:lang(en) .t::after{content:"MI\\45 T"}</style><p class="t">x</p>',
};
// Эти уловки видны только в небазовом состоянии: в базовом (системная светлая тема, без
// data-theme, ru) находок быть не должно, иначе срабатывает не тот механизм.
const STATE_ONLY = new Set(['darkThemeOnly', 'systemDarkOnly', 'langEnOnly']);
const BASE_STATE = '[light/-/ru]';
const MUST_PASS = {
  germanWord: '<p>Vermietung</p>', germanWordEm: '<p>Ver<em>miet</em>ung</p>', identifier: '<p>listCache</p>', literalEntity: '<p>MI&amp;#69;T</p>', plainReversedWord: '<p>TEIM</p>',
  scriptIdentifier: '<script>const mietCount = 1;</script><p>текст</p>', dataUri: '<img alt="" src="data:image/png;base64,QUJDTUlFVERFRg==">',
  styleSelector: '<style>.mntcLike{}</style><p>текст</p>', mitWord: '<p>MIT License, Mietvertrag, ISTCX</p>',
};
const PSEUDONYM_CATCH = {
  otherName: '<p>АО «Альфа»</p><p>АО «Бета»</p>', otherNameEntities: '<p>АО «Альфа»</p><p>АО &laquoБета&raquo</p>',
  latinAO: '<p>АО «Альфа»</p><p>AO «Бета»</p>', ooo: '<p>АО «Альфа»</p><p>ООО «Бета»</p>', fullForm: '<p>АО «Альфа»</p><p>Акционерное общество «Бета»</p>',
  declinedForm: '<p>АО «Альфа»</p><p>Договор с акционерным обществом «Бета»</p>',
  noQuotes: '<p>АО «Альфа»</p><p>АО Бета</p>', noQuotesTwoWords: '<p>АО «Альфа»</p><p>АО Альфа Север</p>', qElement: '<p>АО «Альфа»</p><p>АО <q>Бета</q></p>', fullWidthQuote: '<p>АО «Альфа»</p><p>АО ＂Бета＂</p>',
  splitTag: '<p>АО «Альфа»</p><p>А<x-a>О</x-a> «Бета»</p>', scriptFooter: "<p>АО «Альфа»</p><script>document.body.append('АО «Бе'+'та»')</script>",
  hiddenAlphaVisibleBeta: '<p hidden>АО «Альфа»</p><p>АО «Бета»</p>', inAttribute: '<p>АО «Альфа»</p><input value="АО «Бета»">',
  bdoReversed: '<p>АО «Альфа»</p><p><bdo dir="rtl">»атеБ« ОА</bdo></p>', zwsp: '<p>АО «Альфа»</p><p>АО \u200B«Бета»</p>',
  otherForm: '<p>АО «Альфа»</p><p>ООО «Альфа»</p>', longerName: '<p>АО «Альфа»</p><p>ПАО «Альфа Север»</p>',
  romashkaOutsidePhrase: '<p>АО «Альфа»</p><p>Заказчик проекта: ООО «Ромашка»</p>', romashkaPartialPhrase: '<p>АО «Альфа»</p><p>Платежи: у ООО «Ромашка» может быть много счетов</p>',
  hiddenPseudonymOnly: '<p hidden>АО «Альфа»</p><p>Заказчик проекта</p>', zeroHeightPseudonym: '<div style="height:0;overflow:hidden"><p>АО «Альфа»</p></div><p>Заказчик</p>',
  transparentFill: '<p style="-webkit-text-fill-color:transparent">АО «Альфа»</p><p>Заказчик</p>',
  darkHidesPseudonym: '<style>:root[data-theme="dark"] .a{display:none}</style><p class="a">АО «Альфа»</p>',
  iframeOtherName: '<p>АО «Альфа»</p><iframe srcdoc="<p>ООО «Бета»</p>"></iframe>',
};
const PSEUDONYM_PASS = {plainSentence: '<p>АО «Альфа»</p><p>АО обязано вести реестр акционеров</p>', romashkaExact: '<p>АО «Альфа»</p><p>У ООО «Ромашка» может быть много адресов, печатей и сокращений, но ИНН один.</p>'};

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
const localOnly = (context, allowed) => context.route('**/*', route => {
  const url = route.request().url();
  return (allowed.some(a => url.startsWith(a)) || url.startsWith('about:') || url.startsWith('data:')) ? route.continue() : route.abort();
});
try {
  // 1. Самопроверка на фрагментах.
  const ctx = await browser.newContext({viewport: {width: 1280, height: 900}});
  await localOnly(ctx, ['http://fixture.test/']);
  const page = await ctx.newPage();
  let fixtureHtml = '';
  await page.route('http://fixture.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: fixtureHtml}));
  const fixture = async (html, raw = false) => {
    fixtureHtml = raw ? html : `<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const response = await page.goto('http://fixture.test/', {waitUntil: 'load'});
    assert.equal(response.status(), 200);
  };
  for (const [name, html] of Object.entries(MUST_CATCH)) {
    await fixture(html);
    const found = await pageProblems(page, `fixture ${name}`);
    if (!found.length) failures.push(`self-test: «${name}» is not caught`);
    else if (STATE_ONLY.has(name) && found.some(f => f.includes(BASE_STATE))) failures.push(`self-test: «${name}» is caught in the base state: ${found[0]}`);
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
    const found = await pageProblems(page, `fixture ${name}`, {deck: true, route: '/sbom-license-audit/'});
    if (!found.some(f => /other legal names|not shown|not rendered/.test(f))) failures.push(`self-test: pseudonym «${name}» is not caught`);
    cases++;
  }
  for (const [name, html] of Object.entries(PSEUDONYM_PASS)) {
    await fixture(html);
    const found = await pageProblems(page, `fixture ${name}`, {deck: true, route: '/sbom-license-audit/'});
    if (found.length) failures.push(`self-test: pseudonym «${name}» is a false positive: ${found[0]}`);
    cases++;
  }
  // Абзац о сервисе: подмены в копии index.html должны отклоняться.
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const anchorRu = '<p><span data-l="ru">Выстраиваю РБПО';
  assert.ok(index.includes(anchorRu), 'service paragraph anchor in index.html');
  const serviceMutations = {
    clipPath: index.replace(anchorRu, '<p style="clip-path: inset(50%)"><span data-l="ru">Выстраиваю РБПО'),
    transparentFill: index.replace(anchorRu, '<p style="-webkit-text-fill-color: transparent"><span data-l="ru">Выстраиваю РБПО'),
    darkHides: index.replace('</head>', '<style>:root[data-theme="dark"] #about p:has(> [data-l]){display:none}</style></head>'),
    extraAmountEn: index.replace("about RUB 18 million a year, vendor's estimate).", "about RUB 18 million a year, vendor's estimate). Annual cost: 28,000,000 USD. Code size: 250k LOC."),
    wrongCodeRu: index.replace('около 130 тыс. строк кода', 'около 230 тыс. строк кода'),
    unitMovedOut: index.replace('the service comprises about 130,000 lines of code', 'the service comprises about 130,000 tests'),
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
      const response = await p.goto(origin + route, {waitUntil: 'load'});
      const label = `${route}${js ? '' : ' [no JS]'}`;
      if (!response || response.status() !== 200) { failures.push(`${label}: HTTP ${response?.status()}`); await context.close(); continue; }
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
console.log(`FORMER EMPLOYER QA OK: ${cases} cases, ${PAGES.length} pages × ${STATES.length} states, ${Object.keys(MUST_CATCH).length + Object.keys(PSEUDONYM_CATCH).length} disguises and 7 service mutations rejected`);
