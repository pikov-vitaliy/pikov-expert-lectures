import { DigitNetwork, MAX_LOGIT_MAGNITUDE } from '/shared/neural-network.js';

export const MODEL_KEY = 'ai-engineers-digit-lab-model-v1';
export const HISTORY_KEY = 'ai-engineers-digit-lab-history-v1';
export const MODEL_SIZES = [256, 16, 12, 10];

export function parseModel(serialized) {
  let value;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new TypeError('Файл не является корректным JSON.');
  }
  let restored;
  try {
    restored = DigitNetwork.fromJSON(value);
  } catch (error) {
    if (/version/i.test(error.message)) throw new TypeError('Версия модели не поддерживается.');
    if (/shape|length/i.test(error.message)) throw new TypeError('Размер или структура параметров модели неверны.');
    if (/base64|data/i.test(error.message)) throw new TypeError('Данные весов повреждены.');
    if (/steps/i.test(error.message)) throw new TypeError('Счётчик шагов модели повреждён.');
    throw new TypeError('Параметры модели повреждены или не являются конечными числами.');
  }
  if (restored.sizes.length !== MODEL_SIZES.length || restored.sizes.some((size, index) => size !== MODEL_SIZES[index])) {
    throw new TypeError('Несовместимая архитектура: ожидается 256→16→12→10.');
  }
  return restored;
}

export function validateModel(network, trainingSamples, validationSamples) {
  try {
    // All canonical pixels and hidden sigmoid activations lie in [0, 1].
    // Bound every neuron over this whole interval, not only the sample set.
    for (let index = 0; index < network.layers.length; index += 1) {
      const layer = network.layers[index];
      const inputCount = network.sizes[index];
      for (let neuron = 0; neuron < layer.biases.length; neuron += 1) {
        let minimum = layer.biases[neuron];
        let maximum = minimum;
        for (let source = 0; source < inputCount; source += 1) {
          const weight = layer.weights[neuron * inputCount + source];
          minimum += Math.min(0, weight);
          maximum += Math.max(0, weight);
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) ||
            minimum < -MAX_LOGIT_MAGNITUDE || maximum > MAX_LOGIT_MAGNITUDE) {
          throw new RangeError('Model exceeds the supported input range');
        }
      }
    }
    const training = network.evaluate(trainingSamples);
    const validation = network.evaluate(validationSamples);
    if (![training.loss, training.accuracy, validation.loss, validation.accuracy].every(Number.isFinite)) {
      throw new RangeError('Метрики модели не являются конечными числами.');
    }
    return { training, validation };
  } catch (error) {
    throw new RangeError('Числовой диапазон параметров небезопасен для этой лаборатории. Модель не импортирована.', { cause: error });
  }
}

export function readHistory(steps, storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(MODEL_KEY) || 'null');
    if (!value || !Number.isSafeInteger(steps) || steps < 0 || value.steps !== steps || !Array.isArray(value.history)) return [];
    return value.history.filter((entry) => entry && Number.isSafeInteger(entry.epoch) && entry.epoch > 0 &&
      Number.isSafeInteger(entry.steps) && entry.steps >= 0 && entry.steps <= steps &&
      Number.isFinite(entry.loss) && entry.loss >= 0 &&
      [entry.trainAccuracy, entry.validationAccuracy].every((accuracy) =>
        Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 1));
  } catch {
    return [];
  }
}
