import { DISPLAY_DIGITS, digitForClass, classForRow } from '/shared/classes.js';

export class NetworkView {
  constructor(canvas, network, { tooltip, onSelection, onOutputChoice, animationToggle, caption } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.network = network;
    this.tooltip = tooltip;
    this.onSelection = onSelection;
    this.onOutputChoice = onOutputChoice;
    this.animationToggle = animationToggle;
    this.caption = caption;
    this.selected = null;
    this.target = null;
    this.focused = true;
    this.activeEdges = [];
    this.cache = document.createElement('canvas');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.phase = 0;
    this.speed = 1;
    this.paused = false;
    this.animationRequested = false;
    this.animationFrame = null;
    this.lastFrame = null;
    this.onScreen = true;
    this.frame = (time) => {
      this.animationFrame = null;
      if (this.lastFrame !== null) this.phase += Math.max(0, time - this.lastFrame);
      this.lastFrame = time;
      this.draw(time);
      this.syncAnimation();
    };
    this.outputButtons = DISPLAY_DIGITS.map((digit, row) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `network-output-${digit}`;
      button.className = 'network-output-button';
      button.setAttribute('aria-label', `Выбрать правильную цифру ${digit}`);
      button.addEventListener('click', () => this.onOutputChoice?.(classForRow(row)));
      canvas.parentElement.append(button);
      return button;
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
      this.syncAnimation();
    });
    this.intersectionObserver.observe(canvas.parentElement);
    this.reducedMotion.addEventListener('change', () => this.syncAnimation());
    canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    canvas.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    canvas.addEventListener('click', (event) => {
      const hit = this.hitTest(this.localPoint(event));
      if (hit) this.select(hit.layer, hit.index);
    });
    document.addEventListener('visibilitychange', () => this.syncAnimation());
  }

  resize() {
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.cache.width = this.canvas.width;
    this.cache.height = this.canvas.height;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.cache.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    this.layout();
    this.buildCache();
    this.draw(performance.now());
  }

  layout() {
    const { width, height } = this;
    const positions = [];
    const inputPositions = [];
    const gridSize = Math.min(180, (height - 100) * 0.58, width * 0.24);
    const gridLeft = Math.max(18, width * 0.035);
    const gridTop = (height - gridSize) / 2;
    const cell = gridSize / 16;
    for (let index = 0; index < 256; index += 1) {
      inputPositions.push({ x: gridLeft + (index % 16 + 0.5) * cell, y: gridTop + (Math.floor(index / 16) + 0.5) * cell });
    }
    positions.push(inputPositions);
    const xPositions = [0, width * 0.43, width * 0.68, width * 0.89];
    for (let layer = 1; layer < 4; layer += 1) {
      const count = this.network.sizes[layer];
      const layerPositions = [];
      for (let index = 0; index < count; index += 1) {
        const row = layer === 3 ? DISPLAY_DIGITS.indexOf(index) : index;
        layerPositions.push({ x: xPositions[layer], y: 48 + (height - 96) * row / (count - 1) });
      }
      positions.push(layerPositions);
    }
    this.positions = positions;
    this.grid = { left: gridLeft, top: gridTop, size: gridSize, cell };
    this.nodeRadius = Math.max(9, Math.min(12, (height - 96) / 32));
    positions[3].forEach((position, classId) => {
      const button = this.outputButtons[DISPLAY_DIGITS.indexOf(classId)];
      button.style.left = `${position.x}px`;
      button.style.top = `${position.y}px`;
    });
  }

  palette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      positive: styles.getPropertyValue('--positive').trim(),
      negative: styles.getPropertyValue('--negative').trim(),
      signal: styles.getPropertyValue('--signal').trim(),
      ink: styles.getPropertyValue('--canvas-ink').trim(),
      muted: styles.getPropertyValue('--canvas-muted').trim(),
      bg: styles.getPropertyValue('--canvas-bg').trim(),
    };
  }

  buildCache() {
    if (!this.positions) return;
    const context = this.cache.getContext('2d');
    context.clearRect(0, 0, this.width, this.height);
    if (this.focused) return;
    const colors = this.palette();
    context.lineWidth = 0.45;
    for (let layer = 0; layer < 3; layer += 1) {
      const weights = this.network.layers[layer].weights;
      const inputCount = this.network.sizes[layer];
      for (let target = 0; target < this.network.sizes[layer + 1]; target += 1) {
        const end = this.positions[layer + 1][target];
        for (let source = 0; source < inputCount; source += 1) {
          const start = this.positions[layer][source];
          const weight = weights[target * inputCount + source];
          context.globalAlpha = 0.045 + Math.min(0.035, Math.abs(weight) * 0.025);
          context.strokeStyle = weight >= 0 ? colors.positive : colors.negative;
          context.beginPath();
          context.moveTo(start.x, start.y);
          context.lineTo(end.x, end.y);
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
  }

  setNetwork(network) {
    this.network = network;
    this.selected = null;
    this.target = null;
    this.stopAnimation();
    if (this.width) {
      this.layout();
      this.buildCache();
    }
  }

  refreshTheme() {
    if (this.width) this.buildCache();
    this.draw(performance.now());
  }

  setFocusMode(focused) {
    this.focused = focused;
    this.buildCache();
    this.draw(performance.now());
    this.updateAnimationUI();
  }

  updateAnimationUI() {
    if (this.animationToggle) {
      this.animationToggle.textContent = this.reducedMotion.matches ? 'Статично' : this.paused ? 'Продолжить' : 'Пауза';
      this.animationToggle.disabled = !this.animationRequested || this.reducedMotion.matches;
    }
    if (!this.caption) return;
    if (!this.animationRequested) {
      this.caption.textContent = 'Выбранный расчёт показан статично. Полный граф доступен отдельной кнопкой.';
      return;
    }
    const state = this.reducedMotion.matches ? 'Статичное выделение по настройке reduced-motion' : this.paused ? 'Пауза визуализации' : 'Повторная визуализация прямого прохода';
    this.caption.textContent = `${state} · Выделены наиболее сильные вклады w×a; в расчёте участвуют все связи. Анимация не обучает сеть.`;
  }

  render(result, { animate = false } = {}) {
    this.stopAnimation();
    this.result = result;
    this.computeActiveEdges();
    this.outputButtons.forEach((button, row) => {
      const classId = classForRow(row);
      const digit = digitForClass(classId);
      button.title = result ? `Цифра ${digit}: ${(result.probabilities[classId] * 100).toFixed(4)}%` : `Цифра ${digit}`;
    });
    this.animationRequested = animate;
    this.draw(performance.now());
    this.syncAnimation();
  }

  syncAnimation() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    const running = this.animationRequested && !this.paused && !this.reducedMotion.matches && !document.hidden && this.onScreen;
    if (running) {
      if (this.lastFrame === null) this.lastFrame = performance.now();
      this.animationFrame = requestAnimationFrame(this.frame);
    } else {
      this.lastFrame = null;
      this.draw(performance.now());
    }
    this.updateAnimationUI();
  }

  setPaused(paused) {
    this.paused = paused;
    this.syncAnimation();
  }

  setSpeed(speed) {
    if (!Number.isFinite(speed) || speed < 0.1 || speed > 4) throw new RangeError('Speed must be between 0.1 and 4');
    this.speed = speed;
    this.draw(performance.now());
  }

  setMode(mode) {
    this.outputButtons.forEach((button, row) => {
      const digit = digitForClass(classForRow(row));
      button.setAttribute('aria-label', mode === 'training' ? `Выбрать правильную цифру ${digit}` : `Исследовать нейрон цифры ${digit}`);
    });
  }

  stopAnimation() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.animationRequested = false;
    this.paused = false;
    this.phase = 0;
    this.lastFrame = null;
    this.updateAnimationUI();
  }

  setTarget(classId) {
    this.target = classId;
    this.outputButtons.forEach((button, row) => button.classList.toggle('target', classForRow(row) === classId));
    this.draw(performance.now());
  }

  computeActiveEdges() {
    this.activeEdges = [];
    if (!this.result) return;
    const edges = [];
    for (let layer = 0; layer < 3; layer += 1) {
      const weights = this.network.layers[layer].weights;
      const input = this.result.activations[layer];
      const inputCount = this.network.sizes[layer];
      for (let target = 0; target < this.network.sizes[layer + 1]; target += 1) {
        for (let source = 0; source < inputCount; source += 1) {
          const weight = weights[target * inputCount + source];
          const contribution = Math.abs(weight * input[source]);
          if (contribution > 0) edges.push({ layer, source, target, weight, contribution });
        }
      }
    }
    edges.sort((a, b) => b.contribution - a.contribution || a.layer - b.layer || a.target - b.target || a.source - b.source);
    this.activeEdges = edges.slice(0, 250);
  }

  visibleEdges() {
    return this.focused && this.selected
      ? this.activeEdges.filter((edge) => edge.layer === this.selected.layer - 1 && edge.target === this.selected.index)
      : this.activeEdges;
  }

  draw(time) {
    if (!this.width || !this.positions) return;
    const context = this.context;
    const colors = this.palette();
    context.clearRect(0, 0, this.width, this.height);
    context.fillStyle = colors.bg;
    context.fillRect(0, 0, this.width, this.height);
    context.drawImage(this.cache, 0, 0, this.width, this.height);
    if (!this.result) return;
    const maximum = this.activeEdges[0]?.contribution || 1;
    const edges = this.visibleEdges();
    for (const edge of edges) {
      const start = this.positions[edge.layer][edge.source];
      const end = this.positions[edge.layer + 1][edge.target];
      const strength = edge.contribution / maximum;
      const glow = this.animationRequested ? 0.92 + Math.sin(this.phase * this.speed / 1500 + edge.layer * 0.4) * 0.08 : 1;
      context.globalAlpha = (0.14 + strength * 0.66) * glow;
      context.strokeStyle = edge.weight >= 0 ? colors.positive : colors.negative;
      context.lineWidth = 0.75 + strength * 1.65;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.globalAlpha = 1;
    this.drawSelected(context, colors);
    this.drawNodes(context, colors);
    this.drawLabels(context, colors);
    if (this.animationRequested && !this.reducedMotion.matches) this.drawPulse(context, time);
  }

  drawSelected(context, colors) {
    if (!this.selected || this.selected.layer === 0) return;
    const { layer, index } = this.selected;
    const inputCount = this.network.sizes[layer - 1];
    const weights = this.network.layers[layer - 1].weights;
    const end = this.positions[layer][index];
    for (let source = 0; source < inputCount; source += 1) {
      const weight = weights[index * inputCount + source];
      const activation = this.result.activations[layer - 1][source];
      const strength = Math.min(1, Math.abs(weight * activation) * 4);
      const start = this.positions[layer - 1][source];
      context.globalAlpha = 0.3 + strength * 0.65;
      context.strokeStyle = weight >= 0 ? colors.positive : colors.negative;
      context.lineWidth = 1 + strength;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  drawNodes(context, colors) {
    const input = this.result.activations[0];
    for (let index = 0; index < 256; index += 1) {
      const point = this.positions[0][index];
      const value = input[index];
      const shade = Math.round(10 + value * 225);
      context.fillStyle = `rgb(${Math.round(shade * 0.86)}, ${Math.round(shade * 0.93)}, ${shade})`;
      const size = Math.max(2, this.grid.cell - 1.2);
      context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }
    for (let layer = 1; layer < 4; layer += 1) {
      const isOutput = layer === 3;
      const radius = isOutput ? Math.max(17, this.nodeRadius + 5) : this.nodeRadius;
      for (let index = 0; index < this.network.sizes[layer]; index += 1) {
        const point = this.positions[layer][index];
        const activation = this.result.activations[layer][index];
        const selected = this.selected?.layer === layer && this.selected?.index === index;
        const target = layer === 3 && this.target === index;
        context.globalAlpha = 1;
        if (target) {
          context.strokeStyle = colors.negative;
          context.lineWidth = 3;
          context.beginPath();
          context.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
          context.stroke();
        }
        context.fillStyle = `rgba(93, 132, 220, ${0.13 + activation * 0.55})`;
        context.strokeStyle = selected ? colors.ink : colors.signal;
        context.lineWidth = selected ? 3 : 1.2;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = colors.ink;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${isOutput ? 16 : 10}px "Cascadia Mono", Consolas, monospace`;
        context.fillText(isOutput ? digitForClass(index) : activation.toFixed(2), point.x, point.y - (isOutput ? 4 : 0));
        if (isOutput) {
          context.fillStyle = colors.muted;
          context.font = '11px "Cascadia Mono", Consolas, monospace';
          context.fillText(`${Math.round(activation * 100)}%`, point.x, point.y + 10);
        }
      }
    }
  }

  drawLabels(context, colors) {
    const labels = this.width < 440
      ? ['16×16', 'Слой 1', 'Слой 2', 'Выход']
      : ['ВХОД · 16×16', 'СКРЫТЫЙ · 16', 'СКРЫТЫЙ · 12', 'ВЫХОД · 10'];
    const xs = [this.grid.left + this.grid.size / 2, ...this.positions.slice(1).map((layer) => layer[0].x)];
    context.fillStyle = colors.muted;
    context.font = `${this.width < 440 ? 11 : 12}px "Cascadia Mono", Consolas, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    labels.forEach((label, index) => context.fillText(label, xs[index], 22));
  }

  drawPulse(context, time) {
    const colors = this.palette();
    const edges = this.visibleEdges().slice(0, 96);
    const maximum = edges[0]?.contribution || 1;
    edges.forEach((edge, index) => {
      const progress = ((this.phase * this.speed / 2600 + edge.layer * 0.27 + index * 0.137) % 1 + 1) % 1;
      const strength = edge.contribution / maximum;
      const start = this.positions[edge.layer][edge.source];
      const end = this.positions[edge.layer + 1][edge.target];
      context.globalAlpha = Math.sin(progress * Math.PI) ** 2 * (0.35 + strength * 0.65);
      context.fillStyle = edge.weight >= 0 ? colors.positive : colors.negative;
      context.beginPath();
      context.arc(start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress, 1.8 + strength * 1.5, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  localPoint(event) {
    // экранные координаты -> координаты графа: при «Крупно» (CSS zoom) и любом масштабе холста они различаются
    const bounds = this.canvas.getBoundingClientRect();
    const sx = bounds.width ? this.width / bounds.width : 1, sy = bounds.height ? this.height / bounds.height : 1;
    return { x: (event.clientX - bounds.left) * sx, y: (event.clientY - bounds.top) * sy };
  }

  hitTest(point) {
    if (!this.positions) return null;
    let nearest = null;
    let distance = Infinity;
    for (let layer = 1; layer < 4; layer += 1) {
      this.positions[layer].forEach((position, index) => {
        const current = Math.hypot(point.x - position.x, point.y - position.y);
        const threshold = (layer === 3 ? this.nodeRadius + 5 : this.nodeRadius) + 7;
        if (current <= threshold && current < distance) {
          nearest = { layer, index };
          distance = current;
        }
      });
    }
    return nearest;
  }

  pointerMove(event) {
    const point = this.localPoint(event);
    const hit = this.hitTest(point);
    if (!hit || !this.result) {
      this.tooltip.hidden = true;
      this.canvas.style.cursor = 'default';
      return;
    }
    const activation = this.result.activations[hit.layer][hit.index];
    const bias = this.network.layers[hit.layer - 1].biases[hit.index];
    const name = hit.layer === 3 ? `цифра ${digitForClass(hit.index)}` : `нейрон ${hit.index + 1}`;
    this.tooltip.textContent = `Слой ${hit.layer} · ${name}\nz = ${this.result.sums[hit.layer - 1][hit.index].toFixed(5)} · a = ${activation.toFixed(5)} · b = ${bias.toFixed(5)}\nНажмите для численной инспекции`;
    this.tooltip.style.left = `${Math.min(this.width - 210, point.x + 12)}px`;
    this.tooltip.style.top = `${Math.max(8, point.y - 60)}px`;
    this.tooltip.hidden = false;
    this.canvas.style.cursor = 'pointer';
  }

  select(layer, index) {
    if (layer < 1 || layer > 3 || index < 0 || index >= this.network.sizes[layer]) return;
    this.selected = { layer, index };
    this.draw(performance.now());
    this.onSelection?.(this.getInspection());
  }

  getInspection() {
    if (!this.selected || !this.result) return null;
    const { layer, index } = this.selected;
    const incoming = [];
    const inputCount = this.network.sizes[layer - 1];
    const weights = this.network.layers[layer - 1].weights;
    for (let source = 0; source < inputCount; source += 1) {
      const weight = weights[index * inputCount + source];
      const activation = this.result.activations[layer - 1][source];
      incoming.push({ source, weight, activation, contribution: Math.abs(weight * activation) });
    }
    incoming.sort((a, b) => b.contribution - a.contribution);
    return {
      layer, index,
      z: this.result.sums[layer - 1][index],
      activation: this.result.activations[layer][index],
      bias: this.network.layers[layer - 1].biases[index],
      incoming,
    };
  }
}
