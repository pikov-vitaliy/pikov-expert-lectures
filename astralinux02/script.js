// Презентация — Модуль 1
// Навигация: клавиатура, кнопки, тач-свайпы, обновление счётчика и стилей хром

(function () {
  const stage = document.getElementById('stage');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const chrome = document.querySelector('.chrome');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;

  function pad(n) { return String(n).padStart(2, '0'); }

  function getCurrentIndex() {
    const top = stage.scrollTop;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const d = Math.abs(slides[i].offsetTop - top);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function updateUI() {
    const i = getCurrentIndex();
    counter.textContent = `${pad(i + 1)} / ${pad(total)}`;
    const cls = slides[i].classList;
    chrome.classList.toggle('on-cover', cls.contains('slide-cover'));
    chrome.classList.toggle('on-divider', cls.contains('slide-divider') || cls.contains('slide-final'));
    // Hash for shareable links
    const hash = '#s' + (i + 1);
    if (location.hash !== hash) {
      history.replaceState(null, '', hash);
    }
  }

  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    stage.scrollTo({ top: slides[i].offsetTop, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => goTo(getCurrentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(getCurrentIndex() + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goTo(getCurrentIndex() + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goTo(getCurrentIndex() - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(total - 1);
    }
  });

  // Tap zones for mobile / touchscreen during lecture
  let touchStartY = null;
  stage.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dy) > 60) {
      if (dy < 0) goTo(getCurrentIndex() + 1);
      else goTo(getCurrentIndex() - 1);
    }
    touchStartY = null;
  }, { passive: true });

  // Update UI on scroll
  let ticking = false;
  stage.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateUI();
        ticking = false;
      });
      ticking = true;
    }
  });

  window.addEventListener('resize', () => {
    const i = getCurrentIndex();
    stage.scrollTo({ top: slides[i].offsetTop, behavior: 'auto' });
  });

  // Deep link via hash
  window.addEventListener('load', () => {
    const m = location.hash.match(/^#s(\d+)$/);
    if (m) {
      const i = Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1));
      stage.scrollTo({ top: slides[i].offsetTop, behavior: 'auto' });
    }
    updateUI();
  });

  updateUI();
})();
