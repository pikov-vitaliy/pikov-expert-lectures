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
  var popup = null, popupDeck = '';
  function syncPopup(b) {
    if (!popup || popup.closed) { popup = null; return; }
    var url = new URL(b.deck, location.href).href;
    try {
      if (popupDeck !== b.deck) { popupDeck = b.deck; popup.location.href = url + '#' + b.slide; }
      else popup.location.hash = '#' + b.slide;
    } catch (e) { popup = null; }
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
    var w = window.open(openDeck.href, 'kamaz-slides', 'popup,width=1280,height=760');
    if (!w) return;  // окно заблокировано – ссылка откроется обычной вкладкой с тем же именем
    e.preventDefault();
    popup = w;
    popupDeck = cur && curBlock >= 0 ? cur.blocks[curBlock].deck : '';
    try { popup.focus(); } catch (x) {}
  });
  var fsBtn = document.getElementById('vp-fs');
  if (fsBtn) fsBtn.addEventListener('click', function () {
    var w = frame.parentNode;
    var req = w.requestFullscreen || w.webkitRequestFullscreen;
    var r;
    try { r = document.fullscreenElement ? document.exitFullscreen() : (req ? req.call(w) : null); } catch (e) { r = null; }
    if (r && r.catch) r.catch(function () { fsBtn.textContent = 'Во весь экран недоступно'; });
  });
  function mark(node, on) { if (node) node.classList.toggle('is-current', on); }

  function render(seg) {
    chapters.innerHTML = ''; text.innerHTML = ''; flat = [];
    seg.blocks.forEach(function (b, bi) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span class="vp-time">' + fmt(b.t) + '</span><span>Слайд ' + esc(b.slide) + (b.title ? '. ' + esc(b.title) : '') + '</span>';
      btn.addEventListener('click', function () { seek(b.t, true); });
      li.appendChild(btn); chapters.appendChild(li); b._ch = li;
      var p = document.createElement('p');
      p.className = 'vp-para';
      b.frags.forEach(function (f, fi) {
        var s = document.createElement('span');
        s.className = 'vp-frag'; s.textContent = f[1] + ' ';
        s.setAttribute('role', 'button');
        s.tabIndex = fi === 0 ? 0 : -1;  // в обходе Tab – одна фраза на слайд, внутри – стрелки
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
      });
      text.appendChild(p);
    });
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
  function popupTimer(txt) {  // то же табло в отдельном окне слайдов (показ экрана)
    if (!popup || popup.closed) return;
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
