(() => {
  const root = document.documentElement;
  const themeStorageKey = 'appsec-theme';
  const themeToggle = document.createElement('button');
  const themeIcon = document.createElement('span');
  const themeText = document.createElement('span');

  themeToggle.className = 'theme-toggle';
  themeToggle.type = 'button';
  themeIcon.className = 'theme-toggle-icon';
  themeIcon.setAttribute('aria-hidden', 'true');
  themeText.className = 'theme-toggle-text';
  themeToggle.append(themeIcon, themeText);

  const readStoredTheme = () => {
    try {
      const stored = window.localStorage.getItem(themeStorageKey);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  };

  const renderThemeToggle = (theme) => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    themeIcon.textContent = nextTheme === 'light' ? '☀' : '☾';
    themeText.textContent = nextTheme === 'light' ? 'Светлая' : 'Тёмная';
    themeToggle.setAttribute('aria-label', `Включить ${nextTheme === 'light' ? 'светлую' : 'тёмную'} тему`);
    themeToggle.title = `Включить ${nextTheme === 'light' ? 'светлую' : 'тёмную'} тему`;
  };

  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    renderThemeToggle(theme);
    if (persist) {
      try {
        window.localStorage.setItem(themeStorageKey, theme);
      } catch {
        // Переключатель остаётся доступен даже при запрете локального хранилища.
      }
    }
  };

  const systemPrefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  applyTheme(readStoredTheme() ?? (systemPrefersLight ? 'light' : 'dark'));

  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const readingLine = document.querySelector('.reading-line');
  const headerInner = document.querySelector('.header-inner');

  if (headerInner) {
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    headerActions.append(themeToggle);
    if (navToggle) headerActions.append(navToggle);
    headerInner.append(headerActions);
  }

  themeToggle.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
  });

  const syncScrollState = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 8);
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? Math.min(100, Math.max(0, (window.scrollY / height) * 100)) : 0;
    readingLine?.style.setProperty('--read', `${progress}%`);
  };

  syncScrollState();
  window.addEventListener('scroll', syncScrollState, { passive: true });

  navToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(Boolean(open)));
    navToggle.setAttribute('aria-label', open ? 'Закрыть навигацию' : 'Открыть навигацию');
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Открыть навигацию');
  }));

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 })
    : null;

  document.querySelectorAll('.reveal').forEach((element) => {
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  });

  document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    const target = document.querySelector(button.dataset.copy);
    if (!target) return;
    const text = target.textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = 'Скопировано';
      window.setTimeout(() => { button.textContent = original; }, 1800);
    } catch {
      window.getSelection()?.selectAllChildren(target);
    }
  }));

  document.querySelectorAll('[data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
})();
