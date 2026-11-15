/* Живое расписание дня курса: прошедшие пункты – серое время, идущий сейчас – красное время,
   остаток минут и полоса хода занятия; в перерыве – строка «перерыв до …»; в карточке «План дня» –
   часы по Москве и полоса всего дня. Время – московское (UTC+3) независимо от часового пояса компьютера.
   Для показа и проверки: ?now=2026-11-16T10:15 – московское время, которое считать текущим. */
(function () {
  'use strict';
  var MSK = 3 * 60; // минут к UTC
  var lists = document.querySelectorAll('[data-live-day]');
  if (!lists.length) return;

  function mskNowMinutes() {
    var m = /[?&]now=(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(location.search);
    if (m) return { date: m[1], min: +m[2] * 60 + +m[3], fixed: true };
    var d = new Date(Date.now() + MSK * 60000);
    var date = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    return { date: date, min: d.getUTCHours() * 60 + d.getUTCMinutes(), fixed: false, sec: d.getUTCSeconds() };
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
      var day = list.getAttribute('data-live-day');
      var items = Array.prototype.slice.call(list.querySelectorAll('[data-from]'));
      var state = now.date < day ? 'before' : now.date > day ? 'after' : 'today';
      list.setAttribute('data-live-state', state);
      var current = null, nextItem = null;
      items.forEach(function (it) {
        var from = toMin(it.getAttribute('data-from')), to = toMin(it.getAttribute('data-to'));
        var past = state === 'after' || (state === 'today' && now.min >= to);
        var cur = state === 'today' && now.min >= from && now.min < to;
        it.classList.toggle('is-past', past);
        it.classList.toggle('is-now', cur);
        var bar = it.querySelector('.live-progress');
        var note = it.querySelector('.live-left');
        if (cur) {
          current = it;
          var span = Math.max(1, to - from), done = Math.min(1, (now.min - from) / span);
          if (!bar) { bar = document.createElement('span'); bar.className = 'live-progress'; bar.setAttribute('aria-hidden', 'true'); it.appendChild(bar); }
          bar.style.setProperty('--done', (done * 100).toFixed(1) + '%');
          bar.hidden = to === toMin('23:59') || from === 0;  // у пунктов без явных границ полоса хода не нужна
          if (!note) { note = document.createElement('span'); note.className = 'live-left'; (it.querySelector('.plan-what, .timeline-body') || it).appendChild(note); }
          var open = it.getAttribute('data-to') === '23:59';
          note.textContent = open ? 'сейчас' : 'идёт сейчас · ещё ' + left(to - now.min);
        } else {
          if (bar) bar.remove();
          if (note) note.remove();
        }
        if (!cur && !past && state === 'today' && !nextItem) nextItem = it;
      });

      // перерыв между пунктами
      var gap = list.querySelector('.live-gap');
      if (gap) gap.remove();
      if (state === 'today' && !current && nextItem && items.indexOf(nextItem) > 0) {
        gap = document.createElement(nextItem.tagName === 'LI' ? 'li' : 'div');
        gap.className = 'live-gap';
        var nf = toMin(nextItem.getAttribute('data-from'));
        var dot = document.createElement('span');
        dot.className = 'live-gap-dot';
        dot.setAttribute('aria-hidden', 'true');
        var txt = document.createElement('span');
        txt.textContent = 'Перерыв · продолжим в ' + hhmm(nf) + ', через ' + left(nf - now.min);
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
        var p = 0, label;
        if (state === 'before') { label = 'Занятия начнутся ' + list.getAttribute('data-live-label'); }
        else if (state === 'after') { label = 'День пройден'; p = 1; }
        else if (now.min < dayStart) { label = 'Сейчас ' + hhmm(now.min) + ' МСК · начало в ' + hhmm(dayStart); }
        else if (now.min >= dayEnd) { label = 'Сейчас ' + hhmm(now.min) + ' МСК · занятия на сегодня закончились'; p = 1; }
        else { label = 'Сейчас ' + hhmm(now.min) + ' МСК'; p = (now.min - dayStart) / (dayEnd - dayStart); }
        text.textContent = label;
        fill.style.setProperty('--done', (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%');
        head.hidden = false;
      }
    });
  }

  update();
  if (!/[?&]now=/.test(location.search)) setInterval(update, 20000);
})();
