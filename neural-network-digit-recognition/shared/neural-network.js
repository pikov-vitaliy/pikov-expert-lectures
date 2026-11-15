const MODEL_VERSION = 1;
export const MAX_LOGIT_MAGNITUDE = 1e6;

export function crossEntropyFromLogits(logits, label) {
  if (!logits || !Number.isInteger(label) || label < 0 || label >= logits.length) {
    throw new RangeError('Label is outside the output layer');
  }
  let maximum = -Infinity;
  for (const logit of logits) {
    if (!Number.isFinite(logit)) throw new RangeError('Logits must be finite');
    maximum = Math.max(maximum, logit);
  }
  let exponentialSum = 0;
  for (const logit of logits) exponentialSum += Math.exp(logit - maximum);
  return (maximum - logits[label]) + Math.log(exponentialSum);
}

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

function toBase64(array) {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function fromBase64(value, expectedLength, name) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new TypeError(`Invalid base64 data for ${name}`);
  }
  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new TypeError(`Invalid base64 data for ${name}`);
  }
  if (binary.length !== expectedLength * 4) {
    throw new RangeError(`Invalid ${name} length`);
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const result = new Float32Array(bytes.buffer);
  if (!result.every(Number.isFinite)) throw new TypeError(`Invalid ${name} data`);
  return result;
}

export class DigitNetwork {
  constructor({ sizes = [256, 16, 12, 10], seed = 20261114 } = {}) {
    if (!Array.isArray(sizes) || sizes.length < 2 || sizes.some((size) => !Number.isInteger(size) || size < 1)) {
      throw new TypeError('Invalid layer sizes');
    }
    this.sizes = [...sizes];
    this.steps = 0;
    const random = randomGenerator(seed);
    this.layers = sizes.slice(1).map((outputSize, index) => {
      const inputSize = sizes[index];
      const limit = Math.sqrt(6 / (inputSize + outputSize));
      const weights = new Float32Array(inputSize * outputSize);
      for (let position = 0; position < weights.length; position += 1) {
        weights[position] = (random() * 2 - 1) * limit;
      }
      return { weights, biases: new Float32Array(outputSize) };
    });
    this.activations = [];
  }

  forward(input) {
    if (!input || typeof input.length !== 'number' || input.length !== this.sizes[0]) {
      throw new RangeError(`Input must contain ${this.sizes[0]} values`);
    }
    let current = input instanceof Float32Array ? input : Float32Array.from(input);
    if (!current.every(Number.isFinite)) throw new TypeError('Input values must be finite');
    const activations = [current];
    const sums = [];
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex += 1) {
      const layer = this.layers[layerIndex];
      const outputSize = this.sizes[layerIndex + 1];
      const output = new Float32Array(outputSize);
      const layerSums = new Float64Array(outputSize);
      for (let neuron = 0; neuron < outputSize; neuron += 1) {
        let sum = layer.biases[neuron];
        for (let source = 0; source < current.length; source += 1) {
          sum += layer.weights[neuron * current.length + source] * current[source];
        }
        if (!Number.isFinite(sum) || Math.abs(sum) > MAX_LOGIT_MAGNITUDE) {
          throw new RangeError('Numerical range exceeded during forward pass');
        }
        layerSums[neuron] = sum;
        output[neuron] = layerIndex === this.layers.length - 1 ? sum : sigmoid(sum);
      }
      sums.push(layerSums);
      activations.push(output);
      current = output;
    }
    const logits = sums.at(-1);
    const maximum = Math.max(...logits);
    const exponentials = Float64Array.from(logits, (logit) => Math.exp(logit - maximum));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    const probabilities = Float32Array.from(exponentials, (value) => value / total);
    if (!probabilities.every(Number.isFinite)) throw new RangeError('Forward pass produced invalid probabilities');
    activations[activations.length - 1] = probabilities;
    this.activations = activations;
    let prediction = 0;
    for (let digit = 1; digit < probabilities.length; digit += 1) {
      if (probabilities[digit] > probabilities[prediction]) prediction = digit;
    }
    return {
      activations,
      sums,
      logits,
      probabilities,
      prediction,
      confidence: probabilities[prediction],
    };
  }

  prepareTrainingStep(input, label, learningRate = 0.35, selection = null) {
    if (!Number.isSafeInteger(this.steps) || this.steps < 0 || this.steps >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Training steps cannot be incremented safely');
    }
    if (!Number.isInteger(label) || label < 0 || label >= this.sizes.at(-1)) {
      throw new RangeError('Label is outside the output layer');
    }
    if (!Number.isFinite(learningRate) || learningRate <= 0) {
      throw new RangeError('Learning rate must be positive');
    }
    const result = this.forward(input);
    // The lesson must retain its input even when the drawing buffer is reused.
    result.activations[0] = Float32Array.from(result.activations[0]);
    const deltas = new Array(this.layers.length);
    deltas[deltas.length - 1] = Float64Array.from(result.probabilities,
      (probability, neuron) => probability - (neuron === label ? 1 : 0));
    for (let layerIndex = this.layers.length - 2; layerIndex >= 0; layerIndex -= 1) {
      const outputSize = this.sizes[layerIndex + 1];
      const nextLayer = this.layers[layerIndex + 1];
      const nextDelta = deltas[layerIndex + 1];
      const activation = result.activations[layerIndex + 1];
      const delta = new Float64Array(outputSize);
      for (let neuron = 0; neuron < outputSize; neuron += 1) {
        let error = 0;
        for (let target = 0; target < nextDelta.length; target += 1) {
          error += nextLayer.weights[target * outputSize + neuron] * nextDelta[target];
        }
        delta[neuron] = error * activation[neuron] * (1 - activation[neuron]);
      }
      deltas[layerIndex] = delta;
    }
    const weightsBefore = this.layers.map((layer) => new Float32Array(layer.weights));
    const biasesBefore = this.layers.map((layer) => new Float32Array(layer.biases));
    const weightsAfter = [];
    const biasesAfter = [];
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex += 1) {
      const inputActivation = result.activations[layerIndex];
      const weights = new Float32Array(weightsBefore[layerIndex].length);
      for (let neuron = 0; neuron < deltas[layerIndex].length; neuron += 1) {
        for (let source = 0; source < inputActivation.length; source += 1) {
          const index = neuron * inputActivation.length + source;
          weights[index] = weightsBefore[layerIndex][index]
            - learningRate * deltas[layerIndex][neuron] * inputActivation[source];
        }
      }
      const biases = Float32Array.from(biasesBefore[layerIndex],
        (bias, neuron) => bias - learningRate * deltas[layerIndex][neuron]);
      if (!weights.every(Number.isFinite) || !biases.every(Number.isFinite)) {
        throw new RangeError('Training step produced invalid parameters');
      }
      weightsAfter.push(weights);
      biasesAfter.push(biases);
    }
    const lastLayer = this.layers.length - 1;
    const selected = selection ? { ...selection } : { layer: lastLayer, target: label, source: 0 };
    const plan = {
      network: this, steps: this.steps, input: Float32Array.from(input), label, learningRate,
      selection: selected, forward: result, sums: result.sums, loss: crossEntropyFromLogits(result.logits, label),
      deltas, weightsBefore, biasesBefore, weightsAfter, biasesAfter,
    };
    this.weightChange(plan, selected.layer, selected.target, selected.source);
    return plan;
  }

  weightChange(plan, layer = plan.selection.layer, target = plan.selection.target, source = plan.selection.source) {
    if (plan.network !== this || !Number.isInteger(layer) || layer < 0 || layer >= this.layers.length) {
      throw new RangeError('Weight change must belong to the current network');
    }
    const inputCount = this.sizes[layer];
    if (!Number.isInteger(target) || target < 0 || target >= this.sizes[layer + 1] ||
        !Number.isInteger(source) || source < 0 || source >= inputCount) {
      throw new RangeError('Weight index is outside the network');
    }
    const index = target * inputCount + source;
    const gradient = plan.deltas[layer][target] * plan.forward.activations[layer][source];
    return {
      layer, target, source, gradient, learningRate: plan.learningRate,
      oldWeight: plan.weightsBefore[layer][index],
      deltaWeight: -plan.learningRate * gradient,
      newWeight: plan.weightsAfter[layer][index],
    };
  }

  applyTrainingStep(plan) {
    if (plan.network !== this || plan.steps !== this.steps ||
        !Number.isSafeInteger(this.steps) || this.steps < 0 || this.steps >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Training plan does not match the current network version');
    }
    for (let layer = 0; layer < this.layers.length; layer += 1) {
      if (!plan.weightsBefore[layer].every((weight, index) => weight === this.layers[layer].weights[index]) ||
          !plan.biasesBefore[layer].every((bias, index) => bias === this.layers[layer].biases[index])) {
        throw new Error('Training plan does not match the current parameters');
      }
    }
    const updated = new DigitNetwork({ sizes: this.sizes });
    updated.layers = plan.weightsAfter.map((weights, layer) => ({
      weights: new Float32Array(weights), biases: new Float32Array(plan.biasesAfter[layer]),
    }));
    updated.forward(plan.input);
    this.layers = updated.layers;
    this.activations = updated.activations;
    this.steps += 1;
  }

  trainExample(input, label, learningRate = 0.35) {
    const plan = this.prepareTrainingStep(input, label, learningRate);
    this.applyTrainingStep(plan);
    return { loss: plan.loss, prediction: plan.forward.prediction, confidence: plan.forward.confidence, plan };
  }

  evaluate(samples) {
    if (!Array.isArray(samples) || samples.length === 0) return { loss: 0, accuracy: 0 };
    let loss = 0;
    let correct = 0;
    for (const sample of samples) {
      const result = this.forward(sample.pixels);
      loss += crossEntropyFromLogits(result.logits, sample.label);
      if (result.prediction === sample.label) correct += 1;
    }
    return { loss: loss / samples.length, accuracy: correct / samples.length };
  }

  toJSON() {
    return {
      version: MODEL_VERSION,
      sizes: [...this.sizes],
      steps: this.steps,
      layers: this.layers.map((layer) => ({
        weights: toBase64(layer.weights),
        biases: toBase64(layer.biases),
      })),
    };
  }

  static fromJSON(value) {
    if (!value || typeof value !== 'object' || value.version !== MODEL_VERSION) {
      throw new TypeError('Unsupported model version');
    }
    const { sizes } = value;
    if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 6 ||
        sizes.some((size) => !Number.isInteger(size) || size < 1 || size > 4096) ||
        !Array.isArray(value.layers) || value.layers.length !== sizes.length - 1) {
      throw new TypeError('Invalid model shape');
    }
    const parameterCount = sizes.slice(1).reduce((sum, size, index) => sum + size * (sizes[index] + 1), 0);
    if (parameterCount > 2_000_000) throw new RangeError('Model shape is too large');
    const network = new DigitNetwork({ sizes });
    network.layers = value.layers.map((layer, index) => ({
      weights: fromBase64(layer?.weights, sizes[index] * sizes[index + 1], 'weights'),
      biases: fromBase64(layer?.biases, sizes[index + 1], 'biases'),
    }));
    if (!Number.isSafeInteger(value.steps) || value.steps < 0) throw new TypeError('Invalid training steps');
    network.steps = value.steps;
    return network;
  }
}
