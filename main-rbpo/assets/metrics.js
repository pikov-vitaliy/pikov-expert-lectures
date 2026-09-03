(() => {
  'use strict';

  const tagUrl = 'https://mc.yandex.ru/metrika/tag.js';

  window.ym = window.ym || function queueMetric() {
    window.ym.a = window.ym.a || [];
    window.ym.a.push(arguments);
  };
  window.ym.l = window.ym.l || Date.now();

  const alreadyLoaded = [...document.scripts].some((script) => script.src === tagUrl);
  if (!alreadyLoaded) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = tagUrl;
    document.head.append(tag);
  }

  window.ym(109116119, 'init', {
    ssr: true,
    webvisor: false,
    clickmap: false,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
})();
