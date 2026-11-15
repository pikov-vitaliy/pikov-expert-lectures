import { CnnNetwork, CNN_LEARNING_RATE } from '/shared/cnn-network.js';
import { CnnView } from './cnn-view.js';
import { hasDrawableInput } from './lab-state.js';

const KEY = 'ai-engineers-digit-lab-cnn-v1';
const RATE = CNN_LEARNING_RATE;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const percent = (value, precision = 1) => `${(value * 100).toFixed(precision).replace('.', ',')}%`;
const yieldUI = () => new Promise(resolve => setTimeout(resolve, 0));
const importErrorMessage = error => {
  if (error instanceof SyntaxError) return 'Файл не является корректным JSON.';
  if (error.message === 'Модель больше 2 МБ.') return error.message;
  if (/type|version/i.test(error.message)) return 'Нужен файл свёрточной модели CNN поддерживаемой версии. Экспорт MLP здесь не подходит.';
  if (/numerical|finite|range|number/i.test(error.message)) return 'Параметры содержат недопустимые числа или могут вызвать переполнение.';
  return 'Проверьте структуру файла, размеры параметров и счётчик шагов CNN.';
};

export class CnnLab {
  constructor(host, options) {
    this.host = host;
    this.options = options;
    this.mode = 'training';
    this.active = false;
    this.token = null;
    this.revision = 0;
    this.importRevision = 0;
    this.result = null;
    this.pending = null;
    this.history = [];
    this.samples = [];
    this.network = new CnnNetwork();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) {
        this.network = CnnNetwork.fromJSON(saved.model || saved);
        this.history = Array.isArray(saved.history) ? saved.history.filter(row => row && typeof row === 'object' && Number.isSafeInteger(row.epoch) && row.epoch > 0 && Number.isSafeInteger(row.steps) && row.steps >= 0 && row.steps <= this.network.steps && Number.isFinite(row.loss) && row.loss >= 0 && Number.isFinite(row.train) && row.train >= 0 && row.train <= 1 && Number.isFinite(row.validation) && row.validation >= 0 && row.validation <= 1).slice(-100) : [];
      }
    } catch {
      options.onError('Сохранение CNN недоступно или повреждено. Для второго примера используются случайные веса.');
    }
    host.innerHTML = `
      <section class="panel cnn-main" aria-labelledby="cnn-title">
        <div class="panel-heading"><div><span class="axis-label">02 / ЛОКАЛЬНЫЕ ПРИЗНАКИ</span><h2 id="cnn-title">Свёртка. Окно за окном.</h2></div>
        <div class="mode-switch" aria-label="Режим свёрточной сети"><button id="cnn-mode-training" type="button" aria-pressed="true">Обучение</button><button id="cnn-mode-recognition" type="button" aria-pressed="false">Распознавание</button></div></div>
        <p class="cnn-intro">Один фильтр использует одни и те же веса в разных местах картинки. Выберите этап и остановите показ на любом участке. Карты уже рассчитаны; анимация объясняет применение фильтра.</p>
        <div class="cnn-training-strip"><button class="button primary" id="cnn-train-all" type="button">Обучить CNN: 12 эпох</button><button class="button ghost" id="cnn-stop-training" type="button" disabled>Остановить обучение</button><span id="cnn-progress" role="status">Новый цикл · 0 / 12</span></div>
        <div id="cnn-view-host"></div>
        <p class="control-hint">80 примеров для обучения, 20 для проверки. Веса меняются только при явном обучении. Скорость визуализации не меняет вычисления.</p>
        <dl class="metrics cnn-metrics"><div><dt>Ошибка · loss</dt><dd id="cnn-loss">—</dd></div><div><dt>Обучение</dt><dd id="cnn-train-accuracy">—</dd></div><div><dt>Проверка</dt><dd id="cnn-validation-accuracy">—</dd></div></dl>
        <details><summary>История CNN по эпохам</summary><div class="history-scroll"><table><thead><tr><th>Эпоха</th><th>Шаги</th><th>Loss</th><th>Train</th><th>Validation</th></tr></thead><tbody id="cnn-history"></tbody></table></div></details>
        <div class="model-actions"><button class="button ghost" id="cnn-export" type="button">Экспорт CNN</button><button class="button ghost" id="cnn-import" type="button">Импорт CNN</button><input id="cnn-import-input" type="file" accept="application/json,.json" hidden><button class="button ghost danger" id="cnn-reset" type="button">Сбросить CNN</button></div>
      </section>
      <aside class="panel output-panel cnn-output" aria-labelledby="cnn-output-title">
        <div class="panel-heading"><div><span class="axis-label">03 / ВЫХОД CNN</span><h2 id="cnn-output-title">Ответ сети</h2></div></div>
        <div class="verdict"><span>Наиболее похоже на</span><strong id="cnn-predicted-digit">—</strong><p id="cnn-confidence">Нажмите «Распознать цифру»</p></div>
        <table class="digit-outputs"><caption class="visually-hidden">Выбор правильной цифры и доли softmax свёрточной сети</caption><tbody>${DIGITS.map(digit => `<tr id="cnn-output-row-${digit}"><th scope="row"><button type="button" id="cnn-choose-${digit}" aria-label="Цифра ${digit}">${digit}</button></th><td><div class="confidence-track"><div class="confidence-bar"></div></div><output>—</output></td></tr>`).join('')}</tbody></table>
        <button class="button secondary full-width" id="cnn-feedback-correct" type="button" disabled>Верно, обучить CNN</button>
        <p id="cnn-output-hint" class="control-hint">Если сеть ошиблась, выберите правильную цифру. Перед обучением появится подтверждение.</p>
        <p id="cnn-training-feedback" class="training-feedback" role="status" hidden></p>
        <p class="control-hint">Доля softmax не гарантирует правильность. Небольшой синтетический набор служит для занятия.</p>
      </aside>
      <dialog id="cnn-feedback-dialog" class="confirm-dialog" aria-labelledby="cnn-feedback-title"><h2 id="cnn-feedback-title">Использовать для обучения CNN?</h2><p id="cnn-feedback-context"></p><p id="cnn-step-preview"></p><div class="dialog-actions"><button class="button ghost" id="cnn-cancel-feedback" type="button">Отмена</button><button class="button primary" id="cnn-confirm-feedback" type="button">Да, обучить CNN</button></div></dialog>
      <dialog id="cnn-reset-dialog" class="confirm-dialog" aria-labelledby="cnn-reset-title"><h2 id="cnn-reset-title">Сбросить только свёрточную сеть?</h2><p>Первый пример и рисунок сохранятся. В CNN снова будут случайные веса.</p><div class="dialog-actions"><button class="button ghost" id="cnn-cancel-reset" type="button">Отмена</button><button class="button primary" id="cnn-confirm-reset" type="button">Сбросить CNN</button></div></dialog>`;
    this.$ = id => host.querySelector('#' + id);
    this.view = new CnnView(this.$('cnn-view-host'), { getNetwork: () => this.network, onSelection: () => {} });
    this.$('cnn-mode-training').onclick = () => this.setMode('training');
    this.$('cnn-mode-recognition').onclick = () => this.setMode('recognition');
    this.$('cnn-train-all').onclick = () => this.trainAll();
    this.$('cnn-stop-training').onclick = () => { this.cancelTraining(); this.notify(); };
    for (const digit of DIGITS) this.$('cnn-choose-' + digit).onclick = () => this.requestFeedback(digit);
    this.$('cnn-feedback-correct').onclick = () => this.requestFeedback(this.result?.forward.prediction, true);
    this.$('cnn-cancel-feedback').onclick = () => this.$('cnn-feedback-dialog').close();
    this.$('cnn-feedback-dialog').addEventListener('close', () => { if (this.pending) this.options.onTargetCancel?.(); this.pending = null; });
    this.$('cnn-confirm-feedback').onclick = () => { const pending = this.pending; this.pending = null; this.$('cnn-feedback-dialog').close(); if (pending) { this.options.onTargetCommit?.(pending.label); this.applyFeedback(pending); } };
    this.$('cnn-export').onclick = () => this.exportModel();
    this.$('cnn-import').onclick = () => this.$('cnn-import-input').click();
    this.$('cnn-import-input').onchange = () => this.importModel(this.$('cnn-import-input').files[0]);
    this.$('cnn-reset').onclick = () => this.$('cnn-reset-dialog').showModal();
    this.$('cnn-cancel-reset').onclick = () => this.$('cnn-reset-dialog').close();
    this.$('cnn-confirm-reset').onclick = () => { this.$('cnn-reset-dialog').close(); this.reset(); };
    this.sync();
  }

  get busy() { return Boolean(this.token); }
  notify() { this.sync(); this.options.onChange?.(); }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ model: this.network.toJSON(), history: this.history })); }
    catch { this.options.onError('Браузер не сохранил CNN. Используйте экспорт.'); }
  }
  setDataset(samples) { this.samples = samples; this.metrics(); this.renderHistory(); this.notify(); }
  trainingSamples() { return this.samples.filter(s => s.split === 'train').map(s => ({ pixels: s.input, label: s.label })); }
  validationSamples() { return this.samples.filter(s => s.split === 'validation').map(s => ({ pixels: s.input, label: s.label })); }
  metrics() {
    if (!this.samples.length) return;
    const training = this.network.evaluate(this.trainingSamples());
    const validation = this.network.evaluate(this.validationSamples());
    this.$('cnn-loss').textContent = training.loss.toFixed(6);
    this.$('cnn-train-accuracy').textContent = percent(training.accuracy);
    this.$('cnn-validation-accuracy').textContent = percent(validation.accuracy);
    return { training, validation };
  }
  renderHistory() {
    this.$('cnn-history').replaceChildren();
    for (const row of this.history) {
      const tr = document.createElement('tr');
      for (const value of [row.epoch, row.steps, row.loss.toFixed(6), percent(row.train), percent(row.validation)]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      this.$('cnn-history').append(tr);
    }
    if (this.history.length) this.$('cnn-progress').textContent = `Сохранено ${this.history.length} эпох · ${this.network.steps} шагов`;
    else if (this.network.steps) this.$('cnn-progress').textContent = `Модель восстановлена · ${this.network.steps} шагов · новый цикл`;
    else this.$('cnn-progress').textContent = 'Новый цикл · 0 / 12';
  }
  current() { return this.result && this.result.inputVersion === this.options.getInputVersion() && this.result.revision === this.revision; }
  sync() {
    const validation = this.options.getSample()?.split === 'validation';
    this.$('cnn-mode-training').setAttribute('aria-pressed', String(this.mode === 'training'));
    this.$('cnn-mode-recognition').setAttribute('aria-pressed', String(this.mode === 'recognition'));
    this.$('cnn-train-all').disabled = this.busy || this.mode !== 'training' || !this.samples.length;
    this.$('cnn-stop-training').disabled = !this.busy;
    this.$('cnn-feedback-correct').disabled = this.busy || !this.current() || this.result?.handled || this.mode !== 'training' || validation;
    this.$('cnn-feedback-correct').textContent = this.current() ? `Верно, обучить на цифре ${this.result.forward.prediction}` : 'Верно, обучить CNN';
    this.$('cnn-export').disabled = this.busy;
    this.$('cnn-import').disabled = this.busy;
    for (const digit of DIGITS) this.$('cnn-choose-' + digit).disabled = this.busy;
    this.$('cnn-output-hint').textContent = this.mode === 'training'
      ? 'Выходная цифра задаёт правильный ответ. Обучение применяется только после подтверждения.'
      : 'Веса заморожены. Выбор цифры выделяет её долю softmax и не обучает.';
  }
  invalidate() {
    this.result = null;
    this.pending = null;
    if (this.$('cnn-feedback-dialog').open) this.$('cnn-feedback-dialog').close();
    this.view.render(null, { animate: false });
    this.$('cnn-predicted-digit').textContent = '—';
    this.$('cnn-confidence').textContent = 'Результат сброшен. Распознайте текущую картинку.';
    this.$('cnn-training-feedback').hidden = true;
    for (const digit of DIGITS) {
      const row = this.$('cnn-output-row-' + digit);
      row.classList.remove('winner', 'target');
      row.querySelector('output').textContent = '—';
      row.querySelector('.confidence-bar').style.width = '0%';
    }
    this.sync();
  }
  setActive(active) {
    this.active = active;
    if (!active) { this.cancelTraining(); this.invalidate(); }
    this.view.setActive(active);
    this.notify();
  }
  setMode(mode) { if (this.mode === mode) return; this.cancelTraining(); this.mode = mode; this.invalidate(); this.notify(); }
  refreshTheme() { this.view.refreshTheme(); }
  predict() {
    if (this.busy || !this.samples.length) return;
    const pixels = this.options.getPixels();
    if (!hasDrawableInput(pixels)) { this.invalidate(); this.options.onError('Сначала нарисуйте цифру или выберите изображение.'); this.notify(); return; }
    try { this.publish(this.network.forward(pixels)); } catch (error) { this.invalidate(); this.options.onError('CNN: ' + error.message); }
  }
  publish(forward, handled = false) {
    this.result = { forward, pixels: Float64Array.from(this.options.getPixels()), inputVersion: this.options.getInputVersion(), revision: this.revision, handled };
    this.$('cnn-predicted-digit').textContent = String(forward.prediction);
    this.$('cnn-confidence').textContent = `Доля softmax ${percent(forward.confidence)}${this.network.steps ? '' : ' · случайные веса'}`;
    for (const digit of DIGITS) {
      const row = this.$('cnn-output-row-' + digit);
      row.classList.toggle('winner', digit === forward.prediction);
      row.classList.remove('target');
      row.querySelector('output').textContent = percent(forward.probabilities[digit]);
      row.querySelector('.confidence-bar').style.width = `${forward.probabilities[digit] * 100}%`;
    }
    this.view.render(forward, { animate: this.active });
    this.notify();
  }
  requestFeedback(label, confirmed = false) {
    if (!Number.isInteger(label) || label < 0 || label > 9 || this.busy) return;
    if (this.mode !== 'training') {
      if (this.current()) {
        for (const digit of DIGITS) this.$('cnn-output-row-' + digit).classList.toggle('target', digit === label);
        this.$('cnn-confidence').textContent = `Цифра ${label}: доля softmax ${percent(this.result.forward.probabilities[label])} · веса заморожены`;
      }
      return;
    }
    if (!this.current() || this.result.handled) { this.options.onError('Сначала распознайте текущую картинку перед новым шагом CNN.'); return; }
    if (this.options.getSample()?.split === 'validation') { this.options.onError('Проверочный пример не участвует в обучении.'); return; }
    this.options.onTarget?.(label);
    try {
      const plan = this.network.prepareTrainingStep(this.result.pixels, label, RATE, this.view.getSelection());
      const change = this.network.weightChange(plan);
      const pending = { plan, change, label, inputVersion: this.options.getInputVersion(), revision: this.revision };
      if (confirmed) { this.options.onTargetCommit?.(label); this.applyFeedback(pending); return; }
      this.pending = pending;
      this.$('cnn-feedback-title').textContent = `Правильная цифра: ${label}. Использовать для обучения CNN?`;
      this.$('cnn-feedback-context').textContent = `До подтверждения веса неизменны. Loss: ${plan.loss.toFixed(6)}. Один шаг SGD, η=${RATE}.`;
      this.$('cnn-step-preview').textContent = `Выбранный вес: ${change.oldWeight.toPrecision(7)} − ${RATE} × (${change.gradient.toPrecision(7)}) = ${change.newWeight.toPrecision(7)}.`;
      this.$('cnn-feedback-dialog').showModal();
    } catch (error) { this.options.onTargetCancel?.(); this.options.onError('Не удалось подготовить обучение CNN: ' + error.message); }
  }
  applyFeedback(pending) {
    if (this.busy || this.mode !== 'training' || !this.active || pending.inputVersion !== this.options.getInputVersion() || pending.revision !== this.revision || this.options.getSample()?.split === 'validation') return;
    this.importRevision++;
    try {
      const before = pending.plan.forward.probabilities[pending.plan.label];
      this.network.applyTrainingStep(pending.plan);
      this.revision++;
      this.save(); this.metrics();
      this.publish(this.network.forward(this.options.getPixels()), true);
      this.view.showWeightChange(pending.change);
      this.$('cnn-training-feedback').textContent = `Принята цифра ${pending.plan.label}. Выполнен один шаг. Её доля: ${percent(before, 4)} / ${percent(this.result.forward.probabilities[pending.plan.label], 4)} до / после. Изменение одного ответа не гарантирует улучшения на других рисунках.`;
      this.$('cnn-training-feedback').hidden = false;
    } catch (error) { this.options.onError('Не удалось обучить CNN: ' + error.message); }
    this.notify();
  }
  trainOne() {
    const sample = this.options.getSample();
    if (this.busy || this.mode !== 'training' || sample?.split !== 'train') return;
    this.predict(); this.requestFeedback(sample.label);
  }
  cancelTraining() {
    if (this.token) { this.token.cancelled = true; this.token = null; this.metrics(); this.save(); this.$('cnn-progress').textContent = `Остановлено · ${this.network.steps} шагов`; }
    this.importRevision++;
  }
  async trainAll() {
    if (this.busy || this.mode !== 'training' || !this.active || !this.samples.length) return;
    this.importRevision++;
    const token = { cancelled: false }, network = this.network;
    this.token = token; this.history = []; this.invalidate(); this.notify();
    const samples = this.trainingSamples();
    const cancelled = () => token.cancelled || this.token !== token || this.network !== network || this.mode !== 'training' || !this.active;
    let random = 20261114;
    const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 4294967296; };
    try {
      for (let epoch = 1; epoch <= 12; epoch++) {
        const order = [...samples];
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        for (let i = 0; i < order.length; i++) {
          if (cancelled()) return;
          network.trainExample(order[i].pixels, order[i].label, RATE);
          this.revision++;
          if (i % 8 === 7) { this.save(); this.options.onChange?.(); await yieldUI(); }
        }
        if (cancelled()) return;
        const metrics = this.metrics();
        this.history.push({ epoch, steps: network.steps, loss: metrics.training.loss, train: metrics.training.accuracy, validation: metrics.validation.accuracy });
        this.renderHistory(); this.$('cnn-progress').textContent = `Эпоха ${epoch} / 12 · ${network.steps} шагов`;
        this.save(); await yieldUI();
      }
      this.$('cnn-progress').textContent = `Обучение завершено · ${network.steps} шагов`;
    } catch (error) { this.options.onError('Обучение CNN остановлено: ' + error.message); }
    finally { if (this.token === token) this.token = null; this.metrics(); this.save(); this.notify(); }
  }
  exportModel() {
    if (this.busy) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.network.toJSON(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `digit-lab-cnn-${this.network.steps}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  async importModel(file) {
    if (!file || this.busy) return;
    const revision = ++this.importRevision;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('Модель больше 2 МБ.');
      const text = await file.text();
      if (revision !== this.importRevision) return;
      const imported = CnnNetwork.fromJSON(JSON.parse(text));
      imported.evaluate(this.trainingSamples()); imported.evaluate(this.validationSamples()); imported.forward(this.options.getPixels());
      this.network = imported; this.revision++; this.history = [];
      this.invalidate(); this.metrics(); this.renderHistory(); this.save(); this.notify();
    } catch (error) { if (revision === this.importRevision) this.options.onError('Импорт CNN отклонён: ' + importErrorMessage(error)); }
    finally { if (revision === this.importRevision) this.$('cnn-import-input').value = ''; }
  }
  reset() {
    this.cancelTraining(); this.network = new CnnNetwork(); this.revision++; this.history = [];
    this.invalidate(); this.metrics(); this.renderHistory(); this.$('cnn-progress').textContent = 'Новый цикл · 0 / 12';
    this.save(); this.notify();
  }
}