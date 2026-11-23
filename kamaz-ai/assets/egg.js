/* 23.11.2026: пасхалка главной страницы курса. Ответ на странице не хранится:
   сравнивается SHA-256 от «kamaz-egg-check:<ответ>», папка файлов – SHA-256 от «kamaz-egg-files:<ответ>». */
(function () {
  var box = document.getElementById('egg');
  if (!box || !window.crypto || !crypto.subtle || !window.TextEncoder) return;
  var form = document.getElementById('egg-form');
  var input = document.getElementById('egg-input');
  var msg = document.getElementById('egg-msg');
  var files = document.getElementById('egg-files');
  var tries = 0;

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(hex);
  }
  function norm(s) {
    return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
  }
  function link(href, type, text) {
    var a = document.createElement('a');
    a.className = 'button primary';
    a.href = href;
    a.setAttribute('download', '');
    a.textContent = text + ' ↓';
    var span = document.createElement('span');
    span.className = 'file-type';
    span.textContent = type;
    var p = document.createElement('p');
    p.appendChild(span);
    p.appendChild(document.createTextNode(' '));
    p.appendChild(a);
    return p;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ans = norm(input.value);
    if (!ans) { msg.textContent = 'Впишите кличку.'; input.focus(); return; }
    sha('kamaz-egg-check:' + ans).then(function (h) {
      if (h !== box.getAttribute('data-check')) {
        tries += 1;
        msg.textContent = tries < 2 ? 'Не угадали. Попробуйте ещё раз.' : 'Не угадали. Подсказка: в кличке пять букв.';
        files.hidden = true;
        return;
      }
      return sha('kamaz-egg-files:' + ans).then(function (f) {
        var dir = 'x/' + f.slice(0, 20) + '/';
        var name = 'Рабочая-тетрадь-образец-заполнения';
        msg.textContent = 'Правильно! В награду – образец заполненной рабочей тетради итогового проекта: сверьте с ним свою.';
        while (files.firstChild) files.removeChild(files.firstChild);
        files.appendChild(link(dir + name + '.pdf', 'PDF', 'Открыть образец в PDF'));
        files.appendChild(link(dir + name + '.docx', 'Word', 'Скачать образец в Word'));
        files.hidden = false;
        box.classList.add('egg-open');
      });
    }).catch(function () { msg.textContent = 'Проверка не удалась в этом браузере.'; });
  });
})();
