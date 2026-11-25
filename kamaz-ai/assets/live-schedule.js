/* Живое расписание дня курса: прошедшие пункты – серое время, идущий сейчас – красное время,
   остаток минут и полоса хода занятия; в перерыве – строка «перерыв до …»; в карточке «План дня» –
   часы по Москве и полоса всего дня. Время – московское (UTC+3) независимо от часового пояса компьютера.
   25.11.2026: без привязки к дате. Курс открытый, поэтому в какой бы день ни зашёл слушатель, он видит,
   какое занятие шло бы сейчас по расписанию этого дня.
   Для показа и проверки: ?now=10:15 (прежняя запись ?now=2026-11-16T10:15 тоже понимается, дата не важна). */
(function () {
  'use strict';
  var MSK = 3 * 60; // минут к UTC
  var NOW = /^(?:\d{4}-\d{2}-\d{2}T)?(\d{2}):(\d{2})/;
  var lists = document.querySelectorAll('[data-live]');
  if (!lists.length) return;

  function mskNowMinutes() {
    var m = NOW.exec(new URLSearchParams(location.search).get('now') || '');
    if (m) return +m[1] * 60 + +m[2];
    var d = new Date(Date.now() + MSK * 60000);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  function toMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  function hhmm(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
  function left(min) {
    if (min < 60) return min + ' мин';
    var h = Math.floor(min / 60), r = min % 60;
    return h + ' ч' + (r ? ' ' + r + ' мин' : '');
  }

  function update() {
    var now = mskNowMinutes();
    lists.forEach(function (list) {
      var items = Array.prototype.slice.call(list.querySelectorAll('[data-from]'));
      var current = null, nextItem = null;
      items.forEach(function (it) {
        var from = toMin(it.getAttribute('data-from')), to = toMin(it.getAttribute('data-to'));
        var past = now >= to;
        var cur = now >= from && now < to;
        it.classList.toggle('is-past', past);
        it.classList.toggle('is-now', cur);
        var bar = it.querySelector('.live-progress');
        var note = it.querySelector('.live-left');
        if (cur) {
          current = it;
          var span = Math.max(1, to - from), done = Math.min(1, (now - from) / span);
          if (!bar) { bar = document.createElement('span'); bar.className = 'live-progress'; bar.setAttribute('aria-hidden', 'true'); it.appendChild(bar); }
          bar.style.setProperty('--done', (done * 100).toFixed(1) + '%');
          bar.hidden = to === toMin('23:59') || from === 0;  // у пунктов без явных границ полоса хода не нужна
          if (!note) { note = document.createElement('span'); note.className = 'live-left'; (it.querySelector('.plan-what, .timeline-body') || it).appendChild(note); }
          var open = it.getAttribute('data-to') === '23:59';
          note.textContent = open ? 'сейчас' : 'идёт сейчас · ещё ' + left(to - now);
        } else {
          if (bar) bar.remove();
          if (note) note.remove();
        }
        if (!cur && !past && !nextItem) nextItem = it;
      });

      // перерыв между пунктами
      var gap = list.querySelector('.live-gap');
      if (gap) gap.remove();
      if (!current && nextItem && items.indexOf(nextItem) > 0) {
        gap = document.createElement(nextItem.tagName === 'LI' ? 'li' : 'div');
        gap.className = 'live-gap';
        var nf = toMin(nextItem.getAttribute('data-from'));
        var dot = document.createElement('span');
        dot.className = 'live-gap-dot';
        dot.setAttribute('aria-hidden', 'true');
        var txt = document.createElement('span');
        txt.textContent = 'Перерыв · продолжим в ' + hhmm(nf) + ', через ' + left(nf - now);
        gap.appendChild(dot);
        gap.appendChild(txt);
        nextItem.parentNode.insertBefore(gap, nextItem);
      }

      // шапка карточки: часы и полоса дня
      var head = list.parentNode.querySelector('.live-head');
      if (head) {
        var starts = items.map(function (it) { return toMin(it.getAttribute('data-from')); });
        var ends = items.map(function (it) { return toMin(it.getAttribute('data-to')); });
        var dayStart = Math.min.apply(null, starts.filter(function (s) { return s > 0; }));
        var dayEnd = Math.max.apply(null, ends.filter(function (e) { return e < 23 * 60; }));
        var text = head.querySelector('.live-clock'), fill = head.querySelector('.live-day-bar');
        var p = 0, label, state = 'now';
        if (now < dayStart) { label = 'Сейчас ' + hhmm(now) + ' МСК · начало в ' + hhmm(dayStart); state = 'before'; }
        else if (now >= dayEnd) { label = 'Сейчас ' + hhmm(now) + ' МСК · занятия дня закончились'; p = 1; state = 'after'; }
        else { label = 'Сейчас ' + hhmm(now) + ' МСК'; p = (now - dayStart) / (dayEnd - dayStart); }
        list.setAttribute('data-live-state', state);
        text.textContent = label;
        fill.style.setProperty('--done', (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%');
        head.hidden = false;
      }
    });
  }

  update();
  if (!NOW.test(new URLSearchParams(location.search).get('now') || '')) setInterval(update, 20000);
})();
