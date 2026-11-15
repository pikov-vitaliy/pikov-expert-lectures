import { CnnLab } from './cnn-lab.js';
import { DigitNetwork } from '/shared/neural-network.js';
import { DISPLAY_DIGITS, digitForClass } from '/shared/classes.js';
import { loadDataset } from './dataset.js';
import { InputController } from './input-controller.js';
import { NetworkView } from './network-view.js';
import { TeacherView } from './teacher-view.js';
import { canTrainSample, createPrediction, hasDrawableInput, isCurrentPrediction } from './lab-state.js';
import { MODEL_KEY, parseModel, readHistory, validateModel } from './model-store.js';
import { createTrainingRandom, EPOCH_COUNT, trainEpoch } from './training.js';

const $ = (id) => document.getElementById(id);
const THEME_KEY = 'ai-engineers-color-scheme';
const themeMeta = document.querySelector('meta[name="color-scheme"]');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');

function loadModel() {
  try {
    const serialized = localStorage.getItem(MODEL_KEY);
    return serialized ? { network: parseModel(serialized) } : {};
  } catch {
    return { error: 'Сохранённая модель повреждена или недоступна. Используются случайные веса.' };
  }
}

const savedModel = loadModel();
let network = savedModel.network || new DigitNetwork();
let dataset = [];
let trainingSamples = [];
let validationSamples = [];
let currentPrediction = null;
let selectedSample = null;
let selectedTarget = null;
let weightSelection = { layer: 2, target: 5, source: 0 };
let trainingToken = null;
let pendingFeedback = null;
// значение «Правильного ответа» до открытия диалога: «Отмена» и Esc возвращают его в обеих сетях
let stableAnswer = null;
let history = [];
let mode = 'training';
let inputVersion = 0;
let modelVersion = 0;
let toastTimer;
let importRevision = 0;
let example = 'mlp';
let cnn = null;
stableAnswer = $('correct-answer').value;

function showToast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  $('announcer').textContent = message;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}

function formatPercent(value, precision = 1) {
  return `${(value * 100).toFixed(precision).replace('.', ',')}%`;
}

function updateModelStatus() {
  if (example === 'cnn' && cnn) {
    $('model-status').classList.toggle('trained', cnn.network.steps > 0);
    $('model-status').lastElementChild.textContent = cnn.network.steps ? `CNN · ${cnn.network.steps} шагов` : 'CNN · случайные веса';
    return;
  }
  $('model-status').classList.toggle('trained', network.steps > 0);
  const lastDigit = network.steps % 10;
  const suffix = lastDigit === 1 && network.steps % 100 !== 11 ? 'шаг' : [2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(network.steps % 100) ? 'шага' : 'шагов';
  $('model-status').lastElementChild.textContent = network.steps > 0 ? `Обучена · ${network.steps} ${suffix}` : 'Случайные веса';
}

function persistModel() {
  try {
    localStorage.setItem(MODEL_KEY, JSON.stringify({ ...network.toJSON(), history }));
    return true;
  } catch {
    showToast('Не удалось сохранить модель в браузере. Используйте экспорт в JSON.');
    return false;
  }
}

function updateMetrics(metrics = validateModel(network, trainingSamples, validationSamples)) {
  $('loss-value').textContent = metrics.training.loss.toFixed(6);
  $('train-accuracy').textContent = formatPercent(metrics.training.accuracy);
  $('validation-accuracy').textContent = formatPercent(metrics.validation.accuracy);
  return metrics;
}

function renderHistory() {
  $('history-body').replaceChildren();
  for (const entry of history) {
    const row = document.createElement('tr');
    for (const value of [entry.epoch, entry.steps, entry.loss.toFixed(6), formatPercent(entry.trainAccuracy), formatPercent(entry.validationAccuracy)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    $('history-body').append(row);
  }
}

function syncControls() {
  if (example === 'cnn' && cnn) {
    cnn.sync();
    $('predict').disabled = cnn.busy || !dataset.length;
    $('train-one').disabled = cnn.busy || !canTrainSample(selectedSample, cnn.mode);
    $('train-one').textContent = 'Один шаг CNN на примере';
    $('train-one').title = selectedSample?.split === 'validation' ? 'Проверочный пример не обучает' : 'Показать шаг и подтвердить метку CNN';
    $('correct-answer').disabled = cnn.busy || cnn.mode !== 'training' || Boolean(selectedSample);
    $('label-hint').textContent = 'Во втором примере выходная цифра выбирает метку для CNN. Веса первого примера сохраняются.';
    return;
  }
  $('train-one').textContent = 'Один шаг на обучающем примере';
  $('label-hint').textContent = 'В обучении щелчок по выходу выбирает цифру. Кнопка «i» только показывает параметры.';
  const busy = Boolean(trainingToken);
  const hasPrediction = isCurrentPrediction(currentPrediction, inputVersion, modelVersion);
  const validationBlocked = selectedSample?.split === 'validation';
  $('predict').disabled = busy || dataset.length === 0;
  $('train-all').disabled = busy || dataset.length === 0 || mode !== 'training';
  $('train-one').disabled = busy || !canTrainSample(selectedSample, mode);
  $('train-one').title = validationBlocked ? 'Проверочный пример не участвует в обучении' : selectedSample ? 'Один шаг с меткой встроенного примера' : 'Для рисунка сначала распознайте и подтвердите метку';
  $('teacher-open').disabled = busy || dataset.length === 0 || mode !== 'training' || validationBlocked;
  $('export-model').disabled = busy;
  $('import-model').disabled = busy;
  $('correct-answer').disabled = busy || mode !== 'training' || Boolean(selectedSample);
  $('feedback-correct').disabled = busy || !hasPrediction || mode !== 'training' || validationBlocked || Boolean(currentPrediction?.feedbackHandled);
  $('feedback-correct').textContent = hasPrediction ? `Верно, обучить на цифре ${currentPrediction.result.prediction}` : 'Верно, обучить на показанной цифре';
  $('animation-toggle').disabled = !hasPrediction || view.reducedMotion.matches;
  $('animation-speed').disabled = !hasPrediction;
  for (const digit of DISPLAY_DIGITS) $(`choose-output-${digit}`).disabled = busy;
}

function updateInspector(inspection) {
  if (!inspection) return;
  const layerNames = ['Вход', 'Скрытый слой 1', 'Скрытый слой 2', 'Выходной слой'];
  const neuronName = inspection.layer === 3 ? ` · цифра ${digitForClass(inspection.index)}` : ` · нейрон ${inspection.index + 1}`;
  $('inspection-title').textContent = `${layerNames[inspection.layer]}${neuronName}`;
  $('sum-value').textContent = inspection.z.toFixed(6);
  $('activation-value').textContent = inspection.activation.toFixed(6);
  $('bias-value').textContent = inspection.bias.toFixed(6);
  $('neuron-picker').value = `${inspection.layer}:${inspection.index}`;
  $('inspection-copy').textContent = inspection.layer === 3
    ? 'Здесь a обозначает долю softmax для выбранного класса. Веса связей не являются активациями нейрона.'
    : 'z обозначает сумму до функции; a равно sigmoid(z). Каждый вес w можно посмотреть численно в таблице.';
  $('weight-list').replaceChildren();
  for (const edge of inspection.incoming.slice(0, 5)) {
    const chip = document.createElement('span');
    chip.className = `weight-chip ${edge.weight >= 0 ? 'positive' : 'negative'}`;
    chip.textContent = `a${edge.source + 1}: w=${edge.weight.toFixed(5)} · w·a=${(edge.weight * edge.activation).toFixed(5)}`;
    $('weight-list').append(chip);
  }
  weightSelection = {
    layer: inspection.layer - 1,
    target: inspection.index,
    source: inspection.incoming[0]?.source || 0,
  };
  if ($('weights-dialog').open) renderWeightsDialog();
}

const input = new InputController({
  preview: $('input-preview'),
  drawingCanvas: $('drawing-canvas'),
  fileInput: $('file-input'),
  uploadZone: $('upload-zone'),
  onChange: (_pixels, name) => {
    inputVersion += 1;
    selectedSample = null;
    $('sample-name').textContent = name;
    for (const button of $('sample-grid').querySelectorAll('button')) button.setAttribute('aria-pressed', 'false');
    invalidateResult();
    cnn?.invalidate();
    if (example === 'mlp') refreshPreview();
  },
  onError: showToast,
});

const view = new NetworkView($('network-canvas'), network, {
  tooltip: $('network-tooltip'),
  onSelection: updateInspector,
  onOutputChoice: chooseOutput,
  animationToggle: $('animation-toggle'),
  caption: $('network-caption'),
});

const teacher = new TeacherView({
  getNetwork: () => network,
  getPixels: () => input.pixels,
  getSample: () => selectedSample,
  getPrediction: () => currentPrediction,
  getMode: () => mode,
  getInspection: () => view.getInspection(),
  getWeight: selectedWeight,
  getInputVersion: () => inputVersion,
  getModelVersion: () => modelVersion,
  onError: showToast,
  onApply: (plan, versions) => {
    if (versions.inputVersion !== inputVersion || versions.modelVersion !== modelVersion || mode !== 'training' || selectedSample?.split === 'validation') {
      showToast('Вход или модель изменились. Старый учебный план отменён.');
      return false;
    }
    return performTrainingStep(plan.label, true, plan);
  },
});

const cnnHost = document.createElement('div');
cnnHost.id = 'cnn-example';
cnnHost.className = 'cnn-example';
cnnHost.hidden = true;
document.querySelector('.workspace').append(cnnHost);
cnn = new CnnLab(cnnHost, {
  getPixels: () => input.pixels,
  getInputVersion: () => inputVersion,
  getSample: () => selectedSample,
  onTarget: label => { $('correct-answer').value = String(label); },
  onTargetCancel: () => { if (stableAnswer !== null) $('correct-answer').value = stableAnswer; },
  onTargetCommit: label => { stableAnswer = String(label); },
  onError: showToast,
  onChange: () => { syncControls(); updateModelStatus(); },
});

function setExample(nextExample) {
  if (example === nextExample) return;
  importRevision += 1;
  cancelTraining();
  invalidateResult();
  cnn.cancelTraining();
  cnn.invalidate();
  example = nextExample;
  document.querySelector('.workspace').classList.toggle('cnn-active', example === 'cnn');
  for (const node of [$('network-title').closest('section'), $('output-title').closest('aside'), $('training-title').closest('section')]) node.hidden = example !== 'mlp';
  cnnHost.hidden = example !== 'cnn';
  $('example-mlp').setAttribute('aria-pressed', String(example === 'mlp'));
  $('example-cnn').setAttribute('aria-pressed', String(example === 'cnn'));
  cnn.setActive(example === 'cnn');
  if (example === 'mlp') refreshPreview();
  updateModelStatus();
  syncControls();
}
$('example-mlp').addEventListener('click', () => setExample('mlp'));
$('example-cnn').addEventListener('click', () => setExample('cnn'));

function refreshPreview(animate = false) {
  const result = network.forward(input.pixels);
  view.network = network;
  if (view.width) view.buildCache();
  view.render(result, { animate });
  if (view.selected) updateInspector(view.getInspection());
  return result;
}

function clearOutputs() {
  for (const digit of DISPLAY_DIGITS) {
    const row = $(`output-row-${digit}`);
    row.classList.remove('winner', 'target');
    row.querySelector('.confidence-bar').style.width = '0%';
    const output = row.querySelector('output');
    output.textContent = '—';
    output.title = '';
  }
}

function invalidateResult() {
  currentPrediction = null;
  pendingFeedback = null;
  selectedTarget = null;
  for (const id of ['feedback-dialog', 'teacher-dialog', 'weights-dialog']) {
    if ($(id).open) $(id).close();
  }
  view.stopAnimation();
  view.setTarget(null);
  $('predicted-digit').textContent = '—';
  $('confidence-copy').textContent = 'Нажмите «Распознать цифру» для текущего входа';
  clearOutputs();
  $('training-feedback').hidden = true;
  syncControls();
}

function updateOutputs(result) {
  for (const digit of DISPLAY_DIGITS) {
    const row = $(`output-row-${digit}`);
    const probability = result.probabilities[digit];
    row.classList.toggle('winner', result.prediction === digit);
    row.querySelector('.confidence-bar').style.width = `${probability * 100}%`;
    const output = row.querySelector('output');
    output.textContent = formatPercent(probability);
    output.title = (probability * 100).toFixed(8);
    output.setAttribute('aria-label', `Цифра ${digit}: ${formatPercent(probability, 6)}`);
  }
}

function publishPrediction() {
  currentPrediction = createPrediction(network, input.pixels, inputVersion, modelVersion);
  const result = currentPrediction.result;
  view.render(result, { animate: true });
  updateOutputs(result);
  $('predicted-digit').textContent = String(result.prediction);
  $('confidence-copy').textContent = `Доля softmax ${formatPercent(result.confidence)}${network.steps === 0 ? ' · веса ещё случайны' : ''}`;
  view.select(3, result.prediction);
  syncControls();
  return result;
}

function predict() {
  if (trainingToken || dataset.length === 0) return;
  if (!hasDrawableInput(input.pixels)) {
    invalidateResult();
    refreshPreview();
    showToast('Сначала нарисуйте цифру или выберите изображение. Пустой вход не является цифрой.');
    return;
  }
  try {
    publishPrediction();
  } catch (error) {
    showToast(`Не удалось распознать изображение: ${error.message}`);
  }
}

function populateNeuronPicker() {
  const select = $('neuron-picker');
  for (let layer = 1; layer < 4; layer += 1) {
    const group = document.createElement('optgroup');
    group.label = layer === 3 ? 'Выходной слой' : `Скрытый слой ${layer}`;
    for (let index = 0; index < network.sizes[layer]; index += 1) {
      const option = document.createElement('option');
      option.value = `${layer}:${index}`;
      option.textContent = layer === 3 ? `Цифра ${digitForClass(index)}` : `Нейрон ${index + 1}`;
      group.append(option);
    }
    select.append(group);
  }
  select.addEventListener('change', () => {
    const [layer, index] = select.value.split(':').map(Number);
    view.select(layer, index);
  });
}

function selectSample(sample) {
  $('correct-answer').value = String(sample.label);
  stableAnswer = String(sample.label);
  input.setPixels(sample.input, `Цифра ${sample.label} · вариант ${sample.variant + 1} · ${sample.split === 'train' ? 'обучение' : 'проверка'}`);
  selectedSample = sample;
  for (const button of $('sample-grid').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === sample.id));
  $('training-message').textContent = sample.split === 'validation'
    ? 'Это проверочный пример: обучение на нём запрещено, чтобы сохранить независимую проверку.'
    : 'Обучающий пример · 20 других примеров отложены для проверки';
  syncControls();
}

function renderSamples() {
  const list = $('sample-grid');
  list.replaceChildren();
  dataset.forEach((sample, index) => {
    const item = document.createElement('li');
    item.dataset.split = sample.split;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = sample.id;
    button.tabIndex = index === 0 ? 0 : -1;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Цифра ${sample.label}, вариант ${sample.variant + 1}, ${sample.split === 'train' ? 'обучающий пример' : 'проверочный пример'}`);
    const image = document.createElement('img');
    image.src = `/${sample.file}`;
    image.width = 16;
    image.height = 16;
    image.loading = 'lazy';
    image.alt = '';
    const label = document.createElement('span');
    label.textContent = String(sample.label);
    label.setAttribute('aria-hidden', 'true');
    button.append(image, label);
    button.addEventListener('click', () => { setGalleryTabStop(button); selectSample(sample); });
    item.append(button);
    list.append(item);
  });
}

function setGalleryTabStop(active) {
  for (const button of $('sample-grid').querySelectorAll('button')) button.tabIndex = button === active ? 0 : -1;
}

function galleryButtons() {
  return [...$('sample-grid').querySelectorAll('button')].filter(button => !button.parentElement.hidden);
}

$('sample-grid').addEventListener('keydown', event => {
  const buttons = galleryButtons();
  const index = buttons.indexOf(document.activeElement);
  if (index < 0) return;
  const columns = getComputedStyle($('sample-grid')).gridTemplateColumns.split(' ').length;
  const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
  let next;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  else if (event.key in moves) next = Math.max(0, Math.min(buttons.length - 1, index + moves[event.key]));
  else return;
  event.preventDefault();
  setGalleryTabStop(buttons[next]);
  buttons[next].focus();
});

function setSource(source) {
  const gallery = source === 'gallery';
  $('source-gallery').setAttribute('aria-pressed', String(gallery));
  $('source-draw').setAttribute('aria-pressed', String(!gallery));
  $('gallery-source').hidden = !gallery;
  $('draw-source').hidden = gallery;
  if (!gallery) input.useDrawing();
}

function cancelTraining() {
  if (!trainingToken) return;
  trainingToken.cancelled = true;
  trainingToken = null;
  modelVersion += 1;
}

function setMode(nextMode) {
  if (mode === nextMode) return;
  cancelTraining();
  mode = nextMode;
  view.setMode(mode);
  $('mode-training').setAttribute('aria-pressed', String(mode === 'training'));
  $('mode-recognition').setAttribute('aria-pressed', String(mode === 'recognition'));
  $('training-message').textContent = mode === 'training'
    ? '80 примеров для обучения · 20 отложены для проверки'
    : 'Веса заморожены · только прямой проход и инспекция';
  $('output-mode-hint').textContent = mode === 'training'
    ? 'Выбор выхода задаёт правильную цифру; «i» открывает параметры без обучения.'
    : 'Веса заморожены. Выбор выхода только исследует нейрон и не обучает сеть.';
  invalidateResult();
  refreshPreview();
  syncControls();
}

function selectedWeight() {
  return weightSelection || { layer: 2, target: 0, source: 0 };
}

function performTrainingStep(label, feedback = false, preparedPlan = null) {
  if (trainingToken || mode !== 'training' || dataset.length === 0) return false;
  if (selectedSample && !canTrainSample(selectedSample, mode)) {
    showToast('Проверочный пример нельзя использовать для обучения. Выберите обучающий пример или нарисуйте цифру.');
    return false;
  }
  if (!hasDrawableInput(input.pixels)) {
    showToast('Сначала нарисуйте цифру или выберите изображение.');
    return false;
  }
  importRevision += 1;
  const token = { single: true, cancelled: false };
  trainingToken = token;
  syncControls();
  try {
    const plan = preparedPlan || network.prepareTrainingStep(input.pixels, label, 0.35, selectedWeight());
    if (plan.label !== label || plan.network !== network) throw new Error('Учебный план не соответствует текущей модели и метке.');
    const change = network.weightChange(plan);
    const before = plan.forward.probabilities[label];
    network.applyTrainingStep(plan);
    modelVersion += 1;
    updateModelStatus();
    updateMetrics();
    persistModel();
    const result = publishPrediction();
    currentPrediction.feedbackHandled = true;
    const message = `Метка ${label}. Вероятность класса: ${formatPercent(before, 4)} → ${formatPercent(result.probabilities[label], 4)}. Loss до шага: ${plan.loss.toFixed(6)}. Вес слоя ${change.layer + 1}, нейрон ${change.target + 1}, вход ${change.source + 1}: ${change.oldWeight.toFixed(6)} → ${change.newWeight.toFixed(6)} (Δw=${change.deltaWeight.toExponential(4)}).`;
    if (feedback) {
      $('training-feedback').textContent = `${message} Один шаг для этого входа, не гарантия улучшения на других изображениях.`;
      $('training-feedback').hidden = false;
    }
    showToast(`Выполнен ровно один шаг обучения на цифре ${label}.`);
    return true;
  } catch (error) {
    showToast(`Не удалось выполнить шаг обучения: ${error.message}`);
    return false;
  } finally {
    if (trainingToken === token) trainingToken = null;
    syncControls();
  }
}

function requestFeedback(label, confirmed = false) {
  if (mode !== 'training') {
    view.select(3, label);
    return;
  }
  if (trainingToken) return;
  if (!isCurrentPrediction(currentPrediction, inputVersion, modelVersion)) {
    showToast('Сначала нажмите «Распознать» для текущего рисунка.');
    return;
  }
  if (currentPrediction.feedbackHandled) {
    showToast('Этот результат уже использован для обучения. Нажмите «Распознать» ещё раз перед новым шагом.');
    return;
  }
  if (selectedSample?.split === 'validation') {
    showToast('Проверочный пример нельзя обучить: он остаётся независимой проверкой.');
    return;
  }
  selectedTarget = label;
  $('correct-answer').value = String(label);
  view.setTarget(label);
  pendingFeedback = {
    label,
    pixels: currentPrediction.pixels,
    inputVersion,
    modelVersion,
  };
  if (confirmed) {
    const request = pendingFeedback;
    pendingFeedback = null;
    stableAnswer = String(request.label);
    performTrainingStep(request.label, true);
    return;
  }
  $('feedback-digit').textContent = String(label);
  $('feedback-context').textContent = `Текущая вероятность класса ${label}: ${formatPercent(currentPrediction.result.probabilities[label], 4)}. До подтверждения веса и число шагов не изменятся.`;
  $('feedback-dialog').showModal();
}

function chooseOutput(label) {
  if (mode === 'training') requestFeedback(label);
  else view.select(3, label);
}

function trainOne() {
  if (!canTrainSample(selectedSample, mode)) {
    showToast(selectedSample?.split === 'validation'
      ? 'Проверочный пример нельзя использовать для обучения.'
      : 'Для рисунка сначала распознайте его и подтвердите правильную метку.');
    return;
  }
  performTrainingStep(selectedSample.label, false);
}

async function yieldToBrowser() {
  if (globalThis.scheduler?.yield) await globalThis.scheduler.yield();
  else await new Promise((resolve) => setTimeout(resolve, 0));
}

async function trainAll() {
  if (trainingToken || dataset.length === 0 || mode !== 'training') {
    if (mode !== 'training') showToast('В режиме распознавания веса заморожены. Перейдите в «Обучение».');
    return;
  }
  importRevision += 1;
  const token = { cancelled: false };
  const targetNetwork = network;
  const random = createTrainingRandom();
  const cancelled = () => token.cancelled || targetNetwork !== network || mode !== 'training';
  trainingToken = token;
  history = [];
  renderHistory();
  syncControls();
  try {
    for (let epoch = 0; epoch < EPOCH_COUNT; epoch += 1) {
      if (cancelled()) return;
      const metrics = trainEpoch(targetNetwork, trainingSamples, random);
      if (cancelled()) return;
      modelVersion += 1;
      history.push({ epoch: epoch + 1, steps: network.steps, loss: metrics.loss, trainAccuracy: metrics.accuracy, validationAccuracy: network.evaluate(validationSamples).accuracy });
      updateMetrics({ training: metrics, validation: network.evaluate(validationSamples) });
      updateModelStatus();
      $('epoch-label').textContent = epoch === EPOCH_COUNT - 1 ? 'Обучение завершено' : `Эпоха ${epoch + 1} из ${EPOCH_COUNT}`;
      $('epoch-count').textContent = `${epoch + 1} / ${EPOCH_COUNT}`;
      $('training-progress').value = epoch + 1;
      $('training-message').textContent = `Эпоха ${epoch + 1}: только 80 обучающих примеров · validation отложена`;
      invalidateResult();
      refreshPreview();
      renderHistory();
      persistModel();
      await yieldToBrowser();
      if (cancelled()) return;
    }
    if (!cancelled()) showToast(`Обучение завершено: ${network.steps} шагов. Проверка: ${$('validation-accuracy').textContent}.`);
  } catch (error) {
    $('training-message').textContent = 'Обучение остановлено из-за ошибки';
    showToast(`Не удалось завершить обучение: ${error.message}`);
  } finally {
    if (trainingToken === token) {
      trainingToken = null;
      syncControls();
    }
  }
}

function exportModel() {
  if (trainingToken) return;
  const blob = new Blob([JSON.stringify(network.toJSON(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `digit-lab-model-${network.steps}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function importModel(file) {
  if (!file || trainingToken) return;
  const revision = ++importRevision;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Файл модели больше 5 МБ.');
    const serialized = await file.text();
    if (revision !== importRevision) return;
    const imported = parseModel(serialized);
    const metrics = validateModel(imported, trainingSamples, validationSamples);
    imported.forward(input.pixels);
    cancelTraining();
    network = imported;
    modelVersion += 1;
    history = [];
    view.setNetwork(network);
    invalidateResult();
    refreshPreview();
    updateMetrics(metrics);
    updateModelStatus();
    renderHistory();
    $('epoch-label').textContent = 'Импортированная модель · новый цикл';
    $('epoch-count').textContent = `— / ${EPOCH_COUNT}`;
    $('training-progress').value = 0;
    const saved = persistModel();
    view.select(3, network.forward(input.pixels).prediction);
    showToast(saved ? 'Модель импортирована и сохранена в браузере.' : 'Модель импортирована, но браузер не разрешил сохранение.');
  } catch (error) {
    if (revision !== importRevision) return;
    showToast(`Не удалось импортировать модель: ${error.message} Текущая сеть и сохранение не изменены.`);
  } finally {
    if (revision === importRevision) $('import-input').value = '';
  }
}

function resetModel() {
  importRevision += 1;
  cancelTraining();
  network = new DigitNetwork();
  modelVersion += 1;
  history = [];
  let storageFailed = false;
  try {
    localStorage.removeItem(MODEL_KEY);
    localStorage.removeItem('ai-engineers-digit-lab-history-v1');
  } catch {
    storageFailed = true;
  }
  view.setNetwork(network);
  invalidateResult();
  refreshPreview();
  updateModelStatus();
  updateMetrics();
  renderHistory();
  syncControls();
  $('epoch-label').textContent = 'Готов к первой эпохе';
  $('epoch-count').textContent = `0 / ${EPOCH_COUNT}`;
  $('training-progress').value = 0;
  $('training-message').textContent = 'Модель сброшена · новый цикл · validation не участвует в обучении';
  view.select(3, 5);
  showToast(storageFailed ? 'Веса сброшены, но браузер не разрешил очистить сохранение.' : 'Модель сброшена. Обучение остановлено, веса снова случайные.');
}

function renderWeightsDialog() {
  const inspection = view.getInspection();
  if (!inspection) return;
  $('weights-title').textContent = `${$('inspection-title').textContent}: ${inspection.incoming.length} связей`;
  $('weights-description').textContent = 'a обозначает активацию предыдущего нейрона, w обозначает вес связи, w×a обозначает вклад в z. Выберите любой вход по номеру.';
  $('weight-source').max = String(inspection.incoming.length);
  const body = $('all-weights-body');
  body.replaceChildren();
  for (const edge of [...inspection.incoming].sort((a, b) => a.source - b.source)) {
    const row = document.createElement('tr');
    row.id = `weight-row-${edge.source}`;
    for (const value of [edge.source + 1, edge.activation.toFixed(6), edge.weight.toFixed(8), (edge.weight * edge.activation).toFixed(8)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  showSelectedWeight();
}

function showSelectedWeight() {
  const inspection = view.getInspection();
  if (!inspection) return;
  const source = Number($('weight-source').value) - 1;
  const edge = inspection.incoming.find((item) => item.source === source);
  if (!edge) return;
  weightSelection = { layer: inspection.layer - 1, target: inspection.index, source };
  $('selected-weight').textContent = `w=${edge.weight.toFixed(8)} · w×a=${(edge.weight * edge.activation).toFixed(8)}`;
  $(`weight-row-${source}`)?.scrollIntoView({ block: 'nearest' });
}

function resolvedTheme() {
  const stored = themeMeta.content;
  return stored === 'light dark' ? (systemTheme.matches ? 'dark' : 'light') : stored;
}

function updateThemeControl() {
  $('theme-toggle').setAttribute('aria-label', resolvedTheme() === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  view.refreshTheme();
  cnn?.refreshTheme();
}

$('theme-toggle').addEventListener('click', () => {
  const target = resolvedTheme() === 'dark' ? 'light' : 'dark';
  const system = systemTheme.matches ? 'dark' : 'light';
  try {
    if (target === system) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, target);
  } catch {}
  themeMeta.content = target === system ? 'light dark' : target;
  updateThemeControl();
});
systemTheme.addEventListener('change', updateThemeControl);
window.addEventListener('storage', (event) => {
  if (event.key !== THEME_KEY) return;
  themeMeta.content = event.newValue || 'light dark';
  updateThemeControl();
});
$('help-button').addEventListener('click', () => $('lesson-dialog').showModal());
const PROJECTOR_KEY = 'ai-engineers-projector';
function syncProjector() {
  $('projector-toggle').setAttribute('aria-pressed', document.documentElement.classList.contains('projector') ? 'true' : 'false');
}
$('projector-toggle').addEventListener('click', () => {
  const on = document.documentElement.classList.toggle('projector');
  try { if (on) localStorage.setItem(PROJECTOR_KEY, '1'); else localStorage.removeItem(PROJECTOR_KEY); } catch {}
  syncProjector();
  window.dispatchEvent(new Event('resize'));  // холсты сети пересчитывают размеры
});
syncProjector();
$('close-lesson').addEventListener('click', () => $('lesson-dialog').close());
$('predict').addEventListener('click', () => example === 'cnn' ? cnn.predict() : predict());
$('source-gallery').addEventListener('click', () => setSource('gallery'));
$('source-draw').addEventListener('click', () => setSource('draw'));
$('clear-drawing').addEventListener('click', () => input.clearDrawing());
$('dataset-filter').addEventListener('change', () => {
  const filter = $('dataset-filter').value;
  for (const item of $('sample-grid').children) item.hidden = filter !== 'all' && item.dataset.split !== filter;
  const visible = galleryButtons();
  setGalleryTabStop(visible.find(button => button.tabIndex === 0) || visible[0]);
});
$('feedback-correct').addEventListener('click', () => {
  if (isCurrentPrediction(currentPrediction, inputVersion, modelVersion)) requestFeedback(currentPrediction.result.prediction, true);
});
$('cancel-feedback').addEventListener('click', () => $('feedback-dialog').close());
$('feedback-dialog').addEventListener('close', () => {
  // «Отмена» (или Esc): поле «Правильный ответ» возвращается к прежнему значению
  if (pendingFeedback && stableAnswer !== null) $('correct-answer').value = stableAnswer;
  pendingFeedback = null;
  selectedTarget = null;
  view.setTarget(null);
});
$('confirm-feedback').addEventListener('click', () => {
  const request = pendingFeedback;
  if (!request || trainingToken || mode !== 'training' || request.inputVersion !== inputVersion || request.modelVersion !== modelVersion || selectedSample?.split === 'validation') return;
  pendingFeedback = null;
  stableAnswer = String(request.label);
  $('feedback-dialog').close();
  performTrainingStep(request.label, true);
});
$('correct-answer').addEventListener('change', () => {
  const label = Number($('correct-answer').value);
  if (example === 'cnn') cnn.requestFeedback(label); else requestFeedback(label);
  // диалог не открылся (нет распознавания, проверочный пример, обучение идёт) – поле возвращается
  if (!$('feedback-dialog').open && !document.getElementById('cnn-feedback-dialog')?.open && stableAnswer !== null) {
    $('correct-answer').value = stableAnswer;
  }
});
$('mode-training').addEventListener('click', () => setMode('training'));
$('mode-recognition').addEventListener('click', () => setMode('recognition'));
$('train-one').addEventListener('click', () => example === 'cnn' ? cnn.trainOne() : trainOne());
$('train-all').addEventListener('click', trainAll);
$('export-model').addEventListener('click', exportModel);
$('import-model').addEventListener('click', () => $('import-input').click());
$('import-input').addEventListener('change', () => importModel($('import-input').files[0]));
$('reset-model').addEventListener('click', () => $('reset-dialog').showModal());
$('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
$('confirm-reset').addEventListener('click', () => { $('reset-dialog').close(); resetModel(); });
$('inspect-weights').addEventListener('click', () => { renderWeightsDialog(); $('weights-dialog').showModal(); });
$('close-weights').addEventListener('click', () => $('weights-dialog').close());
$('weight-source').addEventListener('input', showSelectedWeight);
for (const digit of DISPLAY_DIGITS) {
  $(`choose-output-${digit}`).addEventListener('click', () => chooseOutput(digit));
  $(`inspect-output-${digit}`).addEventListener('click', () => view.select(3, digit));
}
$('view-focus').addEventListener('click', () => {
  $('view-focus').setAttribute('aria-pressed', 'true');
  $('view-full').setAttribute('aria-pressed', 'false');
  view.setFocusMode(true);
});
$('view-full').addEventListener('click', () => {
  $('view-focus').setAttribute('aria-pressed', 'false');
  $('view-full').setAttribute('aria-pressed', 'true');
  view.setFocusMode(false);
});
$('animation-toggle').addEventListener('click', () => view.setPaused($('animation-toggle').textContent !== 'Продолжить'));
$('animation-speed').addEventListener('change', () => view.setSpeed(Number($('animation-speed').value)));

populateNeuronPicker();
updateModelStatus();
syncControls();
try {
  dataset = await loadDataset();
  trainingSamples = dataset.filter((sample) => sample.split === 'train').map((sample) => ({ pixels: sample.input, label: sample.label }));
  validationSamples = dataset.filter((sample) => sample.split === 'validation').map((sample) => ({ pixels: sample.input, label: sample.label }));
  try {
    updateMetrics();
  } catch {
    network = new DigitNetwork();
    savedModel.error = 'Сохранённая модель численно небезопасна. Используются случайные веса; старое сохранение не перезаписано.';
    updateMetrics();
  }
  history = readHistory(network.steps);
  renderHistory();
  if (network.steps > 0) {
    $('epoch-label').textContent = history.length ? `Модель восстановлена · история ${history.length} эпох` : 'Модель восстановлена · новый цикл';
    $('epoch-count').textContent = history.length ? `${history.length} / ${EPOCH_COUNT}` : `— / ${EPOCH_COUNT}`;
    $('training-progress').value = history.length;
  }
  cnn.setDataset(dataset);
  renderSamples();
  selectSample(dataset.find((sample) => sample.label === 5 && sample.variant === 0) || dataset[0]);
  view.select(3, 5);
  syncControls();
  if (savedModel.error) showToast(savedModel.error);
} catch (error) {
  $('sample-name').textContent = 'Примеры не загружены';
  $('predict').disabled = true;
  showToast(error.message);
}
