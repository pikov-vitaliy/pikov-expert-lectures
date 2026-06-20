/**
 * TZ PIKOV EXPERT - Main JavaScript
 * Автор: Виталий Пиков
 * Описание: Основные функции сайта (мобильное меню, анимации, скролл)
 */

// ========================================================================
// MOBILE MENU
// ========================================================================

const MobileMenu = {
  init() {
    this.menuToggle = document.querySelector('.menu-toggle');
    this.navLinks = document.querySelector('.nav-links');
    this.nav = document.querySelector('nav');
    
    if (this.menuToggle && this.navLinks) {
      this.bindEvents();
    }
  },
  
  bindEvents() {
    this.menuToggle.addEventListener('click', () => this.toggle());
    
    // Закрывать меню при клике на ссылку
    this.navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => this.close());
    });
    
    // Закрывать меню при клике вне меню
    document.addEventListener('click', (e) => {
      if (!this.menuToggle.contains(e.target) && !this.navLinks.contains(e.target)) {
        this.close();
      }
    });
    
    // Закрывать меню при скролле
    window.addEventListener('scroll', () => this.close());
  },
  
  toggle() {
    this.menuToggle.classList.toggle('active');
    this.navLinks.classList.toggle('active');
    document.body.classList.toggle('menu-open');
  },
  
  close() {
    this.menuToggle.classList.remove('active');
    this.navLinks.classList.remove('active');
    document.body.classList.remove('menu-open');
  },
  
  open() {
    this.menuToggle.classList.add('active');
    this.navLinks.classList.add('active');
    document.body.classList.add('menu-open');
  }
};

// ========================================================================
// SCROLL ANIMATIONS
// ========================================================================

const ScrollAnimator = {
  init() {
    this.animatedElements = document.querySelectorAll('[data-scroll-reveal]');
    
    if (this.animatedElements.length > 0) {
      this.bindEvents();
      this.checkElements();
    }
  },
  
  bindEvents() {
    window.addEventListener('scroll', () => this.checkElements());
    window.addEventListener('resize', () => this.checkElements());
  },
  
  checkElements() {
    const windowHeight = window.innerHeight;
    const windowTop = window.scrollY;
    const windowBottom = windowTop + windowHeight;
    
    this.animatedElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top + windowTop;
      const elementHeight = element.offsetHeight;
      const elementBottom = elementTop + elementHeight;
      
      // Проверяем, попадает ли элемент в зону видимости
      if (elementBottom >= windowTop && elementTop <= windowBottom) {
        const revealThreshold = windowHeight * 0.1; // 10% от высоты окна
        if (elementTop <= windowBottom - revealThreshold) {
          element.classList.add('revealed');
        }
      }
    });
  }
};

// ========================================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ========================================================================

const SmoothScroll = {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => this.handleClick(e, anchor));
    });
  },
  
  handleClick(e, anchor) {
    const href = anchor.getAttribute('href');
    
    // Исключаем якоря, которые открывают модальные окна или выполняют другие действия
    if (href === '#' || anchor.classList.contains('no-smooth-scroll')) {
      return;
    }
    
    const target = document.querySelector(href);
    
    if (target) {
      e.preventDefault();
      
      // Закрываем мобильное меню, если оно открыто
      if (MobileMenu.menuToggle && MobileMenu.menuToggle.classList.contains('active')) {
        MobileMenu.close();
      }
      
      const navHeight = document.querySelector('nav').offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // Фокусируемся на элементе для доступности
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }
};

// ========================================================================
// ACTIVE NAV LINK HIGHLIGHTING
// ========================================================================

const ActiveNavLink = {
  init() {
    this.navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    this.sections = document.querySelectorAll('section[id]');
    
    if (this.navLinks.length > 0 && this.sections.length > 0) {
      this.bindEvents();
      this.updateActiveLink();
    }
  },
  
  bindEvents() {
    window.addEventListener('scroll', () => this.updateActiveLink());
    window.addEventListener('resize', () => this.updateActiveLink());
  },
  
  updateActiveLink() {
    const navHeight = document.querySelector('nav').offsetHeight;
    const scrollPosition = window.scrollY + navHeight + 20; // +20 для небольшого отступа
    
    this.sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        const sectionId = section.getAttribute('id');
        
        this.navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
};

// ========================================================================
// THEME TOGGLE (если нужно)
// ========================================================================

const ThemeToggle = {
  init() {
    this.toggle = document.querySelector('[data-theme-toggle]');
    
    if (this.toggle) {
      this.bindEvents();
      this.loadPreference();
    }
  },
  
  bindEvents() {
    this.toggle.addEventListener('click', () => this.toggleTheme());
  },
  
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme-preference', newTheme);
  },
  
  loadPreference() {
    const savedTheme = localStorage.getItem('theme-preference') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
};

// ========================================================================
// CHECKLIST INTERACTION (для Markdown чек-листов)
// ========================================================================

const ChecklistManager = {
  init() {
    this.checklists = document.querySelectorAll('.checklist');
    
    this.checklists.forEach(checklist => {
      this.setupChecklist(checklist);
    });
  },
  
  setupChecklist(checklist) {
    const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      // Сохраняем состояние чекбокса
      checkbox.addEventListener('change', () => {
        localStorage.setItem(`checklist-${checkbox.id || this.generateId(checkbox)}`, checkbox.checked);
      });
      
      // Восстанавливаем состояние чекбокса
      const savedState = localStorage.getItem(`checklist-${checkbox.id || this.generateId(checkbox)}`);
      if (savedState !== null) {
        checkbox.checked = savedState === 'true';
      }
    });
  },
  
  generateId(checkbox) {
    // Генерируем уникальный ID на основе текста label
    const label = checkbox.nextElementSibling || checkbox.parentNode;
    const text = label.textContent || label.innerText || '';
    return text.replace(/\s+/g, '-').toLowerCase();
  }
};

// ========================================================================
// MERMAID DIAGRAM INITIALIZATION
// ========================================================================

const MermaidInitializer = {
  init() {
    // Mermaid уже инициализирован в HTML через CDN
    // Здесь можно добавить дополнительные настройки
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: true,
          noteMargin: 10
        },
        gantt: {
          useMaxWidth: true
        }
      });
      
      // Переинициализация для учет темной темы
      this.setupThemeWatch();
    }
  },
  
  setupThemeWatch() {
    // Наблюдаем за изменениями темы
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const theme = document.documentElement.getAttribute('data-theme');
          mermaid.initialize({
            startOnLoad: true,
            theme: theme === 'dark' ? 'dark' : 'default'
          });
          // Перерисовка диаграмм
          this.redrawDiagrams();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true
    });
  },
  
  redrawDiagrams() {
    // Находим все контейнеры с диаграммами Mermaid и перерисовываем
    document.querySelectorAll('.mermaid').forEach(container => {
      const code = container.textContent;
      container.innerHTML = code;
    });
    
    // Вызываем рендеринг
    if (typeof mermaid !== 'undefined') {
      mermaid.init(undefined, document.querySelectorAll('.mermaid'));
    }
  }
};

// ========================================================================
// LAZY LOADING IMAGES
// ========================================================================

const LazyLoader = {
  init() {
    this.images = document.querySelectorAll('img[data-src]');
    
    if (this.images.length > 0) {
      this.bindEvents();
      this.checkImages();
    }
  },
  
  bindEvents() {
    window.addEventListener('scroll', () => this.checkImages());
    window.addEventListener('resize', () => this.checkImages());
  },
  
  checkImages() {
    const windowHeight = window.innerHeight;
    const windowTop = window.scrollY;
    const windowBottom = windowTop + windowHeight;
    
    this.images.forEach(image => {
      const imageTop = image.getBoundingClientRect().top + windowTop;
      const imageHeight = image.offsetHeight;
      const imageBottom = imageTop + imageHeight;
      
      if (imageBottom >= windowTop && imageTop <= windowBottom) {
        this.loadImage(image);
      }
    });
  },
  
  loadImage(image) {
    if (!image.dataset.loaded) {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
      image.dataset.loaded = 'true';
      
      // Добавляем анимацию появления
      image.style.opacity = '0';
      image.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        image.style.opacity = '1';
      }, 10);
    }
  }
};

// ========================================================================
// NAVBAR SCROLL EFFECT
// ========================================================================

const NavbarScroller = {
  init() {
    this.nav = document.querySelector('nav');
    
    if (this.nav) {
      this.bindEvents();
    }
  },
  
  bindEvents() {
    window.addEventListener('scroll', () => this.handleScroll());
  },
  
  handleScroll() {
    const scrollPosition = window.scrollY;
    const navHeight = this.nav.offsetHeight;
    
    if (scrollPosition > navHeight) {
      this.nav.classList.add('scrolled');
    } else {
      this.nav.classList.remove('scrolled');
    }
  }
};

// ========================================================================
// COUNTER ANIMATION (для статистики)
// ========================================================================

const CounterAnimator = {
  init() {
    this.counters = document.querySelectorAll('.stat-number');
    
    if (this.counters.length > 0) {
      this.bindEvents();
    }
  },
  
  bindEvents() {
    window.addEventListener('scroll', () => this.checkCounters());
  },
  
  checkCounters() {
    const windowHeight = window.innerHeight;
    const windowTop = window.scrollY;
    const windowBottom = windowTop + windowHeight;
    
    this.counters.forEach(counter => {
      const counterTop = counter.getBoundingClientRect().top + windowTop;
      
      if (counterTop <= windowBottom && !counter.dataset.animated) {
        this.animateCounter(counter);
        counter.dataset.animated = 'true';
      }
    });
  },
  
  animateCounter(counter) {
    const target = parseInt(counter.textContent);
    const duration = 2000; // 2 секунды
    const step = target / (duration / 16); // Шаг анимации
    let current = 0;
    
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        counter.textContent = target;
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, 16);
  }
};

// ========================================================================
// INITIALIZATION
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация всех модулей
  MobileMenu.init();
  ScrollAnimator.init();
  SmoothScroll.init();
  ActiveNavLink.init();
  ThemeToggle.init();
  ChecklistManager.init();
  MermaidInitializer.init();
  LazyLoader.init();
  NavbarScroller.init();
  CounterAnimator.init();
  
  console.log('✅ TZ Pikov Expert - All JavaScript modules initialized');
});

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

// Дебаунсинг функций (для оптимизации производительности)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Троттлинг функций
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Проверка видимости элемента
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Форматирование чисел
function formatNumber(num) {
  return new Intl.NumberFormat('ru-RU').format(num);
}

// ========================================================================
// EXPORT FOR MODULES (если нужно)
// ========================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MobileMenu,
    ScrollAnimator,
    SmoothScroll,
    ActiveNavLink,
    ThemeToggle,
    ChecklistManager,
    MermaidInitializer,
    LazyLoader,
    NavbarScroller,
    CounterAnimator
  };
}
