/* Страница «Практика» (praktika.html): поиск по всем заданиям, документам и обозначениям, боковая панель с документом
   рядом с заданием, отметки выполненных шагов, копирование запросов.
   Обозначения ищутся в любой записи: К-2, К2, K2 (латиница), «документ 5-2» и «5.2».
   Отметки шагов хранятся только в браузере слушателя; без localStorage страница работает так же. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const main = $('#main');
  if (!main || !$('#pr-q')) return;

  /* ---------- раскрыть нужное место по адресу #… ---------- */
  function openChain(el) {
    for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    if (el.tagName === 'DETAILS') el.open = true;
  }
  function goTo(id, flash = true) {
    const el = document.getElementById(id);
    if (!el) return false;
    openChain(el);
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'start' });
      const f = el.tagName === 'DETAILS' ? $('summary', el) : el;
      if (f && !f.matches('summary,a,button,input')) f.setAttribute('tabindex', '-1');
      if (f) f.focus({ preventScroll: true });
      if (flash) {
        el.classList.add('pr-flash');
        setTimeout(() => el.classList.remove('pr-flash'), 1800);
      }
    });
    return true;
  }
  const decode = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };
  const fromHash = () => { const id = decode(location.hash.slice(1)); if (id) goTo(id); };
  window.addEventListener('hashchange', fromHash);

  /* ---------- боковая панель ---------- */
  const drawer = $('#pr-drawer'), dBody = $('#pr-drawer-body'), dTitle = $('#pr-drawer-title'), dKind = $('#pr-drawer-kind');
  const dGoto = $('#pr-drawer-goto'), dBack = $('#pr-drawer-back'), dClose = $('#pr-drawer-close');
  const narrow = window.matchMedia('(max-width: 1100px)');
  narrow.addEventListener('change', () => { main.inert = !drawer.hidden && narrow.matches; });
  let stack = [], opener = null;

  function paneSource(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const item = el.matches('[data-pane]') ? el : el.closest('[data-pane]');
    return item ? { item, el } : null;
  }
  function renderPane(id) {
    const src = paneSource(id);
    if (!src) return false;
    const { item, el } = src;
    dKind.textContent = item.dataset.kind || '';
    dTitle.textContent = item.dataset.title || '';
    dGoto.href = '#' + id;
    const body = (item.querySelector(':scope > .pr-body') || item).cloneNode(true);
    body.removeAttribute('id');
    const innerId = el !== item ? el.id : '';
    let mark = null;
    $$('[id]', body).forEach((x) => { if (innerId && x.id === innerId) mark = x; x.removeAttribute('id'); });
    $$('input[type=checkbox]', body).forEach((x) => { x.disabled = true; });
    $$('.pr-copy, .pr-tcopy, .pr-reset, .pr-up', body).forEach((x) => x.remove());
    $$('.pr-pre', body).forEach((x) => { const p = $('pre', x); if (p) x.replaceWith(p); });
    $$('details', body).forEach((x) => { x.open = true; });
    dBody.replaceChildren(body);
    addCopy(body);
    dBody.scrollTop = 0;
    if (mark) { mark.classList.add('pr-flash'); setTimeout(() => { mark.scrollIntoView({ block: 'start' }); }, 30); }
    dBack.hidden = stack.length < 2;
    return true;
  }
  function openPane(id, from) {
    if (!paneSource(id)) return false;
    if (drawer.hidden) { opener = from || document.activeElement; stack = []; }
    if (stack[stack.length - 1] !== id) stack.push(id);
    if (!renderPane(id)) return false;
    drawer.hidden = false;
    main.inert = narrow.matches;
    document.body.classList.add('pr-has-drawer');
    if (!drawer.contains(document.activeElement)) dClose.focus({ preventScroll: true });
    return true;
  }
  function closePane() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    main.inert = false;
    document.body.classList.remove('pr-has-drawer');
    stack = [];
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }
  dClose.addEventListener('click', closePane);
  dBack.addEventListener('click', () => { stack.pop(); const id = stack[stack.length - 1]; if (id) { renderPane(id); if (dBack.hidden) dClose.focus({ preventScroll: true }); } else closePane(); });
  dGoto.addEventListener('click', (e) => {
    e.preventDefault();
    const id = dGoto.getAttribute('href').slice(1);
    closePane();
    history.pushState(null, '', '#' + id);
    goTo(id);
  });
  // обычная ссылка на место этой же страницы внутри панели: закрыть панель и показать место
  dBody.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('pr-ref') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    const id = decode(a.getAttribute('href').slice(1));
    closePane();
    history.pushState(null, '', '#' + id);
    goTo(id);
  });
  window.addEventListener('popstate', () => { if (!drawer.hidden) closePane(); fromHash(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { e.preventDefault(); closePane(); } });

  // ссылка на документ, задание или обозначение открывается сбоку; с Ctrl, Cmd, Shift и средней кнопкой – как обычная ссылка
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a.pr-ref');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = decode((a.getAttribute('href') || '').replace(/^#/, ''));
    if (openPane(id, a)) e.preventDefault();
  });

  /* ---------- копирование запросов и таблиц ---------- */
  async function copyText(text, node) {
    try { await navigator.clipboard.writeText(text); return true; } catch (err) { /* ниже – запасной способ */ }
    try {
      const box = node.closest('details');
      if (box) box.open = true;
      const r = document.createRange();
      r.selectNodeContents(node);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      return document.execCommand('copy');
    } catch (err) { return false; }
  }
  function say(button, ok, label) {
    button.textContent = ok ? 'Скопировано' : 'Выделено: Ctrl+C';
    setTimeout(() => { button.textContent = label; }, 2000);
  }
  function copyButton(label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pr-copy';
    b.textContent = label;
    b.addEventListener('click', async (e) => { e.preventDefault(); e.stopPropagation(); say(b, await fn(), label); });
    return b;
  }
  function tableText(t) {
    return $$('tr', t).map((tr) => $$('th,td', tr).map((c) => { const k = c.cloneNode(true); $$('br', k).forEach((x) => x.replaceWith(' / ')); return k; }).map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join('\t')).join('\n');
  }
  // таблица копируется и разметкой (для Word), и текстом с табуляцией (для Excel и чата)
  async function copyTable(t) {
    const clean = t.cloneNode(true);
    $$('a', clean).forEach((a) => a.replaceWith(document.createTextNode(a.textContent)));
    $$('*', clean).forEach((x) => { x.removeAttribute('id'); x.removeAttribute('class'); x.removeAttribute('title'); });
    clean.setAttribute('border', '1');
    clean.setAttribute('style', 'border-collapse:collapse');
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([clean.outerHTML], { type: 'text/html' }),
        'text/plain': new Blob([tableText(t)], { type: 'text/plain' }),
      })]);
      return true;
    } catch (err) { return copyText(tableText(t), t); }
  }
  function addCopy(root) {
    $$('details.pr-prompt', root).forEach((d) => {
      const sum = $('summary', d), pre = $('pre', d);
      if (!pre || $('.pr-copy', sum)) return;
      sum.append(copyButton('Копировать запрос', () => copyText(pre.textContent.replace(/\n$/, ''), pre)));
    });
    $$('pre', root).forEach((pre) => {
      if (pre.closest('details.pr-prompt') || pre.parentElement.classList.contains('pr-pre')) return;
      const box = document.createElement('div');
      box.className = 'pr-pre';
      pre.replaceWith(box);
      box.append(pre, copyButton('Копировать', () => copyText(pre.textContent.replace(/\n$/, ''), pre)));
    });
    $$('.table-wrap', root).forEach((w) => {
      const t = $('table', w);
      if (!t || (w.nextElementSibling && w.nextElementSibling.classList.contains('pr-tcopy'))) return;
      const p = document.createElement('p');
      p.className = 'pr-tcopy';
      p.append(copyButton('Копировать таблицу', () => copyTable(t)));
      w.after(p);
    });
  }
  addCopy(main);

  /* ---------- отметки шагов ---------- */
  const KEY = 'kamaz-praktika-shagi';
  // каждое поле – отдельный ключ: две открытые вкладки не затирают отметки друг друга
  const store = {
    has(k) { try { return localStorage.getItem(`${KEY}:${k}`) === '1'; } catch (e) { return false; } },
    set(k, v) { try { if (v) localStorage.setItem(`${KEY}:${k}`, '1'); else localStorage.removeItem(`${KEY}:${k}`); } catch (e) { /* без хранилища отметки живут до закрытия страницы */ } },
  };
  const ticks = $$('input[data-step]', main);
  const totalN = $('#pr-total-n'), totalFill = $('#pr-total-fill'), cont = $('#pr-continue');
  const firstOpen = () => ticks.find((b) => !b.checked);
  function total() {
    if (!totalN || !ticks.length) return;
    const n = ticks.filter((b) => b.checked).length;
    totalN.textContent = `${n} из ${ticks.length}`;
    totalFill.style.setProperty('--done', `${(n / ticks.length * 100).toFixed(1)}%`);
    cont.textContent = n === 0 ? 'Начать' : n === ticks.length ? 'Всё заполнено' : 'Продолжить с места остановки';
  }
  function progress(route) {
    const boxes = $$('input[data-step]', route);
    const n = boxes.filter((b) => b.checked).length;
    const el = $('.pr-progress', route);
    if (el) { el.textContent = n ? `${n} из ${boxes.length}` : ''; el.classList.toggle('is-full', n === boxes.length && n > 0); }
  }
  $$('.pr-route').forEach((route) => {
    $$('input[data-step]', route).forEach((b) => {
      b.checked = store.has(b.dataset.step);
      b.addEventListener('change', () => {
        store.set(b.dataset.step, b.checked);
        progress(route);
        total();
      });
    });
    const reset = $('.pr-reset', route);
    if (reset) reset.addEventListener('click', () => {
      $$('input[data-step]', route).forEach((b) => { b.checked = false; store.set(b.dataset.step, false); });
      progress(route);
      total();
    });
    progress(route);
  });
  total();
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(KEY + ':')) return;
    const b = ticks.find((x) => x.dataset.step === e.key.slice(KEY.length + 1));
    if (!b) return;
    b.checked = e.newValue === '1';
    progress(b.closest('.pr-route'));
    total();
  });
  if (cont) cont.addEventListener('click', () => {
    const b = firstOpen() || ticks[0];
    const item = b && b.closest('.pr-field');
    if (!item) return;
    const route = b.closest('details.pr-route');
    $$('details.pr-route').forEach((d) => { if (d !== route) d.open = false; });
    goTo(item.id);
  });

  /* ---------- развернуть / свернуть всё ---------- */
  const toggleAll = (open) => $$('details.pr-item, details.pr-sub', main).forEach((d) => { d.open = open; });
  $$('[data-pr-all]').forEach((b) => b.addEventListener('click', () => toggleAll(b.dataset.prAll === 'open')));
  let printed = [];
  window.addEventListener('beforeprint', () => { printed = $$('details:not([open])', main); printed.forEach((d) => { d.open = true; }); });
  window.addEventListener('afterprint', () => { printed.forEach((d) => { d.open = false; }); printed = []; });

  /* ---------- поиск ---------- */
  const q = $('#pr-q'), out = $('#pr-results'), list = $('#pr-results-list'), count = $('#pr-results-count'), clear = $('#pr-clear');
  const LAT = { a: 'а', b: 'вб', c: 'сц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'нх', i: 'и', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'пр', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'у', z: 'з' };
  const base = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[‐‑–—−]/g, '-').replace(/ /g, ' ');
  const CODE = /(^|[^a-zа-я0-9.])([a-zа-я]{1,3})\s?-?\s?0*(\d{1,3})([а-я]?)(?![a-zа-я0-9])/g;
  const DOT = /(^|[^\d.,])(\d{1,2})[.-](\d{1,2})(?![\d])/g;
  function latVariants(letters) {
    let res = [''];
    for (const ch of letters) {
      const opts = /[a-z]/.test(ch) ? (LAT[ch] || ch) : ch;
      const next = [];
      for (const r of res) for (const o of opts) next.push(r + o);
      res = next.slice(0, 16);
    }
    return res;
  }
  function codesOf(text) {
    const set = new Set();
    for (const m of text.matchAll(CODE)) for (const l of latVariants(m[2])) { set.add(l + Number(m[3]) + (m[4] || '')); if (m[4]) set.add(l + Number(m[3])); }
    for (const m of text.matchAll(DOT)) set.add(`${Number(m[2])}.${Number(m[3])}`);
    return set;
  }
  let index = null;
  function build() {
    if (index) return index;
    index = [];
    const textOf = (nodes, stop) => {
      let text = '';
      const walk = (n) => {
        if (n.nodeType === 3) { text += n.nodeValue; return; }
        if (n.nodeType !== 1 || n.matches('script,style,.pr-copy,.pr-tcopy,.pr-noindex,.pr-up,.pr-tick') || stop(n)) return;
        n.childNodes.forEach(walk);
        if (/^(P|LI|TR|H[1-6]|DIV|PRE|TD|TH|DT|DD|SUMMARY)$/.test(n.tagName)) text += ' ';
      };
      nodes.forEach(walk);
      return text.replace(/\s+/g, ' ').trim();
    };
    const add = (el, kind, label, mod, title, text, code, sub = false) => {
      const nt = base(title), nx = base(text);
      index.push({ el, id: el.id, kind, sub, label, mod, title, text, nt, nx, boost: el.dataset.book ? 20 : 0, code: code ? codesOf(' ' + base(code) + ' ') : new Set(), tCodes: codesOf(' ' + nt + ' '), xCodes: codesOf(' ' + nx + ' ') });
    };
    $$('[data-idx]', main).forEach((el) => {
      const body = el.querySelector(':scope > .pr-body') || el;
      const { idx, kind = '', mod = '', title = '', code = '' } = el.dataset;
      add(el, idx, kind, mod, title, textOf([body], (n) => n !== body && n.hasAttribute('data-idx')), code);
      // поля тетради и подзадания – отдельными записями: поиск приводит прямо к ним
      $$('.pr-field[id]', body).forEach((f) => add(f, idx, kind, mod, `${title} · ${$('h4', f).textContent.trim()}`, textOf([f], () => false), '', true));
      const heads = $$('h3[id],h4[id]', body);
      heads.forEach((h) => {
        const nodes = [], lvl = h.tagName;
        for (let n = h.nextElementSibling; n && !(/^H[1-4]$/.test(n.tagName) && n.tagName <= lvl); n = n.nextElementSibling) nodes.push(n);
        add(h, idx, kind, mod, `${title} · ${h.textContent.trim()}`, textOf(nodes, () => false), '', true);
      });
    });
    return index;
  }
  const WEIGHT = { code: 8, route: 7, doc: 6, task: 6, sub: 4, home: 5, other: 1 };
  function parse(str) {
    // «документ 5-2», «к 2», «K2» – код целиком, остальное – слова
    let s = ' ' + base(str) + ' ';
    const tokens = [];
    s = s.replace(/(^|\s)([a-zа-я]{1,3})\s-?\s?(\d{1,3})(?=\s)/g, (m, p, l, n) => (/^(в|на|по|из|от|до|за|п|пп|и|или|к|о|с|не|но)$/.test(l) && !/^(к|о|п)$/.test(l) ? m : `${p}${l}-${n}`));
    for (const w of s.split(/[\s,;:!?()«»"]+/).filter(Boolean)) {
      const t = { raw: w.replace(/^[.]+|[.]+$/g, ''), alts: new Set() };
      const c = /^([a-zа-я]{1,3})-?0*(\d{1,3})([а-яa-z]?)$/.exec(t.raw);
      if (c) for (const l of latVariants(c[1])) t.alts.add(l + Number(c[2]) + (c[3] ? latVariants(c[3])[0] : ''));
      const d = /^(\d{1,2})[.-](\d{1,2})$/.exec(t.raw);
      if (d) t.alts.add(`${Number(d[1])}.${Number(d[2])}`);
      // слово короче трёх букв без кода не ищем: «в», «на»
      if (t.alts.size || t.raw.length > 2 || /^\d+$|°/.test(t.raw)) tokens.push(t);
    }
    return tokens;
  }
  const stem = (w) => (w.length > 5 ? w.slice(0, Math.max(5, w.length - 2)) : w);
  function score(e, tokens) {
    let total = 0;
    for (const t of tokens) {
      let s = 0;
      for (const a of t.alts) {
        if (e.code.has(a)) s = Math.max(s, (e.code.size > 5 ? 90 : 120) + e.boost);
        if (e.tCodes.has(a)) s = Math.max(s, 45);
        if (e.xCodes.has(a)) s = Math.max(s, 16);
      }
      if (!t.alts.size) {
        const w = stem(t.raw);
        if (e.nt.includes(w)) s = Math.max(s, 34 + (e.nt.startsWith(w) ? 6 : 0));
        const i = e.nx.indexOf(w);
        if (i >= 0) s = Math.max(s, 8 + Math.min(6, e.nx.split(w).length - 2));
      } else if (s === 0 && t.raw.length > 2 && (e.nt.includes(t.raw) || e.nx.includes(t.raw))) s = 6;
      if (!s) return 0;
      total += s;
    }
    return total + (e.sub ? WEIGHT.sub : WEIGHT[e.kind] || 0);
  }
  function hitRanges(text, tokens) {
    const n = base(text), hits = [];
    for (const t of tokens) {
      if (t.alts.size) {
        for (const m of (' ' + n + ' ').matchAll(CODE)) {
          if (latVariants(m[2]).some((l) => t.alts.has(l + Number(m[3]) + (m[4] || '')) || t.alts.has(l + Number(m[3])))) hits.push([m.index + m[1].length - 1, m.index + m[0].length - 1]);
        }
        for (const m of (' ' + n + ' ').matchAll(DOT)) if (t.alts.has(`${Number(m[2])}.${Number(m[3])}`)) hits.push([m.index + m[1].length - 1, m.index + m[0].length - 1]);
      } else {
        const w = stem(t.raw);
        for (let i = n.indexOf(w); i >= 0 && hits.length < 40; i = n.indexOf(w, i + w.length)) hits.push([i, i + w.length]);
      }
    }
    return hits.filter((h) => h[0] >= 0).sort((a, b) => a[0] - b[0]);
  }
  function marked(text, tokens) {
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [a, b] of hitRanges(text, tokens)) {
      if (a < pos) continue;
      frag.append(text.slice(pos, a));
      const m = document.createElement('mark');
      m.textContent = text.slice(a, b);
      frag.append(m);
      pos = b;
    }
    frag.append(text.slice(pos));
    return frag;
  }
  function snippet(text, tokens) {
    const hits = hitRanges(text, tokens);
    const at = hits.length ? hits[0][0] : 0;
    const a = Math.max(0, at - 80), b = Math.min(text.length, at + 170);
    const frag = document.createDocumentFragment();
    frag.append(a ? '…' : '', marked(text.slice(a, b), tokens), b < text.length ? '…' : '');
    return frag;
  }
  function resultItem(e, tokens) {
    const li = document.createElement('li'), a = document.createElement('a'), badge = document.createElement('span'), t = document.createElement('b'), sn = document.createElement('span');
    a.className = 'pr-hit';
    a.href = '#' + e.id;
    a.dataset.go = e.id;
    badge.className = `pr-badge pr-badge-${e.kind}`;
    badge.textContent = e.label;
    t.append(marked(e.title, tokens));
    sn.className = 'pr-snip';
    sn.append(snippet(e.text, tokens));
    a.append(badge, t, sn);
    li.append(a);
    if (paneSource(e.id)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pr-side';
      b.dataset.side = e.id;
      b.textContent = 'Открыть сбоку';
      b.setAttribute('aria-label', 'Открыть сбоку: ' + e.title);
      li.append(b);
    }
    return li;
  }
  let filter = 'all', mod = '';
  function run() {
    const str = q.value.trim();
    clear.hidden = !str;
    const tokens = parse(str);
    const url = new URL(location.href);
    if (str) url.searchParams.set('q', str); else url.searchParams.delete('q');
    try { history.replaceState(null, '', url); } catch (e) { /* файл открыт с диска */ }
    if (!tokens.length) { out.hidden = true; return; }
    let found = build().map((e) => [score(e, tokens), e]).filter((x) => x[0] > 0);
    if (mod) found = found.filter((x) => x[1].mod.split(' ').includes(mod));
    const total = found.length;
    if (filter !== 'all') found = found.filter((x) => filter.split(',').includes(x[1].kind));
    found.sort((x, y) => y[0] - x[0]);
    const top = found.slice(0, 40);
    count.textContent = top.length
      ? `Найдено: ${found.length}${found.length < total ? ` (всего ${total})` : ''}${found.length > 40 ? ', показаны первые 40' : ''}`
      : 'Ничего не найдено. Попробуйте одно обозначение (К-2, Ф-2, документ 3.2) или одно слово из задания.';
    list.replaceChildren(...top.map(([, e]) => resultItem(e, tokens)));
    out.hidden = false;
    // поиск начат внизу страницы: выдача – сразу под строкой поиска
    const r = out.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.8 || r.top < 120) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 190), behavior: 'instant' });
  }
  if ('requestIdleCallback' in window) requestIdleCallback(() => build(), { timeout: 4000 });
  let timer = 0;
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(); const first = $('.pr-hit', list); if (first) first.focus(); }
    if (e.key === 'Escape' && q.value) { e.stopPropagation(); q.value = ''; run(); }
  });
  clear.addEventListener('click', () => { q.value = ''; run(); q.focus(); });
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (q.value.trim()) run(); else q.focus();
  }));
  $$('[data-mod-filter]').forEach((b) => b.addEventListener('click', () => {
    mod = mod === b.dataset.modFilter ? '' : b.dataset.modFilter;
    $$('[data-mod-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.modFilter === mod)));
    if (q.value.trim()) run(); else q.focus();
  }));
  list.addEventListener('click', (e) => {
    const side = e.target.closest('[data-side]');
    if (side) { openPane(side.dataset.side, side); return; }
    const a = e.target.closest('[data-go]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    history.pushState(null, '', '#' + a.dataset.go);
    goTo(a.dataset.go);
  });
  $$('[data-try]').forEach((b) => b.addEventListener('click', () => { q.value = b.dataset.try; run(); q.focus(); out.scrollIntoView({ block: 'nearest' }); }));
  // клавиша «/» – к поиску
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
    e.preventDefault();
    q.focus();
    q.select();
  });

  const start = new URL(location.href).searchParams.get('q');
  if (start) { q.value = start; run(); }
  if (location.hash) setTimeout(fromHash, 60);
})();
