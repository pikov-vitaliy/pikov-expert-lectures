import { DISPLAY_DIGITS } from '/shared/classes.js';

const STAGES = [
  ['input', 'Вход', '16×16×1'], ['conv1', 'Свёртка 1', '16×16×8'],
  ['pool1', 'Максимум 1', '8×8×8'], ['conv2', 'Свёртка 2', '8×8×16'],
  ['pool2', 'Максимум 2', '4×4×16'], ['flatten', 'Разворачивание', '256'],
  ['output', 'Выход', '10'],
];
const SHORT_STAGES = ['Вход', 'Свёртка 1', 'Макс. 1', 'Свёртка 2', 'Макс. 2', 'Вектор', 'Выход'];
const number = value => Number.isFinite(value) ? (Math.abs(value) > 0 && Math.abs(value) < .00001 ? value.toExponential(4) : value.toFixed(5)) : 'нет значения';
const cell = (tensor, y, x, channel) => tensor.data[(y * tensor.shape[1] + x) * tensor.shape[2] + channel];
const options = (count, text = i => String(i + 1)) => Array.from({ length: count }, (_, i) => `<option value="${i}">${text(i)}</option>`).join('');

/** A read-only view of one forward trace. Choosing a stage never runs training. */
export class CnnView {
  constructor(host, { getNetwork, onSelection = () => {} }) {
    this.host = host;
    this.getNetwork = getNetwork;
    this.onSelection = onSelection;
    this.stage = 1;
    this.filter = 0;
    this.channel = 0;
    this.y = 0;
    this.x = 0;
    this.source = 0;
    this.selection = { kind: 'conv', layer: 1, filter: 0, inChannel: 0, ky: 1, kx: 1 };
    this.active = true;
    this.paused = false;
    this.animationRequested = false;
    this.animationFrame = null;
    this.lastFrame = null;
    this.elapsed = 0;
    this.speed = 1;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.host.classList.add('cnn-view');
    this.host.innerHTML = `
      <nav class="cnn-view-stages" aria-label="Этапы свёрточной сети">${STAGES.map(([id, title, shape], i) => `<button type="button" data-stage="${i}" id="cnn-view-stage-${id}" aria-label="${i + 1}. ${title}, ${shape}"><span>${SHORT_STAGES[i]}</span><small>${shape}</small></button>`).join('')}</nav>
      <div class="cnn-view-controls">
        <button type="button" id="cnn-view-back">Шаг назад</button>
        <button type="button" id="cnn-view-next">Следующий шаг</button>
        <button type="button" id="cnn-view-pause" aria-pressed="false">Повторить проход</button>
        <label>Темп <select id="cnn-view-speed"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
        <a href="#cnn-view-title" id="cnn-view-jump">Окно и числа</a>
      </div>
      <p class="cnn-view-status" id="cnn-view-status" role="status">Выберите изображение и выполните распознавание.</p>
      <section id="cnn-view-result" hidden>
        <div class="cnn-view-heading"><h3 id="cnn-view-title" tabindex="-1"></h3><span id="cnn-view-shape"></span></div>
        <p id="cnn-view-description" class="cnn-view-description"></p>
        <div class="cnn-view-selection">
          <label id="cnn-view-filter-label"><span id="cnn-view-filter-caption">Фильтр</span> <select id="cnn-view-filter"></select></label>
          <label id="cnn-view-channel-label">Входной канал <select id="cnn-view-channel"></select></label>
          <label id="cnn-view-row-label">Строка <input id="cnn-view-row" type="number" min="1" value="1"></label>
          <label id="cnn-view-column-label">Столбец <input id="cnn-view-column" type="number" min="1" value="1"></label>
          <label id="cnn-view-source-label" hidden>Элемент 0–255 <input id="cnn-view-source" type="number" min="0" max="255" value="0"></label>
        </div>
        <div class="cnn-view-maps" id="cnn-view-maps">
          <figure id="cnn-view-input-figure"><figcaption id="cnn-view-input-caption"></figcaption><canvas id="cnn-view-input-canvas" width="480" height="480" role="img"></canvas><p id="cnn-view-input-scale"></p></figure>
          <figure id="cnn-view-output-figure"><figcaption id="cnn-view-output-caption"></figcaption><canvas id="cnn-view-output-canvas" width="480" height="480" role="img"></canvas><p id="cnn-view-output-scale"></p></figure>
        </div>
        <p class="cnn-view-cell-value" id="cnn-view-cell-value"></p>
        <div id="cnn-view-calculation"></div>
        <details id="cnn-view-all-maps"><summary>Все карты этого этапа</summary><div class="cnn-view-thumbnails" id="cnn-view-thumbnails"></div></details>
      </section>
      <section class="cnn-view-change" id="cnn-view-change" hidden aria-label="Изменение выбранного веса"></section>`;
    this.$ = id => this.host.querySelector(`#cnn-view-${id}`);
    this.host.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => this.setStage(Number(button.dataset.stage))));
    this.$('back').addEventListener('click', () => this.setStage(Math.max(0, this.stage - 1)));
    this.$('next').addEventListener('click', () => this.setStage(Math.min(STAGES.length - 1, this.stage + 1)));
    this.$('pause').addEventListener('click', () => {
      if (!this.forward) return;
      if (!this.animationRequested) { this.animationRequested = true; this.paused = false; }
      else this.paused = !this.paused;
      this.syncAnimation();
    });
    this.$('speed').addEventListener('change', () => { this.speed = Number(this.$('speed').value); this.lastFrame = null; });
    for (const [id, property] of [['filter', 'filter'], ['channel', 'channel'], ['row', 'y'], ['column', 'x'], ['source', 'source']]) {
      this.$(id).addEventListener(id === 'filter' || id === 'channel' ? 'change' : 'input', () => {
        if (this.$(id).value === '') return;
        const value = Number(this.$(id).value);
        if (!Number.isFinite(value)) return;
        const next = Math.max(0, Math.trunc(value) - (id === 'row' || id === 'column' ? 1 : 0));
        if (this[property] === next) return;
        this[property] = next;
        this.paused = true;
        this.clampSelection();
        this.selectCurrentWeight();
        this.update();
        this.syncAnimation();
      });
    }
    this.$('calculation').addEventListener('click', event => {
      const button = event.target.closest('[data-kernel]');
      if (!button) return;
      const [ky, kx] = button.dataset.kernel.split(',').map(Number);
      this.selection = { kind: 'conv', layer: this.stage === 3 ? 2 : 1, filter: this.filter, inChannel: this.channel, ky, kx };
      this.paused = true;
      this.onSelection(this.getSelection());
      this.update(); this.syncAnimation();
      this.$('calculation').querySelector(`[data-kernel="${ky},${kx}"]`)?.focus({ preventScroll: true });
    });
    this.host.addEventListener('click', event => {
      if (event.target.closest('summary') && this.animationRequested && !this.paused) {
        this.paused = true; this.syncAnimation();
      }
    });
    this.$('output-canvas').addEventListener('click', event => {
      const tensor = this.outputTensor();
      if (!tensor || this.stage === 6) return;
      const rect = event.currentTarget.getBoundingClientRect();
      this.x = Math.min(tensor.shape[1] - 1, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * tensor.shape[1])));
      this.y = Math.min(tensor.shape[0] - 1, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * tensor.shape[0])));
      this.paused = true; this.update(); this.syncAnimation();
    });
    this.$('thumbnails').addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      this.filter = Number(button.dataset.filter); this.paused = true;
      this.selectCurrentWeight(); this.update(); this.syncAnimation();
      this.$('thumbnails').querySelector(`[data-filter="${this.filter}"]`)?.focus({ preventScroll: true });
    });
    this.visibilityHandler = () => this.syncAnimation();
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.reducedMotion.addEventListener('change', this.visibilityHandler);
    this.frame = time => {
      this.animationFrame = null;
      if (!this.shouldAnimate()) { this.lastFrame = null; return; }
      if (this.lastFrame !== null) this.elapsed += Math.min(250, time - this.lastFrame) * this.speed;
      this.lastFrame = time;
      if (this.elapsed >= 550) {
        this.elapsed %= 550;
        this.advanceCell();
        this.update(false);
      }
      this.animationFrame = requestAnimationFrame(this.frame);
    };
    this.update();
  }

  render(forward, { animate = false } = {}) {
    this.stopAnimation();
    this.forward = forward;
    this.$('change').hidden = true;
    this.elapsed = 0;
    this.clampSelection();
    this.animationRequested = Boolean(forward && animate);
    this.update(); this.syncAnimation();
  }

  setActive(active) { this.active = Boolean(active); this.syncAnimation(); }
  getSelection() {
    if (this.stage === 6) return { kind: 'dense', classId: DISPLAY_DIGITS[this.filter], source: this.source };
    return { ...this.selection };
  }
  refreshTheme() { this.update(false); }
  stopAnimation() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null; this.lastFrame = null;
    this.animationRequested = false; this.paused = false;
    if (this.$) this.updateAnimationControls();
  }
  shouldAnimate() { return Boolean(this.forward && this.active && this.animationRequested && !this.paused && !this.reducedMotion.matches && !document.hidden); }
  syncAnimation() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null; this.lastFrame = null;
    if (this.shouldAnimate()) this.animationFrame = requestAnimationFrame(this.frame);
    this.updateAnimationControls();
  }
  updateAnimationControls() {
    const button = this.$('pause');
    button.disabled = !this.forward || this.reducedMotion.matches;
    button.textContent = this.reducedMotion.matches ? 'Статический показ' : !this.animationRequested ? 'Повторить проход' : this.paused ? 'Продолжить' : 'Пауза';
    button.setAttribute('aria-pressed', String(this.paused));
    this.$('status').textContent = !this.forward ? 'Выберите изображение и выполните распознавание.' : this.reducedMotion.matches ? 'Движение отключено настройкой устройства. Этапы и ячейки доступны вручную.' : this.animationRequested && !this.paused ? 'Повтор готового расчёта. Окно движется по выбранной карте; веса не меняются.' : 'Показ остановлен. Выберите ячейку и разберите её расчёт; веса не меняются.';
  }
  setStage(stage) {
    this.stage = stage; this.filter = 0; this.channel = 0; this.y = 0; this.x = 0;
    this.elapsed = 0; this.lastFrame = null;
    this.clampSelection(); this.selectCurrentWeight(); this.update();
  }
  outputTensor() {
    const t = this.forward?.trace;
    if (!t) return null;
    return [t.input, t.conv1.a, t.pool1.output, t.conv2.a, t.pool2.output, t.pool2.output, null][this.stage];
  }
  clampSelection() {
    const tensor = this.outputTensor();
    if (tensor) {
      this.filter = Math.min(this.filter, tensor.shape[2] - 1);
      this.y = Math.min(this.y, tensor.shape[0] - 1); this.x = Math.min(this.x, tensor.shape[1] - 1);
    } else this.filter = Math.min(9, this.filter);
    this.channel = Math.min(this.stage === 3 ? 7 : 0, this.channel);
    this.source = Math.min(255, this.source);
  }
  selectCurrentWeight() {
    if (this.stage === 1 || this.stage === 3) this.selection = { kind: 'conv', layer: this.stage === 1 ? 1 : 2, filter: this.filter, inChannel: this.channel, ky: this.selection.ky ?? 1, kx: this.selection.kx ?? 1 };
    if (this.stage === 6) this.selection = { kind: 'dense', classId: DISPLAY_DIGITS[this.filter], source: this.source };
    this.onSelection(this.getSelection());
  }
  advanceCell() {
    const tensor = this.outputTensor();
    if (tensor) { this.x++; if (this.x >= tensor.shape[1]) { this.x = 0; this.y = (this.y + 1) % tensor.shape[0]; } }
    else this.source = (this.source + 1) % 256;
  }

  update(rebuildThumbnails = true) {
    const openDetails = this.lastRenderedStage === this.stage ? [...this.$('calculation').querySelectorAll('details[open][id]')].map(item => item.id) : [];
    this.host.querySelectorAll('[data-stage]').forEach(button => button.setAttribute('aria-current', Number(button.dataset.stage) === this.stage ? 'step' : 'false'));
    this.$('back').disabled = this.stage === 0;
    this.$('next').disabled = this.stage === 6;
    this.$('result').hidden = !this.forward;
    this.$('jump').hidden = !this.forward;
    if (!this.forward) { this.updateAnimationControls(); return; }
    const [id, title, shape] = STAGES[this.stage];
    this.$('title').textContent = title;
    this.$('shape').textContent = shape;
    const tensor = this.outputTensor();
    const count = tensor ? tensor.shape[2] : 10;
    this.$('filter-label').hidden = this.stage === 0;
    this.$('filter-caption').textContent = this.stage === 6 ? 'Цифра' : this.stage === 1 || this.stage === 3 ? 'Фильтр' : 'Карта';
    if (this.$('filter').options.length !== count || this.$('filter').dataset.stage !== id) {
      this.$('filter').innerHTML = options(count, i => this.stage === 6 ? String(DISPLAY_DIGITS[i]) : String(i + 1));
      this.$('filter').dataset.stage = id;
    }
    this.$('filter').value = String(this.filter);
    this.$('channel-label').hidden = this.stage !== 3;
    if (!this.$('channel').options.length) this.$('channel').innerHTML = options(8);
    this.$('channel').value = String(this.channel);
    for (const [name, value, max] of [['row', this.y, tensor?.shape[0]], ['column', this.x, tensor?.shape[1]]]) {
      this.$(`${name}-label`).hidden = !tensor;
      this.$(name).max = String(max || 1); this.$(name).value = String(value + 1);
    }
    this.$('source-label').hidden = this.stage !== 6;
    this.$('source').value = String(this.source);
    this.$('output-figure').hidden = this.stage === 0;
    this.$('maps').hidden = this.stage === 6;
    this.$('all-maps').hidden = this.stage === 0 || this.stage === 6;
    if (this.stage === 1 || this.stage === 3) this.renderConv();
    else if (this.stage === 2 || this.stage === 4) this.renderPool();
    else if (this.stage === 5) this.renderFlatten();
    else if (this.stage === 6) this.renderOutput();
    else this.renderInput();
    for (const id of openDetails) { const details = this.host.querySelector(`#${id}`); if (details) details.open = true; }
    this.lastRenderedStage = this.stage;
    if (rebuildThumbnails && tensor && tensor.shape[2] > 1) this.renderThumbnails(tensor);
    this.updateAnimationControls();
  }

  drawMap(canvas, tensor, channel, { padding = 0, window = null, selected = null } = {}) {
    const context = canvas.getContext('2d');
    const [height, width, channels] = tensor.shape;
    const size = canvas.width;
    const colors = getComputedStyle(this.host);
    const signal = colors.getPropertyValue('--signal').trim() || '#496fe5';
    const ink = colors.getPropertyValue('--ink').trim() || '#152039';
    const background = colors.getPropertyValue('--panel-soft').trim() || '#e8edf4';
    let max = 0;
    // One scale for every channel of this tensor; show it explicitly after each new trace.
    for (const value of tensor.data) max = Math.max(max, Math.abs(value));
    const scale = max || 1;
    const cw = size / (width + padding * 2), ch = size / (height + padding * 2);
    context.clearRect(0, 0, size, size);
    context.fillStyle = background; context.fillRect(0, 0, size, size);
    for (let y = -padding; y < height + padding; y++) for (let x = -padding; x < width + padding; x++) {
      const padded = y < 0 || x < 0 || y >= height || x >= width;
      const px = (x + padding) * cw, py = (y + padding) * ch;
      const value = padded ? 0 : cell(tensor, y, x, Math.min(channel, channels - 1));
      const alpha = Math.abs(value) / scale;
      context.fillStyle = padded ? background : value >= 0 ? `rgba(73,111,229,${.09 + alpha * .85})` : `rgba(184,101,25,${.09 + alpha * .85})`;
      context.fillRect(px + .7, py + .7, cw - 1.4, ch - 1.4);
      if (padded) {
        context.fillStyle = ink; context.font = '15px Consolas, monospace'; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText('0', px + cw / 2, py + ch / 2);
      }
    }
    if (window) {
      context.strokeStyle = signal; context.lineWidth = 6;
      context.strokeRect((window.x + padding) * cw + 2, (window.y + padding) * ch + 2, window.size * cw - 4, window.size * ch - 4);
    }
    if (selected) {
      context.strokeStyle = ink; context.lineWidth = 5;
      context.strokeRect((selected.x + padding) * cw + 2, (selected.y + padding) * ch + 2, cw - 4, ch - 4);
    }
    canvas.setAttribute('aria-label', `Карта ${channel + 1}, ${height} строк, ${width} столбцов. Значения от 0 до ${number(max)}. Ячейку можно выбрать полями строки и столбца.`);
    return max;
  }
  drawPair(input, output, { inputChannel = this.channel, padding = 0, window = null } = {}) {
    const a = this.drawMap(this.$('input-canvas'), input, inputChannel, { padding, window });
    const b = this.drawMap(this.$('output-canvas'), output, this.filter, { selected: { y: this.y, x: this.x } });
    this.$('input-scale').textContent = `Цвет: 0 … ${number(a)}${padding ? '. Внешняя рамка: добавленные нули' : ''}`;
    this.$('output-scale').textContent = `Цвет: 0 … ${number(b)}; общая шкала для всех карт этого этапа`;
  }
  renderInput() {
    const input = this.forward.trace.input;
    this.$('description').textContent = 'Каждый пиксель даёт одно число яркости от 0 до 1. Координаты в полях начинаются с 1.';
    this.$('input-caption').textContent = 'Общий вход 16×16';
    const max = this.drawMap(this.$('input-canvas'), input, 0, { selected: { y: this.y, x: this.x } });
    this.$('input-scale').textContent = `Цвет: 0 … ${number(max)}`;
    this.$('cell-value').textContent = `Строка ${this.y + 1}, столбец ${this.x + 1}: ${number(cell(input, this.y, this.x, 0))}`;
    this.$('calculation').replaceChildren();
  }
  renderConv() {
    const layer = this.stage === 1 ? 1 : 2;
    const trace = this.forward.trace;
    const input = layer === 1 ? trace.input : trace.pool1.output;
    const output = layer === 1 ? trace.conv1.a : trace.conv2.a;
    const calculation = this.getNetwork().inspectConv(layer, this.filter, this.y, this.x, trace);
    this.$('description').textContent = layer === 1 ? 'Один набор из 9 весов проходит по всему изображению. Отрицательная сумма после ReLU становится нулём.' : 'Один фильтр собирает 72 произведения: по 9 из каждого из 8 входных каналов. Смещение прибавляется один раз.';
    this.$('input-caption').textContent = `Окно 3×3 · входной канал ${this.channel + 1}`;
    this.$('output-caption').textContent = `Карта фильтра ${this.filter + 1} после ReLU`;
    this.drawPair(input, output, { padding: 1, window: { y: this.y - 1, x: this.x - 1, size: 3 } });
    this.$('cell-value').textContent = `Выход [${this.y + 1}, ${this.x + 1}]: ${number(calculation.a)}`;
    const terms = calculation.terms.filter(term => term.inChannel === this.channel);
    const rows = terms.map(term => `<tr><td>${term.ky + 1}, ${term.kx + 1}</td><td>${number(term.input)}${term.padded ? ' <span class="cnn-view-padding">нуль за краем</span>' : ''}</td><td><button type="button" data-kernel="${term.ky},${term.kx}" aria-pressed="${this.selection.kind === 'conv' && this.selection.ky === term.ky && this.selection.kx === term.kx}">${number(term.weight)}</button></td><td>${number(term.product)}</td></tr>`).join('');
    const sums = Array.from(calculation.channelSums);
    this.$('calculation').innerHTML = `
      <div class="cnn-view-formula"><div><span>Σ произведений</span><strong>${number(sums.reduce((sum, value) => sum + value, 0))}</strong></div><div><span>Смещение b</span><strong>${number(calculation.bias)}</strong></div><div><span>Сумма z</span><strong>${number(calculation.z)}</strong></div><div><span>ReLU: max(0, z)</span><strong>${number(calculation.a)}</strong></div></div>
      <details class="cnn-view-details" id="cnn-view-kernel-details"><summary>Разобрать 9 произведений канала ${this.channel + 1} и выбрать вес</summary><div class="cnn-view-table-wrap"><table><thead><tr><th>Ядро: строка, столбец</th><th>Вход a</th><th>Общий вес w</th><th>a × w</th></tr></thead><tbody>${rows}</tbody></table></div></details>
      ${layer === 2 ? `<details class="cnn-view-details"><summary>Суммы всех 8 каналов и все 72 произведения</summary><div class="cnn-view-channel-sums">${sums.map((value, i) => `<div><span>Канал ${i + 1}</span><strong>${number(value)}</strong></div>`).join('')}</div><div class="cnn-view-table-wrap"><table id="cnn-view-all-terms"><thead><tr><th>Канал</th><th>Ядро</th><th>Вход</th><th>Вес</th><th>Произведение</th></tr></thead><tbody>${calculation.terms.map(term => `<tr><td>${term.inChannel + 1}</td><td>${term.ky + 1}, ${term.kx + 1}</td><td>${number(term.input)}${term.padded ? ' (добавленный 0)' : ''}</td><td>${number(term.weight)}</td><td>${number(term.product)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
  }
  renderPool() {
    const layer = this.stage === 2 ? 1 : 2;
    const trace = this.forward.trace;
    const input = layer === 1 ? trace.conv1.a : trace.conv2.a;
    const output = layer === 1 ? trace.pool1.output : trace.pool2.output;
    const calculation = this.getNetwork().inspectPool(layer, this.filter, this.y, this.x, trace);
    this.$('description').textContent = 'Из блока 2×2 остаётся наибольшее значение. Число каналов не меняется. При равенстве выбирается первая позиция при чтении по строкам.';
    this.$('input-caption').textContent = `Блок 2×2 · карта ${this.filter + 1}`;
    this.$('output-caption').textContent = `Карта ${this.filter + 1} после уменьшения`;
    this.drawPair(input, output, { inputChannel: this.filter, window: { y: this.y * 2, x: this.x * 2, size: 2 } });
    this.$('cell-value').textContent = `Максимум блока: ${number(calculation.max)}`;
    const maximum = calculation.cells.findIndex(item => item.selected);
    this.$('calculation').innerHTML = `<div class="cnn-view-pool-values">${calculation.cells.map((item, i) => `<div class="${i === maximum ? 'cnn-view-is-max' : ''}"><span>Строка ${item.y + 1}, столбец ${item.x + 1}</span><strong>${number(item.value)}</strong><small>${i === maximum ? 'Выбранный максимум' : ' '}</small></div>`).join('')}</div><p>У pooling нет обучаемых весов. При обратном проходе градиент поступает в выбранную позицию максимума.</p>`;
  }
  renderFlatten() {
    const tensor = this.forward.trace.pool2.output;
    const index = (this.y * tensor.shape[1] + this.x) * tensor.shape[2] + this.filter;
    const value = this.forward.trace.flat[index];
    this.$('description').textContent = '16 карт по 4×4 превращаются в 256 чисел. Значения сохраняются; порядок: строка, столбец, затем канал.';
    this.$('input-caption').textContent = `Карта ${this.filter + 1} размера 4×4`;
    this.$('output-figure').hidden = true;
    const max = this.drawMap(this.$('input-canvas'), tensor, this.filter, { selected: { y: this.y, x: this.x } });
    this.$('input-scale').textContent = `Цвет: 0 … ${number(max)}`;
    this.$('cell-value').textContent = `flat[${index}] = ${number(value)}`;
    this.$('calculation').innerHTML = `<p class="cnn-view-index-formula">(${this.y} × 4 + ${this.x}) × 16 + ${this.filter} = ${index}</p><p>В этой формуле координаты и номера каналов начинаются с 0. Выше в полях показаны номера с 1.</p>`;
  }
  renderOutput() {
    const trace = this.forward.trace;
    const network = trace.parameters;
    const classId = DISPLAY_DIGITS[this.filter];
    const weight = network.dense.weights[classId * 256 + this.source];
    const value = trace.flat[this.source];
    this.$('description').textContent = 'Каждая цифра получает взвешенную сумму всех 256 значений и смещение. Softmax превращает десять сумм в распределение с суммой 100%.';
    this.$('cell-value').textContent = `Цифра ${classId}: logit = ${number(trace.logits[classId])}; softmax = ${number(trace.probabilities[classId])}`;
    this.$('calculation').innerHTML = `<div class="cnn-view-formula"><div><span>flat[${this.source}]</span><strong>${number(value)}</strong></div><div><span>Выбранный вес</span><strong>${number(weight)}</strong></div><div><span>Произведение</span><strong>${number(value * weight)}</strong></div><div><span>Смещение</span><strong>${number(network.dense.biases[classId])}</strong></div></div><details class="cnn-view-details"><summary>Все 256 вкладов в ответ «${classId}»</summary><div class="cnn-view-table-wrap"><table><thead><tr><th>Элемент</th><th>Вход</th><th>Вес</th><th>Произведение</th></tr></thead><tbody>${Array.from(trace.flat, (v, i) => `<tr><td>${i}</td><td>${number(v)}</td><td>${number(network.dense.weights[classId * 256 + i])}</td><td>${number(v * network.dense.weights[classId * 256 + i])}</td></tr>`).join('')}</tbody></table></div></details><p>Доля softmax не доказывает точность распознавания любого почерка.</p>`;
  }
  renderThumbnails(tensor) {
    this.$('thumbnails').innerHTML = Array.from({ length: tensor.shape[2] }, (_, channel) => `<button type="button" data-filter="${channel}" aria-pressed="${channel === this.filter}"><canvas width="96" height="96" aria-hidden="true"></canvas><span>Карта ${channel + 1}</span></button>`).join('');
    this.$('thumbnails').querySelectorAll('canvas').forEach((canvas, channel) => this.drawMap(canvas, tensor, channel));
  }

  showWeightChange(change) {
    if (!change) { this.$('change').hidden = true; return; }
    const selection = change.selection;
    const label = selection?.kind === 'conv'
      ? `Свёртка ${selection.layer}, фильтр ${selection.filter + 1}, входной канал ${selection.inChannel + 1}, вес ядра [${selection.ky + 1}, ${selection.kx + 1}]`
      : selection?.kind === 'dense' ? `Выход «${selection.classId}», вес при flat[${selection.source}]` : 'Выбранный вес';
    const contributions = change.contributions || [];
    const sum = contributions.reduce((total, item) => total + item.contribution, 0);
    this.$('change').hidden = false;
    this.$('change').innerHTML = `<h3>Один шаг: изменение выбранного веса</h3><p>${label}</p><div class="cnn-view-formula"><div><span>До шага</span><strong>${number(change.oldWeight)}</strong></div><div><span>Градиент dL/dw</span><strong>${number(change.gradient)}</strong></div><div><span>Скорость η</span><strong>${number(change.learningRate)}</strong></div><div><span>Изменение −η × dL/dw</span><strong>${number(change.deltaWeight)}</strong></div><div><span>После шага</span><strong>${number(change.newWeight)}</strong></div></div><p>${change.gradient === 0 ? 'Градиент равен нулю: этот вес в данном шаге не изменился.' : 'Новый вес равен старому весу плюс показанное изменение.'}</p>${contributions.length ? `<details class="cnn-view-details"><summary>Сумма вкладов в градиент (${contributions.length}) = ${number(sum)}</summary><p>${selection?.kind === 'conv' ? 'Один вес используется в разных позициях. Его градиент складывается из произведений входа и dL/dz в каждой позиции.' : 'У выбранного веса выходного слоя один вклад: значение flat умножается на производную ошибки по logit.'}</p><div class="cnn-view-table-wrap"><table id="cnn-view-gradient-terms"><thead><tr><th>${selection?.kind === 'conv' ? 'Позиция выхода' : 'Входной элемент'}</th><th>Вход</th><th>dL/dz</th><th>Вклад</th></tr></thead><tbody>${contributions.map(item => `<tr><td>${item.source === undefined ? `${item.y + 1}, ${item.x + 1}` : `flat[${item.source}]`}</td><td>${number(item.input)}${item.padded ? ' (добавленный 0)' : ''}</td><td>${number(item.delta)}</td><td>${number(item.contribution)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
  }
}
