/* Плеер занятия: звук + настоящие HTML-слайды, которые листаются вместе с рассказом.
   Данные – JSON в <script id="voice-data">. Слайды – в iframe того же сайта (переход по #N). */
(function () {
  'use strict';
  var el = document.getElementById('voice-data');
  if (!el) return;
  var data = JSON.parse(el.textContent);
  var segs = data.segments;
  var audio = document.getElementById('vp-audio');
  var frame = document.getElementById('vp-frame');
  var list = document.getElementById('vp-list');
  var chapters = document.getElementById('vp-chapters');
  var text = document.getElementById('vp-text');
  var nowTitle = document.getElementById('vp-now');
  var syncBox = document.getElementById('vp-sync');
  var openDeck = document.getElementById('vp-open');
  var timerBox = document.getElementById('vp-timer'), timerLeft = document.getElementById('vp-timer-left');
  var cur = null, curBlock = -1, curFrag = -1, flat = [], deckLoaded = '';
  var KEY = 'kamaz-voice-pos';
  // преподаватель в кадре (с дня 3): немое видео справа от слайда, идёт синхронно со звуком
  var head = document.getElementById('vp-head');
  var wrap = frame.closest('.vp-frame-wrap');
  var anyHead = segs.some(function (s) { return !!s.head; });

  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60), x = s % 60;
    return m + ':' + (x < 10 ? '0' : '') + x;
  }
  function store(get, val) {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (get) return o;
      o[cur.id] = val; localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { return {}; }
  }
  // отдельное окно со слайдами (второй монитор, показ экрана) – листается вместе с рассказом
  var popup = null, popupDeck = '', popupFrame = null, popupHead = null;
  function syncPopup(b) {
    if (!popup || popup.closed) { popup = null; popupFrame = null; popupHead = null; return; }
    var url = new URL(b.deck, location.href).href;
    try {
      if (popupFrame) {  // окно «вебинар»: слайды в рамке, рядом преподаватель
        if (popupDeck !== b.deck) { popupDeck = b.deck; popupFrame.src = url + '#' + b.slide; }
        else popupFrame.contentWindow.location.hash = '#' + b.slide;
        return;
      }
      if (popupDeck !== b.deck) { popupDeck = b.deck; popup.location.href = url + '#' + b.slide; }
      else popup.location.hash = '#' + b.slide;
    } catch (e) { popup = null; popupFrame = null; popupHead = null; }
  }
  function syncVideo(v, force) {  // видео идёт за звуком: позиция, пауза, скорость
    if (!v || !cur || !cur.head || !v.getAttribute('src')) return;
    try {
      if (Math.abs(v.playbackRate - audio.playbackRate) > 0.001) v.playbackRate = audio.playbackRate;
      if (v.readyState >= 1 && (force || Math.abs(v.currentTime - audio.currentTime) > 0.3)) v.currentTime = audio.currentTime;
      // звук на паузе, в перемотке или ждёт данных – видео стоит (иначе уходит вперёд и дёргается при поправке)
      if (audio.paused || audio.seeking || audio.readyState < 3) { if (!v.paused) v.pause(); }
      else if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    } catch (e) {}
  }
  function headSync(force) {
    syncVideo(head, force);
    if (popup && !popup.closed && popupHead) syncVideo(popupHead, force);
  }
  function setHead(v, src) {
    if (!v) return;
    var abs = src ? new URL(src, location.href).href : '';
    if (abs) {
      if (v.src !== abs) { v.src = abs; v.load(); }
      v.hidden = false;
    } else {
      if (v.getAttribute('src')) { v.removeAttribute('src'); v.load(); }
      v.hidden = true;
    }
  }
  function onHeadMeta() { headSync(true); }
  if (head) { head.muted = true; head.addEventListener('loadedmetadata', onHeadMeta); }
  // окно для второго монитора: слайд слева, преподаватель справа – как вебинар; «Во весь экран» внутри окна
  function openScreen() {
    var w = window.open('', 'kamaz-screen', 'popup,width=1280,height=720');
    if (!w) return false;
    var d = w.document;
    d.open();
    d.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Занятие – слайды и преподаватель</title>' +
      '<style>html,body{margin:0;height:100%;background:#f4f6f5;overflow:hidden;font:15px/1.2 system-ui,sans-serif}' +
      '#st{position:absolute;inset:0;margin:auto;width:min(100vw,177.78vh);height:min(56.25vw,100vh)}' +
      '#sf{position:absolute;left:.52%;top:10.37%;width:79.17%;height:79.17%;border:0;background:#fff}' +
      '#sh{position:absolute;left:79.69%;top:27.78%;width:19.79%;height:43.98%;object-fit:cover;background:#000}' +
      '#sh[hidden]{display:none}#st.nohead #sf{left:0;top:0;width:100%;height:100%}' +
      '#stimer{position:absolute;top:13%;right:21.5%;padding:.5em .9em;border-radius:10px;background:rgba(0,0,0,.62);color:#fff;font-weight:700;pointer-events:none}' +
      '#stimer b{display:block;font-size:32px;font-variant-numeric:tabular-nums}#stimer[hidden]{display:none}' +
      '#sfs{position:fixed;right:10px;bottom:10px;padding:6px 12px;border-radius:999px;border:1px solid #999;background:rgba(255,255,255,.85);cursor:pointer;font:inherit}' +
      ':fullscreen #sfs{display:none}</style></head><body><div id="st"><iframe id="sf" title="Слайды"></iframe>' +
      '<video id="sh" muted playsinline preload="metadata" aria-label="Преподаватель"></video>' +
      '<div id="stimer" role="timer" aria-live="off" hidden><span>Работа по таймеру</span><b></b></div></div>' +
      '<button id="sfs" type="button">Во весь экран</button></body></html>');
    d.close();
    popup = w; popupDeck = ''; popupFrame = d.getElementById('sf'); popupHead = d.getElementById('sh');
    popupHead.muted = true;
    popupHead.addEventListener('loadedmetadata', onHeadMeta);
    var st = d.getElementById('st');
    function toggleFs() {
      var r;
      // во весь экран – всё окно: сцена #st (16:9 через min()) остаётся по центру с полями на любом мониторе
      try { r = d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen(); } catch (e) { r = null; }
      if (r && r.catch) r.catch(function () {});
    }
    d.getElementById('sfs').addEventListener('click', toggleFs);
    st.addEventListener('dblclick', toggleFs);
    if (cur) {
      setHead(popupHead, cur.head); st.classList.toggle('nohead', !cur.head);
      if (curBlock >= 0) syncPopup(cur.blocks[curBlock]);
      updateTimer(audio.currentTime); headSync(true);
    }
    try { w.focus(); } catch (x) {}
    return true;
  }
  function showSlide(b) {
    var url = b.deck + '#' + b.slide;
    openDeck.href = url;
    if (!syncBox.checked) return;
    syncPopup(b);
    if (deckLoaded !== b.deck) {
      deckLoaded = b.deck;
      frame.src = url;
      return;
    }
    try { frame.contentWindow.location.hash = '#' + b.slide; } catch (e) { frame.src = url; }
  }
  openDeck.setAttribute('target', 'kamaz-slides');
  openDeck.addEventListener('click', function (e) {
    if (anyHead && openScreen()) { e.preventDefault(); return; }
    var w = window.open(openDeck.href, 'kamaz-slides', 'popup,width=1280,height=760');
    if (!w) return;  // окно заблокировано – ссылка откроется обычной вкладкой с тем же именем
    e.preventDefault();
    popup = w;
    popupDeck = cur && curBlock >= 0 ? cur.blocks[curBlock].deck : '';
    try { popup.focus(); } catch (x) {}
  });
  var fsBtn = document.getElementById('vp-fs');
  if (fsBtn) fsBtn.addEventListener('click', function () {
    var w = wrap;
    var req = w.requestFullscreen || w.webkitRequestFullscreen;
    var r;
    try { r = document.fullscreenElement ? document.exitFullscreen() : (req ? req.call(w) : null); } catch (e) { r = null; }
    if (r && r.catch) r.catch(function () { fsBtn.textContent = 'Во весь экран недоступно'; });
  });
  function mark(node, on) { if (node) node.classList.toggle('is-current', on); }

  function render(seg) {
    chapters.innerHTML = ''; text.innerHTML = ''; flat = [];
    var lastLi = null, lastP = null;
    seg.blocks.forEach(function (b, bi) {
      if (b.sub && lastLi) {  // шаг раскрытия того же слайда: кадр меняется, строка списка и абзац – прежние
        b._ch = lastLi;
        b.frags.forEach(function (f) { addFrag(lastP, f, bi, false); });
        return;
      }
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span class="vp-time">' + fmt(b.t) + '</span><span>Слайд ' + esc(b.slide) + (b.title ? '. ' + esc(b.title) : '') + '</span>';
      btn.addEventListener('click', function () { seek(b.t, true); });
      li.appendChild(btn); chapters.appendChild(li); b._ch = li;
      var p = document.createElement('p');
      p.className = 'vp-para';
      lastLi = li; lastP = p;
      b.frags.forEach(function (f, fi) { addFrag(p, f, bi, fi === 0); });
      text.appendChild(p);
    });
    function addFrag(p, f, bi, first) {
        var s = document.createElement('span');
        s.className = 'vp-frag'; s.textContent = f[1] + ' ';
        s.setAttribute('role', 'button');
        s.tabIndex = first ? 0 : -1;  // в обходе Tab – одна фраза на слайд, внутри – стрелки
        s.addEventListener('click', function () { seek(f[0], true); });
        s.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seek(f[0], true); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            var sib = e.key === 'ArrowRight' ? s.nextElementSibling : s.previousElementSibling;
            if (sib) { e.preventDefault(); s.tabIndex = -1; sib.tabIndex = 0; sib.focus(); }
          }
        });
        p.appendChild(s);
        flat.push({ t: f[0], node: s, block: bi });
    }
  }
  var pendingLoad = null, rate = 1, lastSave = 0;
  function save() { if (cur && audio.currentTime > 0 && !audio.ended) store(false, audio.currentTime); }
  function load(seg, t, play) {
    save();  // позиция прежней части не теряется при переключении
    if (pendingLoad) audio.removeEventListener('loadedmetadata', pendingLoad);
    cur = seg; curBlock = -1; curFrag = -1;
    [].forEach.call(list.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x.dataset.id === seg.id ? 'true' : 'false'); });
    nowTitle.textContent = seg.time + ' · ' + seg.title;
    render(seg);
    var dl = document.getElementById('vp-dl');  // готовое видео части – скачать (с дня 3)
    if (dl) {
      if (seg.video) { dl.href = seg.video; dl.textContent = 'Скачать видео этой части (MP4, ' + seg.videoMb + ' МБ) ↓'; dl.hidden = false; }
      else { dl.hidden = true; dl.removeAttribute('href'); }
    }
    setHead(head, seg.head);
    wrap.classList.toggle('has-head', !!seg.head);
    if (popup && !popup.closed && popupHead) {
      setHead(popupHead, seg.head);
      try { popup.document.getElementById('st').classList.toggle('nohead', !seg.head); } catch (e) {}
    }
    audio.src = seg.audio;
    audio.preload = 'metadata';
    var start = t || 0;
    var once = function () {
      audio.removeEventListener('loadedmetadata', once); pendingLoad = null;
      audio.currentTime = start; audio.playbackRate = rate;
      if (play) audio.play().catch(function () {});
    };
    pendingLoad = once;
    audio.addEventListener('loadedmetadata', once);
    audio.defaultPlaybackRate = rate;
    audio.load();
    update(start);
    try { history.replaceState(null, '', '#' + seg.id); } catch (e) {}
  }
  function seek(t, play) {
    audio.currentTime = t; update(t);
    if (play) audio.play().catch(function () {});
  }
  function updateTimer(t) {  // обратный отсчёт во время работы по таймеру (как в видео)
    if (!timerBox) return;
    var tm = (cur && cur.timers || []).filter(function (x) { return t >= x[0] && t < x[1]; })[0];
    if (!tm) { if (!timerBox.hidden) timerBox.hidden = true; popupTimer(''); return; }
    var left = Math.max(0, Math.ceil(tm[1] - t)), mm = Math.floor(left / 60), ss = left % 60;
    timerLeft.textContent = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    if (timerBox.hidden) timerBox.hidden = false;
    popupTimer(timerLeft.textContent);
  }
  // окно слайдов могло открыться на паузе или перезагрузиться при смене колоды – раз в секунду досинхронизировать табло
  setInterval(function () {
    if (popup && !popup.closed && cur) updateTimer(audio.currentTime);
    if (cur && cur.head) headSync(false);  // поправка дрейфа видео относительно звука
  }, 1000);
  function popupTimer(txt) {  // то же табло в отдельном окне слайдов (показ экрана)
    if (!popup || popup.closed) return;
    if (popupFrame) {  // окно «вебинар» – своё табло поверх слайда
      try {
        var tb = popup.document.getElementById('stimer');
        tb.hidden = !txt;
        if (txt) tb.querySelector('b').textContent = txt;
      } catch (e) {}
      return;
    }
    try {
      var d = popup.document, el = d.getElementById('vp-ext-timer');
      if (!el) {
        if (!txt || !d.body) return;
        el = d.createElement('div'); el.id = 'vp-ext-timer'; el.setAttribute('role', 'timer'); el.setAttribute('aria-live', 'off');
        el.style.cssText = 'position:fixed;top:13%;right:2%;z-index:10;padding:.5em .9em;border-radius:10px;background:rgba(0,0,0,.62);color:#fff;font:700 15px/1.15 system-ui,sans-serif;pointer-events:none';
        el.innerHTML = '<span style="display:block">Работа по таймеру</span><b style="display:block;font-size:32px;font-variant-numeric:tabular-nums"></b>';
        d.body.appendChild(el);
      }
      el.hidden = !txt;
      if (txt) el.querySelector('b').textContent = txt;
    } catch (e) {}
  }
  function update(t) {
    if (!cur) return;
    updateTimer(t);
    var bi = 0;
    for (var i = 0; i < cur.blocks.length; i++) if (cur.blocks[i].t <= t + 0.05) bi = i;
    if (bi !== curBlock) {
      if (curBlock >= 0) mark(cur.blocks[curBlock]._ch, false);
      curBlock = bi; mark(cur.blocks[bi]._ch, true);
      showSlide(cur.blocks[bi]);
    }
    var fi = -1;
    for (var k = 0; k < flat.length; k++) if (flat[k].t <= t + 0.05) fi = k;
    if (fi !== curFrag) {
      if (curFrag >= 0) mark(flat[curFrag].node, false);
      curFrag = fi;
      if (fi >= 0) {
        mark(flat[fi].node, true);
        var n = flat[fi].node, box = text;
        var top = n.offsetTop - box.offsetTop, h = box.clientHeight;
        if (!audio.paused && (top < box.scrollTop || top > box.scrollTop + h - 60)) box.scrollTop = Math.max(0, top - h / 3);
      }
    }
  }

  segs.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.id = s.id;
    b.innerHTML = '<span class="vp-time">' + esc(s.time) + '</span><span class="vp-kind">' + esc(s.kind) + '</span><span class="vp-title">' + esc(s.title) + '</span><span class="vp-dur">' + (s.duration < 60 ? Math.round(s.duration) + ' с' : Math.round(s.duration / 60) + ' мин') + '</span>';
    b.addEventListener('click', function () { var pos = store(true)[s.id] || 0; load(s, pos, true); });
    var li = document.createElement('li'); li.appendChild(b); list.appendChild(li);
  });
  audio.addEventListener('timeupdate', function () {
    update(audio.currentTime);
    var now = Date.now(); if (now - lastSave > 5000) { lastSave = now; save(); }
  });
  audio.addEventListener('pause', save);
  ['play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'ratechange'].forEach(function (ev) {
    audio.addEventListener(ev, function () { headSync(ev === 'seeked' || ev === 'playing'); });
  });
  // при уходе со страницы окно «вебинар» закрывается: новая страница им уже не управляет
  window.addEventListener('pagehide', function () {
    if (popup && !popup.closed && popupFrame) { try { popup.close(); } catch (e) {} }
  });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  audio.addEventListener('ended', function () {
    if (cur) store(false, 0);
    var i = segs.indexOf(cur);
    if (i >= 0 && i < segs.length - 1) {
      var nb = list.querySelectorAll('button')[i + 1];
      if (nb) nb.focus();
    }
  });
  syncBox.addEventListener('change', function () { if (syncBox.checked && cur && curBlock >= 0) { deckLoaded = ''; showSlide(cur.blocks[curBlock]); } });
  [].forEach.call(document.querySelectorAll('[data-rate]'), function (b) {
    b.addEventListener('click', function () {
      rate = parseFloat(b.dataset.rate);
      audio.defaultPlaybackRate = rate; audio.playbackRate = rate; syncRate();
    });
  });
  function syncRate() {  // кнопки всегда показывают фактическую скорость
    var r = audio.playbackRate || rate;
    [].forEach.call(document.querySelectorAll('[data-rate]'), function (x) {
      x.setAttribute('aria-pressed', Math.abs(parseFloat(x.dataset.rate) - r) < 0.01 ? 'true' : 'false');
    });
  }
  audio.addEventListener('ratechange', syncRate);
  audio.addEventListener('loadedmetadata', function () { setTimeout(syncRate, 0); });
  document.getElementById('vp-back').addEventListener('click', function () { seek(Math.max(0, audio.currentTime - 15), false); });
  document.getElementById('vp-fwd').addEventListener('click', function () { seek(audio.currentTime + 15, false); });

  var h = (location.hash || '').slice(1), first = segs[0];
  segs.forEach(function (s) { if (s.id === h) first = s; });
  load(first, store(true)[first.id] || 0, false);
})();
