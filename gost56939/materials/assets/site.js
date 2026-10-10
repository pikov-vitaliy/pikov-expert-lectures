(() => {
  const root = document.documentElement;
  const button = document.querySelector('[data-theme-toggle]');
  let saved;
  try { saved = localStorage.getItem('pikov-materials-theme'); } catch {}
  const setTheme = theme => {
    root.dataset.theme = theme;
    if (button) { button.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'; button.setAttribute('aria-pressed', String(theme === 'dark')); }
    try { localStorage.setItem('pikov-materials-theme', theme); } catch {}
  };
  setTheme(saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
  button?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  const input = document.querySelector('[data-search]');
  const select = document.querySelector('[data-section]');
  const items = [...document.querySelectorAll('[data-library-item]')];
  const filter = () => {
    const words = (input?.value || '').toLocaleLowerCase('ru').trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      const matches = (!select?.value || item.dataset.section === select.value) && words.every(w => item.dataset.search.includes(w));
      item.hidden = !matches; if (matches) count++;
    }
    const status = document.querySelector('[data-count]');
    if (status) status.textContent = `Найдено материалов: ${count}`;
    const empty = document.querySelector('[data-empty]'); if (empty) empty.hidden = count > 0;
  };
  input?.addEventListener('input', filter); select?.addEventListener('change', filter);
  if (select) { const category = new URLSearchParams(location.search).get('section'); if ([...select.options].some(o => o.value === category)) select.value = category; filter(); }
})();
