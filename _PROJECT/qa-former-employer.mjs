// Браузерная проверка: прежний работодатель не назван на страницах кейса SCA/SBOM,
// абзац о сервисе в «Обо мне» виден и с согласованными цифрами, презентации кейса
// используют одно условное название «АО «Альфа»». Слово владельца 27.11.2026.
//
// Почему браузер, а не регулярные выражения: 27.11 агенты нашли 72 подтверждённых
// обхода регулярной проверки. Здесь страницу разбирает Chromium, а проверка читает то,
// что получит читатель, в нескольких слоях сразу.
//
// Модель угроз. Ловится: название в любом слое – DOM целиком через CDP (закрытый Shadow
// DOM, iframe, template: текст с границами блоков, атрибуты с именами и декодированными
// адресами, комментарии), текст скрытых элементов отдельно от соседей, видимый текст с
// CSS ::before/::after и bidi-override, дерево доступности каждого фрейма (CSS-счётчики),
// значения полей, заголовок. Состояния: исходный документ в системной светлой и тёмной
// теме (тема задаётся до загрузки), затем data-theme (нет, light, dark) × язык ru/en
// (data-lang и :lang), с JavaScript и без. Нормализация: NFKC, регистр, невидимые символы,
// гомоглифы кириллица/греческий/латиница, точки между буквами, падежные окончания
// кириллических аббревиатур. Псевдоним презентаций и абзац о сервисе должны быть
// отрисованы в каждом состоянии (попадание точкой, цвет и заливка букв, opacity, filter,
// clip-path, маска, нулевая обёртка). Скрытое содержимое проверяется строже видимого:
// каждый текстовый узел и вложенный элемент отдельно, поэтому «Ver<em>miet</em>ung» в
// скрытом блоке считается находкой (на девяти страницах кейса скрытых обрывков слов нет).
// Сознательно не считаются: буквы через пробел без точки («M I E T» – иначе ложная тревога
// на «<p>MI</p><p>ET</p>»), имя юрлица без кавычек со строчной буквы («АО ведёт реестр»),
// число с множителем без валюты («2 million records»). Не ловится: перестановка частей
// слова средствами вёрстки (CSS order, row-reverse, абсолютное позиционирование,
// наложение) и подмена встроенных функций браузера скриптом страницы – это видно только
// на картинке или в коде и закрывается ревью изменений. Открытые находки ревью – в
// _PROJECT/employer-guard-backlog.md.
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
const SCHEMES = ['light', 'dark'];
// Состояния одной загрузки: исходный документ, затем data-theme × язык.
const statesFor = scheme => [{scheme, original: true}, ...[null, 'light', 'dark'].flatMap(theme => ['ru', 'en'].map(lang => ({scheme, theme, lang})))];
const stateLabel = s => s.original ? `[${s.scheme}/original]` : `[${s.scheme}/${s.theme ?? '-'}/${s.lang}]`;

// Предел времени всего прогона: зависание в CI должно краснеть с указанием места.
let current = 'start';
const watchdog = setTimeout(() => { console.error(`FORMER EMPLOYER QA TIMEOUT at ${current}`); process.exit(2); }, 10 * 60 * 1000);

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

// Точка между буквами (М.Н.Т.Ц., М. Н. Т. Ц.); пробел без точки – граница слов и блоков.
const D = '(?:\\.\\s?)?';
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
// В адресах и именах файлов имя ищется подстрокой («/assets/logoMIET.svg»): там нет
// обычных слов, в которых оно встретилось бы случайно. data: не проверяется – в base64
// случайные совпадения возможны.
const EMPLOYER_IN_URL = /MIET|MNTC|ISTC|MHTЦ|MИЭT/u;
function employerUrlHits(label, values) {
  for (const v of values) {
    if (/^\s*data:/i.test(v)) continue;
    const s = foldLatin(v);
    const m = s.match(EMPLOYER_IN_URL);
    if (m) return [`${label}: …${s.slice(Math.max(0, m.index - 30), m.index + 30)}…`];
  }
  return [];
}
const URL_ATTR = /(?:href|src|srcset|action|data|poster|cite|url|background|manifest|ping|formaction|codebase)$/i;

// Паритет с main: та же подстрока, что в исходной проверке, по сериализованному DOM
// каждого фрейма (с изменениями скриптов). Только для реальных страниц: на синтетических
// примерах вроде «Vermietung» она даёт ложную тревогу так же, как в main.
const MAIN_PARITY = /МНТЦ|МИЭТ|MNTC|MIET|istc-miet|mntc-logo/i;
async function mainParityProblems(page, label) {
  const problems = [];
  for (const frame of page.frames()) {
    const html = await frame.content();
    const m = html.match(MAIN_PARITY);
    if (m) problems.push(`${label}: main parity – serialized DOM of ${frame.url()} contains …${html.slice(Math.max(0, m.index - 30), m.index + 30)}…`);
  }
  return problems;
}

// Адрес и его компоненты, декодированные по отдельности (параметр «100%» не мешает пути).
function decodeParts(v) {
  const out = [];
  for (const part of String(v).split(/[/?#&=;,]/)) {
    let cur = part;
    for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(cur.replace(/\+/g, ' ')); if (d === cur) break; out.push(d); cur = d; } catch { break; } }
  }
  return out;
}

// Обозначения юрлиц: форма (АО, ООО… или полная, в любом регистре и падеже) и имя – в
// кавычках целиком (в любом регистре), без кавычек – до трёх слов с заглавной. Строчное
// слово после формы («АО ведёт реестр») и служебные слова капсом («АО ОБЯЗАНО») названием
// не считаются.
const QO = '«"„“”\'‘’‹›＂', QC = '»"“”\'’›＂‘';
const FORM_RE = /(?<![\p{L}])(?:(ао|ооо|оао|пао|зао|нао)|(акционерн\p{L}*\s+обществ\p{L}*|обществ\p{L}*\s+с\s+ограниченной\s+ответственностью))(?![\p{L}])/giu;
const NAME_QUOTED = new RegExp(`^\\s*[:–-]?\\s*[${QO}]+\\s*([^${QO}${QC}]{1,200}?)\\s*[${QC}]`, 'u');
// Открывающая кавычка без закрывающей: имя – до 60 знаков.
const NAME_OPEN = new RegExp(`^\\s*[:–-]?\\s*[${QO}]+\\s*([^${QO}${QC}]{1,60})`, 'u');
const NAME_WORDS = /^\s*([\p{Lu}\p{N}][\p{L}\p{N}-]*)((?:\s+\p{Lu}[\p{L}\p{N}-]*){0,2})/u;
const STOP = new Set('обязано обязан обязана обязаны должно должен должна должны является являются может могут вправе имеет имеют не и или а но в во на с со по для от до из к о об при как это был было будет есть'.split(' '));
// Учебный пример владельца в исторической презентации sbom-license-audit – только эта фраза целиком.
const ALLOWED_PHRASES = {'/sbom-license-audit/': ['У ООО «Ромашка» может быть много адресов, печатей и сокращений, но ИНН один.']};
function legalNames(text, route) {
  const flat = x => toCyrillic(x).replace(/\s+/g, ' ');
  let t = flat(text);
  for (const phrase of ALLOWED_PHRASES[route] ?? []) t = t.split(flat(phrase)).join(' ');
  const names = [];
  for (const m of t.matchAll(FORM_RE)) {
    const form = m[1] ? m[1].toUpperCase() : (/ограничен/i.test(m[2]) ? 'ООО' : 'АО');
    const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 260);
    const q = rest.match(NAME_QUOTED) ?? rest.match(NAME_OPEN);
    if (q) { names.push(`${form} ${q[1].replace(/\s+/g, ' ').trim().toUpperCase()}`); continue; }
    const w = rest.match(NAME_WORDS);
    if (!w || STOP.has(w[1].toLowerCase())) continue;
    const extra = [];
    for (const word of w[2].trim().split(/\s+/).filter(Boolean)) { if (STOP.has(word.toLowerCase())) break; extra.push(word); }
    names.push(`${form} ${[w[1], ...extra].join(' ').toUpperCase()}`);
  }
  return names;
}

// ── Слои страницы (выполняется во фрейме) ──────────────────────────────────────
function collectLayers(scopeSelector) {
  // Методы прототипов: форма не может их подменить именованными полями
  // (name="attributes", "checkVisibility", "childNodes", "parentElement").
  const g = (proto, name) => Object.getOwnPropertyDescriptor(proto, name).get;
  const P = {
    attrNames: Element.prototype.getAttributeNames, attr: Element.prototype.getAttribute, checkVis: Element.prototype.checkVisibility,
    qsa: Element.prototype.querySelectorAll, dqsa: Document.prototype.querySelectorAll, fqsa: DocumentFragment.prototype.querySelectorAll,
    text: g(Node.prototype, 'textContent'), local: g(Element.prototype, 'localName'), shadow: g(Element.prototype, 'shadowRoot'),
    content: g(HTMLTemplateElement.prototype, 'content'), kids: g(Node.prototype, 'childNodes'), parent: g(Node.prototype, 'parentElement'),
    rootNode: Node.prototype.getRootNode, connected: g(Node.prototype, 'isConnected'), rect: Element.prototype.getBoundingClientRect,
  };
  const qsa = (rootNode, sel) => rootNode instanceof Document ? P.dqsa.call(rootNode, sel) : rootNode instanceof DocumentFragment ? P.fqsa.call(rootNode, sel) : P.qsa.call(rootNode, sel);
  const kids = n => P.kids.call(n);
  const cssStrings = value => {
    if (!value || value === 'none' || value === 'normal') return '';
    return [...value.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1')).join('');
  };
  const transparent = c => !c || /rgba\([^)]*,\s*0\)$|\/\s*0\)$|transparent/.test(c);
  const zeroFilter = f => !!f && f !== 'none' && /opacity\(\s*0(?:\.0*)?%?\s*\)/.test(f);
  const masked = cs => [cs.maskImage, cs.webkitMaskImage].some(v => v && v !== 'none');
  const shown = (el, strict = false) => {
    if (!P.checkVis.call(el, {checkOpacity: true, checkVisibilityCSS: true})) return false;
    for (let e = el; e && e.nodeType === 1; e = P.parent.call(e) || P.rootNode.call(e).host) {
      const cs = getComputedStyle(e);
      if (strict && masked(cs)) return false;
      if (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*50%|circle\(\s*0|polygon\(\s*0[^,]*,\s*0[^,]*,\s*0/.test(cs.clipPath)) return false;
      if (zeroFilter(cs.filter)) return false;
      if (cs.overflow !== 'visible' && e !== el) { const r = P.rect.call(e); if (r.width < 1 || r.height < 1) return false; }
    }
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 4) return false;
    if (transparent(cs.color) || transparent(cs.webkitTextFillColor || cs.color)) return false;
    return true;
  };
  const unOverride = s => s.replace(/\u202E([^\u202C\u202D]*)(\u202C|$)/g, (_, x) => [...x].reverse().join(''));
  const isOverrideRtl = el => (P.local.call(el) === 'bdo' && (P.attr.call(el, 'dir') || '').toLowerCase() === 'rtl') ||
    (() => { const cs = getComputedStyle(el); return /bidi-override|isolate-override/.test(cs.unicodeBidi) && cs.direction === 'rtl'; })();
  // Текст поддерева с границами блоков: строчная разметка склеивается («Ver<em>miet</em>ung»),
  // блоки и скрытые элементы разделяются («<p>MI</p><p>ET</p>»).
  const INLINE_TAGS = new Set('a abbr b bdi bdo big cite code data del dfn em font i img ins kbd label mark q s samp small span strike strong sub sup time tt u var wbr'.split(' '));
  const isBlock = el => {
    const tag = P.local.call(el);
    if (tag === 'br') return !P.connected.call(el) || getComputedStyle(el).display !== 'none';
    const d = P.connected.call(el) ? getComputedStyle(el).display : '';
    if (!d) return !(INLINE_TAGS.has(tag) || tag.includes('-'));
    return !/^(inline|contents|ruby)/.test(d);
  };
  const boundaryText = rootNode => {
    const out = [];
    const rec = n => {
      if (n.nodeType === 3) { out.push(n.data); return; }
      if (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11) return;
      const block = n.nodeType === 1 && isBlock(n);
      if (block) out.push(' ');
      for (const c of kids(n)) rec(c);
      if (block) out.push(' ');
    };
    rec(rootNode);
    return out.join('');
  };
  // Скрытое строже видимого: каждый текстовый узел и текст каждого вложенного элемента
  // отдельно («<div hidden>текст<span>MI<b>ET</b></span>город</div>»).
  const hiddenParts = el => {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    while (w.nextNode()) out.push(w.currentNode.nodeType === 3 ? w.currentNode.data : boundaryText(w.currentNode));
    return out;
  };
  const hiddenTexts = [];
  // out.s – мягкий видимый слой (маска не скрывает), out.t – строгий (маска скрывает).
  const walk = (node, out, parentShown) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = P.parent.call(node);
      if (parent && shown(parent)) out.s += unOverride(node.data);
      if (parent && shown(parent, true)) out.t += unOverride(node.data);
      return;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) { for (const c of kids(node)) walk(c, out, parentShown); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node, tag = P.local.call(el);
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'title') return;
    const cs = getComputedStyle(el);
    // Видимый br – перевод строки; скрытый ничего не разделяет («U<br hidden>SD»).
    if (tag === 'br') { if (cs.display !== 'none') { out.s += ' '; out.t += ' '; } return; }
    const isShown = cs.display !== 'none' && shown(el), isShownStrict = isShown && shown(el, true);
    // Невидимый (в том числе под маской) элемент внутри видимого: его текст проверяется
    // отдельно – целиком с границами блоков и по каждому узлу, без склейки с соседями.
    if (!isShownStrict && parentShown) hiddenTexts.push(unOverride(boundaryText(el)), ...hiddenParts(el));
    if (cs.display === 'none') return;
    const inline = /^(inline|contents|ruby)/.test(cs.display);
    const buf = {s: '', t: ''};
    const before = cssStrings(getComputedStyle(el, '::before').content);
    if (isShown) buf.s += before;
    if (isShownStrict) buf.t += before;
    const sr = P.shadow.call(el);
    if (tag === 'slot') {
      const assigned = el.assignedNodes({flatten: true});
      for (const c of (assigned.length ? assigned : kids(el))) walk(c, buf, isShown);
    } else {
      for (const c of kids(sr ?? el)) walk(c, buf, isShown);
    }
    let tail = '';
    if (isShown) {
      tail += cssStrings(getComputedStyle(el, '::after').content);
      if ((tag === 'input' && !/^(hidden|password|checkbox|radio|file)$/i.test(el.type)) || tag === 'textarea') tail += ' ' + el.value + ' ';
      if (tag === 'select' && el.selectedOptions[0]) tail += ' ' + el.selectedOptions[0].text + ' ';
    }
    buf.s += tail;
    if (isShownStrict) buf.t += tail;
    const rtl = isOverrideRtl(el);
    for (const k of ['s', 't']) {
      const piece = rtl ? [...buf[k]].reverse().join('') : buf[k];
      out[k] += inline ? piece : ' ' + piece + ' ';
    }
  };
  const scope = scopeSelector ? qsa(document, scopeSelector)[0] : document.documentElement;
  if (!scope) return null;
  const vis = {s: '', t: ''};
  walk(scope, vis, true);
  if (scopeSelector) return {visible: vis.s.replace(/\s+/g, ' '), visibleStrict: vis.t.replace(/\s+/g, ' ')};
  // Все элементы: документ, открытые теневые деревья, содержимое template.
  const all = [], roots = [document];
  const gather = rootNode => {
    for (const el of qsa(rootNode, '*')) {
      all.push(el);
      const sr = P.shadow.call(el);
      if (sr) { roots.push(sr); gather(sr); }
      const content = P.local.call(el) === 'template' ? P.content.call(el) : null;
      if (content) { roots.push(content); gather(content); }
    }
  };
  gather(document);
  const urls = [], generated = [], attributes = [], comments = [];
  const decode = v => {
    const out = [v];
    for (const part of String(v).split(/[/?#&=;,]/)) {
      let cur = part;
      for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(cur.replace(/\+/g, ' ')); if (d === cur) break; out.push(d); cur = d; } catch { break; } }
    }
    return out;
  };
  for (const el of all) {
    for (const n of P.attrNames.call(el)) {
      const v = P.attr.call(el, n);
      attributes.push(n, v);
      if (/(?:href|src|srcset|action|data|poster|cite|url|background|manifest|ping|formaction|codebase)$/i.test(n) && !/^\s*data:/i.test(v)) urls.push(...decode(v));
    }
    for (const prop of ['href', 'src', 'action', 'formAction', 'data', 'poster', 'cite']) {
      const v = el[prop];
      const sv = typeof v === 'string' ? v : (v && typeof v.baseVal === 'string' ? v.baseVal : '');
      if (sv && !/^\s*data:/i.test(sv)) urls.push(...decode(sv));
    }
    for (const pseudo of ['::before', '::after', '::marker']) { const gtext = cssStrings(getComputedStyle(el, pseudo).content); if (gtext) generated.push(gtext); }
  }
  for (const r of roots) { const w = document.createTreeWalker(r, NodeFilter.SHOW_COMMENT); while (w.nextNode()) comments.push(w.currentNode.data); }
  return {
    attributes: attributes.join(' \n '),
    comments: comments.join(' \n '),
    full: unOverride(roots.map(boundaryText).join(' \n ')),
    hidden: hiddenTexts.join(' \n '),
    visible: vis.s.replace(/\s+/g, ' '),
    visibleStrict: vis.t.replace(/\s+/g, ' '),
    urls: urls.join(' \n '),
    urlList: urls,
    generated: generated.join(' \n '),
    title: document.title,
  };
}

// Строчные по умолчанию теги HTML и пользовательские элементы (x-a): у узлов без
// раскладки (template, скрытое) граница блока определяется по тегу.
// br – перевод строки, он разделяет слова и в строчной разметке.
const INLINE_TAGS = new Set('a abbr b bdi bdo big cite code data del dfn em font i img ins kbd label mark q s samp small span strike strong sub sup time tt u var wbr'.split(' '));
const inlineTag = tag => INLINE_TAGS.has(tag) || tag.includes('-');

// CDP: весь DOM (pierce: закрытые теневые корни, iframe, template) с границами блоков по
// display из DOMSnapshot, атрибуты с именами и декодированными адресами, комментарии;
// дерево доступности каждого фрейма (CSS-счётчики, сгенерированный текст).
const INLINE = /^(inline|contents|ruby)/;
async function cdpLayers(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const snap = await cdp.send('DOMSnapshot.captureSnapshot', {computedStyles: ['display']});
    const display = new Map();
    for (const d of snap.documents) {
      const ids = d.nodes.backendNodeId;
      d.layout.nodeIndex.forEach((ni, i) => { const si = d.layout.styles[i]?.[0]; display.set(ids[ni], si >= 0 ? snap.strings[si] : ''); });
    }
    const blockNodeOf = n => { const d = display.get(n.backendNodeId); return d === undefined ? !inlineTag((n.localName || '').toLowerCase()) : !INLINE.test(d); };

    const {root: dom} = await cdp.send('DOM.getDocument', {depth: -1, pierce: true});
    const roots = [], attrs = [], comments = [], urlValues = [];
    const visit = (n, acc, parent = null) => {
      if (n.nodeType === 3) { acc.push(n.nodeValue); return; }
      if (n.nodeType === 8) { comments.push(n.nodeValue); return; }
      // br без раскладки при родителе с раскладкой скрыт сам («U<br hidden>SD») и ничего не
      // разделяет; внутри скрытого блока он остаётся переводом строки.
      const isBr = (n.localName || '').toLowerCase() === 'br';
      const block = n.nodeType === 1 && (isBr ? (display.has(n.backendNodeId) || !parent || !display.has(parent.backendNodeId)) : blockNodeOf(n));
      if (block) acc.push(' ');
      if (n.attributes) for (let i = 0; i < n.attributes.length; i += 2) {
        attrs.push(n.attributes[i], n.attributes[i + 1], ...decodeParts(n.attributes[i + 1]));
        if (URL_ATTR.test(n.attributes[i]) && !/^\s*data:/i.test(n.attributes[i + 1])) urlValues.push(n.attributes[i + 1], ...decodeParts(n.attributes[i + 1]));
      }
      for (const k of n.children ?? []) visit(k, acc, n);
      if (block) acc.push(' ');
      for (const r of [...(n.shadowRoots ?? []), ...(n.contentDocument ? [n.contentDocument] : []), ...(n.templateContent ? [n.templateContent] : [])]) {
        const a = [];
        roots.push(a);
        visit(r, a);
      }
    };
    const top = [];
    roots.push(top);
    visit(dom, top);

    const {frameTree} = await cdp.send('Page.getFrameTree');
    const frameIds = [];
    const walkFrames = t => { frameIds.push(t.frame.id); for (const c of t.childFrames ?? []) walkFrames(c); };
    walkFrames(frameTree);
    const parts = [];
    for (const frameId of frameIds) {
      const {nodes} = await cdp.send('Accessibility.getFullAXTree', {frameId});
      const byId = new Map(nodes.map(n => [n.nodeId, n]));
      const memo = new Map();
      const isText = n => n.role?.value === 'StaticText' || n.role?.value === 'InlineTextBox';
      const blockNode = n => !isText(n) && display.has(n.backendDOMNodeId) && !INLINE.test(display.get(n.backendDOMNodeId));
      const textOf = n => {
        if (memo.has(n.nodeId)) return memo.get(n.nodeId);
        memo.set(n.nodeId, '');
        const t = n.role?.value === 'StaticText' ? (n.name?.value ?? '')
          : (n.childIds ?? []).map(id => byId.get(id)).filter(Boolean).map(k => blockNode(k) ? ` ${textOf(k)} ` : textOf(k)).join('');
        memo.set(n.nodeId, t);
        return t;
      };
      for (const n of nodes) {
        for (const v of [n.value?.value, n.description?.value]) if (typeof v === 'string' && v) parts.push(v);
        if (n.role?.value === 'RootWebArea' || !blockNode(n)) continue;
        const t = textOf(n);
        if (t) parts.push(t);
      }
    }
    return {dom: [...roots.map(a => a.join('')), attrs.join(' \n '), comments.join(' \n ')].join(' \n '), ax: parts.join(' \n '), urls: urlValues};
  } finally { await cdp.detach(); }
}

async function setState(page, state) {
  if (state.original) return;
  for (const frame of page.frames()) {
    await frame.evaluate(([t, l]) => {
      const html = document.documentElement;
      if (t) html.setAttribute('data-theme', t); else html.removeAttribute('data-theme');
      html.setAttribute('data-lang', l);
      html.setAttribute('lang', l);
    }, [state.theme, state.lang]);
  }
}

// Текст отрисован: попадание точкой по строкам, видимые цвет и заливка букв, без
// filter: opacity(0) и без CSS-маски. Для обязательного текста любая маска – сомнение, и
// оно трактуется как «не отрисован»; для запрещённого текста маска ничего не скрывает. Кандидаты – абзац о сервисе или самый вложенный элемент с
// псевдонимом; достаточно одного.
async function textRendered(page, mode) {
  return page.evaluate(m => {
    const checkVis = Element.prototype.checkVisibility, children = Object.getOwnPropertyDescriptor(Element.prototype, 'children').get;
    const parentOf = Object.getOwnPropertyDescriptor(Node.prototype, 'parentElement').get, scrollTo = Element.prototype.scrollIntoView;
    const masked = cs => [cs.maskImage, cs.webkitMaskImage].some(v => v && v !== 'none');
    const transparent = c => !c || /rgba\([^)]*,\s*0\)$|\/\s*0\)$|transparent/.test(c);
    const zeroFilter = f => !!f && f !== 'none' && /opacity\(\s*0(?:\.0*)?%?\s*\)/.test(f);
    const PSEUDO = /А[ОO]\s*[«"„“”'‘’‹›＂]\s*Альфа\s*[»"“”'’›＂‘]/;
    const candidates = m === 'service'
      ? [...document.querySelectorAll('#about p')].filter(x => /Единолично создал|independently built and deployed/.test(x.textContent))
      : [...document.querySelectorAll('body *')].filter(e => PSEUDO.test(e.textContent) && ![...children.call(e)].some(c => PSEUDO.test(c.textContent)));
    document.documentElement.style.scrollBehavior = 'auto';
    let last = {ok: false, why: 'not found'};
    for (const el of candidates) {
      if (!checkVis.call(el, {checkOpacity: true, checkVisibilityCSS: true})) { last = {ok: false, why: 'invisible'}; continue; }
      let filtered = false;
      for (let e = el; e; e = parentOf.call(e)) { const ecs = getComputedStyle(e); if (zeroFilter(ecs.filter) || masked(ecs)) filtered = true; }
      if (filtered) { last = {ok: false, why: 'filter/mask'}; continue; }
      scrollTo.call(el, {block: 'center', behavior: 'instant'});
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

// Одна загрузка (тема системы уже задана): все состояния этой загрузки.
async function pageProblems(page, label, {deck = false, route = '', scheme = 'light'} = {}) {
  const problems = [];
  let deckAll = '';
  for (const state of statesFor(scheme)) {
    await setState(page, state);
    const where = `${label} ${stateLabel(state)}`;
    current = where;
    for (const frame of page.frames()) {
      let layers;
      try { layers = await frame.evaluate(collectLayers, null); } catch (e) { problems.push(`${where}: collector failed in frame ${frame.url()}: ${e.message}`); continue; }
      problems.push(...employerUrlHits(`${where} url`, layers.urlList));
      for (const [name, text] of Object.entries(layers)) {
        if (name === 'urlList') continue;
        const hit = employerHits(`${where} ${name}`, text);
        if (hit.length) { problems.push(...hit); break; }
      }
      if (deck) deckAll += [' \n ', layers.full, layers.hidden, layers.visible, layers.generated, layers.title].join(' \n ');
      if (deck && frame === page.mainFrame()) {
        if (!legalNames(layers.visibleStrict, route).includes('АО АЛЬФА')) problems.push(`${where}: pseudonym «АО «Альфа»» is not shown`);
        else {
          const r = await textRendered(page, 'pseudonym');
          if (!r.ok) problems.push(`${where}: pseudonym «АО «Альфа»» is not rendered (${JSON.stringify(r)})`);
        }
      }
    }
    const {dom, ax, urls} = await cdpLayers(page);
    problems.push(...employerHits(`${where} dom`, dom), ...employerHits(`${where} accessibility`, ax), ...employerUrlHits(`${where} dom url`, urls));
    if (deck) deckAll += ' \n ' + dom + ' \n ' + ax;
  }
  if (deck) {
    const others = [...new Set(legalNames(deckAll, route))].filter(n => n !== 'АО АЛЬФА');
    if (others.length) problems.push(`${label} [${scheme}]: other legal names ${JSON.stringify(others)}`);
  }
  return [...new Set(problems)];
}

// Абзац о сервисе: единственный, отрисован в каждом состоянии, утверждение и цифры с
// единицами – в нём самом; в разделе нет других денежных сумм и объёмов кода.
const CUR = '(?:(?<![\\p{L}])(?:RUB|USD|EUR|GBP|CNY|JPY|CHF|KZT|BYN|AED|INR|CAD|AUD|SEK|NOK|PLN|TRY|HKD|SGD|фунт\\p{L}*|франк\\p{L}*|юан\\p{L}*|иен\\p{L}*|йен\\p{L}*|руб\\.?|рубл\\p{L}*|долл\\p{L}*|евро|dollars?|euros?|rubles?|roubles?)(?![\\p{L}])|₽|\\$|€|£|¥)';
const MULT = '(?:млн|миллион\\p{L}*|млрд|миллиард\\p{L}*|million|billion|mln|bn|тыс\\.?|тысяч\\p{L}*|thousand|k(?![\\p{L}]))';
const MONEY = new RegExp(`${CUR}\\s*\\d[\\d\\s.,]*\\d?(?:\\s*${MULT})?|\\d[\\d\\s.,]*(?:\\s*${MULT})?\\s*${CUR}`, 'giu');
const CODE = /\d[\d\s.,]*\s*(?:(?:тыс\.?|тысяч\p{L}*)\s*)?строк\p{L}*(?![\p{L}])(?!\s+(?:в\s+|из\s+)?(?:таблиц\p{L}*|данных|записей|журнал\p{L}*|лог(?:а|ов)?|текст\p{L}*|CSV|Excel)(?![\p{L}]))|\d[\d\s.,]*\s*кстрок\p{L}*|\d[\d\s.,]*\s*(?:k|thousand)?\s*(?:lines?\s+of\s+(?:[\p{L}+#]+\s+){0,2}code|LOC|KLOC|SLOC)(?![\p{L}])/giu;
const clean = s => s.replace(/\s+/g, ' ').trim();
const EXPECTED = {
  ru: {claim: /Единолично создал и ввёл в эксплуатацию сервис SCA\/SBOM/, size: /около 130 тыс\. строк кода/, estimate: /\(оценка поставщика сопоставимого on-prem-решения: порядка 18 млн ₽ в год\)/, digits: ['130', '18'], money: ['18 млн ₽'], code: ['130 тыс. строк']},
  en: {claim: /I independently built and deployed an SCA\/SBOM service/, size: /about 130,000 lines of code/, estimate: /\(about RUB 18 million a year, vendor's estimate\)/, digits: ['130,000', '18'], money: ['RUB 18 million'], code: ['130,000 lines of code']},
};
async function serviceProblems(page, label, scheme = 'light') {
  const problems = [];
  for (const state of statesFor(scheme)) {
    await setState(page, state);
    const where = `${label} ${stateLabel(state)}`;
    current = where;
    const structure = await page.evaluate(() => ({
      sections: document.querySelectorAll('[id="about"]').length,
      paragraphs: [...document.querySelectorAll('#about p')].filter(p => /Единолично создал|independently built and deployed/.test(p.textContent)).length,
    }));
    if (structure.sections !== 1) problems.push(`${where}: sections id=about = ${structure.sections}`);
    if (structure.paragraphs !== 1) problems.push(`${where}: paragraphs with the service claim = ${structure.paragraphs}`);
    const r = await textRendered(page, 'service');
    if (!r.ok) problems.push(`${where}: service paragraph is not rendered (${JSON.stringify(r)})`);
    await page.evaluate(() => [...document.querySelectorAll('#about p')].find(x => /Единолично создал|independently built and deployed/.test(x.textContent))?.setAttribute('data-qa-service', '1'));
    const para = await page.evaluate(collectLayers, '[data-qa-service="1"]');
    await page.evaluate(() => document.querySelector('[data-qa-service]')?.removeAttribute('data-qa-service'));
    const section = await page.evaluate(collectLayers, '#about');
    const ptext = base(para?.visible ?? ''), pstrict = base(para?.visibleStrict ?? ''), stext = base(section?.visible ?? '');
    // Исходный документ: язык – тот, что показан.
    const lang = state.original ? (/Единолично создал/.test(pstrict) ? 'ru' : 'en') : state.lang;
    const want = EXPECTED[lang];
    const digits = [...ptext.matchAll(/\d[\d\s.,]*\d|\d/g)].map(m => m[0].replace(/\s+/g, '')).sort();
    const money = [...stext.matchAll(MONEY)].map(m => clean(m[0])), code = [...stext.matchAll(CODE)].map(m => clean(m[0]));
    if (!want.claim.test(pstrict)) problems.push(`${where}: achievement sentence is not in the visible paragraph`);
    if (!want.size.test(pstrict)) problems.push(`${where}: code size is not in the visible paragraph`);
    if (!want.estimate.test(pstrict)) problems.push(`${where}: vendor's estimate is not in the visible paragraph`);
    if (JSON.stringify(digits) !== JSON.stringify(want.digits)) problems.push(`${where}: numbers in the paragraph ${JSON.stringify(digits)}`);
    if (JSON.stringify(money) !== JSON.stringify(want.money)) problems.push(`${where}: amounts in the section ${JSON.stringify(money)}`);
    if (JSON.stringify(code) !== JSON.stringify(want.code)) problems.push(`${where}: code sizes in the section ${JSON.stringify(code)}`);
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
  opacitySplitBetweenWords: '<p>предприятие<span style="opacity:0">MI<strong>ET</strong></span>город</p>',
  hiddenNestedBetweenLetters: '<div hidden>предприятие<span>MIET</span>город</div>',
  hiddenNestedSplit: '<div hidden>текст<span>MI<b>ET</b></span>город</div>',
  closedShadowBr: '<x-g></x-g><script>const r=document.querySelector("x-g").attachShadow({mode:"closed"});const p=document.createElement("p");p.hidden=true;p.append("Заказчик",document.createElement("br"),"M"+"IET",document.createElement("br"),"Москва");r.append(p);</script>',
  visibleBr: '<p>Заказчик<br>MIET<br>Москва</p>',
  maskSplitBetweenWords: '<p>Заказчик<span style="-webkit-mask-image:linear-gradient(transparent,transparent);mask-image:linear-gradient(transparent,transparent)">MI<strong>ET</strong></span>Москва</p>',
  fileNameCamel: '<img src="/assets/logoMIET.svg" alt="Логотип заказчика">',
  templateSplit: '<template><p>MI<em>ET</em></p></template><p>текст</p>',
  closedShadowHiddenSplit: '<x-f></x-f><script>const r=document.querySelector("x-f").attachShadow({mode:"closed"});const p=document.createElement("p");p.hidden=true;p.append("M","I");const em=document.createElement("em");em.textContent="E"+"T";p.append(em);r.append(p);</script>',
  dataNotAttribute: '<p>data:МИЭТ</p>', titleAttr: '<abbr title="MI&#69T">x</abbr>', altAttr: '<img src="x.png" alt="Логотип МИ&#1069Т">',
  attrName: '<div data-miet="1">x</div>', hrefEncoded: '<a href="https://&#105stc-mi&#101t.ru/">сайт</a>', hrefPercent: '<a href="https://istc-%6Diet.ru/">сайт</a>',
  pathPercent: '<a href="/clients/%4D%49%45%54/profile">x</a>', pathPercentWithQuery: '<a href="/clients/%4D%49%45%54/profile?progress=100%">x</a>',
  clobberedAttributes: '<form><input name="attributes"><template><p title="MI&#69;T">x</p></template></form>',
  inputValue: '<input value="MIET">', svgTspan: '<svg><text>М<tspan>ИЭТ</tspan></text></svg>',
  cssBefore: '<style>.x::before{content:"MI\\45 T"}</style><p class="x">a</p>', cssEscape: "<style>.x::after{content:'MI\\45 T'}</style><p class=\"x\">a</p>",
  cssAttr: '<style>.x::after{content:attr(data-n)}</style><p class="x" data-n="MI&#69;T">a</p>',
  cssCounterP: '<style>@counter-style e{system:cyclic;symbols:"MI";suffix:""}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><p class="c">ET</p>',
  cssCounterDiv: '<style>@counter-style e{system:cyclic;symbols:"MI";suffix:""}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><div class="c">ET</div>',
  cssCounterIframe: '<iframe srcdoc="<style>@counter-style e{system:cyclic;symbols:\'MI\';suffix:\'\'}.c{counter-reset:k}.c::before{content:counter(k,e)}</style><div class=\'c\'>ET</div>"></iframe>',
  shadowOpen: '<x-h><template shadowrootmode="open"><p>MIET</p></template></x-h>',
  shadowClosedText: '<x-c></x-c><script>const n="M"+"IET";const r=document.querySelector("x-c").attachShadow({mode:"closed"});const p=document.createElement("p");p.textContent=n;r.append(p);</script>',
  shadowClosedAttr: '<x-d></x-d><script>const r=document.querySelector("x-d").attachShadow({mode:"closed"});const p=document.createElement("p");p.setAttribute("data-customer","M"+"IET");p.textContent="x";r.append(p);</script>',
  shadowClosedHref: '<x-e></x-e><script>const r=document.querySelector("x-e").attachShadow({mode:"closed"});const a=document.createElement("a");a.href="/clients/%4D%49%45%54/";a.textContent="x";r.append(a);</script>',
  templateAttr: '<template><p title="MIET">x</p><!-- МНТЦ --></template><p>текст</p>', iframeSrcdoc: '<iframe srcdoc="<p>MI&amp;#69;T</p>"></iframe>',
  titleTag: '<title>&laquoМИЭТ&raquo</title><p>x</p>', noscriptText: '<noscript><p>MIET</p></noscript>', hiddenDiv: '<div hidden>MIET</div>', commentOnly: '<p>текст</p><!-- MIET -->',
  darkThemeOnly: '<style>:root[data-theme="dark"] .t::after{content:"MI\\45 T"}</style><p class="t">x</p>',
  systemDarkOnly: '<style>@media (prefers-color-scheme: dark){.t::after{content:"MI\\45 T"}}</style><p class="t">x</p>',
  systemDarkExplicitDark: '<style>@media (prefers-color-scheme: dark){:root[data-theme="dark"] .t::after{content:"MI\\45 T"}}</style><p class="t">x</p>',
  langEnOnly: '<style>:root:lang(en) .t::after{content:"MI\\45 T"}</style><p class="t">x</p>',
  originalOnly: '<style>:root:not([data-lang]) .t::after{content:"MI\\45 T"}</style><p class="t">x</p>',
  loadScriptDark: '<p id="o">x</p><script>if (matchMedia("(prefers-color-scheme: dark)").matches) document.getElementById("o").textContent = "M" + "IET";</script>',
};
// Где уловка обязана сработать и где не должна: срабатывает именно проверяемое состояние.
const STATE_MARKERS = {
  darkThemeOnly: {must: '/dark/', mustNot: '[light/original]'},
  systemDarkOnly: {must: '[dark/', mustNot: '[light/'},
  systemDarkExplicitDark: {must: '[dark/dark/', mustNot: '[light/'},
  langEnOnly: {must: '/en]', mustNot: '[light/original]'},
  originalOnly: {must: '/original]', mustNot: '/ru]'},
  loadScriptDark: {must: '[dark/', mustNot: '[light/'},
};
const MUST_PASS = {
  germanWord: '<p>Vermietung</p>', germanWordEm: '<p>Ver<em>miet</em>ung</p>', identifier: '<p>listCache</p>', literalEntity: '<p>MI&amp;#69;T</p>', plainReversedWord: '<p>TEIM</p>',
  scriptIdentifier: '<script>const mietCount = 1;</script><p>текст</p>', dataUri: '<img alt="" src="data:image/png;base64,QUJDTUlFVERFRg==">',
  styleSelector: '<style>.mntcLike{}</style><p>текст</p>', mitWord: '<p>MIT License, Mietvertrag, ISTCX</p>',
  blockBoundary: '<p>MI</p><p>ET</p>', blockBoundaryNested: '<div><div>предприятие M</div><div>IET город</div></div>',
  clobberedForm: '<form><input name="checkVisibility"><input name="childNodes"><input name="parentElement"><input name="attributes"><input name="getBoundingClientRect"><input name="children"><input name="localName"><input name="shadowRoot"><input name="textContent"><input name="getRootNode"></form><p>текст</p>',
  hiddenTemplateWord: '<template><p>Ver<em>miet</em>ung</p></template><p>текст</p>',
  dataUriLong: '<img alt="" src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext%3Elogomiet%3C/text%3E%3C/svg%3E">',
};
const PSEUDONYM_CATCH = {
  otherName: '<p>АО «Альфа»</p><p>АО «Бета»</p>', otherNameEntities: '<p>АО «Альфа»</p><p>АО &laquoБета&raquo</p>',
  latinAO: '<p>АО «Альфа»</p><p>AO «Бета»</p>', ooo: '<p>АО «Альфа»</p><p>ООО «Бета»</p>', fullForm: '<p>АО «Альфа»</p><p>Акционерное общество «Бета»</p>',
  declinedForm: '<p>АО «Альфа»</p><p>Договор с акционерным обществом «Бета»</p>', upperDeclinedForm: '<p>АО «Альфа»</p><p>АКЦИОНЕРНЫМ ОБЩЕСТВОМ «Бета»</p>',
  lowerForm: '<p>АО «Альфа»</p><p>ооо «Бета»</p>', lowerQuoted: '<p>АО «Альфа»</p><p>АО «бета»</p>',
  longQuoted: '<p>АО «Альфа»</p><p>ООО «Научно-производственное объединение перспективных информационных технологий и систем Бета»</p>',
  unclosedQuote: '<p>АО «Альфа»</p><p>ООО «Бета</p>', digitName: '<p>АО «Альфа»</p><p>ООО 7 Холмов</p>', colonQuoted: '<p>АО «Альфа»</p><p>ПАО: «Бета»</p>',
  maskedChild: '<p>АО «<span style="-webkit-mask-image:linear-gradient(transparent,transparent);mask-image:linear-gradient(transparent,transparent)">Альфа</span>»</p>',
  noQuotes: '<p>АО «Альфа»</p><p>АО Бета</p>', noQuotesTwoWords: '<p>АО «Альфа»</p><p>АО Альфа Север</p>', qElement: '<p>АО «Альфа»</p><p>АО <q>Бета</q></p>', fullWidthQuote: '<p>АО «Альфа»</p><p>АО ＂Бета＂</p>',
  splitTag: '<p>АО «Альфа»</p><p>А<x-a>О</x-a> «Бета»</p>', scriptFooter: "<p>АО «Альфа»</p><script>document.body.append('АО «Бе'+'та»')</script>",
  hiddenAlphaVisibleBeta: '<p hidden>АО «Альфа»</p><p>АО «Бета»</p>', inAttribute: '<p>АО «Альфа»</p><input value="АО «Бета»">',
  bdoReversed: '<p>АО «Альфа»</p><p><bdo dir="rtl">»атеБ« ОА</bdo></p>', zwsp: '<p>АО «Альфа»</p><p>АО \u200B«Бета»</p>',
  otherForm: '<p>АО «Альфа»</p><p>ООО «Альфа»</p>', longerName: '<p>АО «Альфа»</p><p>ПАО «Альфа Север»</p>',
  romashkaOutsidePhrase: '<p>АО «Альфа»</p><p>Заказчик проекта: ООО «Ромашка»</p>', romashkaPartialPhrase: '<p>АО «Альфа»</p><p>Платежи: у ООО «Ромашка» может быть много счетов</p>',
  hiddenPseudonymOnly: '<p hidden>АО «Альфа»</p><p>Заказчик проекта</p>', maskedPseudonym: '<p style="-webkit-mask-image:linear-gradient(transparent,transparent);mask-image:linear-gradient(transparent,transparent)">АО «Альфа»</p><p>Заказчик</p>', zeroHeightPseudonym: '<div style="height:0;overflow:hidden"><p>АО «Альфа»</p></div><p>Заказчик</p>',
  transparentFill: '<p style="-webkit-text-fill-color:transparent">АО «Альфа»</p><p>Заказчик</p>', filterOpacity: '<p style="filter:opacity(0)">АО «Альфа»</p><p>Заказчик</p>',
  darkHidesPseudonym: '<style>:root[data-theme="dark"] .a{display:none}</style><p class="a">АО «Альфа»</p>',
  darkDarkHidesPseudonym: '<style>@media (prefers-color-scheme: dark){:root[data-theme="dark"] .a{display:none}}</style><p class="a">АО «Альфа»</p>',
  iframeOtherName: '<p>АО «Альфа»</p><iframe srcdoc="<p>ООО «Бета»</p>"></iframe>',
};
const PSEUDONYM_PASS = {
  plainSentence: '<p>АО «Альфа»</p><p>АО обязано вести реестр акционеров</p>', upperSentence: '<p>АО «Альфа»</p><p>АО ОБЯЗАНО ВЕСТИ РЕЕСТР</p>',
  verbSentence: '<p>АО «Альфа»</p><p>АО ведёт реестр акционеров</p>',
  lowQuotes: '<p>АО „Альфа“</p>', romashkaExact: '<p>АО «Альфа»</p><p>У ООО «Ромашка» может быть много адресов, печатей и сокращений, но ИНН один.</p>',
};

const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json'};
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
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
let cases = 0, mutationCount = 0;
// Внешние запросы (шрифты, счётчики) отключены: проверка не зависит от сети.
const localOnly = (context, allowed) => context.route('**/*', route => {
  const url = route.request().url();
  return (allowed.some(a => url.startsWith(a)) || url.startsWith('about:') || url.startsWith('data:')) ? route.continue() : route.abort();
});
const newContext = async (options, allowed) => {
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, ...options});
  context.setDefaultTimeout(30000);
  context.setDefaultNavigationTimeout(30000);
  await localOnly(context, allowed);
  return context;
};
try {
  // 1. Самопроверка на фрагментах: каждая загрузка – в системной светлой и тёмной теме.
  let fixtureHtml = '';
  const fixturePage = async options => {
    const context = await newContext(options, ['http://fixture.test/']);
    const page = await context.newPage();
    await page.route('http://fixture.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: fixtureHtml}));
    return page;
  };
  const page = await fixturePage({}), pageNoJs = await fixturePage({javaScriptEnabled: false});
  const load = async (p, html, raw, scheme) => {
    fixtureHtml = raw ? html : `<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    await p.emulateMedia({colorScheme: scheme});
    const response = await p.goto('http://fixture.test/', {waitUntil: 'load'});
    assert.equal(response.status(), 200);
  };
  const fixtureProblems = async (name, html, opts = {}) => {
    const found = [];
    for (const scheme of SCHEMES) {
      current = `fixture ${name} [${scheme}]`;
      await load(page, html, false, scheme);
      found.push(...await pageProblems(page, `fixture ${name}`, {...opts, scheme}));
    }
    return found;
  };
  for (const [name, html] of Object.entries(MUST_CATCH)) {
    const all = await fixtureProblems(name, html);
    const broken = all.filter(f => /collector failed/.test(f)), found = all.filter(f => !/collector failed/.test(f));
    const marker = STATE_MARKERS[name];
    if (broken.length) failures.push(`self-test: collector failed on «${name}»: ${broken[0]}`);
    if (!found.length) failures.push(`self-test: «${name}» is not caught`);
    else if (marker && !found.some(f => f.includes(marker.must))) failures.push(`self-test: «${name}» is not caught in ${marker.must}`);
    else if (marker && found.some(f => f.includes(marker.mustNot))) failures.push(`self-test: «${name}» is caught in ${marker.mustNot}: ${found.find(f => f.includes(marker.mustNot))}`);
    cases++;
  }
  for (const [name, html] of Object.entries(MUST_PASS)) {
    const found = await fixtureProblems(name, html);
    if (found.length) failures.push(`self-test: «${name}» is a false positive: ${found[0]}`);
    cases++;
  }
  for (const [name, html] of Object.entries(PSEUDONYM_CATCH)) {
    const found = await fixtureProblems(name, html, {deck: true, route: '/sbom-license-audit/'});
    if (!found.some(f => /other legal names|not shown|not rendered/.test(f))) failures.push(`self-test: pseudonym «${name}» is not caught`);
    cases++;
  }
  for (const [name, html] of Object.entries(PSEUDONYM_PASS)) {
    const found = await fixtureProblems(name, html, {deck: true, route: '/sbom-license-audit/'});
    if (found.length) failures.push(`self-test: pseudonym «${name}» is a false positive: ${found[0]}`);
    cases++;
  }
  // Абзац о сервисе: каждая подмена в копии index.html должна дать свою диагностику.
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const anchorRu = '<p><span data-l="ru">Выстраиваю РБПО';
  assert.ok(index.includes(anchorRu), 'service paragraph anchor in index.html');
  const extra = text => index.replace(anchorRu, `<p>${text}</p>` + anchorRu);
  const HIDDEN = /not rendered|not in the visible paragraph/;
  const serviceMutations = {
    clipPath: [index.replace(anchorRu, '<p style="clip-path: inset(50%)"><span data-l="ru">Выстраиваю РБПО'), HIDDEN],
    transparentFill: [index.replace(anchorRu, '<p style="-webkit-text-fill-color: transparent"><span data-l="ru">Выстраиваю РБПО'), HIDDEN],
    filterOpacity: [index.replace(anchorRu, '<p style="filter: opacity(0)"><span data-l="ru">Выстраиваю РБПО'), /not rendered/],
    darkHides: [index.replace('</head>', '<style>:root[data-theme="dark"] #about p:has(> [data-l]){display:none}</style></head>'), HIDDEN],
    wrongCodeRu: [index.replace('около 130 тыс. строк кода', 'около 230 тыс. строк кода'), /code size is not in the visible paragraph/],
    unitMovedOut: [index.replace('the service comprises about 130,000 lines of code', 'the service comprises about 130,000 tests'), /code size is not in the visible paragraph/],
    duplicate: [index.replace(anchorRu, '<p><span data-l="ru">Единолично создал и ввёл в эксплуатацию сервис SCA/SBOM (дубль)</span></p>' + anchorRu), /paragraphs with the service claim = 2/],
    amountUsd: [extra('Annual cost: 28,000,000 USD.'), /amounts in the section/],
    amountDollarWords: [extra('Annual cost: 28 million dollars.'), /amounts in the section/],
    amountRubleWords: [extra('Экономия: 28 млн рублей в год.'), /amounts in the section/],
    codeKloc: [extra('Code size: 250 kloc.'), /code sizes in the section/],
    codeKstrok: [extra('Объём: 250 кстрок.'), /code sizes in the section/],
    codeLinesRu: [extra('Ещё 250 тыс. строк кода.'), /code sizes in the section/],
    codeLinesCpp: [extra('Модуль содержит ещё 250 строк на C++.'), /code sizes in the section/],
    amountThousandRub: [extra('Цена: 28 тыс. рублей.'), /amounts in the section/],
    amountGbp: [extra('Fee: 40 GBP.'), /amounts in the section/],
    amountCad: [extra('Fee: 40 CAD.'), /amounts in the section/],
    amountPounds: [extra('Цена: 40 фунтов стерлингов.'), /amounts in the section/],
    amountHiddenBr: [extra('Цена 28 U<br hidden>SD.'), /amounts in the section/],
    codeLinesLogic: [extra('Модуль содержит 252 строки логики обработки на C++.'), /code sizes in the section/],
    codeLinesFile: [extra('Реализация парсера на C++ занимает 252 строки в файле parser.cpp.'), /code sizes in the section/],
    codeLinesPython: [extra('Plus 25 lines of Python code.'), /code sizes in the section/],
    maskedChildClaim: [index.replace('Единолично создал и ввёл в эксплуатацию', '<span style="-webkit-mask-image: linear-gradient(transparent, transparent); mask-image: linear-gradient(transparent, transparent)">Единолично создал и ввёл в эксплуатацию</span>'), /achievement sentence is not in the visible paragraph/],
    amountUnderOpaqueMask: [extra('<span style="-webkit-mask-image: linear-gradient(black, black); mask-image: linear-gradient(black, black)">Цена: 28 млн рублей.</span>'), /amounts in the section/],
    maskHides: [index.replace(anchorRu, '<p style="-webkit-mask-image: linear-gradient(transparent, transparent); mask-image: linear-gradient(transparent, transparent)"><span data-l="ru">Выстраиваю РБПО'), HIDDEN],
    secondClaimLightRu: [index.replace('</body>', '<script>new MutationObserver(() => {}).observe(document.documentElement, {attributes: true}); const add = () => { const on = document.documentElement.dataset.theme === "light" && document.documentElement.dataset.lang === "ru"; const ex = document.getElementById("qa2"); if (on && !ex) { const p = document.createElement("p"); p.id = "qa2"; p.textContent = "Единолично создал и ввёл в эксплуатацию сервис SCA/SBOM (второй)"; document.getElementById("about").append(p); } if (!on && ex) ex.remove(); }; new MutationObserver(add).observe(document.documentElement, {attributes: true});</script></body>'), /paragraphs with the service claim = 2/],
  };
  for (const [name, [html, expected]] of Object.entries(serviceMutations)) {
    assert.notEqual(html, index, `service mutation ${name} applied`);
    const found = [];
    for (const scheme of SCHEMES) { current = `service ${name} [${scheme}]`; await load(page, html, true, scheme); found.push(...await serviceProblems(page, `service ${name}`, scheme)); }
    if (!found.some(f => expected.test(f))) failures.push(`self-test: service mutation «${name}» is not rejected with ${expected}: ${found[0] ?? 'no problems'}`);
    cases++;
    mutationCount++;
  }
  // Без JavaScript: стиль в noscript прячет абзац.
  {
    const html = index.replace('</head>', '<noscript><style>#about p:has(> [data-l]){display:none}</style></noscript></head>');
    const found = [];
    for (const scheme of SCHEMES) { current = `service noscriptHides [${scheme}]`; await load(pageNoJs, html, true, scheme); found.push(...await serviceProblems(pageNoJs, 'service noscriptHides', scheme)); }
    if (!found.some(f => HIDDEN.test(f))) failures.push(`self-test: service mutation «noscriptHides» is not rejected: ${found[0] ?? 'no problems'}`);
    cases++;
  }
  // Безобидные числа рядом с абзацем не тревожат.
  {
    const html = extra('Processed 2 million records, 2 european records, 250 строк в таблице. Выгружены 2 строки таблицы, 3 строками данных.');
    const found = [];
    for (const scheme of SCHEMES) { current = `service harmlessNumbers [${scheme}]`; await load(page, html, true, scheme); found.push(...await serviceProblems(page, 'service harmlessNumbers', scheme)); }
    if (found.length) failures.push(`self-test: service «harmlessNumbers» is a false positive: ${found[0]}`);
    cases++;
  }
  // Паритет с main: имена файлов в url(), download, srcset после data: и подпись с путём.
  for (const [name, html] of Object.entries({
    cssUrl: '<div style="background-image:url(\'/assets/logoMIET.svg\')">x</div>',
    download: '<a href="/r.pdf" download="ОтчётMIET.pdf">отчёт</a>',
    srcsetAfterData: '<img alt="" srcset="data:image/png;base64,AAAA 1x, /assets/logoMIET.svg 2x">',
    caption: '<p>Файл /assets/logoMIET.svg</p>',
  })) {
    await load(page, html, false, 'light');
    if (!(await mainParityProblems(page, `parity ${name}`)).length) failures.push(`self-test: main parity «${name}» is not caught`);
    cases++;
  }
  await page.context().close();
  await pageNoJs.context().close();

  // 2. Реальные страницы: с JavaScript и без, системная светлая и тёмная тема до загрузки,
  // исходный документ и все состояния темы и языка.
  for (const route of PAGES) {
    for (const js of [true, false]) {
      for (const scheme of SCHEMES) {
        const label = `${route}${js ? '' : ' [no JS]'}`;
        current = `${label} [${scheme}] load`;
        const context = await newContext({javaScriptEnabled: js, viewport: {width: 1440, height: 900}, colorScheme: scheme}, [origin]);
        const p = await context.newPage();
        const response = await p.goto(origin + route, {waitUntil: 'load'});
        if (!response || response.status() !== 200) { failures.push(`${label}: HTTP ${response?.status()}`); await context.close(); continue; }
        failures.push(...await mainParityProblems(p, label));
        failures.push(...await pageProblems(p, label, {deck: DECKS.has(route), route, scheme}));
        if (SERVICE_PAGES.includes(route)) {
          current = `${label} [${scheme}] reload for the service paragraph`;
          const again = await p.goto(origin + route, {waitUntil: 'load'});
          assert.equal(again?.status(), 200);
          failures.push(...await serviceProblems(p, label, scheme));
        }
        await context.close();
        cases++;
      }
    }
  }
} finally {
  await browser.close();
  server.close();
  clearTimeout(watchdog);
}
assert.deepEqual(failures, [], `former-employer QA:\n- ${failures.join('\n- ')}`);
console.log(`FORMER EMPLOYER QA OK: ${cases} cases, ${PAGES.length} pages × 2 JS modes × 2 schemes × 7 states, ${Object.keys(MUST_CATCH).length + Object.keys(PSEUDONYM_CATCH).length} disguises and ${mutationCount + 1} service mutations rejected`);
