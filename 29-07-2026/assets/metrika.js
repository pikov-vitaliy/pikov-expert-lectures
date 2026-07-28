"use strict";

(function initializeMetrika(windowObject, documentObject) {
  const counterId = 109116119;
  const source = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;

  windowObject.ym =
    windowObject.ym ||
    function queueMetrikaCall(...args) {
      windowObject.ym.a = windowObject.ym.a || [];
      windowObject.ym.a.push(args);
    };
  windowObject.ym.l = Date.now();

  const alreadyLoaded = Array.from(documentObject.scripts).some(
    (script) => script.src === source,
  );
  if (!alreadyLoaded) {
    const script = documentObject.createElement("script");
    script.async = true;
    script.src = source;
    const firstScript = documentObject.scripts[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      documentObject.head.appendChild(script);
    }
  }

  windowObject.ym(counterId, "init", {
    ssr: true,
    webvisor: false,
    clickmap: false,
    ecommerce: "dataLayer",
    referrer: documentObject.referrer,
    url: windowObject.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
})(window, document);
