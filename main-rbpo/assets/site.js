(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js-ready');

  const themeButton = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function storedTheme() {
    try {
      const value = localStorage.getItem('main-rbpo-theme');
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  function effectiveTheme() {
    return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  }

  function applyTheme(theme, persist = false) {
    root.dataset.theme = theme;
    if (themeButton) {
      const isDark = theme === 'dark';
      themeButton.setAttribute('aria-pressed', String(isDark));
      themeButton.setAttribute(
        'aria-label',
        isDark ? 'Включить светлую цветовую тему' : 'Включить тёмную цветовую тему',
      );
    }
    if (themeMeta) {
      themeMeta.content = theme === 'dark' ? '#071725' : '#f1f0ea';
    }
    if (persist) {
      try {
        localStorage.setItem('main-rbpo-theme', theme);
      } catch {
        // The preference is optional; the lecture remains fully usable.
      }
    }
  }

  applyTheme(storedTheme() || (systemDark.matches ? 'dark' : 'light'));

  if (themeButton) {
    themeButton.addEventListener('click', () => {
      applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }

  systemDark.addEventListener('change', (event) => {
    if (!storedTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });

  const triadButtons = [...document.querySelectorAll('[data-triad]')];
  const triadPanels = [...document.querySelectorAll('[data-panel]')];

  function showTriad(name, focusPanel = false) {
    triadButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.triad === name));
    });
    triadPanels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.hidden = !active;
      if (active && focusPanel) {
        panel.setAttribute('tabindex', '-1');
        panel.focus({ preventScroll: true });
      }
    });
  }

  if (triadButtons.length && triadPanels.length) {
    showTriad('people');
    triadButtons.forEach((button, index) => {
      button.addEventListener('click', () => showTriad(button.dataset.triad));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          return;
        }
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = triadButtons.length - 1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = (index - 1 + triadButtons.length) % triadButtons.length;
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % triadButtons.length;
        }
        const next = triadButtons[nextIndex];
        next.focus();
        showTriad(next.dataset.triad);
      });
    });
  }

  const progress = document.querySelector('.reading-progress');
  let progressQueued = false;

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    if (progress) progress.value = fraction * 100;
    progressQueued = false;
  }

  window.addEventListener('scroll', () => {
    if (!progressQueued) {
      progressQueued = true;
      window.requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  updateProgress();

  const railLinks = [...document.querySelectorAll('.chapter-rail a')];
  const linkById = new Map(
    railLinks.map((link) => [link.getAttribute('href')?.slice(1), link]),
  );
  const observedSections = [...document.querySelectorAll('main > section[id]')]
    .filter((section) => linkById.has(section.id));

  if ('IntersectionObserver' in window && observedSections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      railLinks.forEach((link) => link.removeAttribute('aria-current'));
      linkById.get(visible.target.id)?.setAttribute('aria-current', 'true');
    }, {
      rootMargin: '-25% 0px -55% 0px',
      threshold: [0, 0.2, 0.5, 0.8],
    });
    observedSections.forEach((section) => observer.observe(section));
  }
})();
