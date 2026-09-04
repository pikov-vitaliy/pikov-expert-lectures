(() => {
  'use strict';
  const root = document.documentElement;
  const lang = root.lang;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const themeButton = document.querySelector('[data-theme-toggle]');
  const currentTheme = () => root.dataset.theme || (systemTheme.matches ? 'dark' : 'light');
  const updateTheme = () => {
    const dark = currentTheme() === 'dark';
    themeButton.setAttribute('aria-label', document.body.dataset[dark ? 'themeLight' : 'themeDark']);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#171e1b' : '#f6f5ef';
  };
  if (themeButton) {
    themeButton.hidden = false;
    updateTheme();
    themeButton.addEventListener('click', () => {
      root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('pikov-new-theme', root.dataset.theme); } catch {}
      updateTheme();
    });
    systemTheme.addEventListener('change', updateTheme);
  }
  const locale = document.querySelector('[data-locale-switch]');
  const syncLocale = () => {
    const target = new URL(locale.getAttribute('href'), location.href);
    target.search = location.search;
    target.hash = location.hash;
    locale.href = target.pathname + target.search + target.hash;
  };
  syncLocale();
  window.addEventListener('hashchange',syncLocale);
  const form = document.querySelector('[data-filters]');
  if (!form) return;
  const fields = {q:form.elements.namedItem('q'),topic:form.elements.namedItem('topic'),kind:form.elements.namedItem('kind')};
  const materials = [...document.querySelectorAll('[data-material]')];
  const groups = [...document.querySelectorAll('[data-group]')];
  const clear = document.querySelector('.filter-status [data-clear]');
  const status = document.querySelector('[data-results]');
  const normalise = text => text.toLowerCase().replace(/ё/g,'е').normalize('NFKC');
  const readUrl = () => {
    const params = new URLSearchParams(location.search);
    fields.q.value = params.get('q') || '';
    for (const key of ['topic','kind']) {
      const value = params.get(key) || '';
      fields[key].value = [...fields[key].options].some(option => option.value === value) ? value : '';
    }
  };
  const writeUrl = () => {
    const url = new URL(location.href);
    for (const key of ['q','topic','kind']) {
      const value = fields[key].value.trim();
      if (value) url.searchParams.set(key,value); else url.searchParams.delete(key);
    }
    if (url.hash.startsWith('#topic-')) {
      const anchorGroup = document.getElementById(url.hash.slice(1));
      if (!anchorGroup || anchorGroup.hidden) url.hash = 'materials';
    }
    history.replaceState(null,'',url.pathname + url.search + url.hash);
    syncLocale();
  };
  const countLabel = n => {
    if (lang !== 'ru') return `${n} ${n === 1 ? 'material' : 'materials'}`;
    const mod = n % 100;
    const word = mod >= 11 && mod <= 14 ? 'материалов' : n % 10 === 1 ? 'материал' : n % 10 >= 2 && n % 10 <= 4 ? 'материала' : 'материалов';
    return `${n} ${word}`;
  };
  function filter(sync = true) {
    const terms = normalise(fields.q.value.trim()).split(/\s+/).filter(Boolean);
    const topic = fields.topic.value;
    const kind = fields.kind.value;
    let shown = 0;
    materials.forEach(card => {
      const match = (!topic || card.dataset.category === topic) && (!kind || card.dataset.kind === kind) && terms.every(term => normalise(card.dataset.search).includes(term));
      card.hidden = !match;
      if (match) shown++;
    });
    groups.forEach(group => {
      const count = group.querySelectorAll('[data-material]:not([hidden])').length;
      group.hidden = count === 0;
      group.querySelector('[data-group-count]').textContent = countLabel(count);
    });
    document.querySelectorAll('[data-topic-link]').forEach(link => {
      if (link.dataset.topicLink === topic) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current');
    });
    status.textContent = status.dataset.template.replace('{shown}',String(shown)).replace('{total}',String(materials.length));
    clear.hidden = !terms.length && !topic && !kind;
    document.querySelector('[data-empty]').hidden = shown > 0;
    if (sync) writeUrl();
  }
  readUrl();
  form.hidden = false;
  document.querySelector('[data-filter-status]').hidden = false;
  filter(false);
  form.addEventListener('submit',event => {event.preventDefault();filter();});
  fields.q.addEventListener('input',()=>filter());
  fields.topic.addEventListener('change',()=>filter());
  fields.kind.addEventListener('change',()=>filter());
  document.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click',()=>{
    for (const field of Object.values(fields)) field.value = '';
    filter();fields.q.focus({preventScroll:true});
  }));
  document.querySelectorAll('[data-topic-link]').forEach(link => link.addEventListener('click',event=>{
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    fields.topic.value = link.dataset.topicLink;
    fields.q.value = '';fields.kind.value = '';
    const url = new URL(location.href);
    url.searchParams.set('topic',fields.topic.value);
    url.searchParams.delete('q');url.searchParams.delete('kind');
    url.hash = `topic-${fields.topic.value}`;
    history.pushState(null,'',url.pathname + url.search + url.hash);
    filter(false);syncLocale();
    document.getElementById(`topic-${fields.topic.value}`).scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));
  window.addEventListener('popstate',()=>{readUrl();filter(false);syncLocale();});
})();
