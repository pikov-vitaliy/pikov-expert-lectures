import { hasDrawableInput } from './lab-state.js';

const STAGES = [
  ['Вход', 'Пиксели 16×16 превращены в 256 чисел от 0 до 1. Это тот же вход, который видит сеть.'],
  ['Сумма z', 'Выбранный нейрон складывает вклады w×a и своё смещение b.'],
  ['Активация a', 'Скрытый слой применяет sigmoid, выходной слой применяет softmax. Вес w и активация a обозначают разные величины.'],
  ['Ошибка · loss', 'Cross-entropy вычисляется устойчиво по логитам: logΣexp(z) − z правильного класса.'],
  ['Градиент', 'Для выбранной связи ∂L/∂w = δ нейрона × a входа. Знак градиента показывает направление роста ошибки. При SGD вес изменяется в противоположном направлении.'],
  ['Изменение веса', 'w_new = w_old − η·gradient. Значение w_new округлено в Float32, как в реальной модели.'],
];

export class TeacherView {
  constructor(options) {
    this.options = options;
    this.dialog = document.getElementById('teacher-dialog');
    this.stageIndex = 0;
    this.timer = null;
    this.playing = false;
    this.plan = null;
    document.getElementById('teacher-open').addEventListener('click', () => this.open());
    document.getElementById('teacher-target').addEventListener('change', () => this.prepare(Number(document.getElementById('teacher-target').value)));
    document.getElementById('teacher-next').addEventListener('click', () => this.move(1));
    document.getElementById('teacher-previous').addEventListener('click', () => this.move(-1));
    document.getElementById('teacher-play').addEventListener('click', () => this.playing ? this.stopPlayback() : this.startPlayback());
    document.getElementById('teacher-speed').addEventListener('change', () => {
      if (this.playing) this.schedule();
    });
    document.getElementById('teacher-cancel').addEventListener('click', () => this.dialog.close());
    document.getElementById('teacher-apply').addEventListener('click', () => this.apply());
    this.dialog.addEventListener('close', () => {
      this.stopPlayback();
      this.plan = null;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopPlayback();
    });
  }

  open() {
    const sample = this.options.getSample();
    const network = this.options.getNetwork();
    const pixels = this.options.getPixels();
    const prediction = this.options.getPrediction();
    if (this.options.getMode() !== 'training') {
      this.options.onError('Пошаговое обучение доступно только в режиме «Обучение».');
      return;
    }
    if (sample?.split === 'validation') {
      this.options.onError('Проверочный пример остаётся независимым. Выберите обучающий пример или рисунок.');
      return;
    }
    if (!hasDrawableInput(pixels)) {
      this.options.onError('Сначала выберите изображение или нарисуйте цифру.');
      return;
    }
    const label = sample?.label ?? prediction?.result.prediction;
    if (!Number.isInteger(label)) {
      this.options.onError('Для собственного рисунка сначала нажмите «Распознать», затем выберите правильную цифру в пошаговом разборе.');
      return;
    }
    const target = document.getElementById('teacher-target');
    target.value = String(label);
    target.disabled = Boolean(sample);
    if (this.prepare(label)) this.dialog.showModal();
  }

  prepare(label) {
    try {
      const network = this.options.getNetwork();
      const pixels = this.options.getPixels();
      const inspection = this.options.getInspection();
      const selection = this.options.getWeight?.() || (inspection
        ? { layer: inspection.layer - 1, target: inspection.index, source: inspection.incoming[0]?.source || 0 }
        : { layer: 2, target: label, source: 0 });
      this.plan = network.prepareTrainingStep(pixels, label, 0.35, selection);
      this.change = network.weightChange(this.plan);
      this.versions = { inputVersion: this.options.getInputVersion(), modelVersion: this.options.getModelVersion() };
      this.stageIndex = 0;
      this.stopPlayback();
      this.showStage();
      return true;
    } catch (error) {
      this.plan = null;
      document.getElementById('teacher-apply').disabled = true;
      this.options.onError('Не удалось подготовить учебный шаг: ' + error.message);
      return false;
    }
  }

  move(direction) {
    if (!this.plan) return;
    this.stopPlayback();
    this.stageIndex = Math.max(0, Math.min(STAGES.length - 1, this.stageIndex + direction));
    this.showStage();
  }

  showStage() {
    const [title, explanation] = STAGES[this.stageIndex];
    const { plan, change } = this;
    const { layer, target, source } = change;
    const z = plan.sums[layer][target];
    const bias = plan.network.layers[layer].biases[target];
    const activation = plan.forward.activations[layer + 1][target];
    const inputActivation = plan.forward.activations[layer][source];
    const delta = plan.deltas[layer][target];
    document.getElementById('teacher-stage-index').textContent = String(this.stageIndex + 1);
    document.getElementById('teacher-stage-title').textContent = title;
    document.getElementById('teacher-explanation').textContent = explanation;
    document.getElementById('teacher-label').textContent = `Метка ${plan.label} · слой ${layer + 1}, ${layer === 2 ? 'цифра ' + target : 'нейрон ' + (target + 1)}, вход ${source + 1}`;
    document.getElementById('teacher-previous').disabled = this.stageIndex === 0;
    document.getElementById('teacher-next').disabled = this.stageIndex === STAGES.length - 1;
    document.getElementById('teacher-play').disabled = this.stageIndex === STAGES.length - 1;
    document.getElementById('teacher-apply').disabled = this.stageIndex !== STAGES.length - 1;
    document.querySelectorAll('#teacher-stages li').forEach((item, index) => {
      if (index === this.stageIndex) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    document.getElementById('teacher-input').hidden = this.stageIndex !== 0;
    const formulas = [
      `256 входов · ненулевых пикселей: ${plan.input.filter((value) => value > 0).length}`,
      `z = Σ(w×a) + b = ${(z - bias).toFixed(8)} + ${bias.toFixed(8)} = ${z.toFixed(8)}`,
      `${layer === 2 ? 'a = softmax(z)[класс]' : 'a = 1 / (1 + exp(−z))'} = ${activation.toFixed(8)}`,
      `L = logΣexp(z_выход) − z_выход[${plan.label}] = ${plan.loss.toFixed(8)} · p_${plan.label}=${plan.forward.probabilities[plan.label].toExponential(6)}`,
      `gradient = δ × a = ${delta.toExponential(9)} × ${inputActivation.toFixed(8)} = ${change.gradient.toExponential(9)}`,
      `w_new = ${change.oldWeight.toFixed(9)} − 0,35 × (${change.gradient.toExponential(9)}) = ${change.newWeight.toFixed(9)}`,
    ];
    document.getElementById('teacher-calculation').textContent = formulas[this.stageIndex];
    if (this.stageIndex === 0) this.paintInput();
    document.getElementById('teacher-old-weight').textContent = change.oldWeight.toFixed(9);
    document.getElementById('teacher-rate').textContent = '0.35';
    document.getElementById('teacher-gradient-value').textContent = change.gradient.toExponential(9);
    document.getElementById('teacher-delta-weight').textContent = change.deltaWeight.toExponential(9);
    document.getElementById('teacher-new-weight').textContent = change.newWeight.toFixed(9);
  }

  paintInput() {
    const canvas = document.getElementById('teacher-input');
    const context = canvas.getContext('2d');
    const image = new ImageData(16, 16);
    this.plan.input.forEach((value, index) => {
      const shade = Math.round(value * 255);
      image.data[index * 4] = Math.round(shade * 0.92);
      image.data[index * 4 + 1] = Math.round(shade * 0.97);
      image.data[index * 4 + 2] = shade;
      image.data[index * 4 + 3] = 255;
    });
    context.putImageData(image, 0, 0);
  }

  startPlayback() {
    if (!this.plan || this.stageIndex === STAGES.length - 1) return;
    this.playing = true;
    document.getElementById('teacher-play').textContent = 'Пауза';
    this.schedule();
  }

  schedule() {
    clearTimeout(this.timer);
    const speed = Number(document.getElementById('teacher-speed').value);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.playing || document.hidden || !this.plan) return;
      this.stageIndex = Math.min(STAGES.length - 1, this.stageIndex + 1);
      this.showStage();
      if (this.playing && this.stageIndex < STAGES.length - 1) this.schedule();
      else this.stopPlayback();
    }, 1800 / speed);
  }

  stopPlayback() {
    clearTimeout(this.timer);
    this.timer = null;
    this.playing = false;
    document.getElementById('teacher-play').textContent = 'Показать шаги';
  }

  apply() {
    if (!this.plan || this.stageIndex !== STAGES.length - 1) return;
    this.stopPlayback();
    if (this.options.onApply(this.plan, this.versions)) this.dialog.close();
  }
}
