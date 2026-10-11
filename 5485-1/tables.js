(() => {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'table-dialog';
  dialog.setAttribute('aria-labelledby', 'table-dialog-title');
  document.body.append(dialog);
  let disposeDialog = null;
  let previousOverflow = '';

  function button(text, label) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.setAttribute('aria-label', label);
    return element;
  }

  function controls(wrap, tools, bar) {
    const left = button('←', 'Прокрутить таблицу влево');
    const right = button('→', 'Прокрутить таблицу вправо');
    const label = document.createElement('span');
    label.className = 'table-tools-label';
    label.textContent = 'Столбцы: прокрутка сверху или кнопками';
    tools.append(label, left, right);
    const track = document.createElement('input');
    track.type = 'range';
    track.min = '0';
    track.step = '1';
    track.setAttribute('aria-label', 'Горизонтальная прокрутка таблицы');
    bar.append(track);
    const update = () => {
      const overflow = wrap.scrollWidth > wrap.clientWidth + 1;
      track.max = String(wrap.scrollWidth - wrap.clientWidth);
      bar.hidden = !overflow;
      left.disabled = wrap.scrollLeft <= 1;
      right.disabled = wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 1;
      wrap.parentElement.classList.toggle('is-scrollable', overflow);
      track.value = String(wrap.scrollLeft);
    };
    const fromTable = update;
    const fromBar = () => { wrap.scrollLeft = Number(track.value); };
    const move = direction => { wrap.scrollLeft += direction * Math.max(180, wrap.clientWidth * .7); };
    left.addEventListener('click', () => move(-1));
    right.addEventListener('click', () => move(1));
    wrap.addEventListener('scroll', fromTable, { passive: true });
    track.addEventListener('input', fromBar);
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    observer.observe(wrap.querySelector('table'));
    update();
    return () => {
      observer.disconnect();
      wrap.removeEventListener('scroll', fromTable);
      track.removeEventListener('input', fromBar);
    };
  }

  function openTable(table, title) {
    const header = document.createElement('div');
    header.className = 'table-dialog-header';
    const heading = document.createElement('h2');
    heading.id = 'table-dialog-title';
    heading.className = 'table-dialog-title';
    heading.textContent = title;
    const close = button('Закрыть ×', 'Закрыть таблицу');
    close.className = 'table-dialog-close';
    close.addEventListener('click', closeTable);
    header.append(heading, close);
    const tools = document.createElement('div');
    tools.className = 'table-tools';
    const bar = document.createElement('div');
    bar.className = 'table-top-scroll';
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', title);
    const copy = table.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    wrap.append(copy);
    dialog.replaceChildren(header, tools, bar, wrap);
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    disposeDialog = controls(wrap, tools, bar);
    close.focus();
  }

  function cleanupDialog() {
    if (!disposeDialog) return;
    disposeDialog();
    disposeDialog = null;
    document.documentElement.style.overflow = previousOverflow;
    dialog.replaceChildren();
  }
  function closeTable() {
    dialog.close();
    cleanupDialog();
  }
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeTable();
  });
  dialog.addEventListener('close', () => { if (!dialog.open) cleanupDialog(); });

  document.querySelectorAll('.reading > .table-wrap').forEach((wrap, index) => {
    const table = wrap.querySelector('table');
    const columns = table.querySelectorAll('thead tr:first-child > *').length;
    if (columns < 5) return;
    table.classList.add('table-wide');
    table.style.setProperty('--table-width', `${columns * 190}px`);
    let before = wrap.previousElementSibling;
    while (before && !/^H[23]$/.test(before.tagName)) before = before.previousElementSibling;
    const title = before ? before.textContent.trim() : `Учебная таблица ${index + 1}`;
    const panel = document.createElement('div');
    panel.className = 'table-panel';
    const tools = document.createElement('div');
    tools.className = 'table-tools';
    const bar = document.createElement('div');
    bar.className = 'table-top-scroll';
    wrap.before(panel);
    panel.append(tools, bar, wrap);
    controls(wrap, tools, bar);
    if (typeof dialog.showModal === 'function') {
      const expand = button('На весь экран ↗', `На весь экран: ${title}`);
      expand.className = 'table-expand';
      expand.addEventListener('click', () => openTable(table, title));
      tools.append(expand);
    }
  });
})();
