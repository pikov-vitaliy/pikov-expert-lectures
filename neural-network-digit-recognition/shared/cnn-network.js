// Fixed 16x16 CNN: HWC tensors, cross-correlation (no kernel reversal), Float64 arithmetic.
// Kernel index: ((filter * inputChannels + channel) * 3 + ky) * 3 + kx.
const VERSION = 1;
const KIND = 'cnn16';
export const CNN_LEARNING_RATE = 0.03;
export const CNN_MAX_MAGNITUDE = 1e6;
const BLOCKS = ['conv1', 'conv2', 'dense'];
const COUNTS = { conv1: [72, 8], conv2: [1152, 16], dense: [2560, 10] };

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

function tensor(data, height, width, channels) {
  return { data, shape: [height, width, channels] };
}

function cloneParameters(parameters) {
  return Object.fromEntries(BLOCKS.map((name) => [name, {
    weights: new Float64Array(parameters[name].weights),
    biases: new Float64Array(parameters[name].biases),
  }]));
}

function blankParameters() {
  return Object.fromEntries(BLOCKS.map((name) => [name, {
    weights: new Float64Array(COUNTS[name][0]), biases: new Float64Array(COUNTS[name][1]),
  }]));
}

function checkNumber(value) {
  if (!Number.isFinite(value) || Math.abs(value) > CNN_MAX_MAGNITUDE) {
    throw new RangeError('CNN numerical range exceeded');
  }
}

// A conservative interval bound covers every canonical input, including unseen drawings.
// ReLU outputs can exceed one, so propagate their per-channel bounds through both convolutions.
function validateParameters(parameters) {
  for (const name of BLOCKS) {
    const block = parameters[name];
    for (const [index, field] of ['weights', 'biases'].entries()) {
      if (!block || block[field]?.length !== COUNTS[name][index] || !block[field].every(Number.isFinite)) {
        throw new TypeError('Invalid CNN parameter shape or values');
      }
    }
  }
  let upper = [1];
  for (const name of ['conv1', 'conv2']) {
    const block = parameters[name];
    const next = new Float64Array(block.biases.length);
    for (let filter = 0; filter < next.length; filter += 1) {
      let minimum = block.biases[filter];
      let maximum = minimum;
      for (let channel = 0; channel < upper.length; channel += 1) {
        for (let kernel = 0; kernel < 9; kernel += 1) {
          const contribution = block.weights[(filter * upper.length + channel) * 9 + kernel] * upper[channel];
          minimum += Math.min(0, contribution);
          maximum += Math.max(0, contribution);
        }
      }
      checkNumber(minimum);
      checkNumber(maximum);
      next[filter] = Math.max(0, maximum);
    }
    upper = next;
  }
  for (let target = 0; target < 10; target += 1) {
    let minimum = parameters.dense.biases[target];
    let maximum = minimum;
    for (let source = 0; source < 256; source += 1) {
      const contribution = parameters.dense.weights[target * 256 + source] * upper[source % 16];
      minimum += Math.min(0, contribution);
      maximum += Math.max(0, contribution);
    }
    checkNumber(minimum);
    checkNumber(maximum);
  }
}

function convolution(input, parameters) {
  const [height, width, channels] = input.shape;
  const filters = parameters.biases.length;
  const z = new Float64Array(height * width * filters);
  const a = new Float64Array(z.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let filter = 0; filter < filters; filter += 1) {
        let sum = parameters.biases[filter];
        for (let channel = 0; channel < channels; channel += 1) {
          for (let ky = 0; ky < 3; ky += 1) {
            const iy = y + ky - 1;
            if (iy < 0 || iy >= height) continue;
            for (let kx = 0; kx < 3; kx += 1) {
              const ix = x + kx - 1;
              if (ix < 0 || ix >= width) continue;
              sum += input.data[(iy * width + ix) * channels + channel] *
                parameters.weights[((filter * channels + channel) * 3 + ky) * 3 + kx];
            }
          }
        }
        checkNumber(sum);
        const index = (y * width + x) * filters + filter;
        z[index] = sum;
        a[index] = Math.max(0, sum);
      }
    }
  }
  return { z: tensor(z, height, width, filters), a: tensor(a, height, width, filters) };
}

function pool(input) {
  const [height, width, channels] = input.shape;
  const outputHeight = height / 2;
  const outputWidth = width / 2;
  const data = new Float64Array(outputHeight * outputWidth * channels);
  const argmax = new Int32Array(data.length);
  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        let maximum = -Infinity;
        let winner = -1;
        // Strict comparison keeps the first equal maximum: TL, TR, BL, BR.
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            const index = (((y * 2 + dy) * width) + x * 2 + dx) * channels + channel;
            if (input.data[index] > maximum) {
              maximum = input.data[index];
              winner = index;
            }
          }
        }
        const index = (y * outputWidth + x) * channels + channel;
        data[index] = maximum;
        argmax[index] = winner;
      }
    }
  }
  return { output: tensor(data, outputHeight, outputWidth, channels), argmax };
}

function forward(input, parameters) {
  if (!input || input.length !== 256) throw new RangeError('CNN input must contain 256 values');
  const pixels = Float64Array.from(input);
  if (!pixels.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new TypeError('CNN input values must be finite and between zero and one');
  }
  const trace = { input: tensor(pixels, 16, 16, 1), parameters: cloneParameters(parameters) };
  trace.conv1 = convolution(trace.input, trace.parameters.conv1);
  trace.pool1 = pool(trace.conv1.a);
  trace.conv2 = convolution(trace.pool1.output, trace.parameters.conv2);
  trace.pool2 = pool(trace.conv2.a);
  trace.flat = new Float64Array(trace.pool2.output.data);
  trace.logits = new Float64Array(10);
  for (let target = 0; target < 10; target += 1) {
    let sum = parameters.dense.biases[target];
    for (let source = 0; source < 256; source += 1) sum += parameters.dense.weights[target * 256 + source] * trace.flat[source];
    checkNumber(sum);
    trace.logits[target] = sum;
  }
  const maximum = Math.max(...trace.logits);
  const exponentials = Float64Array.from(trace.logits, (value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  trace.probabilities = Float64Array.from(exponentials, (value) => value / total);
  let prediction = 0;
  for (let index = 1; index < 10; index += 1) {
    if (trace.probabilities[index] > trace.probabilities[prediction]) prediction = index;
  }
  return { prediction, confidence: trace.probabilities[prediction], probabilities: trace.probabilities, trace };
}

function crossEntropy(logits, label) {
  if (!Number.isInteger(label) || label < 0 || label >= 10) throw new RangeError('CNN label must be from zero to nine');
  const maximum = Math.max(...logits);
  return maximum - logits[label] + Math.log(logits.reduce((sum, value) => sum + Math.exp(value - maximum), 0));
}

function unpool(gradient, operation, input) {
  const data = new Float64Array(input.data.length);
  for (let index = 0; index < gradient.length; index += 1) data[operation.argmax[index]] += gradient[index];
  return tensor(data, ...input.shape);
}

function convolutionBackward(input, operation, upstream, parameters) {
  const [height, width, channels] = input.shape;
  const filters = parameters.biases.length;
  const weights = new Float64Array(parameters.weights.length);
  const biases = new Float64Array(filters);
  const inputGradient = new Float64Array(input.data.length);
  const delta = new Float64Array(operation.z.data.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let filter = 0; filter < filters; filter += 1) {
        const outputIndex = (y * width + x) * filters + filter;
        const value = operation.z.data[outputIndex] > 0 ? upstream.data[outputIndex] : 0;
        delta[outputIndex] = value;
        biases[filter] += value;
        if (value === 0) continue;
        for (let channel = 0; channel < channels; channel += 1) {
          for (let ky = 0; ky < 3; ky += 1) {
            const iy = y + ky - 1;
            if (iy < 0 || iy >= height) continue;
            for (let kx = 0; kx < 3; kx += 1) {
              const ix = x + kx - 1;
              if (ix < 0 || ix >= width) continue;
              const inputIndex = (iy * width + ix) * channels + channel;
              const weightIndex = ((filter * channels + channel) * 3 + ky) * 3 + kx;
              weights[weightIndex] += value * input.data[inputIndex];
              inputGradient[inputIndex] += value * parameters.weights[weightIndex];
            }
          }
        }
      }
    }
  }
  return { weights, biases, delta: tensor(delta, height, width, filters), inputGradient: tensor(inputGradient, ...input.shape) };
}

function backward(trace, label) {
  const dense = { weights: new Float64Array(2560), biases: new Float64Array(trace.probabilities) };
  dense.biases[label] -= 1;
  const dFlat = new Float64Array(256);
  for (let target = 0; target < 10; target += 1) {
    for (let source = 0; source < 256; source += 1) {
      dense.weights[target * 256 + source] = dense.biases[target] * trace.flat[source];
      dFlat[source] += dense.biases[target] * trace.parameters.dense.weights[target * 256 + source];
    }
  }
  const conv2 = convolutionBackward(trace.pool1.output, trace.conv2,
    unpool(dFlat, trace.pool2, trace.conv2.a), trace.parameters.conv2);
  const conv1 = convolutionBackward(trace.input, trace.conv1,
    unpool(conv2.inputGradient.data, trace.pool1, trace.conv1.a), trace.parameters.conv1);
  return {
    gradients: { conv1: { weights: conv1.weights, biases: conv1.biases }, conv2: { weights: conv2.weights, biases: conv2.biases }, dense },
    deltas: { conv1: conv1.delta, conv2: conv2.delta, dense: new Float64Array(dense.biases) },
  };
}

function indexInRange(value, length) {
  return Number.isInteger(value) && value >= 0 && value < length;
}

function selectionIndex(selection) {
  if (selection?.kind === 'conv' && (selection.layer === 1 || selection.layer === 2)) {
    const channels = selection.layer === 1 ? 1 : 8;
    const filters = selection.layer === 1 ? 8 : 16;
    if (indexInRange(selection.filter, filters) && indexInRange(selection.inChannel, channels) &&
        indexInRange(selection.ky, 3) && indexInRange(selection.kx, 3)) {
      return { block: `conv${selection.layer}`, index: ((selection.filter * channels + selection.inChannel) * 3 + selection.ky) * 3 + selection.kx };
    }
  } else if (selection?.kind === 'dense' && indexInRange(selection.classId, 10) && indexInRange(selection.source, 256)) {
    return { block: 'dense', index: selection.classId * 256 + selection.source };
  }
  throw new RangeError('CNN weight selection is outside the model');
}

export class CnnNetwork {
  #plans = new WeakMap();
  #traces = new WeakSet();

  constructor({ seed = 20261114 } = {}) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('Invalid CNN seed');
    this.seed = seed;
    this.steps = 0;
    this.lastTrace = null;
    const random = randomGenerator(seed);
    const parameters = blankParameters();
    // He normal for ReLU convolutions; Xavier uniform for the linear output.
    for (const [name, fanIn] of [['conv1', 9], ['conv2', 72]]) {
      for (let index = 0; index < parameters[name].weights.length; index += 1) {
        const radius = Math.sqrt(-2 * Math.log(1 - random()));
        parameters[name].weights[index] = radius * Math.cos(2 * Math.PI * random()) * Math.sqrt(2 / fanIn);
      }
    }
    const limit = Math.sqrt(6 / 266);
    for (let index = 0; index < 2560; index += 1) parameters.dense.weights[index] = (random() * 2 - 1) * limit;
    Object.assign(this, parameters);
  }

  forward(input) {
    const result = forward(input, this);
    this.lastTrace = result.trace;
    this.#traces.add(result.trace);
    return result;
  }

  prepareTrainingStep(input, label, learningRate = CNN_LEARNING_RATE, selection = null) {
    if (!Number.isSafeInteger(this.steps) || this.steps < 0 || this.steps >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError('CNN steps cannot be incremented safely');
    }
    if (!Number.isInteger(label) || label < 0 || label > 9) throw new RangeError('CNN label must be from zero to nine');
    if (!Number.isFinite(learningRate) || learningRate <= 0) throw new RangeError('CNN learning rate must be positive');
    const selected = selection ? { ...selection } : { kind: 'conv', layer: 1, filter: 0, inChannel: 0, ky: 1, kx: 1 };
    selectionIndex(selected);
    const result = this.forward(input);
    const { gradients, deltas } = backward(result.trace, label);
    const before = cloneParameters(this);
    const after = blankParameters();
    for (const name of BLOCKS) {
      for (const field of ['weights', 'biases']) {
        for (let index = 0; index < after[name][field].length; index += 1) {
          after[name][field][index] = before[name][field][index] - learningRate * gradients[name][field][index];
        }
      }
    }
    validateParameters(after);
    const plan = {
      network: this, steps: this.steps, input: new Float64Array(result.trace.input.data), label, learningRate,
      selection: selected, forward: result, loss: crossEntropy(result.trace.logits, label), gradients, deltas,
      parametersBefore: cloneParameters(before), parametersAfter: cloneParameters(after),
    };
    this.#plans.set(plan, { steps: this.steps, before, after, input: new Float64Array(plan.input) });
    return plan;
  }

  applyTrainingStep(plan) {
    const record = this.#plans.get(plan);
    if (!record || record.steps !== this.steps || this.steps >= Number.MAX_SAFE_INTEGER) {
      throw new Error('CNN training plan is stale or already applied');
    }
    for (const name of BLOCKS) {
      for (const field of ['weights', 'biases']) {
        if (this[name][field].length !== record.before[name][field].length ||
            !this[name][field].every((value, index) => value === record.before[name][field][index])) {
          throw new Error('CNN training plan does not match the current parameters');
        }
      }
    }
    validateParameters(record.after);
    const result = forward(record.input, record.after);
    Object.assign(this, cloneParameters(record.after));
    this.steps += 1;
    this.#plans.delete(plan);
    this.lastTrace = result.trace;
    this.#traces.add(result.trace);
  }

  weightChange(plan, selection = plan.selection) {
    if (plan?.network !== this) throw new TypeError('CNN training plan belongs to another model');
    const { block, index } = selectionIndex(selection);
    const contributions = [];
    if (selection.kind === 'conv') {
      const input = selection.layer === 1 ? plan.forward.trace.input : plan.forward.trace.pool1.output;
      const delta = plan.deltas[block];
      const [height, width, channels] = input.shape;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const inputY = y + selection.ky - 1;
          const inputX = x + selection.kx - 1;
          const padded = inputY < 0 || inputY >= height || inputX < 0 || inputX >= width;
          const value = padded ? 0 : input.data[(inputY * width + inputX) * channels + selection.inChannel];
          const localDelta = delta.data[(y * width + x) * delta.shape[2] + selection.filter];
          contributions.push({ y, x, inputY, inputX, padded, input: value, delta: localDelta, contribution: localDelta * value });
        }
      }
    } else {
      const value = plan.forward.trace.flat[selection.source];
      const delta = plan.deltas.dense[selection.classId];
      contributions.push({ source: selection.source, input: value, delta, contribution: value * delta });
    }
    const gradient = plan.gradients[block].weights[index];
    return {
      selection: { ...selection }, oldWeight: plan.parametersBefore[block].weights[index], gradient,
      learningRate: plan.learningRate, deltaWeight: -plan.learningRate * gradient,
      newWeight: plan.parametersAfter[block].weights[index], contributions,
    };
  }

  inspectConv(layer, filter, y, x, trace = this.lastTrace) {
    if (!this.#traces.has(trace) || (layer !== 1 && layer !== 2)) throw new TypeError('Select a CNN forward trace and layer');
    const input = layer === 1 ? trace.input : trace.pool1.output;
    const [height, width, channels] = input.shape;
    const operation = trace[`conv${layer}`];
    const parameters = trace.parameters[`conv${layer}`];
    if (!indexInRange(filter, parameters.biases.length) || !indexInRange(y, height) || !indexInRange(x, width)) {
      throw new RangeError('CNN convolution cell is outside the feature map');
    }
    const terms = [];
    const channelSums = new Float64Array(channels);
    for (let inChannel = 0; inChannel < channels; inChannel += 1) {
      for (let ky = 0; ky < 3; ky += 1) {
        for (let kx = 0; kx < 3; kx += 1) {
          const inputY = y + ky - 1;
          const inputX = x + kx - 1;
          const padded = inputY < 0 || inputY >= height || inputX < 0 || inputX >= width;
          const value = padded ? 0 : input.data[(inputY * width + inputX) * channels + inChannel];
          const weight = parameters.weights[((filter * channels + inChannel) * 3 + ky) * 3 + kx];
          const product = value * weight;
          channelSums[inChannel] += product;
          terms.push({ inChannel, ky, kx, inputY, inputX, padded, input: value, weight, product });
        }
      }
    }
    const index = (y * width + x) * parameters.biases.length + filter;
    return { terms, channelSums, bias: parameters.biases[filter], z: operation.z.data[index], a: operation.a.data[index] };
  }

  inspectPool(layer, channel, y, x, trace = this.lastTrace) {
    if (!this.#traces.has(trace) || (layer !== 1 && layer !== 2)) throw new TypeError('Select a CNN forward trace and layer');
    const input = trace[`conv${layer}`].a;
    const operation = trace[`pool${layer}`];
    const [height, width, channels] = operation.output.shape;
    if (!indexInRange(channel, channels) || !indexInRange(y, height) || !indexInRange(x, width)) {
      throw new RangeError('CNN pooling cell is outside the feature map');
    }
    const index = (y * width + x) * channels + channel;
    const cells = [];
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const inputY = 2 * y + dy;
        const inputX = 2 * x + dx;
        const inputIndex = (inputY * input.shape[1] + inputX) * channels + channel;
        cells.push({ y: inputY, x: inputX, index: inputIndex, value: input.data[inputIndex], selected: inputIndex === operation.argmax[index] });
      }
    }
    return { cells, maxIndex: operation.argmax[index], max: operation.output.data[index] };
  }

  trainExample(input, label, learningRate = CNN_LEARNING_RATE) {
    const plan = this.prepareTrainingStep(input, label, learningRate);
    this.applyTrainingStep(plan);
    return { loss: plan.loss, prediction: plan.forward.prediction, confidence: plan.forward.confidence, plan };
  }

  evaluate(samples) {
    if (!Array.isArray(samples)) throw new TypeError('CNN evaluation samples must be an array');
    if (!samples.length) return { loss: 0, accuracy: 0 };
    let loss = 0;
    let correct = 0;
    for (const sample of samples) {
      const result = this.forward(sample.pixels);
      loss += crossEntropy(result.trace.logits, sample.label);
      if (result.prediction === sample.label) correct += 1;
    }
    return { loss: loss / samples.length, accuracy: correct / samples.length };
  }

  toJSON() {
    return { version: VERSION, kind: KIND, seed: this.seed, steps: this.steps,
      parameters: Object.fromEntries(BLOCKS.map((name) => [name, {
        weights: Array.from(this[name].weights), biases: Array.from(this[name].biases),
      }])) };
  }

  static fromJSON(value) {
    if (!value || value.kind !== KIND || value.version !== VERSION) throw new TypeError('Unsupported CNN model type or version');
    if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) throw new TypeError('Invalid CNN seed');
    if (!Number.isSafeInteger(value.steps) || value.steps < 0) throw new TypeError('Invalid CNN training steps');
    for (const name of BLOCKS) {
      for (const [index, field] of ['weights', 'biases'].entries()) {
        const values = value.parameters?.[name]?.[field];
        if (!Array.isArray(values) || values.length !== COUNTS[name][index] || !values.every(Number.isFinite)) {
          throw new TypeError('Invalid CNN parameter shape or values');
        }
      }
    }
    const network = new CnnNetwork({ seed: value.seed });
    const parameters = cloneParameters(value.parameters);
    validateParameters(parameters);
    Object.assign(network, parameters);
    network.steps = value.steps;
    return network;
  }
}
