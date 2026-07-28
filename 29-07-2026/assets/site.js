(function() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  let stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch {
    stored = null;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));
  themeToggle.addEventListener('click', function() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Theme still changes for the current page when storage is unavailable.
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  const progressBar = document.getElementById('progressBar');
  const backToTop = document.getElementById('backToTop');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
    if (scrollTop > 600) backToTop.classList.add('visible');
    else backToTop.classList.remove('visible');
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const tocLinks = document.querySelectorAll('.toc-list a');
  const sections = document.querySelectorAll('.section, .hero');
  const linkBySection = Object.create(null);
  tocLinks.forEach(a => {
    const id = a.getAttribute('data-section');
    if (id) linkBySection[id] = a;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(a => a.classList.remove('active'));
          if (linkBySection[id]) linkBySection[id].classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -65% 0px', threshold: 0 });
    sections.forEach(s => { if (s.id) observer.observe(s); });
  }

  const tocToggle = document.getElementById('tocToggle');
  const toc = document.getElementById('toc');
  function setTocOpen(open) {
    toc.classList.toggle('open', open);
    tocToggle.setAttribute('aria-expanded', String(open));
  }
  tocToggle.addEventListener('click', function() {
    setTocOpen(!toc.classList.contains('open'));
  });
  tocLinks.forEach(a => {
    a.addEventListener('click', function() {
      if (window.innerWidth <= 900) setTocOpen(false);
    });
  });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') setTocOpen(false);
  });
})();
